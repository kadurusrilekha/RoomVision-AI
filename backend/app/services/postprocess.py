"""Post-processing operations for semantic segmentation masks."""

import numpy as np
import cv2

# Explicit foreground object class IDs in ADE20K that must be excluded from wall and floor
EXCLUDE_FROM_WALL = {
    5,   # ceiling
    7,   # bed
    8,   # windowpane
    10,  # cabinet
    12,  # person
    14,  # door
    15,  # table
    17,  # plant
    18,  # curtain
    19,  # chair
    20,  # car
    22,  # painting
    23,  # sofa
    24,  # shelf
    27,  # mirror
    30,  # armchair
    31,  # seat
    33,  # desk
    35,  # wardrobe
    36,  # lamp
    37,  # bathtub
    39,  # cushion
    44,  # chest of drawers
    45,  # counter
    47,  # sink
    49,  # fireplace
    50,  # refrigerator
    58,  # screen door
    62,  # bookcase
    63,  # blind
    64,  # coffee table
    65,  # toilet
    70,  # countertop
    73,  # kitchen island
    74,  # computer
    81,  # towel
    82,  # light
    85,  # chandelier
    89,  # television receiver
    97,  # ottoman
    100, # poster
    130, # screen
    134, # sconce
    141, # crt screen
    143, # monitor
    144, # bulletin board
    145, # shower
    146, # radiator
    147, # glass
    148, # clock
}

EXCLUDE_FROM_FLOOR = {
    5,   # ceiling
    7,   # bed
    8,   # windowpane
    10,  # cabinet
    12,  # person
    14,  # door
    15,  # table
    17,  # plant
    18,  # curtain
    19,  # chair
    22,  # painting
    23,  # sofa
    24,  # shelf
    27,  # mirror
    28,  # rug
    30,  # armchair
    31,  # seat
    33,  # desk
    35,  # wardrobe
    36,  # lamp
    37,  # bathtub
    39,  # cushion
    44,  # chest of drawers
    45,  # counter
    49,  # fireplace
    50,  # refrigerator
    62,  # bookcase
    64,  # coffee table
    65,  # toilet
    70,  # countertop
    73,  # kitchen island
    89,  # television receiver
    97,  # ottoman
    110, # stool
    131, # blanket
    145, # shower
}


def remove_small_noise(mask: np.ndarray, min_size: int = 150) -> np.ndarray:
    """Remove connected components smaller than min_size pixels."""
    if mask is None or not mask.any():
        return np.zeros_like(mask, dtype=np.uint8)

    bin_mask = (mask > 0).astype(np.uint8)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(bin_mask, connectivity=8)

    cleaned = np.zeros_like(bin_mask)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_size:
            cleaned[labels == i] = 1

    return cleaned


def fill_small_holes(mask: np.ndarray, max_hole_area: int = 120) -> np.ndarray:
    """
    Fill tiny isolated sensor/specular noise voids inside solid surfaces.
    Uses a conservative area threshold (default 120px) to prevent accidentally
    filling in paintings, wall sconces, mirrors, or window openings.
    """
    if mask is None or not mask.any():
        return np.zeros_like(mask, dtype=np.uint8)

    inv_mask = (mask == 0).astype(np.uint8)
    h, w = mask.shape

    padded = cv2.copyMakeBorder(inv_mask, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=1)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(padded, connectivity=8)

    bg_label = labels[0, 0]
    filled = mask.copy()
    labels_crop = labels[1:h+1, 1:w+1]

    for label_id in range(1, num_labels):
        if label_id == bg_label:
            continue
        hole_area = stats[label_id, cv2.CC_STAT_AREA]
        # Only fill genuinely tiny pinholes
        if hole_area <= max_hole_area:
            filled[labels_crop == label_id] = 1

    return filled


def smooth_boundaries(mask: np.ndarray, kernel_size: int = 3) -> np.ndarray:
    """
    Smooth jagged stepping from bilinear upsampling while preserving sharp room corners.
    """
    if mask is None or not mask.any():
        return np.zeros_like(mask, dtype=np.uint8)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel)
    return opened


def refine_mask(
    raw_mask: np.ndarray,
    min_noise_area: int = 150,
    max_hole_area: int = 120,
    kernel_size: int = 3
) -> np.ndarray:
    """Run full post-processing pipeline on an individual mask."""
    if raw_mask is None or not raw_mask.any():
        return np.zeros_like(raw_mask, dtype=np.uint8)

    bin_m = (raw_mask > 0).astype(np.uint8)
    noise_free = remove_small_noise(bin_m, min_size=min_noise_area)
    holes_filled = fill_small_holes(noise_free, max_hole_area=max_hole_area)
    smoothed = smooth_boundaries(holes_filled, kernel_size=kernel_size)

    return (smoothed > 0).astype(np.uint8) * 255


def postprocess_wall_and_floor(
    wall_raw: np.ndarray,
    floor_raw: np.ndarray,
    height: int,
    width: int,
    pred_classes: np.ndarray = None
) -> tuple[np.ndarray, np.ndarray]:
    """
    Post-process wall and floor masks together:
    - Floor noise threshold is set conservatively (60px) to preserve visible floor
      tiles between and behind furniture legs.
    - Wall hole filling is capped at 120px to prevent re-including paintings, mirrors, or sconces.
    - Explicit foreground object masks (doors, windows, furniture, rugs, curtains) are strictly excluded.
    - Mutual exclusivity is strictly enforced: (wall > 0) & (floor > 0) == empty.
    """
    # 1. Refine masks individually
    # Wall: min_noise_area 150, max_hole_area 120 (protects paintings/windows)
    wall_clean = refine_mask(wall_raw, min_noise_area=150, max_hole_area=120, kernel_size=3)

    # Floor: min_noise_area 60 (preserves floor tiles around/behind furniture), max_hole_area 80
    floor_clean = refine_mask(floor_raw, min_noise_area=60, max_hole_area=80, kernel_size=3)

    # 2. Strict foreground object exclusion guard
    if pred_classes is not None:
        # Create boolean mask of pixels classified as known non-wall objects
        wall_exclude_mask = np.isin(pred_classes, list(EXCLUDE_FROM_WALL))
        wall_clean[wall_exclude_mask] = 0

        # Create boolean mask of pixels classified as known non-floor objects (rugs, furniture, people)
        floor_exclude_mask = np.isin(pred_classes, list(EXCLUDE_FROM_FLOOR))
        floor_clean[floor_exclude_mask] = 0

    # 3. Enforce strict mutual exclusivity between wall and floor
    overlap = (wall_clean > 0) & (floor_clean > 0)
    if overlap.any():
        y_indices = np.arange(height)[:, None]
        floor_priority = y_indices >= int(height * 0.45)

        wall_clean[overlap & floor_priority] = 0
        floor_clean[overlap & (~floor_priority)] = 0

    return wall_clean, floor_clean
