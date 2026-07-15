/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Points the dev/preview build at deployed serverless functions (same-origin in prod). */
  readonly VITE_API_BASE?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_POSTHOG_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
