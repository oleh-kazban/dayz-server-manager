import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PasswordStrengthBar } from './PasswordStrengthBar';

describe('PasswordStrengthBar', () => {
  it('renders default empty state when password is empty or omitted', () => {
    const { rerender } = render(<PasswordStrengthBar password="" />);

    expect(screen.getByText('Password Strength')).toBeInTheDocument();
    expect(screen.getByText('Empty')).toBeInTheDocument();

    // Verify all 6 checklist items are displayed
    expect(screen.getByText('At least 8')).toBeInTheDocument();
    expect(screen.getByText('1+ number')).toBeInTheDocument();
    expect(screen.getByText('1+ symbol')).toBeInTheDocument();
    expect(screen.getByText('Uppercase')).toBeInTheDocument();
    expect(screen.getByText('Lowercase')).toBeInTheDocument();
    expect(screen.getByText('No spaces')).toBeInTheDocument();

    // When omitted completely (testing default props)
    rerender(
      <PasswordStrengthBar password={undefined as unknown as string} className="custom-class" />,
    );
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('evaluates weak score when 1 or 2 criteria are met', () => {
    // Only lowercase + length (2 criteria)
    render(<PasswordStrengthBar password="short" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('evaluates fair score when 3 or 4 criteria are met', () => {
    // length (>=8), lowercase, uppercase, no whitespace (4 criteria)
    render(<PasswordStrengthBar password="LongerPassword" />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('evaluates good score when exactly 5 criteria are met', () => {
    // length, lower, upper, number, no whitespace (missing symbol -> 5 criteria)
    render(<PasswordStrengthBar password="GoodPassword1" />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('evaluates strong score when all 6 criteria are met', () => {
    // length, number, symbol, upper, lower, no whitespace (6 criteria)
    render(<PasswordStrengthBar password="Str0ng!Pass1" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('applies whitespace penalty and marks no-whitespace criterion invalid', () => {
    // Has length, lower, upper, number, symbol, but contains space
    render(<PasswordStrengthBar password="Str0ng !Pass1" />);

    // Should not be strong due to space
    expect(screen.queryByText('Strong')).not.toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('penalizes passwords exceeding 64 characters', () => {
    const excessivePassword = 'Str0ng!Pass1' + 'a'.repeat(60); // 72 chars
    render(<PasswordStrengthBar password={excessivePassword} />);

    // 8-64 characters is false
    expect(screen.queryByText('Strong')).not.toBeInTheDocument();
  });
});
