import fs from 'fs-extra'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { red } from 'kolorist'
import prompts from 'prompts'

const cwd = process.cwd()
const argTargetDir = process.argv.slice(2).join(' ')

const defaultTargetDir = 'electron-vite-project'

async function init() {
  let template: prompts.Answers<'projectName' | 'overwrite' | 'packageName' | 'repoName'>

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
              throw new Error(red('✖') + ' Operation cancelled')
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
              value: 'electron-vite-boilerplate',
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

  // user choice associated with prompts
  const { overwrite, repoName, packageName } = template

  const root = path.join(cwd, targetDir)

  // https://github.com/vitejs/vite/pull/12390#issuecomment-1465457917
  if (overwrite) {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }

  const repo = `https://github.com/electron-vite/${repoName}`

  try {
    await gitClone({ repoName: repo, targetDir, packageName })
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message)
      process.exit(1)
    }
  }
}

function gitClone({
  repoName,
  targetDir,
  packageName,
  branch,
}: {
  repoName: string
  targetDir: string
  packageName?: string
  branch?: string,
}) {
  return new Promise((resolve, reject) => {
    const cloneTargetDir = `${targetDir}/.temp`

    spawn(
      'git',
      [
        'clone', ...(branch ? ['-b', branch] : []),
        repoName,
        cloneTargetDir,
        '--depth',
        '1',
      ],
      { stdio: 'inherit' },
    ).on('close', (code, signal) => {
      if (code) {
        reject(code)
        return
      }

      const fullTargetDir = path.join(cwd, targetDir)
      const fullCloneTargetDir = path.join(cwd, cloneTargetDir)

      // extract files from the clone target dir
      fs.rmSync(path.join(fullCloneTargetDir, '.git'), { recursive: true, force: true })
      fs.copySync(fullCloneTargetDir, fullTargetDir)
      fs.rmSync(fullCloneTargetDir, { recursive: true, force: true })

      // modify the name of package.json
      try {
        const packageJSON = fs.readFileSync(path.join(fullTargetDir, 'package.json')).toString()
        const packageInfo = JSON.parse(packageJSON)
        packageInfo.name = packageName ?? targetDir
        fs.writeFileSync(path.join(fullTargetDir, 'package.json'), JSON.stringify(packageInfo, null, 2))
      } catch (e) {
        console.error(e)
      }

      resolve(signal)
    })
  })
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

init().catch((e) => {
  console.error(e)
})
