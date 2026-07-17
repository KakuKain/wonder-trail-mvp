import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { assets } from "./data/assets";
import { assetImages } from "./data/assetImages";
import { forestBackgrounds } from "./data/backgrounds";
import { dialogue } from "./data/dialogue";
import { stages } from "./data/stages";
import { xiaohangVoicePreference } from "./data/voice";
import { pickScript, voiceScripts } from "./data/voiceScripts";
import { appendEvent, loadEvents, loadSave, resetSave, writeSave } from "./lib/storage";
import { createPlacedObjects } from "./lib/stagePlacement";
import { VoiceQueue } from "./lib/voiceEngine";
import type {
  AssetDefinition,
  GameEvent,
  MarketChallengeConfig,
  MarketDifficultyConfig,
  MarketDifficultyId,
  MarketQuestionMode,
  PlacedObject,
  RubySegment,
  SaveData,
  StageConfig,
} from "./types";
import classroomHotspot from "./assets/maps/hotspots/classroom.webp";
import forestShrineHotspot from "./assets/maps/hotspots/forest-shrine.webp";
import marketHotspot from "./assets/maps/hotspots/market.webp";
import planeHotspot from "./assets/maps/hotspots/plane.webp";
import schoolHotspot from "./assets/maps/hotspots/school.webp";
import homeSeaMap from "./assets/maps/parts-island-square-ocean-v2.webp";
import marketBasketArt from "./assets/market/market-basket-v1.webp";
import marketPriceTagArt from "./assets/market/market-price-tag-v1.png";
import marketSignArt from "./assets/market/market-sign-v1.webp";
import marketStallBackground from "./assets/market/market-stall-empty-wide-v6.webp";
import collectionRewardClean from "./assets/reward/collection-reward-clean.webp";
import planePartReward from "./assets/reward/plane-part.webp";
import xiaohangFox from "./assets/xiaohang-fox.webp";

type Screen = "intro" | "stage" | "reward" | "complete";
type MarketPhase = "pick" | "total";

const sessionId = `session-${Date.now()}`;
const marketItemPrices: Record<string, number> = {
  apple: 2,
  pine_cone: 2,
  pink_flower: 3,
  mushroom: 3,
  acorn: 3,
};
const marketShelfItemIds = ["apple", "pine_cone", "pink_flower", "mushroom", "acorn"];
const marketShelfPositions: Record<string, { x: number; y: number; rotation: number }> = {
  apple: { x: 24, y: 57.6, rotation: -3 },
  pine_cone: { x: 50, y: 57.6, rotation: 2 },
  pink_flower: { x: 76, y: 57.6, rotation: -1 },
  mushroom: { x: 36.5, y: 68.7, rotation: 3 },
  acorn: { x: 63.5, y: 68.7, rotation: -2 },
};
const chapters = [
  {
    id: "search",
    part: "A",
    place: "森林",
    mechanic: "找東西",
    story: "祭壇想請小航幫忙找出藏起來的東西。",
    className: "forest-node",
    image: forestShrineHotspot,
    position: { x: 40.8, y: 32.1, width: 17.2 },
    playable: true,
  },
  {
    id: "math",
    part: "B",
    place: "市場",
    mechanic: "算數學",
    story: "市場阿姨想請小航幫忙算錢找客人。",
    className: "market-node",
    image: marketHotspot,
    position: { x: 60.4, y: 31.3, width: 16.8 },
    playable: true,
  },
  {
    id: "zhuyin",
    part: "C",
    place: "學校",
    mechanic: "拼注音",
    story: "老師想請小航幫忙確認詞語的注音。",
    className: "school-node",
    image: schoolHotspot,
    position: { x: 37.0, y: 55.4, width: 18.2 },
    playable: false,
  },
  {
    id: "matching",
    part: "D",
    place: "教室",
    mechanic: "圖片配對",
    story: "學生們邀請小航一起玩 5 乘 6 圖片配對比賽。",
    className: "classroom-node",
    image: classroomHotspot,
    position: { x: 61.8, y: 56.8, width: 18.6 },
    playable: false,
  },
] as const;

function createEvent(
  event: GameEvent["event"],
  stageId?: string,
  payload?: Record<string, unknown>
): GameEvent {
  return {
    event,
    sessionId,
    stageId,
    timestamp: Date.now(),
    payload,
  };
}

function nextStageIndex(save: SaveData) {
  const index = stages.findIndex((stage) => !save.completedStageIds.includes(stage.id));
  return index === -1 ? stages.length - 1 : index;
}

function firstStageIndexForWorld(world: StageConfig["world"], save: SaveData) {
  const index = stages.findIndex((stage) => stage.world === world && !save.completedStageIds.includes(stage.id));
  if (index !== -1) return index;
  return Math.max(0, stages.findIndex((stage) => stage.world === world));
}

function marketTotal(challenge: MarketChallengeConfig) {
  return challenge.order.reduce(
    (sum, item) => sum + marketPrice(challenge, item.assetId) * item.count,
    0
  );
}

function marketQuestionValue(challenge: MarketChallengeConfig, mode: MarketQuestionMode) {
  if (mode === "number-recognition") {
    return challenge.order.reduce((sum, item) => sum + item.count, 0);
  }
  return marketTotal(challenge);
}

function marketPrice(challenge: MarketChallengeConfig, assetId: string) {
  return challenge.prices[assetId] ?? marketItemPrices[assetId] ?? 0;
}

function marketBasketMatches(challenge: MarketChallengeConfig, basket: Record<string, number>) {
  return challenge.order.every((item) => (basket[item.assetId] ?? 0) === item.count);
}

function marketRequiredCount(challenge: MarketChallengeConfig, assetId: string) {
  return challenge.order.find((item) => item.assetId === assetId)?.count ?? 0;
}

function marketAnswerOptions(total: number, challengeId: string) {
  const candidates = Array.from(
    new Set([total - 1, total, total + 1, total + 2].filter((value) => value > 0))
  ).slice(0, 3);
  let seed = Array.from(challengeId).reduce(
    (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0,
    2166136261
  );

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }

  return candidates;
}

function isMarketDifficultyUnlocked(
  difficulty: MarketDifficultyConfig,
  completedDifficulties: MarketDifficultyId[]
) {
  return !difficulty.unlockAfter || completedDifficulties.includes(difficulty.unlockAfter);
}

function marketCalculationLines(challenge: MarketChallengeConfig) {
  return challenge.order.flatMap((item) =>
    Array.from({ length: item.count }, (_, index) => ({
      key: `${item.assetId}-${index}`,
      assetId: item.assetId,
      price: marketPrice(challenge, item.assetId),
    }))
  );
}

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>("intro");
  const [stageIndex, setStageIndex] = useState(() => nextStageIndex(loadSave()));
  const [objects, setObjects] = useState<PlacedObject[]>(() =>
    createPlacedObjects(stages[nextStageIndex(loadSave())])
  );
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
  const [stageBackgroundIndex, setStageBackgroundIndex] = useState(() =>
    Math.floor(Math.random() * forestBackgrounds.length)
  );
  const [marketDifficulty, setMarketDifficulty] = useState<MarketDifficultyId>(
    save.marketProgress.activeDifficulty
  );
  const [marketCompletedDifficulties, setMarketCompletedDifficulties] = useState<MarketDifficultyId[]>(
    save.marketProgress.completedDifficulties
  );
  const [marketChallengeIndex, setMarketChallengeIndex] = useState(
    save.marketProgress.nextChallengeByDifficulty[save.marketProgress.activeDifficulty] ?? 0
  );
  const [marketPhase, setMarketPhase] = useState<MarketPhase>("pick");
  const [marketBasket, setMarketBasket] = useState<Record<string, number>>({});
  const [marketSelectedTotal, setMarketSelectedTotal] = useState<number | null>(null);
  const [marketFeedback, setMarketFeedback] = useState("");
  const stageStartedAt = useRef(Date.now());
  const marketHintTimer = useRef<number | null>(null);
  const voiceQueue = useRef(new VoiceQueue());

  const stage = stages[stageIndex];
  const stageBackground = forestBackgrounds[stageBackgroundIndex % forestBackgrounds.length];
  const foundTargets = objects.filter((object) => object.isTarget && object.found).length;
  const totalTargets = objects.filter((object) => object.isTarget).length;
  const completedStageCount = stages.filter((candidate) =>
    save.completedStageIds.includes(candidate.id)
  ).length;
  const progress = Math.round((completedStageCount / stages.length) * 100);
  const forestPartAcquired = stages
    .filter((candidate) => candidate.world === "forest")
    .every((candidate) => save.completedStageIds.includes(candidate.id));
  const marketPartAcquired = save.completedStageIds.some((stageId) =>
    stages.some((candidate) => candidate.id === stageId && candidate.world === "market")
  ) || save.marketProgress.completedDifficulties.includes("advanced");
  const hasProgress = save.completedStageIds.length > 0
    || save.marketProgress.completedChallengeIds.length > 0;

  const stickerAssets = useMemo(
    () => save.stickers.map((stickerId) => assets[stickerId]).filter(Boolean),
    [save.stickers]
  );
  const collectionPages = useMemo<AssetDefinition[][]>(() => {
    const pages: AssetDefinition[][] = [];
    for (let index = 0; index < stickerAssets.length; index += 4) {
      pages.push(stickerAssets.slice(index, index + 4));
    }
    return pages.length ? pages : [[]];
  }, [stickerAssets]);
  const currentCollectionPage = Math.min(collectionPage, collectionPages.length - 1);
  const debugEnabled = useMemo(() => new URLSearchParams(window.location.search).has("debug"), []);
  const playtestSummary = useMemo(() => summarizeEvents(events), [events]);
  const selectedVoice = useMemo(
    () => pickXiaohangVoice(voices),
    [voices]
  );
  const marketPuzzle = stage.marketPuzzle;
  const marketDifficulties = marketPuzzle?.difficulties ?? [];
  const marketDifficultyChallenges = useMemo(
    () => marketPuzzle?.challenges.filter((challenge) => challenge.difficulty === marketDifficulty) ?? [],
    [marketDifficulty, marketPuzzle]
  );
  const activeMarketDifficulty = marketDifficulties.find(
    (difficulty) => difficulty.id === marketDifficulty
  );
  const marketChallenge = marketDifficultyChallenges[marketChallengeIndex];
  const currentMarketQuestionValue = marketChallenge && activeMarketDifficulty
    ? marketQuestionValue(marketChallenge, activeMarketDifficulty.questionMode)
    : 0;
  const currentMarketAnswerOptions = useMemo(
    () => marketAnswerOptions(currentMarketQuestionValue, marketChallenge?.id ?? "market"),
    [currentMarketQuestionValue, marketChallenge?.id]
  );
  const currentHintText = useMemo(() => {
    if (stage.mechanic === "market" && marketChallenge) {
      if (marketPhase === "pick") return marketChallenge.requestText;
      if (activeMarketDifficulty?.questionMode === "number-recognition") {
        return "數一數，籃子裡有幾個商品。";
      }
      return "看價格牌，把商品價錢加起來。";
    }

    return stage.instructionText;
  }, [
    marketChallenge,
    marketPhase,
    activeMarketDifficulty?.questionMode,
    stage.instructionText,
    stage.mechanic,
  ]);

  function speak(text: string) {
    voiceQueue.current.speak(text, { tone: "neutral", interrupt: true });
  }

  function guideStage(nextStage: StageConfig) {
    voiceQueue.current.speak(nextStage.instructionText, {
      tone: "neutral",
      delayMs: 500,
    });
  }

  function logEvent(event: GameEvent["event"], stageId?: string, payload?: Record<string, unknown>) {
    const nextEvent = createEvent(event, stageId, payload);
    appendEvent(nextEvent);
    setEvents(loadEvents());
  }

  function beginStage(index = stageIndex) {
    const nextStage = stages[index];
    const savedMarketProgress = save.marketProgress;
    const savedMarketDifficulty = nextStage.marketPuzzle?.difficulties.find(
      (difficulty) => difficulty.id === savedMarketProgress.activeDifficulty
        && isMarketDifficultyUnlocked(difficulty, savedMarketProgress.completedDifficulties)
    )?.id ?? nextStage.marketPuzzle?.difficulties[0]?.id ?? "beginner";
    const savedMarketChallenges = nextStage.marketPuzzle?.challenges.filter(
      (challenge) => challenge.difficulty === savedMarketDifficulty
    ) ?? [];
    const savedMarketChallengeIndex = Math.min(
      savedMarketProgress.nextChallengeByDifficulty[savedMarketDifficulty] ?? 0,
      Math.max(0, savedMarketChallenges.length - 1)
    );

    setStageIndex(index);
    setStageBackgroundReady(nextStage.mechanic !== "search");
    setObjects(createPlacedObjects(nextStage));
    setWrongClicks(0);
    setHintsUsed(0);
    setHintVisible(false);
    setReward(null);
    setMarketDifficulty(savedMarketDifficulty);
    setMarketCompletedDifficulties(savedMarketProgress.completedDifficulties);
    setMarketChallengeIndex(savedMarketChallengeIndex);
    setMarketPhase("pick");
    setMarketBasket({});
    setMarketSelectedTotal(null);
    setMarketFeedback("");
    setScreen("stage");
    stageStartedAt.current = Date.now();
    logEvent("stage_start", nextStage.id, { difficulty: nextStage.difficulty });
    guideStage(nextStage);
  }

  function beginForestFromDesk() {
    beginStage(firstStageIndexForWorld("forest", save));
  }

  function beginMarketFromDesk() {
    beginStage(firstStageIndexForWorld("market", save));
  }

  function completeStage(nextObjects: PlacedObject[], sourceSave = save) {
    const durationMs = Date.now() - stageStartedAt.current;
    const nextReward = stage.reward;
    const wasAlreadyCompleted = sourceSave.completedStageIds.includes(stage.id);
    const completedStageIds = wasAlreadyCompleted
      ? sourceSave.completedStageIds
      : [...sourceSave.completedStageIds, stage.id];
    const stickers = Array.from(new Set([...sourceSave.stickers, ...nextReward.stickers]));
    const nextSave: SaveData = {
      ...sourceSave,
      completedStageIds,
      stickers,
      stars: sourceSave.stars + (wasAlreadyCompleted ? 0 : nextReward.stars),
      lastPlayedAt: new Date().toISOString(),
    };

    setObjects(nextObjects);
    setSave(nextSave);
    writeSave(nextSave);
    setReward(nextReward);
    setScreen("reward");
    if (stage.mechanic === "search" && forestBackgrounds.length > 1) {
      setStageBackgroundIndex((currentIndex) => {
        const offset = 1 + Math.floor(Math.random() * (forestBackgrounds.length - 1));
        return (currentIndex + offset) % forestBackgrounds.length;
      });
    }
    voiceQueue.current.speak(pickScript(voiceScripts.reward, stageIndex), {
      tone: "positive",
      interrupt: true,
    });
    voiceQueue.current.speak(stage.mechanic === "market"
      ? "小航取得了市場的零件。"
      : "小航把寶物收進森林書。", {
      tone: "neutral",
      delayMs: 500,
    });
    logEvent("stage_finish", stage.id, {
      durationMs,
      wrongClicks,
      hintsUsed,
      difficulty: stage.difficulty,
    });
    logEvent("reward_claimed", stage.id, nextReward);
  }

  function handleObjectClick(object: PlacedObject) {
    if (screen !== "stage" || !stageBackgroundReady || object.found) return;

    if (object.isTarget) {
      const nextObjects = objects.map((item) =>
        item.instanceId === object.instanceId ? { ...item, found: true } : item
      );
      const remaining = nextObjects.filter((item) => item.isTarget && !item.found).length;

      if (remaining === 0) {
        completeStage(nextObjects);
      } else {
        setObjects(nextObjects);
        voiceQueue.current.speak(pickScript(voiceScripts.partialSuccess, foundTargets), {
          tone: "positive",
          interrupt: true,
        });
      }
      return;
    }

    const nextWrongClicks = wrongClicks + 1;
    setWrongClicks(nextWrongClicks);
    logEvent("wrong_click", stage.id, {
      clickedAssetId: object.assetId,
      targetAssetIds: (stage.targets ?? []).map((target) => target.assetId),
    });
    voiceQueue.current.speak(pickScript(voiceScripts.wrongClick, nextWrongClicks), {
      tone: "soft",
      interrupt: true,
    });

    if (nextWrongClicks >= stage.assist.maxWrongClicksBeforeHint && !hintVisible) {
      showHint();
    }
  }

  function resetMarketRound(nextIndex: number, nextDifficulty = marketDifficulty) {
    if (marketHintTimer.current !== null) {
      window.clearTimeout(marketHintTimer.current);
      marketHintTimer.current = null;
    }
    setMarketDifficulty(nextDifficulty);
    setMarketChallengeIndex(nextIndex);
    setMarketPhase("pick");
    setMarketBasket({});
    setMarketSelectedTotal(null);
    setMarketFeedback("");
    setHintVisible(false);
  }

  function persistMarketProgress(progressState: SaveData["marketProgress"]) {
    const nextSave: SaveData = {
      ...save,
      marketProgress: progressState,
      lastPlayedAt: new Date().toISOString(),
    };

    setSave(nextSave);
    writeSave(nextSave);
    return nextSave;
  }

  function handleMarketDifficultySelect(nextDifficulty: MarketDifficultyId) {
    const difficulty = marketDifficulties.find((item) => item.id === nextDifficulty);
    if (!difficulty) return;

    if (!isMarketDifficultyUnlocked(difficulty, marketCompletedDifficulties)) {
      voiceQueue.current.speak(`${difficulty.label}還沒開放喔。`, {
        tone: "soft",
        interrupt: true,
      });
      return;
    }

    const nextIndex = save.marketProgress.nextChallengeByDifficulty[nextDifficulty] ?? 0;
    const nextProgress = {
      ...save.marketProgress,
      activeDifficulty: nextDifficulty,
    };

    persistMarketProgress(nextProgress);
    resetMarketRound(nextIndex, nextDifficulty);
    voiceQueue.current.speak(`${difficulty.label}開始。`, {
      tone: "neutral",
      interrupt: true,
    });
  }

  function finishMarketChallenge() {
    if (!marketPuzzle || !marketChallenge) return;

    const completedChallengeIds = Array.from(new Set([
      ...save.marketProgress.completedChallengeIds,
      marketChallenge.id,
    ]));
    const nextChallengeByDifficulty = {
      ...save.marketProgress.nextChallengeByDifficulty,
    };

    if (marketChallengeIndex >= marketDifficultyChallenges.length - 1) {
      const nextCompletedDifficulties = Array.from(
        new Set([...save.marketProgress.completedDifficulties, marketDifficulty])
      );
      nextChallengeByDifficulty[marketDifficulty] = 0;

      setMarketCompletedDifficulties(nextCompletedDifficulties);
      const nextProgress = {
        completedChallengeIds,
        completedDifficulties: nextCompletedDifficulties,
        activeDifficulty: marketDifficulty,
        nextChallengeByDifficulty,
      };
      const nextSave = {
        ...save,
        marketProgress: nextProgress,
        lastPlayedAt: new Date().toISOString(),
      };
      const difficultyLabel = activeMarketDifficulty?.label ?? "這個難度";

      setMarketFeedback(`${difficultyLabel}完成，市場阿姨把零件交給小航！`);
      voiceQueue.current.speak(`${difficultyLabel}完成，取得市場的零件了！`, {
        tone: "positive",
        interrupt: true,
      });
      completeStage(objects, nextSave);
      return;
    }

    const nextIndex = marketChallengeIndex + 1;
    nextChallengeByDifficulty[marketDifficulty] = nextIndex;
    persistMarketProgress({
      completedChallengeIds,
      completedDifficulties: save.marketProgress.completedDifficulties,
      activeDifficulty: marketDifficulty,
      nextChallengeByDifficulty,
    });
    resetMarketRound(nextIndex);
    voiceQueue.current.speak("完成一位客人囉，下一位來了。", {
      tone: "positive",
      interrupt: true,
    });
  }

  function handleMarketItemClick(assetId: string) {
    if (!marketChallenge || marketPhase !== "pick") return;

    const requiredCount = marketRequiredCount(marketChallenge, assetId);
    const selectedCount = marketBasket[assetId] ?? 0;

    if (requiredCount === 0) {
      setMarketFeedback("客人好像不是要這個喔。");
      setWrongClicks((value) => value + 1);
      voiceQueue.current.speak("好像不是這個喔，再看看客人想買什麼。", {
        tone: "soft",
        interrupt: true,
      });
      logEvent("wrong_click", stage.id, { clickedAssetId: assetId, mode: "market_pick" });
      return;
    }

    if (selectedCount >= requiredCount) {
      setMarketFeedback("這個已經放夠囉。");
      voiceQueue.current.speak("這個已經夠了喔。", {
        tone: "soft",
        interrupt: true,
      });
      return;
    }

    const nextBasket = {
      ...marketBasket,
      [assetId]: selectedCount + 1,
    };
    setMarketBasket(nextBasket);
    setMarketFeedback(`${assets[assetId].label}放進籃子了。`);

    if (!marketBasketMatches(marketChallenge, nextBasket)) {
      voiceQueue.current.speak("收到。", { tone: "positive", interrupt: true });
      return;
    }

    setMarketPhase("total");
    setMarketSelectedTotal(null);
    const isNumberRecognition = activeMarketDifficulty?.questionMode === "number-recognition";
    const nextPrompt = isNumberRecognition
      ? "數一數，籃子裡有幾個商品？"
      : "算算看，這些商品總共幾貝？";
    setMarketFeedback(nextPrompt);
    voiceQueue.current.speak(nextPrompt, {
      tone: "neutral",
      interrupt: true,
    });
  }

  function handleMarketTotalAnswer(value: number) {
    if (!marketChallenge || marketPhase !== "total") return;

    setMarketSelectedTotal(value);

    if (value !== currentMarketQuestionValue) {
      const isNumberRecognition = activeMarketDifficulty?.questionMode === "number-recognition";
      const retryText = isNumberRecognition
        ? "再數一次籃子裡的商品。"
        : "再看一次價格牌，重新算算看。";
      setMarketFeedback(retryText);
      setWrongClicks((count) => count + 1);
      logEvent("wrong_click", stage.id, {
        selectedTotal: value,
        correctTotal: currentMarketQuestionValue,
        mode: "market_total",
      });
      voiceQueue.current.speak(`差一點點，${retryText}`, {
        tone: "soft",
        interrupt: true,
      });
      return;
    }

    setMarketFeedback("算對了，結帳完成！");
    voiceQueue.current.speak("算對了，結帳完成！", {
      tone: "positive",
      interrupt: true,
    });
    window.setTimeout(finishMarketChallenge, 550);
  }

  function showHint() {
    if (stage.mechanic === "market" && marketChallenge) {
      if (marketHintTimer.current !== null) {
        window.clearTimeout(marketHintTimer.current);
      }
      setHintVisible(true);
      marketHintTimer.current = window.setTimeout(() => {
        setHintVisible(false);
        marketHintTimer.current = null;
      }, 1800);
      setHintsUsed((value) => value + 1);
      voiceQueue.current.speak(`${voiceScripts.hintPrefix}${currentHintText}`, {
        tone: "neutral",
        interrupt: true,
      });
      logEvent("hint_show", stage.id, { reason: "market" });
      return;
    }

        setHintVisible(true);
        setHintsUsed((value) => value + 1);
        voiceQueue.current.speak(`${voiceScripts.hintPrefix}${currentHintText}`, {
          tone: "neutral",
          interrupt: true,
        });
    logEvent("hint_show", stage.id, { reason: "assist" });
  }

  function continueAdventure() {
    const nextIndex = stageIndex + 1;
    const nextStage = stages[nextIndex];

    if (stage.world === "forest" && nextStage?.world !== "forest") {
      setScreen("complete");
      voiceQueue.current.speak("森林的任務完成，取得飛機零件 A！", {
        tone: "positive",
        interrupt: true,
      });
      logEvent("chapter_complete", stage.id, {
        world: stage.world,
        part: "A",
      });
      return;
    }

    if (nextIndex >= stages.length) {
      setScreen("complete");
      logEvent("session_end", undefined, {
        completedStages: save.completedStageIds.length,
        stars: save.stars,
      });
      return;
    }
    beginStage(nextIndex);
  }

  function resetAllProgress() {
    voiceQueue.current.cancel();
    resetSave();
    const freshSave = loadSave();
    setSave(freshSave);
    setEvents(loadEvents());
    setStageIndex(0);
    setObjects(createPlacedObjects(stages[0]));
    setWrongClicks(0);
    setHintsUsed(0);
    setHintVisible(false);
    setReward(null);
    setMarketDifficulty(freshSave.marketProgress.activeDifficulty);
    setMarketCompletedDifficulties(freshSave.marketProgress.completedDifficulties);
    setMarketChallengeIndex(0);
    setMarketPhase("pick");
    setMarketBasket({});
    setMarketSelectedTotal(null);
    setMarketFeedback("");
    setScreen("intro");
    logEvent("progress_reset");
  }

  function returnToDesk() {
    voiceQueue.current.cancel();
    if (screen === "stage") {
      logEvent("stage_exit", stage.id, {
        durationMs: Date.now() - stageStartedAt.current,
        foundTargets,
        totalTargets,
      });
    }
    setHintVisible(false);
    setScreen("intro");
  }

  useEffect(() => {
    logEvent("session_start", undefined, { totalStages: stages.length });

    const onBeforeUnload = () => {
      appendEvent(
        createEvent("session_end", undefined, {
          completedStages: loadSave().completedStageIds.length,
        })
      );
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    voiceQueue.current.setVoice(selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    const canPreload = screen === "reward" || (screen === "intro" && homeMapReady);
    if (!canPreload) return undefined;

    const image = new Image();
    image.decoding = "async";
    image.src = stageBackground.image;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [homeMapReady, screen, stageBackground.image]);

  useEffect(() => {
    if (screen !== "stage") return undefined;

    const timer = window.setTimeout(() => {
      if (!hintVisible) {
        setHintVisible(true);
        setHintsUsed((value) => value + 1);
        voiceQueue.current.speak(`${voiceScripts.hintPrefix}${currentHintText}`, {
          tone: "neutral",
          delayMs: 500,
        });
        logEvent("hint_show", stage.id, { reason: "timer" });
      }
    }, stage.assist.hintDelayMs);

    return () => window.clearTimeout(timer);
  }, [screen, stage.id, stage.assist.hintDelayMs, currentHintText, hintVisible]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  return (
    <main className={`app-shell screen-${screen}`}>
      <section className="topbar" aria-label="遊戲狀態">
        <div>
          <p className="eyebrow">Wonder Trail</p>
          <h1>
            <RubyText segments={dialogue.title} />
          </h1>
        </div>
      </section>

      <section className="progress-wrap" aria-label="今日進度">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>{completedStageCount}/{stages.length}</span>
      </section>

      {screen === "intro" && (
        <section className="chapter-select-screen">
          <div className="chapter-select-copy">
            <div className="island-map" aria-label="零件島地圖">
              {hasProgress && (
                <button
                  className="map-replay-button"
                  type="button"
                  onClick={resetAllProgress}
                  aria-label="重設全部進度"
                  title="重設全部進度"
                >
                  <ReplayIcon />
                </button>
              )}
              <div className="map-scene-frame">
                <img
                  className="island-map-art"
                  src={homeSeaMap}
                  alt=""
                  aria-hidden="true"
                  decoding="async"
                  fetchPriority="high"
                  onLoad={() => setHomeMapReady(true)}
                  onError={() => setHomeMapReady(true)}
                />
                <div className="island-core">
                  <img className="map-plane-hotspot" src={planeHotspot} alt="" aria-hidden="true" />
                {chapters.map((chapter) => {
                  const partAcquired = chapter.id === "search"
                    ? forestPartAcquired
                    : chapter.id === "math" && marketPartAcquired;

                  return (
                    <button
                      className={`map-node ${chapter.className} ${chapter.playable ? "map-node-playable" : "map-node-locked"} ${partAcquired ? "map-node-completed" : ""}`}
                      key={chapter.id}
                      type="button"
                      style={{
                        "--map-x": `${chapter.position.x}%`,
                        "--map-y": `${chapter.position.y}%`,
                        "--map-width": `${chapter.position.width}%`,
                      } as CSSProperties}
                      aria-label={`${chapter.place}，零件 ${chapter.part}${partAcquired ? "，已取得" : ""}，${chapter.mechanic}。${chapter.story}`}
                      onClick={() => {
                        if (chapter.id === "search") {
                          beginForestFromDesk();
                          return;
                        }
                        if (chapter.id === "math" && chapter.playable) {
                          beginMarketFromDesk();
                          return;
                        }
                        if (chapter.playable) return;
                        speak(`${chapter.place}會在下一版開放。`);
                      }}
                    >
                      <img className="map-hotspot-image" src={chapter.image} alt="" aria-hidden="true" />
                      <span className="part-badge">{chapter.part}</span>
                      {partAcquired && <span className="part-status-badge" aria-hidden="true">✓ 已取得</span>}
                      {!chapter.playable && <span className="lock-badge" aria-hidden="true"><LockIcon /></span>}
                      <span className="map-node-label">
                        <strong>{chapter.place}</strong>
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>
              <div className="map-story-card">
                <div className="map-guide-character" aria-hidden="true">
                  <img src={xiaohangFox} alt="" />
                </div>
                <div className="map-story-copy">
                  <HeadingWithAudio
                    segments={dialogue.chapterSelectHeadline}
                    speakText="飛機壞掉了！先去森林找零件。"
                    onSpeak={speak}
                  />
                  <p>
                    <RubyText segments={dialogue.chapterSelectBody} />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "stage" && (
        <section className={`stage-layout ${stage.mechanic === "market" ? "market-stage-layout" : ""}`}>
          {stage.mechanic !== "market" && (
            <aside className="story-panel">
              <div className="stage-guide-character" aria-hidden="true">
                <img src={xiaohangFox} alt="" />
              </div>
              <div className="story-panel-surface" aria-hidden="true" />
              <p><RubyText segments={stage.storyRuby} /></p>
              <HeadingWithAudio
                segments={stage.instructionRuby}
                speakText={stage.instructionText}
                onSpeak={speak}
              />
            </aside>
          )}

          {stage.mechanic === "market" && marketPuzzle && marketChallenge ? (
            <MarketStage
              challenge={marketChallenge}
              currencyIntroText={marketPuzzle.currencyIntroText}
              currencyIntroRuby={marketPuzzle.currencyIntroRuby}
              showCurrencyIntro={save.marketProgress.completedChallengeIds.length === 0}
              difficulties={marketDifficulties}
              activeDifficulty={marketDifficulty}
              completedDifficulties={marketCompletedDifficulties}
              basket={marketBasket}
              phase={marketPhase}
              feedback={marketFeedback}
              total={currentMarketQuestionValue}
              answerOptions={currentMarketAnswerOptions}
              selectedTotal={marketSelectedTotal}
              hintVisible={hintVisible}
              onHome={returnToDesk}
              onHint={showHint}
              onSpeak={speak}
              onDifficultySelect={handleMarketDifficultySelect}
              onItemSelect={handleMarketItemClick}
              onAnswerSelect={handleMarketTotalAnswer}
            />
          ) : (
            <div
              className={`forest-stage ${stageBackgroundReady ? "stage-ready" : "stage-loading"}`}
              aria-label={stage.instructionText}
              aria-busy={!stageBackgroundReady}
            >
              <img
                key={stageBackground.image}
                className="forest-art"
                src={stageBackground.image}
                alt=""
                aria-hidden="true"
                decoding="async"
                fetchPriority="high"
                onLoad={() => setStageBackgroundReady(true)}
                onError={() => setStageBackgroundReady(true)}
                style={{
                  objectPosition: stageBackground.position,
                  transform: `scale(${stageBackground.scale})`,
                }}
              />
              {!stageBackgroundReady && <div className="stage-loading-cover" aria-hidden="true" />}
              {stageBackgroundReady && (
                <>
                  <div className="stage-toolbar" aria-label="關卡工具列">
                    <button className="home-fab" type="button" aria-label="回桌面" onClick={returnToDesk}>
                      <HomeIcon />
                    </button>
                    {stage.mechanic === "search" && stage.targets && stage.targetLabel && stage.targetRuby && (
                      <div className="stage-hud">
                        <div className="target-pill">
                          <ObjectIcon assetId={stage.targets[0].assetId} compact />
                          <span className="target-action">找找</span>
                          <strong>
                            <RubyText segments={[{ text: stage.targetLabel, ruby: stage.targetRuby }]} />
                          </strong>
                          <small className="count-badge">{foundTargets}/{totalTargets}</small>
                        </div>
                      </div>
                    )}
                    <button className="hint-fab" type="button" aria-label="小航提示" onClick={showHint}>
                      <LightbulbIcon />
                    </button>
                  </div>
                  {objects.map((object) => (
                    <SearchObject
                      key={object.instanceId}
                      object={object}
                      hinted={hintVisible && object.isTarget && !object.found}
                      onSelect={() => handleObjectClick(object)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {screen === "reward" && reward && (
        <section className="reward-screen collection-reward-screen">
          <img
            className="collection-reward-art"
            src={collectionRewardClean}
            alt=""
            aria-hidden="true"
          />
          <div className="collection-reward-toolbar" aria-label="獎勵頁工具列">
            <button
              className="collection-round-button collection-book-button"
              type="button"
              aria-label="查看圖鑑"
              onClick={() => {
                setCollectionPage(0);
                setCollectionOpen(true);
              }}
            >
              <BookIcon />
            </button>
          </div>
          <div className="collection-unlock" aria-label={`收進圖鑑：${assets[reward.stickers[0] ?? stage.targets?.[0]?.assetId ?? "pine_cone"].label}`}>
            <div className="collection-unlock-glow" aria-hidden="true" />
            <ObjectIcon assetId={reward.stickers[0] ?? stage.targets?.[0]?.assetId ?? "pine_cone"} />
          </div>
          <div className="collection-reward-caption">
            <p className="eyebrow">收進圖鑑</p>
            <HeadingWithAudio
              segments={dialogue.rewardHeadline}
              speakText="成功取得寶物！"
              onSpeak={speak}
            />
            <div className="collection-reward-actions">
              <button className="collection-action-button" type="button" aria-label="回桌面" onClick={returnToDesk}>
                <HomeIcon />
              </button>
              <button
                className="collection-action-button collection-next-button"
                type="button"
                aria-label={stage.world === "forest" && stages[stageIndex + 1]?.world !== "forest"
                  ? "取得零件 A"
                  : stageIndex + 1 >= stages.length ? "查看結果" : "下一段森林路"}
                onClick={continueAdventure}
              >
                <ArrowRightIcon />
              </button>
            </div>
          </div>
          {collectionOpen && (
            <CollectionBookModal
              collectionPages={collectionPages}
              currentCollectionPage={currentCollectionPage}
              setCollectionOpen={setCollectionOpen}
              setCollectionPage={setCollectionPage}
            />
          )}
        </section>
      )}

      {screen === "complete" && (
        <section className="complete-screen">
          <img className="complete-bg-art" src={collectionRewardClean} alt="" aria-hidden="true" />
          <div className="collection-reward-toolbar complete-toolbar" aria-label="完成頁工具列">
            <button className="collection-round-button complete-home-button" type="button" aria-label="回島嶼" onClick={returnToDesk}>
              <HomeIcon />
            </button>
            <button
              className="collection-round-button collection-book-button"
              type="button"
              aria-label="查看圖鑑"
              onClick={() => {
                setCollectionPage(0);
                setCollectionOpen(true);
              }}
            >
              <BookIcon />
            </button>
          </div>
          <div className="complete-part-reward" aria-label="取得飛機零件">
            <span className="complete-part-glow" aria-hidden="true" />
            <img src={planePartReward} alt="" aria-hidden="true" />
          </div>
          <div className="complete-caption">
            <div>
              <HeadingWithAudio
                segments={dialogue.completeHeadline}
                speakText="今天的森林書完成囉！"
                onSpeak={speak}
              />
              <p>
                <RubyText segments={dialogue.completeSummary()} />
              </p>
            </div>
          </div>
          {collectionOpen && (
            <CollectionBookModal
              collectionPages={collectionPages}
              currentCollectionPage={currentCollectionPage}
              setCollectionOpen={setCollectionOpen}
              setCollectionPage={setCollectionPage}
            />
          )}
        </section>
      )}

      {debugEnabled && (
        <section className="debug-panel">
          <button className="text-action" onClick={() => setEventsOpen((value) => !value)}>
            {eventsOpen ? "收起測試紀錄" : "查看測試紀錄"}
          </button>
          {eventsOpen && (
            <div className="event-summary">
              <div className="event-summary-grid">
                <span>完成關卡 <strong>{playtestSummary.finishedStages}</strong></span>
                <span>誤點 <strong>{playtestSummary.wrongClicks}</strong></span>
                <span>提示 <strong>{playtestSummary.hints}</strong></span>
                <span>平均秒數 <strong>{playtestSummary.averageSeconds}</strong></span>
              </div>
              <pre>{JSON.stringify(events.slice(-20), null, 2)}</pre>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function CollectionBookModal({
  collectionPages,
  currentCollectionPage,
  setCollectionOpen,
  setCollectionPage,
}: {
  collectionPages: AssetDefinition[][];
  currentCollectionPage: number;
  setCollectionOpen: Dispatch<SetStateAction<boolean>>;
  setCollectionPage: Dispatch<SetStateAction<number>>;
}) {
  return (
    <div className="collection-modal-backdrop" role="dialog" aria-modal="true" aria-label="森林圖鑑">
      <div className="collection-book-modal">
        <div className="collection-book-cover-shadow" aria-hidden="true" />
        <button
          className="collection-close-button"
          type="button"
          aria-label="關閉圖鑑"
          onClick={() => setCollectionOpen(false)}
        >
          ×
        </button>
        <div className="collection-book-title">
          <BookIcon />
          <span>森林圖鑑</span>
        </div>
        <div className="collection-book-pages">
          {Array.from({ length: 4 }).map((_, index) => {
            const asset = collectionPages[currentCollectionPage][index];

            return (
              <div className={`collection-slot ${asset ? "collected" : "locked"}`} key={asset?.id ?? `empty-${index}`}>
                {asset ? (
                  <div className="collection-sticker-card">
                    <span className="collection-tape tape-left" aria-hidden="true" />
                    <span className="collection-tape tape-right" aria-hidden="true" />
                    <ObjectIcon assetId={asset.id} />
                    <span>{asset.label}</span>
                  </div>
                ) : (
                  <div className="collection-locked-card" aria-label="還沒發現">
                    <span className="collection-empty-mark">?</span>
                    <small>未發現</small>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="collection-page-controls">
          <button
            className="collection-page-button prev"
            type="button"
            aria-label="上一頁"
            disabled={currentCollectionPage === 0}
            onClick={() => setCollectionPage((page) => Math.max(0, page - 1))}
          >
            <ArrowRightIcon />
          </button>
          <span className="collection-page-tab">{currentCollectionPage + 1}/{collectionPages.length}</span>
          <button
            className="collection-page-button"
            type="button"
            aria-label="下一頁"
            disabled={currentCollectionPage >= collectionPages.length - 1}
            onClick={() => setCollectionPage((page) => Math.min(collectionPages.length - 1, page + 1))}
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function MarketStage({
  challenge,
  currencyIntroText,
  currencyIntroRuby,
  showCurrencyIntro,
  difficulties,
  activeDifficulty,
  completedDifficulties,
  basket,
  phase,
  feedback,
  total,
  answerOptions,
  selectedTotal,
  hintVisible,
  onHome,
  onHint,
  onSpeak,
  onDifficultySelect,
  onItemSelect,
  onAnswerSelect,
}: {
  challenge: MarketChallengeConfig;
  currencyIntroText: string;
  currencyIntroRuby: RubySegment[];
  showCurrencyIntro: boolean;
  difficulties: MarketDifficultyConfig[];
  activeDifficulty: MarketDifficultyId;
  completedDifficulties: MarketDifficultyId[];
  basket: Record<string, number>;
  phase: MarketPhase;
  feedback: string;
  total: number;
  answerOptions: number[];
  selectedTotal: number | null;
  hintVisible: boolean;
  onHome: () => void;
  onHint: () => void;
  onSpeak: (text: string) => void;
  onDifficultySelect: (difficulty: MarketDifficultyId) => void;
  onItemSelect: (assetId: string) => void;
  onAnswerSelect: (value: number) => void;
}) {
  const marketItemIds = marketShelfItemIds;
  const calculationLines = marketCalculationLines(challenge);
  const activeDifficultyDetails = difficulties.find(
    (difficulty) => difficulty.id === activeDifficulty
  ) ?? difficulties[0];
  const isNumberRecognition = activeDifficultyDetails?.questionMode === "number-recognition";
  const basketSlots = challenge.order.flatMap((item) =>
    Array.from({ length: item.count }, (_, slotIndex) => {
      const isFilled = (basket[item.assetId] ?? 0) > slotIndex;

      return (
        <span
          key={`${item.assetId}-${slotIndex}`}
          className={`market-basket-slot ${isFilled ? "ready" : ""}`}
          aria-label={`${assets[item.assetId].label}${isFilled ? "已放入" : "等待放入"}`}
        >
          {isFilled ? <ObjectIcon assetId={item.assetId} compact /> : <i aria-hidden="true" />}
        </span>
      );
    })
  );
  const selectedBasketItems = Object.entries(basket).flatMap(([assetId, count]) =>
    Array.from({ length: count }, (_, index) => ({ assetId, key: `${assetId}-${index}` }))
  );
  const feedbackText = feedback || (phase === "pick"
    ? "先幫客人拿商品。"
    : isNumberRecognition ? "數數看籃子裡有幾個。" : "算算看總共幾貝。");
  const difficultyControls = difficulties.map((difficulty) => {
    const unlocked = isMarketDifficultyUnlocked(difficulty, completedDifficulties);
    const active = activeDifficulty === difficulty.id;
    const completed = completedDifficulties.includes(difficulty.id);

    return (
      <button
        className={`market-difficulty-button ${difficulty.id === "boss" ? "boss" : ""} ${active ? "active" : ""} ${completed ? "completed" : ""}`}
        type="button"
        key={difficulty.id}
        onClick={() => onDifficultySelect(difficulty.id)}
        aria-label={`${difficulty.label}${unlocked ? "" : "，尚未解鎖"}`}
        aria-current={active ? "true" : undefined}
        disabled={!unlocked}
      >
        <span>{difficulty.label}</span>
        <small>{difficulty.ageLabel}</small>
        {!unlocked && <LockIcon />}
      </button>
    );
  });

  return (
    <div className={`market-stage market-stage-${phase}`} aria-label="市場打工">
      <div className="stage-toolbar market-toolbar" aria-label="市場工具列">
        <button className="home-fab" type="button" aria-label="回桌面" onClick={onHome}>
          <HomeIcon />
        </button>
        <button className="hint-fab" type="button" aria-label="小航提示" onClick={onHint}>
          <LightbulbIcon />
        </button>
      </div>

      {phase !== "pick" && (
        <div className="market-difficulty-row" aria-label="市場難度">
          {difficultyControls}
        </div>
      )}

      {activeDifficultyDetails && phase !== "pick" && (
        <div
          className="market-active-level"
          aria-live="polite"
        >
          <span>現在是</span>
          <strong>{activeDifficultyDetails.label}</strong>
          <em>{activeDifficultyDetails.ageLabel} · {activeDifficultyDetails.skillLabel}</em>
          {completedDifficulties.includes(activeDifficultyDetails.id) && <b>已完成</b>}
        </div>
      )}

      <div className="market-sky" aria-hidden="true" />
      {phase === "pick" ? (
        <div className="market-order-screen market-order-screen-art">
          <img
            className="market-art-background"
            src={marketStallBackground}
            alt=""
            aria-hidden="true"
          />
          <div className="market-level-board">
            <img className="market-art-sign" src={marketSignArt} alt="" aria-hidden="true" />
            <div className="market-difficulty-row market-difficulty-row-art" aria-label="市場難度">
              {difficultyControls}
            </div>
          </div>
          {showCurrencyIntro && !isNumberRecognition && (
            <section className="market-currency-intro market-currency-intro-art" aria-label="市場貨幣說明">
              <button
                className="market-inline-audio"
                type="button"
                aria-label="播放貝殼說明"
                onClick={() => onSpeak(currencyIntroText)}
              >
                <SpeakerIcon />
              </button>
              <span className="market-shell-coin" aria-hidden="true">貝</span>
              <p><RubyText segments={currencyIntroRuby} /></p>
            </section>
          )}
          <section className="market-stall market-stall-art" aria-label="商品攤位">
            <div className="market-shelves">
              {marketItemIds.map((assetId) => {
                const requiredCount = marketRequiredCount(challenge, assetId);
                const selectedCount = basket[assetId] ?? 0;
                const isDone = requiredCount > 0 && selectedCount >= requiredCount;
                const position = marketShelfPositions[assetId];

                return (
                  <button
                    className={`market-item-card market-item-art ${hintVisible && requiredCount > selectedCount ? "hinted" : ""} ${isDone ? "done" : ""}`}
                    type="button"
                    key={assetId}
                    style={{
                      "--market-item-x": `${position.x}%`,
                      "--market-item-y": `${position.y}%`,
                      "--market-item-rotation": `${position.rotation}deg`,
                    } as CSSProperties}
                    onClick={() => onItemSelect(assetId)}
                    aria-label={isNumberRecognition
                      ? assets[assetId].label
                      : `${assets[assetId].label}，${marketPrice(challenge, assetId)} 貝`}
                  >
                    <ObjectIcon assetId={assetId} />
                    <span className="market-item-label">
                      <img src={marketPriceTagArt} alt="" aria-hidden="true" />
                      <span className="market-item-label-copy">
                        <strong>{assets[assetId].label}</strong>
                        {!isNumberRecognition && <small>{marketPrice(challenge, assetId)} 貝</small>}
                      </span>
                    </span>
                    {isDone && <b aria-hidden="true">✓</b>}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="market-order-basket market-order-basket-art" aria-label="客人的籃子">
            <img src={marketBasketArt} alt="" aria-hidden="true" />
            <div className="market-art-basket-items" aria-live="polite">
              {selectedBasketItems.map((item) => (
                <span key={item.key}>
                  <ObjectIcon assetId={item.assetId} compact />
                </span>
              ))}
            </div>
          </section>

          <section className="market-dialogue market-customer-dialogue market-customer-dialogue-art" aria-label="客人訂單">
            <div className="market-dialogue-copy">
              <p className="eyebrow market-customer-name">
                <RubyText segments={[{ text: challenge.customerName, ruby: challenge.customerRuby }]} />
              </p>
              <HeadingWithAudio
                segments={challenge.requestRuby}
                speakText={challenge.requestText}
                onSpeak={onSpeak}
                audioLabel="播放客人台詞"
              />
              <p className="market-feedback" aria-live="polite">
                {feedbackText}
              </p>
            </div>
          </section>
        </div>
      ) : (
        <div className="market-checkout-screen">
          <section className="market-basket market-checkout-basket" aria-label="裝好的籃子">
            <p>籃子裡有</p>
            <div className="market-basket-items">{basketSlots}</div>
          </section>

          <section className="market-answer-tray market-checkout-panel" aria-label="算總價">
            <p className="eyebrow">幫小航算一算</p>
            <h2>{isNumberRecognition ? "籃子裡有幾個？" : "總共幾貝？"}</h2>
            {isNumberRecognition ? (
              <div className="market-number-question" aria-label="辨認商品數量">
                <span>數一數</span>
                <strong>{selectedTotal ?? "?"}</strong>
                <span>個</span>
              </div>
            ) : (
              <div className="market-equation" aria-label="商品算式">
                {calculationLines.map((line, index) => (
                  <span className="market-equation-part" key={line.key}>
                    {index > 0 && <em aria-hidden="true">+</em>}
                    <span>
                      <ObjectIcon assetId={line.assetId} compact />
                      <b>{assets[line.assetId].label}</b>
                      <strong>{line.price} 貝</strong>
                    </span>
                  </span>
                ))}
                <em aria-hidden="true">=</em>
                <strong className="market-equation-answer">{selectedTotal ?? "?"}</strong>
              </div>
            )}
          <p>{isNumberRecognition ? "點一下正確的數字" : "點一下正確的總價"}</p>
          <div className="market-answer-options">
            {answerOptions.map((value) => (
              <button
                className={`market-answer-button ${selectedTotal === value ? "selected" : ""} ${
                  selectedTotal === value && value !== total ? "wrong" : ""
                } ${selectedTotal === value && value === total ? "correct" : ""}`}
                type="button"
                key={value}
                onClick={() => onAnswerSelect(value)}
                aria-label={`選擇 ${value}${isNumberRecognition ? " 個" : " 貝"}`}
              >
                <strong>{value}</strong>
                <span>{isNumberRecognition ? "個" : "貝"}</span>
              </button>
            ))}
          </div>
            <p className="market-feedback" aria-live="polite">
              {feedbackText}
            </p>
          </section>

          <img className="market-cashier-fox" src={xiaohangFox} alt="" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function summarizeEvents(events: GameEvent[]) {
  const finished = events.filter((event) => event.event === "stage_finish");
  const totalDuration = finished.reduce((sum, event) => {
    const duration = event.payload?.durationMs;
    return sum + (typeof duration === "number" ? duration : 0);
  }, 0);

  return {
    finishedStages: finished.length,
    wrongClicks: events.filter((event) => event.event === "wrong_click").length,
    hints: events.filter((event) => event.event === "hint_show").length,
    averageSeconds: finished.length === 0 ? 0 : Math.round(totalDuration / finished.length / 1000),
  };
}

function pickXiaohangVoice(voices: SpeechSynthesisVoice[]) {
  const preferredNames = xiaohangVoicePreference.preferredNames.map((name) => name.toLowerCase());
  const preferredKeywords = xiaohangVoicePreference.preferredKeywords.map((keyword) =>
    keyword.toLowerCase()
  );
  const chineseVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("zh"));

  return (
    chineseVoices.find((voice) => {
      const haystack = `${voice.name} ${voice.lang}`.toLowerCase();
      return preferredNames.some((name) => haystack.includes(name));
    }) ??
    chineseVoices.find((voice) => {
      const haystack = `${voice.name} ${voice.lang}`.toLowerCase();
      return preferredKeywords.some((keyword) => haystack.includes(keyword));
    }) ??
    chineseVoices[0] ??
    voices[0]
  );
}

function HeadingWithAudio({
  segments,
  speakText,
  onSpeak,
  audioLabel = "播放題目",
}: {
  segments: RubySegment[];
  speakText: string;
  onSpeak: (text: string) => void;
  audioLabel?: string;
}) {
  return (
    <div className="audio-heading">
      <button
        className="audio-button"
        type="button"
        aria-label={audioLabel}
        onClick={() => onSpeak(speakText)}
      >
        <SpeakerIcon />
      </button>
      <h2>
        <RubyText segments={segments} />
      </h2>
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="speaker-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 9.5V14.5H8L13 19V5L8 9.5H4Z"
        fill="currentColor"
      />
      <path
        d="M16 8.5C17.1 9.4 17.75 10.65 17.75 12C17.75 13.35 17.1 14.6 16 15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18.75 6C20.4 7.55 21.25 9.65 21.25 12C21.25 14.35 20.4 16.45 18.75 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hint-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.5 14.5C7.25 13.45 6.5 11.9 6.5 10.2C6.5 7.1 8.95 4.75 12 4.75C15.05 4.75 17.5 7.1 17.5 10.2C17.5 11.9 16.75 13.45 15.5 14.5C14.65 15.22 14.25 15.95 14.2 17H9.8C9.75 15.95 9.35 15.22 8.5 14.5Z"
        fill="currentColor"
      />
      <path d="M9.5 19H14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.2 21H13.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 2.5V1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19.1 5.1L19.8 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.9 5.1L4.2 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="lock-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.5 10V8.2C7.5 5.55 9.35 3.75 12 3.75C14.65 3.75 16.5 5.55 16.5 8.2V10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M6.2 9.5H17.8C18.6 9.5 19.25 10.15 19.25 10.95V18.8C19.25 19.6 18.6 20.25 17.8 20.25H6.2C5.4 20.25 4.75 19.6 4.75 18.8V10.95C4.75 10.15 5.4 9.5 6.2 9.5Z"
        fill="currentColor"
      />
      <path
        d="M12 13.3V16.1"
        stroke="#fff6d8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="home-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 11.2L12 4.8L19.5 11.2V20H14.5V14.5H9.5V20H4.5V11.2Z"
        fill="currentColor"
      />
      <path
        d="M3 12.1L12 4.4L21 12.1"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      aria-hidden="true"
      className="book-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 4.8C5 4.05 5.6 3.45 6.35 3.45H18.5V19.75H6.35C5.6 19.75 5 19.15 5 18.4V4.8Z"
        fill="currentColor"
      />
      <path
        d="M7.7 6.2H16.2"
        stroke="#fff6d8"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.05 14.35C8.35 13.15 9.25 12.35 10.25 12.35C11.25 12.35 12.15 13.15 12.45 14.35C12.75 13.15 13.65 12.35 14.65 12.35C15.65 12.35 16.55 13.15 16.85 14.35"
        stroke="#fff6d8"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M8.1 17.1H16.8"
        stroke="#fff6d8"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M18.5 3.45V19.75"
        stroke="#5a3a24"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="arrow-right-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 12H18.2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M13.2 6.4L18.8 12L13.2 17.6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg
      aria-hidden="true"
      className="replay-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.4 7.2H4.2V4"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 7.1C6.1 4.9 8.7 3.5 11.7 3.5C16.6 3.5 20.5 7.4 20.5 12.3C20.5 17.2 16.6 21.1 11.7 21.1C8.6 21.1 5.9 19.5 4.3 17.1"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RubyText({ segments }: { segments: RubySegment[] }) {
  return (
    <span className="zhuyin-text">
      {segments.map((segment, index) =>
        typeof segment === "string" ? (
          <span className="plain-text" key={`${segment}-${index}`}>{segment}</span>
        ) : (
          <span className="plain-text" key={`${segment.text}-${index}`}>{segment.text}</span>
        )
      )}
    </span>
  );
}

function SearchObject({
  object,
  hinted,
  onSelect,
}: {
  object: PlacedObject;
  hinted: boolean;
  onSelect: () => void;
}) {
  const asset = assets[object.assetId];
  const style = {
    left: `${object.x}%`,
    top: `${object.y}%`,
    width: object.size,
    height: object.size,
    transform: `translate(-50%, -50%) rotate(${object.rotation}deg) scaleX(${object.flipX ? -1 : 1}) scale(${object.found ? 0.7 : 1})`,
    "--object-opacity": object.opacity,
    "--object-color": asset.color,
    "--object-accent": asset.accent,
  } as CSSProperties;

  return (
    <button
      className={`search-object ${asset.kind} ${object.found ? "found" : ""} ${hinted ? "hinted" : ""}`}
      data-target={object.isTarget ? "true" : "false"}
      style={style}
      onClick={onSelect}
      aria-label={asset.label}
    >
      <ObjectIcon assetId={asset.id} />
    </button>
  );
}

function ObjectIcon({ assetId, compact = false }: { assetId: string; compact?: boolean }) {
  const asset = assets[assetId];
  const imageSrc = assetImages[assetId];

  if (imageSrc) {
    return (
      <img
        className={`object-icon object-image ${compact ? "object-icon-compact" : ""} icon-${asset.kind}`}
        src={imageSrc}
        alt=""
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={`object-icon object-image-missing ${compact ? "object-icon-compact" : ""} icon-${asset.kind}`}
      aria-hidden="true"
    />
  );
}
