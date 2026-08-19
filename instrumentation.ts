export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (!process.env.LOGFIRE_TOKEN) return

  const logfire = await import('@pydantic/logfire-node')

  logfire.configure({
    serviceName: 'paper-editor-next',
    serviceVersion: '0.1.0',
  })
}