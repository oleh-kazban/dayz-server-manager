import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SteamChallengeEventDto } from '@aegis/api-contracts';

import { SteamGuardChallengeModal } from './SteamGuardChallengeModal';

describe('SteamGuardChallengeModal (REQ-05, REQ-06)', () => {
  const mockOnSubmitOtp = vi.fn();
  const mockOnAbort = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when challenge is null', () => {
    const { container } = render(
      <SteamGuardChallengeModal
        challenge={null}
        onSubmitOtp={mockOnSubmitOtp}
        onAbort={mockOnAbort}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  describe('OTP Code Challenge Flow (REQ-06)', () => {
    const otpChallenge: SteamChallengeEventDto = {
      challengeId: '11111111-2222-3333-4444-555555555555',
      type: 'OTP_CODE',
      timeoutSeconds: 90,
      createdAt: new Date().toISOString(),
    };

    it('renders OTP modal headers, countdown timer, and input', () => {
      render(
        <SteamGuardChallengeModal
          challenge={otpChallenge}
          onSubmitOtp={mockOnSubmitOtp}
          onAbort={mockOnAbort}
        />,
      );

      expect(screen.getByText('Steam Guard Code Required')).toBeInTheDocument();
      expect(screen.getByText('90s remaining')).toBeInTheDocument();
      expect(screen.getByLabelText('Steam Guard Code')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Submit Code/i })).toBeDisabled();
    });

    it('forces uppercase alphanumeric characters and limits input to 5 characters', () => {
      render(
        <SteamGuardChallengeModal
          challenge={otpChallenge}
          onSubmitOtp={mockOnSubmitOtp}
          onAbort={mockOnAbort}
        />,
      );

      const input = screen.getByLabelText('Steam Guard Code') as HTMLInputElement;

      // Type lowercase and symbols
      fireEvent.change(input, { target: { value: '8k9-b2xyz' } });
      expect(input.value).toBe('8K9B2');
    });

    it('enables submit button only when 5 characters are entered and calls onSubmitOtp', async () => {
      render(
        <SteamGuardChallengeModal
          challenge={otpChallenge}
          onSubmitOtp={mockOnSubmitOtp}
          onAbort={mockOnAbort}
        />,
      );

      const input = screen.getByLabelText('Steam Guard Code');
      const submitBtn = screen.getByRole('button', { name: /Submit Code/i });

      // Incomplete code (4 chars)
      fireEvent.change(input, { target: { value: '8K9B' } });
      expect(submitBtn).toBeDisabled();

      // Complete code (5 chars)
      fireEvent.change(input, { target: { value: '8K9B2' } });
      expect(submitBtn).not.toBeDisabled();

      await act(async () => {
        fireEvent.click(submitBtn);
      });
      expect(mockOnSubmitOtp).toHaveBeenCalledWith('8K9B2');
    });

    it('calls onAbort when clicking Cancel or the Close icon button', () => {
      render(
        <SteamGuardChallengeModal
          challenge={otpChallenge}
          onSubmitOtp={mockOnSubmitOtp}
          onAbort={mockOnAbort}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnAbort).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByLabelText('Close dialog'));
      expect(mockOnAbort).toHaveBeenCalledTimes(2);
    });
  });

  describe('Mobile Push Confirmation Flow (REQ-05, REQ-06)', () => {
    const mobileChallenge: SteamChallengeEventDto = {
      challengeId: '22222222-3333-4444-5555-666666666666',
      type: 'MOBILE_PUSH',
      timeoutSeconds: 60,
      createdAt: new Date().toISOString(),
    };

    it('renders Mobile Push prompt and instructions without OTP input', () => {
      render(
        <SteamGuardChallengeModal
          challenge={mobileChallenge}
          onSubmitOtp={mockOnSubmitOtp}
          onAbort={mockOnAbort}
        />,
      );

      expect(screen.getByText('Steam Mobile Push Confirmation')).toBeInTheDocument();
      expect(screen.getByText(/Waiting for Steam Mobile App confirmation/i)).toBeInTheDocument();
      expect(screen.queryByLabelText('Steam Guard Code')).not.toBeInTheDocument();
      expect(screen.getByText('60s remaining')).toBeInTheDocument();
    });

    it('calls onAbort when canceling Mobile Push challenge', () => {
      render(
        <SteamGuardChallengeModal
          challenge={mobileChallenge}
          onSubmitOtp={mockOnSubmitOtp}
          onAbort={mockOnAbort}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /Cancel Login/i }));
      expect(mockOnAbort).toHaveBeenCalledTimes(1);
    });
  });
});
