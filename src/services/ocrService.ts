import { API_CONFIG } from '../config/api.config'

export interface EmiratesIDData {
  idNumber: string
  name: string
  nameArabic?: string
  nationality: string
  dateOfBirth: string
  gender: string
  expiryDate: string
  issueDate?: string
  cardNumber?: string
  confidence: number
}

export interface OCRResult {
  success: boolean
  data?: EmiratesIDData
  error?: string
  rawResponse?: any
}

// Base64 to Blob converter
function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',')
  const contentType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const raw = atob(parts[1])
  const rawLength = raw.length
  const uInt8Array = new Uint8Array(rawLength)
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }
  
  return new Blob([uInt8Array], { type: contentType })
}

// AWS Textract Implementation
async function processWithAWS(imageBase64: string, side: 'front' | 'back'): Promise<OCRResult> {
  try {
    // Note: AWS SDK should be used server-side for security
    // This is a client-side example - move to backend in production
    
    const response = await fetch(`${API_CONFIG.baseUrl}/api/ocr/aws`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        image: imageBase64,
        side: side,
        documentType: 'emirates-id',
      }),
    })
    
    if (!response.ok) {
      throw new Error('AWS OCR processing failed')
    }
    
    const result = await response.json()
    
    return {
      success: true,
      data: result.data,
      rawResponse: result.rawResponse,
    }
  } catch (error) {
    console.error('AWS OCR error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Azure Computer Vision Implementation
async function processWithAzure(imageBase64: string, side: 'front' | 'back'): Promise<OCRResult> {
  try {
    const blob = base64ToBlob(imageBase64)
    
    const response = await fetch(
      `${API_CONFIG.ocr.azure.endpoint}/vision/v3.2/read/analyze`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': API_CONFIG.ocr.azure.apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: blob,
      }
    )
    
    if (!response.ok) {
      throw new Error('Azure OCR request failed')
    }
    
    // Get operation location from headers
    const operationLocation = response.headers.get('Operation-Location')
    if (!operationLocation) {
      throw new Error('No operation location returned')
    }
    
    // Poll for results
    let result
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const resultResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': API_CONFIG.ocr.azure.apiKey,
        },
      })
      
      result = await resultResponse.json()
      
      if (result.status === 'succeeded') {
        break
      } else if (result.status === 'failed') {
        throw new Error('Azure OCR processing failed')
      }
      
      attempts++
    }
    
    // Extract Emirates ID data from OCR text
    const extractedData = parseEmiratesIDFromText(result.analyzeResult.readResults, side)
    
    return {
      success: true,
      data: extractedData,
      rawResponse: result,
    }
  } catch (error) {
    console.error('Azure OCR error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Google Cloud Vision Implementation
async function processWithGoogle(imageBase64: string, side: 'front' | 'back'): Promise<OCRResult> {
  try {
    const imageContent = imageBase64.split(',')[1]
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_CONFIG.ocr.google.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageContent,
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    )
    
    if (!response.ok) {
      throw new Error('Google Vision API request failed')
    }
    
    const result = await response.json()
    
    if (result.responses[0].error) {
      throw new Error(result.responses[0].error.message)
    }
    
    // Extract Emirates ID data from OCR text
    const extractedData = parseEmiratesIDFromText(
      result.responses[0].textAnnotations,
      side
    )
    
    return {
      success: true,
      data: extractedData,
      rawResponse: result,
    }
  } catch (error) {
    console.error('Google Vision error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Mindee API Implementation (Specialized for ID documents)
async function processWithMindee(imageBase64: string, _side: 'front' | 'back'): Promise<OCRResult> {
  try {
    const blob = base64ToBlob(imageBase64)
    const formData = new FormData()
    formData.append('document', blob, 'emirates-id.jpg')
    
    const response = await fetch(
      'https://api.mindee.net/v1/products/mindee/international_id/v2/predict',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${API_CONFIG.ocr.mindee.apiKey}`,
        },
        body: formData,
      }
    )
    
    if (!response.ok) {
      throw new Error('Mindee API request failed')
    }
    
    const result = await response.json()
    const prediction = result.document.inference.prediction
    
    const extractedData: EmiratesIDData = {
      idNumber: prediction.document_number?.value || '',
      name: prediction.given_names?.map((n: any) => n.value).join(' ') + ' ' + 
            prediction.surnames?.map((n: any) => n.value).join(' '),
      nationality: prediction.nationality?.value || '',
      dateOfBirth: prediction.birth_date?.value || '',
      gender: prediction.sex?.value || '',
      expiryDate: prediction.expiry_date?.value || '',
      issueDate: prediction.issuance_date?.value || '',
      confidence: prediction.document_number?.confidence || 0,
    }
    
    return {
      success: true,
      data: extractedData,
      rawResponse: result,
    }
  } catch (error) {
    console.error('Mindee API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Parse Emirates ID data from OCR text
function parseEmiratesIDFromText(textData: any, _side: 'front' | 'back'): EmiratesIDData {
  // This is a simplified parser - enhance based on actual Emirates ID format
  const allText = JSON.stringify(textData).toLowerCase()
  
  // Extract patterns for Emirates ID
  const idNumberPattern = /784-\d{4}-\d{7}-\d{1}/
  const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g
  
  const idNumberMatch = allText.match(idNumberPattern)
  const dates = allText.match(datePattern) || []
  
  return {
    idNumber: idNumberMatch ? idNumberMatch[0] : '',
    name: '', // Would need more sophisticated parsing
    nationality: '',
    dateOfBirth: dates[0] || '',
    gender: '',
    expiryDate: dates[1] || '',
    confidence: 0.85,
  }
}

// Simulation mode (for development/testing)
async function simulateOCR(_imageBase64: string, side: 'front' | 'back'): Promise<OCRResult> {
  console.log(`⏳ Simulating OCR for ${side} side with ${API_CONFIG.features.simulationDelay}ms delay...`)
  await new Promise(resolve => setTimeout(resolve, API_CONFIG.features.simulationDelay))
  console.log('✅ OCR simulation complete')
  
  return {
    success: true,
    data: {
      idNumber: '784-1990-1234567-1',
      name: 'John Doe',
      nameArabic: 'جون دو',
      nationality: 'United Arab Emirates',
      dateOfBirth: '01/01/1990',
      gender: 'Male',
      expiryDate: '01/01/2030',
      issueDate: '01/01/2020',
      cardNumber: '123456789',
      confidence: 0.95,
    },
  }
}

// Main OCR service function
export async function processEmiratesID(
  imageBase64: string,
  side: 'front' | 'back'
): Promise<OCRResult> {
  console.log('🔍 OCR Service - Simulation Mode:', API_CONFIG.features.simulationMode)
  console.log('🔍 OCR Service - Provider:', API_CONFIG.ocr.provider)
  
  // Use simulation mode if enabled
  if (API_CONFIG.features.simulationMode) {
    console.log('✅ Using simulation mode')
    return simulateOCR(imageBase64, side)
  }
  
  // Route to appropriate OCR provider
  const provider = API_CONFIG.ocr.provider
  
  try {
    switch (provider) {
      case 'aws':
        return await processWithAWS(imageBase64, side)
      case 'azure':
        return await processWithAzure(imageBase64, side)
      case 'google':
        return await processWithGoogle(imageBase64, side)
      case 'mindee':
        return await processWithMindee(imageBase64, side)
      default:
        return {
          success: false,
          error: `Unknown OCR provider: ${provider}`,
        }
    }
  } catch (error) {
    console.error('OCR processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed',
    }
  }
}

// Validate Emirates ID format
export function validateEmiratesIDFormat(idNumber: string): boolean {
  const pattern = /^784-\d{4}-\d{7}-\d{1}$/
  return pattern.test(idNumber)
}

// Check if Emirates ID is expired
export function isEmiratesIDExpired(expiryDate: string): boolean {
  try {
    const expiry = new Date(expiryDate)
    const today = new Date()
    return expiry < today
  } catch {
    return false
  }
}


