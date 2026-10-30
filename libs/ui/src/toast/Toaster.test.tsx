import { toast } from 'react-hot-toast';

import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Toaster } from './Toaster';

describe('Toaster', () => {
  it('renders toaster container without error', () => {
    const { container } = render(<Toaster position="top-right" />);
    expect(container).toBeInTheDocument();
  });

  it('renders dispatched toasts through react-hot-toast with custom container classes', async () => {
    render(<Toaster position="top-right" containerClassName="custom-toaster-root" />);

    act(() => {
      toast('Notification message', { id: 'msg-1' });
    });

    const notification = await screen.findByText('Notification message');
    expect(notification).toBeInTheDocument();
  });
});
