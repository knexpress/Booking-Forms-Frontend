import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, XCircle, RotateCcw, ArrowLeft, Maximize2 } from 'lucide-react'
import { VerificationData } from '../types'
import { processEmiratesID, validateEmiratesIDFormat, isEmiratesIDExpired } from '../services/ocrService'
import { API_CONFIG } from '../config/api.config'
import {
  loadOpenCV,
  detectDocumentInFrame,
  cropDocument,
  imageToMat,
  matToBase64,
  calculateBlurScore,
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
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)
  const stabilityTimerRef = useRef<number | null>(null)
  
  const [currentSide, setCurrentSide] = useState<ScanSide>(null)
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [backImage, setBackImage] = useState<string | null>(null)
  const [frontCroppedImage, setFrontCroppedImage] = useState<string | null>(null)
  const [backCroppedImage, setBackCroppedImage] = useState<string | null>(null)
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
  const [stabilityStartTime, setStabilityStartTime] = useState<number | null>(null)
  const [lastBlurScore, setLastBlurScore] = useState<number>(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSide, setModalSide] = useState<ScanSide>(null)
  
  // Minimum blur score threshold (adjust based on testing)
  const MIN_BLUR_SCORE = 100
  // Stability duration in milliseconds (1 second) - document must be stable for this duration
  const STABILITY_DURATION = 1000
  
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
        // Don't set error - allow manual file upload as fallback
        // Automatic detection will be disabled, but manual capture still works
        console.warn('⚠️ Automatic ID detection unavailable. Manual file upload is still available.')
      })

    return () => {
      // Cleanup detection intervals
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current)
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
  const drawDetection = useCallback((points: any[] | null, canvas: HTMLCanvasElement, video: HTMLVideoElement, isReady: boolean = false) => {
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
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current)
      stabilityTimerRef.current = null
    }
    setIsDetecting(false)
    setDetectionReady(false)
    setStabilityStartTime(null)
    setDetectedPoints(null)
  }, [])

  // Auto-capture document when conditions are met
  const autoCaptureDocument = useCallback(async (capturePoints: any[], captureSide: ScanSide) => {
    console.log('🚀 ===== AUTO-CAPTURE STARTED =====')
    console.log('📸 autoCaptureDocument called', { 
      video: !!videoRef.current, 
      opencvLoaded, 
      points: capturePoints?.length, 
      side: captureSide,
      videoWidth: videoRef.current?.videoWidth,
      videoHeight: videoRef.current?.videoHeight
    })
    
    const video = videoRef.current
    
    if (!video) {
      console.error('❌ No video element available - capture aborted')
      setError('Camera video stream not available')
      setIsProcessing(false)
      return
    }
    
    if (!opencvLoaded) {
      console.error('❌ OpenCV not loaded - capture aborted')
      setError('Image processing library not loaded')
      setIsProcessing(false)
      return
    }
    
    if (!capturePoints || capturePoints.length < 4) {
      console.error('❌ Invalid capture points - capture aborted', capturePoints)
      setError('Invalid document detection points')
      setIsProcessing(false)
      return
    }
    
    if (!captureSide || (captureSide !== 'front' && captureSide !== 'back')) {
      console.error('❌ Invalid capture side specified - capture aborted', { captureSide })
      setError(`Invalid capture side: ${captureSide || 'undefined'}. Please try again.`)
      setIsProcessing(false)
      return
    }

    // Stop detection immediately to prevent multiple captures
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    setIsDetecting(false)
    setIsProcessing(true)
    setError(null)
    
    console.log('📸 Starting auto-capture process...', { side: captureSide, pointsCount: capturePoints.length })

    try {
      console.log('📸 Step 1: Getting video frame from video element...')
      // Get video frame as Mat - this is the actual capture
      const videoMat = await imageToMat(video)
      if (!videoMat) {
        console.error('❌ Failed to create OpenCV Mat from video')
        throw new Error('Failed to capture video frame')
      }
      console.log('✅ Video frame captured', { width: videoMat.cols, height: videoMat.rows, channels: videoMat.channels() })

      console.log('📸 Step 2: Cropping document with detected points...', { pointsCount: capturePoints.length })
      // Crop the document using the detected rectangle
      const croppedMat = cropDocument(videoMat, capturePoints, 800, 500)
      if (!croppedMat) {
        videoMat.delete()
        console.error('❌ Failed to crop document')
        throw new Error('Failed to crop document')
      }
      console.log('✅ Document cropped successfully', { width: croppedMat.cols, height: croppedMat.rows })

      console.log('📸 Step 3: Converting cropped image to base64...')
      // Convert cropped image to base64
      const croppedBase64 = matToBase64(croppedMat, 'image/jpeg')
      
      console.log('📸 Step 4: Getting original screenshot from webcam...')
      // Also get original screenshot for processing (fallback)
      const originalScreenshot = webcamRef.current?.getScreenshot()
      console.log('✅ Screenshots obtained', { hasCropped: !!croppedBase64, hasOriginal: !!originalScreenshot })

      // Cleanup OpenCV mats
      videoMat.delete()
      croppedMat.delete()

      if (!croppedBase64) {
        throw new Error('Failed to convert cropped image to base64')
      }
      
      if (!originalScreenshot) {
        // Use cropped image as fallback if screenshot fails
        console.warn('⚠️ Original screenshot failed, using cropped image')
      }

      console.log('📸 Step 5: Storing captured images...')
      
      // IMPORTANT: Store images immediately
      // Store cropped image first (this is the main captured image)
      if (captureSide === 'front') {
        console.log('💾 Storing front cropped image...')
        setFrontCroppedImage(croppedBase64)
        console.log('✅ Front cropped image stored in state')
      } else {
        console.log('💾 Storing back cropped image...')
        setBackCroppedImage(croppedBase64)
        console.log('✅ Back cropped image stored in state')
      }

      // Process the original screenshot (for OCR if needed)
      // Use cropped image if original screenshot is not available
      const imageToProcess = originalScreenshot || croppedBase64
      const useTrueID = !API_CONFIG.features.simulationMode

      console.log('📸 Step 6: Processing and storing final image...', { mode: useTrueID ? 'TRUE-ID' : 'OCR', side: captureSide })
      
      if (useTrueID) {
        // TRUE-ID mode: Just capture and store the image
        // Use cropped image as it's better quality (already cropped and processed)
        if (captureSide === 'front') {
          console.log('💾 Storing front image (TRUE-ID mode)...')
          setFrontImage(croppedBase64) // Use cropped image - it's the processed document
          setEidData({ captured: true, mode: 'TRUE-ID' })
          console.log('✅ Front image stored in state (TRUE-ID mode)')
        } else if (captureSide === 'back') {
          console.log('💾 Storing back image (TRUE-ID mode)...')
          setBackImage(croppedBase64) // Use cropped image - it's the processed document
          console.log('✅ Back image stored in state (TRUE-ID mode)')
        }
      } else {
        // Simulation mode: Process Emirates ID with OCR
        console.log('🔍 Processing with OCR...')
        const result = await processEmiratesID(imageToProcess, captureSide)
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to process Emirates ID')
        }
        
        if (captureSide === 'front' && result.data) {
          // Validate ID data
          if (result.data.idNumber && !validateEmiratesIDFormat(result.data.idNumber)) {
            throw new Error('Invalid Emirates ID format detected. Please ensure the ID is clear and properly aligned.')
          }
          
          if (result.data.expiryDate && isEmiratesIDExpired(result.data.expiryDate)) {
            throw new Error('This Emirates ID has expired. Please use a valid ID.')
          }
          
          setEidData(result.data)
        }
        
        if (captureSide === 'front') {
          console.log('💾 Storing front image (OCR mode)...')
          setFrontImage(imageToProcess)
          console.log('✅ Front image stored in state (OCR mode)')
        } else if (captureSide === 'back') {
          console.log('💾 Storing back image (OCR mode)...')
          setBackImage(imageToProcess)
          console.log('✅ Back image stored in state (OCR mode)')
        }
      }

      console.log('🎉 ===== IMAGE CAPTURE COMPLETED SUCCESSFULLY =====')
      console.log('✅ All images stored in state, clearing current side...')
      
      setIsProcessing(false)
      setCurrentSide(null)
      console.log('✅ State updated - capture complete!')
      
      // Close modal after successful capture (with delay to show success message)
      // Use setTimeout to access current state
      setTimeout(() => {
        setModalOpen(false)
        setModalSide(null)
        stopAutoDetection()
      }, 1500) // Wait 1.5 seconds to show success message
    } catch (err) {
      console.error('Auto-capture error:', err)
      setError(err instanceof Error ? err.message : 'Failed to capture document. Please try again.')
      setIsProcessing(false)
      // Reset capture flag on error to allow retry
      captureTriggeredRef.current = false
    }
  }, [opencvLoaded, stopAutoDetection])

  // Start automatic detection
  // Accept side as parameter to avoid relying on state that might not be updated yet
  const startAutoDetection = useCallback((side?: 'front' | 'back') => {
    if (!opencvLoaded || !videoRef.current || detectionIntervalRef.current) {
      console.warn('⚠️ Cannot start detection - missing requirements', {
        opencvLoaded,
        video: !!videoRef.current,
        interval: !!detectionIntervalRef.current
      })
      return
    }

    // Use provided side or fall back to currentSide state
    // But prefer the parameter since state updates are async
    const sideToUse: 'front' | 'back' | null = side || currentSide
    
    // Validate that side is set before starting detection
    if (!sideToUse || (sideToUse !== 'front' && sideToUse !== 'back')) {
      console.error('❌ Invalid side when starting detection:', { side, currentSide, sideToUse })
      setError('Invalid scan side. Please try again.')
      setIsDetecting(false)
      return
    }

    setIsDetecting(true)
    setDetectionReady(false)
    setStabilityStartTime(null)
    setDetectedPoints(null)
    
    // Reset capture flag when starting new detection
    captureTriggeredRef.current = false

    let lastStablePoints: any[] | null = null
    let stableStart: number | null = null
    const currentSideValue: 'front' | 'back' = sideToUse // Use the validated side
    
    console.log('🔍 Starting auto-detection for side:', currentSideValue)

    // Detection interval - check every 200ms
    detectionIntervalRef.current = window.setInterval(async () => {
      // Stop detection if capture was triggered
      if (captureTriggeredRef.current) {
        console.log('⏸️ Detection paused - capture already triggered')
        return
      }

      if (!videoRef.current || !opencvLoaded || !canvasRef.current) {
        return
      }
      
      // Validate currentSide is still valid
      if (!currentSideValue || (currentSideValue !== 'front' && currentSideValue !== 'back')) {
        console.error('❌ Invalid currentSideValue in detection loop:', currentSideValue)
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current)
          detectionIntervalRef.current = null
        }
        return
      }

      try {
        const result = await detectDocumentInFrame(videoRef.current)
        
        if (!result) {
          setDetectionReady(false)
          stableStart = null
          lastStablePoints = null
          setDetectedPoints(null)
          drawDetection(null, canvasRef.current, videoRef.current, false)
          return
        }

        const { detected, points, blurScore } = result

        // Update blur score
        setLastBlurScore(blurScore)

        // Check if document is detected and not blurry
        if (detected && points && points.length >= 4 && blurScore >= MIN_BLUR_SCORE) {
          // Check if points are similar to last stable points (within threshold)
          const pointsSimilar = lastStablePoints && points.length === lastStablePoints.length &&
            points.every((p, i) => {
              const lastP = lastStablePoints![i]
              const dx = Math.abs(p.x - lastP.x)
              const dy = Math.abs(p.y - lastP.y)
              return dx < 20 && dy < 20 // 20 pixel threshold
            })

          if (pointsSimilar && stableStart !== null) {
            // Points are stable, check duration
            const stableDuration = Date.now() - stableStart
            
            if (stableDuration >= STABILITY_DURATION) {
              // Document is stable and ready to capture - capture immediately
              if (!captureTriggeredRef.current) {
                // Set flag immediately to prevent multiple captures
                captureTriggeredRef.current = true
                console.log('🔒 Capture flag set to prevent multiple captures')
                
                // Stop the detection interval FIRST before capturing
                if (detectionIntervalRef.current) {
                  clearInterval(detectionIntervalRef.current)
                  detectionIntervalRef.current = null
                  console.log('⏹️ Detection interval stopped')
                }
                
                // Validate currentSideValue before capturing
                if (!currentSideValue || (currentSideValue !== 'front' && currentSideValue !== 'back')) {
                  console.error('❌ Invalid currentSideValue when ready to capture:', currentSideValue)
                  setError('Invalid scan side. Please restart the scan.')
                  captureTriggeredRef.current = false
                  setIsDetecting(false)
                  return
                }
                
                // Capture the points and side in local variables FIRST (before any async operations)
                const pointsToCapture = points.map(p => ({ x: p.x, y: p.y })) // Create deep copy
                const sideToCapture: 'front' | 'back' = currentSideValue // Explicitly type it
                const videoElement = videoRef.current
                
                console.log('🚀 ===== AUTO-CAPTURE TRIGGERED =====')
                console.log('✅ Document stable for 1 second - capturing NOW!', { 
                  side: sideToCapture, 
                  points: pointsToCapture.length,
                  videoReady: !!videoElement,
                  opencvReady: opencvLoaded,
                  stableDuration: `${stableDuration}ms`,
                  sideType: typeof sideToCapture,
                  sideValue: sideToCapture
                })
                
                // Validate side one more time before calling capture
                if (sideToCapture !== 'front' && sideToCapture !== 'back') {
                  console.error('❌ Side validation failed:', sideToCapture)
                  setError('Invalid scan side detected. Please try again.')
                  captureTriggeredRef.current = false
                  setIsDetecting(false)
                  return
                }
                
                // CRITICAL: Update UI and trigger capture in the same synchronous block
                setDetectionReady(true)
                setDetectedPoints(points)
                drawDetection(points, canvasRef.current, videoRef.current, true)
                
                // CRITICAL: Call capture function IMMEDIATELY - no delays, no wrapping
                // The function is async, so it will execute in the background
                // We don't await it because we want the UI to update immediately
                const capturePromise = autoCaptureDocument(pointsToCapture, sideToCapture)
                
                // Handle the promise to catch any errors
                capturePromise
                  .then(() => {
                    console.log('✅ Auto-capture promise resolved - image should be stored')
                  })
                  .catch(err => {
                    console.error('❌ Auto-capture promise rejected:', err)
                    // Reset flag on error so user can try again
                    captureTriggeredRef.current = false
                    setIsProcessing(false)
                    setDetectionReady(false)
                    setError(err instanceof Error ? err.message : 'Capture failed. Please try again.')
                  })
                
                return // Exit early to prevent further processing
              } else {
                console.log('⏭️ Capture already triggered, skipping...')
              }
            } else {
              // Still counting down - show progress but don't set ready yet
              const progress = Math.min(100, (stableDuration / STABILITY_DURATION) * 100)
              setDetectionReady(false)
            }
          } else {
            // Points changed or first detection - reset stability timer
            stableStart = Date.now()
            lastStablePoints = points
            setDetectionReady(false)
            // Don't reset captureTriggeredRef here - it's handled by the ref system
          }

          setDetectedPoints(points)
          drawDetection(points, canvasRef.current, videoRef.current, false)
        } else {
          // Reset stability if conditions not met
          stableStart = null
          lastStablePoints = null
          setDetectionReady(false)
          setDetectedPoints(null)
          drawDetection(null, canvasRef.current, videoRef.current, false)
        }
      } catch (error) {
        console.error('Detection error:', error)
      }
    }, 200) // Check every 200ms
  }, [opencvLoaded, MIN_BLUR_SCORE, STABILITY_DURATION, drawDetection, autoCaptureDocument, currentSide])

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
    // Pass side as parameter to avoid race condition with state update
    setTimeout(() => {
      if (videoRef.current && opencvLoaded) {
        console.log('🎬 Starting scan for side:', side)
        startAutoDetection(side) // Pass side explicitly to avoid state timing issues
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

  // Get video element from webcam
  useEffect(() => {
    if (webcamRef.current && currentSide) {
      const video = webcamRef.current.video
      if (video) {
        videoRef.current = video
      }
    }
  }, [currentSide, webcamRef])
  
  // Auto-start back side detection after front side is captured
  useEffect(() => {
    // Only trigger if:
    // 1. Front image is captured
    // 2. Back image is not captured yet
    // 3. No current scan is active
    // 4. Not currently processing
    // 5. OpenCV is loaded
    if (frontImage && !backImage && !currentSide && !isProcessing && opencvLoaded) {
      console.log('✅ Front side captured. Auto-starting back side detection in 1 second...')
      const timer = setTimeout(() => {
        console.log('🔄 Auto-starting back side detection...')
        startScan('back')
      }, 1000) // 1 second delay to show the captured front image
      
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontImage, backImage, currentSide, isProcessing, opencvLoaded])

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
    <div className="space-y-6">
      {/* Sub-Header with Route Badge */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full">
                <span className="text-sm font-semibold">{routeDisplay}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              Step 5 of 7: Emirates ID Scan
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
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
          <li>• Position your Emirates ID card within the frame</li>
          <li>• Ensure good lighting with no glare or shadows</li>
          <li>• Keep the ID flat and hold it steady for 1 second</li>
          <li>• The system will automatically detect and capture when ready (green overlay)</li>
          <li>• A yellow frame means detection is in progress</li>
          <li>• Avoid reflections and ensure all text is readable</li>
        </ul>
        {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
          <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
            ⚠️ Camera requires HTTPS or localhost. If camera doesn't work, you can upload images instead.
          </div>
        )}
        {!opencvLoaded && (
          <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
            ⏳ Loading image processing library...
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
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Front of Emirates ID</h4>
            {frontImage && (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
          </div>

          {frontImage ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                <img
                  src={frontImage}
                  alt="Emirates ID Front"
                  className="w-full h-auto max-h-64 sm:max-h-96 object-contain bg-gray-50"
                />
              </div>
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
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleOpenScanModal('front')}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base sm:text-lg"
              >
                <Maximize2 className="w-5 h-5" />
                <Camera className="w-5 h-5" />
                Scan Front of ID (Full Screen)
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
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Position your Emirates ID card within the frame. The system will automatically detect and capture when the card is clear and stable.
                    </p>
                  </div>

                  {/* Camera View - Full Screen */}
                  {!cameraError ? (
                    <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-[50vh] flex items-center justify-center">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.95}
                        className="w-full h-full object-contain"
                        videoConstraints={{
                          width: 1920,
                          height: 1080,
                          facingMode: 'environment'
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
                      
                      {/* Guide frame - larger in modal */}
                      <div className={`absolute inset-4 sm:inset-8 border-4 border-dashed rounded-lg pointer-events-none transition-all duration-300 ${
                        detectionReady 
                          ? 'border-green-500 bg-green-500 bg-opacity-20 shadow-lg shadow-green-500/50' 
                          : detectedPoints 
                            ? 'border-yellow-400 bg-yellow-400 bg-opacity-10' 
                            : 'border-gray-400'
                      }`} />
                      
                      {/* Detection status - larger in modal */}
                      {isDetecting && (
                        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 z-20">
                          <div className={`px-4 sm:px-6 py-3 sm:py-4 rounded-lg text-white text-base sm:text-lg font-bold shadow-lg ${
                            detectionReady 
                              ? 'bg-green-600 animate-pulse' 
                              : detectedPoints 
                                ? 'bg-yellow-600' 
                                : 'bg-blue-600'
                          }`}>
                            {detectionReady 
                              ? '✓ Ready to capture! Capturing automatically...' 
                              : detectedPoints 
                                ? `Hold steady... (Blur: ${lastBlurScore.toFixed(0)})` 
                                : 'Position your ID card in the frame'}
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
                      <p className="text-gray-600 text-lg font-semibold">Processing Emirates ID data...</p>
                      <p className="text-sm text-gray-500 mt-2">Please wait, this may take a few seconds</p>
                    </div>
                  )}

                  {/* Cancel button */}
                  {!isProcessing && !cameraError && opencvLoaded && (
                    <button
                      type="button"
                      onClick={closeScanModal}
                      className="btn-secondary w-full py-3 text-lg"
                    >
                      Cancel & Close
                    </button>
                  )}
                  
                  {/* Loading indicator */}
                  {!cameraError && !opencvLoaded && (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-2" />
                      <p className="text-gray-600">Loading image processing library...</p>
                    </div>
                  )}
                  
                  {/* Success message with cropped preview */}
                  {frontCroppedImage && !isProcessing && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-500">
                      <div className="text-center mb-3">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-green-700">Document Captured Successfully!</p>
                      </div>
                      <img
                        src={frontCroppedImage}
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
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Back of Emirates ID</h4>
            {backImage && (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
          </div>

          {backImage ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                <img
                  src={backImage}
                  alt="Emirates ID Back"
                  className="w-full h-auto max-h-64 sm:max-h-96 object-contain bg-gray-50"
                />
              </div>
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
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleOpenScanModal('back')}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base sm:text-lg"
              >
                <Maximize2 className="w-5 h-5" />
                <Camera className="w-5 h-5" />
                Scan Back of ID (Full Screen)
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
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Position your Emirates ID card (back side) within the frame. The system will automatically detect and capture when the card is clear and stable.
                    </p>
                  </div>

                  {/* Camera View - Full Screen */}
                  {!cameraError ? (
                    <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-[50vh] flex items-center justify-center">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.95}
                        className="w-full h-full object-contain"
                        videoConstraints={{
                          width: 1920,
                          height: 1080,
                          facingMode: 'environment'
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
                      
                      {/* Guide frame - larger in modal */}
                      <div className={`absolute inset-4 sm:inset-8 border-4 border-dashed rounded-lg pointer-events-none transition-all duration-300 ${
                        detectionReady 
                          ? 'border-green-500 bg-green-500 bg-opacity-20 shadow-lg shadow-green-500/50' 
                          : detectedPoints 
                            ? 'border-yellow-400 bg-yellow-400 bg-opacity-10' 
                            : 'border-gray-400'
                      }`} />
                      
                      {/* Detection status - larger in modal */}
                      {isDetecting && (
                        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 z-20">
                          <div className={`px-4 sm:px-6 py-3 sm:py-4 rounded-lg text-white text-base sm:text-lg font-bold shadow-lg ${
                            detectionReady 
                              ? 'bg-green-600 animate-pulse' 
                              : detectedPoints 
                                ? 'bg-yellow-600' 
                                : 'bg-blue-600'
                          }`}>
                            {detectionReady 
                              ? '✓ Ready to capture! Capturing automatically...' 
                              : detectedPoints 
                                ? `Hold steady... (Blur: ${lastBlurScore.toFixed(0)})` 
                                : 'Position your ID card in the frame'}
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
                      <p className="text-gray-600 text-lg font-semibold">Processing Emirates ID data...</p>
                      <p className="text-sm text-gray-500 mt-2">Please wait, this may take a few seconds</p>
                    </div>
                  )}

                  {/* Cancel button */}
                  {!isProcessing && !cameraError && opencvLoaded && (
                    <button
                      type="button"
                      onClick={closeScanModal}
                      className="btn-secondary w-full py-3 text-lg"
                    >
                      Cancel & Close
                    </button>
                  )}
                  
                  {/* Loading indicator */}
                  {!cameraError && !opencvLoaded && (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-2" />
                      <p className="text-gray-600">Loading image processing library...</p>
                    </div>
                  )}
                  
                  {/* Success message with cropped preview */}
                  {backCroppedImage && !isProcessing && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-500">
                      <div className="text-center mb-3">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-green-700">Document Captured Successfully!</p>
                      </div>
                      <img
                        src={backCroppedImage}
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
      </div>
    </div>
  )
}

