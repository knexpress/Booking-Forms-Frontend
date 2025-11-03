import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, XCircle, ArrowLeft, Eye, Shield } from 'lucide-react'
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
  const [faceImage, setFaceImage] = useState<string | null>(null)
  const [currentAction, setCurrentAction] = useState<LivenessAction>(null)
  const [completedActions, setCompletedActions] = useState<LivenessAction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [livenessResult, setLivenessResult] = useState<any>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const allActions: Exclude<LivenessAction, null>[] = ['blink', 'smile', 'turn-left']

  useEffect(() => {
    if (isScanning && completedActions.length < allActions.length) {
      // Get next action
      const nextAction = allActions.find(action => !completedActions.includes(action))
      if (nextAction) {
        setCurrentAction(nextAction)
      }
    } else if (completedActions.length === allActions.length && isScanning) {
      // All actions completed, capture final image
      captureImage()
    }
  }, [isScanning, completedActions])

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
    
    // If there was a previous camera error, try requesting permission again
    if (cameraError) {
      const granted = await requestCameraPermission()
      if (!granted) {
        return // Permission still denied, keep showing error
      }
    }
    
    setCameraError(null)
    setIsScanning(true)
    setCompletedActions([])
    setCurrentAction(null)
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
    setError(errorMessage + '. Please grant camera permissions or upload a photo instead.')
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Convert file to base64
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageBase64 = e.target?.result as string
      
      setIsProcessing(true)
      setError(null)
      setCameraError(null)
      
      try {
        // Check if TRUE-ID integration is available and EID is provided
        const useTrueID = !API_CONFIG.features.simulationMode && eidImage
        
        if (useTrueID) {
          console.log('🔐 Using TRUE-ID API for verification')
          console.log('📤 Sending to TRUE-ID API...')
          console.log('   - Emirates ID Front: ✓')
          console.log('   - Emirates ID Back: ' + (eidBackImage ? '✓' : '✗'))
          console.log('   - Person Photo: ✓')
          console.log('⏳ Waiting for TRUE-ID validation...')
          
          const trueIdResult = await validateWithTrueID(
            eidImage!,
            imageBase64,
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
          
          setVerificationResult(trueIdResult.data)
          setLivenessResult({ 
            success: true, 
            isLive: true, 
            confidence: trueIdResult.data!.confidence 
          })
          
        } else {
          // Simulation mode fallback
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          const livenessCheck = await detectLiveness(imageBase64)
          if (!livenessCheck.success || !livenessCheck.isLive) {
            throw new Error('Liveness detection failed. Please use a live photo.')
          }
          
          setLivenessResult(livenessCheck)
          
          if (eidImage) {
            const faceMatch = await verifyFace(imageBase64, eidImage)
            if (!faceMatch.success) {
              throw new Error(faceMatch.error || 'Face verification failed')
            }
            setVerificationResult(faceMatch)
          }
        }
        
        setFaceImage(imageBase64)
        setSuccess(true)
        setIsProcessing(false)
        
      } catch (err) {
        console.error('Face verification error:', err)
        setError(err instanceof Error ? err.message : 'Failed to verify face')
        setIsProcessing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const simulateActionCompletion = useCallback(() => {
    if (currentAction && !completedActions.includes(currentAction)) {
      setCompletedActions(prev => [...prev, currentAction])
    }
  }, [currentAction, completedActions])

  const captureImage = useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        setIsProcessing(true)
        setError(null)

        try {
          // Check if TRUE-ID integration is available and EID is provided
          const useTrueID = !API_CONFIG.features.simulationMode && eidImage
          
          if (useTrueID) {
            console.log('🔐 Using TRUE-ID API for verification')
            console.log('📤 Sending to TRUE-ID API...')
            console.log('   - Emirates ID Front: ✓')
            console.log('   - Emirates ID Back: ' + (eidBackImage ? '✓' : '✗'))
            console.log('   - Person Photo: ✓')
            console.log('⏳ Waiting for TRUE-ID validation...')
            
            // Show progress message
            setIsScanning(false) // Hide camera
            
            // Use TRUE-ID API for complete validation
            const trueIdResult = await validateWithTrueID(
              eidImage!,
              imageSrc,
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
            const livenessCheck = await detectLiveness(imageSrc)
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
              verificationCheck = await verifyFace(imageSrc, eidImage)
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
          setFaceImage(imageSrc)
          setIsProcessing(false)
          setIsScanning(false)
          setSuccess(true)
          
        } catch (err) {
          console.error('Face verification error:', err)
          setError(err instanceof Error ? err.message : 'Face verification failed. Please try again.')
          setIsProcessing(false)
          setIsScanning(false)
        }
      }
    }
  }, [eidImage, eidBackImage])

  const retake = () => {
    setFaceImage(null)
    setCompletedActions([])
    setCurrentAction(null)
    setSuccess(false)
    setError(null)
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
                <p className="text-gray-600">Use camera or upload a photo</p>
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

            {/* File Upload Option */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <label className="block cursor-pointer">
                <div className="text-center">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-2">📁 Upload Your Photo</p>
                  <p className="text-xs text-gray-500 mb-4">JPG, PNG, or WEBP (max 10MB)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="btn-secondary inline-block">Choose File</span>
                </div>
              </label>
            </div>
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
                  
                  <div className="text-center text-sm text-gray-600">or</div>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <label className="block cursor-pointer">
                      <div className="text-center">
                        <p className="text-sm text-gray-700 mb-2">📁 Upload Photo Instead</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <span className="btn-secondary inline-block text-sm">Choose File</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="space-y-3">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-700 font-semibold">
                {API_CONFIG.features.simulationMode 
                  ? 'Face verified successfully!' 
                  : 'Identity Verified by TRUE-ID!'}
              </p>
              {livenessResult && (
                <div className="mt-2 text-sm text-green-600 space-y-1">
                  {API_CONFIG.features.simulationMode ? (
                    <>
                      <p className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Liveness: {livenessResult.confidence?.toFixed(1)}% confidence
                      </p>
                      {verificationResult && (
                        <p>Face Match: {verificationResult.confidence?.toFixed(1)}% confidence</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">
                        Status: {verificationResult?.status || 'Verified'}
                      </p>
                      <p>
                        Confidence: {verificationResult?.confidence?.toFixed(1)}%
                      </p>
                      {verificationResult?.details && (
                        <p className="text-xs mt-1">{verificationResult.details}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg text-sm text-blue-700">
            <p className="font-semibold mb-1">Verification Complete</p>
            {API_CONFIG.features.simulationMode ? (
              <>
                <p>✓ Real person detected (liveness check passed)</p>
                {verificationResult && <p>✓ Face matches Emirates ID photo</p>}
                <p>✓ All security checks passed</p>
              </>
            ) : (
              <>
                <p>✓ Emirates ID validated by TRUE-ID</p>
                <p>✓ Face matches ID photo</p>
                <p>✓ Identity verification successful</p>
                <p className="text-xs mt-2 text-blue-600">
                  Verified at: {verificationResult?.timestamp ? new Date(verificationResult.timestamp).toLocaleTimeString() : 'Now'}
                </p>
              </>
            )}
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
        
        <button
          type="button"
          onClick={handleContinue}
          disabled={!faceImage || !success}
          className="btn-primary flex-1"
        >
          Review Terms & Submit →
        </button>
      </div>
    </div>
  )
}

