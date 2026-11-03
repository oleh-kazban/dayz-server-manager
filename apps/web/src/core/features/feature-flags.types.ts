export interface ModuleFlags {
  worldMap: boolean;
  economyWorkbench: boolean;
  modsManager: boolean;
  discordNotifications: boolean;
  multiServerFleet: boolean;
  combatForensics: boolean;
}

export const DEFAULT_MODULE_FLAGS: ModuleFlags = {
  worldMap: true,
  economyWorkbench: true,
  modsManager: true,
  discordNotifications: true,
  multiServerFleet: true,
  combatForensics: false,
};
