import * as fs from 'node:fs'
import * as path from 'node:path'
import { spawn } from 'node:child_process'
import prompts from 'prompts'

const cwd = process.cwd()

async function init() {
  const template = await prompts([
    {
      type: 'select',
      name: 'value',
      message: 'Project template:',
      choices: [
        {
          title: 'Vue',
          value: { projectName: 'electron-vite-vue', repoName: 'electron-vite-vue' },
        },
        {
          title: 'React',
          value: { projectName: 'electron-vite-react', repoName: 'electron-vite-react' },
        },
        {
          title: 'Vanilla',
          value: {
            projectName: 'electron-vite-vanilla',
            repoName: 'vite-plugin-electron-quick-start',
          },
        },
      ],
    },
  ])

  if (!template.value)
    return

  const { projectName, repoName, branch } = template.value
  const repo = `https://github.com/electron-vite/${repoName}`

  try {
    if (fs.existsSync(projectName) && fs.statSync(projectName).isDirectory()) {
      console.error(`🚧 Directory "${projectName}" already exists.`)
      process.exit(1)
    }

    await gitClone(repo, projectName, branch)

    fs.rmSync(path.join(cwd, projectName, '.git'), { recursive: true, force: true })
  }
  catch (err) {
    if (err instanceof Error) {
      console.error(err?.message)
      process.exit(1)
    }
  }
}

function gitClone(repo: string, projectName: string, branch: string) {
  return new Promise((resolve, reject) => {
    const _branch = branch ? ['-b', branch] : []
    spawn('git', ['clone', ..._branch, repo, projectName, '--depth', '1'], { stdio: 'inherit' }).on(
      'close',
      (code, signal) => {
        if (code) {
          reject(code)
          return
        }
        resolve(signal)
      },
    )
  })
}

init()
