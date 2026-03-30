"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string | undefined | null;
  alt?: string;
  /** Shown when there is no URL or the image failed to load */
  emptyLabel?: string;
};

/**
 * Product photo with a visible fallback when the URL is missing or the image fails to load
 * (broken URLs often render as a blank area with plain `<img>` + object-cover).
 */
export function ProductImage({ src, alt = "", emptyLabel = "No image" }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const trimmed = src?.trim();
  const showImg = Boolean(trimmed) && !failed;

  if (!showImg) {
    const isError = Boolean(trimmed) && failed;
    return (
      <div
        className="flex h-full min-h-[5rem] w-full flex-col items-center justify-center gap-1.5 border border-dashed border-amber-200/80 bg-amber-50/90 px-3 py-4 text-center"
        role={isError ? "img" : undefined}
        aria-label={isError ? "Product image could not be loaded" : undefined}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="h-9 w-9 shrink-0 text-amber-600/80"
          aria-hidden
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M5 19 19 5" />
        </svg>
        <span className="text-xs font-medium text-amber-900/80">{isError ? "Image unavailable" : emptyLabel}</span>
        {isError ? <span className="max-w-[12rem] truncate text-[10px] text-amber-800/60" title={trimmed}>{trimmed}</span> : null}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote catalog URLs; load errors handled above
    <img src={trimmed} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
  );
}
