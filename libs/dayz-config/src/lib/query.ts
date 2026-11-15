import type { ConfigAssignment, ConfigClassBlock, ConfigEntry } from './types';

export function findAssignments(entries: ConfigEntry[], key: string): ConfigAssignment[] {
  const needle = key.toLowerCase();
  return entries.filter(
    (entry): entry is ConfigAssignment =>
      entry.type === 'assignment' && entry.key.toLowerCase() === needle,
  );
}

export function findLastAssignment(
  entries: ConfigEntry[],
  key: string,
): ConfigAssignment | undefined {
  return findAssignments(entries, key).at(-1);
}

export function findClass(entries: ConfigEntry[], name: string): ConfigClassBlock | undefined {
  const needle = name.toLowerCase();
  return entries.find(
    (entry): entry is ConfigClassBlock =>
      entry.type === 'class' && entry.name.toLowerCase() === needle,
  );
}
