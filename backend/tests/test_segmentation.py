"""Unit tests for segmentation post-processing, mask generation, and calculations."""

import numpy as np
from PIL import Image
from app.services.postprocess import remove_small_noise, fill_small_holes, smooth_boundaries, postprocess_wall_and_floor
from app.utils.mask_utils import calculate_coverage_percentage, mask_to_base64_png, separate_wall_components


def test_remove_small_noise():
    """Verify small disconnected noise specks are filtered out."""
    mask = np.zeros((100, 100), dtype=np.uint8)
    # Add a large valid block (20x20 = 400 pixels)
    mask[10:30, 10:30] = 1
    # Add small speck (3x3 = 9 pixels)
    mask[80:83, 80:83] = 1

    cleaned = remove_small_noise(mask, min_size=50)
    assert cleaned[15, 15] == 1
    assert cleaned[81, 81] == 0


def test_fill_small_holes():
    """Verify small isolated holes are filled while preserving large holes."""
    mask = np.ones((100, 100), dtype=np.uint8)
    # Small hole (3x3 = 9 pixels)
    mask[20:23, 20:23] = 0
    # Large hole (25x25 = 625 pixels)
    mask[50:75, 50:75] = 0

    filled = fill_small_holes(mask, max_hole_area=50)
    # Small hole should now be filled
    assert filled[21, 21] == 1
    # Large hole should remain untouched
    assert filled[60, 60] == 0


def test_postprocess_mutual_exclusivity():
    """Verify wall and floor masks have 0 overlapping pixels."""
    wall = np.zeros((100, 100), dtype=np.uint8)
    floor = np.zeros((100, 100), dtype=np.uint8)

    # Overlapping region
    wall[40:70, 40:70] = 255
    floor[40:70, 40:70] = 255

    w_clean, f_clean = postprocess_wall_and_floor(wall, floor, height=100, width=100)
    overlap = (w_clean > 0) & (f_clean > 0)
    assert not overlap.any(), "Wall and floor must be mutually exclusive"


def test_calculate_coverage_percentage():
    """Verify coverage percentage calculation."""
    mask = np.zeros((100, 100), dtype=np.uint8)
    mask[:25, :] = 255  # 25% of the image
    pct = calculate_coverage_percentage(mask)
    assert pct == 25.0


def test_mask_to_base64_png():
    """Verify mask converts to non-empty base64 string."""
    mask = np.zeros((50, 50), dtype=np.uint8)
    mask[10:40, 10:40] = 255
    b64 = mask_to_base64_png(mask)
    assert isinstance(b64, str)
    assert len(b64) > 10

