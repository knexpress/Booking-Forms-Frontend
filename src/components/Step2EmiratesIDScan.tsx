import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, XCircle, RotateCcw, ArrowLeft, ArrowRight, Maximize2, Upload } from 'lucide-react'
import { VerificationData } from '../types'
import { validateEmiratesIDWithBackend } from '../services/ocrService'
import { showToast } from './ToastContainer'
import {
  loadOpenCV,
  detectDocumentInFrame,
  findDocumentContour,
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
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)
  const stabilityTimerRef = useRef<number | null>(null)
  
  const [currentSide, setCurrentSide] = useState<ScanSide>(null)
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [backImage, setBackImage] = useState<string | null>(null)
  const [frontCroppedImage, setFrontCroppedImage] = useState<string | null>(null)
  const [backCroppedImage, setBackCroppedImage] = useState<string | null>(null)
  const [philippinesIdFront, setPhilippinesIdFront] = useState<string | null>(null)
  const [philippinesIdBack, setPhilippinesIdBack] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_eidData, setEidData] = useState<any>(null)
  const [processingMessage, setProcessingMessage] = useState<string>('Processing Emirates ID data...')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [_showFileUpload, setShowFileUpload] = useState(false)
  
  // Auto-detection state
  const [opencvLoaded, setOpencvLoaded] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionReady, setDetectionReady] = useState(false)
  const [detectedPoints, setDetectedPoints] = useState<any[] | null>(null)
  const [_stabilityStartTime, setStabilityStartTime] = useState<number | null>(null)
  const [lastBlurScore, setLastBlurScore] = useState<number>(0)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSide, setModalSide] = useState<ScanSide>(null)
  
  // Detect if device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
  
  // Minimum blur score threshold - very low for easier detection
  const MIN_BLUR_SCORE = isMobile ? 15 : 25
  // Stability duration in milliseconds - capture immediately when detected
  const STABILITY_DURATION = 0 // Capture immediately when card is detected
  
  // Ref to track if capture has been triggered (persists across renders)
  const captureTriggeredRef = useRef(false)
  // Ref to track detection start time for delay
  const detectionStartTimeRef = useRef<number | null>(null)
  // Ref to store the delay timeout
  const captureDelayTimeoutRef = useRef<number | null>(null)
  // Ref to track detection start time for delay
  const detectionStartTimeRef = useRef<number | null>(null)
  // Ref to store the delay timeout
  const captureDelayTimeoutRef = useRef<number | null>(null)
  
  // Check if browser supports camera API
  const checkCameraSupport = (): { supported: boolean; error?: string } => {
    if (!navigator.mediaDevices) {
      return {
        supported: false,
        error: 'Camera API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.'
      }
    }
    
    if (!navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        error: 'getUserMedia is not available. Please ensure you are using HTTPS or localhost.'
      }
    }
    
    return { supported: true }
  }
  
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
        // Automatic detection will be disabled, but file upload still works
        console.warn('⚠️ Automatic ID detection unavailable. File upload is still available.')
      })

    // Check camera support on mount
    const supportCheck = checkCameraSupport()
    if (!supportCheck.supported) {
      console.warn('⚠️ Camera not supported:', supportCheck.error)
      // Don't set error immediately - let user try first, then show error if needed
    }

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
    // Check browser support first
    const supportCheck = checkCameraSupport()
    if (!supportCheck.supported) {
      handleCameraError(new Error(supportCheck.error || 'Camera not supported'))
      return false
    }

    // Helper function to add timeout to getUserMedia
    const getUserMediaWithTimeout = async (constraints: MediaStreamConstraints, timeoutMs: number = 15000): Promise<MediaStream> => {
      return Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise<MediaStream>((_, reject) => {
          setTimeout(() => {
            // Create error with TimeoutError name for proper detection
            const timeoutError = new Error('Timeout starting video source')
            timeoutError.name = 'TimeoutError'
            reject(timeoutError)
          }, timeoutMs)
        })
      ])
    }

    try {
      console.log('📷 Requesting camera permission...')
      
      // Request camera permission explicitly with timeout (15 seconds)
      const stream = await getUserMediaWithTimeout({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      }, 15000)
      
      // Stop the stream immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop())
      
      // Clear errors and show success
      setCameraError(null)
      setShowFileUpload(false)
      console.log('✅ Camera permission granted!')
      
      return true
    } catch (err) {
      console.error('❌ Camera permission error:', err)
      
      let errorMessage = 'Camera access denied or not available'
      const errorName = err instanceof Error ? err.name : (err as any)?.name || ''
      const errorMsg = err instanceof Error ? err.message : String(err)
      
      // Check error name first (works for both DOMException and Error)
      if (errorName === 'TimeoutError' || errorName === 'AbortError' || errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
        errorMessage = 'Camera is taking too long to start. Please try again or use file upload. Make sure no other app is using the camera.'
      } else if (err instanceof DOMException || errorName) {
        switch (errorName) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            errorMessage = 'Camera permission was denied. Please allow camera access in your browser settings and try again.'
            break
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            errorMessage = 'No camera found. Please connect a camera device.'
            break
          case 'NotReadableError':
          case 'TrackStartError':
            errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.'
            break
          case 'OverconstrainedError':
          case 'ConstraintNotSatisfiedError':
            errorMessage = 'Camera constraints could not be satisfied. Trying with default settings...'
            // Try again with simpler constraints and shorter timeout
            try {
              const fallbackStream = await getUserMediaWithTimeout({ video: true }, 10000)
              fallbackStream.getTracks().forEach(track => track.stop())
              setCameraError(null)
              console.log('✅ Camera permission granted with fallback constraints!')
              return true
            } catch (fallbackErr) {
              errorMessage = 'Camera access failed. Please try again or use file upload.'
            }
            break
          case 'NotSupportedError':
            errorMessage = 'Camera is not supported in this browser. Please use a modern browser.'
            break
          default:
            errorMessage = errorMsg || 'Camera access error. Please try again.'
        }
      } else if (err instanceof Error) {
        errorMessage = errorMsg
      }
      
      handleCameraError(new Error(errorMessage))
      return false
    }
  }

  // Check if card is completely visible within the frame
  const isCardFullyVisible = useCallback((points: any[], video: HTMLVideoElement): boolean => {
    if (!points || points.length < 4 || !video) {
      return false
    }

    const videoWidth = video.videoWidth || video.clientWidth
    const videoHeight = video.videoHeight || video.clientHeight

    if (videoWidth === 0 || videoHeight === 0) {
      return false
    }

    // Add a margin (e.g., 5% of frame size) to ensure card isn't cut off at edges
    const marginX = videoWidth * 0.05
    const marginY = videoHeight * 0.05

    // Check if all points are within the frame with margin
    for (const point of points) {
      if (point.x < marginX || point.x > videoWidth - marginX ||
          point.y < marginY || point.y > videoHeight - marginY) {
        return false
      }
    }

    return true
  }, [])

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
    if (captureDelayTimeoutRef.current) {
      clearTimeout(captureDelayTimeoutRef.current)
      captureDelayTimeoutRef.current = null
    }
    setIsDetecting(false)
    setDetectionReady(false)
    setStabilityStartTime(null)
    setDetectedPoints(null)
    setRemainingSeconds(null)
    detectionStartTimeRef.current = null
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

      // IMPORTANT: Always use cropped image for storage and processing
      // The cropped image contains only the ID card frame, not the whole camera view

      console.log('📸 Step 6: Validating Emirates ID with backend API...', { side: captureSide })
      setProcessingMessage('Processing Emirates ID... This may take 30-60 seconds.')
      
      // Validate that the captured image is actually an Emirates ID using backend API
      // Use cropped image for validation
      // Note: OCR process may take 30-60 seconds (DocuPipe needs to upload, process, and extract text)
      const validationResult = await validateEmiratesIDWithBackend(croppedBase64)
      
      // Handle API response according to documentation
      if (!validationResult.success) {
        throw new Error(
          validationResult.error || 
          'Failed to validate Emirates ID. Please try again.'
        )
      }
      
      // Check if it's an Emirates ID
      if (!validationResult.isEmiratesID) {
        // Close modal immediately
        setIsProcessing(false)
        setCurrentSide(null)
        setModalOpen(false)
        setModalSide(null)
        stopAutoDetection()
        
        // Show error toast message
        showToast({
          type: 'error',
          message: validationResult.message || 
            'This does not appear to be an Emirates ID card. Please try again with a valid Emirates ID.',
          duration: 6000
        })
        return // Exit early, don't throw error
      }
      
      // Check if the detected side matches what we're trying to capture
      if (captureSide === 'front' && validationResult.side !== 'front') {
        // Close modal and show error toast
        setIsProcessing(false)
        setCurrentSide(null)
        setModalOpen(false)
        setModalSide(null)
        stopAutoDetection()
        
        showToast({
          type: 'error',
          message: validationResult.message || 
            'Please scan the front side of your Emirates ID. Please try again.',
          duration: 6000
        })
        return
      }
      
      if (captureSide === 'back' && validationResult.side !== 'back') {
        // Close modal and show error toast
        setIsProcessing(false)
        setCurrentSide(null)
        setModalOpen(false)
        setModalSide(null)
        stopAutoDetection()
        
        showToast({
          type: 'error',
          message: validationResult.message || 
            'Please scan the back side of your Emirates ID. Please try again.',
          duration: 6000
        })
        return
      }
      
      console.log('✅ Emirates ID validation passed', { 
        confidence: validationResult.identification?.confidence,
        side: validationResult.side,
        requiresBackSide: validationResult.requiresBackSide
      })

      console.log('📸 Step 7: Storing CROPPED image...', { side: captureSide })
      
      // Store the cropped image
      if (captureSide === 'front') {
        console.log('💾 Storing front CROPPED image...')
        setFrontImage(croppedBase64)
        setEidData({ captured: true, mode: 'BACKEND-OCR' })
        console.log('✅ Front cropped image stored in state')
      } else if (captureSide === 'back') {
        console.log('💾 Storing back CROPPED image...')
        setBackImage(croppedBase64)
        console.log('✅ Back cropped image stored in state')
      }
      
      // If front side detected and back side is required, show message
      if (captureSide === 'front' && validationResult.requiresBackSide) {
        console.log('ℹ️ Front side detected. Back side will be requested next.')
      }

      console.log('🎉 ===== IMAGE CAPTURE COMPLETED SUCCESSFULLY =====')
      console.log('✅ All images stored in state, clearing current side...')
      
      setIsProcessing(false)
      setCurrentSide(null)
      setError(null) // Clear any previous errors
      
      // Close modal immediately after successful capture
      setModalOpen(false)
      setModalSide(null)
      stopAutoDetection()
      
      // Show success toast message
      if (captureSide === 'front') {
        showToast({
          type: 'success',
          message: 'UAE ID Front verified successfully!',
          duration: 5000
        })
        console.log('✅ UAE ID Front verified successfully!')
      } else {
        showToast({
          type: 'success',
          message: 'UAE ID Back verified successfully!',
          duration: 5000
        })
        console.log('✅ UAE ID Back verified successfully!')
      }
    } catch (err) {
      console.error('Auto-capture error:', err)
      // Close modal on error
      setIsProcessing(false)
      setCurrentSide(null)
      setModalOpen(false)
      setModalSide(null)
      stopAutoDetection()
      
      // Show error toast message asking to retry
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to capture document. Please try again.',
        duration: 6000
      })
      
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
    setRemainingSeconds(null)
    
    // Reset capture flag and detection timer when starting new detection
    captureTriggeredRef.current = false
    detectionStartTimeRef.current = null
    if (captureDelayTimeoutRef.current) {
      clearTimeout(captureDelayTimeoutRef.current)
      captureDelayTimeoutRef.current = null
    }

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
          setDetectedPoints(null)
          drawDetection(null, canvasRef.current, videoRef.current, false)
          return
        }

        const { detected, points, blurScore } = result

        // Update blur score
        setLastBlurScore(blurScore)

        // Check if document is detected - very lenient blur check (accept almost any blur if detected)
        // Back side might be harder to detect, so be even more lenient
        const isBackSide = currentSideValue === 'back'
        const blurThreshold = isBackSide ? MIN_BLUR_SCORE * 0.3 : MIN_BLUR_SCORE * 0.5
        const isBlurAcceptable = blurScore >= blurThreshold || blurScore >= 10 // Accept very low blur scores
        
        // Check if card is completely visible
        const cardFullyVisible = videoRef.current && points && points.length >= 4 
          ? isCardFullyVisible(points, videoRef.current)
          : false
        
        if (detected && points && points.length >= 4 && isBlurAcceptable && cardFullyVisible) {
          // Track when card is first detected and fully visible
          const now = Date.now()
          if (detectionStartTimeRef.current === null) {
            detectionStartTimeRef.current = now
            console.log('🔍 Card detected and fully visible - starting 2 second delay...')
          }
          
          // Show detection status
          setDetectedPoints(points)
          drawDetection(points, canvasRef.current, videoRef.current, false)
          
          // Check if 2 seconds have passed since detection
          const timeSinceDetection = now - detectionStartTimeRef.current
          const DELAY_DURATION = 2000 // 2 seconds
          const remainingTime = Math.ceil((DELAY_DURATION - timeSinceDetection) / 1000)
          
          // Update remaining seconds for UI display
          if (remainingTime > 0 && remainingTime <= 2) {
            setRemainingSeconds(remainingTime)
          } else {
            setRemainingSeconds(null)
          }
          
          if (timeSinceDetection >= DELAY_DURATION && !captureTriggeredRef.current) {
            // Set flag immediately to prevent multiple captures
            captureTriggeredRef.current = true
            console.log('🔒 Capture flag set to prevent multiple captures')
            
            // Clear the delay timeout if it exists
            if (captureDelayTimeoutRef.current) {
              clearTimeout(captureDelayTimeoutRef.current)
              captureDelayTimeoutRef.current = null
            }
            
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
              detectionStartTimeRef.current = null
              setIsDetecting(false)
              return
            }
            
            // Capture the points and side in local variables FIRST (before any async operations)
            const pointsToCapture = points.map(p => ({ x: p.x, y: p.y })) // Create deep copy
            const sideToCapture: 'front' | 'back' = currentSideValue // Explicitly type it
            const videoElement = videoRef.current
            
            console.log('🚀 ===== AUTO-CAPTURE TRIGGERED =====')
            console.log('✅ Card detected - capturing after 2 second delay!', { 
              side: sideToCapture, 
              points: pointsToCapture.length,
              videoReady: !!videoElement,
              opencvReady: opencvLoaded,
              sideType: typeof sideToCapture,
              sideValue: sideToCapture
            })
            
            // Validate side one more time before calling capture
            if (sideToCapture !== 'front' && sideToCapture !== 'back') {
              console.error('❌ Side validation failed:', sideToCapture)
              setError('Invalid scan side detected. Please try again.')
              captureTriggeredRef.current = false
              detectionStartTimeRef.current = null
              setIsDetecting(false)
              return
            }
            
            // CRITICAL: Update UI and trigger capture
            setDetectionReady(true)
            setDetectedPoints(points)
            drawDetection(points, canvasRef.current, videoRef.current, true)
            
            // Call capture function after delay
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
                detectionStartTimeRef.current = null
                setIsProcessing(false)
                setDetectionReady(false)
                setError(err instanceof Error ? err.message : 'Capture failed. Please try again.')
              })
            
            return // Exit early to prevent further processing
          } else if (!captureTriggeredRef.current) {
            // Still in delay period - show countdown
            setDetectionReady(false) // Not ready yet, still counting down
            console.log(`⏳ Waiting... ${remainingTime} second(s) remaining`)
          }
        } else {
          // Card not detected, not fully visible, or moved out of frame - reset detection timer
          if (detectionStartTimeRef.current !== null) {
            if (!cardFullyVisible && detected && points && points.length >= 4) {
              console.log('🔄 Card detected but not fully visible - resetting detection timer')
            } else {
              console.log('🔄 Card moved out of frame - resetting detection timer')
            }
            detectionStartTimeRef.current = null
          }
          if (captureDelayTimeoutRef.current) {
            clearTimeout(captureDelayTimeoutRef.current)
            captureDelayTimeoutRef.current = null
          }
          setDetectionReady(false)
          setRemainingSeconds(null)
          setDetectedPoints(null)
          drawDetection(null, canvasRef.current, videoRef.current, false)
        }
        } else {
          // Document not detected or conditions not met - clear detection
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
    
    // Check camera support first
    const supportCheck = checkCameraSupport()
    if (!supportCheck.supported) {
      handleCameraError(new Error(supportCheck.error || 'Camera not supported'))
      return
    }
    
    // Always request permission before starting scan
    const granted = await requestCameraPermission()
    if (!granted) {
      return // Permission denied, keep showing error and upload option
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
    } else if (error instanceof Error || (typeof DOMException !== 'undefined' && (error as any) instanceof DOMException)) {
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
          
          const videoMat = await imageToMat(img)
          const points = findDocumentContour(videoMat)
          
          if (points && points.length >= 4) {
            console.log('✅ Document detected in uploaded image, cropping...')
            const croppedMat = cropDocument(videoMat, points, 800, 500)
            const croppedBase64 = croppedMat ? matToBase64(croppedMat) : null
            if (croppedBase64) {
              croppedImage = croppedBase64
              console.log('✅ ID card frame cropped successfully from uploaded image')
            }
            
            // Clean up
            videoMat.delete()
            if (croppedMat) croppedMat.delete()
          } else {
            console.warn('⚠️ Could not detect document in uploaded image, using full image')
          }
        } catch (cropError) {
          console.warn('⚠️ Cropping failed for uploaded image, using full image:', cropError)
          // Continue with full image as fallback
        }
        
        // Validate that the image is actually an Emirates ID using backend API
        // Note: OCR process may take 30-60 seconds (DocuPipe needs to upload, process, and extract text)
        setProcessingMessage('Processing Emirates ID... This may take 30-60 seconds.')
        const validationResult = await validateEmiratesIDWithBackend(croppedImage)
        
        // Handle API response according to documentation
        if (!validationResult.success) {
          throw new Error(
            validationResult.error || 
            'Failed to validate Emirates ID. Please try again.'
          )
        }
        
        // Check if it's an Emirates ID
        if (!validationResult.isEmiratesID) {
          // Close modal and show error message asking to retry
          setIsProcessing(false)
          setCurrentSide(null)
          setError(
            validationResult.message || 
            'This does not appear to be an Emirates ID card. Please try again with a valid Emirates ID.'
          )
          return // Exit early, don't throw error
        }
        
        // Check if the detected side matches what we're trying to upload
        if (side === 'front' && validationResult.side !== 'front') {
          setIsProcessing(false)
          setCurrentSide(null)
          setError(
            validationResult.message || 
            'Please upload the front side of your Emirates ID. Please try again.'
          )
          return
        }
        
        if (side === 'back' && validationResult.side !== 'back') {
          setIsProcessing(false)
          setCurrentSide(null)
          setError(
            validationResult.message || 
            'Please upload the back side of your Emirates ID. Please try again.'
          )
          return
        }
        
        // Store the cropped image (or full image if cropping failed)
        if (side === 'front') {
          setFrontImage(croppedImage)
          setEidData({ captured: true, mode: 'BACKEND-OCR' })
          console.log('✅ UAE ID Front verified successfully!')
        } else {
          setBackImage(croppedImage)
          console.log('✅ UAE ID Back verified successfully!')
        }
        
        // If front side detected and back side is required, show message
        if (side === 'front' && validationResult.requiresBackSide) {
          console.log('ℹ️ Front side detected. Back side will be requested next.')
        }
        
        setIsProcessing(false)
        setCurrentSide(null)
        setError(null) // Clear any previous errors
        
        // Show success toast message
        if (side === 'front') {
          showToast({
            type: 'success',
            message: 'UAE ID Front verified successfully!',
            duration: 5000
          })
        } else {
          showToast({
            type: 'success',
            message: 'UAE ID Back verified successfully!',
            duration: 5000
          })
        }
      } catch (err) {
        console.error('File processing error:', err)
        setError(err instanceof Error ? err.message : 'Failed to process image')
        setIsProcessing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // Unused - kept for potential future use
  /*
  const _captureImage = useCallback(async () => {
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
  */

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

  const handlePhilippinesIdUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const imageData = reader.result as string
      if (side === 'front') {
        setPhilippinesIdFront(imageData)
      } else {
        setPhilippinesIdBack(imageData)
      }
      setError(null)
    }
    reader.onerror = () => {
      setError('Failed to read image file. Please try again.')
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhilippinesId = (side: 'front' | 'back') => {
    if (side === 'front') {
      setPhilippinesIdFront(null)
    } else {
      setPhilippinesIdBack(null)
    }
  }

  const handleContinue = () => {
    if (frontImage && backImage) {
      const verificationData: Partial<VerificationData> = {
        eidFrontImage: frontImage,
        eidBackImage: backImage,
        eidVerified: true,
      }
      
      // Add Philippines ID images if route is Philippines to UAE
      if (isPhToUae) {
        if (philippinesIdFront && philippinesIdBack) {
          verificationData.philippinesIdFront = philippinesIdFront
          verificationData.philippinesIdBack = philippinesIdBack
        } else {
          setError('Please upload both front and back of your Philippines ID')
          return
        }
      }
      
      onComplete(verificationData)
    } else {
      setError('Please scan both front and back of your Emirates ID')
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
              Step 5 of 6
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Verify Your Identity</h2>
            <h3 className="text-lg sm:text-xl text-gray-600">Emirates ID Scan</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Please scan both sides of your UAE Emirates ID for verification
            </p>
          </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg">
        <h4 className="text-sm sm:text-base font-semibold text-blue-800 mb-2">Instructions:</h4>
        <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
          <li>• Position your Emirates ID card completely within the frame - ensure all edges are visible</li>
          <li>• Ensure good lighting with no glare or shadows</li>
          <li>• Keep the ID flat - it will capture automatically after 2 seconds when fully visible</li>
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
        <div className="space-y-4 sm:space-y-6">
         {/* Front Side */}
         <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
           <div className="flex items-center justify-between mb-3 sm:mb-4">
             <h4 className="text-base sm:text-lg font-semibold text-gray-800">Front of Emirates ID</h4>
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
                className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4 flex-shrink-0" />
                Retake Front
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleOpenScanModal('front')}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 sm:py-4 text-sm sm:text-base lg:text-lg min-h-[48px]"
              >
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden xs:inline">Scan Front of ID (Full Screen)</span>
                <span className="xs:hidden">Scan Front</span>
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
                      <strong>Instructions:</strong> Hold your phone at a comfortable distance (about 30-40cm away) and position your Emirates ID card completely within the centered frame. Make sure the entire card is visible - no edges should be cut off. The system will automatically detect and capture after 2 seconds when the card is fully visible.
                    </p>
                    <p className="text-xs text-blue-700">
                      💡 Tip: Ensure the entire card is visible within the frame with all edges showing. The system will wait 2 seconds before capturing to give you time to position it correctly. Ensure good lighting and hold the card flat.
                    </p>
                  </div>

                  {/* Loading Screen - Show when processing */}
                  {isProcessing ? (
                    <div className="flex-1 bg-gray-50 rounded-lg flex items-center justify-center min-h-[50vh]">
                      <div className="text-center py-8 px-4">
                        <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-600 mx-auto mb-6" />
                        <p className="text-gray-700 text-xl font-semibold mb-2">{processingMessage || 'Processing Emirates ID... This may take 30-60 seconds.'}</p>
                        <p className="text-sm text-gray-500">Please wait, the OCR process is analyzing your document</p>
                      </div>
                    </div>
                  ) : (
                    <>
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
                            onUserMedia={(_stream) => {
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
                              // Request permission again with better error handling
                              requestCameraPermission().catch(() => {
                                // Error already handled in requestCameraPermission
                              })
                            }}
                            forceScreenshotSourceSize={true}
                          />
                          
                          {/* Detection overlay canvas */}
                          <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ zIndex: 10 }}
                          />
                          
                          {/* Guide frame - rectangular frame for easier positioning */}
                          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] sm:w-[80%] md:w-[75%] aspect-[3/2] border-[3px] sm:border-4 border-dashed rounded-lg pointer-events-none transition-all duration-300 ${
                            detectionReady 
                              ? 'border-green-500 bg-green-500 bg-opacity-20 shadow-lg shadow-green-500/50' 
                              : detectedPoints 
                                ? 'border-yellow-400 bg-yellow-400 bg-opacity-10' 
                                : 'border-gray-300'
                          }`} 
                          style={{ 
                            maxWidth: isMobile ? '450px' : '550px',
                            maxHeight: isMobile ? '300px' : '367px'
                          }} />
                          
                          {/* Corner guides for better alignment */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] sm:w-[80%] md:w-[75%] aspect-[3/2] pointer-events-none"
                            style={{ 
                              maxWidth: isMobile ? '450px' : '550px',
                              maxHeight: isMobile ? '300px' : '367px'
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
                                  : detectedPoints 
                                    ? 'bg-yellow-600' 
                                    : 'bg-blue-600'
                              }`}>
                                {detectionReady 
                                  ? '✓ Detected! Capturing...' 
                                  : detectedPoints 
                                    ? remainingSeconds !== null && remainingSeconds > 0
                                      ? `Card detected! Capturing in ${remainingSeconds}...`
                                      : `Card detected! Capturing... ${!isMobile ? `(Blur: ${lastBlurScore.toFixed(0)})` : ''}`
                                    : 'Position ID card completely within the frame'}
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
                    </>
                  )}

                  {/* Cancel button only */}
                  {!isProcessing && !cameraError && opencvLoaded && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={closeScanModal}
                        className="btn-secondary w-full py-3 text-lg min-h-[48px]"
                      >
                        Cancel & Close
                      </button>
                    </div>
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
         <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
           <div className="flex items-center justify-between mb-3 sm:mb-4">
             <h4 className="text-base sm:text-lg font-semibold text-gray-800">Back of Emirates ID</h4>
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
                className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4 flex-shrink-0" />
                Retake Back
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleOpenScanModal('back')}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 sm:py-4 text-sm sm:text-base lg:text-lg min-h-[48px]"
              >
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden xs:inline">Scan Back of ID (Full Screen)</span>
                <span className="xs:hidden">Scan Back</span>
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
                      <strong>Instructions:</strong> Hold your phone at a comfortable distance (about 30-40cm away) and position your Emirates ID card (back side) within the centered frame. The system will automatically detect and capture immediately when the card is recognized.
                    </p>
                    <p className="text-xs text-blue-700">
                      💡 Tip: The system captures automatically as soon as it detects your ID card. Ensure good lighting and hold the card flat within the frame.
                    </p>
                  </div>

                  {/* Loading Screen - Show when processing */}
                  {isProcessing ? (
                    <div className="flex-1 bg-gray-50 rounded-lg flex items-center justify-center min-h-[50vh]">
                      <div className="text-center py-8 px-4">
                        <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-600 mx-auto mb-6" />
                        <p className="text-gray-700 text-xl font-semibold mb-2">{processingMessage || 'Processing Emirates ID... This may take 30-60 seconds.'}</p>
                        <p className="text-sm text-gray-500">Please wait, the OCR process is analyzing your document</p>
                      </div>
                    </div>
                  ) : (
                    <>
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
                            onUserMedia={(_stream) => {
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
                              // Request permission again with better error handling
                              requestCameraPermission().catch(() => {
                                // Error already handled in requestCameraPermission
                              })
                            }}
                            forceScreenshotSourceSize={true}
                          />
                          
                          {/* Detection overlay canvas */}
                          <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ zIndex: 10 }}
                          />
                          
                          {/* Guide frame - rectangular frame for easier positioning */}
                          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] sm:w-[80%] md:w-[75%] aspect-[3/2] border-[3px] sm:border-4 border-dashed rounded-lg pointer-events-none transition-all duration-300 ${
                            detectionReady 
                              ? 'border-green-500 bg-green-500 bg-opacity-20 shadow-lg shadow-green-500/50' 
                              : detectedPoints 
                                ? 'border-yellow-400 bg-yellow-400 bg-opacity-10' 
                                : 'border-gray-300'
                          }`} 
                          style={{ 
                            maxWidth: isMobile ? '450px' : '550px',
                            maxHeight: isMobile ? '300px' : '367px'
                          }} />
                          
                          {/* Corner guides for better alignment */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] sm:w-[80%] md:w-[75%] aspect-[3/2] pointer-events-none"
                            style={{ 
                              maxWidth: isMobile ? '450px' : '550px',
                              maxHeight: isMobile ? '300px' : '367px'
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
                                  : detectedPoints 
                                    ? 'bg-yellow-600' 
                                    : 'bg-blue-600'
                              }`}>
                                {detectionReady 
                                  ? '✓ Detected! Capturing...' 
                                  : detectedPoints 
                                    ? remainingSeconds !== null && remainingSeconds > 0
                                      ? `Card detected! Capturing in ${remainingSeconds}...`
                                      : `Card detected! Capturing... ${!isMobile ? `(Blur: ${lastBlurScore.toFixed(0)})` : ''}`
                                    : 'Position ID card completely within the frame'}
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
                    </>
                  )}

                  {/* Cancel button only */}
                  {!isProcessing && !cameraError && opencvLoaded && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={closeScanModal}
                        className="btn-secondary w-full py-3 text-lg min-h-[48px]"
                      >
                        Cancel & Close
                      </button>
                    </div>
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

      {/* Philippines ID Upload Section - Only show for Philippines to UAE route */}
      {isPhToUae && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 sm:p-4 lg:p-6">
            <h3 className="text-base sm:text-lg font-bold text-blue-800 mb-2">Philippines ID Upload</h3>
            <p className="text-xs sm:text-sm text-blue-700 mb-3 sm:mb-4">
              Please upload clear photos of both sides of your Philippines ID document.
            </p>

            {/* Front of Philippines ID */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="text-base sm:text-lg font-semibold text-gray-800">Front of Philippines ID</h4>
                {philippinesIdFront && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>

              {philippinesIdFront ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                    <img
                      src={philippinesIdFront}
                      alt="Philippines ID Front"
                      className="w-full h-auto max-h-64 sm:max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhilippinesId('front')}
                    className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
                  >
                    <RotateCcw className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden xs:inline">Remove & Re-upload Front</span>
                    <span className="xs:hidden">Re-upload Front</span>
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhilippinesIdUpload(e, 'front')}
                      className="hidden"
                    />
                    <span className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-6">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="text-sm sm:text-base">Upload Front of Philippines ID</span>
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Accepted formats: JPG, PNG, etc.</p>
                </div>
              )}
            </div>

            {/* Back of Philippines ID */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="text-base sm:text-lg font-semibold text-gray-800">Back of Philippines ID</h4>
                {philippinesIdBack && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>

              {philippinesIdBack ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                    <img
                      src={philippinesIdBack}
                      alt="Philippines ID Back"
                      className="w-full h-auto max-h-64 sm:max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhilippinesId('back')}
                    className="btn-secondary flex items-center justify-center gap-2 w-full min-h-[44px]"
                  >
                    <RotateCcw className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden xs:inline">Remove & Re-upload Back</span>
                    <span className="xs:hidden">Re-upload Back</span>
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhilippinesIdUpload(e, 'back')}
                      className="hidden"
                    />
                    <span className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-6">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="text-sm sm:text-base">Upload Back of Philippines ID</span>
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Accepted formats: JPG, PNG, etc.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Success details intentionally hidden per requirement */}

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
            
            <button
              type="button"
              onClick={handleContinue}
              disabled={!frontImage || !backImage || (isPhToUae && (!philippinesIdFront || !philippinesIdBack))}
              className="btn-primary flex-1 min-h-[48px] flex items-center justify-center gap-2"
            >
              <span>Proceed to Face Scan</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 hidden sm:inline" />
              <span className="sm:hidden">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

