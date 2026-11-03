import { createContext, useContext } from 'react';

import { type TableDensity } from './Table.types';

export interface TableContextValue {
  density: TableDensity;
  striped: boolean;
}

export const TableContext = createContext<TableContextValue>({
  density: 'comfortable',
  striped: false,
});

export function useTableContext(): TableContextValue {
  return useContext(TableContext);
}
