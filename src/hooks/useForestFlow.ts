import { useCallback, useEffect, useRef } from "react";
import { forestBackgrounds } from "../data/backgrounds";
import { pickScript, voiceScripts } from "../data/voiceScripts";
import { stages } from "../data/stages";
import { completeStageSave, selectForestTarget } from "../lib/gameFlow";
import type { GameEvent, PlacedObject, SaveData } from "../types";
import { VoiceQueue } from "../lib/voiceEngine";
import { useGameState } from "./useGameState";

type GameState = ReturnType<typeof useGameState>;
type LogEvent = (event: GameEvent["event"], stageId?: string, payload?: Record<string, unknown>) => void;
type Speak = (text: string, options?: Parameters<VoiceQueue["speak"]>[1]) => void;

type Props = {
  game: GameState;
  logEvent: LogEvent;
  speak: Speak;
  persistSave: (save: SaveData) => boolean;
};

export function useForestFlow({ game, logEvent, speak, persistSave }: Props) {
  const stageStartedAt = useRef(Date.now());
  const { hintVisible, screen, setHintVisible, setHintsUsed } = game;
  const stage = stages[game.stageIndex];

  const completeStage = useCallback((nextObjects = game.objects, sourceSave = game.save) => {
    const currentStage = stages[game.stageIndex];
    const durationMs = Date.now() - stageStartedAt.current;
    const reward = currentStage.reward;
    const nextSave = completeStageSave(sourceSave, currentStage.id, reward, new Date().toISOString());

    game.setObjects(nextObjects);
    if (!persistSave(nextSave)) return undefined;
    game.setReward(reward);
    game.setScreen("reward");
    if (currentStage.mechanic === "search" && forestBackgrounds.length > 1) {
      game.setStageBackgroundIndex((currentIndex) => {
        const offset = 1 + Math.floor(Math.random() * (forestBackgrounds.length - 1));
        return (currentIndex + offset) % forestBackgrounds.length;
      });
    }
    speak(pickScript(voiceScripts.reward, game.stageIndex), { tone: "positive", interrupt: true });
    speak(currentStage.mechanic === "market" ? "小航取得了市場的零件。" : "小航把寶物收進森林書。", { tone: "neutral", delayMs: 500 });
    logEvent("stage_finish", currentStage.id, { durationMs, wrongClicks: game.wrongClicks, hintsUsed: game.hintsUsed, difficulty: currentStage.difficulty });
    logEvent("reward_claimed", currentStage.id, reward);
    return nextSave;
  }, [game, logEvent, persistSave, speak]);

  const showForestHint = useCallback((reason: "assist" | "manual" = "manual") => {
    const currentStage = stages[game.stageIndex];
    if (game.screen !== "stage" || currentStage.mechanic !== "search") return;
    game.setHintVisible(true);
    game.setHintsUsed((value) => value + 1);
    speak(`${voiceScripts.hintPrefix}${currentStage.instructionText}`, { tone: "neutral", interrupt: true });
    logEvent("hint_show", currentStage.id, { reason });
  }, [game, logEvent, speak]);

  const selectForestObject = useCallback((object: PlacedObject) => {
    const currentStage = stages[game.stageIndex];
    if (game.screen !== "stage" || currentStage.mechanic !== "search" || !game.stageBackgroundReady || object.found) return;
    if (object.isTarget) {
      const result = selectForestTarget(game.objects, object.instanceId);
      if (!result.changed) return;
      if (result.completed) completeStage(result.objects);
      else {
        const foundTargets = game.objects.filter((item) => item.isTarget && item.found).length;
        game.setObjects(result.objects);
        speak(pickScript(voiceScripts.partialSuccess, foundTargets), { tone: "positive", interrupt: true });
      }
      return;
    }
    const nextWrongClicks = game.wrongClicks + 1;
    game.setWrongClicks(nextWrongClicks);
    logEvent("wrong_click", currentStage.id, { clickedAssetId: object.assetId, targetAssetIds: (currentStage.targets ?? []).map((target) => target.assetId) });
    speak(pickScript(voiceScripts.wrongClick, nextWrongClicks), { tone: "soft", interrupt: true });
    if (nextWrongClicks >= currentStage.assist.maxWrongClicksBeforeHint && !game.hintVisible) showForestHint("assist");
  }, [completeStage, game, logEvent, showForestHint, speak]);

  useEffect(() => {
    if (screen !== "stage" || stage.mechanic !== "search" || hintVisible) return undefined;
    const timer = window.setTimeout(() => {
      setHintVisible(true);
      setHintsUsed((value) => value + 1);
      speak(`${voiceScripts.hintPrefix}${stage.instructionText}`, { tone: "neutral", delayMs: 500 });
      logEvent("hint_show", stage.id, { reason: "timer" });
    }, stage.assist.hintDelayMs);
    return () => window.clearTimeout(timer);
  }, [hintVisible, logEvent, screen, setHintVisible, setHintsUsed, speak, stage]);

  return { stageStartedAt, completeStage, showForestHint, selectForestObject };
}
