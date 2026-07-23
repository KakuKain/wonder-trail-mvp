import { describe, expect, it } from "vitest";
import { stages } from "../data/stages";
import { createPlacedObjects, objectsHaveOverlappingHitboxes } from "./stagePlacement";

describe("forest object placement", () => {
  it("keeps every generated touch target separate on a compact phone", () => {
    const forestStages = stages.filter((stage) => stage.mechanic === "search");

    forestStages.forEach((stage) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const objects = createPlacedObjects(stage);

        expect(objects.filter((object) => object.isTarget)).toHaveLength(stage.targets?.[0]?.count ?? 0);
        objects.forEach((object, index) => {
          objects.slice(index + 1).forEach((other) => {
            expect(objectsHaveOverlappingHitboxes(object, other, stage.assist.hitboxScale)).toBe(false);
          });
        });
      }
    });
  });
});
