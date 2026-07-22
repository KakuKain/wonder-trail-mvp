import { assets } from "../data/assets";
import type { MarketChallengeConfig, MarketDifficultyConfig, MarketDifficultyId, MarketQuestionMode, RubySegment } from "../types";

export const marketItemPrices: Record<string, number> = { apple: 2, pine_cone: 2, pink_flower: 3, mushroom: 3, acorn: 3 };
export const marketShelfItemIds = ["apple", "pine_cone", "pink_flower", "mushroom", "acorn"];
export const marketItemSpeech: Record<string, { counter: string; ruby: string }> = {
  apple: { counter: "顆", ruby: "ㄆㄧㄥˊ ㄍㄨㄛˇ" }, pine_cone: { counter: "顆", ruby: "ㄙㄨㄥ ㄍㄨㄛˇ" },
  pink_flower: { counter: "朵", ruby: "ㄈㄣˇ ㄏㄨㄥˊ ㄏㄨㄚ" }, mushroom: { counter: "個", ruby: "ㄇㄛˊ ㄍㄨ" }, acorn: { counter: "顆", ruby: "ㄒㄧㄤˋ ㄍㄨㄛˇ" },
};

export function marketPrice(challenge: MarketChallengeConfig, assetId: string) { return challenge.prices[assetId] ?? marketItemPrices[assetId] ?? 0; }
export function marketTotal(challenge: MarketChallengeConfig) { return challenge.order.reduce((sum, item) => sum + marketPrice(challenge, item.assetId) * item.count, 0); }
export function marketQuestionValue(challenge: MarketChallengeConfig, mode: MarketQuestionMode) { return mode === "number-recognition" ? challenge.order.reduce((sum, item) => sum + item.count, 0) : marketTotal(challenge); }
export function marketBasketMatches(challenge: MarketChallengeConfig, basket: Record<string, number>) { return challenge.order.every((item) => (basket[item.assetId] ?? 0) === item.count); }
export function marketRequiredCount(challenge: MarketChallengeConfig, assetId: string) { return challenge.order.find((item) => item.assetId === assetId)?.count ?? 0; }
export function marketAnswerOptions(total: number, challengeId: string) {
  const candidates = Array.from(new Set([total - 1, total, total + 1, total + 2].filter((value) => value > 0))).slice(0, 3);
  let seed = Array.from(challengeId).reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
  for (let index = candidates.length - 1; index > 0; index -= 1) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const swapIndex = seed % (index + 1); [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]]; }
  return candidates;
}
export function isMarketDifficultyUnlocked(difficulty: MarketDifficultyConfig, completed: MarketDifficultyId[]) { return !difficulty.unlockAfter || completed.includes(difficulty.unlockAfter); }
export function marketCalculationLines(challenge: MarketChallengeConfig) { return challenge.order.flatMap((item) => Array.from({ length: item.count }, (_, index) => ({ key: `${item.assetId}-${index}`, assetId: item.assetId, price: marketPrice(challenge, item.assetId) }))); }
export function randomizeMarketChallenge(template: MarketChallengeConfig, seed: number) {
  let state = (Math.floor(seed) ^ Array.from(template.id).reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261)) >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const randomBetween = (minimum: number, maximum: number) => minimum + Math.floor(random() * (maximum - minimum + 1));
  const shuffledItems = [...marketShelfItemIds];
  for (let index = shuffledItems.length - 1; index > 0; index -= 1) { const swapIndex = Math.floor(random() * (index + 1)); [shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]]; }
  const rules: Record<MarketDifficultyId, { itemTypeMinimum: number; itemTypeMaximum: number; totalMinimum: number; totalMaximum: number }> = { beginner: { itemTypeMinimum: 1, itemTypeMaximum: 1, totalMinimum: 1, totalMaximum: 3 }, intermediate: { itemTypeMinimum: 1, itemTypeMaximum: 2, totalMinimum: 2, totalMaximum: 3 }, advanced: { itemTypeMinimum: 2, itemTypeMaximum: 3, totalMinimum: 3, totalMaximum: 4 }, boss: { itemTypeMinimum: 3, itemTypeMaximum: 4, totalMinimum: 4, totalMaximum: 5 } };
  const rule = rules[template.difficulty]; const itemTypeCount = randomBetween(rule.itemTypeMinimum, rule.itemTypeMaximum); const totalCount = randomBetween(Math.max(rule.totalMinimum, itemTypeCount), rule.totalMaximum); const order = shuffledItems.slice(0, itemTypeCount).map((assetId) => ({ assetId, count: 1 }));
  for (let remaining = totalCount - itemTypeCount; remaining > 0; remaining -= 1) order[Math.floor(random() * order.length)].count += 1;
  const requestText = `我想買 ${order.map((item) => `${item.count} ${marketItemSpeech[item.assetId].counter}${assets[item.assetId].label}`).join("和 ")}。`;
  const requestRuby: RubySegment[] = ["我想買 "]; order.forEach((item, index) => { if (index > 0) requestRuby.push("和 "); const speech = marketItemSpeech[item.assetId]; requestRuby.push(`${item.count} ${speech.counter}`, { text: assets[item.assetId].label, ruby: speech.ruby }); }); requestRuby.push("。");
  return { ...template, requestText, requestRuby, order, prices: Object.fromEntries(order.map((item) => [item.assetId, marketItemPrices[item.assetId]])) };
}
