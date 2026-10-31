import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Precarga la fuente principal (Figtree, latín) con el nombre que le pone Vite, que lleva hash.
 * Sin esto el navegador la descubre al leer el CSS y repinta el texto cuando llega. Va desde el
 * propio sitio (la CSP solo permite `font-src 'self' data:`) y no hace falta ningún script.
 */
function precargaDeFuente(): Plugin {
  return {
    name: "precarga-de-fuente",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, contexto) {
        const archivo = Object.keys(contexto.bundle ?? {}).find((nombre) =>
          /^assets\/figtree-latin-wght-normal-[\w-]+\.woff2$/.test(nombre),
        );
        if (!archivo) return [];
        return [
          {
            tag: "link",
            attrs: { rel: "preload", href: `/${archivo}`, as: "font", type: "font/woff2", crossorigin: "" },
            injectTo: "head",
          },
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), precargaDeFuente()],
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
