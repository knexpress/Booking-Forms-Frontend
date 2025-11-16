import { useState, useCallback, useEffect } from 'react'
import Toast, { ToastProps } from './Toast'

export interface ToastData {
  id: string
  type: 'success' | 'error'
  message: string
  referenceNumber?: string
  onPrint?: () => void
  duration?: number
}

let toastShowFunction: ((toast: Omit<ToastData, 'id'>) => string) | null = null

export function showToast(toast: Omit<ToastData, 'id'>): string {
  if (toastShowFunction) {
    return toastShowFunction(toast)
  }
  return ''
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToastInternal = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { ...toast, id }])
    return id
  }, [])

  useEffect(() => {
    toastShowFunction = showToastInternal
    return () => {
      toastShowFunction = null
    }
  }, [showToastInternal])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <div className="fixed top-0 right-0 z-50 pointer-events-none">
      <div className="flex flex-col gap-3 p-4 pointer-events-auto">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </div>
    </div>
  )
}

