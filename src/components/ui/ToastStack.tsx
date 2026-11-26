import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ToastStack() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="flex items-start gap-3 rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm text-[#343B46] shadow-sm dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
        >
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            {toast.type === 'success' && (
              <CheckCircle2 className="h-4 w-4 text-[#648B72] dark:text-[#79A488]" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="h-4 w-4 text-[#C96F68] dark:text-[#D8827B]" />
            )}
            {toast.type === 'info' && (
              <Info className="h-4 w-4 text-[#C18C64] dark:text-[#C69A76]" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 truncate text-xs text-[#696E75] dark:text-[#A7A9AA]">
                {toast.description}
              </p>
            )}
          </div>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                dismissToast(toast.id);
              }}
              className="shrink-0 text-xs font-semibold text-[#C18C64] hover:underline dark:text-[#C69A76]"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-0.5 text-[#696E75] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
