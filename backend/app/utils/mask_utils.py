"""Mask processing and encoding utilities."""

import base64
import io
from typing import List, Dict, Any
import numpy as np
import cv2
from PIL import Image


def mask_to_base64_png(mask: np.ndarray) -> str:
    """
    Convert a 2D uint8 binary mask (0 or 255) to a black-and-white PNG encoded in Base64.
    Preserves exact dimensions.
    """
    # Ensure binary uint8 with 0 for background and 255 for detected surface
    bin_mask = (mask > 0).astype(np.uint8) * 255
    pil_mask = Image.fromarray(bin_mask, mode="L")
    
    buf = io.BytesIO()
    pil_mask.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def pil_to_base64_png(image: Image.Image) -> str:
    """Convert any PIL image to base64 PNG."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def calculate_coverage_percentage(mask: np.ndarray) -> float:
    """
    Calculate the percentage of pixels occupied by the mask.
    Returns value between 0.0 and 100.0 rounded to 2 decimal places.
    """
    total_pixels = mask.size
    if total_pixels == 0:
        return 0.0
    detected_pixels = int(np.count_nonzero(mask > 0))
    percent = (detected_pixels / total_pixels) * 100.0
    return round(float(percent), 2)


def separate_wall_components(
    wall_mask: np.ndarray,
    min_pixel_area: int = 500
) -> List[Dict[str, Any]]:
    """
    Identify distinct individual wall surfaces/facets using connected components.
    Returns a list of structured wall segments with individual masks, bbox, and stats.
    """
    if wall_mask is None or not wall_mask.any():
        return []

    bin_mask = (wall_mask > 0).astype(np.uint8)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(bin_mask, connectivity=8)

    total_pixels = wall_mask.size
    wall_segments: List[Dict[str, Any]] = []

    # Label 0 is background
    for label_id in range(1, num_labels):
        area = int(stats[label_id, cv2.CC_STAT_AREA])
        if area < min_pixel_area:
            continue

        x = int(stats[label_id, cv2.CC_STAT_LEFT])
        y = int(stats[label_id, cv2.CC_STAT_TOP])
        w = int(stats[label_id, cv2.CC_STAT_WIDTH])
        h = int(stats[label_id, cv2.CC_STAT_HEIGHT])

        seg_mask = (labels == label_id).astype(np.uint8) * 255
        seg_base64 = mask_to_base64_png(seg_mask)

        wall_segments.append({
            "id": int(label_id),
            "area_pixels": area,
            "area_percent": round((area / total_pixels) * 100.0, 2),
            "bounding_box": {
                "x": x,
                "y": y,
                "width": w,
                "height": h
            },
            "mask_png_base64": seg_base64
        })

    # Sort descending by area
    wall_segments.sort(key=lambda item: item["area_pixels"], reverse=True)
    return wall_segments

