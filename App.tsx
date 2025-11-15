import { useState, useEffect } from 'react'
import { BookingFormData, VerificationData, Step, ItemDeclaration } from './types'
import Header from './components/Header'
import LandingPage from './components/LandingPage'
import ServiceSelection from './components/ServiceSelection'
import Step1BookingForm from './components/Step1BookingForm'
import ReceiverDetailsForm from './components/ReceiverDetailsForm'
import CommoditiesDeclaration from './components/CommoditiesDeclaration'
import Step2EmiratesIDScan from './components/Step2EmiratesIDScan'
import Step3FaceScan from './components/Step3FaceScan'
import BookingConfirmation from './components/BookingConfirmation'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer, { showToast } from './components/ToastContainer'
import { generateBookingPDF } from './utils/pdfGenerator'

// Generate unique session ID per device
const getSessionId = (): string => {
  const SESSION_ID_KEY = 'booking_deviceSessionId'
  
  let sessionId = localStorage.getItem(SESSION_ID_KEY)
  
  if (!sessionId) {
    const deviceFingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|')
    
    const hash = deviceFingerprint.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0)
    
    sessionId = `device_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  
  return sessionId
}

const SESSION_ID = getSessionId()

// localStorage keys with session prefix to separate data per device/session
const getStorageKey = (baseKey: string): string => {
  return `booking_${SESSION_ID}_${baseKey}`
}

const STORAGE_KEYS = {
  CURRENT_STEP: 'currentStep',
  SELECTED_SERVICE: 'selectedService',
  BOOKING_DATA: 'data',
  VERIFICATION_DATA: 'verificationData',
  // Separate keys for images to handle storage limits
  EID_FRONT_IMAGE: 'eidFrontImage',
  EID_BACK_IMAGE: 'eidBackImage',
  PHILIPPINES_ID_FRONT_IMAGE: 'philippinesIdFrontImage',
  PHILIPPINES_ID_BACK_IMAGE: 'philippinesIdBackImage',
  FACE_IMAGE: 'faceImage',
  FACE_IMAGES: 'faceImages',
}

// Helper function to save image to localStorage with error handling
const saveImageToStorage = (key: string, imageData: string | null) => {
  try {
    const fullKey = getStorageKey(key)
    if (imageData) {
      // Try to save image, but handle quota exceeded errors gracefully
      localStorage.setItem(fullKey, imageData)
    } else {
      localStorage.removeItem(fullKey)
    }
  } catch (error: any) {
    // If storage is full, try to clear old data or just log the error
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn(`⚠️ Storage quota exceeded for ${key}. Image will not persist across refreshes.`)
      // Try to free up space by removing oldest images
      try {
        localStorage.removeItem(getStorageKey(STORAGE_KEYS.FACE_IMAGES))
        localStorage.setItem(fullKey, imageData!)
      } catch (retryError) {
        console.error(`❌ Could not save ${key} even after cleanup:`, retryError)
      }
    } else {
      console.error(`Error saving image ${key} to localStorage:`, error)
    }
  }
}

// Helper function to load image from localStorage
const loadImageFromStorage = (key: string): string | null => {
  try {
    const fullKey = getStorageKey(key)
    return localStorage.getItem(fullKey)
  } catch (error) {
    console.error(`Error loading image ${key} from localStorage:`, error)
    return null
  }
}

// Helper functions for localStorage with session-specific keys
const saveToStorage = (key: string, value: any) => {
  try {
    const fullKey = getStorageKey(key)
    // Save images separately to handle storage limits
    if (key === STORAGE_KEYS.VERIFICATION_DATA && value) {
      const { 
        eidFrontImage, 
        eidBackImage, 
        philippinesIdFrontImage, 
        philippinesIdBackImage, 
        faceImage, 
        faceImages, 
        ...dataWithoutImages 
      } = value
      
      // Save non-image data
      localStorage.setItem(fullKey, JSON.stringify(dataWithoutImages))
      
      // Save images separately
      saveImageToStorage(STORAGE_KEYS.EID_FRONT_IMAGE, eidFrontImage || null)
      saveImageToStorage(STORAGE_KEYS.EID_BACK_IMAGE, eidBackImage || null)
      saveImageToStorage(STORAGE_KEYS.PHILIPPINES_ID_FRONT_IMAGE, philippinesIdFrontImage || null)
      saveImageToStorage(STORAGE_KEYS.PHILIPPINES_ID_BACK_IMAGE, philippinesIdBackImage || null)
      saveImageToStorage(STORAGE_KEYS.FACE_IMAGE, faceImage || null)
      
      // Save faceImages array
      if (faceImages && Array.isArray(faceImages) && faceImages.length > 0) {
        try {
          const fullKey = getStorageKey(STORAGE_KEYS.FACE_IMAGES)
          localStorage.setItem(fullKey, JSON.stringify(faceImages))
        } catch (error: any) {
          if (error.name === 'QuotaExceededError') {
            console.warn('⚠️ Could not save faceImages array, storage full')
          }
        }
      } else {
        localStorage.removeItem(getStorageKey(STORAGE_KEYS.FACE_IMAGES))
      }
    } else if (key === STORAGE_KEYS.BOOKING_DATA && value) {
      // Booking data doesn't contain images, but keep this for safety
      const { eidFrontImage, eidBackImage, philippinesIdFrontImage, philippinesIdBackImage, customerImage, customerImages, ...dataWithoutImages } = value
      localStorage.setItem(fullKey, JSON.stringify(dataWithoutImages))
    } else {
      localStorage.setItem(fullKey, JSON.stringify(value))
    }
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

const loadFromStorage = (key: string) => {
  try {
    const fullKey = getStorageKey(key)
    const item = localStorage.getItem(fullKey)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error('Error loading from localStorage:', error)
    return null
  }
}

// Load verification data with images
const loadVerificationDataFromStorage = (): VerificationData => {
  try {
    const baseData = loadFromStorage(STORAGE_KEYS.VERIFICATION_DATA) || {
      eidVerified: false,
      faceVerified: false,
    }
    
    // Load images separately
    const eidFrontImage = loadImageFromStorage(STORAGE_KEYS.EID_FRONT_IMAGE)
    const eidBackImage = loadImageFromStorage(STORAGE_KEYS.EID_BACK_IMAGE)
    const philippinesIdFrontImage = loadImageFromStorage(STORAGE_KEYS.PHILIPPINES_ID_FRONT_IMAGE)
    const philippinesIdBackImage = loadImageFromStorage(STORAGE_KEYS.PHILIPPINES_ID_BACK_IMAGE)
    const faceImage = loadImageFromStorage(STORAGE_KEYS.FACE_IMAGE)
    
    // Load faceImages array
    let faceImages: string[] = []
    try {
      const faceImagesData = loadFromStorage(STORAGE_KEYS.FACE_IMAGES)
      if (Array.isArray(faceImagesData)) {
        faceImages = faceImagesData
      }
    } catch (error) {
      console.warn('Could not load faceImages array:', error)
    }
    
    return {
      ...baseData,
      eidFrontImage: eidFrontImage || undefined,
      eidBackImage: eidBackImage || undefined,
      philippinesIdFrontImage: philippinesIdFrontImage || undefined,
      philippinesIdBackImage: philippinesIdBackImage || undefined,
      faceImage: faceImage || undefined,
      faceImages: faceImages.length > 0 ? faceImages : undefined,
    }
  } catch (error) {
    console.error('Error loading verification data:', error)
    return {
      eidVerified: false,
      faceVerified: false,
    }
  }
}

const clearStorage = () => {
  try {
    // Clear all storage keys including image keys
    const allKeys = [
      STORAGE_KEYS.CURRENT_STEP,
      STORAGE_KEYS.SELECTED_SERVICE,
      STORAGE_KEYS.BOOKING_DATA,
      STORAGE_KEYS.VERIFICATION_DATA,
      STORAGE_KEYS.EID_FRONT_IMAGE,
      STORAGE_KEYS.EID_BACK_IMAGE,
      STORAGE_KEYS.PHILIPPINES_ID_FRONT_IMAGE,
      STORAGE_KEYS.PHILIPPINES_ID_BACK_IMAGE,
      STORAGE_KEYS.FACE_IMAGE,
      STORAGE_KEYS.FACE_IMAGES,
    ]
    
    allKeys.forEach(key => {
      const fullKey = getStorageKey(key)
      localStorage.removeItem(fullKey)
    })
  } catch (error) {
    console.error('Error clearing localStorage:', error)
  }
}

function App() {
  // Load initial state from localStorage
  const [currentStep, setCurrentStep] = useState<Step>(() => {
    const saved = loadFromStorage(STORAGE_KEYS.CURRENT_STEP)
    return saved !== null ? (saved as Step) : (-1 as Step)
  })
  const [selectedService, setSelectedService] = useState<string | null>(() => {
    return loadFromStorage(STORAGE_KEYS.SELECTED_SERVICE)
  })
  const [bookingData, setBookingData] = useState<BookingFormData | null>(() => {
    return loadFromStorage(STORAGE_KEYS.BOOKING_DATA)
  })
  const [verificationData, setVerificationData] = useState<VerificationData>(() => {
    return loadVerificationDataFromStorage()
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (currentStep !== -1) {
      saveToStorage(STORAGE_KEYS.CURRENT_STEP, currentStep)
    }
  }, [currentStep])

  useEffect(() => {
    if (selectedService) {
      saveToStorage(STORAGE_KEYS.SELECTED_SERVICE, selectedService)
    } else {
      localStorage.removeItem(getStorageKey(STORAGE_KEYS.SELECTED_SERVICE))
    }
  }, [selectedService])

  useEffect(() => {
    if (bookingData) {
      saveToStorage(STORAGE_KEYS.BOOKING_DATA, bookingData)
    } else {
      localStorage.removeItem(getStorageKey(STORAGE_KEYS.BOOKING_DATA))
    }
  }, [bookingData])

  useEffect(() => {
    if (verificationData && (verificationData.eidVerified || verificationData.faceVerified || Object.keys(verificationData).length > 2)) {
      saveToStorage(STORAGE_KEYS.VERIFICATION_DATA, verificationData)
    }
  }, [verificationData])

  const handleBookShipment = () => {
    setCurrentStep(0) // Go to route selection
  }

  const handleServiceSelection = (service: string) => {
    setSelectedService(service)
    setCurrentStep(1) // Go to sender details form
  }

  const handleSenderDetailsNext = (senderData: Partial<BookingFormData>) => {
    const updatedData = {
      ...bookingData,
      ...senderData,
      service: selectedService || senderData.service || 'uae-to-pinas'
    } as BookingFormData
    setBookingData(updatedData)
    setCurrentStep(2) // Go to receiver details form
  }

  const handleReceiverDetailsNext = (receiverData: Partial<BookingFormData>) => {
    const updatedData = {
      ...bookingData,
      ...receiverData,
      service: selectedService || bookingData?.service || 'uae-to-pinas',
      items: bookingData?.items || []
    } as BookingFormData
    setBookingData(updatedData)
    setCurrentStep(3) // Go to Commodities Declaration
  }

  const handleCommoditiesNext = (items: ItemDeclaration[]) => {
    const updatedData = {
      ...bookingData,
      items
    } as BookingFormData
    setBookingData(updatedData)
    setCurrentStep(5) // Go directly to Emirates ID Scan (skipping Additional Details)
  }

  const handleStep2Complete = (eidData: Partial<VerificationData>) => {
    console.log('📸 Step2 Complete - Received EID data:', {
      hasEidFront: !!eidData.eidFrontImage,
      hasEidBack: !!eidData.eidBackImage,
      hasPhilippinesIdFront: !!eidData.philippinesIdFrontImage,
      hasPhilippinesIdBack: !!eidData.philippinesIdBackImage,
      keys: Object.keys(eidData)
    })
    const updatedData = { 
      ...verificationData, 
      ...eidData, 
      eidVerified: true 
    }
    console.log('📸 Updated verificationData:', {
      hasEidFront: !!updatedData.eidFrontImage,
      hasEidBack: !!updatedData.eidBackImage,
      hasPhilippinesIdFront: !!updatedData.philippinesIdFrontImage,
      hasPhilippinesIdBack: !!updatedData.philippinesIdBackImage
    })
    setVerificationData(updatedData)
    setCurrentStep(6) // Go to Face Scan
  }

  const handleStep3Complete = (faceData: Partial<VerificationData>) => {
    console.log('📸 Step3 Complete - Received Face data:', {
      hasFaceImage: !!faceData.faceImage,
      faceImagesCount: faceData.faceImages?.length || 0,
      keys: Object.keys(faceData)
    })
    const updatedData = { 
      ...verificationData, 
      ...faceData, 
      faceVerified: true 
    }
    console.log('📸 Updated verificationData with face:', {
      hasFaceImage: !!updatedData.faceImage,
      faceImagesCount: updatedData.faceImages?.length || 0,
      hasEidFront: !!updatedData.eidFrontImage,
      hasEidBack: !!updatedData.eidBackImage
    })
    setVerificationData(updatedData)
    setCurrentStep(7) // Go to Terms & Submission
  }

  const handleFinalSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) {
      return
    }

    // Validate that all required data is present
    if (!bookingData) {
      showToast({
        type: 'error',
        message: 'Booking data is missing. Please start over.',
        duration: 6000,
      })
      return
    }

    if (!bookingData.sender || !bookingData.receiver || !bookingData.items || bookingData.items.length === 0) {
      showToast({
        type: 'error',
        message: 'Please complete all required fields: sender, receiver, and items.',
        duration: 6000,
      })
      return
    }

    // Set loading state
    setIsSubmitting(true)

    // Log current verification data to see what we have
    console.log('📸 Current verificationData:', {
      hasEidFront: !!verificationData.eidFrontImage,
      hasEidBack: !!verificationData.eidBackImage,
      hasPhilippinesIdFront: !!verificationData.philippinesIdFrontImage,
      hasPhilippinesIdBack: !!verificationData.philippinesIdBackImage,
      hasFaceImage: !!verificationData.faceImage,
      faceImagesCount: verificationData.faceImages?.length || 0,
      eidVerified: verificationData.eidVerified,
      faceVerified: verificationData.faceVerified,
      allKeys: Object.keys(verificationData)
    })

    // Prepare final data with all information including images
    // Get images from verificationData state (they should be there if captured)
    const finalData = {
      service: selectedService || bookingData.service || 'uae-to-pinas',
      sender: bookingData.sender,
      receiver: bookingData.receiver,
      items: bookingData.items,
      // Identity documents - get from verificationData state
      eidFrontImage: verificationData.eidFrontImage || null,
      eidBackImage: verificationData.eidBackImage || null,
      philippinesIdFrontImage: verificationData.philippinesIdFrontImage || null,
      philippinesIdBackImage: verificationData.philippinesIdBackImage || null,
      // Face scan images - get from verificationData state
      customerImage: verificationData.faceImage || null,
      customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []),
      // Additional data
      termsAccepted: true,
      submissionTimestamp: new Date().toISOString(),
    }
    
    try {
      console.log('📤 ===== SUBMITTING BOOKING =====')
      console.log('📤 Service:', finalData.service)
      console.log('📤 Sender:', finalData.sender?.firstName, finalData.sender?.lastName)
      console.log('📤 Receiver:', finalData.receiver?.firstName, finalData.receiver?.lastName)
      console.log('📤 Items count:', finalData.items?.length || 0)
      console.log('📤 Has EID images:', !!finalData.eidFrontImage, !!finalData.eidBackImage)
      console.log('📤 Has Philippines ID:', !!finalData.philippinesIdFrontImage, !!finalData.philippinesIdBackImage)
      console.log('📤 Face images count:', finalData.customerImages?.length || 0)
      
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalData)
      })
      
      console.log('📥 Response status:', response.status, response.statusText)
      
      const result = await response.json()
      console.log('📥 Response data:', result)
      
      if (response.ok && result.success) {
        // Clear localStorage after successful submission
        clearStorage()
        
        // Show success toast with print option
        showToast({
          type: 'success',
          message: 'Thank you! Your booking has been successfully submitted.',
          referenceNumber: result.referenceNumber,
          onPrint: async () => {
            try {
              await generateBookingPDF({
                referenceNumber: result.referenceNumber,
                bookingId: result.bookingId,
                service: finalData.service,
                sender: finalData.sender,
                receiver: finalData.receiver,
                items: finalData.items,
                eidFrontImage: verificationData.eidFrontImage,
                eidBackImage: verificationData.eidBackImage,
                philippinesIdFrontImage: verificationData.philippinesIdFrontImage,
                philippinesIdBackImage: verificationData.philippinesIdBackImage,
                customerImage: verificationData.faceImage,
                customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []),
                submissionTimestamp: finalData.submissionTimestamp,
              }, { openInNewTab: true })
            } catch (error) {
              showToast({
                type: 'error',
                message: 'Failed to generate PDF. Please try again.',
                duration: 5000,
              })
            }
          },
          duration: 8000,
        })

        // After toast duration, reset flow back to landing page
        setTimeout(() => {
          setSelectedService(null)
          setBookingData(null)
          setVerificationData({ eidVerified: false, faceVerified: false })
          setCurrentStep(-1 as Step)
        }, 8200)
      } else {
        // Handle error response
        const errorMessage = result.error || 'Failed to submit booking. Please try again.'
        showToast({
          type: 'error',
          message: errorMessage,
          duration: 8000,
        })
        setIsSubmitting(false) // Reset loading state on error
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      showToast({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
        duration: 6000,
      })
      setIsSubmitting(false) // Reset loading state on error
    }
  }

  const handleBack = () => {
    // Going back logic
    if (currentStep === 7) {
      setCurrentStep(6) // From terms back to face scan
    } else if (currentStep === 6) {
      setCurrentStep(5) // From face scan back to EID scan
    } else if (currentStep === 5) {
      setCurrentStep(3) // From EID scan back to commodities declaration (skipping Additional Details)
    } else if (currentStep === 3) {
      setCurrentStep(2) // From commodities declaration back to receiver details
    } else if (currentStep === 2) {
      setCurrentStep(1) // From receiver details back to sender details
    } else if (currentStep === 1) {
      setCurrentStep(0 as Step) // From sender details back to service selection
    } else if (currentStep === 0) {
      setCurrentStep(-1 as Step) // From service selection back to landing page
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <ToastContainer />
      <Header onBookNow={currentStep === -1 ? undefined : handleBookShipment} />
      {currentStep === -1 ? (
        <ErrorBoundary>
          <LandingPage onBookShipment={handleBookShipment} />
        </ErrorBoundary>
      ) : (
        <div className="flex-1 py-4 sm:py-8 px-2 sm:px-4">
          <div className="max-w-7xl mx-auto">
            
            {/* Progress Indicator - Only show after route selection */}
            {currentStep > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-3">
                    {/* Step 1-2: Booking Forms (Sender + Receiver) */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 1 || currentStep === 2 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 2 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 2 ? '✓' : '1'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 1 || currentStep === 2 ? 'text-primary-600' : 
                        currentStep > 2 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        Booking Details
                      </span>
                    </div>
                    <div className="w-12 sm:w-16 h-0.5 bg-gray-300"></div>
                    
                    {/* Step 3: Commodities */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 3 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 3 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 3 ? '✓' : '2'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 3 ? 'text-primary-600' : 
                        currentStep > 3 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        Items
                      </span>
                    </div>
                    <div className="w-12 sm:w-16 h-0.5 bg-gray-300"></div>
                    
                    {/* Step 5: ID Scan */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 5 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 5 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 5 ? '✓' : '3'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 5 ? 'text-primary-600' : 
                        currentStep > 5 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        ID Scan
                      </span>
                    </div>
                    <div className="w-12 sm:w-16 h-0.5 bg-gray-300"></div>
                    
                    {/* Step 6: Face Scan */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 6 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 6 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 6 ? '✓' : '4'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 6 ? 'text-primary-600' : 
                        currentStep > 6 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        Face Scan
                      </span>
                    </div>
                    <div className="w-12 sm:w-16 h-0.5 bg-gray-300"></div>
                    
                    {/* Step 7: Review */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 7 ? 'border-primary-600 bg-primary-600 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        5
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 7 ? 'text-primary-600' : 
                        'text-gray-400'
                      }`}>
                        Review
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Render current step component */}
            {currentStep === 0 && (
              <ErrorBoundary>
                <ServiceSelection 
                  onSelectService={handleServiceSelection} 
                  onBack={handleBack}
                />
              </ErrorBoundary>
            )}
            
            {currentStep === 1 && (
              <ErrorBoundary>
                <Step1BookingForm 
                  onNext={handleSenderDetailsNext}
                  onBack={handleBack}
                  initialData={bookingData}
                  service={selectedService}
                />
              </ErrorBoundary>
            )}
            
            {currentStep === 2 && (
              <ErrorBoundary>
                <ReceiverDetailsForm 
                  onNext={handleReceiverDetailsNext}
                  onBack={handleBack}
                  initialData={bookingData}
                  service={selectedService}
                />
              </ErrorBoundary>
            )}
            
            {currentStep === 3 && (
              <ErrorBoundary>
                <CommoditiesDeclaration 
                  onNext={handleCommoditiesNext}
                  onBack={handleBack}
                  initialData={bookingData}
                />
              </ErrorBoundary>
            )}
            
            {currentStep === 5 && (
              <ErrorBoundary>
                <Step2EmiratesIDScan 
                  onComplete={handleStep2Complete}
                  onBack={handleBack}
                  service={selectedService}
                />
              </ErrorBoundary>
            )}
            
            {currentStep === 6 && (
              <ErrorBoundary>
                <Step3FaceScan 
                  onComplete={handleStep3Complete}
                  onBack={handleBack}
                  eidImage={verificationData.eidFrontImage}
                  eidBackImage={verificationData.eidBackImage}
                  service={selectedService}
                />
              </ErrorBoundary>
            )}
            
            {currentStep === 7 && (
              <ErrorBoundary>
                <BookingConfirmation 
                  onSubmit={handleFinalSubmit}
                  onBack={handleBack}
                  initialData={bookingData}
                  service={selectedService}
                  isSubmitting={isSubmitting}
                />
              </ErrorBoundary>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
