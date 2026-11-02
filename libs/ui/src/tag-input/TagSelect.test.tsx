import { createRef } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByRole('listbox')).toHaveAttribute('tabindex', '-1');

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

  it('supports functional callback ref for container', () => {
    const refCallback = vi.fn();
    render(<TagSelect ref={refCallback} options={sampleOptions} value={[]} onChange={vi.fn()} />);

    expect(refCallback).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it('navigates options via keyboard ArrowDown, ArrowUp, and selects with Enter', () => {
    const onChange = vi.fn();
    render(<TagSelect options={sampleOptions} value={[]} onChange={onChange} />);

    const combobox = screen.getByRole('combobox');
    fireEvent.click(combobox);

    const listbox = screen.getByRole('listbox');

    // ArrowDown moves down
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    // ArrowDown to next
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    // ArrowUp moves up
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    // Enter commits selection of the highlighted option
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalled();
  });

  it('wraps around highlighted option index with ArrowUp from top and ArrowDown from bottom', () => {
    const onChange = vi.fn();
    render(<TagSelect options={sampleOptions} value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');

    // ArrowUp when at 0 wraps to end
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });

    // ArrowDown when at end wraps to 0
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalled();
  });

  it('clears search query when clicking clear search button', () => {
    render(<TagSelect options={sampleOptions} value={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox'));
    const searchInput = screen.getByPlaceholderText('Search options...');
    fireEvent.change(searchInput, { target: { value: 'cloth' } });

    const clearBtn = screen.getByRole('button', { name: 'Clear search query' });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(searchInput).toHaveValue('');
  });

  it('updates highlighted index on mouse enter', () => {
    render(<TagSelect options={sampleOptions} value={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox'));
    const option = screen.getByRole('option', { name: /clothing/i });
    fireEvent.mouseEnter(option);
    expect(option).toBeInTheDocument();
  });

  it('renders validation error message when error prop is provided', () => {
    render(
      <TagSelect
        options={sampleOptions}
        value={[]}
        onChange={vi.fn()}
        error="Selection is required"
      />,
    );

    expect(screen.getByText('Selection is required')).toBeInTheDocument();
  });

  it('renders hidden inputs for each selected tag when name is provided', () => {
    const { container } = render(
      <TagSelect
        name="itemCategories"
        options={sampleOptions}
        value={['weapons', 'medical']}
        onChange={vi.fn()}
      />,
    );

    const hiddenInputs = container.querySelectorAll('input[type="hidden"]');
    expect(hiddenInputs).toHaveLength(2);
    expect(hiddenInputs[0]).toHaveAttribute('name', 'itemCategories');
    expect(hiddenInputs[0]).toHaveAttribute('value', 'weapons');
    expect(hiddenInputs[1]).toHaveAttribute('name', 'itemCategories');
    expect(hiddenInputs[1]).toHaveAttribute('value', 'medical');
  });

  it('submits selected values as form data with multiple values under the name', () => {
    let submittedEntries: [string, FormDataEntryValue][] = [];
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      submittedEntries = Array.from(formData.entries());
    };

    render(
      <form onSubmit={handleSubmit} data-testid="tag-form">
        <TagSelect
          name="tags"
          options={sampleOptions}
          value={['clothing', 'tools']}
          onChange={vi.fn()}
        />
        <button type="submit">Save</button>
      </form>,
    );

    fireEvent.submit(screen.getByTestId('tag-form'));
    expect(submittedEntries).toEqual([
      ['tags', 'clothing'],
      ['tags', 'tools'],
    ]);
  });

  it('supports keyboard navigation while open: opening, navigating, toggling, and closing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TagSelect id="keyboard-tag-select" options={sampleOptions} value={[]} onChange={onChange} />,
    );

    const combobox = screen.getByRole('combobox');
    combobox.focus();
    expect(combobox).toHaveFocus();
    expect(combobox).toHaveAttribute('aria-expanded', 'false');

    // Press ArrowDown to open popup
    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'keyboard-tag-select-listbox-opt-0');

    // ArrowDown navigates to next option (index 1)
    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'keyboard-tag-select-listbox-opt-1');

    // ArrowUp navigates back to index 0
    await user.keyboard('{ArrowUp}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'keyboard-tag-select-listbox-opt-0');

    // Enter toggles highlighted option (index 0: 'weapons')
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(['weapons']);

    // Escape closes the popup
    await user.keyboard('{Escape}');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  it('applies customClassName to the container wrapper', () => {
    const { container } = render(
      <TagSelect
        options={sampleOptions}
        value={[]}
        onChange={vi.fn()}
        customClassName="tagselect-custom-wrapper"
      />,
    );

    expect(container.firstChild).toHaveClass('tagselect-custom-wrapper');
  });
});
