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

function resolveEnvVaultKey(): Buffer | null {
  const steamKey = process.env.STEAM_VAULT_KEY?.trim();
  if (steamKey) return normalizeKey(steamKey);
  const dsmKey = process.env.DSM_VAULT_KEY?.trim();
  if (dsmKey) return normalizeKey(dsmKey);
  return null;
}

function readExistingKeyFile(keyPath: string): Buffer | null {
  try {
    const content = fs.readFileSync(keyPath, 'utf8').trim();
    if (content.length > 0) {
      return normalizeKey(content);
    }
  } catch {
    // Key file not present or unreadable
  }
  return null;
}

function isNodeErrorWithCode(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === code
  );
}

export function resolveVaultKey(customKeyDir?: string): Buffer {
  const envKey = resolveEnvVaultKey();
  if (envKey) return envKey;

  const dir = customKeyDir ?? path.resolve(process.cwd(), 'manager-data');
  const keyPath = path.join(dir, '.vault.key');

  const existing = readExistingKeyFile(keyPath);
  if (existing) return existing;

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  const newKey = crypto.randomBytes(32);
  try {
    fs.writeFileSync(keyPath, newKey.toString('hex'), { mode: 0o600, flag: 'wx' });
    return newKey;
  } catch (err: unknown) {
    if (isNodeErrorWithCode(err, 'EEXIST')) {
      return readExistingKeyFile(keyPath) ?? newKey;
    }
  }
  return newKey;
}
