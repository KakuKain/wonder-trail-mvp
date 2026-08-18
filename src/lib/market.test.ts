import { describe, expect, it } from "vitest";
import { marketCustomerForRound, marketCustomerOrder, marketCustomers } from "../data/marketCustomers";
import { stages } from "../data/stages";
import { isMarketDifficultyUnlocked, marketAnswerOptions, marketBasketMatches, marketCalculationTerms, marketChallengeFitsDifficulty, marketCustomerReminder, marketOrderSignature, marketQuantityPrompt, marketQuestionValue, marketRequiredCount, marketTotal, randomizeMarketChallenge } from "./market";
import type { MarketChallengeConfig } from "../types";

const challenge: MarketChallengeConfig = { id: "test", difficulty: "intermediate", customerName: "小鹿", customerRuby: "", requestText: "", requestRuby: [], order: [{ assetId: "apple", count: 2 }, { assetId: "mushroom", count: 1 }], prices: { apple: 2, mushroom: 3 } };

describe("market rules", () => {
  it("attributes a first-person order to the animal customer in hints", () => {
    expect(marketCustomerReminder("小羊", "我想買 2 顆松果。")).toBe("小羊想買 2 顆松果。");
    expect(marketCustomerReminder("小鹿", "請幫我拿蘋果。")).toBe("小鹿說，請幫我拿蘋果。");
  });

  it("shuffles ten customers deterministically without repeats during a shift", () => {
    expect(marketCustomers).toHaveLength(10);
    expect(new Set(marketCustomers.map((customer) => customer.id)).size).toBe(10);
    const order = marketCustomerOrder("beginner", 42);
    expect(new Set(order.slice(0, 5).map((customer) => customer.id)).size).toBe(5);
    expect(marketCustomerForRound("beginner", 1, 42)).toBe(marketCustomerForRound("beginner", 1, 42));
    expect(marketCustomerOrder("beginner", 43).map((customer) => customer.id)).not.toEqual(order.map((customer) => customer.id));
  });

  it("calculates totals and quantity-recognition answers", () => {
    expect(marketTotal(challenge)).toBe(7);
    expect(marketQuestionValue(challenge, "addition")).toBe(7);
    expect(marketQuestionValue(challenge, "number-recognition")).toBe(3);
    expect(marketAnswerOptions(1, "one")).toEqual([1, 2, 3]);
  });

  it("keeps answer positions stable while challenge content changes", () => {
    expect(marketAnswerOptions(5, 99)).toEqual([4, 5, 6]);
    expect(marketAnswerOptions(5, 99, [1, 1])).toEqual([4, 5, 6]);
  });

  it("describes a beginner quantity question with the item's natural counter", () => {
    expect(marketQuantityPrompt({ ...challenge, order: [{ assetId: "acorn", count: 3 }] })).toBe("籃子裡有幾顆橡果？");
    expect(marketQuantityPrompt({ ...challenge, order: [{ assetId: "pink_flower", count: 2 }] })).toBe("籃子裡有幾朵粉紅花？");
    expect(marketQuantityPrompt(challenge)).toBe("籃子裡一共有幾個商品？");
  });

  it("creates deterministic orders that stay inside every age range", () => {
    const beginner = randomizeMarketChallenge({ ...challenge, difficulty: "beginner" }, 42);
    const repeated = randomizeMarketChallenge({ ...challenge, difficulty: "beginner" }, 42);
    expect(beginner).toEqual(repeated);
    expect(beginner.requestText).toMatch(/^我想買 /);

    for (const difficulty of ["beginner", "intermediate", "advanced", "boss"] as const) {
      for (let seed = 0; seed < 100; seed += 1) {
        expect(marketChallengeFitsDifficulty(randomizeMarketChallenge({ ...challenge, difficulty }, seed))).toBe(true);
      }
    }
  });

  it("varies generated price tags while keeping totals age-appropriate", () => {
    const generated = Array.from({ length: 24 }, (_, seed) => randomizeMarketChallenge({ ...challenge, difficulty: "intermediate" }, seed));
    const prices = generated.flatMap((item) => Object.values(item.prices));
    expect(new Set(prices).size).toBeGreaterThan(2);
    expect(prices.every((price) => price >= 1 && price <= 5)).toBe(true);
    expect(generated.every(marketChallengeFitsDifficulty)).toBe(true);
  });

  it("uses Chinese list punctuation and only one final conjunction", () => {
    const threeItemOrder = Array.from({ length: 100 }, (_, seed) => randomizeMarketChallenge({ ...challenge, difficulty: "advanced" }, seed))
      .find((item) => item.order.length === 3);
    expect(threeItemOrder).toBeTruthy();
    expect(threeItemOrder?.requestText).toMatch(/、.+和 /);
    expect(threeItemOrder?.requestText.match(/和 /g)).toHaveLength(1);
  });

  it("avoids recently used order signatures while preserving the age rules", () => {
    const recent: string[] = [];
    for (let round = 0; round < 8; round += 1) {
      const randomized = randomizeMarketChallenge({ ...challenge, difficulty: "beginner" }, 100 + round, recent);
      const signature = marketOrderSignature(randomized.order);
      expect(recent).not.toContain(signature);
      expect(marketChallengeFitsDifficulty(randomized)).toBe(true);
      recent.push(signature);
      if (recent.length > 4) recent.shift();
    }
  });

  it("avoids showing the same beginner product for a third consecutive order", () => {
    const randomized = randomizeMarketChallenge(
      { ...challenge, difficulty: "beginner" },
      42,
      ["apple:1", "apple:2"],
    );
    expect(randomized.order[0].assetId).not.toBe("apple");
  });

  it("expands addition into one visible term per item and reserves multiplication for the boss", () => {
    const additionTerms = marketCalculationTerms(challenge, "addition");
    expect(additionTerms).toHaveLength(3);
    expect(additionTerms.every((term) => term.count === 1)).toBe(true);
    expect(additionTerms.map((term) => term.price)).toEqual([2, 2, 3]);

    const bossTerms = marketCalculationTerms(challenge, "challenge");
    expect(bossTerms).toEqual([
      expect.objectContaining({ assetId: "apple", count: 2, price: 2 }),
      expect.objectContaining({ assetId: "mushroom", count: 1, price: 3 }),
    ]);
  });

  it("keeps every authored order and question mode appropriate for its age label", () => {
    const marketPuzzle = stages.find((stage) => stage.mechanic === "market")?.marketPuzzle;
    expect(marketPuzzle?.difficulties.map(({ id, questionMode }) => [id, questionMode])).toEqual([
      ["beginner", "number-recognition"],
      ["intermediate", "addition"],
      ["advanced", "multi-addition"],
      ["boss", "challenge"],
    ]);
    expect(marketPuzzle?.challenges.every(marketChallengeFitsDifficulty)).toBe(true);
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
