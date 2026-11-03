import { createRef, useState } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Select } from './Select';
import { type SelectOption } from './Select.types';

const TEST_OPTIONS: SelectOption[] = [
  { value: 'opt1', label: 'Option One' },
  { value: 'opt2', label: 'Option Two (Disabled)', disabled: true },
  { value: 'opt3', label: 'Option Three' },
  { value: 'opt4', label: 'Option Four' },
];

describe('Select', () => {
  it('renders with label, placeholder, and correct ARIA combobox attributes', () => {
    render(
      <Select
        id="test-select"
        label="Test Label"
        placeholder="Choose an option..."
        options={TEST_OPTIONS}
      />,
    );

    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
    expect(combobox).toHaveTextContent('Choose an option...');
  });

  it('opens popup on click and renders options with role="option"', async () => {
    const user = userEvent.setup();
    render(<Select label="Test Select" options={TEST_OPTIONS} />);

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent('Option One');
    expect(options[1]).toHaveAttribute('aria-disabled', 'true');
  });

  it('selects an option in uncontrolled mode, updates display and fires onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Select label="Test Select" options={TEST_OPTIONS} onChange={handleChange} />);

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const options = screen.getAllByRole('option');
    await user.click(options[2]); // Option Three

    expect(combobox).toHaveTextContent('Option Three');
    expect(handleChange).toHaveBeenCalledWith('opt3', TEST_OPTIONS[2]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('respects defaultValue in uncontrolled mode', () => {
    render(<Select label="Test Select" options={TEST_OPTIONS} defaultValue="opt3" />);

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveTextContent('Option Three');
  });

  it('supports controlled mode via value prop', async () => {
    const user = userEvent.setup();

    function ControlledWrapper() {
      const [val, setVal] = useState<string | null>('opt1');
      return (
        <div>
          <button type="button" onClick={() => setVal('opt4')}>
            External Change
          </button>
          <Select
            label="Controlled Select"
            options={TEST_OPTIONS}
            value={val}
            onChange={next => setVal(next)}
          />
        </div>
      );
    }

    render(<ControlledWrapper />);

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveTextContent('Option One');

    await user.click(screen.getByRole('button', { name: 'External Change' }));
    expect(combobox).toHaveTextContent('Option Four');
  });

  it('does not open or select when disabled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Select label="Disabled Select" options={TEST_OPTIONS} disabled onChange={handleChange} />,
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeDisabled();

    await user.click(combobox);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('does not select disabled options when clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Select label="Test Select" options={TEST_OPTIONS} onChange={handleChange} />);

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const options = screen.getAllByRole('option');
    await user.click(options[1]); // Disabled option

    expect(handleChange).not.toHaveBeenCalled();
    // Dropdown remains open
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('clears selection when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Select
        label="Clearable Select"
        options={TEST_OPTIONS}
        defaultValue="opt1"
        clearable
        onChange={handleChange}
      />,
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveTextContent('Option One');

    const clearBtn = screen.getByRole('button', { name: 'Clear selection' });
    await user.click(clearBtn);

    expect(combobox).toHaveTextContent('Select an option...');
    expect(handleChange).toHaveBeenCalledWith(null, null);
  });

  it('supports keyboard navigation (ArrowDown, ArrowUp, Home, End, Enter, Space, Escape)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Select label="Keyboard Select" options={TEST_OPTIONS} onChange={handleChange} />);

    const combobox = screen.getByRole('combobox');
    combobox.focus();

    // ArrowDown opens combobox
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // End key jumps to last enabled option (Option Four)
    await user.keyboard('{End}');
    // Home key jumps to first enabled option (Option One)
    await user.keyboard('{Home}');

    // ArrowUp wraps to last option
    await user.keyboard('{ArrowUp}');

    // Space commits selection
    await user.keyboard(' ');

    expect(handleChange).toHaveBeenCalledWith('opt4', TEST_OPTIONS[3]);
    expect(combobox).toHaveTextContent('Option Four');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens combobox on Space or ArrowUp when closed and closes on Tab', () => {
    render(<Select label="Key Open Select" options={TEST_OPTIONS} />);

    const combobox = screen.getByRole('combobox');

    // ArrowUp opens combobox
    fireEvent.keyDown(combobox, { key: 'ArrowUp' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Tab closes combobox
    fireEvent.keyDown(combobox, { key: 'Tab' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Space opens combobox
    fireEvent.keyDown(combobox, { key: ' ' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('clicking combobox focuses and toggles open state', () => {
    render(<Select label="Container Select" options={TEST_OPTIONS} />);

    const combobox = screen.getByRole('combobox');
    fireEvent.click(combobox);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes dropdown and refocuses trigger on Escape', async () => {
    const user = userEvent.setup();

    render(<Select label="Escape Select" options={TEST_OPTIONS} />);

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox).toHaveFocus();
  });

  it('renders validation error with role="alert" and aria-invalid', () => {
    render(
      <Select
        label="Validation Select"
        options={TEST_OPTIONS}
        error="This field is strictly required"
      />,
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('This field is strictly required');
  });

  it('renders helperText when no error is present', () => {
    render(
      <Select
        label="Helper Select"
        options={TEST_OPTIONS}
        helperText="Choose the primary replication region"
      />,
    );

    expect(screen.getByText('Choose the primary replication region')).toBeInTheDocument();
  });

  it('forwards ref to trigger button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Select ref={ref} label="Ref Select" options={TEST_OPTIONS} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.getAttribute('role')).toBe('combobox');
  });

  it('renders a hidden input with the selected value when name is provided', () => {
    const { container } = render(
      <Select name="serverRegion" value="opt3" options={TEST_OPTIONS} label="Region" />,
    );

    const hiddenInput = container.querySelector('input[type="hidden"]');
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput).toHaveAttribute('name', 'serverRegion');
    expect(hiddenInput).toHaveAttribute('value', 'opt3');
  });

  it('updates hidden input value in uncontrolled mode when option is selected', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Select name="serverRegion" defaultValue="opt1" options={TEST_OPTIONS} label="Region" />,
    );

    const hiddenInput = container.querySelector('input[type="hidden"]');
    expect(hiddenInput).toHaveAttribute('value', 'opt1');

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: 'Option Four' }));

    expect(hiddenInput).toHaveAttribute('value', 'opt4');
  });

  it('updates aria-activedescendant when navigating options via ArrowDown and ArrowUp', async () => {
    const user = userEvent.setup();
    render(<Select id="custom-select" label="Options" options={TEST_OPTIONS} />);

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(combobox).not.toHaveAttribute('aria-activedescendant');

    // ArrowDown navigates to index 0
    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'custom-select-listbox-opt-0');

    // ArrowDown skips disabled option (opt2 at index 1), moves to index 2
    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'custom-select-listbox-opt-2');

    // ArrowDown moves to index 3
    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'custom-select-listbox-opt-3');

    // ArrowUp moves back to index 2
    await user.keyboard('{ArrowUp}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'custom-select-listbox-opt-2');
  });

  it('renders trigger container with focus-within:border-[var(--color-primary)] class', () => {
    const { container } = render(<Select label="Test Select" options={TEST_OPTIONS} />);
    const triggerContainer = container.querySelector(
      '.focus-within\\:border-\\[var\\(--color-primary\\)\\]',
    );
    expect(triggerContainer).toBeInTheDocument();
  });

  it('applies explicit width and omits w-full when containerClassName has width class, defaulting to w-full otherwise', () => {
    const { container, rerender } = render(
      <Select label="Width Test" options={TEST_OPTIONS} containerClassName="w-20" />,
    );

    expect(container.firstElementChild).toHaveClass('w-20');
    expect(container.firstElementChild).not.toHaveClass('w-full');

    rerender(<Select label="Width Test" options={TEST_OPTIONS} />);
    expect(container.firstElementChild).toHaveClass('w-full');
  });

  it('renders ChevronDown icon with pointer-events-none class', () => {
    const { container } = render(<Select label="Test Select" options={TEST_OPTIONS} />);
    const chevronSvg = container.querySelector('button[role="combobox"] svg');
    expect(chevronSvg).toBeInTheDocument();
    expect(chevronSvg).toHaveClass('pointer-events-none');
  });
});
