import React from 'react'

interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
}

export default function LoadingOverlay({ isVisible, message = 'Loading...' }: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md mx-4 text-center">
        {/* Animated Loading Spinner */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-primary-600 rounded-full animate-spin"></div>
          
          {/* Middle pulsing circle */}
          <div className="absolute inset-4 border-4 border-primary-100 rounded-full"></div>
          <div className="absolute inset-4 border-4 border-transparent border-r-primary-500 rounded-full animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}></div>
          
          {/* Inner pulsing dot */}
          <div className="absolute inset-8 bg-primary-600 rounded-full animate-pulse"></div>
        </div>

        {/* Loading message */}
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          {message}
        </h3>
        
        {/* Animated dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Progress bar animation */}
        <div className="mt-6 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 rounded-full" style={{
            animation: 'shimmer 1.5s infinite',
          }}></div>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  )
}
