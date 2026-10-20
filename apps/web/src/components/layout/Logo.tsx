import type { ComponentPropsWithoutRef } from 'react';

export interface LogoProps extends ComponentPropsWithoutRef<'svg'> {
  mainColor?: string;
  secondaryColor?: string;
}

export function Logo({
  className = 'w-[30px] h-[31px]',
  mainColor = 'var(--color-text-main, #1a2a46)',
  secondaryColor = 'var(--color-text-secondary, #273962)',
  ...props
}: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 241 248"
      className={className}
      aria-hidden="true"
      fillRule="evenodd"
      clipRule="evenodd"
      strokeLinejoin="round"
      strokeMiterlimit={2}
      {...props}
    >
      <path
        d="m842.501 1799.874-39.536 39.535-39.536-39.535 39.536-39.536zM802.889 1700.476l-.006-.011-57.379 99.389-62.558.02 79-136.833 9.285 16.112 9.646-16.701-9.302-16.089 31.378-54.388.012.02.011-.02 31.314 54.113z"
        fill={mainColor}
        transform="translate(-682.946 -1591.975)"
      />
      <path
        d="m843.908 1662.763 79.076 137.111-62.558-.02-47.901-82.735z"
        fill={secondaryColor}
        transform="translate(-682.946 -1591.975)"
      />
    </svg>
  );
}
