import { asc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';

import {
  type CreateServerDto,
  createServerSchema,
  serverDetailSchema,
  serverIdParamSchema,
  serverSummarySchema,
  type UpdateServerDto,
  updateServerSchema,
} from '@dsm/api-contracts';
import { type Server, servers } from '@dsm/database';

function checkInterServerPortCollision(
  allServers: Server[],
  candidatePorts: number[],
  excludeServerId?: string,
): { collides: boolean; message?: string } {
  const targetServers = excludeServerId
    ? allServers.filter(s => s.id !== excludeServerId)
    : allServers;

  for (const s of targetServers) {
    const existingPorts = new Set([s.gamePort, s.queryPort, s.rconPort]);
    for (const p of candidatePorts) {
      if (existingPorts.has(p)) {
        return {
          collides: true,
          message: `Port ${p} collides with existing server '${s.name}' (ID: ${s.id})`,
        };
      }
    }
  }

  return { collides: false };
}

function checkRunningMutationViolation(existing: Server, data: UpdateServerDto): boolean {
  if (existing.status === 'stopped') {
    return false;
  }

  const portChanged =
    (data.gamePort !== undefined && data.gamePort !== existing.gamePort) ||
    (data.queryPort !== undefined && data.queryPort !== existing.queryPort) ||
    (data.rconPort !== undefined && data.rconPort !== existing.rconPort);

  const pathChanged =
    (data.installPath !== undefined && data.installPath !== existing.installPath) ||
    (data.profilePath !== undefined && data.profilePath !== existing.profilePath);

  return portChanged || pathChanged;
}

interface ValidPortsResult {
  valid: true;
  ports: { gamePort: number; queryPort: number; rconPort: number };
}

interface InvalidPortsResult {
  valid: false;
  status: 400 | 409;
  message: string;
}

function validateCandidatePorts(
  existing: Server,
  data: UpdateServerDto,
  allServers: Server[],
  id: string,
): ValidPortsResult | InvalidPortsResult {
  const candidateGamePort = data.gamePort ?? existing.gamePort;
  const candidateQueryPort = data.queryPort ?? existing.queryPort;
  const candidateRconPort = data.rconPort ?? existing.rconPort;
  const candidatePorts = [candidateGamePort, candidateQueryPort, candidateRconPort];

  if (new Set(candidatePorts).size !== 3) {
    return {
      valid: false,
      status: 400,
      message: 'Effective gamePort, queryPort, and rconPort must all be distinct',
    };
  }

  const collisionCheck = checkInterServerPortCollision(allServers, candidatePorts, id);
  if (collisionCheck.collides) {
    return {
      valid: false,
      status: 409,
      message: collisionCheck.message ?? 'Port collision detected with another server',
    };
  }

  return {
    valid: true,
    ports: {
      gamePort: candidateGamePort,
      queryPort: candidateQueryPort,
      rconPort: candidateRconPort,
    },
  };
}

function mapServerDetail(s: Server) {
  return serverDetailSchema.parse({
    id: s.id,
    name: s.name,
    description: s.description,
    status: s.status,
    gamePort: s.gamePort,
    queryPort: s.queryPort,
    rconPort: s.rconPort,
    isDefault: s.isDefault,
    installPath: s.installPath,
    profilePath: s.profilePath,
    missionPath: s.missionPath,
    launchParameters: s.launchParameters,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  });
}

export const registerServersRoutes: FastifyPluginAsync = async fastify => {
  // GET /api/v1/servers - List all servers
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (_request, reply) => {
      const rows = fastify.db.db.select().from(servers).all();

      const summaries = rows.map(s =>
        serverSummarySchema.parse({
          id: s.id,
          name: s.name,
          description: s.description,
          status: s.status,
          gamePort: s.gamePort,
          queryPort: s.queryPort,
          rconPort: s.rconPort,
          isDefault: s.isDefault,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        }),
      );

      return reply.send(summaries);
    },
  );

  // GET /api/v1/servers/:id - Get server detail
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const paramResult = serverIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return reply.badRequest(paramResult.error.issues[0].message);
      }
      const { id } = paramResult.data;

      const s = fastify.db.db.select().from(servers).where(eq(servers.id, id)).get();

      if (!s) {
        return reply.notFound(`Server with ID '${id}' not found`);
      }

      return reply.send(mapServerDetail(s));
    },
  );

  // POST /api/v1/servers - Create new server
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (request.user?.role !== 'admin') {
        return reply.forbidden('Admin role required to create servers');
      }

      const parseResult = createServerSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.badRequest(parseResult.error.issues[0].message);
      }

      const data: CreateServerDto = parseResult.data;

      const existingName = fastify.db.db
        .select()
        .from(servers)
        .where(eq(servers.name, data.name))
        .get();

      if (existingName) {
        return reply.conflict(`Server with name '${data.name}' already exists`);
      }

      const allServers = fastify.db.db.select().from(servers).all();
      const collisionCheck = checkInterServerPortCollision(allServers, [
        data.gamePort,
        data.queryPort,
        data.rconPort,
      ]);

      if (collisionCheck.collides) {
        return reply.conflict(collisionCheck.message);
      }

      const serverId = crypto.randomUUID();
      const now = new Date();

      if (data.isDefault) {
        fastify.db.db.update(servers).set({ isDefault: false }).run();
      }

      fastify.db.db
        .insert(servers)
        .values({
          id: serverId,
          name: data.name,
          description: data.description ?? null,
          status: 'stopped',
          installPath: data.installPath,
          profilePath: data.profilePath,
          missionPath: data.missionPath,
          gamePort: data.gamePort,
          queryPort: data.queryPort,
          rconPort: data.rconPort,
          rconPassword: data.rconPassword ?? null,
          launchParameters: data.launchParameters ?? null,
          isDefault: data.isDefault ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const created = fastify.db.db.select().from(servers).where(eq(servers.id, serverId)).get();

      return reply.status(201).send(mapServerDetail(created!));
    },
  );

  // PATCH /api/v1/servers/:id - Update server
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (request.user?.role !== 'admin') {
        return reply.forbidden('Admin role required to update servers');
      }

      const paramResult = serverIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return reply.badRequest(paramResult.error.issues[0].message);
      }
      const { id } = paramResult.data;

      const existing = fastify.db.db.select().from(servers).where(eq(servers.id, id)).get();

      if (!existing) {
        return reply.notFound(`Server with ID '${id}' not found`);
      }

      const parseResult = updateServerSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.badRequest(parseResult.error.issues[0].message);
      }

      const data: UpdateServerDto = parseResult.data;

      // GUARD-SRV-03: Running Configuration Mutation Guard
      if (checkRunningMutationViolation(existing, data)) {
        return reply.conflict(
          'Cannot alter network ports or filesystem paths while server is running.',
        );
      }

      if (data.name && data.name !== existing.name) {
        const nameCollision = fastify.db.db
          .select()
          .from(servers)
          .where(eq(servers.name, data.name))
          .get();

        if (nameCollision) {
          return reply.conflict(`Server with name '${data.name}' already exists`);
        }
      }

      const allServers = fastify.db.db.select().from(servers).all();
      const portCheck = validateCandidatePorts(existing, data, allServers, id);
      if (!portCheck.valid) {
        return reply
          .status(portCheck.status)
          .send({ statusCode: portCheck.status, message: portCheck.message });
      }

      const {
        gamePort: candidateGamePort,
        queryPort: candidateQueryPort,
        rconPort: candidateRconPort,
      } = portCheck.ports;

      if (data.isDefault) {
        fastify.db.db.update(servers).set({ isDefault: false }).run();
      }

      fastify.db.db
        .update(servers)
        .set({
          name: data.name ?? existing.name,
          description: data.description !== undefined ? data.description : existing.description,
          installPath: data.installPath ?? existing.installPath,
          profilePath: data.profilePath ?? existing.profilePath,
          missionPath: data.missionPath ?? existing.missionPath,
          gamePort: candidateGamePort,
          queryPort: candidateQueryPort,
          rconPort: candidateRconPort,
          rconPassword: data.rconPassword !== undefined ? data.rconPassword : existing.rconPassword,
          launchParameters:
            data.launchParameters !== undefined ? data.launchParameters : existing.launchParameters,
          isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
          updatedAt: new Date(),
        })
        .where(eq(servers.id, id))
        .run();

      const updated = fastify.db.db.select().from(servers).where(eq(servers.id, id)).get();

      return reply.send(mapServerDetail(updated!));
    },
  );

  // DELETE /api/v1/servers/:id - Delete server
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (request.user?.role !== 'admin') {
        return reply.forbidden('Admin role required to delete servers');
      }

      const paramResult = serverIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return reply.badRequest(paramResult.error.issues[0].message);
      }
      const { id } = paramResult.data;

      const existing = fastify.db.db.select().from(servers).where(eq(servers.id, id)).get();

      if (!existing) {
        return reply.notFound(`Server with ID '${id}' not found`);
      }

      // GUARD-SRV-01: Active Process Termination Guard
      if (existing.status !== 'stopped') {
        return reply.conflict('Cannot delete server while it is running. Stop the server first.');
      }

      const executeDelete = fastify.db.sqlite.transaction(() => {
        fastify.db.db.delete(servers).where(eq(servers.id, id)).run();

        if (existing.isDefault) {
          const remaining = fastify.db.db
            .select()
            .from(servers)
            .orderBy(asc(servers.createdAt))
            .limit(1)
            .all();

          if (remaining.length > 0) {
            fastify.db.db
              .update(servers)
              .set({ isDefault: true })
              .where(eq(servers.id, remaining[0].id))
              .run();
          }
        }
      });

      executeDelete();

      return reply.send({ success: true });
    },
  );
};
