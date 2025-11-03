import { Package, Plane, Ship } from 'lucide-react'

interface ServiceSelectionProps {
  onSelectService: (service: string) => void
}

export default function ServiceSelection({ onSelectService }: ServiceSelectionProps) {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            KN Express Delivery Services
          </h1>
          <p className="text-lg text-gray-600">
            Select Your Shipping Service
          </p>
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        
        {/* UAE to Philippines - Active Service */}
        <div 
          onClick={() => onSelectService('uae-to-pinas')}
          className="bg-white border-2 border-primary-600 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
        >
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-primary-100 p-4 rounded-full">
                <Plane className="w-12 h-12 text-primary-600" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-800">
              UAE → Philippines
            </h3>
            
            <div className="space-y-2 text-gray-600">
              <p className="text-sm">🚀 Fast & Reliable</p>
              <p className="text-sm">📦 Door-to-Door Delivery</p>
              <p className="text-sm">✅ Track Your Shipment</p>
            </div>

            <button className="btn-primary w-full py-3 text-lg">
              Book Now
            </button>

            <p className="text-xs text-green-600 font-semibold">
              ✓ Available Now
            </p>
          </div>
        </div>

        {/* Philippines to UAE - Active Service */}
        <div 
          onClick={() => onSelectService('ph-to-uae')}
          className="bg-white border-2 border-primary-600 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
        >
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-primary-100 p-4 rounded-full">
                <Plane className="w-12 h-12 text-primary-600" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-800">
              Philippines → UAE
            </h3>
            
            <div className="space-y-2 text-gray-600">
              <p className="text-sm">🚀 Fast & Reliable</p>
              <p className="text-sm">📦 Door-to-Door Delivery</p>
              <p className="text-sm">✅ Track Your Shipment</p>
            </div>

            <button className="btn-primary w-full py-3 text-lg">
              Book Now
            </button>

            <p className="text-xs text-green-600 font-semibold">
              ✓ Available Now
            </p>
          </div>
        </div>

      </div>

      {/* Info Section */}
      <div className="max-w-4xl mx-auto mt-12">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">📞 Need Help?</h4>
          <p className="text-sm text-blue-700">
            Contact us at <strong>+971 55 973 8713</strong> for inquiries or assistance with your booking.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          KNEXY DELIVERY SERVICES L.L.C | Rocky Warehouse #19, 11th Street, Al Qusais Industrial Area 1, Dubai
        </p>
      </div>
    </div>
  )
}

