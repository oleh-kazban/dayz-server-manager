import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ArrowUpDown,
  ChevronDown,
  Copy,
  Edit3,
  Menu,
  MoreHorizontal,
  PackageSearch,
  Plus,
  Rows3,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';

import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { Pagination } from '../pagination';
import { TabList, Tabs, TabTrigger } from '../tabs';
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
    lifetime: 28800,
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
    id: 'ammo_545',
    name: 'Ammo_545x39',
    category: 'Ammunition',
    categoryColor: 'amber',
    nominal: 100,
    min: 50,
    lifetime: 14400,
    restock: 0,
    quantity: '20-100%',
    usage: 'Military',
    status: 'Active',
  },
  {
    id: 'ammo_556',
    name: 'Ammo_556x45',
    category: 'Ammunition',
    categoryColor: 'amber',
    nominal: 100,
    min: 50,
    lifetime: 14400,
    restock: 0,
    quantity: '20-100%',
    usage: 'Military',
    status: 'Active',
  },
  {
    id: 'ammo_762',
    name: 'Ammo_762x39',
    category: 'Ammunition',
    categoryColor: 'amber',
    nominal: 90,
    min: 45,
    lifetime: 14400,
    restock: 0,
    quantity: '20-100%',
    usage: 'Military',
    status: 'Active',
  },
  {
    id: 'ammo_9x19',
    name: 'Ammo_9x19',
    category: 'Ammunition',
    categoryColor: 'amber',
    nominal: 120,
    min: 60,
    lifetime: 14400,
    restock: 0,
    quantity: '20-100%',
    usage: 'Police',
    status: 'Active',
  },
  {
    id: 'apple',
    name: 'Apple',
    category: 'Food',
    categoryColor: 'emerald',
    nominal: 50,
    min: 25,
    lifetime: 7200,
    restock: 0,
    quantity: '—',
    usage: 'Orchard',
    status: 'Active',
  },
  {
    id: 'assaultbag',
    name: 'AssaultBag_Black',
    category: 'Clothing',
    categoryColor: 'purple',
    nominal: 20,
    min: 10,
    lifetime: 14400,
    restock: 0,
    quantity: '—',
    usage: 'Military',
    status: 'Active',
  },
  {
    id: 'bandage',
    name: 'BandageDressing',
    category: 'Medical',
    categoryColor: 'teal',
    nominal: 60,
    min: 30,
    lifetime: 7200,
    restock: 0,
    quantity: '100%',
    usage: 'Medic',
    status: 'Active',
  },
  {
    id: 'barbedwire',
    name: 'BarbedWire',
    category: 'Tools',
    categoryColor: 'blue',
    nominal: 35,
    min: 15,
    lifetime: 14400,
    restock: 0,
    quantity: '—',
    usage: 'Industrial',
    status: 'Active',
  },
  {
    id: 'barrel_blue',
    name: 'Barrel_Blue',
    category: 'Containers',
    categoryColor: 'cyan',
    nominal: 25,
    min: 15,
    lifetime: 3888000,
    restock: 0,
    quantity: '—',
    usage: 'Industrial',
    status: 'Active',
  },
  {
    id: 'battery9v',
    name: 'Battery9V',
    category: 'Electronics',
    categoryColor: 'gray',
    nominal: 0,
    min: 0,
    lifetime: 7200,
    restock: 0,
    quantity: '50-100%',
    usage: 'Town',
    status: 'Disabled',
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
  { id: 'tier', label: 'Tier', isVisible: false },
  { id: 'flags', label: 'Flags', isVisible: false },
  { id: 'cost', label: 'Cost', isVisible: false },
];

export const CentralEconomyWorkbench: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('all');
    const [selectedIds, setSelectedIds] = useState<string[]>(['ak101', 'ak74', 'akm']);
    const [sortCol, setSortCol] = useState<'name' | 'nominal'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [density, setDensity] = useState<TableDensity>('comfortable');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
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
      <div className="w-full max-w-6xl mx-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden font-sans">
        {/* Layer 1: Header Tabs & Action Buttons */}
        <div className="flex items-end justify-between px-5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            variant="underline"
            containerClassName="flex items-end"
          >
            <TabList bordered={false} className="gap-8">
              <TabTrigger value="all" count="1,248" className="py-3.5">
                All items
              </TabTrigger>
              <TabTrigger value="modified" count="24" className="py-3.5">
                Modified
              </TabTrigger>
              <TabTrigger value="warnings" count="3" className="py-3.5">
                Warnings
              </TabTrigger>
            </TabList>
          </Tabs>

          <div className="flex items-center gap-2.5 py-2.5 self-center">
            <Button variant="secondary" className="h-8 px-3 text-xs font-medium">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Import XML
            </Button>
            <Button variant="primary" className="h-8 px-3 text-xs font-medium">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add item
            </Button>
          </div>
        </div>

        {/* Layer 2: Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[var(--color-surface)]">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input with ⌘ F badge */}
            <div className="relative flex items-center min-w-[240px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 text-[var(--color-text-muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search by classname..."
                className="w-full pl-8 pr-11 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/40 hover:bg-[var(--color-surface-subtle)]/60 focus:bg-[var(--color-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] transition-colors"
              />
              <span className="absolute right-2 px-1.5 py-0.5 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] select-none">
                ⌘ F
              </span>
            </div>

            {/* Filter Dropdowns */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              All categories <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              All usages <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              All statuses <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3 text-[var(--color-text-muted)]" /> More filters
            </button>
          </div>

          {/* Column Toggler */}
          <TableColumnVisibility
            columns={columns}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            onReset={handleResetColumns}
          />
        </div>

        {/* Layer 3: Toolbar / Meta Info Row */}
        <div className="flex items-center justify-between px-5 pb-3 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-4">
            <span className="font-medium text-[var(--color-text-secondary)]">1,248 items</span>
            <span className="flex items-center gap-1 text-[var(--color-primary)] font-medium">
              <ArrowUpDown className="w-3 h-3 shrink-0" /> Classname: A → Z
            </span>
            <div className="flex items-center gap-2">
              <span>Density</span>
              <div className="inline-flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <button
                  type="button"
                  onClick={() => setDensity('comfortable')}
                  aria-label="Comfortable density"
                  className={`p-1 rounded transition-colors ${
                    density === 'comfortable'
                      ? 'bg-[var(--color-surface-subtle)] text-[var(--color-primary)] font-semibold shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <Rows3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  aria-label="Compact density"
                  className={`p-1 rounded transition-colors ${
                    density === 'compact'
                      ? 'bg-[var(--color-surface-subtle)] text-[var(--color-primary)] font-semibold shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <Menu className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Layer 4: Bulk Actions Bar (Flush above table) */}
        {selectedIds.length > 0 && (
          <TableBulkActions
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
          >
            <Button
              variant="ghost"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              className="h-7 px-2 text-xs text-[var(--color-primary)] font-medium"
            >
              Bulk edit
            </Button>
            <Button
              variant="ghost"
              leftIcon={<Copy className="w-3.5 h-3.5" />}
              className="h-7 px-2 text-xs text-[var(--color-primary)] font-medium"
            >
              Duplicate
            </Button>
            <Button
              variant="ghost"
              destructive
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="h-7 px-2 text-xs font-medium"
            >
              Delete
            </Button>
          </TableBulkActions>
        )}

        {/* Layer 5: Embedded Table */}
        <Table variant="embedded" density={density}>
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
              <TableHead className="w-20" aria-label="Row actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {SAMPLE_ITEMS.map(item => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <TableRow key={item.id} isSelected={isSelected} className="group">
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
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium ${
                          item.status === 'Active'
                            ? 'text-[var(--color-status-success)]'
                            : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        {item.status}
                      </span>
                    </TableCell>
                  )}
                  {/* Row Actions on Hover */}
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        aria-label="Edit item"
                        className="p-1 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Duplicate item"
                        className="p-1 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="More options"
                        className="p-1 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Layer 6: Footer with Item Range, Legend & Pagination (Single flush line) */}
        <Pagination
          className="px-5 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]"
          page={page}
          totalPages={84}
          totalItems={1248}
          pageSize={pageSize}
          pageSizeOptions={[15, 25, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={newSize => {
            setPageSize(newSize);
            setPage(1);
          }}
          formatItemCount={(from, to, total) => (
            <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] select-none">
              <span>
                Showing {from}–{to} of {total.toLocaleString()} items
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                Modified item
              </span>
            </div>
          )}
          showFirstLast
        />
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
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead align="right">Nominal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty
            colSpan={3}
            icon={<PackageSearch className="w-8 h-8 text-[var(--color-text-muted)] opacity-50" />}
            title="No items found"
            description="Try adjusting your search criteria or resetting column filters."
            action={<Button variant="secondary">Reset Filters</Button>}
          />
        </TableBody>
      </Table>
    </div>
  ),
};
