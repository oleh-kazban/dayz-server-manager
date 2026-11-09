import type { ComponentPropsWithoutRef } from 'react';

export interface LogoProps extends ComponentPropsWithoutRef<'svg'> {
  mainColor?: string;
  secondaryColor?: string;
  isLoading?: boolean;
  animateOnHover?: boolean;
}

export function Logo({
  className = 'w-[30px] h-[31px]',
  mainColor = 'var(--color-text-main, #1a2a46)',
  secondaryColor = 'var(--color-text-secondary, #273962)',
  isLoading = false,
  animateOnHover = false,
  ...props
}: LogoProps) {
  const rootClassName = [
    'aegis-logo',
    isLoading ? 'is-loading' : '',
    animateOnHover ? 'animate-on-hover' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 241 248"
      className={rootClassName}
      aria-hidden="true"
      fillRule="evenodd"
      clipRule="evenodd"
      strokeLinejoin="round"
      strokeMiterlimit={2}
      {...props}
    >
      <g transform="translate(-682.946 -1591.975)">
        <g className="aegis-logo__tent">
          {/* Left leg */}
          <path
            className="aegis-logo__leg aegis-logo__leg--left"
            d="M802.889 1700.476l-.006-.011-57.379 99.389-62.558.02 79-136.833 9.285 16.112 9.646-16.701-9.302-16.089 31.378-54.388.012.02.011-.02 31.314 54.113z"
            fill={mainColor}
          />
          {/* Right leg */}
          <path
            className="aegis-logo__leg aegis-logo__leg--right"
            d="m843.908 1662.763 79.076 137.111-62.558-.02-47.901-82.735z"
            fill={secondaryColor}
          />
        </g>
        {/* Bridge */}
        <path
          className="aegis-logo__bridge"
          d="m842.501 1799.874-39.536 39.535-39.536-39.535 39.536-39.536z"
          fill={mainColor}
        />
      </g>
    </svg>
  );
}
