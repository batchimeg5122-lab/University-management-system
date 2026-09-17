import { useState } from 'react';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

/**
 * Сургуулийн лого. public/brand/logo.png байхгүй эсвэл ачаалагдахгүй бол
 * системийн анхдагч SVG тэмдэг рүү автоматаар шилжинэ.
 */
export function BrandLogo({ size = 40, tone = 'light', className }: { size?: number; tone?: 'light' | 'dark'; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <span
        className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white p-1 shadow-sm ring-1 ring-black/5', className)}
        style={{ width: size, height: size }}
      >
        <img src={BRAND.logo} alt={`${BRAND.name} лого`} className="h-full w-full object-contain" onError={() => setFailed(true)} />
      </span>
    );
  }

  return (
    <svg viewBox="0 0 32 32" style={{ width: size, height: size }} className={cn('shrink-0', className)} role="img" aria-label={`${BRAND.name} лого`}>
      <rect width="32" height="32" rx="8" fill={tone === 'light' ? '#fff' : '#1E4B8F'} fillOpacity={tone === 'light' ? 0.14 : 1} />
      <path d="M9 22V10h3v12H9Zm5.5 0V10h3v12h-3ZM20 22V10h3v12h-3Z" fill="#fff" />
      <rect x="8" y="23.5" width="16" height="2" rx="1" fill={tone === 'light' ? '#E2B865' : '#B8862B'} />
    </svg>
  );
}
