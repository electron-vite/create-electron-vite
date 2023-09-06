import fs from 'node:fs'
import path from 'node:path'
import type { ExecaSyncReturnValue, SyncOptions } from 'execa'
import { execaCommandSync } from 'execa'
import { afterEach, beforeAll, expect, test } from 'vitest'

const CLI_PATH = path.join(__dirname, '..')

const projectName = 'electron-vite-app'
const generatePath = path.join(__dirname, projectName)

const run = (
  args: string[],
  options: SyncOptions = {},
): ExecaSyncReturnValue => {
  return execaCommandSync(`node ${CLI_PATH} ${args.join(' ')}`, options)
}

const createNonEmptyDir = () => {
  // Create the temporary directory
  fs.mkdirSync(generatePath, { recursive: true })

  // Create a package.json file
  const pkgJson = path.join(generatePath, 'package.json')
  fs.writeFileSync(pkgJson, '{ "foo": "bar" }')
}

beforeAll(() => fs.rmSync(generatePath, { recursive: true, force: true }))
afterEach(() => fs.rmSync(generatePath, { recursive: true, force: true }))

test('prompts for the project name if none supplied', () => {
  const { stdout } = run([])
  expect(stdout).toContain('Project name:')
})

test('prompts for project template if none supplied when target dir is current directory', () => {
  fs.mkdirSync(generatePath, { recursive: true })
  const { stdout } = run(['.'], { cwd: generatePath })
  expect(stdout).toContain('Project template:')
})
