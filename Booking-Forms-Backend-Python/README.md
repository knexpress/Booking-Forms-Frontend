# Emirates ID OCR and Validation API

Python backend API for processing and validating Emirates ID cards using OCR.

## Features

- **Multi-language OCR**: Supports English and Arabic text extraction using EasyOCR
- **Automatic Text Extraction**: Extracts ID number, name, dates, nationality, and more
- **Validation**: Validates Emirates ID format and checks expiry dates
- **RESTful API**: Clean API endpoints for frontend integration
- **Batch Processing**: Process multiple images at once

## Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Setup

1. **Navigate to the backend directory:**
```bash
cd Booking-Forms-Backend-Python
```

2. **Create virtual environment (recommended):**
```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On Linux/Mac
source venv/bin/activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

**Note:** EasyOCR will download model files on first run (approximately 500MB). This is a one-time download.

## Usage

### Start the Server

```bash
python app.py
```

The API will be available at `http://localhost:5000`

### API Endpoints

#### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "Emirates ID OCR API",
  "timestamp": "2024-01-15T10:30:00"
}
```

#### 2. Process OCR
```http
POST /api/ocr/process
Content-Type: application/json

{
  "image": "base64_encoded_image_string",
  "side": "front"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "idNumber": "784-1234-5678901-2",
    "name": "John Doe",
    "nameArabic": "جون دو",
    "nationality": "Filipino",
    "dateOfBirth": "1990-01-15",
    "gender": "Male",
    "expiryDate": "2025-12-31",
    "issueDate": "2020-01-01"
  },
  "rawText": "extracted text...",
  "confidence": 0.95,
  "timestamp": "2024-01-15T10:30:00"
}
```

#### 3. Validate ID
```http
POST /api/ocr/validate
Content-Type: application/json

{
  "image": "base64_encoded_image_string",
  "side": "front"
}
```

**Response:**
```json
{
  "success": true,
  "isValid": true,
  "isEmiratesID": true,
  "confidence": 0.95,
  "data": {
    "idNumber": "784-1234-5678901-2",
    "name": "John Doe",
    ...
  },
  "errors": [],
  "warnings": [],
  "timestamp": "2024-01-15T10:30:00"
}
```

#### 4. Batch Process
```http
POST /api/ocr/batch
Content-Type: application/json

{
  "images": [
    {
      "image": "base64_encoded_image_string",
      "side": "front"
    },
    {
      "image": "base64_encoded_image_string",
      "side": "back"
    }
  ]
}
```

## Frontend Integration

### Example: Send cropped image from React

```javascript
// In your React component after capturing image
const processWithBackend = async (croppedImageBase64, side) => {
  try {
    const response = await fetch('http://localhost:5000/api/ocr/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: croppedImageBase64, // Already base64 from OpenCV.js
        side: side // 'front' or 'back'
      })
    })
    
    const result = await response.json()
    
    if (result.success && result.isEmiratesID) {
      console.log('Valid Emirates ID:', result.data)
      // Use result.data for your booking form
    } else {
      console.error('Validation failed:', result.errors)
    }
  } catch (error) {
    console.error('API error:', error)
  }
}
```

## Configuration

### Environment Variables

Create a `.env` file (optional):

```env
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5000
OCR_LANGUAGES=en,ar
GPU_ENABLED=False
```

### GPU Support (Optional)

If you have CUDA-enabled GPU, you can enable GPU acceleration:

1. Install CUDA and cuDNN
2. Install PyTorch with CUDA support
3. Set `gpu=True` in `ocr_service.py`:

```python
self.reader = easyocr.Reader(['en', 'ar'], gpu=True)
```

## Project Structure

```
Booking-Forms-Backend-Python/
├── app.py                 # Main Flask application
├── requirements.txt      # Python dependencies
├── README.md             # This file
└── services/
    ├── ocr_service.py    # OCR text extraction
    └── validation_service.py  # ID validation logic
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing or invalid parameters)
- `500`: Internal Server Error

All error responses include an `error` field with details.

## Performance

- **Processing Time**: ~2-5 seconds per image (CPU)
- **GPU Acceleration**: ~0.5-1 second per image (if GPU available)
- **Memory Usage**: ~500MB-1GB (includes model files)

## Troubleshooting

### EasyOCR Installation Issues

If EasyOCR fails to install:

```bash
# Install system dependencies first (Linux)
sudo apt-get update
sudo apt-get install libgl1-mesa-glx libglib2.0-0

# Then install Python packages
pip install easyocr
```

### Model Download Issues

If models fail to download automatically:

1. Models are stored in `~/.EasyOCR/model/` (Linux/Mac) or `C:\Users\<username>\.EasyOCR\model\` (Windows)
2. You can manually download from: https://github.com/JaidedAI/EasyOCR/releases

## Production Deployment

For production:

1. **Use a production WSGI server:**
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

2. **Set environment variables:**
```bash
export FLASK_ENV=production
export FLASK_DEBUG=False
```

3. **Use reverse proxy (nginx):**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## License

This project is part of the KN Express Booking Forms system.

