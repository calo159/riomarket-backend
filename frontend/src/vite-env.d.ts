/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_SANDBOX_PAGOS?: string;
  readonly VITE_TARIFA_DOMICILIO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
