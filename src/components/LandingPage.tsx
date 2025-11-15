import { Truck, Package, RefreshCw, Plane, Shield } from 'lucide-react'

interface LandingPageProps {
  onBookShipment: () => void
}

export default function LandingPage({ onBookShipment }: LandingPageProps) {
  return (
    <div className="flex-1 bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Headline Section */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 leading-tight mb-4">
            <span className="block">Not Just a Cargo,</span>
            <span className="block">It's a Promise We</span>
            <span className="block text-green-600">Deliver</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mt-6 max-w-3xl leading-relaxed">
            We deliver your shipments with speed, security, and full transparency, from personal packages to commercial cargo, we deliver with the same care and commitment.
          </p>
        </div>

        {/* Book Shipment Button */}
        <div className="mb-12">
          <button
            onClick={onBookShipment}
            className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Truck className="w-6 h-6" />
            <span>Book Shipment</span>
          </button>
        </div>

        {/* Service Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-800 font-medium">No Minimum Weight</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <RefreshCw className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-800 font-medium">Real-Time Updates</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Plane className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-800 font-medium">2-3 Days Delivery</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-800 font-medium">100% Insured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

