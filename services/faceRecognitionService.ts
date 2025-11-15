import { API_CONFIG } from '../config/api.config'

export interface FaceVerificationResult {
  success: boolean
  isMatch: boolean
  confidence: number
  livenessScore?: number
  passed: boolean
  error?: string
  rawResponse?: any
}

export interface LivenessDetectionResult {
  success: boolean
  isLive: boolean
  confidence: number
  actions?: {
    blink?: boolean
    smile?: boolean
    turnHead?: boolean
  }
  error?: string
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

// AWS Rekognition Implementation
async function verifyWithAWS(
  faceImageBase64: string,
  referenceImageBase64: string
): Promise<FaceVerificationResult> {
  try {
    // Note: AWS SDK should be used server-side for security
    // This is a client-side example - move to backend in production
    
    const response = await fetch(`${API_CONFIG.baseUrl}/api/face/aws/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        sourceImage: faceImageBase64,
        targetImage: referenceImageBase64,
      }),
    })
    
    if (!response.ok) {
      throw new Error('AWS Rekognition verification failed')
    }
    
    const result = await response.json()
    
    return {
      success: true,
      isMatch: result.similarity > 90,
      confidence: result.similarity,
      passed: result.similarity > 90,
      rawResponse: result,
    }
  } catch (error) {
    console.error('AWS Rekognition error:', error)
    return {
      success: false,
      isMatch: false,
      confidence: 0,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// AWS Rekognition Liveness Detection
async function detectLivenessAWS(faceImageBase64: string): Promise<LivenessDetectionResult> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/face/aws/liveness`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        image: faceImageBase64,
      }),
    })
    
    if (!response.ok) {
      throw new Error('AWS liveness detection failed')
    }
    
    const result = await response.json()
    
    return {
      success: true,
      isLive: result.isLive,
      confidence: result.confidence,
      actions: result.actions,
    }
  } catch (error) {
    console.error('AWS liveness error:', error)
    return {
      success: false,
      isLive: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Azure Face API Implementation
async function verifyWithAzure(
  faceImageBase64: string,
  referenceImageBase64: string
): Promise<FaceVerificationResult> {
  try {
    // Step 1: Detect faces in both images
    const detectFace = async (imageBase64: string) => {
      const blob = base64ToBlob(imageBase64)
      
      const response = await fetch(
        `${API_CONFIG.face.azure.endpoint}/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=true`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': API_CONFIG.face.azure.apiKey,
            'Content-Type': 'application/octet-stream',
          },
          body: blob,
        }
      )
      
      if (!response.ok) {
        throw new Error('Face detection failed')
      }
      
      const result = await response.json()
      return result[0]?.faceId
    }
    
    const sourceFaceId = await detectFace(faceImageBase64)
    const targetFaceId = await detectFace(referenceImageBase64)
    
    if (!sourceFaceId || !targetFaceId) {
      throw new Error('Could not detect faces in one or both images')
    }
    
    // Step 2: Verify faces
    const verifyResponse = await fetch(
      `${API_CONFIG.face.azure.endpoint}/face/v1.0/verify`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': API_CONFIG.face.azure.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faceId1: sourceFaceId,
          faceId2: targetFaceId,
        }),
      }
    )
    
    if (!verifyResponse.ok) {
      throw new Error('Face verification failed')
    }
    
    const result = await verifyResponse.json()
    
    return {
      success: true,
      isMatch: result.isIdentical,
      confidence: result.confidence * 100,
      passed: result.isIdentical && result.confidence > 0.8,
      rawResponse: result,
    }
  } catch (error) {
    console.error('Azure Face API error:', error)
    return {
      success: false,
      isMatch: false,
      confidence: 0,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Azure Liveness Detection
async function detectLivenessAzure(faceImageBase64: string): Promise<LivenessDetectionResult> {
  try {
    const blob = base64ToBlob(faceImageBase64)
    
    const response = await fetch(
      `${API_CONFIG.face.azure.endpoint}/face/v1.0/detect?returnFaceAttributes=accessories,blur,exposure,noise,occlusion`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': API_CONFIG.face.azure.apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: blob,
      }
    )
    
    if (!response.ok) {
      throw new Error('Azure liveness detection failed')
    }
    
    const result = await response.json()
    const face = result[0]
    
    if (!face) {
      throw new Error('No face detected')
    }
    
    // Calculate liveness score based on face attributes
    const attributes = face.faceAttributes
    const livenessScore = 
      (attributes.blur.blurLevel === 'low' ? 0.3 : 0) +
      (attributes.exposure.exposureLevel === 'goodExposure' ? 0.3 : 0) +
      (attributes.noise.noiseLevel === 'low' ? 0.2 : 0) +
      (!attributes.occlusion.foreheadOccluded && !attributes.occlusion.eyeOccluded ? 0.2 : 0)
    
    return {
      success: true,
      isLive: livenessScore > 0.7,
      confidence: livenessScore * 100,
    }
  } catch (error) {
    console.error('Azure liveness error:', error)
    return {
      success: false,
      isLive: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Face++ API Implementation
async function verifyWithFacePP(
  faceImageBase64: string,
  referenceImageBase64: string
): Promise<FaceVerificationResult> {
  try {
    const formData = new FormData()
    formData.append('api_key', API_CONFIG.face.facepp.apiKey)
    formData.append('api_secret', API_CONFIG.face.facepp.apiSecret)
    formData.append('image_base64_1', faceImageBase64.split(',')[1])
    formData.append('image_base64_2', referenceImageBase64.split(',')[1])
    
    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error('Face++ API request failed')
    }
    
    const result = await response.json()
    
    if (result.error_message) {
      throw new Error(result.error_message)
    }
    
    return {
      success: true,
      isMatch: result.confidence > 80,
      confidence: result.confidence,
      passed: result.confidence > 80 && result.thresholds['1e-5'] < result.confidence,
      rawResponse: result,
    }
  } catch (error) {
    console.error('Face++ error:', error)
    return {
      success: false,
      isMatch: false,
      confidence: 0,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Face++ Liveness Detection
async function detectLivenessFacePP(faceImageBase64: string): Promise<LivenessDetectionResult> {
  try {
    const formData = new FormData()
    formData.append('api_key', API_CONFIG.face.facepp.apiKey)
    formData.append('api_secret', API_CONFIG.face.facepp.apiSecret)
    formData.append('image_base64', faceImageBase64.split(',')[1])
    formData.append('return_landmark', '1')
    formData.append('return_attributes', 'blur,eyestatus,facequality')
    
    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error('Face++ liveness detection failed')
    }
    
    const result = await response.json()
    const face = result.faces[0]
    
    if (!face) {
      throw new Error('No face detected')
    }
    
    const attributes = face.attributes
    const livenessScore = 
      (attributes.facequality.value / 100 * 0.4) +
      (attributes.blur.blurness.value < 50 ? 0.3 : 0) +
      (attributes.eyestatus.left_eye_status.normal_glass_eye_open > 0.5 ? 0.15 : 0) +
      (attributes.eyestatus.right_eye_status.normal_glass_eye_open > 0.5 ? 0.15 : 0)
    
    return {
      success: true,
      isLive: livenessScore > 0.7,
      confidence: livenessScore * 100,
    }
  } catch (error) {
    console.error('Face++ liveness error:', error)
    return {
      success: false,
      isLive: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Kairos API Implementation
async function verifyWithKairos(
  faceImageBase64: string,
  referenceImageBase64: string
): Promise<FaceVerificationResult> {
  try {
    // Enroll reference face
    const enrollResponse = await fetch('https://api.kairos.com/enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'app_id': API_CONFIG.face.kairos.appId,
        'app_key': API_CONFIG.face.kairos.appKey,
      },
      body: JSON.stringify({
        image: referenceImageBase64,
        gallery_name: 'emirates_id_verification',
        subject_id: 'reference_' + Date.now(),
      }),
    })
    
    const enrollResult = await enrollResponse.json()
    
    if (!enrollResponse.ok || enrollResult.Errors) {
      throw new Error(enrollResult.Errors?.[0]?.Message || 'Enrollment failed')
    }
    
    // Recognize face
    const recognizeResponse = await fetch('https://api.kairos.com/recognize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'app_id': API_CONFIG.face.kairos.appId,
        'app_key': API_CONFIG.face.kairos.appKey,
      },
      body: JSON.stringify({
        image: faceImageBase64,
        gallery_name: 'emirates_id_verification',
      }),
    })
    
    const recognizeResult = await recognizeResponse.json()
    
    if (!recognizeResponse.ok || recognizeResult.Errors) {
      throw new Error(recognizeResult.Errors?.[0]?.Message || 'Recognition failed')
    }
    
    const match = recognizeResult.images[0]?.candidates[0]
    const confidence = match ? (1 - match.confidence) * 100 : 0
    
    return {
      success: true,
      isMatch: confidence > 80,
      confidence: confidence,
      passed: confidence > 80,
      rawResponse: recognizeResult,
    }
  } catch (error) {
    console.error('Kairos error:', error)
    return {
      success: false,
      isMatch: false,
      confidence: 0,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Simulation mode (for development/testing)
async function simulateVerification(): Promise<FaceVerificationResult> {
  await new Promise(resolve => setTimeout(resolve, API_CONFIG.features.simulationDelay))
  
  return {
    success: true,
    isMatch: true,
    confidence: 95,
    livenessScore: 92,
    passed: true,
  }
}

async function simulateLiveness(): Promise<LivenessDetectionResult> {
  await new Promise(resolve => setTimeout(resolve, API_CONFIG.features.simulationDelay))
  
  return {
    success: true,
    isLive: true,
    confidence: 92,
    actions: {
      blink: true,
      smile: true,
      turnHead: true,
    },
  }
}

// Main face verification function
export async function verifyFace(
  faceImageBase64: string,
  referenceImageBase64: string
): Promise<FaceVerificationResult> {
  // Use simulation mode if enabled
  if (API_CONFIG.features.simulationMode) {
    return simulateVerification()
  }
  
  const provider = API_CONFIG.face.provider
  
  try {
    switch (provider) {
      case 'aws':
        return await verifyWithAWS(faceImageBase64, referenceImageBase64)
      case 'azure':
        return await verifyWithAzure(faceImageBase64, referenceImageBase64)
      case 'facepp':
        return await verifyWithFacePP(faceImageBase64, referenceImageBase64)
      case 'kairos':
        return await verifyWithKairos(faceImageBase64, referenceImageBase64)
      default:
        return {
          success: false,
          isMatch: false,
          confidence: 0,
          passed: false,
          error: `Unknown face provider: ${provider}`,
        }
    }
  } catch (error) {
    console.error('Face verification error:', error)
    return {
      success: false,
      isMatch: false,
      confidence: 0,
      passed: false,
      error: error instanceof Error ? error.message : 'Face verification failed',
    }
  }
}

// Liveness detection function
export async function detectLiveness(faceImageBase64: string): Promise<LivenessDetectionResult> {
  // Use simulation mode if enabled
  if (API_CONFIG.features.simulationMode) {
    return simulateLiveness()
  }
  
  const provider = API_CONFIG.face.provider
  
  try {
    switch (provider) {
      case 'aws':
        return await detectLivenessAWS(faceImageBase64)
      case 'azure':
        return await detectLivenessAzure(faceImageBase64)
      case 'facepp':
        return await detectLivenessFacePP(faceImageBase64)
      default:
        return {
          success: false,
          isLive: false,
          confidence: 0,
          error: `Liveness detection not implemented for provider: ${provider}`,
        }
    }
  } catch (error) {
    console.error('Liveness detection error:', error)
    return {
      success: false,
      isLive: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Liveness detection failed',
    }
  }
}


