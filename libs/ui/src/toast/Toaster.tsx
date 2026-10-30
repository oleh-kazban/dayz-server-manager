import { Toaster as HotToaster, type ToasterProps as HotToasterProps } from 'react-hot-toast';

export type ToasterProps = HotToasterProps;

export function Toaster({
  position = 'top-right',
  containerStyle,
  containerClassName,
  gutter = 8,
  toastOptions,
  children,
  ...props
}: ToasterProps) {
  return (
    <HotToaster
      position={position}
      gutter={gutter}
      containerStyle={containerStyle}
      containerClassName={containerClassName}
      toastOptions={{
        className: 'font-sans text-xs',
        ...toastOptions,
      }}
      {...props}
    >
      {children}
    </HotToaster>
  );
}
