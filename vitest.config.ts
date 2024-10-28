import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: __dirname,
    include: ['__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
