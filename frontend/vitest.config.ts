import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        include: [
          'src/api/**/*.ts',
          'src/features/contacts/contactDisplay.ts',
          'src/features/cameras/snapshotErrorMessage.ts',
          'src/features/emergency/emergencyLocationFromSearch.ts',
          'src/setupAuthBackground.ts',
        ],
        exclude: [
          '**/*.test.ts',
          '**/*.spec.ts',
          '**/test/**',
          'src/vite-env.d.ts',
          'src/api/httpClient.ts',
        ],
        thresholds: {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
      },
    },
  }),
)
