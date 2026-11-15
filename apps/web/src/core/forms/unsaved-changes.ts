import { createContext, type RefObject, useCallback, useContext, useEffect, useRef } from 'react';

/**
 * Unsaved-changes guard (DSM-00138).
 *
 * One `UnsavedChangesProvider` per authenticated shell owns a single router blocker, the
 * `beforeunload` prompt and a single "Discard unsaved changes?" dialog. Forms register a dirty
 * source via `useUnsavedChangesGuard` (done automatically by `useEditableForm`); modals and
 * other discarding actions ask first through `confirmDiscard` / `useConfirmDiscardAll`.
 */

export type DirtySource = () => boolean;

export interface UnsavedChangesContextValue {
  register: (source: DirtySource) => () => void;
  hasUnsavedChanges: () => boolean;
  /** Resolves `true` when the admin chose to discard. Concurrent requests share one dialog. */
  askDiscard: () => Promise<boolean>;
}

export const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export interface GuardedLocation {
  pathname: string;
  search: unknown;
}

function serverIdOf(location: GuardedLocation): string | undefined {
  const search = location.search as { serverId?: unknown } | undefined;
  return typeof search?.serverId === 'string' ? search.serverId : undefined;
}

/**
 * A navigation discards the mounted forms when it changes the page or the active server.
 * Other search-param updates (filters, sort) keep the same forms mounted.
 */
export function isFormDiscardingNavigation(
  current: GuardedLocation,
  next: GuardedLocation,
): boolean {
  return current.pathname !== next.pathname || serverIdOf(current) !== serverIdOf(next);
}

export type DiscardGuard = (action: () => void) => void;

const runDirectly: DiscardGuard = action => action();

function askThenRun(context: UnsavedChangesContextValue, action: () => void): void {
  void context.askDiscard().then(discard => {
    if (discard) {
      action();
    }
  });
}

export interface UnsavedChangesGuard {
  /** Runs `action` immediately when this source is clean, otherwise after the admin confirms. */
  confirmDiscard: DiscardGuard;
  /**
   * Stops this source from blocking until it unmounts. Call right before a programmatic
   * navigation that follows a successful submit (e.g. switching to a newly created server).
   */
  release: () => void;
}

/**
 * Registers a dirty source with the nearest `UnsavedChangesProvider`. Without a provider
 * (isolated component tests) the guard is inert and `confirmDiscard` runs the action directly.
 */
export function useUnsavedChangesGuard(isDirty: boolean): UnsavedChangesGuard {
  const context = useContext(UnsavedChangesContext);
  const isDirtyRef = useRef(isDirty);
  const releasedRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  });

  useEffect(() => {
    if (!context) {
      return undefined;
    }
    return context.register(() => isDirtyRef.current && !releasedRef.current);
  }, [context]);

  const confirmDiscard = useCallback<DiscardGuard>(
    action => {
      if (!context || !isDirtyRef.current || releasedRef.current) {
        action();
        return;
      }
      askThenRun(context, action);
    },
    [context],
  );

  const release = useCallback(() => {
    releasedRef.current = true;
  }, []);

  return { confirmDiscard, release };
}

/**
 * App-wide variant for actions that discard every mounted form (e.g. sign out):
 * runs `action` directly when nothing is dirty, otherwise after the admin confirms.
 */
export function useConfirmDiscardAll(): DiscardGuard {
  const context = useContext(UnsavedChangesContext);
  return useCallback<DiscardGuard>(
    action => {
      if (!context || !context.hasUnsavedChanges()) {
        action();
        return;
      }
      askThenRun(context, action);
    },
    [context],
  );
}

/**
 * For modal shells whose close controls (X, Esc, backdrop) sit outside the form component:
 * the child form publishes its `confirmDiscard` into `slotRef` via `usePublishDiscardGuard`,
 * and the shell closes through `runGuarded(onClose)`.
 */
export function useDiscardGuardSlot() {
  const slotRef = useRef<DiscardGuard | null>(null);
  const runGuarded = useCallback<DiscardGuard>(
    action => (slotRef.current ?? runDirectly)(action),
    [],
  );
  return { slotRef, runGuarded };
}

export function usePublishDiscardGuard(
  slotRef: RefObject<DiscardGuard | null> | undefined,
  guard: DiscardGuard,
): void {
  useEffect(() => {
    if (!slotRef) {
      return undefined;
    }
    slotRef.current = guard;
    return () => {
      slotRef.current = null;
    };
  }, [slotRef, guard]);
}
