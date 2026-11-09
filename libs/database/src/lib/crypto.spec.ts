import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  decryptVaultSecret,
  deriveVaultKey,
  encryptVaultSecret,
  hashPassword,
  resolveVaultKey,
  verifyPassword,
  verifyVaultKey,
} from './crypto';

describe('Password Hashing & Verification (scrypt)', () => {
  it('generates salted hash that verifies against original password', () => {
    const rawPassword = 'SuperSecretPassword123!';
    const hash = hashPassword(rawPassword);

    expect(hash).toContain(':');
    const [salt, key] = hash.split(':');
    expect(salt).toHaveLength(32); // 16 bytes hex
    expect(key).toHaveLength(128); // 64 bytes hex

    expect(verifyPassword(rawPassword, hash)).toBe(true);
  });

  it('rejects incorrect passwords', () => {
    const hash = hashPassword('correctPassword');
    expect(verifyPassword('wrongPassword', hash)).toBe(false);
  });

  it('generates unique salts and hashes for the same password', () => {
    const hash1 = hashPassword('identicalPassword');
    const hash2 = hashPassword('identicalPassword');

    expect(hash1).not.toBe(hash2);
    expect(verifyPassword('identicalPassword', hash1)).toBe(true);
    expect(verifyPassword('identicalPassword', hash2)).toBe(true);
  });

  it('safely rejects malformed stored hashes without throwing', () => {
    expect(verifyPassword('password', 'malformed')).toBe(false);
    expect(verifyPassword('password', '')).toBe(false);
    expect(verifyPassword('password', 'invalid:salt:length')).toBe(false);
  });
});

describe('AES-256-GCM Vault Cryptography (ARCH-01, GUARD-03)', () => {
  const masterSecret = 'dsm-secure-master-installation-secret-2026';
  const derivedKey = deriveVaultKey(masterSecret);

  it('derives a deterministic 32-byte (256-bit) vault key from master secret', () => {
    const key1 = deriveVaultKey(masterSecret);
    const key2 = deriveVaultKey(masterSecret);

    expect(key1).toHaveLength(32);
    expect(key1.equals(key2)).toBe(true);

    const differentKey = deriveVaultKey('another-secret');
    expect(key1.equals(differentKey)).toBe(false);
  });

  it('encrypts plaintext to iv:authTag:ciphertext envelope and successfully decrypts it', () => {
    const plaintext = 'SteamUserSecretP@ssw0rd!#2026';
    const envelope = encryptVaultSecret(plaintext, derivedKey);

    expect(envelope).not.toBe(plaintext);
    expect(envelope).not.toContain(plaintext);

    const parts = envelope.split(':');
    expect(parts).toHaveLength(3);
    const [ivHex, authTagHex, cipherHex] = parts;

    // IV: 12 bytes = 24 hex chars
    expect(ivHex).toHaveLength(24);
    // GCM Tag: 16 bytes = 32 hex chars
    expect(authTagHex).toHaveLength(32);
    expect(cipherHex.length).toBeGreaterThan(0);

    const decrypted = decryptVaultSecret(envelope, derivedKey);
    expect(decrypted).toBe(plaintext);
  });

  it('generates unique IVs and distinct ciphertexts for identical plaintext', () => {
    const plaintext = 'ConsistentPassword123';
    const env1 = encryptVaultSecret(plaintext, derivedKey);
    const env2 = encryptVaultSecret(plaintext, derivedKey);

    expect(env1).not.toBe(env2);
    expect(env1.split(':')[0]).not.toBe(env2.split(':')[0]); // distinct IVs

    expect(decryptVaultSecret(env1, derivedKey)).toBe(plaintext);
    expect(decryptVaultSecret(env2, derivedKey)).toBe(plaintext);
  });

  it('supports 64-character hex strings and raw Buffer keys', () => {
    const hexKey = derivedKey.toString('hex');
    const plaintext = 'TokenValueForSteamAuth';

    const envelopeFromHex = encryptVaultSecret(plaintext, hexKey);
    expect(decryptVaultSecret(envelopeFromHex, derivedKey)).toBe(plaintext);

    const envelopeFromBuf = encryptVaultSecret(plaintext, derivedKey);
    expect(decryptVaultSecret(envelopeFromBuf, hexKey)).toBe(plaintext);
  });

  it('rejects tampered ciphertext with authentication error (GUARD-03 tamper resistance)', () => {
    const plaintext = 'CriticalSteamMasterPassword';
    const envelope = encryptVaultSecret(plaintext, derivedKey);
    const [iv, tag, ciphertext] = envelope.split(':');

    // Flip the first character of the ciphertext
    const tamperedChar = ciphertext[0] === 'a' ? 'b' : 'a';
    const tamperedCiphertext = `${tamperedChar}${ciphertext.slice(1)}`;
    const tamperedEnvelope = `${iv}:${tag}:${tamperedCiphertext}`;

    expect(() => decryptVaultSecret(tamperedEnvelope, derivedKey)).toThrow();
  });

  it('rejects tampered auth tag with authentication error (GUARD-03)', () => {
    const plaintext = 'CriticalSteamMasterPassword';
    const envelope = encryptVaultSecret(plaintext, derivedKey);
    const [iv, tag, ciphertext] = envelope.split(':');

    // Flip the first character of the auth tag
    const tamperedTagChar = tag[0] === '0' ? '1' : '0';
    const tamperedTag = `${tamperedTagChar}${tag.slice(1)}`;
    const tamperedEnvelope = `${iv}:${tamperedTag}:${ciphertext}`;

    expect(() => decryptVaultSecret(tamperedEnvelope, derivedKey)).toThrow();
  });

  it('rejects decryption when wrong secret key is provided', () => {
    const plaintext = 'SecretPayload';
    const envelope = encryptVaultSecret(plaintext, derivedKey);
    const wrongKey = deriveVaultKey('completely-different-password');

    expect(() => decryptVaultSecret(envelope, wrongKey)).toThrow();
  });

  it('rejects malformed envelope format without throwing unhandled exceptions', () => {
    expect(() => decryptVaultSecret('only-one-part', derivedKey)).toThrow(
      'Invalid vault secret envelope format',
    );
    expect(() => decryptVaultSecret('iv:tag', derivedKey)).toThrow(
      'Invalid vault secret envelope format',
    );
  });

  it('verifyVaultKey validates 256-bit key vectors correctly', () => {
    expect(verifyVaultKey(derivedKey)).toBe(true);
    expect(verifyVaultKey(derivedKey.toString('hex'))).toBe(true);
    expect(verifyVaultKey(masterSecret)).toBe(true); // scrypt derives 32 bytes

    // Invalid key types
    expect(verifyVaultKey(null as unknown as string)).toBe(false);
    expect(verifyVaultKey({} as unknown as string)).toBe(false);
  });
});

describe('resolveVaultKey (File & Env Fallback)', () => {
  const originalSteamEnv = process.env.STEAM_VAULT_KEY;
  const originalDsmEnv = process.env.DSM_VAULT_KEY;
  const testDir = path.resolve(process.cwd(), 'tmp/test-vault-keys');

  beforeEach(() => {
    delete process.env.STEAM_VAULT_KEY;
    delete process.env.DSM_VAULT_KEY;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (originalSteamEnv !== undefined) {
      process.env.STEAM_VAULT_KEY = originalSteamEnv;
    } else {
      delete process.env.STEAM_VAULT_KEY;
    }
    if (originalDsmEnv !== undefined) {
      process.env.DSM_VAULT_KEY = originalDsmEnv;
    } else {
      delete process.env.DSM_VAULT_KEY;
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('prioritizes STEAM_VAULT_KEY environment variable when present', () => {
    process.env.STEAM_VAULT_KEY = 'custom-env-steam-vault-key-123';
    const key = resolveVaultKey(testDir);

    expect(key).toHaveLength(32);
    expect(key.equals(deriveVaultKey('custom-env-steam-vault-key-123'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.vault.key'))).toBe(false);
  });

  it('falls back to DSM_VAULT_KEY if STEAM_VAULT_KEY is empty', () => {
    process.env.DSM_VAULT_KEY = 'dsm-vault-key-fallback-456';
    const key = resolveVaultKey(testDir);

    expect(key).toHaveLength(32);
    expect(key.equals(deriveVaultKey('dsm-vault-key-fallback-456'))).toBe(true);
  });

  it('creates and persists a .vault.key file when no environment variables are present', () => {
    const key1 = resolveVaultKey(testDir);
    expect(key1).toHaveLength(32);

    const keyFilePath = path.join(testDir, '.vault.key');
    expect(fs.existsSync(keyFilePath)).toBe(true);

    // Reading again loads the same key from file
    const key2 = resolveVaultKey(testDir);
    expect(key2.equals(key1)).toBe(true);
  });
});
