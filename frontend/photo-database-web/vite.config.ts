import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { env } from "process"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: env.BASE_URL ?? "/",
  server: {
    host: true,
    port: 8081,
  },
  preview: {
    host: true,
    port: 8081,
  },
})
