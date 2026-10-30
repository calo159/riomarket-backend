import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    // Evita el polyfill inline para poder usar una CSP estricta (script-src 'self').
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        // Las librerías cambian poco: separadas del código de la app, el navegador las conserva
        // en caché entre despliegues. Los formularios (zod, react-hook-form) ya van en su chunk.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor-react";
          if (/node_modules\/(react-router|react-router-dom)\//.test(id)) return "vendor-router";
          if (/node_modules\/(@tanstack|axios)\//.test(id)) return "vendor-datos";
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      "/media": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: { port: 3000 },
});
