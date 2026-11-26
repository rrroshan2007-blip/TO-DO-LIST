import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isBusy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#20252C]/45 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[#E5E0D8] bg-white p-6 dark:border-[#41464E] dark:bg-[#2A3038]">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="confirm-dialog-title"
            className="text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-[#696E75] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-[#696E75] dark:text-[#A7A9AA]">
          {description}
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-lg border border-[#E5E0D8] bg-white px-4 py-2 text-sm font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9] dark:hover:bg-[#343B46] transition-colors whitespace-nowrap shrink-0"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
              tone === 'danger'
                ? 'bg-[#C96F68] hover:bg-[#B85E57]'
                : 'bg-[#C18C64] hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885]'
            }`}
          >
            {isBusy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
