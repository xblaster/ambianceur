import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Ambianceur",
        short_name: "Ambianceur",
        description: "Le jeu de questions anonymes entre amis.",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#171a3a",
        theme_color: "#171a3a",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/parties\//],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:8787",
      "/parties": { target: "ws://localhost:8787", ws: true },
    },
  },
});
