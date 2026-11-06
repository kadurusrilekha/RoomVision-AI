"""Evaluation script for calculating Wall & Floor Intersection-over-Union (IoU) metrics."""

import os
import sys
import time
import argparse
import csv
from typing import Tuple, Dict, Any, List
import numpy as np
from PIL import Image

# Add backend to sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.segmentation import get_model


def calculate_iou(pred_mask: np.ndarray, gt_mask: np.ndarray) -> float:
    """
    Compute Intersection over Union (IoU) between binary prediction and ground truth.
    
    Zero Union Policy:
    - If both prediction and ground truth have 0 positive pixels:
      IoU = 1.0 (True Negative: class is correctly absent in both)
    - If one has positive pixels and the other has 0 pixels:
      IoU = 0.0 (False Positive or False Negative)
    """
    pred_bin = (pred_mask > 0).astype(bool)
    gt_bin = (gt_mask > 0).astype(bool)

    intersection = np.logical_and(pred_bin, gt_bin).sum()
    union = np.logical_or(pred_bin, gt_bin).sum()

    if union == 0:
        return 1.0
    return float(intersection / union)


def evaluate_dataset(
    images_dir: str,
    ground_truth_dir: str,
    model_name: str,
    output_csv: str
) -> Dict[str, Any]:
    print(f"\n=======================================================")
    print(f"RUNNING MODEL EVALUATION: {model_name}")
    print(f"Images Directory:       {images_dir}")
    print(f"Ground Truth Directory: {ground_truth_dir}")
    print(f"Output CSV:             {output_csv}")
    print(f"=======================================================\n")

    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(ground_truth_dir, exist_ok=True)

    image_files = [
        f for f in sorted(os.listdir(images_dir))
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
    ]

    if not image_files:
        print(f"[ERROR] No image files found in {images_dir}.")
        return {"error": "No images found"}

    print(f"Found {len(image_files)} test images in {images_dir}.")

    # Load segmentation model
    print(f"Loading segmentation model: {model_name}...")
    model = get_model(model_name)
    print("Model initialized successfully.\n")

    results: List[Dict[str, Any]] = []
    wall_ious: List[float] = []
    floor_ious: List[float] = []
    latencies_ms: List[float] = []
    missing_gt_count = 0

    for idx, img_filename in enumerate(image_files, start=1):
        img_path = os.path.join(images_dir, img_filename)
        base_name = os.path.splitext(img_filename)[0]

        # Ground truth filenames expected: {base_name}_wall_gt.png and {base_name}_floor_gt.png
        wall_gt_path = os.path.join(ground_truth_dir, f"{base_name}_wall_gt.png")
        floor_gt_path = os.path.join(ground_truth_dir, f"{base_name}_floor_gt.png")

        has_wall_gt = os.path.exists(wall_gt_path)
        has_floor_gt = os.path.exists(floor_gt_path)

        # Open image
        try:
            image = Image.open(img_path).convert("RGB")
        except Exception as e:
            print(f"[{idx}/{len(image_files)}] Failed to open {img_filename}: {e}")
            continue

        orig_w, orig_h = image.size

        # Model inference with precise timing
        t0 = time.perf_counter()
        wall_pred, floor_pred, wall_conf, floor_conf, warnings = model.predict(image)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        latencies_ms.append(elapsed_ms)

        wall_iou: Optional[float] = None
        floor_iou: Optional[float] = None
        evaluation_status = "PENDING_ANNOTATION"

        if has_wall_gt and has_floor_gt:
            try:
                wall_gt = np.array(Image.open(wall_gt_path).convert("L"))
                floor_gt = np.array(Image.open(floor_gt_path).convert("L"))

                # Resize GT to match original image if needed
                if wall_gt.shape != (orig_h, orig_w):
                    wall_gt = np.array(Image.fromarray(wall_gt).resize((orig_w, orig_h), Image.NEAREST))
                if floor_gt.shape != (orig_h, orig_w):
                    floor_gt = np.array(Image.fromarray(floor_gt).resize((orig_w, orig_h), Image.NEAREST))

                wall_iou = round(calculate_iou(wall_pred, wall_gt), 4)
                floor_iou = round(calculate_iou(floor_pred, floor_gt), 4)
                wall_ious.append(wall_iou)
                floor_ious.append(floor_iou)
                evaluation_status = "EVALUATED"

                print(
                    f"[{idx}/{len(image_files)}] {img_filename:24} | "
                    f"Wall IoU: {wall_iou:.4f} | Floor IoU: {floor_iou:.4f} | "
                    f"Latency: {elapsed_ms:.1f}ms"
                )
            except Exception as e:
                evaluation_status = f"GT_READ_ERROR: {e}"
                print(f"[{idx}/{len(image_files)}] Error reading GT for {img_filename}: {e}")
        else:
            missing_gt_count += 1
            print(
                f"[{idx}/{len(image_files)}] {img_filename:24} | "
                f"Predicted in {elapsed_ms:.1f}ms | Ground truth missing in {ground_truth_dir}"
            )

        results.append({
            "image": img_filename,
            "width": orig_w,
            "height": orig_h,
            "model": model_name,
            "wall_iou": wall_iou if wall_iou is not None else "N/A",
            "floor_iou": floor_iou if floor_iou is not None else "N/A",
            "wall_confidence": wall_conf,
            "floor_confidence": floor_conf,
            "processing_ms": round(elapsed_ms, 2),
            "status": evaluation_status
        })

    # Save to CSV
    fieldnames = [
        "image", "width", "height", "model", "wall_iou", "floor_iou",
        "wall_confidence", "floor_confidence", "processing_ms", "status"
    ]
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    avg_wall_iou = round(float(np.mean(wall_ious)), 4) if wall_ious else None
    avg_floor_iou = round(float(np.mean(floor_ious)), 4) if floor_ious else None
    avg_latency = round(float(np.mean(latencies_ms)), 2) if latencies_ms else None

    print("\n-------------------------------------------------------")
    print("EVALUATION SUMMARY")
    print("-------------------------------------------------------")
    print(f"Total test images:       {len(image_files)}")
    print(f"Evaluated with GT:       {len(wall_ious)}")
    print(f"Missing ground truth:    {missing_gt_count}")
    if avg_wall_iou is not None:
        print(f"Average Wall IoU:        {avg_wall_iou}")
        print(f"Average Floor IoU:       {avg_floor_iou}")
        print(f"Mean IoU (mIoU):         {round((avg_wall_iou + avg_floor_iou)/2, 4)}")
    else:
        print("Average IoU:             [INCOMPLETE - Missing Ground Truth Annotations]")
    print(f"Average Inference Time:  {avg_latency} ms")
    print(f"Per-image results saved: {output_csv}")
    print("-------------------------------------------------------\n")

    return {
        "total_images": len(image_files),
        "evaluated_images": len(wall_ious),
        "missing_gt": missing_gt_count,
        "avg_wall_iou": avg_wall_iou,
        "avg_floor_iou": avg_floor_iou,
        "avg_latency_ms": avg_latency,
        "csv_path": output_csv
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate Wall and Floor Detection Segmentation Models")
    parser.add_argument("--images", default=os.path.join(CURRENT_DIR, "images"), help="Path to test images")
    parser.add_argument("--gt", default=os.path.join(CURRENT_DIR, "ground_truth"), help="Path to ground truth masks")
    parser.add_argument("--model", default="nvidia/segformer-b0-finetuned-ade-512-512", help="Hugging Face model ID")
    parser.add_argument("--output", default=os.path.join(CURRENT_DIR, "results.csv"), help="Output CSV path")

    args = parser.parse_args()
    evaluate_dataset(
        images_dir=args.images,
        ground_truth_dir=args.gt,
        model_name=args.model,
        output_csv=args.output
    )


if __name__ == "__main__":
    main()

