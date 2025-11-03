import { API_CONFIG } from '../config/api.config'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload image to server storage
 * @param imageBase64 Base64 encoded image
 * @param type Type of image (eid-front, eid-back, face)
 * @param bookingId Optional booking ID to associate with
 */
export async function uploadImage(
  imageBase64: string,
  type: 'eid-front' | 'eid-back' | 'face',
  bookingId?: string
): Promise<UploadResult> {
  try {
    // Convert base64 to blob
    const blob = base64ToBlob(imageBase64)
    
    // Create form data
    const formData = new FormData()
    formData.append('image', blob, `${type}-${Date.now()}.jpg`)
    formData.append('type', type)
    if (bookingId) {
      formData.append('bookingId', bookingId)
    }
    
    // Upload to server
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.imageUpload.endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        },
        body: formData,
      }
    )
    
    if (!response.ok) {
      throw new Error('Image upload failed')
    }
    
    const result = await response.json()
    
    return {
      success: true,
      url: result.url,
    }
  } catch (error) {
    console.error('Image upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Upload multiple images in parallel
 */
export async function uploadMultipleImages(
  images: { data: string; type: 'eid-front' | 'eid-back' | 'face' }[],
  bookingId?: string
): Promise<UploadResult[]> {
  const uploads = images.map(img => uploadImage(img.data, img.type, bookingId))
  return Promise.all(uploads)
}

/**
 * Convert base64 to Blob
 */
function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',')
  const contentType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const raw = atob(parts[1])
  const rawLength = raw.length
  const uInt8Array = new Uint8Array(rawLength)
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }
  
  return new Blob([uInt8Array], { type: contentType })
}

/**
 * Compress image before upload
 * @param base64 Base64 encoded image
 * @param maxWidth Maximum width
 * @param quality JPEG quality (0-1)
 */
export async function compressImage(
  base64: string,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      
      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = base64
  })
}

/**
 * Validate image size
 */
export function validateImageSize(base64: string): boolean {
  const sizeInBytes = (base64.length * 3) / 4 - 2
  return sizeInBytes <= API_CONFIG.imageUpload.maxSize
}


