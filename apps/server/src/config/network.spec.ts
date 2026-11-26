import { loadEnv } from './env';
import { listenWarning } from './network';

describe('listenWarning', () => {
  it('keeps 0.0.0.0 as the default HOST', () => {
    expect(loadEnv({}).HOST).toBe('0.0.0.0');
  });

  // The LAN address is the test input itself.
  // eslint-disable-next-line sonarjs/no-hardcoded-ip
  const lanHost = '192.168.1.20';

  it.each(['0.0.0.0', lanHost, 'aegis.example.com'])(
    'warns about HTTPS for non-loopback host %s',
    host => {
      expect(listenWarning(host)).toMatch(/HTTPS/);
    },
  );

  it.each(['127.0.0.1', '::1', 'localhost'])('returns null for loopback host %s', host => {
    expect(listenWarning(host)).toBeNull();
  });
});
