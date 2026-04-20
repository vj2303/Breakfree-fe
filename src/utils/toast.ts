import { toast } from 'react-toastify';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export const showToast = (
  message: string, 
  type: ToastType = 'info',
  autoClose: number = 5000
) => {
  const toastId = toast[type](message, {
    position: 'top-right',
    autoClose,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: 'light',
  });

  return toastId;
};

export const showError = (message: string, autoClose: number = 5000) => 
  showToast(message, 'error', autoClose);

export const showSuccess = (message: string, autoClose: number = 5000) => 
  showToast(message, 'success', autoClose);

export const showInfo = (message: string, autoClose: number = 5000) => 
  showToast(message, 'info', autoClose);

export const showWarning = (message: string, autoClose: number = 5000) => 
  showToast(message, 'warning', autoClose);

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const dismissAllToasts = () => {
  toast.dismiss();
};