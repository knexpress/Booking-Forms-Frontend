"""
Emirates ID OCR and Validation API
Flask backend for processing Emirates ID images
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import re
from datetime import datetime
from typing import Dict, Optional, Tuple
import logging

# Import OCR service
from services.ocr_service import OCRService
from services.validation_service import ValidationService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Initialize services (with error handling)
try:
    ocr_service = OCRService()
    validation_service = ValidationService()
    logger.info("Services initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    logger.error("The server will start but OCR functionality may be limited")
    # Create dummy services to prevent crash
    ocr_service = None
    validation_service = ValidationService()  # This one doesn't need OCR


def decode_base64_image(image_base64: str) -> np.ndarray:
    """
    Decode base64 image string to OpenCV image format
    
    Args:
        image_base64: Base64 encoded image string (with or without data URL prefix)
    
    Returns:
        OpenCV image (numpy array)
    """
    try:
        # Remove data URL prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_base64)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        
        # Decode image
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Failed to decode image")
        
        return img
    except Exception as e:
        logger.error(f"Error decoding image: {str(e)}")
        raise


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Emirates ID OCR API',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/ocr/process', methods=['POST'])
def process_ocr():
    """
    Process Emirates ID image and extract text
    
    Request body:
    {
        "image": "base64_encoded_image_string",
        "side": "front" | "back"
    }
    
    Response:
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
            "issueDate": "2020-01-01",
            "cardNumber": "123456789",
            "confidence": 0.95
        },
        "rawText": "extracted text from OCR",
        "error": null
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        image_base64 = data.get('image')
        side = data.get('side', 'front')  # 'front' or 'back'
        
        if not image_base64:
            return jsonify({
                'success': False,
                'error': 'Image is required'
            }), 400
        
        if side not in ['front', 'back']:
            return jsonify({
                'success': False,
                'error': 'Side must be "front" or "back"'
            }), 400
        
        logger.info(f"Processing {side} side of Emirates ID")
        
        if not ocr_service:
            return jsonify({
                'success': False,
                'error': 'OCR service not available. Please check server logs and install required dependencies.'
            }), 503
        
        # Decode image
        img = decode_base64_image(image_base64)
        
        # Perform OCR
        ocr_result = ocr_service.extract_text(img, side)
        
        if not ocr_result['success']:
            return jsonify({
                'success': False,
                'error': ocr_result.get('error', 'OCR processing failed')
            }), 500
        
        # Return extracted data
        return jsonify({
            'success': True,
            'data': ocr_result.get('data'),
            'rawText': ocr_result.get('rawText', ''),
            'confidence': ocr_result.get('confidence', 0.0),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error processing OCR: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@app.route('/api/ocr/validate', methods=['POST'])
def validate_id():
    """
    Validate if image is an Emirates ID and extract/validate data
    
    Request body:
    {
        "image": "base64_encoded_image_string",
        "side": "front" | "back"
    }
    
    Response:
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
        "warnings": []
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        image_base64 = data.get('image')
        side = data.get('side', 'front')
        
        if not image_base64:
            return jsonify({
                'success': False,
                'error': 'Image is required'
            }), 400
        
        logger.info(f"Validating {side} side of Emirates ID")
        
        if not ocr_service:
            return jsonify({
                'success': False,
                'isValid': False,
                'isEmiratesID': False,
                'error': 'OCR service not available. Please check server logs and install required dependencies.'
            }), 503
        
        # Decode image
        img = decode_base64_image(image_base64)
        
        # Perform OCR
        ocr_result = ocr_service.extract_text(img, side)
        
        if not ocr_result['success']:
            return jsonify({
                'success': False,
                'isValid': False,
                'isEmiratesID': False,
                'error': ocr_result.get('error', 'OCR processing failed')
            }), 500
        
        # Validate extracted data
        validation_result = validation_service.validate_emirates_id(
            ocr_result.get('data', {}),
            side
        )
        
        # Combine results
        return jsonify({
            'success': True,
            'isValid': validation_result['isValid'],
            'isEmiratesID': validation_result['isEmiratesID'],
            'confidence': validation_result.get('confidence', 0.0),
            'data': ocr_result.get('data'),
            'errors': validation_result.get('errors', []),
            'warnings': validation_result.get('warnings', []),
            'rawText': ocr_result.get('rawText', ''),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error validating ID: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'isValid': False,
            'isEmiratesID': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@app.route('/api/ocr/batch', methods=['POST'])
def process_batch():
    """
    Process multiple images in batch
    
    Request body:
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
    """
    try:
        data = request.get_json()
        
        if not data or 'images' not in data:
            return jsonify({
                'success': False,
                'error': 'Images array is required'
            }), 400
        
        images = data['images']
        results = []
        
        for idx, img_data in enumerate(images):
            try:
                image_base64 = img_data.get('image')
                side = img_data.get('side', 'front')
                
                if not image_base64:
                    results.append({
                        'index': idx,
                        'success': False,
                        'error': 'Image is required'
                    })
                    continue
                
                # Decode and process
                img = decode_base64_image(image_base64)
                ocr_result = ocr_service.extract_text(img, side)
                
                results.append({
                    'index': idx,
                    'side': side,
                    'success': ocr_result['success'],
                    'data': ocr_result.get('data'),
                    'error': ocr_result.get('error')
                })
                
            except Exception as e:
                results.append({
                    'index': idx,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'processed': len(results),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error processing batch: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


if __name__ == '__main__':
    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True  # Set to False in production
    )

