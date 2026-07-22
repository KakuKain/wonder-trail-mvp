import { beforeEach, describe, expect, it } from "vitest";
import { defaultSave, getSaveProtectionMode, loadSave, migrateSave, resetSave, SAVE_VERSION, writeSave } from "./storage";

class MemoryStorage { private values = new Map<string, string>(); getItem(key: string) { return this.values.get(key) ?? null; } setItem(key: string, value: string) { this.values.set(key, value); } removeItem(key: string) { this.values.delete(key); } clear() { this.values.clear(); } }
const storage = new MemoryStorage();

beforeEach(() => { storage.clear(); Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage }); });

describe("loadSave", () => {
  it("returns defaults for missing or invalid saves", () => { expect(loadSave()).toEqual(defaultSave); storage.setItem("wonder-trail:save", "not-json"); expect(loadSave()).toEqual(defaultSave); });
  it("repairs malformed collections while preserving valid saved progress", () => {
    storage.setItem("wonder-trail:save", JSON.stringify({ completedStageIds: "bad", stickers: ["apple"], marketProgress: { completedChallengeIds: "bad", completedDifficulties: ["advanced"], nextChallengeByDifficulty: { advanced: 2 } } }));
    expect(loadSave()).toMatchObject({ completedStageIds: [], stickers: ["apple"], marketProgress: { completedChallengeIds: [], completedDifficulties: ["advanced"], nextChallengeByDifficulty: { advanced: 2 } } });
  });
  it("migrates the original unversioned payload to the current version", () => {
    const migrated = migrateSave({ stars: 4, completedStageIds: ["forest_search_01"], stickers: ["apple"], marketProgress: { activeDifficulty: "advanced", completedChallengeIds: ["market_order_01"], completedDifficulties: ["intermediate"], nextChallengeByDifficulty: { advanced: 2 } } });
    expect(migrated).toMatchObject({ version: SAVE_VERSION, stars: 4, completedStageIds: ["forest_search_01"], marketProgress: { activeDifficulty: "advanced", nextChallengeByDifficulty: { advanced: 2 } } });
  });
  it("stamps the current version whenever a save is written", () => {
    writeSave({ ...defaultSave, version: 0, stars: 2 });
    expect(JSON.parse(storage.getItem("wonder-trail:save") ?? "{}")).toMatchObject({ version: SAVE_VERSION, stars: 2 });
  });
  it("backs up a newer save and refuses to overwrite it", () => {
    const futurePayload = JSON.stringify({ version: SAVE_VERSION + 1, stars: 99, completedStageIds: ["future_stage"] });
    storage.setItem("wonder-trail:save", futurePayload);

    expect(loadSave()).toEqual(defaultSave);
    expect(getSaveProtectionMode()).toBe("future-version");
    expect(storage.getItem("wonder-trail:save:future-backup")).toBe(futurePayload);
    expect(writeSave({ ...defaultSave, stars: 1 })).toBe(false);
    expect(storage.getItem("wonder-trail:save")).toBe(futurePayload);

    resetSave();
    expect(getSaveProtectionMode()).toBe("normal");
    expect(storage.getItem("wonder-trail:save")).toBeNull();
    expect(storage.getItem("wonder-trail:save:future-backup")).toBeNull();
  });
});
