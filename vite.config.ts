import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared')
    }
  },
  server: {
    port: 3410,
    proxy: {
      '/api': {
        target: 'http://localhost:8410',
        changeOrigin: true
      }
    }
  }
})
