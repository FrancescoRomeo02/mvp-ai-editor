// @ts-ignore OpenNext generates this module during the Cloudflare build.
import handler from './.open-next/worker.js'
import { instrument as instrumentWorker, instrumentDO } from '@pydantic/logfire-cf-workers'
import { UsageDurableObject as UsageDurableObjectClass } from './src/cloudflare/usageDurableObject'

const logfireConfig = {
  service: { name: 'paper-editor', namespace: 'paper-editor', version: '0.1.0' },
}

export const UsageDurableObject = instrumentDO(UsageDurableObjectClass, {
  ...logfireConfig,
  service: { ...logfireConfig.service, name: 'paper-editor-usage' },
})

const app = {
  fetch: handler.fetch,
}

export default instrumentWorker(app, logfireConfig)
