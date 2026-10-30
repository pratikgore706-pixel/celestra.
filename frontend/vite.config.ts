import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site calls /api/...; Vite forwards it to the Python server on 127.0.0.1:8000.
// This avoids CORS and the Windows "localhost resolves to IPv6" problem.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } },
  },
});
