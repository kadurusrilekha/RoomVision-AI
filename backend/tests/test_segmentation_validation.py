"""Comprehensive tests verifying:
1. Zero overlap between Wall and Floor masks.
2. Correct overlay colors (Wall = Blue, Floor = Green, Non-mask = original photo).
3. Object exclusions (windows, glass, curtains, paintings, doors, TVs, cabinets, rugs, furniture, persons).
4. Preservation of original image dimensions and binary (0/255) mask values.
"""

import sys
import os
import numpy as np
from PIL import Image

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.segmentation import get_model
from app.services.postprocess import postprocess_wall_and_floor, EXCLUDE_FROM_WALL, EXCLUDE_FROM_FLOOR
from app.utils.image_utils import create_blended_overlay


def test_wall_and_floor_zero_overlap():
    """Verify that Wall and Floor masks NEVER share any overlapping positive pixels."""
    model = get_model()
    # Test on a real interior photograph
    img_path = os.path.join(BACKEND_DIR, "..", "evaluation", "images", "living_room.jpg")
    img = Image.open(img_path)
    
    wall_mask, floor_mask, w_conf, f_conf, warnings = model.predict(img)
    
    overlap = (wall_mask > 0) & (floor_mask > 0)
    overlap_count = np.count_nonzero(overlap)
    assert overlap_count == 0, f"Found {overlap_count} overlapping pixels between wall and floor masks!"
    print(f"[PASS] Zero Overlap Verified: Wall pixels={np.count_nonzero(wall_mask)}, Floor pixels={np.count_nonzero(floor_mask)}, Overlap=0")


def test_overlay_colors_and_blending():
    """
    Verify overlay colors:
    - Wall overlay must have Blue tint (B > R and B > G).
    - Floor overlay must have Green tint (G > R and G > B).
    - Background pixels must exactly equal original image pixels.
    """
    # Create synthetic test image (neutral gray: 128, 128, 128)
    h, w = 100, 100
    orig_np = np.full((h, w, 3), 128, dtype=np.uint8)
    orig_img = Image.fromarray(orig_np, mode="RGB")

    wall_mask = np.zeros((h, w), dtype=np.uint8)
    floor_mask = np.zeros((h, w), dtype=np.uint8)

    # Top region is Wall, Bottom region is Floor, Middle region is Background (e.g. furniture)
    wall_mask[10:35, 10:90] = 255
    floor_mask[65:90, 10:90] = 255

    overlay = create_blended_overlay(
        original_rgb=orig_img,
        wall_mask=wall_mask,
        floor_mask=floor_mask,
        wall_color=(59, 130, 246),  # Blue
        floor_color=(34, 197, 94),  # Green
        alpha=0.5
    )
    overlay_np = np.array(overlay)

    # 1. Wall pixel verification (should be tinted blue: B > R and B > G)
    wall_pixel = overlay_np[20, 50]  # inside wall region
    r_w, g_w, b_w = int(wall_pixel[0]), int(wall_pixel[1]), int(wall_pixel[2])
    assert b_w > r_w, f"Wall pixel should have dominant Blue: RGB=({r_w}, {g_w}, {b_w})"
    assert b_w > g_w, f"Wall pixel should have dominant Blue: RGB=({r_w}, {g_w}, {b_w})"
    print(f"[PASS] Wall Overlay Color Verified: Sample Wall RGB=({r_w}, {g_w}, {b_w}) -> Dominant Blue")

    # 2. Floor pixel verification (should be tinted green: G > R and G > B)
    floor_pixel = overlay_np[75, 50]  # inside floor region
    r_f, g_f, b_f = int(floor_pixel[0]), int(floor_pixel[1]), int(floor_pixel[2])
    assert g_f > r_f, f"Floor pixel should have dominant Green: RGB=({r_f}, {g_f}, {b_f})"
    assert g_f > b_f, f"Floor pixel should have dominant Green: RGB=({r_f}, {g_f}, {b_f})"
    print(f"[PASS] Floor Overlay Color Verified: Sample Floor RGB=({r_f}, {g_f}, {b_f}) -> Dominant Green")

    # 3. Background untouched verification (middle row 50 should equal original gray 128, 128, 128)
    bg_pixel = overlay_np[50, 50]
    assert np.array_equal(bg_pixel, [128, 128, 128]), f"Non-masked pixel altered! RGB={bg_pixel}"
    print(f"[PASS] Non-Mask Region Verified: Untouched RGB=({bg_pixel[0]}, {bg_pixel[1]}, {bg_pixel[2]})")


def test_object_exclusions_from_masks():
    """
    Verify that explicit foreground objects are strictly excluded from masks:
    - Windows (8), paintings (22), curtains (18), doors (14), cabinets (10), TVs (89) excluded from wall.
    - Rugs (28), furniture (7, 15, 19, 23), people (12) excluded from floor.
    """
    h, w = 100, 100
    # Simulate a raw prediction where model flags a surface, but also predicts object classes
    wall_raw = np.full((h, w), 255, dtype=np.uint8)
    floor_raw = np.zeros((h, w), dtype=np.uint8)

    # Mock predictions array with ADE20K classes:
    # 0 = wall, 8 = windowpane, 22 = painting, 14 = door, 10 = cabinet, 89 = TV
    pred_classes = np.zeros((h, w), dtype=np.int32)
    pred_classes[10:25, 10:25] = 8   # Window
    pred_classes[30:45, 10:25] = 22  # Painting
    pred_classes[50:65, 10:25] = 14  # Door
    pred_classes[70:85, 10:25] = 10  # Cabinet
    pred_classes[10:25, 60:85] = 89  # Television

    wall_clean, _ = postprocess_wall_and_floor(
        wall_raw, floor_raw, height=h, width=w, pred_classes=pred_classes
    )

    # Verify that window, painting, door, cabinet, and TV are strictly 0 in wall mask
    assert np.count_nonzero(wall_clean[10:25, 10:25]) == 0, "Window leaked into wall mask!"
    assert np.count_nonzero(wall_clean[30:45, 10:25]) == 0, "Painting leaked into wall mask!"
    assert np.count_nonzero(wall_clean[50:65, 10:25]) == 0, "Door leaked into wall mask!"
    assert np.count_nonzero(wall_clean[70:85, 10:25]) == 0, "Cabinet leaked into wall mask!"
    assert np.count_nonzero(wall_clean[10:25, 60:85]) == 0, "TV leaked into wall mask!"
    print("[PASS] Object Exclusions Verified: Windows, paintings, doors, cabinets, and TVs strictly excluded from Wall mask.")

    # Now test floor object exclusion (rug=28, sofa=23, person=12, table=15)
    floor_raw2 = np.full((h, w), 255, dtype=np.uint8)
    wall_raw2 = np.zeros((h, w), dtype=np.uint8)
    pred_classes2 = np.full((h, w), 3, dtype=np.int32)  # 3 = floor
    pred_classes2[20:40, 20:50] = 28  # Rug
    pred_classes2[60:80, 20:50] = 23  # Sofa
    pred_classes2[60:80, 60:80] = 12  # Person
    pred_classes2[20:40, 60:80] = 15  # Table

    _, floor_clean2 = postprocess_wall_and_floor(
        wall_raw2, floor_raw2, height=h, width=w, pred_classes=pred_classes2
    )

    assert np.count_nonzero(floor_clean2[20:40, 20:50]) == 0, "Rug leaked into floor mask!"
    assert np.count_nonzero(floor_clean2[60:80, 20:50]) == 0, "Sofa leaked into floor mask!"
    assert np.count_nonzero(floor_clean2[60:80, 60:80]) == 0, "Person leaked into floor mask!"
    assert np.count_nonzero(floor_clean2[20:40, 60:80]) == 0, "Table leaked into floor mask!"
    print("[PASS] Floor Exclusions Verified: Rugs, sofas, persons, and tables strictly excluded from Floor mask.")


def test_dimensions_and_binary_values():
    """Verify that output masks match original image dimensions and only contain values 0 and 255."""
    model = get_model()
    img_path = os.path.join(BACKEND_DIR, "..", "evaluation", "images", "bedroom.jpg")
    img = Image.open(img_path)
    w_orig, h_orig = img.size

    wall, floor, _, _, _ = model.predict(img)

    assert wall.shape == (h_orig, w_orig), f"Wall shape {wall.shape} != original ({h_orig}, {w_orig})"
    assert floor.shape == (h_orig, w_orig), f"Floor shape {floor.shape} != original ({h_orig}, {w_orig})"

    wall_vals = set(np.unique(wall))
    floor_vals = set(np.unique(floor))
    assert wall_vals.issubset({0, 255}), f"Wall contains invalid pixel values: {wall_vals}"
    assert floor_vals.issubset({0, 255}), f"Floor contains invalid pixel values: {floor_vals}"
    print(f"[PASS] Dimensions & Binary Values Verified: Image=({w_orig}x{h_orig}), Mask=({wall.shape[1]}x{wall.shape[0]}), Values={wall_vals}")


if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING SEGMENTATION & OVERLAY VALIDATION TEST SUITE")
    print("=" * 60)
    test_wall_and_floor_zero_overlap()
    test_overlay_colors_and_blending()
    test_object_exclusions_from_masks()
    test_dimensions_and_binary_values()
    print("=" * 60)
    print("ALL 4 VALIDATION TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 60)

