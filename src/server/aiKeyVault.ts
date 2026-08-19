const encoder = new TextEncoder()

function getEncryptionKey() {
  const encoded = process.env.AI_USER_KEYS_ENCRYPTION_KEY
  if (!encoded) throw new Error('AI_USER_KEYS_ENCRYPTION_KEY is not configured')
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  if (bytes.length !== 32) throw new Error('AI_USER_KEYS_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

export async function encryptAIKey(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getEncryptionKey(), encoder.encode(value))
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`
}

export async function decryptAIKey(value: string) {
  const [version, encodedIv, encodedCiphertext] = value.split('.')
  if (version !== 'v1' || !encodedIv || !encodedCiphertext) throw new Error('Invalid encrypted AI key')
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(encodedIv) }, await getEncryptionKey(), fromBase64Url(encodedCiphertext))
  return new TextDecoder().decode(plaintext)
}
