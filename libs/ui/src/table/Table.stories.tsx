import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, Edit3, PackageSearch, Trash2 } from 'lucide-react';

import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { Pagination } from '../pagination';
import { Tag, type TagColor } from '../tag';

import { TableBulkActions } from './TableBulkActions';
import {
  Table,
  TableBody,
  TableCell,
  type TableColumnItem,
  TableColumnVisibility,
  type TableDensity,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from './';

const meta: Meta<typeof Table> = {
  title: 'Data Display/Table',
  component: Table,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Table>;

interface EconomyItem {
  id: string;
  name: string;
  category: string;
  categoryColor: TagColor;
  nominal: number;
  min: number;
  lifetime: number;
  restock: number;
  quantity: string;
  usage: string;
  status: 'Active' | 'Disabled';
  isModified?: boolean;
}

const SAMPLE_ITEMS: EconomyItem[] = [
  {
    id: 'ak101',
    name: 'AK101',
    category: 'Weapons',
    categoryColor: 'rose',
    nominal: 8,
    min: 5,
    lifetime: 28800,
    restock: 1800,
    quantity: '—',
    usage: 'Military',
    status: 'Active',
    isModified: true,
  },
  {
    id: 'ak74',
    name: 'AK74',
    category: 'Weapons',
    categoryColor: 'rose',
    nominal: 10,
    min: 5,
    lifetime: 28800,
    restock: 1800,
    quantity: '—',
    usage: 'Military',
    status: 'Active',
    isModified: true,
  },
  {
    id: 'akm',
    name: 'AKM',
    category: 'Weapons',
    categoryColor: 'rose',
    nominal: 5,
    min: 2,
    lifetime: 20000,
    restock: 3600,
    quantity: '—',
    usage: 'Military',
    status: 'Active',
    isModified: true,
  },
  {
    id: 'alicebag',
    name: 'AliceBag_Black',
    category: 'Clothing',
    categoryColor: 'purple',
    nominal: 15,
    min: 8,
    lifetime: 14400,
    restock: 0,
    quantity: '—',
    usage: 'Military',
    status: 'Active',
  },
  {
    id: 'ammo_308',
    name: 'Ammo_308Win',
    category: 'Ammunition',
    categoryColor: 'amber',
    nominal: 80,
    min: 40,
    lifetime: 14400,
    restock: 0,
    quantity: '20-100%',
    usage: 'Hunting',
    status: 'Active',
  },
  {
    id: 'bandage',
    name: 'BandageDressing',
    category: 'Medical',
    categoryColor: 'emerald',
    nominal: 60,
    min: 30,
    lifetime: 7200,
    restock: 0,
    quantity: '100%',
    usage: 'Medic',
    status: 'Active',
  },
];

const INITIAL_COLUMNS: TableColumnItem[] = [
  { id: 'name', label: 'Classname', isVisible: true, canHide: false },
  { id: 'category', label: 'Category', isVisible: true },
  { id: 'nominal', label: 'Nominal', isVisible: true },
  { id: 'min', label: 'Min', isVisible: true },
  { id: 'lifetime', label: 'Lifetime', isVisible: true },
  { id: 'restock', label: 'Restock', isVisible: true },
  { id: 'quantity', label: 'Quantity', isVisible: true },
  { id: 'usage', label: 'Usage', isVisible: true },
  { id: 'status', label: 'Status', isVisible: true },
];

export const CentralEconomyWorkbench: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['ak101', 'ak74', 'akm']);
    const [sortCol, setSortCol] = useState<'name' | 'nominal'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [density, setDensity] = useState<TableDensity>('comfortable');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [columns, setColumns] = useState<TableColumnItem[]>(INITIAL_COLUMNS);

    const isColVisible = (id: string) => columns.find(c => c.id === id)?.isVisible ?? true;

    const handleColumnVisibilityChange = (columnId: string, isVisible: boolean) => {
      setColumns(prev => prev.map(col => (col.id === columnId ? { ...col, isVisible } : col)));
    };

    const handleResetColumns = () => setColumns(INITIAL_COLUMNS);

    const allSelected = selectedIds.length === SAMPLE_ITEMS.length;
    const isIndeterminate = selectedIds.length > 0 && !allSelected;

    const handleSelectAll = () => {
      if (allSelected) {
        setSelectedIds([]);
      } else {
        setSelectedIds(SAMPLE_ITEMS.map(i => i.id));
      }
    };

    const toggleRow = (id: string) => {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
      );
    };

    const handleSort = (col: 'name' | 'nominal') => {
      if (sortCol === col) {
        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortCol(col);
        setSortDir('asc');
      }
    };

    return (
      <div className="space-y-3 w-full max-w-5xl">
        {/* Table Toolbar matching Editor.png */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--color-text-muted)] font-medium">
            Central Economy Items ({SAMPLE_ITEMS.length})
          </div>
          <div className="flex items-center gap-2">
            {/* Density Toggle */}
            <div className="flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-surface)]">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  density === 'comfortable'
                    ? 'bg-[var(--color-surface-subtle)] text-[var(--color-text-main)] font-semibold shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  density === 'compact'
                    ? 'bg-[var(--color-surface-subtle)] text-[var(--color-text-main)] font-semibold shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                Compact
              </button>
            </div>

            {/* Column Visibility Control */}
            <TableColumnVisibility
              columns={columns}
              onColumnVisibilityChange={handleColumnVisibilityChange}
              onReset={handleResetColumns}
            />
          </div>
        </div>

        {/* Bulk Action Bar */}
        <TableBulkActions
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
        >
          <Button variant="ghost" className="h-7 px-2 text-xs text-[var(--color-primary)]">
            <Edit3 className="w-3.5 h-3.5 mr-1" /> Bulk edit
          </Button>
          <Button variant="ghost" className="h-7 px-2 text-xs text-[var(--color-primary)]">
            <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
          </Button>
          <Button variant="ghost" className="h-7 px-2 text-xs text-[var(--color-status-danger)]">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        </TableBulkActions>

        {/* Table */}
        <Table density={density}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                />
              </TableHead>
              {isColVisible('name') && (
                <TableHead
                  sortDirection={sortCol === 'name' ? sortDir : false}
                  onSort={() => handleSort('name')}
                >
                  Classname
                </TableHead>
              )}
              {isColVisible('category') && <TableHead>Category</TableHead>}
              {isColVisible('nominal') && (
                <TableHead
                  align="right"
                  sortDirection={sortCol === 'nominal' ? sortDir : false}
                  onSort={() => handleSort('nominal')}
                >
                  Nominal
                </TableHead>
              )}
              {isColVisible('min') && <TableHead align="right">Min</TableHead>}
              {isColVisible('lifetime') && <TableHead align="right">Lifetime (s)</TableHead>}
              {isColVisible('restock') && <TableHead align="right">Restock (s)</TableHead>}
              {isColVisible('quantity') && <TableHead>Quantity</TableHead>}
              {isColVisible('usage') && <TableHead>Usage</TableHead>}
              {isColVisible('status') && <TableHead>Status</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {SAMPLE_ITEMS.map(item => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <TableRow key={item.id} isSelected={isSelected}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleRow(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </TableCell>
                  {isColVisible('name') && (
                    <TableCell className="font-mono font-medium">
                      <span className="flex items-center gap-1.5">
                        {item.name}
                        {item.isModified && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                            title="Modified item"
                          />
                        )}
                      </span>
                    </TableCell>
                  )}
                  {isColVisible('category') && (
                    <TableCell>
                      <Tag color={item.categoryColor}>{item.category}</Tag>
                    </TableCell>
                  )}
                  {isColVisible('nominal') && (
                    <TableCell align="right" className="font-mono">
                      {item.nominal}
                    </TableCell>
                  )}
                  {isColVisible('min') && (
                    <TableCell align="right" className="font-mono">
                      {item.min}
                    </TableCell>
                  )}
                  {isColVisible('lifetime') && (
                    <TableCell align="right" className="font-mono">
                      {item.lifetime.toLocaleString()}
                    </TableCell>
                  )}
                  {isColVisible('restock') && (
                    <TableCell align="right" className="font-mono">
                      {item.restock.toLocaleString()}
                    </TableCell>
                  )}
                  {isColVisible('quantity') && (
                    <TableCell className="font-mono text-[var(--color-text-muted)]">
                      {item.quantity}
                    </TableCell>
                  )}
                  {isColVisible('usage') && <TableCell>{item.usage}</TableCell>}
                  {isColVisible('status') && (
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-[var(--color-status-success)] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        {item.status}
                      </span>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination Footer matching Editor.png */}
        <div className="pt-2">
          <Pagination
            page={page}
            totalPages={6}
            totalItems={142}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={newSize => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      </div>
    );
  },
};

export const ColumnVisibilityMenu: Story = {
  render: () => {
    const [cols, setCols] = useState<TableColumnItem[]>(INITIAL_COLUMNS);

    return (
      <div className="p-4 flex items-center justify-start">
        <TableColumnVisibility
          columns={cols}
          onColumnVisibilityChange={(id, isVisible) =>
            setCols(prev => prev.map(c => (c.id === id ? { ...c, isVisible } : c)))
          }
          onReset={() => setCols(INITIAL_COLUMNS)}
        />
      </div>
    );
  },
};

export const CompactDensity: Story = {
  render: () => (
    <div className="w-full max-w-3xl">
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead>Process ID</TableHead>
            <TableHead>Player Bohemia GUID</TableHead>
            <TableHead align="right">Ping</TableHead>
            <TableHead align="right">Session Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">#1</TableCell>
            <TableCell className="font-mono">d41d8cd98f00b204e9800998ecf8427e</TableCell>
            <TableCell align="right" className="font-mono text-emerald-600">
              18 ms
            </TableCell>
            <TableCell align="right">02:45:10</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">#2</TableCell>
            <TableCell className="font-mono">e2fc714c4727ee9395f324cd2e7f331f</TableCell>
            <TableCell align="right" className="font-mono text-amber-600">
              84 ms
            </TableCell>
            <TableCell align="right">00:15:32</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <div className="w-full max-w-3xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Classname</TableHead>
            <TableHead>Category</TableHead>
            <TableHead align="right">Nominal</TableHead>
            <TableHead>Usage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty
            colSpan={4}
            icon={<PackageSearch className="w-6 h-6" />}
            title="No matching item definitions"
            description="No items found matching the current search query or active category filters."
            action={
              <Button variant="secondary" className="h-8 text-xs">
                Clear Filters
              </Button>
            }
          />
        </TableBody>
      </Table>
    </div>
  ),
};
