import { useCallback, useEffect, useMemo, useRef } from "react";
import { assets } from "../data/assets";
import { voiceScripts } from "../data/voiceScripts";
import { stages } from "../data/stages";
import { advanceMarketProgress, selectMarketDifficulty as getMarketDifficultySelection } from "../lib/gameFlow";
import { marketAnswerOptions, marketBasketMatches, marketQuestionValue, marketRequiredCount, randomizeMarketChallenge } from "../lib/market";
import type { GameEvent, MarketDifficultyId, SaveData } from "../types";
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
  completeStage: (objects?: GameState["objects"], sourceSave?: SaveData) => SaveData | undefined;
};

export function useMarketFlow({ game, logEvent, speak, persistSave, completeStage }: Props) {
  const marketHintTimer = useRef<number | null>(null);
  const marketFinishTimer = useRef<number | null>(null);
  const stage = stages[game.stageIndex];
  const marketPuzzle = stage.marketPuzzle;
  const marketDifficulties = useMemo(() => marketPuzzle?.difficulties ?? [], [marketPuzzle]);
  const activeDifficulty = marketDifficulties.find((item) => item.id === game.marketDifficulty);
  const challenges = useMemo(() => marketPuzzle?.challenges.filter((item) => item.difficulty === game.marketDifficulty) ?? [], [game.marketDifficulty, marketPuzzle]);
  const challengeTemplate = challenges[game.marketChallengeIndex];
  const challenge = useMemo(() => challengeTemplate ? randomizeMarketChallenge(challengeTemplate, game.marketRoundSeed) : undefined, [challengeTemplate, game.marketRoundSeed]);
  const question = challenge && activeDifficulty ? marketQuestionValue(challenge, activeDifficulty.questionMode) : 0;
  const answerChoices = useMemo(() => marketAnswerOptions(question, challenge?.id ?? "market"), [challenge?.id, question]);
  const hintText = challenge ? game.marketPhase === "pick" ? challenge.requestText : activeDifficulty?.questionMode === "number-recognition" ? "數一數，籃子裡有幾個商品。" : "看價格牌，把商品價錢加起來。" : stage.instructionText;
  const { hintVisible, screen, setHintVisible, setHintsUsed } = game;

  const clearMarketTimers = useCallback(() => {
    if (marketHintTimer.current !== null) window.clearTimeout(marketHintTimer.current);
    if (marketFinishTimer.current !== null) window.clearTimeout(marketFinishTimer.current);
    marketHintTimer.current = null;
    marketFinishTimer.current = null;
  }, []);

  const resetMarketRound = useCallback((nextIndex: number, nextDifficulty = game.marketDifficulty) => {
    clearMarketTimers();
    game.setMarketDifficulty(nextDifficulty);
    game.setMarketChallengeIndex(nextIndex);
    game.setMarketRoundSeed(Date.now() + Math.random());
    game.setMarketPhase("pick");
    game.setMarketBasket({});
    game.setMarketSelectedTotal(null);
    game.setMarketFeedback("");
    game.setHintVisible(false);
  }, [clearMarketTimers, game]);

  const persistMarketProgress = useCallback((progress: SaveData["marketProgress"]) => {
    const nextSave: SaveData = { ...game.save, marketProgress: progress, lastPlayedAt: new Date().toISOString() };
    return persistSave(nextSave) ? nextSave : undefined;
  }, [game.save, persistSave]);

  const selectMarketDifficulty = useCallback((difficultyId: MarketDifficultyId) => {
    const difficulty = marketDifficulties.find((item) => item.id === difficultyId);
    if (!difficulty) return;
    const selection = getMarketDifficultySelection(game.save.marketProgress, difficulty);
    if (!selection.unlocked) {
      speak(`${difficulty.label}還沒開放喔。`, { tone: "soft", interrupt: true });
      return;
    }
    if (!persistMarketProgress(selection.progress)) return;
    resetMarketRound(selection.challengeIndex, difficultyId);
    speak(`${difficulty.label}開始。`, { tone: "neutral", interrupt: true });
  }, [game.save.marketProgress, marketDifficulties, persistMarketProgress, resetMarketRound, speak]);

  const finishMarketChallenge = useCallback(() => {
    if (!marketPuzzle || !challenge) return;
    const nextMarket = advanceMarketProgress(game.save.marketProgress, game.marketDifficulty, challenge.id, game.marketChallengeIndex, challenges.length);
    if (nextMarket.completedDifficulty) {
      game.setMarketCompletedDifficulties(nextMarket.progress.completedDifficulties);
      const nextSave: SaveData = { ...game.save, marketProgress: nextMarket.progress, lastPlayedAt: new Date().toISOString() };
      const label = activeDifficulty?.label ?? "這個難度";
      game.setMarketFeedback(`${label}完成，市場阿姨把零件交給小航！`);
      speak(`${label}完成，取得市場的零件了！`, { tone: "positive", interrupt: true });
      clearMarketTimers();
      completeStage(game.objects, nextSave);
      return;
    }
    if (!persistMarketProgress(nextMarket.progress)) return;
    resetMarketRound(nextMarket.nextChallengeIndex);
    speak("完成一位客人囉，下一位來了。", { tone: "positive", interrupt: true });
  }, [activeDifficulty?.label, challenge, challenges.length, clearMarketTimers, completeStage, game, marketPuzzle, persistMarketProgress, resetMarketRound, speak]);

  const selectMarketItem = useCallback((assetId: string) => {
    if (!challenge || game.screen !== "stage" || stage.mechanic !== "market" || game.marketPhase !== "pick") return;
    const requiredCount = marketRequiredCount(challenge, assetId);
    const selectedCount = game.marketBasket[assetId] ?? 0;
    if (requiredCount === 0) {
      game.setMarketFeedback("客人好像不是要這個喔。");
      game.setWrongClicks((value) => value + 1);
      speak("好像不是這個喔，再看看客人想買什麼。", { tone: "soft", interrupt: true });
      logEvent("wrong_click", stage.id, { clickedAssetId: assetId, mode: "market_pick" });
      return;
    }
    if (selectedCount >= requiredCount) {
      game.setMarketFeedback("這個已經放夠囉。");
      speak("這個已經夠了喔。", { tone: "soft", interrupt: true });
      return;
    }
    const nextBasket = { ...game.marketBasket, [assetId]: selectedCount + 1 };
    game.setMarketBasket(nextBasket);
    game.setMarketFeedback(`${assets[assetId].label}放進籃子了。`);
    if (!marketBasketMatches(challenge, nextBasket)) {
      speak("收到。", { tone: "positive", interrupt: true });
      return;
    }
    const nextPrompt = activeDifficulty?.questionMode === "number-recognition" ? "數一數，籃子裡有幾個商品？" : "算算看，這些商品總共幾貝？";
    game.setMarketPhase("total");
    game.setMarketSelectedTotal(null);
    game.setMarketFeedback(nextPrompt);
    speak(nextPrompt, { tone: "neutral", interrupt: true });
  }, [activeDifficulty?.questionMode, challenge, game, logEvent, speak, stage.id, stage.mechanic]);

  const answerMarket = useCallback((value: number) => {
    if (!challenge || game.screen !== "stage" || stage.mechanic !== "market" || game.marketPhase !== "total") return;
    game.setMarketSelectedTotal(value);
    if (value !== question) {
      const retryText = activeDifficulty?.questionMode === "number-recognition" ? "再數一次籃子裡的商品。" : "再看一次價格牌，重新算算看。";
      game.setMarketFeedback(retryText);
      game.setWrongClicks((count) => count + 1);
      logEvent("wrong_click", stage.id, { selectedTotal: value, correctTotal: question, mode: "market_total" });
      speak(`差一點點，${retryText}`, { tone: "soft", interrupt: true });
      return;
    }
    game.setMarketFeedback("算對了，結帳完成！");
    speak("算對了，結帳完成！", { tone: "positive", interrupt: true });
    if (marketFinishTimer.current !== null) window.clearTimeout(marketFinishTimer.current);
    marketFinishTimer.current = window.setTimeout(() => { marketFinishTimer.current = null; finishMarketChallenge(); }, 550);
  }, [activeDifficulty?.questionMode, challenge, finishMarketChallenge, game, logEvent, question, speak, stage.id, stage.mechanic]);

  const showMarketHint = useCallback((reason: "market" | "timer" = "market") => {
    if (!challenge || screen !== "stage" || stage.mechanic !== "market") return;
    if (marketHintTimer.current !== null) window.clearTimeout(marketHintTimer.current);
    setHintVisible(true);
    setHintsUsed((value) => value + 1);
    marketHintTimer.current = window.setTimeout(() => { setHintVisible(false); marketHintTimer.current = null; }, 1800);
    speak(`${voiceScripts.hintPrefix}${hintText}`, { tone: "neutral", interrupt: true });
    logEvent("hint_show", stage.id, { reason });
  }, [challenge, hintText, logEvent, screen, setHintVisible, setHintsUsed, speak, stage.id, stage.mechanic]);

  useEffect(() => {
    if (screen !== "stage" || stage.mechanic !== "market" || hintVisible || !challenge) return undefined;
    const timer = window.setTimeout(() => showMarketHint("timer"), stage.assist.hintDelayMs);
    return () => window.clearTimeout(timer);
  }, [challenge, hintVisible, screen, showMarketHint, stage.assist.hintDelayMs, stage.id, stage.mechanic]);

  return {
    clearMarketTimers,
    view: { puzzle: marketPuzzle, difficulties: marketDifficulties, activeDifficulty, challenge, question, answerChoices, hintText, difficulty: game.marketDifficulty, phase: game.marketPhase, basket: game.marketBasket, feedback: game.marketFeedback },
    actions: { selectMarketDifficulty, selectMarketItem, answerMarket, showMarketHint },
  };
}
