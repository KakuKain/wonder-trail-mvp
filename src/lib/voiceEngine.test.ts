// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceQueue } from "./voiceEngine";

type FakeUtterance = {
  text: string;
  lang: string;
  pitch: number;
  rate: number;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const originalSpeechDescriptor = Object.getOwnPropertyDescriptor(window, "speechSynthesis");
let utterances: FakeUtterance[] = [];
let cancelSpeech: ReturnType<typeof vi.fn>;

beforeEach(() => {
  utterances = [];
  cancelSpeech = vi.fn();

  class FakeSpeechSynthesisUtterance implements FakeUtterance {
    text: string;
    lang = "";
    pitch = 1;
    rate = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(text: string) {
      this.text = text;
      utterances.push(this);
    }
  }

  vi.stubGlobal("SpeechSynthesisUtterance", FakeSpeechSynthesisUtterance);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: cancelSpeech, speak: vi.fn(), getVoices: () => [] },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalSpeechDescriptor) Object.defineProperty(window, "speechSynthesis", originalSpeechDescriptor);
  else Reflect.deleteProperty(window, "speechSynthesis");
});

describe("VoiceQueue", () => {
  it("keeps the replacement speech active when an interrupted utterance finishes late", () => {
    const queue = new VoiceQueue();
    const speakingStates: boolean[] = [];
    queue.subscribe((speaking) => speakingStates.push(speaking));

    queue.speak("第一題", { delayMs: 0 });
    const interruptedUtterance = utterances[0];
    queue.speak("重新播放第一題", { interrupt: true, delayMs: 0 });

    expect(cancelSpeech).toHaveBeenCalledOnce();
    expect(utterances).toHaveLength(2);
    interruptedUtterance.onend?.();
    expect(speakingStates.at(-1)).toBe(true);

    utterances[1].onend?.();
    expect(speakingStates.at(-1)).toBe(false);
  });
});
