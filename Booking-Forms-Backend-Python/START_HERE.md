# 🚀 Quick Start Guide - Python Backend

## Step 1: Install Dependencies

Open Command Prompt or PowerShell in this folder and run:

```bash
pip install -r requirements.txt
```

**Note:** This will install:
- Flask (web framework)
- OpenCV (image processing)
- EasyOCR (OCR engine - will download models on first use, ~500MB)
- Other required packages

## Step 2: Test the Setup

Run the test script to verify everything is ready:

```bash
python test_backend.py
```

This will check:
- ✓ Python version
- ✓ Required files exist
- ✓ Code syntax is valid
- ✓ Dependencies are installed

## Step 3: Start the Server

Run the main application:

```bash
python app.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
 * Running on http://0.0.0.0:5000
```

## Step 4: Test the API

Open your browser and go to:
```
http://localhost:5000/health
```

You should see a JSON response:
```json
{
  "status": "healthy",
  "service": "Emirates ID OCR API",
  "timestamp": "..."
}
```

## ✅ Server is Running!

The API is now ready to receive requests from your frontend at:
- **Base URL:** `http://localhost:5000`
- **Health Check:** `http://localhost:5000/health`
- **OCR Process:** `http://localhost:5000/api/ocr/process`
- **Validate ID:** `http://localhost:5000/api/ocr/validate`

## 🔧 Troubleshooting

### Port 5000 already in use?
Edit `app.py` and change the port:
```python
app.run(host='0.0.0.0', port=5001, debug=True)  # Change 5000 to 5001
```

### EasyOCR model download issues?
Models are stored in:
- Windows: `C:\Users\<username>\.EasyOCR\model\`
- Linux/Mac: `~/.EasyOCR/model/`

You can manually download from: https://github.com/JaidedAI/EasyOCR/releases

### Missing dependencies?
```bash
pip install --upgrade -r requirements.txt
```

## 📝 Next Steps

1. Keep this terminal open (server runs here)
2. Update your frontend to use: `http://localhost:5000`
3. Test with your React app!

