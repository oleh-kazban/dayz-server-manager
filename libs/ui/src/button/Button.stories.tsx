import type { Meta, StoryObj } from '@storybook/react-vite';
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
      options: ['primary', 'secondary', 'ghost', 'text'],
      description: 'Visual stylistic variant of the button',
    },
    destructive: {
      control: 'boolean',
      description: 'Applies destructive/danger styling across any variant',
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
  args: {
    disabled: false,
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

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Clear selection',
  },
};

export const Text: Story = {
  args: {
    variant: 'text',
    children: 'View all players',
    rightIcon: ArrowRight,
  },
};

export const Destructive: Story = {
  args: {
    variant: 'primary',
    destructive: true,
    children: 'Halt server',
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
   COMPREHENSIVE VARIANTS & DESTRUCTIVE GALLERY
   ==================================================================== */

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled action',
    leftIcon: Plus,
  },
};

export const IconButton: Story = {
  args: {
    variant: 'secondary',
    leftIcon: Settings,
    'aria-label': 'Server settings',
  },
};

/* ====================================================================
   COMPREHENSIVE VARIANTS & DESTRUCTIVE GALLERY
   ==================================================================== */

export const AllVariants: Story = {
  parameters: {
    controls: { include: ['disabled', 'isLoading'] },
  },
  render: args => (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-3">
          Standard Variants {args.disabled ? '(Disabled State)' : ''}
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          <Button {...args} variant="primary" leftIcon={Plus}>
            Primary
          </Button>
          <Button {...args} variant="secondary" leftIcon={Upload}>
            Secondary
          </Button>
          <Button {...args} variant="ghost">
            Ghost
          </Button>
          <Button {...args} variant="text" rightIcon={ArrowRight}>
            Text Action
          </Button>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-3">
          Destructive Modifier (destructive: true) {args.disabled ? '(Disabled State)' : ''}
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          <Button {...args} variant="primary" destructive leftIcon={Trash2}>
            Primary Destructive
          </Button>
          <Button {...args} variant="secondary" destructive leftIcon={Trash2}>
            Secondary Destructive
          </Button>
          <Button {...args} variant="ghost" destructive leftIcon={Trash2}>
            Ghost Destructive
          </Button>
          <Button {...args} variant="text" destructive>
            Text Destructive (Kick)
          </Button>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-3">
          Explicit Disabled Comparison (Static)
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled leftIcon={Plus}>
            Primary Disabled
          </Button>
          <Button variant="secondary" disabled leftIcon={Upload}>
            Secondary Disabled
          </Button>
          <Button variant="ghost" disabled>
            Ghost Disabled
          </Button>
          <Button variant="text" disabled rightIcon={ArrowRight}>
            Text Disabled
          </Button>
          <Button variant="primary" destructive disabled leftIcon={Trash2}>
            Destructive Disabled
          </Button>
        </div>
      </div>
    </div>
  ),
};

/* ====================================================================
   CANONICAL GEOMETRY & ICON BUTTONS (Standard: 36px)
   ==================================================================== */

export const ButtonGeometry: Story = {
  name: 'Standard Geometry (36px)',
  parameters: {
    controls: { include: ['disabled', 'isLoading'] },
  },
  render: args => (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-3">
          Standard Buttons (Text + Icon) {args.disabled ? '(Disabled State)' : ''}
        </h4>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={Download}
          >
            Standard Button (36px)
          </Button>
          <Button
            variant="primary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={Download}
          >
            Primary Action (36px)
          </Button>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-3">
          Square Icon Buttons (Auto-detected or isIconOnly)
        </h4>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={List}
            aria-label="List view"
          />
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={LayoutGrid}
            aria-label="Grid view"
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-3">
          Ghost Icon Triggers (Table Row Actions)
        </h4>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={SquarePen}
            aria-label="Edit"
          />
          <Button
            variant="ghost"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={Copy}
            aria-label="Duplicate"
          />
          <Button
            variant="ghost"
            destructive
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={Trash2}
            aria-label="Delete"
          />
          <Button
            variant="ghost"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={MoreHorizontal}
            aria-label="More"
          />
        </div>
      </div>
    </div>
  ),
};

/* ====================================================================
   WORKBENCH SHOWCASE (Directly matching Editor & Server Management screens)
   ==================================================================== */

export const WorkbenchToolbarShowcase: Story = {
  name: 'Workbench Toolbar & Selection Bar',
  parameters: {
    controls: { include: ['disabled', 'isLoading'] },
  },
  render: args => (
    <div className="space-y-6 w-full max-w-4xl p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)]">
      {/* Top action row */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <span className="text-xs font-semibold text-[var(--color-text-main)]">
          Table Action Bar
        </span>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={Upload}
          >
            Import XML
          </Button>
          <Button
            variant="primary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={Plus}
          >
            Add item
          </Button>
        </div>
      </div>

      {/* Filter and selector row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            rightIcon={ChevronDown}
          >
            All categories
          </Button>
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            rightIcon={ChevronDown}
          >
            All usages
          </Button>
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            rightIcon={ChevronDown}
          >
            All statuses
          </Button>
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={SlidersHorizontal}
          >
            More filters
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={Columns3}
            rightIcon={ChevronDown}
          >
            Columns
          </Button>

          <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-lg p-0.5 bg-[var(--color-surface)]">
            <Button
              variant="ghost"
              disabled={args.disabled}
              isLoading={args.isLoading}
              leftIcon={List}
              aria-label="Compact density"
            />
            <Button
              variant="secondary"
              disabled={args.disabled}
              isLoading={args.isLoading}
              leftIcon={LayoutGrid}
              aria-label="Card density"
            />
          </div>
        </div>
      </div>

      {/* Bulk selection action row */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-xs text-[var(--color-primary)]">
        <span className="font-semibold">3 items selected</span>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={SquarePen}
          >
            Bulk edit
          </Button>
          <Button
            variant="secondary"
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={Copy}
          >
            Duplicate
          </Button>
          <Button
            variant="secondary"
            destructive
            disabled={args.disabled}
            isLoading={args.isLoading}
            leftIcon={Trash2}
          >
            Delete
          </Button>
          <Button variant="ghost" disabled={args.disabled} isLoading={args.isLoading}>
            Clear selection
          </Button>
        </div>
      </div>
    </div>
  ),
};

export const TableActionsShowcase: Story = {
  name: 'Table Actions (Screenshots Showcase)',
  parameters: {
    controls: { include: ['disabled', 'isLoading'] },
  },
  render: args => (
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
                  <Button variant="text" disabled={args.disabled} isLoading={args.isLoading}>
                    Profile
                  </Button>
                  <span className="text-[var(--color-border)]">·</span>
                  <Button
                    variant="text"
                    destructive
                    disabled={args.disabled}
                    isLoading={args.isLoading}
                  >
                    Kick
                  </Button>
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
                  <Button variant="text" disabled={args.disabled} isLoading={args.isLoading}>
                    Download
                  </Button>
                  <span className="text-[var(--color-border)]">·</span>
                  <Button variant="text" disabled={args.disabled} isLoading={args.isLoading}>
                    Restore
                  </Button>
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
                <Button variant="text" disabled={args.disabled} isLoading={args.isLoading}>
                  Unban
                </Button>
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
                    variant="ghost"
                    disabled={args.disabled}
                    isLoading={args.isLoading}
                    leftIcon={Play}
                    aria-label="Run task now"
                  />
                  <Button
                    variant="ghost"
                    disabled={args.disabled}
                    isLoading={args.isLoading}
                    leftIcon={Settings}
                    aria-label="Task settings"
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
                    variant="ghost"
                    disabled={args.disabled}
                    isLoading={args.isLoading}
                    leftIcon={SquarePen}
                    aria-label="Edit item"
                  />
                  <Button
                    variant="ghost"
                    disabled={args.disabled}
                    isLoading={args.isLoading}
                    leftIcon={Copy}
                    aria-label="Duplicate item"
                  />
                  <Button
                    variant="ghost"
                    disabled={args.disabled}
                    isLoading={args.isLoading}
                    leftIcon={MoreHorizontal}
                    aria-label="More options"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Table Footer with Navigation Links */}
        <div className="flex items-center justify-between p-3 bg-[var(--color-surface-subtle)] border-t border-[var(--color-border)] text-xs">
          <Button
            variant="text"
            disabled={args.disabled}
            isLoading={args.isLoading}
            rightIcon={ArrowRight}
          >
            View all players
          </Button>

          <Button
            variant="text"
            disabled={args.disabled}
            isLoading={args.isLoading}
            rightIcon={ArrowRight}
          >
            View full history
          </Button>

          <Button
            variant="text"
            disabled={args.disabled}
            isLoading={args.isLoading}
            rightIcon={ArrowUpRight}
          >
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
            <Button
              variant="secondary"
              destructive
              disabled={args.disabled}
              isLoading={args.isLoading}
            >
              Ban player
            </Button>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              Mods Management Header
            </span>
            <Button
              variant="text"
              disabled={args.disabled}
              isLoading={args.isLoading}
              leftIcon={Plus}
            >
              Add a mod
            </Button>
          </div>
        </div>
      </div>
    </div>
  ),
};
