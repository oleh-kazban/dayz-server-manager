import { createContext, useContext } from 'react';

import { DEFAULT_MODULE_FLAGS, type ModuleFlags } from './feature-flags.types';

export interface FeatureFlagsContextValue {
  flags: ModuleFlags;
  isEnabled: (flag: keyof ModuleFlags) => boolean;
}

export const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    return {
      flags: DEFAULT_MODULE_FLAGS,
      isEnabled: (flag: keyof ModuleFlags) => Boolean(DEFAULT_MODULE_FLAGS[flag]),
    };
  }
  return context;
}

export function useFeatureFlag(flag: keyof ModuleFlags): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flag);
}
