import { toast } from 'react-hot-toast';

import { CustomToast, type ToastType } from './CustomToast';

export interface ShowToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

export function showToast({
  title,
  description,
  type = 'info',
  duration = 4000,
}: ShowToastOptions) {
  return toast.custom(
    t => <CustomToast t={t} title={title} description={description} type={type} />,
    { duration },
  );
}
