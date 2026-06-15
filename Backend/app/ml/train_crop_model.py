"""
Train a simple crop recommendation model with synthetic but realistic data.
Run once:  python -m app.ml.train_crop_model
Produces:  app/ml/crop_model.pkl
"""
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

np.random.seed(42)

# Each crop = ideal (N, P, K, pH) ranges -> generate samples around them
CROP_PROFILES = {
    "Rice":      (90, 45, 40, 6.0),
    "Wheat":     (60, 50, 40, 6.8),
    "Maize":     (80, 45, 35, 6.5),
    "Cotton":    (70, 40, 50, 7.2),
    "Sugarcane": (100, 55, 60, 6.4),
}

rows = []
for crop, (n, p, k, ph) in CROP_PROFILES.items():
    for _ in range(300):                      # 300 samples per crop
        rows.append([
            n + np.random.normal(0, 12),
            p + np.random.normal(0, 8),
            k + np.random.normal(0, 8),
            round(ph + np.random.normal(0, 0.4), 2),
            crop,
        ])

df = pd.DataFrame(rows, columns=["N", "P", "K", "ph", "crop"])
X = df[["N", "P", "K", "ph"]]
y = df["crop"]

model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X, y)

path = os.path.join(os.path.dirname(__file__), "crop_model.pkl")
joblib.dump(model, path)
print(f"Model trained and saved to {path}")
print("Train accuracy:", round(model.score(X, y), 3))
