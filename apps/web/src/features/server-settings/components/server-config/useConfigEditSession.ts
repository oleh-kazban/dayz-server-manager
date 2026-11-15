import { useCallback, useEffect, useRef, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@aegis/api-client';
import type {
  SaveServerDzConfigResponseDto,
  ServerDetailDto,
  ServerDzConfigResponseDto,
  ServerDzProjectionDto,
} from '@aegis/api-contracts';
import { notifyApiError, notifySuccess, serverQueryKeys } from '@aegis/web/core';

import { serverConfigQueries, serverConfigQueryKeys } from './server-config.queries';
import type {
  ConfigEditSession,
  SaveConflictStep,
  ServerValidationResult,
} from './server-config.types';
import { CONFIG_LOCK_HEARTBEAT_MS, isApiErrorCode } from './server-config.utils';

export type ConfigPendingAction = 'save' | 'restore' | 'template' | 'validate' | 'reload' | null;

interface UseConfigEditSessionOptions {
  serverId: string;
  serverName: string;
}

interface WriteErrorOptions {
  content: string;
  fallbackTitle: string;
  offerOverwrite: boolean;
}

function toEditingSession(config: ServerDzConfigResponseDto | undefined): ConfigEditSession | null {
  if (!config?.exists || config.content === null || config.contentHash === null) {
    return null;
  }
  return {
    status: 'editing',
    baseHash: config.contentHash,
    baseContent: config.content,
    draft: config.content,
  };
}

function toLostSession(prev: ConfigEditSession): ConfigEditSession {
  return { status: 'lost', draft: prev.status === 'editing' ? prev.draft : null };
}

function hasProjectionMismatch(
  cachedServer: ServerDetailDto,
  projection: ServerDzProjectionDto,
): boolean {
  return (
    cachedServer.queryPort !== projection.steamQueryPort ||
    cachedServer.maxPlayers !== projection.maxPlayers
  );
}

export function useConfigEditSession({ serverId, serverName }: UseConfigEditSessionOptions) {
  const queryClient = useQueryClient();
  const [sessionToken, setSessionToken] = useState(() => crypto.randomUUID());
  const sessionTokenRef = useRef(sessionToken);
  const [session, setSession] = useState<ConfigEditSession>({ status: 'idle' });
  const [conflictStep, setConflictStep] = useState<SaveConflictStep>('none');
  const [pendingAction, setPendingAction] = useState<ConfigPendingAction>(null);
  const [serverValidation, setServerValidation] = useState<ServerValidationResult | null>(null);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const lastSyncedProjectionKeyRef = useRef<string | null>(null);

  const configQuery = useQuery(
    // eslint-disable-next-line react-hooks/refs -- queryFn reads sessionTokenRef lazily during async fetches, never during render
    serverConfigQueries.serverDz(serverId, () => sessionTokenRef.current),
  );
  const isEditing = session.status === 'editing';

  const invalidateServerProjections = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: serverQueryKeys.detail(serverId) });
    void queryClient.invalidateQueries({ queryKey: serverQueryKeys.list() });
  }, [queryClient, serverId]);

  useEffect(() => {
    const data = configQuery.data;
    if (!data?.exists || !data.contentHash || !data.projection) {
      lastSyncedProjectionKeyRef.current = null;
      return;
    }

    const syncKey = `${serverId}:${data.contentHash}`;
    const cachedServer = queryClient.getQueryData<ServerDetailDto>(
      serverQueryKeys.detail(serverId),
    );
    const differsFromCache =
      cachedServer !== undefined && hasProjectionMismatch(cachedServer, data.projection);

    if (lastSyncedProjectionKeyRef.current === syncKey && !differsFromCache) {
      return;
    }

    lastSyncedProjectionKeyRef.current = syncKey;
    invalidateServerProjections();
  }, [configQuery.data, invalidateServerProjections, queryClient, serverId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditing) {
      return undefined;
    }
    const tokenForEffect = sessionToken;
    let held = true;
    const release = () => {
      if (!held) {
        return;
      }
      held = false;
      // A failed release only delays the next editor until the server-side lease expires.
      apiClient.serverConfig
        .releaseConfigLock(serverId, { sessionToken: tokenForEffect })
        .catch(() => undefined);
    };
    const intervalId = window.setInterval(() => {
      apiClient.serverConfig
        .heartbeatConfigLock(serverId, { sessionToken: tokenForEffect })
        .catch(error => {
          if (isApiErrorCode(error, 'CONFIG_LOCK_NOT_HELD')) {
            held = false;
            setSession(toLostSession);
            void queryClient.invalidateQueries({
              queryKey: serverConfigQueryKeys.server(serverId),
            });
          }
        });
    }, CONFIG_LOCK_HEARTBEAT_MS);
    window.addEventListener('pagehide', release);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', release);
      release();
    };
  }, [isEditing, queryClient, serverId, sessionToken]);

  const releaseDetachedLock = (token = sessionTokenRef.current) => {
    apiClient.serverConfig
      .releaseConfigLock(serverId, { sessionToken: token })
      .catch(() => undefined);
  };

  const refreshConfig = async (): Promise<ServerDzConfigResponseDto | undefined> => {
    void queryClient.invalidateQueries({ queryKey: serverConfigQueryKeys.revisions(serverId) });
    const result = await configQuery.refetch();
    return result.data;
  };

  const runExclusive = async (action: ConfigPendingAction, task: () => Promise<void>) => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setPendingAction(action);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setPendingAction(null);
    }
  };

  const adoptFreshContent = async (fallback?: SaveServerDzConfigResponseDto, content?: string) => {
    const fresh = await refreshConfig();
    const next = toEditingSession(fresh);
    if (next) {
      setSession(next);
      return;
    }
    if (fallback && content !== undefined) {
      setSession({
        status: 'editing',
        baseHash: fallback.contentHash,
        baseContent: content,
        draft: content,
      });
    }
  };

  const validate = (content: string) =>
    runExclusive('validate', async () => {
      try {
        const result = await apiClient.serverConfig.validateServerDzConfig(serverId, { content });
        setServerValidation({ content, diagnostics: result.diagnostics });
      } catch (error) {
        notifyApiError(error, 'Validation Failed');
      }
    });

  const handleWriteError = async (error: unknown, options: WriteErrorOptions) => {
    if (isApiErrorCode(error, 'CONFIG_LOCK_NOT_HELD')) {
      setSession(toLostSession);
      notifyApiError(error, options.fallbackTitle);
      void refreshConfig();
      return;
    }
    notifyApiError(error, options.fallbackTitle);
    if (options.offerOverwrite && isApiErrorCode(error, 'CONFIG_HASH_MISMATCH')) {
      setConflictStep('prompt');
      return;
    }
    if (isApiErrorCode(error, 'CONFIG_VALIDATION_FAILED')) {
      try {
        const result = await apiClient.serverConfig.validateServerDzConfig(serverId, {
          content: options.content,
        });
        setServerValidation({ content: options.content, diagnostics: result.diagnostics });
      } catch {
        setServerValidation(null);
      }
    }
  };

  const acquireAndEdit = (
    takeover: boolean,
    action: ConfigPendingAction,
    afterAcquire?: (token: string) => Promise<void>,
  ) =>
    runExclusive(action, async () => {
      if (session.status === 'editing') {
        return;
      }
      const nextToken = crypto.randomUUID();
      sessionTokenRef.current = nextToken;
      setSessionToken(nextToken);
      setSession({ status: 'acquiring' });
      try {
        await apiClient.serverConfig.acquireConfigLock(serverId, {
          sessionToken: nextToken,
          takeover,
        });
        if (afterAcquire) {
          await afterAcquire(nextToken);
        }
      } catch (error) {
        releaseDetachedLock(nextToken);
        setSession({ status: 'idle' });
        notifyApiError(error, 'Unable to Start Editing');
        void refreshConfig();
        return;
      }
      const fresh = await refreshConfig();
      const next = toEditingSession(fresh);
      if (!mountedRef.current || !next) {
        releaseDetachedLock(nextToken);
        setSession({ status: 'idle' });
        return;
      }
      setConflictStep('none');
      setSession(next);
    });

  const beginEditing = () => acquireAndEdit(false, null);

  const takeOver = () => acquireAndEdit(true, null);

  const createFromTemplate = () =>
    acquireAndEdit(false, 'template', async token => {
      await apiClient.serverConfig.bootstrapServerDzConfig(serverId, { sessionToken: token });
      notifySuccess('SERVER_CONFIG_CREATED', { name: serverName });
      invalidateServerProjections();
    });

  const finishEditing = () => {
    setSession({ status: 'idle' });
    setConflictStep('none');
    void refreshConfig();
  };

  const dismissLockLost = () => {
    setSession({ status: 'idle' });
  };

  const setDraft = (draft: string) => {
    setSession(prev => (prev.status === 'editing' ? { ...prev, draft } : prev));
  };

  const saveWithHash = async (content: string, baseHash: string) => {
    try {
      const result = await apiClient.serverConfig.saveServerDzConfig(serverId, {
        sessionToken: sessionTokenRef.current,
        baseHash,
        content,
      });
      notifySuccess('SERVER_CONFIG_SAVED', { name: serverName });
      setConflictStep('none');
      invalidateServerProjections();
      await adoptFreshContent(result, content);
    } catch (error) {
      await handleWriteError(error, {
        content,
        fallbackTitle: 'Save Failed',
        offerOverwrite: true,
      });
    }
  };

  const save = () => {
    if (session.status !== 'editing') {
      return Promise.resolve();
    }
    const { draft, baseHash } = session;
    return runExclusive('save', () => saveWithHash(draft, baseHash));
  };

  const overwrite = () => {
    if (session.status !== 'editing') {
      return Promise.resolve();
    }
    const { draft } = session;
    return runExclusive('save', async () => {
      setConflictStep('none');
      const fresh = await refreshConfig();
      if (!fresh?.contentHash) {
        notifyApiError(undefined, 'Save Failed', 'serverDZ.cfg could not be reloaded from disk.');
        return;
      }
      await saveWithHash(draft, fresh.contentHash);
    });
  };

  const reload = () =>
    runExclusive('reload', async () => {
      setConflictStep('none');
      await adoptFreshContent();
    });

  const restore = (revisionId: string) => {
    if (session.status !== 'editing') {
      return Promise.resolve();
    }
    const { baseHash, draft } = session;
    return runExclusive('restore', async () => {
      try {
        await apiClient.serverConfig.restoreConfigRevision(serverId, revisionId, {
          sessionToken: sessionTokenRef.current,
          baseHash,
        });
        notifySuccess('SERVER_CONFIG_RESTORED', { name: serverName });
        invalidateServerProjections();
        await adoptFreshContent();
      } catch (error) {
        await handleWriteError(error, {
          content: draft,
          fallbackTitle: 'Restore Failed',
          offerOverwrite: false,
        });
      }
    });
  };

  return {
    configQuery,
    session,
    conflictStep,
    setConflictStep,
    pendingAction,
    serverValidation,
    beginEditing,
    takeOver,
    createFromTemplate,
    finishEditing,
    dismissLockLost,
    setDraft,
    validate,
    save,
    overwrite,
    reload,
    restore,
  };
}
