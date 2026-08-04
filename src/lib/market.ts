import { assets } from "../data/assets";
import type { MarketChallengeConfig, MarketDifficultyConfig, MarketDifficultyId, MarketOrderLine, MarketQuestionMode, RubySegment } from "../types";

export const marketItemPrices: Record<string, number> = { apple: 2, pine_cone: 2, pink_flower: 3, mushroom: 3, acorn: 3 };
export const marketShelfItemIds = ["apple", "pine_cone", "pink_flower", "mushroom", "acorn"];
export const marketSuccessDelayMs = 1_800;
export const marketCustomersPerShift = 5;

export function marketCustomerReminder(customerName: string, requestText: string) {
  const thirdPersonRequest = requestText.replace(/^我(?=想|要)/, customerName);
  return thirdPersonRequest === requestText
    ? `${customerName}說，${requestText}`
    : thirdPersonRequest;
}

export const marketDifficultyRules: Record<MarketDifficultyId, {
  itemTypeMinimum: number;
  itemTypeMaximum: number;
  itemCountMinimum: number;
  itemCountMaximum: number;
  answerMaximum: number;
}> = {
  beginner: { itemTypeMinimum: 1, itemTypeMaximum: 1, itemCountMinimum: 1, itemCountMaximum: 3, answerMaximum: 3 },
  intermediate: { itemTypeMinimum: 1, itemTypeMaximum: 2, itemCountMinimum: 2, itemCountMaximum: 2, answerMaximum: 6 },
  advanced: { itemTypeMinimum: 2, itemTypeMaximum: 3, itemCountMinimum: 3, itemCountMaximum: 3, answerMaximum: 9 },
  boss: { itemTypeMinimum: 3, itemTypeMaximum: 4, itemCountMinimum: 4, itemCountMaximum: 5, answerMaximum: 15 },
};
export const marketItemSpeech: Record<string, { counter: string; ruby: string }> = {
  apple: { counter: "顆", ruby: "ㄆㄧㄥˊ ㄍㄨㄛˇ" }, pine_cone: { counter: "顆", ruby: "ㄙㄨㄥ ㄍㄨㄛˇ" },
  pink_flower: { counter: "朵", ruby: "ㄈㄣˇ ㄏㄨㄥˊ ㄏㄨㄚ" }, mushroom: { counter: "個", ruby: "ㄇㄛˊ ㄍㄨ" }, acorn: { counter: "顆", ruby: "ㄒㄧㄤˋ ㄍㄨㄛˇ" },
};

export function marketPrice(challenge: MarketChallengeConfig, assetId: string) { return challenge.prices[assetId] ?? marketItemPrices[assetId] ?? 0; }
export function marketTotal(challenge: MarketChallengeConfig) { return challenge.order.reduce((sum, item) => sum + marketPrice(challenge, item.assetId) * item.count, 0); }
export function marketQuestionValue(challenge: MarketChallengeConfig, mode: MarketQuestionMode) { return mode === "number-recognition" ? challenge.order.reduce((sum, item) => sum + item.count, 0) : marketTotal(challenge); }
export function marketQuantityPrompt(challenge: MarketChallengeConfig) {
  const orderedItems = challenge.order.filter((item) => item.count > 0);
  if (orderedItems.length !== 1) return "籃子裡一共有幾個商品？";
  const assetId = orderedItems[0].assetId;
  return `籃子裡有幾${marketItemSpeech[assetId]?.counter ?? "個"}${assets[assetId].label}？`;
}
export function marketBasketMatches(challenge: MarketChallengeConfig, basket: Record<string, number>) { return challenge.order.every((item) => (basket[item.assetId] ?? 0) === item.count); }
export function marketRequiredCount(challenge: MarketChallengeConfig, assetId: string) { return challenge.order.find((item) => item.assetId === assetId)?.count ?? 0; }
function seedFrom(value: number | string) {
  if (typeof value === "number") return Math.floor(value) >>> 0;
  return Array.from(value).reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
}

function createRandom(seed: number | string) {
  let state = seedFrom(seed);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function marketOrderSignature(order: MarketOrderLine[]) {
  return [...order]
    .sort((left, right) => left.assetId.localeCompare(right.assetId))
    .map((item) => `${item.assetId}:${item.count}`)
    .join("|");
}

function signatureAssets(signature: string) {
  return new Set(signature.split("|").map((item) => item.split(":")[0]).filter(Boolean));
}

export function marketAnswerOptions(total: number, seed: number | string, recentCorrectPositions: number[] = []) {
  const candidates = Array.from(new Set([total - 1, total, total + 1, total + 2].filter((value) => value > 0))).slice(0, 3);
  const random = createRandom(seed);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }

  const lastTwoPositions = recentCorrectPositions.slice(-2);
  const correctPosition = candidates.indexOf(total);
  if (
    candidates.length > 1
    && lastTwoPositions.length === 2
    && lastTwoPositions[0] === correctPosition
    && lastTwoPositions[1] === correctPosition
  ) {
    const alternatePosition = (correctPosition + 1) % candidates.length;
    [candidates[correctPosition], candidates[alternatePosition]] = [candidates[alternatePosition], candidates[correctPosition]];
  }
  return candidates;
}
export function isMarketDifficultyUnlocked(difficulty: MarketDifficultyConfig, completed: MarketDifficultyId[]) { return !difficulty.unlockAfter || completed.includes(difficulty.unlockAfter); }
export function marketCalculationLines(challenge: MarketChallengeConfig) { return challenge.order.flatMap((item) => Array.from({ length: item.count }, (_, index) => ({ key: `${item.assetId}-${index}`, assetId: item.assetId, price: marketPrice(challenge, item.assetId) }))); }
export function marketCalculationTerms(challenge: MarketChallengeConfig, mode: MarketQuestionMode) {
  if (mode === "number-recognition") return [];
  if (mode === "challenge") return challenge.order.map((item) => ({ key: item.assetId, assetId: item.assetId, price: marketPrice(challenge, item.assetId), count: item.count }));
  return marketCalculationLines(challenge).map((item) => ({ ...item, count: 1 }));
}
export function marketChallengeFitsDifficulty(challenge: MarketChallengeConfig) {
  const rule = marketDifficultyRules[challenge.difficulty];
  const itemCount = challenge.order.reduce((sum, item) => sum + item.count, 0);
  const answer = challenge.difficulty === "beginner" ? itemCount : marketTotal(challenge);
  return challenge.order.length >= rule.itemTypeMinimum
    && challenge.order.length <= rule.itemTypeMaximum
    && itemCount >= rule.itemCountMinimum
    && itemCount <= rule.itemCountMaximum
    && answer <= rule.answerMaximum;
}
function createRandomizedMarketChallenge(template: MarketChallengeConfig, seed: number) {
  const random = createRandom(seedFrom(seed) ^ seedFrom(template.id));
  const randomBetween = (minimum: number, maximum: number) => minimum + Math.floor(random() * (maximum - minimum + 1));
  const shuffledItems = [...marketShelfItemIds];
  for (let index = shuffledItems.length - 1; index > 0; index -= 1) { const swapIndex = Math.floor(random() * (index + 1)); [shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]]; }
  const rule = marketDifficultyRules[template.difficulty]; const itemTypeCount = randomBetween(rule.itemTypeMinimum, rule.itemTypeMaximum); const totalCount = randomBetween(Math.max(rule.itemCountMinimum, itemTypeCount), rule.itemCountMaximum); const order = shuffledItems.slice(0, itemTypeCount).map((assetId) => ({ assetId, count: 1 }));
  for (let remaining = totalCount - itemTypeCount; remaining > 0; remaining -= 1) order[Math.floor(random() * order.length)].count += 1;
  const requestText = `我想買 ${order.map((item) => `${item.count} ${marketItemSpeech[item.assetId].counter}${assets[item.assetId].label}`).join("和 ")}。`;
  const requestRuby: RubySegment[] = ["我想買 "]; order.forEach((item, index) => { if (index > 0) requestRuby.push("和 "); const speech = marketItemSpeech[item.assetId]; requestRuby.push(`${item.count} ${speech.counter}`, { text: assets[item.assetId].label, ruby: speech.ruby }); }); requestRuby.push("。");
  return { ...template, requestText, requestRuby, order, prices: Object.fromEntries(order.map((item) => [item.assetId, marketItemPrices[item.assetId]])) };
}

export function randomizeMarketChallenge(template: MarketChallengeConfig, seed: number, recentOrderSignatures: string[] = []) {
  const recent = recentOrderSignatures.slice(-4);
  const previousAssets = recent.length > 0 ? signatureAssets(recent[recent.length - 1]) : new Set<string>();
  const beforePreviousAssets = recent.length > 1 ? signatureAssets(recent[recent.length - 2]) : new Set<string>();
  const repeatedTwice = new Set([...previousAssets].filter((assetId) => beforePreviousAssets.has(assetId)));
  let bestChallenge: MarketChallengeConfig | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = createRandomizedMarketChallenge(template, seed + attempt * 104729);
    const signature = marketOrderSignature(candidate.order);
    const candidateAssets = new Set(candidate.order.map((item) => item.assetId));
    const exactRepeatPenalty = recent.includes(signature) ? 1000 : 0;
    const thirdConsecutivePenalty = [...candidateAssets].filter((assetId) => repeatedTwice.has(assetId)).length * 25;
    const immediateOverlapPenalty = [...candidateAssets].filter((assetId) => previousAssets.has(assetId)).length;
    const score = exactRepeatPenalty + thirdConsecutivePenalty + immediateOverlapPenalty;

    if (score < bestScore) {
      bestChallenge = candidate;
      bestScore = score;
      if (score === 0) break;
    }
  }

  return bestChallenge ?? createRandomizedMarketChallenge(template, seed);
}

export function selectMarketChallengeTemplate(challenges: MarketChallengeConfig[], seed: number) {
  if (challenges.length === 0) return undefined;
  const random = createRandom(seed);
  return challenges[Math.floor(random() * challenges.length)];
}
