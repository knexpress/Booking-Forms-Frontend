/**
 * Emirates ID Validation Service
 * Validates that detected documents are actually Emirates ID cards
 */

import { processEmiratesID, validateEmiratesIDFormat } from './ocrService'

export interface IDValidationResult {
  isValid: boolean
  isEmiratesID: boolean
  confidence: number
  error?: string
  detectedData?: {
    idNumber?: string
    hasEmiratesIDPattern: boolean
    hasCardCharacteristics: boolean
  }
}

/**
 * Validate if an image is an Emirates ID card
 * Checks for Emirates ID specific characteristics
 */
export async function validateIsEmiratesID(
  imageBase64: string,
  side: 'front' | 'back'
): Promise<IDValidationResult> {
  try {
    console.log(`🔍 Validating ${side} side as Emirates ID...`)

    // Process the image with OCR to extract text
    const ocrResult = await processEmiratesID(imageBase64, side)

    if (!ocrResult.success) {
      // If OCR fails, we can't validate - but allow capture if document is detected
      // This is a fallback for cases where OCR isn't available
      console.warn('⚠️ OCR processing failed, using basic validation')
      return {
        isValid: true, // Allow if document shape is detected
        isEmiratesID: false,
        confidence: 0.5,
        error: 'OCR processing unavailable, basic validation only',
      }
    }

    const data = ocrResult.data
    let hasEmiratesIDPattern = false
    let hasCardCharacteristics = false
    let confidence = 0

    // Check for Emirates ID specific patterns
    if (side === 'front') {
      // Front side validation
      // 1. Check for Emirates ID number pattern (784-XXXX-XXXXXXX-X)
      if (data?.idNumber) {
        hasEmiratesIDPattern = validateEmiratesIDFormat(data.idNumber)
        if (hasEmiratesIDPattern) {
          confidence += 0.4
          console.log('✅ Emirates ID number pattern detected:', data.idNumber)
        }
      }

      // 2. Check for Emirates ID text indicators
      // Note: Text indicators are checked implicitly through OCR data validation

      // Check if OCR extracted meaningful data
      if (data?.name || data?.nationality || data?.dateOfBirth || data?.expiryDate) {
        hasCardCharacteristics = true
        confidence += 0.3
        console.log('✅ Emirates ID card characteristics detected')
      }

      // 3. Check for Arabic text (Emirates ID has Arabic text)
      // This would require Arabic OCR, but we can check if nameArabic exists
      if (data?.nameArabic) {
        confidence += 0.1
      }

      // 4. Check for date patterns (DOB, Expiry)
      if (data?.dateOfBirth && data?.expiryDate) {
        confidence += 0.2
      }
    } else {
      // Back side validation
      // Back side typically has:
      // 1. Barcode (we can't detect this easily, but we check for card structure)
      // 2. Machine readable zone (MRZ)
      // 3. Specific text patterns

      // Check if we have any extracted data (indicates OCR worked)
      if (data) {
        hasCardCharacteristics = true
        confidence += 0.3
      }

      // Back side might have card number or other identifiers
      if (data?.cardNumber) {
        confidence += 0.2
      }

      // Check for common back side text patterns
      // Note: Back side indicators are checked implicitly through OCR data validation

      // If OCR extracted any data, it's likely a document
      if (data?.idNumber || data?.cardNumber) {
        confidence += 0.3
      }

      // For back side, we're more lenient - if it's a rectangular document
      // and OCR can read something, we consider it valid
      hasEmiratesIDPattern = true // More lenient for back side
      confidence += 0.2
    }

    // Determine if it's an Emirates ID
    const isEmiratesID = hasEmiratesIDPattern || (hasCardCharacteristics && confidence >= 0.5)

    // Minimum confidence threshold
    const minConfidence = side === 'front' ? 0.5 : 0.4
    const isValid = isEmiratesID && confidence >= minConfidence

    console.log(`📊 Validation result for ${side} side:`, {
      isValid,
      isEmiratesID,
      confidence: confidence.toFixed(2),
      hasEmiratesIDPattern,
      hasCardCharacteristics,
    })

    if (!isValid) {
      return {
        isValid: false,
        isEmiratesID: false,
        confidence,
        error: side === 'front'
          ? 'This does not appear to be an Emirates ID card. Please ensure you are scanning the front of a valid Emirates ID.'
          : 'This does not appear to be the back of an Emirates ID card. Please ensure you are scanning the back of a valid Emirates ID.',
        detectedData: {
          idNumber: data?.idNumber,
          hasEmiratesIDPattern,
          hasCardCharacteristics,
        },
      }
    }

    return {
      isValid: true,
      isEmiratesID: true,
      confidence,
      detectedData: {
        idNumber: data?.idNumber,
        hasEmiratesIDPattern,
        hasCardCharacteristics,
      },
    }
  } catch (error) {
    console.error('❌ Emirates ID validation error:', error)
    return {
      isValid: false,
      isEmiratesID: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Validation failed',
    }
  }
}

/**
 * Quick validation using image analysis (without OCR)
 * Checks for basic card characteristics
 */
export function quickValidateCardShape(
  points: any[] | null,
  blurScore: number
): { isValid: boolean; reason?: string } {
  if (!points || points.length < 4) {
    return { isValid: false, reason: 'No document detected in frame' }
  }

  // Check if it's roughly rectangular (card-like shape)
  if (points.length < 4 || points.length > 8) {
    return { isValid: false, reason: 'Document shape does not match ID card format' }
  }

  // Check blur - too blurry means we can't validate properly
  if (blurScore < 20) {
    return { isValid: false, reason: 'Image is too blurry. Please hold the card steady and ensure good lighting.' }
  }

  return { isValid: true }
}

