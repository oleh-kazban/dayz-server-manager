import type { Preview } from '@storybook/react';

import { StorybookThemeFrame } from './StorybookThemeFrame';

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
      defaultValue: 'vanilla',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'vanilla', title: 'Vanilla Light' },
          { value: 'obsidian', title: 'Obsidian Dark' },
          { value: 'darcula', title: 'Darcula Classic' },
          { value: 'graphite', title: 'Graphite Stealth' },
          { value: 'tokyo', title: 'Tokyo Night' },
          { value: 'catppuccin', title: 'Catppuccin Mocha' },
          { value: 'darcula-light', title: 'Darcula Light' },
          { value: 'graphite-light', title: 'Graphite Light' },
          { value: 'tokyo-light', title: 'Tokyo Day' },
          { value: 'catppuccin-latte', title: 'Catppuccin Latte' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = String(context.globals.theme || 'vanilla');
      return (
        <StorybookThemeFrame theme={theme}>
          <Story />
        </StorybookThemeFrame>
      );
    },
  ],
};

export default preview;
