#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));
const prompts = require('prompts');

const cwd = process.cwd();

async function init() {
  const template = await prompts([
    {
      type: 'select',
      name: 'value',
      message: 'Project name:',
      choices: [
        {
          title: 'Vue',
          value: 'electron-vue-vite',
        },
        {
          title: 'React',
          value: 'vite-react-electron',
        },
        {
          title: 'Vanilla',
          value: 'electron-vite-boilerplate',
        },
      ],
    }
  ]);

  const nodeIntegration = await prompts([
    {
      type: 'confirm',
      name: 'value',
      message: 'Enable nodeIntegration in Renderer process (default Y):',
      initial: true,
    },
  ]);

  console.log(template.value);
  console.log(nodeIntegration.value);
}

init().catch((e) => {
  console.error(e)
});
