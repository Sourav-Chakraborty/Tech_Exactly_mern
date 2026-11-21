import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Must match CLIENT_URL in the backend .env (CORS + OAuth redirects).
  server: { port: 5173, strictPort: true },
});
