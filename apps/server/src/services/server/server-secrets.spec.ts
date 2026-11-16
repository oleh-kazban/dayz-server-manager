import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@aegis/database', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/database')>();
  return {
    ...actual,
    resolveVaultKey: vi.fn(actual.resolveVaultKey),
    verifyVaultKey: vi.fn(actual.verifyVaultKey),
    encryptVaultSecret: vi.fn(actual.encryptVaultSecret),
    decryptVaultSecret: vi.fn(actual.decryptVaultSecret),
  };
});

import { EMPTY_LAUNCH_OPTIONS } from '@aegis/api-contracts';
import * as databaseModule from '@aegis/database';
import { decryptVaultSecret, resolveVaultKey, type Server } from '@aegis/database';

import { decryptServerSecrets, resolveEncryptedServerSecrets } from './server-secrets';

const VAULT_KEY_HEX = 'a1'.repeat(32);
const RCON_SECRET = 'RconSecret!42';
const LEGACY_RCON = ['legacy', 'rcon'].join('-');
const INVALID_CIPHERTEXT = ['not', 'a', 'valid', 'ciphertext'].join('-');

const EMPTY_CURRENT = {
  rconPasswordEncrypted: null,
  rconPasswordLegacy: null,
};

function serverRow(overrides: Partial<Server> = {}): Server {
  const now = new Date(0);
  return {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'Vault',
    description: null,
    status: 'stopped',
    installPath: 'C:\\DayZ',
    profilePath: 'profiles',
    missionPath: 'mpmissions/dayzOffline.chernarusplus',
    gamePort: 2302,
    queryPort: 27016,
    rconPort: 2310,
    rconIp: '127.0.0.1',
    maxPlayers: 60,
    rconPassword: null,
    rconPasswordEncrypted: null,
    launchOptions: EMPTY_LAUNCH_OPTIONS,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('server-secrets', () => {
  let savedDsmKey: string | undefined;
  let savedSteamKey: string | undefined;

  beforeAll(() => {
    savedDsmKey = process.env.DSM_VAULT_KEY;
    savedSteamKey = process.env.STEAM_VAULT_KEY;
    delete process.env.STEAM_VAULT_KEY;
    process.env.DSM_VAULT_KEY = VAULT_KEY_HEX;
  });

  afterAll(() => {
    if (savedDsmKey === undefined) delete process.env.DSM_VAULT_KEY;
    else process.env.DSM_VAULT_KEY = savedDsmKey;
    if (savedSteamKey === undefined) delete process.env.STEAM_VAULT_KEY;
    else process.env.STEAM_VAULT_KEY = savedSteamKey;
  });

  afterEach(() => {
    vi.mocked(databaseModule.resolveVaultKey).mockReset();
    vi.mocked(databaseModule.verifyVaultKey).mockReset();
    vi.mocked(databaseModule.encryptVaultSecret).mockReset();
    vi.mocked(databaseModule.decryptVaultSecret).mockReset();
    vi.restoreAllMocks();
  });

  const decrypt = (cipher: string | null) =>
    cipher === null ? null : decryptVaultSecret(cipher, resolveVaultKey());

  describe('resolveEncryptedServerSecrets', () => {
    it('encrypts provided RCON password with the vault key and clears legacy plaintext', () => {
      const outcome = resolveEncryptedServerSecrets(
        { rconPassword: RCON_SECRET },
        { rconPasswordEncrypted: null, rconPasswordLegacy: LEGACY_RCON },
      );
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.rconPassword).toBeNull();
      expect(outcome.rconPasswordEncrypted).not.toContain(RCON_SECRET);
      expect(decrypt(outcome.rconPasswordEncrypted)).toBe(RCON_SECRET);
    });

    it('keeps current ciphertext and legacy RCON when input is omitted, without loading the vault', () => {
      vi.mocked(databaseModule.resolveVaultKey).mockImplementation(() => {
        throw new Error('must not be called');
      });
      const current = {
        rconPasswordEncrypted: 'enc-rcon',
        rconPasswordLegacy: LEGACY_RCON,
      };
      expect(resolveEncryptedServerSecrets({}, current)).toEqual({
        ok: true,
        rconPasswordEncrypted: 'enc-rcon',
        rconPassword: LEGACY_RCON,
      });
    });

    it('clears RCON secret passed as null and drops legacy plaintext without loading the vault', () => {
      vi.mocked(databaseModule.resolveVaultKey).mockImplementation(() => {
        throw new Error('must not be called');
      });
      const current = {
        rconPasswordEncrypted: 'enc-rcon',
        rconPasswordLegacy: LEGACY_RCON,
      };
      expect(resolveEncryptedServerSecrets({ rconPassword: null }, current)).toEqual({
        ok: true,
        rconPasswordEncrypted: null,
        rconPassword: null,
      });
    });

    it('refuses with VAULT_KEY_UNAVAILABLE when the key fails verification or cannot be read', () => {
      vi.mocked(databaseModule.verifyVaultKey).mockReturnValueOnce(false);
      expect(resolveEncryptedServerSecrets({ rconPassword: RCON_SECRET }, EMPTY_CURRENT)).toEqual({
        ok: false,
        errorCode: 'VAULT_KEY_UNAVAILABLE',
        message: 'Encryption vault key failed verification vector.',
      });

      vi.mocked(databaseModule.resolveVaultKey).mockImplementationOnce(() => {
        throw new Error('unreadable');
      });
      expect(resolveEncryptedServerSecrets({ rconPassword: RCON_SECRET }, EMPTY_CURRENT)).toEqual({
        ok: false,
        errorCode: 'VAULT_KEY_UNAVAILABLE',
        message: 'Encryption vault key is unavailable.',
      });
    });

    it('refuses with VAULT_ENCRYPTION_FAILED when the cipher throws', () => {
      vi.mocked(databaseModule.encryptVaultSecret).mockImplementationOnce(() => {
        throw new Error('cipher');
      });
      const outcome = resolveEncryptedServerSecrets({ rconPassword: RCON_SECRET }, EMPTY_CURRENT);
      expect(outcome).toEqual({
        ok: false,
        errorCode: 'VAULT_ENCRYPTION_FAILED',
        message: 'Failed to encrypt server credentials with vault master key.',
      });
      expect(JSON.stringify(outcome)).not.toContain(RCON_SECRET);
    });
  });

  describe('decryptServerSecrets', () => {
    const encrypted = (plain: string) => {
      const outcome = resolveEncryptedServerSecrets({ rconPassword: plain }, EMPTY_CURRENT);
      if (!outcome.ok || outcome.rconPasswordEncrypted === null) {
        throw new Error('fixture encryption failed');
      }
      return outcome.rconPasswordEncrypted;
    };

    it('returns legacy RCON plaintext without touching the vault when nothing is encrypted', () => {
      vi.mocked(databaseModule.resolveVaultKey).mockImplementation(() => {
        throw new Error('must not be called');
      });
      expect(decryptServerSecrets(serverRow({ rconPassword: LEGACY_RCON }))).toEqual({
        ok: true,
        secrets: { rconPassword: LEGACY_RCON },
      });
      expect(decryptServerSecrets(serverRow({ rconPassword: '' }))).toEqual({
        ok: true,
        secrets: { rconPassword: null },
      });
      expect(decryptServerSecrets(serverRow())).toEqual({
        ok: true,
        secrets: { rconPassword: null },
      });
    });

    it('decrypts the encrypted RCON column', () => {
      expect(
        decryptServerSecrets(
          serverRow({
            rconPassword: LEGACY_RCON,
            rconPasswordEncrypted: encrypted(RCON_SECRET),
          }),
        ),
      ).toEqual({
        ok: true,
        secrets: { rconPassword: RCON_SECRET },
      });
    });

    it('refuses with VAULT_KEY_UNAVAILABLE on key or ciphertext failure', () => {
      const row = serverRow({ rconPasswordEncrypted: encrypted(RCON_SECRET) });
      vi.mocked(databaseModule.verifyVaultKey).mockReturnValueOnce(false);
      expect(decryptServerSecrets(row)).toMatchObject({
        ok: false,
        errorCode: 'VAULT_KEY_UNAVAILABLE',
      });

      const tampered = serverRow({ rconPasswordEncrypted: INVALID_CIPHERTEXT });
      const outcome = decryptServerSecrets(tampered);
      expect(outcome).toEqual({
        ok: false,
        errorCode: 'VAULT_KEY_UNAVAILABLE',
        message: 'Unable to decrypt stored server credentials with active vault key.',
      });
    });
  });
});
