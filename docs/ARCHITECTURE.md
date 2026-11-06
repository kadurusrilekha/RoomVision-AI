# RoomVision AI - Architecture & System Design

## 1. System Overview

RoomVision AI is a high-precision, production-grade semantic segmentation web application engineered for automated detection and delineation of walls and floors in interior room photographs.

The application serves interior design platforms, tile and flooring visualization suites (such as iTileswale), architectural staging systems, and AR/VR spatial reconstruction pipelines.

```
                      ┌──────────────────────────────────────┐
                      │          React 18 Dashboard          │
                      │   (Vite + TypeScript + Tailwind CSS) │
                      └──────────────────┬───────────────────┘
                                         │
                         REST / Multipart/Form-Data
                         (HTTP GET / POST / OpenAPI)
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │          FastAPI Application         │
                      │    (Async Lifespan, Rate Limiter)    │
                      └──────────────────┬───────────────────┘
                                         │
                      ┌──────────────────┴───────────────────┐
                      │                                      │
                      ▼                                      ▼
           ┌──────────────────────┐              ┌──────────────────────┐
           │ Input Preprocessing  │              │ Inference Semaphore  │
           │ • EXIF Transposition │              │ • Concurrency Shield │
           │ • Magic Byte Verify  │              │ • Memory Safeguard   │
           │ • RGB Normalization  │              └──────────┬───────────┘
           └──────────┬───────────┘                         │
                      │                                     │
                      └──────────────────┬──────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │   SegFormer ADE20K Segmentation      │
                      │ (nvidia/segformer-b0-finetuned-ade)  │
                      │ • Transformer Encoder & MLP Decoder  │
                      │ • Class 0: Wall | Class 3: Floor     │
                      │ • Argmax multi-class competition     │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │        Mask Post-Processing          │
                      │ • Connected Component Noise Pruning │
                      │ • Conservative Hole Filling          │
                      │ • Morphological Edge Smoothing       │
                      │ • Wall/Floor Mutual Exclusivity      │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │          Output Generation           │
                      │ • 8-bit B&W Masks (0 & 255 PNG)      │
                      │ • Blended Alpha Composite (Blue/Grn) │
                      │ • Area Coverage % & Confidence Metric│
                      └──────────────────────────────────────┘
```

## 2. Neural Vision & Multi-Class Semantic Reasoning

### The ADE20K Label Ontology
In indoor scene understanding, a binary classifier or simple color detector fails when encountering rugs, carpets, baseboards, furniture, or open windows.

RoomVision AI leverages SegFormer fine-tuned on the ADE20K 150-category dataset:
- **Class 0**: `wall`
- **Class 3**: `floor, flooring`
- **Class 5**: `ceiling` (strictly distinguished from wall)
- **Class 10**: `bed`
- **Class 15**: `table`
- **Class 18**: `rug, carpet, mat` (distinguished from bare floor)
- **Class 22**: `windowpane` (distinguished from surrounding wall)
- **Class 32**: `door` (distinguished from wall)

By executing `torch.argmax` across all 150 probability channels, the model ensures that objects resting on or embedded within surfaces are **NOT falsely classified as wall or floor**.

## 3. Post-Processing Pipeline

Raw upsampled neural predictions can exhibit minor stair-stepping artifacts from bilinear interpolation and specks from lighting variations. The post-processing pipeline refines the masks deterministically:

1. **Noise Pruning**: Discard connected components smaller than 250 pixels.
2. **Selective Hole Filling**: Invert the mask and fill isolated voids $\le 600$ pixels (lighting glints or minor shadow noise) while preserving larger structural openings (windows, doors, pictures).
3. **Boundary Smoothing**: Morphological closing followed by opening with a $3 \times 3$ elliptical kernel eliminates boundary roughness without blunting corner intersections.
4. **Mutual Exclusivity Enforcement**: If any pixel is activated in both masks, vertical spatial priors resolve contention (lower vertical coordinates prioritize floor; upper vertical coordinates prioritize wall).

## 4. API Endpoints

- `GET /api/v1/health`: Returns service health, loaded model name, and operational status.
- `POST /api/v1/detect`: Multipart image detection accepting JPEG, PNG, WEBP files up to 10 MB.
- `GET /docs`: Interactive Swagger OpenAPI documentation.

