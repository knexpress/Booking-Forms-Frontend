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
  const [confirmed, setConfirmed] = useState(false)

  // Determine route
  const route = (service || initialData?.service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'

  const handleConfirm = () => {
    if (!confirmed) {
      alert('Please confirm that all shipment details are accurate and final.')
      return
    }
    onSubmit()
  }

  return (
    <div className="space-y-6">
      {/* Sub-Header with Route Badge */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg">
                <span className="text-sm font-semibold">{routeDisplay}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <button className="ml-2 text-green-700 hover:text-green-900">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              Step 7 of 7: Booking Confirmation
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-green-600 mb-2">Booking Confirmation</h1>
            <p className="text-gray-600">One Last Step to Complete Your Shipment</p>
          </div>

          {/* Review & Confirm Card */}
          <div className="border-2 border-green-500 rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-green-600">Review & Confirm</h2>
            
            <div className="space-y-3 text-gray-700">
              <p>
                Before you proceed, kindly review the summary of your booking. Please ensure that all the information provided is correct. This helps prevent delays or issues during the shipping process.
              </p>
              <p>
                If you need to edit any detail, you can go back to the previous steps.
              </p>
            </div>

            {/* Important Declaration */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-yellow-800">Important Declaration</h3>
              <p className="text-sm text-yellow-900 leading-relaxed">
                By proceeding with this shipment, I declare that the contents of my shipment do not contain any
                prohibited, illegal, or restricted items under international or local laws. I fully understand that
                shipping illegal goods constitutes a criminal offense and is punishable by law. I acknowledge that
                KNEX Delivery Services acts solely as a carrier and shall not be held responsible for the nature,
                condition, or contents of the shipment.
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="confirm-checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
              />
              <label htmlFor="confirm-checkbox" className="text-gray-700 cursor-pointer">
                I confirm that all shipment details are accurate and final.
              </label>
            </div>
          </div>

          {/* Confirm Shipment Button */}
          <div className="flex flex-col items-center gap-3 pt-4">
            <button
              onClick={handleConfirm}
              disabled={!confirmed}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                confirmed
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirm Shipment
            </button>
            <p className="text-sm text-gray-500">You can no longer edit once confirmed.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

