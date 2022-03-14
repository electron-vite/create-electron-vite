#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const prompts = require('prompts');

const cwd = process.cwd();

async function init() {
  const template = await prompts([
    {
      type: 'select',
      name: 'value',
      message: 'Project template:',
      choices: [
        {
          title: 'Vue',
          value: { projectName: 'electron-vite-vue', repoName: 'electron-vue-vite' },
        },
        {
          title: 'React',
          value: { projectName: 'electron-vite-react', repoName: 'vite-react-electron' },
        },
        {
          title: 'Vanilla',
          value: {
            projectName: 'electron-vite-vanilla',
            repoName: 'electron-vite-boilerplate',
            branch: 'vanilla',
          },
        },
      ],
    }
  ]);

  if (!template.value) return;

  const { projectName, repoName, branch } = template.value;
  const repo = `https://github.com/caoxiemeihao/${repoName}`;

  try {
    if (fs.existsSync(projectName) && fs.statSync(projectName).isDirectory()) {
      console.error(`🚧 Directory "${projectName}" already exists.`);
      process.exit(1);
    }

    await gitClone(repo, projectName, branch);

    fs.rmSync(path.join(cwd, projectName, '.git'), { recursive: true, force: true });
  } catch (error) {
    process.exit(error);
  }
}

function gitClone(repo, projectName, branch) {
  return new Promise((resolve, reject) => {
    const _branch = branch ? ['-b', branch] : [];
    cp.spawn(
      'git',
      ['clone', ..._branch, repo, projectName, '--depth', '1'],
      { stdio: 'inherit' },
    )
      .on('close', (code, signal) => {
        if (code) {
          reject(code);
          return;
        }
        resolve(signal);
      });
  });
}

init();
