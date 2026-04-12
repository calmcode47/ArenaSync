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
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,    // disable sourcemaps to minimize bundle size
    chunkSizeWarningLimit: 2000,

    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor bundles to enable parallel browser downloads
          "three-core":    ["three"],
          "three-r3f":     ["@react-three/fiber", "@react-three/drei"],
          "three-post":    ["@react-three/postprocessing"],
          "recharts":      ["recharts"],
          "google-maps":   ["@react-google-maps/api"],
          "motion":        ["framer-motion"],
          "query":         ["@tanstack/react-query"],
          "vendor":        ["react", "react-dom", "react-router-dom", "axios", "zustand"]
        }
      },
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
    target: "esnext",
    legalComments: "none"
  }
});
