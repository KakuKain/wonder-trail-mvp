import { useEffect, useState } from "react";
import { forestBackgrounds } from "../data/backgrounds";
import { stages } from "../data/stages";
import { clearMarketRoundSession, loadMarketRoundSession, writeMarketRoundSession } from "../lib/marketSession";
import { getSaveProtectionMode, loadEvents, loadSave } from "../lib/storage";
import { createPlacedObjects } from "../lib/stagePlacement";
import type { GameEvent, MarketDifficultyId, PlacedObject, SaveData, StageConfig, ZhuyinLevelId } from "../types";

export type Screen = "intro" | "stage" | "reward" | "complete";
export type MarketPhase = "story" | "pick" | "total" | "complete";

function nextStageIndex(save: SaveData) {
  const index = stages.findIndex((stage) => !save.completedStageIds.includes(stage.id));
  return index === -1 ? stages.length - 1 : index;
}

/** Centralises mutable game/UI state; game rules stay in the controller for now. */
export function useGameState() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [restoredMarketRound] = useState(() => loadMarketRoundSession());
  const restoredMarketStageIndex = restoredMarketRound
    ? stages.findIndex((stage) => stage.id === restoredMarketRound.stageId && stage.mechanic === "market")
    : -1;
  const hasRestoredMarketRound = restoredMarketStageIndex >= 0;
  const [saveProtectionMode, setSaveProtectionMode] = useState(() => getSaveProtectionMode());
  const [screen, setScreen] = useState<Screen>(hasRestoredMarketRound ? "stage" : "intro");
  const [stageIndex, setStageIndex] = useState(() => hasRestoredMarketRound ? restoredMarketStageIndex : nextStageIndex(save));
  const [objects, setObjects] = useState<PlacedObject[]>(() => createPlacedObjects(stages[hasRestoredMarketRound ? restoredMarketStageIndex : nextStageIndex(save)]));
  const [wrongClicks, setWrongClicks] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [reward, setReward] = useState<StageConfig["reward"] | null>(null);
  const [lastCompletionWasNew, setLastCompletionWasNew] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [events, setEvents] = useState<GameEvent[]>(() => loadEvents());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionPage, setCollectionPage] = useState(0);
  const [homeMapReady, setHomeMapReady] = useState(false);
  const [stageBackgroundReady, setStageBackgroundReady] = useState(false);
  const [stageBackgroundIndex, setStageBackgroundIndex] = useState(() => Math.floor(Math.random() * forestBackgrounds.length));
  const [marketDifficulty, setMarketDifficulty] = useState<MarketDifficultyId>(restoredMarketRound?.difficulty ?? save.marketProgress.activeDifficulty);
  const [marketCompletedDifficulties, setMarketCompletedDifficulties] = useState<MarketDifficultyId[]>(save.marketProgress.completedDifficulties);
  const [marketChallengeIndex, setMarketChallengeIndex] = useState(restoredMarketRound?.challengeIndex ?? save.marketProgress.nextChallengeByDifficulty[save.marketProgress.activeDifficulty] ?? 0);
  const [marketRoundSeed, setMarketRoundSeed] = useState(() => restoredMarketRound?.roundSeed ?? Date.now() + Math.random());
  const [marketShiftSeed, setMarketShiftSeed] = useState(() => restoredMarketRound?.shiftSeed ?? Date.now() + Math.random());
  const [marketRecentOrderSignatures, setMarketRecentOrderSignatures] = useState<string[]>(restoredMarketRound?.recentOrderSignatures ?? []);
  const [marketRecentCorrectPositions, setMarketRecentCorrectPositions] = useState<number[]>(restoredMarketRound?.recentCorrectPositions ?? []);
  const [marketPhase, setMarketPhase] = useState<MarketPhase>(restoredMarketRound?.phase ?? "pick");
  const [marketBasket, setMarketBasket] = useState<Record<string, number>>(restoredMarketRound?.basket ?? {});
  const [marketSelectedTotal, setMarketSelectedTotal] = useState<number | null>(null);
  const [marketFeedback, setMarketFeedback] = useState(restoredMarketRound?.feedback ?? "");
  const [zhuyinQuestionIndex, setZhuyinQuestionIndex] = useState(0);
  const [zhuyinSelectedAnswer, setZhuyinSelectedAnswer] = useState<string | null>(null);
  const [zhuyinFeedback, setZhuyinFeedback] = useState("");
  const [zhuyinLevel, setZhuyinLevel] = useState<ZhuyinLevelId | null>(null);
  const [zhuyinAnswerParts, setZhuyinAnswerParts] = useState<string[]>([]);

  useEffect(() => {
    const stage = stages[stageIndex];
    if (
      screen === "stage"
      && stage?.mechanic === "market"
      && (marketPhase === "pick" || marketPhase === "total")
    ) {
      writeMarketRoundSession({
        stageId: stage.id,
        difficulty: marketDifficulty,
        challengeIndex: marketChallengeIndex,
        roundSeed: marketRoundSeed,
        shiftSeed: marketShiftSeed,
        recentOrderSignatures: marketRecentOrderSignatures,
        recentCorrectPositions: marketRecentCorrectPositions,
        phase: marketPhase,
        basket: marketBasket,
        feedback: marketSelectedTotal === null ? marketFeedback : "",
      });
      return;
    }
    clearMarketRoundSession();
  }, [marketBasket, marketChallengeIndex, marketDifficulty, marketFeedback, marketPhase, marketRecentCorrectPositions, marketRecentOrderSignatures, marketRoundSeed, marketSelectedTotal, marketShiftSeed, screen, stageIndex]);

  return {
    save, setSave, saveProtectionMode, setSaveProtectionMode, screen, setScreen, stageIndex, setStageIndex, objects, setObjects,
    wrongClicks, setWrongClicks, hintsUsed, setHintsUsed, hintVisible, setHintVisible,
    reward, setReward, lastCompletionWasNew, setLastCompletionWasNew, eventsOpen, setEventsOpen, events, setEvents, voices, setVoices,
    collectionOpen, setCollectionOpen, collectionPage, setCollectionPage,
    homeMapReady, setHomeMapReady, stageBackgroundReady, setStageBackgroundReady,
    stageBackgroundIndex, setStageBackgroundIndex, marketDifficulty, setMarketDifficulty,
    marketCompletedDifficulties, setMarketCompletedDifficulties,
    marketChallengeIndex, setMarketChallengeIndex, marketRoundSeed, setMarketRoundSeed,
    marketShiftSeed, setMarketShiftSeed,
    marketRecentOrderSignatures, setMarketRecentOrderSignatures,
    marketRecentCorrectPositions, setMarketRecentCorrectPositions,
    marketPhase, setMarketPhase, marketBasket, setMarketBasket,
    marketSelectedTotal, setMarketSelectedTotal, marketFeedback, setMarketFeedback,
    zhuyinQuestionIndex, setZhuyinQuestionIndex, zhuyinSelectedAnswer, setZhuyinSelectedAnswer,
    zhuyinFeedback, setZhuyinFeedback,
    zhuyinLevel, setZhuyinLevel, zhuyinAnswerParts, setZhuyinAnswerParts,
  };
}
