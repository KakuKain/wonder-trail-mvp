import { defaultSave } from "./storage";
import { isMarketDifficultyUnlocked, marketCustomersPerShift } from "./market";
import type { MarketDifficultyConfig, MarketDifficultyId, MarketProgress, PlacedObject, RewardConfig, SaveData, StageConfig } from "../types";

export function getStageInitialState(stage: StageConfig, progress: MarketProgress) {
  const marketDifficulty = stage.marketPuzzle?.difficulties.find((item) =>
    item.id === progress.activeDifficulty && isMarketDifficultyUnlocked(item, progress.completedDifficulties)
  )?.id ?? stage.marketPuzzle?.difficulties[0]?.id ?? "beginner";
  return {
    stageBackgroundReady: stage.mechanic !== "search",
    marketDifficulty,
    marketCompletedDifficulties: progress.completedDifficulties,
    marketChallengeIndex: Math.min(
      progress.nextChallengeByDifficulty[marketDifficulty] ?? 0,
      marketCustomersPerShift - 1
    ),
  };
}

export function selectForestTarget(objects: PlacedObject[], instanceId: string) {
  const selectedObject = objects.find((object) => object.instanceId === instanceId);
  if (!selectedObject?.isTarget || selectedObject.found) {
    return { changed: false, completed: false, objects };
  }

  const nextObjects = objects.map((object) =>
    object.instanceId === instanceId ? { ...object, found: true } : object
  );
  return {
    changed: true,
    completed: !nextObjects.some((object) => object.isTarget && !object.found),
    objects: nextObjects,
  };
}

export function completeStageSave(save: SaveData, stageId: string, reward: RewardConfig, now: string): SaveData {
  const alreadyCompleted = save.completedStageIds.includes(stageId);
  return {
    ...save,
    completedStageIds: alreadyCompleted ? save.completedStageIds : [...save.completedStageIds, stageId],
    stickers: Array.from(new Set([...save.stickers, ...reward.stickers])),
    stars: save.stars + (alreadyCompleted ? 0 : reward.stars),
    lastPlayedAt: now,
  };
}

export function forestRewardCopy(assetLabel: string, completionWasNew: boolean) {
  return completionWasNew
    ? {
        collectionAria: `收進圖鑑：${assetLabel}`,
        eyebrow: "收進圖鑑",
        headline: "成功取得寶物！",
        detail: `${assetLabel}已收進圖鑑。`,
      }
    : {
        collectionAria: `已在圖鑑裡：${assetLabel}`,
        eyebrow: "已在圖鑑裡",
        headline: "再次完成關卡！",
        detail: `${assetLabel}已在圖鑑裡。`,
      };
}

export function advanceMarketProgress(
  progress: MarketProgress,
  difficulty: MarketDifficultyId,
  challengeId: string,
  challengeIndex: number,
  challengeCount: number
) {
  const completedChallengeIds = Array.from(new Set([...progress.completedChallengeIds, challengeId]));
  const nextChallengeByDifficulty = { ...progress.nextChallengeByDifficulty };
  const completedDifficulty = challengeIndex >= challengeCount - 1;

  if (completedDifficulty) {
    nextChallengeByDifficulty[difficulty] = 0;
    return {
      completedDifficulty: true,
      nextChallengeIndex: 0,
      progress: {
        ...progress,
        completedChallengeIds,
        completedDifficulties: Array.from(new Set([...progress.completedDifficulties, difficulty])),
        nextChallengeByDifficulty,
      },
    };
  }

  const nextChallengeIndex = challengeIndex + 1;
  nextChallengeByDifficulty[difficulty] = nextChallengeIndex;
  return {
    completedDifficulty: false,
    nextChallengeIndex,
    progress: { ...progress, completedChallengeIds, nextChallengeByDifficulty },
  };
}

export function selectMarketDifficulty(progress: MarketProgress, difficulty: MarketDifficultyConfig) {
  const unlocked = !difficulty.unlockAfter || progress.completedDifficulties.includes(difficulty.unlockAfter);
  if (!unlocked) return { unlocked: false, progress, challengeIndex: 0 };
  return {
    unlocked: true,
    progress: { ...progress, activeDifficulty: difficulty.id },
    challengeIndex: progress.nextChallengeByDifficulty[difficulty.id] ?? 0,
  };
}

export function resetGameProgress(): SaveData {
  return {
    ...defaultSave,
    completedStageIds: [],
    stickers: [],
    marketProgress: { ...defaultSave.marketProgress, nextChallengeByDifficulty: {} },
  };
}
