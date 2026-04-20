import { useState, useEffect } from 'react'
import { BookingFormData, VerificationData, Step, ItemDeclaration } from './types'
import Header from './components/Header'
import Footer from './components/Footer'
import ServiceSelection from './components/ServiceSelection'
import Step1BookingForm from './components/Step1BookingForm'
import ReceiverDetailsForm from './components/ReceiverDetailsForm'
import CommoditiesDeclaration from './components/CommoditiesDeclaration'
import Step2EmiratesIDScan from './components/Step2EmiratesIDScan'
import Step3FaceScan from './components/Step3FaceScan'
import StepOTPVerification from './components/StepOTPVerification'
import BookingConfirmation from './components/BookingConfirmation'
import ToastContainer, { showToast } from './components/ToastContainer'
import { generateBookingPDF } from './utils/pdfGenerator'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingOverlay from './components/LoadingOverlay'
import { API_CONFIG } from './config/api.config'
import { CheckCircle, Printer } from 'lucide-react'
import PrivacyPolicyPage from './components/PrivacyPolicyPage'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname.toLowerCase())
  const isPrivacyPolicyRoute = currentPath === '/privacypolicy'

  const [currentStep, setCurrentStep] = useState<Step>(0 as Step) // Start at 0 for service selection
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState<BookingFormData | null>(null)
  const [verificationData, setVerificationData] = useState<VerificationData>({
    eidVerified: false,
    faceVerified: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Loading...')
  const [showBookingSuccessPopup, setShowBookingSuccessPopup] = useState(false)
  const [bookingSuccessData, setBookingSuccessData] = useState<{
    referenceNumber: string;
    bookingId: string;
    awb?: string;
  } | null>(null)
  const [otpData, setOtpData] = useState<{
    phoneNumber: string;
    otp: string;
  } | null>(null)

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  useEffect(() => {
    const syncPath = () => setCurrentPath(window.location.pathname.toLowerCase())
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  const navigateToStep = (step: Step, message: string = 'Loading...') => {
    setIsLoading(true)
    setLoadingMessage(message)
    // Small delay to show loading animation, then navigate
    setTimeout(() => {
      setCurrentStep(step)
      // Hide loading after a brief moment to allow component to render
      setTimeout(() => {
        setIsLoading(false)
      }, 100)
    }, 300)
  }

  const handleServiceSelection = (service: string) => {
    setSelectedService(service)
    navigateToStep(1, 'Loading sender details form...')
  }

  const handleSenderDetailsNext = (senderData: Partial<BookingFormData>) => {
    setBookingData(prev => ({
      ...prev,
      ...senderData,
      service: selectedService || senderData.service || 'uae-to-pinas'
    } as BookingFormData))
    navigateToStep(2, 'Loading receiver details form...')
  }

  const handleReceiverDetailsNext = (receiverData: Partial<BookingFormData>) => {
    setBookingData(prev => ({
      ...prev,
      ...receiverData,
      service: selectedService || prev?.service || 'uae-to-pinas',
      items: prev?.items || []
    } as BookingFormData))
    navigateToStep(3, 'Loading commodities declaration...')
  }

  const handleCommoditiesNext = (items: ItemDeclaration[]) => {
    setBookingData(prev => ({
      ...prev,
      items
    } as BookingFormData))
    navigateToStep(5, 'Preparing ID scan...')
  }

  const handleStep2Complete = (eidData: Partial<VerificationData>) => {
    setVerificationData(prev => ({ ...prev, ...eidData, eidVerified: true }))
    navigateToStep(6, 'Preparing face scan...')
  }

  const handleStep3Complete = (faceData: Partial<VerificationData>) => {
    setVerificationData(prev => ({ ...prev, ...faceData, faceVerified: true }))
    navigateToStep(6.5 as Step, 'Preparing OTP verification...')
  }

  const handleOTPComplete = (otpData: { phoneNumber: string; otp: string }) => {
    setOtpData(otpData)
    
    // If we have booking data, proceed to confirmation
    // Otherwise, this is a test from landing page - just show success message
    if (bookingData) {
    navigateToStep(7, 'Loading confirmation...')
    } else {
      // Test mode - show success and reset
      showToast({
        type: 'success',
        message: `OTP verified successfully! Phone: ${otpData.phoneNumber}`,
        duration: 5000,
      })
      // Reset and go back to service selection after a delay
      setTimeout(() => {
        setOtpData(null)
        setCurrentStep(0 as Step)
      }, 2000)
    }
  }

  const handleFinalSubmit = async () => {
    setIsLoading(true)
    setLoadingMessage('Submitting your booking...')
    
    // Determine service route
    const serviceRoute = (selectedService || 'uae-to-pinas').toLowerCase()
    const isPhToUae = serviceRoute === 'ph-to-uae'
    
    // Get the appropriate name based on service route
    // UAE to Philippines: Use Sender's name
    // Philippines to UAE: Use Receiver's name
    const eidFrontImageFirstName = isPhToUae 
      ? bookingData?.receiver?.firstName 
      : bookingData?.sender?.firstName
    const eidFrontImageLastName = isPhToUae 
      ? bookingData?.receiver?.lastName 
      : bookingData?.sender?.lastName
    
    // Validate required data before submission
    if (!bookingData) {
      setIsLoading(false)
      showToast({
        type: 'error',
        message: 'Booking data is missing. Please complete all steps.',
        duration: 5000,
      })
      return
    }
    
    if (!bookingData.sender || !bookingData.receiver) {
      setIsLoading(false)
      showToast({
        type: 'error',
        message: 'Sender or receiver information is missing. Please complete all form steps.',
        duration: 5000,
      })
      return
    }
    
    if (!verificationData.eidFrontImage) {
      setIsLoading(false)
      showToast({
        type: 'error',
        message: 'Emirates ID front image is required. Please complete the ID scan step.',
        duration: 5000,
      })
      return
    }
    
    if (!verificationData.faceImage && (!verificationData.faceImages || verificationData.faceImages.length === 0)) {
      setIsLoading(false)
      showToast({
        type: 'error',
        message: 'Face image is required. Please complete the face scan step.',
        duration: 5000,
      })
      return
    }
    
    if (!otpData?.phoneNumber || !otpData?.otp) {
      setIsLoading(false)
      showToast({
        type: 'error',
        message: 'OTP verification is required. Please complete the OTP verification step.',
        duration: 5000,
      })
      return
    }
    
    const finalData = {
      ...bookingData,
      service: selectedService || 'uae-to-pinas',
      eidFrontImage: verificationData.eidFrontImage,
      eidFrontImageFirstName: eidFrontImageFirstName, // First name of person whose EID is being sent
      eidFrontImageLastName: eidFrontImageLastName, // Last name of person whose EID is being sent
      eidBackImage: verificationData.eidBackImage,
      philippinesIdFront: verificationData.philippinesIdFront, // Philippines ID Front (for Philippines to UAE route)
      philippinesIdBack: verificationData.philippinesIdBack, // Philippines ID Back (for Philippines to UAE route)
      customerImage: verificationData.faceImage, // Keep for backward compatibility (first image)
      customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []), // All face images
      termsAccepted: true,
      submissionTimestamp: new Date().toISOString(),
      // OTP fields
      otpPhoneNumber: otpData.phoneNumber,
      otp: otpData.otp,
    }
    
    // Check if API URL is configured correctly
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    const isLocalhostUrl = API_CONFIG.baseUrl.includes('localhost') || API_CONFIG.baseUrl.includes('127.0.0.1')
    
    if (isProduction && isLocalhostUrl) {
      setIsLoading(false)
      showToast({
        type: 'error',
        message: 'API configuration error: VITE_API_BASE_URL environment variable is not set in Vercel. Please configure it in Vercel Dashboard → Settings → Environment Variables.',
        duration: 8000,
      })
      return
    }
    
    try {
      // Call API endpoint to save booking
      const apiUrl = `${API_CONFIG.baseUrl}/api/bookings`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      })
      
      // Check if response is ok (status 200-299)
      if (!response.ok) {
        let errorText = ''
        let errorData: any = null
        
        try {
          // Try to parse as JSON first
          errorText = await response.text()
          if (errorText) {
            try {
              errorData = JSON.parse(errorText)
            } catch {
              // Not JSON, use as plain text
            }
          }
          } catch {
            // Error reading error response
          }
        
        setIsLoading(false)
        
        let errorMessage = `Failed to submit booking (${response.status} ${response.statusText})`
        
        // Provide specific error messages based on status code
        if (response.status === 400) {
          // 400 Bad Request - usually validation errors
          if (errorData?.error) {
            errorMessage = `Validation Error: ${errorData.error}`
          } else if (errorData?.message) {
            errorMessage = `Validation Error: ${errorData.message}`
          } else if (errorText) {
            errorMessage = `Validation Error: ${errorText.substring(0, 200)}`
          } else {
            errorMessage = `Bad Request (400): The server rejected the booking data. Please check the browser console for details.`
          }
        } else if (response.status === 404) {
          errorMessage = `API endpoint not found. Please check if the API URL is correct: ${apiUrl}. Make sure VITE_API_BASE_URL is set in Vercel environment variables.`
        } else if (response.status === 0 || response.status === 500) {
          errorMessage = `Cannot connect to backend API at ${apiUrl}. Please check: 1) Backend server is running, 2) CORS is enabled, 3) VITE_API_BASE_URL is set correctly in Vercel.`
        } else if (errorData?.error || errorData?.message) {
          errorMessage = errorData.error || errorData.message
        }
        
        showToast({
          type: 'error',
          message: errorMessage,
          duration: 8000,
        })
        return
      }
      
      const result = await response.json()
      
      setIsLoading(false)
      
      if (result.success) {
        // Show success popup with print option
        setBookingSuccessData({
                referenceNumber: result.referenceNumber,
                bookingId: result.bookingId,
                awb: result.booking?.awb || result.awb,
        })
        setShowBookingSuccessPopup(true)
      } else {
        // Check if it's an OTP-related error
        const errorMessage = result.error || ''
        const isOTPError = errorMessage.toLowerCase().includes('otp') || 
                          errorMessage.toLowerCase().includes('expired') ||
                          errorMessage.toLowerCase().includes('invalid') ||
                          errorMessage.toLowerCase().includes('attempts')
        
        if (isOTPError) {
          // Go back to OTP step for OTP-related errors
              showToast({
                type: 'error',
            message: errorMessage,
            duration: 5000,
              })
          // Reset OTP data and go back to OTP step
          setOtpData(null)
          navigateToStep(6.5 as Step, 'Please verify OTP again...')
      } else {
        showToast({
          type: 'error',
            message: `Failed to submit booking: ${errorMessage}`,
          duration: 5000,
        })
        }
      }
    } catch (error) {
      setIsLoading(false)
      
      let errorMessage = 'Network error. Please check your connection and try again.'
      
      if (error instanceof TypeError) {
        const msg = error.message.toLowerCase()
        if (msg.includes('failed to fetch') || msg.includes('load failed') || msg.includes('networkerror')) {
          const isHttps = window.location.protocol === 'https:'
          const isLocalhostApi = API_CONFIG.baseUrl.includes('localhost') || API_CONFIG.baseUrl.includes('127.0.0.1')
          
          if (isHttps && isLocalhostApi) {
            errorMessage = `Cannot connect to backend API. You're accessing the site via HTTPS, but trying to connect to HTTP localhost. This is blocked by browser security. Please set VITE_API_BASE_URL to your backend's public HTTPS URL in Vercel environment variables.`
          } else {
            errorMessage = `Cannot connect to backend API at ${API_CONFIG.baseUrl}. Please check: 1) Backend server is running, 2) CORS is enabled, 3) VITE_API_BASE_URL is set correctly in Vercel Dashboard → Settings → Environment Variables.`
          }
        } else {
          errorMessage = `Network error: ${error.message}. Please check if the API URL is correct: ${API_CONFIG.baseUrl}`
        }
      }
      
      showToast({
        type: 'error',
        message: errorMessage,
        duration: 8000,
      })
    }
  }

  const handlePrintBookingForm = async () => {
    if (!bookingSuccessData) {
      showToast({
        type: 'error',
        message: 'Booking reference data not available. Please try again.',
        duration: 3000,
      })
      return
    }
    
    if (!bookingData) {
      showToast({
        type: 'error',
        message: 'Booking data not available. Please try again.',
        duration: 3000,
      })
      return
    }
    
    // Detect iOS Safari for special handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOSSafari = isIOS && isSafari
    
    if (isIOSSafari) {
      // Show loading message for iOS Safari users
      showToast({
        type: 'success',
        message: 'Generating PDF... Please wait.',
        duration: 3000,
      })
    }
    
    try {
      const pdfData = {
        referenceNumber: bookingSuccessData.referenceNumber,
        bookingId: bookingSuccessData.bookingId,
        awb: bookingSuccessData.awb,
        service: selectedService || 'uae-to-pinas',
        sender: bookingData.sender,
        receiver: {
          ...bookingData.receiver,
          deliveryOption: (bookingData.receiver.deliveryOption === 'pickup' ? 'warehouse' : 'address') as 'warehouse' | 'address',
        },
        items: bookingData.items,
        eidFrontImage: verificationData.eidFrontImage,
        eidBackImage: verificationData.eidBackImage,
        philippinesIdFront: verificationData.philippinesIdFront,
        philippinesIdBack: verificationData.philippinesIdBack,
        customerImage: verificationData.faceImage,
        customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []),
        submissionTimestamp: new Date().toISOString(),
        declarationText: 'By proceeding with this shipment, I declare that the contents of my shipment do not contain any prohibited, illegal, or restricted items under international or local laws. I fully understand that shipping illegal goods constitutes a criminal offense and is punishable by law. I acknowledge that KNEX Delivery Services acts solely as a carrier and shall not be held responsible for the nature, condition, or contents of the shipment.',
      }
      
      await generateBookingPDF(pdfData)
      
      if (isIOSSafari) {
        showToast({
          type: 'success',
          message: 'PDF ready! If it didn\'t open automatically, tap the blue button on screen.',
          duration: 5000,
        })
      }
    } catch (error) {
      showToast({
        type: 'error',
        message: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`,
        duration: 5000,
      })
    }
  }

  const handleCloseBookingSuccessPopup = () => {
    setShowBookingSuccessPopup(false)
    setBookingSuccessData(null)
    // Reset flow back to service selection
    setSelectedService(null)
    setBookingData(null)
    setVerificationData({ eidVerified: false, faceVerified: false })
    setCurrentStep(0 as Step)
  }

  const handleBack = () => {
    // Going back logic
    if (currentStep === 7) {
      navigateToStep(6.5 as Step, 'Going back...')
    } else if (currentStep === 6.5) {
      // If we have booking data, go back to face scan, otherwise go to landing page
      if (bookingData) {
      navigateToStep(6, 'Going back...')
      } else {
        // Came from test button, go back to service selection
        setCurrentStep(0 as Step)
      }
    } else if (currentStep === 6) {
      navigateToStep(5, 'Going back...')
    } else if (currentStep === 5) {
      navigateToStep(3, 'Going back...')
    } else if (currentStep === 3) {
      navigateToStep(2, 'Going back...')
    } else if (currentStep === 2) {
      navigateToStep(1, 'Going back...')
    } else if (currentStep === 1) {
      navigateToStep(0 as Step, 'Going back...')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} />
      <ToastContainer />
      <Header />
      <div className="flex-1 py-8 px-4">
          <div className="max-w-7xl mx-auto">

            {!isPrivacyPolicyRoute && (
              <>
            {/* Progress Indicator - Only show after route selection */}
            {currentStep > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-3">
                    {/* Step 1: Booking Form */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 1 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 1 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 1 ? '✓' : '1'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 1 ? 'text-primary-600' : 
                        currentStep > 1 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        Form
                      </span>
                    </div>
                    
                    {/* Connector */}
                    <div className={`h-0.5 w-8 ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    
                    {/* Step 2: Emirates ID */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 2 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 2 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 2 ? '✓' : '2'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 2 ? 'text-primary-600' : 
                        currentStep > 2 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        ID Scan
                      </span>
                    </div>

                    {/* Connector */}
                    <div className={`h-0.5 w-8 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    
                    {/* Step 3: Face Scan */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 6 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 6 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 6 ? '✓' : '3'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 6 ? 'text-primary-600' : 
                        currentStep > 6 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        Face Scan
                      </span>
                    </div>

                    {/* Connector */}
                    <div className={`h-0.5 w-8 ${currentStep > 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    
                    {/* Step 4: OTP Verification */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 6.5 ? 'border-primary-600 bg-primary-600 text-white' : 
                        currentStep > 6.5 ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {currentStep > 6.5 ? '✓' : '4'}
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 6.5 ? 'text-primary-600' : 
                        currentStep > 6.5 ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        OTP
                      </span>
                    </div>

                    {/* Connector */}
                    <div className={`h-0.5 w-8 ${currentStep > 6.5 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    
                    {/* Step 5: Submit */}
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                        currentStep === 7 ? 'border-primary-600 bg-primary-600 text-white' : 
                        'border-gray-300 bg-white text-gray-400'
                      }`}>
                        5
                      </div>
                      <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                        currentStep === 7 ? 'text-primary-600' : 'text-gray-400'
                      }`}>
                        Submit
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <ErrorBoundary>
                {currentStep === 0 && (
                  <ServiceSelection 
                    onSelectService={handleServiceSelection}
                  />
                )}
                
              {currentStep === 1 && (
                <Step1BookingForm 
                  onNext={handleSenderDetailsNext} 
                  onBack={handleBack}
                  initialData={bookingData} 
                  service={selectedService}
                />
              )}
                
              {currentStep === 2 && (
                <ReceiverDetailsForm 
                  onNext={handleReceiverDetailsNext} 
                  onBack={handleBack}
                  initialData={bookingData} 
                  service={selectedService} 
                />
              )}
                
              {currentStep === 3 && (
                <CommoditiesDeclaration 
                  onNext={handleCommoditiesNext} 
                  onBack={handleBack}
                  initialData={bookingData} 
                  service={selectedService} 
                />
              )}
              
              {currentStep === 5 && (
                <Step2EmiratesIDScan 
                  onComplete={handleStep2Complete}
                  onBack={handleBack}
                  service={selectedService}
                  bookingData={bookingData}
                />
              )}
                
              {currentStep === 6 && (
                <Step3FaceScan 
                  onComplete={handleStep3Complete}
                  onBack={handleBack}
                  eidImage={verificationData.eidFrontImage}
                  eidBackImage={verificationData.eidBackImage}
                  service={selectedService}
                />
              )}

              {currentStep === 6.5 && (() => {
                // Determine service route
                const serviceRoute = (selectedService || bookingData?.service || 'uae-to-pinas').toLowerCase()
                const isPhToUae = serviceRoute === 'ph-to-uae'
                
                // For Philippines to UAE: Use receiver's phone number
                // For UAE to Philippines: Use sender's phone number
                const phoneNumber = isPhToUae 
                  ? bookingData?.receiver?.contactNo 
                  : bookingData?.sender?.contactNo
                
                return (
                  <StepOTPVerification
                    onNext={handleOTPComplete}
                    onBack={handleBack}
                    initialPhoneNumber={phoneNumber}
                    isReadOnly={!!phoneNumber}
                  />
                )
              })()}
                
              {currentStep === 7 && (
                <BookingConfirmation 
                  onSubmit={handleFinalSubmit}
                  onBack={handleBack}
                  initialData={bookingData}
                  service={selectedService}
                />
              )}
              </ErrorBoundary>
            </div>
              </>
            )}

            {isPrivacyPolicyRoute && <PrivacyPolicyPage />}
          </div>
        </div>
      <Footer />

      {/* Booking Success Popup Modal */}
      {showBookingSuccessPopup && bookingSuccessData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
              Booking Submitted Successfully!
            </h3>
            <p className="text-gray-700 text-center mb-2">
              Thank you! Your booking has been successfully submitted.
            </p>
            <div className="space-y-3 mb-6">
              {bookingSuccessData.awb && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 text-center">
                    AWB Number: <span className="font-mono font-semibold text-green-600">{bookingSuccessData.awb}</span>
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center">
                You will receive a confirmation email shortly.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handlePrintBookingForm}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-1 min-h-[48px]"
              >
                <Printer className="w-5 h-5" />
                Print Booking Form
              </button>
              <button
                type="button"
                onClick={handleCloseBookingSuccessPopup}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 min-h-[48px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
