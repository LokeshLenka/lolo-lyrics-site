import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <--- Add this
  ],
  server: {
    host: true, // allows external connections
    allowedHosts: [".ngrok-free.app"], // allow all ngrok subdomains
  },
  build: {
    rollupOptions: {
      input: {
        // harness.html is a development-only mock surface and never ships
        main: resolve(import.meta.dirname, "index.html"),
      },
    },
  },
});
