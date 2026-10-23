import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Autosuggest } from './Autosuggest';

const meta: Meta<typeof Autosuggest> = {
  title: 'Forms/Autosuggest',
  component: Autosuggest,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

interface DayZItem {
  id: string;
  name: string;
  category: string;
  tier: number;
}

const MOCK_ITEMS: DayZItem[] = [
  { id: 'akm', name: 'AKM Assault Rifle', category: 'Weapons', tier: 4 },
  { id: 'm4a1', name: 'M4A1 Automatic Carbine', category: 'Weapons', tier: 4 },
  { id: 'mosin', name: 'Mosin 91/30 Bolt-Action', category: 'Weapons', tier: 2 },
  { id: 'plate_carrier', name: 'Ballistic Plate Carrier', category: 'Gear', tier: 3 },
  { id: 'canteen', name: 'Military Canteen', category: 'Survival', tier: 1 },
  { id: 'saline_bag', name: 'IV Saline Bag 500ml', category: 'Medical', tier: 2 },
];

function AutosuggestDemo() {
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState<DayZItem | null>(null);

  const filteredItems = value.trim()
    ? MOCK_ITEMS.filter(item => item.name.toLowerCase().includes(value.toLowerCase()))
    : [];

  return (
    <div className="flex w-80 flex-col gap-4">
      <Autosuggest<DayZItem>
        value={value}
        onChange={setValue}
        items={filteredItems}
        minChars={1}
        placeholder="Search types.xml items..."
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
        onSelect={item => {
          setSelected(item);
          setValue(item.name);
        }}
        renderOption={(item, isHighlighted) => (
          <div className="flex w-full items-center justify-between text-xs">
            <span className={isHighlighted ? 'text-[var(--color-primary)]' : ''}>{item.name}</span>
            <span className="rounded bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
              T{item.tier}
            </span>
          </div>
        )}
      />

      {selected && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-main)]">
          <p className="font-semibold">{selected.name}</p>
          <p className="text-[var(--color-text-muted)]">Category: {selected.category}</p>
        </div>
      )}
    </div>
  );
}

export const ItemSearch: StoryObj = {
  render: () => <AutosuggestDemo />,
};

export const LoadingState: StoryObj = {
  render: () => (
    <div className="w-80">
      <Autosuggest
        value="ak"
        onChange={() => {}}
        items={[]}
        isLoading={true}
        minChars={1}
        placeholder="Searching..."
        getOptionKey={() => ''}
        getOptionLabel={() => ''}
        onSelect={() => {}}
      />
    </div>
  ),
};
