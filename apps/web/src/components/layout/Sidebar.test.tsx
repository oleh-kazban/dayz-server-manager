import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@dsm/features/auth';

import { Sidebar } from './Sidebar';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    invalidate: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders primary navigation sidebar with logo, sections, and user profile', () => {
    render(
      <AuthProvider>
        <Sidebar />
      </AuthProvider>,
    );

    expect(screen.getByRole('complementary', { name: 'Primary Navigation' })).toBeInTheDocument();
    expect(screen.getByText('OUTLIVE')).toBeInTheDocument();
    expect(screen.getByText('Survival network')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
  });
});
