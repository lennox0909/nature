import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 引入外掛

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 啟用外掛
  ],
})