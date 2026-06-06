import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    /* VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'B.Smart PER/DCOMPs',
        short_name: 'B.Smart DCOMPs',
        description: 'Simulador de Cascatas Tributárias - Balera',
        theme_color: '#030305',
        background_color: '#030305',
        display: 'standalone',
        icons: [
          {
            src: '/balera_logo_novo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/balera_logo_novo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }) */
  ],
})
