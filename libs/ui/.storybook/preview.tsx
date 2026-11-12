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
          { value: 'vanilla', title: 'Namalsk Day (Cold)' },
          { value: 'obsidian', title: 'Namalsk Night (Cold)' },
          { value: 'frostline-light', title: 'Frostline Day (Cold)' },
          { value: 'frostline-dark', title: 'Sakhal Night (Cold)' },
          { value: 'chernarus-light', title: 'Chernarus Overcast (Neutral)' },
          { value: 'chernarus-dark', title: 'Tisy Bunker (Neutral)' },
          { value: 'livonia-light', title: 'Livonia Clearing (Neutral)' },
          { value: 'livonia-dark', title: 'Nadbor Pine (Neutral)' },
          { value: 'badlands-light', title: 'Badlands Sun (Warm)' },
          { value: 'badlands-dark', title: 'Badlands Dusk (Warm)' },
          { value: 'krasno-light', title: 'Krasno Dawn (Warm)' },
          { value: 'krasno-dark', title: 'Signal Flare (Warm)' },
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
