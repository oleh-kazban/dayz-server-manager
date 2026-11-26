import { type UIEvent, useLayoutEffect, useRef, useState } from 'react';

import { ArrowDownToLine } from 'lucide-react';

import { Button } from '../button';

import { detectLogSeverity } from './logSeverity';
import type { LogSeverity, LogViewerProps } from './LogViewer.types';

export type { LogSeverity, LogViewerProps };

/** Every row has this height, so the visible window is plain arithmetic (no measuring). */
export const LOG_ROW_HEIGHT = 20;
/** Extra rows rendered above and below the viewport to keep fast scrolling smooth. */
const OVERSCAN = 20;
/** Within this many px of the bottom counts as "at the newest line". */
const BOTTOM_TOLERANCE = 24;
/** Space above the first and below the last line. */
const PADDING_Y = 8;

const SEVERITY_CLASSES: Record<LogSeverity, string> = {
  error: 'text-[var(--color-danger)] font-medium',
  warning: 'text-[var(--color-warning)]',
};

/**
 * Log viewer for large, growing logs (DSM-00207). Renders only the visible lines, so 100k+
 * lines stay fast; follows the newest line until the user scrolls up, then offers
 * "Jump to latest" with the number of lines that arrived meanwhile.
 *
 * Accessibility: the scroll area is a focusable `role="log"` region (arrow keys / Page Down
 * scroll it), with `aria-live="off"` because a busy server writes hundreds of lines per second
 * and announcing each would drown a screen reader. A separate status announces when following
 * is paused and how many lines are waiting.
 */
export function LogViewer({
  lines,
  firstLineNumber = 1,
  following: followingProp,
  onFollowingChange,
  getSeverity = detectLogSeverity,
  label = 'Log',
  height = 480,
  emptyMessage = 'No log lines yet.',
  className = '',
}: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalFollowing, setInternalFollowing] = useState(true);
  const following = followingProp ?? internalFollowing;
  const [scrollTop, setScrollTop] = useState(0);
  // Lines present when following stopped (by scrolling or by the parent): later ones are "new".
  const [pausedAt, setPausedAt] = useState(following ? 0 : lines.length);
  const [wasFollowing, setWasFollowing] = useState(following);
  if (following !== wasFollowing) {
    setWasFollowing(following);
    if (!following) {
      setPausedAt(lines.length);
    }
  }

  const setFollowing = (next: boolean) => {
    if (next === following) {
      return;
    }
    if (followingProp === undefined) {
      setInternalFollowing(next);
    }
    onFollowingChange?.(next);
  };

  // Stick to the newest line while following (new lines, or following switched back on).
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (following && element) {
      element.scrollTop = element.scrollHeight;
      setScrollTop(element.scrollTop);
    }
  }, [following, lines.length]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    setScrollTop(element.scrollTop);
    const atBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - BOTTOM_TOLERANCE;
    setFollowing(atBottom);
  };

  const jumpToLatest = () => {
    setFollowing(true);
    const element = scrollRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  };

  const start = Math.max(0, Math.floor((scrollTop - PADDING_Y) / LOG_ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(lines.length, Math.ceil((scrollTop + height) / LOG_ROW_HEIGHT) + OVERSCAN);
  const lastNumber = firstLineNumber + Math.max(0, lines.length - 1);
  const numberWidth = `${String(lastNumber).length}ch`;
  const unseen = following ? 0 : Math.max(0, lines.length - pausedAt);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] ${className}`.trim()}
    >
      <div
        ref={scrollRef}
        role="log"
        aria-label={label}
        aria-live="off"
        tabIndex={0} // NOSONAR: keyboard users must focus the log to scroll it (TD-UI-063)
        onScroll={handleScroll}
        style={{ height }}
        className="overflow-auto font-mono text-xs text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
      >
        {lines.length === 0 ? (
          <p className="p-4 font-sans text-[var(--color-text-muted)]">{emptyMessage}</p>
        ) : (
          <div
            className="relative w-max min-w-full"
            style={{ height: lines.length * LOG_ROW_HEIGHT + 2 * PADDING_Y }}
          >
            <div style={{ transform: `translateY(${PADDING_Y + start * LOG_ROW_HEIGHT}px)` }}>
              {lines.slice(start, end).map((line, offset) => {
                const index = start + offset;
                const severity = getSeverity(line);
                return (
                  <div
                    key={index}
                    data-line={firstLineNumber + index}
                    className="group flex whitespace-pre pr-4 hover:bg-[var(--color-surface-hover)]"
                    style={{ height: LOG_ROW_HEIGHT, lineHeight: `${LOG_ROW_HEIGHT}px` }}
                  >
                    {/* Gutter stays visible (and opaque) while scrolling sideways. */}
                    <span
                      className="sticky left-0 mr-3 box-content shrink-0 select-none border-r border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 text-right text-[var(--color-text-muted)] group-hover:bg-[var(--color-surface-hover)]"
                      style={{ width: numberWidth }}
                    >
                      {firstLineNumber + index}
                    </span>
                    <span className={severity ? SEVERITY_CLASSES[severity] : undefined}>
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!following && lines.length > 0 && (
        <Button
          variant="primary"
          leftIcon={ArrowDownToLine}
          onClick={jumpToLatest}
          className="absolute bottom-3 right-5 shadow-[var(--shadow-card)]"
        >
          {unseen > 0 ? `${unseen.toLocaleString()} new · Jump to latest` : 'Jump to latest'}
        </Button>
      )}
      <span role="status" className="sr-only">
        {following ? '' : `Following paused. ${unseen.toLocaleString()} new lines.`}
      </span>
    </div>
  );
}
