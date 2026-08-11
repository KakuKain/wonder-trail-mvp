// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stages } from "../data/stages";
import { marketCustomersPerShift, marketOrderSignature } from "../lib/market";
import { resetSave } from "../lib/storage";
import { useGameController } from "./useGameController";

function renderMarketController() {
  const controller = renderHook(() => useGameController(stages.length));
  act(() => controller.result.current.startStage(5));
  act(() => controller.result.current.actions.startMarketShift());
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

function finishCurrentMarketOrder(controller: ReturnType<typeof renderMarketController>) {
  const question = fillCurrentOrder(controller);
  act(() => controller.result.current.actions.answerMarket(question));
  act(() => controller.result.current.actions.continueMarket());
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
    sessionStorage.clear();
    resetSave();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("opens with the shopkeeper story before the first customer", () => {
    const controller = renderHook(() => useGameController(stages.length));
    act(() => controller.result.current.startStage(5));

    expect(controller.result.current.view.market.phase).toBe("story");

    act(() => controller.result.current.actions.startMarketShift());
    expect(controller.result.current.view.market.phase).toBe("pick");
    expect(controller.result.current.view.market.customerNumber).toBe(1);
    expect(controller.result.current.view.market.customerTarget).toBe(marketCustomersPerShift);
  });

  it("remembers the global voice mute preference", () => {
    const controller = renderHook(() => useGameController(stages.length));
    expect(controller.result.current.view.voice.muted).toBe(false);

    act(() => controller.result.current.actions.toggleVoice());
    expect(controller.result.current.view.voice.muted).toBe(true);
    expect(localStorage.getItem("wonder-trail:voice-muted")).toBe("true");

    controller.unmount();
    const restoredController = renderHook(() => useGameController(stages.length));
    expect(restoredController.result.current.view.voice.muted).toBe(true);
  });

  it("skips the shopkeeper story after it has already been watched", () => {
    const controller = renderHook(() => useGameController(stages.length));
    act(() => controller.result.current.startStage(5));
    act(() => controller.result.current.actions.startMarketShift());
    act(() => controller.result.current.actions.returnHome());
    act(() => controller.result.current.startStage(5));

    expect(controller.result.current.view.market.phase).toBe("pick");
  });

  it("restores the same checkout after an accidental reload", () => {
    const firstController = renderMarketController();
    finishCurrentMarketOrder(firstController);
    fillCurrentOrder(firstController);
    const expectedChallengeId = firstController.result.current.view.market.challenge?.id;
    const expectedOrder = firstController.result.current.view.market.challenge?.order;
    const expectedQuestion = firstController.result.current.view.market.question;
    const expectedCustomerId = firstController.result.current.view.market.customer.id;
    const expectedAnswerChoices = firstController.result.current.view.market.answerChoices;
    const expectedBasket = firstController.result.current.marketBasket;
    const expectedOrderHistory = firstController.result.current.marketRecentOrderSignatures;
    const expectedAnswerHistory = firstController.result.current.marketRecentCorrectPositions;

    firstController.unmount();
    const restoredController = renderHook(() => useGameController(stages.length));

    expect(restoredController.result.current.screen).toBe("stage");
    expect(restoredController.result.current.view.market.phase).toBe("total");
    expect(restoredController.result.current.view.market.challenge?.id).toBe(expectedChallengeId);
    expect(restoredController.result.current.view.market.challenge?.order).toEqual(expectedOrder);
    expect(restoredController.result.current.view.market.question).toBe(expectedQuestion);
    expect(restoredController.result.current.view.market.customer.id).toBe(expectedCustomerId);
    expect(restoredController.result.current.view.market.answerChoices).toEqual(expectedAnswerChoices);
    expect(restoredController.result.current.marketBasket).toEqual(expectedBasket);
    expect(restoredController.result.current.marketRecentOrderSignatures).toEqual(expectedOrderHistory);
    expect(restoredController.result.current.marketRecentCorrectPositions).toEqual(expectedAnswerHistory);
    expect(restoredController.result.current.marketSelectedTotal).toBeNull();
  });

  it("serves a varied five-customer shift without recent duplicate orders", () => {
    const controller = renderMarketController();
    const customerIds: string[] = [];
    const orderSignatures: string[] = [];
    const correctPositions: number[] = [];

    for (let round = 0; round < marketCustomersPerShift; round += 1) {
      const market = controller.result.current.view.market;
      if (!market.challenge) throw new Error("Expected a market challenge");
      const signature = marketOrderSignature(market.challenge.order);
      expect(orderSignatures.slice(-4)).not.toContain(signature);
      customerIds.push(market.customer.id);
      orderSignatures.push(signature);
      correctPositions.push(market.answerChoices.indexOf(market.question));
      finishCurrentMarketOrder(controller);
    }

    expect(new Set(customerIds).size).toBe(marketCustomersPerShift);
    for (let index = 2; index < correctPositions.length; index += 1) {
      expect(new Set(correctPositions.slice(index - 2, index + 1)).size).toBeGreaterThan(1);
    }
  });

  it("waits for the child to continue after a correct answer and advances only once", () => {
    const controller = renderMarketController();
    const question = fillCurrentOrder(controller);

    act(() => {
      controller.result.current.actions.answerMarket(question);
      controller.result.current.actions.answerMarket(question);
      vi.advanceTimersByTime(10_000);
    });

    expect(controller.result.current.marketChallengeIndex).toBe(0);
    expect(controller.result.current.view.market.phase).toBe("total");
    expect(controller.result.current.marketSelectedTotal).toBe(question);
    expect(controller.result.current.marketFeedback).toBe(`謝謝小航！一共有 ${question} 個，你數對了！`);
    expect(controller.result.current.hintVisible).toBe(false);

    act(() => {
      controller.result.current.actions.continueMarket();
      controller.result.current.actions.continueMarket();
    });
    expect(controller.result.current.marketChallengeIndex).toBe(1);
    expect(controller.result.current.save.marketProgress.nextChallengeByDifficulty).toEqual({ beginner: 1 });
  });

  it("ignores another answer while a correct checkout is pending", () => {
    const controller = renderMarketController();
    const question = fillCurrentOrder(controller);

    act(() => {
      controller.result.current.actions.answerMarket(question);
      controller.result.current.actions.answerMarket(question + 1);
    });

    expect(controller.result.current.marketSelectedTotal).toBe(question);
    expect(controller.result.current.marketFeedback).toBe(`謝謝小航！一共有 ${question} 個，你數對了！`);
    expect(controller.result.current.wrongClicks).toBe(0);

    act(() => vi.advanceTimersByTime(10_000));
    expect(controller.result.current.marketChallengeIndex).toBe(0);

    act(() => controller.result.current.actions.continueMarket());
    expect(controller.result.current.marketChallengeIndex).toBe(1);
  });

  it("keeps the same animal customer from picking through checkout", () => {
    const controller = renderMarketController();
    const customerBeforePicking = controller.result.current.view.market.customer;

    fillCurrentOrder(controller);

    expect(controller.result.current.view.market.phase).toBe("total");
    expect(controller.result.current.view.market.customer).toEqual(customerBeforePicking);
  });

  it("does not discard a checkout when a difficulty button is pressed", () => {
    const controller = renderMarketController();
    fillCurrentOrder(controller);
    const basket = controller.result.current.marketBasket;
    const challengeId = controller.result.current.view.market.challenge?.id;

    act(() => controller.result.current.actions.selectMarketDifficulty(controller.result.current.marketDifficulty));

    expect(controller.result.current.view.market.phase).toBe("total");
    expect(controller.result.current.marketBasket).toEqual(basket);
    expect(controller.result.current.view.market.challenge?.id).toBe(challengeId);
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

  it("completes a market difficulty without opening the generic reward screen", () => {
    const controller = renderMarketController();

    for (let order = 0; order < marketCustomersPerShift; order += 1) {
      finishCurrentMarketOrder(controller);
    }

    expect(controller.result.current.screen).toBe("stage");
    expect(controller.result.current.view.market.phase).toBe("complete");
    expect(controller.result.current.reward).toBeNull();
    expect(controller.result.current.lastCompletionWasNew).toBe(true);
    expect(controller.result.current.save.completedStageIds).toContain(stages[5].id);
    expect(controller.result.current.save.stickers).toEqual(expect.arrayContaining(stages[5].reward.stickers));
    expect(controller.result.current.marketFeedback).toBe("初階完成！兔子老闆娘要把零件送給你。");
  });

  it("keeps a completed market replay in the market without awarding stars again", () => {
    const controller = renderMarketController();

    for (let order = 0; order < marketCustomersPerShift; order += 1) {
      finishCurrentMarketOrder(controller);
    }
    const starsAfterFirstCompletion = controller.result.current.save.stars;
    act(() => controller.result.current.actions.startMarketShift());

    for (let order = 0; order < marketCustomersPerShift; order += 1) {
      finishCurrentMarketOrder(controller);
    }

    expect(controller.result.current.screen).toBe("stage");
    expect(controller.result.current.view.market.phase).toBe("complete");
    expect(controller.result.current.reward).toBeNull();
    expect(controller.result.current.lastCompletionWasNew).toBe(false);
    expect(controller.result.current.save.stars).toBe(starsAfterFirstCompletion);
    expect(controller.result.current.marketFeedback).toBe("初階再次完成，客人們都順利結帳了！");
  });

  it("keeps forest replays playable without treating the part as newly acquired", () => {
    const controller = renderHook(() => useGameController(stages.length));

    act(() => controller.result.current.startStage(0));
    finishFirstForestStage(controller);
    expect(controller.result.current.lastCompletionWasNew).toBe(true);
    expect(controller.result.current.save.stars).toBe(1);
    const claimedRewardsAfterFirstCompletion = controller.result.current.events.filter((event) => event.event === "reward_claimed").length;

    act(() => controller.result.current.startStage(0));
    finishFirstForestStage(controller);
    expect(controller.result.current.lastCompletionWasNew).toBe(false);
    expect(controller.result.current.save.stars).toBe(1);
    expect(controller.result.current.events.filter((event) => event.event === "reward_claimed")).toHaveLength(claimedRewardsAfterFirstCompletion);
  });

  it("keeps the first forest stage as the replay introduction and shuffles stages two to five", () => {
    const controller = renderHook(() => useGameController(stages.length));
    for (let stageIndex = 0; stageIndex < 5; stageIndex += 1) {
      act(() => controller.result.current.startStage(stageIndex));
      act(() => controller.result.current.actions.completeStage());
    }
    act(() => controller.result.current.actions.returnHome());
    vi.spyOn(Math, "random").mockReturnValue(0);

    act(() => controller.result.current.actions.startForest());
    const replayIndexes: number[] = [];
    for (let round = 0; round < 5; round += 1) {
      replayIndexes.push(controller.result.current.stageIndex);
      act(() => controller.result.current.actions.completeStage());
      act(() => controller.result.current.actions.continueForestAdventure());
    }

    expect(replayIndexes[0]).toBe(0);
    expect(replayIndexes.slice(1)).not.toEqual([1, 2, 3, 4]);
    expect([...replayIndexes].sort((left, right) => left - right)).toEqual([0, 1, 2, 3, 4]);
    expect(controller.result.current.screen).toBe("complete");
  });

  it("lets a child retry a wrong zhuyin choice and continue manually", () => {
    const controller = renderHook(() => useGameController(stages.length));
    act(() => controller.result.current.startStage(6));

    const firstPuzzle = controller.result.current.view.zhuyin.puzzle;
    if (!firstPuzzle) throw new Error("Expected a zhuyin puzzle");
    const correct = firstPuzzle.answer[0];
    const wrong = firstPuzzle.choices.find((choice) => choice !== correct);
    if (!wrong) throw new Error("Expected a wrong zhuyin choice");

    act(() => controller.result.current.actions.answerZhuyin(wrong));
    expect(controller.result.current.view.zhuyin.questionIndex).toBe(0);
    expect(controller.result.current.view.zhuyin.selectedAnswer).toBe(wrong);
    expect(controller.result.current.screen).toBe("stage");

    act(() => controller.result.current.actions.answerZhuyin(correct));
    expect(controller.result.current.view.zhuyin.selectedAnswer).toBe(correct);
    expect(controller.result.current.view.zhuyin.totalQuestions).toBe(3);
    expect(controller.result.current.view.zhuyin.questionIndex).toBe(0);

    act(() => controller.result.current.actions.continueZhuyin());
    expect(controller.result.current.view.zhuyin.questionIndex).toBe(1);
    expect(controller.result.current.view.zhuyin.selectedAnswer).toBeNull();
  });

  it("finishes the school task only after the last answer is continued", () => {
    const controller = renderHook(() => useGameController(stages.length));
    act(() => controller.result.current.startStage(6));

    for (let index = 0; index < 3; index += 1) {
      const puzzle = controller.result.current.view.zhuyin.puzzle;
      if (!puzzle) throw new Error("Expected a zhuyin puzzle");
      act(() => controller.result.current.actions.answerZhuyin(puzzle.answer[0]));
      expect(controller.result.current.screen).toBe("stage");
      act(() => controller.result.current.actions.continueZhuyin());
    }

    expect(controller.result.current.screen).toBe("complete");
    expect(controller.result.current.lastCompletionWasNew).toBe(true);
    expect(controller.result.current.save.completedStageIds).toContain("school_zhuyin_01");
  });
});
