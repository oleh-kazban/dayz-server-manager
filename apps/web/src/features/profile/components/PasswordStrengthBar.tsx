import { Check } from 'lucide-react';

export interface PasswordStrengthBarProps {
  password: string;
  className?: string;
}

export function PasswordStrengthBar({ password = '', className = '' }: PasswordStrengthBarProps) {
  const hasLength = password.length >= 8 && password.length <= 64;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{}|;':",.<>?/~`\\]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNoWhitespace = password.length > 0 && !/\s/.test(password);

  const checklist = [
    { label: 'At least 8', valid: hasLength },
    { label: '1+ number', valid: hasNumber },
    { label: '1+ symbol', valid: hasSymbol },
    { label: 'Uppercase', valid: hasUpper },
    { label: 'Lowercase', valid: hasLower },
    { label: 'No spaces', valid: hasNoWhitespace },
  ];

  const metCount = [hasLength, hasNumber, hasSymbol, hasUpper, hasLower, hasNoWhitespace].filter(
    Boolean,
  ).length;

  let score = 0;
  let label = 'Empty';
  let barColorClass = 'bg-[var(--color-border-subtle)]';
  let labelColorClass = 'text-[var(--color-text-muted)]';

  if (password.length > 0) {
    if (metCount <= 2) {
      score = 1;
      label = 'Weak';
      barColorClass = 'bg-[var(--color-danger,#e05252)]';
      labelColorClass = 'text-[var(--color-danger,#e05252)]';
    } else if (metCount <= 4) {
      score = 2;
      label = 'Fair';
      barColorClass = 'bg-orange-500';
      labelColorClass = 'text-orange-500 dark:text-orange-400';
    } else if (metCount === 5) {
      score = 3;
      label = 'Good';
      barColorClass = 'bg-[var(--color-warning,#bb8a3e)]';
      labelColorClass = 'text-[var(--color-warning,#bb8a3e)]';
    } else {
      score = 4;
      label = 'Strong';
      barColorClass = 'bg-[var(--color-success,#27a88c)]';
      labelColorClass = 'text-[var(--color-success,#27a88c)]';
    }
  }

  return (
    <div className={`space-y-2 mt-2 ${className}`.trim()}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-text-muted)]">Password Strength</span>
        <span className={`font-semibold transition-colors ${labelColorClass}`}>{label}</span>
      </div>

      {/* 4 Segmented Strength Blocks */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[0, 1, 2, 3].map(index => {
          const isFilled = index < score;
          return (
            <div
              key={index}
              className={`h-full rounded-full transition-all duration-200 ${
                isFilled ? barColorClass : 'bg-[var(--color-border-subtle)]'
              }`}
            />
          );
        })}
      </div>

      {/* 2-Column Tips Grid: 3 rows x 2 cols with content-hugging widths */}
      <div className="grid grid-cols-[max-content_max-content] gap-x-6 gap-y-1 pt-1">
        {checklist.map(item => (
          <div
            key={item.label}
            className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              item.valid ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'
            }`}
          >
            {item.valid ? (
              <Check className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0 stroke-[2.5]" />
            ) : (
              <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]/50" />
              </span>
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
