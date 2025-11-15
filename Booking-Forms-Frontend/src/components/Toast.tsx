import { useEffect } from 'react'
import { CheckCircle, XCircle, X, Printer } from 'lucide-react'

export interface ToastProps {
  id: string
  type: 'success' | 'error'
  message: string
  referenceNumber?: string
  onClose: (id: string) => void
  onPrint?: () => void
  duration?: number
}

export default function Toast({ 
  id, 
  type, 
  message, 
  referenceNumber,
  onClose, 
  onPrint,
  duration = 5000 
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  return (
    <div className={`
      max-w-md w-full
      bg-white rounded-lg shadow-2xl border-l-4
      ${type === 'success' ? 'border-green-500' : 'border-red-500'}
      transform transition-all duration-300 ease-in-out
      animate-slide-in
    `}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {type === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message}
            </p>
            
            {referenceNumber && (
              <p className="text-sm text-gray-600 mt-1">
                Reference Number: <span className="font-mono font-semibold">{referenceNumber}</span>
              </p>
            )}
            
            {type === 'success' && onPrint && (
              <button
                onClick={onPrint}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors shadow-md hover:shadow-lg"
              >
                <Printer className="w-4 h-4" />
                Print Booking Form
              </button>
            )}
            
            {type === 'success' && (
              <p className="text-xs text-gray-500 mt-2">
                You will receive a confirmation email shortly.
              </p>
            )}
          </div>
          
          <button
            onClick={() => onClose(id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

