import { spawn } from 'node:child_process'
import * as path from 'node:path'
import { red } from 'kolorist'
import * as fs from 'node:fs'
import prompts from 'prompts'

const cwd = process.cwd()
const argTargetDir = process.argv.slice(2).join(' ')

const defaultTargetDir = 'electron-vite-project'

async function init() {
  let template: prompts.Answers<'projectName' | 'packageName' | 'repoName'>

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
          type: () => (isValidPackageName(getProjectName()) ? null : 'text'),
          name: 'packageName',
          message: 'Package name:',
          initial: () => toValidPackageName(getProjectName()),
          validate: (dir) => isValidPackageName(dir) || 'Invalid package.json name',
        },
        {
          type: 'select',
          name: 'repoName',
          message: 'Project template:',
          choices: [
            {
              title: 'Vue',
              value: 'electron-vite-vue',
            },
            {
              title: 'React',
              value: 'electron-vite-react',
            },
            {
              title: 'Vanilla',
              value: 'vite-plugin-electron-quick-start',
            }
          ]
        }
      ],
      {
        onCancel: () => {
          throw new Error(`${red('✖')} Operation cancelled`)
        },
      },
    )
  } catch (cancelled: any) {
    console.log(cancelled.message)
    return
  }

  const { repoName, packageName }: { repoName: string, packageName: string } = template

  const repo = `https://github.com/electron-vite/${repoName}`

  try {
    if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
      console.error(`🚧 Directory '${targetDir}' already exists.`)
      process.exit(1)
    }

    await gitClone({ repo, targetDir, packageName })

    fs.rmSync(path.join(cwd, targetDir, '.git'), {
      recursive: true,
      force: true,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message)
      process.exit(1)
    }
  }
}

function gitClone({
  repo,
  targetDir,
  packageName,
  branch,
}: {
  repo: string
  targetDir: string
  packageName?: string
  branch?: string,
}) {
  return new Promise((resolve, reject) => {
    const _branch = branch ? ['-b', branch] : []
    packageName = packageName ?? targetDir
    spawn('git', ['clone', ..._branch, repo, targetDir, '--depth', '1'], {
      stdio: 'inherit'
    }).on('close', (code, signal) => {
      if (code) {
        reject(code)
        return
      }
      // Modify the name of package.json
      try {
        const packageJSON = fs.readFileSync(path.join(cwd, targetDir, 'package.json')).toString()
        const packageInfo = JSON.parse(packageJSON)
        packageInfo.name = packageName
        fs.writeFileSync(path.join(cwd, targetDir, 'package.json'), JSON.stringify(packageInfo, null, 2))
      } catch (e) {
        console.error(e)
      }
      resolve(signal)
    })
  })
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

init().catch((e) => {
  console.error(e)
})
