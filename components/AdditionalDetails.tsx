import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Mail, X } from 'lucide-react'
import { BookingFormData } from '../types'

interface AdditionalDetailsProps {
  onNext: (additionalData: {
    paymentMethod: 'cash' | 'bank'
    email?: string
    additionalInstructions?: string
  }) => void
  onBack?: () => void
  initialData?: BookingFormData | null
  service?: string | null
}

const QUICK_TAGS = [
  'Wrap It Well.',
  'Handle With Care.',
  'Keep Dry.',
  'This Side Up.',
  'Fragile - Do Not Drop.',
  'Do Not Stack Heavy Items On Top.'
]

export default function AdditionalDetails({ onNext, onBack, initialData, service }: AdditionalDetailsProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash')
  const [email, setEmail] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [emailError, setEmailError] = useState('')

  // Determine route
  const route = (service || initialData?.service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'

  useEffect(() => {
    // Load initial data if available
    if (initialData?.receiver?.emailAddress) {
      setEmail(initialData.receiver.emailAddress)
    }
  }, [initialData])

  const handleQuickTag = (tag: string) => {
    if (additionalInstructions.trim() === '') {
      setAdditionalInstructions(tag)
    } else {
      setAdditionalInstructions(prev => prev + ' ' + tag)
    }
  }
  
  const validateEmail = (emailValue: string) => {
    if (emailValue.trim() === '') {
      setEmailError('')
      return true // Email is optional
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue.trim())) {
      setEmailError('Please enter a valid email address (e.g., example@email.com)')
      return false
    }
    
    setEmailError('')
    return true
  }
  
  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (value.trim() !== '') {
      validateEmail(value)
    } else {
      setEmailError('')
    }
  }

  const handleNext = () => {
    if (!validateEmail(email)) {
      return
    }
    
    onNext({
      paymentMethod,
      email: email.trim() || undefined,
      additionalInstructions: additionalInstructions.trim() || undefined
    })
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
              Step 4 of 7: Additional Details
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">Additional Details</h1>
            <p className="text-sm sm:text-base text-gray-600">Confirm the box details of your shipment.</p>
          </div>

          {/* Payment Method Section */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-green-600 mb-1">Payment Method <span className="text-red-500">*</span></h2>
              <p className="text-xs sm:text-sm text-gray-600">Please choose your preferred payment option.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 sm:p-6 rounded-lg border-2 transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-green-700 border-green-700 text-white'
                    : 'bg-green-50 border-green-200 text-green-700 hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2 sm:mb-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                    paymentMethod === 'cash' ? 'bg-green-600' : 'bg-green-200'
                  }`}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="font-semibold text-center text-sm sm:text-base">Cash On Delivery</p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`p-4 sm:p-6 rounded-lg border-2 transition-all ${
                  paymentMethod === 'bank'
                    ? 'bg-green-700 border-green-700 text-white'
                    : 'bg-green-50 border-green-200 text-green-700 hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2 sm:mb-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                    paymentMethod === 'bank' ? 'bg-green-600' : 'bg-green-200'
                  }`}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <p className="font-semibold text-center text-sm sm:text-base">Bank Transfer</p>
              </button>
            </div>
          </div>

          {/* Email Notification Section */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-green-600 mb-1">
                Email Notification <span className="text-gray-500 font-normal text-xs sm:text-sm">(Optional)</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">Receive updates about your shipment via email.</p>
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 z-10" />
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => validateEmail(email)}
                className={`w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base ${
                  emailError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="example@email.com"
                maxLength={100}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-600">{emailError}</p>
              )}
              {!emailError && email.trim() !== '' && (
                <p className="mt-1 text-xs text-gray-500">Format: name@domain.com</p>
              )}
            </div>
          </div>

          {/* Additional Instructions Section */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-green-600">Additional Instructions <span className="text-gray-500 font-normal text-xs sm:text-sm">(Optional)</span></h2>
            <p className="text-xs sm:text-sm text-gray-600">Add any special instructions for handling your shipment.</p>
            <div className="relative">
              <textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={5}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none text-sm sm:text-base"
                placeholder="Type here or select tags below."
                maxLength={500}
              />
              <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="absolute bottom-2 sm:bottom-3 left-3 sm:left-4 text-xs text-gray-400">
                {additionalInstructions.length}/500
              </div>
            </div>
            
            {/* Quick Tags */}
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Quick Tags</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TAGS.map((tag, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleQuickTag(tag)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-50 text-green-700 rounded-full text-xs sm:text-sm font-medium hover:bg-green-100 transition-colors border border-green-200"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Next Step Button */}
          <div className="flex justify-end pt-3 sm:pt-4">
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center justify-center gap-2 bg-green-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors w-full sm:w-auto text-sm sm:text-base"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

