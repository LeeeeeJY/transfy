"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

export default function AdSense() {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);
  const AD_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-test"; // Default for development

  useEffect(() => {
    try {
      if (adRef.current && !isLoaded.current && process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).adsbygoogle.push({});
        isLoaded.current = true;
      }
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  }, []);

  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) {
    // Return placeholder if no ID provided
    return (
        <div className="w-full h-[90px] flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-xs">
            광고 영역 (ID 미설정)
        </div>
    );
  }

  return (
    <div className="w-full overflow-hidden flex justify-center py-4 bg-zinc-50 dark:bg-zinc-900/50">
        <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
        />
        {/* Responsive Ad Unit */}
        <ins
            ref={adRef}
            className="adsbygoogle block"
            data-ad-client={AD_CLIENT_ID}
            data-ad-slot="1234567890" // You should make this configurable too if needed
            data-ad-format="auto"
            data-full-width-responsive="true"
            style={{ width: '100%', maxWidth: '728px', height: '90px' }} 
        ></ins>
    </div>
  );
}
