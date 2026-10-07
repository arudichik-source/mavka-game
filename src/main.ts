import * as Phaser from 'phaser';
import './styles.css';

const W = 1280;
const H = 720;

const C = {
  ink: 0x07110d,
  panel: 0x0c1713,
  panel2: 0x13231b,
  gold: 0xd7aa4b,
  gold2: 0xf0d58a,
  cream: '#f7edcf',
  muted: '#c8b98e',
  green: 0x4f9a68,
  greenBright: 0x8bd18c,
  cyan: 0x5fd7c4,
  red: 0xb74335,
  redBright: 0xef6f55,
  blue: 0x3d7fd6,
  swamp: 0x16494b,
  black: 0x050a08
};

type LandmarkData = {
  key: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  color: number;
  icon: string;
  battle?: boolean;
};

const LANDMARKS: LandmarkData[] = [
  { key: 'settlement', name: 'Поселення Мавки', subtitle: 'Люди • ремесла • союзники', x: 258, y: 320, color: 0x4e9e61, icon: '⌂' },
  { key: 'oak', name: 'Старий Дуб', subtitle: 'Духи • знання • благословення', x: 505, y: 190, color: 0xc39a42, icon: '♧' },
  { key: 'shrine', name: 'Святилище', subtitle: 'Очищення • сила природи', x: 765, y: 190, color: 0x4d9f79, icon: '✦' },
  { key: 'hunter', name: 'Стежка Мисливця', subtitle: 'Полювання • рідкісні знахідки', x: 260, y: 526, color: 0xb08b4b, icon: '◇' },
  { key: 'yarin', name: 'Ярин Дол', subtitle: 'Поля • трави • історії', x: 585, y: 490, color: 0xc69f55, icon: '⌂' },
  { key: 'mill', name: 'Старий Млин', subtitle: 'Торгівля • ресурси', x: 842, y: 352, color: 0xd0a14f, icon: '✣' },
  { key: 'swamp', name: 'Туманні Болота', subtitle: 'Небезпека • нові таємниці', x: 965, y: 540, color: 0x4db59b, icon: '≈', battle: true }
];

function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.93) {
  const bg = scene.add.rectangle(x, y, w, h, C.panel, alpha)
    .setStrokeStyle(2, C.gold, 0.72);
  scene.add.rectangle(x, y, w - 10, h - 10, 0x000000, 0)
    .setStrokeStyle(1, C.gold2, 0.18);
  return bg;
}

function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 20,
  color = C.cream,
  align: 'left' | 'center' | 'right' = 'left'
) {
  const originX = align === 'left' ? 0 : align === 'center' ? 0.5 : 1;
  return scene.add.text(x, y, value, {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: `${size}px`,
    color,
    stroke: '#000000',
    strokeThickness: size >= 24 ? 3 : 2,
    align
  }).setOrigin(originX, 0.5);
}

function small(scene: Phaser.Scene, x: number, y: number, value: string, color = C.muted, align: 'left' | 'center' | 'right' = 'left') {
  return text(scene, x, y, value, 14, color, align);
}

function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  accent = C.gold
) {
  const box = scene.add.rectangle(x, y, w, h, C.panel2, 0.98)
    .setStrokeStyle(2, accent, 0.92)
    .setInteractive({ useHandCursor: true });
  const labelText = text(scene, x, y, label, 18, C.cream, 'center');
  box.on('pointerover', () => {
    box.setFillStyle(accent, 0.2);
    labelText.setColor('#fff5d8');
  });
  box.on('pointerout', () => {
    box.setFillStyle(C.panel2, 0.98);
    labelText.setColor(C.cream);
  });
  box.on('pointerdown', onClick);
  return { box, labelText };
}

class RegionScene extends Phaser.Scene {
  private selected = LANDMARKS[0];
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private actionText!: Phaser.GameObjects.Text;
  private actionButton!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private selectionGlow!: Phaser.GameObjects.Arc;

  constructor() {
    super('region');
  }

  create() {
    this.cameras.main.setBackgroundColor('#07110d');
    this.drawLivingRegion();
    this.drawTopBar();
    this.drawLandmarks();
    this.drawQuestPanel();
    this.drawBottomBar();
    this.drawSelectionPanel();
    this.selectLandmark(this.selected);

    for (let i = 0; i < 18; i++) {
      const mote = this.add.circle(
        Phaser.Math.Between(70, 1030),
        Phaser.Math.Between(100, 620),
        Phaser.Math.Between(1, 3),
        i % 3 === 0 ? 0xffd875 : 0x8df0ad,
        Phaser.Math.FloatBetween(0.18, 0.5)
      ).setDepth(3);
      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(14, 38),
        x: mote.x + Phaser.Math.Between(-12, 12),
        alpha: Phaser.Math.FloatBetween(0.1, 0.7),
        duration: Phaser.Math.Between(1800, 4200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    }
  }

  private drawLivingRegion() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a2118);

    // distant sky and cliffs
    this.add.rectangle(640, 120, 1280, 240, 0x284d49, 0.56);
    const mountains = this.add.graphics();
    mountains.fillStyle(0x263f3a, 1);
    mountains.fillTriangle(0, 260, 180, 72, 330, 260);
    mountains.fillTriangle(180, 260, 390, 98, 560, 260);
    mountains.fillTriangle(430, 260, 660, 55, 840, 260);
    mountains.fillTriangle(680, 260, 920, 92, 1120, 260);
    mountains.fillTriangle(900, 260, 1160, 52, 1280, 260);

    // forest masses
    for (let i = 0; i < 54; i++) {
      const x = Phaser.Math.Between(0, 1060);
      const y = Phaser.Math.Between(160, 630);
      const r = Phaser.Math.Between(24, 64);
      const color = i % 4 === 0 ? 0x1b4a2c : i % 4 === 1 ? 0x255a34 : i % 4 === 2 ? 0x143824 : 0x2d6337;
      this.add.circle(x, y, r, color, Phaser.Math.FloatBetween(0.55, 0.9)).setDepth(1);
    }

    // main ancient tree
    const trunk = this.add.rectangle(535, 236, 84, 250, 0x5a3c22).setDepth(2);
    trunk.setStrokeStyle(5, 0x8b6b36, 0.8);
    for (const [dx, dy, rr] of [[-105,-90,105],[0,-118,132],[110,-88,110],[-140,-10,85],[145,0,85]] as const) {
      this.add.circle(535 + dx, 170 + dy, rr, 0x295f35, 0.96).setDepth(2);
    }
    const rune = this.add.circle(535, 170, 40, 0xf2c75d, 0.18).setStrokeStyle(4, 0xffdf84, 0.9).setDepth(3);
    text(this, 535, 170, 'ᛉ', 54, '#ffe8a5', 'center').setDepth(4);
    this.tweens.add({ targets: rune, alpha: { from: 0.14, to: 0.34 }, scale: { from: 0.96, to: 1.06 }, duration: 1800, yoyo: true, repeat: -1 });

    // waterfalls
    for (const x of [440, 610, 690, 805]) {
      const fall = this.add.rectangle(x, Phaser.Math.Between(305, 390), Phaser.Math.Between(12, 24), Phaser.Math.Between(70, 135), 0xaee8e6, 0.44).setDepth(2);
      this.tweens.add({ targets: fall, alpha: { from: 0.26, to: 0.58 }, duration: Phaser.Math.Between(900, 1800), yoyo: true, repeat: -1 });
    }

    // river
    const river = this.add.graphics().setDepth(2);
    river.lineStyle(46, 0x54b9b8, 0.5);
    river.beginPath();
    river.moveTo(410, 376);
    river.lineTo(520, 424);
    river.lineTo(650, 430);
    river.lineTo(725, 500);
    river.lineTo(870, 575);
    river.strokePath();
    river.lineStyle(16, 0xb7f0e6, 0.25);
    river.beginPath();
    river.moveTo(410, 372);
    river.lineTo(520, 418);
    river.lineTo(650, 425);
    river.lineTo(725, 495);
    river.lineTo(870, 570);
    river.strokePath();

    // paths and bridges
    const paths = this.add.graphics().setDepth(2);
    paths.lineStyle(14, 0xa47b43, 0.9);
    paths.beginPath();
    paths.moveTo(170, 500);
    paths.lineTo(305, 455);
    paths.lineTo(430, 435);
    paths.lineTo(560, 470);
    paths.lineTo(705, 430);
    paths.lineTo(860, 350);
    paths.strokePath();
    paths.beginPath();
    paths.moveTo(600, 315);
    paths.lineTo(745, 260);
    paths.lineTo(870, 310);
    paths.strokePath();
    paths.lineStyle(3, 0xe2c374, 0.35);
    paths.strokePath();

    // village glow
    for (let i = 0; i < 13; i++) {
      const x = Phaser.Math.Between(145, 370);
      const y = Phaser.Math.Between(265, 430);
      const house = this.add.rectangle(x, y, Phaser.Math.Between(26, 44), Phaser.Math.Between(20, 34), 0x6a4226, 0.98).setDepth(3);
      house.setStrokeStyle(1, 0xd4a34a, 0.35);
      this.add.triangle(x, y - 20, -24, 16, 0, -10, 24, 16, 0x3f2b22, 1).setDepth(3);
      this.add.rectangle(x, y + 2, 7, 9, 0xf4b85d, 0.9).setDepth(4);
    }

    // mill
    this.add.rectangle(844, 340, 68, 48, 0x5d3b25).setDepth(3).setStrokeStyle(2, C.gold, 0.35);
    const wheel = this.add.circle(805, 354, 30, 0x2c2016, 1).setStrokeStyle(5, 0xa5793e, 1).setDepth(4);
    for (let a = 0; a < 8; a++) {
      const spoke = this.add.rectangle(805, 354, 2, 54, 0xc39655).setAngle(a * 22.5).setDepth(4);
      spoke.setAlpha(0.7);
    }
    this.tweens.add({ targets: wheel, angle: 360, duration: 9000, repeat: -1 });

    // swamp zone
    this.add.rectangle(955, 530, 220, 200, C.swamp, 0.46).setDepth(2);
    for (let i = 0; i < 14; i++) {
      const x = Phaser.Math.Between(875, 1035);
      const y = Phaser.Math.Between(450, 610);
      this.add.rectangle(x, y, 7, Phaser.Math.Between(45, 90), 0x17241f, 0.9).setAngle(Phaser.Math.Between(-8, 8)).setDepth(3);
      this.add.circle(x, y - 38, Phaser.Math.Between(18, 28), 0x16342f, 0.75).setDepth(3);
    }

    // foreground
    this.add.rectangle(640, 686, 1280, 68, 0x050a08, 0.9).setDepth(10);
  }

  private drawTopBar() {
    panel(this, 168, 62, 310, 94, 0.96).setDepth(20);
    text(this, 38, 38, 'Мавка', 28, C.cream).setDepth(21);
    small(this, 38, 65, 'Берегиня Пущі', '#dbc87d').setDepth(21);
    text(this, 285, 42, '32', 24, '#f8dda0', 'center').setDepth(21);
    this.add.rectangle(42, 89, 212, 14, 0x451713).setDepth(21);
    this.add.rectangle(42, 89, 212, 14, 0xc54639).setOrigin(0, 0.5).setDepth(22);
    small(this, 150, 89, '2480 / 2480', '#fff1e8', 'center').setDepth(23);
    this.add.rectangle(42, 110, 212, 12, 0x13283f).setOrigin(0, 0.5).setDepth(21);
    this.add.rectangle(42, 110, 190, 12, 0x367dcc).setOrigin(0, 0.5).setDepth(22);
    small(this, 150, 110, '620 / 680', '#e3f1ff', 'center').setDepth(23);

    const resources = [
      { x: 540, icon: '●', value: '125 670', color: '#f6cb5a' },
      { x: 720, icon: '◆', value: '1 280', color: '#66d9ff' },
      { x: 890, icon: 'ϟ', value: '84 / 120', color: '#ffd16b' }
    ];
    resources.forEach((r) => {
      panel(this, r.x, 48, 160, 48, 0.95).setDepth(20);
      text(this, r.x - 62, 48, r.icon, 20, r.color, 'center').setDepth(21);
      text(this, r.x + 12, 48, r.value, 18, C.cream, 'center').setDepth(21);
      text(this, r.x + 66, 48, '+', 22, '#f3d47d', 'center').setDepth(21);
    });
    makeButton(this, 1010, 48, 54, 48, '✉', () => this.toast('Пошта з’явиться в наступному проході.')).box.setDepth(20);
    makeButton(this, 1070, 48, 54, 48, '⚙', () => this.toast('Налаштування прототипу ще мінімальні.')).box.setDepth(20);
  }

  private drawLandmarks() {
    this.selectionGlow = this.add.circle(this.selected.x, this.selected.y, 34, 0xf4d67a, 0.12)
      .setStrokeStyle(3, 0xffe090, 0.75)
      .setDepth(12);

    LANDMARKS.forEach((spot) => {
      const marker = this.add.circle(spot.x, spot.y, 24, spot.color, 0.96)
        .setStrokeStyle(3, C.gold2, 0.68)
        .setDepth(13)
        .setInteractive({ useHandCursor: true });
      const icon = text(this, spot.x, spot.y - 1, spot.icon, 21, '#fff4c4', 'center').setDepth(14);
      const plate = this.add.rectangle(spot.x, spot.y + 42, 184, 42, C.panel, 0.92)
        .setStrokeStyle(1, C.gold, 0.66)
        .setDepth(12)
        .setInteractive({ useHandCursor: true });
      const name = text(this, spot.x, spot.y + 34, spot.name, 16, C.cream, 'center').setDepth(13);
      const sub = small(this, spot.x, spot.y + 53, spot.subtitle, '#cdbd94', 'center').setDepth(13);
      [marker, plate].forEach((hit) => {
        hit.on('pointerdown', () => this.selectLandmark(spot));
        hit.on('pointerover', () => {
          marker.setScale(1.08);
          plate.setFillStyle(spot.color, 0.28);
        });
        hit.on('pointerout', () => {
          marker.setScale(1);
          plate.setFillStyle(C.panel, 0.92);
        });
      });
      icon.setAlpha(0.96);
      name.setAlpha(0.98);
      sub.setAlpha(0.9);
    });
  }

  private drawQuestPanel() {
    panel(this, 1150, 320, 238, 500, 0.95).setDepth(20);
    text(this, 1048, 94, 'Завдання регіону', 22, '#f3d98e').setDepth(21);
    small(this, 1240, 94, '3 активні', '#73d4bd', 'right').setDepth(21);

    const questY = [138, 225, 312];
    const questData = [
      ['Голос старого дуба', 'Дізнайся, що турбує духів\nу Серці Пущі.', '0/3'],
      ['Стежками мисливця', 'Знайди сліди мисливця\nбіля старого мосту.', '1/4'],
      ['Чисті джерела', 'Очисти джерело біля млина\nвід темної скверни.', '0/1']
    ];
    questData.forEach((q, i) => {
      this.add.rectangle(1150, questY[i], 210, 74, i === 0 ? 0x3a2b16 : 0x0f1b17, 0.9)
        .setStrokeStyle(1, i === 0 ? C.gold : 0x5a6b5d, 0.55)
        .setDepth(21);
      text(this, 1056, questY[i] - 20, q[0], 16, i === 0 ? '#f2d984' : C.cream).setDepth(22);
      small(this, 1056, questY[i] + 4, q[1], '#c6baa0').setDepth(22);
      small(this, 1235, questY[i] + 22, q[2], '#7ad8c2', 'right').setDepth(22);
    });

    text(this, 1048, 375, 'Нагороди регіону', 17, '#f3d98e').setDepth(21);
    ['✦', '♣', '◆', '◈'].forEach((icon, i) => {
      this.add.rectangle(1070 + i * 50, 420, 40, 40, 0x14231b, 1).setStrokeStyle(1, C.gold, 0.6).setDepth(21);
      text(this, 1070 + i * 50, 420, icon, 19, ['#7bdd96','#c690f1','#62d8ec','#f4c661'][i], 'center').setDepth(22);
    });
    small(this, 1048, 464, 'Прототип: обери локацію на сцені.\nТуманні Болота запускають реальний бій.', '#d1c39c').setDepth(21);
  }

  private drawSelectionPanel() {
    panel(this, 1120, 595, 290, 128, 0.98).setDepth(20);
    this.titleText = text(this, 995, 555, '', 21, '#f5db91').setDepth(21);
    this.subtitleText = small(this, 995, 582, '', '#d3c8aa').setDepth(21);
    this.actionButton = this.add.rectangle(1120, 630, 248, 44, C.panel2, 1)
      .setStrokeStyle(2, C.gold, 0.9)
      .setInteractive({ useHandCursor: true })
      .setDepth(21);
    this.actionText = text(this, 1120, 630, 'Відвідати', 18, C.cream, 'center').setDepth(22);
    this.actionButton.on('pointerdown', () => this.activateSelected());
    this.actionButton.on('pointerover', () => this.actionButton.setFillStyle(C.gold, 0.2));
    this.actionButton.on('pointerout', () => this.actionButton.setFillStyle(C.panel2, 1));
  }

  private drawBottomBar() {
    const buttons = [
      ['Карта', 'Живий регіон'],
      ['Завдання', 'Сюжет і події'],
      ['Загін', 'Герої та ролі'],
      ['Крамниця', 'Ресурси'],
      ['Чат', 'Гравці поруч']
    ];
    buttons.forEach((b, i) => {
      const x = 115 + i * 170;
      makeButton(this, x, 682, 158, 48, b[0], () => this.toast(`${b[0]}: вкладка буде розширена далі.`), i === 0 ? 0xf1c45f : C.gold);
      small(this, x, 703, b[1], '#b9ab85', 'center').setDepth(22);
    });
    this.statusText = small(this, 930, 690, 'MVP • Серце Пущі', '#79d7b6').setDepth(22);
  }

  private selectLandmark(spot: LandmarkData) {
    this.selected = spot;
    if (this.selectionGlow) {
      this.tweens.add({
        targets: this.selectionGlow,
        x: spot.x,
        y: spot.y,
        duration: 240,
        ease: 'Sine.out'
      });
    }
    if (this.titleText) this.titleText.setText(spot.name);
    if (this.subtitleText) this.subtitleText.setText(spot.subtitle);
    if (this.actionText) this.actionText.setText(spot.battle ? 'Увійти в бій' : 'Відвідати');
    if (this.actionButton) this.actionButton.setStrokeStyle(2, spot.battle ? 0x72e0bd : C.gold, 0.95);
    this.toast(`Обрано: ${spot.name}`);
  }

  private activateSelected() {
    if (this.selected.battle) {
      this.scene.start('battle');
      return;
    }
    this.toast(`${this.selected.name}: локацію відкрито. Для бою обери Туманні Болота.`);
    this.cameras.main.flash(180, 220, 190, 100, false);
  }

  private toast(message: string) {
    this.statusText?.setText(message);
    this.time.delayedCall(2400, () => {
      if (this.statusText?.active) this.statusText.setText('MVP • Серце Пущі');
    });
  }
}

class BattleScene extends Phaser.Scene {
  private heroMax = 2150;
  private heroHp = 2150;
  private manaMax = 680;
  private mana = 680;
  private enemyMax = 3200;
  private enemyHp = 3200;
  private heroHpBar!: Phaser.GameObjects.Rectangle;
  private manaBar!: Phaser.GameObjects.Rectangle;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;
  private heroHpText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private battleLog!: Phaser.GameObjects.Text;
  private hero!: Phaser.GameObjects.Container;
  private wolf!: Phaser.GameObjects.Container;
  private enemy!: Phaser.GameObjects.Container;
  private busy = false;
  private rooted = false;
  private dodging = false;
  private auto = false;
  private autoText!: Phaser.GameObjects.Text;
  private skillCooldown = [false, false, false, false, false];

  constructor() {
    super('battle');
  }

  create() {
    this.heroHp = this.heroMax;
    this.mana = this.manaMax;
    this.enemyHp = this.enemyMax;
    this.busy = false;
    this.rooted = false;
    this.dodging = false;
    this.auto = false;
    this.skillCooldown = [false, false, false, false, false];

    this.drawBattlefield();
    this.drawActors();
    this.drawHUD();
    this.drawSkills();
    this.updateBars();
    this.log('Бій розпочато. Обери навичку.');

    this.time.addEvent({
      delay: 1650,
      loop: true,
      callback: () => {
        if (!this.auto || this.busy || this.enemyHp <= 0 || this.heroHp <= 0) return;
        const choices = [0, 1, 2, 3, 4].filter((i) => !this.skillCooldown[i]);
        if (choices.length) this.useSkill(Phaser.Utils.Array.GetRandom(choices));
      }
    });
  }

  private drawBattlefield() {
    this.add.rectangle(640, 360, 1280, 720, 0x07120f);
    this.add.rectangle(640, 160, 1280, 320, 0x153b39, 0.7);

    const mist = this.add.graphics();
    mist.fillStyle(0x164c49, 0.35);
    mist.fillCircle(170, 400, 180);
    mist.fillCircle(430, 440, 220);
    mist.fillCircle(810, 420, 260);
    mist.fillCircle(1090, 410, 210);

    // distant forest
    for (let i = 0; i < 35; i++) {
      const x = i * 42 + Phaser.Math.Between(-18, 18);
      const h = Phaser.Math.Between(80, 210);
      this.add.triangle(x, 310, -35, h / 2, 0, -h / 2, 35, h / 2, i % 2 ? 0x0e2b24 : 0x12362b, 0.95);
      this.add.rectangle(x, 332, 8, 66, 0x34291f, 0.8);
    }

    this.add.rectangle(640, 505, 1280, 190, 0x11251c, 0.96);
    for (let i = 0; i < 16; i++) {
      const glow = this.add.circle(Phaser.Math.Between(60, 1220), Phaser.Math.Between(300, 540), 3, 0x85e7a0, 0.4);
      this.tweens.add({ targets: glow, alpha: { from: 0.15, to: 0.8 }, y: glow.y - 18, duration: Phaser.Math.Between(1100, 2400), yoyo: true, repeat: -1 });
    }

    // moon/rune
    const moon = this.add.circle(640, 126, 70, 0xf5df9a, 0.12).setStrokeStyle(3, 0xf1d27c, 0.35);
    this.tweens.add({ targets: moon, alpha: { from: 0.08, to: 0.2 }, duration: 2200, yoyo: true, repeat: -1 });
  }

  private drawActors() {
    this.hero = this.add.container(320, 435);
    const heroAura = this.add.circle(0, -15, 58, 0x55d287, 0.11).setStrokeStyle(2, 0x83efad, 0.28);
    const body = this.add.rectangle(0, 0, 38, 92, 0x2d6847).setStrokeStyle(2, 0xe5d29b, 0.5);
    const skirt = this.add.triangle(0, 54, -38, 35, 0, -30, 38, 35, 0x315e3d, 1);
    const head = this.add.circle(0, -66, 22, 0xe8c8a8);
    const hair = this.add.arc(0, -70, 27, 190, 350, false, 0x5a3e2a);
    const staff = this.add.rectangle(40, -4, 7, 142, 0x6b4a29).setAngle(15);
    const orb = this.add.circle(58, -72, 14, 0x78e7a0, 0.92).setStrokeStyle(3, 0xd5ffbd, 0.7);
    this.hero.add([heroAura, skirt, body, head, hair, staff, orb]);
    this.tweens.add({ targets: orb, scale: { from: 0.88, to: 1.14 }, alpha: { from: 0.7, to: 1 }, duration: 900, yoyo: true, repeat: -1 });

    this.wolf = this.add.container(405, 480);
    const wolfBody = this.add.ellipse(0, 0, 78, 40, 0xa8b0ac);
    const wolfHead = this.add.circle(38, -10, 22, 0xb8c0bc);
    const ear1 = this.add.triangle(30, -30, -8, 8, 0, -14, 8, 8, 0x9da5a1);
    const ear2 = this.add.triangle(46, -30, -8, 8, 0, -14, 8, 8, 0x9da5a1);
    const tail = this.add.rectangle(-46, -7, 42, 10, 0x8d9893).setAngle(-25);
    this.wolf.add([tail, wolfBody, wolfHead, ear1, ear2]);

    this.enemy = this.add.container(900, 390);
    const root1 = this.add.rectangle(-48, 68, 28, 120, 0x372a20).setAngle(18);
    const root2 = this.add.rectangle(50, 70, 30, 130, 0x372a20).setAngle(-18);
    const torso = this.add.rectangle(0, 0, 116, 176, 0x3c3427).setStrokeStyle(4, 0x6d6138, 0.8);
    const moss = this.add.circle(-18, -25, 62, 0x294a2d, 0.72);
    const face = this.add.circle(0, -72, 45, 0x2c2922).setStrokeStyle(3, 0x60703c, 0.7);
    const eye1 = this.add.circle(-15, -76, 6, 0x8aff67, 1);
    const eye2 = this.add.circle(15, -76, 6, 0x8aff67, 1);
    const mouth = this.add.rectangle(0, -55, 30, 7, 0x7dff5d, 0.65);
    const arm1 = this.add.rectangle(-78, -5, 32, 140, 0x403629).setAngle(45);
    const arm2 = this.add.rectangle(78, -5, 32, 140, 0x403629).setAngle(-45);
    const antlerL = this.add.triangle(-28, -132, -38, 28, 0, -42, 20, 28, 0x4a3a26);
    const antlerR = this.add.triangle(28, -132, -20, 28, 0, -42, 38, 28, 0x4a3a26);
    const poisonGlow = this.add.circle(0, 0, 105, 0x56f24b, 0.08);
    this.enemy.add([poisonGlow, root1, root2, torso, moss, face, eye1, eye2, mouth, arm1, arm2, antlerL, antlerR]);
    this.tweens.add({ targets: poisonGlow, scale: { from: 0.9, to: 1.12 }, alpha: { from: 0.04, to: 0.16 }, duration: 1300, yoyo: true, repeat: -1 });
  }

  private drawHUD() {
    panel(this, 190, 77, 340, 118, 0.96);
    text(this, 36, 38, 'Мавка', 28, C.cream);
    small(this, 36, 62, 'Берегиня Пущі • рівень 32', '#d5c47d');
    this.add.rectangle(36, 91, 250, 18, 0x3b1715).setOrigin(0, 0.5);
    this.heroHpBar = this.add.rectangle(36, 91, 250, 18, 0xc8463a).setOrigin(0, 0.5);
    this.heroHpText = small(this, 161, 91, '', '#fff5ef', 'center');
    this.add.rectangle(36, 116, 250, 14, 0x12253d).setOrigin(0, 0.5);
    this.manaBar = this.add.rectangle(36, 116, 250, 14, 0x3984d4).setOrigin(0, 0.5);
    this.manaText = small(this, 161, 116, '', '#e9f5ff', 'center');

    panel(this, 790, 64, 510, 84, 0.96);
    text(this, 790, 38, 'Болотний Хранитель', 24, '#f3d686', 'center');
    this.add.rectangle(580, 76, 420, 19, 0x381512).setOrigin(0, 0.5);
    this.enemyHpBar = this.add.rectangle(580, 76, 420, 19, 0xb44033).setOrigin(0, 0.5);
    this.enemyHpText = small(this, 790, 76, '', '#fff4e7', 'center');
    small(this, 790, 99, 'Отрута • коріння • темна скверна', '#7bdd96', 'center');

    panel(this, 1140, 326, 244, 370, 0.95);
    text(this, 1038, 158, 'Журнал бою', 21, '#f0d283');
    this.battleLog = small(this, 1038, 192, '', '#ddd2b6');
    this.battleLog.setWordWrapWidth(206);
    text(this, 1038, 426, 'Можлива здобич', 18, '#f0d283');
    ['◆','♣','✦','◈','☘','□'].forEach((s, i) => {
      const xx = 1064 + (i % 3) * 66;
      const yy = 466 + Math.floor(i / 3) * 58;
      this.add.rectangle(xx, yy, 48, 48, 0x13221c, 1).setStrokeStyle(1, C.gold, 0.5);
      text(this, xx, yy, s, 20, ['#72e4a2','#b892e6','#66d8f1','#f4ca6a','#79cf8b','#d7d2c4'][i], 'center');
    });

    makeButton(this, 1140, 598, 205, 42, '← Серце Пущі', () => this.scene.start('region'), C.gold);
    const auto = makeButton(this, 1140, 650, 205, 42, 'Автобій: ВИМК', () => {
      this.auto = !this.auto;
      this.autoText.setText(this.auto ? 'Автобій: УВІМК' : 'Автобій: ВИМК');
      this.log(this.auto ? 'Автобій увімкнено.' : 'Автобій вимкнено.');
    }, 0x64cfa1);
    this.autoText = auto.labelText;
  }

  private drawSkills() {
    const names = [
      ['Лісова Іскра', '30', 0x55c879],
      ['Коріння', '40', 0x8cad52],
      ['Поклик Вовка', '25', 0x5ba9ce],
      ['Танець Вітру', '35', 0x75c7df],
      ['Серце Пущі', '50', 0xcbb75f]
    ] as const;

    names.forEach((skill, i) => {
      const x = 148 + i * 172;
      const y = 642;
      const box = this.add.rectangle(x, y, 156, 106, 0x101b17, 0.98)
        .setStrokeStyle(2, skill[2], 0.9)
        .setInteractive({ useHandCursor: true });
      text(this, x - 60, y - 38, `${i + 1}`, 16, '#f6de98', 'center');
      text(this, x, y - 12, skill[0], 17, C.cream, 'center');
      small(this, x, y + 20, `мана ${skill[1]}`, '#78c9f0', 'center');
      small(this, x, y + 41, i === 4 ? 'лікування' : 'атака / ефект', '#ad9f7f', 'center');
      box.on('pointerdown', () => this.useSkill(i));
      box.on('pointerover', () => box.setFillStyle(skill[2], 0.18));
      box.on('pointerout', () => box.setFillStyle(0x101b17, 0.98));
    });
  }

  private useSkill(index: number) {
    if (this.busy || this.enemyHp <= 0 || this.heroHp <= 0 || this.skillCooldown[index]) return;
    const costs = [30, 40, 25, 35, 50];
    if (this.mana < costs[index]) {
      this.log('Недостатньо мани.');
      return;
    }

    this.busy = true;
    this.mana -= costs[index];
    this.skillCooldown[index] = true;
    this.time.delayedCall(index === 4 ? 3800 : 2600, () => { this.skillCooldown[index] = false; });
    this.updateBars();

    const skillNames = ['Лісова Іскра', 'Коріння', 'Поклик Вовка', 'Танець Вітру', 'Серце Пущі'];

    if (index === 4) {
      const heal = 310;
      this.heroHp = Math.min(this.heroMax, this.heroHp + heal);
      this.mana = Math.min(this.manaMax, this.mana + 35);
      const pulse = this.add.circle(this.hero.x, this.hero.y - 30, 26, 0xbfe783, 0.28).setStrokeStyle(4, 0xe7f5a8, 0.8);
      this.tweens.add({ targets: pulse, scale: 4, alpha: 0, duration: 650, onComplete: () => pulse.destroy() });
      this.log(`${skillNames[index]}: +${heal} здоров’я.`);
      this.updateBars();
      this.time.delayedCall(520, () => this.enemyTurn());
      return;
    }

    const damages = [330, 190, 280, 250, 0];
    let damage = damages[index] + Phaser.Math.Between(-35, 55);
    if (index === 1) this.rooted = true;
    if (index === 3) this.dodging = true;

    if (index === 2) {
      this.tweens.add({
        targets: this.wolf,
        x: 760,
        duration: 230,
        yoyo: true,
        ease: 'Sine.inOut'
      });
    } else {
      this.tweens.add({
        targets: this.hero,
        x: 500,
        duration: 220,
        yoyo: true,
        ease: 'Sine.inOut'
      });
    }

    const slashColor = index === 1 ? 0x89c44d : index === 2 ? 0xaed4e4 : index === 3 ? 0x84d9ee : 0x78e6a0;
    const slash = this.add.ellipse(740, 390, 250, 58, slashColor, 0.18).setAngle(-12).setStrokeStyle(5, slashColor, 0.86);
    this.tweens.add({ targets: slash, x: 900, scaleX: 1.2, alpha: 0, duration: 360, onComplete: () => slash.destroy() });

    this.time.delayedCall(260, () => {
      this.enemyHp = Math.max(0, this.enemyHp - damage);
      this.floatDamage(900, 290, `-${damage}`, '#ff825f');
      this.cameras.main.shake(90, 0.006);
      this.updateBars();
      this.log(`${skillNames[index]} завдає ${damage} шкоди.`);
      if (this.enemyHp <= 0) {
        this.victory();
      } else {
        this.time.delayedCall(420, () => this.enemyTurn());
      }
    });
  }

  private enemyTurn() {
    if (this.enemyHp <= 0 || this.heroHp <= 0) return;

    if (this.rooted) {
      this.rooted = false;
      this.log('Коріння стримує Хранителя — атака пропущена.');
      this.busy = false;
      this.regenMana();
      return;
    }

    this.tweens.add({ targets: this.enemy, x: 780, duration: 240, yoyo: true, ease: 'Sine.inOut' });
    this.time.delayedCall(240, () => {
      let damage = Phaser.Math.Between(175, 255);
      if (this.dodging) {
        damage = Math.floor(damage * 0.25);
        this.dodging = false;
        this.log(`Танець Вітру зменшує удар до ${damage}.`);
      } else {
        this.log(`Болотний Хранитель завдає ${damage} шкоди.`);
      }
      this.heroHp = Math.max(0, this.heroHp - damage);
      this.floatDamage(335, 330, `-${damage}`, '#ffb379');
      this.updateBars();
      if (this.heroHp <= 0) this.defeat();
      else {
        this.busy = false;
        this.regenMana();
      }
    });
  }

  private regenMana() {
    this.mana = Math.min(this.manaMax, this.mana + 24);
    this.updateBars();
  }

  private updateBars() {
    this.heroHpBar.displayWidth = 250 * Math.max(0, this.heroHp / this.heroMax);
    this.manaBar.displayWidth = 250 * Math.max(0, this.mana / this.manaMax);
    this.enemyHpBar.displayWidth = 420 * Math.max(0, this.enemyHp / this.enemyMax);
    this.heroHpText.setText(`${this.heroHp} / ${this.heroMax}`);
    this.manaText.setText(`${this.mana} / ${this.manaMax}`);
    this.enemyHpText.setText(`${this.enemyHp} / ${this.enemyMax}`);
  }

  private floatDamage(x: number, y: number, value: string, color: string) {
    const t = text(this, x, y, value, 34, color, 'center').setDepth(40);
    this.tweens.add({
      targets: t,
      y: y - 70,
      alpha: 0,
      scale: 1.25,
      duration: 720,
      ease: 'Cubic.out',
      onComplete: () => t.destroy()
    });
  }

  private log(message: string) {
    const old = this.battleLog.text.split('\n').filter(Boolean).slice(-6);
    old.push('• ' + message);
    this.battleLog.setText(old.join('\n'));
  }

  private victory() {
    this.busy = true;
    this.log('Перемога! Хранитель очищений.');
    this.time.delayedCall(450, () => this.showEndModal(true));
  }

  private defeat() {
    this.busy = true;
    this.log('Мавка відступає до Серця Пущі.');
    this.time.delayedCall(450, () => this.showEndModal(false));
  }

  private showEndModal(won: boolean) {
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.58).setDepth(70);
    panel(this, 640, 360, 480, 250, 0.99).setDepth(71);
    text(this, 640, 300, won ? 'Перемога' : 'Поразка', 38, won ? '#dff3a3' : '#ef9c84', 'center').setDepth(72);
    small(this, 640, 345, won ? 'Здобуто: 850 монет • 320 досвіду • лісова есенція' : 'Спробуй іншу комбінацію навичок.', '#d6c9a4', 'center').setDepth(72);
    makeButton(this, 640, 395, 300, 50, won ? 'Повернутися в Серце Пущі' : 'Спробувати ще', () => {
      if (won) this.scene.start('region');
      else this.scene.restart();
    }, won ? 0x7fbd75 : C.redBright).box.setDepth(72);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#07110d',
  render: {
    antialias: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H
  },
  scene: [RegionScene, BattleScene]
};

new Phaser.Game(config);
