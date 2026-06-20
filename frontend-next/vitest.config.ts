import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/node_modules.hdd-backup/**',
      '**/.next/**',
      '**/.next-dev/**',
      '**/dist/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: Number(process.env.FRONTEND_COVERAGE_STATEMENTS ?? 35),
        branches: Number(process.env.FRONTEND_COVERAGE_BRANCHES ?? 25),
        functions: Number(process.env.FRONTEND_COVERAGE_FUNCTIONS ?? 35),
        lines: Number(process.env.FRONTEND_COVERAGE_LINES ?? 35),
      },
      exclude: [
        'node_modules/',
        'node_modules.hdd-backup/',
        'dist/',
        '.next/',
        '.next-dev/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
