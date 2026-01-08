"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

interface AdSenseProps {
  className?: string;
  style?: React.CSSProperties;
  slot?: string;
  format?: string;
}

export default function AdSense({ className, style, slot = "1234567890", format = "auto" }: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);
  const AD_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-test";

  useEffect(() => {
    // Prevent execution if ad is already loaded or no client ID
    if (isLoaded.current || !process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) return;

    // Check if the element is actually visible to avoid width=0 error
    if (adRef.current && (adRef.current.offsetWidth === 0 || adRef.current.offsetHeight === 0)) {
      // If hidden (e.g. desktop sidebar on mobile), don't push
      return;
    }

    try {
      // Double check if this specific ad unit is already filled
      if (adRef.current && adRef.current.getAttribute('data-ad-status') === 'filled') {
        isLoaded.current = true;
        return;
      }

      setTimeout(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const adsbygoogle = (window as any).adsbygoogle || [];
          adsbygoogle.push({});
          isLoaded.current = true;
        } catch (e) {
          // Ignore specific errors that don't affect functionality
          // "No slot size" happens when element is hidden
          // "Already has ads" happens due to React strict mode
          console.log("AdSense Push Info:", e);
        }
      }, 200); // Slightly increased delay
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  }, []);

  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) {
    // Return placeholder if no ID provided
    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-xs ${className || "w-full h-[90px]"}`}
        style={style}
      >
        광고 영역 (ID 미설정)
      </div>
    );
  }

  return (
    <div className={`overflow-hidden flex justify-center bg-zinc-50 dark:bg-zinc-900/50 ${className || "w-full py-4"}`} style={style}>
      {/* Responsive Ad Unit */}
      <ins
        ref={adRef}
        className="adsbygoogle block"
        data-ad-client={AD_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        style={style ? { display: 'block' } : { display: 'block', width: '100%', maxWidth: '728px', height: '90px' }}
      ></ins>
    </div>
  );
}
