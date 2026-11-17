import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { detectLogSeverity } from './logSeverity';
import { LOG_ROW_HEIGHT, LogViewer } from './LogViewer';

/**
 * jsdom does no layout: give the log region a 480 px viewport, a content height of
 * `lines × row height`, and a scrollTop clamped like a browser's.
 */
const VIEWPORT = 480;
const scrollPositions = new WeakMap<Element, number>();
const contentHeight = (element: HTMLElement) =>
  Number.parseFloat((element.firstElementChild as HTMLElement | null)?.style.height ?? '0') || 0;
const isLog = (element: HTMLElement) => element.getAttribute('role') === 'log';
const originals = {
  clientHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight'),
  scrollHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight'),
  scrollTop: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop'),
};

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return isLog(this) ? VIEWPORT : 0;
    },
  });
  Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return isLog(this) ? Math.max(contentHeight(this), VIEWPORT) : 0;
    },
  });
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get(this: HTMLElement) {
      return scrollPositions.get(this) ?? 0;
    },
    set(this: HTMLElement, value: number) {
      const max = isLog(this) ? Math.max(0, contentHeight(this) - VIEWPORT) : 0;
      scrollPositions.set(this, Math.min(Math.max(0, value), max));
    },
  });
});

afterAll(() => {
  for (const [name, descriptor] of Object.entries(originals)) {
    if (descriptor) {
      Object.defineProperty(
        name === 'clientHeight' ? HTMLElement.prototype : Element.prototype,
        name,
        descriptor,
      );
    }
  }
});

const makeLines = (count: number, prefix = 'line') =>
  Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
const log = () => screen.getByRole('log');
const renderedNumbers = () =>
  Array.from(document.querySelectorAll('[data-line]')).map(row =>
    Number(row.getAttribute('data-line')),
  );
const scrollTo = (top: number) => {
  log().scrollTop = top;
  fireEvent.scroll(log());
};

describe('LogViewer (DSM-00207)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only a window of 100k lines and starts at the newest line', () => {
    render(<LogViewer lines={makeLines(100_000)} label="RPT log" />);

    const numbers = renderedNumbers();
    expect(numbers.length).toBeLessThanOrEqual(VIEWPORT / LOG_ROW_HEIGHT + 2 * 20 + 1);
    expect(numbers.at(-1)).toBe(100_000);
    expect(screen.getByText('line 100000')).toBeInTheDocument();
    expect(log()).toHaveAccessibleName('RPT log');
    expect(log()).toHaveAttribute('aria-live', 'off');
    expect(log()).toHaveAttribute('tabindex', '0');
  });

  it('numbers lines from firstLineNumber', () => {
    render(<LogViewer lines={makeLines(3)} firstLineNumber={449_001} />);
    expect(renderedNumbers()).toEqual([449_001, 449_002, 449_003]);
    expect(screen.getByText('449003')).toBeInTheDocument();
  });

  it('keeps following new lines while at the bottom', () => {
    const { rerender } = render(<LogViewer lines={makeLines(100)} />);
    rerender(<LogViewer lines={makeLines(150)} />);
    expect(renderedNumbers().at(-1)).toBe(150);
    expect(screen.queryByRole('button', { name: /Jump to latest/ })).not.toBeInTheDocument();
  });

  it('pauses when scrolled up, counts new lines and jumps back to the latest', () => {
    const onFollowingChange = vi.fn();
    const { rerender } = render(
      <LogViewer lines={makeLines(1_000)} onFollowingChange={onFollowingChange} />,
    );

    scrollTo(0);
    expect(onFollowingChange).toHaveBeenLastCalledWith(false);
    expect(renderedNumbers()[0]).toBe(1);
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Following paused. 0 new lines.');

    rerender(<LogViewer lines={makeLines(1_250)} onFollowingChange={onFollowingChange} />);
    // Paused: the view stays where the user is reading.
    expect(renderedNumbers()[0]).toBe(1);
    expect(screen.getByRole('button', { name: '250 new · Jump to latest' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Jump to latest/ }));
    expect(onFollowingChange).toHaveBeenLastCalledWith(true);
    expect(renderedNumbers().at(-1)).toBe(1_250);
    expect(screen.queryByRole('button', { name: /Jump to latest/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('resumes following when the user scrolls back to the bottom', () => {
    const onFollowingChange = vi.fn();
    render(<LogViewer lines={makeLines(1_000)} onFollowingChange={onFollowingChange} />);
    scrollTo(0);
    scrollTo(1_000 * LOG_ROW_HEIGHT);
    expect(onFollowingChange.mock.calls).toEqual([[false], [true]]);
  });

  it('can be controlled by the parent', () => {
    const onFollowingChange = vi.fn();
    const { rerender } = render(
      <LogViewer
        lines={makeLines(1_000)}
        following={false}
        onFollowingChange={onFollowingChange}
      />,
    );
    // Not following: does not jump to the bottom on its own.
    expect(renderedNumbers()[0]).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest' }));
    expect(onFollowingChange).toHaveBeenCalledWith(true);

    rerender(
      <LogViewer lines={makeLines(1_000)} following onFollowingChange={onFollowingChange} />,
    );
    expect(renderedNumbers().at(-1)).toBe(1_000);
  });

  it('colours errors and warnings, with a custom detector when given', () => {
    const { rerender } = render(
      <LogViewer
        lines={['21:00:00.1 Warning: No components in x.p3d', '21:00:00.2 Error: crash', 'ok']}
      />,
    );
    expect(screen.getByText(/Warning: No components/)).toHaveClass('text-[var(--color-warning)]');
    expect(screen.getByText(/Error: crash/)).toHaveClass('text-[var(--color-danger)]');
    expect(screen.getByText('ok')).not.toHaveAttribute('class');

    rerender(<LogViewer lines={['ok']} getSeverity={() => 'error'} />);
    expect(screen.getByText('ok')).toHaveClass('text-[var(--color-danger)]');
  });

  it('shows the empty message and no jump button without lines', () => {
    render(<LogViewer lines={[]} emptyMessage="Waiting for the server to write its log…" />);
    expect(screen.getByText('Waiting for the server to write its log…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('accepts a custom height and class', () => {
    const { container } = render(<LogViewer lines={makeLines(2)} height={200} className="mt-4" />);
    expect(log()).toHaveStyle({ height: '200px' });
    expect(container.firstElementChild).toHaveClass('mt-4');
  });
});

describe('detectLogSeverity', () => {
  it.each([
    ['21:00:00.123 Error: Script compilation failed', 'error'],
    ['SCRIPT    (E): NULL pointer to instance', 'error'],
    ['Unhandled exception in thread', 'error'],
    ['Server crashed: access violation', 'error'],
    ['21:00:00.123 Warning: No components in a.p3d', 'warning'],
    ['SCRIPT    (W): deprecated call', 'warning'],
    ['21:00:00.123 Mission read.', null],
    ['Terror zone loaded', null],
  ] as const)('%s → %s', (line, severity) => {
    expect(detectLogSeverity(line)).toBe(severity);
  });
});

describe('LogViewer new-line count', () => {
  it('counts only lines added after the parent paused following', () => {
    const { rerender } = render(<LogViewer lines={makeLines(500)} following={false} />);
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();

    rerender(<LogViewer lines={makeLines(520)} following={false} />);
    expect(screen.getByRole('button', { name: '20 new · Jump to latest' })).toBeInTheDocument();

    rerender(<LogViewer lines={makeLines(520)} following />);
    rerender(<LogViewer lines={makeLines(530)} following={false} />);
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();
  });
});

describe('LogViewer scroll events', () => {
  it('does not report a change for scrolling that stays at the bottom', () => {
    const onFollowingChange = vi.fn();
    render(<LogViewer lines={makeLines(1_000)} onFollowingChange={onFollowingChange} />);
    scrollTo(1_000 * LOG_ROW_HEIGHT);
    expect(onFollowingChange).not.toHaveBeenCalled();
  });
});
