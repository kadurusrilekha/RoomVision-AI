"""Image utility functions for validation, EXIF correction, and visualization."""

import io
import uuid
from typing import Tuple, Optional
from PIL import Image, ImageOps, UnidentifiedImageError
import numpy as np


# Supported formats and limits
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_IMAGE_DIMENSION = 8000
MIN_RECOMMENDED_DIMENSION = 512


def validate_image_bytes(
    file_bytes: bytes,
    filename: Optional[str] = None
) -> Tuple[bool, Optional[str], Optional[str], Optional[Image.Image]]:
    """
    Validate image file bytes, format, and dimensions.
    Returns: (is_valid, error_code, error_message, pil_image)
    """
    # 1. Size check
    if len(file_bytes) == 0:
        return False, "INVALID_IMAGE", "Empty file provided", None

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        return (
            False,
            "FILE_TOO_LARGE",
            f"File size ({len(file_bytes) / (1024 * 1024):.2f} MB) exceeds maximum allowed limit of 10 MB",
            None
        )

    # 2. Extension check if filename provided
    if filename:
        lower_name = filename.lower()
        if not any(lower_name.endswith(ext) for ext in ALLOWED_EXTENSIONS):
            return (
                False,
                "INVALID_FILE_TYPE",
                f"Unsupported file extension. Allowed formats: JPG, JPEG, PNG, WEBP",
                None
            )

    # 3. Content validation via PIL
    try:
        pil_image = Image.open(io.BytesIO(file_bytes))
        pil_image.verify()  # Verify image integrity
    except (UnidentifiedImageError, SyntaxError, ValueError, Exception) as e:
        return False, "INVALID_IMAGE", f"Corrupted or invalid image file: {str(e)}", None

    # Re-open after verify() because verify() closes the stream
    try:
        pil_image = Image.open(io.BytesIO(file_bytes))
        pil_image.load()  # Ensure full pixel data is decoded
    except Exception as e:
        return False, "INVALID_IMAGE", f"Failed to decode image data: {str(e)}", None

    # Format verification
    detected_format = (pil_image.format or "").upper()
    if detected_format not in {"JPEG", "PNG", "WEBP"}:
        return (
            False,
            "INVALID_FILE_TYPE",
            f"Detected image format '{detected_format}' is not supported. Only JPEG, PNG, and WEBP are permitted.",
            None
        )

    # Dimension checks
    width, height = pil_image.size
    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        return (
            False,
            "INVALID_IMAGE",
            f"Image dimensions ({width}x{height}) exceed maximum allowed limit of {MAX_IMAGE_DIMENSION}px on either side",
            None
        )

    return True, None, None, pil_image


def apply_exif_orientation(image: Image.Image) -> Image.Image:
    """Correct orientation based on EXIF metadata."""
    try:
        transposed = ImageOps.exif_transpose(image)
        return transposed if transposed is not None else image
    except Exception:
        return image


def ensure_rgb(image: Image.Image) -> Image.Image:
    """Ensure image is in 3-channel RGB mode."""
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def create_blended_overlay(
    original_rgb: Image.Image,
    wall_mask: np.ndarray,
    floor_mask: np.ndarray,
    wall_color: Tuple[int, int, int] = (59, 130, 246),   # Indigo/Blue (RGB)
    floor_color: Tuple[int, int, int] = (34, 197, 94),   # Green (RGB)
    alpha: float = 0.45
) -> Image.Image:
    """
    Generate an overlay image with wall colored blue and floor colored green,
    blended smoothly with the original photograph.
    """
    orig_np = np.array(original_rgb, dtype=np.float32)
    h, w, c = orig_np.shape

    overlay_np = orig_np.copy()

    # Apply wall color
    if wall_mask is not None and wall_mask.any():
        wall_bool = (wall_mask > 0)
        overlay_np[wall_bool] = (
            (1.0 - alpha) * orig_np[wall_bool] + alpha * np.array(wall_color, dtype=np.float32)
        )

    # Apply floor color
    if floor_mask is not None and floor_mask.any():
        floor_bool = (floor_mask > 0)
        overlay_np[floor_bool] = (
            (1.0 - alpha) * orig_np[floor_bool] + alpha * np.array(floor_color, dtype=np.float32)
        )

    overlay_np = np.clip(overlay_np, 0, 255).astype(np.uint8)
    return Image.fromarray(overlay_np, mode="RGB")

