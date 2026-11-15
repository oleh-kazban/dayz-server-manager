/**
 * Structural equality for plain form payloads (primitives, arrays, plain objects).
 * Object keys whose value is `undefined` are treated as absent, matching how the
 * payload is serialised to JSON.
 */
export function isStructurallyEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => isStructurallyEqual(item, b[index]))
    );
  }

  const recordA = a as Record<string, unknown>;
  const recordB = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(recordA), ...Object.keys(recordB)]);
  for (const key of keys) {
    if (!isStructurallyEqual(recordA[key], recordB[key])) {
      return false;
    }
  }
  return true;
}

/** Focuses and scrolls to the first control marked `aria-invalid="true"` inside `root`. */
export function focusFirstInvalidField(root: HTMLElement | null): void {
  const target = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!target) {
    return;
  }
  target.focus();
  target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}
