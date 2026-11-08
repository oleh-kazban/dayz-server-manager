import { create } from 'zustand';

import type { FaqStore, FaqTab } from './types';

export const useFaqStore = create<FaqStore>(set => ({
  isOpen: false,
  activeTab: 'faq',
  searchQuery: '',
  openModal: (tab?: FaqTab) =>
    set(state => ({
      isOpen: true,
      activeTab: tab ?? state.activeTab,
      searchQuery: '',
    })),
  closeModal: () => set({ isOpen: false, searchQuery: '' }),
  toggleModal: () =>
    set(state => ({
      isOpen: !state.isOpen,
      searchQuery: '',
    })),
  setActiveTab: (tab: FaqTab) => set({ activeTab: tab }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
}));
