# Wonder Trail Asset Replacement Guide

## Current Alpha Assets

### Xiaohang Character

Current game asset:

```text
src/assets/xiaohang-fox.png
```

Backup of the original white-background image:

```text
src/assets/xiaohang-fox-original.png
```

The Alpha uses a processed transparent-background PNG. If a better official character image is created later, replace `xiaohang-fox.png` with the new transparent PNG and keep the same filename.

Recommended format:

- PNG or WebP
- Transparent background
- Full body visible
- Works on light forest background
- At least 1000px tall for mobile sharpness

### Zhuyin Font

Current font asset:

```text
src/assets/BpmfGenSenRounded-R.ttf
src/assets/BpmfGenSenRounded-B.ttf
```

This is used for child-facing Traditional Chinese text with right-side Zhuyin. The Alpha uses Regular for body copy and Bold for headings and primary controls. Before production, consider subsetting or compressing it to reduce mobile loading time.

Backup/previous test font:

```text
src/assets/BpmfIansui-Regular.ttf
```

### Forest Background

Current forest scene asset:

```text
src/assets/forest-hidden-scene.png
```

This is a generated Alpha background based on a hidden-object game composition: visually rich, flatter, more cartoon-like, and closer to Xiaohang's mascot style. It replaces the earlier CSS-only prototype scene.

Main location:

```text
src/styles.css
```

Key selector:

```css
.forest-stage
```

Future replacement options:

1. Replace the CSS scene with a forest background image.
2. Keep the CSS scene and only replace objects.
3. Use layered assets for sky, trees, ground, and foreground.

Recommended format:

- PNG, WebP, or AVIF
- Portrait-friendly composition
- Clear middle area for tappable objects
- Avoid busy details behind targets

### Xiaohang Voice

Current voice configuration:

```text
src/data/voice.ts
```

The Alpha uses free browser/device voices and picks the closest match based on developer-defined preferred names and keywords. This is not shown as a player-facing setting.

### Search Objects

Current Search objects use inline SVG prototypes. These are placeholders and should eventually be replaced by illustrated objects that match the background lighting and art direction.

Object definitions:

```text
src/data/assets.ts
```

When official object art is ready, add image paths to the asset registry and update `SearchObject` rendering in:

```text
src/App.tsx
```
