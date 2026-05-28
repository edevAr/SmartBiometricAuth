import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    /** Permite abrir la app desde otra máquina: http://<IP-de-este-PC>:5173 */
    host: true,
    port: 5173,
    strictPort: false,
  },
})
