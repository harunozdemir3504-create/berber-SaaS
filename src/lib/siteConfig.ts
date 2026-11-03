/**
 * VIP Berber Randevu Sistemi - Merkezi Domain & URL Yapılandırması
 * Kalıcı ve resmi alan adı: https://viprandevusistemi.com.tr
 */

export const SITE_DOMAIN = "viprandevusistemi.com.tr";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://viprandevusistemi.com.tr";

/**
 * Berberin müşteri randevu sayfa linkini üretir.
 * Örn: getShopBookingUrl("atelier-noir") -> "https://viprandevusistemi.com.tr/atelier-noir"
 * Eğer slug belirtilmemişse ana domaini döndürür.
 */
export function getShopBookingUrl(shopSlug?: string | null): string {
  if (!shopSlug) return SITE_URL;
  const cleanSlug = shopSlug.trim().toLowerCase().replace(/^\/+/, "");
  return `${SITE_URL}/${cleanSlug}`;
}

/**
 * QR kod, afiş veya rozetlerde gösterilecek şık domain / link metni (https:// olmadan)
 * Örn: getShopDisplayUrl("atelier-noir") -> "viprandevusistemi.com.tr/atelier-noir"
 */
export function getShopDisplayUrl(shopSlug?: string | null): string {
  if (!shopSlug) return SITE_DOMAIN;
  const cleanSlug = shopSlug.trim().toLowerCase().replace(/^\/+/, "");
  return `${SITE_DOMAIN}/${cleanSlug}`;
}
