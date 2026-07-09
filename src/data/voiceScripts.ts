export const voiceScripts = {
  clickFeedback: ["好耶！", "小航看到了！", "有發現喔！"],
  wrongClick: ["差一點點。", "沒關係，再找找。", "小航陪你慢慢找。"],
  partialSuccess: ["找到了！", "好眼力！", "小航也看到了！"],
  reward: ["你做到了耶！", "冒險完成，太棒了！", "小航超開心！"],
  hintPrefix: "小航悄悄說，",
};

export function pickScript(items: string[], seed: number) {
  return items[Math.abs(seed) % items.length];
}
