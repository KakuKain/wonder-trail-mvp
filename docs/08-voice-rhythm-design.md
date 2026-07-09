# Wonder Trail Voice Rhythm Design

## Core Principle

Xiaohang's voice should feel responsive, warm, and brief.

The goal is not to talk more. The goal is:

> Respond fast, mark emotion clearly, and give only one instruction at a time.

## Interaction Loop

```text
IDLE
↓ player action
FEEDBACK
↓ success / retry
GUIDANCE / REWARD
↓
IDLE
```

## Voice Types

### Immediate Feedback

Use after taps or quick actions.

Examples:

```text
好棒！
收到！
有喔！
```

Timing:

- Start within 0.1 to 0.5 seconds.
- Keep under 1.5 seconds.

### Guidance

Use when the child needs to know what to do next.

Examples:

```text
找到紅蝴蝶。
點亮亮的星星。
小航提示：找到森林寶箱。
```

Rules:

- One action.
- One target.
- No multi-step explanation.

### Soft Correction

Use after wrong taps.

Examples:

```text
差一點點喔。
沒關係，再試一次。
我們再找找看。
```

Rules:

- Never blame the child.
- Keep the pressure low.
- Avoid failure language.

### Reward

Use after completing a stage.

Examples:

```text
你做到了耶！
完成囉，太棒了！
小航看到寶物了！
```

Rules:

- More emotional than guidance.
- Still brief.
- Avoid long explanation.

## Engineering Notes

Current implementation:

```text
src/lib/voiceEngine.ts
src/data/voiceScripts.ts
src/data/voice.ts
```

The voice engine:

- Queues speech items.
- Supports tone settings.
- Adds a pause between items.
- Allows interruption for immediate feedback.
- Uses free system voices through Web Speech API.

## Current Tone Settings

| Tone | Use | Feel |
| --- | --- | --- |
| neutral | Guidance | Clear and calm |
| positive | Success and reward | Warmer and brighter |
| soft | Wrong tap | Gentle and low-pressure |

## Future Upgrade

If Wonder Trail needs a fixed Xiaohang voice across iPhone and Android, use AI TTS or recorded voice assets after gameplay is validated.
