import { useState } from 'react'
import { ArrowLeft, ArrowRight, Plane, Ship, Camera, Box, Shield, Truck, Home, Clock, Calendar, Hourglass } from 'lucide-react'

interface ServiceSelectionProps {
  onSelectService: (service: string) => void
  onBack?: () => void
}

export default function ServiceSelection({ onSelectService, onBack }: ServiceSelectionProps) {
  const [cargoType, setCargoType] = useState<'air' | 'sea'>('air')
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  const handleCargoTypeChange = (type: 'air' | 'sea') => {
    setCargoType(type)
    // Clear selection if switching to SEA CARGO and UAE TO PINAS was selected
    if (type === 'sea' && selectedRoute === 'uae-to-pinas') {
      setSelectedRoute(null)
    }
  }

  const handleNextStep = () => {
    if (selectedRoute) {
      onSelectService(selectedRoute)
    }
  }

  // Get route information based on selection
  const getRouteInfo = () => {
    if (!selectedRoute) return null

    if (selectedRoute === 'ph-to-uae') {
      return {
        title: 'PHILIPPINES TO UAE',
        originFlag: 'PH',
        destinationFlag: 'UAE',
        price: cargoType === 'air' ? 'AED 39 / Kilo' : 'AED 2699 / CBM',
        transitTime: cargoType === 'air' ? '2 - 3 days' : '30 - 40 days',
        minimumWeight: cargoType === 'air' ? 'No Minimum Weight' : 'Jumbo box',
        hubs: cargoType === 'air' 
          ? ['MANILA HUB', 'PAMPANGA HUB']
          : ['MANILA HUB', 'PAMPANGA HUB'],
        cutOff: cargoType === 'air' 
          ? 'MONDAY & THURSDAY until 7 PM'
          : 'Tentative',
        loading: cargoType === 'air'
          ? 'TUESDAY & FRIDAY'
          : 'Tentative'
      }
    } else if (selectedRoute === 'uae-to-pinas') {
      return {
        title: 'UAE TO PHILIPPINES',
        originFlag: 'UAE',
        destinationFlag: 'PH',
        price: 'AED 39 / Kilo',
        transitTime: '2 - 3 days',
        minimumWeight: 'No Minimum Weight',
        hubs: ['DUBAI HUB'],
        cutOff: 'MONDAY until 6 PM',
        loading: 'TUESDAY'
      }
    }
    return null
  }

  const routeInfo = getRouteInfo()

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
              {selectedRoute === 'uae-to-pinas' && (
                <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full">
                  <span className="text-sm font-semibold">UAE TO PHILIPPINES</span>
                  <button
                    onClick={() => setSelectedRoute(null)}
                    className="hover:bg-green-700 rounded-full p-1 transition-colors"
                  >
                    <span className="text-white text-sm">×</span>
                  </button>
                </div>
              )}
              {selectedRoute === 'ph-to-uae' && (
                <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full">
                  <span className="text-sm font-semibold">PHILIPPINES TO UAE</span>
                  <button
                    onClick={() => setSelectedRoute(null)}
                    className="hover:bg-green-700 rounded-full p-1 transition-colors"
                  >
                    <span className="text-white text-sm">×</span>
                  </button>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600 font-medium">
              Step 1 of 7: Select Service
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

      {/* Title Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-green-600 mb-2">
          Select Service
        </h1>
        <p className="text-lg text-gray-600">
          Choose your shipping service
        </p>
      </div>

      {/* Service Type Selection */}
      <div className="flex gap-4 justify-center mb-8">
        <button
          onClick={() => handleCargoTypeChange('air')}
          className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 ${
            cargoType === 'air'
              ? 'bg-green-700 text-white shadow-lg'
              : 'border-2 border-green-600 text-green-600 bg-white hover:bg-green-50'
          }`}
        >
          AIR CARGO
        </button>
        <button
          onClick={() => handleCargoTypeChange('sea')}
          className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 ${
            cargoType === 'sea'
              ? 'bg-green-700 text-white shadow-lg'
              : 'border-2 border-green-600 text-green-600 bg-white hover:bg-green-50'
          }`}
        >
          SEA CARGO
        </button>
      </div>

      {/* Main Content: Route Cards and Info Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Left Side: Route Cards */}
        <div className={`lg:col-span-2 ${cargoType === 'air' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'grid grid-cols-1 gap-6 max-w-md'}`}>
          {/* PINAS TO UAE */}
          <div
            onClick={() => setSelectedRoute('ph-to-uae')}
            className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 transform ${
              selectedRoute === 'ph-to-uae'
                ? 'border-green-600 shadow-xl scale-105'
                : 'border-gray-300 hover:border-green-400 hover:shadow-lg'
            }`}
          >
            {/* Route Image Placeholder */}
            <div className={`aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative ${
              selectedRoute === 'ph-to-uae' ? '' : 'grayscale'
            }`}>
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                {/* Route Label */}
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">PINAS TO UAE</h3>
                  {cargoType === 'sea' && (
                    <p className="text-sm font-semibold text-gray-600">VIA SEA CARGO</p>
                  )}
                </div>
                
                {/* Flags and Connection */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-12 bg-red-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">PH</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 border-t-2 border-dashed border-gray-600"></div>
                    {cargoType === 'sea' ? (
                      <Ship className="w-6 h-6 text-gray-600" />
                    ) : (
                      <Plane className="w-6 h-6 text-gray-600" />
                    )}
                    <div className="w-8 h-0.5 border-t-2 border-dashed border-gray-600"></div>
                  </div>
                  <div className="w-16 h-12 bg-gradient-to-r from-red-500 via-green-500 to-black rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">UAE</span>
                  </div>
                </div>

                {/* Box with Items */}
                <div className="bg-gray-100 border-2 border-gray-300 rounded p-4 w-full max-w-xs">
                  <div className="text-center mb-2">
                    <span className="text-xs font-bold text-gray-700">KN EXPRESS</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <div key={item} className="bg-gray-200 rounded h-12 flex items-center justify-center">
                        <span className="text-xs text-gray-500">📦</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Selection Indicator */}
            {selectedRoute === 'ph-to-uae' && (
              <div className="absolute top-2 right-2 bg-green-600 rounded-full p-2">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            )}
          </div>

          {/* UAE TO PINAS - Only show for AIR CARGO */}
          {cargoType === 'air' && (
            <div
              onClick={() => setSelectedRoute('uae-to-pinas')}
              className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 transform ${
                selectedRoute === 'uae-to-pinas'
                  ? 'border-green-600 shadow-xl scale-105'
                  : 'border-gray-300 hover:border-green-400 hover:shadow-lg'
              }`}
            >
              {/* Route Image Placeholder */}
              <div className={`aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative ${
                selectedRoute === 'uae-to-pinas' ? '' : 'grayscale'
              }`}>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  {/* Route Label */}
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">UAE TO PINAS</h3>
                  </div>
                  
                  {/* Flags and Connection */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-12 bg-gradient-to-r from-red-500 via-green-500 to-black rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">UAE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-0.5 border-t-2 border-dashed border-gray-600"></div>
                      <Plane className="w-6 h-6 text-gray-600" />
                      <div className="w-8 h-0.5 border-t-2 border-dashed border-gray-600"></div>
                    </div>
                    <div className="w-16 h-12 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">PH</span>
                    </div>
                  </div>

                  {/* Box with Items */}
                  <div className="bg-gray-100 border-2 border-gray-300 rounded p-4 w-full max-w-xs">
                    <div className="text-center mb-2">
                      <span className="text-xs font-bold text-gray-700">KN EXPRESS</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((item) => (
                        <div key={item} className="bg-gray-200 rounded h-12 flex items-center justify-center">
                          <span className="text-xs text-gray-500">📦</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Selection Indicator */}
              {selectedRoute === 'uae-to-pinas' && (
                <div className="absolute top-2 right-2 bg-green-600 rounded-full p-2">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Detailed Information Panel */}
        {routeInfo && (
          <div className="lg:col-span-1 bg-white border-2 border-green-600 rounded-lg p-6 shadow-lg">
            {/* Route Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-green-600">
              <div className="w-12 h-8 bg-red-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">{routeInfo.originFlag}</span>
              </div>
              <div className="text-center flex-1 mx-4">
                <h3 className="text-lg font-bold text-gray-800">{routeInfo.title}</h3>
                <p className="text-sm font-semibold text-green-600">{cargoType === 'air' ? 'AIR CARGO' : 'SEA CARGO'}</p>
              </div>
              <div className="w-12 h-8 bg-gradient-to-r from-red-500 via-green-500 to-black rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">{routeInfo.destinationFlag}</span>
              </div>
            </div>

            {/* Pricing */}
            <div className="flex items-center gap-3 mb-4">
              <Camera className="w-5 h-5 text-green-600" />
              <span className="text-gray-800 font-semibold">
                <strong>Pricing:</strong> {routeInfo.price}
              </span>
            </div>

            {/* Transit Time */}
            <div className="flex items-center gap-3 mb-4">
              {cargoType === 'sea' ? (
                <Ship className="w-5 h-5 text-green-600" />
              ) : (
                <Plane className="w-5 h-5 text-green-600" />
              )}
              <span className="text-gray-800">
                <strong>Transit Time:</strong> {routeInfo.transitTime}
              </span>
            </div>

            {/* Minimum Weight/Volume */}
            <div className="mb-6">
              <span className="text-gray-800 font-medium">
                <strong>{cargoType === 'sea' ? 'Minimum Volume:' : 'Minimum Weight:'}</strong> {routeInfo.minimumWeight || 'No Minimum Weight'}
              </span>
            </div>

            {/* Inclusions */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <Box className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Free Packing</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">100% Insured</span>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">All transit fees from origin to destination</span>
              </div>
            </div>

            {/* Dropping Point Information */}
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-bold text-green-800 mb-3">DROPPING POINT</h3>
              
              {selectedRoute === 'uae-to-pinas' ? (
                // UAE TO PINAS - Rocky Warehouse
                <>
                  <div className="space-y-2">
                    <div className="bg-green-600 text-white px-3 py-2 rounded-lg">
                      <span className="font-semibold text-sm">ADDRESS:</span>
                      <p className="mt-1 text-white text-sm">Rocky Warehouse #19, 11th Street<br />Al Qusais Industrial Area 1, Dubai</p>
                    </div>
                    
                    <div className="bg-green-600 text-white px-3 py-2 rounded-lg">
                      <span className="font-semibold text-sm">CONTACT PERSON:</span>
                      <p className="mt-1 text-white text-sm">Jayson Cuartel</p>
                    </div>
                    
                    <div className="bg-green-600 text-white px-3 py-2 rounded-lg">
                      <span className="font-semibold text-sm">CONTACT NO.:</span>
                      <p className="mt-1 text-white text-sm">+971 55 690 3632</p>
                    </div>
                  </div>
                </>
              ) : (
                // PHILIPPINES TO UAE - Parañaque Dropping Point
                <>
                  <div className="space-y-2">
                    <div className="bg-green-600 text-white px-3 py-2 rounded-lg">
                      <span className="font-semibold text-sm">ADDRESS:</span>
                      <p className="mt-1 text-white text-sm">#81 Dr. A. Santos Ave., Brgy. San Antonio, Parañaque City 1700</p>
                    </div>
                    
                    <div className="bg-green-600 text-white px-3 py-2 rounded-lg">
                      <span className="font-semibold text-sm">NEAREST LANDMARK:</span>
                      <p className="mt-1 text-white text-sm">BESIDE 'D ORIGINAL PARES' AND INFRONT OF LOYOLA MEMORIAL PARK</p>
                    </div>
                    
                    <div className="bg-green-600 text-white px-3 py-2 rounded-lg">
                      <span className="font-semibold text-sm">CONTACT PERSON:</span>
                      <p className="mt-1 text-white text-sm">CARMEN SUBA</p>
                    </div>
                    
                    <div className="bg-green-600 text-white px-3 py-2 rounded-lg">
                      <span className="font-semibold text-sm">CONTACT NO.:</span>
                      <p className="mt-1 text-white text-sm">+63 938 490 2564</p>
                    </div>
                  </div>

                  {/* Loading Schedules */}
                  <div className="border-2 border-dashed border-green-500 rounded-lg p-3 mt-3 space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-green-800 text-sm">TUESDAY LOADING</h4>
                      <p className="text-red-600 font-semibold text-xs">RECEIVING TIME: 10:00 AM to 8:00 PM</p>
                      <p className="text-xs text-gray-700">Friday Arrival (Saturday or Sunday Delivery)</p>
                      <p className="text-xs font-semibold text-green-800">Monday is our cut-off day!</p>
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="font-bold text-green-800 text-sm">FRIDAY LOADING</h4>
                      <p className="text-red-600 font-semibold text-xs">RECEIVING TIME: 10:00 AM to 8:00 PM</p>
                      <p className="text-xs text-gray-700">Monday Arrival (Monday or Tuesday Delivery)</p>
                      <p className="text-xs font-semibold text-green-800">Thursday is our cut-off day!</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next Step Button */}
      <div className="flex justify-end mt-8">
        <button
          onClick={handleNextStep}
          disabled={!selectedRoute}
          className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 ${
            selectedRoute
              ? 'bg-green-700 text-white shadow-lg hover:bg-green-800 hover:shadow-xl transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>Next Step</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
      </div>
    </div>
  )
}
