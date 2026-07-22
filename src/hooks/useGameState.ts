import { useState } from "react";
import { forestBackgrounds } from "../data/backgrounds";
import { stages } from "../data/stages";
import { getSaveProtectionMode, loadEvents, loadSave } from "../lib/storage";
import { createPlacedObjects } from "../lib/stagePlacement";
import type { GameEvent, MarketDifficultyId, PlacedObject, SaveData, StageConfig } from "../types";

export type Screen = "intro" | "stage" | "reward" | "complete";
export type MarketPhase = "pick" | "total";

function nextStageIndex(save: SaveData) {
  const index = stages.findIndex((stage) => !save.completedStageIds.includes(stage.id));
  return index === -1 ? stages.length - 1 : index;
}

/** Centralises mutable game/UI state; game rules stay in the controller for now. */
export function useGameState() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [saveProtectionMode, setSaveProtectionMode] = useState(() => getSaveProtectionMode());
  const [screen, setScreen] = useState<Screen>("intro");
  const [stageIndex, setStageIndex] = useState(() => nextStageIndex(loadSave()));
  const [objects, setObjects] = useState<PlacedObject[]>(() => createPlacedObjects(stages[nextStageIndex(loadSave())]));
  const [wrongClicks, setWrongClicks] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [reward, setReward] = useState<StageConfig["reward"] | null>(null);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [events, setEvents] = useState<GameEvent[]>(() => loadEvents());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionPage, setCollectionPage] = useState(0);
  const [homeMapReady, setHomeMapReady] = useState(false);
  const [stageBackgroundReady, setStageBackgroundReady] = useState(false);
  const [stageBackgroundIndex, setStageBackgroundIndex] = useState(() => Math.floor(Math.random() * forestBackgrounds.length));
  const [marketDifficulty, setMarketDifficulty] = useState<MarketDifficultyId>(save.marketProgress.activeDifficulty);
  const [marketCompletedDifficulties, setMarketCompletedDifficulties] = useState<MarketDifficultyId[]>(save.marketProgress.completedDifficulties);
  const [marketChallengeIndex, setMarketChallengeIndex] = useState(save.marketProgress.nextChallengeByDifficulty[save.marketProgress.activeDifficulty] ?? 0);
  const [marketRoundSeed, setMarketRoundSeed] = useState(() => Date.now() + Math.random());
  const [marketPhase, setMarketPhase] = useState<MarketPhase>("pick");
  const [marketBasket, setMarketBasket] = useState<Record<string, number>>({});
  const [marketSelectedTotal, setMarketSelectedTotal] = useState<number | null>(null);
  const [marketFeedback, setMarketFeedback] = useState("");

  return {
    save, setSave, saveProtectionMode, setSaveProtectionMode, screen, setScreen, stageIndex, setStageIndex, objects, setObjects,
    wrongClicks, setWrongClicks, hintsUsed, setHintsUsed, hintVisible, setHintVisible,
    reward, setReward, eventsOpen, setEventsOpen, events, setEvents, voices, setVoices,
    collectionOpen, setCollectionOpen, collectionPage, setCollectionPage,
    homeMapReady, setHomeMapReady, stageBackgroundReady, setStageBackgroundReady,
    stageBackgroundIndex, setStageBackgroundIndex, marketDifficulty, setMarketDifficulty,
    marketCompletedDifficulties, setMarketCompletedDifficulties,
    marketChallengeIndex, setMarketChallengeIndex, marketRoundSeed, setMarketRoundSeed,
    marketPhase, setMarketPhase, marketBasket, setMarketBasket,
    marketSelectedTotal, setMarketSelectedTotal, marketFeedback, setMarketFeedback,
  };
}
