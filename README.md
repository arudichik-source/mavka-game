# mavka-game

2D browser RPG for Web, Telegram Mini App and Android.

## First playable prototype

The current prototype is built around the selected **Variant 2: a large living region screen** instead of a generic node map.

### Implemented

- `Серце Пущі` as one explorable region screen;
- seven interactive landmarks;
- Mavka-themed HUD, quests, resources and navigation;
- animated ambient world elements;
- `Туманні Болота` opens a playable 2D boss battle;
- five active skills with mana costs, cooldowns and effects;
- wolf companion attack;
- boss counter-attacks;
- HP / mana / boss HP;
- auto-battle toggle;
- victory / defeat flow;
- responsive 16:9 browser layout;
- GitHub Actions build and GitHub Pages deployment workflow.

The first prototype deliberately uses procedural graphics and UI shapes rather than final art assets. This keeps the code immediately runnable while the visual identity, characters and locations are still being designed.

## Stack

- Phaser 4.2.1
- TypeScript 5.9
- Vite 8

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Prototype flow

1. Open `Серце Пущі`.
2. Select any landmark to inspect it.
3. Select **Туманні Болота**.
4. Press **Увійти в бій**.
5. Use the five skills or enable **Автобій**.
6. Win or return to the region.

## Direction

The target is a character-driven 2D RPG inspired by the interaction loop of classic browser/mobile RPGs, while using an original Mavka universe, its characters and locations. Final combat will use authored 2D animation assets; the current vector actors are placeholders for gameplay validation.
