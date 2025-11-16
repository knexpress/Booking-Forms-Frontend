/**
 * Error handling utilities
 */

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Parse error and return user-friendly message
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message
  }
  
  if (error instanceof NetworkError) {
    return 'Network connection failed. Please check your internet connection and try again.'
  }
  
  if (error instanceof APIError) {
    switch (error.statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.'
      case 401:
        return 'Authentication failed. Please refresh the page and try again.'
      case 403:
        return 'Access denied. You do not have permission to perform this action.'
      case 404:
        return 'Resource not found. Please try again.'
      case 429:
        return 'Too many requests. Please wait a moment and try again.'
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again in a few moments.'
      default:
        return error.message || 'An unexpected error occurred. Please try again.'
    }
  }
  
  if (error instanceof Error) {
    // Handle specific error messages
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection failed. Please check your internet connection.'
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }
    
    if (message.includes('camera') || message.includes('permission')) {
      return 'Camera access denied. Please allow camera permissions in your browser settings.'
    }
    
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
    shouldRetry?: (error: unknown, attempt: number) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = (error) => {
      // Retry on network errors and 5xx server errors
      if (error instanceof NetworkError) return true
      if (error instanceof APIError && error.statusCode && error.statusCode >= 500) return true
      return false
    },
  } = options
  
  let lastError: unknown
  let delay = initialDelay
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Check if we should retry this error
      if (!shouldRetry(error, attempt + 1)) {
        break
      }
      
      // Wait before retrying
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelay)
    }
  }
  
  throw lastError
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ])
}

/**
 * Error logger (can be extended to send to logging service)
 */
export function logError(
  error: unknown,
  context?: {
    component?: string
    action?: string
    userId?: string
    [key: string]: any
  }
) {
  console.error('Error occurred:', {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
    timestamp: new Date().toISOString(),
  })
  
  // In production, send to error tracking service (e.g., Sentry)
  // Sentry.captureException(error, { contexts: { custom: context } })
}

/**
 * Validate response and throw appropriate error
 */
export async function validateResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let errorCode: string | undefined
    
    if (contentType?.includes('application/json')) {
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
        errorCode = errorData.code
      } catch {
        // Failed to parse error response
      }
    }
    
    throw new APIError(errorMessage, response.status, errorCode)
  }
}


