// API Configuration
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  apiKey: import.meta.env.VITE_API_KEY || '',
  
  // OCR Configuration
  ocr: {
    provider: import.meta.env.VITE_OCR_PROVIDER || 'aws',
    aws: {
      region: import.meta.env.VITE_AWS_REGION || 'me-south-1',
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
    },
    azure: {
      endpoint: import.meta.env.VITE_AZURE_VISION_ENDPOINT || '',
      apiKey: import.meta.env.VITE_AZURE_VISION_KEY || '',
    },
    google: {
      apiKey: import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || '',
      projectId: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID || '',
    },
    mindee: {
      apiKey: import.meta.env.VITE_MINDEE_API_KEY || '',
    },
  },
  
  // Face Recognition Configuration
  face: {
    provider: import.meta.env.VITE_FACE_PROVIDER || 'aws',
    aws: {
      region: import.meta.env.VITE_AWS_REGION || 'me-south-1',
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
    },
    azure: {
      endpoint: import.meta.env.VITE_AZURE_FACE_ENDPOINT || '',
      apiKey: import.meta.env.VITE_AZURE_FACE_KEY || '',
    },
    facepp: {
      apiKey: import.meta.env.VITE_FACEPP_API_KEY || '',
      apiSecret: import.meta.env.VITE_FACEPP_API_SECRET || '',
    },
    kairos: {
      appId: import.meta.env.VITE_KAIROS_APP_ID || '',
      appKey: import.meta.env.VITE_KAIROS_APP_KEY || '',
    },
  },
  
  // Image Upload
  imageUpload: {
    endpoint: import.meta.env.VITE_IMAGE_UPLOAD_ENDPOINT || '/api/upload',
    maxSize: parseInt(import.meta.env.VITE_MAX_IMAGE_SIZE || '5242880'),
  },
  
  // Feature Flags
  features: {
    // Enable simulation mode by default if no API keys are configured
    simulationMode: import.meta.env.VITE_ENABLE_SIMULATION_MODE !== 'false' && 
                     (import.meta.env.VITE_ENABLE_SIMULATION_MODE === 'true' || 
                      !import.meta.env.VITE_AWS_ACCESS_KEY_ID),
    simulationDelay: parseInt(import.meta.env.VITE_SIMULATION_DELAY || '2000'),
  },
}

// Validate required configuration
export const validateConfig = () => {
  const errors: string[] = []
  
  if (!API_CONFIG.features.simulationMode) {
    // Check OCR provider config
    const ocrProvider = API_CONFIG.ocr.provider
    switch (ocrProvider) {
      case 'aws':
        if (!API_CONFIG.ocr.aws.accessKeyId || !API_CONFIG.ocr.aws.secretAccessKey) {
          errors.push('AWS credentials are required for OCR')
        }
        break
      case 'azure':
        if (!API_CONFIG.ocr.azure.endpoint || !API_CONFIG.ocr.azure.apiKey) {
          errors.push('Azure Vision credentials are required for OCR')
        }
        break
      case 'google':
        if (!API_CONFIG.ocr.google.apiKey) {
          errors.push('Google Cloud API key is required for OCR')
        }
        break
      case 'mindee':
        if (!API_CONFIG.ocr.mindee.apiKey) {
          errors.push('Mindee API key is required for OCR')
        }
        break
    }
    
    // Check Face provider config
    const faceProvider = API_CONFIG.face.provider
    switch (faceProvider) {
      case 'aws':
        if (!API_CONFIG.face.aws.accessKeyId || !API_CONFIG.face.aws.secretAccessKey) {
          errors.push('AWS credentials are required for face recognition')
        }
        break
      case 'azure':
        if (!API_CONFIG.face.azure.endpoint || !API_CONFIG.face.azure.apiKey) {
          errors.push('Azure Face API credentials are required')
        }
        break
      case 'facepp':
        if (!API_CONFIG.face.facepp.apiKey || !API_CONFIG.face.facepp.apiSecret) {
          errors.push('Face++ credentials are required')
        }
        break
      case 'kairos':
        if (!API_CONFIG.face.kairos.appId || !API_CONFIG.face.kairos.appKey) {
          errors.push('Kairos credentials are required')
        }
        break
    }
  }
  
  return { valid: errors.length === 0, errors }
}


