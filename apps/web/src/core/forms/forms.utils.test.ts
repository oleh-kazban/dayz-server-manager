import { describe, expect, it } from 'vitest';

import { focusFirstInvalidField, isStructurallyEqual } from './forms.utils';

describe('isStructurallyEqual', () => {
  it('compares primitives, arrays and nested plain objects by value', () => {
    expect(isStructurallyEqual(1, 1)).toBe(true);
    expect(isStructurallyEqual('a', 'b')).toBe(false);
    expect(isStructurallyEqual(null, null)).toBe(true);
    expect(isStructurallyEqual(null, {})).toBe(false);
    expect(isStructurallyEqual([1, [2]], [1, [2]])).toBe(true);
    expect(isStructurallyEqual([1, 2], [1])).toBe(false);
    expect(isStructurallyEqual([1], { 0: 1 })).toBe(false);
    expect(isStructurallyEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(isStructurallyEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('treats undefined-valued keys as absent, like JSON payloads', () => {
    expect(isStructurallyEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(isStructurallyEqual({ a: 1, b: null }, { a: 1 })).toBe(false);
  });
});

describe('focusFirstInvalidField', () => {
  it('focuses the first aria-invalid control in DOM order and ignores a missing root', () => {
    const root = document.createElement('form');
    root.innerHTML = `
      <input id="valid" />
      <input id="first" aria-invalid="true" />
      <input id="second" aria-invalid="true" />
    `;
    document.body.appendChild(root);

    focusFirstInvalidField(root);
    expect(document.activeElement?.id).toBe('first');

    expect(() => focusFirstInvalidField(null)).not.toThrow();
    root.remove();
  });
});
