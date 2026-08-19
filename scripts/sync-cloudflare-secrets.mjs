import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const secretKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AI_USER_KEYS_ENCRYPTION_KEY',
  'GROQ_API_KEY',
  'GROQ_API_KEYS',
  'LOGFIRE_TOKEN',
  'AI_OBSERVABILITY_ADMIN_USER_IDS',
]

function readDevVars() {
  if (!existsSync('.dev.vars')) throw new Error('Missing .dev.vars. Copy .dev.vars.example and fill it first.')
  const values = {}
  for (const rawLine of readFileSync('.dev.vars', 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/u, '$2')
    const placeholders = new Set(['key-one,key-two', 'dev-only-secret', 'your-logfire-write-token', 'server-only-service-role-key'])
    if (key && value && !value.startsWith('your-') && !placeholders.has(value)) values[key] = value
  }
  return values
}

const apply = process.argv.includes('--apply')
const envIndex = process.argv.indexOf('--env')
const environment = envIndex >= 0 ? process.argv[envIndex + 1] : null
const values = readDevVars()
const secrets = Object.fromEntries(secretKeys.filter((key) => values[key]).map((key) => [key, values[key]]))
const missing = secretKeys.filter((key) => !secrets[key])

if (missing.length > 0) {
  console.warn(`Missing optional or required local values: ${missing.join(', ')}`)
}
if (Object.keys(secrets).length === 0) throw new Error('No real secret values found in .dev.vars.')

console.log(`${apply ? 'Applying' : 'Dry run: would apply'} ${Object.keys(secrets).length} Cloudflare secret(s): ${Object.keys(secrets).join(', ')}`)
if (!apply) {
  console.log('Run with --apply to upload them. Secret values are never displayed.')
  process.exit(0)
}

const args = ['--no-install', 'wrangler', 'secret', 'bulk']
if (environment) args.push('--env', environment)
const child = spawn('npx', args, { stdio: ['pipe', 'inherit', 'inherit'], env: process.env })
child.stdin.end(JSON.stringify(secrets))
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
