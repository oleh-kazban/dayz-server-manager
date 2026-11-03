import { type ReactNode, useMemo } from 'react';

import { FeatureFlagsContext, type FeatureFlagsContextValue } from './feature-flags.context';
import { DEFAULT_MODULE_FLAGS, type ModuleFlags } from './feature-flags.types';

export interface FeatureFlagsProviderProps {
  children: ReactNode;
  initialFlags?: Partial<ModuleFlags>;
}

export function FeatureFlagsProvider({ children, initialFlags }: FeatureFlagsProviderProps) {
  const flags = useMemo(
    () => ({
      ...DEFAULT_MODULE_FLAGS,
      ...initialFlags,
    }),
    [initialFlags],
  );

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      flags,
      isEnabled: (flag: keyof ModuleFlags) => Boolean(flags[flag]),
    }),
    [flags],
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}
