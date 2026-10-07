export type QuestId = 'oak' | 'hunter' | 'mill' | 'swamp';

export type GameState = {
  version: 2;
  level: number;
  xp: number;
  coins: number;
  crystals: number;
  herbs: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  potions: number;
  ether: number;
  weaponLevel: number;
  armorLevel: number;
  wolfLevel: number;
  bossWins: number;
  battlesWon: number;
  locationsVisited: string[];
  quests: Record<QuestId, number>;
  claimedQuests: QuestId[];
  storyFlags: string[];
  lastBlessing: string;
};

const STORAGE_KEY = 'mavka-game-save-v2';

export const defaultState = (): GameState => ({
  version: 2,
  level: 5,
  xp: 0,
  coins: 12450,
  crystals: 36,
  herbs: 128,
  hp: 520,
  maxHp: 520,
  mana: 180,
  maxMana: 180,
  potions: 3,
  ether: 1,
  weaponLevel: 1,
  armorLevel: 1,
  wolfLevel: 1,
  bossWins: 0,
  battlesWon: 0,
  locationsVisited: ['settlement'],
  quests: { oak: 0, hunter: 0, mill: 0, swamp: 0 },
  claimedQuests: [],
  storyFlags: [],
  lastBlessing: ''
});

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.version !== 2) return defaultState();
    return {
      ...defaultState(),
      ...parsed,
      quests: { ...defaultState().quests, ...(parsed.quests ?? {}) },
      claimedQuests: Array.isArray(parsed.claimedQuests) ? parsed.claimedQuests : [],
      storyFlags: Array.isArray(parsed.storyFlags) ? parsed.storyFlags : [],
      locationsVisited: Array.isArray(parsed.locationsVisited) ? parsed.locationsVisited : ['settlement']
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): GameState {
  const state = defaultState();
  saveState(state);
  return state;
}

export function visit(state: GameState, key: string): void {
  if (!state.locationsVisited.includes(key)) state.locationsVisited.push(key);
}

export function xpNeeded(level: number): number {
  return 450 + level * 140;
}

export function gainXp(state: GameState, amount: number): number {
  state.xp += amount;
  let gained = 0;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level += 1;
    gained += 1;
    state.maxHp += 35;
    state.maxMana += 10;
    state.hp = state.maxHp;
    state.mana = state.maxMana;
  }
  return gained;
}

export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
