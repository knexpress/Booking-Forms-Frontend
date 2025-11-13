import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface IDScanModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title: string
}

export default function IDScanModal({ isOpen, onClose, children, title }: IDScanModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-2 sm:p-4"
      onClick={(e) => {
        // Close if clicking backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        ref={modalRef}
        className="relative bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[100vh] sm:max-h-[98vh] md:max-h-[95vh] flex flex-col overflow-hidden animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-3 md:p-4 lg:p-6 border-b border-gray-200 bg-green-600 text-white flex-shrink-0">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold pr-2 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-green-700 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

