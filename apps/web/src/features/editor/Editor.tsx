import {
  ArrowDownAZ,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Copy,
  Download,
  FileCode2,
  GripVertical,
  History,
  LayoutGrid,
  List,
  Lock,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  SquarePen,
  Trash2,
  Upload,
} from 'lucide-react';

import { PageContainer } from '@dsm/components';
import { Button, Tag, type TagColor } from '@dsm/ui';

/* --------------------------------------------------------------------------
   DUMMY PRESENTATION DATA TYPES & CONSTANTS
   Zero business logic - pure presentation markup matching Figma node 23:1938
   -------------------------------------------------------------------------- */

interface ItemRow {
  classname: string;
  category: string;
  categoryTheme:
    | 'weapons'
    | 'clothing'
    | 'ammunition'
    | 'food'
    | 'medical'
    | 'tools'
    | 'containers'
    | 'electronics';
  nominal: number;
  min: number;
  lifetime: string;
  restock: string;
  quantity: string;
  usage: string;
  status?: 'Active' | 'Disabled';
  modified?: boolean;
  selected?: boolean;
}

const ITEMS: ItemRow[] = [
  {
    classname: 'AK101',
    category: 'Weapons',
    categoryTheme: 'weapons',
    nominal: 8,
    min: 5,
    lifetime: '28,800',
    restock: '1,800',
    quantity: '—',
    usage: 'Military',
    modified: true,
    selected: true,
  },
  {
    classname: 'AK74',
    category: 'Weapons',
    categoryTheme: 'weapons',
    nominal: 10,
    min: 5,
    lifetime: '28,800',
    restock: '1,800',
    quantity: '—',
    usage: 'Military',
    modified: true,
    selected: true,
  },
  {
    classname: 'AKM',
    category: 'Weapons',
    categoryTheme: 'weapons',
    nominal: 5,
    min: 2,
    lifetime: '28,800',
    restock: '3,600',
    quantity: '—',
    usage: 'Military',
    modified: true,
    selected: true,
  },
  {
    classname: 'AliceBag_Black',
    category: 'Clothing',
    categoryTheme: 'clothing',
    nominal: 15,
    min: 8,
    lifetime: '14,400',
    restock: '0',
    quantity: '—',
    usage: 'Military',
  },
  {
    classname: 'Ammo_308Win',
    category: 'Ammunition',
    categoryTheme: 'ammunition',
    nominal: 80,
    min: 40,
    lifetime: '14,400',
    restock: '0',
    quantity: '20–100%',
    usage: 'Hunting',
  },
  {
    classname: 'Ammo_545x39',
    category: 'Ammunition',
    categoryTheme: 'ammunition',
    nominal: 100,
    min: 50,
    lifetime: '14,400',
    restock: '0',
    quantity: '20–100%',
    usage: 'Military',
  },
  {
    classname: 'Ammo_556x45',
    category: 'Ammunition',
    categoryTheme: 'ammunition',
    nominal: 100,
    min: 50,
    lifetime: '14,400',
    restock: '0',
    quantity: '20–100%',
    usage: 'Military',
  },
  {
    classname: 'Ammo_762x39',
    category: 'Ammunition',
    categoryTheme: 'ammunition',
    nominal: 90,
    min: 45,
    lifetime: '14,400',
    restock: '0',
    quantity: '20–100%',
    usage: 'Military',
  },
  {
    classname: 'Ammo_9x19',
    category: 'Ammunition',
    categoryTheme: 'ammunition',
    nominal: 120,
    min: 60,
    lifetime: '14,400',
    restock: '0',
    quantity: '20–100%',
    usage: 'Police',
  },
  {
    classname: 'Apple',
    category: 'Food',
    categoryTheme: 'food',
    nominal: 50,
    min: 25,
    lifetime: '7,200',
    restock: '0',
    quantity: '—',
    usage: 'Orchard',
    status: 'Active',
  },
  {
    classname: 'AssaultBag_Black',
    category: 'Clothing',
    categoryTheme: 'clothing',
    nominal: 20,
    min: 10,
    lifetime: '14,400',
    restock: '0',
    quantity: '—',
    usage: 'Military',
    status: 'Active',
  },
  {
    classname: 'BandageDressing',
    category: 'Medical',
    categoryTheme: 'medical',
    nominal: 60,
    min: 30,
    lifetime: '7,200',
    restock: '0',
    quantity: '100%',
    usage: 'Medic',
    status: 'Active',
  },
  {
    classname: 'BarbedWire',
    category: 'Tools',
    categoryTheme: 'tools',
    nominal: 35,
    min: 15,
    lifetime: '14,400',
    restock: '0',
    quantity: '—',
    usage: 'Industrial',
    status: 'Active',
  },
  {
    classname: 'Barrel_Blue',
    category: 'Containers',
    categoryTheme: 'containers',
    nominal: 25,
    min: 15,
    lifetime: '3,888,000',
    restock: '0',
    quantity: '—',
    usage: 'Industrial',
    status: 'Active',
  },
  {
    classname: 'Battery9V',
    category: 'Electronics',
    categoryTheme: 'electronics',
    nominal: 0,
    min: 0,
    lifetime: '7,200',
    restock: '0',
    quantity: '50–100%',
    usage: 'Town',
    status: 'Disabled',
  },
];

const CATEGORY_TAG_COLORS: Record<ItemRow['categoryTheme'], TagColor> = {
  weapons: 'rose',
  clothing: 'purple',
  ammunition: 'amber',
  food: 'emerald',
  medical: 'teal',
  tools: 'sky',
  containers: 'blue',
  electronics: 'cyan',
};

const COLUMNS = [
  { name: 'Classname', visible: true, locked: true },
  { name: 'Category', visible: true },
  { name: 'Nominal', visible: true },
  { name: 'Min', visible: true },
  { name: 'Lifetime', visible: true },
  { name: 'Restock', visible: true },
  { name: 'Quantity', visible: true },
  { name: 'Usage', visible: true },
  { name: 'Status', visible: true },
  { name: 'Tier', visible: false },
  { name: 'Flags', visible: false },
  { name: 'Cost', visible: false },
];

export function Editor() {
  return (
    <PageContainer>
      {/* ----------------------------------------------------------------
          SECTION 1: PAGE INTRODUCTION & TOP ACTIONS
          ---------------------------------------------------------------- */}
      <section aria-labelledby="editor-heading" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              id="editor-heading"
              className="text-2xl sm:text-[27px] font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Types.xml Editor
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
              Fine-tune your loot economy. Every item, every spawn, under control.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button variant="secondary" leftIcon={History}>
              Version history
            </Button>
            <Button variant="secondary" leftIcon={Download}>
              Export XML
            </Button>
            <Button variant="primary" leftIcon={Save}>
              Save changes (8)
            </Button>
          </div>
        </div>

        {/* ----------------------------------------------------------------
            SECTION 2: SERVER FILE CONTEXT HERO BANNER
            ---------------------------------------------------------------- */}
        <div className="relative rounded-2xl overflow-hidden min-h-[148px] p-6 sm:p-7 flex flex-col justify-between shadow-[var(--shadow-card)] border border-[#203b50]/20 bg-[#142534]">
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: "url('/assets/images/misty-chernarus-bg.jpg')" }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, rgba(16, 29, 41, 0.92) 0%, rgba(20, 37, 52, 0.82) 50%, rgba(14, 25, 36, 0.94) 100%)',
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left Server & File Metadata */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-tight">
                  Chernarus Survival
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 backdrop-blur-md border border-emerald-500/30 text-[10px] font-medium text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <FileCode2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  mpmissions / dayzOffline.chernarusplus / db / types.xml
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                DayZ 1.26 · Last published today at 14:24 by Alex Kovac
              </p>
            </div>

            {/* Right Quick Telemetry Counters & Validation Badge */}
            <div className="flex items-center gap-6 sm:gap-8 shrink-0 flex-wrap">
              <div className="space-y-0.5">
                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  1,248
                </div>
                <div className="text-[11px] font-medium text-slate-400">Item types</div>
              </div>

              <div className="space-y-0.5">
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
                  8
                </div>
                <div className="text-[11px] font-medium text-slate-400">Unsaved changes</div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>XML valid</span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------
            SECTION 3: ITEM CATALOGUE TABS & ACTIONS
            ---------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] gap-4 pt-1">
          {/* Navigation Filter Tabs */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              className="flex items-center gap-2 pb-3 border-b-2 border-[var(--color-primary)] text-xs font-semibold text-[var(--color-primary)] transition-colors"
            >
              <span>All items</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-[10px] font-bold">
                1,248
              </span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 pb-3 border-b-2 border-transparent text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] transition-colors"
            >
              <span>Modified</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-[10px] font-medium">
                24
              </span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 pb-3 border-b-2 border-transparent text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] transition-colors"
            >
              <span>Warnings</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-[10px] font-medium">
                3
              </span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pb-2 sm:pb-0 shrink-0">
            <Button variant="secondary" size="sm" leftIcon={Upload}>
              Import XML
            </Button>
            <Button variant="primary" size="sm" leftIcon={Plus}>
              Add item
            </Button>
          </div>
        </div>

        {/* ----------------------------------------------------------------
            SECTION 4: SEARCH, FILTER DROPDOWNS & TABLE PREFERENCES
            ---------------------------------------------------------------- */}
        <div className="relative space-y-3">
          {/* Top Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 flex-wrap">
              {/* Search Classname Input */}
              <div className="flex items-center gap-2 flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] focus-within:border-[var(--color-primary)] transition-colors">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by classname…"
                  className="bg-transparent border-none outline-none text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] w-full"
                />
                <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)] shrink-0">
                  ⌘ F
                </kbd>
              </div>

              {/* Filter Dropdowns */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="secondary" rightIcon={ChevronDown}>
                  All categories
                </Button>
                <Button variant="secondary" rightIcon={ChevronDown}>
                  All usages
                </Button>
                <Button variant="secondary" rightIcon={ChevronDown}>
                  All statuses
                </Button>
                <Button variant="secondary" leftIcon={SlidersHorizontal}>
                  More filters
                </Button>
              </div>
            </div>

            {/* Column Switcher Trigger Button */}
            <div className="shrink-0 flex items-center justify-end">
              <Button variant="subtle" leftIcon={Columns3} badge="9 of 12" rightIcon={ChevronDown}>
                Columns
              </Button>
            </div>
          </div>

          {/* Table Preferences / Meta Bar */}
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-1">
            <div className="flex items-center gap-4">
              <span>1,248 items</span>
              <div className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--color-text-main)] transition-colors">
                <ArrowDownAZ className="w-3.5 h-3.5" />
                <span>Classname: A → Z</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">Density</span>
              <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Compact view"
                  className="rounded"
                >
                  <List className="w-3 h-3" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Expanded view"
                  className="rounded"
                >
                  <LayoutGrid className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              SECTION 5: BULK SELECTION ACTION BAR
              ---------------------------------------------------------------- */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 px-4 rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-xs text-[var(--color-primary)] gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                aria-label="Bulk selection status"
                className="w-4 h-4 rounded border-[var(--color-primary)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
              />
              <span className="font-semibold">3 items selected</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="secondary" size="sm" leftIcon={SquarePen}>
                Bulk edit
              </Button>
              <Button variant="secondary" size="sm" leftIcon={Copy}>
                Duplicate
              </Button>
              <Button variant="danger" size="sm" leftIcon={Trash2}>
                Delete
              </Button>
              <Button variant="ghost" size="sm">
                Clear selection
              </Button>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              SECTION 6: MAIN VIRTUALIZED-STYLE CATALOGUE TABLE
              ---------------------------------------------------------------- */}
          <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider select-none">
                    <th scope="col" className="p-3 pl-4 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all items"
                        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="p-3 min-w-[180px]">
                      <div className="flex items-center gap-1 text-[var(--color-primary)] cursor-pointer">
                        <span>Classname</span>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th scope="col" className="p-3 min-w-[120px]">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--color-text-main)]">
                        <span>Category</span>
                        <ArrowUpDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                      </div>
                    </th>
                    <th scope="col" className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-[var(--color-text-main)]">
                        <span>Nominal</span>
                        <ArrowUpDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                      </div>
                    </th>
                    <th scope="col" className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-[var(--color-text-main)]">
                        <span>Min</span>
                        <ArrowUpDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                      </div>
                    </th>
                    <th scope="col" className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-[var(--color-text-main)]">
                        <span>Lifetime (s)</span>
                        <ArrowUpDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                      </div>
                    </th>
                    <th scope="col" className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-[var(--color-text-main)]">
                        <span>Restock (s)</span>
                        <ArrowUpDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                      </div>
                    </th>
                    <th scope="col" className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-[var(--color-text-main)]">
                        <span>Quantity</span>
                        <ArrowUpDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                      </div>
                    </th>
                    <th scope="col" className="p-3 min-w-[100px]">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--color-text-main)]">
                        <span>Usage</span>
                        <ArrowUpDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                      </div>
                    </th>
                    <th scope="col" className="p-3 min-w-[90px]">
                      <span>Status</span>
                    </th>
                    <th scope="col" className="p-3 pr-4 text-right min-w-[90px]">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--color-border)]">
                  {ITEMS.map(item => (
                    <tr
                      key={item.classname}
                      className={`hover:bg-[var(--color-surface-hover)] transition-colors ${
                        item.selected ? 'bg-[var(--color-primary-light)]/40' : ''
                      }`}
                    >
                      <td className="p-3 pl-4">
                        <input
                          type="checkbox"
                          defaultChecked={item.selected}
                          aria-label={`Select item ${item.classname}`}
                          className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                        />
                      </td>

                      {/* Classname with modified indicator */}
                      <td className="p-3 font-medium text-[var(--color-text-main)]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px]">{item.classname}</span>
                          {item.modified && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                              title="Modified item"
                            />
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="p-3">
                        <Tag variant="subtle" color={CATEGORY_TAG_COLORS[item.categoryTheme]}>
                          {item.category}
                        </Tag>
                      </td>

                      {/* Numeric Values */}
                      <td className="p-3 text-right font-mono text-[var(--color-text-main)]">
                        {item.nominal}
                      </td>
                      <td className="p-3 text-right font-mono text-[var(--color-text-main)]">
                        {item.min}
                      </td>
                      <td className="p-3 text-right font-mono text-[var(--color-text-main)]">
                        {item.lifetime}
                      </td>
                      <td className="p-3 text-right font-mono text-[var(--color-text-main)]">
                        {item.restock}
                      </td>
                      <td className="p-3 text-right font-mono text-[var(--color-text-secondary)]">
                        {item.quantity}
                      </td>

                      {/* Usage */}
                      <td className="p-3 text-[var(--color-text-secondary)]">{item.usage}</td>

                      {/* Status */}
                      <td className="p-3">
                        {item.status ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === 'Active'
                                  ? 'bg-emerald-500'
                                  : 'bg-zinc-400 dark:bg-zinc-600'
                              }`}
                            />
                            <span
                              className={`text-[11px] font-medium ${
                                item.status === 'Active'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-[var(--color-text-muted)]'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Edit ${item.classname}`}
                            leftIcon={SquarePen}
                          />
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Duplicate ${item.classname}`}
                            leftIcon={Copy}
                          />
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`More options for ${item.classname}`}
                            leftIcon={MoreHorizontal}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --------------------------------------------------------------
                SECTION 7: FLOATING COLUMNS SWITCHER POPOVER
                Faithfully rendered from Figma node 23:1938
                -------------------------------------------------------------- */}
            <div className="hidden xl:block absolute right-4 top-14 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-4 z-20 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border)]">
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-main)]">
                    Visible columns
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    Choose what appears in your table.
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary)] text-[10px] font-bold">
                  9 of 12
                </span>
              </div>

              {/* Column Filter Input */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-muted)]">
                <Search className="w-3 h-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Find a column…"
                  className="bg-transparent border-none outline-none text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] w-full"
                />
              </div>

              {/* Column Checklist */}
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {COLUMNS.map(col => (
                  <div
                    key={col.name}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[var(--color-surface-hover)] text-xs select-none"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          col.visible
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                            : 'border-[var(--color-border)]'
                        }`}
                      >
                        {col.visible && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span
                        className={`text-[11px] ${
                          col.visible
                            ? 'font-medium text-[var(--color-text-main)]'
                            : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        {col.name}
                      </span>
                    </label>

                    {col.locked ? (
                      <Lock className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />
                    ) : (
                      <GripVertical className="w-3 h-3 text-[var(--color-text-muted)] shrink-0 cursor-grab" />
                    )}
                  </div>
                ))}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-[11px]">
                <Button variant="link" size="sm">
                  Show all
                </Button>
                <Button variant="link-muted" size="sm">
                  Reset to default
                </Button>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              SECTION 8: PAGINATION CONTROLS & DRAFT LEGEND
              ---------------------------------------------------------------- */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-4 flex-wrap">
              <span>Showing 1–15 of 1,248 items</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  Modified item
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[11px]">Rows per page</span>
                <Button variant="secondary" size="sm" rightIcon={ChevronDown}>
                  15
                </Button>
              </div>

              <div className="h-4 w-px bg-[var(--color-border)]" />

              <div className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="First page"
                  leftIcon={ChevronsLeft}
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Previous page"
                  leftIcon={ChevronLeft}
                />

                <Button size="icon-sm" variant="subtle" aria-label="Page 1" aria-current="page">
                  1
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Page 2">
                  2
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Page 3">
                  3
                </Button>
                <span className="px-1 text-[var(--color-text-muted)] select-none">…</span>
                <Button size="icon-sm" variant="ghost" aria-label="Page 84">
                  84
                </Button>

                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Next page"
                  leftIcon={ChevronRight}
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Last page"
                  leftIcon={ChevronsRight}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
