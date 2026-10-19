import * as Phaser from 'phaser';
import './styles.css';
import { ATLAS_DATA_URI, FRAME_HEIGHT, FRAME_WIDTH } from './art/atlas';
import {
  GameState,
  QuestId,
  gainXp,
  loadState,
  resetState,
  saveState,
  todayKey,
  visit,
  xpNeeded
} from './game/state';

const W = 1280;
const H = 720;
const GOLD = 0xd8ad55;
const GOLD_LIGHT = '#f4dda1';
const CREAM = '#f7edd2';
const MUTED = '#c7b99a';
const PANEL = 0x08110f;
const GREEN = 0x62c98a;
const CYAN = 0x61d1dc;
const RED = 0xc84f45;
const ART_SCALE = 1.5;
const ART_W = Math.round(W * ART_SCALE);
const ART_H = Math.round(H * ART_SCALE);

let state: GameState = loadState();

const ACHIEVEMENT_NAMES: Record<string, string> = {
  first_step: 'Перший крок',
  first_blood: 'Перша перемога',
  swamp_hunter: 'Мисливиця Боліт',
  guardian: 'Очищення Пущі',
  upgrader: 'Майстриня спорядження',
  chapter_one: 'Берегиня Серця Пущі'
};

function unlockAchievement(id: string): boolean {
  if (state.achievements.includes(id)) return false;
  state.achievements.push(id);
  saveState(state);
  return true;
}

function refreshChapterCompletion(): boolean {
  const required: QuestId[] = ['oak', 'hunter', 'mill', 'swamp'];
  const complete = required.every(id => state.claimedQuests.includes(id));
  const newlyCompleted = complete && !state.chapterComplete;
  state.chapterComplete = complete;
  if (newlyCompleted) unlockAchievement('chapter_one');
  saveState(state);
  return newlyCompleted;
}

type ActionButton = {
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

function gameText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 20,
  color = CREAM,
  originX = 0
) {
  return scene.add.text(x, y, value, {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: `${size}px`,
    color,
    stroke: '#030806',
    strokeThickness: size >= 24 ? 4 : 2
  }).setOrigin(originX, 0.5);
}

function uiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 16,
  color = CREAM,
  originX = 0
) {
  return scene.add.text(x, y, value, {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: `${size}px`,
    fontStyle: size >= 20 ? '600' : '500',
    color,
    wordWrap: { width: 520 }
  }).setOrigin(originX, 0.5);
}

function ornatePanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.96) {
  const shadow = scene.add.rectangle(x + 6, y + 8, w, h, 0x000000, 0.48);
  const outer = scene.add.rectangle(x, y, w, h, PANEL, alpha).setStrokeStyle(2, GOLD, 0.92);
  const inner = scene.add.rectangle(x, y, w - 12, h - 12, 0x101c17, 0.25).setStrokeStyle(1, 0xf0d28a, 0.24);
  return [shadow, outer, inner];
}

function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  accent = GOLD
): ActionButton {
  const box = scene.add.rectangle(x, y, w, h, 0x10231b, 0.96)
    .setStrokeStyle(2, accent, 0.92)
    .setInteractive({ useHandCursor: true });
  const t = uiText(scene, x, y, label, 18, '#f6ecd2', 0.5);
  box.on('pointerover', () => {
    box.setFillStyle(accent, 0.24);
    box.setScale(1.02);
  });
  box.on('pointerout', () => {
    box.setFillStyle(0x10231b, 0.96);
    box.setScale(1);
  });
  box.on('pointerdown', onClick);
  return { box, label: t };
}

function background(scene: Phaser.Scene, key: 'region-bg' | 'battle-bg') {
  return scene.add.image(W / 2, H / 2, key).setDisplaySize(W, H).setDepth(-20);
}

class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    this.load.image('visual-atlas', ATLAS_DATA_URI);
  }

  create() {
    const source = this.textures.get('visual-atlas').getSourceImage() as HTMLImageElement;
    const makeFrame = (key: string, sy: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = ART_W;
      canvas.height = ART_H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D unavailable');

      // Supersample the compact concept art, then use restrained edge-aware
      // micro-contrast. This avoids the smeared look without creating blocky pixels.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = 'contrast(1.075) saturate(1.035) brightness(1.015)';
      ctx.drawImage(source, 0, sy, FRAME_WIDTH, FRAME_HEIGHT, 0, 0, ART_W, ART_H);
      ctx.filter = 'none';

      ctx.save();
      ctx.globalAlpha = 0.045;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, 0, sy, FRAME_WIDTH, FRAME_HEIGHT, 0, 0, ART_W, ART_H);
      ctx.restore();

      const image = ctx.getImageData(0, 0, ART_W, ART_H);
      const src = image.data;
      const out = new Uint8ClampedArray(src);
      for (let y = 1; y < ART_H - 1; y++) {
        for (let x = 1; x < ART_W - 1; x++) {
          const i = (y * ART_W + x) * 4;
          const left = i - 4;
          const right = i + 4;
          const up = i - ART_W * 4;
          const down = i + ART_W * 4;
          for (let channel = 0; channel < 3; channel++) {
            const center = src[i + channel];
            const avg = (src[left + channel] + src[right + channel] + src[up + channel] + src[down + channel]) * 0.25;
            const diff = center - avg;
            const boost = Phaser.Math.Clamp(diff * (Math.abs(diff) > 6 ? 0.28 : 0.12), -16, 16);
            out[i + channel] = Phaser.Math.Clamp(Math.round(center + boost), 0, 255);
          }
        }
      }
      image.data.set(out);
      ctx.putImageData(image, 0, 0);
      this.textures.addCanvas(key, canvas);
    };
    makeFrame('region-bg', 0);
    makeFrame('battle-bg', FRAME_HEIGHT);
    this.scene.start('title');
  }
}

class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    background(this, 'region-bg');
    this.add.rectangle(W / 2, H / 2, W, H, 0x020806, 0.48);
    this.add.rectangle(250, H / 2, 500, H, 0x020806, 0.7);

    gameText(this, 70, 150, 'МАВКА', 72, '#f0d28d');
    gameText(this, 74, 210, 'ЛЕГЕНДИ ПУЩІ', 25, '#d8c6a0');
    uiText(this, 75, 260, '2D RPG • жива Пуща • тактичні бої', 16, '#c8d8cd');

    button(this, 200, 360, 270, 56, 'Продовжити', () => this.scene.start('region'), 0x73c992);
    button(this, 200, 430, 270, 52, 'Нова гра', () => this.confirmNewGame());
    button(this, 200, 495, 270, 52, 'Про гру', () => this.showAbout());

    const progress = state.chapterComplete
      ? 'Розділ I завершено • Серце Пущі очищено'
      : `Рівень ${state.level} • боїв: ${state.battlesWon} • досягнень: ${state.achievements.length}`;
    uiText(this, 74, 585, progress, 14, state.chapterComplete ? '#9fe2ae' : '#cbbd9c');

    uiText(this, 74, 645, 'Збереження відбувається автоматично', 14, '#aeb9af');
    uiText(this, 74, 670, 'Web • Telegram-ready architecture • Android-ready', 13, '#7d9187');
  }

  private confirmNewGame() {
    const modal = this.add.container(0, 0).setDepth(100);
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive();
    const parts = ornatePanel(this, W / 2, H / 2, 520, 280);
    const title = gameText(this, W / 2, 285, 'Почати нову подорож?', 28, GOLD_LIGHT, 0.5);
    const body = uiText(this, W / 2, 345, 'Поточний локальний прогрес буде замінено.', 16, '#d5cbb5', 0.5);
    const yes = button(this, 555, 420, 190, 48, 'Нова гра', () => {
      state = resetState();
      this.scene.start('region');
    }, 0x68b684);
    const no = button(this, 760, 420, 190, 48, 'Скасувати', () => modal.destroy(true), 0xa17d4b);
    modal.add([shade, ...parts, title, body, yes.box, yes.label, no.box, no.label]);
  }

  private showAbout() {
    const modal = this.add.container(0, 0).setDepth(100);
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive();
    const parts = ornatePanel(this, W / 2, H / 2, 650, 360);
    const title = gameText(this, W / 2, 250, 'Мавка: Легенди Пущі', 30, GOLD_LIGHT, 0.5);
    const body = uiText(
      this,
      W / 2,
      355,
      'Пригодницька 2D RPG про Берегиню Пущі. Досліджуй живі регіони, виконуй завдання, збирай спорядження та очищуй землі від скверни. Прогрес зберігається у браузері.',
      17,
      '#d9d2c2',
      0.5
    ).setWordWrapWidth(540).setAlign('center');
    const close = button(this, W / 2, 475, 210, 48, 'Закрити', () => modal.destroy(true));
    modal.add([shade, ...parts, title, body, close.box, close.label]);
  }
}

type Landmark = {
  id: string;
  name: string;
  subtitle: string;
  markerX: number;
  markerY: number;
  markerSize: number;
  labelX: number;
  labelY: number;
  labelW: number;
  labelH: number;
  worldX: number;
  worldY: number;
  worldW: number;
  worldH: number;
};

const LANDMARKS: Landmark[] = [
  { id: 'settlement', name: 'Поселення Мавки', subtitle: 'Табір, лікування та припаси', markerX: 104, markerY: 292, markerSize: 58, labelX: 215, labelY: 292, labelW: 185, labelH: 48, worldX: 230, worldY: 355, worldW: 290, worldH: 190 },
  { id: 'oak', name: 'Старий Дуб', subtitle: 'Щоденне благословення духів', markerX: 397, markerY: 164, markerSize: 56, labelX: 493, labelY: 164, labelW: 170, labelH: 46, worldX: 535, worldY: 245, worldW: 255, worldH: 275 },
  { id: 'shrine', name: 'Святилище', subtitle: 'Відновлення мани', markerX: 738, markerY: 208, markerSize: 58, labelX: 832, labelY: 208, labelW: 170, labelH: 46, worldX: 795, worldY: 185, worldW: 210, worldH: 165 },
  { id: 'hunter', name: 'Стежка Мисливця', subtitle: 'Полювання та ресурси', markerX: 212, markerY: 532, markerSize: 58, labelX: 312, labelY: 532, labelW: 190, labelH: 48, worldX: 325, worldY: 500, worldW: 300, worldH: 145 },
  { id: 'yarin', name: 'Ярин Дол', subtitle: 'Лікарські трави', markerX: 622, markerY: 505, markerSize: 56, labelX: 707, labelY: 505, labelW: 155, labelH: 46, worldX: 655, worldY: 515, worldW: 250, worldH: 140 },
  { id: 'mill', name: 'Старий Млин', subtitle: 'Крамниця і завдання', markerX: 832, markerY: 350, markerSize: 58, labelX: 925, labelY: 350, labelW: 170, labelH: 46, worldX: 890, worldY: 365, worldW: 220, worldH: 180 },
  { id: 'swamp', name: 'Туманні Болота', subtitle: 'Бойова зона • рівень 5+', markerX: 1038, markerY: 540, markerSize: 64, labelX: 1142, labelY: 540, labelW: 185, labelH: 50, worldX: 980, worldY: 555, worldW: 190, worldH: 175 }
];

class RegionScene extends Phaser.Scene {
  private modal?: Phaser.GameObjects.Container;
  private resourceText!: Phaser.GameObjects.Text;
  private profileText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  constructor() {
    super('region');
  }

  create() {
    background(this, 'region-bg');

    // Keep the concept art visible. Only a slim translucent status strip is drawn
    // over the baked top counters instead of replacing the whole composition.
    this.add.rectangle(W / 2, 25, W, 50, 0x020806, 0.78)
      .setStrokeStyle(1, GOLD, 0.24)
      .setDepth(10);
    gameText(this, W / 2, 25, 'СЕРЦЕ ПУЩІ', 18, '#ead18f', 0.5).setDepth(11);

    this.profileText = uiText(this, 20, 25, '', 14, '#f5e8c5').setDepth(11);
    this.resourceText = uiText(this, W - 20, 25, '', 14, '#f4dda1', 1).setDepth(11);
    this.toastText = uiText(this, W / 2, 72, '', 15, '#fff0c8', 0.5).setDepth(50).setAlpha(0);

    this.addRegionAtmosphere();
    this.addForegroundFoliage();
    this.drawQuestRail();
    this.makeLandmarks();
    this.makeNav();
    this.refreshHud();
    this.input.keyboard?.on('keydown-ESC', () => this.closeModal());
    this.cameras.main.fadeIn(250, 0, 0, 0);

    if (!state.seenIntro) {
      this.time.delayedCall(350, () => this.openIntro());
    } else if (state.chapterComplete) {
      this.time.delayedCall(350, () => this.showChapterComplete());
    }
  }

  private refreshHud() {
    this.profileText.setText(`Мавка • рівень ${state.level}     ❤ ${state.hp}/${state.maxHp}     ✦ ${state.mana}/${state.maxMana}`);
    this.resourceText.setText(`◉ ${state.coins.toLocaleString('uk-UA')}     ◆ ${state.crystals}     ☘ ${state.herbs}`);
  }

  private drawQuestRail() {
    // Cover the baked mock quest panel completely, but keep the replacement quiet
    // and within the exact same footprint so it does not steal more world space.
    const x = 1156;
    const y = 248;
    const w = 226;
    const h = 350;
    const panel = this.add.rectangle(x, y, w, h, 0x04100c, 0.97)
      .setStrokeStyle(1, GOLD, 0.38)
      .setDepth(12);
    const title = uiText(this, x - 92, 92, 'Завдання регіону', 14, '#ead18f').setDepth(13);

    const rows: Array<{ id: QuestId; title: string; target: number }> = [
      { id: 'oak', title: 'Старий Дуб', target: 3 },
      { id: 'hunter', title: 'Стежка Мисливця', target: 4 },
      { id: 'mill', title: 'Старий Млин', target: 1 }
    ];

    rows.forEach((q, i) => {
      const yy = 142 + i * 74;
      const current = Phaser.Math.Clamp(state.quests[q.id], 0, q.target);
      const done = state.claimedQuests.includes(q.id);
      uiText(this, x - 92, yy - 8, q.title, 13, done ? '#8edaa2' : '#ddd0ad').setDepth(13);
      uiText(this, x + 92, yy - 8, done ? '✓' : `${current}/${q.target}`, 12, done ? '#8edaa2' : '#c7b986', 1).setDepth(13);
      const base = this.add.rectangle(x - 92, yy + 15, 184, 4, 0x253029, 0.95).setOrigin(0, 0.5).setDepth(13);
      const ratio = done ? 1 : current / q.target;
      const fill = this.add.rectangle(x - 92, yy + 15, 184 * ratio, 4, done ? 0x68bd83 : 0xa98c4e, 0.95).setOrigin(0, 0.5).setDepth(14);
      void base; void fill;
    });

    const journal = this.add.rectangle(x, 348, 184, 34, 0x0d1b15, 0.96)
      .setStrokeStyle(1, GOLD, 0.45)
      .setInteractive({ useHandCursor: true })
      .setDepth(13);
    const journalText = uiText(this, x, 348, 'Відкрити журнал', 12, '#ead7a5', 0.5).setDepth(14);
    const open = () => this.openQuests();
    journal.on('pointerover', () => journal.setFillStyle(0x1b3427, 0.96));
    journal.on('pointerout', () => journal.setFillStyle(0x0d1b15, 0.96));
    journal.on('pointerdown', open);
    journalText.setInteractive({ useHandCursor: true }).on('pointerdown', open);
    void panel; void title;
  }

  private addRegionAtmosphere() {
    const pulse = (x: number, y: number, radius: number, color: number, minAlpha: number, maxAlpha: number, duration: number) => {
      const glow = this.add.circle(x, y, radius, color, minAlpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2);
      this.tweens.add({
        targets: glow,
        alpha: { from: minAlpha, to: maxAlpha },
        scale: { from: 0.92, to: 1.12 },
        duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    };

    pulse(530, 150, 54, 0xf5ca67, 0.018, 0.07, 2200);
    pulse(760, 195, 46, 0x79e6c0, 0.018, 0.08, 1800);
    pulse(885, 352, 38, 0xffb95a, 0.014, 0.06, 1300);
    pulse(985, 548, 70, 0x53d5bd, 0.018, 0.08, 2600);

    // Water shimmer over the main falls.
    [
      { x: 545, y: 348, w: 18, h: 95, delay: 0 },
      { x: 655, y: 405, w: 16, h: 86, delay: 450 },
      { x: 770, y: 438, w: 14, h: 72, delay: 820 }
    ].forEach(({ x, y, w, h, delay }) => {
      const shimmer = this.add.ellipse(x, y, w, h, 0xc7ffff, 0.025)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2);
      this.tweens.add({
        targets: shimmer,
        alpha: { from: 0.015, to: 0.09 },
        y: y + 10,
        duration: 1500,
        delay,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    });

    // Slow swamp mist gives the lower-right zone a living silhouette.
    for (let i = 0; i < 5; i++) {
      const mist = this.add.ellipse(900 + i * 42, 548 + (i % 2) * 22, 130, 28, 0x7fd6c0, 0.025)
        .setDepth(2);
      this.tweens.add({
        targets: mist,
        x: mist.x + Phaser.Math.Between(28, 54),
        alpha: { from: 0.015, to: 0.065 },
        duration: 4200 + i * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    }

    for (let i = 0; i < 22; i++) {
      const x = Phaser.Math.Between(120, 1010);
      const y = Phaser.Math.Between(120, 590);
      const mote = this.add.circle(x, y, Phaser.Math.Between(1, 2), i % 4 === 0 ? 0xffd77a : 0xa0e3ad, 0.16)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);
      this.tweens.add({
        targets: mote,
        x: x + Phaser.Math.Between(-18, 18),
        y: y - Phaser.Math.Between(12, 38),
        alpha: { from: 0.06, to: 0.46 },
        duration: Phaser.Math.Between(2200, 5200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    }
  }

  private addForegroundFoliage() {
    const leaves = [
      { x: 24, y: 145, w: 96, h: 24, angle: -32, alpha: 0.15 },
      { x: 42, y: 210, w: 118, h: 28, angle: 18, alpha: 0.12 },
      { x: 70, y: 625, w: 132, h: 30, angle: -16, alpha: 0.12 },
      { x: 1015, y: 76, w: 120, h: 24, angle: 20, alpha: 0.09 },
      { x: 1005, y: 620, w: 136, h: 30, angle: 14, alpha: 0.1 }
    ];

    leaves.forEach((leaf, i) => {
      const shape = this.add.ellipse(leaf.x, leaf.y, leaf.w, leaf.h, i % 2 ? 0x173824 : 0x0c2417, leaf.alpha)
        .setAngle(leaf.angle)
        .setDepth(5);
      this.tweens.add({
        targets: shape,
        angle: leaf.angle + (i % 2 ? 4 : -4),
        x: leaf.x + (i % 2 ? 5 : -5),
        duration: 3600 + i * 480,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    });
  }

  private makeLandmarks() {
    const accentFor = (id: string) => {
      if (id === 'settlement') return 0x6ccf91;
      if (id === 'oak') return 0xe0bb63;
      if (id === 'shrine') return 0x62d6ba;
      if (id === 'hunter') return 0xd1a961;
      if (id === 'yarin') return 0xd8c382;
      if (id === 'mill') return 0xe0b45b;
      return 0x66d8b6;
    };

    LANDMARKS.forEach((spot) => {
      const accent = accentFor(spot.id);

      // Sharpen only the original marker/nameplate footprint, never the whole scene.
      const marker = this.add.rectangle(spot.markerX, spot.markerY, 31, 31, 0x07110d, 0.92)
        .setAngle(45)
        .setStrokeStyle(2, accent, 0.88)
        .setDepth(7);
      const markerCore = this.add.circle(spot.markerX, spot.markerY, 5, accent, 0.92).setDepth(8);
      const markerHalo = this.add.circle(spot.markerX, spot.markerY, 25, accent, 0)
        .setStrokeStyle(2, accent, 0)
        .setDepth(6);

      const plate = this.add.rectangle(spot.labelX, spot.labelY, spot.labelW, spot.labelH, 0x06100c, 0.86)
        .setStrokeStyle(1, accent, 0.38)
        .setDepth(7);
      const name = uiText(
        this,
        spot.labelX - spot.labelW / 2 + 11,
        spot.labelY - 9,
        spot.name,
        13,
        '#f3e4bd'
      ).setDepth(8);
      const subtitle = uiText(
        this,
        spot.labelX - spot.labelW / 2 + 11,
        spot.labelY + 10,
        spot.subtitle,
        9,
        '#9eada1'
      ).setDepth(8);

      const markerHit = this.add.circle(
        spot.markerX,
        spot.markerY,
        spot.markerSize * 0.52,
        0xffffff,
        0.001
      ).setInteractive({ useHandCursor: true }).setDepth(9);

      const labelHit = this.add.rectangle(
        spot.labelX,
        spot.labelY,
        spot.labelW,
        spot.labelH,
        0xffffff,
        0.001
      ).setInteractive({ useHandCursor: true }).setDepth(9);

      const worldHit = this.add.rectangle(
        spot.worldX,
        spot.worldY,
        spot.worldW,
        spot.worldH,
        0xffffff,
        0.001
      ).setInteractive({ useHandCursor: true }).setDepth(6);

      let hoverDepth = 0;
      const showHover = () => {
        hoverDepth += 1;
        plate.setFillStyle(0x0b1b14, 0.94).setStrokeStyle(1, accent, 0.86);
        name.setColor('#fff0c8');
        marker.setFillStyle(0x10271c, 0.96).setStrokeStyle(2, accent, 1);
        markerCore.setScale(1.18);
        markerHalo.setAlpha(0.24).setStrokeStyle(2, accent, 0.7);
        this.tweens.killTweensOf(markerHalo);
        this.tweens.add({ targets: markerHalo, scale: 1.35, alpha: 0.06, duration: 520, yoyo: true, repeat: -1 });
      };
      const hideHover = () => {
        hoverDepth = Math.max(0, hoverDepth - 1);
        this.time.delayedCall(25, () => {
          if (hoverDepth !== 0) return;
          plate.setFillStyle(0x06100c, 0.86).setStrokeStyle(1, accent, 0.38);
          name.setColor('#f3e4bd');
          marker.setFillStyle(0x07110d, 0.92).setStrokeStyle(2, accent, 0.88);
          markerCore.setScale(1);
          this.tweens.killTweensOf(markerHalo);
          markerHalo.setAlpha(0).setScale(1).setStrokeStyle(2, accent, 0);
        });
      };
      const activate = () => {
        this.tweens.add({
          targets: [marker, markerCore],
          scale: 1.12,
          duration: 90,
          yoyo: true,
          ease: 'Cubic.out'
        });
        this.time.delayedCall(90, () => this.openLandmark(spot));
      };

      [markerHit, labelHit, worldHit].forEach((hit) => {
        hit.on('pointerover', showHover);
        hit.on('pointerout', hideHover);
        hit.on('pointerdown', activate);
      });

      void subtitle;
    });
  }
  private makeNav() {
    // Hit areas follow the four painted navigation buttons in the artwork.
    const items = [
      { x: 190, w: 270, action: () => this.closeModal() },
      { x: 500, w: 270, action: () => this.openQuests() },
      { x: 820, w: 270, action: () => this.openInventory() },
      { x: 1135, w: 240, action: () => this.openCamp() }
    ];
    items.forEach((item) => {
      const hit = this.add.rectangle(item.x, 675, item.w, 68, 0xf0d18c, 0.001)
        .setInteractive({ useHandCursor: true }).setDepth(20);
      hit.on('pointerover', () => hit.setFillStyle(0xe9c770, 0.07).setStrokeStyle(1, 0xf0d18c, 0.45));
      hit.on('pointerout', () => hit.setFillStyle(0xe9c770, 0.001).setStrokeStyle(1, 0xf0d18c, 0));
      hit.on('pointerdown', item.action);
    });
  }

  private openLandmark(spot: Landmark) {
    visit(state, spot.id);
    saveState(state);
    if (spot.id === 'swamp') {
      this.openSwamp();
      return;
    }
    if (spot.id === 'settlement') this.openSettlement();
    if (spot.id === 'oak') this.openOak();
    if (spot.id === 'shrine') this.openShrine();
    if (spot.id === 'hunter') this.openHunter();
    if (spot.id === 'yarin') this.openYarin();
    if (spot.id === 'mill') this.openMill();
  }

  private baseModal(title: string, subtitle: string, width = 640, height = 430) {
    this.closeModal();
    const c = this.add.container(0, 0).setDepth(80);
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.58).setInteractive();
    shade.on('pointerdown', () => this.closeModal());
    const parts = ornatePanel(this, W / 2, H / 2, width, height);
    const heading = gameText(this, W / 2, H / 2 - height / 2 + 48, title, 28, GOLD_LIGHT, 0.5);
    const sub = uiText(this, W / 2, H / 2 - height / 2 + 82, subtitle, 15, '#bfcbbb', 0.5);
    const x = uiText(this, W / 2 + width / 2 - 30, H / 2 - height / 2 + 30, '✕', 22, '#f4dda1', 0.5)
      .setInteractive({ useHandCursor: true });
    x.on('pointerdown', () => this.closeModal());
    c.add([shade, ...parts, heading, sub, x]);
    c.setAlpha(0).setScale(0.98);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 150, ease: 'Cubic.out' });
    this.modal = c;
    return c;
  }

  private addModalButton(c: Phaser.GameObjects.Container, x: number, y: number, label: string, fn: () => void, accent = GOLD) {
    const b = button(this, x, y, 220, 48, label, fn, accent);
    c.add([b.box, b.label]);
  }

  private openIntro() {
    const c = this.baseModal('Мавка: Легенди Пущі', 'Розділ I • Серце Пущі', 760, 500);
    const body = uiText(
      this,
      W / 2,
      325,
      'Темна скверна прокидається у Туманних Болотах. Щоб очистити Серце Пущі, заручися благословенням Старого Дуба, пройди Стежку Мисливця, допоможи Старому Млину та здолай Болотного Хранителя.',
      17,
      '#ded3bd',
      0.5
    ).setWordWrapWidth(610).setAlign('center').setLineSpacing(7);
    c.add(body);
    const start = button(this, W / 2, 455, 260, 50, 'Почати подорож', () => {
      state.seenIntro = true;
      visit(state, 'settlement');
      unlockAchievement('first_step');
      saveState(state);
      this.closeModal();
      this.toast('Розділ I розпочато.');
    }, 0x68bd83);
    c.add([start.box, start.label]);
  }

  private showChapterComplete() {
    const c = this.baseModal('Серце Пущі врятовано', 'Розділ I завершено', 700, 430);
    const body = uiText(
      this,
      W / 2,
      340,
      `Мавка очистила Туманні Болота та відновила зв’язок із духами Пущі.\nРівень: ${state.level} • Перемог: ${state.battlesWon} • Досягнень: ${state.achievements.length}`,
      17,
      '#dfe6c4',
      0.5
    ).setAlign('center').setLineSpacing(8);
    c.add(body);
    const again = button(this, W / 2, 440, 250, 48, 'Продовжити дослідження', () => this.closeModal(), 0x69bd83);
    c.add([again.box, again.label]);
  }

  private openChronicle() {
    const c = this.baseModal('Літопис Пущі', 'Досягнення, бестіарій і прогрес розділу', 780, 540);
    const encounterLines = [
      `Болотне Потерча: ${state.encounterWins.potershata ?? 0}`,
      `Туманний Звір: ${state.encounterWins.mirebeast ?? 0}`,
      `Болотний Хранитель: ${state.encounterWins.guardian ?? 0}`
    ];
    const achievementLines = Object.entries(ACHIEVEMENT_NAMES)
      .map(([id, name]) => `${state.achievements.includes(id) ? '✓' : '○'} ${name}`)
      .join('\n');
    const left = uiText(this, 365, 330, 'Бестіарій\n\n' + encounterLines.join('\n'), 16, '#ddd3bb').setLineSpacing(8);
    const right = uiText(this, 700, 350, 'Досягнення\n\n' + achievementLines, 15, '#ddd3bb').setLineSpacing(7);
    const chapter = uiText(
      this,
      W / 2,
      545,
      state.chapterComplete ? 'Розділ I: ЗАВЕРШЕНО' : `Розділ I: ${state.claimedQuests.length}/4 сюжетні нагороди`,
      17,
      state.chapterComplete ? '#91e3a7' : '#e2c77c',
      0.5
    );
    c.add([left, right, chapter]);
  }

  private openSettlement() {
    const c = this.baseModal('Поселення Мавки', 'Безпечне місце для відпочинку й підготовки');
    const status = uiText(this, W / 2, 330, `Здоров’я: ${state.hp}/${state.maxHp}   •   Зілля: ${state.potions}`, 17, '#d9d1ba', 0.5);
    c.add(status);
    this.addModalButton(c, 510, 420, 'Відпочити • 120 ◉', () => {
      if (state.coins < 120) return this.toast('Недостатньо монет.');
      state.coins -= 120;
      state.hp = state.maxHp;
      state.mana = state.maxMana;
      saveState(state);
      this.refreshHud();
      status.setText(`Здоров’я: ${state.hp}/${state.maxHp}   •   Зілля: ${state.potions}`);
      this.toast('Мавка відпочила та відновила сили.');
    }, 0x64bd85);
    this.addModalButton(c, 770, 420, 'Купити зілля • 90 ◉', () => {
      if (state.coins < 90) return this.toast('Недостатньо монет.');
      state.coins -= 90;
      state.potions += 1;
      saveState(state);
      this.refreshHud();
      status.setText(`Здоров’я: ${state.hp}/${state.maxHp}   •   Зілля: ${state.potions}`);
      this.toast('Зілля додано до рюкзака.');
    });
  }

  private openOak() {
    const c = this.baseModal('Старий Дуб', 'Давній дух Пущі пам’ятає тих, хто повертається', 620, 400);
    const today = todayKey();
    const ready = state.lastBlessing !== today;
    const body = uiText(
      this,
      W / 2,
      340,
      ready ? 'Сьогодні Дуб готовий дати благословення.' : 'Сьогодні благословення вже отримано. Повертайся завтра.',
      17,
      '#d9d1ba',
      0.5
    ).setWordWrapWidth(500).setAlign('center');
    c.add(body);
    this.addModalButton(c, W / 2, 435, ready ? 'Отримати благословення' : 'Вже отримано', () => {
      if (state.lastBlessing === today) return this.toast('Благословення вже отримано.');
      state.lastBlessing = today;
      state.herbs += 12;
      state.mana = state.maxMana;
      state.quests.oak = Math.min(3, state.quests.oak + 1);
      const leveled = gainXp(state, 80);
      saveState(state);
      this.refreshHud();
      body.setText(leveled ? 'Дуб благословив Мавку. Новий рівень!' : '+12 трав • +80 досвіду • мана відновлена');
      this.toast('Благословення Старого Дуба отримано.');
    }, ready ? 0x68bd83 : 0x6b6b61);
  }

  private openShrine() {
    const c = this.baseModal('Святилище', 'Місце, де Пуща відновлює внутрішню силу', 620, 400);
    const info = uiText(this, W / 2, 335, `Мана: ${state.mana}/${state.maxMana}`, 20, '#a9e6ef', 0.5);
    c.add(info);
    this.addModalButton(c, W / 2, 430, 'Медитація • 8 ☘', () => {
      if (state.herbs < 8) return this.toast('Потрібно 8 лікарських трав.');
      state.herbs -= 8;
      state.mana = state.maxMana;
      saveState(state);
      this.refreshHud();
      info.setText(`Мана: ${state.mana}/${state.maxMana} • відновлено`);
      this.toast('Мана повністю відновлена.');
    }, CYAN);
  }

  private openHunter() {
    const c = this.baseModal('Стежка Мисливця', 'Коротка експедиція за ресурсами', 650, 420);
    const info = uiText(this, W / 2, 325, 'Експедиція коштує 20 мани. Результат: трави, монети й досвід.', 17, '#d9d1ba', 0.5)
      .setWordWrapWidth(520).setAlign('center');
    c.add(info);
    this.addModalButton(c, W / 2, 430, 'Вирушити на полювання', () => {
      if (state.mana < 20) return this.toast('Недостатньо мани.');
      state.mana -= 20;
      const herbs = Phaser.Math.Between(8, 18);
      const coins = Phaser.Math.Between(90, 180);
      state.herbs += herbs;
      state.coins += coins;
      state.quests.hunter = Math.min(4, state.quests.hunter + 1);
      const leveled = gainXp(state, 65);
      saveState(state);
      this.refreshHud();
      info.setText(`Знайдено: +${herbs} ☘  +${coins} ◉  +65 XP${leveled ? ' • НОВИЙ РІВЕНЬ' : ''}`);
      this.toast('Експедиція завершена.');
    }, 0x70b483);
  }

  private openYarin() {
    const c = this.baseModal('Ярин Дол', 'Тихі поля з рідкісними лікарськими травами', 620, 390);
    const info = uiText(this, W / 2, 335, 'Можна зібрати невеликий запас трав.', 17, '#d9d1ba', 0.5);
    c.add(info);
    this.addModalButton(c, W / 2, 420, 'Зібрати трави', () => {
      const found = Phaser.Math.Between(5, 12);
      state.herbs += found;
      saveState(state);
      this.refreshHud();
      info.setText(`Зібрано +${found} ☘`);
      this.toast('Трави додано до запасів.');
    }, 0x7bbd76);
  }

  private openMill() {
    const c = this.baseModal('Старий Млин', 'Мельник торгує припасами й знає місцеві чутки', 690, 450);
    const info = uiText(this, W / 2, 310, `Монети: ${state.coins.toLocaleString('uk-UA')}   •   Зілля: ${state.potions}   •   Ефір: ${state.ether}`, 16, '#d9d1ba', 0.5);
    c.add(info);
    this.addModalButton(c, 505, 410, 'Зілля • 90 ◉', () => {
      if (state.coins < 90) return this.toast('Недостатньо монет.');
      state.coins -= 90;
      state.potions += 1;
      state.quests.mill = 1;
      saveState(state);
      this.refreshHud();
      info.setText(`Монети: ${state.coins.toLocaleString('uk-UA')}   •   Зілля: ${state.potions}   •   Ефір: ${state.ether}`);
    });
    this.addModalButton(c, 775, 410, 'Ефір • 2 ◆', () => {
      if (state.crystals < 2) return this.toast('Недостатньо кристалів.');
      state.crystals -= 2;
      state.ether += 1;
      saveState(state);
      this.refreshHud();
      info.setText(`Монети: ${state.coins.toLocaleString('uk-UA')}   •   Зілля: ${state.potions}   •   Ефір: ${state.ether}`);
    }, CYAN);
  }

  private openSwamp() {
    const c = this.baseModal('Туманні Болота', 'Обери сутичку • складніші вороги дають кращу здобич', 720, 520);
    const info = uiText(
      this,
      W / 2,
      270,
      `Перемог у боях: ${state.battlesWon}   •   Хранителя переможено: ${state.bossWins} разів\nБроня: рівень ${state.armorLevel}   •   Посох: рівень ${state.weaponLevel}   •   Вовк: рівень ${state.wolfLevel}`,
      15,
      '#d9d1ba',
      0.5
    ).setAlign('center').setLineSpacing(7);
    c.add(info);

    const choices: Array<{ encounter: Encounter; y: number; accent: number; hint: string }> = [
      { encounter: ENCOUNTERS.potershata, y: 350, accent: 0x64b887, hint: 'Легка сутичка' },
      { encounter: ENCOUNTERS.mirebeast, y: 415, accent: 0x6aa8bd, hint: 'Середня сутичка' },
      { encounter: ENCOUNTERS.guardian, y: 485, accent: 0xc89b4e, hint: 'БОС • сюжетна ціль' }
    ];

    choices.forEach(({ encounter, y, accent, hint }) => {
      const b = button(
        this,
        W / 2,
        y,
        430,
        50,
        `${encounter.name}  •  ${hint}`,
        () => {
          this.closeModal();
          this.cameras.main.fadeOut(220, 0, 0, 0);
          this.time.delayedCall(230, () => this.scene.start('battle', { encounterId: encounter.id }));
        },
        accent
      );
      c.add([b.box, b.label]);
    });
  }

  private openQuests() {
    const c = this.baseModal('Завдання', 'Виконуй цілі та забирай нагороди', 760, 530);
    const quests: Array<{
      id: QuestId;
      name: string;
      current: number;
      target: number;
      coins: number;
      crystals: number;
      xp: number;
    }> = [
      { id: 'oak', name: 'Голос Старого Дуба', current: state.quests.oak, target: 3, coins: 400, crystals: 2, xp: 200 },
      { id: 'hunter', name: 'Стежками мисливця', current: state.quests.hunter, target: 4, coins: 500, crystals: 3, xp: 240 },
      { id: 'mill', name: 'Таємниця Старого Млина', current: state.quests.mill, target: 1, coins: 350, crystals: 1, xp: 150 },
      { id: 'swamp', name: 'Очистити Туманні Болота', current: state.quests.swamp, target: 1, coins: 700, crystals: 4, xp: 320 }
    ];

    quests.forEach((q, i) => {
      const y = 255 + i * 72;
      const done = q.current >= q.target;
      const claimed = state.claimedQuests.includes(q.id);
      const box = this.add.rectangle(W / 2, y, 620, 60, done ? 0x183728 : 0x111b17, 0.95)
        .setStrokeStyle(1, done ? 0x6bc58b : 0x806b42, 0.8);
      const name = uiText(this, 360, y - 12, q.name, 16, done ? '#a8e8bb' : '#f1e5ca');
      const reward = uiText(this, 360, y + 13, `Нагорода: ${q.coins} ◉  ${q.crystals} ◆  ${q.xp} XP`, 13, '#c9b984');
      c.add([box, name, reward]);

      if (done && !claimed) {
        const claim = button(this, 885, y, 125, 36, 'Забрати', () => {
          this.claimQuestReward(q.id, q.coins, q.crystals, q.xp);
          this.closeModal();
          this.openQuests();
        }, 0x68bd83);
        c.add([claim.box, claim.label]);
      } else {
        const progress = uiText(
          this,
          905,
          y,
          claimed ? 'Отримано' : `${q.current}/${q.target}`,
          14,
          claimed ? '#8eb89b' : '#e0c77e',
          1
        );
        c.add(progress);
      }
    });
  }

  private claimQuestReward(id: QuestId, coins: number, crystals: number, xp: number) {
    if (state.claimedQuests.includes(id)) return;
    state.claimedQuests.push(id);
    state.coins += coins;
    state.crystals += crystals;
    const levels = gainXp(state, xp);
    const chapterJustCompleted = refreshChapterCompletion();
    saveState(state);
    this.refreshHud();
    if (chapterJustCompleted) {
      this.closeModal();
      this.showChapterComplete();
      return;
    }
    this.toast(levels ? 'Нагороду отримано • новий рівень!' : 'Нагороду за завдання отримано.');
  }

  private openInventory() {
    const c = this.baseModal('Рюкзак і спорядження', 'Постійні ресурси та розвиток героя', 780, 540);
    const lines = [
      `Посох Пущі • рівень ${state.weaponLevel}`,
      `Лісова броня • рівень ${state.armorLevel}`,
      `Вовк-компаньйон • рівень ${state.wolfLevel}`,
      '',
      `Зілля здоров’я: ${state.potions}`,
      `Ефір мани: ${state.ether}`,
      `Лікарські трави: ${state.herbs}`,
      '',
      `Броня зменшує вхідну шкоду: ${Math.max(0, state.armorLevel - 1) * 6}`
    ];
    const info = uiText(this, 380, 350, lines.join('\n'), 16, '#e0d7bf').setLineSpacing(7);
    c.add(info);

    this.addModalButton(c, 840, 320, `Посох +1 • ${500 * state.weaponLevel} ◉`, () => {
      const cost = 500 * state.weaponLevel;
      if (state.coins < cost) return this.toast('Недостатньо монет.');
      state.coins -= cost;
      state.weaponLevel += 1;
      if (state.weaponLevel >= 3 || state.armorLevel >= 3 || state.wolfLevel >= 3) unlockAchievement('upgrader');
      saveState(state);
      this.refreshHud();
      this.closeModal();
      this.openInventory();
    }, 0xc99c4f);

    this.addModalButton(c, 840, 390, `Броня +1 • ${600 * state.armorLevel} ◉`, () => {
      const cost = 600 * state.armorLevel;
      if (state.coins < cost) return this.toast('Недостатньо монет.');
      state.coins -= cost;
      state.armorLevel += 1;
      if (state.weaponLevel >= 3 || state.armorLevel >= 3 || state.wolfLevel >= 3) unlockAchievement('upgrader');
      saveState(state);
      this.refreshHud();
      this.closeModal();
      this.openInventory();
    }, 0x9eaa70);

    this.addModalButton(c, 840, 460, `Вовк +1 • ${4 * state.wolfLevel} ◆`, () => {
      const cost = 4 * state.wolfLevel;
      if (state.crystals < cost) return this.toast('Недостатньо кристалів.');
      state.crystals -= cost;
      state.wolfLevel += 1;
      if (state.weaponLevel >= 3 || state.armorLevel >= 3 || state.wolfLevel >= 3) unlockAchievement('upgrader');
      saveState(state);
      this.refreshHud();
      this.closeModal();
      this.openInventory();
    }, CYAN);
  }

  private openCamp() {
    const c = this.baseModal('Табір', 'Поточний стан Мавки та збереження прогресу', 680, 450);
    const needed = xpNeeded(state.level);
    const info = uiText(
      this,
      W / 2,
      325,
      `Рівень ${state.level} • XP ${state.xp}/${needed}\nЗдоров’я ${state.hp}/${state.maxHp} • Мана ${state.mana}/${state.maxMana}\nПеремог у боях: ${state.battlesWon} • Відвідано місць: ${state.locationsVisited.length}`,
      17,
      '#d9d1ba',
      0.5
    ).setAlign('center').setLineSpacing(8);
    c.add(info);
    this.addModalButton(c, 505, 435, 'Зберегти зараз', () => {
      saveState(state);
      this.toast('Прогрес збережено.');
    }, 0x65b883);
    this.addModalButton(c, 775, 435, 'Головне меню', () => this.scene.start('title'), 0xa77a49);
    this.addModalButton(c, W / 2, 505, 'Літопис Пущі', () => this.openChronicle(), CYAN);
  }

  private toast(message: string) {
    this.toastText.setText(message).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1700, duration: 400 });
  }

  private closeModal() {
    if (!this.modal) return;
    const modal = this.modal;
    this.modal = undefined;
    this.tweens.add({
      targets: modal,
      alpha: 0,
      scale: 0.985,
      duration: 100,
      ease: 'Cubic.in',
      onComplete: () => modal.destroy(true)
    });
  }
}

type EncounterId = 'potershata' | 'mirebeast' | 'guardian';

type Encounter = {
  id: EncounterId;
  name: string;
  subtitle: string;
  hpBase: number;
  damageMin: number;
  damageMax: number;
  coinMin: number;
  coinMax: number;
  herbMin: number;
  herbMax: number;
  xp: number;
  crystalChance: number;
  boss: boolean;
};

const ENCOUNTERS: Record<EncounterId, Encounter> = {
  potershata: {
    id: 'potershata',
    name: 'Болотне Потерча',
    subtitle: 'Хитрий дух туману',
    hpBase: 620,
    damageMin: 30,
    damageMax: 48,
    coinMin: 180,
    coinMax: 270,
    herbMin: 6,
    herbMax: 11,
    xp: 130,
    crystalChance: 12,
    boss: false
  },
  mirebeast: {
    id: 'mirebeast',
    name: 'Туманний Звір',
    subtitle: 'Дикий хижак скверни',
    hpBase: 780,
    damageMin: 38,
    damageMax: 58,
    coinMin: 250,
    coinMax: 360,
    herbMin: 8,
    herbMax: 14,
    xp: 190,
    crystalChance: 20,
    boss: false
  },
  guardian: {
    id: 'guardian',
    name: 'Болотний Хранитель',
    subtitle: 'Стародавній носій скверни',
    hpBase: 980,
    damageMin: 46,
    damageMax: 72,
    coinMin: 420,
    coinMax: 620,
    herbMin: 10,
    herbMax: 18,
    xp: 280,
    crystalChance: 35,
    boss: true
  }
};

type Skill = {
  name: string;
  cost: number;
  cooldown: number;
  color: number;
};

const SKILLS: Skill[] = [
  { name: 'Лісова Іскра', cost: 20, cooldown: 1700, color: 0x55d77c },
  { name: 'Коріння', cost: 28, cooldown: 3300, color: 0x7ea845 },
  { name: 'Поклик Вовка', cost: 26, cooldown: 2600, color: 0x62aee4 },
  { name: 'Танець Вітру', cost: 22, cooldown: 2300, color: 0x68d8dc },
  { name: 'Серце Пущі', cost: 35, cooldown: 4200, color: 0xf0cb68 }
];

class BattleScene extends Phaser.Scene {
  private encounter: Encounter = ENCOUNTERS.guardian;
  private heroHp = 0;
  private heroMana = 0;
  private enemyMax = 0;
  private enemyHp = 0;
  private busy = false;
  private rooted = false;
  private guarded = false;
  private auto = false;
  private cooldowns = [false, false, false, false, false];
  private hpFill!: Phaser.GameObjects.Rectangle;
  private manaFill!: Phaser.GameObjects.Rectangle;
  private enemyFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private autoText!: Phaser.GameObjects.Text;
  private potionText!: Phaser.GameObjects.Text;
  private etherText!: Phaser.GameObjects.Text;
  private skillOverlays: Phaser.GameObjects.Rectangle[] = [];
  private skillCdTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('battle');
  }

  init(data: { encounterId?: EncounterId }) {
    this.encounter = ENCOUNTERS[data?.encounterId ?? 'guardian'] ?? ENCOUNTERS.guardian;
  }

  create() {
    background(this, 'battle-bg');
    this.drawBattleAtmosphere();
    this.heroHp = Math.max(1, state.hp);
    this.heroMana = Math.max(0, state.mana);
    const scaling = this.encounter.boss
      ? state.bossWins * 120
      : Math.floor(state.battlesWon / 4) * 45;
    this.enemyMax = this.encounter.hpBase + scaling;
    this.enemyHp = this.enemyMax;
    this.busy = false;
    this.rooted = false;
    this.guarded = false;
    this.auto = false;
    this.cooldowns = [false, false, false, false, false];

    this.drawBattleChrome();
    this.drawBars();
    this.drawSkills();
    this.drawBattleControls();
    this.refreshBars();
    this.log('Бій розпочато. Обери навичку.');
    this.cameras.main.fadeIn(220, 0, 0, 0);

    this.input.keyboard?.on('keydown-ONE', () => this.useSkill(0));
    this.input.keyboard?.on('keydown-TWO', () => this.useSkill(1));
    this.input.keyboard?.on('keydown-THREE', () => this.useSkill(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.useSkill(3));
    this.input.keyboard?.on('keydown-FIVE', () => this.useSkill(4));

    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (!this.auto || this.busy || this.enemyHp <= 0 || this.heroHp <= 0) return;
        const available = [0, 1, 2, 3, 4].filter(i => !this.cooldowns[i] && this.heroMana >= SKILLS[i].cost);
        if (available.length) this.useSkill(Phaser.Utils.Array.GetRandom(available));
      }
    });
  }

  private drawBattleAtmosphere() {
    const enemyAura = this.add.circle(835, 325, 95, 0x72e55e, 0.018)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1);
    this.tweens.add({
      targets: enemyAura,
      scale: { from: 0.9, to: 1.14 },
      alpha: { from: 0.012, to: 0.075 },
      duration: 1450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });

    const heroAura = this.add.ellipse(345, 398, 185, 72, 0xa1f0b2, 0.018)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1);
    this.tweens.add({
      targets: heroAura,
      alpha: { from: 0.01, to: 0.06 },
      scaleX: { from: 0.9, to: 1.08 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });

    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(250, 930);
      const y = Phaser.Math.Between(220, 520);
      const wisp = this.add.circle(x, y, Phaser.Math.Between(1, 3), i % 3 === 0 ? 0x87f1b1 : 0xb9e7dc, 0.1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2);
      this.tweens.add({
        targets: wisp,
        x: x + Phaser.Math.Between(-30, 45),
        y: y - Phaser.Math.Between(20, 55),
        alpha: { from: 0.035, to: 0.34 },
        duration: Phaser.Math.Between(1700, 3600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    }
  }

  private drawBattleChrome() {
    // The concept art contains presentation-only HUD mockups. Cover those baked
    // elements and render one authoritative interactive HUD above the artwork.
    this.add.rectangle(W / 2, 38, W, 76, 0x020806, 0.98)
      .setStrokeStyle(1, GOLD, 0.32)
      .setDepth(20);
    this.add.rectangle(1138, 395, 284, 638, 0x020806, 0.97)
      .setStrokeStyle(1, GOLD, 0.42)
      .setDepth(20);
    this.add.rectangle(560, 653, 930, 134, 0x020806, 0.96)
      .setStrokeStyle(1, GOLD, 0.38)
      .setDepth(20);
    this.add.rectangle(175, 145, 330, 128, 0x020806, 0.93)
      .setStrokeStyle(1, 0x7a8d76, 0.38)
      .setDepth(20);

    uiText(this, 38, 112, `Вовк • рівень ${state.wolfLevel}`, 15, '#d9e1d8').setDepth(22);
    uiText(this, 38, 142, 'Супутник атакує через «Поклик Вовка»', 12, '#9fb1a4').setDepth(22);

    this.add.rectangle(715, 103, 500, 44, 0x020806, 0.84)
      .setStrokeStyle(1, 0x6c7d69, 0.38)
      .setDepth(20);
    uiText(this, 715, 103, this.encounter.boss ? 'Коріння • отрута • темна скверна' : 'Туман • скверна • різкі атаки', 13, '#b9c9bc', 0.5).setDepth(22);

    uiText(this, 1020, 105, 'БІЙ', 17, '#f0d18a').setDepth(22);
    uiText(this, 1020, 132, this.encounter.subtitle, 12, '#b7c5ba').setDepth(22);
  }

  private drawBars() {
    const heroX = 24;
    uiText(this, heroX, 17, 'МАВКА', 12, '#e6d4a4').setDepth(32);
    this.add.rectangle(heroX, 38, 350, 18, 0x29100e, 0.96).setOrigin(0, 0.5).setDepth(30);
    this.hpFill = this.add.rectangle(heroX, 38, 350, 18, RED, 1).setOrigin(0, 0.5).setDepth(31);
    this.hpText = uiText(this, heroX + 175, 38, '', 13, '#fff6e8', 0.5).setDepth(32);
    this.add.rectangle(heroX, 61, 350, 11, 0x0c2233, 0.96).setOrigin(0, 0.5).setDepth(30);
    this.manaFill = this.add.rectangle(heroX, 61, 350, 11, 0x3b92d0, 1).setOrigin(0, 0.5).setDepth(31);
    this.manaText = uiText(this, heroX + 175, 61, '', 11, '#eef8ff', 0.5).setDepth(32);

    const enemyX = 450;
    uiText(this, enemyX, 17, this.encounter.name.toUpperCase(), 12, '#e6d4a4').setDepth(32);
    this.add.rectangle(enemyX, 38, 500, 20, 0x28100e, 0.96).setOrigin(0, 0.5).setDepth(30);
    this.enemyFill = this.add.rectangle(enemyX, 38, 500, 20, 0xb63f35, 1).setOrigin(0, 0.5).setDepth(31);
    this.enemyText = uiText(this, enemyX + 250, 38, '', 13, '#fff3df', 0.5).setDepth(32);
  }

  private drawSkillGlyph(x: number, y: number, index: number, color: number) {
    const objects: Phaser.GameObjects.GameObject[] = [];

    if (index === 0) {
      const leaf = this.add.ellipse(x, y, 26, 13, color, 0.9).setAngle(-34).setDepth(37);
      const stem = this.add.rectangle(x + 8, y + 7, 18, 3, color, 0.72).setAngle(38).setDepth(37);
      objects.push(leaf, stem);
    } else if (index === 1) {
      [-1, 0, 1].forEach((offset) => {
        const root = this.add.rectangle(x + offset * 8, y + 2, 4, 25, color, 0.88)
          .setAngle(offset * 25)
          .setDepth(37);
        objects.push(root);
      });
      const crown = this.add.ellipse(x, y - 9, 24, 9, color, 0.7).setDepth(37);
      objects.push(crown);
    } else if (index === 2) {
      const head = this.add.circle(x, y + 1, 10, color, 0.86).setDepth(37);
      const earL = this.add.rectangle(x - 8, y - 10, 8, 8, color, 0.86).setAngle(28).setDepth(37);
      const earR = this.add.rectangle(x + 8, y - 10, 8, 8, color, 0.86).setAngle(-28).setDepth(37);
      const muzzle = this.add.ellipse(x, y + 8, 12, 7, 0xe6f4ff, 0.7).setDepth(38);
      objects.push(head, earL, earR, muzzle);
    } else if (index === 3) {
      [28, 20, 12].forEach((size, i) => {
        const ring = this.add.ellipse(x + i * 2, y, size, size * 0.55, 0x000000, 0.001)
          .setStrokeStyle(2, color, 0.85 - i * 0.18)
          .setAngle(-12 + i * 12)
          .setDepth(37);
        objects.push(ring);
      });
    } else {
      const left = this.add.circle(x - 6, y - 4, 8, color, 0.88).setDepth(37);
      const right = this.add.circle(x + 6, y - 4, 8, color, 0.88).setDepth(37);
      const base = this.add.rectangle(x, y + 5, 15, 15, color, 0.88).setAngle(45).setDepth(37);
      objects.push(left, right, base);
    }

    return objects;
  }

  private drawSkills() {
    const xs = [160, 335, 510, 685, 860];
    xs.forEach((x, i) => {
      const hit = this.add.rectangle(x, 650, 158, 104, 0x0b1511, 0.97)
        .setStrokeStyle(2, SKILLS[i].color, 0.68)
        .setInteractive({ useHandCursor: true })
        .setDepth(35);
      const inner = this.add.rectangle(x, 650, 148, 94, 0x0e1b16, 0.32)
        .setStrokeStyle(1, SKILLS[i].color, 0.2)
        .setDepth(35);
      const number = uiText(this, x - 66, 610, `${i + 1}`, 11, '#d9c58e', 0.5).setDepth(36);
      const glyphs = this.drawSkillGlyph(x, 622, i, SKILLS[i].color);
      const name = uiText(this, x, 654, SKILLS[i].name, 13, '#f2e6c9', 0.5).setDepth(36);
      const cost = uiText(this, x, 679, `${SKILLS[i].cost} мани`, 11, '#78c9ea', 0.5).setDepth(36);
      const cd = uiText(this, x, 622, '', 21, '#fff4d8', 0.5).setDepth(39);

      const hoverOn = () => {
        hit.setFillStyle(SKILLS[i].color, 0.16).setStrokeStyle(2, SKILLS[i].color, 1).setScale(1.018);
        inner.setFillStyle(SKILLS[i].color, 0.06);
        glyphs.forEach((g) => this.tweens.add({ targets: g, scaleX: 1.08, scaleY: 1.08, duration: 110, ease: 'Sine.out' }));
      };
      const hoverOff = () => {
        hit.setFillStyle(0x0b1511, 0.97).setStrokeStyle(2, SKILLS[i].color, 0.68).setScale(1);
        inner.setFillStyle(0x0e1b16, 0.32);
        glyphs.forEach((g) => this.tweens.add({ targets: g, scaleX: 1, scaleY: 1, duration: 90, ease: 'Sine.out' }));
      };

      hit.on('pointerover', hoverOn);
      hit.on('pointerout', hoverOff);
      hit.on('pointerdown', () => this.useSkill(i));
      this.skillOverlays.push(hit);
      this.skillCdTexts.push(cd);
      void number; void name; void cost;
    });
  }
  private drawBattleControls() {
    uiText(this, 1015, 176, 'Журнал бою', 16, '#e9d08c').setDepth(41);
    this.logText = uiText(this, 1015, 218, '', 14, '#e9dfc8')
      .setWordWrapWidth(225).setLineSpacing(5).setDepth(42);

    uiText(this, 1015, 390, 'Припаси', 16, '#e9d08c').setDepth(41);

    const ether = button(this, 1138, 444, 220, 42, `Ефір ×${state.ether}`, () => this.useEther(), CYAN);
    ether.box.setDepth(40); ether.label.setDepth(41);
    this.etherText = ether.label;

    const potion = button(this, 1138, 496, 220, 42, `Зілля ×${state.potions}`, () => this.usePotion(), 0xc76f5a);
    potion.box.setDepth(40); potion.label.setDepth(41);
    this.potionText = potion.label;

    const auto = button(this, 1138, 548, 220, 42, 'Автобій: ВИМК', () => {
      this.auto = !this.auto;
      this.autoText.setText(this.auto ? 'Автобій: УВІМК' : 'Автобій: ВИМК');
      this.log(this.auto ? 'Автобій увімкнено.' : 'Автобій вимкнено.');
    }, 0x66c598);
    auto.box.setDepth(40); auto.label.setDepth(41);
    this.autoText = auto.label;

    const retreat = button(this, 1138, 606, 220, 42, 'Відступити', () => {
      state.hp = Math.max(1, this.heroHp);
      state.mana = this.heroMana;
      saveState(state);
      this.scene.start('region');
    }, 0xa7784e);
    retreat.box.setDepth(40); retreat.label.setDepth(41);
  }

  private useSkill(index: number) {
    const skill = SKILLS[index];
    if (this.busy || this.enemyHp <= 0 || this.heroHp <= 0 || this.cooldowns[index]) return;
    if (this.heroMana < skill.cost) {
      this.log('Недостатньо мани.');
      this.flashMessage('МАНА', '#70c9ff');
      return;
    }

    this.busy = true;
    this.heroMana -= skill.cost;
    this.cooldowns[index] = true;
    this.startCooldown(index, skill.cooldown);

    let damage = 0;
    if (index === 0) damage = Phaser.Math.Between(105, 135) + state.weaponLevel * 12;
    if (index === 1) {
      damage = Phaser.Math.Between(60, 78) + state.weaponLevel * 7;
      this.rooted = true;
    }
    if (index === 2) damage = Phaser.Math.Between(88, 116) + state.wolfLevel * 18;
    if (index === 3) {
      damage = Phaser.Math.Between(74, 100) + state.weaponLevel * 8;
      this.guarded = true;
    }
    if (index === 4) {
      const heal = 105 + state.level * 5;
      this.heroHp = Math.min(state.maxHp, this.heroHp + heal);
      damage = Phaser.Math.Between(35, 55);
      this.healEffect(heal);
    }

    this.skillEffect(index);
    this.time.delayedCall(320, () => {
      this.enemyHp = Math.max(0, this.enemyHp - damage);
      this.floatNumber(825, 310, `-${damage}`, '#ff8b68');
      const impact = this.add.circle(825, 330, 26, SKILLS[index].color, 0.16)
        .setStrokeStyle(3, SKILLS[index].color, 0.72)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(46);
      this.tweens.add({ targets: impact, scale: 2.8, alpha: 0, duration: 300, onComplete: () => impact.destroy() });
      this.cameras.main.shake(80, 0.004);
      this.log(`${skill.name}: ${damage} шкоди.`);
      this.refreshBars();

      if (this.enemyHp <= 0) {
        this.victory();
        return;
      }
      this.time.delayedCall(430, () => this.enemyTurn());
    });
  }

  private startCooldown(index: number, ms: number) {
    const cdText = this.skillCdTexts[index];
    const overlay = this.skillOverlays[index];
    overlay.setFillStyle(0x000000, 0.35);
    const start = this.time.now;
    const timer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const left = Math.max(0, ms - (this.time.now - start));
        cdText.setText(left > 0 ? `${(left / 1000).toFixed(1)}` : '');
      }
    });
    this.time.delayedCall(ms, () => {
      this.cooldowns[index] = false;
      timer.destroy();
      cdText.setText('');
      overlay.setFillStyle(SKILLS[index].color, 0.001);
    });
  }

  private enemyTurn() {
    if (this.enemyHp <= 0 || this.heroHp <= 0) return;

    if (this.rooted) {
      this.rooted = false;
      this.log('Коріння скувало Хранителя. Його хід пропущено.');
      this.heroMana = Math.min(state.maxMana, this.heroMana + 12);
      this.busy = false;
      this.refreshBars();
      return;
    }

    const warning = this.add.circle(830, 320, 42, 0xff563d, 0.16).setStrokeStyle(3, 0xff8067, 0.8).setDepth(45);
    this.tweens.add({ targets: warning, scale: 2.2, alpha: 0, duration: 420, onComplete: () => warning.destroy() });

    this.time.delayedCall(280, () => {
      const progressionDamage = this.encounter.boss ? state.bossWins * 3 : Math.floor(state.battlesWon / 5) * 2;
      let damage = Phaser.Math.Between(this.encounter.damageMin, this.encounter.damageMax) + progressionDamage;
      damage = Math.max(8, damage - Math.max(0, state.armorLevel - 1) * 6);
      if (this.guarded) {
        damage = Math.floor(damage * 0.35);
        this.guarded = false;
        this.log(`Танець Вітру послабив удар до ${damage}.`);
      } else {
        this.log(`Хранитель завдав ${damage} шкоди.`);
      }
      this.heroHp = Math.max(0, this.heroHp - damage);
      this.floatNumber(340, 365, `-${damage}`, '#ffba79');
      const hitFlash = this.add.ellipse(350, 390, 210, 260, 0xff6d52, 0.12).setDepth(43);
      this.tweens.add({ targets: hitFlash, alpha: 0, scale: 1.18, duration: 280, onComplete: () => hitFlash.destroy() });
      this.cameras.main.shake(100, 0.006);
      this.heroMana = Math.min(state.maxMana, this.heroMana + 11);
      this.refreshBars();

      if (this.heroHp <= 0) this.defeat();
      else this.busy = false;
    });
  }

  private skillEffect(index: number) {
    const colors = [0x55ef81, 0x8fbd52, 0x77caff, 0x74e3e1, 0xf1d16d];
    const color = colors[index];

    if (index === 0) {
      for (let i = 0; i < 4; i++) {
        const slash = this.add.rectangle(430, 355 + i * 17, 140, 5, color, 0.45 - i * 0.06)
          .setAngle(-12 + i * 4)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(44);
        this.tweens.add({
          targets: slash,
          x: 830,
          scaleX: 1.65,
          alpha: 0,
          duration: 300 + i * 30,
          delay: i * 24,
          ease: 'Cubic.out',
          onComplete: () => slash.destroy()
        });
      }
      for (let i = 0; i < 8; i++) {
        const spark = this.add.circle(505 + i * 30, 370 + Phaser.Math.Between(-45, 45), 2, color, 0.7)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(45);
        this.tweens.add({ targets: spark, x: spark.x + 150, y: spark.y - 18, alpha: 0, duration: 380, onComplete: () => spark.destroy() });
      }
      return;
    }

    if (index === 1) {
      for (let i = 0; i < 8; i++) {
        const root = this.add.rectangle(775 + i * 15, 455, 6, 120 + (i % 3) * 18, color, 0.58)
          .setAngle(Phaser.Math.Between(-32, 32))
          .setDepth(44);
        this.tweens.add({
          targets: root,
          y: 365,
          scaleY: 1.18,
          alpha: 0,
          duration: 720,
          delay: i * 36,
          ease: 'Back.out',
          onComplete: () => root.destroy()
        });
      }
      const bind = this.add.circle(830, 405, 42, color, 0.05).setStrokeStyle(4, color, 0.72).setDepth(44);
      this.tweens.add({ targets: bind, scale: 1.7, alpha: 0, duration: 650, onComplete: () => bind.destroy() });
      return;
    }

    if (index === 2) {
      const shadow = this.add.ellipse(430, 430, 125, 48, 0x4fa8ff, 0.28)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(44);
      const core = this.add.circle(470, 420, 16, color, 0.75).setDepth(45);
      this.tweens.add({ targets: [shadow, core], x: 820, alpha: 0, scaleX: 1.8, duration: 360, ease: 'Cubic.in', onComplete: () => { shadow.destroy(); core.destroy(); } });
      return;
    }

    if (index === 3) {
      for (let i = 0; i < 3; i++) {
        const ring = this.add.ellipse(360, 385, 80 + i * 35, 42 + i * 18, 0x000000, 0.001)
          .setStrokeStyle(4 - i, color, 0.72 - i * 0.12)
          .setDepth(44);
        this.tweens.add({
          targets: ring,
          x: 760,
          scaleX: 2,
          scaleY: 1.35,
          alpha: 0,
          duration: 520 + i * 70,
          delay: i * 55,
          ease: 'Sine.out',
          onComplete: () => ring.destroy()
        });
      }
      return;
    }

    const pulse = this.add.circle(360, 380, 30, color, 0.2)
      .setStrokeStyle(5, color, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(44);
    this.tweens.add({ targets: pulse, scale: 4.8, alpha: 0, duration: 620, ease: 'Sine.out', onComplete: () => pulse.destroy() });
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const spark = this.add.circle(360, 380, 3, color, 0.72).setDepth(45);
      this.tweens.add({
        targets: spark,
        x: 360 + Math.cos(angle) * Phaser.Math.Between(70, 125),
        y: 380 + Math.sin(angle) * Phaser.Math.Between(45, 90),
        alpha: 0,
        duration: 600,
        onComplete: () => spark.destroy()
      });
    }
  }
  private healEffect(value: number) {
    this.floatNumber(340, 315, `+${value}`, '#8dff9e');
  }

  private usePotion() {
    if (this.busy || state.potions <= 0 || this.heroHp <= 0) return;
    state.potions -= 1;
    const heal = 170;
    this.heroHp = Math.min(state.maxHp, this.heroHp + heal);
    saveState(state);
    this.potionText?.setText(`Зілля ×${state.potions}`);
    this.healEffect(heal);
    this.log(`Зілля відновило ${heal} здоров’я.`);
    this.refreshBars();
  }

  private useEther() {
    if (this.busy || state.ether <= 0 || this.heroHp <= 0) return;
    if (this.heroMana >= state.maxMana) {
      this.log('Мана вже заповнена.');
      return;
    }
    state.ether -= 1;
    const restored = Math.min(90, state.maxMana - this.heroMana);
    this.heroMana += restored;
    saveState(state);
    this.etherText?.setText(`Ефір ×${state.ether}`);
    this.floatNumber(340, 345, `+${restored} мана`, '#75d8ff');
    this.log(`Ефір відновив ${restored} мани.`);
    this.refreshBars();
  }

  private refreshBars() {
    const hpRatio = Phaser.Math.Clamp(this.heroHp / state.maxHp, 0, 1);
    const manaRatio = Phaser.Math.Clamp(this.heroMana / state.maxMana, 0, 1);
    const enemyRatio = Phaser.Math.Clamp(this.enemyHp / this.enemyMax, 0, 1);
    this.hpFill.displayWidth = 350 * hpRatio;
    this.manaFill.displayWidth = 350 * manaRatio;
    this.enemyFill.displayWidth = 500 * enemyRatio;
    this.hpText.setText(`Мавка  ${this.heroHp}/${state.maxHp}`);
    this.manaText.setText(`Мана ${this.heroMana}/${state.maxMana}`);
    this.enemyText.setText(`${this.encounter.name}  ${this.enemyHp}/${this.enemyMax}`);
  }

  private log(message: string) {
    this.logText?.setText(message);
  }

  private floatNumber(x: number, y: number, value: string, color: string) {
    const t = gameText(this, x, y, value, 30, color, 0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, scale: 1.25, duration: 720, onComplete: () => t.destroy() });
  }

  private flashMessage(value: string, color: string) {
    const t = gameText(this, W / 2, 220, value, 30, color, 0.5).setDepth(70);
    this.tweens.add({ targets: t, alpha: 0, y: 190, duration: 700, onComplete: () => t.destroy() });
  }

  private victory() {
    this.busy = true;
    const coins = Phaser.Math.Between(this.encounter.coinMin, this.encounter.coinMax);
    const herbs = Phaser.Math.Between(this.encounter.herbMin, this.encounter.herbMax);
    const crystals = Phaser.Math.Between(0, 99) < this.encounter.crystalChance ? 1 : 0;
    const xp = this.encounter.xp + (this.encounter.boss ? state.bossWins * 25 : 0);

    state.coins += coins;
    state.herbs += herbs;
    state.crystals += crystals;
    state.battlesWon += 1;
    state.encounterWins[this.encounter.id] = (state.encounterWins[this.encounter.id] ?? 0) + 1;
    if (state.battlesWon === 1) unlockAchievement('first_blood');
    if ((state.encounterWins.potershata ?? 0) + (state.encounterWins.mirebeast ?? 0) >= 6) unlockAchievement('swamp_hunter');
    if (this.encounter.boss) {
      state.bossWins += 1;
      state.quests.swamp = 1;
      unlockAchievement('guardian');
    }
    state.hp = Math.max(1, this.heroHp);
    state.mana = this.heroMana;
    const levels = gainXp(state, xp);
    saveState(state);

    this.showEndModal(
      'ПЕРЕМОГА',
      `${this.encounter.name} переможений.\n+${coins} монет   +${herbs} трав   +${xp} XP${crystals ? '   +1 кристал' : ''}${levels ? '   • НОВИЙ РІВЕНЬ' : ''}`,
      true
    );
  }

  private defeat() {
    this.busy = true;
    state.hp = Math.ceil(state.maxHp * 0.45);
    state.mana = Math.ceil(state.maxMana * 0.5);
    saveState(state);
    this.showEndModal('ВІДСТУП', 'Пуща повернула Мавку до табору. Частину сил відновлено.', false);
  }

  private showEndModal(title: string, body: string, won: boolean) {
    const c = this.add.container(0, 0).setDepth(90);
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62).setInteractive();
    const parts = ornatePanel(this, W / 2, H / 2, 600, 300);
    const heading = gameText(this, W / 2, 290, title, 40, won ? '#d8f2a5' : '#f1b096', 0.5);
    const info = uiText(this, W / 2, 355, body, 17, '#e7dcc4', 0.5).setWordWrapWidth(500).setAlign('center');
    const action = button(this, W / 2, 445, 280, 50, won ? 'Повернутися в Пущу' : 'До табору', () => this.scene.start('region'), won ? 0x69bd83 : 0xa9794e);
    c.add([shade, ...parts, heading, info, action.box, action.label]);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#040a07',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H
  },
  scene: [BootScene, TitleScene, RegionScene, BattleScene]
};

const mavkaGame = new Phaser.Game(config);

(window as Window & { __MAVKA_GAME__?: Phaser.Game }).__MAVKA_GAME__ = mavkaGame;

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The game remains fully playable if service-worker registration is unavailable.
    });
  }, { once: true });
}
