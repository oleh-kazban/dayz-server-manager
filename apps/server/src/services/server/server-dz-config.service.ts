import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import crypto from 'node:crypto';
import fs from 'node:fs';

import {
  CONFIG_FILE_KIND,
  CONFIG_REVISION_SOURCE,
  type ConfigDiagnosticDto,
  type ConfigEol,
  type ConfigRevisionDetailDto,
  configRevisionDetailSchema,
  type ConfigRevisionListDto,
  type ConfigRevisionSource,
  type ConfigRevisionSummaryDto,
  configRevisionSummarySchema,
  isServerActiveStatus,
  type SaveServerDzConfigResponseDto,
  saveServerDzConfigResponseSchema,
  SERVER_CONFIG_MAX_BYTES,
  type ServerDzConfigResponseDto,
  serverDzConfigResponseSchema,
  type ServerDzProjectionDto,
  type ValidateServerDzConfigResponseDto,
  validateServerDzConfigResponseSchema,
} from '@aegis/api-contracts';
import {
  type DatabaseInstance,
  type DsmDatabase,
  type Server,
  serverConfigRevisions,
  servers,
  users,
} from '@aegis/database';
import {
  analyzeServerConfig,
  compareDiagnostics,
  type ConfigDocument,
  detectTextFormat,
  extractProjection,
  findClass,
  findLastAssignment,
  fromLf,
  isValidMissionTemplate,
  normalizeMissionTemplate,
  renderServerDzTemplate,
  type SourceRange,
  toLf,
} from '@aegis/dayz-config';

import { ConfigStorageError, writeFileAtomically } from './config-atomic-writer';
import {
  type Clock,
  type ConfigEditLockService,
  type ConfigLockActor,
  type ConfigLockViewer,
  type ConfigServiceLogger,
  resolveUserDisplayName,
} from './config-edit-lock.service';
import { findFirstValidMissionTemplate } from './server-fs-inspector.service';
import {
  getPlatformPathImpl,
  isHostAbsolutePath,
  isPathContainedWithin,
  safeLstat,
  safeRealpath,
  safeStat,
  validateLexicalCandidate,
} from './server-path-safety';

export const MAX_CONFIG_REVISIONS = 50;

const SERVER_DZ_FILENAME = 'serverDZ.cfg';
const FILE_KIND = CONFIG_FILE_KIND.SERVER_DZ;
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

export interface ServerDzConfigServiceOptions {
  db: DsmDatabase;
  sqlite: DatabaseInstance['sqlite'];
  locks: ConfigEditLockService;
  clock?: Clock;
  platform?: NodeJS.Platform;
  backupRootDir?: string;
}

export interface DecodedConfigFile {
  hasBom: boolean;
  eol: ConfigEol;
  lf: string;
}

interface PersistRequest {
  server: Server;
  actor: ConfigLockActor;
  targetPath: string;
  lf: string;
  document: ConfigDocument;
  eol: ConfigEol;
  hasBom: boolean;
  source: ConfigRevisionSource;
  diagnostics: ConfigDiagnosticDto[];
  logger?: ConfigServiceLogger;
}

interface ReplaceRequest {
  server: Server;
  actor: ConfigLockActor;
  content: string;
  baseHash: string;
  source: ConfigRevisionSource;
  logger?: ConfigServiceLogger;
}

interface NewRevision {
  serverId: string;
  content: string;
  contentHash: string;
  source: ConfigRevisionSource;
  userId: string | null;
}

interface RevisionRow {
  id: string;
  source: ConfigRevisionSource;
  userId: string | null;
  contentHash: string;
  createdAt: Date;
  displayName: string | null;
  username: string | null;
}

/**
 * Version token of the file bytes on disk (like an HTTP ETag): detects edits made outside DSM
 * between load and save. It is not credential storage — the same admin receives the full
 * plaintext file, so the digest reveals nothing beyond what is already returned.
 */
function configVersionHash(bytes: Buffer): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function stripLeadingBomChar(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function decodeConfigBuffer(buffer: Buffer): DecodedConfigFile {
  const hasBom = buffer.subarray(0, UTF8_BOM.length).equals(UTF8_BOM);
  const text = buffer.subarray(hasBom ? UTF8_BOM.length : 0).toString('utf8');
  return { hasBom, eol: detectTextFormat(text).eol, lf: toLf(text) };
}

function positionAt(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

function serverDiagnostic(
  text: string,
  code: ConfigDiagnosticDto['code'],
  message: string,
  range: SourceRange,
): ConfigDiagnosticDto {
  const start = positionAt(text, range.start);
  const end = positionAt(text, Math.max(range.end, range.start));
  return {
    severity: 'error',
    code,
    message,
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

function toRevisionSummary(row: RevisionRow): ConfigRevisionSummaryDto {
  return configRevisionSummarySchema.parse({
    id: row.id,
    source: row.source,
    authorUserId: row.userId,
    authorName:
      row.username === null ? null : resolveUserDisplayName(row.displayName, row.username),
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
  });
}

function validationFailedError(errors: ConfigDiagnosticDto[]): ConfigStorageError {
  const [first] = errors;
  return new ConfigStorageError(
    'CONFIG_VALIDATION_FAILED',
    `Configuration has ${errors.length} validation error(s).`,
    { errorCount: errors.length, firstLine: first.line, firstMessage: first.message },
  );
}

function tooLargeError(): ConfigStorageError {
  return new ConfigStorageError(
    'CONFIG_FILE_TOO_LARGE',
    `Configuration must not exceed ${SERVER_CONFIG_MAX_BYTES} bytes.`,
    { maxBytes: SERVER_CONFIG_MAX_BYTES },
  );
}

/** Canonical real path of a server's installation directory; throws `CONFIG_PATH_INVALID`. */
export function resolveInstallRoot(installPath: string, platform: NodeJS.Platform): string {
  const lexical = validateLexicalCandidate(installPath, platform);
  if (!lexical.valid || !isHostAbsolutePath(lexical.trimmed, platform)) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'Installation path must be a valid host-absolute filesystem path.',
    );
  }
  const stat = safeStat(lexical.trimmed);
  const real = stat.exists && stat.stat.isDirectory() ? safeRealpath(lexical.trimmed) : null;
  if (!real) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'Installation directory does not exist on the host.',
    );
  }
  return real;
}

function resolveExistingTarget(installReal: string, platform: NodeJS.Platform): string | null {
  const targetPath = getPlatformPathImpl(platform).join(installReal, SERVER_DZ_FILENAME);
  const lstat = safeLstat(targetPath);
  if (!lstat.exists) {
    return null;
  }
  const real = lstat.stat.isFile() ? safeRealpath(targetPath) : null;
  if (
    lstat.stat.isSymbolicLink() ||
    !real ||
    !isPathContainedWithin(real, installReal, platform, false)
  ) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'serverDZ.cfg must be a regular non-symlink file inside the installation directory.',
    );
  }
  if (lstat.stat.size > SERVER_CONFIG_MAX_BYTES) {
    throw tooLargeError();
  }
  return targetPath;
}

function readTarget(targetPath: string): Buffer {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(targetPath);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown read error';
    throw new ConfigStorageError('CONFIG_PATH_INVALID', `Failed to read serverDZ.cfg: ${reason}`);
  }
  if (buffer.length > SERVER_CONFIG_MAX_BYTES) {
    throw tooLargeError();
  }
  return buffer;
}

/**
 * Reads `serverDZ.cfg` from a resolved installation root with the same containment and size
 * guards the editor uses. Returns `null` when the file does not exist; throws
 * `ConfigStorageError` when it exists but is unsafe or unreadable.
 */
export function readServerDzConfig(
  installReal: string,
  platform: NodeJS.Platform,
): DecodedConfigFile | null {
  const targetPath = resolveExistingTarget(installReal, platform);
  return targetPath ? decodeConfigBuffer(readTarget(targetPath)) : null;
}

export class ServerDzConfigService {
  private readonly db: DsmDatabase;
  private readonly sqlite: DatabaseInstance['sqlite'];
  private readonly locks: ConfigEditLockService;
  private readonly clock: Clock;
  private readonly platform: NodeJS.Platform;
  private readonly backupRootDir: string | undefined;

  constructor(options: ServerDzConfigServiceOptions) {
    this.db = options.db;
    this.sqlite = options.sqlite;
    this.locks = options.locks;
    this.clock = options.clock ?? Date.now;
    this.platform = options.platform ?? process.platform;
    this.backupRootDir = options.backupRootDir;
  }

  load(server: Server, viewer: ConfigLockViewer): ServerDzConfigResponseDto {
    const installReal = resolveInstallRoot(server.installPath, this.platform);
    const targetPath = resolveExistingTarget(installReal, this.platform);
    const lock = this.locks.getActive(server.id, FILE_KIND);
    const base = {
      serverRunning: isServerActiveStatus(server.status),
      lock: lock ? this.locks.toResponse(lock, viewer) : null,
    };

    if (!targetPath) {
      const latest = this.latestRevision(server.id);
      return serverDzConfigResponseSchema.parse({
        ...base,
        exists: false,
        content: null,
        contentHash: null,
        eol: this.defaultEol(),
        hasBom: false,
        sizeBytes: 0,
        projection: null,
        latestRevision: latest ? toRevisionSummary(latest) : null,
      });
    }

    const buffer = readTarget(targetPath);
    const contentHash = configVersionHash(buffer);
    const decoded = decodeConfigBuffer(buffer);
    const content = decoded.lf;
    const projection = extractProjection(analyzeServerConfig(content).document);
    const latest = this.recordExternalDriftIfNeeded(server, content, contentHash, projection);

    return serverDzConfigResponseSchema.parse({
      ...base,
      exists: true,
      content,
      contentHash,
      eol: decoded.eol,
      hasBom: decoded.hasBom,
      sizeBytes: buffer.length,
      projection,
      latestRevision: toRevisionSummary(latest),
    });
  }

  validate(server: Server, content: string): ValidateServerDzConfigResponseDto {
    let installReal: string | null;
    try {
      installReal = resolveInstallRoot(server.installPath, this.platform);
    } catch (err) {
      if (!(err instanceof ConfigStorageError)) {
        throw err;
      }
      installReal = null;
    }
    const { diagnostics } = this.analyze(server, installReal, toLf(stripLeadingBomChar(content)));
    return validateServerDzConfigResponseSchema.parse({
      valid: diagnostics.every(diagnostic => diagnostic.severity !== 'error'),
      diagnostics,
    });
  }

  save(
    server: Server,
    actor: ConfigLockActor,
    request: { baseHash: string; content: string },
    logger?: ConfigServiceLogger,
  ): SaveServerDzConfigResponseDto {
    this.assertStopped(server);
    this.locks.assertHeld(server.id, FILE_KIND, actor);
    return this.replaceExisting({
      server,
      actor,
      content: request.content,
      baseHash: request.baseHash,
      source: CONFIG_REVISION_SOURCE.EDITOR,
      logger,
    });
  }

  restore(
    server: Server,
    actor: ConfigLockActor,
    request: { revisionId: string; baseHash: string },
    logger?: ConfigServiceLogger,
  ): SaveServerDzConfigResponseDto {
    this.assertStopped(server);
    this.locks.assertHeld(server.id, FILE_KIND, actor);
    const revision = this.findRevisionRow(server.id, request.revisionId);
    return this.replaceExisting({
      server,
      actor,
      content: revision.content,
      baseHash: request.baseHash,
      source: CONFIG_REVISION_SOURCE.RESTORE,
      logger,
    });
  }

  bootstrap(
    server: Server,
    actor: ConfigLockActor,
    logger?: ConfigServiceLogger,
  ): SaveServerDzConfigResponseDto {
    this.assertStopped(server);
    this.locks.assertHeld(server.id, FILE_KIND, actor);
    const installReal = resolveInstallRoot(server.installPath, this.platform);
    const targetPath = getPlatformPathImpl(this.platform).join(installReal, SERVER_DZ_FILENAME);
    if (safeLstat(targetPath).exists) {
      throw new ConfigStorageError(
        'CONFIG_FILE_EXISTS',
        'serverDZ.cfg already exists; templates may only create a missing file.',
      );
    }

    const effectiveServer = this.ensureValidMissionPathForBootstrap(server, installReal);

    let lf: string;
    try {
      lf = renderServerDzTemplate({
        hostname: effectiveServer.name,
        missionTemplate: normalizeMissionTemplate(effectiveServer.missionPath),
        steamQueryPort: effectiveServer.queryPort,
      });
    } catch (err) {
      if (!(err instanceof RangeError)) {
        throw err;
      }
      throw new ConfigStorageError('CONFIG_VALIDATION_FAILED', err.message, {
        errorCount: 1,
        firstLine: 1,
        firstMessage: err.message,
      });
    }

    const { document, diagnostics } = this.analyze(effectiveServer, installReal, lf);
    const errors = diagnostics.filter(diagnostic => diagnostic.severity === 'error');
    if (errors.length > 0) {
      throw validationFailedError(errors);
    }

    return this.persist({
      server: effectiveServer,
      actor,
      targetPath,
      lf,
      document,
      eol: this.defaultEol(),
      hasBom: false,
      source: CONFIG_REVISION_SOURCE.TEMPLATE,
      diagnostics,
      logger,
    });
  }

  listRevisions(serverId: string): ConfigRevisionListDto {
    return this.selectRevisionRows(serverId, MAX_CONFIG_REVISIONS).map(toRevisionSummary);
  }

  getRevision(serverId: string, revisionId: string): ConfigRevisionDetailDto {
    const row = this.findRevisionRow(serverId, revisionId);
    return configRevisionDetailSchema.parse({
      ...toRevisionSummary(row),
      content: row.content,
    });
  }

  private replaceExisting({
    server,
    actor,
    content,
    baseHash,
    source,
    logger,
  }: ReplaceRequest): SaveServerDzConfigResponseDto {
    if (Buffer.byteLength(content, 'utf8') > SERVER_CONFIG_MAX_BYTES) {
      throw tooLargeError();
    }

    const installReal = resolveInstallRoot(server.installPath, this.platform);
    const targetPath = resolveExistingTarget(installReal, this.platform);
    if (!targetPath) {
      throw new ConfigStorageError(
        'CONFIG_FILE_MISSING',
        'serverDZ.cfg does not exist; create it from the template first.',
      );
    }

    const diskBuffer = readTarget(targetPath);
    if (configVersionHash(diskBuffer) !== baseHash) {
      throw new ConfigStorageError(
        'CONFIG_HASH_MISMATCH',
        'serverDZ.cfg changed on disk since it was loaded.',
      );
    }

    const disk = decodeConfigBuffer(diskBuffer);
    const lf = toLf(stripLeadingBomChar(content));
    const { document, diagnostics } = this.analyze(server, installReal, lf);
    const errors = diagnostics.filter(diagnostic => diagnostic.severity === 'error');
    if (errors.length > 0) {
      throw validationFailedError(errors);
    }

    return this.persist({
      server,
      actor,
      targetPath,
      lf,
      document,
      eol: disk.eol,
      hasBom: disk.hasBom,
      source,
      diagnostics,
      logger,
    });
  }

  private persist(request: PersistRequest): SaveServerDzConfigResponseDto {
    const { server } = request;
    const body = Buffer.from(fromLf(request.lf, request.eol), 'utf8');
    const bytes = request.hasBom ? Buffer.concat([UTF8_BOM, body]) : body;
    if (bytes.length > SERVER_CONFIG_MAX_BYTES) {
      throw tooLargeError();
    }

    const projection = extractProjection(request.document);
    const contentHash = configVersionHash(bytes);
    const written = writeFileAtomically({
      targetPath: request.targetPath,
      content: bytes,
      serverId: server.id,
      fileName: SERVER_DZ_FILENAME,
      backupRootDir: this.backupRootDir,
      platform: this.platform,
    });

    const commit = this.sqlite.transaction(() => {
      const revisionId = this.insertRevision({
        serverId: server.id,
        content: request.lf,
        contentHash,
        source: request.source,
        userId: request.actor.userId,
      });
      this.db
        .update(servers)
        .set({
          queryPort: projection.steamQueryPort,
          maxPlayers: projection.maxPlayers,
          updatedAt: new Date(this.clock()),
        })
        .where(eq(servers.id, server.id))
        .run();
      return revisionId;
    });

    let revisionId: string;
    try {
      revisionId = commit.immediate();
    } catch (err) {
      request.logger?.error(
        { serverId: server.id, source: request.source, err },
        'serverDZ.cfg was written but its revision could not be recorded',
      );
      throw err;
    }

    request.logger?.info(
      {
        serverId: server.id,
        source: request.source,
        revisionId,
        contentHash,
        written: written.written,
        backupPath: written.backupPath,
      },
      'serverDZ.cfg saved',
    );

    const revision = this.findRevisionRow(server.id, revisionId);
    return saveServerDzConfigResponseSchema.parse({
      contentHash,
      projection,
      diagnostics: request.diagnostics,
      revision: toRevisionSummary(revision),
    });
  }

  private ensureValidMissionPathForBootstrap(server: Server, installReal: string): Server {
    const currentTemplate = normalizeMissionTemplate(server.missionPath);
    const currentValid =
      currentTemplate.length > 0 &&
      isValidMissionTemplate(currentTemplate) &&
      this.missionDirectoryExists(installReal, currentTemplate);
    if (currentValid) {
      return server;
    }

    const discovered = findFirstValidMissionTemplate(installReal, this.platform);
    if (!discovered) {
      return server;
    }

    const separator =
      server.missionPath.includes('\\') && !server.missionPath.includes('/') ? '\\' : '/';
    const updatedMissionPath = `mpmissions${separator}${discovered}`;
    this.db
      .update(servers)
      .set({ missionPath: updatedMissionPath, updatedAt: new Date(this.clock()) })
      .where(eq(servers.id, server.id))
      .run();

    return { ...server, missionPath: updatedMissionPath };
  }

  private analyze(
    server: Server,
    installReal: string | null,
    lf: string,
  ): { document: ConfigDocument; diagnostics: ConfigDiagnosticDto[] } {
    const { document, diagnostics } = analyzeServerConfig(lf);
    const projection = extractProjection(document);
    const serverChecks: ConfigDiagnosticDto[] = [];

    const template = projection.missionTemplate;
    if (template !== null && !this.missionDirectoryExists(installReal, template)) {
      const dayz = findClass(findClass(document.entries, 'Missions')?.entries ?? [], 'DayZ');
      const range = (dayz && findLastAssignment(dayz.entries, 'template')?.valueRange) ?? {
        start: 0,
        end: 0,
      };
      serverChecks.push(
        serverDiagnostic(
          lf,
          'MISSION_NOT_FOUND',
          `Mission folder 'mpmissions/${template}' does not exist in the server installation`,
          range,
        ),
      );
    }

    const conflict = this.findQueryPortConflict(server, projection.steamQueryPort);
    if (conflict) {
      const range = findLastAssignment(document.entries, 'steamQueryPort')?.valueRange ?? {
        start: 0,
        end: 0,
      };
      serverChecks.push(serverDiagnostic(lf, 'STEAM_QUERY_PORT_CONFLICT', conflict, range));
    }

    return {
      document,
      diagnostics: [...diagnostics, ...serverChecks].sort(compareDiagnostics),
    };
  }

  private findQueryPortConflict(server: Server, port: number): string | null {
    if (port === server.gamePort || port === server.rconPort) {
      return `steamQueryPort ${port} collides with this server's game or RCON port`;
    }
    const other = this.db
      .select({
        name: servers.name,
        gamePort: servers.gamePort,
        queryPort: servers.queryPort,
        rconPort: servers.rconPort,
      })
      .from(servers)
      .where(ne(servers.id, server.id))
      .all()
      .find(s => s.gamePort === port || s.queryPort === port || s.rconPort === port);
    return other ? `steamQueryPort ${port} collides with a port of server '${other.name}'` : null;
  }

  private missionDirectoryExists(installReal: string | null, template: string): boolean {
    if (installReal === null) {
      return false;
    }
    const pathImpl = getPlatformPathImpl(this.platform);
    let cursor = installReal;
    for (const segment of ['mpmissions', template]) {
      cursor = pathImpl.join(cursor, segment);
      const stat = safeStat(cursor);
      const real = safeRealpath(cursor);
      if (
        !stat.exists ||
        !stat.stat.isDirectory() ||
        !real ||
        !isPathContainedWithin(real, installReal, this.platform, false)
      ) {
        return false;
      }
    }
    return true;
  }

  private assertStopped(server: Server): void {
    if (isServerActiveStatus(server.status)) {
      throw new ConfigStorageError(
        'SERVER_RUNNING_CONFIG_LOCKED',
        `Cannot edit configuration while "${server.name}" is ${server.status}.`,
        { id: server.id, name: server.name, status: server.status },
      );
    }
  }

  private defaultEol(): ConfigEol {
    return this.platform === 'win32' ? 'crlf' : 'lf';
  }

  private recordExternalDriftIfNeeded(
    server: Server,
    content: string,
    contentHash: string,
    projection: ServerDzProjectionDto,
  ): RevisionRow {
    const run = this.sqlite.transaction(() => {
      const queryPortCollides =
        projection.steamQueryPort !== server.queryPort &&
        this.findQueryPortConflict(server, projection.steamQueryPort) !== null;
      const nextQueryPort = queryPortCollides ? server.queryPort : projection.steamQueryPort;
      const nextMaxPlayers = projection.maxPlayers;
      const projectionOutOfSync =
        nextQueryPort !== server.queryPort || nextMaxPlayers !== server.maxPlayers;

      const latest = this.latestRevision(server.id);
      const drifted = !latest || latest.contentHash !== contentHash;

      if (drifted || projectionOutOfSync) {
        this.db
          .update(servers)
          .set({
            queryPort: nextQueryPort,
            maxPlayers: nextMaxPlayers,
            updatedAt: new Date(this.clock()),
          })
          .where(eq(servers.id, server.id))
          .run();
      }

      if (latest && !drifted) {
        return latest;
      }

      const revisionId = this.insertRevision({
        serverId: server.id,
        content,
        contentHash,
        source: CONFIG_REVISION_SOURCE.EXTERNAL,
        userId: null,
      });
      return this.findRevisionRow(server.id, revisionId);
    });
    return run.immediate();
  }

  private insertRevision(revision: NewRevision): string {
    const { serverId } = revision;
    const latest = this.latestRevision(serverId);
    const now = this.clock();
    const createdAt = new Date(latest ? Math.max(now, latest.createdAt.getTime() + 1) : now);
    const id = crypto.randomUUID();
    this.db
      .insert(serverConfigRevisions)
      .values({ ...revision, id, fileKind: FILE_KIND, createdAt })
      .run();

    const staleIds = this.db
      .select({ id: serverConfigRevisions.id })
      .from(serverConfigRevisions)
      .where(
        and(
          eq(serverConfigRevisions.serverId, serverId),
          eq(serverConfigRevisions.fileKind, FILE_KIND),
        ),
      )
      .orderBy(desc(serverConfigRevisions.createdAt))
      .all()
      .slice(MAX_CONFIG_REVISIONS)
      .map(row => row.id);
    if (staleIds.length > 0) {
      this.db
        .delete(serverConfigRevisions)
        .where(inArray(serverConfigRevisions.id, staleIds))
        .run();
    }
    return id;
  }

  private latestRevision(serverId: string): RevisionRow | null {
    return this.selectRevisionRows(serverId, 1)[0] ?? null;
  }

  private selectRevisionRows(serverId: string, limit: number): RevisionRow[] {
    return this.db
      .select({
        id: serverConfigRevisions.id,
        source: serverConfigRevisions.source,
        userId: serverConfigRevisions.userId,
        contentHash: serverConfigRevisions.contentHash,
        createdAt: serverConfigRevisions.createdAt,
        displayName: users.displayName,
        username: users.username,
      })
      .from(serverConfigRevisions)
      .leftJoin(users, eq(users.id, serverConfigRevisions.userId))
      .where(
        and(
          eq(serverConfigRevisions.serverId, serverId),
          eq(serverConfigRevisions.fileKind, FILE_KIND),
        ),
      )
      .orderBy(desc(serverConfigRevisions.createdAt))
      .limit(limit)
      .all();
  }

  private findRevisionRow(serverId: string, revisionId: string): RevisionRow & { content: string } {
    const row = this.db
      .select({
        id: serverConfigRevisions.id,
        source: serverConfigRevisions.source,
        userId: serverConfigRevisions.userId,
        contentHash: serverConfigRevisions.contentHash,
        createdAt: serverConfigRevisions.createdAt,
        content: serverConfigRevisions.content,
        displayName: users.displayName,
        username: users.username,
      })
      .from(serverConfigRevisions)
      .leftJoin(users, eq(users.id, serverConfigRevisions.userId))
      .where(
        and(
          eq(serverConfigRevisions.id, revisionId),
          eq(serverConfigRevisions.serverId, serverId),
          eq(serverConfigRevisions.fileKind, FILE_KIND),
        ),
      )
      .get();
    if (!row) {
      throw new ConfigStorageError(
        'CONFIG_REVISION_NOT_FOUND',
        `Configuration revision '${revisionId}' not found`,
        { revisionId },
      );
    }
    return row;
  }
}
