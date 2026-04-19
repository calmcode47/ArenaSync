import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },

  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/ws":  { target: "ws://localhost:8000", changeOrigin: true, ws: true }
    }
  },

  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,    // disable sourcemaps to minimize bundle size
    chunkSizeWarningLimit: 2000,

    rollupOptions: {
      external: [],
    }
  },

  optimizeDeps: {
    include: [
      "three", "@react-three/fiber", "@react-three/drei",
      "framer-motion", "recharts"
    ],
    exclude: ["@react-three/postprocessing"]
  },

  esbuild: {
    target: "es2020",
    legalComments: "none"
  }
});
