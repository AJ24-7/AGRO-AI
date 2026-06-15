"""Rule-based fertilizer recommendation engine."""

# Ideal nutrient targets per crop (N, P, K)
CROP_TARGETS = {
    "Rice":      (100, 50, 50),
    "Wheat":     (120, 60, 40),
    "Maize":     (120, 60, 40),
    "Cotton":    (100, 50, 50),
    "Sugarcane": (150, 60, 60),
    "default":   (100, 50, 50),
}


def recommend_fertilizer(n, p, k, crop):
    """Compare current vs target nutrients -> suggest fertilizers + quantity."""
    target_n, target_p, target_k = CROP_TARGETS.get(crop, CROP_TARGETS["default"])
    recs = []

    # Nitrogen deficiency -> Urea (46% N)
    if n < target_n:
        deficit = target_n - n
        urea_kg = round(deficit / 0.46, 1)
        recs.append({"name": "Urea", "quantity": f"{urea_kg} kg/ha",
                     "reason": "Nitrogen deficiency"})

    # Phosphorus deficiency -> DAP (46% P2O5)
    if p < target_p:
        deficit = target_p - p
        dap_kg = round(deficit / 0.46, 1)
        recs.append({"name": "DAP", "quantity": f"{dap_kg} kg/ha",
                     "reason": "Phosphorus deficiency"})

    # Potassium deficiency or low organic content -> Organic fertilizer
    if k < target_k:
        deficit = target_k - k
        recs.append({"name": "Organic Fertilizer (Compost)",
                     "quantity": f"{round(deficit * 5, 1)} kg/ha",
                     "reason": "Potassium / organic matter boost"})

    if not recs:
        recs.append({"name": "Balanced NPK", "quantity": "Maintain current levels",
                     "reason": "Soil nutrients are adequate"})
    return recs
