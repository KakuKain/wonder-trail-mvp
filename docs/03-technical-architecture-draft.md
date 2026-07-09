# Wonder Trail Technical Architecture Draft

## 1. Architecture Goals

The MVP architecture should support fast iteration, safe playtesting, and future content expansion.

Primary goals:

- Build one reusable Search mechanic.
- Define stages through data, not hardcoded logic.
- Keep MVP playable without login or network services.
- Record observable events for product iteration.
- Avoid architecture that assumes AI generation, cloud sync, or parent analytics too early.
- Support mobile-first layout for both iPhone and Android, plus Traditional Chinese with right-side Zhuyin for child-facing text.

## 1.1 Typography

Child-facing Zhuyin uses the local BpmfGenSenRounded font asset:

```text
src/assets/BpmfGenSenRounded-R.ttf
src/assets/BpmfGenSenRounded-B.ttf
```

The Alpha applies this font directly to child-facing text so the font handles right-side Zhuyin consistently. Headings and primary controls use Bold; body copy uses Regular. Production should consider subsetting or compressing this font before release.

## 1.2 Voice

The Alpha uses the browser or device's free Web Speech voices.

- Xiaohang's voice is selected by developer preference in `src/data/voice.ts`.
- The app reads available voices from `speechSynthesis.getVoices()`.
- Chinese voices are prioritized when available.
- Voice selection is not exposed to children or parents in the Alpha UI.
- A paid or custom AI TTS voice can be considered after gameplay is validated.

Voice rhythm is handled by a queue engine:

```text
IDLE
↓ player action
FEEDBACK
↓ success / retry
GUIDANCE / REWARD
↓
IDLE
```

Implementation files:

```text
src/lib/voiceEngine.ts
src/data/voiceScripts.ts
src/data/voice.ts
```

Timing rules:

- Immediate feedback should be short and fast.
- Guidance should describe one action only.
- Reward can be more emotional but should stay brief.
- A 300ms to 800ms pause between voice items keeps the rhythm from feeling crowded.

## 2. Recommended MVP Stack

Recommended fast-validation stack:

```text
App framework: React or Next.js
Game rendering: Phaser or PixiJS
Stage data: JSON
Local storage: localStorage or IndexedDB
Analytics: local event queue
Assets: static files
```

If the team strongly prefers a game engine, Unity is possible. For the first MVP, a web stack may be faster for iteration, testing, and deployment.

## 3. System Overview

```text
Game App
├─ App Shell
├─ Story System
├─ Stage Flow Controller
├─ Stage Config Loader
├─ Mechanic Engine
│  └─ Search Mechanic
├─ Reward System
├─ Collection System
├─ Local Save System
├─ Event Logger
└─ Asset Registry
```

## 4. Data-Driven Stage Model

Stages should be defined in JSON. Mechanic code reads the config and renders the experience.

Example:

```json
{
  "id": "forest_search_01",
  "world": "forest",
  "mechanic": "search",
  "difficulty": 1,
  "storyText": "小航 saw a red butterfly near the flowers.",
  "instructionText": "Find the red butterfly.",
  "storyRuby": [
    { "text": "小航", "ruby": "ㄒㄧㄠˇ ㄏㄤˊ" },
    " saw a red butterfly near the flowers."
  ],
  "targets": [
    {
      "assetId": "red_butterfly",
      "count": 1
    }
  ],
  "distractors": [
    {
      "assetId": "leaf",
      "count": 4
    },
    {
      "assetId": "bee",
      "count": 2
    }
  ],
  "layout": {
    "mode": "scatter",
    "safeArea": "stage_default"
  },
  "assist": {
    "hintDelayMs": 15000,
    "maxWrongClicksBeforeHint": 3,
    "hitboxScale": 1.4
  },
  "reward": {
    "stars": 1,
    "stickers": ["red_butterfly"]
  }
}
```

## 5. Suggested Data Types

### StageConfig

```ts
type StageConfig = {
  id: string;
  world: string;
  mechanic: "search";
  difficulty: number;
  storyText: string;
  instructionText: string;
  storyRuby: RubySegment[];
  instructionRuby: RubySegment[];
  targets: TargetConfig[];
  distractors: DistractorConfig[];
  layout: LayoutConfig;
  assist: AssistConfig;
  reward: RewardConfig;
};
```

### TargetConfig

```ts
type TargetConfig = {
  assetId: string;
  count: number;
};
```

### DistractorConfig

```ts
type DistractorConfig = {
  assetId: string;
  count: number;
};
```

### AssistConfig

```ts
type AssistConfig = {
  hintDelayMs: number;
  maxWrongClicksBeforeHint: number;
  hitboxScale: number;
};
```

### RewardConfig

```ts
type RewardConfig = {
  stars: number;
  stickers: string[];
};
```

## 6. Runtime Flow

```text
Load adventure manifest
↓
Load first StageConfig
↓
Load assets for stage
↓
Start stage
↓
Render story prompt
↓
Run mechanic
↓
Track player input
↓
Resolve completion
↓
Grant reward
↓
Save progress
↓
Log events
↓
Load next stage or end adventure
```

## 7. Mechanic Engine

The Mechanic Engine is responsible for selecting and running the correct mechanic implementation.

MVP:

```text
mechanic: "search" → SearchMechanic
```

Future:

```text
mechanic: "memory" → MemoryMechanic
mechanic: "sequence" → SequenceMechanic
mechanic: "pattern" → PatternMechanic
```

The engine should expose a simple interface:

```ts
type MechanicResult = {
  completed: boolean;
  durationMs: number;
  wrongClicks: number;
  hintsUsed: number;
};
```

## 8. Search Mechanic Responsibilities

The Search mechanic should:

- Read targets and distractors from StageConfig.
- Place objects in the stage layout.
- Register click or tap interactions.
- Apply forgiving hitbox scaling.
- Track correct taps.
- Track wrong taps.
- Trigger hints.
- Emit mechanic-level events.
- Return a completion result.

It should not:

- Know about the full adventure sequence.
- Decide long-term difficulty.
- Store global progress directly.
- Contain hardcoded forest-only rules.

## 9. Asset Registry

Assets should be referenced by stable IDs.

Example:

```json
{
  "red_butterfly": {
    "type": "image",
    "src": "/assets/forest/red-butterfly.png",
    "defaultScale": 1,
    "defaultHitboxScale": 1.4
  },
  "leaf": {
    "type": "image",
    "src": "/assets/forest/leaf.png",
    "defaultScale": 1,
    "defaultHitboxScale": 1.2
  }
}
```

Stage configs should reference asset IDs, not file paths.

## 10. Local Save Model

MVP local save can include:

```json
{
  "currentAdventureDay": 1,
  "completedStageIds": ["forest_search_01"],
  "stars": 4,
  "stickers": ["red_butterfly", "apple"],
  "lastPlayedAt": "2026-06-23T00:00:00.000Z"
}
```

Storage options:

- `localStorage` for fastest prototype.
- `IndexedDB` if event logs or asset-related data become larger.

## 11. Event Logger

The Event Logger should record factual gameplay events.

Minimum event names:

```text
session_start
session_end
stage_start
stage_finish
wrong_click
hint_show
reward_claimed
stage_exit
```

Base event shape:

```ts
type GameEvent = {
  event: string;
  sessionId: string;
  stageId?: string;
  timestamp: number;
  payload?: Record<string, unknown>;
};
```

Example:

```json
{
  "event": "wrong_click",
  "sessionId": "local-session-001",
  "stageId": "forest_search_03",
  "timestamp": 1782192000000,
  "payload": {
    "clickedAssetId": "leaf",
    "targetAssetIds": ["fox_footprint"]
  }
}
```

## 12. Difficulty and Assist Rules

MVP difficulty should be implemented through deterministic rules.

Possible local rules:

- If wrong clicks exceed threshold, show hint.
- If stage duration exceeds threshold, show hint.
- If player repeatedly struggles, increase hitbox scale for the current stage.
- If player finishes very quickly, do not necessarily increase difficulty immediately.

Avoid aggressive difficulty scaling in the MVP. Early playtests should prioritize clarity and success.

## 13. Suggested File Structure

If using a React or Next.js project:

```text
src/
├─ app/
├─ game/
│  ├─ engine/
│  ├─ mechanics/
│  │  └─ search/
│  ├─ stages/
│  ├─ rewards/
│  ├─ story/
│  ├─ storage/
│  └─ events/
├─ data/
│  ├─ adventures/
│  ├─ stages/
│  └─ assets/
└─ assets/
   └─ forest/
```

## 14. Testing Strategy

### Unit Tests

- Stage config validation
- Reward calculation
- Local save read and write
- Event payload creation
- Search mechanic completion rules

### Integration Tests

- Load adventure manifest and first stage.
- Complete a stage and receive reward.
- Persist progress and reload.
- Log expected events during a stage.

### Manual Playtest QA

- Touch targets feel large enough.
- Layout works on iPhone Safari.
- Layout works on Android Chrome.
- Wrong taps are gentle.
- Hints appear when stuck.
- Session ends naturally.
- No screen shows rankings, scores, or ability labels.

## 15. Technical Milestones

### Milestone 1: Playable Prototype

- App shell
- Static forest scene
- Search mechanic
- 3 config-driven stages
- Correct and wrong tap feedback

### Milestone 2: MVP Adventure

- 10 to 15 stage configs
- Stage flow controller
- 小航 story prompts
- Stars and stickers
- Local save
- Event logger

### Milestone 3: Playtest Build

- Exportable local event logs
- Basic playtest reset function
- Tuned hitboxes
- Tuned hints
- Full 10 to 15 minute flow

## 16. Future Extension Points

Future features should extend the same architecture:

- New worlds through new asset sets and stage configs.
- New mechanics through additional mechanic implementations.
- AI-generated content through StageConfig generation.
- Parent mode through aggregated factual events.
- Cloud sync through replacing local save adapters.

The MVP should keep these paths possible without building them too early.
