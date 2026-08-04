import type { MarketDifficultyId } from "../types";
import type { MarketPhase } from "../hooks/useGameState";

const marketRoundKey = "wonder-trail:market-round-session";
const marketStorySeenKey = "wonder-trail:market-story-seen";
const marketDifficulties: MarketDifficultyId[] = ["beginner", "intermediate", "advanced", "boss"];

export type MarketRoundSession = {
  stageId: string;
  difficulty: MarketDifficultyId;
  challengeIndex: number;
  roundSeed: number;
  phase: Extract<MarketPhase, "pick" | "total">;
  basket: Record<string, number>;
  feedback: string;
};

function sessionStore() {
  return typeof window !== "undefined" ? window.sessionStorage : undefined;
}

function isBasket(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([assetId, count]) =>
    assetId.length > 0 && typeof count === "number" && Number.isInteger(count) && count >= 0
  );
}

export function loadMarketRoundSession(): MarketRoundSession | null {
  const storage = sessionStore();
  if (!storage) return null;

  try {
    const raw = storage.getItem(marketRoundKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<MarketRoundSession>;
    if (
      typeof value.stageId !== "string"
      || !marketDifficulties.includes(value.difficulty as MarketDifficultyId)
      || typeof value.challengeIndex !== "number"
      || !Number.isInteger(value.challengeIndex)
      || value.challengeIndex < 0
      || typeof value.roundSeed !== "number"
      || !Number.isFinite(value.roundSeed)
      || (value.phase !== "pick" && value.phase !== "total")
      || !isBasket(value.basket)
      || typeof value.feedback !== "string"
    ) {
      storage.removeItem(marketRoundKey);
      return null;
    }

    return value as MarketRoundSession;
  } catch {
    storage.removeItem(marketRoundKey);
    return null;
  }
}

export function writeMarketRoundSession(session: MarketRoundSession) {
  const storage = sessionStore();
  if (!storage) return;
  try {
    storage.setItem(marketRoundKey, JSON.stringify(session));
  } catch {
    // A temporary round must never prevent the game from continuing.
  }
}

export function clearMarketRoundSession() {
  const storage = sessionStore();
  if (!storage) return;
  try {
    storage.removeItem(marketRoundKey);
  } catch {
    // Ignore browser storage restrictions.
  }
}

export function hasSeenMarketStory() {
  const storage = sessionStore();
  if (!storage) return false;
  try {
    return storage.getItem(marketStorySeenKey) === "true";
  } catch {
    return false;
  }
}

export function markMarketStorySeen() {
  const storage = sessionStore();
  if (!storage) return;
  try {
    storage.setItem(marketStorySeenKey, "true");
  } catch {
    // Story replay is harmless when session storage is unavailable.
  }
}

export function clearMarketStorySeen() {
  const storage = sessionStore();
  if (!storage) return;
  try {
    storage.removeItem(marketStorySeenKey);
  } catch {
    // Ignore browser storage restrictions.
  }
}
