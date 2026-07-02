"""EfficientNet-B0 disease detector with full inference configuration."""
import io
import json
import os
from dataclasses import dataclass
from typing import Any

import keras
import numpy as np
from PIL import Image
from keras import layers
from keras.applications import EfficientNetB0

# Treatment guidance by disease
TREATMENT_GUIDE = {
    "Apple Scab": "Apply fungicide (captan or sulfur). Prune affected branches.",
    "Apple Black Rot": "Remove and destroy infected fruit. Apply copper fungicide.",
    "Apple Cedar Rust": "Apply sulfur spray. Remove galls from juniper trees nearby.",
    "Apple Healthy": "Maintain regular monitoring and preventive care.",
    "Blueberry Healthy": "Continue current management practices.",
    "Cherry Powdery Mildew": "Spray sulfur or potassium bicarbonate. Improve air circulation.",
    "Cherry Healthy": "Maintain optimal growing conditions.",
    "Corn Cercospora Leaf Spot": "Apply fungicide. Remove infected leaves. Rotate crops.",
    "Corn Common Rust": "Use rust-resistant varieties. Apply fungicide if severe.",
    "Corn Northern Leaf Blight": "Apply foliar fungicide. Plant resistant varieties.",
    "Corn Healthy": "Continue current crop management.",
    "Grape Black Rot": "Apply fungicide. Remove and destroy infected shoots.",
    "Grape Esca": "Prune and destroy infected vines. Disinfect tools.",
    "Grape Leaf Blight": "Remove affected leaves. Apply sulfur-based fungicide.",
    "Grape Healthy": "Maintain vine health through proper pruning.",
    "Orange Haunglongbing": "Remove infected trees. Control insect vectors with pesticide.",
    "Peach Bacterial Spot": "Apply copper spray. Avoid overhead watering.",
    "Peach Healthy": "Maintain orchard health.",
    "Pepper Bell Bacterial Spot": "Apply copper fungicide. Improve drainage.",
    "Pepper Bell Healthy": "Maintain current care practices.",
    "Potato Early Blight": "Apply mancozeb fungicide. Remove affected leaves.",
    "Potato Late Blight": "Apply copper or mancozeb. Improve air circulation.",
    "Potato Healthy": "Continue disease prevention practices.",
    "Raspberry Healthy": "Maintain cane health and productivity.",
    "Soybean Frogeye Leaf Spot": "Apply fungicide. Rotate crops.",
    "Soybean Healthy": "Maintain crop rotation schedule.",
    "Squash Powdery Mildew": "Spray sulfur or neem oil. Improve air flow.",
    "Strawberry Leaf Scorch": "Remove affected leaves. Apply potassium bicarbonate.",
    "Strawberry Healthy": "Continue integrated pest management.",
    "Tomato Bacterial Spot": "Apply copper sulfate spray. Remove infected leaves.",
    "Tomato Early Blight": "Remove lower leaves. Apply chlorothalonil fungicide.",
    "Tomato Late Blight": "Apply mancozeb or copper fungicide immediately.",
    "Tomato Leaf Mold": "Improve ventilation. Apply sulfur spray.",
    "Tomato Septoria Leaf Spot": "Remove affected leaves. Apply fungicide weekly.",
    "Tomato Spider Mites": "Spray neem oil or insecticidal soap.",
    "Tomato Target Spot": "Apply chlorothalonil or mancozeb fungicide.",
    "Tomato Mosaic Virus": "Remove infected plants. Disinfect tools between cuts.",
    "Tomato Healthy": "Maintain preventive disease management.",
}

@dataclass(frozen=True)
class EfficientNetConfig:
    model_name: str = "EfficientNetB0"
    input_size: int = 224
    top_k: int = 3
    confidence_threshold: float = 45.0
    use_tta: bool = True


CONFIG = EfficientNetConfig()

MODEL_FILENAMES = ("disease_model.keras", "disease_model.weights.h5")
MODEL_PATHS = [
    os.path.join(os.path.dirname(__file__), name) for name in MODEL_FILENAMES
] + [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", name)) for name in MODEL_FILENAMES
] + [
    os.path.abspath(os.path.join(os.getcwd(), name)) for name in MODEL_FILENAMES
]

CLASS_MAP_FILENAMES = ("disease_class_map.json", "class_indices.json", "classes.txt")
CLASS_MAP_PATHS = [
    os.path.join(os.path.dirname(__file__), name) for name in CLASS_MAP_FILENAMES
] + [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", name)) for name in CLASS_MAP_FILENAMES
] + [
    os.path.abspath(os.path.join(os.getcwd(), name)) for name in CLASS_MAP_FILENAMES
]

_model: Any = None
_disease_classes: list[str] | None = None


def _normalize_label_key(label: str) -> str:
    cleaned = label.replace("___", " ").replace("__", " ").replace("_", " ")
    cleaned = " ".join(cleaned.split())
    return cleaned.lower()


def _format_disease_label(label: str) -> str:
    cleaned = label.replace("___", " ").replace("__", " ").replace("_", " ")
    return " ".join(cleaned.split())


TREATMENT_GUIDE_NORMALIZED = {
    _normalize_label_key(name): treatment for name, treatment in TREATMENT_GUIDE.items()
}


def _parse_class_map(path: str) -> list[str]:
    if path.endswith(".txt"):
        with open(path, "r", encoding="utf-8") as file:
            labels = [line.strip() for line in file.readlines() if line.strip()]
        if not labels:
            raise ValueError("Class file is empty")
        return labels

    with open(path, "r", encoding="utf-8") as file:
        data = json.load(file)

    if isinstance(data, list) and all(isinstance(item, str) for item in data):
        return data

    # Common format from Keras generators: {"class_name": index}
    if isinstance(data, dict) and all(isinstance(key, str) for key in data.keys()):
        if all(isinstance(value, int) for value in data.values()):
            max_idx = max(data.values())
            ordered = [None] * (max_idx + 1)
            for name, idx in data.items():
                ordered[idx] = name
            if any(label is None for label in ordered):
                raise ValueError("Class index mapping has missing labels")
            return ordered

    raise ValueError("Unsupported class map format")


def load_class_map() -> list[str] | None:
    global _disease_classes
    if _disease_classes is not None:
        return _disease_classes

    for path in CLASS_MAP_PATHS:
        if os.path.exists(path):
            try:
                classes = _parse_class_map(path)
                if len(classes) == 0:
                    raise ValueError("Class mapping is empty.")
                _disease_classes = classes
                print(f"Loaded disease class mapping from: {path}")
                return _disease_classes
            except Exception as e:
                print(f"Error loading class map from {path}: {e}")

    return None


def build_efficientnet_b0_classifier(num_classes: int) -> keras.Model:
    """Build architecture used for EfficientNet-B0 transfer learning classifier."""
    base_model = EfficientNetB0(
        input_shape=(CONFIG.input_size, CONFIG.input_size, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    model = keras.Sequential(
        [
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dense(512, activation="relu"),
            layers.Dropout(0.4),
            layers.Dense(256, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(num_classes, activation="softmax"),
        ]
    )
    return model


def _resolve_model_output_classes(model: keras.Model) -> int:
    output_shape = model.output_shape
    if isinstance(output_shape, list):
        output_shape = output_shape[0]
    return int(output_shape[-1])


def load_model() -> keras.Model:
    """Load EfficientNet-B0 disease model from exported model file or weights."""
    global _model
    if _model is not None:
        return _model

    classes = load_class_map()
    if not classes:
        raise RuntimeError(
            "Class map not found for EfficientNet-B0 model. "
            "Provide disease_class_map.json and restart API."
        )

    for path in MODEL_PATHS:
        if os.path.exists(path):
            try:
                if path.endswith(".weights.h5"):
                    _model = build_efficientnet_b0_classifier(len(classes))
                    _model.load_weights(path)
                else:
                    _model = keras.models.load_model(path, compile=False)

                output_classes = _resolve_model_output_classes(_model)
                if output_classes != len(classes):
                    raise RuntimeError(
                        "Class map mismatch: "
                        f"model outputs {output_classes} classes but class map has {len(classes)} labels."
                    )

                print(
                    "Loaded disease model from: "
                    f"{path} (output classes: {output_classes})"
                )
                return _model
            except Exception as e:
                print(f"Error loading model from {path}: {e}")

    raise RuntimeError(
        "No trained EfficientNet-B0 disease model found. "
        "Expected one of: disease_model.keras or disease_model.weights.h5"
    )


def _center_crop(image: Image.Image, crop_size: int) -> Image.Image:
    width, height = image.size
    left = (width - crop_size) // 2
    top = (height - crop_size) // 2
    right = left + crop_size
    bottom = top + crop_size
    return image.crop((left, top, right, bottom))


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Preprocess image for EfficientNet-B0: resize shortest side to 256, center-crop 224."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    width, height = image.size

    if min(width, height) == 0:
        raise ValueError("Invalid image dimensions")

    scale = 256 / float(min(width, height))
    resized = image.resize((int(round(width * scale)), int(round(height * scale))), Image.LANCZOS)
    cropped = _center_crop(resized, CONFIG.input_size)

    # EfficientNet-B0 in Keras includes internal rescaling, so keep raw pixel range [0, 255].
    arr = np.asarray(cropped, dtype=np.float32)
    return np.expand_dims(arr, axis=0)


def _build_tta_batch(img_array: np.ndarray) -> np.ndarray:
    image = img_array[0]
    flipped_lr = np.fliplr(image)
    flipped_ud = np.flipud(image)
    flipped_both = np.flipud(flipped_lr)
    return np.stack([image, flipped_lr, flipped_ud, flipped_both], axis=0).astype(np.float32)


def predict_disease_scores(model: keras.Model, img_array: np.ndarray) -> np.ndarray:
    """Predict disease probabilities with optional test-time augmentation."""
    if not CONFIG.use_tta:
        return model.predict(img_array, verbose=0)

    tta_batch = _build_tta_batch(img_array)
    predictions = model.predict(tta_batch, verbose=0)
    averaged = np.mean(predictions, axis=0, keepdims=True)
    return averaged


def detect_disease(image_bytes: bytes) -> dict:
    """
    Detect disease in leaf image using CNN.
    Returns: {disease, confidence, treatment, prediction_scores}
    """
    try:
        model = load_model()
        img_array = preprocess_image(image_bytes)
        
        predictions = predict_disease_scores(model, img_array)
        pred_idx = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][pred_idx]) * 100

        num_model_classes = int(predictions.shape[1])
        classes = load_class_map()
        if not classes:
            raise RuntimeError(
                "Class map missing at inference time. "
                "Provide disease_class_map.json generated during training."
            )
        if len(classes) != num_model_classes:
            raise RuntimeError(
                "Class map mismatch at inference time: "
                f"model outputs {num_model_classes} classes but class map has {len(classes)} labels."
            )

        raw_disease = classes[pred_idx]
        disease = _format_disease_label(raw_disease)
        treatment = TREATMENT_GUIDE_NORMALIZED.get(
            _normalize_label_key(raw_disease),
            "Consult a plant pathologist.",
        )

        if confidence < CONFIG.confidence_threshold:
            treatment = (
                "Prediction confidence is low. Capture a clearer close-up image in daylight "
                "and consult a plant pathologist for confirmation."
            )

        # Get top 3 predictions for uncertainty quantification
        top_indices = np.argsort(predictions[0])[::-1][: CONFIG.top_k]
        top_diseases = [
            (_format_disease_label(classes[i]), float(predictions[0][i]) * 100)
            for i in top_indices
        ]
        
        return {
            "disease": disease,
            "confidence": round(confidence, 1),
            "treatment": treatment,
            "top_predictions": top_diseases,
            "model": CONFIG.model_name,
            "low_confidence": confidence < CONFIG.confidence_threshold,
        }
    except Exception as e:
        return {
            "disease": "Error",
            "confidence": 0.0,
            "treatment": f"Unable to process image: {str(e)}",
            "top_predictions": [],
        }
