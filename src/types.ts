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
  imageAssetId: string;
  word: string;
  wordRuby: string;
  answer: string[];
  choices: string[];
};

export type ZhuyinLevelId = "listen" | "initial" | "syllable" | "word";

export type ZhuyinLevelConfig = {
  id: ZhuyinLevelId;
  title: string;
  shortDescription: string;
  ageLabel: string;
  icon: string;
};

export type MarketOrderLine = {
  assetId: string;
  count: number;
};

export type MarketDifficultyId = "beginner" | "intermediate" | "advanced" | "boss";
export type MarketQuestionMode = "number-recognition" | "addition" | "multi-addition" | "challenge";
export type MarketCustomerId = "rabbit" | "deer" | "squirrel" | "bear" | "lamb" | "cat" | "beaver" | "dog" | "fox" | "owl";

export type MarketCustomerConfig = {
  id: MarketCustomerId;
  name: string;
  ruby: string;
  image: string;
  imageAlt: string;
};

export type MarketDifficultyConfig = {
  id: MarketDifficultyId;
  label: string;
  shortLabel: string;
  ageLabel: string;
  skillLabel: string;
  questionMode: MarketQuestionMode;
  unlockAfter?: MarketDifficultyId;
};

export type MarketChallengeConfig = {
  id: string;
  difficulty: MarketDifficultyId;
  customerName: string;
  customerRuby: string;
  requestText: string;
  requestRuby: RubySegment[];
  order: MarketOrderLine[];
  prices: Record<string, number>;
};

export type MarketPuzzleConfig = {
  currencyIntroText: string;
  currencyIntroRuby: RubySegment[];
  difficulties: MarketDifficultyConfig[];
  challenges: MarketChallengeConfig[];
};

export type MarketProgress = {
  completedChallengeIds: string[];
  completedDifficulties: MarketDifficultyId[];
  activeDifficulty: MarketDifficultyId;
  nextChallengeByDifficulty: Partial<Record<MarketDifficultyId, number>>;
};

export type StageConfig = {
  id: string;
  world: "forest" | "market" | "school";
  mechanic: "search" | "market" | "zhuyin";
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
  zhuyinPuzzles?: ZhuyinPuzzleConfig[];
  marketPuzzle?: MarketPuzzleConfig;
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
  version: number;
  completedStageIds: string[];
  stars: number;
  stickers: string[];
  marketProgress: MarketProgress;
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
    | "chapter_complete"
    | "stage_exit"
    | "progress_reset";
  sessionId: string;
  stageId?: string;
  timestamp: number;
  payload?: Record<string, unknown>;
};
