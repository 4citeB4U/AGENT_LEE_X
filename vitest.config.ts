import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Minimal Vitest config without ESM-only plugins to avoid CJS/ESM interop issues
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setupTests.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  passWithNoTests: false
  }
})
