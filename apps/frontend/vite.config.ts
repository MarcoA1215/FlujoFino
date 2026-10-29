/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: http: ws: wss:; frame-ancestors 'self';",
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'vendor-charts';
          }
          if (id.includes('@fullcalendar')) {
            return 'vendor-calendar';
          }
          if (id.includes('ionicons')) {
            return 'vendor-icons';
          }
          if (id.includes('@ionic')) {
            return 'vendor-ionic';
          }
          if (id.includes('@sentry')) {
            return 'vendor-sentry';
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    headers: securityHeaders,
    proxy: {
      '^/(auth|users|products|orders|raw-materials|production|delivery-zones|deliveries|dashboard|settings|reservations|storage|feedback|customers|superadmin|notifications|salary-advances|investments|promoters|fiscal|app-updates|public)': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    },
  },
  preview: {
    headers: securityHeaders,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
