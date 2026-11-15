import {
  decryptVaultSecret,
  encryptVaultSecret,
  resolveVaultKey,
  type Server,
  verifyVaultKey,
} from '@aegis/database';

export interface ServerConfigSecrets {
  rconPassword: string | null;
}

type VaultFailure = {
  ok: false;
  errorCode: 'VAULT_KEY_UNAVAILABLE' | 'VAULT_ENCRYPTION_FAILED';
  message: string;
};

export type EncryptSecretsOutcome =
  | {
      ok: true;
      rconPasswordEncrypted: string | null;
      rconPassword: string | null;
    }
  | VaultFailure;

export type DecryptSecretsOutcome =
  | { ok: true; secrets: ServerConfigSecrets }
  | { ok: false; errorCode: 'VAULT_KEY_UNAVAILABLE'; message: string };

function loadVerifiedVaultKey():
  | { ok: true; vaultKey: Buffer }
  | { ok: false; errorCode: 'VAULT_KEY_UNAVAILABLE'; message: string } {
  try {
    const vaultKey = resolveVaultKey();
    if (!verifyVaultKey(vaultKey)) {
      return {
        ok: false,
        errorCode: 'VAULT_KEY_UNAVAILABLE',
        message: 'Encryption vault key failed verification vector.',
      };
    }
    return { ok: true, vaultKey };
  } catch {
    return {
      ok: false,
      errorCode: 'VAULT_KEY_UNAVAILABLE',
      message: 'Encryption vault key is unavailable.',
    };
  }
}

export function resolveEncryptedServerSecrets(
  inputs: {
    rconPassword?: string | null;
  },
  current: {
    rconPasswordEncrypted: string | null;
    rconPasswordLegacy: string | null;
  },
): EncryptSecretsOutcome {
  const { rconPassword } = inputs;
  if (rconPassword === undefined) {
    return {
      ok: true,
      rconPasswordEncrypted: current.rconPasswordEncrypted,
      rconPassword: current.rconPasswordLegacy,
    };
  }
  if (rconPassword === null) {
    return { ok: true, rconPasswordEncrypted: null, rconPassword: null };
  }

  const key = loadVerifiedVaultKey();
  if (!key.ok) {
    return key;
  }
  try {
    return {
      ok: true,
      rconPasswordEncrypted: encryptVaultSecret(rconPassword, key.vaultKey),
      rconPassword: null,
    };
  } catch {
    return {
      ok: false,
      errorCode: 'VAULT_ENCRYPTION_FAILED',
      message: 'Failed to encrypt server credentials with vault master key.',
    };
  }
}

export function decryptServerSecrets(s: Server): DecryptSecretsOutcome {
  if (!s.rconPasswordEncrypted) {
    return {
      ok: true,
      secrets: {
        rconPassword: s.rconPassword && s.rconPassword.length > 0 ? s.rconPassword : null,
      },
    };
  }

  const key = loadVerifiedVaultKey();
  if (!key.ok) {
    return key;
  }

  try {
    const rconPassword = decryptVaultSecret(s.rconPasswordEncrypted, key.vaultKey);
    return {
      ok: true,
      secrets: { rconPassword },
    };
  } catch {
    return {
      ok: false,
      errorCode: 'VAULT_KEY_UNAVAILABLE',
      message: 'Unable to decrypt stored server credentials with active vault key.',
    };
  }
}
