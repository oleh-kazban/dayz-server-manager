import type { Preview } from '@storybook/tanstack-react';

// Import design system tokens & theme definitions
import '../src/styles/theme.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disabled: true,
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global DSM theme token switcher',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'darcula', title: 'Darcula' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      return (
        <div
          data-theme={theme}
          className="min-h-[250px] w-full p-8 bg-[var(--color-canvas)] text-[var(--color-text-main)] font-sans antialiased transition-colors duration-200"
        >
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
