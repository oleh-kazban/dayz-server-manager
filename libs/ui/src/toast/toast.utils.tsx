import { toast } from 'react-hot-toast';

import { CustomToast, type ToastType } from './CustomToast';

export interface ShowToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  customClassName?: string;
}

export function showToast({
  title,
  description,
  type = 'info',
  duration = 4000,
  customClassName,
}: ShowToastOptions): string {
  return toast.custom(
    t => (
      <CustomToast
        t={t}
        title={title}
        description={description}
        type={type}
        customClassName={customClassName}
      />
    ),
    { duration },
  );
}

showToast.success = (title: string, description?: string, duration?: number) =>
  showToast({ title, description, type: 'success', duration });

showToast.error = (title: string, description?: string, duration?: number) =>
  showToast({ title, description, type: 'error', duration });

showToast.warning = (title: string, description?: string, duration?: number) =>
  showToast({ title, description, type: 'warning', duration });

showToast.info = (title: string, description?: string, duration?: number) =>
  showToast({ title, description, type: 'info', duration });

showToast.dismiss = (toastId?: string) => {
  toast.dismiss(toastId);
};
