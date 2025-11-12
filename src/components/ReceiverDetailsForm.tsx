import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, MapPin, Plane, ChevronDown, AlertCircle } from 'lucide-react'
import { BookingFormData } from '../types'
import { philippinesRegions, getProvincesForRegion, getCitiesForProvince, getBarangaysForCity } from '../data/philippinesLocations'

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

  // Local state for new fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [country, setCountry] = useState('PHILIPPINES')
  const [region, setRegion] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [barangay, setBarangay] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [landmark, setLandmark] = useState('')
  const [dialCode, setDialCode] = useState('+63')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [receiverDeliveryOption, setReceiverDeliveryOption] = useState<'pickup' | 'delivery'>('delivery')

  // Validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Determine route
  const route = (service || initialData?.service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'

  // Get available options based on selections
  const availableProvinces = region ? getProvincesForRegion(region) : []
  const availableCities = (region && province) ? getCitiesForProvince(region, province) : []
  const availableBarangays = (region && province && city) ? getBarangaysForCity(region, province, city) : []

  // Validate field
  const validateField = (name: string, value: string) => {
    if (!value || value.trim() === '') {
      setValidationErrors(prev => ({ ...prev, [name]: 'This field is required' }))
      return false
    }
    
    // Email validation
    if (name === 'emailAddress') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value.trim())) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Please enter a valid email address' }))
        return false
      }
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
    }
  }, [initialData])

  const onSubmit = (data: BookingFormData) => {
    // Validate all required fields
    const fieldValidations = [
      { name: 'firstName', value: firstName },
      { name: 'region', value: region },
      { name: 'province', value: province },
      { name: 'city', value: city },
      { name: 'barangay', value: barangay },
      { name: 'phoneNumber', value: phoneNumber },
      { name: 'emailAddress', value: emailAddress }
    ]

    let isValid = true
    fieldValidations.forEach(({ name, value }) => {
      setTouched(prev => ({ ...prev, [name]: true }))
      if (!validateField(name, value)) {
        isValid = false
      }
    })

    if (!isValid) {
      return
    }

    // Combine firstName and lastName
    const fullName = `${firstName} ${lastName}`.trim()
    
    // Build complete address
    const addressParts = []
    if (addressLine1) addressParts.push(addressLine1)
    if (landmark) addressParts.push(`Landmark: ${landmark}`)
    if (barangay) addressParts.push(barangay)
    if (city) addressParts.push(city)
    if (province) addressParts.push(province)
    if (region) addressParts.push(region)
    const completeAddress = addressParts.join(', ')

    // Combine dialCode and phoneNumber
    const contactNo = `${dialCode}${phoneNumber}`

    // Update form data with receiver details
    const receiverData: Partial<BookingFormData> = {
      receiver: {
        fullName,
        firstName,
        lastName,
        completeAddress,
        country: country || 'PHILIPPINES',
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
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              Step 4 of 7: Receiver Details
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">Receiver Details</h1>
              <p className="text-gray-600 text-sm sm:text-base">Provide receiver details.</p>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">Required fields (*)</p>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base ${
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
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    // Only allow letters and spaces
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                    setLastName(value)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
                  placeholder="Enter receiver's last name (optional)"
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-gray-500">Optional: Letters only</p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Address Information</h2>
            
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-4 bg-red-600 rounded z-10"></div>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white text-gray-700"
                  required
                >
                  <option value="PHILIPPINES">PHILIPPINES</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>

            {/* Region, Province, City, Barangay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <select
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value)
                      setProvince('')
                      setCity('')
                      setBarangay('')
                      if (touched.region) {
                        validateField('region', e.target.value)
                      }
                    }}
                    onBlur={() => handleBlur('region', region)}
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:border-transparent appearance-none bg-white text-gray-700 text-base ${
                      touched.region && validationErrors.region
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-green-500'
                    }`}
                    required
                  >
                    <option value="">Select Region</option>
                    {philippinesRegions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Required: Select your region</p>
                {touched.region && validationErrors.region && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.region}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Province <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <select
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value)
                      setCity('')
                      setBarangay('')
                      if (touched.province) {
                        validateField('province', e.target.value)
                      }
                    }}
                    onBlur={() => handleBlur('province', province)}
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:border-transparent appearance-none bg-white text-gray-700 text-base ${
                      touched.province && validationErrors.province
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-green-500'
                    }`}
                    disabled={!region}
                    required
                  >
                    <option value="">Select Province</option>
                    {availableProvinces.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Required: Select your province</p>
                {touched.province && validationErrors.province && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.province}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City / Municipality <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <select
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value)
                      setBarangay('')
                      if (touched.city) {
                        validateField('city', e.target.value)
                      }
                    }}
                    onBlur={() => handleBlur('city', city)}
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:border-transparent appearance-none bg-white text-gray-700 text-base ${
                      touched.city && validationErrors.city
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-green-500'
                    }`}
                    disabled={!province}
                    required
                  >
                    <option value="">Select City</option>
                    {availableCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Required: Select your city/municipality</p>
                {touched.city && validationErrors.city && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.city}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barangay <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <select
                    value={barangay}
                    onChange={(e) => {
                      setBarangay(e.target.value)
                      if (touched.barangay) {
                        validateField('barangay', e.target.value)
                      }
                    }}
                    onBlur={() => handleBlur('barangay', barangay)}
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:border-transparent appearance-none bg-white text-gray-700 text-base ${
                      touched.barangay && validationErrors.barangay
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-green-500'
                    }`}
                    disabled={!city}
                    required
                  >
                    <option value="">Select Barangay</option>
                    {availableBarangays.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Required: Select your barangay</p>
                {touched.barangay && validationErrors.barangay && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.barangay}</span>
                  </div>
                )}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
                placeholder="House No., Street, Subdivision / Village"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">Optional: Detailed address information (max 200 characters)</p>
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Landmark
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
                placeholder="Nearby landmark or reference point"
                maxLength={100}
              />
              <p className="mt-1 text-xs text-gray-500">Optional: Nearby landmarks for easier location (max 100 characters)</p>
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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dial Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-4 bg-red-600 rounded z-10"></div>
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white text-gray-700"
                    required
                  >
                    <option value="+63">+63</option>
                    <option value="+971">+971</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                </div>
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base ${
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
                Email Address <span className="text-red-500">*</span>
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-base ${
                  touched.emailAddress && validationErrors.emailAddress
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-green-500'
                }`}
                placeholder="receiver.email@example.com"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Format: valid email address (e.g., name@domain.com)</p>
              {touched.emailAddress && validationErrors.emailAddress && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.emailAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Next Step Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-green-700 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors text-base sm:text-lg w-full sm:w-auto"
            >
              <span>Next Step</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

