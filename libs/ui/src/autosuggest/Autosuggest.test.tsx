import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Autosuggest } from './Autosuggest';

interface ModItem {
  id: string;
  name: string;
  subscribers: number;
}

const mockMods: ModItem[] = [
  { id: '1559212036', name: 'CF (Community Framework)', subscribers: 4500000 },
  { id: '1564026768', name: 'Community-Online-Tools', subscribers: 3200000 },
  { id: '2545327648', name: 'Expansion Core', subscribers: 1800000 },
];

describe('Autosuggest', () => {
  it('renders input with label and placeholder', () => {
    render(
      <Autosuggest
        label="Steam Workshop Mod"
        placeholder="Search mods by name..."
        value=""
        onChange={vi.fn()}
        items={mockMods}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    expect(screen.getByLabelText('Steam Workshop Mod')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search mods by name...')).toBeInTheDocument();
  });

  it('opens popup listbox when query meets minChars threshold', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const { rerender } = render(
      <Autosuggest
        label="Search"
        value=""
        onChange={handleChange}
        items={mockMods}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    await user.type(input, 'C');
    expect(handleChange).toHaveBeenCalledWith('C');

    rerender(
      <Autosuggest
        label="Search"
        value="C"
        onChange={handleChange}
        items={mockMods}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /cf \(community framework\)/i })).toBeInTheDocument();
  });

  it('selects option on click and invokes onSelect callback', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <Autosuggest
        label="Search"
        value="Expansion"
        onChange={vi.fn()}
        items={mockMods}
        onSelect={handleSelect}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    const input = screen.getByRole('combobox');
    await user.click(input);

    const option = screen.getByRole('option', { name: /expansion core/i });
    await user.click(option);

    expect(handleSelect).toHaveBeenCalledWith(mockMods[2]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation and selection via Enter', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <Autosuggest
        label="Search"
        value="Comm"
        onChange={vi.fn()}
        items={mockMods}
        onSelect={handleSelect}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    const input = screen.getByRole('combobox');
    await user.click(input);

    // Navigate to second option
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(handleSelect).toHaveBeenCalledWith(mockMods[1]);
  });

  it('clears query and closes dropdown when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Autosuggest
        label="Search"
        value="Query"
        onChange={handleChange}
        items={mockMods}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    await user.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('displays loading state while searching', async () => {
    const user = userEvent.setup();
    render(
      <Autosuggest
        isLoading
        label="Search"
        value="Query"
        onChange={vi.fn()}
        items={[]}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('displays empty state when no items match query', async () => {
    const user = userEvent.setup();
    render(
      <Autosuggest
        label="Search"
        value="NonexistentMod"
        emptyText="No matching workshop mods"
        onChange={vi.fn()}
        items={[]}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText('No matching workshop mods')).toBeInTheDocument();
  });

  it('renders validation error and links aria-describedby', () => {
    render(
      <Autosuggest
        id="mod-search"
        label="Search"
        error="Mod is already added"
        value=""
        onChange={vi.fn()}
        items={[]}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'mod-search-error');
    expect(screen.getByText('Mod is already added')).toBeInTheDocument();
  });

  it('supports Escape key dismissal and ArrowUp navigation', async () => {
    const user = userEvent.setup();
    render(
      <Autosuggest
        label="Search"
        value="Expansion"
        onChange={vi.fn()}
        items={mockMods}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Arrow up wraps to last item
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('option-2'));

    // Escape closes popup
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Arrow down when closed opens and selects first option
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('option-0'));
  });

  it('supports custom renderOption slot', async () => {
    const user = userEvent.setup();
    render(
      <Autosuggest
        label="Search"
        value="Mod"
        onChange={vi.fn()}
        items={mockMods}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
        renderOption={(item, isHighlighted) => (
          <span data-testid={`custom-${item.id}`}>
            {item.name} ({isHighlighted ? 'active' : 'idle'})
          </span>
        )}
      />,
    );

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByTestId('custom-1559212036')).toBeInTheDocument();
  });

  it('closes popup if component becomes disabled while open', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Autosuggest
        label="Search"
        value="Mod"
        onChange={vi.fn()}
        items={mockMods}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    rerender(
      <Autosuggest
        disabled
        label="Search"
        value="Mod"
        onChange={vi.fn()}
        items={mockMods}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('forwards React 19 ref directly to input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Autosuggest
        ref={ref}
        label="Ref Search"
        value=""
        onChange={vi.fn()}
        items={[]}
        onSelect={vi.fn()}
        getOptionKey={item => item.id}
        getOptionLabel={item => item.name}
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
