/**
 * Python OCR Service Integration
 * Connects to Python backend API for OCR and validation
 */

const PYTHON_API_BASE_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:5000'

export interface PythonOCRResult {
  success: boolean
  data?: {
    idNumber?: string
    name?: string
    nameArabic?: string
    nationality?: string
    dateOfBirth?: string
    gender?: string
    expiryDate?: string
    issueDate?: string
    cardNumber?: string
    confidence?: number
  }
  rawText?: string
  confidence?: number
  error?: string
}

export interface PythonValidationResult {
  success: boolean
  isValid: boolean
  isEmiratesID: boolean
  confidence: number
  data?: PythonOCRResult['data']
  errors?: string[]
  warnings?: string[]
  rawText?: string
  error?: string
}

/**
 * Process image with Python OCR backend
 */
export async function processWithPythonOCR(
  imageBase64: string,
  side: 'front' | 'back'
): Promise<PythonOCRResult> {
  try {
    const response = await fetch(`${PYTHON_API_BASE_URL}/api/ocr/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        side: side,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Python OCR API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process with Python OCR',
    }
  }
}

/**
 * Validate image with Python backend
 */
export async function validateWithPython(
  imageBase64: string,
  side: 'front' | 'back'
): Promise<PythonValidationResult> {
  try {
    const response = await fetch(`${PYTHON_API_BASE_URL}/api/ocr/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        side: side,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Python validation API error:', error)
    return {
      success: false,
      isValid: false,
      isEmiratesID: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Failed to validate with Python backend',
    }
  }
}

/**
 * Check if Python API is available
 */
export async function checkPythonAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PYTHON_API_BASE_URL}/health`, {
      method: 'GET',
    })
    return response.ok
  } catch (error) {
    console.warn('Python API not available:', error)
    return false
  }
}

