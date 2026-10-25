import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Polyfill ResizeObserver for JSDOM
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill HTMLDialogElement modal methods
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
    this.open = false;
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.dispatchEvent(new Event('close'));
  };
}

// Polyfill scrollIntoView and scrollTo
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();

// Polyfill matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
