import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, Edit3, PackageSearch, Trash2 } from 'lucide-react';

import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { Tag, type TagColor } from '../tag';

import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from './Table';
import { TableBulkActions } from './TableBulkActions';

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

export const CentralEconomyWorkbench: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['ak101', 'ak74', 'akm']);
    const [sortCol, setSortCol] = useState<'name' | 'nominal'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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
      <div className="space-y-0 w-full max-w-5xl">
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

        <Table>
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
              <TableHead
                sortDirection={sortCol === 'name' ? sortDir : false}
                onSort={() => handleSort('name')}
              >
                Classname
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead
                align="right"
                sortDirection={sortCol === 'nominal' ? sortDir : false}
                onSort={() => handleSort('nominal')}
              >
                Nominal
              </TableHead>
              <TableHead align="right">Min</TableHead>
              <TableHead align="right">Lifetime (s)</TableHead>
              <TableHead align="right">Restock (s)</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
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
                  <TableCell>
                    <Tag color={item.categoryColor}>{item.category}</Tag>
                  </TableCell>
                  <TableCell align="right" className="font-mono">
                    {item.nominal}
                  </TableCell>
                  <TableCell align="right" className="font-mono">
                    {item.min}
                  </TableCell>
                  <TableCell align="right" className="font-mono">
                    {item.lifetime.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" className="font-mono">
                    {item.restock.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-[var(--color-text-muted)]">
                    {item.quantity}
                  </TableCell>
                  <TableCell>{item.usage}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-[var(--color-status-success)] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                      {item.status}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
