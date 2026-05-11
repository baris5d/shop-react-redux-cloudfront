/// <reference types="vitest" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ENDPOINT?: string;
  readonly VITE_IMPORT_API_ENDPOINT?: string;
  readonly VITE_CART_API_ENDPOINT?: string;
  readonly VITE_AUTH_USERNAME?: string;
  readonly VITE_AUTH_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
