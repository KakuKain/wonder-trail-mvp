// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearMarketRoundSession,
  clearMarketStorySeen,
  hasSeenMarketStory,
  loadMarketRoundSession,
  markMarketStorySeen,
  writeMarketRoundSession,
} from "./marketSession";

describe("market round session", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("restores a valid in-progress checkout", () => {
    writeMarketRoundSession({
      stageId: "market-1",
      difficulty: "beginner",
      challengeIndex: 2,
      roundSeed: 123.5,
      shiftSeed: 456.5,
      recentOrderSignatures: ["apple:1", "acorn:2"],
      recentCorrectPositions: [0, 2],
      phase: "total",
      basket: { apple: 2, acorn: 1 },
      feedback: "",
    });

    expect(loadMarketRoundSession()).toEqual({
      stageId: "market-1",
      difficulty: "beginner",
      challengeIndex: 2,
      roundSeed: 123.5,
      shiftSeed: 456.5,
      recentOrderSignatures: ["apple:1", "acorn:2"],
      recentCorrectPositions: [0, 2],
      phase: "total",
      basket: { apple: 2, acorn: 1 },
      feedback: "",
    });
  });

  it("rejects malformed temporary data instead of opening a broken round", () => {
    sessionStorage.setItem("wonder-trail:market-round-session", JSON.stringify({
      stageId: "market-1",
      difficulty: "future-mode",
      challengeIndex: -1,
      roundSeed: "bad",
      phase: "complete",
      basket: { apple: "two" },
      feedback: [],
    }));

    expect(loadMarketRoundSession()).toBeNull();
    expect(sessionStorage.getItem("wonder-trail:market-round-session")).toBeNull();
  });

  it("restores an older round session with safe random-history defaults", () => {
    sessionStorage.setItem("wonder-trail:market-round-session", JSON.stringify({
      stageId: "market-1",
      difficulty: "beginner",
      challengeIndex: 1,
      roundSeed: 123,
      phase: "pick",
      basket: {},
      feedback: "",
    }));

    expect(loadMarketRoundSession()).toMatchObject({
      shiftSeed: 123,
      recentOrderSignatures: [],
      recentCorrectPositions: [],
    });
  });

  it("clears a round without forgetting that the story was seen", () => {
    writeMarketRoundSession({
      stageId: "market-1",
      difficulty: "beginner",
      challengeIndex: 0,
      roundSeed: 1,
      shiftSeed: 2,
      recentOrderSignatures: [],
      recentCorrectPositions: [],
      phase: "pick",
      basket: {},
      feedback: "",
    });
    markMarketStorySeen();

    clearMarketRoundSession();
    expect(loadMarketRoundSession()).toBeNull();
    expect(hasSeenMarketStory()).toBe(true);

    clearMarketStorySeen();
    expect(hasSeenMarketStory()).toBe(false);
  });
});
