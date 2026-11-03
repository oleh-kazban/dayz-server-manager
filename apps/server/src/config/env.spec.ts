import { loadEnv } from './env';

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
      CORS_ORIGIN: 'https://example.com',
      LOG_LEVEL: 'warn',
    });

    expect(config.PORT).toBe(8080);
    expect(config.HOST).toBe('127.0.0.1');
    expect(config.NODE_ENV).toBe('production');
    expect(config.CORS_ORIGIN).toBe('https://example.com');
    expect(config.LOG_LEVEL).toBe('warn');
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
