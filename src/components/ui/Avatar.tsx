import { useState } from 'react';
import { getInitials } from '../../utils/validation';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-20 w-20 text-lg',
};

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-[#E5E0D8] bg-[#EDE5D9] text-[#343B46] dark:border-[#41464E] dark:bg-[#343B46] dark:text-[#F4F0E9] flex items-center justify-center font-semibold select-none ${SIZE_CLASSES[size]} ${className}`}
    >
      {showImage ? (
        <img
          src={src!}
          alt={`${name} profile`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </div>
  );
}
