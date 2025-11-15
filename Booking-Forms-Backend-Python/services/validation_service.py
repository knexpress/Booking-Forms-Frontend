"""
Validation Service for Emirates ID
Validates extracted data and checks if it's a valid Emirates ID
"""

import re
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class ValidationService:
    """Service for validating Emirates ID data"""
    
    # Emirates ID number format: 784-XXXX-XXXXXXX-X
    ID_NUMBER_PATTERN = re.compile(r'^784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d{1}$')
    
    # Date formats
    DATE_FORMATS = [
        '%d/%m/%Y',
        '%d-%m-%Y',
        '%Y/%m/%d',
        '%Y-%m-%d',
        '%d.%m.%Y',
    ]
    
    def __init__(self):
        """Initialize validation service"""
        pass
    
    def validate_emirates_id(self, data: Dict, side: str = 'front') -> Dict:
        """
        Validate if extracted data represents a valid Emirates ID
        
        Args:
            data: Extracted data dictionary
            side: 'front' or 'back'
        
        Returns:
            Validation result dictionary
        """
        errors = []
        warnings = []
        confidence = 0.0
        is_valid = False
        is_emirates_id = False
        
        try:
            if side == 'front':
                result = self._validate_front_side(data, errors, warnings)
            else:
                result = self._validate_back_side(data, errors, warnings)
            
            confidence = result['confidence']
            is_emirates_id = result['is_emirates_id']
            is_valid = is_emirates_id and len(errors) == 0
            
        except Exception as e:
            logger.error(f"Error validating Emirates ID: {str(e)}", exc_info=True)
            errors.append(f"Validation error: {str(e)}")
        
        return {
            'isValid': is_valid,
            'isEmiratesID': is_emirates_id,
            'confidence': confidence,
            'errors': errors,
            'warnings': warnings
        }
    
    def _validate_front_side(self, data: Dict, errors: List, warnings: List) -> Dict:
        """Validate front side data"""
        confidence = 0.0
        is_emirates_id = False
        
        # Check for ID number (most important)
        id_number = data.get('idNumber', '')
        if id_number:
            if self.validate_id_number_format(id_number):
                confidence += 0.4
                is_emirates_id = True
                logger.info(f"Valid ID number found: {id_number}")
            else:
                errors.append(f"Invalid ID number format: {id_number}")
        else:
            warnings.append("ID number not found in extracted text")
        
        # Check for name
        if data.get('name'):
            confidence += 0.2
        else:
            warnings.append("Name not found")
        
        # Check for date of birth
        dob = data.get('dateOfBirth')
        if dob:
            if self.validate_date_format(dob):
                if self.validate_date_of_birth(dob):
                    confidence += 0.1
                else:
                    warnings.append(f"Date of birth seems invalid: {dob}")
            else:
                warnings.append(f"Date of birth format unclear: {dob}")
        
        # Check for expiry date
        expiry = data.get('expiryDate')
        if expiry:
            if self.validate_date_format(expiry):
                if self.validate_expiry_date(expiry):
                    confidence += 0.2
                else:
                    errors.append(f"Emirates ID has expired: {expiry}")
            else:
                warnings.append(f"Expiry date format unclear: {expiry}")
        else:
            warnings.append("Expiry date not found")
        
        # Check for nationality
        if data.get('nationality'):
            confidence += 0.05
        
        # Check for gender
        if data.get('gender'):
            confidence += 0.05
        
        # Minimum confidence threshold
        min_confidence = 0.5
        if confidence < min_confidence:
            warnings.append(f"Low confidence score: {confidence:.2f}")
        
        return {
            'confidence': min(confidence, 1.0),
            'is_emirates_id': is_emirates_id
        }
    
    def _validate_back_side(self, data: Dict, errors: List, warnings: List) -> Dict:
        """Validate back side data"""
        confidence = 0.0
        is_emirates_id = False
        
        # Back side validation is more lenient
        # Check for card number or ID number
        if data.get('cardNumber') or data.get('idNumber'):
            confidence += 0.3
            is_emirates_id = True
        
        # If ID number found, validate format
        id_number = data.get('idNumber', '')
        if id_number:
            if self.validate_id_number_format(id_number):
                confidence += 0.4
            else:
                warnings.append(f"ID number format unclear: {id_number}")
        
        # Back side is more lenient - lower threshold
        min_confidence = 0.3
        if confidence < min_confidence:
            warnings.append(f"Low confidence score: {confidence:.2f}")
        
        return {
            'confidence': min(confidence, 1.0),
            'is_emirates_id': is_emirates_id or confidence >= 0.3
        }
    
    def validate_id_number_format(self, id_number: str) -> bool:
        """
        Validate Emirates ID number format
        
        Format: 784-XXXX-XXXXXXX-X
        - 784 is UAE country code
        - XXXX is 4 digits
        - XXXXXXX is 7 digits
        - X is 1 check digit
        """
        # Normalize (remove spaces, ensure dashes)
        normalized = id_number.replace(' ', '-')
        
        # Check pattern
        if not self.ID_NUMBER_PATTERN.match(normalized):
            return False
        
        # Additional validation: check digit algorithm (if needed)
        # For now, pattern matching is sufficient
        
        return True
    
    def validate_date_format(self, date_str: str) -> bool:
        """Check if date string matches known formats"""
        for fmt in self.DATE_FORMATS:
            try:
                datetime.strptime(date_str, fmt)
                return True
            except ValueError:
                continue
        return False
    
    def parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime object"""
        for fmt in self.DATE_FORMATS:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None
    
    def validate_date_of_birth(self, dob_str: str) -> bool:
        """Validate date of birth is reasonable"""
        dob = self.parse_date(dob_str)
        if not dob:
            return False
        
        # Check if DOB is in the past
        if dob > datetime.now():
            return False
        
        # Check if DOB is not too old (e.g., more than 150 years ago)
        min_date = datetime(1900, 1, 1)
        if dob < min_date:
            return False
        
        return True
    
    def validate_expiry_date(self, expiry_str: str) -> bool:
        """Validate expiry date is in the future"""
        expiry = self.parse_date(expiry_str)
        if not expiry:
            return False
        
        # Check if expiry date is in the future
        return expiry > datetime.now()
    
    def is_id_expired(self, expiry_str: str) -> bool:
        """Check if ID is expired"""
        expiry = self.parse_date(expiry_str)
        if not expiry:
            return True  # If can't parse, assume expired for safety
        
        return expiry < datetime.now()
    
    def validate_id_number_checksum(self, id_number: str) -> bool:
        """
        Validate Emirates ID checksum (if algorithm is known)
        This is a placeholder - actual checksum algorithm may vary
        """
        # Remove dashes and spaces
        digits = re.sub(r'[-\s]', '', id_number)
        
        if len(digits) != 15:
            return False
        
        # Basic validation - actual checksum algorithm may be different
        # This is a placeholder implementation
        try:
            # Extract check digit (last digit)
            check_digit = int(digits[-1])
            
            # Calculate checksum (simplified - actual algorithm may differ)
            # This is just an example
            sum_digits = sum(int(d) for d in digits[:-1])
            calculated_check = sum_digits % 10
            
            return calculated_check == check_digit
        except ValueError:
            return False

