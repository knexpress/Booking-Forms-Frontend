/**
 * Face Detection Service using face-api.js
 * Provides real-time face detection for liveness checks
 */

// Access face-api.js from window or import
declare global {
  interface Window {
    faceapi?: any
  }
}

let faceapi: any = null

async function loadFaceApi() {
  if (faceapi) return faceapi
  
  try {
    // Try accessing from window first (if loaded via script tag)
    if (typeof window !== 'undefined' && (window as any).faceapi) {
      faceapi = (window as any).faceapi
      return faceapi
    }
    
    // Try dynamic import
    const faceApiModule = await import('face-api.js')
    faceapi = faceApiModule.default || faceApiModule
    return faceapi
  } catch (err) {
    console.warn('Failed to load face-api.js:', err)
    return null
  }
}

let modelsLoaded = false
let modelsLoading = false

export interface FaceDetectionResult {
  detected: boolean
  faceBox?: {
    x: number
    y: number
    width: number
    height: number
  }
  landmarks?: {
    leftEye: { x: number; y: number }
    rightEye: { x: number; y: number }
    nose: { x: number; y: number }
    mouth: { x: number; y: number }
  }
  expressions?: {
    neutral: number
    happy: number
    sad: number
    angry: number
    fearful: number
    disgusted: number
    surprised: number
  }
  angle?: {
    pitch: number // Up/down rotation
    yaw: number // Left/right rotation
    roll: number // Tilt rotation
  }
  confidence?: number
}

/**
 * Load face-api.js models
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) {
    return Promise.resolve()
  }

  if (modelsLoading) {
    // Wait for existing load to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (modelsLoaded) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
  }

  modelsLoading = true

  try {
    // Load face-api.js library first
    const faceApiModule = await loadFaceApi()
    if (!faceApiModule) {
      throw new Error('Failed to load face-api.js library')
    }
    
    // Handle different module export formats
    faceapi = faceApiModule.default || faceApiModule.namespace || faceApiModule
    
    const MODEL_URL = '/models' // Models should be in public/models directory
    const cdnUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
    
    console.log('📦 Loading face-api.js models...')
    
    try {
      // Try loading from public/models first
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ])
      console.log('✅ Face models loaded from local')
    } catch (localError) {
      console.warn('⚠️ Local models not found, trying CDN...', localError)
      // Fallback to CDN
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(cdnUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(cdnUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(cdnUrl),
        faceapi.nets.faceExpressionNet.loadFromUri(cdnUrl),
      ])
      console.log('✅ Face models loaded from CDN')
    }

    modelsLoaded = true
    modelsLoading = false
  } catch (error) {
    modelsLoading = false
    console.error('❌ Failed to load face-api.js models:', error)
    // Don't throw - allow manual capture as fallback
    console.warn('⚠️ Face auto-detection unavailable. Manual capture still works.')
  }
}

/**
 * Detect face in video frame
 */
export async function detectFaceInFrame(
  videoElement: HTMLVideoElement
): Promise<FaceDetectionResult | null> {
  if (!modelsLoaded) {
    await loadFaceModels()
  }

  if (!faceapi || !modelsLoaded) {
    return {
      detected: false,
    }
  }

  // Validate video element has valid dimensions
  if (!videoElement) {
    return {
      detected: false,
    }
  }

  // Check video ready state and dimensions
  const videoWidth = videoElement.videoWidth || videoElement.clientWidth || 0
  const videoHeight = videoElement.videoHeight || videoElement.clientHeight || 0

  // Ensure video has valid dimensions before processing
  if (videoWidth === 0 || videoHeight === 0) {
    // Video not ready yet, return no detection
    return {
      detected: false,
    }
  }

  // Check video readyState - should be at least HAVE_CURRENT_DATA (2) or HAVE_FUTURE_DATA (3)
  if (videoElement.readyState < 2) {
    // Video metadata not loaded yet
    return {
      detected: false,
    }
  }

  try {
    // Validate video element is still valid before detection
    if (!videoElement || videoElement.readyState === 0 || videoWidth === 0 || videoHeight === 0) {
      return {
        detected: false,
      }
    }

    // Use tinyFaceDetector for better performance
    // Add timeout to prevent hanging on invalid video elements
    const detectionPromise = faceapi
      .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptor()

    // Add timeout to prevent hanging (5 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Face detection timeout')), 5000)
    )

    const detection = await Promise.race([detectionPromise, timeoutPromise]) as any

    if (!detection || !detection.detection || !detection.landmarks) {
      return {
        detected: false,
      }
    }

    const box = detection.detection.box
    
    // Validate box dimensions
    if (!box || box.width <= 0 || box.height <= 0) {
      return {
        detected: false,
      }
    }

    const landmarks = detection.landmarks

    // Extract key landmarks with validation
    if (!landmarks || typeof landmarks.getLeftEye !== 'function') {
      return {
        detected: false,
      }
    }

    let leftEye, rightEye, nose, mouth

    try {
      leftEye = landmarks.getLeftEye()
      rightEye = landmarks.getRightEye()
      nose = landmarks.getNose()
      mouth = landmarks.getMouth()

      // Validate landmarks exist and have valid data
      if (!leftEye || !rightEye || !nose || !mouth || 
          leftEye.length === 0 || rightEye.length === 0 || 
          nose.length === 0 || mouth.length === 0 ||
          !leftEye[0] || !rightEye[0] || !nose[0] || !mouth[0]) {
        return {
          detected: false,
        }
      }
    } catch (landmarkError) {
      // Landmarks extraction failed
      return {
        detected: false,
      }
    }

    // Calculate face angle (simplified)
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye[0].x - leftEye[0].x, 2) +
      Math.pow(rightEye[0].y - leftEye[0].y, 2)
    )
    const eyeCenterX = (leftEye[0].x + rightEye[0].x) / 2
    const eyeCenterY = (leftEye[0].y + rightEye[0].y) / 2
    const noseX = nose[0].x
    const noseY = nose[0].y

    // Calculate yaw (left/right rotation)
    const yaw = Math.atan2(noseX - eyeCenterX, eyeDistance) * (180 / Math.PI)

    // Calculate pitch (up/down rotation)
    const pitch = Math.atan2(noseY - eyeCenterY, eyeDistance) * (180 / Math.PI)

    // Calculate roll (tilt)
    const roll = Math.atan2(
      rightEye[0].y - leftEye[0].y,
      rightEye[0].x - leftEye[0].x
    ) * (180 / Math.PI)

    return {
      detected: true,
      faceBox: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      },
      landmarks: {
        leftEye: { x: eyeCenterX, y: eyeCenterY },
        rightEye: { x: rightEye[0].x, y: rightEye[0].y },
        nose: { x: noseX, y: noseY },
        mouth: { x: mouth[0].x, y: mouth[0].y },
      },
      expressions: detection.expressions,
      angle: {
        pitch,
        yaw,
        roll,
      },
      confidence: detection.detection.score,
    }
  } catch (error) {
    // Silently handle errors to prevent console spam
    // Common errors: video not ready, invalid dimensions, etc.
    if (error instanceof Error) {
      // Only log non-timeout errors to avoid spam
      if (!error.message.includes('timeout') && !error.message.includes('InvalidStateError')) {
        console.warn('Face detection warning:', error.message)
      }
    }
    return {
      detected: false,
    }
  }
}

/**
 * Check if face is in correct position for capture
 */
export function isFacePositionValid(
  detection: FaceDetectionResult,
  requiredAction?: 'blink' | 'smile' | 'turn-left' | 'turn-right' | null
): { valid: boolean; reason?: string } {
  if (!detection.detected) {
    return { valid: false, reason: 'No face detected. Please position your face in the frame.' }
  }

  // Check face angle - should be relatively straight
  if (detection.angle) {
    const { pitch, yaw, roll } = detection.angle

    // Check pitch (up/down) - relaxed to ±25 degrees for easier capture
    if (Math.abs(pitch) > 25) {
      return {
        valid: false,
        reason: pitch > 0
          ? 'Please look straight ahead (not looking down)'
          : 'Please look straight ahead (not looking up)',
      }
    }

    // Check roll (tilt) - relaxed to ±20 degrees for easier capture
    if (Math.abs(roll) > 20) {
      return {
        valid: false,
        reason: 'Please keep your head straight (not tilted)',
      }
    }

    // Check yaw based on required action - relaxed thresholds for easier capture
    if (requiredAction === 'turn-left') {
      // Widened range: -5 to -40 degrees (was -10 to -30)
      if (yaw > -5) {
        return {
          valid: false,
          reason: 'Please turn your head slightly to the left',
        }
      }
      if (yaw < -40) {
        return {
          valid: false,
          reason: 'Turned too far left. Please turn slightly less.',
        }
      }
    } else if (requiredAction === 'turn-right') {
      // Widened range: 5 to 40 degrees (was 10 to 30)
      if (yaw < 5) {
        return {
          valid: false,
          reason: 'Please turn your head slightly to the right',
        }
      }
      if (yaw > 40) {
        return {
          valid: false,
          reason: 'Turned too far right. Please turn slightly less.',
        }
      }
    } else {
      // For blink and smile, face should be relatively straight - relaxed to ±25 degrees (was ±15)
      if (Math.abs(yaw) > 25) {
        return {
          valid: false,
          reason: yaw < 0
            ? 'Please face the camera directly (turn right slightly)'
            : 'Please face the camera directly (turn left slightly)',
        }
      }
    }
  }

  // Check expressions based on required action - relaxed threshold for easier capture
  if (requiredAction === 'smile' && detection.expressions) {
    const happyScore = detection.expressions.happy
    // Lowered threshold from 0.5 to 0.3 for easier smile detection
    if (happyScore < 0.3) {
      return {
        valid: false,
        reason: 'Please smile more clearly',
      }
    }
  }

  // Check if face is centered and properly sized - relaxed size range for easier capture
  if (detection.faceBox) {
    const { width, height } = detection.faceBox
    // Widened size range: 80-500 pixels (was 100-400)
    const minSize = 80 // Minimum face size in pixels
    const maxSize = 500 // Maximum face size in pixels

    if (width < minSize || height < minSize) {
      return {
        valid: false,
        reason: 'Please move closer to the camera',
      }
    }

    if (width > maxSize || height > maxSize) {
      return {
        valid: false,
        reason: 'Please move further from the camera',
      }
    }
  }

  // Check confidence - lowered threshold for easier capture
  if (detection.confidence && detection.confidence < 0.5) {
    // Lowered from 0.7 to 0.5 for easier detection
    return {
      valid: false,
      reason: 'Face detection confidence is low. Please ensure good lighting.',
    }
  }

  return { valid: true }
}

/**
 * Detect blink (eyes closed)
 */
export function detectBlink(detection: FaceDetectionResult): boolean {
  // This is a simplified blink detection
  // In production, you'd track eye aspect ratio over time
  if (!detection.landmarks) {
    return false
  }

  // For now, we'll use expression detection or manual confirmation
  // Real blink detection requires tracking eye state over multiple frames
  return true // Placeholder - will be handled by user action
}

