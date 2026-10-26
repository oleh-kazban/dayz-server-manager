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
  ref,
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

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showTooltip = useCallback(
    (immediate = false) => {
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
    [clearTimer, content, delay, disabled],
  );

  const hideTooltip = useCallback(() => {
    clearTimer();
    setIsOpen(false);
    setCoords(null);
  }, [clearTimer]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const newCoords = calculateTooltipPosition(triggerRect, tooltipRect, placement);
    setCoords(newCoords);
  }, [placement]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Escape') {
      hideTooltip();
    }
  };

  const setTooltipRefs = (el: HTMLDivElement | null) => {
    tooltipRef.current = el;
    if (typeof ref === 'function') {
      ref(el);
    } else if (ref && 'current' in ref) {
      (ref as { current: HTMLDivElement | null }).current = el;
    }
  };

  const child = children as ReactElement<{
    'aria-describedby'?: string;
  }>;

  const shouldRenderTooltip = isOpen && Boolean(content) && typeof document !== 'undefined';

  return (
    <>
      <span
        ref={triggerRef}
        data-testid="tooltip-trigger-wrapper"
        className="inline-flex"
        onMouseEnter={() => showTooltip(false)}
        onMouseLeave={hideTooltip}
        onFocusCapture={() => showTooltip(true)}
        onBlurCapture={hideTooltip}
        onKeyDown={handleKeyDown}
      >
        {cloneElement(child, {
          'aria-describedby': isOpen ? tooltipId : child.props['aria-describedby'],
        })}
      </span>

      {shouldRenderTooltip &&
        createPortal(
          <div
            ref={setTooltipRefs}
            id={tooltipId}
            role="tooltip"
            data-placement={coords?.placement ?? placement}
            data-testid="tooltip-portal"
            style={{
              position: 'fixed',
              top: coords ? `${coords.top}px` : '-9999px',
              left: coords ? `${coords.left}px` : '-9999px',
              opacity: coords ? 1 : 0,
            }}
            className={`z-50 px-2.5 py-1 text-xs font-medium text-slate-100 bg-[#0e1924] border border-slate-700/60 rounded-md shadow-md pointer-events-none select-none transition-opacity duration-150 ${className}`.trim()}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
