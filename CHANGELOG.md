## 0.4.0 (2023-09-06)

- 38af79d chore: test v0.4.0
- f5dafdf chore: update template
- 7114cac chore: site use `https://electron-vite.github.io`
- 394686c refactor: use `vite-plugin-electron` simple API

#### Main Changed

**0.4.0** use the simple API of `vite-plugin-electron`

```ts
import electron from 'vite-plugin-electron/simple'

electron({
  main: {
    entry: 'electron/main.ts',
  },
  preload: {
    input: __dirname + '/electron/preload.ts',
  },
  renderer: {},
})
```

**0.3.0**

```ts
import electron from 'vite-plugin-electron'

electron([
  {
    entry: 'electron/main.ts',
  },
  {
    entry: 'electron/preload.ts',
  },
])
```

## 0.3.0 (2023-05-27)

42dc950 refactor: use Vite instead unbuild
246cdfd feat(0.3.0): electron files
b1a194c feat(0.3.0): fully based on `create-vite` template
b6e5cb3 feat: template-react-ts, template-vanilla-ts, template-vue-ts

## 0.2.3 (2023-03-13)

#### Main Changed

- 05f9a47 fix: remove `.git` after clone

## 0.2.2 -> 0.2.3

## 0.2.1 (2023-03-13)

#### Main Changed

- 8d52193 feat: support create project into exists directory | [see here](https://github.com/vitejs/vite/pull/12390#issuecomment-1465457917)
