export type StaticDocSlug = 'faq' | 'history';
export type FaqTab = 'faq' | 'history';

export interface StaticDocResult {
  content: string;
  lastFetched: number;
}

export interface FaqStore {
  isOpen: boolean;
  activeTab: FaqTab;
  searchQuery: string;
  openModal: (tab?: FaqTab) => void;
  closeModal: () => void;
  toggleModal: () => void;
  setActiveTab: (tab: FaqTab) => void;
  setSearchQuery: (query: string) => void;
}
