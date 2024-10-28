import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

const logs = path.join(__dirname, 'logs')
const stdout = 'test-console.stdout.log'
const stderr = 'test-console.stderr.log'

fs.existsSync(logs) || fs.mkdirSync(logs, { recursive: true })
for (const log of [stdout, stderr]) {
  // Clear cache logs
  fs.rmSync(path.join(logs, log), { recursive: true, force: true })
}

export default defineConfig({
  test: {
    root: __dirname,
    include: ['__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    onConsoleLog(log, type) {
      fs.appendFileSync(path.join(logs, `test-console.${type}.log`), log)
    },
  },
})
