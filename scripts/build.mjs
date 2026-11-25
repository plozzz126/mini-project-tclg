// Сборка всех мини-проектов в один сайт: dist/mp4, dist/mp5, dist/mp6 + главная страница.
import { execSync } from 'node:child_process'
import { cpSync, rmSync, mkdirSync } from 'node:fs'

const PROJECTS = ['mp4', 'mp5', 'mp6']
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' })

rmSync('dist', { recursive: true, force: true })
mkdirSync('dist')
for (const p of PROJECTS) {
  console.log(`\n=== ${p} ===`)
  run('npm ci', p)
  run('npm run build', p)
  cpSync(`${p}/dist`, `dist/${p}`, { recursive: true })
}
cpSync('site', 'dist', { recursive: true })
console.log('\nГотово: dist/')
