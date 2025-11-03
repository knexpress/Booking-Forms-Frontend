import { useState } from 'react'
import { BookingFormData, VerificationData, Step } from './types'
import ServiceSelection from './components/ServiceSelection'
import Step1BookingForm from './components/Step1BookingForm'
import Step2EmiratesIDScan from './components/Step2EmiratesIDScan'
import Step3FaceScan from './components/Step3FaceScan'
import Step4TermsSubmission from './components/Step4TermsSubmission'

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
      service: selectedService || 'uae-to-pinas' // Add selected service to booking data
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
      customerImage: verificationData.faceImage,
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
        
        alert(`✅ Thank you! Your booking has been successfully submitted.\n\nReference Number: ${result.referenceNumber}\n\nYou will receive a confirmation email shortly.`)
      } else {
        console.error('❌ Booking failed:', result.error)
        alert(`❌ Failed to submit booking: ${result.error}\n\nPlease try again.`)
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      alert('❌ Network error. Please check your connection and try again.')
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
          {currentStep === 0 && (
            <ServiceSelection onSelectService={handleServiceSelection} />
          )}
          
          {currentStep === 1 && (
            <Step1BookingForm onComplete={handleStep1Complete} initialData={bookingData} />
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
        </div>
      </div>
    </div>
  )
}

export default App

