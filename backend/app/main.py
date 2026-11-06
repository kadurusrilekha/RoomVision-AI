"""FastAPI application for AI-Powered Wall and Floor Detection (RoomVision AI)."""

import os
import time
import uuid
import asyncio
import logging
import gc
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

import torch
torch.set_num_threads(1)

from fastapi import FastAPI, UploadFile, File, Form, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services.segmentation import get_model, BaseSegmentationModel
from app.utils.image_utils import (
    validate_image_bytes,
    create_blended_overlay,
    MIN_RECOMMENDED_DIMENSION
)
from app.utils.mask_utils import (
    mask_to_base64_png,
    pil_to_base64_png,
    calculate_coverage_percentage,
    separate_wall_components
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [ReqID: %(name)s] %(message)s"
)
logger = logging.getLogger("RoomVision")

# Concurrency control & rate limiting
MAX_CONCURRENT_INFERENCES = int(os.getenv("MAX_CONCURRENT_INFERENCES", "5"))
inference_semaphore = asyncio.Semaphore(MAX_CONCURRENT_INFERENCES)

# Simple in-memory sliding window rate limiter (generous limit for production proxies)
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_PER_MINUTE", "300"))
RATE_LIMIT_WINDOW_SECONDS = 60
_request_history: Dict[str, List[float]] = {}


def get_real_client_ip(request: Request) -> str:
    """Extract real client IP behind reverse proxies (Railway, Render, Cloudflare)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(client_ip: str) -> bool:
    """Return True if request is allowed, False if limit exceeded."""
    now = time.time()
    history = _request_history.get(client_ip, [])
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    history = [t for t in history if t > cutoff]
    if len(history) >= RATE_LIMIT_MAX_REQUESTS:
        _request_history[client_ip] = history
        return False
    history.append(now)
    _request_history[client_ip] = history
    return True


# Response models
class ImageMeta(BaseModel):
    width: int
    height: int


class ModelMeta(BaseModel):
    name: str
    version: str


class MaskResult(BaseModel):
    mask_png_base64: str
    area_percent: float
    confidence: float


class DetectionResponse(BaseModel):
    request_id: str
    image: ImageMeta
    model: ModelMeta
    processing_ms: int
    floor: MaskResult
    wall: MaskResult
    walls: List[Dict[str, Any]]
    overlay_png_base64: str
    warnings: List[str]


class ErrorResponse(BaseModel):
    error_code: str
    message: str
    request_id: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load AI model on startup and clean up on shutdown."""
    logger.info("Initializing SegFormer segmentation model on startup...")
    try:
        model = get_model()
        logger.info(f"Model {model.model_name} (v{model.model_version}) loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model on startup: {e}", exc_info=True)
    yield
    logger.info("Shutting down RoomVision backend...")


app = FastAPI(
    title="RoomVision AI - Wall and Floor Detection API",
    description="High-precision interior surface segmentation powered by SegFormer and ADE20K.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def make_error_response(error_code: str, message: str, request_id: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error_code": error_code,
            "message": message,
            "request_id": request_id
        }
    )


@app.get("/", summary="Root health and info endpoint")
async def root():
    """Root endpoint for platform health checkers (Railway, Render, AWS)."""
    return {
        "service": "RoomVision AI API",
        "status": "online",
        "health": "/api/v1/health",
        "docs": "/docs"
    }


@app.get("/api/v1/health", summary="Service Health and Model Status")
async def health_check():
    """Verify backend health and model readiness."""
    try:
        model = get_model()
        model_ready = model.is_ready
        model_name = model.model_name
        model_version = model.model_version
    except Exception:
        model_ready = False
        model_name = "unknown"
        model_version = "unknown"

    return {
        "status": "healthy" if model_ready else "initializing",
        "service": "RoomVision AI API",
        "model": {
            "name": model_name,
            "version": model_version,
            "ready": model_ready
        }
    }


@app.post(
    "/api/v1/detect",
    response_model=DetectionResponse,
    responses={
        400: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Detect Wall and Floor in Room Image"
)
async def detect_surfaces(
    request: Request,
    image: UploadFile = File(..., description="Uploaded room image (JPG, PNG, WEBP)"),
    separate_walls: bool = Form(False, description="Whether to separate distinct individual wall planes"),
    return_overlay: bool = Form(True, description="Whether to generate and return blended overlay PNG")
):
    request_id = str(uuid.uuid4())
    client_ip = get_real_client_ip(request)

    # 1. Rate limiting check
    if not check_rate_limit(client_ip):
        return make_error_response(
            "TOO_MANY_REQUESTS",
            "Rate limit exceeded. Please wait a few seconds before trying again.",
            request_id,
            status.HTTP_429_TOO_MANY_REQUESTS
        )

    # 2. Check model readiness
    try:
        model = get_model()
        if not model.is_ready:
            return make_error_response(
                "MODEL_NOT_READY",
                "AI Segmentation model is initializing. Please try again shortly.",
                request_id,
                status.HTTP_503_SERVICE_UNAVAILABLE
            )
    except Exception as e:
        return make_error_response(
            "MODEL_NOT_READY",
            f"Failed to access model: {str(e)}",
            request_id,
            status.HTTP_503_SERVICE_UNAVAILABLE
        )

    # 3. Read uploaded bytes
    try:
        file_bytes = await image.read()
    except Exception as e:
        return make_error_response(
            "INVALID_IMAGE",
            f"Failed to read uploaded file: {str(e)}",
            request_id,
            status.HTTP_400_BAD_REQUEST
        )

    # 4. Validate file type, size, and image contents
    is_valid, err_code, err_msg, pil_img = validate_image_bytes(
        file_bytes=file_bytes,
        filename=image.filename
    )

    if not is_valid:
        status_code = status.HTTP_413_CONTENT_TOO_LARGE if err_code == "FILE_TOO_LARGE" else status.HTTP_400_BAD_REQUEST
        return make_error_response(err_code, err_msg, request_id, status_code)

    # 5. Concurrency check (Semaphore)
    if inference_semaphore.locked():
        logger.warning(f"Server is busy processing max concurrent requests (Req: {request_id})")
        return make_error_response(
            "BUSY",
            "The segmentation server is currently under heavy load. Please retry in a moment.",
            request_id,
            status.HTTP_503_SERVICE_UNAVAILABLE
        )

    start_time = time.perf_counter()

    async with inference_semaphore:
        try:
            # Run inference in worker thread to prevent blocking the event loop
            loop = asyncio.get_running_loop()
            wall_mask, floor_mask, wall_conf, floor_conf, warnings = await loop.run_in_executor(
                None, model.predict, pil_img
            )
        except Exception as e:
            logger.error(f"Inference error for request {request_id}: {e}", exc_info=True)
            return make_error_response(
                "INTERNAL_ERROR",
                "An unexpected error occurred during image segmentation.",
                request_id,
                status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            gc.collect()

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)

    # 6. Dimensions and warnings
    w, h = pil_img.size
    if min(w, h) < MIN_RECOMMENDED_DIMENSION:
        warnings.append(
            f"Image shorter side ({min(w, h)}px) is below the recommended {MIN_RECOMMENDED_DIMENSION}px. Segmentation accuracy may be degraded."
        )

    # 7. Encode masks to Base64 PNG
    wall_base64 = mask_to_base64_png(wall_mask)
    floor_base64 = mask_to_base64_png(floor_mask)

    wall_pct = calculate_coverage_percentage(wall_mask)
    floor_pct = calculate_coverage_percentage(floor_mask)

    # 8. Separate individual wall surfaces if requested
    individual_walls = []
    if separate_walls:
        individual_walls = separate_wall_components(wall_mask)

    # 9. Generate blended overlay if requested
    overlay_base64 = ""
    if return_overlay:
        try:
            overlay_img = create_blended_overlay(
                original_rgb=pil_img,
                wall_mask=wall_mask,
                floor_mask=floor_mask,
                wall_color=(59, 130, 246),  # Blue
                floor_color=(34, 197, 94),  # Green
                alpha=0.45
            )
            overlay_base64 = pil_to_base64_png(overlay_img)
        except Exception as e:
            logger.warning(f"Failed to generate overlay: {e}")
            warnings.append("Could not generate composite overlay image.")

    logger.info(
        f"Processed request {request_id} in {elapsed_ms}ms: "
        f"Wall={wall_pct}% (conf={wall_conf}), Floor={floor_pct}% (conf={floor_conf})"
    )

    return DetectionResponse(
        request_id=request_id,
        image=ImageMeta(width=w, height=h),
        model=ModelMeta(name=model.model_name, version=model.model_version),
        processing_ms=elapsed_ms,
        floor=MaskResult(
            mask_png_base64=floor_base64,
            area_percent=floor_pct,
            confidence=floor_conf
        ),
        wall=MaskResult(
            mask_png_base64=wall_base64,
            area_percent=wall_pct,
            confidence=wall_conf
        ),
        walls=individual_walls,
        overlay_png_base64=overlay_base64,
        warnings=warnings
    )

