import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { xiaohangVoicePreference } from "../data/voice";
import { stages } from "../data/stages";
import { createForestReplayRoute, getStageInitialState } from "../lib/gameFlow";
import { clearMarketRoundSession, clearMarketStorySeen, hasSeenMarketStory } from "../lib/marketSession";
import { appendEvent, getSaveProtectionMode, loadEvents, loadSave, resetSave, writeSave } from "../lib/storage";
import { createPlacedObjects } from "../lib/stagePlacement";
import type { GameEvent, SaveData } from "../types";
import { VoiceQueue } from "../lib/voiceEngine";
import { useForestFlow } from "./useForestFlow";
import { useGameState } from "./useGameState";
import { useMarketFlow } from "./useMarketFlow";
import { useZhuyinFlow } from "./useZhuyinFlow";

const voiceMutedStorageKey = "wonder-trail:voice-muted";

function loadVoiceMutedPreference() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(voiceMutedStorageKey) === "true";
  } catch {
    return false;
  }
}

function writeVoiceMutedPreference(muted: boolean) {
  try {
    window.localStorage.setItem(voiceMutedStorageKey, String(muted));
  } catch {
    // Voice controls should remain usable when storage is unavailable.
  }
}

/** Assembles state, shared services, and the forest/market flow boundaries. */
export function useGameController(totalStages: number) {
  const game = useGameState();
  const { setEvents, setVoices } = game;
  const sessionId = useRef(`session-${Date.now()}`);
  const forestReplayRoute = useRef<number[]>([]);
  const forestReplayPosition = useRef(0);
  const voiceQueue = useRef(new VoiceQueue());
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [voiceSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [voiceMuted, setVoiceMuted] = useState(loadVoiceMutedPreference);
  const voiceMutedRef = useRef(voiceMuted);
  const selectedVoice = useMemo(() => pickXiaohangVoice(game.voices), [game.voices]);

  const logEvent = useCallback((event: GameEvent["event"], stageId?: string, payload?: Record<string, unknown>) => {
    appendEvent({ event, sessionId: sessionId.current, stageId, timestamp: Date.now(), payload });
    setEvents(loadEvents());
  }, [setEvents]);

  const speak = useCallback((text: string, options?: Parameters<VoiceQueue["speak"]>[1]) => {
    if (voiceMutedRef.current) return;
    voiceQueue.current.speak(text, options);
  }, []);
  const cancelSpeech = useCallback(() => voiceQueue.current.cancel(), []);
  const toggleVoice = useCallback(() => {
    const nextMuted = !voiceMutedRef.current;
    voiceMutedRef.current = nextMuted;
    setVoiceMuted(nextMuted);
    writeVoiceMutedPreference(nextMuted);
    if (nextMuted) {
      voiceQueue.current.cancel();
      return;
    }
    voiceQueue.current.speak("聲音已開啟。", { tone: "positive", interrupt: true, delayMs: 0 });
  }, []);

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
  const market = useMarketFlow({ game, logEvent, speak, persistSave });
  const zhuyin = useZhuyinFlow({ game, logEvent, speak, persistSave });
  const { completeStage, selectForestObject, showForestHint, stageStartedAt } = forest;
  const { clearMarketTimers, view: marketView, actions: marketActions } = market;
  const { answerMarket, continueMarket, selectMarketDifficulty, selectMarketItem, showMarketHint, startMarketShift } = marketActions;
  const { clearZhuyinTimers, view: zhuyinView, actions: zhuyinActions } = zhuyin;
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
    clearZhuyinTimers();
    stageStartedAt.current = Date.now();
    game.setStageIndex(index);
    game.setStageBackgroundReady(initial.stageBackgroundReady);
    game.setObjects(createPlacedObjects(nextStage));
    game.setWrongClicks(0);
    game.setHintsUsed(0);
    game.setHintVisible(false);
    game.setReward(null);
    game.setLastCompletionWasNew(false);
    game.setMarketDifficulty(initial.marketDifficulty);
    game.setMarketCompletedDifficulties(initial.marketCompletedDifficulties);
    game.setMarketChallengeIndex(initial.marketChallengeIndex);
    game.setMarketRoundSeed(Date.now() + Math.random());
    game.setMarketShiftSeed(Date.now() + Math.random());
    game.setMarketRecentOrderSignatures([]);
    game.setMarketRecentCorrectPositions([]);
    const shouldShowMarketStory = nextStage.mechanic === "market"
      && !hasSeenMarketStory()
      && !game.save.completedStageIds.includes(nextStage.id);
    game.setMarketPhase(shouldShowMarketStory ? "story" : "pick");
    game.setMarketBasket({});
    game.setMarketSelectedTotal(null);
    game.setMarketFeedback("");
    game.setZhuyinQuestionIndex(0);
    game.setZhuyinSelectedAnswer(null);
    game.setZhuyinFeedback("");
    game.setZhuyinLevel(null);
    game.setZhuyinAnswerParts([]);
    game.setScreen("stage");
    logEvent("stage_start", nextStage.id, { difficulty: nextStage.difficulty });
    speak(nextStage.instructionText, { tone: "neutral", delayMs: 500 });
  }, [clearMarketTimers, clearZhuyinTimers, game, logEvent, speak, stageStartedAt]);

  const startWorld = useCallback((world: "forest" | "market" | "school") => {
    const worldStageIndexes = stages.flatMap((item, index) => item.world === world ? [index] : []);
    const index = worldStageIndexes.find((stageIndex) => !game.save.completedStageIds.includes(stages[stageIndex].id));
    if (world === "forest" && index === undefined) {
      const route = createForestReplayRoute(worldStageIndexes);
      forestReplayRoute.current = route;
      forestReplayPosition.current = 0;
      startStage(route[0]);
      return;
    }
    forestReplayRoute.current = [];
    forestReplayPosition.current = 0;
    startStage(index ?? worldStageIndexes[0] ?? 0);
  }, [game.save.completedStageIds, startStage]);

  const continueForestAdventure = useCallback(() => {
    if (stage.world !== "forest") return;
    if (forestReplayRoute.current.length > 0) {
      const nextPosition = forestReplayPosition.current + 1;
      if (nextPosition < forestReplayRoute.current.length) {
        forestReplayPosition.current = nextPosition;
        startStage(forestReplayRoute.current[nextPosition]);
        return;
      }
      game.setScreen("complete");
      speak("恭喜再次通關！", { tone: "positive", interrupt: true });
      return;
    }

    const nextIndex = game.stageIndex + 1;
    const nextStage = stages[nextIndex];
    if (nextStage?.world === "forest") {
      startStage(nextIndex);
      return;
    }

    game.setScreen("complete");
    if (game.lastCompletionWasNew) {
      speak("森林的任務完成，取得金色螺旋槳零件！", { tone: "positive", interrupt: true });
      logEvent("chapter_complete", stage.id, { world: stage.world, part: "A" });
    } else {
      speak("恭喜再次通關！", { tone: "positive", interrupt: true });
    }
  }, [game, logEvent, speak, stage.id, stage.world, startStage]);

  const resetProgress = useCallback(() => {
    clearMarketTimers();
    clearZhuyinTimers();
    cancelSpeech();
    clearMarketRoundSession();
    clearMarketStorySeen();
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
    game.setLastCompletionWasNew(false);
    game.setMarketDifficulty(save.marketProgress.activeDifficulty);
    game.setMarketCompletedDifficulties(save.marketProgress.completedDifficulties);
    game.setMarketChallengeIndex(0);
    game.setMarketRoundSeed(Date.now() + Math.random());
    game.setMarketShiftSeed(Date.now() + Math.random());
    game.setMarketRecentOrderSignatures([]);
    game.setMarketRecentCorrectPositions([]);
    game.setMarketPhase("pick");
    game.setMarketBasket({});
    game.setMarketSelectedTotal(null);
    game.setMarketFeedback("");
    game.setZhuyinQuestionIndex(0);
    game.setZhuyinSelectedAnswer(null);
    game.setZhuyinFeedback("");
    game.setZhuyinLevel(null);
    game.setZhuyinAnswerParts([]);
    forestReplayRoute.current = [];
    forestReplayPosition.current = 0;
    game.setScreen("intro");
    logEvent("progress_reset");
  }, [cancelSpeech, clearMarketTimers, clearZhuyinTimers, game, logEvent]);

  const returnHome = useCallback(() => {
    clearMarketTimers();
    clearZhuyinTimers();
    cancelSpeech();
    if (game.screen === "stage") {
      const foundTargets = game.objects.filter((object) => object.isTarget && object.found).length;
      const totalTargets = game.objects.filter((object) => object.isTarget).length;
      logEvent("stage_exit", stage.id, { durationMs: Date.now() - stageStartedAt.current, foundTargets, totalTargets });
    }
    game.setHintVisible(false);
    game.setScreen("intro");
  }, [cancelSpeech, clearMarketTimers, clearZhuyinTimers, game, logEvent, stage.id, stageStartedAt]);

  const showHint = useCallback(() => {
    if (stage.mechanic === "market") showMarketHint();
    else if (stage.mechanic === "zhuyin") zhuyinActions.showZhuyinHint();
    else showForestHint();
  }, [showForestHint, showMarketHint, stage.mechanic, zhuyinActions]);

  useEffect(() => {
    logEvent("session_start", undefined, { totalStages });
    const onBeforeUnload = () => appendEvent({ event: "session_end", sessionId: sessionId.current, timestamp: Date.now() });
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [logEvent, totalStages]);
  useEffect(() => { voiceQueue.current.setVoice(selectedVoice); }, [selectedVoice]);
  useEffect(() => voiceQueue.current.subscribe(setVoiceSpeaking), []);
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
    zhuyin: zhuyinView,
    collection: { open: game.collectionOpen, page: game.collectionPage },
    voice: { supported: voiceSupported, speaking: voiceSpeaking, muted: voiceMuted },
  };
  const actions = {
    startForest: () => startWorld("forest"),
    startMarket: () => startWorld("market"),
    startSchool: () => startWorld("school"),
    resetProgress,
    persistSave,
    completeStage,
    selectForestObject,
    showForestHint,
    showHint,
    startMarketShift,
    selectMarketDifficulty,
    selectMarketItem,
    answerMarket,
    continueMarket,
    answerZhuyin: zhuyinActions.answerZhuyin,
    continueZhuyin: zhuyinActions.continueZhuyin,
    showZhuyinHint: zhuyinActions.showZhuyinHint,
    selectZhuyinLevel: zhuyinActions.selectZhuyinLevel,
    returnToZhuyinLevels: zhuyinActions.returnToZhuyinLevels,
    undoZhuyinPart: zhuyinActions.undoZhuyinPart,
    continueForestAdventure,
    toggleVoice,
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
