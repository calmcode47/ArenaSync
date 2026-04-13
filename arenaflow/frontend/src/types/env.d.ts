/**
 * env.d.ts — Vite environment variable type declarations
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_DEMO_EMAIL: string
  readonly VITE_DEMO_PASSWORD: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
