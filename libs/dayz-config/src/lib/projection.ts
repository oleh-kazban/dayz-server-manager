import type { ServerDzProjectionDto } from '@aegis/api-contracts';

import { findClass, findLastAssignment } from './query';
import { findSettingRule, isValidMissionTemplate } from './rules';
import type { ConfigDocument, ConfigEntry } from './types';

export const DEFAULT_STEAM_QUERY_PORT = 27016;
export const DEFAULT_MAX_PLAYERS = 60;

/**
 * Reads an explicitly configured integer setting, or `null` when the key is absent or its
 * value violates the setting's rule (type or range).
 */
export function readIntegerSetting(entries: ConfigEntry[], key: string): number | null {
  const value = findLastAssignment(entries, key)?.value;
  const rule = findSettingRule(key);
  if (!value || Array.isArray(value) || value.kind !== 'number' || !rule) {
    return null;
  }
  const numeric = value.value;
  const inRange =
    Number.isInteger(numeric) &&
    (rule.min === undefined || numeric >= rule.min) &&
    (rule.max === undefined || numeric <= rule.max);
  return inRange ? numeric : null;
}

export function extractProjection(document: ConfigDocument): ServerDzProjectionDto {
  const dayz = findClass(findClass(document.entries, 'Missions')?.entries ?? [], 'DayZ');
  const template = dayz ? findLastAssignment(dayz.entries, 'template')?.value : undefined;
  const missionTemplate =
    template &&
    !Array.isArray(template) &&
    template.kind === 'string' &&
    isValidMissionTemplate(template.value)
      ? template.value
      : null;

  return {
    missionTemplate,
    steamQueryPort:
      readIntegerSetting(document.entries, 'steamQueryPort') ?? DEFAULT_STEAM_QUERY_PORT,
    maxPlayers: readIntegerSetting(document.entries, 'maxPlayers') ?? DEFAULT_MAX_PLAYERS,
  };
}
