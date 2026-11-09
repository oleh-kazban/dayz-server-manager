import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);

  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;

  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);

  if (keyBuffer.length !== derivedKey.length) return false;

  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

export function deriveVaultKey(secret: string): Buffer {
  return crypto.scryptSync(secret, 'dsm-vault-salt-v1', 32);
}

function normalizeKey(secretKey: string | Buffer): Buffer {
  if (Buffer.isBuffer(secretKey)) {
    return secretKey.length === 32 ? secretKey : deriveVaultKey(secretKey.toString('utf8'));
  }
  if (typeof secretKey === 'string') {
    if (secretKey.length === 64 && /^[0-9a-fA-F]+$/.test(secretKey)) {
      return Buffer.from(secretKey, 'hex');
    }
    return deriveVaultKey(secretKey);
  }
  throw new Error('Invalid secretKey type');
}

export function encryptVaultSecret(plaintext: string, secretKey: string | Buffer): string {
  const key = normalizeKey(secretKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

export function decryptVaultSecret(envelope: string, secretKey: string | Buffer): string {
  const parts = envelope.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid vault secret envelope format');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = normalizeKey(secretKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function verifyVaultKey(secretKey: string | Buffer): boolean {
  try {
    const key = normalizeKey(secretKey);
    if (key.length !== 32) return false;
    const testSecret = 'dsm-test-secret-vector';
    const encrypted = encryptVaultSecret(testSecret, key);
    const decrypted = decryptVaultSecret(encrypted, key);
    return decrypted === testSecret;
  } catch {
    return false;
  }
}

export function resolveVaultKey(customKeyDir?: string): Buffer {
  if (process.env.STEAM_VAULT_KEY && process.env.STEAM_VAULT_KEY.trim() !== '') {
    return normalizeKey(process.env.STEAM_VAULT_KEY.trim());
  }
  if (process.env.DSM_VAULT_KEY && process.env.DSM_VAULT_KEY.trim() !== '') {
    return normalizeKey(process.env.DSM_VAULT_KEY.trim());
  }

  const dir = customKeyDir ?? path.resolve(process.cwd(), 'manager-data');
  const keyPath = path.join(dir, '.vault.key');

  if (fs.existsSync(keyPath)) {
    try {
      const content = fs.readFileSync(keyPath, 'utf8').trim();
      if (content.length > 0) {
        return normalizeKey(content);
      }
    } catch {
      // Fall through to regeneration if corrupt or unreadable
    }
  }

  // Generate new 32-byte key
  const newKey = crypto.randomBytes(32);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(keyPath, newKey.toString('hex'), { mode: 0o600 });
  } catch {
    // If filesystem write fails, still return generated in-memory key
  }
  return newKey;
}
