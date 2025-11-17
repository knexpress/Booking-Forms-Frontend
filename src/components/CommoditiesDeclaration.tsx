import { useState } from 'react'
import { ArrowLeft, ArrowRight, Package, Grid3x3, Plus, Trash2, Info } from 'lucide-react'
import { BookingFormData, ItemDeclaration } from '../types'

interface CommoditiesDeclarationProps {
  onNext: (items: ItemDeclaration[]) => void
  onBack?: () => void
  initialData?: BookingFormData | null
  service?: string | null
}

export default function CommoditiesDeclaration({ onNext, onBack, initialData, service }: CommoditiesDeclarationProps) {
  const [items, setItems] = useState<ItemDeclaration[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [{ id: Date.now().toString(), commodity: '', qty: 0 }]
  )
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Determine route
  const route = (service || initialData?.service || 'uae-to-pinas').toLowerCase()
  const isPhToUae = route === 'ph-to-uae'
  const routeDisplay = isPhToUae ? 'PHILIPPINES TO UAE' : 'UAE TO PHILIPPINES'

  // Calculate total quantity
  const totalQuantity = items.reduce((sum, item) => sum + (item.qty || 0), 0)

  const addItem = () => {
    if (items.length < 20) {
      setItems([...items, { id: Date.now().toString(), commodity: '', qty: 0 }])
    }
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: 'commodity' | 'qty', value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
    // Clear error for this item when user starts typing
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`${id}-commodity`]
      delete newErrors[`${id}-qty`]
      delete newErrors.general
      return newErrors
    })
  }
  
  const validateItems = () => {
    const newErrors: { [key: string]: string } = {}
    
    items.forEach(item => {
      if (!item.commodity.trim()) {
        newErrors[`${item.id}-commodity`] = 'Item name is required'
      } else if (item.commodity.trim().length < 2) {
        newErrors[`${item.id}-commodity`] = 'Item name must be at least 2 characters'
      }
      
      if (!item.qty || item.qty <= 0) {
        newErrors[`${item.id}-qty`] = 'Quantity must be greater than 0'
      } else if (item.qty > 9999) {
        newErrors[`${item.id}-qty`] = 'Quantity cannot exceed 9999'
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    const isValid = validateItems()
    if (!isValid) {
      // Wait for state update, then scroll to first error
      setTimeout(() => {
        const errorKeys = Object.keys(errors)
        if (errorKeys.length > 0) {
          const firstErrorId = errorKeys[0]
          const element = document.getElementById(firstErrorId)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.focus()
          }
        }
      }, 100)
      return
    }
    
    // Filter out empty items (though validation should prevent this)
    const validItems = items.filter(item => item.commodity.trim() !== '' && item.qty > 0)
    
    if (validItems.length === 0) {
      setErrors({ general: 'Please add at least one item with a name and quantity greater than 0.' })
      return
    }

    onNext(validItems)
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
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium hidden xs:block whitespace-nowrap">
              Step 4 of 6
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 lg:space-y-8">
          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 mb-2">Commodities Declaration</h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600">Confirm the items of your shipment.</p>
          </div>

          {/* Information Alert */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Declaring your item allows us to better assist in the event of disputes.
            </p>
          </div>

          {/* Volumetric Weight Computation */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-blue-800">VOLUMETRIC WEIGHT COMPUTATION</h3>
            
            <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-blue-900">
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                <span className="font-semibold flex-shrink-0">Formula:</span>
                <span className="flex-1">
                  Length by cm × Width by cm × Height by cm ÷ 5,500 = Volumetric Weight of your box
                </span>
              </div>
              
              <div className="bg-white border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Check your box dimension</p>
                <p className="text-xs sm:text-sm text-blue-700">
                  <strong>Example:</strong> 30cm × 40cm × 50cm ÷ 5,500 = <strong className="text-blue-900">10.9 Kilo</strong>
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2 sm:p-3">
                <p className="text-xs sm:text-sm font-semibold text-yellow-900">
                  ⚠️ If Actual weight is more than Volumetric Weight. Charges will be based on the actual weight.
                </p>
              </div>
            </div>
          </div>

          {/* Banned Items */}
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-red-800 mb-2 sm:mb-3">BANNED ITEMS</h3>
            <p className="text-xs sm:text-sm text-red-900 font-semibold mb-3 sm:mb-4">
              Please be reminded that the following items are STRICTLY PROHIBITED from shipment:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="space-y-1 sm:space-y-2">
                <div className="text-xs sm:text-sm text-red-900">* Flammable / Explosive Items</div>
                <div className="text-xs sm:text-sm text-red-900">* Deadly Weapons</div>
                <div className="text-xs sm:text-sm text-red-900">* Illegal Drugs / Vape / Cigarettes / Alcoholic Drinks</div>
                <div className="text-xs sm:text-sm text-red-900">* Expensive / Original Jewelries (gold or silver)</div>
                <div className="text-xs sm:text-sm text-red-900">* Money / Cash</div>
                <div className="text-xs sm:text-sm text-red-900">* Live Animals</div>
                <div className="text-xs sm:text-sm text-red-900">* Frozen Goods / Any Pork Items</div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="text-xs sm:text-sm text-red-900">* Medicines / Supplements / Capsules / Vitamins / Injectables</div>
                <div className="text-xs sm:text-sm text-red-900">* Adult Toys</div>
                <div className="text-xs sm:text-sm text-red-900">* Religious Items</div>
                <div className="text-xs sm:text-sm text-red-900">* Long items (more than 200 cm are not allowed)</div>
                <div className="text-xs sm:text-sm text-red-900">* Contact lens / Eye drops / Eye solution</div>
                <div className="text-xs sm:text-sm text-red-900">* Perishable Goods (spoils easily)</div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-red-900 font-bold">
              Anything Illegal is STRICTLY BANNED.
            </p>
          </div>

          {/* Registered Commodities Section */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Registered Commodities</h2>
            
            {/* General Error Message */}
            {errors.general && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}
            
            {/* Table Header */}
            <div className="bg-green-700 text-white rounded-t-lg p-3 sm:p-4 flex flex-row items-center justify-between gap-2 sm:gap-3 lg:gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="font-semibold text-xs sm:text-sm lg:text-base">Item Name <span className="text-red-300">*</span></span>
              </div>
              <div className="flex items-center gap-2 w-20 sm:w-24 md:w-32 flex-shrink-0 justify-center">
                <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="font-semibold text-xs sm:text-sm lg:text-base">Quantity <span className="text-red-300">*</span></span>
              </div>
            </div>

            {/* Item Rows */}
            <div className="space-y-3 border-x border-b border-gray-200 rounded-b-lg p-3 sm:p-4">
              {items.map((item) => (
                <div key={item.id} className="flex flex-row items-start gap-2 sm:gap-3 lg:gap-4">
                  <div className="flex-1 min-w-0">
                    <input
                      id={`${item.id}-commodity`}
                      type="text"
                      value={item.commodity}
                      onChange={(e) => updateItem(item.id, 'commodity', e.target.value)}
                      onBlur={() => validateItems()}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base min-h-[44px] ${
                        errors[`${item.id}-commodity`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter item name (e.g., Electronics, Clothing)"
                      maxLength={100}
                    />
                    {errors[`${item.id}-commodity`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`${item.id}-commodity`]}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Required • 2-100 characters</p>
                  </div>
                  <div className="w-20 sm:w-24 md:w-32 flex-shrink-0">
                    <input
                      id={`${item.id}-qty`}
                      type="number"
                      min="1"
                      max="9999"
                      value={item.qty || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0
                        if (value >= 0 && value <= 9999) {
                          updateItem(item.id, 'qty', value)
                        }
                      }}
                      onBlur={() => validateItems()}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-center text-base min-h-[44px] ${
                        errors[`${item.id}-qty`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    {errors[`${item.id}-qty`] && (
                      <p className="mt-1 text-xs text-red-600 text-center">{errors[`${item.id}-qty`]}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 text-center">Required • 1-9999</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              {items.length > 1 && (
                <button
                  onClick={() => {
                    const lastItem = items[items.length - 1]
                    removeItem(lastItem.id)
                    // Clear errors for removed item
                    setErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors[`${lastItem.id}-commodity`]
                      delete newErrors[`${lastItem.id}-qty`]
                      return newErrors
                    })
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              )}
              {items.length < 20 && (
                <button
                  onClick={addItem}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors text-sm sm:text-base min-h-[44px]"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Add More</span>
                </button>
              )}
            </div>

            {/* Total Quantity Display */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700">
                TOTAL ITEM QUANTITY: <span className="text-green-600">{totalQuantity}</span>
              </p>
            </div>
          </div>

          {/* Next Step Button */}
          <div className="flex justify-end pt-4 sm:pt-6">
            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-2 bg-green-700 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-green-800 active:bg-green-900 transition-colors w-full sm:w-auto text-base sm:text-lg min-h-[48px] shadow-md hover:shadow-lg"
            >
              <span>Next Step</span>
              <ArrowRight className="w-5 h-5 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

