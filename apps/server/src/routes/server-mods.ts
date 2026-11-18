import { and, asc, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

import {
  addServerModSchema,
  batchAddServerModsSchema,
  type ExportServerModsQueryDto,
  exportServerModsQuerySchema,
  importServerModsSchema,
  isServerActiveStatus,
  type LaunchParamsPreviewDto,
  MOD_IMPORT_MODE,
  MOD_LOAD_TARGET,
  MOD_SOURCE_TYPE,
  modIdParamSchema,
  type ModLoadTarget,
  type ModPresetDto,
  type ModPresetItemDto,
  type ModSyncStatus,
  reorderServerModsSchema,
  serverIdParamSchema,
  type ServerModDto,
  serverModSchema,
  type ServerModsListResponseDto,
  serverModsListResponseSchema,
  updateServerModSchema,
} from '@aegis/api-contracts';
import { type Server, type ServerMod, serverMods, servers } from '@aegis/database';
import { collectModLaunchFolders, formatModFlags } from '@aegis/dayz-config';

import {
  type PublishedFileMetadata,
  SteamWorkshopError,
  steamWorkshopService,
  suggestModFolderName,
} from '../services/steam/steam-workshop.service';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

export function computeModSyncStatus(
  mod: Pick<ServerMod, 'sourceType' | 'remoteUpdatedAt' | 'syncedWorkshopUpdatedAt'>,
): ModSyncStatus {
  if (mod.sourceType === MOD_SOURCE_TYPE.LOCAL) {
    return 'local';
  }
  if (!mod.syncedWorkshopUpdatedAt) {
    return 'not_synced';
  }
  if (
    mod.remoteUpdatedAt &&
    mod.remoteUpdatedAt.getTime() > mod.syncedWorkshopUpdatedAt.getTime()
  ) {
    return 'update_available';
  }
  return 'up_to_date';
}

export function compileModLaunchParams(
  mods: readonly Pick<ServerMod, 'enabled' | 'loadTarget' | 'folderName' | 'loadOrder'>[],
): LaunchParamsPreviewDto {
  const context = collectModLaunchFolders(mods);
  const { modFlag, serverModFlag } = formatModFlags(context);

  return {
    modFlag,
    serverModFlag,
    combinedArgs: [modFlag, serverModFlag].filter(Boolean),
    missingFolderCount: context.missingFolderCount,
  };
}

function mapServerModDto(row: ServerMod): ServerModDto {
  return serverModSchema.parse({
    id: row.id,
    serverId: row.serverId,
    sourceType: row.sourceType,
    loadTarget: row.loadTarget,
    workshopId: row.workshopId,
    workshopUrl: row.workshopId
      ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${row.workshopId}`
      : null,
    folderName: row.folderName,
    name: row.name,
    sizeBytes: row.sizeBytes,
    remoteUpdatedAt: row.remoteUpdatedAt ? row.remoteUpdatedAt.toISOString() : null,
    syncedWorkshopUpdatedAt: row.syncedWorkshopUpdatedAt
      ? row.syncedWorkshopUpdatedAt.toISOString()
      : null,
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    syncStatus: computeModSyncStatus(row),
    enabled: row.enabled,
    loadOrder: row.loadOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function buildModsListPayload(rows: ServerMod[]): ServerModsListResponseDto {
  const mods = rows.map(mapServerModDto);
  const updateAvailableCount = mods.filter(m => m.syncStatus === 'update_available').length;
  return serverModsListResponseSchema.parse({
    mods,
    launchPreview: compileModLaunchParams(rows),
    updateAvailableCount,
  });
}

export function listServerModRows(fastify: FastifyInstance, serverId: string): ServerMod[] {
  return fastify.db
    .select()
    .from(serverMods)
    .where(eq(serverMods.serverId, serverId))
    .orderBy(asc(serverMods.loadOrder))
    .all();
}

function ensureAdminRole(
  request: FastifyRequest,
  reply: FastifyReply,
  actionMessage: string,
): boolean {
  if (request.user?.role !== 'admin') {
    sendApiError(reply, 403, 'AUTH_FORBIDDEN_ADMIN_REQUIRED', actionMessage);
    return false;
  }
  return true;
}

function resolveServerOrSendError(
  fastify: FastifyInstance,
  params: unknown,
  reply: FastifyReply,
): Server | null {
  const parsed = serverIdParamSchema.safeParse(params);
  if (!parsed.success) {
    sendApiError(reply, 400, 'VALIDATION_FAILED', {
      message: parsed.error.issues[0].message,
      fieldErrors: formatZodFieldErrors(parsed.error),
    });
    return null;
  }

  const server = fastify.db.select().from(servers).where(eq(servers.id, parsed.data.id)).get();
  if (!server) {
    sendApiError(reply, 404, 'SERVER_NOT_FOUND', {
      message: `Server with ID '${parsed.data.id}' not found`,
      params: { id: parsed.data.id },
    });
    return null;
  }

  return server;
}

function resolveServerAndModOrSendError(
  fastify: FastifyInstance,
  params: unknown,
  reply: FastifyReply,
): { server: Server; mod: ServerMod } | null {
  const parsed = modIdParamSchema.safeParse(params);
  if (!parsed.success) {
    sendApiError(reply, 400, 'VALIDATION_FAILED', {
      message: parsed.error.issues[0].message,
      fieldErrors: formatZodFieldErrors(parsed.error),
    });
    return null;
  }

  const server = fastify.db.select().from(servers).where(eq(servers.id, parsed.data.id)).get();
  if (!server) {
    sendApiError(reply, 404, 'SERVER_NOT_FOUND', {
      message: `Server with ID '${parsed.data.id}' not found`,
      params: { id: parsed.data.id },
    });
    return null;
  }

  const mod = fastify.db
    .select()
    .from(serverMods)
    .where(and(eq(serverMods.id, parsed.data.modId), eq(serverMods.serverId, parsed.data.id)))
    .get();

  if (!mod) {
    sendApiError(reply, 404, 'MOD_NOT_FOUND', {
      message: `Mod with ID '${parsed.data.modId}' not found on server '${server.name}'`,
      params: { modId: parsed.data.modId, serverId: server.id },
    });
    return null;
  }

  return { server, mod };
}

function guardServerConfigUnlocked(server: Server, reply: FastifyReply): boolean {
  if (isServerActiveStatus(server.status)) {
    sendApiError(reply, 409, 'SERVER_RUNNING_CONFIG_LOCKED', {
      message: 'Cannot modify server mods while the server process is active.',
      params: { id: server.id, name: server.name, status: server.status },
    });
    return false;
  }
  return true;
}

function resolveUniqueBatchFolder(
  requestedFolder: string,
  workshopId: string,
  existingFoldersLower: Set<string>,
): string {
  const trimmed = requestedFolder.trim();
  if (!trimmed) {
    return '';
  }
  if (!existingFoldersLower.has(trimmed.toLowerCase())) {
    existingFoldersLower.add(trimmed.toLowerCase());
    return trimmed;
  }
  const disambiguated = `${trimmed.slice(0, 100)}_${workshopId}`;
  existingFoldersLower.add(disambiguated.toLowerCase());
  return disambiguated;
}

interface NewWorkshopModInput {
  workshopId: string;
  name: string;
  requestedFolder: string;
  loadTarget: ModLoadTarget;
  sizeBytes: number | null;
  remoteUpdatedAt: Date | null;
  enabled: boolean;
  markInstalled: boolean;
}

interface ModWriteContext {
  fastify: FastifyInstance;
  serverId: string;
  /** The server's mods before the write, ordered by load order. */
  existingMods: ServerMod[];
  now: Date;
}

function buildNewWorkshopModRow(
  input: NewWorkshopModInput,
  placement: { serverId: string; folderName: string; loadOrder: number; now: Date },
): ServerMod {
  const { serverId, folderName, loadOrder, now } = placement;
  return {
    id: crypto.randomUUID(),
    serverId,
    sourceType: MOD_SOURCE_TYPE.WORKSHOP,
    loadTarget: input.loadTarget,
    workshopId: input.workshopId,
    folderName,
    name: input.name,
    sizeBytes: input.sizeBytes,
    remoteUpdatedAt: input.remoteUpdatedAt,
    syncedWorkshopUpdatedAt: input.markInstalled ? (input.remoteUpdatedAt ?? now) : null,
    lastSyncedAt: input.markInstalled ? now : null,
    enabled: input.enabled,
    loadOrder,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Appends Workshop mods after the last mod in the load order, skipping Workshop IDs that are
 * already on the server (or repeated in `inputs`). Shared by `/mods/batch` and preset merge.
 * Must run inside a transaction.
 */
function appendWorkshopMods(
  ctx: ModWriteContext,
  inputs: NewWorkshopModInput[],
): { addedRows: ServerMod[]; skippedCount: number } {
  const { fastify, serverId, existingMods, now } = ctx;
  const existingWorkshopIds = new Set(
    existingMods.map(m => m.workshopId).filter((id): id is string => Boolean(id)),
  );
  const existingFoldersLower = new Set(
    existingMods.map(m => m.folderName.trim().toLowerCase()).filter(Boolean),
  );

  let nextOrder = existingMods.length > 0 ? Math.max(...existingMods.map(m => m.loadOrder)) + 1 : 0;
  let skippedCount = 0;
  const addedRows: ServerMod[] = [];

  for (const input of inputs) {
    if (existingWorkshopIds.has(input.workshopId)) {
      skippedCount += 1;
      continue;
    }
    existingWorkshopIds.add(input.workshopId);

    const folderName = resolveUniqueBatchFolder(
      input.requestedFolder,
      input.workshopId,
      existingFoldersLower,
    );
    const row = buildNewWorkshopModRow(input, {
      serverId,
      folderName,
      loadOrder: nextOrder,
      now,
    });
    fastify.db.insert(serverMods).values(row).run();
    addedRows.push(row);
    nextOrder += 1;
  }

  return { addedRows, skippedCount };
}

interface PresetImportItem {
  workshopId: string;
  presetName: string;
  loadTarget: ModLoadTarget;
}

interface HydratedImportItem {
  workshopId: string;
  name: string;
  suggestedFolder: string;
  loadTarget: ModLoadTarget;
  /** Steam metadata, or `undefined` when Steam was unreachable or the item is unlisted. */
  metadata: PublishedFileMetadata | undefined;
}

function deduplicatePresetItems(preset: ModPresetDto): {
  presetItems: PresetImportItem[];
  duplicateCount: number;
} {
  const seenPresetWorkshopIds = new Set<string>();
  const presetItems: PresetImportItem[] = [];
  let duplicateCount = 0;

  const combinedPresetList: { item: ModPresetItemDto; loadTarget: ModLoadTarget }[] = [
    ...preset.steamWsMods.map(item => ({ item, loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER })),
    ...preset.steamWsServerMods.map(item => ({ item, loadTarget: MOD_LOAD_TARGET.SERVER_ONLY })),
  ];

  for (const { item, loadTarget } of combinedPresetList) {
    if (seenPresetWorkshopIds.has(item.workshopId)) {
      duplicateCount += 1;
      continue;
    }
    seenPresetWorkshopIds.add(item.workshopId);
    presetItems.push({ workshopId: item.workshopId, presetName: item.name, loadTarget });
  }

  return { presetItems, duplicateCount };
}

async function hydratePresetItems(presetItems: PresetImportItem[]): Promise<HydratedImportItem[]> {
  let metadataMap = new Map<string, PublishedFileMetadata>();
  if (presetItems.length > 0) {
    try {
      metadataMap = await steamWorkshopService.fetchPublishedFileMetadataMap(
        presetItems.map(p => p.workshopId),
      );
    } catch {
      // Steam outage or timeout: fall back to the names and folders derived from the preset.
    }
  }

  return presetItems.map(item => {
    const metadata = metadataMap.get(item.workshopId);
    const name = metadata?.title || item.presetName;
    return {
      workshopId: item.workshopId,
      name,
      suggestedFolder: suggestModFolderName(name, item.workshopId),
      loadTarget: item.loadTarget,
      metadata,
    };
  });
}

function toNewWorkshopModInput(item: HydratedImportItem): NewWorkshopModInput {
  return {
    workshopId: item.workshopId,
    name: item.name,
    requestedFolder: item.suggestedFolder,
    loadTarget: item.loadTarget,
    sizeBytes: item.metadata?.sizeBytes ?? null,
    remoteUpdatedAt: item.metadata?.remoteUpdatedAt ?? null,
    enabled: true,
    markInstalled: false,
  };
}

interface ImportExecutionContext extends ModWriteContext {
  hydratedItems: HydratedImportItem[];
}

type ReplaceSlot = { kind: 'local'; row: ServerMod } | { kind: 'preset'; item: HydratedImportItem };

/**
 * Local mods keep their slots in the load order; the Workshop slots are refilled with the preset
 * in preset order, and any extra preset mods go after the last slot.
 */
function planReplaceLoadOrder(
  existingMods: ServerMod[],
  hydratedItems: HydratedImportItem[],
): ReplaceSlot[] {
  const pending = [...hydratedItems];
  const slots: ReplaceSlot[] = [];

  for (const row of existingMods) {
    if (row.sourceType === MOD_SOURCE_TYPE.LOCAL) {
      slots.push({ kind: 'local', row });
      continue;
    }
    const next = pending.shift();
    if (next) {
      slots.push({ kind: 'preset', item: next });
    }
  }
  for (const item of pending) {
    slots.push({ kind: 'preset', item });
  }

  return slots;
}

/**
 * Makes the server's Workshop mods match the preset. Mods already on the server are updated in
 * place, so their folder name, enabled flag and sync state survive; only mods missing from the
 * preset are deleted and only mods new to the server are inserted.
 */
function executeReplaceImport(ctx: ImportExecutionContext): {
  addedRows: ServerMod[];
  removedCount: number;
} {
  const { fastify, serverId, hydratedItems, existingMods, now } = ctx;
  const presetIds = new Set(hydratedItems.map(item => item.workshopId));

  const existingByWorkshopId = new Map<string, ServerMod>();
  const removedRows: ServerMod[] = [];
  for (const row of existingMods) {
    if (row.sourceType !== MOD_SOURCE_TYPE.WORKSHOP) continue;
    if (row.workshopId && presetIds.has(row.workshopId)) {
      existingByWorkshopId.set(row.workshopId, row);
    } else {
      removedRows.push(row);
    }
  }

  for (const row of removedRows) {
    fastify.db.delete(serverMods).where(eq(serverMods.id, row.id)).run();
  }

  const removedIds = new Set(removedRows.map(row => row.id));
  const existingFoldersLower = new Set(
    existingMods
      .filter(row => !removedIds.has(row.id))
      .map(row => row.folderName.trim().toLowerCase())
      .filter(Boolean),
  );

  const addedRows: ServerMod[] = [];
  planReplaceLoadOrder(existingMods, hydratedItems).forEach((slot, loadOrder) => {
    if (slot.kind === 'local') {
      if (slot.row.loadOrder !== loadOrder) {
        fastify.db
          .update(serverMods)
          .set({ loadOrder, updatedAt: now })
          .where(eq(serverMods.id, slot.row.id))
          .run();
      }
      return;
    }

    const { item } = slot;
    const kept = existingByWorkshopId.get(item.workshopId);
    if (!kept) {
      const input = toNewWorkshopModInput(item);
      const folderName = resolveUniqueBatchFolder(
        input.requestedFolder,
        input.workshopId,
        existingFoldersLower,
      );
      const row = buildNewWorkshopModRow(input, { serverId, folderName, loadOrder, now });
      fastify.db.insert(serverMods).values(row).run();
      addedRows.push(row);
      return;
    }

    const patch: Partial<ServerMod> = {};
    if (kept.loadOrder !== loadOrder) patch.loadOrder = loadOrder;
    if (kept.loadTarget !== item.loadTarget) patch.loadTarget = item.loadTarget;
    if (item.metadata) {
      patch.sizeBytes = item.metadata.sizeBytes;
      patch.remoteUpdatedAt = item.metadata.remoteUpdatedAt;
    }
    if (Object.keys(patch).length > 0) {
      fastify.db
        .update(serverMods)
        .set({ ...patch, updatedAt: now })
        .where(eq(serverMods.id, kept.id))
        .run();
    }
  });

  return { addedRows, removedCount: removedRows.length };
}

export const registerServerModsRoutes: FastifyPluginAsync = async fastify => {
  fastify.get<{ Params: { id: string } }>(
    '/:id/mods',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const server = resolveServerOrSendError(fastify, request.params, reply);
      if (!server) return;

      const rows = listServerModRows(fastify, server.id);
      return reply.send(buildModsListPayload(rows));
    },
  );

  fastify.get<{ Params: { id: string }; Querystring: ExportServerModsQueryDto }>(
    '/:id/mods/export-preset',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const server = resolveServerOrSendError(fastify, request.params, reply);
      if (!server) return;

      const parseResult = exportServerModsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { includeDisabled } = parseResult.data;
      const allMods = listServerModRows(fastify, server.id);

      // Local mods (sourceType === 'local') are strictly omitted
      const workshopMods = allMods.filter(
        m => m.sourceType === MOD_SOURCE_TYPE.WORKSHOP && Boolean(m.workshopId),
      );

      // Filter disabled mods unless includeDisabled is true
      const eligibleMods = includeDisabled ? workshopMods : workshopMods.filter(m => m.enabled);

      const steamWsMods: ModPresetItemDto[] = [];
      const steamWsServerMods: ModPresetItemDto[] = [];

      for (const mod of eligibleMods) {
        const item: ModPresetItemDto = {
          workshopId: mod.workshopId!,
          name: mod.name,
        };
        if (mod.loadTarget === MOD_LOAD_TARGET.SERVER_ONLY) {
          steamWsServerMods.push(item);
        } else {
          steamWsMods.push(item);
        }
      }

      const preset: ModPresetDto = {
        steamWsMods,
        steamWsServerMods,
      };

      return reply.send(preset);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/mods',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to add server mods')) return;

      const server = resolveServerOrSendError(fastify, request.params, reply);
      if (!server || !guardServerConfigUnlocked(server, reply)) return;

      const parseResult = addServerModSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const data = parseResult.data;
      const existingMods = listServerModRows(fastify, server.id);

      if (
        data.sourceType === MOD_SOURCE_TYPE.WORKSHOP &&
        existingMods.some(m => m.workshopId === data.workshopId)
      ) {
        return sendApiError(reply, 409, 'MOD_ALREADY_INSTALLED', {
          message: `Workshop mod ${data.workshopId} is already installed on this server.`,
          params: { identifier: data.workshopId },
          fieldErrors: {
            workshopId: {
              code: 'MOD_ALREADY_INSTALLED',
              message: `Workshop mod ${data.workshopId} is already installed on this server.`,
            },
          },
        });
      }

      const folderName = (data.folderName ?? '').trim();
      if (
        folderName !== '' &&
        existingMods.some(m => m.folderName.toLowerCase() === folderName.toLowerCase())
      ) {
        return sendApiError(reply, 409, 'MOD_ALREADY_INSTALLED', {
          message: `A mod with folder name "${folderName}" already exists on this server.`,
          params: { identifier: folderName },
          fieldErrors: {
            folderName: {
              code: 'MOD_ALREADY_INSTALLED',
              message: `Folder name "${folderName}" is already in use on this server.`,
            },
          },
        });
      }

      const now = new Date();
      const nextOrder =
        existingMods.length > 0 ? Math.max(...existingMods.map(m => m.loadOrder)) + 1 : 0;

      const remoteUpdatedAt =
        data.sourceType === MOD_SOURCE_TYPE.WORKSHOP && data.remoteUpdatedAt
          ? new Date(data.remoteUpdatedAt)
          : null;
      const markInstalled = data.sourceType === MOD_SOURCE_TYPE.WORKSHOP && data.markAsInstalled;

      const modId = crypto.randomUUID();
      fastify.db
        .insert(serverMods)
        .values({
          id: modId,
          serverId: server.id,
          sourceType: data.sourceType,
          loadTarget: data.loadTarget,
          workshopId: data.sourceType === MOD_SOURCE_TYPE.WORKSHOP ? data.workshopId : null,
          folderName,
          name: data.name,
          sizeBytes: data.sourceType === MOD_SOURCE_TYPE.WORKSHOP ? (data.sizeBytes ?? null) : null,
          remoteUpdatedAt,
          syncedWorkshopUpdatedAt: markInstalled ? (remoteUpdatedAt ?? now) : null,
          lastSyncedAt: markInstalled ? now : null,
          enabled: data.enabled,
          loadOrder: nextOrder,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const created = fastify.db.select().from(serverMods).where(eq(serverMods.id, modId)).get()!;
      return reply.status(201).send(mapServerModDto(created));
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/mods/batch',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to batch add server mods')) return;

      const server = resolveServerOrSendError(fastify, request.params, reply);
      if (!server || !guardServerConfigUnlocked(server, reply)) return;

      const parseResult = batchAddServerModsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const data = parseResult.data;
      const runBatch = fastify.sqlite.transaction(() => {
        const existingMods = listServerModRows(fastify, server.id);
        const inputs: NewWorkshopModInput[] = data.mods.map(item => ({
          workshopId: item.workshopId,
          name: item.name,
          requestedFolder: item.folderName ?? '',
          loadTarget: item.loadTarget,
          sizeBytes: item.sizeBytes ?? null,
          remoteUpdatedAt: item.remoteUpdatedAt ? new Date(item.remoteUpdatedAt) : null,
          enabled: item.enabled,
          markInstalled: item.markAsInstalled ?? data.markAsInstalled ?? false,
        }));
        const { addedRows, skippedCount } = appendWorkshopMods(
          { fastify, serverId: server.id, existingMods, now: new Date() },
          inputs,
        );

        const allRows = listServerModRows(fastify, server.id);
        return {
          added: addedRows.map(mapServerModDto),
          skippedCount,
          ...buildModsListPayload(allRows),
        };
      });

      const result = runBatch();
      return reply.status(201).send(result);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/mods/import',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to import server mods')) return;

      const server = resolveServerOrSendError(fastify, request.params, reply);
      if (!server || !guardServerConfigUnlocked(server, reply)) return;

      const parseResult = importServerModsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { preset, mode } = parseResult.data;
      const { presetItems, duplicateCount } = deduplicatePresetItems(preset);
      const hydratedItems = await hydratePresetItems(presetItems);

      const runImport = fastify.sqlite.transaction(() => {
        // The Steam lookup above can take seconds; the server may have started (or been deleted)
        // meanwhile, so the config lock is checked again inside the transaction.
        const currentServer = fastify.db
          .select()
          .from(servers)
          .where(eq(servers.id, server.id))
          .get();
        if (!currentServer || isServerActiveStatus(currentServer.status)) {
          return { blockedBy: currentServer ?? null } as const;
        }

        const existingMods = listServerModRows(fastify, server.id);
        const now = new Date();

        let addedRows: ServerMod[];
        let skippedCount = duplicateCount;
        let removedCount = 0;
        if (mode === MOD_IMPORT_MODE.REPLACE) {
          ({ addedRows, removedCount } = executeReplaceImport({
            fastify,
            serverId: server.id,
            hydratedItems,
            existingMods,
            now,
          }));
        } else {
          const merged = appendWorkshopMods(
            { fastify, serverId: server.id, existingMods, now },
            hydratedItems.map(toNewWorkshopModInput),
          );
          addedRows = merged.addedRows;
          skippedCount += merged.skippedCount;
        }

        const allRows = listServerModRows(fastify, server.id);
        return {
          payload: {
            added: addedRows.map(mapServerModDto),
            skippedCount,
            removedCount,
            ...buildModsListPayload(allRows),
          },
        } as const;
      });

      const result = runImport();
      if ('blockedBy' in result) {
        if (!result.blockedBy) {
          return sendApiError(reply, 404, 'SERVER_NOT_FOUND', {
            message: `Server with ID '${server.id}' not found`,
            params: { id: server.id },
          });
        }
        guardServerConfigUnlocked(result.blockedBy, reply);
        return reply;
      }
      return reply.status(201).send(result.payload);
    },
  );

  fastify.patch<{ Params: { id: string; modId: string } }>(
    '/:id/mods/:modId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to update server mods')) return;

      const resolved = resolveServerAndModOrSendError(fastify, request.params, reply);
      if (!resolved) return;

      const { server, mod } = resolved;
      if (!guardServerConfigUnlocked(server, reply)) return;

      const parseResult = updateServerModSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const data = parseResult.data;
      const nextFolderName =
        data.folderName !== undefined ? data.folderName.trim() : mod.folderName;

      if (data.folderName !== undefined) {
        const siblingMods = listServerModRows(fastify, server.id);
        const collision = siblingMods.some(
          m =>
            m.id !== mod.id && m.folderName.trim().toLowerCase() === nextFolderName.toLowerCase(),
        );
        if (collision) {
          return sendApiError(reply, 409, 'MOD_ALREADY_INSTALLED', {
            message: `Folder name "${nextFolderName}" is already in use on this server.`,
            params: { identifier: nextFolderName },
            fieldErrors: {
              folderName: {
                code: 'MOD_ALREADY_INSTALLED',
                message: `Folder name "${nextFolderName}" is already in use on this server.`,
              },
            },
          });
        }
      }

      const now = new Date();
      let syncedWorkshopUpdatedAt = mod.syncedWorkshopUpdatedAt;
      let lastSyncedAt = mod.lastSyncedAt;

      if (data.markSynced && mod.sourceType === MOD_SOURCE_TYPE.WORKSHOP) {
        syncedWorkshopUpdatedAt = mod.remoteUpdatedAt ?? now;
        lastSyncedAt = now;
      }

      fastify.db
        .update(serverMods)
        .set({
          name: data.name ?? mod.name,
          folderName: nextFolderName,
          loadTarget: data.loadTarget ?? mod.loadTarget,
          enabled: data.enabled ?? mod.enabled,
          syncedWorkshopUpdatedAt,
          lastSyncedAt,
          updatedAt: now,
        })
        .where(and(eq(serverMods.id, mod.id), eq(serverMods.serverId, server.id)))
        .run();

      const updated = fastify.db
        .select()
        .from(serverMods)
        .where(and(eq(serverMods.id, mod.id), eq(serverMods.serverId, server.id)))
        .get()!;

      return reply.send(mapServerModDto(updated));
    },
  );

  fastify.delete<{ Params: { id: string; modId: string } }>(
    '/:id/mods/:modId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to delete server mods')) return;

      const resolved = resolveServerAndModOrSendError(fastify, request.params, reply);
      if (!resolved) return;

      const { server, mod } = resolved;
      if (!guardServerConfigUnlocked(server, reply)) return;

      const executeDelete = fastify.sqlite.transaction(() => {
        fastify.db
          .delete(serverMods)
          .where(and(eq(serverMods.id, mod.id), eq(serverMods.serverId, server.id)))
          .run();

        const remaining = listServerModRows(fastify, server.id);
        const now = new Date();
        remaining.forEach((row, index) => {
          if (row.loadOrder !== index) {
            fastify.db
              .update(serverMods)
              .set({ loadOrder: index, updatedAt: now })
              .where(eq(serverMods.id, row.id))
              .run();
          }
        });
      });

      executeDelete();
      return reply.send({ success: true });
    },
  );

  fastify.put<{ Params: { id: string } }>(
    '/:id/mods/reorder',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to reorder server mods')) return;

      const server = resolveServerOrSendError(fastify, request.params, reply);
      if (!server || !guardServerConfigUnlocked(server, reply)) return;

      const parseResult = reorderServerModsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { modIds } = parseResult.data;
      const existingMods = listServerModRows(fastify, server.id);
      const existingIdSet = new Set(existingMods.map(m => m.id));
      const requestedIdSet = new Set(modIds);

      const isExactPermutation =
        modIds.length === existingMods.length &&
        requestedIdSet.size === modIds.length &&
        modIds.every(id => existingIdSet.has(id));

      if (!isExactPermutation) {
        return sendApiError(reply, 400, 'MOD_REORDER_INVALID', {
          message:
            'Reorder payload must contain the exact set of mod IDs installed on this server without duplicates.',
        });
      }

      const executeReorder = fastify.sqlite.transaction(() => {
        const now = new Date();
        modIds.forEach((modId, index) => {
          fastify.db
            .update(serverMods)
            .set({ loadOrder: index, updatedAt: now })
            .where(and(eq(serverMods.id, modId), eq(serverMods.serverId, server.id)))
            .run();
        });
      });

      executeReorder();
      const updatedRows = listServerModRows(fastify, server.id);
      return reply.send(buildModsListPayload(updatedRows));
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/mods/check-updates',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to check Workshop updates')) {
        return;
      }

      const server = resolveServerOrSendError(fastify, request.params, reply);
      if (!server) return;

      const existingMods = listServerModRows(fastify, server.id);
      const workshopMods = existingMods.filter(
        m => m.sourceType === MOD_SOURCE_TYPE.WORKSHOP && Boolean(m.workshopId),
      );

      if (workshopMods.length > 0) {
        const workshopIds = workshopMods
          .map(m => m.workshopId)
          .filter((id): id is string => Boolean(id));

        try {
          const metadataMap = await steamWorkshopService.fetchPublishedFileMetadataMap(workshopIds);
          const updateMetadata = fastify.sqlite.transaction(() => {
            const now = new Date();
            for (const mod of workshopMods) {
              const meta = mod.workshopId ? metadataMap.get(mod.workshopId) : undefined;
              if (!meta) continue;
              fastify.db
                .update(serverMods)
                .set({
                  sizeBytes: meta.sizeBytes ?? mod.sizeBytes,
                  remoteUpdatedAt: meta.remoteUpdatedAt ?? mod.remoteUpdatedAt,
                  updatedAt: now,
                })
                .where(eq(serverMods.id, mod.id))
                .run();
            }
          });
          updateMetadata();
        } catch (err) {
          if (err instanceof SteamWorkshopError) {
            return sendApiError(reply, err.statusCode, err.errorCode, {
              message: err.message,
              params: err.params,
            });
          }
          throw err;
        }
      }

      const refreshedRows = listServerModRows(fastify, server.id);
      return reply.send(buildModsListPayload(refreshedRows));
    },
  );
};
