import { useCallback, useEffect, useMemo, useRef } from "react";
import { xiaohangVoicePreference } from "../data/voice";
import { stages } from "../data/stages";
import { getStageInitialState } from "../lib/gameFlow";
import { appendEvent, getSaveProtectionMode, loadEvents, loadSave, resetSave, writeSave } from "../lib/storage";
import { createPlacedObjects } from "../lib/stagePlacement";
import type { GameEvent, SaveData } from "../types";
import { VoiceQueue } from "../lib/voiceEngine";
import { useForestFlow } from "./useForestFlow";
import { useGameState } from "./useGameState";
import { useMarketFlow } from "./useMarketFlow";

/** Assembles state, shared services, and the forest/market flow boundaries. */
export function useGameController(totalStages: number) {
  const game = useGameState();
  const { setEvents, setVoices } = game;
  const sessionId = useRef(`session-${Date.now()}`);
  const voiceQueue = useRef(new VoiceQueue());
  const selectedVoice = useMemo(() => pickXiaohangVoice(game.voices), [game.voices]);

  const logEvent = useCallback((event: GameEvent["event"], stageId?: string, payload?: Record<string, unknown>) => {
    appendEvent({ event, sessionId: sessionId.current, stageId, timestamp: Date.now(), payload });
    setEvents(loadEvents());
  }, [setEvents]);

  const speak = useCallback((text: string, options?: Parameters<VoiceQueue["speak"]>[1]) => {
    voiceQueue.current.speak(text, options);
  }, []);
  const cancelSpeech = useCallback(() => voiceQueue.current.cancel(), []);

  const persistSave = useCallback((save: SaveData) => {
    if (!writeSave(save)) {
      game.setSaveProtectionMode(getSaveProtectionMode());
      speak("這份進度來自較新的版本，目前無法儲存。", { tone: "soft", interrupt: true });
      return false;
    }
    game.setSave(save);
    return true;
  }, [game, speak]);

  const forest = useForestFlow({ game, logEvent, speak, persistSave });
  const market = useMarketFlow({ game, logEvent, speak, persistSave, completeStage: forest.completeStage });
  const { completeStage, selectForestObject, showForestHint, stageStartedAt } = forest;
  const { clearMarketTimers, view: marketView, actions: marketActions } = market;
  const { answerMarket, selectMarketDifficulty, selectMarketItem, showMarketHint } = marketActions;
  const stage = stages[game.stageIndex];

  const startStage = useCallback((index: number) => {
    if (game.saveProtectionMode === "future-version") {
      speak("這份進度來自較新的版本，目前為保護模式，不能開始新關卡。", { tone: "soft", interrupt: true });
      return;
    }
    const nextStage = stages[index];
    if (!nextStage) return;
    const initial = getStageInitialState(nextStage, game.save.marketProgress);

    clearMarketTimers();
    stageStartedAt.current = Date.now();
    game.setStageIndex(index);
    game.setStageBackgroundReady(initial.stageBackgroundReady);
    game.setObjects(createPlacedObjects(nextStage));
    game.setWrongClicks(0);
    game.setHintsUsed(0);
    game.setHintVisible(false);
    game.setReward(null);
    game.setMarketDifficulty(initial.marketDifficulty);
    game.setMarketCompletedDifficulties(initial.marketCompletedDifficulties);
    game.setMarketChallengeIndex(initial.marketChallengeIndex);
    game.setMarketRoundSeed(Date.now() + Math.random());
    game.setMarketPhase("pick");
    game.setMarketBasket({});
    game.setMarketSelectedTotal(null);
    game.setMarketFeedback("");
    game.setScreen("stage");
    logEvent("stage_start", nextStage.id, { difficulty: nextStage.difficulty });
    speak(nextStage.instructionText, { tone: "neutral", delayMs: 500 });
  }, [clearMarketTimers, game, logEvent, speak, stageStartedAt]);

  const startWorld = useCallback((world: "forest" | "market") => {
    const index = stages.findIndex((item) => item.world === world && !game.save.completedStageIds.includes(item.id));
    startStage(index === -1 ? Math.max(0, stages.findIndex((item) => item.world === world)) : index);
  }, [game.save.completedStageIds, startStage]);

  const resetProgress = useCallback(() => {
    clearMarketTimers();
    cancelSpeech();
    resetSave();
    const save = loadSave();
    game.setSave(save);
    game.setSaveProtectionMode(getSaveProtectionMode());
    game.setEvents(loadEvents());
    game.setStageIndex(0);
    game.setObjects(createPlacedObjects(stages[0]));
    game.setWrongClicks(0);
    game.setHintsUsed(0);
    game.setHintVisible(false);
    game.setReward(null);
    game.setMarketDifficulty(save.marketProgress.activeDifficulty);
    game.setMarketCompletedDifficulties(save.marketProgress.completedDifficulties);
    game.setMarketChallengeIndex(0);
    game.setMarketRoundSeed(Date.now() + Math.random());
    game.setMarketPhase("pick");
    game.setMarketBasket({});
    game.setMarketSelectedTotal(null);
    game.setMarketFeedback("");
    game.setScreen("intro");
    logEvent("progress_reset");
  }, [cancelSpeech, clearMarketTimers, game, logEvent]);

  const returnHome = useCallback(() => {
    clearMarketTimers();
    cancelSpeech();
    if (game.screen === "stage") {
      const foundTargets = game.objects.filter((object) => object.isTarget && object.found).length;
      const totalTargets = game.objects.filter((object) => object.isTarget).length;
      logEvent("stage_exit", stage.id, { durationMs: Date.now() - stageStartedAt.current, foundTargets, totalTargets });
    }
    game.setHintVisible(false);
    game.setScreen("intro");
  }, [cancelSpeech, clearMarketTimers, game, logEvent, stage.id, stageStartedAt]);

  const showHint = useCallback(() => {
    if (stage.mechanic === "market") showMarketHint();
    else showForestHint();
  }, [showForestHint, showMarketHint, stage.mechanic]);

  useEffect(() => {
    logEvent("session_start", undefined, { totalStages });
    const onBeforeUnload = () => appendEvent({ event: "session_end", sessionId: sessionId.current, timestamp: Date.now() });
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [logEvent, totalStages]);
  useEffect(() => { voiceQueue.current.setVoice(selectedVoice); }, [selectedVoice]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [setVoices]);

  const completedStageCount = stages.filter((item) => game.save.completedStageIds.includes(item.id)).length;
  const view = {
    screen: game.screen,
    stage,
    objects: game.objects,
    progress: { completedStageCount, totalStages, percent: Math.round((completedStageCount / totalStages) * 100) },
    market: marketView,
    collection: { open: game.collectionOpen, page: game.collectionPage },
  };
  const actions = {
    startForest: () => startWorld("forest"),
    startMarket: () => startWorld("market"),
    resetProgress,
    persistSave,
    completeStage,
    selectForestObject,
    showForestHint,
    showHint,
    selectMarketDifficulty,
    selectMarketItem,
    answerMarket,
    returnHome,
  };

  return { ...game, logEvent, speak, cancelSpeech, view, actions, startStage };
}

function pickXiaohangVoice(voices: SpeechSynthesisVoice[]) {
  const names = xiaohangVoicePreference.preferredNames.map((name) => name.toLowerCase());
  const keywords = xiaohangVoicePreference.preferredKeywords.map((keyword) => keyword.toLowerCase());
  const chineseVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("zh"));
  return chineseVoices.find((voice) => names.some((name) => `${voice.name} ${voice.lang}`.toLowerCase().includes(name)))
    ?? chineseVoices.find((voice) => keywords.some((keyword) => `${voice.name} ${voice.lang}`.toLowerCase().includes(keyword)))
    ?? chineseVoices[0] ?? voices[0];
}
