#!/usr/bin/env python
"""
Verify disease detection setup is ready to train.
Run: python verify_setup.py
"""
import sys
import os

def check_import(module_name, package_name=None):
    """Check if a module can be imported."""
    pkg = package_name or module_name
    try:
        __import__(module_name)
        print(f"✅ {pkg} (installed)")
        return True
    except ImportError:
        print(f"❌ {pkg} (NOT installed)")
        return False

def main():
    print("=" * 60)
    print("Disease Detection Setup Verification")
    print("=" * 60)
    
    all_ok = True
    
    # Check required packages
    print("\n📦 Required Packages:")
    required = [
        ("tensorflow", "TensorFlow"),
        ("keras", "Keras"),
        ("cv2", "OpenCV"),
        ("numpy", "NumPy"),
        ("PIL", "Pillow"),
        ("sqlalchemy", "SQLAlchemy"),
        ("fastapi", "FastAPI"),
    ]
    
    for module, name in required:
        if not check_import(module, name):
            all_ok = False
    
    # Check model file
    print("\n🤖 Model Files:")
    model_path = os.path.join(
        os.path.dirname(__file__),
        "app", "ml", "disease_model.h5"
    )
    if os.path.exists(model_path):
        size_mb = os.path.getsize(model_path) / (1024 * 1024)
        print(f"✅ Model file found ({size_mb:.1f}MB)")
    else:
        print(f"⚠️  Model file NOT found: {model_path}")
        print("   → Run: python -m app.ml.train_disease_model --data_dir <path>")
    
    # Check training script
    print("\n📚 Training Script:")
    train_script = os.path.join(
        os.path.dirname(__file__),
        "app", "ml", "train_disease_model.py"
    )
    if os.path.exists(train_script):
        print(f"✅ Training script found")
    else:
        print(f"❌ Training script NOT found")
        all_ok = False
    
    # Check inference module
    print("\n🔍 Inference Module:")
    detector_module = os.path.join(
        os.path.dirname(__file__),
        "app", "ml", "disease_detector.py"
    )
    if os.path.exists(detector_module):
        print(f"✅ Inference module found")
    else:
        print(f"❌ Inference module NOT found")
        all_ok = False
    
    # GPU check (optional)
    print("\n⚡ GPU Support (Optional):")
    try:
        import tensorflow as tf
        gpus = tf.config.list_physical_devices("GPU")
        if gpus:
            print(f"✅ GPU detected: {len(gpus)} device(s)")
            for gpu in gpus:
                print(f"   → {gpu}")
        else:
            print(f"ℹ️  No GPU detected (CPU mode, ~10x slower)")
    except Exception as e:
        print(f"⚠️  GPU check failed: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    if all_ok:
        print("✅ Setup is ready! Run training:")
        print("   python -m app.ml.train_disease_model --data_dir <dataset_path>")
    else:
        print("❌ Some dependencies missing. Run:")
        print("   pip install -r requirements.txt")
    print("=" * 60)

if __name__ == "__main__":
    main()
