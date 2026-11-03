import { createRef } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TagInput } from './TagInput';

describe('TagInput', () => {
  it('renders with initial tags and placeholder', () => {
    render(
      <TagInput
        label="Tags"
        placeholder="Add tag..."
        value={['military', 'weapons']}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('military')).toBeInTheDocument();
    expect(screen.getByText('weapons')).toBeInTheDocument();
  });

  it('renders placeholder when value is empty', () => {
    render(<TagInput placeholder="Add tag..." value={[]} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText('Add tag...')).toBeInTheDocument();
  });

  it('adds a new tag when Enter or comma is pressed', () => {
    const onChange = vi.fn();
    render(<TagInput value={['first']} onChange={onChange} />);

    const input = screen.getByRole('combobox');

    // Type new tag and press Enter
    fireEvent.change(input, { target: { value: 'second' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['first', 'second']);

    // Type with comma
    onChange.mockClear();
    fireEvent.change(input, { target: { value: 'third' } });
    fireEvent.keyDown(input, { key: ',' });

    expect(onChange).toHaveBeenCalledWith(['first', 'third']);
  });

  it('prevents duplicate tags and displays error', () => {
    const onChange = vi.fn();
    render(<TagInput value={['military']} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'military' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Tag already added')).toBeInTheDocument();
  });

  it('enforces maxTags limit', () => {
    const onChange = vi.fn();
    render(<TagInput value={['one', 'two']} maxTags={2} onChange={onChange} />);

    // Input should be hidden when maxTags is reached
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('removes tag on tag remove button click', () => {
    const onChange = vi.fn();
    render(<TagInput value={['alpha', 'beta']} onChange={onChange} />);

    const removeBetaButton = screen.getByRole('button', { name: 'Remove beta' });
    fireEvent.click(removeBetaButton);

    expect(onChange).toHaveBeenCalledWith(['alpha']);
  });

  it('removes last tag on Backspace when input is empty', () => {
    const onChange = vi.fn();
    render(<TagInput value={['first', 'second']} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['first']);
  });

  it('does not remove tag on Backspace if input has text', () => {
    const onChange = vi.fn();
    render(<TagInput value={['first', 'second']} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'typing' } });
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports autocomplete suggestions and keyboard selection', () => {
    const onChange = vi.fn();
    render(
      <TagInput value={[]} suggestions={['military', 'police', 'hunting']} onChange={onChange} />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'pol' } });

    // Suggestion dropdown should render
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'police' })).toBeInTheDocument();

    // Select with ArrowDown + Enter
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['police']);
  });

  it('validates tags with custom validateTag function', () => {
    const onChange = vi.fn();
    render(
      <TagInput
        value={[]}
        onChange={onChange}
        validateTag={tag => (tag.startsWith('tier_') ? true : 'Must start with tier_')}
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Must start with tier_')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'tier_1' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['tier_1']);
  });

  it('handles disabled state correctly', () => {
    const onChange = vi.fn();
    render(<TagInput value={['locked']} disabled onChange={onChange} />);

    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();

    // Remove buttons should not be present
    expect(screen.queryByRole('button', { name: 'Remove locked' })).not.toBeInTheDocument();
  });

  it('forwards native input ref correctly', () => {
    const ref = createRef<HTMLInputElement>();
    render(<TagInput ref={ref} value={[]} onChange={vi.fn()} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('supports functional callback ref for input', () => {
    const refCallback = vi.fn();
    render(<TagInput ref={refCallback} value={[]} onChange={vi.fn()} />);

    expect(refCallback).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('does not commit tag on blur by default when addOnBlur is false', () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'blurred_tag' } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits tag on blur when addOnBlur is true', () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} addOnBlur />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'blurred_tag' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(['blurred_tag']);
  });

  it('renders suggestions popup when typing and commits selected suggestion', () => {
    const onChange = vi.fn();
    const suggestions = ['chergo', 'chernarus', 'livonia'];

    render(<TagInput value={[]} suggestions={suggestions} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'chern' } });

    const suggestionOption = screen.getByRole('option', { name: 'chernarus' });
    expect(suggestionOption).toBeInTheDocument();

    fireEvent.mouseDown(suggestionOption);
    expect(onChange).toHaveBeenCalledWith(['chernarus']);
  });

  it('retains input focus and does NOT invoke onChange via addOnBlur on Escape with existing tags and draft text', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput
        value={['military', 'weapons']}
        suggestions={['police', 'hunting']}
        addOnBlur
        onChange={onChange}
      />,
    );

    const input = screen.getByRole('combobox');
    await user.type(input, 'pol');

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'police' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(input).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('pol');
  });

  it('manages combobox ARIA attributes based on open/closed state', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        id="tag-combobox"
        value={[]}
        suggestions={['military', 'police']}
        onChange={vi.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-autocomplete', 'list');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).not.toHaveAttribute('aria-controls');
    expect(combobox).not.toHaveAttribute('aria-activedescendant');

    await user.type(combobox, 'pol');
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(combobox).toHaveAttribute('aria-controls', 'tag-combobox-listbox');
    expect(combobox).not.toHaveAttribute('aria-activedescendant');

    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'tag-combobox-listbox-option-0');
  });

  it('skips disabled suggestions on ArrowDown navigation and prevents Enter from committing them', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const suggestions = [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2', disabled: true },
      { value: 'opt3', label: 'Option 3' },
    ];

    render(
      <TagInput id="disabled-test" value={[]} suggestions={suggestions} onChange={onChange} />,
    );

    const combobox = screen.getByRole('combobox');
    await user.type(combobox, 'opt');

    // ArrowDown moves to index 0 (opt1)
    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'disabled-test-listbox-option-0');

    // Next ArrowDown skips disabled index 1 (opt2), lands on index 2 (opt3)
    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'disabled-test-listbox-option-2');

    // ArrowUp skips disabled index 1 (opt2), lands back on index 0 (opt1)
    await user.keyboard('{ArrowUp}');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'disabled-test-listbox-option-0');

    // Verify disabled option element
    const disabledOption = screen.getByRole('option', { name: 'Option 2' });
    expect(disabledOption).toBeDisabled();
    fireEvent.mouseDown(disabledOption);
    expect(onChange).not.toHaveBeenCalled();

    // Enter commits currently highlighted enabled option (opt1), never opt2
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(['opt1']);
  });

  it('applies customClassName to the container wrapper', () => {
    const { container } = render(
      <TagInput value={[]} onChange={vi.fn()} customClassName="taginput-custom-container" />,
    );

    expect(container.firstChild).toHaveClass('taginput-custom-container');
  });
});
