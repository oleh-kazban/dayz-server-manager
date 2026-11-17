export function sanitizePresetFilename(
  serverName: string,
  exportDate: Date | string = new Date(),
): string {
  const parts = serverName
    .toLowerCase()
    .trim()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const base = parts.join('-') || 'server';
  const dateStr =
    typeof exportDate === 'string' ? exportDate : exportDate.toISOString().slice(0, 10);
  return `mods-preset-${base}-${dateStr}.json`;
}
