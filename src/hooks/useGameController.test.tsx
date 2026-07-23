// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stages } from "../data/stages";
import { resetSave } from "../lib/storage";
import { useGameController } from "./useGameController";

function renderMarketController() {
  const controller = renderHook(() => useGameController(stages.length));
  act(() => controller.result.current.startStage(5));
  return controller;
}

function fillCurrentOrder(controller: ReturnType<typeof renderMarketController>) {
  const challenge = controller.result.current.view.market.challenge;
  if (!challenge) throw new Error("Expected a market challenge");

  challenge.order.forEach((line) => {
    for (let count = 0; count < line.count; count += 1) {
      // Each tap is a separate browser event. Keeping it in its own act also
      // ensures the next selection receives the latest basket state.
      act(() => controller.result.current.actions.selectMarketItem(line.assetId));
    }
  });

  expect(controller.result.current.view.market.phase).toBe("total");
  return controller.result.current.view.market.question;
}

function finishFirstForestStage(controller: ReturnType<typeof renderMarketController>) {
  act(() => controller.result.current.setStageBackgroundReady(true));
  const targetIds = controller.result.current.objects.filter((object) => object.isTarget).map((object) => object.instanceId);

  targetIds.forEach((instanceId) => {
    act(() => {
      const object = controller.result.current.objects.find((item) => item.instanceId === instanceId);
      if (!object) throw new Error("Expected a forest target");
      controller.result.current.actions.selectForestObject(object);
    });
  });
}

describe("game controller market timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    resetSave();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("moves to the next order only once when a correct answer is pressed twice", () => {
    const controller = renderMarketController();
    const question = fillCurrentOrder(controller);

    act(() => {
      controller.result.current.actions.answerMarket(question);
      controller.result.current.actions.answerMarket(question);
      vi.advanceTimersByTime(550);
    });

    expect(controller.result.current.marketChallengeIndex).toBe(1);
    expect(controller.result.current.save.marketProgress.nextChallengeByDifficulty).toEqual({ beginner: 1 });

    act(() => vi.advanceTimersByTime(2_000));
    expect(controller.result.current.marketChallengeIndex).toBe(1);
  });

  it("cancels a pending checkout when leaving the market", () => {
    const controller = renderMarketController();
    const question = fillCurrentOrder(controller);

    act(() => {
      controller.result.current.actions.answerMarket(question);
      controller.result.current.actions.returnHome();
      vi.advanceTimersByTime(2_000);
    });

    expect(controller.result.current.screen).toBe("intro");
    expect(controller.result.current.marketChallengeIndex).toBe(0);
    expect(controller.result.current.save.marketProgress.completedChallengeIds).toEqual([]);
  });

  it("does not restart the automatic hint countdown after an unrelated state update", () => {
    const controller = renderMarketController();
    const hintDelay = stages[5].assist.hintDelayMs;

    act(() => vi.advanceTimersByTime(hintDelay - 1_000));
    act(() => controller.result.current.setHomeMapReady(true));
    act(() => vi.advanceTimersByTime(999));
    expect(controller.result.current.hintVisible).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(controller.result.current.hintVisible).toBe(true);
  });

  it("keeps forest replays playable without treating the part as newly acquired", () => {
    const controller = renderHook(() => useGameController(stages.length));

    act(() => controller.result.current.startStage(0));
    finishFirstForestStage(controller);
    expect(controller.result.current.lastCompletionWasNew).toBe(true);
    expect(controller.result.current.save.stars).toBe(1);

    act(() => controller.result.current.startStage(0));
    finishFirstForestStage(controller);
    expect(controller.result.current.lastCompletionWasNew).toBe(false);
    expect(controller.result.current.save.stars).toBe(1);
  });
});
