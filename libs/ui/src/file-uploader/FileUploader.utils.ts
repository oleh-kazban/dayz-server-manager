export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unitIndex = Math.min(i, units.length - 1);
  if (unitIndex === 0) {
    return `${bytes} B`;
  }
  const value = bytes / Math.pow(k, unitIndex);
  const formatted = Math.round(value * 10) / 10;
  return `${formatted} ${units[unitIndex]}`;
}

export function validateFileType(file: File, accept?: string | string[]): boolean {
  if (!accept) return true;
  const patterns = Array.isArray(accept)
    ? accept.flatMap(item => item.split(','))
    : accept.split(',');
  const normalized = patterns.map(p => p.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  return normalized.some(pattern => {
    if (pattern.startsWith('.')) {
      return fileName.endsWith(pattern);
    }
    if (pattern.endsWith('/*')) {
      const typePrefix = pattern.slice(0, -1);
      return fileType.startsWith(typePrefix);
    }
    if (pattern === fileType) {
      return true;
    }
    if (pattern === 'application/json' && fileName.endsWith('.json')) {
      return true;
    }
    return false;
  });
}

export function validateFileSize(file: File, maxSizeBytes?: number): boolean {
  if (maxSizeBytes === undefined) return true;
  return file.size <= maxSizeBytes;
}

export function getConstraintsHint(
  accept?: string | string[],
  maxSizeBytes?: number,
): string | null {
  const hints: string[] = [];
  if (accept) {
    const raw = Array.isArray(accept) ? accept.join(', ') : accept;
    hints.push(raw);
  }
  if (maxSizeBytes !== undefined) {
    hints.push(`up to ${formatFileSize(maxSizeBytes)}`);
  }
  if (hints.length === 0) return null;
  return hints.join(' • ');
}

export function getDropZoneBorderClasses(
  isDragging: boolean,
  hasError: boolean,
  disabled: boolean,
): string {
  if (disabled) {
    return 'opacity-50 cursor-not-allowed bg-[var(--color-surface-subtle)] border-[var(--color-border)]';
  }
  if (isDragging) {
    return 'cursor-pointer border-[var(--color-primary)] bg-[var(--color-surface-hover)] ring-2 ring-[var(--color-primary)]/20';
  }
  if (hasError) {
    return 'cursor-pointer border-[var(--color-status-danger)] bg-[var(--color-surface)] focus-visible:border-[var(--color-status-danger)] focus-visible:ring-1 focus-visible:ring-[var(--color-status-danger)]';
  }
  return 'cursor-pointer border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)] focus-visible:border-[var(--color-primary)] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]';
}

export function getFileCardBorderClasses(
  isDragging: boolean,
  hasError: boolean,
  disabled: boolean,
): string {
  if (disabled) {
    return 'opacity-50 cursor-not-allowed bg-[var(--color-surface-subtle)] border-[var(--color-border)]';
  }
  if (isDragging) {
    return 'border-[var(--color-primary)] bg-[var(--color-surface-hover)] ring-2 ring-[var(--color-primary)]/20';
  }
  if (hasError) {
    return 'border-[var(--color-status-danger)] bg-[var(--color-surface)]';
  }
  return 'border-[var(--color-border)] bg-[var(--color-surface)]';
}
