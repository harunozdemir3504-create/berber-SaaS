/**
 * VIP Berber Randevu Sistemi - Merkezi Domain & URL Yapılandırması
 * Kalıcı ve resmi alan adı: https://viprandevusistemi.com.tr
 */

export const SITE_DOMAIN = "viprandevusistemi.com.tr";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://viprandevusistemi.com.tr";

/**
 * Berberin müşteri randevu sayfa linkini üretir (.../s/[dukkan-slug]).
 * Örn: getShopBookingUrl("atelier-noir") -> "https://viprandevusistemi.com.tr/s/atelier-noir"
 */
export function getShopBookingUrl(shopSlug?: string | null): string {
  const base =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : SITE_URL;
  if (!shopSlug) return base;
  const cleanSlug = shopSlug.trim().toLowerCase().replace(/^\/+/, "");
  return `${base}/s/${cleanSlug}`;
}

/**
 * QR kod, afiş veya rozetlerde gösterilecek şık domain / link metni (https:// olmadan)
 * Örn: getShopDisplayUrl("atelier-noir") -> "viprandevusistemi.com.tr/s/atelier-noir"
 */
export function getShopDisplayUrl(shopSlug?: string | null): string {
  const domain =
    typeof window !== "undefined" && window.location.host
      ? window.location.host
      : SITE_DOMAIN;
  if (!shopSlug) return domain;
  const cleanSlug = shopSlug.trim().toLowerCase().replace(/^\/+/, "");
  return `${domain}/s/${cleanSlug}`;
}

/**
 * Berberin doğrudan kendi dükkanına gideceği yönetim paneli linkini üretir.
 * Örn: getShopAdminUrl("atelier-noir") -> "https://viprandevusistemi.com.tr/admin?shop=atelier-noir"
 */
export function getShopAdminUrl(shopSlug?: string | null): string {
  const base =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : SITE_URL;
  if (!shopSlug) return `${base}/admin`;
  const cleanSlug = shopSlug.trim().toLowerCase().replace(/^\/+/, "");
  return `${base}/admin?shop=${cleanSlug}`;
}

/**
 * Gösterilecek şık yönetim paneli link metni
 * Örn: getShopAdminDisplayUrl("atelier-noir") -> "viprandevusistemi.com.tr/admin?shop=atelier-noir"
 */
export function getShopAdminDisplayUrl(shopSlug?: string | null): string {
  const domain =
    typeof window !== "undefined" && window.location.host
      ? window.location.host
      : SITE_DOMAIN;
  if (!shopSlug) return `${domain}/admin`;
  const cleanSlug = shopSlug.trim().toLowerCase().replace(/^\/+/, "");
  return `${domain}/admin?shop=${cleanSlug}`;
}

/**
 * Berbere kurulum bilgilerini tek seferde göndermek için hazır WhatsApp mesajı üretir.
 */
export function generateShopSetupShareText(options: {
  shopName: string;
  bookingUrl: string;
  adminUrl: string;
  pin: string;
}): string {
  return `💈 *${options.shopName} - VIP Randevu Sisteminiz Hazır!*

👥 *Müşteri Randevu Linkiniz (Instagram & WhatsApp için):*
${options.bookingUrl}

🛠️ *Berber Yönetim Paneli Giriş Linkiniz:*
${options.adminUrl}
🔑 *Giriş Şifreniz:* ${options.pin}`;
}
