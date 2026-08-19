import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

if (existsSync('.dev.vars')) {
  for (const rawLine of readFileSync('.dev.vars', 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/u, '$2')
    if (key) process.env[key] ??= value
  }
}

const [command, ...args] = process.argv.slice(2)
if (!command) throw new Error('Missing command')

const child = spawn(command, args, { stdio: 'inherit', env: process.env })
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
