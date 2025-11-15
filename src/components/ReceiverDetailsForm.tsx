import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Plane, ChevronDown, AlertCircle } from 'lucide-react'
import { BookingFormData } from '../types'

interface ReceiverDetailsFormProps {
  onNext: (receiverData: Partial<BookingFormData>) => void
  onBack?: () => void
  initialData?: BookingFormData | null
  service?: string | null
}

export default function ReceiverDetailsForm({ onNext, onBack, initialData, service }: ReceiverDetailsFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<BookingFormData>({
    defaultValues: initialData || {}
  })

  // Determine route
  const route = (service || initialData?.service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'

  // Local state for new fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [country, setCountry] = useState(isPhToUae ? 'UNITED ARAB EMIRATES' : 'PHILIPPINES')
  const [region, setRegion] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [barangay, setBarangay] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [landmark, setLandmark] = useState('')
  const [dialCode, setDialCode] = useState(isPhToUae ? '+971' : '+63')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [receiverDeliveryOption, setReceiverDeliveryOption] = useState<'pickup' | 'delivery'>('delivery')

  // Validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Validate field
  const validateField = (name: string, value: string) => {
    if (!value || value.trim() === '') {
      setValidationErrors(prev => ({ ...prev, [name]: 'This field is required' }))
      return false
    }
    
    // Email validation (only if value is provided - field is optional)
    if (name === 'emailAddress') {
      if (value && value.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value.trim())) {
          setValidationErrors(prev => ({ ...prev, [name]: 'Please enter a valid email address' }))
          return false
        }
      }
      // Email is optional, so if empty, it's valid
      return true
    }
    
    // Phone number validation
    if (name === 'phoneNumber') {
      const phoneValue = value.trim()
      if (dialCode === '+63') {
        // Philippines: 10 digits
        if (phoneValue.length !== 10 || !/^\d{10}$/.test(phoneValue)) {
          setValidationErrors(prev => ({ ...prev, [name]: 'Philippines phone number must be 10 digits' }))
          return false
        }
      } else if (dialCode === '+971') {
        // UAE: 9 digits
        if (phoneValue.length !== 9 || !/^\d{9}$/.test(phoneValue)) {
          setValidationErrors(prev => ({ ...prev, [name]: 'UAE phone number must be 9 digits' }))
          return false
        }
      }
    }
    
    // First name validation
    if (name === 'firstName') {
      const nameValue = value.trim()
      if (nameValue.length < 2) {
        setValidationErrors(prev => ({ ...prev, [name]: 'First name must be at least 2 characters' }))
        return false
      }
      if (nameValue.length > 50) {
        setValidationErrors(prev => ({ ...prev, [name]: 'First name must be less than 50 characters' }))
        return false
      }
      if (!/^[a-zA-Z\s]+$/.test(nameValue)) {
        setValidationErrors(prev => ({ ...prev, [name]: 'First name can only contain letters and spaces' }))
        return false
      }
    }
    
    // Last name validation
    if (name === 'lastName') {
      const nameValue = value.trim()
      if (nameValue.length < 2) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Last name must be at least 2 characters' }))
        return false
      }
      if (nameValue.length > 50) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Last name must be less than 50 characters' }))
        return false
      }
      if (!/^[a-zA-Z\s]+$/.test(nameValue)) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Last name can only contain letters and spaces' }))
        return false
      }
    }
    
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[name]
      return newErrors
    })
    return true
  }

  // Handle field blur
  const handleBlur = (name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    validateField(name, value)
  }

  // Update country when route changes
  useEffect(() => {
    setCountry(isPhToUae ? 'UNITED ARAB EMIRATES' : 'PHILIPPINES')
    // Also update dial code based on route
    if (isPhToUae) {
      setDialCode('+971')
    } else {
      setDialCode('+63')
    }
  }, [isPhToUae])

  useEffect(() => {
    if (initialData?.receiver) {
      // Split fullName if it exists
      const nameParts = initialData.receiver.fullName?.split(' ') || []
      if (nameParts.length > 0) {
        setFirstName(nameParts[0])
        setLastName(nameParts.slice(1).join(' ') || '')
      }
      // Extract phone parts if contactNo exists
      if (initialData.receiver.contactNo) {
        if (initialData.receiver.contactNo.startsWith('+63')) {
          setDialCode('+63')
          setPhoneNumber(initialData.receiver.contactNo.replace('+63', ''))
        } else if (initialData.receiver.contactNo.startsWith('+971')) {
          setDialCode('+971')
          setPhoneNumber(initialData.receiver.contactNo.replace('+971', ''))
        }
      }
      if (initialData.receiver.completeAddress) {
        setAddressLine1(initialData.receiver.completeAddress)
      }
      // Set email if it exists
      if (initialData.receiver.emailAddress) {
        setEmailAddress(initialData.receiver.emailAddress)
      }
      // Set delivery option if exists
      if (initialData.receiver.deliveryOption) {
        setReceiverDeliveryOption(initialData.receiver.deliveryOption)
      }
      // Set country from initialData if it exists, otherwise use route-based default
      if (initialData.receiver.country) {
        setCountry(initialData.receiver.country)
      } else {
        setCountry(isPhToUae ? 'UNITED ARAB EMIRATES' : 'PHILIPPINES')
      }
    }
  }, [initialData, isPhToUae])

  const onSubmit = (data: BookingFormData) => {
    // Validate all required fields
    const fieldValidations = [
      { name: 'firstName', value: firstName },
      { name: 'lastName', value: lastName },
      { name: 'phoneNumber', value: phoneNumber }
    ]

    let isValid = true
    fieldValidations.forEach(({ name, value }) => {
      setTouched(prev => ({ ...prev, [name]: true }))
      if (!validateField(name, value)) {
        isValid = false
      }
    })
    
    // Validate email if provided (optional field)
    if (emailAddress && emailAddress.trim() !== '') {
      setTouched(prev => ({ ...prev, emailAddress: true }))
      if (!validateField('emailAddress', emailAddress)) {
        isValid = false
      }
    }

    if (!isValid) {
      return
    }

    // Combine firstName and lastName
    const fullName = `${firstName} ${lastName}`.trim()
    
    // Build complete address (just use addressLine1)
    const completeAddress = addressLine1 || ''

    // Combine dialCode and phoneNumber
    const contactNo = `${dialCode}${phoneNumber}`

    // Update form data with receiver details
    const receiverData: Partial<BookingFormData> = {
      receiver: {
        fullName,
        firstName,
        lastName,
        completeAddress,
        country: country || (isPhToUae ? 'UNITED ARAB EMIRATES' : 'PHILIPPINES'),
        region,
        province,
        city,
        barangay,
        addressLine1,
        landmark,
        dialCode,
        phoneNumber,
        contactNo,
        emailAddress: emailAddress.trim(),
        deliveryOption: receiverDeliveryOption
      }
    }

    onNext(receiverData)
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
                <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium hidden xs:block whitespace-nowrap">
              Step 3 of 6
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 lg:space-y-8">
          {/* Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">Receiver Details</h1>
              <p className="text-gray-600 text-sm sm:text-base">Provide receiver details.</p>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">Required fields (*)</p>
          </div>

          {/* Personal Information */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    // Only allow letters and spaces
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                    setFirstName(value)
                    if (touched.firstName) {
                      validateField('firstName', value)
                    }
                  }}
                  onBlur={() => handleBlur('firstName', firstName)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                    touched.firstName && validationErrors.firstName
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="Enter receiver's first name"
                  required
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-gray-500">Format: Letters only, 2-50 characters</p>
                {touched.firstName && validationErrors.firstName && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.firstName}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    // Only allow letters and spaces
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                    setLastName(value)
                    if (touched.lastName) {
                      validateField('lastName', value)
                    }
                  }}
                  onBlur={() => handleBlur('lastName', lastName)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                    touched.lastName && validationErrors.lastName
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="Enter receiver's last name"
                  required
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-gray-500">Format: Letters only, 2-50 characters</p>
                {touched.lastName && validationErrors.lastName && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.lastName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Address Information</h2>
            
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-4 rounded z-10 ${
                  isPhToUae ? 'bg-gradient-to-r from-red-500 via-green-500 to-black' : 'bg-red-600'
                }`}></div>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-8 sm:pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white text-gray-700 text-base min-h-[44px]"
                  required
                >
                  <option value={isPhToUae ? 'UNITED ARAB EMIRATES' : 'PHILIPPINES'}>
                    {isPhToUae ? 'UNITED ARAB EMIRATES' : 'PHILIPPINES'}
                  </option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>

            {/* Address Line 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base min-h-[44px]"
                placeholder="Flat/Villa No., Building, Street & Area"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">Optional: Detailed address information (max 200 characters)</p>
            </div>
          </div>

          {/* Delivery/Pickup Options */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Delivery Options</h2>
            <div className="space-y-3">
              <label className="flex items-start sm:items-center gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 active:bg-gray-100">
                <input
                  type="radio"
                  name="receiverDeliveryOption"
                  value="pickup"
                  checked={receiverDeliveryOption === 'pickup'}
                  onChange={(e) => setReceiverDeliveryOption(e.target.value as 'pickup' | 'delivery')}
                  className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 mt-1 sm:mt-0 flex-shrink-0"
                />
                <div className="flex-1">
                  <span className="font-semibold text-gray-800 block mb-1">Pickup</span>
                  <p className="text-sm text-gray-600">Pick up your shipment from our warehouse</p>
                </div>
              </label>
              
              <label className="flex items-start sm:items-center gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 active:bg-gray-100">
                <input
                  type="radio"
                  name="receiverDeliveryOption"
                  value="delivery"
                  checked={receiverDeliveryOption === 'delivery'}
                  onChange={(e) => setReceiverDeliveryOption(e.target.value as 'pickup' | 'delivery')}
                  className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 mt-1 sm:mt-0 flex-shrink-0"
                />
                <div className="flex-1">
                  <span className="font-semibold text-gray-800 block mb-1">Delivery</span>
                  <p className="text-sm text-gray-600">We will deliver your shipment to your address</p>
                </div>
              </label>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dial Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-4 rounded z-10 ${
                    !isPhToUae ? 'bg-red-600' : 'bg-gradient-to-r from-red-500 via-green-500 to-black'
                  }`}></div>
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    disabled={true}
                    className="w-full pl-10 sm:pl-12 pr-8 sm:pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white text-gray-700 bg-gray-100 cursor-not-allowed text-base min-h-[44px]"
                    required
                  >
                    <option value="+63">+63</option>
                    <option value="+971">+971</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none z-10" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Dial code is fixed based on receiver country</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setPhoneNumber(value)
                    if (touched.phoneNumber) {
                      validateField('phoneNumber', value)
                    }
                  }}
                  onBlur={() => handleBlur('phoneNumber', phoneNumber)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                    touched.phoneNumber && validationErrors.phoneNumber
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="9123456789"
                  required
                  maxLength={15}
                />
                <p className="mt-1 text-xs text-gray-500">Format: {dialCode === '+63' ? '10 digits (e.g., 9123456789)' : '9 digits (e.g., 501234567)'}</p>
                {touched.phoneNumber && validationErrors.phoneNumber && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => {
                  setEmailAddress(e.target.value)
                  if (touched.emailAddress) {
                    validateField('emailAddress', e.target.value)
                  }
                }}
                onBlur={() => handleBlur('emailAddress', emailAddress)}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base min-h-[44px] ${
                  touched.emailAddress && validationErrors.emailAddress
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-green-500'
                }`}
                placeholder="receiver.email@example.com (optional)"
              />
              <p className="mt-1 text-xs text-gray-500">Optional: Valid email address (e.g., name@domain.com)</p>
              {touched.emailAddress && validationErrors.emailAddress && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.emailAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Next Step Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sm:pt-6">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-green-700 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-green-800 active:bg-green-900 transition-colors text-base sm:text-lg w-full sm:w-auto min-h-[48px] shadow-md hover:shadow-lg"
            >
              <span>Next Step</span>
              <ArrowRight className="w-5 h-5 flex-shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

