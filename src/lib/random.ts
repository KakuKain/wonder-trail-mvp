/** Small deterministic helpers for per-round variation without changing on every render. */
function seedFrom(value: number | string) {
  if (typeof value === "number") return Math.floor(value) >>> 0;
  return Array.from(value).reduce(
    (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
}

export function createSeededRandom(seed: number | string) {
  let state = seedFrom(seed);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: number | string) {
  const next = [...items];
  const random = createSeededRandom(seed);
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}
