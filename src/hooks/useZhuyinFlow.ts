import { useCallback, useEffect, useMemo, useRef } from "react";
import { stages } from "../data/stages";
import { completeStageSave } from "../lib/gameFlow";
import type { GameEvent, SaveData } from "../types";
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

/** Handles the school phonics activity without coupling it to the screen layout. */
export function useZhuyinFlow({ game, logEvent, speak, persistSave }: Props) {
  const hintTimer = useRef<number | null>(null);
  const finishing = useRef(false);
  const stage = stages[game.stageIndex];
  const puzzles = useMemo(() => {
    if (stage.mechanic !== "zhuyin") return [];
    return stage.zhuyinPuzzles ?? (stage.zhuyinPuzzle ? [stage.zhuyinPuzzle] : []);
  }, [stage]);
  const puzzle = puzzles[game.zhuyinQuestionIndex] ?? puzzles[0];

  const clearZhuyinTimers = useCallback(() => {
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = null;
    finishing.current = false;
  }, []);

  const showZhuyinHint = useCallback((reason: "zhuyin" | "timer" = "zhuyin") => {
    if (!puzzle || game.screen !== "stage" || stage.mechanic !== "zhuyin" || game.zhuyinSelectedAnswer === puzzle.answer[0]) return;
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    game.setHintVisible(true);
    game.setHintsUsed((value) => value + 1);
    hintTimer.current = window.setTimeout(() => {
      game.setHintVisible(false);
      hintTimer.current = null;
    }, 1800);
    speak(`小航提醒你，${puzzle.word}的第一個音是什麼？`, { tone: "neutral", interrupt: true });
    logEvent("hint_show", stage.id, { reason, questionIndex: game.zhuyinQuestionIndex });
  }, [game, logEvent, puzzle, speak, stage]);

  const answerZhuyin = useCallback((value: string) => {
    if (!puzzle || game.screen !== "stage" || stage.mechanic !== "zhuyin") return;
    const correctAnswer = puzzle.answer[0];
    if (game.zhuyinSelectedAnswer === correctAnswer) return;
    game.setZhuyinSelectedAnswer(value);
    if (value !== correctAnswer) {
      game.setZhuyinFeedback("再聽一次，找找看一樣的聲音。你可以再試試看！");
      game.setWrongClicks((count) => count + 1);
      logEvent("wrong_click", stage.id, { selectedAnswer: value, correctAnswer, mode: "zhuyin" });
      speak("再聽一次，找找看一樣的聲音。", { tone: "soft", interrupt: true });
      return;
    }
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = null;
    game.setHintVisible(false);
    game.setZhuyinFeedback(`答對了！${puzzle.word}的第一個音是${correctAnswer}。`);
    speak(`答對了！${puzzle.word}的第一個音是${correctAnswer}。`, { tone: "positive", interrupt: true });
  }, [game, logEvent, puzzle, speak, stage]);

  const finishSchoolStage = useCallback(() => {
    if (!puzzle || game.screen !== "stage" || stage.mechanic !== "zhuyin" || game.zhuyinSelectedAnswer !== puzzle.answer[0] || finishing.current) return;
    finishing.current = true;
    const completionWasNew = !game.save.completedStageIds.includes(stage.id);
    const nextSave = completeStageSave(game.save, stage.id, stage.reward, new Date().toISOString());
    if (!persistSave(nextSave)) {
      finishing.current = false;
      return;
    }
    clearZhuyinTimers();
    game.setLastCompletionWasNew(completionWasNew);
    game.setReward(stage.reward);
    game.setScreen("complete");
    const message = completionWasNew ? "注音小達人！謝謝你幫老師完成聲音書！" : "再次完成學校任務！你把聲音找得很準！";
    speak(message, { tone: "positive", interrupt: true });
    logEvent("stage_finish", stage.id, { wrongClicks: game.wrongClicks, hintsUsed: game.hintsUsed, difficulty: stage.difficulty });
    if (completionWasNew) logEvent("reward_claimed", stage.id, stage.reward);
  }, [clearZhuyinTimers, game, logEvent, persistSave, puzzle, speak, stage]);

  const continueZhuyin = useCallback(() => {
    if (!puzzle || game.screen !== "stage" || stage.mechanic !== "zhuyin" || game.zhuyinSelectedAnswer !== puzzle.answer[0]) return;
    if (game.zhuyinQuestionIndex < puzzles.length - 1) {
      game.setZhuyinQuestionIndex((index) => index + 1);
      game.setZhuyinSelectedAnswer(null);
      game.setZhuyinFeedback("");
      game.setHintVisible(false);
      speak("很好！來看看下一個詞語。", { tone: "positive", interrupt: true });
      return;
    }
    finishSchoolStage();
  }, [finishSchoolStage, game, puzzle, puzzles.length, speak, stage]);

  useEffect(() => {
    if (game.screen !== "stage" || stage.mechanic !== "zhuyin" || !puzzle || game.zhuyinSelectedAnswer === puzzle.answer[0] || game.hintVisible) return undefined;
    const timer = window.setTimeout(() => showZhuyinHint("timer"), stage.assist.hintDelayMs);
    return () => window.clearTimeout(timer);
  }, [game.hintVisible, game.screen, game.zhuyinSelectedAnswer, puzzle, showZhuyinHint, stage]);

  useEffect(() => () => clearZhuyinTimers(), [clearZhuyinTimers]);

  return {
    clearZhuyinTimers,
    view: {
      puzzles,
      puzzle,
      questionIndex: game.zhuyinQuestionIndex,
      totalQuestions: puzzles.length,
      selectedAnswer: game.zhuyinSelectedAnswer,
      feedback: game.zhuyinFeedback,
    },
    actions: { answerZhuyin, continueZhuyin, showZhuyinHint },
  };
}
