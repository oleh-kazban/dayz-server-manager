import { isValidMissionTemplate } from './rules';

export interface ServerDzTemplateInput {
  hostname: string;
  missionTemplate: string;
  steamQueryPort: number;
}

function quote(field: string, value: string): string {
  if (/[\r\n\0]/.test(value)) {
    throw new RangeError(`Template field '${field}' must not contain CR, LF, or null characters`);
  }
  return `"${value.replace(/"/g, '""')}"`;
}

export function normalizeMissionTemplate(missionPath: string): string {
  const segments = missionPath
    .trim()
    .split(/[\\/]+/)
    .filter(segment => segment.length > 0);
  if (segments[0]?.toLowerCase() === 'mpmissions') {
    segments.shift();
  }
  return segments.join('/');
}

export function renderServerDzTemplate(input: ServerDzTemplateInput): string {
  if (!isValidMissionTemplate(input.missionTemplate)) {
    throw new RangeError(`Invalid mission template '${input.missionTemplate}'`);
  }
  if (!Number.isInteger(input.steamQueryPort)) {
    throw new RangeError('steamQueryPort must be an integer');
  }

  return [
    `hostname = ${quote('hostname', input.hostname)};`,
    'password = "";',
    'passwordAdmin = "";',
    'enableWhitelist = 0;',
    'maxPlayers = 60;',
    'verifySignatures = 2;',
    'forceSameBuild = 1;',
    'disableVoN = 0;',
    'vonCodecQuality = 20;',
    'disable3rdPerson = 0;',
    'disableCrosshair = 0;',
    'disablePersonalLight = 1;',
    'lightingConfig = 0;',
    'serverTime = "SystemTime";',
    'serverTimeAcceleration = 12;',
    'serverNightTimeAcceleration = 1;',
    'serverTimePersistent = 0;',
    'guaranteedUpdates = 1;',
    'loginQueueConcurrentPlayers = 5;',
    'loginQueueMaxPlayers = 500;',
    'instanceId = 1;',
    'storageAutoFix = 1;',
    `steamQueryPort = ${input.steamQueryPort};`,
    'motd[] = {};',
    'motdInterval = 1;',
    'respawnTime = 5;',
    'disableBaseDamage = 0;',
    'disableContainerDamage = 0;',
    'disableRespawnDialog = 0;',
    'enableDebugMonitor = 0;',
    'storeHouseStateDisabled = false;',
    'enableCfgGameplayFile = 0;',
    'timeStampFormat = "Short";',
    'logAverageFps = 1;',
    'logMemory = 1;',
    'logPlayers = 1;',
    'logFile = "server_console.log";',
    'adminLogPlayerHitsOnly = 0;',
    'adminLogPlacement = 0;',
    'adminLogBuildActions = 0;',
    'adminLogPlayerList = 0;',
    '',
    'class Missions',
    '{',
    '\tclass DayZ',
    '\t{',
    `\t\ttemplate = ${quote('missionTemplate', input.missionTemplate)};`,
    '\t};',
    '};',
    '',
  ].join('\n');
}
