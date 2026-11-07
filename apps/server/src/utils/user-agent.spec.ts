import { describe, expect, it } from 'vitest';

import { parseUserAgent } from './user-agent';

describe('User Agent Parser (parseUserAgent)', () => {
  it('handles null, undefined, empty, or whitespace strings', () => {
    expect(parseUserAgent(null)).toBe('Unknown Device');
    expect(parseUserAgent(undefined)).toBe('Unknown Device');
    expect(parseUserAgent('')).toBe('Unknown Device');
    expect(parseUserAgent('   ')).toBe('Unknown Device');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseUserAgent(123 as any)).toBe('Unknown Device');
  });

  it('detects Windows and Chrome', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(parseUserAgent(ua)).toBe('Chrome on Windows');
  });

  it('detects Edge on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    expect(parseUserAgent(ua)).toBe('Edge on Windows');
  });

  it('detects Opera on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/105.0.0.0';
    expect(parseUserAgent(ua)).toBe('Opera on Windows');
  });

  it('detects Opera with legacy Opera token', () => {
    const ua = 'Opera/9.80 (Windows NT 6.1; U; en) Presto/2.8.131 Version/11.11';
    expect(parseUserAgent(ua)).toBe('Opera on Windows');
  });

  it('detects Firefox on Linux', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0';
    expect(parseUserAgent(ua)).toBe('Firefox on Linux');
  });

  it('detects Safari on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15';
    expect(parseUserAgent(ua)).toBe('Safari on macOS');
  });

  it('detects Mobile Safari on iOS (iPhone / iPad)', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(ua)).toBe('Mobile Safari on iOS');
  });

  it('detects Chrome on Android', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36';
    expect(parseUserAgent(ua)).toBe('Chrome on Android');
  });

  it('detects Firefox on iOS (FxiOS)', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15';
    expect(parseUserAgent(ua)).toBe('Firefox on iOS');
  });

  it('detects Chrome on iOS (CriOS)', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(ua)).toBe('Chrome on iOS');
  });

  it('detects browser only when OS is unknown', () => {
    const ua = 'CustomClient Firefox/120.0';
    expect(parseUserAgent(ua)).toBe('Firefox');
  });

  it('detects OS only when browser is unknown', () => {
    const ua = 'CustomTool/1.0 (Linux x86_64)';
    expect(parseUserAgent(ua)).toBe('Linux');
  });

  it('falls back to Unknown Device when both OS and browser are unrecognized', () => {
    const ua = 'CustomScript/1.0';
    expect(parseUserAgent(ua)).toBe('Unknown Device');
  });
});
