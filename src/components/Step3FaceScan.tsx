import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, XCircle, ArrowLeft, Eye } from 'lucide-react'
import { VerificationData } from '../types'
import { verifyFace, detectLiveness } from '../services/faceRecognitionService'
import { validateWithTrueID, getTrueIDStatusMessage } from '../services/trueIdService'
import { API_CONFIG } from '../config/api.config'

interface Step3Props {
  onComplete: (data: Partial<VerificationData>) => void
  onBack: () => void
  eidImage?: string // Emirates ID front image for face matching
  eidBackImage?: string // Emirates ID back image (optional)
}

type LivenessAction = 'blink' | 'smile' | 'turn-left' | 'turn-right' | null

const livenessInstructions: Record<Exclude<LivenessAction, null>, string> = {
  blink: 'Please blink your eyes',
  smile: 'Please smile',
  'turn-left': 'Turn your head slightly to the left',
  'turn-right': 'Turn your head slightly to the right',
}

export default function Step3FaceScan({ onComplete, onBack, eidImage, eidBackImage }: Step3Props) {
  const webcamRef = useRef<Webcam>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [faceImage, setFaceImage] = useState<string | null>(null) // Last captured image for display
  const [faceImages, setFaceImages] = useState<string[]>([]) // Store all 3 images
  const [currentAction, setCurrentAction] = useState<LivenessAction>(null)
  const [completedActions, setCompletedActions] = useState<LivenessAction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [livenessResult, setLivenessResult] = useState<any>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const allActions: Exclude<LivenessAction, null>[] = ['blink', 'smile', 'turn-left']

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

  const startScan = async () => {
    setError(null)
    setSuccess(false)
    setFaceImages([]) // Reset images array
    setFaceImage(null) // Reset display image
    
    // If there was a previous camera error, try requesting permission again
    if (cameraError) {
      const granted = await requestCameraPermission()
      if (!granted) {
        return // Permission still denied, keep showing error
      }
    }
    
    setCameraError(null)
    setCompletedActions([])
    setCurrentAction(null)
    // Start with first action after state reset
    setTimeout(() => {
      setIsScanning(true)
      setCurrentAction(allActions[0]) // Set first action immediately
    }, 0)
  }
  
  const handleCameraError = (error: string | DOMException | Error) => {
    console.error('❌ Camera error:', error)
    let errorMessage = 'Camera access denied or not available'
    
    if (typeof error === 'string') {
      errorMessage = error
    } else if (error instanceof Error || error instanceof DOMException) {
      errorMessage = error.message || 'Camera access error'
    }
    
    setCameraError(errorMessage)
    setError(errorMessage + '. Please grant camera permissions.')
  }


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

  const simulateActionCompletion = useCallback(() => {
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
          livenessData: livenessResult,
          faceMatchData: verificationResult,
        })
      }, 2000)
      
    } catch (err) {
      console.error('Face verification error:', err)
      setError(err instanceof Error ? err.message : 'Face verification failed. Please try again.')
      setIsProcessing(false)
    }
  }, [faceImages, faceImage, eidImage, eidBackImage, onComplete])

  useEffect(() => {
    if (isScanning && completedActions.length < allActions.length) {
      // Get next action that hasn't been completed yet
      const nextAction = allActions.find(action => !completedActions.includes(action))
      if (nextAction && nextAction !== currentAction) {
        console.log('🔄 Moving to next action:', nextAction)
        setCurrentAction(nextAction)
      } else if (!nextAction) {
        console.log('⚠️ No next action found, but not all completed')
      }
    } else if (completedActions.length === allActions.length && isScanning && !isProcessing) {
      // All actions completed, perform final verification with all captured images
      console.log('✅ All actions completed, starting final verification')
      performFinalVerification()
    }
  }, [isScanning, completedActions, isProcessing, performFinalVerification, currentAction])

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
        livenessData: livenessResult,
        faceMatchData: verificationResult,
      })
    } else {
      setError('Please complete the face scan verification')
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Verify Your Identity</h2>
        <h3 className="text-xl text-gray-600">Face Scan</h3>
        <p className="text-sm text-gray-500 mt-2">
          Position your face within the frame and follow the instructions
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Instructions:</h4>
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
              className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4"
            >
              <Camera className="w-5 h-5" />
              Start Face Scan
            </button>
          </div>
        ) : isScanning && !faceImage ? (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                mirrored={true}
                className="w-full h-full object-cover"
                videoConstraints={{
                  facingMode: 'user'
                }}
                onUserMedia={() => {
                  console.log('✅ Face camera loaded')
                  setCameraError(null)
                }}
                onUserMediaError={(err) => handleCameraError(err)}
              />
              
              {/* Face oval overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-80">
                  <svg viewBox="0 0 200 250" className="w-full h-full">
                    <ellipse
                      cx="100"
                      cy="125"
                      rx="90"
                      ry="115"
                      fill="none"
                      stroke={completedActions.length === allActions.length ? '#22c55e' : '#10b981'}
                      strokeWidth="4"
                      strokeDasharray={completedActions.length === allActions.length ? '0' : '10,5'}
                      className="animate-pulse"
                    />
                  </svg>
                </div>
              </div>

              {/* Current action prompt */}
              {currentAction && (
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <div className="bg-black bg-opacity-70 text-white px-6 py-3 rounded-full inline-block">
                    <p className="text-lg font-semibold">{livenessInstructions[currentAction]}</p>
                  </div>
                </div>
              )}

              {/* Progress indicators */}
              <div className="absolute top-4 right-4 flex gap-2">
                {allActions.map((action, index) => (
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

            {isProcessing ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-2" />
                {API_CONFIG.features.simulationMode ? (
                  <>
                    <p className="text-gray-600">Analyzing facial biometrics...</p>
                    <p className="text-xs text-gray-500 mt-2">This may take a few moments...</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 font-semibold">Verifying with TRUE-ID API...</p>
                    <p className="text-sm text-gray-500 mt-2">Validating Emirates ID and face match</p>
                    <p className="text-xs text-gray-400 mt-1">Please wait while we verify your identity</p>
                  </>
                )}
              </div>
            ) : currentAction ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Action {completedActions.length + 1} of {allActions.length}
                </p>
                <button
                  type="button"
                  onClick={simulateActionCompletion}
                  className="btn-primary"
                >
                  I've Completed This Action
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  (In production, this will be detected automatically)
                </p>
              </div>
            ) : null}
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
              className="btn-secondary flex items-center justify-center gap-2 w-full"
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
                    className="btn-primary flex items-center gap-2 text-sm"
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
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        {!success && (
          <button
            type="button"
            onClick={handleContinue}
            disabled={!faceImage || !success}
            className="btn-primary flex-1"
          >
            Review Terms & Submit →
          </button>
        )}
      </div>
    </div>
  )
}

