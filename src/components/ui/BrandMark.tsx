import { BRAND } from '../../config/brand';

interface BrandMarkProps {
  compact?: boolean;
  showTagline?: boolean;
}

export function BrandMark({ compact = false, showTagline = true }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#343B46] text-[#FAF8F4] dark:bg-[#C69A76] dark:text-[#20252C]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="2"
            y="2"
            width="5"
            height="12"
            rx="1.2"
            fill="currentColor"
          />
          <rect
            x="9"
            y="2"
            width="5"
            height="5"
            rx="1.2"
            fill="#C18C64"
            className="dark:fill-[#20252C]"
          />
          <rect
            x="9"
            y="9"
            width="5"
            height="5"
            rx="1.2"
            fill="currentColor"
            fillOpacity="0.45"
          />
        </svg>
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="text-[14.5px] font-semibold tracking-[0.12em] text-[#343B46] dark:text-[#F4F0E9] leading-none">
            {BRAND.name}
          </div>
          {showTagline && (
            <p className="mt-1 whitespace-nowrap text-[10.5px] text-[#696E75] dark:text-[#A7A9AA] leading-none">
              {BRAND.tagline}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
