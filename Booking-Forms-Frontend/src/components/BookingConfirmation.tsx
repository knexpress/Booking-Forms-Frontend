import { useState } from 'react'
import { ArrowLeft, CheckCircle, Plane, AlertTriangle, FileText } from 'lucide-react'
import { BookingFormData } from '../types'

interface BookingConfirmationProps {
  onSubmit: () => void
  onBack?: () => void
  initialData?: BookingFormData | null
  service?: string | null
  isSubmitting?: boolean
}

export default function BookingConfirmation({ onSubmit, onBack, initialData, service, isSubmitting = false }: BookingConfirmationProps) {
  const [importantDeclarationAccepted, setImportantDeclarationAccepted] = useState(false)
  const [acknowledgementAccepted, setAcknowledgementAccepted] = useState(false)

  // Determine route
  const route = (service || initialData?.service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'

  const isFormValid = importantDeclarationAccepted && acknowledgementAccepted && !isSubmitting

  const handleConfirm = () => {
    if (isSubmitting) {
      return // Prevent double submission
    }
    if (!importantDeclarationAccepted) {
      alert('Please accept the Important Declaration to proceed.')
      return
    }
    if (!acknowledgementAccepted) {
      alert('Please accept the Acknowledgement to proceed.')
      return
    }
    onSubmit()
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
              Step 7 of 7: Confirm
            </div>
            <div className="text-xs text-gray-600 font-medium sm:hidden">
              Step 7
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Title Section */}
          <div className="text-center space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 mb-1 sm:mb-2">Booking Confirmation</h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600">One Last Step to Complete Your Shipment</p>
          </div>

          {/* Review & Confirm Card */}
          <div className="border-2 border-green-500 rounded-xl p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">Review & Confirm</h2>
            
            <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700">
              <p>
                Before you proceed, kindly review the summary of your booking. Please ensure that all the information provided is correct. This helps prevent delays or issues during the shipping process.
              </p>
              <p>
                If you need to edit any detail, you can go back to the previous steps.
              </p>
            </div>

            {/* Important Declaration */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
                <h3 className="font-bold text-yellow-800 text-sm sm:text-base lg:text-lg">Important Declaration</h3>
              </div>
              <p className="text-xs sm:text-sm text-yellow-900 leading-relaxed">
                By proceeding with this shipment, I declare that the contents of my shipment do not contain any
                prohibited, illegal, or restricted items under international or local laws. I fully understand that
                shipping illegal goods constitutes a criminal offense and is punishable by law. I acknowledge that
                KNEX Delivery Services acts solely as a carrier and shall not be held responsible for the nature,
                condition, or contents of the shipment.
              </p>
              
              {/* Important Declaration Checkbox */}
              <div className="flex items-start gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-yellow-200">
                <input
                  type="checkbox"
                  id="important-declaration-checkbox"
                  checked={importantDeclarationAccepted}
                  onChange={(e) => setImportantDeclarationAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer flex-shrink-0"
                />
                <label htmlFor="important-declaration-checkbox" className="text-xs sm:text-sm text-yellow-900 cursor-pointer leading-relaxed">
                  I accept and agree to the Important Declaration stated above.
                </label>
              </div>
            </div>

            {/* Acknowledgement */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                <h3 className="font-bold text-blue-800 text-sm sm:text-base lg:text-lg">Acknowledgement</h3>
              </div>
              <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                I confirm that all shipment details provided are accurate and final. I understand that once confirmed,
                I will not be able to edit the booking details. I have reviewed all information including sender details,
                receiver details, items, and all other relevant information before proceeding with the confirmation.
              </p>
              
              {/* Acknowledgement Checkbox */}
              <div className="flex items-start gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-blue-200">
                <input
                  type="checkbox"
                  id="acknowledgement-checkbox"
                  checked={acknowledgementAccepted}
                  onChange={(e) => setAcknowledgementAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer flex-shrink-0"
                />
                <label htmlFor="acknowledgement-checkbox" className="text-xs sm:text-sm text-blue-900 cursor-pointer leading-relaxed">
                  I acknowledge that all shipment details are accurate and final.
                </label>
              </div>
            </div>
          </div>

          {/* Confirm Shipment Button */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
            <button
              onClick={handleConfirm}
              disabled={!isFormValid || isSubmitting}
              className={`w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base lg:text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                isFormValid && !isSubmitting
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                'Confirm Shipment'
              )}
            </button>
            <p className="text-xs sm:text-sm text-gray-500 text-center">
              {isSubmitting ? 'Please wait while we process your booking...' : 'You can no longer edit once confirmed.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


