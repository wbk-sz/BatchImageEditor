import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './',
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': 'http://127.0.0.1:5000',
            '/health': 'http://127.0.0.1:5000',
            '/process': 'http://127.0.0.1:5000',
            '/convert-pdf': 'http://127.0.0.1:5000',
            '/convert-pptx': 'http://127.0.0.1:5000',
            '/extract-pdf-pages': 'http://127.0.0.1:5000',
        },
    },
})
