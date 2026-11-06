"""Integration and unit tests for FastAPI endpoints and image validation."""

import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_test_image(width=600, height=400, color=(200, 200, 200), format="JPEG") -> bytes:
    """Helper to generate in-memory test image bytes."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_health_check_endpoint():
    """Verify GET /api/v1/health returns 200 and model status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "initializing"]
    assert "model" in data
    assert "name" in data["model"]


def test_detect_valid_jpeg():
    """Verify POST /api/v1/detect with valid JPEG."""
    jpeg_bytes = create_test_image(format="JPEG")
    files = {"image": ("test_room.jpg", jpeg_bytes, "image/jpeg")}
    response = client.post("/api/v1/detect", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "request_id" in data
    assert data["image"]["width"] == 600
    assert data["image"]["height"] == 400
    assert "wall" in data
    assert "floor" in data
    assert "mask_png_base64" in data["wall"]
    assert "mask_png_base64" in data["floor"]
    assert "overlay_png_base64" in data


def test_detect_valid_png():
    """Verify POST /api/v1/detect with valid PNG."""
    png_bytes = create_test_image(width=512, height=512, format="PNG")
    files = {"image": ("test_room.png", png_bytes, "image/png")}
    response = client.post("/api/v1/detect", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["image"]["width"] == 512
    assert data["image"]["height"] == 512


def test_detect_valid_webp():
    """Verify POST /api/v1/detect with valid WEBP."""
    webp_bytes = create_test_image(width=520, height=520, format="WEBP")
    files = {"image": ("test_room.webp", webp_bytes, "image/webp")}
    response = client.post("/api/v1/detect", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["image"]["width"] == 520
    assert data["image"]["height"] == 520


def test_reject_invalid_file_extension():
    """Reject non-image extensions (.txt, .pdf)."""
    fake_bytes = b"Hello world, not an image"
    files = {"image": ("document.txt", fake_bytes, "text/plain")}
    response = client.post("/api/v1/detect", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "INVALID_FILE_TYPE"


def test_reject_corrupted_image():
    """Reject corrupted/unidentifiable image content."""
    corrupt_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01...bad-corrupt-data"
    files = {"image": ("corrupted.jpg", corrupt_bytes, "image/jpeg")}
    response = client.post("/api/v1/detect", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "INVALID_IMAGE"


def test_reject_oversized_file():
    """Reject files larger than 10 MB."""
    # 10.5 MB of dummy bytes
    oversized_bytes = b"0" * (10 * 1024 * 1024 + 512 * 1024)
    files = {"image": ("huge.jpg", oversized_bytes, "image/jpeg")}
    response = client.post("/api/v1/detect", files=files)
    assert response.status_code == 413
    data = response.json()
    assert data["error_code"] == "FILE_TOO_LARGE"


def test_dimension_warning_low_resolution():
    """Ensure warning is produced when shorter side is below 512px."""
    small_bytes = create_test_image(width=300, height=250, format="JPEG")
    files = {"image": ("small.jpg", small_bytes, "image/jpeg")}
    response = client.post("/api/v1/detect", files=files)
    assert response.status_code == 200
    data = response.json()
    assert len(data["warnings"]) > 0
    assert any("512" in w for w in data["warnings"])


def test_separate_walls_flag():
    """Test optional separate_walls parameter."""
    img_bytes = create_test_image(width=600, height=600, format="JPEG")
    files = {"image": ("room.jpg", img_bytes, "image/jpeg")}
    data_form = {"separate_walls": "true", "return_overlay": "false"}
    response = client.post("/api/v1/detect", files=files, data=data_form)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["walls"], list)
    assert data["overlay_png_base64"] == ""  # return_overlay was false

