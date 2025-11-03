import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, XCircle, RotateCcw, ArrowLeft } from 'lucide-react'
import { VerificationData } from '../types'
import { processEmiratesID, validateEmiratesIDFormat, isEmiratesIDExpired } from '../services/ocrService'
import { API_CONFIG } from '../config/api.config'

interface Step2Props {
  onComplete: (data: Partial<VerificationData>) => void
  onBack: () => void
}

type ScanSide = 'front' | 'back' | null

export default function Step2EmiratesIDScan({ onComplete, onBack }: Step2Props) {
  const webcamRef = useRef<Webcam>(null)
  const [currentSide, setCurrentSide] = useState<ScanSide>(null)
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [backImage, setBackImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eidData, setEidData] = useState<any>(null)
  const [processingMessage, setProcessingMessage] = useState<string>('Processing Emirates ID data...')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showFileUpload, setShowFileUpload] = useState(false)

  const requestCameraPermission = async () => {
    try {
      // Request camera permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      // Stop the stream immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop())
      
      // Clear errors and show success
      setCameraError(null)
      setShowFileUpload(false)
      console.log('✅ Camera permission granted!')
      
      return true
    } catch (err) {
      console.error('❌ Camera permission denied:', err)
      handleCameraError(err as Error)
      return false
    }
  }

  const startScan = async (side: 'front' | 'back') => {
    setError(null)
    
    // If there was a previous camera error, try requesting permission again
    if (cameraError) {
      const granted = await requestCameraPermission()
      if (!granted) {
        return // Permission still denied, keep showing error and upload option
      }
    }
    
    setCameraError(null)
    setCurrentSide(side)
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
    
    // Show file upload option as fallback
    setShowFileUpload(true)
  }
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
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
        const useTrueID = !API_CONFIG.features.simulationMode
        
        if (useTrueID) {
          await new Promise(resolve => setTimeout(resolve, 500))
          if (side === 'front') {
            setFrontImage(imageBase64)
            setEidData({ captured: true, mode: 'TRUE-ID' })
          } else {
            setBackImage(imageBase64)
          }
        } else {
          const result = await processEmiratesID(imageBase64, side)
          if (!result.success) {
            throw new Error(result.error || 'Failed to process Emirates ID')
          }
          if (side === 'front' && result.data) {
            setEidData(result.data)
          }
          if (side === 'front') {
            setFrontImage(imageBase64)
          } else {
            setBackImage(imageBase64)
          }
        }
        
        setIsProcessing(false)
        setCurrentSide(null)
      } catch (err) {
        console.error('File processing error:', err)
        setError(err instanceof Error ? err.message : 'Failed to process image')
        setIsProcessing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const captureImage = useCallback(async () => {
    console.log('📸 Capture button clicked, currentSide:', currentSide)
    if (webcamRef.current) {
      // Small delay to ensure camera is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const imageSrc = webcamRef.current.getScreenshot()
      console.log('📷 Screenshot captured:', imageSrc ? 'success' : 'failed')
      
      if (!imageSrc) {
        setError('Failed to capture image. Please ensure camera permissions are granted and try again.')
        return
      }
      
      if (imageSrc) {
        console.log('🔄 Setting processing state...')
        setIsProcessing(true)
        setError(null)
        setProcessingMessage('Analyzing Emirates ID...')

        try {
          // Check if we're using TRUE-ID (skip OCR processing in Step 2)
          const useTrueID = !API_CONFIG.features.simulationMode
          
          if (useTrueID) {
            console.log('🔐 TRUE-ID Mode: Capturing image only (validation in Step 3)')
            
            // TRUE-ID mode: Just capture and store the image
            // Full validation happens in Step 3 with face photo
            await new Promise(resolve => setTimeout(resolve, 500)) // Small delay for UX
            
            if (currentSide === 'front') {
              setFrontImage(imageSrc)
              setEidData({ captured: true, mode: 'TRUE-ID' })
            } else if (currentSide === 'back') {
              setBackImage(imageSrc)
            }
            
            setIsProcessing(false)
            setCurrentSide(null)
            
          } else {
            console.log('🚀 Simulation Mode: Processing with OCR...')
            
            // Simulation mode: Process Emirates ID with OCR
            const result = await processEmiratesID(imageSrc, currentSide!)
            console.log('📊 OCR Result:', result)
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to process Emirates ID')
            }
            
            // Validate ID data if processing front side
            if (currentSide === 'front' && result.data) {
              setProcessingMessage('Validating ID information...')
              
              // Validate ID format
              if (result.data.idNumber && !validateEmiratesIDFormat(result.data.idNumber)) {
                setError('Invalid Emirates ID format detected. Please ensure the ID is clear and properly aligned.')
                setIsProcessing(false)
                return
              }
              
              // Check expiry
              if (result.data.expiryDate && isEmiratesIDExpired(result.data.expiryDate)) {
                setError('This Emirates ID has expired. Please use a valid ID.')
                setIsProcessing(false)
                return
              }
              
              // Store extracted data
              setEidData(result.data)
            }
            
            // Success - store image
            if (currentSide === 'front') {
              setFrontImage(imageSrc)
            } else if (currentSide === 'back') {
              setBackImage(imageSrc)
            }
            
            setIsProcessing(false)
            setCurrentSide(null)
          }
          
        } catch (err) {
          console.error('Emirates ID processing error:', err)
          setError(err instanceof Error ? err.message : 'Failed to process Emirates ID. Please try again.')
          setIsProcessing(false)
        }
      }
    }
  }, [currentSide])

  const retake = (side: 'front' | 'back') => {
    if (side === 'front') {
      setFrontImage(null)
      setEidData(null)
    } else {
      setBackImage(null)
    }
    setError(null)
  }

  const handleContinue = () => {
    if (frontImage && backImage) {
      onComplete({
        eidFrontImage: frontImage,
        eidBackImage: backImage,
        eidVerified: true,
      })
    } else {
      setError('Please scan both front and back of your Emirates ID')
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Verify Your Identity</h2>
        <h3 className="text-xl text-gray-600">Emirates ID Scan</h3>
        <p className="text-sm text-gray-500 mt-2">
          Please scan both sides of your UAE Emirates ID for verification
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Instructions:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Ensure good lighting with no glare</li>
          <li>• Hold your Emirates ID within the frame</li>
          <li>• Keep the ID flat and all text readable</li>
          <li>• Avoid shadows and reflections</li>
        </ul>
        {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
          <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
            ⚠️ Camera requires HTTPS or localhost. If camera doesn't work, you can upload images instead.
          </div>
        )}
      </div>
      
      {/* Camera Error Notice */}
      {cameraError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-semibold">Camera Access Error</p>
              <p className="text-sm text-red-600 mt-1">{String(cameraError)}</p>
              <div className="mt-3 text-sm text-red-700">
                <p className="font-semibold mb-1">Possible solutions:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Grant camera permissions in your browser</li>
                  <li>Use Chrome, Edge, or Firefox browser</li>
                  <li>Access via HTTPS or localhost</li>
                  <li>Or upload images using the file upload option below</li>
                </ul>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={requestCameraPermission}
                  className="btn-primary flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Request Camera Access Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanning Interface */}
      <div className="space-y-6">
        {/* Front Side */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Front of Emirates ID</h4>
            {frontImage && (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
          </div>

          {currentSide === 'front' ? (
            <div className="space-y-4">
              {!cameraError ? (
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.92}
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      width: 1920,
                      height: 1080,
                      facingMode: 'environment'
                    }}
                    onUserMedia={() => {
                      console.log('✅ Front camera loaded')
                      setCameraError(null)
                    }}
                    onUserMediaError={(err) => handleCameraError(err)}
                  />
                  <div className="absolute inset-0 border-4 border-dashed border-green-400 m-8 rounded-lg pointer-events-none" />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Camera not available</p>
                  <p className="text-sm text-gray-500">Upload your Emirates ID image instead</p>
                </div>
              )}

              {/* File Upload Option (shown when camera fails) */}
              {cameraError && !isProcessing && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block cursor-pointer">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">📁 Upload Emirates ID Front</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'front')}
                        className="hidden"
                      />
                      <span className="btn-secondary inline-block">Choose File</span>
                    </div>
                  </label>
                </div>
              )}

              {isProcessing ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-2" />
                  <p className="text-gray-600">Processing Emirates ID data...</p>
                </div>
              ) : !cameraError ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={captureImage}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Front
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSide(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          ) : frontImage ? (
            <div className="space-y-4">
              <img
                src={frontImage}
                alt="Emirates ID Front"
                className="w-full rounded-lg border-2 border-green-500"
              />
              <button
                type="button"
                onClick={() => retake('front')}
                className="btn-secondary flex items-center justify-center gap-2 w-full"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Front
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => startScan('front')}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Scan Front of ID
              </button>
              {cameraError && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block cursor-pointer">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Or upload image</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'front')}
                        className="hidden"
                      />
                      <span className="btn-secondary inline-block">📁 Choose File</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back Side */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Back of Emirates ID</h4>
            {backImage && (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
          </div>

          {currentSide === 'back' ? (
            <div className="space-y-4">
              {!cameraError ? (
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.92}
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      width: 1920,
                      height: 1080,
                      facingMode: 'environment'
                    }}
                    onUserMedia={() => {
                      console.log('✅ Back camera loaded')
                      setCameraError(null)
                    }}
                    onUserMediaError={(err) => handleCameraError(err)}
                  />
                  <div className="absolute inset-0 border-4 border-dashed border-green-400 m-8 rounded-lg pointer-events-none" />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Camera not available</p>
                  <p className="text-sm text-gray-500">Upload your Emirates ID image instead</p>
                </div>
              )}

              {/* File Upload Option (shown when camera fails) */}
              {cameraError && !isProcessing && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block cursor-pointer">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">📁 Upload Emirates ID Back</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'back')}
                        className="hidden"
                      />
                      <span className="btn-secondary inline-block">Choose File</span>
                    </div>
                  </label>
                </div>
              )}

              {isProcessing ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-2" />
                  <p className="text-gray-600">Processing Emirates ID data...</p>
                </div>
              ) : !cameraError ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={captureImage}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSide(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          ) : backImage ? (
            <div className="space-y-4">
              <img
                src={backImage}
                alt="Emirates ID Back"
                className="w-full rounded-lg border-2 border-green-500"
              />
              <button
                type="button"
                onClick={() => retake('back')}
                className="btn-secondary flex items-center justify-center gap-2 w-full"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Back
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => startScan('back')}
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={!frontImage}
              >
                <Camera className="w-5 h-5" />
                Scan Back of ID
              </button>
              {(cameraError || showFileUpload) && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block cursor-pointer">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Or upload image</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'back')}
                        className="hidden"
                        disabled={!frontImage}
                      />
                      <span className={`btn-secondary inline-block ${!frontImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        📁 Choose File
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Success details intentionally hidden per requirement */}

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
          disabled={!frontImage || !backImage}
          className="btn-primary flex-1"
        >
          Proceed to Face Scan →
        </button>
      </div>
    </div>
  )
}

