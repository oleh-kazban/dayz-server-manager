import { describe, expect, it } from 'vitest';

import { DEFAULT_LAUNCH_OPTIONS, EMPTY_LAUNCH_OPTIONS } from '@aegis/api-contracts';

import {
  LAUNCH_BOOLEAN_OPTIONS,
  toLaunchOptionsDto,
  toLaunchOptionsFormState,
  validateLaunchOptions,
} from './launch-options.utils';

describe('launch-options.utils', () => {
  it('round-trips DTO → form state → DTO', () => {
    for (const options of [DEFAULT_LAUNCH_OPTIONS, EMPTY_LAUNCH_OPTIONS]) {
      expect(toLaunchOptionsDto(toLaunchOptionsFormState(options))).toEqual(options);
    }
    expect(toLaunchOptionsFormState({ ...EMPTY_LAUNCH_OPTIONS, limitFPS: 60 })).toMatchObject({
      cpuCount: '',
      limitFPS: '60',
    });
  });

  it('treats blank numbers as engine default and trims input', () => {
    const state = toLaunchOptionsFormState(EMPTY_LAUNCH_OPTIONS);
    expect(toLaunchOptionsDto({ ...state, cpuCount: '  ', limitFPS: ' 90 ' })).toMatchObject({
      cpuCount: null,
      limitFPS: 90,
    });
  });

  it('validates ranges and whole numbers with field keys matching API fieldErrors', () => {
    const state = toLaunchOptionsFormState(EMPTY_LAUNCH_OPTIONS);
    expect(validateLaunchOptions(state)).toEqual({});
    expect(validateLaunchOptions({ ...state, cpuCount: '64', limitFPS: '1' })).toEqual({});
    expect(validateLaunchOptions({ ...state, cpuCount: '65', limitFPS: '2.5' })).toEqual({
      'launchOptions.cpuCount':
        'CPU count must be a whole number between 1 and 64, or empty for the engine default.',
      'launchOptions.limitFPS':
        'FPS limit must be a whole number between 1 and 200, or empty for the engine default.',
    });
    expect(Object.keys(validateLaunchOptions({ ...state, cpuCount: 'abc' }))).toEqual([
      'launchOptions.cpuCount',
    ]);
  });

  it('describes every boolean option with its CLI flag', () => {
    expect(LAUNCH_BOOLEAN_OPTIONS.map(option => option.key)).toEqual([
      'doLogs',
      'adminLog',
      'netLog',
      'freezeCheck',
      'scriptDebug',
      'filePatching',
    ]);
    expect(LAUNCH_BOOLEAN_OPTIONS.every(option => option.flag.startsWith('-'))).toBe(true);
  });
});
