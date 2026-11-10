"use client";

import React, { useEffect, useState } from "react";

interface ShopLogoProps {
  shopName?: string;
  logoUrl?: string;
  isLoading?: boolean;
  sizeClass?: string;
  textClass?: string;
  ringClass?: string;
  roundedClass?: string;
}

export function getShopInitials(name?: string): string {
  const cleaned = (name || "").trim();
  if (!cleaned) return "V";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toLocaleUpperCase("tr-TR");
  }
  return cleaned.slice(0, 2).toLocaleUpperCase("tr-TR");
}

/**
 * Dükkan logosu bileşeni:
 * - Veri yüklenirken (isLoading) asla varsayılan/eski logo basmaz; iskelet animasyonu gösterir.
 * - Veri geldiğinde shop.logo_url varsa doğrudan yeni logoyu pürüzsüzce gösterir; yoksa baş harf rozeti gösterir.
 */
export default function ShopLogo({
  shopName,
  logoUrl,
  isLoading = false,
  sizeClass = "h-10 w-10",
  textClass = "text-sm",
  ringClass = "ring-2 ring-amber-400/50",
  roundedClass = "rounded-full",
}: ShopLogoProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  if (isLoading) {
    return (
      <div
        className={`${sizeClass} shrink-0 animate-pulse bg-amber-500/20 rounded-full`}
        aria-hidden="true"
      />
    );
  }

  const trimmedUrl = (logoUrl || "").trim();
  if (trimmedUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmedUrl}
        alt={shopName || "Salon Logosu"}
        onError={() => setImgError(true)}
        className={`${sizeClass} shrink-0 ${roundedClass} object-cover shadow-md ${ringClass}`}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center ${roundedClass} border border-[#e6ccb2]/40 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black tracking-tight text-[#1a110b] shadow-md ${textClass} ${ringClass}`}
      aria-label={shopName || "Salon Logosu"}
    >
      {getShopInitials(shopName)}
    </div>
  );
}
