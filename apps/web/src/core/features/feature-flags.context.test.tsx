import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODULE_FLAGS,
  FeatureFlagsProvider,
  useFeatureFlag,
  useFeatureFlags,
} from './index';

function TestConsumer() {
  const { flags } = useFeatureFlags();
  const isMapEnabled = useFeatureFlag('worldMap');
  const isCombatEnabled = useFeatureFlag('combatForensics');

  return (
    <div>
      <span data-testid="world-map">{isMapEnabled ? 'enabled' : 'disabled'}</span>
      <span data-testid="combat">{isCombatEnabled ? 'enabled' : 'disabled'}</span>
      <span data-testid="flags-count">{Object.keys(flags).length}</span>
    </div>
  );
}

describe('FeatureFlagsContext', () => {
  it('returns default module flags when used outside provider', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('world-map')).toHaveTextContent('enabled');
    expect(screen.getByTestId('combat')).toHaveTextContent('disabled');
    expect(screen.getByTestId('flags-count')).toHaveTextContent(
      String(Object.keys(DEFAULT_MODULE_FLAGS).length),
    );
  });

  it('provides default flags when rendered within FeatureFlagsProvider', () => {
    render(
      <FeatureFlagsProvider>
        <TestConsumer />
      </FeatureFlagsProvider>,
    );
    expect(screen.getByTestId('world-map')).toHaveTextContent('enabled');
    expect(screen.getByTestId('combat')).toHaveTextContent('disabled');
  });

  it('allows overriding specific flags via initialFlags', () => {
    render(
      <FeatureFlagsProvider initialFlags={{ worldMap: false, combatForensics: true }}>
        <TestConsumer />
      </FeatureFlagsProvider>,
    );
    expect(screen.getByTestId('world-map')).toHaveTextContent('disabled');
    expect(screen.getByTestId('combat')).toHaveTextContent('enabled');
  });
});
