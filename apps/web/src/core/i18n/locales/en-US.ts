import type {
  ApiErrorCode,
  ServerExitReason,
  ServerFsIssueCode,
  ServerStatus,
} from '@aegis/api-contracts';

export type NotificationCode =
  | 'SERVER_CREATED'
  | 'SERVER_UPDATED'
  | 'SERVER_DELETED'
  | 'SERVER_START_REQUESTED'
  | 'SERVER_FORCE_STOPPED'
  | 'SERVER_STOP_REQUESTED'
  | 'SERVER_STOP_SCHEDULED'
  | 'SERVER_STOP_CANCELLED'
  | 'SERVER_RESTART_REQUESTED'
  | 'SERVER_RESTART_SCHEDULED'
  | 'SERVER_RESTART_CANCELLED'
  | 'STEAM_SETTINGS_UPDATED'
  | 'STEAM_SESSION_CLEARED'
  | 'STEAM_AUTH_SUCCESS'
  | 'STEAM_CHALLENGE_SUBMITTED'
  | 'STEAM_CHALLENGE_ABORTED'
  | 'STEAM_DIAGNOSTICS_COMPLETED'
  | 'MOD_ADDED'
  | 'MODS_BATCH_ADDED'
  | 'MODS_PRESET_REPLACED'
  | 'MOD_UPDATED'
  | 'MOD_DELETED'
  | 'MODS_REORDERED'
  | 'MOD_UPDATES_CHECKED'
  | 'MOD_MARKED_SYNCED'
  | 'MOD_ENABLED'
  | 'MOD_DISABLED'
  | 'MOD_PRESET_EXPORTED'
  | 'SERVER_CONFIG_SAVED'
  | 'SERVER_CONFIG_CREATED'
  | 'SERVER_CONFIG_RESTORED'
  | 'PROFILE_UPDATED'
  | 'PASSWORD_ROTATED'
  | 'SESSION_REVOKED'
  | 'OTHER_SESSIONS_REVOKED'
  | 'CURRENT_SESSION_REVOKED';

export interface ToastTranslationEntry {
  title: string;
  description: string;
}

export interface TranslationCatalog {
  errors: Record<ApiErrorCode, ToastTranslationEntry>;
  validation: Record<string, string>;
  notifications: Record<NotificationCode, ToastTranslationEntry>;
  serverStatus: Record<ServerStatus, string>;
  serverExitReason: Record<ServerExitReason, string>;
  serverFsIssues: Record<ServerFsIssueCode, string>;
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
    AUTH_SSE_TICKET_INVALID: {
      title: 'Live Updates Unavailable',
      description: 'The live updates connection was refused. It reconnects automatically.',
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
    AUTH_FORBIDDEN_ROOT_REQUIRED: {
      title: 'Access Denied',
      description: 'Only the root account can perform this action.',
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
      description:
        'Cannot modify server configuration, ports, credentials, or file paths while "{{name}}" is {{status}}.',
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
    CONFIG_PATH_INVALID: {
      title: 'Invalid Config Path',
      description:
        'One or more configuration paths failed containment checks or point to a symlink.',
    },
    CONFIG_WRITE_FAILED: {
      title: 'Config Write Failed',
      description:
        'Unable to atomically write DayZ configuration files to disk. Check filesystem permissions.',
    },
    CONFIG_BACKUP_FAILED: {
      title: 'Config Backup Failed',
      description:
        'Pre-commit backup failed before modifying configuration files. Disk files remain untouched.',
    },
    CONFIG_RCON_PASSWORD_REQUIRED: {
      title: 'RCON Password Required',
      description: 'Configure a BattlEye RCON password before generating the BattlEye RCON file.',
    },
    CONFIG_EDIT_LOCKED: {
      title: 'Configuration Being Edited',
      description: 'serverDZ.cfg is being edited by {{holderName}}. Try again when they finish.',
    },
    CONFIG_LOCK_NOT_HELD: {
      title: 'Edit Lock Lost',
      description:
        'This editor no longer holds the serverDZ.cfg edit lock. Your changes were not written.',
    },
    CONFIG_HASH_MISMATCH: {
      title: 'File Changed on Disk',
      description:
        'serverDZ.cfg was modified after it was loaded. Reload the file before writing again.',
    },
    CONFIG_VALIDATION_FAILED: {
      title: 'Configuration Invalid',
      description: '{{errorCount}} error(s) block saving. Line {{firstLine}}: {{firstMessage}}',
    },
    CONFIG_FILE_TOO_LARGE: {
      title: 'Configuration Too Large',
      description: 'serverDZ.cfg must not exceed 64 KB.',
    },
    CONFIG_FILE_EXISTS: {
      title: 'Configuration Already Exists',
      description: 'serverDZ.cfg already exists. Reload to edit the existing file.',
    },
    CONFIG_FILE_MISSING: {
      title: 'Configuration Missing',
      description: 'serverDZ.cfg does not exist. Create it from the template first.',
    },
    CONFIG_REVISION_NOT_FOUND: {
      title: 'Revision Not Found',
      description: 'The selected serverDZ.cfg revision no longer exists.',
    },
    SERVER_CONFIG_EDIT_IN_PROGRESS: {
      title: 'Configuration Being Edited',
      description: 'serverDZ.cfg is being edited by {{holderName}}. Wait until editing ends.',
    },
    SERVER_ALREADY_RUNNING: {
      title: 'Server Already Running',
      description: '"{{name}}" is already running.',
    },
    SERVER_TRANSITION_IN_PROGRESS: {
      title: 'Server Busy',
      description: '"{{name}}" is {{status}}. Wait until it finishes.',
    },
    SERVER_NOT_RUNNING: {
      title: 'Server Not Running',
      description: '"{{name}}" has no running process to stop.',
    },
    SERVER_LAUNCH_NOT_READY: {
      title: 'Cannot Start Server',
      description: '{{reason}}',
    },
    SERVER_START_FAILED: {
      title: 'Server Failed to Start',
      description: '{{reason}}',
    },
    SERVER_STOP_FAILED: {
      title: 'Server Failed to Stop',
      description: '{{reason}}',
    },
    SERVER_LOG_FILE_INVALID: {
      title: 'Invalid Log File',
      description: 'The requested log file is not an .RPT file in the profiles directory.',
    },
    SERVER_LOG_NOT_FOUND: {
      title: 'Log File Not Found',
      description: 'The log file "{{file}}" no longer exists for "{{name}}".',
    },
    SERVER_STOP_ALREADY_PENDING: {
      title: 'Stop Already Scheduled',
      description:
        'A stop is already scheduled for "{{name}}". Cancel it before scheduling another.',
    },
    SERVER_STOP_NOT_PENDING: {
      title: 'No Scheduled Stop',
      description: '"{{name}}" has no scheduled stop to cancel.',
    },
    SERVER_RCON_NOT_CONFIGURED: {
      title: 'RCON Not Configured',
      description:
        '"{{name}}" has no BattlEye RCON password, so it cannot be stopped safely. Set one in Server Settings or use force-stop.',
    },
    SERVER_RCON_UNREACHABLE: {
      title: 'RCON Unreachable',
      description:
        'Could not reach BattlEye RCON for "{{name}}" ({{reason}}). Nothing was stopped; force-stop is still available.',
    },
    SERVER_RCON_LOGIN_FAILED: {
      title: 'RCON Login Failed',
      description:
        'BattlEye rejected the RCON password for "{{name}}". Nothing was stopped; check the RCON password or use force-stop.',
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
    // Steam path checks run on the host; the server message names the exact problem and path.
    INVALID_STEAMCMD_PATH: '{{message}}',
    STORAGE_PATH_INVALID: '{{message}}',
    STORAGE_PATH_NOT_WRITABLE: '{{message}}',
    INSUFFICIENT_STORAGE_SPACE: '{{message}}',
    AUTH_PASSWORD_MISMATCH: 'Current password is incorrect.',
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
    SERVER_CONFIG_SAVED: {
      title: 'serverDZ.cfg Saved',
      description: 'serverDZ.cfg for "{{name}}" was validated and written to disk.',
    },
    SERVER_CONFIG_CREATED: {
      title: 'serverDZ.cfg Created',
      description: 'serverDZ.cfg for "{{name}}" was created from the DSM template.',
    },
    SERVER_CONFIG_RESTORED: {
      title: 'Revision Restored',
      description: 'The selected revision of serverDZ.cfg for "{{name}}" was written to disk.',
    },
    SERVER_DELETED: {
      title: 'Server Deleted',
      description: 'Server "{{name}}" has been removed from DayZ Server Manager.',
    },
    SERVER_START_REQUESTED: {
      title: 'Server Starting',
      description: '"{{name}}" is starting. Its status updates live.',
    },
    SERVER_STOP_REQUESTED: {
      title: 'Server Stopping',
      description: '"{{name}}" is saving the world and shutting down. Its status updates live.',
    },
    SERVER_STOP_SCHEDULED: {
      title: 'Stop Scheduled',
      description: '"{{name}}" stops at {{time}}. Players have been warned.',
    },
    SERVER_STOP_CANCELLED: {
      title: 'Scheduled Stop Cancelled',
      description: '"{{name}}" keeps running. Players have been told.',
    },
    SERVER_RESTART_REQUESTED: {
      title: 'Server Restarting',
      description:
        '"{{name}}" is saving the world and starts again once it has stopped. Its status updates live.',
    },
    SERVER_RESTART_SCHEDULED: {
      title: 'Restart Scheduled',
      description: '"{{name}}" restarts at {{time}}. Players have been warned.',
    },
    SERVER_RESTART_CANCELLED: {
      title: 'Scheduled Restart Cancelled',
      description: '"{{name}}" keeps running. Players have been told.',
    },
    SERVER_FORCE_STOPPED: {
      title: 'Server Force-Stopped',
      description: '"{{name}}" was killed. Progress since its last save was not kept.',
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
    MODS_PRESET_REPLACED: {
      title: 'Workshop Mods Replaced',
      description:
        'Added {{addedCount}}, kept {{keptCount}} and removed {{removedCount}} Workshop mod(s).',
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
    MOD_ENABLED: {
      title: 'Mod Enabled',
      description: '"{{name}}" is now enabled for server launch.',
    },
    MOD_DISABLED: {
      title: 'Mod Disabled',
      description: '"{{name}}" has been disabled.',
    },
    MOD_PRESET_EXPORTED: {
      title: 'Preset Exported',
      description: 'Exported {{count}} mod(s) to {{filename}}.',
    },
    PROFILE_UPDATED: {
      title: 'Profile Updated',
      description: 'Your identity and regional preferences have been saved.',
    },
    PASSWORD_ROTATED: {
      title: 'Password Rotated',
      description: 'Your password was updated and all other active sessions have been invalidated.',
    },
    SESSION_REVOKED: {
      title: 'Session Terminated',
      description: 'The device session has been revoked.',
    },
    OTHER_SESSIONS_REVOKED: {
      title: 'Sessions Terminated',
      description: 'Terminated {{count}} other session(s).',
    },
    CURRENT_SESSION_REVOKED: {
      title: 'Signed Out',
      description: 'Your current session was terminated.',
    },
  },
  serverStatus: {
    running: 'Running',
    starting: 'Starting',
    stopping: 'Stopping',
    stopped: 'Stopped',
    failed: 'Failed',
  },
  serverExitReason: {
    start_failed: 'Failed to start',
    crashed: 'Crashed',
    exited_while_offline: 'Exited while DSM was offline',
    force_stopped: 'Force-stopped',
    stopped: 'Stopped via RCON',
    shutdown_timeout: 'Killed after shutdown timeout',
  },
  serverFsIssues: {
    PATH_LEXICAL_INVALID:
      'Path contains invalid characters, traversal sequences (..), or exceeds length limits.',
    PATH_PLATFORM_MISMATCH: 'Path format does not match the host operating system platform.',
    INSTALL_PATH_NOT_ABSOLUTE: 'Installation path must be an absolute filesystem path.',
    INSTALL_DIR_MISSING:
      'Server installation directory does not exist or is not accessible on the host.',
    INSTALL_PATH_NOT_DIRECTORY: 'Server installation path points to a file instead of a directory.',
    EXECUTABLE_MISSING:
      'DayZ dedicated server executable was not found in the installation directory.',
    EXECUTABLE_NOT_FILE: 'DayZ server executable path is not a regular file.',
    EXECUTABLE_NOT_EXECUTABLE: 'DayZ server binary lacks execute permissions for the DSM service.',
    PROFILE_PATH_NOT_RELATIVE:
      'Profile path must be relative to the installation directory (e.g. profiles).',
    PROFILE_SYMLINK_ESCAPE: 'Profile path resolves outside the installation directory.',
    PROFILE_DIR_MISSING: 'Profile directory does not exist on the host filesystem.',
    PROFILE_PATH_NOT_DIRECTORY: 'Profile path points to a file instead of a directory.',
    PROFILE_DIR_NOT_WRITABLE: 'Profile directory is not writable by the DSM service.',
    BATTLEYE_DIR_MISSING: 'BattlEye directory does not exist yet under the profile directory.',
    BATTLEYE_PATH_NOT_DIRECTORY:
      'BattlEye path exists inside the profile directory but is not a directory.',
    BATTLEYE_DIR_NOT_WRITABLE: 'BattlEye directory is not writable by the DSM service.',
    MPMISSIONS_DIR_MISSING: 'No mpmissions directory was found inside the installation directory.',
    MPMISSIONS_PATH_NOT_DIRECTORY:
      'The mpmissions path inside the installation directory is not a directory.',
    MISSION_PATH_NOT_RELATIVE:
      'Mission path must be relative to the installation directory (e.g. mpmissions\\dayzOffline.chernarusplus).',
    MISSION_DIR_MISSING: 'Configured mission directory does not exist on the host filesystem.',
    MISSION_PATH_NOT_DIRECTORY: 'Configured mission path points to a file instead of a directory.',
    MISSION_SYMLINK_ESCAPE:
      'Mission path resolves outside the permitted DayZ installation directory.',
    MISSION_INIT_SCRIPT_MISSING: 'Mission directory is missing the required init.c entry script.',
    MISSION_ECONOMY_DB_MISSING: 'Mission directory is missing a db/ Central Economy subdirectory.',
  },
};
