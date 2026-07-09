export type VoiceTone = "neutral" | "positive" | "soft";

type VoiceItem = {
  text: string;
  tone: VoiceTone;
  delayMs: number;
  interrupt: boolean;
};

const toneSettings: Record<VoiceTone, { pitch: number; rate: number }> = {
  neutral: { pitch: 1.08, rate: 0.88 },
  positive: { pitch: 1.2, rate: 0.92 },
  soft: { pitch: 1.02, rate: 0.82 },
};

export class VoiceQueue {
  private queue: VoiceItem[] = [];
  private isSpeaking = false;
  private voice?: SpeechSynthesisVoice;
  private lang = "zh-TW";

  setVoice(voice?: SpeechSynthesisVoice) {
    this.voice = voice;
    if (voice) this.lang = voice.lang;
  }

  speak(text: string, options?: Partial<VoiceItem>) {
    if (!("speechSynthesis" in window)) return;

    const item: VoiceItem = {
      text,
      tone: options?.tone ?? "neutral",
      delayMs: options?.delayMs ?? 350,
      interrupt: options?.interrupt ?? false,
    };

    if (item.interrupt) {
      this.queue = [];
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }

    this.queue.push(item);
    this.run();
  }

  cancel() {
    if (!("speechSynthesis" in window)) return;
    this.queue = [];
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
  }

  private run() {
    if (!("speechSynthesis" in window) || this.isSpeaking) return;

    const item = this.queue.shift();
    if (!item) return;

    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(item.text);
    const settings = toneSettings[item.tone];

    utterance.lang = this.lang;
    utterance.pitch = settings.pitch;
    utterance.rate = settings.rate;
    if (this.voice) utterance.voice = this.voice;

    utterance.onend = () => {
      this.isSpeaking = false;
      window.setTimeout(() => this.run(), item.delayMs);
    };
    utterance.onerror = () => {
      this.isSpeaking = false;
      window.setTimeout(() => this.run(), item.delayMs);
    };

    window.speechSynthesis.speak(utterance);
  }
}
