# Ground Truth Annotation Protocol for Wall & Floor Segmentation

This guide provides instructions for creating standardized, pixel-accurate ground truth masks for benchmarking indoor wall and floor semantic segmentation models.

## 1. File Naming and Directory Structure

Place original photographs in `evaluation/images/` and corresponding annotated masks in `evaluation/ground_truth/`:

```
evaluation/
  images/
    sample_01.jpg
    sample_02.jpg
    ...
  ground_truth/
    sample_01_wall_gt.png
    sample_01_floor_gt.png
    sample_02_wall_gt.png
    sample_02_floor_gt.png
    ...
```

## 2. Mask Format Specifications

- **Format**: 8-bit single-channel grayscale PNG (`mode="L"`).
- **Dimensions**: Exactly identical width and height as the original photograph.
- **Pixel Values**:
  - `255` (White): Positive surface class (Wall or Floor).
  - `0` (Black): Everything else (background, furniture, windows, doors, ceiling, rugs).
- **Mutual Exclusivity**: A pixel MUST NEVER be positive in both wall and floor masks ($Wall \cap Floor = \emptyset$).

## 3. Surface Inclusion and Exclusion Rules

### A. Wall Class (`*_wall_gt.png`)
- **Include**:
  - All vertical painted walls, wallpapered surfaces, and structural columns.
  - Wall surface behind transparent or glass tables if clearly visible.
- **Exclude**:
  - Windows, windowpanes, and window frames.
  - Doors, doorframes, and thresholds.
  - Wall-mounted furniture, cabinets, shelves, clocks, televisions, and paintings.
  - Curtains and drapes covering the wall.
  - Ceiling and molding.

### B. Floor Class (`*_floor_gt.png`)
- **Include**:
  - Bare flooring: hardwood, laminate, vinyl, ceramic tiles, marble, polished concrete.
- **Exclude**:
  - Rugs, carpets, doormats, and runners (these belong to ADE20K class `rug, carpet, mat`).
  - Furniture legs, sofa bases, bed skirts resting on the floor.
  - Floor lamps, waste bins, plant pots, decorative items.
  - Steps, stairs, and thresholds (unless continuous flat surface).

## 4. Recommended Annotation Tools

1. **CVAT (Computer Vision Annotation Tool)**: Free, open-source web-based polygon and brush annotation tool.
2. **Labelme**: Lightweight desktop Python annotation tool (`pip install labelme`).
3. **Roboflow**: Cloud-based annotation with SAM (Segment Anything) assisted polygon extraction.

## 5. IoU Metric Policy

Intersection over Union (Jaccard Index) is computed as:

$$\text{IoU} = \frac{|P \cap GT|}{|P \cup GT|}$$

**Zero Union Policy:**
- When $|P \cup GT| = 0$ (both prediction and ground truth contain 0 pixels): $\text{IoU} = 1.0$, rewarding true negative detection.
- When one set is empty and the other contains pixels: $\text{IoU} = 0.0$.

