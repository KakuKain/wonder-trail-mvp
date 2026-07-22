import type { GameEvent, SaveData } from "../types";

const saveKey = "wonder-trail:save";
const eventKey = "wonder-trail:events";
const futureSaveBackupKey = "wonder-trail:save:future-backup";
export const SAVE_VERSION = 1;
let saveWriteLocked = false;

export type SaveProtectionMode = "normal" | "future-version";

export function getSaveProtectionMode(): SaveProtectionMode {
  return saveWriteLocked ? "future-version" : "normal";
}

export const defaultSave: SaveData = {
  version: SAVE_VERSION,
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

function createDefaultSave(): SaveData {
  return {
    ...defaultSave,
    completedStageIds: [],
    stickers: [],
    marketProgress: { ...defaultSave.marketProgress, nextChallengeByDifficulty: {} },
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

/** Migrates every historic payload to the newest shape before validation. */
export function migrateSave(value: unknown): SaveData {
  const record = asRecord(value);
  if (!record) return createDefaultSave();

  // Version 0 was the original, unversioned localStorage payload.
  const sourceVersion = typeof record.version === "number" ? record.version : 0;
  const migrated = sourceVersion < 1 ? { ...record, version: SAVE_VERSION } : record;
  const marketProgress = asRecord(migrated.marketProgress);
  const nextChallengeByDifficulty = asRecord(marketProgress?.nextChallengeByDifficulty);

  return {
    version: typeof migrated.version === "number" ? migrated.version : SAVE_VERSION,
    completedStageIds: Array.isArray(migrated.completedStageIds) ? migrated.completedStageIds.filter((id): id is string => typeof id === "string") : [],
    stars: typeof migrated.stars === "number" && Number.isFinite(migrated.stars) ? migrated.stars : 0,
    stickers: Array.isArray(migrated.stickers) ? migrated.stickers.filter((id): id is string => typeof id === "string") : [],
    marketProgress: {
      completedChallengeIds: Array.isArray(marketProgress?.completedChallengeIds) ? marketProgress.completedChallengeIds.filter((id): id is string => typeof id === "string") : [],
      completedDifficulties: Array.isArray(marketProgress?.completedDifficulties) ? marketProgress.completedDifficulties.filter((id): id is SaveData["marketProgress"]["completedDifficulties"][number] => typeof id === "string") : [],
      activeDifficulty: typeof marketProgress?.activeDifficulty === "string" ? marketProgress.activeDifficulty as SaveData["marketProgress"]["activeDifficulty"] : "beginner",
      nextChallengeByDifficulty: Object.fromEntries(Object.entries(nextChallengeByDifficulty ?? {}).filter(([, index]) => typeof index === "number" && Number.isInteger(index) && index >= 0)),
    },
    ...(typeof migrated.lastPlayedAt === "string" ? { lastPlayedAt: migrated.lastPlayedAt } : {}),
  };
}

export function loadSave(): SaveData {
  const raw = localStorage.getItem(saveKey);
  if (!raw) {
    saveWriteLocked = false;
    return createDefaultSave();
  }

  try {
    const parsed = JSON.parse(raw);
    const version = asRecord(parsed)?.version;

    if (typeof version === "number" && version > SAVE_VERSION) {
      // This app cannot safely interpret a save created by a newer release.
      // Keep its original payload untouched and make this session read-only.
      localStorage.setItem(futureSaveBackupKey, raw);
      saveWriteLocked = true;
      return createDefaultSave();
    }

    saveWriteLocked = false;
    return migrateSave(parsed);
  } catch {
    saveWriteLocked = false;
    return createDefaultSave();
  }
}

export function writeSave(save: SaveData) {
  if (saveWriteLocked) return false;
  localStorage.setItem(saveKey, JSON.stringify({ ...save, version: SAVE_VERSION }));
  return true;
}

export function resetSave() {
  saveWriteLocked = false;
  localStorage.removeItem(saveKey);
  localStorage.removeItem(futureSaveBackupKey);
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
