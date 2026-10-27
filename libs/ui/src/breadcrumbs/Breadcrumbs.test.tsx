import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  Breadcrumbs,
  BreadcrumbSeparator,
} from './Breadcrumbs';
import { type BreadcrumbItemData } from './Breadcrumbs.types';

const TEST_ITEMS: BreadcrumbItemData[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'servers', label: 'Servers', href: '/servers' },
  { id: 'server', label: 'EU-01', href: '/servers/eu-01' },
  { id: 'economy', label: 'types.xml' },
];

describe('Breadcrumbs', () => {
  it('renders data-driven breadcrumbs with semantic nav landmark and ordered list', () => {
    render(<Breadcrumbs items={TEST_ITEMS} />);

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    // 3 navigable links + 1 current page with role="link" aria-disabled="true"
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveTextContent('Home');
    expect(links[0]).toHaveAttribute('href', '/');

    // Last item is marked as current page
    expect(links[3]).toHaveAttribute('aria-current', 'page');
    expect(links[3]).toHaveTextContent('types.xml');
  });

  it('renders custom separators between items with aria-hidden="true"', () => {
    render(<Breadcrumbs items={TEST_ITEMS} separator={<span data-testid="custom-sep">/</span>} />);

    const separators = screen.getAllByTestId('custom-sep');
    expect(separators).toHaveLength(3);
    separators.forEach(sep => {
      expect(sep.parentElement).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('collapses items exceeding maxItems and expands upon clicking ellipsis', async () => {
    const user = userEvent.setup();

    const longItems: BreadcrumbItemData[] = [
      { id: '1', label: 'One', href: '/1' },
      { id: '2', label: 'Two', href: '/2' },
      { id: '3', label: 'Three', href: '/3' },
      { id: '4', label: 'Four', href: '/4' },
      { id: '5', label: 'Five' },
    ];

    render(
      <Breadcrumbs items={longItems} maxItems={3} itemsBeforeCollapse={1} itemsAfterCollapse={1} />,
    );

    // Initial state: One ... Five
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.queryByText('Two')).not.toBeInTheDocument();
    expect(screen.queryByText('Three')).not.toBeInTheDocument();
    expect(screen.getByText('Five')).toBeInTheDocument();

    const ellipsisBtn = screen.getByRole('button', { name: 'Show more breadcrumbs' });
    expect(ellipsisBtn).toBeInTheDocument();

    // Click ellipsis to expand
    await user.click(ellipsisBtn);

    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more breadcrumbs' })).not.toBeInTheDocument();
  });

  it('renders compound components structure correctly', () => {
    render(
      <Breadcrumbs aria-label="Custom trail">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumbs>,
    );

    expect(screen.getByRole('navigation', { name: 'Custom trail' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Settings')).toHaveAttribute('aria-current', 'page');
  });

  it('supports button onClick in BreadcrumbLink when href is not provided', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Breadcrumbs>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={handleClick}>Action Step</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumbs>,
    );

    const button = screen.getByRole('button', { name: 'Action Step' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports asChild pattern in BreadcrumbLink', () => {
    render(
      <Breadcrumbs>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="/custom" data-testid="custom-router-link">
                Custom Router Link
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumbs>,
    );

    const link = screen.getByTestId('custom-router-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/custom');
    expect(link).toHaveClass('hover:text-[var(--color-text-main)]');
  });

  it('renders standalone BreadcrumbEllipsis with custom click handler', async () => {
    const user = userEvent.setup();
    const handleExpand = vi.fn();

    render(<BreadcrumbEllipsis onClick={handleExpand} />);

    const button = screen.getByRole('button', { name: 'Show more breadcrumbs' });
    await user.click(button);

    expect(handleExpand).toHaveBeenCalledTimes(1);
  });

  it('forwards ref to navigation element and subcomponents', () => {
    const navRef = createRef<HTMLElement>();
    const linkRef = createRef<HTMLAnchorElement>();

    render(
      <Breadcrumbs ref={navRef}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink ref={linkRef} href="/ref-test">
              Ref Link
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumbs>,
    );

    expect(navRef.current).toBeInstanceOf(HTMLElement);
    expect(navRef.current?.tagName.toLowerCase()).toBe('nav');
    expect(linkRef.current).toBeInstanceOf(HTMLAnchorElement);
  });
});
