import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from './EmptyState';

describe('EmptyState Component', () => {
  it('renders title, description, icon, and action correctly via props', () => {
    render(
      <EmptyState
        icon={<span data-testid="icon">SEARCH_ICON</span>}
        title="No survivors found"
        description="Try adjusting your filter parameters to see more records."
        action={<button type="button">Clear filters</button>}
        data-testid="empty-state"
      />,
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('No survivors found');
    expect(
      screen.getByText('Try adjusting your filter parameters to see more records.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('applies variant styling classes properly', () => {
    const { rerender } = render(
      <EmptyState title="Default Variant" variant="default" data-testid="empty-state" />,
    );
    expect(screen.getByTestId('empty-state')).toHaveClass('py-10');

    rerender(<EmptyState title="Dashed Variant" variant="dashed" data-testid="empty-state" />);
    expect(screen.getByTestId('empty-state')).toHaveClass('border-dashed');

    rerender(<EmptyState title="Compact Variant" variant="compact" data-testid="empty-state" />);
    expect(screen.getByTestId('empty-state')).toHaveClass('py-5');
  });

  it('supports custom heading tags for title', () => {
    const { rerender } = render(<EmptyState title="Level 2" titleAs="h2" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Level 2');

    rerender(<EmptyState title="Level 4" titleAs="h4" />);
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Level 4');
  });

  it('renders slot-based compound subcomponents properly', () => {
    render(
      <EmptyState data-testid="empty-state">
        <EmptyState.Icon data-testid="custom-icon">ICON</EmptyState.Icon>
        <EmptyState.Title as="h2" data-testid="custom-title">
          No Backups Found
        </EmptyState.Title>
        <EmptyState.Description data-testid="custom-desc">
          Automated snapshots run daily at 04:00 UTC.
        </EmptyState.Description>
        <EmptyState.Actions data-testid="custom-actions">
          <button type="button">Backup Now</button>
        </EmptyState.Actions>
      </EmptyState>,
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByTestId('custom-title')).toHaveTextContent('No Backups Found');
    expect(screen.getByTestId('custom-desc')).toHaveTextContent('Automated snapshots run daily');
    expect(screen.getByRole('button', { name: /backup now/i })).toBeInTheDocument();
  });

  it('renders named subcomponents identically', () => {
    render(
      <EmptyState>
        <EmptyStateIcon>ICON</EmptyStateIcon>
        <EmptyStateTitle>Named Subcomponents</EmptyStateTitle>
        <EmptyStateDescription>Named description copy</EmptyStateDescription>
        <EmptyStateActions>
          <button type="button">Action</button>
        </EmptyStateActions>
      </EmptyState>,
    );

    expect(screen.getByText('Named Subcomponents')).toBeInTheDocument();
    expect(screen.getByText('Named description copy')).toBeInTheDocument();
  });

  it('forwards refs correctly', () => {
    const rootRef = createRef<HTMLDivElement>();
    const titleRef = createRef<HTMLHeadingElement>();

    render(
      <EmptyState ref={rootRef}>
        <EmptyState.Title ref={titleRef}>Ref Title</EmptyState.Title>
      </EmptyState>,
    );

    expect(rootRef.current).toBeInstanceOf(HTMLDivElement);
    expect(titleRef.current).toBeInstanceOf(HTMLHeadingElement);
  });
});
