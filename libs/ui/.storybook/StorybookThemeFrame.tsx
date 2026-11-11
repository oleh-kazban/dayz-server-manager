import { type ReactNode, useEffect } from 'react';

export interface StorybookThemeFrameProps {
  theme: string;
  children: ReactNode;
}

/**
 * Applies the selected Storybook theme to `document.documentElement` and the story frame
 * so root-scoped CSS variables and Tailwind `@theme inline` tokens stay synchronized.
 */
export function StorybookThemeFrame({ theme, children }: StorybookThemeFrameProps) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div
      data-theme={theme}
      className="min-h-[250px] w-full p-8 bg-[var(--color-canvas)] text-[var(--color-text-main)] font-sans antialiased transition-colors duration-200"
    >
      {children}
    </div>
  );
}
