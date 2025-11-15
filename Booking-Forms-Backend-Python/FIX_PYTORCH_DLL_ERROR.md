# Fix PyTorch DLL Error on Windows

## Error Message
```
OSError: [WinError 1114] A dynamic link library (DLL) initialization routine failed.
Error loading "torch\lib\c10.dll" or one of its dependencies.
```

## Solution 1: Install Visual C++ Redistributables (Recommended)

1. **Download and install Visual C++ Redistributables:**
   - Download: https://aka.ms/vs/17/release/vc_redist.x64.exe
   - Run the installer
   - Restart your computer

2. **Restart the Python server:**
   ```bash
   python app.py
   ```

## Solution 2: Reinstall PyTorch (CPU-only version)

If Solution 1 doesn't work, reinstall PyTorch:

```bash
# Deactivate venv if active
deactivate

# Remove venv
rmdir /s /q venv

# Create new venv
python -m venv venv
venv\Scripts\activate

# Install PyTorch CPU version first
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Then install other dependencies
pip install -r requirements.txt
```

## Solution 3: Use Alternative OCR (No PyTorch)

If PyTorch continues to cause issues, you can use Tesseract OCR instead:

1. **Install Tesseract OCR:**
   - Download: https://github.com/UB-Mannheim/tesseract/wiki
   - Install to default location: `C:\Program Files\Tesseract-OCR`

2. **Update requirements.txt:**
   ```
   pytesseract
   ```

3. **Install:**
   ```bash
   pip install pytesseract
   ```

4. **Update ocr_service.py to use Tesseract instead of EasyOCR**

## Solution 4: Use Docker (Advanced)

Run the Python backend in Docker to avoid Windows DLL issues:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "app.py"]
```

## Quick Fix Command

Run this in PowerShell (as Administrator):

```powershell
# Download and install VC++ Redistributables
Invoke-WebRequest -Uri "https://aka.ms/vs/17/release/vc_redist.x64.exe" -OutFile "$env:TEMP\vc_redist.x64.exe"
Start-Process -FilePath "$env:TEMP\vc_redist.x64.exe" -ArgumentList "/install", "/quiet", "/norestart" -Wait
```

Then restart your computer and try again.

## Verify Fix

After applying a solution, test with:

```bash
python -c "import torch; print('PyTorch version:', torch.__version__)"
```

If this works without errors, EasyOCR should work too.

