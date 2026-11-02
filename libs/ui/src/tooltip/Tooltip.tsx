import {
  cloneElement,
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import type { TooltipProps } from './Tooltip.types';
import { calculateTooltipPosition, type TooltipCoordinates } from './tooltip.utils';

export function Tooltip({
  content,
  placement = 'top',
  delay = 250,
  disabled = false,
  className = '',
  children,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoordinates | null>(null);

  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const showTooltip = useCallback(
    (immediate = false) => {
      clearCloseTimer();
      clearTimer();
      if (disabled || !content) return;

      if (immediate || delay === 0) {
        setIsOpen(true);
      } else {
        timeoutRef.current = setTimeout(() => {
          setIsOpen(true);
        }, delay);
      }
    },
    [clearCloseTimer, clearTimer, content, delay, disabled],
  );

  const hideTooltip = useCallback(() => {
    clearTimer();
    clearCloseTimer();
    setIsOpen(false);
    setCoords(null);
  }, [clearCloseTimer, clearTimer]);

  const scheduleHide = useCallback(() => {
    clearTimer();
    clearCloseTimer();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setCoords(null);
    }, 100);
  }, [clearCloseTimer, clearTimer]);

  const isVisible = isOpen && !disabled;

  useEffect(() => {
    if (disabled) {
      clearTimer();
      clearCloseTimer();
    }
  }, [disabled, clearTimer, clearCloseTimer]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const newCoords = calculateTooltipPosition(triggerRect, tooltipRect, placement);
    setCoords(newCoords);
  }, [placement]);

  useLayoutEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!isVisible) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    return () => {
      clearTimer();
      clearCloseTimer();
    };
  }, [clearTimer, clearCloseTimer]);

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Escape' && isVisible) {
      e.stopPropagation();
      hideTooltip();
    }
  };

  const child = children as ReactElement<{
    'aria-describedby'?: string;
  }>;

  const existingDescribedBy = child.props['aria-describedby'];
  const computedDescribedBy = isVisible
    ? [existingDescribedBy, tooltipId].filter(Boolean).join(' ')
    : existingDescribedBy;

  const shouldRenderTooltip = isVisible && Boolean(content) && typeof document !== 'undefined';

  return (
    <>
      <span
        ref={triggerRef}
        data-testid="tooltip-trigger-wrapper"
        className="inline-flex"
        onMouseEnter={() => showTooltip(false)}
        onMouseLeave={scheduleHide}
        onFocusCapture={() => showTooltip(true)}
        onBlurCapture={hideTooltip}
        onKeyDown={handleKeyDown}
      >
        {cloneElement(child, {
          'aria-describedby': computedDescribedBy,
        })}
      </span>

      {shouldRenderTooltip &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            data-placement={coords?.placement ?? placement}
            data-testid="tooltip-portal"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleHide}
            style={{
              position: 'fixed',
              top: coords ? `${coords.top}px` : '-9999px',
              left: coords ? `${coords.left}px` : '-9999px',
              opacity: coords ? 1 : 0,
            }}
            className={`z-50 px-2.5 py-1 text-xs font-medium text-[var(--color-text-main)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md shadow-md select-none transition-opacity duration-150 ${className}`.trim()}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
