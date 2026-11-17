export function sanitizePresetFilename(serverName: string): string {
  const parts = serverName
    .toLowerCase()
    .trim()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const base = parts.join('-') || 'server';
  return `${base}-mods-preset.json`;
}
