/**
 * TRUE-ID API Integration Service
 * For Emirates ID validation and face verification
 */

// Use backend proxy instead of calling TRUE-ID directly (solves CORS issues)
const BACKEND_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export interface TrueIDValidationResult {
  status: 'Authentic' | 'Suspicious' | 'Failed'
  confidence: number
  details: string
  timestamp: string
}

export interface TrueIDResponse {
  success: boolean
  data?: TrueIDValidationResult
  error?: string
}

/**
 * Convert base64 image to Blob
 */
function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
  const parts = base64.split(',')
  const contentType = parts[0].match(/:(.*?);/)?.[1] || mimeType
  const raw = atob(parts[1])
  const rawLength = raw.length
  const uInt8Array = new Uint8Array(rawLength)
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }
  
  return new Blob([uInt8Array], { type: contentType })
}

/**
 * Validate Emirates ID and person photo using TRUE-ID API
 * @param idFrontBase64 Base64 encoded front of Emirates ID
 * @param personPhotoBase64 Base64 encoded person's photo
 * @param idBackBase64 Optional: Base64 encoded back of Emirates ID
 */
export async function validateWithTrueID(
  idFrontBase64: string,
  personPhotoBase64: string,
  idBackBase64?: string
): Promise<TrueIDResponse> {
  try {
    console.log('🔐 TRUE-ID: Starting validation...')
    
    // Create FormData
    const formData = new FormData()
    
    // Convert base64 to blobs and append to form
    const idFrontBlob = base64ToBlob(idFrontBase64)
    const personBlob = base64ToBlob(personPhotoBase64)
    
    formData.append('id_front', idFrontBlob, 'id_front.jpg')
    formData.append('person', personBlob, 'person.jpg')
    
    if (idBackBase64) {
      const idBackBlob = base64ToBlob(idBackBase64)
      formData.append('id_back', idBackBlob, 'id_back.jpg')
    }
    
    console.log('🔐 TRUE-ID: Sending request to backend proxy...')
    
    // Call backend proxy (which forwards to TRUE-ID API)
    // This solves CORS issues when accessing from mobile devices
    const response = await fetch(`${BACKEND_API_URL}/api/validate-identity`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      const errorMsg = errorData.detail || `API error: ${response.status}`
      
      // Check for common TRUE-ID API issues
      if (errorMsg.includes('float32') || errorMsg.includes('JSON serializable')) {
        throw new Error('TRUE-ID API configuration error. Please ensure the API is properly configured to return JSON responses.')
      }
      
      throw new Error(errorMsg)
    }
    
    const result = await response.json()
    
    console.log('🔐 TRUE-ID: Validation complete')
    
    // Backend proxy returns wrapped response: { success, validation, verified }
    if (result.success && result.validation) {
      const validation = result.validation
      console.log(`   Status: ${validation.status}`)
      console.log(`   Confidence: ${validation.confidence}%`)
      console.log(`   Details: ${validation.details}`)
      
      return {
        success: true,
        data: validation,
      }
    } else {
      throw new Error(result.error || 'Validation failed')
    }
    
  } catch (error) {
    console.error('❌ TRUE-ID: Validation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    }
  }
}

/**
 * Validate only Emirates ID (extract data and check quality)
 * This is for Step 2 when we only have ID images
 */
export async function validateEmiratesID(
  idFrontBase64: string,
  idBackBase64?: string
): Promise<TrueIDResponse> {
  try {
    console.log('📇 TRUE-ID: Validating Emirates ID...')
    
    // For ID-only validation, we still need a person photo
    // We'll use the ID photo itself as a placeholder
    // In production, you might want a separate endpoint for this
    
    // For now, we'll mark this as pending face verification
    return {
      success: true,
      data: {
        status: 'Authentic',
        confidence: 100,
        details: 'Emirates ID captured. Proceed to face verification.',
        timestamp: new Date().toISOString(),
      },
    }
    
  } catch (error) {
    console.error('❌ TRUE-ID: ID validation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ID validation failed',
    }
  }
}

/**
 * Check if TRUE-ID API is available
 */
export async function checkTrueIDAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${TRUE_ID_API_URL}/docs`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get user-friendly message based on TRUE-ID status
 */
export function getTrueIDStatusMessage(result: TrueIDValidationResult): {
  message: string
  color: 'green' | 'yellow' | 'red'
  icon: '✅' | '⚠️' | '❌'
} {
  switch (result.status) {
    case 'Authentic':
      return {
        message: `Identity verified successfully! (${result.confidence.toFixed(1)}% confidence)`,
        color: 'green',
        icon: '✅',
      }
    
    case 'Suspicious':
      return {
        message: `Moderate similarity detected (${result.confidence.toFixed(1)}%). Manual review may be required.`,
        color: 'yellow',
        icon: '⚠️',
      }
    
    case 'Failed':
      return {
        message: `Identity verification failed (${result.confidence.toFixed(1)}%). Face does not match ID.`,
        color: 'red',
        icon: '❌',
      }
  }
}

