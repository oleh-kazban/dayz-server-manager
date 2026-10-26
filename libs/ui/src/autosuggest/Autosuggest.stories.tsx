import { useEffect, useRef, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Autosuggest, type AutosuggestProps } from './Autosuggest';

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

const meta: Meta<typeof Autosuggest> = {
  title: 'Forms/Autosuggest',
  component: Autosuggest,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Field label rendered above the input',
    },
    error: {
      control: 'text',
      description: 'Validation error message displaying danger state',
    },
    minChars: {
      control: 'number',
      description: 'Minimum characters required before displaying results',
    },
    isLoading: {
      control: 'boolean',
      description: 'Displays a loader inside the dropdown',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables user input and suppresses popup overlay',
    },
    placeholder: {
      control: 'text',
      description: 'Input placeholder text',
    },
    emptyText: {
      control: 'text',
      description: 'Message displayed when zero items match',
    },
  },
  args: {
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof Autosuggest>;

/* ====================================================================
   1. INTERACTIVE STORY (Controls Supported)
   ==================================================================== */

function InteractiveDemo(props: Partial<AutosuggestProps<DayZItem>>) {
  const [value, setValue] = useState(props.value ?? '');
  const [selected, setSelected] = useState<DayZItem | null>(null);

  const minChars = props.minChars ?? 1;
  const filteredItems =
    value.trim().length >= minChars
      ? MOCK_ITEMS.filter(item => item.name.toLowerCase().includes(value.toLowerCase()))
      : [];

  return (
    <div className="flex w-80 flex-col">
      <Autosuggest<DayZItem>
        label={props.label}
        error={props.error}
        value={value}
        onChange={setValue}
        items={filteredItems}
        minChars={minChars}
        isLoading={props.isLoading}
        disabled={props.disabled}
        placeholder={props.placeholder ?? 'Search types.xml items...'}
        emptyText={props.emptyText ?? 'No DayZ items found'}
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
        <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 text-xs text-[var(--color-text-main)] shadow-xs">
          <span className="block text-[10px] uppercase font-semibold text-[var(--color-text-muted)] tracking-wider mb-1.5">
            Committed Selection
          </span>
          <p className="font-semibold text-sm">{selected.name}</p>
          <div className="flex items-center gap-2 mt-1 text-[var(--color-text-muted)]">
            <span>Category: {selected.category}</span>
            <span>·</span>
            <span>Tier {selected.tier}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const Interactive: Story = {
  render: args => <InteractiveDemo {...(args as Partial<AutosuggestProps<DayZItem>>)} />,
  args: {
    minChars: 1,
    placeholder: 'Search types.xml items...',
    emptyText: 'No DayZ items found',
    disabled: false,
    isLoading: false,
  },
};

export const WithLabel: Story = {
  render: args => <InteractiveDemo {...(args as Partial<AutosuggestProps<DayZItem>>)} />,
  args: {
    label: 'Item Prototype (types.xml)',
    placeholder: 'Select a DayZ class name...',
    minChars: 1,
  },
};

export const WithError: Story = {
  render: args => <InteractiveDemo {...(args as Partial<AutosuggestProps<DayZItem>>)} />,
  args: {
    label: 'Weapon Attachment',
    value: 'M4_Suppressor_Invalid',
    error: 'Unrecognized classname. Verify item exists in types.xml or enabled mod pbos.',
    minChars: 1,
  },
};

/* ====================================================================
   2. MINIMUM CHARACTERS THRESHOLD STORY
   ==================================================================== */

function MinCharsDemo(props: Partial<AutosuggestProps<DayZItem>>) {
  const [value, setValue] = useState('A');

  const filteredItems =
    value.trim().length >= 3
      ? MOCK_ITEMS.filter(item => item.name.toLowerCase().includes(value.toLowerCase()))
      : [];

  return (
    <div className="flex w-80 flex-col gap-2">
      <p className="text-xs text-[var(--color-text-secondary)]">
        The popup stays suppressed until 3 or more characters are entered (minChars = 3):
      </p>
      <Autosuggest<DayZItem>
        value={value}
        onChange={setValue}
        items={filteredItems}
        minChars={3}
        placeholder="Type at least 3 characters..."
        disabled={props.disabled}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
        onSelect={item => setValue(item.name)}
      />
    </div>
  );
}

export const MinCharsThreshold: Story = {
  render: args => <MinCharsDemo {...(args as Partial<AutosuggestProps<DayZItem>>)} />,
};

/* ====================================================================
   3. EMPTY RESULTS STORY
   ==================================================================== */

function EmptyResultsDemo(props: Partial<AutosuggestProps<DayZItem>>) {
  const [value, setValue] = useState('Railgun');

  return (
    <div className="flex w-80 flex-col gap-2">
      <p className="text-xs text-[var(--color-text-secondary)]">
        Demonstrates accessible empty state announcement:
      </p>
      <Autosuggest<DayZItem>
        value={value}
        onChange={setValue}
        items={[]}
        minChars={1}
        disabled={props.disabled}
        emptyText="No items matched your query"
        placeholder="Search items..."
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
        onSelect={item => setValue(item.name)}
      />
    </div>
  );
}

export const EmptyResults: Story = {
  render: args => <EmptyResultsDemo {...(args as Partial<AutosuggestProps<DayZItem>>)} />,
};

/* ====================================================================
   4. DYNAMIC ASYNC LOADING STORY
   ==================================================================== */

function AsyncLoadingDemo(props: Partial<AutosuggestProps<DayZItem>>) {
  const [value, setValue] = useState('M');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DayZItem[]>(() =>
    MOCK_ITEMS.filter(item => item.name.toLowerCase().includes('m')),
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleQueryChange = (query: string) => {
    setValue(query);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(() => {
      setResults(MOCK_ITEMS.filter(item => item.name.toLowerCase().includes(query.toLowerCase())));
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="flex w-80 flex-col gap-2">
      <p className="text-xs text-[var(--color-text-secondary)]">
        Simulates network latency (600ms debounce) with live spinner:
      </p>
      <Autosuggest<DayZItem>
        value={value}
        onChange={handleQueryChange}
        items={results}
        isLoading={isLoading}
        disabled={props.disabled}
        minChars={1}
        placeholder="Search with simulated network..."
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
        onSelect={item => {
          setValue(item.name);
          setResults([item]);
        }}
      />
    </div>
  );
}

export const AsyncLoading: Story = {
  render: args => <AsyncLoadingDemo {...(args as Partial<AutosuggestProps<DayZItem>>)} />,
};

/* ====================================================================
   5. DISABLED STATE STORY
   ==================================================================== */

export const Disabled: Story = {
  render: args => (
    <div className="w-80">
      <Autosuggest<DayZItem>
        value="M4A1 Automatic Carbine"
        onChange={() => {}}
        items={MOCK_ITEMS}
        disabled={args.disabled ?? true}
        placeholder="Locked field..."
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
        onSelect={() => {}}
      />
    </div>
  ),
  args: {
    disabled: true,
  },
};
