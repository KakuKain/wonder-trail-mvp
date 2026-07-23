# Wonder Trail MVP PRD

## 1. Product Summary

**Product name:** Wonder Trail

**Tagline:** Every adventure is a chance to grow.

Wonder Trail is a short-session exploration adventure game for children ages 4 to 8. The MVP focuses on one forest adventure with one guide character, 小航, one reusable mechanic, and a complete daily play loop.

The product is not positioned as a training app, assessment tool, or educational dashboard. Children experience it as an adventure world. Parents experience it as a safe, gentle, bounded play experience.

## 2. Product Vision

Build a world that children want to return to every day.

Children should feel that they are exploring, helping characters, finding treasures, and decorating their own little world. Cognitive practice is embedded inside play, but the player-facing experience is story, discovery, and success.

## 3. Product Principles

1. **Game first, teaching second:** If a feature is not fun, it should not be added only because it has educational value.
2. **Facts over inference:** The system records observable gameplay data, not diagnoses or ability scores.
3. **Success before frustration:** Children should experience success first, then gradually meet challenge.
4. **Story before feature:** Players should feel they are on an adventure, not switching between mini-games.
5. **Data-driven iteration:** Product changes should be guided by player behavior, not assumptions alone.

## 4. Target Users

### Primary User

Children ages 4 to 8.

Needs:

- Clear goals
- Simple touch interactions
- Immediate feedback
- Warm characters
- Short sessions
- A sense of achievement

### Secondary User

Parents or caregivers.

Needs:

- Confidence that the game is age-appropriate
- A play experience that does not encourage endless use
- Simple factual summaries
- No exaggerated claims about ability improvement

## 5. MVP Goal

Validate whether the core adventure loop is engaging enough for children to complete a short, 5 to 8 minute session and want to return another day.

The MVP should answer:

1. Do children understand the Search mechanic quickly?
2. Do children enjoy helping 小航 in the forest?
3. Do children complete the daily adventure?
4. Which stages cause exits, retries, or visible frustration?
5. Which rewards or characters create the strongest positive reaction?
6. Can new stages be created through configuration without changing mechanic code?

## 6. MVP Scope

### Included

- One world: Forest
- One guide character: 小航
- One mechanic: Search
- Five short Search stages
- One short story arc
- Basic rewards: stars and stickers
- Simple collection screen
- Mobile-first layout for both iPhone and Android phones
- Traditional Chinese with right-side Zhuyin for child-facing text
- Local progress storage
- Basic event logging
- Natural session ending after the daily adventure

### Excluded

- Login
- Cloud sync
- AI-generated stages
- Parent analytics dashboard
- Multiple worlds
- Multiple playable characters
- Store or monetization
- Leaderboards
- Ability scoring
- Diagnostic reports
- Social features

## 7. Core Gameplay Loop

```text
Open game
↓
Meet 小航
↓
Start today's forest adventure
↓
Explore
↓
Complete Search challenges
↓
Earn stars and stickers
↓
Decorate or view collection
↓
Story ends naturally
↓
Return tomorrow
```

Target session length: 5 to 8 minutes. This replaces the earlier 10 to 15 minute assumption after child playtesting showed that a ten-stage session felt too long.

The MVP should avoid infinite play. The story should provide a gentle stopping point.

## 8. MVP User Stories

### Child Player

- As a child, I want to know what to find so I can help 小航.
- As a child, I want to tap objects easily so I feel successful.
- As a child, I want fun sounds and animations when I find something.
- As a child, I want to collect stars and stickers so I feel rewarded.
- As a child, I want to see what I collected so I feel proud.
- As a child, I want tomorrow's adventure to feel inviting.

### Parent

- As a parent, I want the session to end naturally so playtime does not become endless.
- As a parent, I want the game to avoid ability claims or rankings.
- As a parent, I want simple factual activity information when parent mode is eventually added.

### Developer

- As a developer, I want stages to be defined by JSON config so I can add content without rewriting mechanics.
- As a developer, I want consistent events so I can identify difficult or boring stages.
- As a developer, I want mechanic code to be reusable across future themes.

## 9. Functional Requirements

### Stage Flow

- The game can load a sequence of configured stages.
- Each stage displays a clear goal.
- Each stage has one or more target objects.
- Each stage includes distractor objects.
- The player can complete a stage by finding all required targets.
- The game advances to the next stage after reward feedback.
- The final stage ends the daily adventure.

### Search Mechanic

- The mechanic renders target and distractor objects.
- The player taps or clicks objects to select them.
- Correct selections trigger success feedback.
- Incorrect selections trigger gentle feedback without punishment.
- Targets use forgiving hitboxes.
- Optional hint behavior can highlight or nudge the target.

### Rewards

- Completing a stage grants stars.
- Selected stages may grant stickers.
- Rewards are shown immediately after completion.
- The player can view collected stickers.

### Local Progress

- The game stores completed stages locally.
- The game stores collected stars and stickers locally.
- The game can resume basic progress after reopening.

### Event Logging

- The game records gameplay events locally.
- Events should be exportable or inspectable during playtesting.
- Event data should not contain ability labels or diagnostic conclusions.

## 10. Non-Functional Requirements

- Touch targets must be large enough for 4-year-old players.
- UI text must be short and easy to understand.
- Child-facing Traditional Chinese text should include right-side Zhuyin.
- Visual hierarchy must make targets and goals clear.
- A stage should usually take 30 to 90 seconds.
- The app should run smoothly on common iPhone and Android mobile browsers during testing.
- The MVP should work without login or network dependency.

## 11. Success Metrics

### Primary Metrics

- Session duration: child can complete the five-stage adventure in roughly 5 to 8 minutes without it feeling too long.
- Return intent: child says or shows interest in playing again.
- Completion rate: child completes the daily adventure.

### Diagnostic Product Metrics

- Stage start count
- Stage finish count
- Stage exit count
- Wrong click count
- Hint usage
- Time to completion
- Reward claimed count

### Qualitative Signals

- Child smiles, laughs, or verbally reacts to 小航.
- Child recognizes or remembers collected stickers.
- Child asks to replay or continue tomorrow.
- Child needs little adult explanation after the first stage.

## 12. Event Taxonomy

Minimum MVP events:

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

Example event payload:

```json
{
  "event": "stage_finish",
  "sessionId": "local-session-id",
  "stageId": "forest_search_01",
  "durationMs": 42000,
  "wrongClicks": 1,
  "hintsUsed": 0,
  "difficulty": 1,
  "timestamp": 1782192000000
}
```

## 13. Acceptance Criteria

The MVP is acceptable when:

1. A child can complete a full forest adventure from start to finish.
2. The five-stage experience lasts roughly 5 to 8 minutes and provides a natural stopping point.
3. Five Search stages can be loaded from config.
4. Rewards persist locally after closing and reopening.
5. Basic events are recorded for each stage.
6. The final screen gives a clear and gentle ending.
7. No UI presents scores, rankings, diagnoses, or claims of improvement.

## 14. Open Questions

1. Should the MVP be tested first on desktop browser, tablet browser, or mobile browser?
2. Should voice narration be included in MVP, or should it wait until after playtesting?
3. Should the sticker collection be purely visual, or should children place stickers into a small forest scene?
4. How many children are needed for the first meaningful playtest round?
5. What is the minimum visual quality needed before testing with children?
