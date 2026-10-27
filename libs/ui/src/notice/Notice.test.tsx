import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Terminal } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Notice } from './Notice';

describe('Notice', () => {
  it('renders title and description content', () => {
    render(<Notice title="Test Notice Title">This is the notice body content.</Notice>);

    expect(screen.getByText('Test Notice Title')).toBeInTheDocument();
    expect(screen.getByText('This is the notice body content.')).toBeInTheDocument();
  });

  it('assigns role="status" and polite live region for info and success variants', () => {
    const { rerender } = render(<Notice variant="info">Info message</Notice>);
    let notice = screen.getByRole('status');
    expect(notice).toHaveAttribute('aria-live', 'polite');

    rerender(<Notice variant="success">Success message</Notice>);
    notice = screen.getByRole('status');
    expect(notice).toHaveAttribute('aria-live', 'polite');
  });

  it('assigns role="alert" for warning, error, and danger variants with appropriate live region', () => {
    const { rerender } = render(<Notice variant="warning">Warning message</Notice>);
    let notice = screen.getByRole('alert');
    expect(notice).toHaveAttribute('aria-live', 'polite');

    rerender(<Notice variant="error">Error message</Notice>);
    notice = screen.getByRole('alert');
    expect(notice).toHaveAttribute('aria-live', 'assertive');

    rerender(<Notice variant="danger">Danger message</Notice>);
    notice = screen.getByRole('alert');
    expect(notice).toHaveAttribute('aria-live', 'assertive');
  });

  it('allows overriding role via prop', () => {
    render(
      <Notice variant="error" role="region">
        Custom role message
      </Notice>,
    );
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(<Notice icon={Terminal}>Terminal notice</Notice>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('hides icon when icon={false}', () => {
    const { container } = render(<Notice icon={false}>No icon notice</Notice>);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders action slot', () => {
    render(<Notice action={<button type="button">Retry Action</button>}>Action notice</Notice>);

    expect(screen.getByRole('button', { name: 'Retry Action' })).toBeInTheDocument();
  });

  it('does not render dismiss button when onClose is absent', () => {
    render(<Notice>Non-dismissible notice</Notice>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders dismiss button and triggers onClose on click', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Notice onClose={handleClose} closeLabel="Close this alert">
        Dismissible notice
      </Notice>,
    );

    const closeBtn = screen.getByRole('button', { name: 'Close this alert' });
    expect(closeBtn).toBeInTheDocument();

    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('forwards ref to root container div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Notice ref={ref}>Ref notice</Notice>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute('role', 'status');
  });
});
