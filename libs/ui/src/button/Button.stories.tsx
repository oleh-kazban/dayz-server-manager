import type { Meta, StoryObj } from '@storybook/react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Columns3,
  Copy,
  Download,
  LayoutGrid,
  List,
  MoreHorizontal,
  Play,
  Plus,
  Settings,
  SlidersHorizontal,
  SquarePen,
  Trash2,
  Upload,
} from 'lucide-react';

import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'subtle',
        'ghost',
        'danger',
        'danger-solid',
        'link',
        'link-danger',
        'link-warning',
        'link-muted',
      ],
      description: 'Visual stylistic variant of the button',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon-sm', 'icon', 'icon-lg'],
      description: 'Physical dimension and padding scale',
    },
    isLoading: {
      control: 'boolean',
      description: 'Displays a spinner and disables user interaction',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables pointer events and reduces opacity',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Expands the button to fill 100% of container width',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

/* ====================================================================
   BASIC STORIES
   ==================================================================== */

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Add item',
    leftIcon: Plus,
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Import XML',
    leftIcon: Upload,
  },
};

export const SubtleWithBadge: Story = {
  args: {
    variant: 'subtle',
    children: 'Columns',
    leftIcon: Columns3,
    badge: '9 of 12',
    rightIcon: ChevronDown,
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Clear selection',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete',
    leftIcon: Trash2,
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Saving changes',
    isLoading: true,
  },
};

/* ====================================================================
   COMPREHENSIVE VARIANTS GALLERY
   ==================================================================== */

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <Button variant="primary" leftIcon={Plus}>
        Primary
      </Button>
      <Button variant="secondary" leftIcon={Upload}>
        Secondary
      </Button>
      <Button variant="subtle" leftIcon={Columns3} badge="9 of 12" rightIcon={ChevronDown}>
        Subtle
      </Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger" leftIcon={Trash2}>
        Danger
      </Button>
      <Button variant="danger-solid" leftIcon={Trash2}>
        Danger Solid
      </Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" leftIcon={Download}>
          Small (h-8)
        </Button>
        <Button size="md" variant="secondary" leftIcon={Download}>
          Medium (h-9)
        </Button>
        <Button size="lg" variant="secondary" leftIcon={Download}>
          Large (h-10)
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button size="icon-sm" variant="secondary" aria-label="List view">
          <List className="w-3 h-3" />
        </Button>
        <Button size="icon" variant="secondary" aria-label="Grid view">
          <LayoutGrid className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon-lg" variant="secondary" aria-label="Columns view">
          <Columns3 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  ),
};

/* ====================================================================
   FIGMA SHOWCASE (Directly matching Editor & Server Management screens)
   ==================================================================== */

export const FigmaToolbarShowcase: Story = {
  name: 'Figma Toolbar & Selection Bar',
  render: () => (
    <div className="space-y-6 w-full max-w-4xl p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)]">
      {/* Top action row */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <span className="text-xs font-semibold text-[var(--color-text-main)]">
          Table Action Bar
        </span>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" leftIcon={Upload}>
            Import XML
          </Button>
          <Button variant="primary" leftIcon={Plus}>
            Add item
          </Button>
        </div>
      </div>

      {/* Filter and selector row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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

        <div className="flex items-center gap-3">
          <Button variant="subtle" leftIcon={Columns3} badge="9 of 12" rightIcon={ChevronDown}>
            Columns
          </Button>

          <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-lg p-0.5 bg-[var(--color-surface)]">
            <Button size="icon-sm" variant="ghost" aria-label="Compact density">
              <List className="w-3 h-3" />
            </Button>
            <Button size="icon-sm" variant="secondary" aria-label="Card density">
              <LayoutGrid className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk selection action row */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-xs text-[var(--color-primary)]">
        <span className="font-semibold">3 items selected</span>

        <div className="flex items-center gap-2">
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
    </div>
  ),
};

export const TableActionsShowcase: Story = {
  name: 'Table Actions (Screenshots Showcase)',
  render: () => (
    <div className="space-y-6 w-full max-w-3xl p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
          Table Button &amp; Action Patterns
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Inline action links, row trigger icons, embedded forms, and table footer links.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[11px] font-semibold text-[var(--color-text-muted)] uppercase">
              <th scope="col" className="p-3 pl-4">
                Context
              </th>
              <th scope="col" className="p-3">
                Sample Entity
              </th>
              <th scope="col" className="p-3 pr-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {/* Row 1: Profile · Kick */}
            <tr className="hover:bg-[var(--color-surface-hover)]">
              <td className="p-3 pl-4 font-medium text-[var(--color-text-secondary)]">
                Players Table
              </td>
              <td className="p-3 text-[var(--color-text-main)]">Wolfpack</td>
              <td className="p-3 pr-4 text-right">
                <div className="inline-flex items-center gap-2 text-xs">
                  <Button variant="link">Profile</Button>
                  <span className="text-[var(--color-border)]">·</span>
                  <Button variant="link-danger">Kick</Button>
                </div>
              </td>
            </tr>

            {/* Row 2: Download · Restore */}
            <tr className="hover:bg-[var(--color-surface-hover)]">
              <td className="p-3 pl-4 font-medium text-[var(--color-text-secondary)]">
                Backups Table
              </td>
              <td className="p-3 font-mono text-[var(--color-text-main)]">
                chernarus_2026-10-20_1424
              </td>
              <td className="p-3 pr-4 text-right">
                <div className="inline-flex items-center gap-2 text-xs">
                  <Button variant="link">Download</Button>
                  <span className="text-[var(--color-border)]">·</span>
                  <Button variant="link-warning">Restore</Button>
                </div>
              </td>
            </tr>

            {/* Row 3: Unban */}
            <tr className="hover:bg-[var(--color-surface-hover)]">
              <td className="p-3 pl-4 font-medium text-[var(--color-text-secondary)]">
                Active Bans Panel
              </td>
              <td className="p-3 text-[var(--color-text-main)]">RedFox · Combat logging</td>
              <td className="p-3 pr-4 text-right">
                <Button variant="link">Unban</Button>
              </td>
            </tr>

            {/* Row 4: Play & Settings icon triggers */}
            <tr className="hover:bg-[var(--color-surface-hover)]">
              <td className="p-3 pl-4 font-medium text-[var(--color-text-secondary)]">
                Scheduled Tasks
              </td>
              <td className="p-3 text-[var(--color-text-main)]">Scheduled server restart</td>
              <td className="p-3 pr-4 text-right">
                <div className="inline-flex items-center gap-1.5">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Run task now"
                    leftIcon={Play}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Task settings"
                    leftIcon={Settings}
                  />
                </div>
              </td>
            </tr>

            {/* Row 5: Row Edit, Copy, More */}
            <tr className="hover:bg-[var(--color-surface-hover)]">
              <td className="p-3 pl-4 font-medium text-[var(--color-text-secondary)]">
                Catalogue Table
              </td>
              <td className="p-3 font-mono text-[var(--color-text-main)]">AK101</td>
              <td className="p-3 pr-4 text-right">
                <div className="inline-flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit item"
                    leftIcon={SquarePen}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Duplicate item"
                    leftIcon={Copy}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="More options"
                    leftIcon={MoreHorizontal}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Table Footer with Navigation Links */}
        <div className="flex items-center justify-between p-3 bg-[var(--color-surface-subtle)] border-t border-[var(--color-border)] text-xs">
          <Button variant="link" rightIcon={ArrowRight}>
            View all players
          </Button>

          <Button variant="link" rightIcon={ArrowRight}>
            View full history
          </Button>

          <Button variant="link" rightIcon={ArrowUpRight}>
            View ban history
          </Button>
        </div>
      </div>

      {/* Embedded Table Card Actions (Ban Player & Add a Mod) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              Active Bans Form
            </span>
            <Button variant="danger" size="sm">
              Ban player
            </Button>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              Mods Management Header
            </span>
            <Button variant="link" leftIcon={Plus}>
              Add a mod
            </Button>
          </div>
        </div>
      </div>
    </div>
  ),
};
