import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { Shield, Tag as TagIconLucide, User } from 'lucide-react';

import { Tag } from './Tag';

const meta: Meta<typeof Tag> = {
  title: 'Components/Tag',
  component: Tag,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['subtle', 'solid', 'outline', 'neutral'],
      description: 'Visual treatment of the tag background and border',
    },
    color: {
      control: 'select',
      options: [
        'default',
        'primary',
        'success',
        'warning',
        'danger',
        'info',
        'rose',
        'purple',
        'amber',
        'emerald',
        'teal',
        'sky',
        'blue',
        'cyan',
        'gray',
      ],
      description: 'Color theme of the tag',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Scale and padding of the tag',
    },
    shape: {
      control: 'select',
      options: ['rounded', 'pill'],
      description: 'Border radius shape',
    },
    uppercase: {
      control: 'boolean',
      description: 'Transforms text to uppercase tracking-wider',
    },
    mono: {
      control: 'boolean',
      description: 'Applies monospace font',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables interactions and dims opacity',
    },
  },
  args: {
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof Tag>;

/* ====================================================================
   BASIC STORIES
   ==================================================================== */

export const Default: Story = {
  args: {
    children: 'Vanilla+',
    variant: 'subtle',
    color: 'primary',
    disabled: false,
  },
};

export const Removable: Story = {
  args: {
    children: '1PP',
    variant: 'neutral',
    size: 'lg',
    disabled: false,
    onRemove: () => alert('Tag removed!'),
  },
};

export const WithStatusDot: Story = {
  args: {
    children: 'Wolfpack',
    variant: 'solid',
    color: 'primary',
    shape: 'pill',
    size: 'sm',
    disabled: false,
    dot: { ping: true },
  },
};

/* ====================================================================
   SCREENSHOT 1: LOG LEVELS SHOWCASE (INFO, SAVE, WARN, ERROR)
   ==================================================================== */

export const LogLevelsShowcase: Story = {
  name: 'Log Levels (Screenshot 1)',
  render: args => (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 max-w-md w-full">
      <div>
        <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          LEVEL
        </h4>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
          Log stream level badges formatted with compact monospace font.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <Tag variant="subtle" color="info" size="sm" uppercase mono disabled={args.disabled}>
            INFO
          </Tag>
          <span className="text-xs text-[var(--color-text-secondary)]">
            Client verified · session authorized
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Tag variant="subtle" color="success" size="sm" uppercase mono disabled={args.disabled}>
            SAVE
          </Tag>
          <span className="text-xs text-[var(--color-text-secondary)]">
            World persistence saved (1.42s)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Tag variant="subtle" color="warning" size="sm" uppercase mono disabled={args.disabled}>
            WARN
          </Tag>
          <span className="text-xs text-[var(--color-text-secondary)]">
            Player latency exceeded 180 ms
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Tag variant="subtle" color="danger" size="sm" uppercase mono disabled={args.disabled}>
            ERROR
          </Tag>
          <span className="text-xs text-[var(--color-text-secondary)]">
            Expansion update download failed
          </span>
        </div>
      </div>
    </div>
  ),
};

/* ====================================================================
   SCREENSHOT 2: TACTICAL MAP PILLS SHOWCASE
   ==================================================================== */

export const TacticalPillsShowcase: Story = {
  name: 'Tactical Map Pills (Screenshot 2)',
  render: args => (
    <div className="p-8 rounded-2xl border border-zinc-800 bg-[#141b16] space-y-6 max-w-sm w-full text-white">
      <div className="text-xs text-zinc-400">Tactical Radar / GPS Player Badges</div>

      <div className="space-y-6">
        <div>
          <div className="text-[11px] text-zinc-400 font-semibold mb-1">Stary Sobor</div>
          <Tag
            variant="solid"
            color="primary"
            shape="pill"
            size="sm"
            disabled={args.disabled}
            dot={{ ping: true }}
          >
            Wolfpack
          </Tag>
        </div>

        <div>
          <div className="text-[11px] text-zinc-400 font-semibold mb-1">Chernogorsk</div>
          <Tag variant="solid" color="emerald" shape="pill" size="sm" disabled={args.disabled}>
            TheWanderer
          </Tag>
        </div>

        <div>
          <div className="text-[11px] text-zinc-400 font-semibold mb-1">Elektrozavodsk</div>
          <Tag variant="solid" color="emerald" shape="pill" size="sm" disabled={args.disabled}>
            Rook
          </Tag>
        </div>
      </div>
    </div>
  ),
};

/* ====================================================================
   SCREENSHOT 3: CATEGORIES SHOWCASE
   ==================================================================== */

export const CategoriesShowcase: Story = {
  name: 'Economy Categories (Screenshot 3)',
  render: args => (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 max-w-md w-full">
      <div className="border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          CATEGORY ⇅
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">Catalogue Table</span>
      </div>

      <div className="flex flex-col gap-2">
        <Tag variant="subtle" color="rose" disabled={args.disabled}>
          Weapons
        </Tag>
        <Tag variant="subtle" color="purple" disabled={args.disabled}>
          Clothing
        </Tag>
        <Tag variant="subtle" color="amber" disabled={args.disabled}>
          Ammunition
        </Tag>
        <Tag variant="subtle" color="emerald" disabled={args.disabled}>
          Food
        </Tag>
        <Tag variant="subtle" color="teal" disabled={args.disabled}>
          Medical
        </Tag>
        <Tag variant="subtle" color="sky" disabled={args.disabled}>
          Tools
        </Tag>
        <Tag variant="subtle" color="blue" disabled={args.disabled}>
          Containers
        </Tag>
        <Tag variant="subtle" color="cyan" disabled={args.disabled}>
          Electronics
        </Tag>
      </div>
    </div>
  ),
};

/* ====================================================================
   SCREENSHOT 4: SERVER TAGS SHOWCASE (Interactive Add & Dismiss)
   ==================================================================== */

function ServerTagsDemo({ disabled = false }: { disabled?: boolean }) {
  const [tags, setTags] = useState(['1PP', 'Vanilla+', 'PvP', 'No safe zones']);

  const handleRemove = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleAdd = () => {
    const candidate = prompt('Enter a new server tag:');
    if (candidate && !tags.includes(candidate.trim())) {
      setTags(prev => [...prev, candidate.trim()]);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 max-w-lg w-full">
      <div className="text-xs font-semibold text-[var(--color-text-main)]">
        Server tags {disabled ? '(Disabled)' : ''}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {tags.map(tag => (
          <Tag
            key={tag}
            variant="neutral"
            size="lg"
            disabled={disabled}
            onRemove={() => handleRemove(tag)}
            removeAriaLabel={`Remove ${tag}`}
          >
            {tag}
          </Tag>
        ))}

        <Tag.Add size="lg" disabled={disabled} onClick={handleAdd}>
          Add tag
        </Tag.Add>
      </div>

      <div className="text-[10px] text-[var(--color-text-muted)] pt-1">
        Tags are indexed in the public server browser for player matchmaking.
      </div>
    </div>
  );
}

export const ServerTagsShowcase: Story = {
  name: 'Server Tags & Add Trigger (Screenshot 4)',
  render: args => <ServerTagsDemo disabled={args.disabled} />,
};

/* ====================================================================
   VARIANTS GALLERY
   ==================================================================== */

export const AllVariants: Story = {
  render: args => (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">Subtle</div>
        <div className="flex flex-wrap gap-2">
          <Tag variant="subtle" color="primary" disabled={args.disabled}>
            Primary
          </Tag>
          <Tag variant="subtle" color="success" disabled={args.disabled}>
            Success
          </Tag>
          <Tag variant="subtle" color="warning" disabled={args.disabled}>
            Warning
          </Tag>
          <Tag variant="subtle" color="danger" disabled={args.disabled}>
            Danger
          </Tag>
          <Tag variant="subtle" color="info" disabled={args.disabled}>
            Info
          </Tag>
          <Tag variant="subtle" color="purple" disabled={args.disabled}>
            Purple
          </Tag>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">Solid</div>
        <div className="flex flex-wrap gap-2">
          <Tag variant="solid" color="primary" disabled={args.disabled}>
            Primary
          </Tag>
          <Tag variant="solid" color="success" disabled={args.disabled}>
            Success
          </Tag>
          <Tag variant="solid" color="warning" disabled={args.disabled}>
            Warning
          </Tag>
          <Tag variant="solid" color="danger" disabled={args.disabled}>
            Danger
          </Tag>
          <Tag variant="solid" color="info" disabled={args.disabled}>
            Info
          </Tag>
          <Tag variant="solid" color="purple" disabled={args.disabled}>
            Purple
          </Tag>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">Outline</div>
        <div className="flex flex-wrap gap-2">
          <Tag variant="outline" color="primary" disabled={args.disabled}>
            Primary
          </Tag>
          <Tag variant="outline" color="success" disabled={args.disabled}>
            Success
          </Tag>
          <Tag variant="outline" color="warning" disabled={args.disabled}>
            Warning
          </Tag>
          <Tag variant="outline" color="danger" disabled={args.disabled}>
            Danger
          </Tag>
          <Tag variant="outline" color="info" disabled={args.disabled}>
            Info
          </Tag>
          <Tag variant="outline" color="purple" disabled={args.disabled}>
            Purple
          </Tag>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">Neutral</div>
        <div className="flex flex-wrap gap-2">
          <Tag variant="neutral" disabled={args.disabled}>
            Default
          </Tag>
          <Tag variant="neutral" disabled={args.disabled} onRemove={() => {}}>
            Removable
          </Tag>
        </div>
      </div>
    </div>
  ),
};

export const AllSizesAndShapes: Story = {
  render: args => (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">Sizes</div>
        <div className="flex items-center gap-3">
          <Tag size="sm" color="primary" disabled={args.disabled}>
            Small (sm)
          </Tag>
          <Tag size="md" color="primary" disabled={args.disabled}>
            Medium (md)
          </Tag>
          <Tag size="lg" color="primary" disabled={args.disabled}>
            Large (lg)
          </Tag>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">Shapes</div>
        <div className="flex items-center gap-3">
          <Tag shape="rounded" color="emerald" disabled={args.disabled}>
            Rounded (Default)
          </Tag>
          <Tag shape="pill" color="emerald" disabled={args.disabled}>
            Pill (rounded-full)
          </Tag>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">
          With Icons &amp; Dots
        </div>
        <div className="flex items-center gap-3">
          <Tag color="primary" leftIcon={Shield} disabled={args.disabled}>
            Protected
          </Tag>
          <Tag color="purple" leftIcon={User} disabled={args.disabled}>
            Admin
          </Tag>
          <Tag color="emerald" dot disabled={args.disabled}>
            Live
          </Tag>
          <Tag color="rose" dot={{ ping: true }} disabled={args.disabled}>
            Combat
          </Tag>
          <Tag
            variant="neutral"
            leftIcon={TagIconLucide}
            disabled={args.disabled}
            onRemove={() => {}}
          >
            Chernarus
          </Tag>
        </div>
      </div>
    </div>
  ),
};

/* ====================================================================
   DEDICATED DISABLED SHOWCASE
   ==================================================================== */

export const Disabled: Story = {
  name: 'Disabled State Showcase',
  render: args => (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 max-w-lg w-full">
      <div className="border-b border-[var(--color-border)] pb-2 text-xs font-semibold text-[var(--color-text-main)]">
        Disabled Tags &amp; Add Triggers
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tag variant="subtle" color="primary" disabled={args.disabled ?? true}>
          Subtle Disabled
        </Tag>
        <Tag variant="solid" color="emerald" shape="pill" disabled={args.disabled ?? true}>
          Solid Pill Disabled
        </Tag>
        <Tag variant="outline" color="danger" disabled={args.disabled ?? true}>
          Outline Disabled
        </Tag>
        <Tag
          variant="neutral"
          disabled={args.disabled ?? true}
          onRemove={() => {}}
          removeAriaLabel="Remove disabled tag"
        >
          Removable Disabled
        </Tag>
        <Tag.Add size="md" disabled={args.disabled ?? true}>
          Add tag (Disabled)
        </Tag.Add>
      </div>
    </div>
  ),
  args: {
    disabled: true,
  },
};
