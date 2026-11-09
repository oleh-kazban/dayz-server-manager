import { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@aegis/api-client';
import type { SteamChallengeEventDto } from '@aegis/api-contracts';

import { notifyApiError, notifyInfo, notifySuccess } from '../../../core/notifications/notify';

export function useSteamAuthChallenge() {
  const queryClient = useQueryClient();
  const [activeChallenge, setActiveChallenge] = useState<SteamChallengeEventDto | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/v1/realtime/sse');

      eventSource.addEventListener('steam.auth.challenge', (e: MessageEvent) => {
        try {
          const payload: SteamChallengeEventDto = JSON.parse(e.data);
          setActiveChallenge(payload);

          if (payload.type === 'OTP_CODE') {
            notifyInfo(
              'Steam Guard Verification',
              'Steam Guard code required. Enter the verification code sent to your email/app.',
            );
          } else {
            notifyInfo(
              'Steam Guard Confirmation',
              'Steam Guard confirmation required. Open your Steam Mobile App and approve the sign-in prompt.',
            );
          }
        } catch {
          // Ignore parse errors
        }
      });

      eventSource.addEventListener('steam.auth.challenge.expired', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          setActiveChallenge(prev => (prev?.challengeId === payload.challengeId ? null : prev));
        } catch {
          setActiveChallenge(null);
        }
      });

      eventSource.addEventListener('steam.auth.status', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.status === 'AUTHENTICATED') {
            setActiveChallenge(null);
            notifySuccess('STEAM_AUTH_SUCCESS');
          }
          queryClient.invalidateQueries({ queryKey: ['steam-settings'] });
        } catch {
          // Ignore
        }
      });
    } catch {
      // EventSource initialization failed (e.g. in test environment)
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);

  const respondToChallenge = async (code: string) => {
    if (!activeChallenge) return;
    try {
      await apiClient.steam.respondChallenge({
        challengeId: activeChallenge.challengeId,
        code,
      });
      notifySuccess('STEAM_CHALLENGE_SUBMITTED');
    } catch (err) {
      notifyApiError(err, 'Failed to Submit 2FA Code');
      throw err;
    }
  };

  const abortChallenge = async () => {
    if (!activeChallenge) return;
    const challengeId = activeChallenge.challengeId;
    setActiveChallenge(null);
    try {
      await apiClient.steam.abortChallenge({ challengeId });
      notifySuccess('STEAM_CHALLENGE_ABORTED');
    } catch (err) {
      notifyApiError(err, 'Failed to Cancel Challenge');
    }
  };

  return {
    activeChallenge,
    isModalOpen: activeChallenge !== null,
    respondToChallenge,
    abortChallenge,
  };
}
