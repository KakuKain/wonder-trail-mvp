import type { PlacedObject, StageConfig } from "../types";

const hidingSpots = [
  { x: 20, y: 39, jitterX: 6, jitterY: 4, zone: "sign" },
  { x: 29, y: 56, jitterX: 6, jitterY: 4, zone: "fallen-log" },
  { x: 83, y: 33, jitterX: 4, jitterY: 5, zone: "tree-hole" },
  { x: 77, y: 48, jitterX: 7, jitterY: 5, zone: "right-rock" },
  { x: 62, y: 55, jitterX: 8, jitterY: 5, zone: "path-edge" },
  { x: 47, y: 62, jitterX: 8, jitterY: 5, zone: "path" },
  { x: 20, y: 66, jitterX: 6, jitterY: 4, zone: "flowers" },
  { x: 71, y: 67, jitterX: 7, jitterY: 4, zone: "branch" },
  { x: 38, y: 48, jitterX: 7, jitterY: 5, zone: "boulder" },
  { x: 86, y: 59, jitterX: 4, jitterY: 4, zone: "right-leaves" },
  { x: 54, y: 43, jitterX: 8, jitterY: 4, zone: "trail" },
  { x: 31, y: 74, jitterX: 5, jitterY: 3, zone: "front-flower" },
  { x: 14, y: 51, jitterX: 4, jitterY: 5, zone: "left-plant" },
  { x: 88, y: 70, jitterX: 3, jitterY: 3, zone: "stump" },
  { x: 68, y: 39, jitterX: 6, jitterY: 4, zone: "tree-root" },
  { x: 43, y: 34, jitterX: 7, jitterY: 5, zone: "distant-path" },
];

const safeSlots = [
  { x: 18, y: 18 },
  { x: 50, y: 18 },
  { x: 82, y: 18 },
  { x: 18, y: 31 },
  { x: 50, y: 31 },
  { x: 82, y: 31 },
  { x: 18, y: 44 },
  { x: 50, y: 44 },
  { x: 82, y: 44 },
  { x: 18, y: 57 },
  { x: 50, y: 57 },
  { x: 82, y: 57 },
];

const denseSafeSlots = [
  { x: 18, y: 21 },
  { x: 50, y: 21 },
  { x: 82, y: 21 },
  { x: 18, y: 34 },
  { x: 50, y: 34 },
  { x: 82, y: 34 },
  { x: 18, y: 47 },
  { x: 50, y: 47 },
  { x: 82, y: 47 },
  { x: 18, y: 60 },
  { x: 50, y: 60 },
  { x: 82, y: 60 },
];

const targetSafeSlots = [
  { x: 20, y: 25 },
  { x: 50, y: 25 },
  { x: 80, y: 25 },
  { x: 35, y: 53 },
  { x: 65, y: 53 },
];

const placementArea = {
  // Use a compact phone as the collision baseline so fixed-pixel hitboxes
  // still have enough room when the viewport is shorter than the design mock.
  widthPx: 360,
  heightPx: 640,
  minX: 8,
  maxX: 91,
  minY: 15,
  maxY: 66,
  touchPaddingPx: 16,
  visualGapPx: 22,
};

const maxVisibleObjects = 10;
const minTargetObjects = 3;
const maxTargetObjects = 5;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function objectBaseSize(assetId: string, isTarget: boolean) {
  if (assetId === "fox_footprint") return isTarget ? 54 : 50;
  if (assetId.includes("butterfly")) return isTarget ? 52 : 48;
  if (assetId === "bee") return 48;
  if (assetId === "leaf") return isTarget ? 50 : 48;
  if (assetId === "treasure_box") return 54;
  if (assetId === "pine_cone") return isTarget ? 52 : 48;
  return isTarget ? 52 : 48;
}

function objectOpacity(assetId: string, isTarget: boolean) {
  if (assetId === "fox_footprint") return isTarget ? 0.82 : 0.76;
  if (assetId === "leaf") return isTarget ? 0.9 : 0.78;
  if (!isTarget) return 0.84;
  return 0.94;
}

function objectFootprint(size: number, visualGapPx = placementArea.visualGapPx) {
  const paddedSize = size + placementArea.touchPaddingPx * 2 + visualGapPx;

  return {
    width: (paddedSize / placementArea.widthPx) * 100,
    height: (paddedSize / placementArea.heightPx) * 100,
  };
}

function hasEnoughSpace(
  candidate: Pick<PlacedObject, "assetId" | "size" | "x" | "y">,
  placed: PlacedObject[],
  visualGapPx = placementArea.visualGapPx
) {
  const candidateFootprint = objectFootprint(candidate.size, visualGapPx);

  return placed.every((object) => {
    const placedFootprint = objectFootprint(object.size, visualGapPx);
    const minDistanceX = (candidateFootprint.width + placedFootprint.width) / 2;
    const minDistanceY = (candidateFootprint.height + placedFootprint.height) / 2;

    return Math.abs(candidate.x - object.x) >= minDistanceX || Math.abs(candidate.y - object.y) >= minDistanceY;
  });
}

function createCandidate(
  assetId: string,
  size: number,
  spot: (typeof hidingSpots)[number],
  visualGapPx = placementArea.visualGapPx
) {
  const footprint = objectFootprint(size, visualGapPx);
  const minX = placementArea.minX + footprint.width / 2;
  const maxX = placementArea.maxX - footprint.width / 2;
  const minY = placementArea.minY + footprint.height / 2;
  const maxY = placementArea.maxY - footprint.height / 2;

  return {
    assetId,
    size,
    x: clamp(spot.x + randomBetween(-spot.jitterX, spot.jitterX), minX, maxX),
    y: clamp(spot.y + randomBetween(-spot.jitterY, spot.jitterY), minY, maxY),
  };
}

function createFreeCandidate(assetId: string, size: number, visualGapPx = placementArea.visualGapPx) {
  const footprint = objectFootprint(size, visualGapPx);
  const minX = placementArea.minX + footprint.width / 2;
  const maxX = placementArea.maxX - footprint.width / 2;
  const minY = placementArea.minY + footprint.height / 2;
  const maxY = placementArea.maxY - footprint.height / 2;

  return {
    assetId,
    size,
    x: randomBetween(minX, maxX),
    y: randomBetween(minY, maxY),
  };
}

function createSlotCandidate(
  assetId: string,
  size: number,
  slot: (typeof safeSlots)[number],
  visualGapPx = placementArea.visualGapPx
) {
  const footprint = objectFootprint(size, visualGapPx);

  return {
    assetId,
    size,
    x: clamp(slot.x, placementArea.minX + footprint.width / 2, placementArea.maxX - footprint.width / 2),
    y: clamp(slot.y, placementArea.minY + footprint.height / 2, placementArea.maxY - footprint.height / 2),
  };
}

function findDenseFallbackPosition(assetId: string, requestedSize: number, placed: PlacedObject[]) {
  for (let size = Math.min(requestedSize, 48); size >= 44; size -= 2) {
    for (const slot of shuffle(denseSafeSlots)) {
      const candidate = createSlotCandidate(assetId, size, slot, 0);

      if (hasEnoughSpace(candidate, placed, 0)) return candidate;
    }
  }

  return undefined;
}

function findOpenPosition(assetId: string, requestedSize: number, placed: PlacedObject[]) {
  const gapAttempts = [
    placementArea.visualGapPx,
    16,
    10,
    4,
    0,
  ];

  for (const visualGapPx of gapAttempts) {
    for (let size = requestedSize; size >= 44; size -= 4) {
      for (const spot of shuffle(shuffle(hidingSpots))) {
        for (let attempt = 0; attempt < 18; attempt += 1) {
          const candidate = createCandidate(assetId, size, spot, visualGapPx);

          if (hasEnoughSpace(candidate, placed, visualGapPx)) return candidate;
        }
      }

      for (let attempt = 0; attempt < 260; attempt += 1) {
        const candidate = createFreeCandidate(assetId, size, visualGapPx);

        if (hasEnoughSpace(candidate, placed, visualGapPx)) return candidate;
      }
    }
  }

  return findDenseFallbackPosition(assetId, requestedSize, placed);
}

function normalizeSearchConfigs(stage: StageConfig) {
  const targets = stage.targets ?? [];
  const distractors = stage.distractors ?? [];
  const targetAssetId = targets[0]?.assetId;
  const targetCount = clamp(
    targets.reduce((sum, target) => sum + target.count, 0),
    minTargetObjects,
    maxTargetObjects
  );
  const configs = targetAssetId
    ? Array.from({ length: targetCount }, () => ({ assetId: targetAssetId, isTarget: true }))
    : [];
  const remainingSlots = Math.max(0, maxVisibleObjects - configs.length);

  for (const distractor of distractors) {
    for (let count = 0; count < distractor.count && configs.length < maxVisibleObjects; count += 1) {
      configs.push({ assetId: distractor.assetId, isTarget: false });
    }

    if (configs.length >= maxVisibleObjects || configs.length - targetCount >= remainingSlots) break;
  }

  return configs;
}

function createPlacedObjectsAttempt(configs: ReturnType<typeof normalizeSearchConfigs>, stageId: string, useTargetSafeSlots = false) {
  const slots = shuffle(safeSlots);
  const targetSlots = shuffle(targetSafeSlots);
  let targetSlotIndex = 0;

  return configs.reduce<PlacedObject[]>((placed, config, index) => {
    const size = objectBaseSize(config.assetId, config.isTarget) * randomBetween(0.96, 1.14);
    const roundedSize = clamp(Math.round(size), 46, config.isTarget ? 54 : 50);
    const preferredSlot = useTargetSafeSlots && config.isTarget
      ? targetSlots[targetSlotIndex]
      : slots[index];
    const slotGapPx = useTargetSafeSlots && config.isTarget ? 0 : placementArea.visualGapPx;
    const slottedPosition = preferredSlot
      ? createSlotCandidate(config.assetId, roundedSize, preferredSlot, slotGapPx)
      : undefined;
    const position = slottedPosition && hasEnoughSpace(slottedPosition, placed, slotGapPx)
      ? slottedPosition
      : findOpenPosition(config.assetId, roundedSize, placed);

    if (config.isTarget) targetSlotIndex += 1;
    if (!position) return placed;

    placed.push({
      instanceId: `${stageId}-${config.assetId}-${index}`,
      assetId: config.assetId,
      x: position.x,
      y: position.y,
      size: position.size,
      rotation: Math.round(randomBetween(-24, 24)),
      flipX: Math.random() > 0.5,
      opacity: objectOpacity(config.assetId, config.isTarget),
      isTarget: config.isTarget,
      found: false,
    });

    return placed;
  }, []);
}

export function createPlacedObjects(stage: StageConfig): PlacedObject[] {
  if (stage.mechanic !== "search") return [];

  const configs = normalizeSearchConfigs(stage);
  const expectedTargets = configs.filter((config) => config.isTarget).length;
  const minimumVisibleObjects = Math.min(configs.length, expectedTargets + 3);
  let bestPlacement: PlacedObject[] = [];

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const placed = createPlacedObjectsAttempt(configs, stage.id);
    const targetCount = placed.filter((object) => object.isTarget).length;

    if (
      targetCount > bestPlacement.filter((object) => object.isTarget).length
      || (targetCount === expectedTargets && placed.length > bestPlacement.length)
    ) {
      bestPlacement = placed;
    }

    if (targetCount === expectedTargets && placed.length >= minimumVisibleObjects) return placed;
  }

  const safePlacement = createPlacedObjectsAttempt(configs, stage.id, true);
  const safeTargetCount = safePlacement.filter((object) => object.isTarget).length;
  const bestTargetCount = bestPlacement.filter((object) => object.isTarget).length;

  if (
    safeTargetCount === expectedTargets
    && (safePlacement.length >= minimumVisibleObjects || bestTargetCount !== expectedTargets)
  ) {
    return safePlacement;
  }

  return bestPlacement;
}
