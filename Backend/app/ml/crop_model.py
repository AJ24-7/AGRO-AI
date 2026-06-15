"""Load the trained crop model and provide a predict helper.
Falls back to a rule-based prediction if the model file is missing."""
import os
import numpy as np
import joblib

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "crop_model.pkl")
_model = joblib.load(_MODEL_PATH) if os.path.exists(_MODEL_PATH) else None

_FALLBACK = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane"]


def predict_crop(n: float, p: float, k: float, ph: float):
    """Return (crop_name, confidence_percentage)."""
    if _model is None:
        # Simple fallback if model not trained yet
        crop = _FALLBACK[int((n + p + k) % len(_FALLBACK))]
        return crop, 70.0

    X = np.array([[n, p, k, ph]])
    crop = _model.predict(X)[0]
    proba = _model.predict_proba(X)[0]
    confidence = round(float(np.max(proba)) * 100, 2)
    return crop, confidence
