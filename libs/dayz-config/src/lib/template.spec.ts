import { extractProjection } from './projection';
import { analyzeServerConfig } from './rules';
import { normalizeMissionTemplate, renderServerDzTemplate } from './template';

const VALID_INPUT = {
  hostname: 'Chernarus "Vanilla" #1',
  missionTemplate: 'dayzOffline.chernarusplus',
  steamQueryPort: 27020,
};

describe('renderServerDzTemplate', () => {
  it('renders a vanilla config that parses and validates with zero diagnostics', () => {
    const text = renderServerDzTemplate(VALID_INPUT);
    const { document, diagnostics } = analyzeServerConfig(text);
    expect(diagnostics).toEqual([]);
    expect(extractProjection(document)).toEqual({
      missionTemplate: 'dayzOffline.chernarusplus',
      steamQueryPort: 27020,
      maxPlayers: 60,
    });
  });

  it('uses LF line endings and escapes quotes in the hostname', () => {
    const text = renderServerDzTemplate(VALID_INPUT);
    expect(text).not.toContain('\r');
    expect(text.startsWith('hostname = "Chernarus ""Vanilla"" #1";\n')).toBe(true);
    expect(text.endsWith('};\n')).toBe(true);
  });

  it('writes empty plaintext passwords for password and passwordAdmin', () => {
    const text = renderServerDzTemplate(VALID_INPUT);
    expect(text).toContain('password = "";');
    expect(text).toContain('passwordAdmin = "";');
    expect(text).not.toContain('__DSM_MANAGED_SECRET__');
  });

  it.each([
    [{ ...VALID_INPUT, missionTemplate: '../evil' }, "Invalid mission template '../evil'"],
    [{ ...VALID_INPUT, missionTemplate: 'a\nb' }, "Invalid mission template 'a\nb'"],
    [{ ...VALID_INPUT, missionTemplate: '' }, "Invalid mission template ''"],
    [{ ...VALID_INPUT, steamQueryPort: 2305.5 }, 'steamQueryPort must be an integer'],
    [{ ...VALID_INPUT, steamQueryPort: Number.NaN }, 'steamQueryPort must be an integer'],
    [
      { ...VALID_INPUT, hostname: 'line\nbreak' },
      "Template field 'hostname' must not contain CR, LF, or null characters",
    ],
    [
      { ...VALID_INPUT, hostname: 'null\0byte' },
      "Template field 'hostname' must not contain CR, LF, or null characters",
    ],
    [
      { ...VALID_INPUT, hostname: 'carriage\rreturn' },
      "Template field 'hostname' must not contain CR, LF, or null characters",
    ],
  ])('throws a RangeError for invalid input %#', (input, message) => {
    expect(() => renderServerDzTemplate(input)).toThrow(new RangeError(message));
  });
});

describe('normalizeMissionTemplate', () => {
  it.each([
    ['dayzOffline.chernarusplus', 'dayzOffline.chernarusplus'],
    ['mpmissions/dayzOffline.enoch', 'dayzOffline.enoch'],
    ['MPMissions\\dayzOffline.enoch', 'dayzOffline.enoch'],
    ['  /mpmissions//custom/sub/  ', 'custom/sub'],
    ['mpmissions', ''],
    ['', ''],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeMissionTemplate(input)).toBe(expected);
  });
});
