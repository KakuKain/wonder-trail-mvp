import type { GameEvent, SaveData } from "../types";

const saveKey = "wonder-trail:save";
const eventKey = "wonder-trail:events";

export const defaultSave: SaveData = {
  completedStageIds: [],
  stars: 0,
  stickers: [],
  marketProgress: {
    completedChallengeIds: [],
    completedDifficulties: [],
    activeDifficulty: "beginner",
    nextChallengeByDifficulty: {},
  },
};

export function loadSave(): SaveData {
  const raw = localStorage.getItem(saveKey);
  if (!raw) return defaultSave;

  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const marketProgress = parsed.marketProgress;

    return {
      ...defaultSave,
      ...parsed,
      completedStageIds: Array.isArray(parsed.completedStageIds) ? parsed.completedStageIds : [],
      stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
      marketProgress: {
        ...defaultSave.marketProgress,
        ...marketProgress,
        completedChallengeIds: Array.isArray(marketProgress?.completedChallengeIds)
          ? marketProgress.completedChallengeIds
          : [],
        completedDifficulties: Array.isArray(marketProgress?.completedDifficulties)
          ? marketProgress.completedDifficulties
          : [],
        nextChallengeByDifficulty: marketProgress?.nextChallengeByDifficulty ?? {},
      },
    };
  } catch {
    return defaultSave;
  }
}

export function writeSave(save: SaveData) {
  localStorage.setItem(saveKey, JSON.stringify(save));
}

export function resetSave() {
  localStorage.removeItem(saveKey);
  localStorage.removeItem(eventKey);
}

export function appendEvent(event: GameEvent) {
  const events = loadEvents();
  events.push(event);
  localStorage.setItem(eventKey, JSON.stringify(events.slice(-500)));
}

export function loadEvents(): GameEvent[] {
  const raw = localStorage.getItem(eventKey);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as GameEvent[];
  } catch {
    return [];
  }
}
