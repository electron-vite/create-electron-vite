import fs from 'node:fs'
import path from 'node:path'
import cp from 'node:child_process'
import {
  type ElectronApplication,
  type Page,
  type JSHandle,
  _electron as electron,
} from 'playwright'
import type { BrowserWindow } from 'electron'
import {
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
} from 'vitest'

const CLI_PATH = path.join(__dirname, '..')
const projectName = 'electron-vite-test'
const generatePath = path.join(CLI_PATH, projectName)
let electronApp: ElectronApplication
let page: Page

beforeAll(async () => {
  fs.rmSync(generatePath, { recursive: true, force: true })

  await createProject()

  // enableElectronMirror()

  const installLogs = execSync('npm install')
  writeFileSync('npm-install.log', installLogs)

  const buildLogs = execSync('vite build')
  writeFileSync('vite-build.log', buildLogs)

  electronApp = await electron.launch({
    args: ['.', '--no-sandbox'],
    cwd: generatePath,
    env: { ...process.env, NODE_ENV: 'development' },
  })
  page = await electronApp.firstWindow()

  const mainWin: JSHandle<BrowserWindow> = await electronApp.browserWindow(page)
  await mainWin.evaluate(async (win) => {
    win.webContents.executeJavaScript('console.log("Execute JavaScript with e2e testing.")')
  })
}, 1000 * 60 * 3)

afterAll(async () => {
  await page.close()
  await electronApp.close()
})

describe('[create-electron-vite] e2e tests', async () => {
  test('startup', async () => {
    const title = await page.title()
    expect(title).eq('Vite + Vue + TS')
  })

  test('should be home page is load correctly', async () => {
    const h1 = await page.$('h1')
    const title = await h1?.textContent()
    expect(title).eq('Vite + Vue')
  })

  test('should be count button can click', async () => {
    const countButton = await page.$('button')
    await countButton?.click()
    const countValue = await countButton?.textContent()
    expect(countValue).eq('count is 1')
  })
})

async function createProject() {
  return new Promise((resolve) => {
    const child = cp.spawn('node', [CLI_PATH, projectName])

    child.stdout.on('data', (chunk) => {
      const stdout: string = chunk.toString()

      if (stdout.includes('Project template:')) {
        child.stdin.write('\n')
      } else if (stdout.includes('Done. Now run:')) {
        child.kill()
        resolve(projectName)
      }
    })
  })
}

// For local testing
function enableElectronMirror() {
  const npmrc = path.join(generatePath, '.npmrc')
  let npmrcContent = fs.readFileSync(npmrc, 'utf8')

  npmrcContent = npmrcContent
    .split('\n')
    .map((line) => line.includes('electron_mirror') ? line.replace('#', '').trim() : line)
    .join('\n')

  fs.writeFileSync(npmrc, npmrcContent)
}

function execSync(command: string) {
  return cp.execSync(command, { cwd: generatePath, encoding: 'utf8' })
}

function writeFileSync(file: string, content: string) {
  return fs.writeFileSync(path.join(generatePath, file), content)
}

function intervalTask<R>(fn: (args: { stop: () => void }) => R | Promise<R>, options?: {
  delay?: number
  timeout?: number
}) {
  const {
    delay = 99,
    timeout = 1000 * 60 * 1,
  } = options ?? {}
  const startTime = Date.now()
  let done = false

  return new Promise<R>((resolve, reject) => {
    const run = async () => {
      if (Date.now() - startTime > timeout) {
        reject('Interval task timeout')
        return
      }

      const result = await fn({
        stop() {
          done = true
        },
      })
      if (done) {
        resolve(result)
      } else {
        setTimeout(run, delay)
      }
    }
    run()
  })
}

function getDom(selector: string) {
  return intervalTask(async (args) => {
    const dom = await page.$(selector)
    if (dom) {
      args.stop()
      return dom
    }
  })
}
