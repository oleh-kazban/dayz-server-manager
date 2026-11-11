import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import {
  STEAM_APP_IDS,
  workshopLookupRequestSchema,
  workshopSearchQuerySchema,
} from '@aegis/api-contracts';
import { decryptVaultSecret, resolveVaultKey, steamSettings } from '@aegis/database';

import { SteamWorkshopError, steamWorkshopService } from '../services/steam/steam-workshop.service';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

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

export const registerWorkshopRoutes: FastifyPluginAsync = async fastify => {
  fastify.post('/lookup', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    if (!ensureAdminRole(request, reply, 'Admin role required to lookup Steam Workshop items')) {
      return;
    }

    const parseResult = workshopLookupRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(reply, 400, 'VALIDATION_FAILED', {
        message: parseResult.error.issues[0].message,
        fieldErrors: formatZodFieldErrors(parseResult.error),
      });
    }

    const settings = fastify.db
      .select()
      .from(steamSettings)
      .where(eq(steamSettings.id, 'default'))
      .get();
    const workshopAppId = settings?.workshopAppId ?? STEAM_APP_IDS.DAYZ_WORKSHOP;

    try {
      const result = await steamWorkshopService.lookupWorkshop(
        parseResult.data.input,
        workshopAppId,
      );
      return reply.send(result);
    } catch (err) {
      if (err instanceof SteamWorkshopError) {
        return sendApiError(reply, err.statusCode, err.errorCode, {
          message: err.message,
          params: err.params,
        });
      }
      throw err;
    }
  });

  fastify.get('/search', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    if (!ensureAdminRole(request, reply, 'Admin role required to search Steam Workshop')) {
      return;
    }

    const parseResult = workshopSearchQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendApiError(reply, 400, 'VALIDATION_FAILED', {
        message: parseResult.error.issues[0].message,
        fieldErrors: formatZodFieldErrors(parseResult.error),
      });
    }

    const settings = fastify.db
      .select()
      .from(steamSettings)
      .where(eq(steamSettings.id, 'default'))
      .get();

    if (!settings?.steamWebApiKeyEncrypted) {
      return sendApiError(reply, 400, 'STEAM_WEB_API_KEY_REQUIRED', {
        message:
          'A Steam Web API Key must be configured in Steam Settings before searching the Workshop.',
      });
    }

    let apiKey: string;
    try {
      apiKey = decryptVaultSecret(settings.steamWebApiKeyEncrypted, resolveVaultKey());
    } catch {
      return sendApiError(reply, 500, 'VAULT_KEY_UNAVAILABLE', {
        message: 'Failed to decrypt stored Steam Web API Key.',
      });
    }

    try {
      const result = await steamWorkshopService.searchWorkshop({
        apiKey,
        query: parseResult.data.q,
        page: parseResult.data.page,
        pageSize: parseResult.data.pageSize,
        workshopAppId: settings.workshopAppId,
      });
      return reply.send(result);
    } catch (err) {
      if (err instanceof SteamWorkshopError) {
        return sendApiError(reply, err.statusCode, err.errorCode, {
          message: err.message,
          params: err.params,
        });
      }
      throw err;
    }
  });
};
