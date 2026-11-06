# RoomVision AI - Internship Walkthrough & Interview Guide

This guide is designed to help you ace your technical walkthrough and presentation for **iTileswale Private Limited**.

---

## 1. Project High-Level Summary (Elevator Pitch)

> "RoomVision AI is an end-to-end computer vision web platform built to automate the segmentation of walls and floors from standard indoor room photographs. In tile visualization platforms like iTileswale, customers want to preview new floor tiles or wall claddings inside their actual rooms. Instead of requiring users to painstakingly draw polygons around furniture, doors, and rugs, RoomVision AI leverages SegFormer fine-tuned on ADE20K to segment surfaces at pixel precision in under 1.5 seconds, providing instant binary masks, alpha overlays, before/after comparisons, and an interactive manual touchup tool."

---

## 2. Key Technical Talking Points

### A. Why SegFormer and Not a Simple CNN / UNet or Color Thresholding?
- **Global Context vs Local Receptive Fields**: Traditional CNNs rely on small local convolutions, often confusing a large wooden wardrobe with a wooden floor or a white table with a white wall. SegFormer’s Hierarchical Mix Transformer (MiT) captures long-range spatial dependencies across the entire room.
- **Efficiency**: SegFormer-B0 contains only **3.71M parameters** (~14.5 MB), enabling fast inference on budget CPU servers without expensive GPU requirements.
- **Positional Encoding Free**: Unlike standard ViTs that fail when resized, SegFormer uses Overlapped Patch Merging without fixed positional embeddings, allowing it to process any aspect ratio or resolution seamlessly.

### B. The 150-Class ADE20K Advantage (Argmax Multi-Class Reasoning)
- Emphasize that you **do not use binary thresholding** (which would blindly classify rugs, sofa legs, and windows as floor/wall).
- In the backend (`backend/app/services/segmentation.py`), inference computes `torch.argmax` across all 150 ADE20K categories:
  - Class `0` (`wall`)
  - Class `3` (`floor, flooring`)
  - Class `5` (`ceiling`)
  - Class `18` (`rug, carpet, mat`)
  - Class `22` (`windowpane`)
  - Class `32` (`door`)
- If a pixel is a rug on a hardwood floor, class 18 wins the argmax competition and is naturally excluded from the floor mask.

### C. The Post-Processing Pipeline (`app/services/postprocess.py`)
- **Noise Pruning**: Uses `cv2.connectedComponentsWithStats` to drop disconnected pixel fragments under 250px.
- **Hole Filling**: Inverts the mask to identify interior voids caused by lighting glints/reflections and fills small voids ($\le 600$px) while preserving intentional cutouts like wall artwork or windows.
- **Boundary Smoothing**: Applies morphological closing/opening with a $3 \times 3$ elliptical kernel to smooth bilinear interpolation jaggedness without softening structural room corners.
- **Mutual Exclusivity**: Ensures $Wall \cap Floor = \emptyset$, resolving rare boundary overlap using vertical spatial heuristics (lower rows prioritize floor, upper rows prioritize wall).

### D. Production Best Practices Implemented
- **Concurrency Protection**: An `asyncio.Semaphore` guards the inference engine against memory spikes under concurrent load (returning HTTP 503 `BUSY`).
- **Memory Optimization**: No user images are permanently written to disk. Processing uses in-memory streams and cleans up immediately.
- **Rate Limiting**: Sliding window rate limiter (60 req/min per IP) returning HTTP 429 `TOO_MANY_REQUESTS`.
- **Validation**: Enforces 10 MB file size, JPG/PNG/WEBP formats via magic bytes, max 8000px dimensions, and warns on low resolutions (< 512px).
- **EXIF Transposition**: Automatically handles smartphone image orientation flags using `PIL.ImageOps.exif_transpose`.

---

## 3. Anticipated Interview Questions & Ideal Answers

### Q1: "How did you ensure the label IDs were accurate?"
**Answer:**  
*"I inspected the model configuration directly via HuggingFace `AutoConfig.from_pretrained('nvidia/segformer-b0-finetuned-ade-512-512').id2label`. I verified that Class `0` is `'wall'` and Class `3` is `'floor'`. The backend dynamically asserts and queries these mappings on startup rather than hardcoding guessed indices."*

### Q2: "How would you handle a user who wants to visualize tiles underneath a rug?"
**Answer:**  
*"Since the model correctly identifies rugs as non-floor to avoid distorted previews on carpets, we implemented the Manual Mask Correction tool in the frontend (`ManualEditor.tsx`). A user can switch to the interactive canvas brush and paint over the rug area in seconds, then download or apply the customized mask."*

### Q3: "Why did you choose SegFormer-B0 over SegFormer-B1 or B2?"
**Answer:**  
*"In our benchmark evaluation across identical test images (`evaluation/results.csv` vs `evaluation/results_b1.csv`), SegFormer-B0 averaged 1,583 ms on CPU with a 14.5 MB weight footprint, whereas B1 took 2,783 ms (76% slower) and required 54 MB. For a SaaS platform deployed on cost-effective CPU servers, B0 delivers the optimal balance of high visual fidelity and low interactive latency."*

### Q4: "What is your quantitative evaluation strategy?"
**Answer:**  
*"We implemented `evaluation/evaluate.py` which computes Intersection over Union (IoU) for wall and floor surfaces against ground truth. We established a strict zero-union policy where if both prediction and ground truth have 0 pixels, IoU is 1.0 (true negative). In `evaluation/ANNOTATION_GUIDE.md` and `evaluation/dataset_manifest.csv`, we defined a standardized protocol for 30 diverse indoor scenes covering furnished rooms, bare rooms, and commercial spaces."*

