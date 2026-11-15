import { type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { useBlocker } from '@tanstack/react-router';

import { Confirmation } from '@aegis/ui';

import {
  type DirtySource,
  isFormDiscardingNavigation,
  UnsavedChangesContext,
} from './unsaved-changes';

/**
 * Router-independent part of the unsaved-changes guard (DSM-00138): the dirty-source registry
 * and the single shared "Discard unsaved changes?" dialog. Used on its own where no router is
 * mounted (component tests); the app uses `UnsavedChangesProvider`.
 */
export function UnsavedChangesScope({ children }: { children: ReactNode }) {
  const sourcesRef = useRef(new Set<DirtySource>());
  const pendingRef = useRef<Promise<boolean> | null>(null);
  const [resolvePrompt, setResolvePrompt] = useState<((discard: boolean) => void) | null>(null);

  const hasUnsavedChanges = useCallback(
    () => Array.from(sourcesRef.current).some(isDirty => isDirty()),
    [],
  );

  const register = useCallback((source: DirtySource) => {
    sourcesRef.current.add(source);
    return () => {
      sourcesRef.current.delete(source);
    };
  }, []);

  const askDiscard = useCallback(() => {
    if (pendingRef.current) {
      return pendingRef.current;
    }
    const pending = new Promise<boolean>(resolve => {
      setResolvePrompt(() => (discard: boolean) => {
        pendingRef.current = null;
        setResolvePrompt(null);
        resolve(discard);
      });
    });
    pendingRef.current = pending;
    return pending;
  }, []);

  const value = useMemo(
    () => ({ register, hasUnsavedChanges, askDiscard }),
    [register, hasUnsavedChanges, askDiscard],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      {resolvePrompt && (
        <Confirmation
          variant="warning"
          title="Discard unsaved changes?"
          description="You have changes that have not been saved. They will be lost if you continue."
          cancelLabel="Keep editing"
          confirmLabel="Discard changes"
          onCancel={() => resolvePrompt(false)}
          onConfirm={() => resolvePrompt(true)}
        />
      )}
    </UnsavedChangesContext.Provider>
  );
}

/** Blocks in-app navigation and reload / tab close while any registered source is dirty. */
function UnsavedChangesRouteBlocker() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('UnsavedChangesRouteBlocker must render inside UnsavedChangesScope');
  }
  const { hasUnsavedChanges, askDiscard } = context;

  useBlocker({
    shouldBlockFn: async ({ current, next }) => {
      if (!hasUnsavedChanges() || !isFormDiscardingNavigation(current, next)) {
        return false;
      }
      return !(await askDiscard());
    },
    enableBeforeUnload: hasUnsavedChanges,
  });

  return null;
}

/**
 * Hosts the unsaved-changes guard for the authenticated shell: one router blocker for in-app
 * navigation, the native `beforeunload` prompt for reload / tab close, and one shared
 * confirmation dialog. Must render inside the router.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  return (
    <UnsavedChangesScope>
      {children}
      <UnsavedChangesRouteBlocker />
    </UnsavedChangesScope>
  );
}
