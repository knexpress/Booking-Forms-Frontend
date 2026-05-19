import { ExternalLink } from 'lucide-react'

const NEW_BOOKING_FORM_URL = 'https://trueid-seven.vercel.app/'

export default function LandingPage() {
  const handleGoToBookingForm = () => {
    window.location.href = NEW_BOOKING_FORM_URL
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 sm:py-24 text-center">
      <div className="max-w-xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Booking Form Has Moved
        </h1>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          Our booking form has been shifted to our new webpage. Please click the
          button below to go to the booking form and complete your shipment.
        </p>
        <button
          type="button"
          onClick={handleGoToBookingForm}
          className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <span>Go to Booking Form</span>
          <ExternalLink className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
