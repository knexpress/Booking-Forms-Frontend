import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Package, AlertTriangle } from 'lucide-react'
import { BookingFormData, ItemDeclaration } from '../types'

interface Step1Props {
  onComplete: (data: BookingFormData) => void
  initialData?: BookingFormData | null
}

export default function Step1BookingForm({ onComplete, initialData }: Step1Props) {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<BookingFormData>({
    defaultValues: initialData || {
      receiver: { deliveryOption: 'address' }
    }
  })

  const [items, setItems] = useState<ItemDeclaration[]>(
    initialData?.items || [{ id: '1', commodity: '', qty: 1 }]
  )

  useEffect(() => {
    if (initialData?.items) {
      setItems(initialData.items)
    }
  }, [initialData])

  const addItem = () => {
    if (items.length < 20) {
      setItems([...items, { id: Date.now().toString(), commodity: '', qty: 1 }])
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
  }

  const onSubmit = (data: BookingFormData) => {
    // Validate items
    const validItems = items.filter(item => item.commodity.trim() !== '' && item.qty > 0)
    if (validItems.length === 0) {
      alert('Please add at least one item with commodity and quantity.')
      return
    }

    onComplete({ ...data, items: validItems })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
      {/* Header */}
      <div className="text-center border-b-4 border-primary-600 pb-6">
        <h1 className="text-3xl font-bold text-primary-700 mb-2">KN EXPRESS</h1>
        <h2 className="text-xl font-semibold text-gray-800">DIGITAL CARGO BOOKING FORM</h2>
        
        <div className="mt-6 bg-gray-50 p-4 rounded-lg text-left space-y-1">
          <p className="font-bold text-gray-800">KNEXY DELIVERY SERVICES L.L.C</p>
          <p className="text-sm text-gray-600">Rocky Warehouse #19, 11th Street, Al Qusais Industrial Area 1</p>
          <p className="text-sm text-gray-600">Dubai, 0000 United Arab Emirates</p>
          <p className="text-sm text-gray-600">Contact: <span className="font-semibold">+971559738713</span></p>
        </div>
      </div>

      {/* Sender Details */}
      <div className="space-y-4">
        <h3 className="section-header">Sender Details (UAE)</h3>
        
        <div>
          <label className="form-label">Full Name *</label>
          <input
            type="text"
            {...register('sender.fullName', { required: 'Sender name is required' })}
            className="form-input"
            placeholder="Enter Sender's Full Name"
          />
          {errors.sender?.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.sender.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Complete Address *</label>
          <textarea
            {...register('sender.completeAddress', { required: 'Sender address is required' })}
            className="form-input"
            rows={3}
            placeholder="Enter Complete UAE Address"
          />
          {errors.sender?.completeAddress && (
            <p className="text-red-500 text-sm mt-1">{errors.sender.completeAddress.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Contact No. *</label>
            <input
              type="tel"
              {...register('sender.contactNo', { 
                required: 'Contact number is required',
                pattern: {
                  value: /^\+971[0-9]{9}$/,
                  message: 'Enter valid UAE number (+971XXXXXXXXX)'
                }
              })}
              className="form-input"
              placeholder="+971XXXXXXXX"
            />
            {errors.sender?.contactNo && (
              <p className="text-red-500 text-sm mt-1">{errors.sender.contactNo.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              {...register('sender.emailAddress', { 
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter valid email address'
                }
              })}
              className="form-input"
              placeholder="sender@example.com"
            />
            {errors.sender?.emailAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.sender.emailAddress.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="form-label">Agent Name (Optional)</label>
          <input
            type="text"
            {...register('sender.agentName')}
            className="form-input"
            placeholder="If applicable"
          />
        </div>
      </div>

      {/* Receiver Details */}
      <div className="space-y-4">
        <h3 className="section-header">Receiver Details (Philippines)</h3>
        
        <div>
          <label className="form-label">Full Name *</label>
          <input
            type="text"
            {...register('receiver.fullName', { required: 'Receiver name is required' })}
            className="form-input"
            placeholder="Enter Receiver's Full Name"
          />
          {errors.receiver?.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.receiver.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Complete Address *</label>
          <textarea
            {...register('receiver.completeAddress', { required: 'Receiver address is required' })}
            className="form-input"
            rows={3}
            placeholder="Enter Complete PH Address"
          />
          {errors.receiver?.completeAddress && (
            <p className="text-red-500 text-sm mt-1">{errors.receiver.completeAddress.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Contact No. *</label>
            <input
              type="tel"
              {...register('receiver.contactNo', { 
                required: 'Contact number is required',
                pattern: {
                  value: /^\+63[0-9]{10}$/,
                  message: 'Enter valid PH number (+63XXXXXXXXXX)'
                }
              })}
              className="form-input"
              placeholder="+63XXXXXXXXXX"
            />
            {errors.receiver?.contactNo && (
              <p className="text-red-500 text-sm mt-1">{errors.receiver.contactNo.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              {...register('receiver.emailAddress', { 
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter valid email address'
                }
              })}
              className="form-input"
              placeholder="receiver@example.com"
            />
            {errors.receiver?.emailAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.receiver.emailAddress.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="form-label">Delivery Option *</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                {...register('receiver.deliveryOption', { required: true })}
                value="warehouse"
                className="w-4 h-4 text-primary-600"
              />
              <span>PH Warehouse Pick-Up</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                {...register('receiver.deliveryOption', { required: true })}
                value="address"
                className="w-4 h-4 text-primary-600"
                defaultChecked
              />
              <span>Deliver to PH Address</span>
            </label>
          </div>
        </div>
      </div>

      {/* Items Declaration */}
      <div className="space-y-4">
        <h3 className="section-header flex items-center">
          <Package className="mr-2" />
          Declaration of Items
        </h3>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            <AlertTriangle className="inline w-4 h-4 mr-1" />
            Please list all items accurately. Misdeclaration may lead to legal consequences.
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <span className="font-bold text-gray-600 w-8">{index + 1}.</span>
              
              <input
                type="text"
                value={item.commodity}
                onChange={(e) => updateItem(item.id, 'commodity', e.target.value)}
                className="form-input flex-1"
                placeholder="e.g., Clothes, Electronics"
              />
              
              <input
                type="number"
                value={item.qty}
                onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                className="form-input w-24"
                min="1"
                placeholder="Qty"
              />
              
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {items.length < 20 && (
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
          >
            <Plus className="w-5 h-5" />
            Add Another Item
          </button>
        )}
      </div>

      {/* Important Declaration */}
      <div className="bg-red-50 border-2 border-red-500 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-red-600 mb-3">IMPORTANT DECLARATION</h3>
        <p className="warning-text">
          By proceeding with this shipment, I declare that the contents of my shipment do not contain 
          any prohibited, illegal, or restricted items under international or local laws. I fully understand 
          that shipping illegal goods constitutes a criminal offense and is punishable by law. I acknowledge 
          that KNEXY Delivery Services acts solely as a carrier and shall not be held responsible for the 
          nature, condition, or contents of the shipment.
        </p>
      </div>

      {/* Volume Weight Computation */}
      <div className="info-box">
        <h3 className="font-bold text-blue-800 mb-2">VOLUME WEIGHT COMPUTATION</h3>
        <p className="text-sm text-blue-700 mb-2">
          <strong>Length (cm) × Width (cm) × Height (cm) ÷ 5,500 = Volumetric Weight</strong>
        </p>
        <p className="text-sm text-blue-600 mb-2">Check your box dimension.</p>
        <p className="text-sm text-blue-700">
          <strong>Example:</strong> 30cm × 40cm × 50cm ÷ 5,500 = 10.9 Kilo
        </p>
        <p className="text-sm text-blue-600 mt-2">
          If Actual weight is more than Volumetric Weight: Charges will be based on the actual weight.
        </p>
      </div>

      {/* Restricted Items */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
        <h3 className="font-bold text-orange-800 mb-3">RESTRICTED ITEMS</h3>
        <ul className="grid grid-cols-2 gap-2 text-sm text-orange-700">
          <li>• Any food with Pork Content</li>
          <li>• Weapons</li>
          <li>• Money</li>
          <li>• Car Batteries</li>
          <li>• Machine Batteries</li>
          <li>• Large Batteries</li>
          <li>• Jewelry</li>
          <li>• Medical Items</li>
          <li>• Cigarette</li>
          <li>• Items longer than 200cm</li>
        </ul>
      </div>

      {/* Dropping Point */}
      <div className="info-box">
        <h3 className="font-bold text-blue-800 mb-2">DROPPING POINT</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Address:</strong> 11th St. No. 19 Rocky Warehouse, Al Qusais Industrial Area 1, Dubai, UAE</p>
          <p><strong>Nearest Landmark:</strong> Rocky Warehouse Al Qusais Industrial Area 1</p>
          <p><strong>Contact Person:</strong> Jayson Cuartel</p>
          <p><strong>Contact No.:</strong> +971 55 690 3632</p>
        </div>
      </div>

      {/* Cut-off Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">TUESDAY LOADING</h3>
          <p className="text-sm text-green-700">Thursday Arrival</p>
          <p className="text-sm font-bold text-green-800 mt-2">Sunday is our cut-off day!</p>
        </div>
        
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">FRIDAY LOADING</h3>
          <p className="text-sm text-purple-700">Sunday Arrival</p>
          <p className="text-sm font-bold text-purple-800 mt-2">Wednesday is our cut-off day!</p>
        </div>
      </div>

      {/* Return & Refund Policy */}
      <div className="bg-red-50 border-2 border-red-500 p-6 rounded-lg text-center">
        <h3 className="text-xl font-bold text-red-600 mb-3">RETURN & REFUND POLICY</h3>
        <div className="space-y-2">
          <p className="text-3xl font-bold text-red-600">VIDEO</p>
          <p className="text-3xl font-bold text-red-600">NO RETURN</p>
          <p className="text-3xl font-bold text-red-600">REFUND</p>
          <p className="text-sm text-red-700 mt-4">
            VIDEO MUST BE PROVIDED WHILE UNBOXING THE ITEMS. THANK YOU.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button type="submit" className="btn-primary w-full text-lg py-4">
          Proceed to Identity Verification →
        </button>
      </div>
    </form>
  )
}

