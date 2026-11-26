import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from './AuthProvider';
import { Setup } from './Setup';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn() }),
  useSearch: () => ({}),
}));

function renderSetup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Setup />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('Setup page', () => {
  beforeEach(() => {
    document.title = 'Previous title';
  });

  it('renders the sign-in hero with the only h1 and the form heading as h2', () => {
    renderSetup();

    expect(screen.getByText('YOUR SERVER. YOUR WORLD.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Create the root account' }),
    ).toBeVisible();
  });

  it('shows the eyebrow, the intro, the info notice and the footer line', () => {
    renderSetup();

    expect(screen.getByText('FIRST-TIME SETUP')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This account owns this Aegis installation. You can add other administrators later.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'You are signed in with a temporary setup account. It is deleted when you finish.',
    );
    expect(
      screen.getByText(
        'Setup session expired? Restart Aegis. It creates new setup credentials and prints where it saved them.',
      ),
    ).toBeInTheDocument();
  });

  it('shows no navigation and no sidebar', () => {
    renderSetup();

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('sets the document title while mounted and restores the previous one on unmount', () => {
    const { unmount } = renderSetup();
    expect(document.title).toBe('Create root account - Aegis');

    unmount();

    expect(document.title).toBe('Previous title');
  });

  it('puts the initial focus on the Username field', () => {
    renderSetup();

    expect(screen.getByLabelText('Username')).toHaveFocus();
  });

  it('keeps the keyboard order Username, Password, Show, Confirm, Show, Create, Sign out', () => {
    renderSetup();

    const toggles = screen.getAllByRole('button', { name: 'Show password' });
    const order = [
      screen.getByLabelText('Username'),
      screen.getByLabelText('Password'),
      toggles[0],
      screen.getByLabelText('Confirm password'),
      toggles[1],
      screen.getByRole('button', { name: 'Create root account' }),
      screen.getByRole('button', { name: 'Sign out' }),
    ];
    const tabbable = Array.from(
      document.querySelectorAll<HTMLElement>('input, button, a[href], [tabindex]'),
    );

    expect(tabbable).toEqual(order);
  });
});
