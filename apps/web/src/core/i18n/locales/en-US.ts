import type { ApiErrorCode, ServerStatus } from '@aegis/api-contracts';

export type NotificationCode = 'SERVER_CREATED' | 'SERVER_UPDATED' | 'SERVER_DELETED';

export interface ToastTranslationEntry {
  title: string;
  description: string;
}

export interface TranslationCatalog {
  errors: Record<ApiErrorCode, ToastTranslationEntry>;
  validation: Record<string, string>;
  notifications: Record<NotificationCode, ToastTranslationEntry>;
  serverStatus: Record<ServerStatus, string>;
}

export const enUSTranslations: TranslationCatalog = {
  errors: {
    AUTH_INVALID_CREDENTIALS: {
      title: 'Authentication Failed',
      description: 'Invalid username or password. Please check your credentials and try again.',
    },
    AUTH_TOKEN_MISSING_OR_INVALID: {
      title: 'Session Expired',
      description: 'Your session is missing or invalid. Please sign in again.',
    },
    AUTH_TOKEN_TYPE_INVALID: {
      title: 'Invalid Authorization Token',
      description: 'The provided token type is not valid for this operation.',
    },
    AUTH_REFRESH_TOKEN_INVALID: {
      title: 'Session Expired',
      description: 'Your session has expired. Please sign in again.',
    },
    AUTH_USER_NOT_FOUND: {
      title: 'Account Not Found',
      description: 'The authenticated user account could not be found.',
    },
    AUTH_FORBIDDEN_ADMIN_REQUIRED: {
      title: 'Access Denied',
      description: 'Administrator privileges are required to perform this action.',
    },
    AUTH_RATE_LIMIT_EXCEEDED: {
      title: 'Too Many Requests',
      description: 'Too many attempts detected. Please wait a moment before trying again.',
    },
    AUTH_PASSWORD_MISMATCH: {
      title: 'Password Mismatch',
      description: 'The current password provided is incorrect.',
    },
    AUTH_SESSION_INVALID: {
      title: 'Session Invalid',
      description: 'Your session is invalid or has expired. Please sign in again.',
    },
    AUTH_SESSION_EXPIRED: {
      title: 'Session Expired',
      description: 'Your session has expired or was revoked. Please sign in again.',
    },
    AUTH_SESSION_NOT_FOUND: {
      title: 'Session Not Found',
      description: 'The requested session could not be found or has already been terminated.',
    },
    VALIDATION_FAILED: {
      title: 'Validation Error',
      description: 'Please review the highlighted fields and correct any invalid values.',
    },
    SERVER_NOT_FOUND: {
      title: 'Server Not Found',
      description: 'Server with ID "{{id}}" could not be found.',
    },
    SERVER_NAME_CONFLICT: {
      title: 'Server Name Conflict',
      description: 'A server named "{{name}}" already exists. Please choose a unique name.',
    },
    SERVER_PORT_COLLISION: {
      title: 'Port Collision Detected',
      description: 'Port {{port}} is already in use by server "{{occupiedBy}}".',
    },
    SERVER_PORTS_NOT_DISTINCT: {
      title: 'Duplicate Server Ports',
      description: 'Game port, query port, and RCON port must all be distinct.',
    },
    SERVER_RUNNING_CONFIG_LOCKED: {
      title: 'Configuration Locked',
      description: 'Cannot modify network ports or file paths while "{{name}}" is {{status}}.',
    },
    SERVER_RUNNING_DELETE_LOCKED: {
      title: 'Deletion Locked',
      description: 'Cannot delete "{{name}}" while it is {{status}}. Stop the server first.',
    },
    INTERNAL_SERVER_ERROR: {
      title: 'Internal Server Error',
      description: 'An unexpected error occurred on the server. Please try again.',
    },
  },
  validation: {
    REQUIRED: 'This field is required.',
    STRING_TOO_SHORT: 'Must be at least {{min}} characters.',
    STRING_TOO_LONG: 'Must be at most {{max}} characters.',
    NUMBER_TOO_SMALL: 'Port must be between {{min}} and 65535.',
    NUMBER_TOO_LARGE: 'Port must be between 1024 and {{max}}.',
    INVALID_UUID: 'Invalid ID format. Must be a valid UUID.',
    PORTS_NOT_DISTINCT: 'Game port, query port, and RCON port must all be distinct.',
    SERVER_NAME_CONFLICT: 'A server named "{{name}}" already exists.',
    SERVER_PORT_COLLISION: 'Port {{port}} is already in use by server "{{occupiedBy}}".',
    PATH_TRAVERSAL_FORBIDDEN: 'Path traversal (..) is not permitted.',
    PATH_NULL_BYTES_FORBIDDEN: 'Null bytes are forbidden in paths.',
    PATH_INVALID_CHARS: 'Path contains invalid filesystem characters.',
    PATH_INVALID_COLON: 'Colons are only permitted in Windows drive letter prefixes.',
    INVALID_TYPE: 'Invalid value provided.',
    INVALID_VALUE: '{{message}}',
  },
  notifications: {
    SERVER_CREATED: {
      title: 'Server Created',
      description: 'Server "{{name}}" has been created successfully.',
    },
    SERVER_UPDATED: {
      title: 'Settings Saved',
      description: 'Configuration for "{{name}}" has been updated successfully.',
    },
    SERVER_DELETED: {
      title: 'Server Deleted',
      description: 'Server "{{name}}" has been removed from DayZ Server Manager.',
    },
  },
  serverStatus: {
    running: 'Running',
    starting: 'Starting',
    stopping: 'Stopping',
    stopped: 'Stopped',
    failed: 'Failed',
  },
};
