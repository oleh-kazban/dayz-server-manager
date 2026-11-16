import {
  type LaunchCommandPreviewDto,
  launchCommandPreviewSchema,
  type LaunchOptionsDto,
  launchOptionsSchema,
  type LaunchPlatform,
} from '@aegis/api-contracts';
import type { Server, ServerMod } from '@aegis/database';
import { collectModLaunchFolders, compileLaunchCommand } from '@aegis/dayz-config';

/** DayZ ships Windows and Linux dedicated servers only; every non-Windows host is treated as Linux. */
export function resolveLaunchPlatform(
  platform: NodeJS.Platform = process.platform,
): LaunchPlatform {
  return platform === 'win32' ? 'win32' : 'linux';
}

/** Stored launch options normalised through the contract (rows predating a key get its default). */
export function readLaunchOptions(server: Pick<Server, 'launchOptions'>): LaunchOptionsDto {
  return launchOptionsSchema.parse(server.launchOptions ?? {});
}

export function areLaunchOptionsEqual(a: LaunchOptionsDto, b: LaunchOptionsDto): boolean {
  return (Object.keys(a) as (keyof LaunchOptionsDto)[]).every(key => a[key] === b[key]);
}

/**
 * Builds the launch execution contract (DSM-00125) for a server's saved state. The process
 * supervisor (DSM-00113) must use the returned `command` as-is:
 * `spawn(command.executable, command.args, { cwd: command.cwd, shell: false })`,
 * refusing to start when `command.ready` is false.
 */
export function buildLaunchCommandPreview(
  server: Pick<Server, 'id' | 'installPath' | 'profilePath' | 'gamePort' | 'launchOptions'>,
  mods: readonly Pick<ServerMod, 'enabled' | 'loadTarget' | 'folderName' | 'loadOrder'>[],
  platform: LaunchPlatform = resolveLaunchPlatform(),
): LaunchCommandPreviewDto {
  const modContext = collectModLaunchFolders(mods);
  const command = compileLaunchCommand({
    platform,
    installPath: server.installPath,
    profilePath: server.profilePath,
    gamePort: server.gamePort,
    launchOptions: readLaunchOptions(server),
    mods: modContext,
  });

  return launchCommandPreviewSchema.parse({
    serverId: server.id,
    platform,
    mods: modContext,
    command,
  });
}
