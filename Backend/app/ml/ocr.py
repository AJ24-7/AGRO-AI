"""Extract N, P, K, pH values from a soil report image using Tesseract."""
import io
import re
import pytesseract
from PIL import Image
from ..config import settings

# Point pytesseract to the tesseract binary
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


def _find(pattern, text, default=0.0):
    """Return the first float found by a regex pattern, else default."""
    m = re.search(pattern, text, re.IGNORECASE)
    return float(m.group(1)) if m else default


def extract_soil_values(image_bytes: bytes):
    """Run OCR and parse soil nutrient values from raw text."""
    image = Image.open(io.BytesIO(image_bytes))
    raw_text = pytesseract.image_to_string(image)

    values = {
        # Matches: "Nitrogen 45", "N: 45", "N - 45.2"
        "nitrogen":   _find(r"(?:nitrogen|n)\s*[:\-]?\s*(\d+\.?\d*)", raw_text),
        "phosphorus": _find(r"(?:phosphorus|phosphorous|p)\s*[:\-]?\s*(\d+\.?\d*)", raw_text),
        "potassium":  _find(r"(?:potassium|k)\s*[:\-]?\s*(\d+\.?\d*)", raw_text),
        "ph":         _find(r"(?:ph)\s*[:\-]?\s*(\d+\.?\d*)", raw_text),
    }
    return values, raw_text
