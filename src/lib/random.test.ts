import { describe, expect, it } from "vitest";
import { seededShuffle } from "./random";

describe("seededShuffle", () => {
  it("keeps a round stable when the same seed is reused", () => {
    const items = ["蘋果", "松果", "蘑菇"];
    expect(seededShuffle(items, "round-a")).toEqual(seededShuffle(items, "round-a"));
  });

  it("changes the order for a new round seed", () => {
    const items = ["蘋果", "松果", "蘑菇"];
    expect(seededShuffle(items, "round-a")).not.toEqual(seededShuffle(items, "round-b"));
  });
});
