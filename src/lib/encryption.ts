import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns base64-encoded: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: iv(12) + authTag(16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypts a base64-encoded AES-256-GCM ciphertext.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const combined = Buffer.from(ciphertext, 'base64')

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * Safely decrypts a value, returning null if decryption fails.
 */
export function safeDecrypt(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null
  try {
    return decrypt(ciphertext)
  } catch {
    return null
  }
}
