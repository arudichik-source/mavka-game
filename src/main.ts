import * as Phaser from 'phaser';
import './styles.css';

const W = 1280;
const H = 720;

const COLORS = {
  ink: 0x07100d,
  panel: 0x0c1713,
  panel2: 0x13231b,
  gold: 0xd8aa49,
  gold2: 0xf3d58b,
  cream: '#f8eed1',
  muted: '#c8b98e',
  green: 0x4f9a68,
  green2: 0x73c98a,
  cyan: 0x67d9c5,
  red: 0xb84536,
  blue: 0x3b7fd4
};

type SaveState = {
  level: number;
  xp: number;
  coins: number;
  crystals: number;
  herbs: number;
  victories: number;
  questFlags: Record<string, boolean>;
  inventory: Record<string, number>;
};

const DEFAULT_SAVE: SaveState = {
  level: 5,
  xp: 0,
  coins: 12450,
  crystals: 36,
  herbs: 128,
  victories: 0,
  questFlags: {
    mill: false,
    swamp: false,
    oak: false
  },
  inventory: {
    'Лист Пущі': 3,
    'Лісова есенція': 1,
    'Синій кристал': 2,
    'Цілюща трава': 5
  }
};

function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem('mavka-save-v2');
    if (!raw) return structuredClone(DEFAULT_SAVE);
    return { ...structuredClone(DEFAULT_SAVE), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

function saveGame(state: SaveState) {
  localStorage.setItem('mavka-save-v2', JSON.stringify(state));
}

function resetSave() {
  localStorage.removeItem('mavka-save-v2');
}

function txt(scene: Phaser.Scene, x: number, y: number, value: string, size = 20, color = COLORS.cream, originX = 0) {
  return scene.add.text(x, y, value, {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: `${size}px`,
    color,
    stroke: '#000000',
    strokeThickness: size >= 26 ? 3 : 2,
    lineSpacing: 4
  }).setOrigin(originX, 0.5);
}

function small(scene: Phaser.Scene, x: number, y: number, value: string, color = COLORS.muted, originX = 0) {
  return txt(scene, x, y, value, 14, color, originX);
}

function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.95) {
  const bg = scene.add.rectangle(x, y, w, h, COLORS.panel, alpha).setStrokeStyle(2, COLORS.gold, 0.78);
  scene.add.rectangle(x, y, w - 10, h - 10, 0x000000, 0).setStrokeStyle(1, COLORS.gold2, 0.18);
  return bg;
}

function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, cb: () => void, accent = COLORS.gold) {
  const bg = scene.add.rectangle(x, y, w, h, COLORS.panel2, 0.98)
    .setStrokeStyle(2, accent, 0.9)
    .setInteractive({ useHandCursor: true });
  const t = txt(scene, x, y, label, 18, COLORS.cream, 0.5);
  bg.on('pointerover', () => bg.setFillStyle(accent, 0.2));
  bg.on('pointerout', () => bg.setFillStyle(COLORS.panel2, 0.98));
  bg.on('pointerdown', cb);
  return { bg, t };
}

function addAmbient(scene: Phaser.Scene, area = { x1: 0, x2: W, y1: 0, y2: H }) {
  for (let i = 0; i < 24; i++) {
    const mote = scene.add.circle(
      Phaser.Math.Between(area.x1, area.x2),
      Phaser.Math.Between(area.y1, area.y2),
      Phaser.Math.Between(1, 3),
      i % 3 === 0 ? 0xffd97a : 0x82e6a1,
      Phaser.Math.FloatBetween(0.16, 0.5)
    ).setDepth(3);
    scene.tweens.add({
      targets: mote,
      y: mote.y - Phaser.Math.Between(14, 38),
      x: mote.x + Phaser.Math.Between(-10, 10),
      alpha: Phaser.Math.FloatBetween(0.12, 0.7),
      duration: Phaser.Math.Between(1700, 4200),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }
}

function drawForestBackdrop(scene: Phaser.Scene, darker = false) {
  scene.add.rectangle(W / 2, H / 2, W, H, darker ? 0x08130f : 0x0b2018);
  scene.add.rectangle(W / 2, 135, W, 270, darker ? 0x17302e : 0x244945, 0.82);

  const mountains = scene.add.graphics();
  mountains.fillStyle(darker ? 0x182822 : 0x263f3a, 1);
  [[0, 280, 170, 70, 340, 280], [170, 280, 385, 95, 575, 280], [430, 280, 650, 55, 860, 280], [700, 280, 930, 92, 1150, 280], [940, 280, 1180, 60, 1280, 280]].forEach(p => mountains.fillTriangle(...p as [number,number,number,number,number,number]));

  for (let i = 0; i < 58; i++) {
    const x = Phaser.Math.Between(0, W);
    const h = Phaser.Math.Between(80, 190);
    scene.add.triangle(x, Phaser.Math.Between(300, 470), -32, h / 2, 0, -h / 2, 32, h / 2, i % 2 ? 0x123b2b : 0x0f2f23, 0.96);
    scene.add.rectangle(x, 390, 7, 85, 0x3c2b22, 0.65);
  }
}

function heroPortrait(scene: Phaser.Scene, x: number, y: number, scale = 1) {
  const c = scene.add.container(x, y);
  const glow = scene.add.circle(0, 0, 60 * scale, 0x4ea16b, 0.12).setStrokeStyle(2, 0xcaa45b, 0.65);
  const hair = scene.add.ellipse(0, -6 * scale, 70 * scale, 95 * scale, 0x17362f, 1);
  const face = scene.add.ellipse(0, -8 * scale, 44 * scale, 54 * scale, 0xe3b995, 1);
  const hood = scene.add.arc(0, -26 * scale, 34 * scale, 200, 340, false, 0x224b37, 1);
  const wreath = scene.add.arc(0, -37 * scale, 28 * scale, 180, 360, false, 0x657d3d, 1);
  const eye1 = scene.add.circle(-8 * scale, -10 * scale, 2.5 * scale, 0x2f4e38);
  const eye2 = scene.add.circle(8 * scale, -10 * scale, 2.5 * scale, 0x2f4e38);
  c.add([glow, hair, face, hood, wreath, eye1, eye2]);
  return c;
}

class BootScene extends Phaser.Scene {
  private save = loadSave();

  constructor() { super('boot'); }

  create() {
    drawForestBackdrop(this, true);
    addAmbient(this);

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.28);
    txt(this, 86, 122, 'МАВКА', 72, '#f2d083');
    txt(this, 93, 181, 'ЛЕГЕНДИ ПУЩІ', 22, '#d2bd7a');
    small(this, 93, 216, '2D browser RPG • playable alpha', '#9fd5bb');

    heroPortrait(this, 965, 320, 2.4);
    const wolf = this.add.container(1060, 470);
    wolf.add([
      this.add.ellipse(0, 0, 160, 78, 0x8e9996),
      this.add.circle(75, -26, 40, 0xa5aeaa),
      this.add.triangle(58, -60, -16, 14, 0, -26, 16, 14, 0x7f8a86),
      this.add.triangle(86, -62, -16, 14, 0, -26, 16, 14, 0x7f8a86)
    ]);

    panel(this, 244, 410, 360, 330, 0.9);
    button(this, 244, 315, 300, 54, 'Продовжити', () => this.scene.start('region'), 0x66c77d);
    button(this, 244, 385, 300, 54, 'Нова гра', () => {
      resetSave();
      this.save = loadSave();
      this.scene.start('region');
    });
    button(this, 244, 455, 300, 54, 'Довідник', () => this.showInfo());
    button(this, 244, 525, 300, 54, 'Налаштування', () => this.showSettings());
    small(this, 244, 584, `Рівень ${this.save.level} • Перемог ${this.save.victories} • ${this.save.coins} монет`, '#b7d9c5', 0.5);

    small(this, 26, 694, 'v0.2 alpha • GitHub build', '#7e927f');
  }

  private overlayTitle(title: string) {
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setDepth(50);
    panel(this, 640, 360, 620, 400, 0.98).setDepth(51);
    txt(this, 640, 205, title, 34, '#f2d083', 0.5).setDepth(52);
    const close = button(this, 640, 500, 220, 48, 'Закрити', () => [shade, ...this.children.list.filter(o => (o as any).depth >= 51)].forEach(o => o.destroy())).bg;
    close.setDepth(53);
  }

  private showInfo() {
    this.overlayTitle('Довідник');
    txt(this, 380, 275, 'Мета:', 20, '#f0d184').setDepth(52);
    small(this, 380, 310, 'Досліджуй регіони, виконуй завдання, збирай спорядження\nі перемагай істот Пущі.', '#d9ceb1').setDepth(52);
    txt(this, 380, 375, 'Керування:', 20, '#f0d184').setDepth(52);
    small(this, 380, 410, 'Миша / дотик. У бою використовуй 5 навичок або автобій.', '#d9ceb1').setDepth(52);
  }

  private showSettings() {
    this.overlayTitle('Налаштування');
    small(this, 640, 320, 'Звук і музика з’являться після підключення фінальних аудіо-ресурсів.', '#d9ceb1', 0.5).setDepth(52);
    button(this, 640, 395, 260, 46, 'Скинути прогрес', () => {
      resetSave();
      this.save = loadSave();
      this.scene.restart();
    }, 0xb95a48).bg.setDepth(53);
  }
}

type Landmark = { key: string; name: string; level: string; x: number; y: number; accent: number; battle?: boolean; desc: string; };

const LANDMARKS: Landmark[] = [
  { key: 'village', name: 'Поселення Мавки', level: '1–5', x: 340, y: 370, accent: 0xd1a34e, desc: 'Торгівля, ремесла і нові союзники.' },
  { key: 'oak', name: 'Старий Дуб', level: '5–8', x: 650, y: 205, accent: 0xd1a34e, desc: 'Духи Пущі та давні знання.' },
  { key: 'shrine', name: 'Святилище', level: '10–15', x: 880, y: 160, accent: 0xb99858, desc: 'Очищення та сила природи.' },
  { key: 'hunter', name: 'Стежка Мисливця', level: '3–5', x: 810, y: 315, accent: 0xc28f49, desc: 'Полювання та рідкісні знахідки.' },
  { key: 'mill', name: 'Старий Млин', level: '6–10', x: 680, y: 445, accent: 0xe0b056, desc: 'Таємниця старого мельника.' },
  { key: 'valley', name: 'Ярин Дол', level: '6–9', x: 325, y: 510, accent: 0xc59b5c, desc: 'Трави, поля і побічні історії.' },
  { key: 'swamp', name: 'Туманні Болота', level: '5–8', x: 930, y: 550, accent: 0x59c284, battle: true, desc: 'Небезпечна зона. Тут чекає Болотний Хранитель.' }
];

class RegionScene extends Phaser.Scene {
  private save = loadSave();
  private selected = LANDMARKS[0];
  private selection!: Phaser.GameObjects.Arc;
  private title!: Phaser.GameObjects.Text;
  private description!: Phaser.GameObjects.Text;

  constructor() { super('region'); }

  create() {
    this.save = loadSave();
    this.drawWorld();
    this.drawHUD();
    this.drawLandmarks();
    this.drawQuestPanel();
    this.drawBottomNav();
    this.drawSelectionCard();
    this.select(this.selected);
  }

  private drawWorld() {
    drawForestBackdrop(this);

    // valley terraces
    for (let i = 0; i < 6; i++) {
      this.add.ellipse(570 + i * 70, 375 + i * 18, 540 - i * 50, 160 - i * 8, i % 2 ? 0x264a32 : 0x31573a, 0.8).setDepth(1);
    }

    // river and waterfalls
    const river = this.add.graphics().setDepth(2);
    river.lineStyle(55, 0x4ba5ae, 0.65);
    river.beginPath();
    river.moveTo(520, 255);
    river.lineTo(555, 345);
    river.lineTo(660, 405);
    river.lineTo(710, 510);
    river.lineTo(850, 610);
    river.strokePath();
    river.lineStyle(12, 0xb2ecdf, 0.28);
    river.strokePath();

    [500, 592, 755].forEach((x, idx) => {
      const fall = this.add.rectangle(x, 320 + idx * 35, 24, 100, 0xa9e8e1, 0.46).setDepth(2);
      this.tweens.add({ targets: fall, alpha: { from: 0.25, to: 0.62 }, duration: 1200 + idx * 280, yoyo: true, repeat: -1 });
    });

    // ancient oak
    const oak = this.add.container(650, 240).setDepth(3);
    oak.add([
      this.add.rectangle(0, 18, 64, 188, 0x5e4027).setStrokeStyle(3, 0x9a7441, 0.5),
      this.add.circle(-80, -50, 84, 0x24543a),
      this.add.circle(0, -92, 110, 0x2b5f3d),
      this.add.circle(90, -48, 88, 0x244f37),
      this.add.circle(0, -8, 28, 0xf2d46c, 0.18).setStrokeStyle(3, 0xffdf85, 0.86)
    ]);
    this.tweens.add({ targets: oak.list[4] as Phaser.GameObjects.GameObject, alpha: { from: 0.12, to: 0.34 }, scale: { from: 0.9, to: 1.18 }, duration: 1700, yoyo: true, repeat: -1 });

    // houses
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(120, 860);
      const y = Phaser.Math.Between(315, 560);
      const house = this.add.container(x, y).setDepth(3);
      house.add([
        this.add.rectangle(0, 0, Phaser.Math.Between(28, 52), Phaser.Math.Between(24, 38), 0x6b472d),
        this.add.triangle(0, -24, -30, 18, 0, -12, 30, 18, 0x33261d),
        this.add.rectangle(0, 2, 7, 10, 0xf3b85a, 0.92)
      ]);
    }

    // mill
    const mill = this.add.container(690, 458).setDepth(4);
    mill.add([this.add.rectangle(0, 0, 82, 58, 0x61412b), this.add.triangle(0, -45, -50, 30, 0, -20, 50, 30, 0x30231b)]);
    const wheel = this.add.circle(-55, 20, 38, 0x2c2016).setStrokeStyle(6, 0xaa7d42, 1);
    mill.add(wheel);
    for (let a = 0; a < 8; a++) mill.add(this.add.rectangle(-55, 20, 3, 68, 0xc49556).setAngle(a * 22.5));
    this.tweens.add({ targets: wheel, angle: 360, duration: 8500, repeat: -1 });

    // swamp glow
    this.add.ellipse(960, 570, 300, 170, 0x194947, 0.68).setDepth(2);
    const swampGlow = this.add.ellipse(960, 570, 230, 100, 0x56db88, 0.13).setDepth(3);
    this.tweens.add({ targets: swampGlow, alpha: { from: 0.07, to: 0.24 }, scale: { from: 0.95, to: 1.06 }, duration: 1600, yoyo: true, repeat: -1 });

    heroPortrait(this, 138, 603, 1.3).setDepth(6);
    addAmbient(this, { x1: 100, x2: 1030, y1: 80, y2: 620 });
  }

  private drawHUD() {
    panel(this, 185, 60, 340, 104, 0.96).setDepth(20);
    heroPortrait(this, 55, 58, 0.48).setDepth(21);
    txt(this, 102, 34, 'Мавка', 25, COLORS.cream).setDepth(21);
    small(this, 102, 58, `Рівень ${this.save.level}`, '#e0c77d').setDepth(21);
    this.add.rectangle(102, 84, 212, 14, 0x411714).setOrigin(0, 0.5).setDepth(21);
    this.add.rectangle(102, 84, 212, 14, 0xc5473b).setOrigin(0, 0.5).setDepth(22);
    small(this, 208, 84, '320 / 320', '#fff6ee', 0.5).setDepth(23);
    this.add.rectangle(102, 105, 212, 12, 0x10263f).setOrigin(0, 0.5).setDepth(21);
    this.add.rectangle(102, 105, 212, 12, 0x3b82d5).setOrigin(0, 0.5).setDepth(22);
    small(this, 208, 105, '180 / 180', '#eaf6ff', 0.5).setDepth(23);

    const resources = [
      ['●', this.save.coins.toLocaleString('uk-UA'), '#f5c85e'],
      ['◆', String(this.save.crystals), '#67dbff'],
      ['♣', String(this.save.herbs), '#7ed68b']
    ];
    resources.forEach((r, i) => {
      const x = 660 + i * 130;
      panel(this, x, 40, 116, 44, 0.95).setDepth(20);
      txt(this, x - 43, 40, r[0], 19, r[2]).setDepth(21);
      txt(this, x + 6, 40, r[1], 18, COLORS.cream, 0.5).setDepth(21);
    });

    button(this, 1045, 40, 48, 44, '✉', () => this.toast('Нових повідомлень немає.')).bg.setDepth(20);
    button(this, 1102, 40, 48, 44, '⚙', () => this.scene.start('settings')).bg.setDepth(20);
  }

  private drawLandmarks() {
    this.selection = this.add.circle(this.selected.x, this.selected.y, 34, 0xffdf82, 0.08).setStrokeStyle(3, 0xffdf82, 0.75).setDepth(12);

    LANDMARKS.forEach(spot => {
      const marker = this.add.polygon(spot.x, spot.y, [0,-24,24,0,0,24,-24,0], COLORS.panel, 1)
        .setStrokeStyle(3, spot.battle ? 0x71dd92 : spot.accent, 0.95)
        .setDepth(13)
        .setInteractive({ useHandCursor: true });
      txt(this, spot.x, spot.y, spot.battle ? '✚' : '✦', 18, spot.battle ? '#84f0a5' : '#f4d57f', 0.5).setDepth(14);
      const plate = this.add.rectangle(spot.x + 88, spot.y, 150, 42, COLORS.panel, 0.93).setStrokeStyle(1, COLORS.gold, 0.64).setDepth(12).setInteractive({ useHandCursor: true });
      txt(this, spot.x + 20, spot.y - 9, spot.name, 15, COLORS.cream).setDepth(13);
      small(this, spot.x + 20, spot.y + 12, `Рівень ${spot.level}`, '#c5b991').setDepth(13);
      [marker, plate].forEach(hit => {
        hit.on('pointerdown', () => this.select(spot));
        hit.on('pointerover', () => marker.setScale(1.08));
        hit.on('pointerout', () => marker.setScale(1));
      });
    });
  }

  private drawQuestPanel() {
    panel(this, 1155, 370, 225, 590, 0.96).setDepth(20);
    txt(this, 1055, 95, 'Завдання', 24, '#f2d486').setDepth(21);
    const quests = [
      ['Таємниця Старого Млина', this.save.questFlags.mill ? 'Виконано' : 'Поговори з мельником'],
      ['Зниклі Потерчата', this.save.questFlags.swamp ? 'Виконано' : 'Досліди Туманні Болота'],
      ['Сила Дуба', this.save.questFlags.oak ? 'Виконано' : 'Знайди 3 листки Дуба']
    ];
    quests.forEach((q, i) => {
      const y = 155 + i * 105;
      this.add.rectangle(1155, y, 196, 86, 0x101b17, 0.92).setStrokeStyle(1, i === 0 ? COLORS.gold : 0x57695b, 0.6).setDepth(21);
      txt(this, 1068, y - 23, q[0], 15, '#ecd07e').setDepth(22);
      small(this, 1068, y + 6, q[1], this.save.questFlags[['mill','swamp','oak'][i]] ? '#74d89a' : '#d2c6aa').setDepth(22);
    });
    txt(this, 1058, 475, 'Можливі нагороди', 17, '#f1d182').setDepth(21);
    ['♣','◆','▣','✦','●'].forEach((icon, i) => {
      this.add.rectangle(1080 + (i % 3) * 62, 520 + Math.floor(i / 3) * 62, 46, 46, 0x14231c, 1).setStrokeStyle(1, COLORS.gold, 0.55).setDepth(21);
      txt(this, 1080 + (i % 3) * 62, 520 + Math.floor(i / 3) * 62, icon, 18, ['#76d487','#70d9ff','#e2b660','#c895f2','#f3c95a'][i], 0.5).setDepth(22);
    });
  }

  private drawBottomNav() {
    const items = [
      ['Герої', 'heroes'],
      ['Рюкзак', 'inventory'],
      ['Спорядження', 'inventory'],
      ['Навички', 'skills'],
      ['Кузня', 'forge'],
      ['Крамниця', 'shop']
    ];
    items.forEach((it, i) => {
      const x = 280 + i * 132;
      button(this, x, 680, 120, 48, it[0], () => this.scene.start(it[1] as string), i === 1 ? 0x5cbf81 : COLORS.gold).bg.setDepth(20);
    });
    button(this, 55, 680, 90, 48, 'Меню', () => this.scene.start('boot')).bg.setDepth(20);
  }

  private drawSelectionCard() {
    panel(this, 650, 606, 570, 105, 0.94).setDepth(20);
    this.title = txt(this, 385, 580, '', 22, '#f0d286').setDepth(21);
    this.description = small(this, 385, 611, '', '#d4c9ad').setDepth(21);
    button(this, 845, 606, 190, 48, 'Вирушити', () => this.activate(), 0x5fc780).bg.setDepth(21);
  }

  private select(spot: Landmark) {
    this.selected = spot;
    this.tweens.add({ targets: this.selection, x: spot.x, y: spot.y, duration: 220, ease: 'Sine.out' });
    this.title?.setText(spot.name);
    this.description?.setText(spot.desc);
  }

  private activate() {
    if (this.selected.battle) {
      this.scene.start('battle');
      return;
    }
    if (this.selected.key === 'mill') this.scene.start('dialogue');
    else if (this.selected.key === 'oak') this.scene.start('oak');
    else this.toast(`${this.selected.name}: зона відкрита у цій alpha-збірці як точка дослідження.`);
  }

  private toast(message: string) {
    const t = panel(this, 640, 630, 620, 44, 0.98).setDepth(50);
    const tt = small(this, 640, 630, message, '#e8dcc0', 0.5).setDepth(51);
    this.time.delayedCall(2300, () => { t.destroy(); tt.destroy(); });
  }
}

class DialogueScene extends Phaser.Scene {
  private save = loadSave();
  constructor() { super('dialogue'); }
  create() {
    drawForestBackdrop(this, true);
    this.add.rectangle(640, 510, 1280, 420, 0x110d09, 0.58);
    // miller portrait
    const p = this.add.container(340, 350);
    p.add([
      this.add.rectangle(0, 80, 170, 220, 0x443423),
      this.add.circle(0, -10, 78, 0xd1ad86),
      this.add.arc(0, -50, 85, 180, 360, false, 0x2b221a),
      this.add.rectangle(0, 60, 100, 120, 0x6b4f34)
    ]);
    txt(this, 600, 170, 'Старий Млин', 34, '#f0d185');
    txt(this, 600, 225, 'Мельник', 24, '#f0d185');
    small(this, 600, 270, 'Ти прийшла... Я відчував, що хтось із Пущі ще пам’ятає цю стежку.\nОстанніми ночами біля млина чутно не лише вітер.', '#ddd0b1');
    const options = [
      'Що саме відбувається?',
      'Чи бачив ти когось підозрілого?',
      'Я допоможу перевірити підвал.'
    ];
    options.forEach((o, i) => button(this, 700, 370 + i * 65, 500, 48, o, () => this.choose(i), i === 2 ? 0x5ec47e : COLORS.gold));
    button(this, 1120, 660, 220, 46, '← Назад', () => this.scene.start('region'));
  }
  private choose(i: number) {
    if (i === 2) {
      this.save.questFlags.mill = true;
      this.save.coins += 350;
      saveGame(this.save);
      this.scene.start('region');
    }
  }
}

class OakScene extends Phaser.Scene {
  private save = loadSave();
  constructor() { super('oak'); }
  create() {
    drawForestBackdrop(this, true);
    const oak = this.add.container(640, 300);
    oak.add([
      this.add.rectangle(0, 80, 120, 320, 0x654327),
      this.add.circle(-140, -80, 140, 0x2b5a3b),
      this.add.circle(0, -130, 180, 0x326746),
      this.add.circle(150, -70, 145, 0x2a5b3d),
      this.add.circle(0, 30, 48, 0xf6d46c, 0.18).setStrokeStyle(5, 0xffe29a, 0.8)
    ]);
    addAmbient(this);
    panel(this, 640, 610, 720, 140, 0.94);
    txt(this, 640, 570, 'Голос Старого Дуба', 28, '#f1d184', 0.5);
    small(this, 640, 610, 'Пуща пам’ятає кожен крок. Принеси три листки, і я відкрию тобі новий шлях.', '#dbd0b4', 0.5);
    button(this, 520, 660, 220, 46, 'Прийняти дар', () => {
      this.save.questFlags.oak = true;
      this.save.herbs += 3;
      saveGame(this.save);
      this.scene.start('region');
    }, 0x63c984);
    button(this, 760, 660, 180, 46, 'Назад', () => this.scene.start('region'));
  }
}

class InventoryScene extends Phaser.Scene {
  private save = loadSave();
  constructor() { super('inventory'); }
  create() {
    drawForestBackdrop(this, true);
    panel(this, 640, 360, 1000, 610, 0.97);
    txt(this, 180, 92, 'Рюкзак', 34, '#f0d083');
    small(this, 180, 126, 'Зібрані предмети і ресурси', '#cdbf9a');
    const entries = Object.entries(this.save.inventory);
    entries.forEach(([name, qty], i) => {
      const x = 270 + (i % 4) * 205;
      const y = 230 + Math.floor(i / 4) * 145;
      this.add.rectangle(x, y, 160, 118, 0x14221c, 1).setStrokeStyle(2, COLORS.gold, 0.48);
      this.add.circle(x, y - 18, 28, [0x6fcf86,0x6ac9f1,0xb68ce4,0xe8b75f][i % 4], 0.3).setStrokeStyle(2, COLORS.gold2, 0.4);
      txt(this, x, y - 17, ['♣','◆','✦','✚'][i % 4], 24, COLORS.cream, 0.5);
      txt(this, x, y + 30, name, 15, COLORS.cream, 0.5);
      small(this, x, y + 53, `x${qty}`, '#a9d8bd', 0.5);
    });
    panel(this, 640, 555, 720, 100, 0.9);
    txt(this, 310, 530, 'Посох Пущі', 21, '#69d4ff');
    small(this, 310, 560, '+25 до магічної сили • +12 до здоров’я • +8% критичної магії', '#d8cdb2');
    button(this, 920, 555, 180, 48, 'Спорядити', () => this.toast('Посох споряджено.'));
    button(this, 1080, 660, 180, 46, 'Назад', () => this.scene.start('region'));
  }
  private toast(m: string) { small(this, 640, 620, m, '#80dca5', 0.5); }
}

class SimplePanelScene extends Phaser.Scene {
  constructor(private keyName: string, private heading: string, private body: string) { super(keyName); }
  create() {
    drawForestBackdrop(this, true);
    panel(this, 640, 360, 900, 520, 0.97);
    txt(this, 640, 170, this.heading, 36, '#f0d184', 0.5);
    small(this, 640, 250, this.body, '#ddd1b3', 0.5);
    button(this, 640, 555, 240, 48, 'Повернутися', () => this.scene.start('region'));
  }
}

class SettingsScene extends Phaser.Scene {
  constructor() { super('settings'); }
  create() {
    drawForestBackdrop(this, true);
    panel(this, 640, 360, 760, 500, 0.97);
    txt(this, 640, 170, 'Налаштування', 36, '#f0d184', 0.5);
    small(this, 640, 245, 'Поточна alpha: графіка та анімації оптимізовані для браузера.', '#ddd1b3', 0.5);
    button(this, 640, 340, 300, 48, 'Скинути прогрес', () => { resetSave(); this.scene.start('boot'); }, 0xb95947);
    button(this, 640, 420, 300, 48, 'Назад', () => this.scene.start('region'));
  }
}

class BattleScene extends Phaser.Scene {
  private save = loadSave();
  private heroMax = 320;
  private heroHp = 320;
  private manaMax = 180;
  private mana = 180;
  private enemyMax = 1240;
  private enemyHp = 1240;
  private heroBar!: Phaser.GameObjects.Rectangle;
  private manaBar!: Phaser.GameObjects.Rectangle;
  private enemyBar!: Phaser.GameObjects.Rectangle;
  private heroHpText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private hero!: Phaser.GameObjects.Container;
  private wolf!: Phaser.GameObjects.Container;
  private enemy!: Phaser.GameObjects.Container;
  private busy = false;
  private rooted = false;
  private dodging = false;
  private auto = false;
  private autoLabel!: Phaser.GameObjects.Text;
  private cds = [false,false,false,false,false];

  constructor() { super('battle'); }

  create() {
    this.save = loadSave();
    this.heroHp = this.heroMax; this.mana = this.manaMax; this.enemyHp = this.enemyMax;
    this.drawBattlefield();
    this.drawActors();
    this.drawHUD();
    this.drawSkills();
    this.refresh();
    this.log('Бій розпочато.');
    this.time.addEvent({
      delay: 1500, loop: true,
      callback: () => {
        if (!this.auto || this.busy || this.enemyHp <= 0 || this.heroHp <= 0) return;
        const choices = [0,1,2,3,4].filter(i => !this.cds[i] && this.mana >= [22,32,28,26,40][i]);
        if (choices.length) this.useSkill(Phaser.Utils.Array.GetRandom(choices));
      }
    });
  }

  private drawBattlefield() {
    drawForestBackdrop(this, true);
    this.add.ellipse(640, 555, 1100, 260, 0x102219, 0.96);
    this.add.ellipse(920, 485, 360, 190, 0x1f604c, 0.28);
    this.add.ellipse(920, 485, 250, 130, 0x68e28c, 0.08);
    addAmbient(this, { x1: 60, x2: 1200, y1: 170, y2: 560 });
  }

  private drawActors() {
    this.hero = this.add.container(360, 450).setDepth(8);
    this.hero.add([
      this.add.circle(0, -35, 72, 0x5cd17c, 0.08).setStrokeStyle(2, 0x8be3a2, 0.3),
      this.add.rectangle(0, 0, 48, 120, 0x245c3c).setStrokeStyle(2, 0xd4b966, 0.45),
      this.add.triangle(0, 62, -48, 42, 0, -40, 48, 42, 0x274e37),
      this.add.circle(0, -80, 28, 0xe0b993),
      this.add.arc(0, -84, 36, 190, 350, false, 0x17332a),
      this.add.rectangle(54, -8, 8, 170, 0x6d4a2d).setAngle(12),
      this.add.circle(70, -92, 16, 0x66ef8c, 0.95).setStrokeStyle(3, 0xb8ffc5, 0.65)
    ]);
    this.tweens.add({ targets: this.hero, y: 445, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.wolf = this.add.container(470, 500).setDepth(8);
    this.wolf.add([
      this.add.ellipse(0, 0, 110, 52, 0x8f9895),
      this.add.circle(54, -20, 30, 0xa9b0ad),
      this.add.triangle(44, -48, -13, 12, 0, -24, 13, 12, 0x858d89),
      this.add.triangle(66, -48, -13, 12, 0, -24, 13, 12, 0x858d89)
    ]);
    this.tweens.add({ targets: this.wolf, y: 495, duration: 800, yoyo: true, repeat: -1 });

    this.enemy = this.add.container(900, 420).setDepth(8);
    const aura = this.add.circle(0, 0, 125, 0x71f05e, 0.08);
    this.enemy.add([
      aura,
      this.add.rectangle(-62, 80, 28, 170, 0x3b3228).setAngle(14),
      this.add.rectangle(62, 80, 28, 170, 0x3b3228).setAngle(-14),
      this.add.rectangle(0, 10, 135, 220, 0x3d3428).setStrokeStyle(4, 0x738047, 0.55),
      this.add.circle(-24, -22, 70, 0x2c4a2f, 0.8),
      this.add.circle(0, -96, 48, 0x2e2a23).setStrokeStyle(3, 0x6e7846, 0.7),
      this.add.circle(-16, -101, 7, 0x86ff63),
      this.add.circle(16, -101, 7, 0x86ff63),
      this.add.rectangle(0, -74, 34, 8, 0x78ff57, 0.7)
    ]);
    this.tweens.add({ targets: aura, alpha: { from: 0.04, to: 0.16 }, scale: { from: 0.9, to: 1.14 }, duration: 1300, yoyo: true, repeat: -1 });
  }

  private drawHUD() {
    panel(this, 190, 72, 340, 120, 0.96);
    heroPortrait(this, 55, 56, 0.48);
    txt(this, 98, 34, 'Мавка', 24, COLORS.cream);
    small(this, 98, 58, `Рівень ${this.save.level}`, '#e0c77d');
    this.add.rectangle(98, 86, 210, 17, 0x401613).setOrigin(0,0.5);
    this.heroBar = this.add.rectangle(98, 86, 210, 17, 0xc6473a).setOrigin(0,0.5);
    this.heroHpText = small(this, 203, 86, '', '#fff6ee', 0.5);
    this.add.rectangle(98, 110, 210, 13, 0x11263f).setOrigin(0,0.5);
    this.manaBar = this.add.rectangle(98, 110, 210, 13, 0x3b82d5).setOrigin(0,0.5);
    this.manaText = small(this, 203, 110, '', '#e8f6ff', 0.5);

    panel(this, 800, 62, 500, 90, 0.96);
    txt(this, 800, 34, 'Болотний Хранитель', 24, '#f2d185', 0.5);
    this.add.rectangle(585, 72, 430, 19, 0x3b1512).setOrigin(0,0.5);
    this.enemyBar = this.add.rectangle(585, 72, 430, 19, 0xb64235).setOrigin(0,0.5);
    this.enemyHpText = small(this, 800, 72, '', '#fff3e8', 0.5);
    small(this, 800, 98, 'Коріння • отрута • темна скверна', '#8cdba0', 0.5);

    panel(this, 1140, 335, 240, 390, 0.96);
    txt(this, 1038, 155, 'Журнал бою', 20, '#f0d185');
    this.logText = small(this, 1038, 192, '', '#d9ccb1');
    this.logText.setWordWrapWidth(205);
    txt(this, 1038, 468, 'Здобич', 18, '#f0d185');
    ['♣','◆','✦','●'].forEach((icon,i) => {
      const x = 1065 + (i%2)*80, y = 515 + Math.floor(i/2)*70;
      this.add.rectangle(x,y,52,52,0x14231c,1).setStrokeStyle(1,COLORS.gold,0.6);
      txt(this,x,y,icon,20,['#75d68c','#6bd7f5','#be95e9','#f3c95b'][i],0.5);
    });
    button(this, 1140, 640, 190, 44, '← Відступити', () => this.scene.start('region'));
  }

  private drawSkills() {
    const names = [
      ['Лісова Іскра',22,0x55c879],
      ['Коріння',32,0x8cad52],
      ['Поклик Вовка',28,0x5ba9ce],
      ['Танець Вітру',26,0x75c7df],
      ['Серце Пущі',40,0xd0b55d]
    ] as const;
    names.forEach((s,i) => {
      const x = 130 + i*170, y=645;
      const box = this.add.rectangle(x,y,150,104,0x111c18,0.98).setStrokeStyle(2,s[2],0.9).setInteractive({useHandCursor:true});
      txt(this,x,y-18,s[0],16,COLORS.cream,0.5);
      small(this,x,y+14,`мана ${s[1]}`,'#79caf3',0.5);
      small(this,x,y+38,`${i+1}`,'#e6d18d',0.5);
      box.on('pointerdown',()=>this.useSkill(i));
      box.on('pointerover',()=>box.setFillStyle(s[2],0.18));
      box.on('pointerout',()=>box.setFillStyle(0x111c18,0.98));
    });
    const auto = button(this, 960, 645, 150, 104, 'Автобій: ВИМК', () => {
      this.auto=!this.auto;
      this.autoLabel.setText(this.auto?'Автобій: УВІМК':'Автобій: ВИМК');
    },0x5bc180);
    this.autoLabel=auto.t;
  }

  private useSkill(i:number) {
    if(this.busy||this.enemyHp<=0||this.heroHp<=0||this.cds[i]) return;
    const costs=[22,32,28,26,40];
    if(this.mana<costs[i]) { this.log('Недостатньо мани.'); return; }
    this.busy=true; this.mana-=costs[i]; this.cds[i]=true; this.time.delayedCall(i===4?3500:2400,()=>this.cds[i]=false);
    this.refresh();

    if(i===4){
      const heal=95; this.heroHp=Math.min(this.heroMax,this.heroHp+heal); this.mana=Math.min(this.manaMax,this.mana+18);
      const pulse=this.add.circle(this.hero.x,this.hero.y-20,25,0xcdf28f,0.22).setStrokeStyle(4,0xeaffb3,0.8).setDepth(15);
      this.tweens.add({targets:pulse,scale:4,alpha:0,duration:620,onComplete:()=>pulse.destroy()});
      this.log(`Серце Пущі: +${heal} здоров’я.`); this.refresh();
      this.time.delayedCall(520,()=>this.enemyTurn()); return;
    }

    const dmgBase=[165,95,135,120,0];
    const damage=dmgBase[i]+Phaser.Math.Between(-12,28);
    if(i===1) this.rooted=true;
    if(i===3) this.dodging=true;

    if(i===2) this.tweens.add({targets:this.wolf,x:760,duration:260,yoyo:true,ease:'Sine.inOut'});
    else this.tweens.add({targets:this.hero,x:510,duration:220,yoyo:true,ease:'Sine.inOut'});

    const fx=this.add.ellipse(720,410,250,60,[0x62de83,0x98cc57,0xa8d4e5,0x83d6ee][i],0.18).setStrokeStyle(5,[0x62de83,0x98cc57,0xa8d4e5,0x83d6ee][i],0.85).setDepth(12);
    this.tweens.add({targets:fx,x:900,alpha:0,scaleX:1.25,duration:340,onComplete:()=>fx.destroy()});

    this.time.delayedCall(260,()=>{
      this.enemyHp=Math.max(0,this.enemyHp-damage); this.floatDamage(900,265,`-${damage}`,'#ff8664'); this.refresh();
      this.cameras.main.shake(80,0.005);
      this.log(`Навичка завдає ${damage} шкоди.`);
      if(this.enemyHp<=0)this.victory(); else this.time.delayedCall(420,()=>this.enemyTurn());
    });
  }

  private enemyTurn(){
    if(this.enemyHp<=0||this.heroHp<=0)return;
    if(this.rooted){this.rooted=false;this.log('Коріння стримує Хранителя.');this.busy=false;this.regen();return;}
    this.tweens.add({targets:this.enemy,x:790,duration:240,yoyo:true});
    this.time.delayedCall(240,()=>{
      let damage=Phaser.Math.Between(32,52);
      if(this.dodging){damage=Math.floor(damage*0.25);this.dodging=false;this.log('Танець Вітру пом’якшує удар.');}
      this.heroHp=Math.max(0,this.heroHp-damage); this.floatDamage(370,320,`-${damage}`,'#ffb178'); this.refresh();
      if(this.heroHp<=0)this.defeat(); else {this.log(`Хранитель завдає ${damage} шкоди.`);this.busy=false;this.regen();}
    });
  }

  private regen(){this.mana=Math.min(this.manaMax,this.mana+12);this.refresh();}
  private refresh(){
    this.heroBar.displayWidth=210*(this.heroHp/this.heroMax);
    this.manaBar.displayWidth=210*(this.mana/this.manaMax);
    this.enemyBar.displayWidth=430*(this.enemyHp/this.enemyMax);
    this.heroHpText.setText(`${this.heroHp}/${this.heroMax}`);
    this.manaText.setText(`${this.mana}/${this.manaMax}`);
    this.enemyHpText.setText(`${this.enemyHp}/${this.enemyMax}`);
  }
  private floatDamage(x:number,y:number,v:string,c:string){
    const t=txt(this,x,y,v,34,c,0.5).setDepth(30);
    this.tweens.add({targets:t,y:y-70,alpha:0,scale:1.2,duration:700,onComplete:()=>t.destroy()});
  }
  private log(m:string){
    const lines=this.logText.text.split('\n').filter(Boolean).slice(-6);lines.push('• '+m);this.logText.setText(lines.join('\n'));
  }
  private victory(){
    this.busy=true;
    this.save.victories += 1;
    this.save.coins += 850;
    this.save.xp += 320;
    this.save.questFlags.swamp = true;
    this.save.inventory['Лісова есенція']=(this.save.inventory['Лісова есенція']||0)+1;
    saveGame(this.save);
    this.endModal(true);
  }
  private defeat(){this.busy=true;this.endModal(false);}
  private endModal(win:boolean){
    this.add.rectangle(640,360,W,H,0x000000,0.65).setDepth(60);
    panel(this,640,360,520,270,0.99).setDepth(61);
    txt(this,640,290,win?'Перемога':'Поразка',38,win?'#dff4a6':'#ef9c84',0.5).setDepth(62);
    small(this,640,345,win?'850 монет • 320 досвіду • Лісова есенція':'Спробуй іншу комбінацію навичок.','#d8ccb0',0.5).setDepth(62);
    button(this,640,420,300,50,win?'Повернутися в Серце Пущі':'Спробувати ще',()=>win?this.scene.start('region'):this.scene.restart(),win?0x69c683:0xb95846).bg.setDepth(62);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#07100d',
  render: { antialias: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: [
    BootScene,
    RegionScene,
    DialogueScene,
    OakScene,
    InventoryScene,
    new SimplePanelScene('heroes','Герої','У загоні: Мавка та вовк-компаньйон. Нові герої відкриватимуться через сюжет.'),
    new SimplePanelScene('skills','Навички','5 бойових навичок уже доступні. Подальше дерево розвитку буде пов’язане з рівнем героя.'),
    new SimplePanelScene('forge','Кузня','Покращення спорядження буде відкриватися за монети та ресурси.'),
    new SimplePanelScene('shop','Крамниця','Торгівля ресурсами та косметичними предметами.'),
    SettingsScene,
    BattleScene
  ]
};

new Phaser.Game(config);
