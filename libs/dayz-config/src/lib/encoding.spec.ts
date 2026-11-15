import { STOCK_SERVER_DZ_CRLF, STOCK_SERVER_DZ_LF } from './fixtures/stock-server-dz.fixture';
import { detectTextFormat, fromLf, toLf } from './encoding';

describe('detectTextFormat', () => {
  it.each([
    { name: 'pure CRLF', text: 'a=1;\r\nb=2;\r\n', eol: 'crlf' },
    { name: 'pure LF', text: 'a=1;\nb=2;\n', eol: 'lf' },
    { name: 'no line breaks', text: 'a=1;', eol: 'lf' },
    { name: 'empty text', text: '', eol: 'lf' },
    { name: 'CRLF majority over stray LF', text: 'a\r\nb\r\nc\nd', eol: 'crlf' },
    { name: 'CRLF and LF tie', text: 'a\r\nb\nc', eol: 'crlf' },
    { name: 'LF majority over stray CRLF', text: 'a\r\nb\nc\nd', eol: 'lf' },
  ])('detects $eol for $name', ({ text, eol }) => {
    expect(detectTextFormat(text)).toEqual({ eol });
  });
});

describe('toLf / fromLf', () => {
  it('round-trips the CRLF stock file byte-for-byte', () => {
    const lf = toLf(STOCK_SERVER_DZ_CRLF);
    expect(lf).toBe(STOCK_SERVER_DZ_LF);
    expect(lf).not.toContain('\r');
    expect(fromLf(lf, 'crlf')).toBe(STOCK_SERVER_DZ_CRLF);
  });

  it('round-trips the LF stock file byte-for-byte', () => {
    expect(fromLf(toLf(STOCK_SERVER_DZ_LF), 'lf')).toBe(STOCK_SERVER_DZ_LF);
  });

  it('does not double carriage returns when converting text that already has CRLF', () => {
    expect(fromLf('a\r\nb\nc', 'crlf')).toBe('a\r\nb\r\nc');
  });

  it('strips CRLF to LF when the target style is LF', () => {
    expect(fromLf('a\r\nb\r\n', 'lf')).toBe('a\nb\n');
  });

  it('leaves lone carriage returns untouched', () => {
    expect(toLf('a\rb\r\n')).toBe('a\rb\n');
  });
});
