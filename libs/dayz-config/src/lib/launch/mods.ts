import {
  type LaunchModContextDto,
  MOD_LOAD_TARGET,
  type ModLoadTarget,
} from '@aegis/api-contracts';

export interface LaunchModSource {
  enabled: boolean;
  loadTarget: ModLoadTarget;
  folderName: string;
  loadOrder: number;
}

/**
 * Collects the folders of enabled mods in load order: `client_server` → `-mod=`,
 * `server_only` → `-serverMod=`. `client_optional` mods are never loaded by the server.
 */
export function collectModLaunchFolders(mods: readonly LaunchModSource[]): LaunchModContextDto {
  const ordered = [...mods].sort((a, b) => a.loadOrder - b.loadOrder);
  const modFolders: string[] = [];
  const serverModFolders: string[] = [];
  let missingFolderCount = 0;

  for (const mod of ordered) {
    if (!mod.enabled || mod.loadTarget === MOD_LOAD_TARGET.CLIENT_OPTIONAL) {
      continue;
    }

    const folder = mod.folderName.trim();
    if (!folder) {
      missingFolderCount += 1;
      continue;
    }

    if (mod.loadTarget === MOD_LOAD_TARGET.CLIENT_SERVER) {
      modFolders.push(folder);
    } else {
      serverModFolders.push(folder);
    }
  }

  return { modFolders, serverModFolders, missingFolderCount };
}

export function formatModFlags(
  context: Pick<LaunchModContextDto, 'modFolders' | 'serverModFolders'>,
): {
  modFlag: string;
  serverModFlag: string;
} {
  return {
    modFlag: context.modFolders.length > 0 ? `-mod=${context.modFolders.join(';')}` : '',
    serverModFlag:
      context.serverModFolders.length > 0 ? `-serverMod=${context.serverModFolders.join(';')}` : '',
  };
}
