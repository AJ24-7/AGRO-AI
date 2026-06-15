"""
Lightweight leaf-disease classifier.

For a B.Tech project this uses a simple, deterministic color/feature heuristic
so it runs without a large trained CNN. You can later swap `detect_disease`
with a real TensorFlow/Keras model without changing the API.
"""
import io
import numpy as np
from PIL import Image

# Disease knowledge base with treatments
DISEASES = {
    "Healthy": "No disease detected. Maintain regular watering and monitoring.",
    "Leaf Blight": "Apply copper-based fungicide. Remove infected leaves and "
                   "avoid overhead irrigation.",
    "Powdery Mildew": "Spray sulfur or potassium bicarbonate. Improve air "
                      "circulation between plants.",
    "Leaf Rust": "Use fungicides containing propiconazole. Remove and destroy "
                 "affected leaves.",
    "Bacterial Spot": "Apply copper sprays early. Avoid working with wet plants "
                      "and rotate crops.",
}


def detect_disease(image_bytes: bytes):
    """
    Analyze the leaf image and return disease, confidence, treatment.
    Heuristic: examine green/yellow/brown channel ratios.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((128, 128))
    arr = np.asarray(image).astype(float)

    r, g, b = arr[:, :, 0].mean(), arr[:, :, 1].mean(), arr[:, :, 2].mean()
    brown_ratio = (r - b) / (g + 1)
    yellow_ratio = (r + g) / (2 * b + 1)
    green_dominance = g / (r + b + 1)

    # Simple decision rules
    if green_dominance > 0.55 and brown_ratio < 0.3:
        disease, conf = "Healthy", 92.0
    elif brown_ratio > 0.6:
        disease, conf = "Leaf Blight", 87.5
    elif yellow_ratio > 1.4:
        disease, conf = "Leaf Rust", 84.0
    elif r > 150 and g > 150:
        disease, conf = "Powdery Mildew", 81.3
    else:
        disease, conf = "Bacterial Spot", 78.6

    return {
        "disease": disease,
        "confidence": conf,
        "treatment": DISEASES[disease],
    }
