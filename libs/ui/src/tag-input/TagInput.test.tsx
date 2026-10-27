import { createRef } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
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

    const input = screen.getByRole('textbox');

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

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'military' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Tag already added')).toBeInTheDocument();
  });

  it('enforces maxTags limit', () => {
    const onChange = vi.fn();
    render(<TagInput value={['one', 'two']} maxTags={2} onChange={onChange} />);

    // Input should be hidden when maxTags is reached
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
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

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['first']);
  });

  it('does not remove tag on Backspace if input has text', () => {
    const onChange = vi.fn();
    render(<TagInput value={['first', 'second']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'typing' } });
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports autocomplete suggestions and keyboard selection', () => {
    const onChange = vi.fn();
    render(
      <TagInput value={[]} suggestions={['military', 'police', 'hunting']} onChange={onChange} />,
    );

    const input = screen.getByRole('textbox');
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

    const input = screen.getByRole('textbox');
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

    const input = screen.getByRole('textbox');
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

  it('commits tag on blur if input contains text', () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'blurred_tag' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(['blurred_tag']);
  });

  it('renders suggestions popup when typing and commits selected suggestion', () => {
    const onChange = vi.fn();
    const suggestions = ['chergo', 'chernarus', 'livonia'];

    render(<TagInput value={[]} suggestions={suggestions} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'chern' } });

    const suggestionOption = screen.getByRole('option', { name: 'chernarus' });
    expect(suggestionOption).toBeInTheDocument();

    fireEvent.mouseDown(suggestionOption);
    expect(onChange).toHaveBeenCalledWith(['chernarus']);
  });
});
