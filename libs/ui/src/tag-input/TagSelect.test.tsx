import { createRef } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TagSelect } from './TagSelect';

const sampleOptions = [
  { value: 'weapons', label: 'Weapons', color: 'rose' as const },
  { value: 'clothing', label: 'Clothing', color: 'emerald' as const },
  { value: 'medical', label: 'Medical', color: 'amber' as const },
  { value: 'tools', label: 'Tools', color: 'blue' as const },
];

describe('TagSelect', () => {
  it('renders placeholder when no options are selected', () => {
    render(
      <TagSelect
        label="Categories"
        placeholder="Choose categories..."
        options={sampleOptions}
        value={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Choose categories...')).toBeInTheDocument();
  });

  it('renders selected options as tag badges', () => {
    render(<TagSelect options={sampleOptions} value={['weapons', 'medical']} onChange={vi.fn()} />);

    expect(screen.getByText('Weapons')).toBeInTheDocument();
    expect(screen.getByText('Medical')).toBeInTheDocument();
    expect(screen.queryByText('Tools')).not.toBeInTheDocument();
  });

  it('opens popup listbox on trigger click and toggles option selection', () => {
    const onChange = vi.fn();
    render(<TagSelect options={sampleOptions} value={['weapons']} onChange={onChange} />);

    const combobox = screen.getByRole('combobox');
    fireEvent.click(combobox);

    // Listbox should be visible
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click 'Clothing' to select
    const clothingOption = screen.getByRole('option', { name: /clothing/i });
    fireEvent.click(clothingOption);

    expect(onChange).toHaveBeenCalledWith(['weapons', 'clothing']);

    // Click 'Weapons' to unselect
    onChange.mockClear();
    const weaponsOption = screen.getByRole('option', { name: /weapons/i });
    fireEvent.click(weaponsOption);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('removes selected option when clicking tag remove button', () => {
    const onChange = vi.fn();
    render(
      <TagSelect options={sampleOptions} value={['weapons', 'clothing']} onChange={onChange} />,
    );

    const removeClothing = screen.getByRole('button', { name: 'Remove Clothing' });
    fireEvent.click(removeClothing);

    expect(onChange).toHaveBeenCalledWith(['weapons']);
  });

  it('clears all selected options on clear button click', () => {
    const onChange = vi.fn();
    render(
      <TagSelect
        options={sampleOptions}
        value={['weapons', 'clothing']}
        onChange={onChange}
        clearable
      />,
    );

    const clearButton = screen.getByRole('button', { name: 'Clear all selections' });
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('filters options based on search query', () => {
    render(<TagSelect options={sampleOptions} value={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox'));

    const searchInput = screen.getByPlaceholderText('Search options...');
    fireEvent.change(searchInput, { target: { value: 'cloth' } });

    expect(screen.getByRole('option', { name: /clothing/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /weapons/i })).not.toBeInTheDocument();
  });

  it('displays emptyText when search yields no matches', () => {
    render(
      <TagSelect
        options={sampleOptions}
        value={[]}
        onChange={vi.fn()}
        emptyText="No categories match"
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));

    const searchInput = screen.getByPlaceholderText('Search options...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No categories match')).toBeInTheDocument();
  });

  it('enforces maxSelections constraint', () => {
    const onChange = vi.fn();
    render(
      <TagSelect
        options={sampleOptions}
        value={['weapons']}
        maxSelections={1}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));

    // Option not in value should be disabled
    const toolsOption = screen.getByRole('option', { name: /tools/i });
    expect(toolsOption).toBeDisabled();

    fireEvent.click(toolsOption);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes popup on Escape key', () => {
    render(<TagSelect options={sampleOptions} value={[]} onChange={vi.fn()} />);

    const combobox = screen.getByRole('combobox');
    fireEvent.click(combobox);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('disables interactions when disabled prop is true', () => {
    const onChange = vi.fn();
    render(<TagSelect options={sampleOptions} value={['weapons']} disabled onChange={onChange} />);

    const combobox = screen.getByRole('combobox');
    fireEvent.click(combobox);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Weapons' })).not.toBeInTheDocument();
  });

  it('forwards container ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(<TagSelect ref={ref} options={sampleOptions} value={[]} onChange={vi.fn()} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
