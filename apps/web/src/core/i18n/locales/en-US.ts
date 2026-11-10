import type { ApiErrorCode, ServerStatus } from '@aegis/api-contracts';

export type NotificationCode =
  | 'SERVER_CREATED'
  | 'SERVER_UPDATED'
  | 'SERVER_DELETED'
  | 'STEAM_SETTINGS_UPDATED'
  | 'STEAM_SESSION_CLEARED'
  | 'STEAM_AUTH_SUCCESS'
  | 'STEAM_CHALLENGE_SUBMITTED'
  | 'STEAM_CHALLENGE_ABORTED'
  | 'STEAM_DIAGNOSTICS_COMPLETED'
  | 'MOD_ADDED'
  | 'MODS_BATCH_ADDED'
  | 'MOD_UPDATED'
  | 'MOD_DELETED'
  | 'MODS_REORDERED'
  | 'MOD_UPDATES_CHECKED'
  | 'MOD_MARKED_SYNCED';

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
    INVALID_STEAMCMD_PATH: {
      title: 'Invalid SteamCMD Path',
      description:
        'The configured SteamCMD executable does not exist or lacks execute permissions.',
    },
    STORAGE_PATH_NOT_WRITABLE: {
      title: 'Storage Path Unwritable',
      description: 'The configured path is not writable or cannot be created.',
    },
    STORAGE_PATH_INVALID: {
      title: 'Invalid Storage Path',
      description:
        'The provided storage path is invalid or contains forbidden traversal sequences.',
    },
    INSUFFICIENT_STORAGE_SPACE: {
      title: 'Insufficient Disk Space',
      description: 'The target volume has less than the minimum required storage capacity.',
    },
    INVALID_APP_ID: {
      title: 'Invalid App ID',
      description: 'The provided Steam App ID is invalid or not recognized.',
    },
    INVALID_BRANCH_NAME: {
      title: 'Invalid Branch Name',
      description: 'Branch name contains disallowed characters or formatting.',
    },
    STEAM_USERNAME_REQUIRED: {
      title: 'Username Required',
      description: 'A Steam username must be provided when Dedicated Account mode is selected.',
    },
    VAULT_ENCRYPTION_FAILED: {
      title: 'Encryption Failed',
      description: 'Failed to encrypt credentials using the appliance vault key.',
    },
    VAULT_KEY_UNAVAILABLE: {
      title: 'Vault Key Unavailable',
      description: 'The master vault encryption key is unavailable or failed verification.',
    },
    SESSION_CLEAR_FAILED: {
      title: 'Session Purge Failed',
      description:
        'Could not remove cached session tokens due to a filesystem lock or permission issue.',
    },
    CHALLENGE_NOT_FOUND_OR_EXPIRED: {
      title: 'Challenge Expired',
      description: 'The Steam Guard challenge session was not found or has timed out.',
    },
    CHALLENGE_PROCESS_INVALID: {
      title: 'SteamCMD Process Inactive',
      description: 'The underlying SteamCMD process has terminated or cannot receive input.',
    },
    STEAMCMD_PROCESS_TERMINATED: {
      title: 'Process Terminated',
      description: 'The SteamCMD process was terminated before authentication could finish.',
    },
    TASK_CONCURRENCY_CONFLICT: {
      title: 'Task Conflict',
      description: 'Another SteamCMD operation or diagnostic task is currently active.',
    },
    INTERNAL_SERVER_ERROR: {
      title: 'Internal Server Error',
      description: 'An unexpected error occurred on the server. Please try again.',
    },
    MOD_NOT_FOUND: {
      title: 'Mod Not Found',
      description: 'The requested mod could not be found on this server.',
    },
    MOD_ALREADY_INSTALLED: {
      title: 'Mod Already Installed',
      description: 'Mod "{{identifier}}" is already configured on this server.',
    },
    MOD_REORDER_INVALID: {
      title: 'Invalid Load Order',
      description: 'The submitted mod load order does not match the current server mod list.',
    },
    STEAM_WORKSHOP_INVALID_INPUT: {
      title: 'Invalid Workshop Input',
      description: 'Enter a numeric Workshop ID or a valid steamcommunity.com Workshop URL.',
    },
    STEAM_WORKSHOP_NOT_FOUND: {
      title: 'Workshop Item Not Found',
      description: 'Steam Workshop item "{{workshopId}}" was not found or is private.',
    },
    STEAM_WORKSHOP_API_ERROR: {
      title: 'Steam Workshop Unavailable',
      description: 'Could not retrieve metadata from the Steam Workshop API. Please try again.',
    },
    STEAM_WEB_API_KEY_REQUIRED: {
      title: 'Steam Web API Key Required',
      description: 'Configure a Steam Web API Key in Steam Settings to search the Workshop.',
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
    STEAM_SETTINGS_UPDATED: {
      title: 'Steam Settings Saved',
      description: 'Steam configuration and paths have been updated successfully.',
    },
    STEAM_SESSION_CLEARED: {
      title: 'Session Tokens Cleared',
      description: 'Cached SteamCMD SSFN and VDF credentials have been removed.',
    },
    STEAM_AUTH_SUCCESS: {
      title: 'Steam Account Authenticated',
      description: 'Steam account authenticated successfully.',
    },
    STEAM_CHALLENGE_SUBMITTED: {
      title: 'Challenge Code Submitted',
      description: 'Steam Guard verification code has been submitted to SteamCMD.',
    },
    STEAM_CHALLENGE_ABORTED: {
      title: 'Challenge Aborted',
      description: 'Steam Guard authentication challenge was cancelled.',
    },
    STEAM_DIAGNOSTICS_COMPLETED: {
      title: 'Diagnostics Completed',
      description: 'Steam connection and path diagnostics have finished.',
    },
    MOD_ADDED: {
      title: 'Mod Added',
      description: '"{{name}}" has been added to the server mod list.',
    },
    MODS_BATCH_ADDED: {
      title: 'Mods Imported',
      description: 'Added {{addedCount}} mod(s) to the server ({{skippedCount}} skipped).',
    },
    MOD_UPDATED: {
      title: 'Mod Updated',
      description: 'Configuration for "{{name}}" has been saved.',
    },
    MOD_DELETED: {
      title: 'Mod Removed',
      description: '"{{name}}" has been removed from the server mod list.',
    },
    MODS_REORDERED: {
      title: 'Load Order Saved',
      description: 'Mod load order has been updated.',
    },
    MOD_UPDATES_CHECKED: {
      title: 'Update Check Complete',
      description: 'Checked Steam Workshop metadata. {{count}} update(s) available.',
    },
    MOD_MARKED_SYNCED: {
      title: 'Marked as Synced',
      description: '"{{name}}" is now marked as up to date.',
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
