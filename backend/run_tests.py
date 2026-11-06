"""Backend test runner."""
import sys
import os
import io
import time

# Ensure backend directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.services.postprocess import remove_small_noise, fill_small_holes, postprocess_wall_and_floor
from app.utils.mask_utils import calculate_coverage_percentage, mask_to_base64_png
import numpy as np

def run_all_tests():
    print("=" * 60)
    print("RUNNING BACKEND TEST SUITE")
    print("=" * 60)
    client = TestClient(app)

    # 1. Health check
    res = client.get("/api/v1/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. GET /api/v1/health -> 200 OK")

    # Helper for image creation
    def make_img(w=520, h=520, fmt="JPEG", color=(180, 180, 180)):
        im = Image.new("RGB", (w, h), color=color)
        buf = io.BytesIO()
        im.save(buf, format=fmt)
        return buf.getvalue()

    # 2. Valid JPEG detection
    jpeg_bytes = make_img(w=600, h=400, fmt="JPEG")
    res = client.post("/api/v1/detect", files={"image": ("room.jpg", jpeg_bytes, "image/jpeg")})
    assert res.status_code == 200, f"Valid JPEG failed: {res.text}"
    data = res.json()
    assert "request_id" in data
    assert data["image"]["width"] == 600
    assert data["image"]["height"] == 400
    assert "wall" in data and "floor" in data
    print(f"[PASS] 2. POST /api/v1/detect with valid JPEG -> 200 OK (Processed in {data['processing_ms']}ms)")

    # 3. Valid PNG detection
    png_bytes = make_img(w=512, h=512, fmt="PNG")
    res = client.post("/api/v1/detect", files={"image": ("room.png", png_bytes, "image/png")})
    assert res.status_code == 200, f"Valid PNG failed: {res.text}"
    print("[PASS] 3. POST /api/v1/detect with valid PNG -> 200 OK")

    # 4. Valid WEBP detection
    webp_bytes = make_img(w=550, h=550, fmt="WEBP")
    res = client.post("/api/v1/detect", files={"image": ("room.webp", webp_bytes, "image/webp")})
    assert res.status_code == 200, f"Valid WEBP failed: {res.text}"
    print("[PASS] 4. POST /api/v1/detect with valid WEBP -> 200 OK")

    # 5. Invalid file type rejection
    res = client.post("/api/v1/detect", files={"image": ("doc.txt", b"plain text content", "text/plain")})
    assert res.status_code == 400
    assert res.json()["error_code"] == "INVALID_FILE_TYPE"
    print("[PASS] 5. Invalid file type rejection -> 400 INVALID_FILE_TYPE")

    # 6. Corrupt image rejection
    res = client.post("/api/v1/detect", files={"image": ("corrupted.jpg", b"\xFF\xD8\xFF\x00\x12bad", "image/jpeg")})
    assert res.status_code == 400
    assert res.json()["error_code"] == "INVALID_IMAGE"
    print("[PASS] 6. Corrupted image rejection -> 400 INVALID_IMAGE")

    # 7. File too large rejection (>10MB)
    huge_bytes = b"0" * (10 * 1024 * 1024 + 1024)
    res = client.post("/api/v1/detect", files={"image": ("huge.jpg", huge_bytes, "image/jpeg")})
    assert res.status_code == 413
    assert res.json()["error_code"] == "FILE_TOO_LARGE"
    print("[PASS] 7. Oversized file (>10MB) rejection -> 413 FILE_TOO_LARGE")

    # 8. Low resolution warning (<512px)
    small_bytes = make_img(w=320, h=240, fmt="JPEG")
    res = client.post("/api/v1/detect", files={"image": ("small.jpg", small_bytes, "image/jpeg")})
    assert res.status_code == 200
    assert len(res.json()["warnings"]) > 0
    print("[PASS] 8. Low resolution warning check -> Warning produced as expected")

    # 9. Separate walls and return_overlay flags
    res = client.post(
        "/api/v1/detect",
        files={"image": ("room.jpg", jpeg_bytes, "image/jpeg")},
        data={"separate_walls": "true", "return_overlay": "false"}
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["walls"], list)
    assert data["overlay_png_base64"] == ""
    print("[PASS] 9. Form flags (separate_walls, return_overlay) -> Verified")

    # 10. Mask postprocessing mutual exclusivity
    wall = np.zeros((100, 100), dtype=np.uint8)
    floor = np.zeros((100, 100), dtype=np.uint8)
    wall[30:70, :] = 255
    floor[30:70, :] = 255
    w_c, f_c = postprocess_wall_and_floor(wall, floor, 100, 100)
    overlap = (w_c > 0) & (f_c > 0)
    assert not overlap.any()
    print("[PASS] 10. Wall and Floor mutual exclusivity post-processing -> Verified")

    print("=" * 60)
    print("ALL 10 BACKEND SUITE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()

