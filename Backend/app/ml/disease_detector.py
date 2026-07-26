"""Disease detection placeholder.

This deployment variant intentionally disables TensorFlow-based disease inference
until a lightweight model is implemented.
"""

from typing import Any


def detect_disease(image_bytes: bytes) -> dict[str, Any]:
    """Return a structured error response while model inference is disabled."""
    _ = image_bytes
    return {
        "disease": "Error",
        "confidence": 0.0,
        "treatment": (
            "Disease detection is currently disabled in this deployment "
            "because the TensorFlow model was removed."
        ),
        "prediction_scores": [],
    }
