"""
OCR Service for Emirates ID Text Extraction
Uses EasyOCR for multi-language text recognition (English and Arabic)
"""

import cv2
import numpy as np
import re
from typing import Dict, Optional, List, Tuple
import logging

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except (ImportError, OSError, Exception) as e:
    EASYOCR_AVAILABLE = False
    logging.warning(f"EasyOCR not available: {str(e)}")
    logging.warning("Install with: pip install easyocr")
    logging.warning("Note: If you see DLL errors, install Visual C++ Redistributables")

logger = logging.getLogger(__name__)


class OCRService:
    """Service for extracting text from Emirates ID images"""
    
    def __init__(self):
        """Initialize OCR reader"""
        self.reader = None
        if EASYOCR_AVAILABLE:
            try:
                # Initialize EasyOCR with English and Arabic support
                logger.info("Initializing EasyOCR reader...")
                self.reader = easyocr.Reader(['en', 'ar'], gpu=False)  # Set gpu=True if CUDA available
                logger.info("EasyOCR reader initialized successfully")
            except (OSError, ImportError, Exception) as e:
                logger.error(f"Failed to initialize EasyOCR: {str(e)}")
                logger.error("This is often caused by missing Visual C++ Redistributables or PyTorch DLL issues")
                logger.error("Solution: Install Visual C++ Redistributables from Microsoft")
                self.reader = None
        else:
            logger.warning("EasyOCR not available. OCR functionality will be limited.")
            logger.warning("To fix PyTorch DLL errors on Windows:")
            logger.warning("1. Install Visual C++ Redistributables: https://aka.ms/vs/17/release/vc_redist.x64.exe")
            logger.warning("2. Or reinstall PyTorch: pip uninstall torch && pip install torch --index-url https://download.pytorch.org/whl/cpu")
    
    def preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """
        Preprocess image for better OCR results
        
        Args:
            img: Input image (BGR format)
        
        Returns:
            Preprocessed image
        """
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Convert back to BGR for consistency
        return cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    
    def extract_text(self, img: np.ndarray, side: str = 'front') -> Dict:
        """
        Extract text from Emirates ID image
        
        Args:
            img: Input image (BGR format)
            side: 'front' or 'back'
        
        Returns:
            Dictionary with extracted data and success status
        """
        if not self.reader:
            return {
                'success': False,
                'error': 'OCR reader not initialized. Please install EasyOCR.'
            }
        
        try:
            # Preprocess image
            processed_img = self.preprocess_image(img)
            
            # Perform OCR
            logger.info(f"Performing OCR on {side} side...")
            results = self.reader.readtext(processed_img)
            
            # Extract all text
            raw_text = ' '.join([result[1] for result in results])
            logger.info(f"Extracted raw text: {raw_text[:100]}...")
            
            # Parse extracted data based on side
            if side == 'front':
                parsed_data = self._parse_front_side(results, raw_text)
            else:
                parsed_data = self._parse_back_side(results, raw_text)
            
            # Calculate average confidence
            confidences = [result[2] for result in results if len(result) > 2]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            return {
                'success': True,
                'data': parsed_data,
                'rawText': raw_text,
                'confidence': avg_confidence,
                'ocrResults': results
            }
            
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f'OCR extraction failed: {str(e)}'
            }
    
    def _parse_front_side(self, ocr_results: List, raw_text: str) -> Dict:
        """
        Parse front side of Emirates ID
        
        Emirates ID Front Side typically contains:
        - ID Number (784-XXXX-XXXXXXX-X format)
        - Name (English and Arabic)
        - Nationality
        - Date of Birth
        - Gender
        - Expiry Date
        - Issue Date
        """
        data = {}
        
        # Extract ID Number (format: 784-XXXX-XXXXXXX-X)
        id_pattern = r'784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d{1}'
        id_match = re.search(id_pattern, raw_text)
        if id_match:
            data['idNumber'] = id_match.group(0).replace(' ', '-')
        
        # Extract dates (DD/MM/YYYY or DD-MM-YYYY format)
        date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{4}'
        dates = re.findall(date_pattern, raw_text)
        
        # Try to identify date of birth and expiry date
        # Usually DOB comes before expiry date
        if len(dates) >= 2:
            data['dateOfBirth'] = dates[0]
            data['expiryDate'] = dates[1]
        elif len(dates) == 1:
            # If only one date found, check context
            date_pos = raw_text.find(dates[0])
            if 'expiry' in raw_text.lower() or 'exp' in raw_text.lower():
                data['expiryDate'] = dates[0]
            else:
                data['dateOfBirth'] = dates[0]
        
        # Extract name (usually first line or after "Name" label)
        name_patterns = [
            r'(?:name|اسم)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        ]
        for pattern in name_patterns:
            name_match = re.search(pattern, raw_text, re.IGNORECASE)
            if name_match:
                data['name'] = name_match.group(1).strip()
                break
        
        # Extract Arabic name (contains Arabic characters)
        arabic_pattern = r'[\u0600-\u06FF\s]+'
        arabic_matches = re.findall(arabic_pattern, raw_text)
        if arabic_matches:
            # Take the longest Arabic text as name
            arabic_name = max(arabic_matches, key=len).strip()
            if len(arabic_name) > 3:
                data['nameArabic'] = arabic_name
        
        # Extract nationality
        nationality_keywords = ['Filipino', 'Indian', 'Pakistani', 'Bangladeshi', 'Egyptian', 'Lebanese']
        for keyword in nationality_keywords:
            if keyword.lower() in raw_text.lower():
                data['nationality'] = keyword
                break
        
        # Extract gender
        if re.search(r'\b(male|m|ذكر)\b', raw_text, re.IGNORECASE):
            data['gender'] = 'Male'
        elif re.search(r'\b(female|f|أنثى)\b', raw_text, re.IGNORECASE):
            data['gender'] = 'Female'
        
        # Extract issue date
        issue_pattern = r'(?:issue|issued|تاريخ\s*الإصدار)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})'
        issue_match = re.search(issue_pattern, raw_text, re.IGNORECASE)
        if issue_match:
            data['issueDate'] = issue_match.group(1)
        
        return data
    
    def _parse_back_side(self, ocr_results: List, raw_text: str) -> Dict:
        """
        Parse back side of Emirates ID
        
        Back side typically contains:
        - Card number
        - Barcode data (may not be readable via OCR)
        - Additional information
        """
        data = {}
        
        # Extract card number (usually a long number)
        card_number_pattern = r'\b\d{9,}\b'
        card_matches = re.findall(card_number_pattern, raw_text)
        if card_matches:
            # Take the longest number as card number
            data['cardNumber'] = max(card_matches, key=len)
        
        # Try to extract any additional ID numbers
        id_pattern = r'784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d{1}'
        id_match = re.search(id_pattern, raw_text)
        if id_match:
            data['idNumber'] = id_match.group(0).replace(' ', '-')
        
        return data
    
    def extract_id_number(self, text: str) -> Optional[str]:
        """
        Extract Emirates ID number from text
        
        Format: 784-XXXX-XXXXXXX-X
        """
        pattern = r'784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d{1}'
        match = re.search(pattern, text)
        if match:
            return match.group(0).replace(' ', '-')
        return None
    
    def extract_dates(self, text: str) -> Dict[str, str]:
        """
        Extract dates from text
        """
        dates = {}
        date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{4}'
        found_dates = re.findall(date_pattern, text)
        
        # Try to identify date types based on context
        text_lower = text.lower()
        
        for date_str in found_dates:
            date_pos = text_lower.find(date_str)
            context = text_lower[max(0, date_pos-20):date_pos+20]
            
            if 'birth' in context or 'dob' in context or 'born' in context:
                dates['dateOfBirth'] = date_str
            elif 'expiry' in context or 'exp' in context or 'valid' in context:
                dates['expiryDate'] = date_str
            elif 'issue' in context or 'issued' in context:
                dates['issueDate'] = date_str
        
        return dates

