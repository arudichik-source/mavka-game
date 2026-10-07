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

let state: GameState = loadState();

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
      canvas.width = FRAME_WIDTH;
      canvas.height = FRAME_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D unavailable');
      ctx.drawImage(source, 0, sy, FRAME_WIDTH, FRAME_HEIGHT, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
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
  x: number;
  y: number;
  w: number;
  h: number;
};

const LANDMARKS: Landmark[] = [
  { id: 'settlement', name: 'Поселення Мавки', subtitle: 'Табір, лікування та припаси', x: 330, y: 302, w: 250, h: 120 },
  { id: 'oak', name: 'Старий Дуб', subtitle: 'Щоденне благословення духів', x: 610, y: 205, w: 170, h: 100 },
  { id: 'shrine', name: 'Святилище', subtitle: 'Відновлення мани', x: 885, y: 190, w: 185, h: 100 },
  { id: 'hunter', name: 'Стежка Мисливця', subtitle: 'Полювання та ресурси', x: 820, y: 320, w: 240, h: 110 },
  { id: 'yarin', name: 'Ярин Дол', subtitle: 'Лікарські трави', x: 300, y: 505, w: 180, h: 90 },
  { id: 'mill', name: 'Старий Млин', subtitle: 'Крамниця і завдання', x: 670, y: 445, w: 235, h: 120 },
  { id: 'swamp', name: 'Туманні Болота', subtitle: 'Бойова зона • рівень 5+', x: 1010, y: 505, w: 300, h: 125 }
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
    this.add.rectangle(W / 2, 29, W, 58, 0x04100c, 0.62).setDepth(10);

    this.profileText = uiText(this, 24, 28, '', 16, '#f5e8c5').setDepth(11);
    this.resourceText = uiText(this, W - 24, 28, '', 16, '#f4dda1', 1).setDepth(11);
    this.toastText = uiText(this, W / 2, 82, '', 16, '#fff0c8', 0.5).setDepth(30).setAlpha(0);

    this.makeLandmarks();
    this.makeNav();
    this.refreshHud();
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  private refreshHud() {
    this.profileText.setText(`Мавка • рівень ${state.level}     ❤ ${state.hp}/${state.maxHp}     ✦ ${state.mana}/${state.maxMana}`);
    this.resourceText.setText(`◉ ${state.coins.toLocaleString('uk-UA')}     ◆ ${state.crystals}     ☘ ${state.herbs}`);
  }

  private makeLandmarks() {
    LANDMARKS.forEach((spot) => {
      const hit = this.add.rectangle(spot.x, spot.y, spot.w, spot.h, 0x68d29a, 0.001)
        .setStrokeStyle(2, 0xf1d58c, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);
      const label = uiText(this, spot.x, spot.y - spot.h / 2 - 12, spot.name, 16, '#ffe7a8', 0.5)
        .setDepth(6)
        .setAlpha(0);
      hit.on('pointerover', () => {
        hit.setFillStyle(0x77d7a0, 0.08).setStrokeStyle(2, 0xf1d58c, 0.85);
        label.setAlpha(1);
      });
      hit.on('pointerout', () => {
        hit.setFillStyle(0x68d29a, 0.001).setStrokeStyle(2, 0xf1d58c, 0);
        label.setAlpha(0);
      });
      hit.on('pointerdown', () => this.openLandmark(spot));
    });
  }

  private makeNav() {
    const items = [
      { x: 150, label: 'Карта', action: () => this.closeModal() },
      { x: 405, label: 'Завдання', action: () => this.openQuests() },
      { x: 665, label: 'Рюкзак', action: () => this.openInventory() },
      { x: 930, label: 'Табір', action: () => this.openCamp() }
    ];
    items.forEach((item) => {
      const hit = this.add.rectangle(item.x, 675, 220, 64, 0xf0d18c, 0.001)
        .setInteractive({ useHandCursor: true }).setDepth(20);
      hit.on('pointerover', () => hit.setFillStyle(0xe9c770, 0.08));
      hit.on('pointerout', () => hit.setFillStyle(0xe9c770, 0.001));
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
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    const parts = ornatePanel(this, W / 2, H / 2, width, height);
    const heading = gameText(this, W / 2, H / 2 - height / 2 + 48, title, 28, GOLD_LIGHT, 0.5);
    const sub = uiText(this, W / 2, H / 2 - height / 2 + 82, subtitle, 15, '#bfcbbb', 0.5);
    const x = uiText(this, W / 2 + width / 2 - 30, H / 2 - height / 2 + 30, '✕', 22, '#f4dda1', 0.5)
      .setInteractive({ useHandCursor: true });
    x.on('pointerdown', () => this.closeModal());
    c.add([shade, ...parts, heading, sub, x]);
    this.modal = c;
    return c;
  }

  private addModalButton(c: Phaser.GameObjects.Container, x: number, y: number, label: string, fn: () => void, accent = GOLD) {
    const b = button(this, x, y, 220, 48, label, fn, accent);
    c.add([b.box, b.label]);
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
    saveState(state);
    this.refreshHud();
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
  }

  private toast(message: string) {
    this.toastText.setText(message).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1700, duration: 400 });
  }

  private closeModal() {
    this.modal?.destroy(true);
    this.modal = undefined;
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

    this.add.rectangle(W / 2, 28, W, 56, 0x020806, 0.44).setDepth(20);
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

  private drawBars() {
    const heroX = 88;
    this.add.rectangle(heroX, 33, 300, 18, 0x29100e, 0.92).setOrigin(0, 0.5).setDepth(30);
    this.hpFill = this.add.rectangle(heroX, 33, 300, 18, RED, 1).setOrigin(0, 0.5).setDepth(31);
    this.hpText = uiText(this, heroX + 150, 33, '', 13, '#fff6e8', 0.5).setDepth(32);
    this.add.rectangle(heroX, 54, 300, 12, 0x0c2233, 0.92).setOrigin(0, 0.5).setDepth(30);
    this.manaFill = this.add.rectangle(heroX, 54, 300, 12, 0x3b92d0, 1).setOrigin(0, 0.5).setDepth(31);
    this.manaText = uiText(this, heroX + 150, 54, '', 11, '#eef8ff', 0.5).setDepth(32);

    this.add.rectangle(560, 33, 430, 20, 0x28100e, 0.94).setOrigin(0, 0.5).setDepth(30);
    this.enemyFill = this.add.rectangle(560, 33, 430, 20, 0xb63f35, 1).setOrigin(0, 0.5).setDepth(31);
    this.enemyText = uiText(this, 775, 33, '', 13, '#fff3df', 0.5).setDepth(32);
  }

  private drawSkills() {
    const xs = [248, 398, 548, 698, 848];
    xs.forEach((x, i) => {
      const hit = this.add.rectangle(x, 645, 126, 110, SKILLS[i].color, 0.001)
        .setStrokeStyle(2, SKILLS[i].color, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(35);
      const cd = uiText(this, x, 645, '', 18, '#fff4d8', 0.5).setDepth(37);
      hit.on('pointerover', () => hit.setFillStyle(SKILLS[i].color, 0.11).setStrokeStyle(2, SKILLS[i].color, 0.9));
      hit.on('pointerout', () => hit.setFillStyle(SKILLS[i].color, 0.001).setStrokeStyle(2, SKILLS[i].color, 0));
      hit.on('pointerdown', () => this.useSkill(i));
      this.skillOverlays.push(hit);
      this.skillCdTexts.push(cd);
    });
  }

  private drawBattleControls() {
    const ether = button(this, 1045, 540, 175, 42, `Ефір ×${state.ether}`, () => this.useEther(), CYAN);
    ether.box.setDepth(40); ether.label.setDepth(41);
    this.etherText = ether.label;

    const potion = button(this, 1045, 592, 175, 42, `Зілля ×${state.potions}`, () => this.usePotion(), 0xc76f5a);
    potion.box.setDepth(40); potion.label.setDepth(41);
    this.potionText = potion.label;

    const auto = button(this, 1045, 644, 175, 42, 'Автобій: ВИМК', () => {
      this.auto = !this.auto;
      this.autoText.setText(this.auto ? 'Автобій: УВІМК' : 'Автобій: ВИМК');
      this.log(this.auto ? 'Автобій увімкнено.' : 'Автобій вимкнено.');
    }, 0x66c598);
    auto.box.setDepth(40); auto.label.setDepth(41);
    this.autoText = auto.label;

    const retreat = button(this, 1180, 86, 150, 38, 'Відступити', () => {
      state.hp = Math.max(1, this.heroHp);
      state.mana = this.heroMana;
      saveState(state);
      this.scene.start('region');
    }, 0xa7784e);
    retreat.box.setDepth(40); retreat.label.setDepth(41);

    this.logText = uiText(this, 1045, 445, '', 14, '#e9dfc8', 0.5)
      .setWordWrapWidth(300).setAlign('center').setDepth(42);
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
      this.cameras.main.shake(100, 0.006);
      this.heroMana = Math.min(state.maxMana, this.heroMana + 11);
      this.refreshBars();

      if (this.heroHp <= 0) this.defeat();
      else this.busy = false;
    });
  }

  private skillEffect(index: number) {
    const colors = [0x55ef81, 0x8fbd52, 0x77caff, 0x74e3e1, 0xf1d16d];
    if (index === 2) {
      const streak = this.add.ellipse(420, 430, 150, 55, colors[index], 0.34).setDepth(44);
      this.tweens.add({ targets: streak, x: 820, alpha: 0, scaleX: 1.7, duration: 360, onComplete: () => streak.destroy() });
      return;
    }
    if (index === 1) {
      for (let i = 0; i < 6; i++) {
        const root = this.add.rectangle(785 + i * 18, 430, 7, 105, colors[index], 0.55).setAngle(Phaser.Math.Between(-30, 30)).setDepth(44);
        this.tweens.add({ targets: root, y: 370, alpha: 0, duration: 700, delay: i * 40, onComplete: () => root.destroy() });
      }
      return;
    }
    const pulse = this.add.circle(index === 4 ? 360 : 760, index === 4 ? 380 : 340, 28, colors[index], 0.25)
      .setStrokeStyle(5, colors[index], 0.85).setDepth(44);
    this.tweens.add({ targets: pulse, scale: index === 4 ? 5 : 4, alpha: 0, x: index === 4 ? 360 : 840, duration: 520, onComplete: () => pulse.destroy() });
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
    this.hpFill.displayWidth = 300 * hpRatio;
    this.manaFill.displayWidth = 300 * manaRatio;
    this.enemyFill.displayWidth = 430 * enemyRatio;
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
    if (this.encounter.boss) {
      state.bossWins += 1;
      state.quests.swamp = 1;
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
