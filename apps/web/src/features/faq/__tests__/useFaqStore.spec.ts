import { beforeEach, describe, expect, it } from 'vitest';

import { useFaqStore } from '../useFaqStore';

describe('useFaqStore', () => {
  beforeEach(() => {
    // Reset store state to default before each test
    useFaqStore.setState({
      isOpen: false,
      activeTab: 'faq',
      searchQuery: '',
    });
  });

  it('initializes with default state', () => {
    const state = useFaqStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.activeTab).toBe('faq');
    expect(state.searchQuery).toBe('');
  });

  describe('openModal', () => {
    it('sets isOpen to true and resets searchQuery', () => {
      useFaqStore.setState({ isOpen: false, searchQuery: 'stale filter' });

      useFaqStore.getState().openModal();

      const state = useFaqStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.searchQuery).toBe('');
      expect(state.activeTab).toBe('faq');
    });

    it('sets specified activeTab when tab argument is provided', () => {
      useFaqStore.getState().openModal('history');

      const state = useFaqStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.activeTab).toBe('history');
      expect(state.searchQuery).toBe('');
    });

    it('preserves existing activeTab if no tab argument is provided', () => {
      useFaqStore.setState({ activeTab: 'history' });

      useFaqStore.getState().openModal();

      const state = useFaqStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.activeTab).toBe('history');
    });
  });

  describe('closeModal', () => {
    it('sets isOpen to false and resets searchQuery', () => {
      useFaqStore.setState({ isOpen: true, searchQuery: 'active filter' });

      useFaqStore.getState().closeModal();

      const state = useFaqStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.searchQuery).toBe('');
    });
  });

  describe('toggleModal', () => {
    it('toggles isOpen from false to true and clears searchQuery', () => {
      useFaqStore.setState({ isOpen: false, searchQuery: 'foo' });

      useFaqStore.getState().toggleModal();

      const state = useFaqStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.searchQuery).toBe('');
    });

    it('toggles isOpen from true to false and clears searchQuery', () => {
      useFaqStore.setState({ isOpen: true, searchQuery: 'bar' });

      useFaqStore.getState().toggleModal();

      const state = useFaqStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.searchQuery).toBe('');
    });
  });

  describe('setActiveTab', () => {
    it('updates activeTab without mutating isOpen or searchQuery', () => {
      useFaqStore.setState({ isOpen: true, searchQuery: 'query' });

      useFaqStore.getState().setActiveTab('history');

      const state = useFaqStore.getState();
      expect(state.activeTab).toBe('history');
      expect(state.isOpen).toBe(true);
      expect(state.searchQuery).toBe('query');
    });
  });

  describe('setSearchQuery', () => {
    it('updates searchQuery state', () => {
      useFaqStore.getState().setSearchQuery('network ports');

      expect(useFaqStore.getState().searchQuery).toBe('network ports');
    });
  });
});
