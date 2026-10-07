# mavka-game

**Mavka: Legends of the Forest** is a browser-first 2D RPG built for Web, future Telegram Mini App packaging, and future Android packaging.

## Current release: v0.5.0

This branch contains a complete playable **Chapter I vertical slice**:

- title screen and auto-save;
- illustrated **Heart of the Forest** region;
- seven interactive locations;
- quests with claimable rewards;
- Old Oak blessing;
- Hunter expedition;
- Old Mill supplies;
- inventory / equipment upgrades;
- health potions and mana Ether;
- three swamp encounters;
- full boss fight against the Swamp Guardian;
- five combat skills with cooldowns;
- wolf companion scaling;
- armor damage reduction;
- auto-battle;
- XP and level progression;
- achievements and bestiary statistics;
- persistent local progression;
- Chapter I completion state;
- responsive 16:9 desktop/mobile presentation;
- browser runtime smoke test in CI;
- automatic GitHub Pages deployment from `main`.

## Stack

- Phaser 4.2.1
- TypeScript 5.9
- Vite 8
- Playwright Core runtime smoke test

## Run locally

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run build
npm run preview -- --host 127.0.0.1
npm run test:runtime
```

## Play loop

Explore **Heart of the Forest** → complete the Oak, Hunter and Mill objectives → improve Mavka, armor, staff and wolf → fight through the Misty Swamps → defeat the Swamp Guardian → claim the story rewards → complete Chapter I.
