import { useCallback, useEffect, useMemo, useRef } from "react";
import { assets } from "../data/assets";
import { marketCustomerForRound } from "../data/marketCustomers";
import { voiceScripts } from "../data/voiceScripts";
import { stages } from "../data/stages";
import { advanceMarketProgress, completeStageSave, selectMarketDifficulty as getMarketDifficultySelection } from "../lib/gameFlow";
import { marketAnswerOptions, marketBasketMatches, marketCustomerReminder, marketCustomersPerShift, marketQuantityPrompt, marketQuestionValue, marketRequiredCount, marketSuccessDelayMs, randomizeMarketChallenge } from "../lib/market";
import { markMarketStorySeen } from "../lib/marketSession";
import type { GameEvent, MarketDifficultyId, MarketQuestionMode, SaveData } from "../types";
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

const marketQuestionCopy: Record<MarketQuestionMode, { prompt: string; hint: string; retry: string }> = {
  "number-recognition": {
    prompt: "數一數，籃子裡有幾個商品？",
    hint: "用手指一個一個數，看看籃子裡有幾個商品。",
    retry: "再用手指一個一個數一次。",
  },
  addition: {
    prompt: "看看兩件商品，把兩個價錢加起來。",
    hint: "先看第一個價錢，再接著加上第二個價錢。",
    retry: "再把兩個價錢慢慢加一次。",
  },
  "multi-addition": {
    prompt: "看看三件商品，把三個價錢加起來。",
    hint: "先算前兩個價錢，再加上第三個價錢。",
    retry: "先算兩個，再加上最後一個。",
  },
  challenge: {
    prompt: "魔王關來了，算算看這些商品總共幾貝。",
    hint: "相同商品可以先分組計算，再把不同商品加起來。",
    retry: "先算相同商品，再把每一組加起來。",
  },
};

export function useMarketFlow({ game, logEvent, speak, persistSave }: Props) {
  const marketHintTimer = useRef<number | null>(null);
  const marketFinishTimer = useRef<number | null>(null);
  const stage = stages[game.stageIndex];
  const marketPuzzle = stage.marketPuzzle;
  const marketDifficulties = useMemo(() => marketPuzzle?.difficulties ?? [], [marketPuzzle]);
  const activeDifficulty = marketDifficulties.find((item) => item.id === game.marketDifficulty);
  const challenges = useMemo(() => marketPuzzle?.challenges.filter((item) => item.difficulty === game.marketDifficulty) ?? [], [game.marketDifficulty, marketPuzzle]);
  const challengeTemplate = challenges.length > 0 ? challenges[game.marketChallengeIndex % challenges.length] : undefined;
  const challenge = useMemo(() => challengeTemplate ? randomizeMarketChallenge(challengeTemplate, game.marketRoundSeed) : undefined, [challengeTemplate, game.marketRoundSeed]);
  const customer = useMemo(() => marketCustomerForRound(game.marketDifficulty, game.marketChallengeIndex), [game.marketChallengeIndex, game.marketDifficulty]);
  const question = challenge && activeDifficulty ? marketQuestionValue(challenge, activeDifficulty.questionMode) : 0;
  const answerChoices = useMemo(() => marketAnswerOptions(question, challenge?.id ?? "market"), [challenge?.id, question]);
  const questionCopy = marketQuestionCopy[activeDifficulty?.questionMode ?? "number-recognition"];
  const hintText = challenge
    ? game.marketPhase === "pick"
      ? marketCustomerReminder(customer.name, challenge.requestText)
      : questionCopy.hint
    : stage.instructionText;
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

  const startMarketShift = useCallback(() => {
    markMarketStorySeen();
    resetMarketRound(game.save.marketProgress.nextChallengeByDifficulty[game.marketDifficulty] ?? 0);
    speak("兔子老闆娘放心出門了。客人來了，開始幫忙吧！", { tone: "positive", interrupt: true });
  }, [game.marketDifficulty, game.save.marketProgress.nextChallengeByDifficulty, resetMarketRound, speak]);

  const selectMarketDifficulty = useCallback((difficultyId: MarketDifficultyId) => {
    const difficulty = marketDifficulties.find((item) => item.id === difficultyId);
    if (!difficulty) return;
    if (game.marketPhase !== "pick") {
      speak("先完成這一題，再換關卡喔。", { tone: "soft", interrupt: true });
      return;
    }
    const selection = getMarketDifficultySelection(game.save.marketProgress, difficulty);
    if (!selection.unlocked) {
      speak(`${difficulty.label}還沒開放喔。`, { tone: "soft", interrupt: true });
      return;
    }
    if (!persistMarketProgress(selection.progress)) return;
    resetMarketRound(selection.challengeIndex, difficultyId);
    speak(`${difficulty.label}開始。`, { tone: "neutral", interrupt: true });
  }, [game.marketPhase, game.save.marketProgress, marketDifficulties, persistMarketProgress, resetMarketRound, speak]);

  const finishMarketChallenge = useCallback(() => {
    if (!marketPuzzle || !challenge) return;
    const nextMarket = advanceMarketProgress(game.save.marketProgress, game.marketDifficulty, challenge.id, game.marketChallengeIndex, marketCustomersPerShift);
    if (nextMarket.completedDifficulty) {
      game.setMarketCompletedDifficulties(nextMarket.progress.completedDifficulties);
      const completionWasNew = !game.save.completedStageIds.includes(stage.id);
      const nextSave = completeStageSave(
        { ...game.save, marketProgress: nextMarket.progress },
        stage.id,
        stage.reward,
        new Date().toISOString(),
      );
      const label = activeDifficulty?.label ?? "這個難度";
      if (!persistSave(nextSave)) return;
      clearMarketTimers();
      game.setMarketChallengeIndex(nextMarket.nextChallengeIndex);
      game.setMarketBasket({});
      game.setMarketSelectedTotal(null);
      game.setMarketPhase("complete");
      game.setLastCompletionWasNew(completionWasNew);
      game.setMarketFeedback(completionWasNew ? `${label}完成！兔子老闆娘要把零件送給你。` : `${label}再次完成，客人們都順利結帳了！`);
      speak(completionWasNew ? "謝謝小航幫忙顧攤位！這個飛機零件送給你！" : "謝謝小航！客人們都順利結帳了！", { tone: "positive", interrupt: true });
      logEvent("stage_finish", stage.id, { wrongClicks: game.wrongClicks, hintsUsed: game.hintsUsed, difficulty: game.marketDifficulty });
      if (completionWasNew) logEvent("reward_claimed", stage.id, stage.reward);
      return;
    }
    if (!persistMarketProgress(nextMarket.progress)) return;
    resetMarketRound(nextMarket.nextChallengeIndex);
    speak("完成一位客人囉，下一位來了。", { tone: "positive", interrupt: true });
  }, [activeDifficulty?.label, challenge, clearMarketTimers, game, logEvent, marketPuzzle, persistMarketProgress, persistSave, resetMarketRound, speak, stage.id, stage.reward]);

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
    const questionMode = activeDifficulty?.questionMode ?? "number-recognition";
    const nextPrompt = questionMode === "number-recognition" ? marketQuantityPrompt(challenge) : marketQuestionCopy[questionMode].prompt;
    game.setMarketPhase("total");
    game.setMarketSelectedTotal(null);
    game.setMarketFeedback("");
    speak(nextPrompt, { tone: "neutral", interrupt: true });
  }, [activeDifficulty?.questionMode, challenge, game, logEvent, speak, stage.id, stage.mechanic]);

  const answerMarket = useCallback((value: number) => {
    if (!challenge || game.screen !== "stage" || stage.mechanic !== "market" || game.marketPhase !== "total") return;
    if (marketFinishTimer.current !== null) return;
    game.setMarketSelectedTotal(value);
    if (value !== question) {
      const retryText = marketQuestionCopy[activeDifficulty?.questionMode ?? "number-recognition"].retry;
      game.setMarketFeedback(retryText);
      game.setWrongClicks((count) => count + 1);
      logEvent("wrong_click", stage.id, { selectedTotal: value, correctTotal: question, mode: "market_total" });
      speak(`差一點點，${retryText}`, { tone: "soft", interrupt: true });
      return;
    }
    const successText = activeDifficulty?.questionMode === "number-recognition"
      ? `謝謝小航！一共有 ${question} 個，你數對了！`
      : `謝謝小航！一共 ${question} 貝，你算對了！`;
    game.setMarketFeedback(successText);
    speak(successText, { tone: "positive", interrupt: true });
    if (marketFinishTimer.current !== null) window.clearTimeout(marketFinishTimer.current);
    marketFinishTimer.current = window.setTimeout(() => { marketFinishTimer.current = null; finishMarketChallenge(); }, marketSuccessDelayMs);
  }, [activeDifficulty?.questionMode, challenge, finishMarketChallenge, game, logEvent, question, speak, stage.id, stage.mechanic]);

  const showMarketHint = useCallback((reason: "market" | "timer" = "market") => {
    if (!challenge || screen !== "stage" || stage.mechanic !== "market" || (game.marketPhase !== "pick" && game.marketPhase !== "total")) return;
    if (marketHintTimer.current !== null) window.clearTimeout(marketHintTimer.current);
    setHintVisible(true);
    setHintsUsed((value) => value + 1);
    marketHintTimer.current = window.setTimeout(() => { setHintVisible(false); marketHintTimer.current = null; }, 1800);
    const hintPrefix = game.marketPhase === "pick" ? "小航提醒你，" : voiceScripts.hintPrefix;
    speak(`${hintPrefix}${hintText}`, { tone: "neutral", interrupt: true });
    logEvent("hint_show", stage.id, { reason });
  }, [challenge, game.marketPhase, hintText, logEvent, screen, setHintVisible, setHintsUsed, speak, stage.id, stage.mechanic]);

  useEffect(() => {
    if (screen !== "stage" || stage.mechanic !== "market" || (game.marketPhase !== "pick" && game.marketPhase !== "total") || hintVisible || !challenge) return undefined;
    const timer = window.setTimeout(() => showMarketHint("timer"), stage.assist.hintDelayMs);
    return () => window.clearTimeout(timer);
  }, [challenge, game.marketPhase, hintVisible, screen, showMarketHint, stage.assist.hintDelayMs, stage.id, stage.mechanic]);

  return {
    clearMarketTimers,
    view: {
      puzzle: marketPuzzle,
      difficulties: marketDifficulties,
      activeDifficulty,
      challenge,
      customer,
      question,
      answerChoices,
      hintText,
      difficulty: game.marketDifficulty,
      phase: game.marketPhase,
      basket: game.marketBasket,
      feedback: game.marketFeedback,
      customerNumber: game.marketChallengeIndex + 1,
      customerTarget: marketCustomersPerShift,
    },
    actions: { startMarketShift, selectMarketDifficulty, selectMarketItem, answerMarket, showMarketHint },
  };
}
