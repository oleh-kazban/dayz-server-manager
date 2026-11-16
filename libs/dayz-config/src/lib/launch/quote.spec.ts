import { formatCommandLine } from './quote';

describe('formatCommandLine', () => {
  it('leaves plain Windows arguments bare and quotes ones with spaces or metacharacters', () => {
    expect(
      formatCommandLine(
        'C:\\Day Z\\DayZServer_x64.exe',
        ['-doLogs', '-mod=@A B', '-x=a&b', ''],
        'win32',
      ),
    ).toBe('"C:\\Day Z\\DayZServer_x64.exe" -doLogs "-mod=@A B" "-x=a&b" ""');
  });

  it('single-quotes POSIX arguments that are not shell-safe and escapes single quotes', () => {
    expect(
      formatCommandLine(
        '/srv/dayz/DayZServer',
        ['-port=2302', "-mod=@it's", '-mod=@A;@B', ''],
        'linux',
      ),
    ).toBe("/srv/dayz/DayZServer -port=2302 '-mod=@it'\\''s' '-mod=@A;@B' ''");
  });
});
