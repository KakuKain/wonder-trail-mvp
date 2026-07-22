import { describe, expect, it } from "vitest";
import { advanceMarketProgress, completeStageSave, getStageInitialState, resetGameProgress, selectForestTarget, selectMarketDifficulty } from "./gameFlow";
import { stages } from "../data/stages";
import type { MarketProgress, PlacedObject } from "../types";
import { defaultSave } from "./storage";

describe("controller flow rules", () => {
  it("completes a forest stage once and awards its reward once", () => {
    const reward = { stars: 2, stickers: ["apple"] };
    const completed = completeStageSave(defaultSave, "forest_search_01", reward, "2026-07-21T00:00:00.000Z");
    expect(completed).toMatchObject({ completedStageIds: ["forest_search_01"], stars: 2, stickers: ["apple"] });
    expect(completeStageSave(completed, "forest_search_01", reward, "later").stars).toBe(2);
  });

  it("moves to the next market question after a correct checkout", () => {
    const result = advanceMarketProgress(defaultSave.marketProgress, "beginner", "market_order_01", 0, 3);
    expect(result).toMatchObject({ completedDifficulty: false, nextChallengeIndex: 1, progress: { completedChallengeIds: ["market_order_01"], nextChallengeByDifficulty: { beginner: 1 } } });
  });

  it("marks the final challenge complete and unlocks its dependent difficulty", () => {
    const result = advanceMarketProgress(defaultSave.marketProgress, "advanced", "market_order_final", 2, 3);
    expect(result).toMatchObject({ completedDifficulty: true, progress: { completedDifficulties: ["advanced"] } });
    const boss = { id: "boss" as const, label: "魔王關", shortLabel: "王", ageLabel: "BONUS", skillLabel: "綜合", questionMode: "challenge" as const, unlockAfter: "advanced" as const };
    expect(selectMarketDifficulty(result.progress, boss)).toMatchObject({ unlocked: true, progress: { activeDifficulty: "boss" } });
  });

  it("resets every controller-owned progress field", () => {
    const reset = resetGameProgress();
    expect(reset).toEqual(defaultSave);
    expect(reset).not.toBe(defaultSave);
    expect(reset.marketProgress).not.toBe(defaultSave.marketProgress);
  });

  it("initializes a market stage from the latest unlocked saved difficulty", () => {
    const progress: MarketProgress = {
      ...defaultSave.marketProgress,
      activeDifficulty: "advanced" as const,
      completedDifficulties: ["beginner", "intermediate"],
      nextChallengeByDifficulty: { advanced: 99 },
    };

    expect(getStageInitialState(stages[5], progress)).toMatchObject({
      stageBackgroundReady: true,
      marketDifficulty: "advanced",
      marketChallengeIndex: 2,
    });
  });

  it("marks a forest target and only completes when every target is found", () => {
    const object = (instanceId: string, isTarget: boolean): PlacedObject => ({
      instanceId,
      assetId: instanceId,
      x: 0,
      y: 0,
      size: 48,
      rotation: 0,
      flipX: false,
      opacity: 1,
      isTarget,
      found: false,
    });
    const objects = [
      object("target-1", true),
      object("target-2", true),
      object("distractor", false),
    ];

    const partial = selectForestTarget(objects, "target-1");
    expect(partial).toMatchObject({ changed: true, completed: false });
    expect(partial.objects[0]).toMatchObject({ found: true });
    expect(selectForestTarget(partial.objects, "target-2")).toMatchObject({ changed: true, completed: true });
    expect(selectForestTarget(objects, "distractor")).toMatchObject({ changed: false, completed: false });
  });
});
