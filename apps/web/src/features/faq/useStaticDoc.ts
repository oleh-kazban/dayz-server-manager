import { useQuery } from '@tanstack/react-query';

import type { StaticDocSlug } from './types';

export const staticDocQueryKeys = {
  all: ['static-doc'] as const,
  doc: (slug: StaticDocSlug) => [...staticDocQueryKeys.all, slug] as const,
};

export async function fetchStaticDoc(slug: StaticDocSlug): Promise<string> {
  const response = await fetch(`/assets/content/${slug}.md`);
  if (!response.ok) {
    throw new Error(`Failed to fetch documentation: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export function useStaticDoc(slug: StaticDocSlug) {
  return useQuery({
    queryKey: staticDocQueryKeys.doc(slug),
    queryFn: () => fetchStaticDoc(slug),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
  });
}
