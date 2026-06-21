import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'src/__tests__/e2e/**'],
    // Timeouts for different test types
    testTimeout: 10000, // 10s for unit/integration tests
    hookTimeout: 10000,
    // Coverage configuration with 90% target for business logic
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.js',
        '**/*.config.ts',
        'src/main.jsx', // Entry point
        'src/**/*.test.{js,jsx}',
        'src/**/*.spec.{js,jsx}',
        'src/__tests__/**',
      ],
      // Coverage thresholds: 90% target for business logic
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
      // Include specific directories for coverage
      include: [
        'src/utils/**',
        'src/services/**',
      ],
    },
  },
});
