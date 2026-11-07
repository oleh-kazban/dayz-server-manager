import { beforeEach, describe, expect, it } from 'vitest';

import { useLayoutStore } from './layout.store';

describe('useLayoutStore', () => {
  beforeEach(() => {
    useLayoutStore.setState({ isMobileSidebarOpen: false });
  });

  it('initializes with mobile sidebar closed', () => {
    const state = useLayoutStore.getState();
    expect(state.isMobileSidebarOpen).toBe(false);
  });

  it('opens mobile sidebar via openMobileSidebar', () => {
    useLayoutStore.getState().openMobileSidebar();
    expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(true);
  });

  it('closes mobile sidebar via closeMobileSidebar', () => {
    useLayoutStore.setState({ isMobileSidebarOpen: true });
    expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(true);

    useLayoutStore.getState().closeMobileSidebar();
    expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);
  });

  it('toggles mobile sidebar via toggleMobileSidebar', () => {
    expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);

    useLayoutStore.getState().toggleMobileSidebar();
    expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(true);

    useLayoutStore.getState().toggleMobileSidebar();
    expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);
  });
});
