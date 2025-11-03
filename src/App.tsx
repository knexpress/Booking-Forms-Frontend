import { useState } from 'react'
import { BookingFormData, VerificationData, Step } from './types'
import ServiceSelection from './components/ServiceSelection'
import Step1BookingForm from './components/Step1BookingForm'
import Step2EmiratesIDScan from './components/Step2EmiratesIDScan'
import Step3FaceScan from './components/Step3FaceScan'
import Step4TermsSubmission from './components/Step4TermsSubmission'
import ToastContainer, { showToast } from './components/ToastContainer'
import { generateBookingPDF } from './utils/pdfGenerator'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(0 as Step) // Start at 0 for service selection
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState<BookingFormData | null>(null)
  const [verificationData, setVerificationData] = useState<VerificationData>({
    eidVerified: false,
    faceVerified: false,
  })

  const handleServiceSelection = (service: string) => {
    setSelectedService(service)
    setCurrentStep(1) // Go to booking form
  }

  const handleStep1Complete = (data: BookingFormData) => {
    setBookingData({
      ...data,
      service: selectedService || 'uae-to-pinas' // Add selected service to booking data (default to uae-to-pinas)
    })
    setCurrentStep(2) // Go to Emirates ID Scan
  }

  const handleStep2Complete = (eidData: Partial<VerificationData>) => {
    setVerificationData(prev => ({ ...prev, ...eidData, eidVerified: true }))
    setCurrentStep(3) // Go to Face Scan
  }

  const handleStep3Complete = (faceData: Partial<VerificationData>) => {
    setVerificationData(prev => ({ ...prev, ...faceData, faceVerified: true }))
    setCurrentStep(4) // Go to Terms & Submission
  }

  const handleFinalSubmit = async () => {
    const finalData = {
      ...bookingData!,
      service: selectedService || 'uae-to-pinas',
      eidFrontImage: verificationData.eidFrontImage,
      eidBackImage: verificationData.eidBackImage,
      customerImage: verificationData.faceImage, // Keep for backward compatibility (first image)
      customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []), // All face images
      termsAccepted: true,
      submissionTimestamp: new Date().toISOString(),
    }
    
    console.log('📦 Submitting Booking Data:', finalData)
    
    try {
      // Call API endpoint to save booking
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Booking saved successfully!')
        console.log('   Reference Number:', result.referenceNumber)
        console.log('   Booking ID:', result.bookingId)
        
        // Show success toast with print option
        const toastId = showToast({
          type: 'success',
          message: 'Thank you! Your booking has been successfully submitted.',
          referenceNumber: result.referenceNumber,
          onPrint: async () => {
            try {
              await generateBookingPDF({
                referenceNumber: result.referenceNumber,
                bookingId: result.bookingId,
                service: selectedService || 'uae-to-pinas',
                sender: finalData.sender,
                receiver: finalData.receiver,
                items: finalData.items,
                eidFrontImage: verificationData.eidFrontImage,
                eidBackImage: verificationData.eidBackImage,
                customerImage: verificationData.faceImage, // Single image for backward compatibility
                customerImages: verificationData.faceImages || (verificationData.faceImage ? [verificationData.faceImage] : []), // All face images
                submissionTimestamp: finalData.submissionTimestamp,
              }, { openInNewTab: true })
            } catch (error) {
              console.error('Error generating PDF:', error)
              showToast({
                type: 'error',
                message: 'Failed to generate PDF. Please try again.',
                duration: 3000,
              })
            }
          },
          duration: 8000, // Show for 8 seconds to give user time to click print
        })

        // After toast duration, reset flow back to first window (service selection)
        setTimeout(() => {
          setSelectedService(null)
          setBookingData(null)
          setVerificationData({ eidVerified: false, faceVerified: false })
          setCurrentStep(0 as Step)
        }, 8200)
      } else {
        console.error('❌ Booking failed:', result.error)
        showToast({
          type: 'error',
          message: `Failed to submit booking: ${result.error}`,
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      showToast({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
        duration: 5000,
      })
    }
  }

  const handleBack = () => {
    // Going back logic
    if (currentStep === 4) {
      setCurrentStep(3) // From terms back to face scan
    } else if (currentStep === 3) {
      setCurrentStep(2) // From face scan back to EID scan
    } else if (currentStep === 2) {
      setCurrentStep(1) // From EID scan back to form
    } else if (currentStep === 1) {
      setCurrentStep(0 as Step) // From form back to service selection
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <ToastContainer />
      <div className="max-w-5xl mx-auto">
        
        {/* Progress Indicator - Only show after service selection */}
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
                    currentStep === 3 ? 'border-primary-600 bg-primary-600 text-white' : 
                    currentStep > 3 ? 'border-green-500 bg-green-500 text-white' : 
                    'border-gray-300 bg-white text-gray-400'
                  }`}>
                    {currentStep > 3 ? '✓' : '3'}
                  </div>
                  <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                    currentStep === 3 ? 'text-primary-600' : 
                    currentStep > 3 ? 'text-green-600' : 
                    'text-gray-400'
                  }`}>
                    Face Scan
                  </span>
                </div>

                {/* Connector */}
                <div className={`h-0.5 w-8 ${currentStep > 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                
                {/* Step 4: Submit */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs ${
                    currentStep === 4 ? 'border-primary-600 bg-primary-600 text-white' : 
                    'border-gray-300 bg-white text-gray-400'
                  }`}>
                    4
                  </div>
                  <span className={`ml-1 text-xs font-medium hidden sm:inline ${
                    currentStep === 4 ? 'text-primary-600' : 'text-gray-400'
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
              <ServiceSelection onSelectService={handleServiceSelection} />
            )}
            
          {currentStep === 1 && (
            <Step1BookingForm onComplete={handleStep1Complete} initialData={bookingData} service={selectedService} />
          )}
            
            {currentStep === 2 && (
              <Step2EmiratesIDScan 
                onComplete={handleStep2Complete}
                onBack={handleBack}
              />
            )}
            
            {currentStep === 3 && (
              <Step3FaceScan 
                onComplete={handleStep3Complete}
                onBack={handleBack}
                eidImage={verificationData.eidFrontImage}
                eidBackImage={verificationData.eidBackImage}
              />
            )}
            
            {currentStep === 4 && (
              <Step4TermsSubmission 
                onSubmit={handleFinalSubmit}
                onBack={handleBack}
              />
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

export default App

