import { useState } from 'react';

import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@aegis/api-client';

import { useEditableForm } from './useEditableForm';

interface Values extends Record<string, unknown> {
  name: string;
  port: number;
}

const validate = (v: Values) => ({
  ...(v.name.trim() ? {} : { name: 'Name is required.' }),
  ...(v.port >= 1024 ? {} : { port: 'Port must be at least 1024.' }),
});
const toPayload = (v: Values) => ({ name: v.name.trim(), port: v.port });

function conflict(field: string, message: string) {
  return new ApiError('Conflict', 409, {
    statusCode: 409,
    error: 'Conflict',
    errorCode: 'SERVER_NAME_CONFLICT',
    message,
    fieldErrors: { [field]: { code: 'X_UNKNOWN', message } },
  });
}

function TestForm({
  baseline,
  onValid,
  isPending = false,
}: {
  baseline: Values | null;
  onValid: () => void;
  isPending?: boolean;
}) {
  const [values, setValues] = useState<Values>(baseline ?? { name: '', port: 0 });
  const { registerForm, errors, hasChanges, handleSubmit, reportServerErrors, markSaved } =
    useEditableForm({ values, baseline, toPayload, validate, isPending });
  return (
    <form ref={registerForm} onSubmit={e => handleSubmit(e, onValid)}>
      <input
        aria-label="name"
        aria-invalid={Boolean(errors.name) || undefined}
        value={values.name}
        onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
      />
      {errors.name && <span>{errors.name}</span>}
      <input
        aria-label="port"
        type="number"
        aria-invalid={Boolean(errors.port) || undefined}
        value={values.port}
        onChange={e => setValues(v => ({ ...v, port: Number(e.target.value) }))}
      />
      {errors.port && <span>{errors.port}</span>}
      <output data-testid="has-changes">{String(hasChanges)}</output>
      <button type="button" onClick={() => reportServerErrors(conflict('name', 'Taken.'))}>
        server-error
      </button>
      <button type="button" onClick={markSaved}>
        mark-saved
      </button>
      <button type="submit">save</button>
    </form>
  );
}

const saved: Values = { name: 'Alpha', port: 2302 };

describe('useEditableForm', () => {
  it('derives hasChanges from the normalised payload: edit, whitespace-only and revert', () => {
    render(<TestForm baseline={saved} onValid={vi.fn()} />);
    const name = screen.getByLabelText('name');
    expect(screen.getByTestId('has-changes')).toHaveTextContent('false');

    fireEvent.change(name, { target: { value: 'Beta' } });
    expect(screen.getByTestId('has-changes')).toHaveTextContent('true');

    fireEvent.change(name, { target: { value: '  Alpha  ' } });
    expect(screen.getByTestId('has-changes')).toHaveTextContent('false');
  });

  it('moves the baseline when the saved values change and treats create forms as always changed', () => {
    const { result, rerender } = renderHook(
      ({ baseline }: { baseline: Values | null }) =>
        useEditableForm({ values: saved, baseline, validate, isPending: false }),
      { initialProps: { baseline: { ...saved, port: 9999 } as Values | null } },
    );
    expect(result.current.hasChanges).toBe(true);
    rerender({ baseline: saved });
    expect(result.current.hasChanges).toBe(false);
    rerender({ baseline: null });
    expect(result.current.hasChanges).toBe(true);
  });

  it('ignores submits while unchanged (including Enter) or pending', () => {
    const onValid = vi.fn();
    const { rerender } = render(<TestForm baseline={saved} onValid={onValid} />);
    fireEvent.submit(screen.getByLabelText('name'));
    expect(onValid).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Beta' } });
    rerender(<TestForm baseline={saved} onValid={onValid} isPending />);
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(onValid).not.toHaveBeenCalled();
  });

  it('shows no client errors before the first submit, then validates on submit and focuses the first invalid field', () => {
    const onValid = vi.fn();
    render(<TestForm baseline={null} onValid={onValid} />);
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(onValid).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Port must be at least 1024.')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText('name'));
  });

  it('re-validates live after a failed submit and submits once valid', () => {
    const onValid = vi.fn();
    render(<TestForm baseline={null} onValid={onValid} />);
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Gamma' } });
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
    expect(screen.getByText('Port must be at least 1024.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('port'), { target: { value: '2302' } });
    expect(screen.queryByText('Port must be at least 1024.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(onValid).toHaveBeenCalledTimes(1);
  });

  it('shows a server error only while the field holds the rejected value, focuses it, and clears on markSaved', () => {
    render(<TestForm baseline={saved} onValid={vi.fn()} />);
    const name = screen.getByLabelText('name');
    fireEvent.change(name, { target: { value: 'Taken' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'server-error' }));
    });
    expect(screen.getByText('Taken.')).toBeInTheDocument();
    expect(document.activeElement).toBe(name);

    fireEvent.change(name, { target: { value: 'Takenx' } });
    expect(screen.queryByText('Taken.')).not.toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'Taken' } });
    expect(screen.getByText('Taken.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'mark-saved' }));
    expect(screen.queryByText('Taken.')).not.toBeInTheDocument();
  });

  it('clears selected server errors and accepts the values sent with a non-submit request', () => {
    const { result } = renderHook(() =>
      useEditableForm({ values: saved, baseline: saved, validate, isPending: false }),
    );
    act(() => {
      result.current.reportServerErrors(conflict('name', 'Bad name.'), saved);
    });
    expect(result.current.errors.name).toBe('Bad name.');
    act(() => {
      result.current.clearServerErrors(['port']);
    });
    expect(result.current.errors.name).toBe('Bad name.');
    act(() => {
      result.current.clearServerErrors(['name']);
    });
    expect(result.current.errors.name).toBeUndefined();
  });
});
