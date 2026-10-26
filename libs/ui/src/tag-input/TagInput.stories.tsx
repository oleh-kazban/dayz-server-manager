import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag as TagIcon } from 'lucide-react';

import { Card } from '../card';

import { TagInput, TagOption, TagSelect } from './';

const meta: Meta = {
  title: 'Forms/TagInput & TagSelect',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

const SAMPLE_SUGGESTIONS: TagOption[] = [
  { value: 'military', label: 'Military', color: 'rose' },
  { value: 'police', label: 'Police', color: 'blue' },
  { value: 'hunting', label: 'Hunting', color: 'emerald' },
  { value: 'town', label: 'Town', color: 'amber' },
  { value: 'village', label: 'Village', color: 'teal' },
  { value: 'industrial', label: 'Industrial', color: 'purple' },
  { value: 'medic', label: 'Medic', color: 'danger' },
  { value: 'coast', label: 'Coast', color: 'cyan' },
];

const CATEGORY_OPTIONS: TagOption[] = [
  { value: 'weapons', label: 'Weapons', color: 'rose' },
  { value: 'ammunition', label: 'Ammunition', color: 'amber' },
  { value: 'clothing', label: 'Clothing', color: 'emerald' },
  { value: 'food', label: 'Food & Drink', color: 'teal' },
  { value: 'medical', label: 'Medical Supplies', color: 'danger' },
  { value: 'tools', label: 'Tools & Hardware', color: 'blue' },
  { value: 'containers', label: 'Containers', color: 'purple' },
  { value: 'electronics', label: 'Electronics', color: 'cyan' },
];

export const DefaultTagInput: StoryObj = {
  render: () => {
    const [tags, setTags] = useState<string[]>(['chernarus', 'survival']);
    return (
      <div className="max-w-md space-y-4">
        <TagInput
          label="Server Tags"
          placeholder="Type and press Enter or comma..."
          value={tags}
          onChange={setTags}
          leftIcon={<TagIcon className="w-3.5 h-3.5" />}
        />
        <p className="text-xs text-[var(--color-text-muted)] font-mono">
          Tags: [{tags.join(', ')}]
        </p>
      </div>
    );
  },
};

export const TagInputWithSuggestions: StoryObj = {
  render: () => {
    const [tags, setTags] = useState<string[]>(['military']);
    return (
      <div className="max-w-md space-y-4">
        <TagInput
          label="Economy Usage Flags"
          placeholder="Type 'pol', 'hunt', etc..."
          value={tags}
          onChange={setTags}
          suggestions={SAMPLE_SUGGESTIONS}
        />
        <p className="text-xs text-[var(--color-text-muted)]">
          Suggestions appear as you type. Navigate with ArrowDown/ArrowUp and press Enter.
        </p>
      </div>
    );
  },
};

export const TagInputWithValidation: StoryObj = {
  render: () => {
    const [tags, setTags] = useState<string[]>(['tier_1']);
    return (
      <div className="max-w-md space-y-4">
        <TagInput
          label="Spawn Tiers (Validation Rule)"
          placeholder="Must start with 'tier_' (e.g. tier_2)..."
          value={tags}
          onChange={setTags}
          validateTag={tag =>
            /^tier_[1-4]$/.test(tag) ? true : "Tier must match format 'tier_1' through 'tier_4'"
          }
        />
      </div>
    );
  },
};

export const DefaultTagSelect: StoryObj = {
  render: () => {
    const [selected, setSelected] = useState<string[]>(['weapons', 'ammunition']);
    return (
      <div className="max-w-md space-y-4">
        <TagSelect
          label="Item Categories (Multi-Select)"
          placeholder="Choose item categories..."
          options={CATEGORY_OPTIONS}
          value={selected}
          onChange={setSelected}
        />
        <p className="text-xs text-[var(--color-text-muted)] font-mono">
          Selected values: [{selected.join(', ')}]
        </p>
      </div>
    );
  },
};

export const TagSelectMaxSelections: StoryObj = {
  render: () => {
    const [selected, setSelected] = useState<string[]>(['weapons']);
    return (
      <div className="max-w-md space-y-4">
        <TagSelect
          label="Primary & Secondary Category (Max 2)"
          placeholder="Pick up to 2..."
          options={CATEGORY_OPTIONS}
          value={selected}
          maxSelections={2}
          onChange={setSelected}
        />
      </div>
    );
  },
};

export const InFormWorkbenchCard: StoryObj = {
  render: () => {
    const [tags, setTags] = useState<string[]>(['modded', 'hardcore']);
    const [categories, setCategories] = useState<string[]>(['weapons', 'medical']);

    return (
      <Card
        title="Economy Item Configuration"
        subtitle="Configure tagging and category taxonomy"
        className="max-w-lg"
      >
        <div className="space-y-4">
          <TagSelect
            label="Central Economy Categories"
            placeholder="Assign categories..."
            options={CATEGORY_OPTIONS}
            value={categories}
            onChange={setCategories}
          />
          <TagInput
            label="Custom Item Tags"
            placeholder="Add custom tags..."
            value={tags}
            onChange={setTags}
            suggestions={SAMPLE_SUGGESTIONS}
          />
        </div>
      </Card>
    );
  },
};
