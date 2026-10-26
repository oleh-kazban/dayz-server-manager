import { createRef, useState } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TabContent, TabList, Tabs, TabTrigger } from './Tabs';

describe('Tabs', () => {
  const defaultItems = [
    { id: 'tab1', label: 'All Items', count: 1248 },
    { id: 'tab2', label: 'Modified', count: 24 },
    { id: 'tab3', label: 'Warnings', count: 3 },
  ];

  it('renders data-driven tabs with correct ARIA roles and labels', () => {
    render(<Tabs items={defaultItems} ariaLabel="Test tablist" />);

    const tablist = screen.getByRole('tablist', { name: 'Test tablist' });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('All Items');
    expect(tabs[0]).toHaveTextContent('1248');
    expect(tabs[1]).toHaveTextContent('Modified');
  });

  it('defaults to first item when uncontrolled and updates on click', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Tabs items={defaultItems} onChange={handleChange} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');

    await user.click(tabs[1]);

    expect(handleChange).toHaveBeenCalledWith('tab2');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('respects defaultValue in uncontrolled mode', () => {
    render(<Tabs items={defaultItems} defaultValue="tab2" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('supports controlled mode via value prop', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const ControlledTabs = () => {
      const [value, setValue] = useState('tab1');
      return (
        <Tabs
          items={defaultItems}
          value={value}
          onChange={val => {
            setValue(val);
            handleChange(val);
          }}
        />
      );
    };

    render(<ControlledTabs />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    await user.click(tabs[2]);
    expect(handleChange).toHaveBeenCalledWith('tab3');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('does not activate or fire onChange when clicking a disabled tab', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const itemsWithDisabled = [
      { id: 'tab1', label: 'Active Tab' },
      { id: 'tab2', label: 'Disabled Tab', disabled: true },
    ];

    render(<Tabs items={itemsWithDisabled} onChange={handleChange} />);

    const disabledTab = screen.getByRole('tab', { name: /disabled tab/i });
    expect(disabledTab).toBeDisabled();

    await user.click(disabledTab);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('supports horizontal keyboard navigation (ArrowRight, ArrowLeft, Home, End)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Tabs items={defaultItems} onChange={handleChange} />);

    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();
    expect(tabs[0]).toHaveFocus();

    // ArrowRight -> tab2
    await user.keyboard('{ArrowRight}');
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(handleChange).toHaveBeenCalledWith('tab2');

    // ArrowRight -> tab3
    await user.keyboard('{ArrowRight}');
    expect(tabs[2]).toHaveFocus();

    // ArrowRight wrap-around -> tab1
    await user.keyboard('{ArrowRight}');
    expect(tabs[0]).toHaveFocus();

    // ArrowLeft wrap-around backwards -> tab3
    await user.keyboard('{ArrowLeft}');
    expect(tabs[2]).toHaveFocus();

    // Home -> tab1
    await user.keyboard('{Home}');
    expect(tabs[0]).toHaveFocus();

    // End -> tab3
    await user.keyboard('{End}');
    expect(tabs[2]).toHaveFocus();
  });

  it('skips disabled tabs during keyboard navigation', async () => {
    const user = userEvent.setup();

    const items = [
      { id: 'tab1', label: 'First' },
      { id: 'tab2', label: 'Second (Disabled)', disabled: true },
      { id: 'tab3', label: 'Third' },
    ];

    render(<Tabs items={items} />);

    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();

    // ArrowRight should skip tab2 and land on tab3
    await user.keyboard('{ArrowRight}');
    expect(tabs[2]).toHaveFocus();
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('renders compound components with associated tabpanels', async () => {
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="overview">
        <TabList aria-label="Compound demo">
          <TabTrigger value="overview">Overview</TabTrigger>
          <TabTrigger value="settings">Settings</TabTrigger>
        </TabList>
        <TabContent value="overview">Overview Panel Content</TabContent>
        <TabContent value="settings">Settings Panel Content</TabContent>
      </Tabs>,
    );

    expect(screen.getByRole('tabpanel')).toHaveTextContent('Overview Panel Content');
    expect(screen.queryByText('Settings Panel Content')).not.toBeInTheDocument();

    const settingsTab = screen.getByRole('tab', { name: 'Settings' });
    await user.click(settingsTab);

    expect(screen.getByRole('tabpanel')).toHaveTextContent('Settings Panel Content');
    expect(screen.queryByText('Overview Panel Content')).not.toBeInTheDocument();
  });

  it('keeps panel mounted with hidden attribute when forceMount is true', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2">Tab 2</TabTrigger>
        </TabList>
        <TabContent value="tab1" forceMount>
          Panel 1
        </TabContent>
        <TabContent value="tab2" forceMount>
          Panel 2
        </TabContent>
      </Tabs>,
    );

    const panels = screen.getAllByRole('tabpanel', { hidden: true });
    expect(panels).toHaveLength(2);
    expect(panels[0]).not.toHaveAttribute('hidden');
    expect(panels[1]).toHaveAttribute('hidden');
  });

  it('applies underline variant styles when variant="underline"', () => {
    render(<Tabs items={defaultItems} variant="underline" />);

    const tablist = screen.getByRole('tablist');
    expect(tablist.className).toContain('border-b');

    const activeTab = screen.getAllByRole('tab')[0];
    expect(activeTab.className).toContain('border-b-2');
    expect(activeTab.className).toContain('border-[var(--color-primary)]');
  });

  it('forwards container ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Tabs items={defaultItems} ref={ref} containerClassName="custom-container" />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.className).toContain('custom-container');
  });
});
