# Wonder Trail GDD Lite

## 1. Game Overview

Wonder Trail is a short daily adventure game for children ages 4 to 8. In the MVP, the player joins 小航 in a forest to search for hidden objects, collect stars and stickers, and complete a gentle story.

The first version is intentionally small:

- One world
- One character
- One mechanic
- One short adventure loop

The goal is to prove that the game feels fun, understandable, and emotionally inviting.

## 2. Player Experience Goals

The child should feel:

- "I know what to do."
- "I can do it."
- "小航 is happy I helped."
- "I found something special."
- "I want to come back tomorrow."

The game should not feel like a test, lesson, or training task.

## 3. World

### Forest

The MVP world is a friendly forest with soft colors, clear shapes, and playful objects.

Forest elements may include:

- Trees
- Leaves
- Flowers
- Mushrooms
- Butterflies
- Bees
- Footprints
- Acorns
- Stones
- Hidden stars
- A small fox den

The forest should feel safe, warm, and discoverable.

## 4. Main Character

### 小航

小航 is the player's guide and companion. Across products, 小航 keeps the same core identity: a nimble fox who helps the user navigate decisions with warmth and friendliness.

Role:

- Introduces the daily adventure
- Gives simple goals
- Celebrates success
- Offers hints
- Ends the adventure gently

Cross-product role:

- In the finance product, 小航 is the user's financial navigator.
- In Wonder Trail, 小航 becomes the child's adventure navigator.
- The shared personality should remain warm, approachable, and concise.

Personality:

- Nimble
- Curious
- Warm
- Friendly
- Encouraging
- Slightly playful
- Never critical

Voice rules:

- Use one clear sentence for suggestions or hints whenever possible.
- Keep the tone warm and approachable.
- Avoid lecturing, judging, or over-explaining.
- For child-facing text, use the BpmfIansui font so Traditional Chinese displays with consistent right-side Zhuyin.

Example lines:

```text
我看到花旁邊有亮亮的東西。
你可以幫小航找到紅蝴蝶嗎？
你找到了，真棒！
小航把貼紙放進森林書。
今天的冒險完成了，明天再一起出發。
```

## 5. Core Mechanic: Search

### Mechanic Summary

The player is asked to find one or more target objects within a scene. The scene also contains distractors. The child taps objects to select them.

### Interaction Rules

- Correct target: success feedback and progress toward completion.
- Incorrect target: gentle response, no harsh error state.
- Repeated wrong taps: optional hint appears.
- Tap nearby target: still counts if inside expanded hitbox.
- Final target found: stage completes and reward sequence begins.

### Design Intent

Search supports observation and goal-directed attention, but it should be presented only as exploration and helping 小航.

## 6. Stage Structure

Each stage follows this pattern:

```text
Brief story prompt
↓
Target reveal
↓
Search scene
↓
Correct selection feedback
↓
Reward
↓
Transition
```

Target stage length: 30 to 90 seconds.

## 7. Stage List Draft

### Stage 1: Red Butterfly

Goal: Find 1 red butterfly.

Purpose: Teach basic tap interaction.

Difficulty: Very easy.

### Stage 2: Forest Apples

Goal: Find 2 apples.

Purpose: Introduce multiple targets.

Difficulty: Easy.

### Stage 3: Little Footprints

Goal: Find fox footprints near leaves.

Purpose: Add light visual search.

Difficulty: Easy.

### Stage 4: Shiny Star

Goal: Find 1 hidden star.

Purpose: Introduce treasure discovery.

Difficulty: Easy.

### Stage 5: Butterfly Colors

Goal: Find 3 butterflies that match the shown color.

Purpose: Add target matching.

Difficulty: Medium-low.

### Stage 6: Acorn Hunt

Goal: Find 3 acorns among leaves and mushrooms.

Purpose: Increase distractors.

Difficulty: Medium-low.

### Stage 7: Bee Careful

Goal: Find flowers while bees are present as distractors.

Purpose: Practice ignoring similar or nearby objects.

Difficulty: Medium.

### Stage 8: Listen to 小航

Goal: Find the object 小航 describes.

Purpose: Add instruction-following.

Difficulty: Medium.

### Stage 9: Matching Treasure

Goal: Find the object that matches a picture prompt.

Purpose: Add visual matching.

Difficulty: Medium.

### Stage 10: Forest Treasure Box

Goal: Find the final hidden treasure box.

Purpose: End the story with a satisfying reward.

Difficulty: Medium but forgiving.

## 8. Difficulty Rules

The MVP uses rule-based difficulty.

Inputs:

- Completion time
- Wrong click count
- Hint usage
- Stage exits

Adjustable parameters:

- Number of distractors
- Target size
- Hitbox size
- Visual contrast
- Hint delay
- Number of required targets

MVP difficulty should be conservative. The first version should favor success over challenge.

## 9. Pacing

The adventure should alternate between active challenge and emotional release.

Recommended rhythm:

```text
Story
↓
Easy search
↓
Reward
↓
Slightly harder search
↓
Sticker moment
↓
Relaxed search
↓
Final treasure
↓
Ending
```

Avoid stacking several high-difficulty stages in a row.

## 10. Feedback Design

### Correct Tap

Feedback may include:

- Object glow
- Soft pop animation
- Star sparkle
- 小航 celebration line
- Gentle success sound

### Wrong Tap

Feedback may include:

- Small shake
- Soft "try again" sound
- 小航 hint after repeated mistakes

Avoid:

- Red error screens
- Buzzers
- Failure labels
- Losing points

## 11. Hint Design

Hints should feel like help from 小航, not correction.

Hint examples:

- Target wiggles slightly.
- A soft glow appears near the target area.
- 小航 says, "Maybe near the flowers?"
- The scene dims distractors very slightly.

Hint trigger draft:

- First hint after 15 seconds without progress.
- Stronger hint after 2 or 3 wrong taps.
- Automatic hint if child appears stuck.

## 12. Reward Design

### Stars

Stars are immediate completion rewards.

Purpose:

- Show progress
- Create satisfying closure
- Support stage-by-stage feedback

### Stickers

Stickers are collectible objects.

Purpose:

- Encourage emotional attachment
- Let children remember the adventure
- Support return motivation

Sticker examples:

- Red butterfly
- Apple
- Fox paw
- Shiny star
- Acorn
- Treasure box

## 13. Collection Screen

The MVP can use a simple forest book or sticker board.

Requirements:

- Shows collected stickers
- Keeps locked stickers visible but not frustrating
- Uses large tappable sticker items
- Avoids complex menus

Optional:

- Child can place stickers in a small forest scene.

## 14. Narrative Arc

MVP story:

小航 is preparing a small forest celebration. Some forest treasures are missing, and the player helps find them. Each completed stage brings the forest closer to being ready. At the end, 小航 finds the treasure box and thanks the player.

Simple story beats:

1. 小航 invites the player into the forest.
2. The player learns to find objects.
3. The player collects useful forest items.
4. The player discovers shiny stars.
5. The player helps 小航 find the final treasure.
6. The adventure ends with a sticker reward and tomorrow invitation.

## 15. Content Guidelines

- Use short sentences.
- Prefer one-sentence hints or suggestions.
- Prefer concrete object names.
- Avoid educational labels.
- Avoid abstract scoring.
- Avoid performance comparison.
- Keep all feedback warm and factual.

Good:

```text
你找到蘋果了！
小航把蘋果放進籃子。
```

Avoid:

```text
Your attention score improved.
You made too many mistakes.
```

## 16. MVP Playtest Checklist

During playtests, observe:

- Does the child understand what to tap?
- Does the child need adult explanation?
- Which objects are confusing?
- Which rewards create excitement?
- Does the child notice 小航?
- Does the child want to continue after stage 3?
- Does the child finish the adventure?
- Does the child ask to play again?

Record observations alongside event data.

## 17. Confirmed Presentation Decisions

- Primary device: mobile phone, supporting both iPhone and Android.
- Language: Traditional Chinese with right-side Zhuyin for child-facing text.
- Guide character: 小航, based on the provided explorer fox reference image.
