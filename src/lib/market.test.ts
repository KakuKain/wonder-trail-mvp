import { describe, expect, it } from "vitest";
import { isMarketDifficultyUnlocked, marketAnswerOptions, marketBasketMatches, marketQuestionValue, marketRequiredCount, marketTotal, randomizeMarketChallenge } from "./market";
import type { MarketChallengeConfig } from "../types";

const challenge: MarketChallengeConfig = { id: "test", difficulty: "intermediate", customerName: "小鹿", customerRuby: "", requestText: "", requestRuby: [], order: [{ assetId: "apple", count: 2 }, { assetId: "mushroom", count: 1 }], prices: { apple: 2, mushroom: 3 } };

describe("market rules", () => {
  it("calculates totals and quantity-recognition answers", () => {
    expect(marketTotal(challenge)).toBe(7);
    expect(marketQuestionValue(challenge, "addition")).toBe(7);
    expect(marketQuestionValue(challenge, "number-recognition")).toBe(3);
    expect(marketAnswerOptions(1, "one")).toEqual(expect.arrayContaining([1, 2, 3]));
  });

  it("creates deterministic orders that obey each difficulty range", () => {
    const beginner = randomizeMarketChallenge({ ...challenge, difficulty: "beginner" }, 42);
    const repeated = randomizeMarketChallenge({ ...challenge, difficulty: "beginner" }, 42);
    expect(beginner).toEqual(repeated);
    expect(beginner.order).toHaveLength(1);
    expect(beginner.order[0].count).toBeGreaterThanOrEqual(1);
    expect(beginner.order[0].count).toBeLessThanOrEqual(3);
    expect(beginner.requestText).toMatch(/^我想買 /);
  });

  it("unlocks a difficulty only after its prerequisite", () => {
    const boss = { id: "boss" as const, label: "魔王關", shortLabel: "王", ageLabel: "BONUS", skillLabel: "綜合", questionMode: "challenge" as const, unlockAfter: "advanced" as const };
    expect(isMarketDifficultyUnlocked(boss, [])).toBe(false);
    expect(isMarketDifficultyUnlocked(boss, ["advanced"])).toBe(true);
  });

  it("only accepts a basket once every requested item has the exact count", () => {
    expect(marketRequiredCount(challenge, "apple")).toBe(2);
    expect(marketRequiredCount(challenge, "acorn")).toBe(0);
    expect(marketBasketMatches(challenge, { apple: 2 })).toBe(false);
    expect(marketBasketMatches(challenge, { apple: 2, mushroom: 1 })).toBe(true);
    expect(marketBasketMatches(challenge, { apple: 3, mushroom: 1 })).toBe(false);
  });
});
