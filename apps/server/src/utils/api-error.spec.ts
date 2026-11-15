import type { FastifyReply } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { z, type ZodError } from 'zod';

import { createServerSchema, serverIdParamSchema, updateServerSchema } from '@aegis/api-contracts';

import { formatZodFieldErrors, sendApiError } from './api-error';

describe('api-error utilities', () => {
  it('formats standard, port, path, UUID, custom, root-level, and server credential and player-slot validation issues', () => {
    const emptyName = createServerSchema.safeParse({
      name: '',
      installPath: '../bad',
      profilePath: 'bad\0null',
      missionPath: 'bad/<char>',
      gamePort: 80,
      queryPort: 70000,
      rconPort: 2310,
      maxPlayers: 201,
      rconIp: 'invalid-ip',
    });
    expect(emptyName.success).toBe(false);
    if (!emptyName.success) {
      const mapped = formatZodFieldErrors(emptyName.error);
      expect(mapped.name).toMatchObject({ code: 'REQUIRED' });
      expect(mapped.installPath).toMatchObject({ code: 'PATH_TRAVERSAL_FORBIDDEN' });
      expect(mapped.profilePath).toMatchObject({ code: 'PATH_NULL_BYTES_FORBIDDEN' });
      expect(mapped.missionPath).toMatchObject({ code: 'PATH_INVALID_CHARS' });
      expect(mapped.gamePort).toMatchObject({ code: 'NUMBER_TOO_SMALL', params: { min: 1024 } });
      expect(mapped.queryPort).toMatchObject({ code: 'NUMBER_TOO_LARGE', params: { max: 65535 } });
      expect(mapped.maxPlayers).toMatchObject({ code: 'INVALID_VALUE' });
      expect(mapped.rconIp).toMatchObject({ code: 'INVALID_VALUE' });
    }

    const tooSmallNonPort = createServerSchema.safeParse({
      name: 'Valid Name',
      installPath: '/opt/dayz',
      profilePath: 'profiles',
      missionPath: 'dayzOffline.chernarusplus',
      maxPlayers: 0,
      rconPassword: 'ab',
      description: 'd'.repeat(260),
    });
    expect(tooSmallNonPort.success).toBe(false);
    if (!tooSmallNonPort.success) {
      const mapped = formatZodFieldErrors(tooSmallNonPort.error);
      expect(mapped.maxPlayers).toMatchObject({ code: 'INVALID_VALUE' });
      expect(mapped.rconPassword).toMatchObject({ code: 'STRING_TOO_SHORT', params: { min: 6 } });
      expect(mapped.description).toMatchObject({ code: 'STRING_TOO_LONG', params: { max: 256 } });
    }

    const portCollision = updateServerSchema.safeParse({
      gamePort: 2302,
      rconPort: 2302,
      installPath: 'bad:colon:path',
    });
    expect(portCollision.success).toBe(false);
    if (!portCollision.success) {
      const mapped = formatZodFieldErrors(portCollision.error);
      expect(mapped.gamePort).toMatchObject({ code: 'PORTS_NOT_DISTINCT' });
      expect(mapped.installPath).toMatchObject({ code: 'PATH_INVALID_COLON' });
    }

    const uuidCheck = serverIdParamSchema.safeParse({ id: 'not-a-uuid' });
    expect(uuidCheck.success).toBe(false);
    if (!uuidCheck.success) {
      const mapped = formatZodFieldErrors(uuidCheck.error);
      expect(mapped.id).toMatchObject({ code: 'INVALID_UUID' });
    }

    const typesCheck = z
      .object({
        requiredField: z.string(),
        wrongTypeField: z.string(),
      })
      .safeParse({ wrongTypeField: 123 });
    expect(typesCheck.success).toBe(false);
    if (!typesCheck.success) {
      const mapped = formatZodFieldErrors(typesCheck.error);
      expect(mapped.requiredField).toMatchObject({ code: 'REQUIRED' });
      expect(mapped.wrongTypeField).toMatchObject({ code: 'INVALID_TYPE' });
    }

    // Root-level issue + keeping only the first issue when a key appears twice
    const syntheticError = {
      issues: [
        { code: 'custom', path: [], message: 'Root failure' },
        { code: 'custom', path: [], message: 'Duplicate root failure ignored' },
        { code: 'invalid_format', path: ['id'], format: 'uuid', message: 'Uuid mismatch' },
      ],
    } as unknown as ZodError;

    const syntheticMapped = formatZodFieldErrors(syntheticError);
    expect(syntheticMapped.root).toEqual({ code: 'INVALID_VALUE', message: 'Root failure' });
    expect(syntheticMapped.id).toEqual({ code: 'INVALID_UUID', message: 'Uuid mismatch' });
  });

  it('serializes standardized API error envelopes with optional params, fieldErrors, and fallback status phrase', () => {
    const send = vi.fn().mockReturnValue('sent');
    const status = vi.fn().mockReturnValue({ send });
    const reply = { status } as unknown as FastifyReply;

    const res1 = sendApiError(reply, 409, 'CONFIG_RCON_PASSWORD_REQUIRED', 'RCON required');
    expect(res1).toBe('sent');
    expect(status).toHaveBeenCalledWith(409);
    expect(send).toHaveBeenCalledWith({
      statusCode: 409,
      error: 'Conflict',
      errorCode: 'CONFIG_RCON_PASSWORD_REQUIRED',
      message: 'RCON required',
    });

    const res2 = sendApiError(reply, 418, 'VALIDATION_FAILED', {
      message: 'Detailed error',
      params: { port: 2302 },
      fieldErrors: { port: { code: 'INVALID_VALUE', message: 'Bad port' } },
    });
    expect(res2).toBe('sent');
    expect(status).toHaveBeenCalledWith(418);
    expect(send).toHaveBeenCalledWith({
      statusCode: 418,
      error: 'Error',
      errorCode: 'VALIDATION_FAILED',
      message: 'Detailed error',
      params: { port: 2302 },
      fieldErrors: { port: { code: 'INVALID_VALUE', message: 'Bad port' } },
    });
  });
});
