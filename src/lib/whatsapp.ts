export const DEFAULT_SHOP_WHATSAPP_PHONE = "905550000000";

/**
 * Müşterinin veya dükkanın telefon numarasını (başında 0, +90, 0090 olsun veya olmasın;
 * boşluklu, parantezli veya tireli yazılmış olsun) temizleyip sadece rakamlardan oluşan
 * 905XXXXXXXXX (veya sabit hat için 902XXXXXXXXX) formatına çevirir.
 * Böylece https://wa.me/905... bağlantıları tüm cihazlarda hatasız çalışır.
 */
export function formatPhoneForWhatsApp(
  phone?: string | null,
  fallbackPhone: string = DEFAULT_SHOP_WHATSAPP_PHONE
): string {
  if (!phone) return fallbackPhone;

  // Sadece rakamları bırak (boşluk, parantez, +, tire vb. tüm karakterleri temizle)
  let digits = phone.replace(/\D/g, "");
  if (!digits) return fallbackPhone;

  // 0090 ile başlıyorsa baştaki 00'ı kaldır -> 90...
  if (digits.startsWith("0090")) {
    digits = digits.slice(2);
  }

  // +90 05XX... gibi yanlışlıkla 900 ile başlayan 13 haneli girişleri düzelt -> 905XX...
  if (digits.startsWith("900") && digits.length === 13) {
    digits = "90" + digits.slice(3);
  }

  // Zaten 90 ile başlıyor ve 12 haneli ise (örn: 905321234567) doğrudan döndür
  if (digits.startsWith("90") && digits.length === 12) {
    return digits;
  }

  // Başında 0 olan 11 haneli Türkiye numarası (örn: 05321234567) -> 905321234567
  if (digits.startsWith("0") && digits.length === 11) {
    return "90" + digits.slice(1);
  }

  // Başında 0 olmadan girilen 10 haneli numara (örn: 5321234567) -> 905321234567
  if (digits.length === 10) {
    return "90" + digits;
  }

  // 10 haneden uzunsa son 10 haneyi baz alıp başına 90 ekle
  if (digits.length > 10) {
    return "90" + digits.slice(-10);
  }

  // Geçerli uzunlukta değilse (örn: eksik rakam) varsayılan numaraya dön
  return fallbackPhone;
}

/**
 * Verilen telefon numarası ve mesaj metni ile https://wa.me/905XXXXXXXXX?text=...
 * formatında tam uyumlu WhatsApp bağlantısı üretir.
 */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
  fallbackPhone: string = DEFAULT_SHOP_WHATSAPP_PHONE
): string {
  const formattedPhone = formatPhoneForWhatsApp(phone, fallbackPhone);
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Telefon numarasını küçük ve kompakt alanlarda okunaklı, boşluklu formata çevirir.
 * Örn:
 * "05321234567" -> "0532 123 45 67"
 * "5321234567"  -> "0532 123 45 67"
 * "905321234567" -> "0532 123 45 67"
 * "+905321234567" -> "0532 123 45 67"
 */
export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return phone;

  // Başta 0090 varsa kaldır
  if (digits.startsWith("0090")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("90") && digits.length === 12) {
    digits = digits.slice(2);
  }

  // Başında 0 yoksa ve 10 haneli ise başına 0 koy (örn: 5321234567 -> 05321234567)
  if (!digits.startsWith("0") && digits.length === 10) {
    digits = "0" + digits;
  }

  // 11 haneli standart Türkiye formatı: 05XX XXX XX XX
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }

  // 10 haneli format: 5XX XXX XX XX -> 05XX XXX XX XX
  if (digits.length === 10) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }

  // Başka bir numara uzunluğu varsa okunaklı grupla
  if (digits.length > 7) {
    return digits.replace(/(\d{3,4})(?=\d)/g, "$1 ");
  }

  return phone;
}
