/* eslint-disable sonarjs/no-hardcoded-ip -- address literals are test data */
import { FORMER_PUBLIC_SESSION_SECRETS, loadEnv } from './env';

describe('loadEnv', () => {
  it('loads valid configuration with defaults', () => {
    const config = loadEnv({});

    expect(config.PORT).toBe(5000);
    expect(config.HOST).toBe('0.0.0.0');
    expect(config.NODE_ENV).toBe('development');
    expect(config.CORS_ORIGIN).toBe('http://localhost:4200,http://127.0.0.1:4200');
    expect(config.LOG_LEVEL).toBe('info');
  });

  it('coerces and accepts custom environment variables', () => {
    const config = loadEnv({
      PORT: '8080',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      SESSION_SECRET: 'production-session-secret-must-be-32-chars-minimum!',
      CORS_ORIGIN: 'https://example.com',
      LOG_LEVEL: 'warn',
    });

    expect(config.PORT).toBe(8080);
    expect(config.HOST).toBe('127.0.0.1');
    expect(config.NODE_ENV).toBe('production');
    expect(config.SESSION_SECRET).toBe('production-session-secret-must-be-32-chars-minimum!');
    expect(config.CORS_ORIGIN).toBe('https://example.com');
    expect(config.LOG_LEVEL).toBe('warn');
  });

  it('ignores DSM_ADMIN_PASSWORD: it is not part of the loaded config', () => {
    const config = loadEnv({ DSM_ADMIN_PASSWORD: 'super-admin-password-123' });

    expect(config).not.toHaveProperty('DSM_ADMIN_PASSWORD');
    expect(Object.values(config)).not.toContain('super-admin-password-123');
  });

  it('does not fail on a too short DSM_ADMIN_PASSWORD', () => {
    expect(() => loadEnv({ DSM_ADMIN_PASSWORD: 'x' })).not.toThrow();
  });

  describe('SESSION_SECRET', () => {
    const strong = 'a-strong-session-secret-of-32-chars!';

    it.each(['development', 'test', 'production'])(
      'is undefined when unset in %s (no built-in default)',
      NODE_ENV => {
        expect(loadEnv({ NODE_ENV }).SESSION_SECRET).toBeUndefined();
      },
    );

    it.each(['', '   '])('treats %j as not set', value => {
      expect(loadEnv({ SESSION_SECRET: value }).SESSION_SECRET).toBeUndefined();
    });

    it.each(['development', 'test', 'production'])('accepts a strong secret in %s', NODE_ENV => {
      expect(loadEnv({ NODE_ENV, SESSION_SECRET: strong }).SESSION_SECRET).toBe(strong);
    });

    it('accepts a secret of exactly 32 characters', () => {
      const secret = 'x'.repeat(32);
      expect(loadEnv({ SESSION_SECRET: secret }).SESSION_SECRET).toBe(secret);
    });

    it.each(['development', 'test', 'production'])(
      'rejects a secret of 31 characters in %s',
      NODE_ENV => {
        expect(() => loadEnv({ NODE_ENV, SESSION_SECRET: 'x'.repeat(31) })).toThrow(
          'SESSION_SECRET',
        );
      },
    );

    const formerSecrets = [
      'super-secret-dev-session-key-32-chars-long',
      'dev-insecure-secret-change-me-in-production-min-32-chars',
    ];

    it('lists exactly the two former public secrets', () => {
      expect([...FORMER_PUBLIC_SESSION_SECRETS]).toEqual(formerSecrets);
    });

    it.each(
      formerSecrets.flatMap(secret =>
        ['development', 'test', 'production'].map(NODE_ENV => [secret, NODE_ENV]),
      ),
    )('rejects the former public secret %s in %s', (secret, NODE_ENV) => {
      expect(() => loadEnv({ NODE_ENV, SESSION_SECRET: secret })).toThrow('SESSION_SECRET');
    });
  });

  describe('TRUST_PROXY (AC-12)', () => {
    it('is off by default', () => {
      expect(loadEnv({}).TRUST_PROXY).toBe(false);
    });

    it.each(['', '   ', 'false', 'FALSE'])('treats %j as off', value => {
      expect(loadEnv({ TRUST_PROXY: value }).TRUST_PROXY).toBe(false);
    });

    it.each(['true', ' TRUE '])('accepts %j as true', value => {
      expect(loadEnv({ TRUST_PROXY: value }).TRUST_PROXY).toBe(true);
    });

    it.each([
      ['127.0.0.1', '127.0.0.1'],
      ['10.0.0.0/8,::1', '10.0.0.0/8,::1'],
      [' 10.0.0.0/8 , ::1 ', '10.0.0.0/8,::1'],
      ['loopback', 'loopback'],
    ])('accepts the list %j as %j', (value, expected) => {
      expect(loadEnv({ TRUST_PROXY: value }).TRUST_PROXY).toBe(expected);
    });

    it('stops the start for a number and names the variable with the hop count message', () => {
      expect(() => loadEnv({ TRUST_PROXY: '2' })).toThrow(
        /^Invalid environment configuration:\n {2}- TRUST_PROXY: TRUST_PROXY does not accept a hop count/,
      );
    });

    it.each(['yes', '1.2.3', '10.0.0.0/33', 'a,,b'])(
      'stops the start for %j with the address-list message',
      value => {
        expect(() => loadEnv({ TRUST_PROXY: value })).toThrow(
          /^Invalid environment configuration:\n {2}- TRUST_PROXY: TRUST_PROXY must be false, true, or a comma-separated list of IP addresses or CIDR ranges/,
        );
      },
    );

    it('reports no TRUST_PROXY issue for a valid value next to another invalid variable', () => {
      expect(() => loadEnv({ TRUST_PROXY: '127.0.0.1', PORT: 'x' })).not.toThrow(/TRUST_PROXY/);
    });
  });

  it('throws descriptive error on invalid port or environment', () => {
    expect(() =>
      loadEnv({
        PORT: 'not-a-number',
      }),
    ).toThrow('Invalid environment configuration');

    expect(() =>
      loadEnv({
        NODE_ENV: 'invalid-env' as unknown as string,
      }),
    ).toThrow('Invalid environment configuration');
  });
});
