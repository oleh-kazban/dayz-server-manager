import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type TableColumnItem } from './Table.types';
import { TableColumnVisibility } from './TableColumnVisibility';

const mockColumns: TableColumnItem[] = [
  { id: 'name', label: 'Item Name', isVisible: true, canHide: false },
  { id: 'category', label: 'Category', isVisible: true },
  { id: 'nominal', label: 'Nominal', isVisible: true },
  { id: 'min', label: 'Min', isVisible: false },
  { id: 'lifetime', label: 'Lifetime', isVisible: false },
];

describe('TableColumnVisibility', () => {
  it('renders trigger button with label and hidden count indicator', () => {
    render(<TableColumnVisibility columns={mockColumns} onColumnVisibilityChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: /columns/i });
    expect(button).toBeInTheDocument();
    // 2 columns are hidden in mockColumns
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByLabelText('2 columns hidden')).toBeInTheDocument();
  });

  it('does not render hidden count pill when all columns are visible', () => {
    const allVisible = mockColumns.map(col => ({ ...col, isVisible: true }));
    render(<TableColumnVisibility columns={allVisible} onColumnVisibilityChange={vi.fn()} />);

    expect(screen.queryByLabelText(/columns hidden/i)).not.toBeInTheDocument();
  });

  it('opens column visibility popover on click and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<TableColumnVisibility columns={mockColumns} onColumnVisibilityChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: /columns/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog', { name: 'Toggle column visibility' });
    expect(dialog).toBeInTheDocument();

    // Verify list of columns rendered
    expect(screen.getByLabelText('Item Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Min')).toBeInTheDocument();

    // Press Escape to close
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables checkbox and displays lock icon for non-hideable columns', async () => {
    const user = userEvent.setup();
    render(<TableColumnVisibility columns={mockColumns} onColumnVisibilityChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /columns/i }));

    const nameCheckbox = screen.getByLabelText('Item Name');
    expect(nameCheckbox).toBeDisabled();
    expect(screen.getByTitle('Locked column')).toBeInTheDocument();

    const categoryCheckbox = screen.getByLabelText('Category');
    expect(categoryCheckbox).not.toBeDisabled();
  });

  it('invokes onColumnVisibilityChange callback when column checkbox is toggled', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();

    render(<TableColumnVisibility columns={mockColumns} onColumnVisibilityChange={handleToggle} />);

    await user.click(screen.getByRole('button', { name: /columns/i }));

    const categoryCheckbox = screen.getByLabelText('Category');
    expect(categoryCheckbox).toBeChecked();

    await user.click(categoryCheckbox);
    expect(handleToggle).toHaveBeenCalledWith('category', false);

    const minCheckbox = screen.getByLabelText('Min');
    expect(minCheckbox).not.toBeChecked();

    await user.click(minCheckbox);
    expect(handleToggle).toHaveBeenCalledWith('min', true);
  });

  it('filters column list based on search query and supports clearing', async () => {
    const user = userEvent.setup();
    render(<TableColumnVisibility columns={mockColumns} onColumnVisibilityChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /columns/i }));

    const searchInput = screen.getByPlaceholderText('Find a column...');
    await user.type(searchInput, 'nom');

    expect(screen.getByLabelText('Nominal')).toBeInTheDocument();
    expect(screen.queryByLabelText('Item Name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();

    // Clear search
    const clearButton = screen.getByRole('button', { name: 'Clear column search' });
    await user.click(clearButton);

    expect(screen.getByLabelText('Item Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });

  it('displays "No columns found" message when search yields no matches', async () => {
    const user = userEvent.setup();
    render(<TableColumnVisibility columns={mockColumns} onColumnVisibilityChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /columns/i }));

    const searchInput = screen.getByPlaceholderText('Find a column...');
    await user.type(searchInput, 'NonExistentColumn');

    expect(screen.getByText('No columns found')).toBeInTheDocument();
  });

  it('invokes onShowAll callback or toggles all hidden hideable columns', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();
    const handleShowAll = vi.fn();

    const { rerender } = render(
      <TableColumnVisibility
        columns={mockColumns}
        onColumnVisibilityChange={handleToggle}
        onShowAll={handleShowAll}
      />,
    );

    await user.click(screen.getByRole('button', { name: /columns/i }));
    await user.click(screen.getByRole('button', { name: 'Show all' }));

    expect(handleShowAll).toHaveBeenCalledTimes(1);

    // Test default internal show all behavior when onShowAll is not supplied
    rerender(
      <TableColumnVisibility columns={mockColumns} onColumnVisibilityChange={handleToggle} />,
    );

    await user.click(screen.getByRole('button', { name: 'Show all' }));
    // min and lifetime were hidden and canHide !== false
    expect(handleToggle).toHaveBeenCalledWith('min', true);
    expect(handleToggle).toHaveBeenCalledWith('lifetime', true);
  });

  it('invokes onReset callback when Reset to default button is clicked', async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    render(
      <TableColumnVisibility
        columns={mockColumns}
        onColumnVisibilityChange={vi.fn()}
        onReset={handleReset}
      />,
    );

    await user.click(screen.getByRole('button', { name: /columns/i }));
    await user.click(screen.getByRole('button', { name: 'Reset to default' }));

    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('forwards ref to button element and supports disabled state', () => {
    const buttonRef = createRef<HTMLButtonElement>();

    render(
      <TableColumnVisibility
        ref={buttonRef}
        columns={mockColumns}
        onColumnVisibilityChange={vi.fn()}
        disabled
      />,
    );

    expect(buttonRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(buttonRef.current).toBeDisabled();
  });
});
