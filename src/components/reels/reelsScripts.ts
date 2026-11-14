import type { SfxName } from "@/lib/reelsAudio";

export type ReelsModeId = 1 | 2 | 3;

export interface ReelsSceneDef {
  /** Seslendirilecek + altyazıda akacak metin */
  text: string;
  /**
   * Konuşma ilerleme eşikleri (0..1). Konuşma bu oranları geçtikçe sahnenin
   * "stage" (aşama) değeri artar. Görseller ve ses efektleri bu aşamaya bağlıdır;
   * böylece animasyon seslendirmeyle senkron kalır.
   */
  stages: number[];
  /** stage i'ye girildiğinde çalınacak efekt (index 0 = sahne başlangıcı) */
  stageSfx: (SfxName | null)[];
  /** Sahnenin en kısa süresi (ms) */
  minMs: number;
  /** Editör görünümünde sahne açıklaması */
  label: string;
}

export interface ReelsScript {
  id: ReelsModeId;
  tabLabel: string;
  title: string;
  /** Yaklaşık süre (sn) */
  approxSeconds: number;
  scenes: [ReelsSceneDef, ReelsSceneDef, ReelsSceneDef];
}

export const REELS_SCRIPTS: ReelsScript[] = [
  {
    id: 1,
    tabLabel: "🎬 Reklam 1: Telefon Çilesi",
    title: "Telefon Çilesine Son",
    approxSeconds: 18,
    scenes: [
      {
        text: "Ustam! Elin köpüklüyken çalan randevu telefonlarından bıkmadın mı?",
        stages: [0.85],
        stageSfx: ["ringtone", "buzzer"],
        minMs: 3200,
        label: "Titreyen arama kartı + ❌",
      },
      {
        text: "Müşterin uygulama indirmesin, sana da tek kuruş SMS masrafı çıkmasın! WhatsApp'tan veya QR koddan 10 saniyede randevusunu alsın.",
        stages: [0.6, 0.88],
        stageSfx: ["whoosh", "pop", "ding"],
        minMs: 6000,
        label: "3D iPhone: saat seçimi + yeşil onay",
      },
      {
        text: "Sen sadece tıraşına ve günlük kasana bak! 7 gün ücretsiz denemek için hemen mesaj at, 2 dakikada kuralım!",
        stages: [0.42],
        stageSfx: ["whoosh", "pop"],
        minMs: 5600,
        label: "Canlı 4.850 ₺ ciro sayacı + WhatsApp CTA",
      },
    ],
  },
  {
    id: 2,
    tabLabel: "🎬 Reklam 2: Kara Liste & Kapora",
    title: "Gelmeyen Müşteri & Kapora",
    approxSeconds: 18,
    scenes: [
      {
        text: "Randevu alıp dükkana gelmeyen müşteriler yüzünden koltuğun boş mu kalıyor?",
        stages: [0.5, 0.8],
        stageSfx: ["pop", "buzzer", "womp"],
        minMs: 3600,
        label: "Gelmeyen müşteri + boş koltuk",
      },
      {
        text: "VIP Sistem ile gelmeyen müşteriyi tek tuşla Kara Listeye al! Bir daha randevu isterse sistem otomatik IBAN kapora şartı koysun!",
        stages: [0.35, 0.7, 0.85],
        stageSfx: ["whoosh", "thud", "pop", "cashTick"],
        minMs: 6000,
        label: "Tek tuşla kara liste + otomatik IBAN kapora",
      },
      {
        text: "Boş koltuk varsa yedek listedeki müşteriye tek tıkla WhatsApp mesajı at, koltuğu 1 dakikada doldur!",
        stages: [0.53, 0.8],
        stageSfx: ["whoosh", "pop", "ding"],
        minMs: 5400,
        label: "Yedek liste → WhatsApp → koltuk doldu",
      },
    ],
  },
  {
    id: 3,
    tabLabel: "🎬 Reklam 3: Aynadaki QR Şov",
    title: "Aynadaki QR Kod & VIP Prestij",
    approxSeconds: 18,
    scenes: [
      {
        text: "Salonuna VIP bir prestij katmaya hazır mısın ustam?",
        stages: [0.5, 0.85],
        stageSfx: ["sparkle", "pop", "whoosh"],
        minMs: 3200,
        label: "VIP prestij tacı",
      },
      {
        text: "Aynadaki özel QR kodunu okutan müşterin, tüm ustalarını ve boş saatlerini saniyesinde görsün.",
        stages: [0.38, 0.54],
        stageSfx: ["whoosh", "scan", "ding"],
        minMs: 5400,
        label: "Ayna + QR tarama + usta/saat listesi",
      },
      {
        text: "Ayda sadece bir tıraş parasına tüm dükkan cebinde! Ücretsiz deneme linkin için hemen DM veya WhatsApp'tan yaz!",
        stages: [0.33, 0.5],
        stageSfx: ["cashTick", "cashRegister", "sparkle"],
        minMs: 5800,
        label: "1 tıraş = 1 ay + ücretsiz deneme CTA",
      },
    ],
  },
];

// -------------------------------------------------------------- metin yardımcıları

export interface WordToken {
  text: string;
  /** Orijinal metindeki başlangıç karakter indeksi (speechSynthesis charIndex eşlemesi için) */
  start: number;
  /** Bu kelimeden sonra duraklama (noktalama) var mı? */
  pause: boolean;
}

export function tokenize(text: string): WordToken[] {
  const out: WordToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({
      text: m[0],
      start: m.index,
      pause: /[.!?,;:]$/.test(m[0]),
    });
  }
  return out;
}

/**
 * CapCut tarzı altyazı sayfaları: en fazla `max` kelime,
 * noktalama sonrası yeni sayfa. Kelime indekslerinin aralığını döndürür.
 */
export function chunkWords(
  words: WordToken[],
  max = 3
): { from: number; to: number }[] {
  const chunks: { from: number; to: number }[] = [];
  let from = 0;
  for (let i = 0; i < words.length; i++) {
    const len = i - from + 1;
    const isLast = i === words.length - 1;
    if (isLast || words[i].pause || len >= max) {
      chunks.push({ from, to: i });
      from = i + 1;
    }
  }
  return chunks;
}

/** Türkçe TTS motorlarının yanlış okuduğu kelimeler için okunuş karşılıkları. */
function spokenWord(w: string): string {
  return w
    .replace(/whatsapp/gi, "Vatsap")
    .replace(/\bQR\b/g, "kiyu ar")
    .replace(/\bSMS\b/g, "es em es")
    .replace(/\bIBAN\b/g, "ayban")
    .replace(/\bDM\b/g, "di em")
    .replace(/₺/g, " lira");
}

/**
 * Seslendirilecek metni kurar ve her kelimenin okunan metindeki başlangıç
 * indeksini döndürür (onboundary charIndex → kelime eşlemesi için).
 */
export function buildSpeech(words: WordToken[]): {
  spoken: string;
  starts: number[];
} {
  let spoken = "";
  const starts: number[] = [];
  words.forEach((w, i) => {
    if (i > 0) spoken += " ";
    starts.push(spoken.length);
    spoken += spokenWord(w.text);
  });
  return { spoken, starts };
}

/** Zamana göre aktif kelime indeksi (TTS olay vermediğinde yedek). */
export function estimateWordIndex(
  words: WordToken[],
  elapsedMs: number,
  totalMs: number
): number {
  const weights = words.map((w) => w.text.length + (w.pause ? 4 : 0) + 1);
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < words.length; i++) {
    acc += weights[i];
    if (elapsedMs < (acc / sum) * totalMs) return i;
  }
  return words.length - 1;
}

/** Konuşma süresi tahmini (ms) — TTS olay vermediğinde yedek zamanlama. */
export function estimateSpeechMs(text: string, rate = 1.08): number {
  const words = tokenize(text);
  const pauses = words.filter((w) => w.pause).length;
  return Math.round((text.length * 62) / rate + pauses * 170 + 250);
}

export const SALES_WHATSAPP_DISPLAY = "0535 581 30 39";
export const SALES_WHATSAPP_URL =
  "https://wa.me/905355813039?text=Merhaba,%20VIP%20Randevu%20Sistemi%20i%C3%A7in%207%20g%C3%BCn%20%C3%BCcretsiz%20deneme%20istiyorum.";
