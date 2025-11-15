"""
Test script to verify Python backend is working
Run this before starting the server
"""

import sys
import os

print("=" * 50)
print("Testing Python Backend Setup")
print("=" * 50)
print()

# Test 1: Check Python version
print("1. Checking Python version...")
print(f"   Python version: {sys.version}")
if sys.version_info < (3, 8):
    print("   ❌ ERROR: Python 3.8 or higher is required")
    sys.exit(1)
else:
    print("   ✓ Python version is compatible")
print()

# Test 2: Check if required files exist
print("2. Checking required files...")
required_files = [
    'app.py',
    'services/ocr_service.py',
    'services/validation_service.py',
    'requirements.txt'
]

all_exist = True
for file in required_files:
    if os.path.exists(file):
        print(f"   ✓ {file} exists")
    else:
        print(f"   ❌ {file} is missing")
        all_exist = False

if not all_exist:
    print("\n   ERROR: Some required files are missing")
    sys.exit(1)
print()

# Test 3: Check Python syntax
print("3. Checking Python syntax...")
try:
    import ast
    
    # Check app.py
    with open('app.py', 'r', encoding='utf-8') as f:
        ast.parse(f.read())
    print("   ✓ app.py syntax is valid")
    
    # Check services
    with open('services/ocr_service.py', 'r', encoding='utf-8') as f:
        ast.parse(f.read())
    print("   ✓ services/ocr_service.py syntax is valid")
    
    with open('services/validation_service.py', 'r', encoding='utf-8') as f:
        ast.parse(f.read())
    print("   ✓ services/validation_service.py syntax is valid")
    
except SyntaxError as e:
    print(f"   ❌ Syntax error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"   ❌ Error: {e}")
    sys.exit(1)
print()

# Test 4: Check imports (without actually importing heavy dependencies)
print("4. Checking import structure...")
try:
    # Add current directory to path
    sys.path.insert(0, os.getcwd())
    
    # Try to import modules (this will fail if syntax is wrong)
    # We'll catch ImportError for missing packages, but that's OK
    try:
        from services.ocr_service import OCRService
        print("   ✓ OCRService can be imported")
    except ImportError as e:
        if 'easyocr' in str(e).lower() or 'cv2' in str(e).lower():
            print("   ⚠ OCRService import failed (missing dependencies - install with: pip install -r requirements.txt)")
        else:
            print(f"   ❌ OCRService import failed: {e}")
            sys.exit(1)
    
    try:
        from services.validation_service import ValidationService
        print("   ✓ ValidationService can be imported")
    except ImportError as e:
        print(f"   ❌ ValidationService import failed: {e}")
        sys.exit(1)
    
except Exception as e:
    print(f"   ❌ Import error: {e}")
    sys.exit(1)
print()

# Test 5: Check if Flask app can be created
print("5. Checking Flask app structure...")
try:
    # Read app.py and check for Flask app
    with open('app.py', 'r', encoding='utf-8') as f:
        content = f.read()
        if 'Flask' in content and 'app = Flask' in content:
            print("   ✓ Flask app structure is correct")
        else:
            print("   ❌ Flask app structure not found")
            sys.exit(1)
except Exception as e:
    print(f"   ❌ Error reading app.py: {e}")
    sys.exit(1)
print()

# Test 6: Check dependencies
print("6. Checking installed dependencies...")
try:
    import flask
    print(f"   ✓ Flask is installed (version: {flask.__version__})")
except ImportError:
    print("   ⚠ Flask is not installed (run: pip install -r requirements.txt)")

try:
    import cv2
    print(f"   ✓ OpenCV is installed (version: {cv2.__version__})")
except ImportError:
    print("   ⚠ OpenCV is not installed (run: pip install opencv-python)")

try:
    import numpy
    print(f"   ✓ NumPy is installed (version: {numpy.__version__})")
except ImportError:
    print("   ⚠ NumPy is not installed (run: pip install numpy)")

try:
    import easyocr
    print("   ✓ EasyOCR is installed")
except ImportError:
    print("   ⚠ EasyOCR is not installed (run: pip install easyocr)")
    print("      Note: EasyOCR will download models on first use (~500MB)")

print()
print("=" * 50)
print("✓ All basic checks passed!")
print("=" * 50)
print()
print("Next steps:")
print("1. Install missing dependencies: pip install -r requirements.txt")
print("2. Start the server: python app.py")
print("3. Test the API: http://localhost:5000/health")
print()

