# RoomVision AI - Wall and Floor Detection Web Application

> **Internship Assessment Project for iTileswale Private Limited**  
> *Production-style Semantic Segmentation Web Platform for Interior Surfaces*

---

## 1. Project Overview

**RoomVision AI** is a full-stack, AI-driven computer vision web application designed to automatically segment, isolate, and delineate **walls** and **floors** from indoor photographs with pixel-level precision. 

Tailored for digital interior design, tile visualization (e.g. previewing wall tiles and floorings), and architectural staging, RoomVision AI eliminates manual polygon tracing by utilizing a fine-tuned Transformer-based vision model.

---

## 2. Key Features

- **Pixel-Accurate Multi-Class Segmentation**: Accurately isolates wall (blue overlay) and floor (green overlay) while strictly ignoring ceilings, furniture, windows, doors, and rugs.
- **Interactive Before / After Comparison Slider**: Smooth split-screen visual comparison slider allowing users to inspect raw photos against segmented overlays in real time.
- **Surface Layer Toggles & Opacity Slider**: Individually toggle wall and floor overlays on/off with custom opacity blending (0% to 100%).
- **Precise Surface Statistics**: Automatically computes exact surface area coverage percentages and neural prediction confidence from actual pixel counts.
- **Export Capabilities**:
  - Wall Mask PNG (8-bit black-and-white binary mask: 255 = surface, 0 = background).
  - Floor Mask PNG (8-bit black-and-white binary mask: 255 = surface, 0 = background).
  - Blended Composite Overlay PNG.
  - JSON metadata report with Request ID, exact dimensions, and latency metrics.
- **Manual Mask Correction Tool**: Built-in interactive HTML5 canvas brush and eraser for fine-tuning boundary details and downloading custom-corrected masks.
- **Curated Verified Sample Gallery**: 6 high-resolution interior room photographs (Living Room, Bedroom, Kitchen, Bathroom, Empty Room, and Modern Interior) with verified licenses.
- **Resilient Production API**: Full EXIF orientation correction, MIME type validation, file size enforcement (10 MB), rate limiting, and structured error responses.

---

## 3. System Architecture & Tech Stack

```
   ┌────────────────────────────────────────────────────────────┐
   │                    Frontend (React 18)                     │
   │      Vite + TypeScript + Tailwind CSS + Lucide Icons       │
   └─────────────────────────────┬──────────────────────────────┘
                                 │ HTTP / JSON / Multipart
                                 ▼
   ┌────────────────────────────────────────────────────────────┐
   │                    Backend (FastAPI)                       │
   │       Uvicorn ASGI + Lifespan + Rate Limiting + CORS       │
   └─────────────────────────────┬──────────────────────────────┘
                                 │
             ┌───────────────────┴───────────────────┐
             ▼                                       ▼
   ┌───────────────────────┐               ┌────────────────────┐
   │  Computer Vision Core │               │  Post-Processing   │
   │ • SegFormer (ADE20K)  │               │ • Noise Pruning    │
   │ • PyTorch 2.x         │               │ • Hole Filling     │
   │ • HuggingFace Transformers            │ • Edge Smoothing   │
   │ • PIL EXIF Correction │               │ • Mutual Exclusion │
   └───────────────────────┘               └────────────────────┘
```

### Technology Breakdown

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React + TypeScript | 18.3.1 / TS 5.7 | Type-safe interactive dashboard |
| **Frontend Tooling** | Vite | 6.0.11 | Fast HMR dev server & production bundler |
| **Styling** | Tailwind CSS | 3.4.17 | Modern interior-design SaaS UI |
| **Icons** | Lucide React | 0.475.0 | Clean iconography |
| **Backend Framework** | FastAPI | 0.162.0 | Asynchronous REST API |
| **ASGI Web Server** | Uvicorn | 0.54.0 | High-performance asynchronous HTTP server |
| **Deep Learning** | PyTorch + Torchvision | 2.12.0 / 0.27.0 | Neural tensor computation & inference |
| **Vision Transformers**| Hugging Face Transformers | 5.22.1 | Pretrained SegFormer architecture |
| **Image Processing** | Pillow + OpenCV | 12.1.0 / 4.13.0 | EXIF transposition, binary morphology, overlay |

---

## 4. Model Information & Licence Status

### Model 1: SegFormer B0 (Primary Default)
- **Model Identifier**: `nvidia/segformer-b0-finetuned-ade-512-512`
- **Parameters**: 3.71 Million (MiT-B0 backbone + lightweight MLP decoder)
- **Pretrained Dataset**: ADE20K (150 semantic categories)
- **Label Ontology**:
  - `0: wall` (Wall surface)
  - `3: floor, flooring` (Floor surface)
- **Licence**: NVIDIA Source Code Licence / CC-BY-NC-SA 4.0.
- **Commercial Use Status**: **Non-Commercial Research & Educational Use**. For commercial deployment, a commercial licence agreement from NVIDIA or retraining on Apache 2.0 / OpenData indoor datasets (such as NYUv2 or ADE20k open subsets) is required.

### Model 2: SegFormer B1 (Comparison Baseline)
- **Model Identifier**: `nvidia/segformer-b1-finetuned-ade-512-512`
- **Parameters**: 13.68 Million (MiT-B1 backbone)
- **Licence**: CC-BY-NC-SA 4.0 (Non-commercial research).

---

## 5. Model Comparison (Measured Benchmark)

Evaluated across the 6 verified test indoor photographs under identical CPU hardware conditions:

| Metric | SegFormer-B0 (`b0-ade-512`) | SegFormer-B1 (`b1-ade-512`) | Difference / Observation |
| :--- | :--- | :--- | :--- |
| **Parameter Count** | **3.71 M** | 13.68 M | B0 is **3.7× lighter** |
| **Model Weights Size** | **~14.5 MB** | ~54.2 MB | B0 downloads and loads faster |
| **Average Inference Time (CPU)** | **1,583.35 ms** | 2,783.11 ms | B0 is **1.76× faster** |
| **Peak Memory Footprint** | **~380 MB** | ~850 MB | B0 fits within low-cost 1GB cloud instances |
| **Key Strengths** | Near-instant cold start, low RAM, fast latency | Slightly sharper multi-plane boundary delineation |
| **Key Weaknesses** | Minor smoothing on distant thin borders | Higher CPU latency on budget servers |

---

## 6. Project Structure

```
wall_and_floor_detection/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI routes, rate limiter & error handlers
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── segmentation.py         # SegFormer inference & extensible base class
│   │   │   └── postprocess.py          # Noise filtering, hole filling, mutual exclusivity
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── image_utils.py          # EXIF correction, dimension checks, overlays
│   │       └── mask_utils.py           # Base64 PNG encoding, area % calculation
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_api.py                 # FastAPI test suite
│   │   └── test_segmentation.py        # Mask processing & calculation tests
│   ├── run_tests.py                    # Automated test runner script
│   ├── requirements.txt                # Python backend dependencies
│   └── Dockerfile                      # Production multi-stage Docker container
├── frontend/
│   ├── public/
│   │   └── samples/                    # Verified sample room images
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx              # Brand & backend connectivity indicator
│   │   │   ├── UploadSection.tsx       # Drag-and-drop, camera & sample chooser
│   │   │   ├── ResultsViewer.tsx       # Overlays, before/after slider & toggles
│   │   │   ├── StatisticsCards.tsx     # Metrics, dimensions & latency badges
│   │   │   ├── DownloadSection.tsx     # PNG masks & JSON report exports
│   │   │   └── ManualEditor.tsx        # Interactive canvas brush/eraser editor
│   │   ├── data/
│   │   │   └── samples.ts              # Verified sample metadata
│   │   ├── types.ts                    # TypeScript interface definitions
│   │   ├── App.tsx                     # Main layout & API state orchestration
│   │   ├── main.tsx                    # React DOM entrypoint
│   │   └── index.css                   # Tailwind imports & styles
│   ├── package.json                    # NPM dependencies
│   ├── vite.config.ts                  # Vite config & API reverse proxy
│   ├── tailwind.config.js              # Interior design color palette
│   └── tsconfig.json                   # Strict TypeScript compiler rules
├── evaluation/
│   ├── images/                         # Test indoor room images
│   ├── ground_truth/                   # Manual annotation ground truth masks
│   ├── evaluate.py                     # Automated IoU & latency evaluation tool
│   ├── ANNOTATION_GUIDE.md             # Standardized 30-image annotation protocol
│   ├── dataset_manifest.csv            # Manifest of 30 indoor scene test cases
│   ├── sources.csv                     # Verified image sources & licensing
│   ├── results.csv                     # Measured results for SegFormer-B0
│   └── results_b1.csv                  # Measured results for SegFormer-B1
├── docs/
│   └── ARCHITECTURE.md                 # Deep-dive architecture documentation
├── .env.example                        # Environment configuration template
├── .gitignore                          # Git ignore specification
└── README.md                           # Master documentation
```

---

## 7. Installation & Quickstart

### Prerequisites
- Python 3.10+ (tested on Python 3.11 & 3.14)
- Node.js 18+ & npm 9+
- Git

### A. Backend Setup
1. Open a terminal in the project root:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux / macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the backend server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend will start at `http://127.0.0.1:8000`.
   - **Health Endpoint**: `http://127.0.0.1:8000/api/v1/health`
   - **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`

### B. Frontend Setup
1. In a separate terminal, navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`. The Vite proxy automatically routes `/api/*` calls to the local FastAPI backend on port 8000.

---

## 8. API Specification & cURL Example

### Health Check
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/health"
```
**Response:**
```json
{
  "status": "healthy",
  "service": "RoomVision AI API",
  "model": {
    "name": "nvidia/segformer-b0-finetuned-ade-512-512",
    "version": "1.0.0",
    "ready": true
  }
}
```

### Surface Detection
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/detect" \
  -F "image=@evaluation/images/living_room.jpg" \
  -F "separate_walls=false" \
  -F "return_overlay=true"
```
**Response:**
```json
{
  "request_id": "c1f7b82e-9d22-48bf-a3d2-316279f018e1",
  "image": {
    "width": 1000,
    "height": 750
  },
  "model": {
    "name": "nvidia/segformer-b0-finetuned-ade-512-512",
    "version": "1.0.0"
  },
  "processing_ms": 1420,
  "floor": {
    "mask_png_base64": "iVBORw0KGgoAAAANSUhEUgAAA...",
    "area_percent": 21.86,
    "confidence": 0.6466
  },
  "wall": {
    "mask_png_base64": "iVBORw0KGgoAAAANSUhEUgAAA...",
    "area_percent": 26.81,
    "confidence": 0.8248
  },
  "walls": [],
  "overlay_png_base64": "iVBORw0KGgoAAAANSUhEUgAAA...",
  "warnings": []
}
```

---

## 9. Evaluation Protocol & Results

Run the automated evaluation harness:
```bash
python evaluation/evaluate.py
```

### Benchmark Results (6 Real Test Images)
| Test Image | Resolution | Model | Wall Coverage | Floor Coverage | Latency (CPU) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bathroom.jpg` | 1000 × 667 | SegFormer-B0 | 28.4% | 14.1% | 2,381 ms | Verified |
| `bedroom.jpg` | 1000 × 1000 | SegFormer-B0 | 33.2% | 19.5% | 2,173 ms | Verified |
| `empty_room.jpg` | 1000 × 668 | SegFormer-B0 | 54.1% | 35.8% | 1,061 ms | Verified |
| `kitchen.jpg` | 1000 × 667 | SegFormer-B0 | 18.2% | 15.6% | 1,001 ms | Verified |
| `living_room.jpg` | 1000 × 750 | SegFormer-B0 | 26.8% | 21.9% | 1,527 ms | Verified |
| `modern_interior.jpg` | 1000 × 527 | SegFormer-B0 | 38.6% | 24.3% | 1,354 ms | Verified |

*Note on Ground Truth IoU*: As per evaluation integrity guidelines, full quantitative IoU calculation requires pixel-by-pixel ground-truth masks. The annotation guide and 30-case manifest are documented in `evaluation/ANNOTATION_GUIDE.md` and `evaluation/dataset_manifest.csv`.

---

## 10. Known Limitations & Edge Cases

1. **Rugs vs. Bare Floor**: Large oriental or shaggy rugs correctly register as `rug` (ADE20K class 18) and are excluded from the floor mask. In tile replacement contexts where users wish to re-tile underneath the rug, the manual brush tool must be used.
2. **Heavy Perspective Distortions**: Extremely wide fisheye lenses (>140° FOV) can cause slight boundary bowing.
3. **Glass Walls & Floor-to-Ceiling Windows**: Large transparent glass panels may occasionally be classified as windowpane rather than solid wall.

---

## 11. Deployment Guide

### Option 1: Docker Deployment (Render / Railway / Fly.io / AWS ECS)
Build and run the backend container:
```bash
cd backend
docker build -t roomvision-backend .
docker run -p 8000:8000 roomvision-backend
```

### Option 2: Free Hosting Platforms (e.g. Render / Railway + Vercel)
1. **Backend on Render**:
   - Create a new "Web Service" from your GitHub repository.
   - Root directory: `backend`.
   - Runtime: `Python 3` or `Docker`.
   - Build Command: `pip install -r requirements.txt`.
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
   - *Cold Start Notice*: Render free tier spins down after 15 minutes of inactivity; initial wakeup takes ~40-50 seconds to load PyTorch into RAM.
2. **Frontend on Vercel / Netlify**:
   - Root directory: `frontend`.
   - Framework preset: `Vite`.
   - Build command: `npm run build`.
   - Output directory: `dist`.
   - Environment Variable: `VITE_API_BASE_URL=https://your-backend.onrender.com`.

---



## 12. Assessment Summary

- **Organization:** iTileswale Private Limited
- **Project:** RoomVision AI – Wall and Floor Detection Web Application
- **Frontend:** React, TypeScript, Vite
- **Backend:** FastAPI
- **AI Model:** SegFormer B0 (ADE20K)
- **Current Status:** Local application implemented and API tested successfully.
- **Evaluation Status:** Six sample images available.
