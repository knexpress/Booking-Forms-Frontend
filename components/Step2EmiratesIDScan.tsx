import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, XCircle, RotateCcw, ArrowLeft, Maximize2 } from 'lucide-react'
import { VerificationData } from '../types'
import { processEmiratesID, validateEmiratesIDFormat, isEmiratesIDExpired } from '../services/ocrService'
import { validateIsEmiratesID } from '../services/idValidationService'
import { API_CONFIG } from '../config/api.config'
import {
  loadOpenCV,
  detectDocumentInFrame,
  cropDocument,
  imageToMat,
  matToBase64,
} from '../services/opencvService'
import IDScanModal from './IDScanModal'

interface Step2Props {
  onComplete: (data: Partial<VerificationData>) => void
  onBack: () => void
  service?: string | null
}

type ScanSide = 'front' | 'back' | null

export default function Step2EmiratesIDScan({ onComplete, onBack, service }: Step2Props) {
  // Determine route
  const route = (service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  
  const [currentSide, setCurrentSide] = useState<ScanSide>(null)
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [backImage, setBackImage] = useState<string | null>(null)
  const [philippinesIdFrontImage, setPhilippinesIdFrontImage] = useState<string | null>(null)
  const [philippinesIdBackImage, setPhilippinesIdBackImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eidData, setEidData] = useState<any>(null)
  const [processingMessage, setProcessingMessage] = useState<string>('Processing Emirates ID data...')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showFileUpload, setShowFileUpload] = useState(false)
  
  // Auto-detection state
  const [opencvLoaded, setOpencvLoaded] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionReady, setDetectionReady] = useState(false)
  const [detectedPoints, setDetectedPoints] = useState<any[] | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSide, setModalSide] = useState<ScanSide>(null)
  
  // Detect if device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
  
  // Ref to track if capture has been triggered (persists across renders)
  const captureTriggeredRef = useRef(false)
  
  // Close modal function
  const closeScanModal = () => {
    stopAutoDetection()
    setCurrentSide(null)
    setModalSide(null)
    setModalOpen(false)
    // Don't clear cameraError here - let it persist so user knows if there was an issue
  }

  // Load OpenCV on mount
  useEffect(() => {
    loadOpenCV()
      .then(() => {
        setOpencvLoaded(true)
        console.log('✅ OpenCV loaded')
      })
      .catch((err) => {
        console.error('❌ Failed to load OpenCV:', err)
      })

    return () => {
      // Cleanup detection intervals
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [])

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

  // Draw detected rectangle on canvas
  const drawDetection = useCallback((points: any[] | null, canvas: HTMLCanvasElement | null, video: HTMLVideoElement | null, isReady: boolean = false) => {
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

    if (points && points.length >= 4) {
      // Draw detected rectangle
      ctx.strokeStyle = isReady ? '#10b981' : '#eab308' // green or yellow
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.closePath()
      ctx.stroke()

      // Draw corner markers
      points.forEach((point) => {
        ctx.fillStyle = isReady ? '#10b981' : '#eab308'
        ctx.beginPath()
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI)
        ctx.fill()
      })
    }
  }, [])

  // Stop automatic detection
  const stopAutoDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    setIsDetecting(false)
    setDetectionReady(false)
    setDetectedPoints(null)
    captureTriggeredRef.current = false
  }, [])

  // Auto-capture document when conditions are met
  const autoCaptureDocument = useCallback(async (capturePoints: any[], captureSide: ScanSide) => {
    console.log('🚀 ===== AUTO-CAPTURE STARTED =====')
    
    const video = videoRef.current
    
    if (!video || !opencvLoaded) {
      console.error('❌ Video or OpenCV not available')
      setError('Camera or processing library not ready')
      setIsProcessing(false)
      return
    }
    
    if (!capturePoints || capturePoints.length < 4) {
      console.error('❌ Invalid capture points')
      setError('Document not detected properly')
      setIsProcessing(false)
      return
    }
    
    if (!captureSide || (captureSide !== 'front' && captureSide !== 'back')) {
      console.error('❌ Invalid capture side')
      setError('Invalid scan side')
      setIsProcessing(false)
      return
    }

    // Stop detection immediately
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    setIsDetecting(false)
    setIsProcessing(true)
    setError(null)
    setProcessingMessage('Processing document...')

    try {
      // Get video frame and crop document
      const videoMat = await imageToMat(video)
      if (!videoMat) {
        throw new Error('Failed to capture video frame')
      }

      // Crop the document
      const croppedMat = cropDocument(videoMat, capturePoints, 800, 500)
      if (!croppedMat) {
        videoMat.delete()
        throw new Error('Failed to crop document')
      }

      // Convert to base64
      const croppedBase64 = matToBase64(croppedMat, 'image/jpeg')
      
      // Cleanup
      videoMat.delete()
      croppedMat.delete()

      if (!croppedBase64) {
        throw new Error('Failed to convert image')
      }

      // Validate Emirates ID
      setProcessingMessage('Validating Emirates ID card...')
      const validationResult = await validateIsEmiratesID(croppedBase64, captureSide)
      
      if (!validationResult.isValid || !validationResult.isEmiratesID) {
        throw new Error(
          validationResult.error || 
          `This does not appear to be an Emirates ID card. Please ensure you are scanning the ${captureSide} of a valid Emirates ID.`
        )
      }
      
      // Store image
      const useTrueID = !API_CONFIG.features.simulationMode
      
      if (useTrueID) {
        if (captureSide === 'front') {
          setFrontImage(croppedBase64)
          setEidData({ captured: true, mode: 'TRUE-ID' })
        } else {
          setBackImage(croppedBase64)
        }
      } else {
        const result = await processEmiratesID(croppedBase64, captureSide)
        if (!result.success) {
          throw new Error(result.error || 'Failed to process Emirates ID')
        }
        if (captureSide === 'front' && result.data) {
          if (result.data.idNumber && !validateEmiratesIDFormat(result.data.idNumber)) {
            throw new Error('Invalid Emirates ID format detected')
          }
          if (result.data.expiryDate && isEmiratesIDExpired(result.data.expiryDate)) {
            throw new Error('This Emirates ID has expired')
          }
          setEidData(result.data)
        }
        if (captureSide === 'front') {
          setFrontImage(croppedBase64)
        } else {
          setBackImage(croppedBase64)
        }
      }

      setIsProcessing(false)
      setCurrentSide(null)
      
      setTimeout(() => {
        setModalOpen(false)
        setModalSide(null)
        stopAutoDetection()
      }, 1500)
    } catch (err) {
      console.error('Auto-capture error:', err)
      setError(err instanceof Error ? err.message : 'Failed to capture document')
      setIsProcessing(false)
      captureTriggeredRef.current = false
    }
  }, [opencvLoaded, stopAutoDetection])

  // Start automatic detection using OpenCV - Improved for faster, more reliable capture
  const startAutoDetection = useCallback((side?: 'front' | 'back') => {
    if (!opencvLoaded || !videoRef.current || detectionIntervalRef.current) {
      console.warn('⚠️ Cannot start detection - missing requirements', {
        opencvLoaded,
        video: !!videoRef.current,
        interval: !!detectionIntervalRef.current
      })
      return
    }

    const sideToUse: 'front' | 'back' | null = side || currentSide
    
    if (!sideToUse || (sideToUse !== 'front' && sideToUse !== 'back')) {
      console.error('❌ Invalid side when starting detection:', { side, currentSide, sideToUse })
      setError('Invalid scan side. Please try again.')
      setIsDetecting(false)
      return
    }

    setIsDetecting(true)
    setDetectionReady(false)
    setDetectedPoints(null)
    captureTriggeredRef.current = false

    let lastStablePoints: any[] | null = null
    let stableStart: number | null = null
    let consecutiveDetections = 0  // Count consecutive successful detections
    const currentSideValue: 'front' | 'back' = sideToUse
    
    console.log('🔍 Starting improved auto-detection with OpenCV for side:', currentSideValue)

    // Detection interval - check every 150ms for faster response
    detectionIntervalRef.current = window.setInterval(async () => {
      if (captureTriggeredRef.current) {
        return
      }

      if (!videoRef.current || !opencvLoaded || !canvasRef.current) {
        return
      }
      
      if (!currentSideValue || (currentSideValue !== 'front' && currentSideValue !== 'back')) {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current)
          detectionIntervalRef.current = null
        }
        return
      }

      try {
        const result = await detectDocumentInFrame(videoRef.current)
        
        if (!result || !result.detected || !result.points || result.points.length < 4) {
          // Reset on no detection
          setDetectionReady(false)
          stableStart = null
          lastStablePoints = null
          consecutiveDetections = 0
          setDetectedPoints(null)
          drawDetection(null, canvasRef.current, videoRef.current, false)
          return
        }

        const { points, blurScore } = result

        // Very lenient stability check - allow much larger movement
        const stabilityThreshold = isMobile ? 120 : 100  // Much larger threshold
        let pointsSimilar = false
        
        if (lastStablePoints && points.length === lastStablePoints.length) {
          // Check if points are similar (very lenient)
          const allSimilar = points.every((p, i) => {
            const lastP = lastStablePoints![i]
            const dx = Math.abs(p.x - lastP.x)
            const dy = Math.abs(p.y - lastP.y)
            return dx < stabilityThreshold && dy < stabilityThreshold
          })
          
          if (allSimilar) {
            pointsSimilar = true
            consecutiveDetections++
          } else {
            // Reset only if movement is very large
            const maxMovement = Math.max(...points.map((p, i) => {
              const lastP = lastStablePoints![i]
              return Math.abs(p.x - lastP.x) + Math.abs(p.y - lastP.y)
            }))
            if (maxMovement > stabilityThreshold * 2) {
              consecutiveDetections = 0
            }
          }
        } else {
          consecutiveDetections = 0
        }

        // Start timer immediately on first detection, or if similar and detected once
        if (pointsSimilar && consecutiveDetections >= 1) {
          if (stableStart === null) {
            stableStart = Date.now()
            console.log('📸 Document detected, starting countdown...')
          }
          
          const stableDuration = Date.now() - stableStart
          
          // Quick validation before capture - check if it looks like an Emirates ID
          // We'll do a quick capture and validate, then proceed if valid
          const requiredStability = isMobile ? 200 : 250  // Very short (200-250ms)
          
          if (stableDuration >= requiredStability) {
            if (!captureTriggeredRef.current) {
              captureTriggeredRef.current = true
              
              // Quick validation: capture a test image and validate before full capture
              console.log('🔍 Quick validation before auto-capture...')
              
              // Quick capture for validation
              const quickValidate = async () => {
                try {
                  if (!videoRef.current || !opencvLoaded) {
                    throw new Error('Camera or OpenCV not ready')
                  }
                  
                  const videoMat = await imageToMat(videoRef.current)
                  if (!videoMat) {
                    throw new Error('Failed to capture video frame')
                  }
                  
                  const pointsToValidate = points.map(p => ({ x: p.x, y: p.y }))
                  const croppedMat = cropDocument(videoMat, pointsToValidate, 800, 500)
                  if (!croppedMat) {
                    videoMat.delete()
                    throw new Error('Failed to crop document')
                  }
                  
                  const croppedBase64 = matToBase64(croppedMat, 'image/jpeg')
                  videoMat.delete()
                  croppedMat.delete()
                  
                  if (!croppedBase64) {
                    throw new Error('Failed to convert image')
                  }
                  
                  // Validate that it's an Emirates ID
                  setProcessingMessage('Validating Emirates ID...')
                  const validationResult = await validateIsEmiratesID(croppedBase64, currentSideValue)
                  
                  if (!validationResult.isValid || !validationResult.isEmiratesID) {
                    // Not a valid Emirates ID - reset and continue detection
                    console.warn('⚠️ Validation failed - not an Emirates ID:', validationResult.error)
                    captureTriggeredRef.current = false
                    setDetectionReady(false)
                    setError(validationResult.error || 'Please scan an Emirates ID card')
                    // Continue detection
                    return false
                  }
                  
                  // Validation passed - proceed with full capture
                  console.log('✅ Validation passed - proceeding with capture')
                  return true
                } catch (err) {
                  console.error('❌ Quick validation error:', err)
                  captureTriggeredRef.current = false
                  setDetectionReady(false)
                  return false
                }
              }
              
              // Perform quick validation
              quickValidate().then((isValid) => {
                if (!isValid) {
                  // Validation failed - reset and continue
                  return
                }
                
                // Validation passed - proceed with full capture
                if (detectionIntervalRef.current) {
                  clearInterval(detectionIntervalRef.current)
                  detectionIntervalRef.current = null
                }
                
                const pointsToCapture = points.map(p => ({ x: p.x, y: p.y }))
                const sideToCapture: 'front' | 'back' = currentSideValue
                
                console.log('🚀 ===== AUTO-CAPTURE TRIGGERED (VALIDATED) =====')
                console.log(`✅ Emirates ID validated and stable for ${stableDuration}ms - capturing NOW!`)
                setDetectionReady(true)
                setDetectedPoints(points)
                drawDetection(points, canvasRef.current, videoRef.current, true)
                
                const capturePromise = autoCaptureDocument(pointsToCapture, sideToCapture)
                
                capturePromise
                  .then(() => {
                    console.log('✅ Auto-capture completed')
                  })
                  .catch(err => {
                    console.error('❌ Auto-capture error:', err)
                    captureTriggeredRef.current = false
                    setIsProcessing(false)
                    setDetectionReady(false)
                    setError(err instanceof Error ? err.message : 'Capture failed')
                  })
              })
              
              return
            }
          } else {
            // Show progress - getting ready
            const progress = Math.min(100, (stableDuration / requiredStability) * 100)
            setDetectionReady(progress > 50)  // Show ready when 50% complete
          }
        } else {
          // First detection or points changed - start timer immediately
          if (lastStablePoints === null || !pointsSimilar) {
            stableStart = Date.now()
            lastStablePoints = points
            setDetectionReady(false)
          }
        }

        // Always show detected points
        setDetectedPoints(points)
        drawDetection(points, canvasRef.current, videoRef.current, false)
      } catch (error) {
        console.error('Detection error:', error)
        setDetectionReady(false)
        stableStart = null
        lastStablePoints = null
        consecutiveDetections = 0
        setDetectedPoints(null)
      }
    }, 100) // Check every 100ms for even faster detection
  }, [opencvLoaded, autoCaptureDocument, currentSide, isMobile, drawDetection])

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
    
    // Wait for video element to be ready, then start detection
    setTimeout(() => {
      if (videoRef.current && opencvLoaded) {
        console.log('🎬 Starting scan for side:', side)
        startAutoDetection(side)
      } else {
        console.warn('⚠️ Cannot start detection - video or OpenCV not ready', {
          video: !!videoRef.current,
          opencvLoaded
        })
      }
    }, 500)
  }
  
  // Handle opening scan modal - defined after startScan
  const handleOpenScanModal = (side: 'front' | 'back') => {
    // Clear any previous camera errors
    setCameraError(null)
    setError(null)
    setShowFileUpload(false)
    
    setModalSide(side)
    setModalOpen(true)
    
    // Start scan when modal opens - give it a bit more time for modal to render
    setTimeout(() => {
      startScan(side)
    }, 300)
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
      setProcessingMessage('Detecting and cropping ID card...')
      
      try {
        // Try to detect and crop the document from the uploaded image
        let croppedImage = imageBase64 // Fallback to full image if cropping fails
        
        try {
          // Convert to OpenCV Mat
          const img = new Image()
          img.src = imageBase64
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            setTimeout(reject, 5000) // 5 second timeout
          })
          
          const videoMat = imageToMat(img)
          const result = detectDocumentInFrame(videoMat)
          
          if (result && result.detected && result.points && result.points.length >= 4) {
            console.log('✅ Document detected in uploaded image, cropping...')
            const croppedMat = cropDocument(videoMat, result.points, 800, 500)
            croppedImage = matToBase64(croppedMat)
            console.log('✅ ID card frame cropped successfully from uploaded image')
            
            // Clean up
            videoMat.delete()
            croppedMat.delete()
          } else {
            console.warn('⚠️ Could not detect document in uploaded image, using full image')
            videoMat.delete()
          }
        } catch (cropError) {
          console.warn('⚠️ Cropping failed for uploaded image, using full image:', cropError)
          // Continue with full image as fallback
        }
        
        // Validate that the image is actually an Emirates ID
        setProcessingMessage('Validating Emirates ID card...')
        const validationResult = await validateIsEmiratesID(croppedImage, side)
        
        if (!validationResult.isValid || !validationResult.isEmiratesID) {
          throw new Error(
            validationResult.error || 
            `This does not appear to be an Emirates ID card. Please ensure you are uploading the ${side} of a valid Emirates ID.`
          )
        }
        
        const useTrueID = !API_CONFIG.features.simulationMode
        
        // Store only the cropped image (or full image if cropping failed)
        if (useTrueID) {
          await new Promise(resolve => setTimeout(resolve, 500))
          if (side === 'front') {
            setFrontImage(croppedImage) // Store cropped image only
            setEidData({ captured: true, mode: 'TRUE-ID' })
          } else {
            setBackImage(croppedImage) // Store cropped image only
          }
        } else {
          const result = await processEmiratesID(croppedImage, side) // Use cropped image for OCR
          if (!result.success) {
            throw new Error(result.error || 'Failed to process Emirates ID')
          }
          if (side === 'front' && result.data) {
            setEidData(result.data)
          }
          if (side === 'front') {
            setFrontImage(croppedImage) // Store cropped image only
          } else {
            setBackImage(croppedImage) // Store cropped image only
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
    stopAutoDetection()
    // Reset capture flag
    captureTriggeredRef.current = false
    if (side === 'front') {
      setFrontImage(null)
      setFrontCroppedImage(null)
      setEidData(null)
    } else {
      setBackImage(null)
      setBackCroppedImage(null)
    }
    setError(null)
    setCurrentSide(null)
  }

  // Cleanup on unmount or side change
  useEffect(() => {
    if (!currentSide) {
      stopAutoDetection()
    }
  }, [currentSide, stopAutoDetection])

  
  // Auto-start back side detection after front side is captured
  useEffect(() => {
    // Only trigger if:
    // 1. Front image is captured
    // 2. Back image is not captured yet
    // 3. No current scan is active
    // 4. Not currently processing
    // 5. Scanner is ready
    if (frontImage && !backImage && !currentSide && !isProcessing && opencvLoaded) {
      console.log('✅ Front side captured. Auto-starting back side detection in 1 second...')
      const timer = setTimeout(() => {
        console.log('🔄 Auto-starting back side detection...')
        startScan('back')
      }, 1000) // 1 second delay to show the captured front image
      
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontImage, backImage, currentSide, isProcessing])

  const handlePhilippinesIdUpload = async (event: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = event.target.files?.[0]
    if (!file) return

    // Convert file to base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageBase64 = e.target?.result as string
      
      if (side === 'front') {
        setPhilippinesIdFrontImage(imageBase64)
      } else {
        setPhilippinesIdBackImage(imageBase64)
      }
    }
    reader.readAsDataURL(file)
  }

  const removePhilippinesId = (side: 'front' | 'back') => {
    if (side === 'front') {
      setPhilippinesIdFrontImage(null)
    } else {
      setPhilippinesIdBackImage(null)
    }
  }

  const handleContinue = () => {
    console.log('📸 Step2 handleContinue called:', {
      hasFrontImage: !!frontImage,
      hasBackImage: !!backImage,
      frontImageLength: frontImage?.length || 0,
      backImageLength: backImage?.length || 0,
      hasPhilippinesIdFront: !!philippinesIdFrontImage,
      hasPhilippinesIdBack: !!philippinesIdBackImage
    })
    
    if (frontImage && backImage) {
      const dataToSend = {
        eidFrontImage: frontImage,
        eidBackImage: backImage,
        philippinesIdFrontImage: philippinesIdFrontImage || undefined,
        philippinesIdBackImage: philippinesIdBackImage || undefined,
        eidVerified: true,
      }
      console.log('📸 Sending EID data to onComplete:', {
        hasEidFront: !!dataToSend.eidFrontImage,
        hasEidBack: !!dataToSend.eidBackImage,
        hasPhilippinesIdFront: !!dataToSend.philippinesIdFrontImage,
        hasPhilippinesIdBack: !!dataToSend.philippinesIdBackImage
      })
      onComplete(dataToSend)
    } else {
      console.error('❌ Missing images:', {
        hasFront: !!frontImage,
        hasBack: !!backImage
      })
      setError('Please scan both front and back of your Emirates ID')
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub-Header with Route Badge */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-gray-900 transition-colors text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex-1 flex justify-center min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 bg-green-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-full">
                <span className="text-xs sm:text-sm font-semibold truncate">{routeDisplay}</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:block whitespace-nowrap">
              Step 5 of 7: ID Scan
            </div>
            <div className="text-xs text-gray-600 font-medium sm:hidden">
              Step 5
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 xl:p-8 space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Verify Your Identity</h2>
            <h3 className="text-base sm:text-lg lg:text-xl text-gray-600 font-medium">Emirates ID Scan</h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-2xl mx-auto px-2">
              Please scan both sides of your UAE Emirates ID for verification
            </p>
          </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-3 sm:p-4 lg:p-5 rounded-lg shadow-sm">
        <h4 className="font-semibold text-blue-900 mb-2 sm:mb-3 text-xs sm:text-sm lg:text-base flex items-center gap-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Instructions
        </h4>
        <ul className="text-xs sm:text-sm text-blue-800 space-y-1.5 sm:space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span>Position your Emirates ID card within the frame</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span>Ensure good lighting with no glare or shadows</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span>Keep the ID flat and hold it steady for 1 second</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span>The system will automatically detect and capture when ready (green overlay)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span>A yellow frame means detection is in progress</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span>Avoid reflections and ensure all text is readable</span>
          </li>
        </ul>
        {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
          <div className="mt-2 sm:mt-3 text-xs text-blue-700 bg-blue-100 p-2 sm:p-2.5 rounded border border-blue-200">
            ⚠️ Camera requires HTTPS or localhost. If camera doesn't work, you can upload images instead.
          </div>
        )}
      </div>
      
      {/* Camera Error Notice */}
      {cameraError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded-lg shadow-sm">
          <div className="flex items-start gap-2 sm:gap-3">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-red-700 font-semibold text-sm sm:text-base">Camera Access Error</p>
              <p className="text-xs sm:text-sm text-red-600 mt-1">{String(cameraError)}</p>
              <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-700">
                <p className="font-semibold mb-1">Possible solutions:</p>
                <ul className="list-disc pl-4 sm:pl-5 space-y-1">
                  <li>Grant camera permissions in your browser</li>
                  <li>Use Chrome, Edge, or Firefox browser</li>
                  <li>Access via HTTPS or localhost</li>
                  <li>Or upload images using the file upload option below</li>
                </ul>
              </div>
              <div className="mt-3 sm:mt-4">
                <button
                  type="button"
                  onClick={requestCameraPermission}
                  className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm py-2 w-full sm:w-auto"
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
      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        {/* Front Side */}
        <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs sm:text-sm">1</span>
              </div>
              <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">Front of Emirates ID</h4>
            </div>
            {frontImage && (
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                <span className="text-xs sm:text-sm text-green-600 font-medium hidden sm:inline">Captured</span>
              </div>
            )}
          </div>

          {frontImage ? (
            <div className="space-y-2 sm:space-y-3">
              <div className="relative rounded-lg overflow-hidden border-2 border-green-500 shadow-md">
                <img
                  src={frontImage}
                  alt="Emirates ID Front"
                  className="w-full h-auto max-h-40 sm:max-h-48 md:max-h-64 lg:max-h-96 object-contain bg-gray-50"
                />
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-green-500 text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                  ✓ Captured
                </div>
              </div>
              <button
                type="button"
                onClick={() => retake('front')}
                className="btn-secondary flex items-center justify-center gap-2 w-full text-xs sm:text-sm lg:text-base py-2 sm:py-2.5"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                Retake Front
              </button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              <button
                type="button"
                onClick={() => handleOpenScanModal('front')}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 lg:py-4 text-xs sm:text-sm lg:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Scan Front of ID (Full Screen)</span>
                <span className="sm:hidden">Scan Front ID</span>
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

          {/* Modal for Full Screen Scanning - Front */}
          <IDScanModal
            isOpen={modalOpen && modalSide === 'front'}
            onClose={closeScanModal}
            title="Scan Front of Emirates ID - Full Screen View"
          >
            <div className="flex flex-col h-full max-h-[85vh]">
              {currentSide === 'front' && !frontImage ? (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* Instructions */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-2 sm:p-3 rounded">
                    <p className="text-xs sm:text-sm text-blue-800 mb-2">
                      <strong>Instructions:</strong> Hold your phone at a comfortable distance (about 30-40cm away) and position your Emirates ID card within the centered frame. The system will automatically detect and capture when the card is steady.
                    </p>
                    <p className="text-xs text-blue-700">
                      💡 Tip: Keep the card steady for a moment. The system will automatically capture when ready.
                    </p>
                  </div>

                  {/* Camera View - Full Screen */}
                  {!cameraError ? (
                    <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={isMobile ? 0.85 : 0.95}
                        className="w-full h-full object-contain"
                        videoConstraints={{
                          width: isMobile ? { ideal: 1280, max: 1920 } : { ideal: 1920 },
                          height: isMobile ? { ideal: 720, max: 1080 } : { ideal: 1080 },
                          facingMode: 'environment',
                          aspectRatio: { ideal: 16/9 }
                        }}
                        onUserMedia={(stream) => {
                          console.log('✅ Front camera loaded in modal')
                          setCameraError(null)
                          setError(null)
                          setTimeout(() => {
                            if (webcamRef.current?.video) {
                              videoRef.current = webcamRef.current.video
                              if (opencvLoaded && modalSide === 'front') {
                                console.log('🎬 Starting front detection in modal')
                                setCurrentSide('front')
                                startAutoDetection('front')
                              }
                            }
                          }, 500)
                        }}
                        onUserMediaError={(err) => {
                          console.error('❌ Front camera error in modal:', err)
                          handleCameraError(err)
                        }}
                        forceScreenshotSourceSize={true}
                      />
                      
                      {/* Detection overlay canvas */}
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ zIndex: 10 }}
                      />
                      
                      {/* Guide frame - smaller, centered frame for better focus */}
                      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70%] sm:w-[65%] md:w-[60%] aspect-[85.6/53.98] border-[3px] sm:border-4 border-dashed rounded-lg pointer-events-none transition-all duration-300 ${
                        detectionReady 
                          ? 'border-green-500 bg-green-500 bg-opacity-20 shadow-lg shadow-green-500/50' 
                          : isDetecting 
                            ? 'border-yellow-400 bg-yellow-400 bg-opacity-10' 
                            : 'border-gray-300'
                      }`} 
                      style={{ 
                        maxWidth: isMobile ? '320px' : '400px',
                        maxHeight: isMobile ? '200px' : '250px'
                      }} />
                      
                      {/* Corner guides for better alignment */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70%] sm:w-[65%] md:w-[60%] aspect-[85.6/53.98] pointer-events-none"
                        style={{ 
                          maxWidth: isMobile ? '320px' : '400px',
                          maxHeight: isMobile ? '200px' : '250px'
                        }}>
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                      </div>
                      
                      {/* Detection status - positioned above the frame */}
                      {isDetecting && (
                        <div className="absolute top-[calc(50%-15vh)] sm:top-[calc(50%-18vh)] left-1/2 transform -translate-x-1/2 z-20 w-[90%] sm:w-auto max-w-md">
                          <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-lg text-white text-sm sm:text-base md:text-lg font-bold shadow-lg text-center ${
                            detectionReady 
                              ? 'bg-green-600 animate-pulse' 
                              : isDetecting 
                                ? 'bg-yellow-600' 
                                : 'bg-blue-600'
                          }`}>
                            {detectionReady 
                              ? '✓ Ready! Capturing...' 
                              : isDetecting 
                                ? 'Hold steady...' 
                                : 'Position ID card in the centered frame'}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 bg-gray-100 rounded-lg p-8 text-center flex items-center justify-center min-h-[50vh]">
                      <div>
                        <Camera className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4 text-lg">Camera not available</p>
                        <p className="text-sm text-gray-500 mb-4">Upload your Emirates ID image instead</p>
                        <label className="block cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              handleFileUpload(e, 'front')
                              closeScanModal()
                            }}
                            className="hidden"
                          />
                          <span className="btn-secondary inline-block">📁 Choose File</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Processing indicator */}
                  {isProcessing && (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-semibold">{processingMessage || 'Validating Emirates ID...'}</p>
                      <p className="text-sm text-gray-500 mt-2">Please wait, this may take a few seconds</p>
                    </div>
                  )}

                  {/* Manual Capture Button & Cancel */}
                  {!isProcessing && !cameraError && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (currentSide === 'front' && detectedPoints && detectedPoints.length >= 4) {
                            // Use detected points for cropping
                            console.log('📸 Manual capture with detected points')
                            const pointsToCapture = detectedPoints.map((p: any) => ({ x: p.x, y: p.y }))
                            await autoCaptureDocument(pointsToCapture, 'front')
                          } else {
                            // Fallback to simple capture
                            console.log('📸 Manual capture without detection')
                            await captureImage()
                          }
                        }}
                        disabled={isProcessing}
                        className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                      >
                        <Camera className="w-5 h-5" />
                        Capture Manually
                      </button>
                      <button
                        type="button"
                        onClick={closeScanModal}
                        className="btn-secondary w-full py-3 text-lg"
                      >
                        Cancel & Close
                      </button>
                    </div>
                  )}
                  
                  {/* Success message with cropped preview */}
                  {frontImage && !isProcessing && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-500">
                      <div className="text-center mb-3">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-green-700">Document Captured Successfully!</p>
                      </div>
                      <img
                        src={frontImage}
                        alt="Cropped Emirates ID Front"
                        className="w-full max-w-2xl mx-auto rounded-lg border-2 border-green-300"
                      />
                      <p className="text-sm text-green-600 mt-3 text-center">Closing automatically...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-green-600">Front ID Captured Successfully!</p>
                  <p className="text-sm text-gray-600 mt-2">You can close this window</p>
                </div>
              )}
            </div>
          </IDScanModal>
        </div>

        {/* Back Side */}
        <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs sm:text-sm">2</span>
              </div>
              <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">Back of Emirates ID</h4>
            </div>
            {backImage && (
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                <span className="text-xs sm:text-sm text-green-600 font-medium hidden sm:inline">Captured</span>
              </div>
            )}
          </div>

          {backImage ? (
            <div className="space-y-2 sm:space-y-3">
              <div className="relative rounded-lg overflow-hidden border-2 border-green-500 shadow-md">
                <img
                  src={backImage}
                  alt="Emirates ID Back"
                  className="w-full h-auto max-h-40 sm:max-h-48 md:max-h-64 lg:max-h-96 object-contain bg-gray-50"
                />
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-green-500 text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                  ✓ Captured
                </div>
              </div>
              <button
                type="button"
                onClick={() => retake('back')}
                className="btn-secondary flex items-center justify-center gap-2 w-full text-xs sm:text-sm lg:text-base py-2 sm:py-2.5"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                Retake Back
              </button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              <button
                type="button"
                onClick={() => handleOpenScanModal('back')}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 lg:py-4 text-xs sm:text-sm lg:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Scan Back of ID (Full Screen)</span>
                <span className="sm:hidden">Scan Back ID</span>
              </button>
              {cameraError && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block cursor-pointer">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Or upload image</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'back')}
                        className="hidden"
                      />
                      <span className="btn-secondary inline-block">📁 Choose File</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Modal for Full Screen Scanning - Back */}
          <IDScanModal
            isOpen={modalOpen && modalSide === 'back'}
            onClose={closeScanModal}
            title="Scan Back of Emirates ID - Full Screen View"
          >
            <div className="flex flex-col h-full max-h-[85vh]">
              {currentSide === 'back' && !backImage ? (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* Instructions */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-2 sm:p-3 rounded">
                    <p className="text-xs sm:text-sm text-blue-800 mb-2">
                      <strong>Instructions:</strong> Hold your phone at a comfortable distance (about 30-40cm away) and position your Emirates ID card (back side) within the centered frame. The system will automatically detect and capture when the card is steady.
                    </p>
                    <p className="text-xs text-blue-700">
                      💡 Tip: Keep the card steady for a moment. The system will automatically capture when ready.
                    </p>
                  </div>

                  {/* Camera View - Full Screen */}
                  {!cameraError ? (
                    <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={isMobile ? 0.85 : 0.95}
                        className="w-full h-full object-contain"
                        videoConstraints={{
                          width: isMobile ? { ideal: 1280, max: 1920 } : { ideal: 1920 },
                          height: isMobile ? { ideal: 720, max: 1080 } : { ideal: 1080 },
                          facingMode: 'environment',
                          aspectRatio: { ideal: 16/9 }
                        }}
                        onUserMedia={(stream) => {
                          console.log('✅ Back camera loaded in modal')
                          setCameraError(null)
                          setError(null)
                          setTimeout(() => {
                            if (webcamRef.current?.video) {
                              videoRef.current = webcamRef.current.video
                              if (opencvLoaded && modalSide === 'back') {
                                console.log('🎬 Starting back detection in modal')
                                setCurrentSide('back')
                                startAutoDetection('back')
                              }
                            }
                          }, 500)
                        }}
                        onUserMediaError={(err) => {
                          console.error('❌ Back camera error in modal:', err)
                          handleCameraError(err)
                        }}
                        forceScreenshotSourceSize={true}
                      />
                      
                      {/* Detection overlay canvas */}
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ zIndex: 10 }}
                      />
                      
                      {/* Guide frame - smaller, centered frame for better focus */}
                      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70%] sm:w-[65%] md:w-[60%] aspect-[85.6/53.98] border-[3px] sm:border-4 border-dashed rounded-lg pointer-events-none transition-all duration-300 ${
                        detectionReady 
                          ? 'border-green-500 bg-green-500 bg-opacity-20 shadow-lg shadow-green-500/50' 
                          : isDetecting 
                            ? 'border-yellow-400 bg-yellow-400 bg-opacity-10' 
                            : 'border-gray-300'
                      }`} 
                      style={{ 
                        maxWidth: isMobile ? '320px' : '400px',
                        maxHeight: isMobile ? '200px' : '250px'
                      }} />
                      
                      {/* Corner guides for better alignment */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70%] sm:w-[65%] md:w-[60%] aspect-[85.6/53.98] pointer-events-none"
                        style={{ 
                          maxWidth: isMobile ? '320px' : '400px',
                          maxHeight: isMobile ? '200px' : '250px'
                        }}>
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                      </div>
                      
                      {/* Detection status - positioned above the frame */}
                      {isDetecting && (
                        <div className="absolute top-[calc(50%-15vh)] sm:top-[calc(50%-18vh)] left-1/2 transform -translate-x-1/2 z-20 w-[90%] sm:w-auto max-w-md">
                          <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-lg text-white text-sm sm:text-base md:text-lg font-bold shadow-lg text-center ${
                            detectionReady 
                              ? 'bg-green-600 animate-pulse' 
                              : isDetecting 
                                ? 'bg-yellow-600' 
                                : 'bg-blue-600'
                          }`}>
                            {detectionReady 
                              ? '✓ Ready! Capturing...' 
                              : isDetecting 
                                ? 'Hold steady...' 
                                : 'Position ID card in the centered frame'}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 bg-gray-100 rounded-lg p-8 text-center flex items-center justify-center min-h-[50vh]">
                      <div>
                        <Camera className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4 text-lg">Camera not available</p>
                        <p className="text-sm text-gray-500 mb-4">Upload your Emirates ID image instead</p>
                        <label className="block cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              handleFileUpload(e, 'back')
                              closeScanModal()
                            }}
                            className="hidden"
                          />
                          <span className="btn-secondary inline-block">📁 Choose File</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Processing indicator */}
                  {isProcessing && (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-semibold">{processingMessage || 'Validating Emirates ID...'}</p>
                      <p className="text-sm text-gray-500 mt-2">Please wait, this may take a few seconds</p>
                    </div>
                  )}

                  {/* Manual Capture Button & Cancel */}
                  {!isProcessing && !cameraError && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (currentSide === 'back' && detectedPoints && detectedPoints.length >= 4) {
                            // Use detected points for cropping
                            console.log('📸 Manual capture with detected points')
                            const pointsToCapture = detectedPoints.map((p: any) => ({ x: p.x, y: p.y }))
                            await autoCaptureDocument(pointsToCapture, 'back')
                          } else {
                            // Fallback to simple capture
                            console.log('📸 Manual capture without detection')
                            await captureImage()
                          }
                        }}
                        disabled={isProcessing}
                        className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                      >
                        <Camera className="w-5 h-5" />
                        Capture Manually
                      </button>
                      <button
                        type="button"
                        onClick={closeScanModal}
                        className="btn-secondary w-full py-3 text-lg"
                      >
                        Cancel & Close
                      </button>
                    </div>
                  )}
                  
                  {/* Success message with cropped preview */}
                  {backImage && !isProcessing && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-500">
                      <div className="text-center mb-3">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-green-700">Document Captured Successfully!</p>
                      </div>
                      <img
                        src={backImage}
                        alt="Cropped Emirates ID Back"
                        className="w-full max-w-2xl mx-auto rounded-lg border-2 border-green-300"
                      />
                      <p className="text-sm text-green-600 mt-3 text-center">Closing automatically...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-green-600">Back ID Captured Successfully!</p>
                  <p className="text-sm text-gray-600 mt-2">You can close this window</p>
                </div>
              )}
            </div>
          </IDScanModal>
        </div>
      </div>

      {/* Philippines ID Upload Section - Only show after both Emirates ID images are captured */}
      {frontImage && backImage && (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-xl p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 shadow-sm">
          <div className="text-center space-y-1 sm:space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 font-bold text-xs sm:text-sm">+</span>
              </div>
              <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-blue-900">Philippines ID Upload (Optional)</h4>
            </div>
            <p className="text-xs sm:text-sm text-blue-700 max-w-2xl mx-auto px-2">
              If you have a Philippines ID, you can upload it here. This is completely optional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Philippines ID Front */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm sm:text-base font-semibold text-gray-800">Philippines ID Front</h5>
                {philippinesIdFrontImage && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>

              {philippinesIdFrontImage ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border-2 border-green-500 shadow-md">
                    <img
                      src={philippinesIdFrontImage}
                      alt="Philippines ID Front"
                      className="w-full h-auto max-h-40 sm:max-h-48 object-contain bg-gray-50"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      ✓ Uploaded
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhilippinesId('front')}
                    className="btn-secondary flex items-center justify-center gap-2 w-full text-xs sm:text-sm py-2"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                    Remove
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">Upload Philippines ID Front</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhilippinesIdUpload(e, 'front')}
                      className="hidden"
                    />
                    <span className="btn-secondary inline-block text-xs sm:text-sm py-2 px-4">Choose File</span>
                  </div>
                </label>
              )}
            </div>

            {/* Philippines ID Back */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm sm:text-base font-semibold text-gray-800">Philippines ID Back</h5>
                {philippinesIdBackImage && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>

              {philippinesIdBackImage ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border-2 border-green-500 shadow-md">
                    <img
                      src={philippinesIdBackImage}
                      alt="Philippines ID Back"
                      className="w-full h-auto max-h-40 sm:max-h-48 object-contain bg-gray-50"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      ✓ Uploaded
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhilippinesId('back')}
                    className="btn-secondary flex items-center justify-center gap-2 w-full text-xs sm:text-sm py-2"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                    Remove
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">Upload Philippines ID Back</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhilippinesIdUpload(e, 'back')}
                      className="hidden"
                    />
                    <span className="btn-secondary inline-block text-xs sm:text-sm py-2 px-4">Choose File</span>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded-lg flex items-start gap-2 sm:gap-3 shadow-sm">
          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Success details intentionally hidden per requirement */}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary flex items-center justify-center gap-2 order-2 sm:order-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            
            <button
              type="button"
              onClick={handleContinue}
              disabled={!frontImage || !backImage}
              className="btn-primary flex-1 flex items-center justify-center gap-2 order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Proceed to Face Scan</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

