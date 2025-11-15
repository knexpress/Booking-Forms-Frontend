import { useState } from 'react'
import { ArrowLeft, CheckCircle, Plane } from 'lucide-react'
import { BookingFormData } from '../types'

interface BookingConfirmationProps {
  onSubmit: () => void
  onBack?: () => void
  initialData?: BookingFormData | null
  service?: string | null
}

export default function BookingConfirmation({ onSubmit, onBack, initialData, service }: BookingConfirmationProps) {
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false)
  const [acknowledgementConfirmed, setAcknowledgementConfirmed] = useState(false)

  // Determine route
  const route = (service || initialData?.service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'

  const handleConfirm = () => {
    if (!declarationConfirmed) {
      alert('Please confirm the Important Declaration.')
      return
    }
    if (!acknowledgementConfirmed) {
      alert('Please confirm the Acknowledgement.')
      return
    }
    onSubmit()
  }

  const bothConfirmed = declarationConfirmed && acknowledgementConfirmed

  return (
    <div className="space-y-6">
      {/* Sub-Header with Route Badge */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={onBack}
                className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-gray-900 transition-colors min-h-[44px] px-2 sm:px-0 flex-shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-green-100 text-green-700 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg min-w-0">
                <span className="text-xs sm:text-sm font-semibold truncate">{routeDisplay}</span>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium hidden xs:block whitespace-nowrap">
              Step 7 of 7
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 lg:space-y-8">
          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">Booking Confirmation</h1>
            <p className="text-sm sm:text-base text-gray-600">One Last Step to Complete Your Shipment</p>
          </div>

          {/* Review & Confirm Card */}
          <div className="border-2 border-green-500 rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-green-600">Review & Confirm</h2>
            
            <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700">
              <p>
                Before you proceed, kindly review the summary of your booking. Please ensure that all the information provided is correct. This helps prevent delays or issues during the shipping process.
              </p>
              <p>
                If you need to edit any detail, you can go back to the previous steps.
              </p>
            </div>

            {/* Important Declaration */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-yellow-800">Important Declaration</h3>
              <p className="text-xs sm:text-sm text-yellow-900 leading-relaxed">
                By proceeding with this shipment, I declare that the contents of my shipment do not contain any
                prohibited, illegal, or restricted items under international or local laws. I fully understand that
                shipping illegal goods constitutes a criminal offense and is punishable by law. I acknowledge that
                KNEX Delivery Services acts solely as a carrier and shall not be held responsible for the nature,
                condition, or contents of the shipment.
              </p>
              
              {/* Declaration Checkbox */}
              <div className="flex items-start gap-2 sm:gap-3 pt-2">
                <input
                  type="checkbox"
                  id="declaration-checkbox"
                  checked={declarationConfirmed}
                  onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 flex-shrink-0"
                />
                <label htmlFor="declaration-checkbox" className="text-xs sm:text-sm text-gray-700 cursor-pointer">
                  I have read and agree to the Important Declaration above.
                </label>
              </div>
            </div>

            {/* Acknowledgement Section */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-blue-800">Acknowledgement</h3>
              <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                I acknowledge that I have reviewed all the booking details provided and confirm that all information is
                accurate and complete. I understand that any incorrect or incomplete information may result in delays or
                additional charges. I also acknowledge that I will not be able to edit these details after confirmation.
              </p>
              
              {/* Acknowledgement Checkbox */}
              <div className="flex items-start gap-2 sm:gap-3 pt-2">
                <input
                  type="checkbox"
                  id="acknowledgement-checkbox"
                  checked={acknowledgementConfirmed}
                  onChange={(e) => setAcknowledgementConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 flex-shrink-0"
                />
                <label htmlFor="acknowledgement-checkbox" className="text-xs sm:text-sm text-gray-700 cursor-pointer">
                  I confirm that all shipment details are accurate and final.
                </label>
              </div>
            </div>
          </div>

          {/* Confirm Shipment Button */}
          <div className="flex flex-col items-center gap-3 pt-4 sm:pt-6">
            <button
              onClick={handleConfirm}
              disabled={!bothConfirmed}
              className={`px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-semibold transition-colors min-h-[48px] w-full sm:w-auto text-base sm:text-lg shadow-md hover:shadow-lg ${
                bothConfirmed
                  ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirm Shipment
            </button>
            <p className="text-xs sm:text-sm text-gray-500 text-center">You can no longer edit once confirmed.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

