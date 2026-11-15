import { parseServerConfig } from './parser';
import { findAssignments, findClass, findLastAssignment } from './query';

const { entries } = parseServerConfig(
  [
    'hostname = "first";',
    'HOSTNAME = "second";',
    'class Missions { class DayZ { template = "t"; }; mode = 1; };',
    'class Other {};',
  ].join('\n'),
).document;

describe('config query helpers', () => {
  it('finds top-level assignments case-insensitively in source order', () => {
    expect(findAssignments(entries, 'hostname').map(a => a.key)).toEqual(['hostname', 'HOSTNAME']);
    expect(findLastAssignment(entries, 'Hostname')?.key).toBe('HOSTNAME');
    expect(findAssignments(entries, 'template')).toEqual([]);
    expect(findLastAssignment(entries, 'missing')).toBeUndefined();
  });

  it('finds classes case-insensitively and never matches assignments', () => {
    expect(findClass(entries, 'missions')?.name).toBe('Missions');
    expect(findClass(entries, 'hostname')).toBeUndefined();
  });
});
