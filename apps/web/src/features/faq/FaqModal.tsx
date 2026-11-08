import { useEffect, useRef } from 'react';

import { BookOpen, FileText, HelpCircle, Loader2, Search, X } from 'lucide-react';

import { Button, EmptyState, Tabs } from '@dsm/ui';
import { MarkdownViewer } from '@dsm/web/core';

import type { FaqTab } from './types';
import { useFaqStore } from './useFaqStore';
import { useStaticDoc } from './useStaticDoc';

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function FaqModalDialog() {
  const { activeTab, searchQuery, closeModal, setActiveTab, setSearchQuery } = useFaqStore();
  const { data: content = '', isLoading, isError, error, refetch } = useStaticDoc(activeTab);

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus preservation and restoration
  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    // Focus search input on mount
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = '';
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function'
      ) {
        previousActiveElementRef.current.focus();
      }
    };
  }, []);

  // Keyboard navigation: Escape key close and Tab focus trap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key === 'Tab') {
        if (!dialogRef.current) return;
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
        ).filter(el => el.offsetParent !== null);

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal]);

  const tabItems = [
    {
      id: 'faq',
      label: 'Operator Cheatsheet',
      icon: <BookOpen className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'history',
      label: 'Release History',
      icon: <FileText className="w-4 h-4 mr-1.5" />,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="faq-modal-title"
      data-testid="faq-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="faq-modal-title"
                className="text-lg font-semibold text-[var(--color-text-main)]"
              >
                Documentation & Knowledge Base
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Authoritative DayZ server operator guides and platform release changelogs
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            isIconOnly
            leftIcon={X}
            aria-label="Close documentation"
            onClick={closeModal}
          />
        </div>

        {/* Toolbar: Navigation Tabs & Search Filter */}
        <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <Tabs
            variant="segmented"
            value={activeTab}
            onChange={tabId => setActiveTab(tabId as FaqTab)}
            items={tabItems}
            ariaLabel="Documentation views"
          />

          {/* Real-time search filter */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              role="searchbox"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter topics & sections..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-hidden focus:border-[var(--color-primary)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body / Markdown Content View */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-[var(--color-text-muted)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              <span className="text-xs">Loading documentation...</span>
            </div>
          )}

          {isError && (
            <EmptyState
              variant="dashed"
              title="Documentation Unavailable"
              description={error?.message ?? 'Could not load static documentation content.'}
              action={
                <Button variant="secondary" onClick={() => refetch()}>
                  Retry
                </Button>
              }
              className="py-12"
            />
          )}

          {!isLoading && !isError && <MarkdownViewer content={content} searchQuery={searchQuery} />}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]/30 flex items-center justify-between text-[11px] text-[var(--color-text-muted)] shrink-0">
          <span>
            Shortcut:{' '}
            <kbd className="font-mono px-1 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
              Shift + ?
            </kbd>{' '}
            to toggle documentation anytime
          </span>
        </div>
      </div>
    </div>
  );
}

export function FaqModal() {
  const isOpen = useFaqStore(state => state.isOpen);
  if (!isOpen) {
    return null;
  }
  return <FaqModalDialog />;
}
