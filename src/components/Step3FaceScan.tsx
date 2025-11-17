import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, XCircle, ArrowLeft, ArrowRight, Eye, Maximize2 } from 'lucide-react'
import { VerificationData } from '../types'
import { verifyFace, detectLiveness } from '../services/faceRecognitionService'
import { validateWithTrueID, getTrueIDStatusMessage } from '../services/trueIdService'
import { API_CONFIG } from '../config/api.config'
import { 
  loadFaceModels, 
  detectFaceInFrame, 
  isFacePositionValid,
  FaceDetectionResult 
} from '../services/faceDetectionService'
import FaceScanModal from './FaceScanModal'

interface Step3Props {
  onComplete: (data: Partial<VerificationData>) => void
  onBack: () => void
  eidImage?: string // Emirates ID front image for face matching
  eidBackImage?: string // Emirates ID back image (optional)
  service?: string | null
}

type LivenessAction = 'blink' | 'smile' | 'turn-left' | 'turn-right' | null

const livenessInstructions: Record<Exclude<LivenessAction, null>, string> = {
  blink: 'Please blink your eyes',
  smile: 'Please smile',
  'turn-left': 'Turn your head slightly to the left',
  'turn-right': 'Turn your head slightly to the right',
}

export default function Step3FaceScan({ onComplete, onBack, eidImage, eidBackImage, service }: Step3Props) {
  // Determine route
  const route = (service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'
  const webcamRef = useRef<Webcam>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [faceImage, setFaceImage] = useState<string | null>(null) // Last captured image for display
  const [faceImages, setFaceImages] = useState<string[]>([]) // Store all 3 images
  const [currentAction, setCurrentAction] = useState<LivenessAction>(null)
  const [completedActions, setCompletedActions] = useState<LivenessAction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [_verificationResult, setVerificationResult] = useState<any>(null)
  const [_livenessResult, setLivenessResult] = useState<any>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false)
  const [faceDetection, setFaceDetection] = useState<FaceDetectionResult | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionReady, setDetectionReady] = useState(false)
  const [_stabilityStartTime, setStabilityStartTime] = useState<number | null>(null)
  
  // Detect if device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
  // Relaxed stability duration - shorter wait time for easier capture
  const STABILITY_DURATION = isMobile ? 300 : 400

  const allActions: Exclude<LivenessAction, null>[] = ['blink', 'smile', 'turn-left']
  
  // Load face models on mount
  useEffect(() => {
    loadFaceModels()
      .then(() => {
        setFaceModelsLoaded(true)
        console.log('✅ Face detection models loaded')
      })
      .catch((err) => {
        console.error('❌ Failed to load face models:', err)
        // Continue without auto-detection - file upload still available
      })
  }, [])

  const requestCameraPermission = async () => {
    try {
      // Request camera permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      })
      
      // Stop the stream immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop())
      
      // Clear errors and show success
      setCameraError(null)
      setError(null)
      console.log('✅ Camera permission granted!')
      
      return true
    } catch (err) {
      console.error('❌ Camera permission denied:', err)
      handleCameraError(err as Error)
      return false
    }
  }

  // Stop auto-detection
  const stopAutoDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    setIsDetecting(false)
    setDetectionReady(false)
    setStabilityStartTime(null)
    setFaceDetection(null)
  }, [])

  // Draw face detection overlay
  const drawFaceDetection = useCallback((detection: FaceDetectionResult | null, canvas: HTMLCanvasElement, video: HTMLVideoElement, isReady: boolean = false) => {
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match video
    const videoWidth = video.videoWidth || video.clientWidth
    const videoHeight = video.videoHeight || video.clientHeight
    
    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth
      canvas.height = videoHeight
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (detection && detection.detected && detection.faceBox) {
      const { x, y, width, height } = detection.faceBox
      
      // Draw face box
      ctx.strokeStyle = isReady ? '#10b981' : '#eab308'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, width, height)

      // Draw landmarks if available
      if (detection.landmarks) {
        ctx.fillStyle = isReady ? '#10b981' : '#eab308'
        const landmarks = [
          detection.landmarks.leftEye,
          detection.landmarks.rightEye,
          detection.landmarks.nose,
          detection.landmarks.mouth,
        ]
        landmarks.forEach(landmark => {
          ctx.beginPath()
          ctx.arc(landmark.x, landmark.y, 3, 0, 2 * Math.PI)
          ctx.fill()
        })
      }
    }
  }, [])

  // Auto-capture face when conditions are met
  const autoCaptureFace = useCallback(async (action: LivenessAction) => {
    if (!webcamRef.current || !action) return

    console.log(`📸 Auto-capturing face for action: ${action}`)
    setIsProcessing(true)
    setError(null)

    try {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        setFaceImages(prev => {
          const updated = [...prev, imageSrc]
          console.log(`✅ Captured image for action: ${action}`)
          console.log(`📸 Total images captured: ${updated.length}`)
          return updated
        })

        // Mark action as completed
        setCompletedActions(prev => {
          const updated = [...prev, action]
          console.log('✅ Action completed:', action)
          return updated
        })

        setIsProcessing(false)
        stopAutoDetection()
      }
    } catch (err) {
      console.error('Auto-capture error:', err)
      setError('Failed to capture image. Please try again.')
      setIsProcessing(false)
    }
  }, [stopAutoDetection])

  // Start auto-detection for current action
  const startAutoDetection = useCallback((action: LivenessAction) => {
    if (!faceModelsLoaded || !videoRef.current || detectionIntervalRef.current || !action) {
      return
    }

    setIsDetecting(true)
    setDetectionReady(false)
    setStabilityStartTime(null)
    setFaceDetection(null)

    let lastValidDetection: FaceDetectionResult | null = null
    let stableStart: number | null = null

    console.log(`🔍 Starting face detection for action: ${action}`)

    detectionIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return

      // Validate video is ready before detection
      const video = videoRef.current
      const videoWidth = video.videoWidth || video.clientWidth || 0
      const videoHeight = video.videoHeight || video.clientHeight || 0
      
      // Skip detection if video not ready
      if (videoWidth === 0 || videoHeight === 0 || video.readyState < 2) {
        return
      }

      try {
        const detection = await detectFaceInFrame(videoRef.current)
        setFaceDetection(detection)

        if (detection && detection.detected) {
          const validation = isFacePositionValid(detection, action)

          if (validation.valid) {
            // Check if detection is stable - relaxed threshold for easier capture
            const stabilityThreshold = isMobile ? 40 : 30 // Increased from 20 to allow more movement
            const isStable = lastValidDetection && 
              Math.abs((detection.faceBox?.x || 0) - (lastValidDetection.faceBox?.x || 0)) < stabilityThreshold &&
              Math.abs((detection.faceBox?.y || 0) - (lastValidDetection.faceBox?.y || 0)) < stabilityThreshold

            if (isStable && stableStart !== null) {
              const stableDuration = Date.now() - stableStart
              
              if (stableDuration >= STABILITY_DURATION) {
                // Face is stable and ready - capture automatically
                if (detectionIntervalRef.current) {
                  clearInterval(detectionIntervalRef.current)
                  detectionIntervalRef.current = null
                }
                
                setDetectionReady(true)
                drawFaceDetection(detection, canvasRef.current, videoRef.current, true)
                
                // Auto-capture
                await autoCaptureFace(action)
                return
              } else {
                setDetectionReady(false)
              }
            } else {
              stableStart = Date.now()
              lastValidDetection = detection
              setDetectionReady(false)
            }
          } else {
            stableStart = null
            lastValidDetection = null
            setDetectionReady(false)
          }

          drawFaceDetection(detection, canvasRef.current, videoRef.current, false)
        } else {
          setDetectionReady(false)
          drawFaceDetection(null, canvasRef.current, videoRef.current, false)
        }
      } catch (error) {
        console.error('Face detection error:', error)
      }
    }, 200) // Check every 200ms
  }, [faceModelsLoaded, STABILITY_DURATION, drawFaceDetection, autoCaptureFace])

  const startScan = async () => {
    setError(null)
    setSuccess(false)
    setFaceImages([])
    setFaceImage(null)
    
    if (cameraError) {
      const granted = await requestCameraPermission()
      if (!granted) {
        return
      }
    }
    
    setCameraError(null)
    setCompletedActions([])
    setCurrentAction(null)
    setModalOpen(true)
    
    // Start with first action after modal opens
    setTimeout(() => {
      setIsScanning(true)
      setCurrentAction(allActions[0])
    }, 300)
  }

  const closeFaceModal = () => {
    stopAutoDetection()
    setIsScanning(false)
    setCurrentAction(null)
    setModalOpen(false)
  }
  
  const handleCameraError = (error: string | DOMException | Error) => {
    console.error('❌ Camera error:', error)
    let errorMessage = 'Camera access denied or not available'
    
    if (typeof error === 'string') {
      errorMessage = error
    } else if (error instanceof Error || (typeof DOMException !== 'undefined' && (error as any) instanceof DOMException)) {
      errorMessage = error.message || 'Camera access error'
    }
    
    setCameraError(errorMessage)
    setError(errorMessage + '. Please grant camera permissions.')
  }


  // Unused - kept for potential future use
  /*
  const captureImageForAction = useCallback(() => {
    if (webcamRef.current && currentAction) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        // Store this image for the current action
        setFaceImages(prev => {
          const updated = [...prev, imageSrc]
          console.log(`📸 Captured image for action: ${currentAction}`)
          console.log(`📸 Total images captured: ${updated.length}`)
          return updated
        })
        // Keep camera view active between actions; do not set faceImage here
      }
    }
  }, [currentAction])

  // Unused - kept for potential future use
  /*
  const _simulateActionCompletion = useCallback(() => {
    if (currentAction && !completedActions.includes(currentAction)) {
      // Capture image before marking action as complete
      captureImageForAction()
      // Update completed actions - this will trigger useEffect to move to next action
      setCompletedActions(prev => {
        const updated = [...prev, currentAction]
        console.log('✅ Action completed:', currentAction)
        console.log('✅ Completed actions:', updated)
        console.log('✅ Remaining actions:', allActions.filter(a => !updated.includes(a)))
        return updated
      })
    }
  }, [currentAction, completedActions, captureImageForAction])
  */

  const performFinalVerification = useCallback(async () => {
    // Use the last captured image (or first if available) for verification
    const imageForVerification = faceImages.length > 0 ? faceImages[faceImages.length - 1] : faceImage
    
    if (!imageForVerification) {
      setError('No face images captured. Please try again.')
      setIsScanning(false)
      return
    }

    setIsProcessing(true)
    setError(null)
    setIsScanning(false) // Hide camera

    try {
      // Check if TRUE-ID integration is available and EID is provided
      const useTrueID = !API_CONFIG.features.simulationMode && eidImage
      
      if (useTrueID) {
        console.log('🔐 Using TRUE-ID API for verification')
        console.log('📤 Sending to TRUE-ID API...')
        console.log('   - Emirates ID Front: ✓')
        console.log('   - Emirates ID Back: ' + (eidBackImage ? '✓' : '✗'))
        console.log(`   - Person Photos: ${faceImages.length} images captured`)
        console.log('⏳ Waiting for TRUE-ID validation...')
        
        // Use TRUE-ID API for complete validation (using last image)
        const trueIdResult = await validateWithTrueID(
          eidImage!,
          imageForVerification,
          eidBackImage
        )
        
        console.log('📨 TRUE-ID Response received')
        
        if (!trueIdResult.success) {
          console.error('❌ Validation failed:', trueIdResult.error)
          throw new Error(trueIdResult.error || 'Identity verification failed')
        }
        
        console.log('✅ Validation successful!')
        console.log('   Status:', trueIdResult.data!.status)
        console.log('   Confidence:', trueIdResult.data!.confidence + '%')
        console.log('   Details:', trueIdResult.data!.details)
        
        const statusInfo = getTrueIDStatusMessage(trueIdResult.data!)
        
        if (trueIdResult.data!.status === 'Failed') {
          throw new Error(statusInfo.message)
        }
        
        if (trueIdResult.data!.status === 'Suspicious') {
          setError(`⚠️ ${statusInfo.message}`)
        }
        
        // Store TRUE-ID result
        setVerificationResult(trueIdResult.data)
        setLivenessResult({ 
          success: true, 
          isLive: true, 
          confidence: trueIdResult.data!.confidence 
        })
        
      } else {
        console.log('🧪 Using standard face recognition (simulation/fallback)')
        
        // Standard face recognition flow (simulation mode or fallback)
        const livenessCheck = await detectLiveness(imageForVerification)
        setLivenessResult(livenessCheck)
        
        if (!livenessCheck.success) {
          throw new Error(livenessCheck.error || 'Liveness detection failed')
        }
        
        if (!livenessCheck.isLive || livenessCheck.confidence < 70) {
          throw new Error('Liveness detection failed. Please ensure you are in a well-lit area and try again.')
        }
        
        // Verify face against Emirates ID (if provided)
        let verificationCheck = null
        if (eidImage) {
          verificationCheck = await verifyFace(imageForVerification, eidImage)
          setVerificationResult(verificationCheck)
          
          if (!verificationCheck.success) {
            throw new Error(verificationCheck.error || 'Face verification failed')
          }
          
          if (!verificationCheck.isMatch || verificationCheck.confidence < 80) {
            throw new Error(
              `Face does not match Emirates ID (${verificationCheck.confidence.toFixed(1)}% confidence). Please try again.`
            )
          }
        }
      }
      
      // Success!
      setIsProcessing(false)
      setSuccess(true)
      
      // Auto-advance to next step after showing thanks message
      setTimeout(() => {
        onComplete({
          faceImage: faceImages[0] || imageForVerification, // Keep first image for backward compatibility
          faceImages: faceImages.length > 0 ? faceImages : [imageForVerification], // Pass all images
          faceVerified: true,
        })
      }, 2000)
      
    } catch (err) {
      console.error('Face verification error:', err)
      setError(err instanceof Error ? err.message : 'Face verification failed. Please try again.')
      setIsProcessing(false)
    }
  }, [faceImages, faceImage, eidImage, eidBackImage, onComplete])

  // Get video element from webcam
  useEffect(() => {
    if (webcamRef.current && isScanning) {
      const video = webcamRef.current.video
      if (video) {
        videoRef.current = video
      }
    }
  }, [isScanning, webcamRef])

  // Start auto-detection when action changes
  useEffect(() => {
    if (isScanning && currentAction && videoRef.current && faceModelsLoaded && !completedActions.includes(currentAction)) {
      // Small delay to ensure video is ready
      setTimeout(() => {
        startAutoDetection(currentAction)
      }, 500)
    }

    return () => {
      stopAutoDetection()
    }
  }, [isScanning, currentAction, faceModelsLoaded, completedActions, startAutoDetection, stopAutoDetection])

  // Move to next action when current is completed
  useEffect(() => {
    if (isScanning && completedActions.length < allActions.length) {
      const nextAction = allActions.find(action => !completedActions.includes(action))
      if (nextAction && nextAction !== currentAction) {
        console.log('🔄 Moving to next action:', nextAction)
        setCurrentAction(nextAction)
      }
    } else if (completedActions.length === allActions.length && isScanning && !isProcessing) {
      // All actions completed, perform final verification
      console.log('✅ All actions completed, starting final verification')
      stopAutoDetection()
      performFinalVerification()
    }
  }, [isScanning, completedActions, isProcessing, performFinalVerification, currentAction, stopAutoDetection])

  const retake = () => {
    setFaceImage(null)
    setFaceImages([])
    setCompletedActions([])
    setCurrentAction(null)
    setSuccess(false)
    setError(null)
    setIsScanning(false)
  }

  const handleContinue = () => {
    if (faceImage && success) {
      onComplete({
        faceImage: faceImage,
        faceVerified: true,
      })
    } else {
      setError('Please complete the face scan verification')
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub-Header with Route Badge */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-gray-900 transition-colors min-h-[44px] px-2 sm:px-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex-1 flex justify-center min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-green-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-full">
                <span className="text-xs sm:text-sm font-semibold truncate">{routeDisplay}</span>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium hidden xs:block whitespace-nowrap">
              Step 6 of 6
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Verify Your Identity</h2>
        <h3 className="text-lg sm:text-xl text-gray-600">Face Scan</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">
          Position your face within the frame and follow the instructions
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg">
        <h4 className="text-sm sm:text-base font-semibold text-blue-800 mb-2">Instructions:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Position your face within the oval frame</li>
          <li>• Ensure good lighting on your face</li>
          <li>• Remove glasses or face coverings</li>
          <li>• Follow the on-screen prompts</li>
        </ul>
      </div>

      {/* Scanning Interface */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        {!isScanning && !faceImage ? (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
              <div className="text-center">
                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Use camera to scan your face</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={startScan}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base sm:text-lg py-3 sm:py-4 min-h-[48px]"
            >
            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="hidden xs:inline">Start Face Scan (Full Screen)</span>
            <span className="xs:hidden">Start Face Scan</span>
            </button>
          </div>
        ) : faceImage ? (
          <div className="space-y-4">
            <img
              src={faceImage}
              alt="Face Verification"
              className="w-full rounded-lg border-2 border-green-500"
            />
            <button
              type="button"
              onClick={retake}
              className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
            >
              <Camera className="w-4 h-4" />
              Retake Face Scan
            </button>
          </div>
        ) : null}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
              {cameraError && (
                <div className="mt-3 space-y-3">
                  <button
                    type="button"
                    onClick={requestCameraPermission}
                    className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] px-4 sm:px-6"
                  >
                    <Camera className="w-4 h-4" />
                    Request Camera Access Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="space-y-3">
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-green-700 font-semibold text-xl">
              Thanks!
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary flex items-center justify-center gap-2 min-h-[48px] w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          Back
        </button>
        
        {!success && (
          <button
            type="button"
            onClick={handleContinue}
            disabled={!faceImage || !success}
            className="btn-primary flex-1 min-h-[48px] flex items-center justify-center gap-2"
          >
            <span>Proceed to Booking Confirmation</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 hidden sm:inline" />
            <span className="sm:hidden">→</span>
          </button>
        )}
          </div>
        </div>
      </div>

      {/* Face Scan Modal */}
      <FaceScanModal
        isOpen={modalOpen}
        onClose={closeFaceModal}
        title="Face Scan - Full Screen View"
      >
        <div className="flex flex-col h-full max-h-[85vh]">
          {isScanning && currentAction && !completedActions.includes(currentAction) ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-2 sm:p-3 rounded">
                <p className="text-xs sm:text-sm text-blue-800 mb-2">
                  <strong>Action {completedActions.length + 1} of {allActions.length}:</strong> {livenessInstructions[currentAction]}
                </p>
                {faceDetection && !isFacePositionValid(faceDetection, currentAction).valid && (
                  <p className="text-xs text-blue-700 mt-1">
                    💡 {isFacePositionValid(faceDetection, currentAction).reason}
                  </p>
                )}
                {faceDetection?.angle && (
                  <p className="text-xs text-blue-600 mt-1">
                    Angle: Pitch {faceDetection.angle.pitch.toFixed(1)}° | Yaw {faceDetection.angle.yaw.toFixed(1)}° | Roll {faceDetection.angle.roll.toFixed(1)}°
                  </p>
                )}
              </div>

              {/* Camera View */}
              {!cameraError ? (
                <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={isMobile ? 0.85 : 0.95}
                    mirrored={true}
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      width: isMobile ? { ideal: 1280, max: 1920 } : { ideal: 1920 },
                      height: isMobile ? { ideal: 720, max: 1080 } : { ideal: 1080 },
                      facingMode: 'user',
                      aspectRatio: { ideal: 16/9 }
                    }}
                    onUserMedia={(_stream) => {
                      console.log('✅ Face camera loaded in modal')
                      setCameraError(null)
                      setError(null)
                      setTimeout(() => {
                        if (webcamRef.current?.video) {
                          videoRef.current = webcamRef.current.video
                        }
                      }, 500)
                    }}
                    onUserMediaError={(err) => {
                      console.error('❌ Face camera error in modal:', err)
                      handleCameraError(err)
                    }}
                    forceScreenshotSourceSize={true}
                  />
                  
                  {/* Face detection overlay canvas */}
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 10 }}
                  />
                  
                  {/* Face guide oval - centered */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60%] sm:w-[55%] md:w-[50%] aspect-[3/4] pointer-events-none">
                    <svg viewBox="0 0 200 250" className="w-full h-full">
                      <ellipse
                        cx="100"
                        cy="125"
                        rx="90"
                        ry="115"
                        fill="none"
                        stroke={detectionReady ? '#22c55e' : faceDetection?.detected ? '#eab308' : '#6b7280'}
                        strokeWidth="4"
                        strokeDasharray={detectionReady ? '0' : '10,5'}
                        className={detectionReady ? 'animate-pulse' : ''}
                      />
                    </svg>
                  </div>

                  {/* Detection status */}
                  {isDetecting && (
                    <div className="absolute top-2 sm:top-4 md:top-6 left-1/2 transform -translate-x-1/2 z-20 w-[90%] sm:w-auto max-w-md">
                      <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-lg text-white text-sm sm:text-base md:text-lg font-bold shadow-lg text-center ${
                        detectionReady 
                          ? 'bg-green-600 animate-pulse' 
                          : faceDetection?.detected 
                            ? 'bg-yellow-600' 
                            : 'bg-blue-600'
                      }`}>
                        {detectionReady 
                          ? '✓ Ready! Capturing...' 
                          : faceDetection?.detected 
                            ? (isFacePositionValid(faceDetection, currentAction).valid 
                                ? 'Hold steady...' 
                                : isFacePositionValid(faceDetection, currentAction).reason || 'Adjust your position')
                            : 'Position your face in the frame'}
                      </div>
                    </div>
                  )}

                  {/* Progress indicators */}
                  <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex gap-2 z-20">
                    {allActions.map((action) => (
                      <div
                        key={action}
                        className={`w-3 h-3 rounded-full ${
                          completedActions.includes(action)
                            ? 'bg-green-500'
                            : currentAction === action
                            ? 'bg-yellow-400 animate-pulse'
                            : 'bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-gray-100 rounded-lg p-8 text-center flex items-center justify-center min-h-[40vh]">
                  <div>
                    <Camera className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4 text-lg">Camera not available</p>
                    <button
                      type="button"
                      onClick={requestCameraPermission}
                      className="btn-primary"
                    >
                      Request Camera Access
                    </button>
                  </div>
                </div>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-semibold">Processing face image...</p>
                  <p className="text-sm text-gray-500 mt-2">Please wait</p>
                </div>
              )}

              {/* Cancel button only */}
              {!isProcessing && !cameraError && faceModelsLoaded && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={closeFaceModal}
                    className="btn-secondary w-full py-3 text-lg min-h-[48px]"
                  >
                    Cancel & Close
                  </button>
                </div>
              )}

              {/* Loading face models */}
              {!cameraError && !faceModelsLoaded && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-2" />
                  <p className="text-gray-600">Loading face detection...</p>
                </div>
              )}
            </div>
          ) : completedActions.length === allActions.length ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-green-600">All Actions Completed!</p>
              <p className="text-sm text-gray-600 mt-2">Verifying your identity...</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Ready to start face scan</p>
            </div>
          )}
        </div>
      </FaceScanModal>
    </div>
  )
}

