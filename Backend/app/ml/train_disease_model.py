"""
Train a professional disease detection model using PlantVillage dataset.
Uses transfer learning with EfficientNetB0 for high accuracy.

Usage:
    python train_disease_model.py --data_dir /path/to/plantvillage --epochs 50
"""
import os
import argparse
import json
from pathlib import Path

import keras
import tensorflow as tf
from keras.applications import EfficientNetB0
from keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint

ImageDataGenerator = tf.keras.preprocessing.image.ImageDataGenerator

def count_images(directory):
    """Count image files in the dataset directory."""
    image_extensions = (".jpg", ".jpeg", ".png", ".bmp", ".gif")
    count = 0
    for root, _, files in os.walk(directory):
        count += sum(1 for f in files if f.lower().endswith(image_extensions))
    return count


BACKEND_DIR = Path(__file__).resolve().parents[2]
ML_DIR = Path(__file__).resolve().parent

MODEL_PATH = BACKEND_DIR / "disease_model.keras"
CLASS_MAP_PATHS = [
    BACKEND_DIR / "disease_class_map.json",
    ML_DIR / "disease_class_map.json",
]


def train_model(data_dir, epochs=50, batch_size=32):
    """
    Train disease detection model using transfer learning.
    """
    print("Training disease detection model...")

    train_dir = os.path.join(data_dir, "train")
    val_dir = os.path.join(data_dir, "val")
    use_validation_split = False

    if os.path.isdir(train_dir) and count_images(train_dir) > 0:
        if os.path.isdir(val_dir) and count_images(val_dir) > 0:
            dataset_root = None
            print(f"Using explicit train/val directories: {train_dir} and {val_dir}")
        else:
            print(f"Warning: validation directory not found or empty at {val_dir}.")
            print(f"Using train directory and splitting 20% for validation: {train_dir}")
            use_validation_split = True
            dataset_root = train_dir
    elif os.path.isdir(data_dir) and count_images(data_dir) > 0:
        print(f"Using dataset root and splitting 20% for validation: {data_dir}")
        use_validation_split = True
        dataset_root = data_dir
    else:
        raise FileNotFoundError(
            "No training images were found.\n"
            f"Checked paths: {train_dir} and {data_dir}.\n"
            "Please verify the PlantVillage dataset is organized correctly."
        )

    # Data augmentation. EfficientNetB0 includes internal rescaling layers,
    # so avoid external rescale=1/255 here.
    train_gen = ImageDataGenerator(
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode="nearest",
        validation_split=0.2 if use_validation_split else 0.0,
    )

    val_gen = ImageDataGenerator(
        validation_split=0.2 if use_validation_split else 0.0,
    )

    # Load training data (infer classes strictly from dataset subfolders)
    train_data = train_gen.flow_from_directory(
        dataset_root if use_validation_split else train_dir,
        target_size=(224, 224),
        batch_size=batch_size,
        class_mode="categorical",
        subset="training" if use_validation_split else None,
        seed=42 if use_validation_split else None,
    )

    # Load validation data (same inferred class mapping as training)
    val_data = val_gen.flow_from_directory(
        dataset_root if use_validation_split else val_dir,
        target_size=(224, 224),
        batch_size=batch_size,
        class_mode="categorical",
        subset="validation" if use_validation_split else None,
        seed=42 if use_validation_split else None,
    )

    if train_data.n == 0:
        raise ValueError(
            "Training dataset is empty.\n"
            f"Checked path: {dataset_root if use_validation_split else train_dir}.\n"
            "Please verify your dataset contains images organized by class subdirectories."
        )
    if val_data.n == 0:
        raise ValueError(
            "Validation dataset is empty.\n"
            f"Checked path: {dataset_root if use_validation_split else val_dir}.\n"
            "If using automatic splitting, ensure there are enough images in each class."
        )
    
    # Determine number of classes from the data generator
    try:
        num_classes = train_data.num_classes
    except Exception:
        num_classes = len(train_data.class_indices)

    print(f"Detected {num_classes} classes:", train_data.class_indices)
    index_to_class = {idx: name for name, idx in train_data.class_indices.items()}
    class_names = [index_to_class[i] for i in range(num_classes)]

    # Build model with transfer learning
    base_model = EfficientNetB0(
        input_shape=(224, 224, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False
    
    model = keras.Sequential([
        base_model,
        keras.layers.GlobalAveragePooling2D(),
        keras.layers.Dense(512, activation="relu"),
        keras.layers.Dropout(0.4),
        keras.layers.Dense(256, activation="relu"),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(num_classes, activation="softmax"),
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    
    print(model.summary())
    
    # Callbacks
    callbacks = [
        EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6),
        ModelCheckpoint(
            str(MODEL_PATH),
            monitor="val_accuracy",
            save_best_only=True,
        ),
    ]
    
    # Train model
    history = model.fit(
        train_data,
        epochs=epochs,
        validation_data=val_data,
        callbacks=callbacks,
    )
    
    # Fine-tune: unfreeze top layers of base model
    print("\nFine-tuning base model...")
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-4),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    
    history = model.fit(
        train_data,
        epochs=20,
        validation_data=val_data,
        callbacks=callbacks,
    )
    
    # Save model and class mapping
    model.save(MODEL_PATH)
    for class_map_path in CLASS_MAP_PATHS:
        with open(class_map_path, "w", encoding="utf-8") as f:
            json.dump(class_names, f, ensure_ascii=False, indent=2)

    print(f"Model saved to: {MODEL_PATH}")
    for class_map_path in CLASS_MAP_PATHS:
        print(f"Class mapping saved to: {class_map_path}")
    
    return model, history


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train disease detection model")
    parser.add_argument("--data_dir", required=True, help="Path to PlantVillage dataset")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    
    args = parser.parse_args()
    train_model(args.data_dir, args.epochs, args.batch_size)
