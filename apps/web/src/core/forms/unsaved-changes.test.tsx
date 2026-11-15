import { useState } from 'react';

import {
  createBrowserHistory,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  isFormDiscardingNavigation,
  useConfirmDiscardAll,
  useUnsavedChangesGuard,
} from './unsaved-changes';
import { UnsavedChangesProvider, UnsavedChangesScope } from './UnsavedChangesProvider';

function GuardedField({ onDiscarded = vi.fn() }: { onDiscarded?: () => void }) {
  const [value, setValue] = useState('');
  const { confirmDiscard, release } = useUnsavedChangesGuard(value !== '');
  return (
    <div>
      <input aria-label="Field" value={value} onChange={e => setValue(e.target.value)} />
      <button type="button" onClick={() => confirmDiscard(onDiscarded)}>
        Close form
      </button>
      <button type="button" onClick={release}>
        Release
      </button>
    </div>
  );
}

function DiscardAllButton({ onDiscarded }: { onDiscarded: () => void }) {
  const confirmDiscardAll = useConfirmDiscardAll();
  return (
    <button type="button" onClick={() => confirmDiscardAll(onDiscarded)}>
      Sign out
    </button>
  );
}

function renderWithRouter(initialPath = '/form', kind: 'memory' | 'browser' = 'memory') {
  const rootRoute = createRootRoute({
    component: () => (
      <UnsavedChangesProvider>
        <Outlet />
      </UnsavedChangesProvider>
    ),
  });
  const formRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/form',
    component: () => <GuardedField />,
  });
  const otherRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/other',
    component: () => <p>Other page</p>,
  });
  // Only browser history wires `beforeunload`; memory history keeps the other tests isolated.
  if (kind === 'browser') {
    window.history.replaceState(null, '', initialPath);
  }
  const history =
    kind === 'browser'
      ? createBrowserHistory()
      : createMemoryHistory({ initialEntries: [initialPath] });
  const router = createRouter({
    routeTree: rootRoute.addChildren([formRoute, otherRoute]),
    history,
  });
  render(<RouterProvider router={router} />);
  return { history, router };
}

const typeIntoField = async (value = 'edited') => {
  fireEvent.change(await screen.findByLabelText('Field'), { target: { value } });
};

const discardDialog = () => screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });

describe('isFormDiscardingNavigation', () => {
  it('treats page and active-server changes as discarding, other search changes as not', () => {
    const at = (pathname: string, search: unknown = {}) => ({ pathname, search });

    expect(isFormDiscardingNavigation(at('/a'), at('/b'))).toBe(true);
    expect(
      isFormDiscardingNavigation(at('/a', { serverId: '1' }), at('/a', { serverId: '2' })),
    ).toBe(true);
    expect(isFormDiscardingNavigation(at('/a', { serverId: '1' }), at('/a'))).toBe(true);
    expect(
      isFormDiscardingNavigation(at('/a', { serverId: '1', q: 'x' }), at('/a', { serverId: '1' })),
    ).toBe(false);
    expect(isFormDiscardingNavigation(at('/a'), at('/a'))).toBe(false);
  });
});

describe('UnsavedChangesProvider route guard', () => {
  it('navigates without asking while the form is clean', async () => {
    const { history, router } = renderWithRouter();
    await screen.findByLabelText('Field');

    act(() => history.push('/other'));

    expect(await screen.findByText('Other page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/other');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks before leaving a dirty form; "Keep editing" stays and keeps the input', async () => {
    const { history, router } = renderWithRouter();
    await typeIntoField();

    act(() => history.push('/other'));

    const dialog = await waitFor(discardDialog);
    expect(
      within(dialog).getByText(
        'You have changes that have not been saved. They will be lost if you continue.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/form');
    expect(screen.getByLabelText('Field')).toHaveValue('edited');
  });

  it('leaves after "Discard changes"', async () => {
    const { history, router } = renderWithRouter();
    await typeIntoField();

    act(() => history.push('/other'));
    fireEvent.click(
      within(await waitFor(discardDialog)).getByRole('button', { name: 'Discard changes' }),
    );

    expect(await screen.findByText('Other page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/other');
  });

  it('does not ask again once the edits are reverted', async () => {
    const { history } = renderWithRouter();
    await typeIntoField();
    await typeIntoField('');

    act(() => history.push('/other'));

    expect(await screen.findByText('Other page')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks when only the active server changes, not for unrelated search params', async () => {
    const { history, router } = renderWithRouter('/form?serverId=a');
    await typeIntoField();

    act(() => history.push('/form?serverId=a&filter=enabled'));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ filter: 'enabled' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    act(() => history.push('/form?serverId=b'));
    fireEvent.click(
      within(await waitFor(discardDialog)).getByRole('button', { name: 'Keep editing' }),
    );

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(router.state.location.search).toMatchObject({ serverId: 'a' });
  });

  it('stops blocking after release()', async () => {
    const { history } = renderWithRouter();
    await typeIntoField();

    fireEvent.click(screen.getByRole('button', { name: 'Release' }));
    act(() => history.push('/other'));

    expect(await screen.findByText('Other page')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('enables the native beforeunload prompt only while dirty', async () => {
    const { history } = renderWithRouter('/form', 'browser');
    await screen.findByLabelText('Field');

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    await typeIntoField();

    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);

    history.destroy();
  });
});

describe('confirmDiscard', () => {
  it('runs the action immediately when the source is clean', () => {
    const onDiscarded = vi.fn();
    render(
      <UnsavedChangesScope>
        <GuardedField onDiscarded={onDiscarded} />
      </UnsavedChangesScope>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close form' }));

    expect(onDiscarded).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks first when dirty and runs the action only after "Discard changes"', async () => {
    const onDiscarded = vi.fn();
    render(
      <UnsavedChangesScope>
        <GuardedField onDiscarded={onDiscarded} />
      </UnsavedChangesScope>,
    );
    await typeIntoField();

    fireEvent.click(screen.getByRole('button', { name: 'Close form' }));
    fireEvent.click(within(discardDialog()).getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onDiscarded).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close form' }));
    fireEvent.click(within(discardDialog()).getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(onDiscarded).toHaveBeenCalledTimes(1));
  });

  it('shares one dialog between concurrent requests', async () => {
    const onDiscarded = vi.fn();
    render(
      <UnsavedChangesScope>
        <GuardedField onDiscarded={onDiscarded} />
      </UnsavedChangesScope>,
    );
    await typeIntoField();

    fireEvent.click(screen.getByRole('button', { name: 'Close form' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close form' }));

    expect(screen.getAllByRole('alertdialog')).toHaveLength(1);
    fireEvent.click(within(discardDialog()).getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(onDiscarded).toHaveBeenCalledTimes(2));
  });

  it('runs directly without a provider (isolated component tests)', () => {
    const onDiscarded = vi.fn();
    render(<GuardedField onDiscarded={onDiscarded} />);
    fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'edited' } });

    fireEvent.click(screen.getByRole('button', { name: 'Close form' }));

    expect(onDiscarded).toHaveBeenCalledTimes(1);
  });
});

describe('useConfirmDiscardAll', () => {
  it('signs out directly when nothing is dirty and asks when any form is dirty', async () => {
    const onDiscarded = vi.fn();
    render(
      <UnsavedChangesScope>
        <GuardedField />
        <DiscardAllButton onDiscarded={onDiscarded} />
      </UnsavedChangesScope>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onDiscarded).toHaveBeenCalledTimes(1);

    await typeIntoField();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onDiscarded).toHaveBeenCalledTimes(1);

    fireEvent.click(within(discardDialog()).getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(onDiscarded).toHaveBeenCalledTimes(2));
  });
});
