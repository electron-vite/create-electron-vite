import { join } from 'node:path'
import type { ExecaSyncReturnValue, SyncOptions } from 'execa'
import { execaCommandSync } from 'execa'
import fs from 'fs-extra'
import { afterEach, beforeAll, expect, test } from 'vitest'

const CLI_PATH = join(__dirname, '..')

const projectName = 'electron-vite-app'
const generatePath = join(__dirname, projectName)

const run = (
  args: string[],
  options: SyncOptions = {},
): ExecaSyncReturnValue => {
  return execaCommandSync(`node ${CLI_PATH} ${args.join(' ')}`, options)
}

const createNonEmptyDir = () => {
  // Create the temporary directory
  fs.mkdirpSync(generatePath)

  // Create a package.json file
  const pkgJson = join(generatePath, 'package.json')
  fs.writeFileSync(pkgJson, '{ "foo": "bar" }')
}

beforeAll(() => fs.remove(generatePath))
afterEach(() => fs.remove(generatePath))

test('prompts for the project name if none supplied', () => {
  const { stdout } = run([])
  expect(stdout).toContain('Project name:')
})

test('prompts for project template if none supplied when target dir is current directory', () => {
  fs.mkdirpSync(generatePath)
  const { stdout } = run(['.'], { cwd: generatePath })
  expect(stdout).toContain('Project template:')
})
