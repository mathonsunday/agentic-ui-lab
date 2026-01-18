import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite will show terminal errors from the TypeScript checker
    // Type checking is enforced via `npm run dev` script (tsc -b --noEmit)
    warmup: {
      clientFiles: ['src/**/*.tsx', 'src/**/*.ts'],
    },
  },
})
