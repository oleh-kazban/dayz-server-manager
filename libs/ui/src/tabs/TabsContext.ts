import { createContext, type MutableRefObject, useContext } from 'react';

import type { TabsVariant } from './Tabs.types';

export interface TabsContextValue {
  activeValue: string;
  setActiveValue: (value: string) => void;
  variant: TabsVariant;
  fullWidth: boolean;
  baseId: string;
  tabRefs: MutableRefObject<Map<string, HTMLButtonElement | null>>;
  orderedTabValues: MutableRefObject<string[]>;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound subcomponents must be rendered within a <Tabs> parent.');
  }
  return context;
}
