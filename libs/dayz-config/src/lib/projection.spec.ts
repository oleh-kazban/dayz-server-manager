import { serverDzProjectionSchema } from '@aegis/api-contracts';

import { STOCK_SERVER_DZ_CRLF, STOCK_SERVER_DZ_LF } from './fixtures/stock-server-dz.fixture';
import { parseServerConfig } from './parser';
import {
  DEFAULT_MAX_PLAYERS,
  DEFAULT_STEAM_QUERY_PORT,
  extractProjection,
  readIntegerSetting,
} from './projection';

const MISSION_BLOCK = 'class Missions { class DayZ { template = "dayzOffline.enoch"; }; };';

function projectionOf(text: string) {
  return extractProjection(parseServerConfig(text).document);
}

describe('extractProjection', () => {
  it.each([
    ['CRLF', STOCK_SERVER_DZ_CRLF],
    ['LF', STOCK_SERVER_DZ_LF],
  ])('reads mission, steamQueryPort and maxPlayers from the %s stock file', (_, text) => {
    const projection = projectionOf(text);
    expect(projection).toEqual({
      missionTemplate: 'dayzOffline.chernarusplus',
      steamQueryPort: 2305,
      maxPlayers: 60,
    });
    expect(serverDzProjectionSchema.safeParse(projection).success).toBe(true);
  });

  it('falls back to defaults when the settings are absent', () => {
    expect(DEFAULT_STEAM_QUERY_PORT).toBe(27016);
    expect(DEFAULT_MAX_PLAYERS).toBe(60);
    expect(projectionOf(MISSION_BLOCK)).toEqual({
      missionTemplate: 'dayzOffline.enoch',
      steamQueryPort: 27016,
      maxPlayers: 60,
    });
  });

  it('uses the last assignment and matches keys case-insensitively', () => {
    expect(
      projectionOf(
        `steamQueryPort = 2305;\nSTEAMQUERYPORT = 2400;\nMaxPlayers = 100;\n${MISSION_BLOCK}`,
      ),
    ).toMatchObject({
      steamQueryPort: 2400,
      maxPlayers: 100,
    });
  });

  it.each([
    ['below the range', 'steamQueryPort = 1023;\nmaxPlayers = 0;'],
    ['above the range', 'steamQueryPort = 65536;\nmaxPlayers = 201;'],
    ['fractional', 'steamQueryPort = 2305.5;\nmaxPlayers = 10.5;'],
    ['quoted', 'steamQueryPort = "2305";\nmaxPlayers = "10";'],
    ['arrays', 'steamQueryPort[] = {2305};\nmaxPlayers[] = {10};'],
    ['missing values', 'steamQueryPort = ;\nmaxPlayers = ;'],
  ])('falls back to defaults for %s numeric values', (_, settings) => {
    expect(projectionOf(`${settings}\n${MISSION_BLOCK}`)).toMatchObject({
      steamQueryPort: 27016,
      maxPlayers: 60,
    });
  });

  it('accepts the inclusive range boundaries', () => {
    expect(projectionOf(`steamQueryPort = 1024;\nmaxPlayers = 1;\n${MISSION_BLOCK}`)).toMatchObject(
      {
        steamQueryPort: 1024,
        maxPlayers: 1,
      },
    );
    expect(
      projectionOf(`steamQueryPort = 65535;\nmaxPlayers = 200;\n${MISSION_BLOCK}`),
    ).toMatchObject({
      steamQueryPort: 65535,
      maxPlayers: 200,
    });
  });

  it.each([
    ['no Missions class', 'maxPlayers = 60;'],
    ['no DayZ class', 'class Missions {};'],
    ['no template', 'class Missions { class DayZ {}; };'],
    ['an unquoted template', 'class Missions { class DayZ { template = enoch; }; };'],
    ['an array template', 'class Missions { class DayZ { template[] = {"enoch"}; }; };'],
    ['a traversal template', 'class Missions { class DayZ { template = "../enoch"; }; };'],
    ['an empty template', 'class Missions { class DayZ { template = ; }; };'],
  ])('reports a null mission for %s', (_, text) => {
    expect(projectionOf(text).missionTemplate).toBeNull();
  });
});

describe('readIntegerSetting', () => {
  const entriesOf = (text: string) => parseServerConfig(text).document.entries;

  it('returns the explicit in-range value, or null when absent, out of range, or not a number', () => {
    expect(readIntegerSetting(entriesOf('steamQueryPort = 2305;'), 'steamQueryPort')).toBe(2305);
    expect(readIntegerSetting(entriesOf('hostname = "x";'), 'steamQueryPort')).toBeNull();
    expect(readIntegerSetting(entriesOf('steamQueryPort = 80;'), 'steamQueryPort')).toBeNull();
    expect(readIntegerSetting(entriesOf('steamQueryPort = "2305";'), 'steamQueryPort')).toBeNull();
  });
});
