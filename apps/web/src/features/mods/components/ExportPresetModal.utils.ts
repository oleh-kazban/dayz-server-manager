export function formatExportTimestamp(date: Date | string = new Date()): string {
  if (typeof date === 'string') {
    return date;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

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
  const timestampStr = formatExportTimestamp(exportDate);
  return `mods-preset-${base}-${timestampStr}.json`;
}
