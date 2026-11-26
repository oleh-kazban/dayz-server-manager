import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';

import {
  STEAM_APP_IDS,
  workshopLookupRequestSchema,
  workshopSearchQuerySchema,
} from '@aegis/api-contracts';
import { decryptVaultSecret, resolveVaultKey, steamSettings } from '@aegis/database';

import { requireAdmin } from '../app/role-guards';
import { SteamWorkshopError, steamWorkshopService } from '../services/steam/steam-workshop.service';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

export const registerWorkshopRoutes: FastifyPluginAsync = async fastify => {
  const adminRoute = { onRequest: [fastify.authenticate, requireAdmin] };

  fastify.post('/lookup', adminRoute, async (request, reply) => {
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

  fastify.get('/search', adminRoute, async (request, reply) => {
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
