import { useCallback, useEffect, useMemo, useRef } from "react";
import { ageBands } from "../data/ageBands";
import { stages } from "../data/stages";
import { completeStageSave } from "../lib/gameFlow";
import { seededShuffle } from "../lib/random";
import type { GameEvent, SaveData, ZhuyinLevelConfig, ZhuyinLevelId } from "../types";
import { VoiceQueue } from "../lib/voiceEngine";
import { useGameState } from "./useGameState";

type GameState = ReturnType<typeof useGameState>;
type LogEvent = (event: GameEvent["event"], stageId?: string, payload?: Record<string, unknown>) => void;
type Speak = (text: string, options?: Parameters<VoiceQueue["speak"]>[1]) => void;

export const zhuyinLevels: ZhuyinLevelConfig[] = [
  { id: "listen", title: "聽音選注音", shortDescription: "只聽字音，親子一起找注音", ageLabel: ageBands.preschoolWithAdult, icon: "👂" },
  { id: "initial", title: "找開頭聲音", shortDescription: "聽一聽，辨認第一個聲符", ageLabel: ageBands.preschool, icon: "🔎" },
  { id: "syllable", title: "拼出一個字", shortDescription: "組合聲符、韻符和聲調", ageLabel: ageBands.earlyReader, icon: "🧩" },
  { id: "word", title: "完成一個詞", shortDescription: "排列音節，讀出完整詞語", ageLabel: ageBands.schoolAge, icon: "📖" },
];

const initialByWord: Record<string, { answer: string; choices: string[] }> = {
  蘋果: { answer: "ㄆ", choices: ["ㄅ", "ㄆ", "ㄇ"] },
  松果: { answer: "ㄙ", choices: ["ㄕ", "ㄙ", "ㄒ"] },
  蘑菇: { answer: "ㄇ", choices: ["ㄇ", "ㄋ", "ㄅ"] },
};
const partsByWord: Record<string, string[]> = {
  蘋果: ["ㄆ", "ㄧㄥ", "ˊ"], 松果: ["ㄙ", "ㄨㄥ"], 蘑菇: ["ㄇ", "ㄛ", "ˊ"],
};
const wordPartsByWord: Record<string, string[]> = {
  蘋果: ["ㄆㄧㄥˊ", "ㄍㄨㄛˇ"], 松果: ["ㄙㄨㄥ", "ㄍㄨㄛˇ"], 蘑菇: ["ㄇㄛˊ", "ㄍㄨ"],
};
const partDistractors: Record<string, string[]> = {
  蘋果: ["ㄆ", "ㄅ", "ㄧㄥ", "ㄧㄣ", "ˊ", "ˇ"],
  松果: ["ㄙ", "ㄕ", "ㄨㄥ", "ㄨㄢ"],
  蘑菇: ["ㄇ", "ㄋ", "ㄛ", "ㄜ", "ˊ", "ˇ"],
};

export function useZhuyinFlow({ game, logEvent, speak, persistSave }: {
  game: GameState; logEvent: LogEvent; speak: Speak; persistSave: (save: SaveData) => boolean;
}) {
  const hintTimer = useRef<number | null>(null);
  const finishing = useRef(false);
  const stage = stages[game.stageIndex];
  const level = game.zhuyinLevel;
  const sourcePuzzles = useMemo(() => stage.mechanic === "zhuyin" ? (stage.zhuyinPuzzles ?? []) : [], [stage]);
  const puzzles = useMemo(
    () => seededShuffle(sourcePuzzles, `${game.zhuyinRoundSeed}:${level ?? "levels"}`),
    [game.zhuyinRoundSeed, level, sourcePuzzles],
  );
  const puzzle = puzzles[game.zhuyinQuestionIndex] ?? puzzles[0];

  const question = useMemo(() => {
    if (!puzzle || !level) return null;
    if (level === "listen") return {
      prompt: "聽一聽，選出你聽到的注音", answerParts: [puzzle.answer[0]], choices: seededShuffle(puzzles.map((item) => item.answer[0]), `${game.zhuyinRoundSeed}:${level}:${puzzle.word}:choices`),
      choiceCharacters: Object.fromEntries(puzzles.map((item) => [item.answer[0], item.word[0]])), choiceKind: "text" as const,
    };
    if (level === "initial") return {
      prompt: `「${puzzle.word[0]}」從哪一個聲音開始？`, answerParts: [initialByWord[puzzle.word].answer], choices: seededShuffle(initialByWord[puzzle.word].choices, `${game.zhuyinRoundSeed}:${level}:${puzzle.word}:choices`), choiceKind: "text" as const,
    };
    if (level === "syllable") return {
      prompt: `把「${puzzle.word[0]}」的聲音拼起來`, answerParts: partsByWord[puzzle.word], choices: seededShuffle(partDistractors[puzzle.word], `${game.zhuyinRoundSeed}:${level}:${puzzle.word}:choices`), choiceKind: "text" as const,
    };
    const answerParts = wordPartsByWord[puzzle.word];
    const distractor = puzzle.word === "蘋果" ? "ㄆㄧㄣˊ" : "ㄍㄨㄛ";
    return {
      prompt: `依序拼出「${puzzle.word}」`, answerParts,
      choices: seededShuffle([...answerParts, distractor], `${game.zhuyinRoundSeed}:${level}:${puzzle.word}:choices`),
      choiceCharacters: {
        ...Object.fromEntries(answerParts.map((part, index) => [part, puzzle.word[index]])),
        [distractor]: distractor === "ㄆㄧㄣˊ" ? "頻" : "郭",
      },
      choiceKind: "text" as const,
    };
  }, [game.zhuyinRoundSeed, level, puzzle, puzzles]);

  const answeredCorrectly = !!question && game.zhuyinAnswerParts.length === question.answerParts.length
    && game.zhuyinAnswerParts.every((part, index) => part === question.answerParts[index]);

  const clearZhuyinTimers = useCallback(() => {
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = null;
    finishing.current = false;
  }, []);

  const selectZhuyinLevel = useCallback((nextLevel: ZhuyinLevelId) => {
    game.setZhuyinLevel(nextLevel);
    game.setZhuyinRoundSeed(Date.now() + Math.random());
    game.setZhuyinQuestionIndex(0);
    game.setZhuyinAnswerParts([]);
    game.setZhuyinSelectedAnswer(null);
    game.setZhuyinFeedback("");
    const selected = zhuyinLevels.find((item) => item.id === nextLevel);
    speak(`${selected?.title ?? "聲音任務"}，準備開始！`, { tone: "positive", interrupt: true });
  }, [game, speak]);

  const showZhuyinHint = useCallback((reason: "zhuyin" | "timer" = "zhuyin") => {
    if (!puzzle || !question || answeredCorrectly) return;
    game.setHintVisible(true);
    game.setHintsUsed((value) => value + 1);
    const nextPart = question.answerParts[game.zhuyinAnswerParts.length] ?? question.answerParts[0];
    const message = level === "listen" ? `再聽一次：${puzzle.word[0]}。選出這個字的完整注音。` : level === "initial"
      ? `${puzzle.word[0]}的開頭聲音是${nextPart}` : `下一塊是${nextPart}`;
    speak(message, { tone: "neutral", interrupt: true });
    logEvent("hint_show", stage.id, { reason, level, questionIndex: game.zhuyinQuestionIndex });
    window.setTimeout(() => game.setHintVisible(false), 2200);
  }, [answeredCorrectly, game, level, logEvent, puzzle, question, speak, stage.id]);

  const answerZhuyin = useCallback((value: string) => {
    if (!puzzle || !question || answeredCorrectly) return;
    const expected = question.answerParts[game.zhuyinAnswerParts.length];
    if (value !== expected) {
      game.setZhuyinSelectedAnswer(value);
      game.setZhuyinFeedback(level === "listen" ? `再按一次播放鍵，聽聽「${puzzle.word[0]}」的完整字音。` : "這個聲音不一樣，再聽一次。你可以再試試看！");
      game.setWrongClicks((count) => count + 1);
      logEvent("wrong_click", stage.id, { selectedAnswer: value, correctAnswer: expected, level });
      speak("再聽一次，你可以再試試看。", { tone: "soft", interrupt: true });
      return;
    }
    const next = [...game.zhuyinAnswerParts, value];
    game.setZhuyinAnswerParts(next);
    game.setZhuyinSelectedAnswer(null);
    if (next.length < question.answerParts.length) {
      game.setZhuyinFeedback("很好！再找下一塊聲音。");
      speak(value, { tone: "positive", interrupt: true });
      return;
    }
    game.setZhuyinFeedback(`答對了！你選對「${level === "listen" ? puzzle.word[0] : puzzle.word}」的注音了。`);
    speak(`答對了！${puzzle.word}。`, { tone: "positive", interrupt: true });
  }, [answeredCorrectly, game, level, logEvent, puzzle, question, speak, stage.id]);

  const undoZhuyinPart = useCallback(() => {
    if (answeredCorrectly) return;
    game.setZhuyinAnswerParts((parts) => parts.slice(0, -1));
    game.setZhuyinFeedback("");
  }, [answeredCorrectly, game]);

  const finishSchoolStage = useCallback(() => {
    if (!puzzle || !level || !answeredCorrectly || finishing.current) return;
    finishing.current = true;
    const completionWasNew = !game.save.completedStageIds.includes(stage.id);
    const saveWithLevel = game.save.completedZhuyinLevels.includes(level)
      ? game.save
      : { ...game.save, completedZhuyinLevels: [...game.save.completedZhuyinLevels, level] };
    const nextSave = completeStageSave(saveWithLevel, stage.id, stage.reward, new Date().toISOString());
    if (!persistSave(nextSave)) { finishing.current = false; return; }
    clearZhuyinTimers();
    game.setLastCompletionWasNew(completionWasNew);
    game.setReward(stage.reward);
    game.setScreen("complete");
    const selectedLevel = zhuyinLevels.find((item) => item.id === level);
    speak(`${selectedLevel?.title ?? "聲音任務"}完成！你學會新的聲音本領了！`, { tone: "positive", interrupt: true });
    logEvent("stage_finish", stage.id, { level, wrongClicks: game.wrongClicks, hintsUsed: game.hintsUsed });
  }, [answeredCorrectly, clearZhuyinTimers, game, level, logEvent, persistSave, puzzle, speak, stage]);

  const continueZhuyin = useCallback(() => {
    if (!answeredCorrectly) return;
    if (game.zhuyinQuestionIndex < puzzles.length - 1) {
      game.setZhuyinQuestionIndex((index) => index + 1);
      game.setZhuyinAnswerParts([]);
      game.setZhuyinSelectedAnswer(null);
      game.setZhuyinFeedback("");
      speak("很好！來看看下一題。", { tone: "positive", interrupt: true });
    } else finishSchoolStage();
  }, [answeredCorrectly, finishSchoolStage, game, puzzles.length, speak]);

  const returnToZhuyinLevels = useCallback(() => {
    game.setZhuyinLevel(null); game.setZhuyinQuestionIndex(0); game.setZhuyinAnswerParts([]); game.setZhuyinFeedback("");
  }, [game]);

  useEffect(() => {
    if (!level || answeredCorrectly || game.hintVisible) return undefined;
    const timer = window.setTimeout(() => showZhuyinHint("timer"), stage.assist.hintDelayMs);
    return () => window.clearTimeout(timer);
  }, [answeredCorrectly, game.hintVisible, level, showZhuyinHint, stage.assist.hintDelayMs]);
  useEffect(() => () => clearZhuyinTimers(), [clearZhuyinTimers]);

  return {
    clearZhuyinTimers,
    view: { levels: zhuyinLevels, completedLevels: game.save.completedZhuyinLevels, level, puzzles, puzzle, question, answeredCorrectly, answerParts: game.zhuyinAnswerParts,
      questionIndex: game.zhuyinQuestionIndex, totalQuestions: puzzles.length, selectedAnswer: game.zhuyinSelectedAnswer, feedback: game.zhuyinFeedback },
    actions: { answerZhuyin, continueZhuyin, showZhuyinHint, selectZhuyinLevel, returnToZhuyinLevels, undoZhuyinPart },
  };
}
