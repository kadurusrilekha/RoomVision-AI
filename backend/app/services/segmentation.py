"""AI Segmentation Service supporting SegFormer ADE20K and extensible architectures."""

import time
from abc import ABC, abstractmethod
from typing import Tuple, List, Dict, Optional
import numpy as np
import cv2
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForSemanticSegmentation, AutoConfig

from app.utils.image_utils import apply_exif_orientation, ensure_rgb
from app.services.postprocess import postprocess_wall_and_floor


class BaseSegmentationModel(ABC):
    """Abstract base class for segmentation model backends."""

    def __init__(self, model_name: str, model_version: str):
        self.model_name = model_name
        self.model_version = model_version
        self.is_ready = False
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.wall_label_id: Optional[int] = None
        self.floor_label_id: Optional[int] = None

    @abstractmethod
    def load(self) -> None:
        """Load model weights and preprocessor into memory."""
        pass

    @abstractmethod
    def predict(
        self, image: Image.Image
    ) -> Tuple[np.ndarray, np.ndarray, float, float, List[str]]:
        """
        Run inference on the given PIL image.
        Returns:
            (wall_mask, floor_mask, wall_confidence, floor_confidence, warnings)
            where masks are uint8 numpy arrays with shape (H, W) containing 0 and 255.
        """
        pass


class SegFormerADESegmentation(BaseSegmentationModel):
    """
    SegFormer Semantic Segmentation pretrained on ADE20K dataset.
    Accurately segments Wall (class 0) and Floor (class 3) using transformer attention.
    """

    def __init__(
        self,
        hf_model_id: str = "nvidia/segformer-b0-finetuned-ade-512-512",
        model_version: str = "1.0.0"
    ):
        super().__init__(model_name=hf_model_id, model_version=model_version)
        self.hf_model_id = hf_model_id
        self.processor: Optional[AutoImageProcessor] = None
        self.model: Optional[AutoModelForSemanticSegmentation] = None

    def load(self) -> None:
        """Load SegFormer model and extract exact ADE20K label IDs."""
        torch.manual_seed(42)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(42)

        config = AutoConfig.from_pretrained(self.hf_model_id)
        id2label = config.id2label

        # Verify ADE20K wall and floor label IDs dynamically from model configuration
        # In ADE20K: label 0 is 'wall', label 3 is 'floor, flooring'
        wall_matches = [int(k) for k, v in id2label.items() if v.lower() == "wall"]
        floor_matches = [int(k) for k, v in id2label.items() if "floor" in v.lower()]

        if not wall_matches:
            raise ValueError(f"Wall label not found in model {self.hf_model_id} id2label mapping")
        if not floor_matches:
            raise ValueError(f"Floor label not found in model {self.hf_model_id} id2label mapping")

        self.wall_label_id = wall_matches[0]
        self.floor_label_id = floor_matches[0]

        self.processor = AutoImageProcessor.from_pretrained(self.hf_model_id)
        self.model = AutoModelForSemanticSegmentation.from_pretrained(self.hf_model_id)
        self.model.to(self.device)
        self.model.eval()
        self.is_ready = True

    def predict(
        self, image: Image.Image
    ) -> Tuple[np.ndarray, np.ndarray, float, float, List[str]]:
        if not self.is_ready or self.model is None or self.processor is None:
            raise RuntimeError("Segmentation model is not loaded.")

        warnings: List[str] = []

        # 1. EXIF orientation correction & RGB normalization
        corrected_image = apply_exif_orientation(image)
        rgb_image = ensure_rgb(corrected_image)
        orig_w, orig_h = rgb_image.size

        # 2. Preprocess input for SegFormer (deterministic)
        inputs = self.processor(images=rgb_image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # 3. Model inference
        with torch.inference_mode():
            outputs = self.model(**inputs)
            logits = outputs.logits  # shape: [batch_size, 150, 128, 128] (only ~9.8 MB)

            # 4. Softmax probabilities and argmax multi-class decision at native resolution
            probs = F.softmax(logits, dim=1)[0]
            pred = torch.argmax(logits, dim=1)[0]

            # 5. Confidence calculation directly on predicted surface pixels
            wall_mask_native = (pred == self.wall_label_id)
            floor_mask_native = (pred == self.floor_label_id)

            if wall_mask_native.any():
                wall_conf = float(probs[self.wall_label_id, wall_mask_native].mean().cpu().item())
                wall_conf = round(wall_conf, 4)
            else:
                wall_conf = 0.0
                warnings.append("No wall detected in the uploaded image.")

            if floor_mask_native.any():
                floor_conf = float(probs[self.floor_label_id, floor_mask_native].mean().cpu().item())
                floor_conf = round(floor_conf, 4)
            else:
                floor_conf = 0.0
                warnings.append("No floor detected in the uploaded image.")

            # Free PyTorch tensors immediately to maintain ultra-low RAM footprint (<150MB)
            pred_np = pred.to(torch.int16).cpu().numpy()
            del logits, probs, outputs

            # Resize the integer class map to original dimensions (orig_h, orig_w)
            pred_classes = cv2.resize(pred_np, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)

        # 6. Extract raw binary masks
        wall_raw = (pred_classes == self.wall_label_id).astype(np.uint8)
        floor_raw = (pred_classes == self.floor_label_id).astype(np.uint8)

        # 7. Post-processing (remove noise, fill tiny holes, smooth boundary, ensure mutual exclusion, enforce object exclusions)
        wall_clean, floor_clean = postprocess_wall_and_floor(
            wall_raw, floor_raw, height=orig_h, width=orig_w, pred_classes=pred_classes
        )

        return wall_clean, floor_clean, wall_conf, floor_conf, warnings


class SegFormerB1ADESegmentation(SegFormerADESegmentation):
    """
    SegFormer B1 Semantic Segmentation (13.7M parameters) pretrained on ADE20K.
    Offers enhanced capacity and feature extraction compared to SegFormer B0.
    """

    def __init__(
        self,
        hf_model_id: str = "nvidia/segformer-b1-finetuned-ade-512-512",
        model_version: str = "1.0.0"
    ):
        super().__init__(hf_model_id=hf_model_id, model_version=model_version)


# Global singleton instance holder
_active_model: Optional[BaseSegmentationModel] = None


def get_model(model_name: str = "nvidia/segformer-b0-finetuned-ade-512-512") -> BaseSegmentationModel:
    """Retrieve or initialize the active segmentation model singleton."""
    global _active_model
    if _active_model is None or _active_model.model_name != model_name:
        if "b1" in model_name.lower():
            _active_model = SegFormerB1ADESegmentation(hf_model_id=model_name)
        else:
            _active_model = SegFormerADESegmentation(hf_model_id=model_name)
        _active_model.load()
    return _active_model


