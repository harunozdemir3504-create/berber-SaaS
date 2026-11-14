/**
 * Reels Reklam Stüdyosu — Ses Motoru
 *
 *  - ReelsAudio: Tamamen Web Audio API (OscillatorNode + gürültü) ile üretilen ses efektleri.
 *    Dışarıdan hiçbir ses dosyası gerekmez.
 *  - Türkçe TTS yardımcıları: window.speechSynthesis (tr-TR) için erkek/tok ses seçimi.
 */

export type SfxName =
  | "ringtone"
  | "buzzer"
  | "ding"
  | "cashTick"
  | "cashRegister"
  | "whoosh"
  | "pop"
  | "thud"
  | "scan"
  | "sparkle"
  | "womp"
  | "countBeep"
  | "countGo"
  | "bassHit";

type OscType = "sine" | "square" | "sawtooth" | "triangle";

interface ToneOpts {
  freq: number;
  freqEnd?: number;
  type?: OscType;
  start?: number; // saniye (şimdiden itibaren)
  dur: number;
  vol?: number;
  attack?: number;
  /** true: ses sonuna doğru üstel sönümlenir (zil / çan), false: dikdörtgen zarf */
  decay?: boolean;
  detune?: number;
}

interface NoiseOpts {
  start?: number;
  dur: number;
  vol?: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
}

export class ReelsAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** Efekt yolu: sfx → lowpass → master (yumuşatılmış) */
  private sfx: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private voiceBuffer: AudioBuffer | null = null;
  private voiceSource: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  /** Yüklenmiş ses (MP3/WAV) süresi, sn. Yoksa 0. */
  get voiceDuration(): number {
    return this.voiceBuffer?.duration ?? 0;
  }

  /** Kullanıcının seçtiği ses dosyasını çözer. */
  async loadVoice(file: File): Promise<number> {
    if (!this.init() || !this.ctx) throw new Error("AudioContext yok");
    const data = await file.arrayBuffer();
    const buf = await new Promise<AudioBuffer>((resolve, reject) => {
      this.ctx!.decodeAudioData(data, resolve, reject);
    });
    this.voiceBuffer = buf;
    return buf.duration;
  }

  clearVoice() {
    this.stopVoice();
    this.voiceBuffer = null;
  }

  /** Yüklü sesi baştan çalar (hoparlör + kayıt akışı). */
  playVoice() {
    if (!this.ctx || !this.voiceBuffer || !this.voiceBus) return;
    this.stopVoice();
    const src = this.ctx.createBufferSource();
    src.buffer = this.voiceBuffer;
    src.connect(this.voiceBus);
    src.start(this.ctx.currentTime + 0.02);
    this.voiceSource = src;
  }

  stopVoice() {
    try {
      this.voiceSource?.stop();
    } catch {
      /* ignore */
    }
    this.voiceSource = null;
  }

  /** MediaRecorder için efekt + ses karışımı akışı. */
  getRecordingStream(): MediaStream | null {
    return this.streamDest?.stream ?? null;
  }

  /** Kullanıcı tıklamasından (user gesture) çağrılmalı. */
  init(): boolean {
    if (typeof window === "undefined") return false;
    try {
      if (!this.ctx) {
        const AC: typeof AudioContext | undefined =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 24;
        comp.ratio.value = 6;
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        this.streamDest = this.ctx.createMediaStreamDestination();
        // Kayıt, sessize alınsa bile temiz karışımı alsın diye compressor çıkışından
        comp.connect(this.streamDest);
        // Efektler: yumuşak (lowpass) ve sesin altında
        const lp = this.ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 7200;
        lp.Q.value = 0.5;
        this.sfx = this.ctx.createGain();
        this.sfx.gain.value = 0.7;
        this.sfx.connect(lp);
        lp.connect(this.master);
        this.voiceBus = this.ctx.createGain();
        this.voiceBus.gain.value = 1;
        this.voiceBus.connect(this.master);
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return true;
    } catch {
      return false;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
  }

  dispose() {
    try {
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.voiceBus = null;
    this.streamDest = null;
    this.voiceSource = null;
    this.noiseBuffer = null;
  }

  // ---------------------------------------------------------------- yardımcılar

  private tone(o: ToneOpts) {
    const ctx = this.ctx;
    const master = this.sfx;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + (o.start ?? 0);
    const vol = o.vol ?? 0.25;
    const attack = o.attack ?? 0.005;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, o.freqEnd),
        t0 + o.dur
      );
    }
    if (o.detune) osc.detune.value = o.detune;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    if (o.decay) {
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    } else {
      g.gain.setValueAtTime(vol, Math.max(t0 + attack, t0 + o.dur - 0.015));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    }
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.03);
  }

  private noise(o: NoiseOpts) {
    const ctx = this.ctx;
    const master = this.sfx;
    if (!ctx || !master) return;
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate; // 1 sn beyaz gürültü
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    const t0 = ctx.currentTime + (o.start ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = o.filter ?? "bandpass";
    filt.frequency.setValueAtTime(o.freq ?? 2000, t0);
    if (o.freqEnd) {
      filt.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + o.dur);
    }
    filt.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const vol = o.vol ?? 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.01, o.dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + o.dur + 0.03);
  }

  /** Çan / zil tınısı: temel + inharmonik üst sesler. */
  private bell(freq: number, start: number, dur: number, vol: number) {
    this.tone({ freq, start, dur, vol, decay: true, attack: 0.004 });
    this.tone({
      freq: freq * 2.0,
      start,
      dur: dur * 0.7,
      vol: vol * 0.45,
      decay: true,
      attack: 0.003,
    });
    this.tone({
      freq: freq * 2.76,
      start,
      dur: dur * 0.4,
      vol: vol * 0.25,
      decay: true,
      attack: 0.003,
    });
    this.tone({
      freq: freq * 5.4,
      start,
      dur: dur * 0.18,
      vol: vol * 0.12,
      decay: true,
      attack: 0.002,
    });
  }

  // ---------------------------------------------------------------- efektler

  play(name: SfxName) {
    if (this.muted || !this.ctx) return;
    switch (name) {
      case "ringtone":
        return this.ringtone();
      case "buzzer":
        return this.buzzer();
      case "ding":
        return this.ding();
      case "cashTick":
        return this.cashTick();
      case "cashRegister":
        return this.cashRegister();
      case "whoosh":
        return this.whoosh();
      case "pop":
        return this.pop();
      case "thud":
        return this.thud();
      case "scan":
        return this.scan();
      case "sparkle":
        return this.sparkle();
      case "womp":
        return this.womp();
      case "bassHit":
        return this.bassHit();
      case "countBeep":
        return this.tone({ freq: 880, dur: 0.16, vol: 0.28, type: "sine" });
      case "countGo":
        this.tone({ freq: 1320, dur: 0.32, vol: 0.3, type: "sine", decay: true });
        this.tone({ freq: 1760, dur: 0.32, vol: 0.14, type: "sine", decay: true });
        return;
    }
  }

  /** Rahatsız edici eski tip telefon zili: çift "trrr-trrr" (≈2 sn). */
  private ringtone() {
    const burst = (start: number) => {
      // 25 ms'lik hızlı iki-frekans geçişi = klasik zil titreşimi
      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const f = i % 2 === 0 ? 1040 : 1330;
        this.tone({
          freq: f,
          start: start + i * 0.028,
          dur: 0.03,
          vol: 0.16,
          type: "square",
          attack: 0.002,
        });
      }
    };
    burst(0);
    burst(0.5);
    burst(1.3);
    burst(1.8);
  }

  /** Hata / iptal sesi: iki kısa "bzzzt". */
  private buzzer() {
    for (let i = 0; i < 2; i++) {
      const s = i * 0.3;
      this.tone({ freq: 150, start: s, dur: 0.24, vol: 0.22, type: "sawtooth" });
      this.tone({
        freq: 156,
        start: s,
        dur: 0.24,
        vol: 0.18,
        type: "square",
        detune: 12,
      });
    }
  }

  /** Tok & lüks bildirim: yumuşak, sıcak iki notalı "Ding!" (iPhone / Apple Pay hissi). */
  private ding() {
    // sıcak alt gövde
    this.tone({ freq: 220, freqEnd: 165, dur: 0.22, vol: 0.2, decay: true, attack: 0.01 });
    // saf sinüs çan: G5 → D6 (yumuşak, tiz üst sesler çok az)
    this.tone({ freq: 784, start: 0, dur: 1.4, vol: 0.26, decay: true, attack: 0.006 });
    this.tone({ freq: 1568, start: 0, dur: 0.8, vol: 0.07, decay: true, attack: 0.006 });
    this.tone({ freq: 1175, start: 0.12, dur: 1.7, vol: 0.26, decay: true, attack: 0.006 });
    this.tone({ freq: 2350, start: 0.12, dur: 0.9, vol: 0.06, decay: true, attack: 0.006 });
    this.tone({ freq: 587, start: 0.12, dur: 1.2, vol: 0.12, decay: true, attack: 0.01 });
  }

  /** Kasa tıkırtısı: yumuşak, kısa "tık". */
  private cashTick() {
    this.noise({ dur: 0.04, vol: 0.09, filter: "bandpass", freq: 2400, q: 1.2 });
    this.tone({ freq: 1100, freqEnd: 900, dur: 0.05, vol: 0.09, type: "triangle", decay: true });
    this.tone({ freq: 160, freqEnd: 90, dur: 0.07, vol: 0.14, decay: true });
  }

  /** Kasa çekmecesi açılışı: tok "ka-ching" (yumuşatılmış). */
  private cashRegister() {
    this.noise({ dur: 0.1, vol: 0.12, filter: "bandpass", freq: 1800, q: 0.8 });
    this.tone({ freq: 150, freqEnd: 80, dur: 0.16, vol: 0.24, decay: true });
    this.tone({ freq: 1568, start: 0.07, dur: 1.0, vol: 0.2, decay: true, attack: 0.005 });
    this.tone({ freq: 3136, start: 0.07, dur: 0.5, vol: 0.05, decay: true, attack: 0.005 });
    this.tone({ freq: 2093, start: 0.19, dur: 1.2, vol: 0.19, decay: true, attack: 0.005 });
    this.tone({ freq: 4186, start: 0.19, dur: 0.5, vol: 0.04, decay: true, attack: 0.005 });
  }

  /** Hafif sinematik bas vuruşu (sahne geçişi). */
  private bassHit() {
    this.tone({ freq: 90, freqEnd: 42, dur: 0.7, vol: 0.5, decay: true, attack: 0.008 });
    this.tone({ freq: 45, freqEnd: 32, dur: 0.9, vol: 0.4, decay: true, attack: 0.01 });
    this.noise({ dur: 0.25, vol: 0.05, filter: "lowpass", freq: 500, freqEnd: 120 });
  }

  private whoosh() {
    this.noise({
      dur: 0.45,
      vol: 0.07,
      filter: "bandpass",
      freq: 300,
      freqEnd: 2200,
      q: 0.6,
    });
  }

  private pop() {
    this.tone({ freq: 520, freqEnd: 900, dur: 0.1, vol: 0.14, decay: true });
  }

  private thud() {
    this.tone({ freq: 110, freqEnd: 40, dur: 0.5, vol: 0.45, decay: true, attack: 0.008 });
    this.noise({ dur: 0.1, vol: 0.06, filter: "lowpass", freq: 500 });
  }

  private scan() {
    this.tone({ freq: 1850, dur: 0.07, vol: 0.2, type: "square" });
    this.tone({ freq: 2450, start: 0.1, dur: 0.1, vol: 0.2, type: "square" });
  }

  private sparkle() {
    [1568, 1976, 2349, 3136, 3951].forEach((f, i) => {
      this.tone({
        freq: f,
        start: i * 0.075,
        dur: 0.5,
        vol: 0.1,
        decay: true,
        attack: 0.003,
      });
    });
  }

  /** Üzgün trombon "womp-womp". */
  private womp() {
    const seq = [
      { f: 311, s: 0, d: 0.22 },
      { f: 294, s: 0.25, d: 0.22 },
      { f: 277, s: 0.5, d: 0.22 },
      { f: 247, s: 0.75, d: 0.6, end: 196 },
    ];
    seq.forEach((n) =>
      this.tone({
        freq: n.f,
        freqEnd: n.end,
        start: n.s,
        dur: n.d,
        vol: 0.16,
        type: "sawtooth",
        decay: true,
      })
    );
  }
}

// ======================================================================== TTS

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Tarayıcının Türkçe seslerini (tr-TR / tr) döndürür. */
export function getTurkishVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => /^tr([-_]|$)/i.test(v.lang) || /turk|türk/i.test(v.name));
}

const MALE_HINT = /tolga|cem\b|ahmet|erkek|male|mehmet|emre|kemal/i;
const FEMALE_HINT = /yelda|filiz|seda|female|kad[ıi]n|ayşe|ayse|zeynep|emel/i;

/** Erkek / tok Türkçe sesi tercih eder; yoksa herhangi bir Türkçe ses. */
export function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  preferredURI?: string
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  if (preferredURI) {
    const p = voices.find((v) => v.voiceURI === preferredURI);
    if (p) return p;
  }
  return (
    voices.find((v) => MALE_HINT.test(v.name) && !FEMALE_HINT.test(v.name)) ||
    voices.find((v) => !FEMALE_HINT.test(v.name) && v.localService) ||
    voices.find((v) => !FEMALE_HINT.test(v.name)) ||
    voices[0]
  );
}

/** Sesler asenkron yüklenir; yüklenince callback çağırır. */
export function onVoicesReady(cb: () => void): () => void {
  if (!ttsSupported()) return () => {};
  const synth = window.speechSynthesis;
  const handler = () => cb();
  synth.addEventListener?.("voiceschanged", handler);
  cb();
  // Bazı tarayıcılar voiceschanged tetiklemez
  const t1 = window.setTimeout(cb, 400);
  const t2 = window.setTimeout(cb, 1500);
  return () => {
    synth.removeEventListener?.("voiceschanged", handler);
    window.clearTimeout(t1);
    window.clearTimeout(t2);
  };
}
