import { z } from 'zod';

import { localStorageDriver } from '../storage';

export const ACKNOWLEDGED_GREETINGS_STORAGE_KEY = 'dsm-acknowledged-greetings';
export const USER_GREETING_ID_PREFIX = 'user-greeting:';

const acknowledgedGreetingsSchema = z.array(z.string());

export function getUserGreetingNotificationId(userId: string): string {
  return `${USER_GREETING_ID_PREFIX}${userId.trim()}`;
}

export function isGreetingAcknowledged(userId: string): boolean {
  const trimmedUserId = userId.trim();
  if (trimmedUserId.length === 0) {
    return false;
  }

  const acknowledgedIds = localStorageDriver.get(
    ACKNOWLEDGED_GREETINGS_STORAGE_KEY,
    [],
    acknowledgedGreetingsSchema,
  );
  return acknowledgedIds.includes(trimmedUserId);
}

export function acknowledgeGreeting(userId: string): void {
  const trimmedUserId = userId.trim();
  if (trimmedUserId.length === 0) {
    return;
  }

  const acknowledgedIds = localStorageDriver.get(
    ACKNOWLEDGED_GREETINGS_STORAGE_KEY,
    [],
    acknowledgedGreetingsSchema,
  );
  if (acknowledgedIds.includes(trimmedUserId)) {
    return;
  }

  localStorageDriver.set(ACKNOWLEDGED_GREETINGS_STORAGE_KEY, [...acknowledgedIds, trimmedUserId]);
}
