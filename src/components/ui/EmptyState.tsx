import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E0D8] bg-[#FAF8F4]/60 px-6 py-14 text-center dark:border-[#41464E] dark:bg-[#20252C]/40">
      <div
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F2EDE5] text-[#696E75] dark:bg-[#343B46] dark:text-[#A7A9AA]"
      >
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-[#696E75] dark:text-[#A7A9AA]">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-lg bg-[#C18C64] px-4 py-2 text-sm font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors whitespace-nowrap shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
