/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_KEY: string
  readonly VITE_OCR_PROVIDER: string
  readonly VITE_AWS_REGION: string
  readonly VITE_AWS_ACCESS_KEY_ID: string
  readonly VITE_AWS_SECRET_ACCESS_KEY: string
  readonly VITE_AZURE_VISION_ENDPOINT: string
  readonly VITE_AZURE_VISION_KEY: string
  readonly VITE_GOOGLE_CLOUD_API_KEY: string
  readonly VITE_GOOGLE_CLOUD_PROJECT_ID: string
  readonly VITE_MINDEE_API_KEY: string
  readonly VITE_FACE_PROVIDER: string
  readonly VITE_AZURE_FACE_ENDPOINT: string
  readonly VITE_AZURE_FACE_KEY: string
  readonly VITE_FACEPP_API_KEY: string
  readonly VITE_FACEPP_API_SECRET: string
  readonly VITE_KAIROS_APP_ID: string
  readonly VITE_KAIROS_APP_KEY: string
  readonly VITE_IMAGE_UPLOAD_ENDPOINT: string
  readonly VITE_MAX_IMAGE_SIZE: string
  readonly VITE_ENABLE_SIMULATION_MODE: string
  readonly VITE_SIMULATION_DELAY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

