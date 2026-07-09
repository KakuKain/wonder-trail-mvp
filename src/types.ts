export type AssetKind =
  | "butterfly"
  | "apple"
  | "leaf"
  | "bee"
  | "footprint"
  | "pinecone"
  | "flower"
  | "acorn"
  | "mushroom"
  | "treasure";

export type AssetDefinition = {
  id: string;
  label: string;
  kind: AssetKind;
  color: string;
  accent: string;
  emoji: string;
  defaultHitboxScale: number;
};

export type StageObjectConfig = {
  assetId: string;
  count: number;
};

export type RubySegment = string | {
  text: string;
  ruby: string;
};

export type AssistConfig = {
  hintDelayMs: number;
  maxWrongClicksBeforeHint: number;
  hitboxScale: number;
};

export type RewardConfig = {
  stars: number;
  stickers: string[];
};

export type ZhuyinPuzzleConfig = {
  word: string;
  wordRuby: string;
  answer: string[];
  choices: string[];
};

export type StageConfig = {
  id: string;
  world: "forest";
  mechanic: "search" | "zhuyin";
  difficulty: number;
  storyText: string;
  instructionText: string;
  storyRuby: RubySegment[];
  instructionRuby: RubySegment[];
  targetLabel?: string;
  targetRuby?: string;
  targets?: StageObjectConfig[];
  distractors?: StageObjectConfig[];
  zhuyinPuzzle?: ZhuyinPuzzleConfig;
  assist: AssistConfig;
  reward: RewardConfig;
};

export type PlacedObject = {
  instanceId: string;
  assetId: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  flipX: boolean;
  opacity: number;
  isTarget: boolean;
  found: boolean;
};

export type SaveData = {
  completedStageIds: string[];
  stars: number;
  stickers: string[];
  lastPlayedAt?: string;
};

export type GameEvent = {
  event:
    | "session_start"
    | "session_end"
    | "stage_start"
    | "stage_finish"
    | "wrong_click"
    | "hint_show"
    | "reward_claimed"
    | "stage_exit"
    | "progress_reset";
  sessionId: string;
  stageId?: string;
  timestamp: number;
  payload?: Record<string, unknown>;
};
