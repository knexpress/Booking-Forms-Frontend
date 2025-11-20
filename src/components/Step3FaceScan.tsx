import { useState, useRef, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { VerificationData } from '../types'
import { verifyFace, detectLiveness } from '../services/faceRecognitionService'
import { validateWithTrueID, getTrueIDStatusMessage } from '../services/trueIdService'
import { API_CONFIG } from '../config/api.config'

interface Step3Props {
  onComplete: (data: Partial<VerificationData>) => void
  onBack: () => void
  eidImage?: string // Emirates ID front image for face matching
  eidBackImage?: string // Emirates ID back image (optional)
  service?: string | null
}

export default function Step3FaceScan({ onComplete, onBack, eidImage, eidBackImage, service }: Step3Props) {
  // Determine route
  const route = (service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'
  const webcamRef = useRef<Webcam>(null)
  const [showExample, setShowExample] = useState(true)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [faceImage, setFaceImage] = useState<string | null>(null)
  const [faceImages, setFaceImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [_verificationResult, setVerificationResult] = useState<any>(null)
  const [_livenessResult, setLivenessResult] = useState<any>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  // Detect if device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      })
      stream.getTracks().forEach(track => track.stop())
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

  // Handle clicking the example image
  const handleExampleClick = async () => {
    setError(null)
    setShowExample(false)
    setIsScanning(true)
    
    // Request camera permission if needed
    if (cameraError) {
      const granted = await requestCameraPermission()
      if (!granted) {
        setShowExample(true)
        setIsScanning(false)
        return
      }
    }
    
    // Start countdown
    setCountdown(8)
  }

  // Capture image
  const captureImage = () => {
    if (!webcamRef.current) {
      setError('Camera not ready. Please try again.')
      setShowExample(true)
      setIsScanning(false)
      setCountdown(null)
      return
    }

    try {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        setFaceImage(imageSrc)
        setFaceImages([imageSrc])
        setIsScanning(false)
        setCountdown(null)
        console.log('✅ Face image captured')
        // Auto-verify and proceed
        performFinalVerification(imageSrc)
      } else {
        setError('Failed to capture image. Please try again.')
        setShowExample(true)
        setIsScanning(false)
        setCountdown(null)
      }
    } catch (err) {
      console.error('Capture error:', err)
      setError('Failed to capture image. Please try again.')
      setShowExample(true)
      setIsScanning(false)
      setCountdown(null)
    }
  }

  // Countdown effect
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      // Countdown finished, capture image
      captureImage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown])

  const performFinalVerification = async (imageForVerification: string) => {
    if (!imageForVerification) {
      setError('No face images captured. Please try again.')
      return
    }

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
        
        setVerificationResult(trueIdResult.data)
        setLivenessResult({ 
          success: true, 
          isLive: true, 
          confidence: trueIdResult.data!.confidence 
        })
        
      } else {
        console.log('🧪 Using standard face recognition (simulation/fallback)')
        
        const livenessCheck = await detectLiveness(imageForVerification)
        setLivenessResult(livenessCheck)
        
        if (!livenessCheck.success) {
          throw new Error(livenessCheck.error || 'Liveness detection failed')
        }
        
        if (!livenessCheck.isLive || livenessCheck.confidence < 70) {
          throw new Error('Liveness detection failed. Please ensure you are in a well-lit area and try again.')
        }
        
        // Verify face against Emirates ID (if provided)
        if (eidImage) {
          const verificationCheck = await verifyFace(imageForVerification, eidImage)
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
          faceImage: imageForVerification,
          faceImages: [imageForVerification],
          faceVerified: true,
        })
      }, 2000)
      
    } catch (err) {
      console.error('Face verification error:', err)
      setError(err instanceof Error ? err.message : 'Face verification failed. Please try again.')
      setIsProcessing(false)
    }
  }

  const retake = () => {
    setFaceImage(null)
    setFaceImages([])
    setSuccess(false)
    setError(null)
    setIsScanning(false)
    setShowExample(true)
    setCountdown(null)
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
        {showExample && !isScanning && !faceImage ? (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-gray-700 font-semibold text-lg mb-2">Click the image below to start</p>
              <p className="text-gray-500 text-sm">Hold your hand as shown in the example</p>
            </div>
            <div 
              className="bg-gray-100 rounded-lg cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
              onClick={handleExampleClick}
            >
              <img
                src="/image.png"
                alt="Example - Hold your hand"
                className="w-full h-auto"
              />
            </div>
            <p className="text-center text-sm text-gray-500">Click the image above to start face capture</p>
          </div>
        ) : isScanning && countdown !== null ? (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg aspect-video overflow-hidden">
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
                onUserMedia={() => {
                  console.log('✅ Camera loaded')
                  setCameraError(null)
                  setError(null)
                }}
                onUserMediaError={(err) => {
                  console.error('❌ Camera error:', err)
                  handleCameraError(err)
                  setShowExample(true)
                  setIsScanning(false)
                  setCountdown(null)
                }}
                forceScreenshotSourceSize={true}
              />
              {/* Countdown overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center">
                  <div className="text-white text-8xl sm:text-9xl font-bold mb-4 animate-pulse">
                    {countdown}
                  </div>
                  <p className="text-white text-lg sm:text-xl">Get ready...</p>
                </div>
              </div>
            </div>
          </div>
        ) : faceImage ? (
          <div className="space-y-4">
            <img
              src={faceImage}
              alt="Face Verification"
              className="w-full rounded-lg border-2 border-green-500"
            />
            {isProcessing && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold">Processing face image...</p>
                <p className="text-sm text-gray-500 mt-1">Please wait</p>
              </div>
            )}
            {!success && !isProcessing && (
              <button
                type="button"
                onClick={retake}
                className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
              >
                <Camera className="w-4 h-4" />
                Retake Face Scan
              </button>
            )}
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
      </div>
        </div>
      </div>
    </div>
  )
}

