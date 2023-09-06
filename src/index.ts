import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import prompts from 'prompts'

type Framework = 'vue' | 'react' | 'vanilla'

/**
* @see https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
* @see https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
*/
export const COLOURS = {
  $: (c: number) => (str: string) => `\x1b[${c}m` + str + '\x1b[0m',
  gary: (str: string) => COLOURS.$(90)(str),
  cyan: (str: string) => COLOURS.$(36)(str),
  yellow: (str: string) => COLOURS.$(33)(str),
  green: (str: string) => COLOURS.$(32)(str),
  red: (str: string) => COLOURS.$(31)(str),
}

const cwd = process.cwd()
const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const argTargetDir = process.argv.slice(2).join(' ')
const defaultTargetDir = 'electron-vite-project'
const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
}

async function init() {
  let template: prompts.Answers<'projectName' | 'overwrite' | 'packageName' | 'framework'>

  let targetDir = argTargetDir ?? defaultTargetDir

  const getProjectName = () => (targetDir === '.' ? path.basename(path.resolve()) : targetDir)

  try {
    template = await prompts(
      [
        {
          type: () => (argTargetDir ? null : 'text'),
          name: 'projectName',
          message: 'Project name:',
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = state?.value.trim().replace(/\/+$/g, '') ?? defaultTargetDir
          },
        },
        {
          type: () =>
            !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'confirm',
          name: 'overwrite',
          message: () =>
            (targetDir === '.'
              ? 'Current directory'
              : `Target directory "${targetDir}"`) +
            ` is not empty. Remove existing files and continue?`,
        },
        {
          type: (_, { overwrite }: { overwrite?: boolean }) => {
            if (overwrite === false) {
              throw new Error(COLOURS.red('✖') + ' Operation cancelled')
            }
            return null
          },
          name: 'overwriteChecker',
        },
        {
          type: () => (isValidPackageName(getProjectName()) ? null : 'text'),
          name: 'packageName',
          message: 'Package name:',
          initial: () => toValidPackageName(getProjectName()),
          validate: (dir) => isValidPackageName(dir) || 'Invalid package.json name',
        },
        {
          type: 'select',
          name: 'framework',
          message: 'Project template:',
          choices: [
            {
              title: 'Vue',
              value: 'vue',
            },
            {
              title: 'React',
              value: 'react',
            },
            {
              title: 'Vanilla',
              value: 'vanilla',
            }
          ]
        }
      ],
      {
        onCancel: () => {
          throw new Error(`${COLOURS.red('✖')} Operation cancelled`)
        },
      },
    )
  } catch (cancelled: any) {
    console.log(cancelled.message)
    return
  }

  // User choice associated with prompts
  const { overwrite, framework, packageName } = template

  const root = path.join(cwd, targetDir)

  // https://github.com/vitejs/vite/pull/12390#issuecomment-1465457917
  if (overwrite) {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }

  console.log(`\nScaffolding project in ${root}...`)

  const templateDir = path.resolve(__dirname, '..', `template-${framework}-ts`)
  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  const write = (file: string, content?: string) => {
    const targetPath = path.join(root, renameFiles[file] ?? file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter((f) => f !== 'package.json')) {
    write(file)
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(templateDir, 'package.json'), 'utf-8'),
  )

  pkg.name = packageName || getProjectName()

  write('package.json', JSON.stringify(pkg, null, 2) + '\n')

  // Mixing in Electron code snippets
  setupElectron(root, framework)

  console.log(`\nDone. Now run:\n`)
  const cdProjectName = path.relative(cwd, root)
  if (root !== cwd) {
    console.log(`  cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`)
  }
  switch (pkgManager) {
    case 'yarn':
      console.log('  yarn')
      console.log('  yarn dev')
      break
    default:
      console.log(`  ${pkgManager} install`)
      console.log(`  ${pkgManager} run dev`)
      break
  }
  console.log()
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

function editFile(file: string, callback: (content: string) => string) {
  const content = fs.readFileSync(file, 'utf-8')
  fs.writeFileSync(file, callback(content), 'utf-8')
}

function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

function setupElectron(root: string, framework: Framework) {
  const sourceDir = path.resolve(__dirname, '..', 'electron')
  const electronDir = path.join(root, 'electron')
  const publicDir = path.join(root, 'public')
  const pkg = require('../electron/package.json')

  fs.mkdirSync(electronDir, { recursive: true })

  // Electron files
  for (const name of [
    'electron-env.d.ts',
    'main.ts',
    'preload.ts',
  ]) {
    fs.copyFileSync(path.join(sourceDir, name), path.join(electronDir, name))
  }

  for (const name of [
    'electron-vite.animate.svg',
    'electron-vite.svg',
  ]) {
    fs.copyFileSync(path.join(sourceDir, name), path.join(publicDir, name))
  }

  for (const name of [
    'electron-builder.json5',
  ]) {
    fs.copyFileSync(path.join(sourceDir, name), path.join(root, name))
  }

  // package.json
  editFile(path.join(root, 'package.json'), content => {
    const json = JSON.parse(content)
    json.main = 'dist-electron/main.js'
    json.type = undefined // Electron(24-) only support CommonJs now
    json.scripts.build = `${json.scripts.build} && electron-builder`
    json.devDependencies.electron = pkg.devDependencies.electron
    json.devDependencies['electron-builder'] = pkg.devDependencies['electron-builder']
    json.devDependencies['vite-plugin-electron'] = pkg.devDependencies['vite-plugin-electron']
    json.devDependencies['vite-plugin-electron-renderer'] = pkg.devDependencies['vite-plugin-electron-renderer']
    return JSON.stringify(json, null, 2) + '\n'
  })

  // main.ts
  const snippets = (indent = 0) => `
// Remove Preload scripts loading
postMessage({ payload: 'removeLoading' }, '*')

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
`.trim()
    .split('\n')
    .map(line => line ? ' '.repeat(indent) + line : line)
    .join('\n')
  if (framework === 'vue') {
    editFile(path.join(root, 'src/main.ts'), content =>
      content.replace(`mount('#app')`, `mount('#app').$nextTick(() => {\n${snippets(2)}\n})`)
    )
  } else if (framework === 'react') {
    editFile(path.join(root, 'src/main.tsx'), content => `${content}\n${snippets()}\n`)
  } else if (framework === 'vanilla') {
    editFile(path.join(root, 'src/main.ts'), content => `${content}\n${snippets()}\n`)
  }

  // vite.config.ts
  const electronPlugin = `electron({
      main: {
        // Shortcut of \`build.lib.entry\`.
        entry: 'electron/main.ts',
      },
      preload: {
        // Shortcut of \`build.rollupOptions.input\`.
        // Preload scripts may contain Web assets, so use the \`build.rollupOptions.input\` instead \`build.lib.entry\`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Ployfill the Electron and Node.js built-in modules for Renderer process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: {},
    })`
  if (framework === 'vue' || framework === 'react') {
    editFile(path.join(root, 'vite.config.ts'), content =>
      content
        .split('\n')
        .map(line => line.includes("import { defineConfig } from 'vite'")
          ? `${line}
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'`
          : line)
        .map(line => line.trimStart().startsWith('plugins')
          ? `  plugins: [
    ${framework}(),
    ${electronPlugin},
  ],`
          : line)
        .join('\n')
    )
  } else {
    fs.writeFileSync(
      path.join(root, 'vite.config.ts'),
      `
import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    ${electronPlugin},
  ],
})
`.trimStart()
    )
  }

  // tsconfig.json
  editFile(path.join(root, 'tsconfig.json'), content =>
    content
      .split('\n')
      .map(line => line.trimStart().startsWith('"include"') ? line.replace(']', ', "electron"]') : line)
      .join('\n')
  )

  // .gitignore
  editFile(path.join(root, '.gitignore'), content =>
    content
      .split('\n')
      .map(line => line === 'dist-ssr' ? `${line}\ndist-electron\nrelease` : line)
      .join('\n')
  )

  // electron-vite.svg
  if (framework === 'vue') {
    editFile(path.join(root, 'src/App.vue'), content => content.replace('/vite.svg', '/electron-vite.svg'))
  } else if (framework === 'react') {
    editFile(path.join(root, 'src/App.tsx'), content => content.replace('/vite.svg', '/electron-vite.animate.svg'))
  } else if (framework === 'vanilla') {
    editFile(path.join(root, 'src/main.ts'), content => content.replace('/vite.svg', '/electron-vite.svg'))
  }
}

init().catch((e) => {
  console.error(e)
})
