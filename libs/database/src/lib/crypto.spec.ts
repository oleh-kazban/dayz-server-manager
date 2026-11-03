import { hashPassword, verifyPassword } from './crypto';

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
