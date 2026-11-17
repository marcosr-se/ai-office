import Phaser from 'phaser';
import type { LocationName, RoleName } from '../events';
import { SCALE, WIDTH, type Px, type Tile } from './layout';

const HEAD = 16 * SCALE; // altura del personaje en pantalla
const MAX_BUBBLE_CHARS = 160;

/** Un personaje dibujado: sprite + nombre + bocadillo + "pensando…". */
export class AgentView {
  readonly pos: Px;
  tile: Tile;
  location: LocationName = 'DESK';
  ws = -1; // índice de la mesa
  meetingIndex = 0;
  busy: Promise<void> = Promise.resolve();
  bob = { y: 0 };

  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly label: Phaser.GameObjects.Text;
  private bubble: Phaser.GameObjects.Container | null = null;
  private thinking: Phaser.GameObjects.Container | null = null;
  private thinkTimer: Phaser.Time.TimerEvent | null = null;
  private bobTween: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly id: string,
    readonly name: string,
    readonly role: RoleName | 'CLIENT',
    private readonly texKey: string,
    px: Px,
    tile: Tile,
  ) {
    this.pos = { ...px };
    this.tile = { ...tile };
    this.sprite = scene.add.sprite(px.x, px.y, texKey, 'idle').setOrigin(0.5, 1).setScale(SCALE);
    this.label = scene.add
      .text(px.x, px.y, name, {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1a1626',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setResolution(2)
      .setDepth(9000);
    this.sync();
  }

  /** Coloca todo según `pos` (se llama en cada frame). */
  sync(): void {
    const { x, y } = this.pos;
    this.sprite.setPosition(x, y + this.bob.y).setDepth(y);
    const top = y - HEAD + 2 * SCALE;
    this.label.setPosition(x, top);
    const anchor = top - 16;
    for (const c of [this.bubble, this.thinking]) {
      if (!c) continue;
      const half = (c.getData('w') as number) / 2;
      c.setPosition(Phaser.Math.Clamp(x, half + 4, WIDTH - half - 4), Math.max(anchor, (c.getData('h') as number) + 12));
    }
  }

  setWalking(on: boolean): void {
    if (on) this.sprite.play(`${this.texKey}-walk`, true);
    else this.sprite.stop().setFrame('idle');
  }

  setWorking(on: boolean): void {
    this.bobTween?.remove();
    this.bobTween = null;
    this.bob.y = 0;
    if (on)
      this.bobTween = this.scene.tweens.add({ targets: this.bob, y: -SCALE, duration: 160, yoyo: true, repeat: -1 });
  }

  showBubble(text: string, header?: string): void {
    this.hideBubble();
    const shown = text.length > MAX_BUBBLE_CHARS ? text.slice(0, MAX_BUBBLE_CHARS - 1) + '…' : text;
    this.bubble = makeBubble(this.scene, shown, header);
    this.sync();
  }

  hideBubble(): void {
    this.bubble?.destroy();
    this.bubble = null;
  }

  setThinking(on: boolean): void {
    this.thinking?.destroy();
    this.thinking = null;
    this.thinkTimer?.remove();
    this.thinkTimer = null;
    if (!on) return;
    const c = makeBubble(this.scene, '•••', undefined, 13);
    const text = c.getAt(1) as Phaser.GameObjects.Text;
    let n = 0;
    this.thinkTimer = this.scene.time.addEvent({
      delay: 280,
      loop: true,
      callback: () => text.setText(['•  ', '•• ', '•••'][n++ % 3]),
    });
    this.thinking = c;
    this.sync();
  }

  get headPx(): Px {
    return { x: this.pos.x, y: this.pos.y - HEAD };
  }

  destroy(): void {
    this.setThinking(false);
    this.setWorking(false);
    this.hideBubble();
    this.sprite.destroy();
    this.label.destroy();
  }
}

function makeBubble(scene: Phaser.Scene, text: string, header?: string, fontSize = 14): Phaser.GameObjects.Container {
  const pad = 8;
  const children: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  children.push(g);
  const body = scene.add
    .text(0, 0, text, {
      fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#1d1b26',
      wordWrap: { width: 220, useAdvancedWrap: true },
    })
    .setResolution(2);
  children.push(body);
  let headerText: Phaser.GameObjects.Text | null = null;
  if (header) {
    headerText = scene.add
      .text(0, 0, header, { fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#7a7290' })
      .setResolution(2);
    children.push(headerText);
  }
  const headerH = headerText ? headerText.height : 0;
  const w = Math.max(body.width, headerText?.width ?? 0) + pad * 2;
  const h = headerH + body.height + pad * 2;
  g.fillStyle(0x1d1b26, 1);
  g.fillRoundedRect(-w / 2 - 2, -h - 2, w + 4, h + 4, 9);
  g.fillTriangle(-8, -1, 8, -1, 0, 10);
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(-w / 2, -h, w, h, 8);
  g.fillTriangle(-6, -2, 6, -2, 0, 7);
  headerText?.setPosition(-w / 2 + pad, -h + pad);
  body.setPosition(-w / 2 + pad, -h + pad + headerH);
  const c = scene.add.container(0, 0, children).setDepth(10000);
  c.setData('w', w + 4);
  c.setData('h', h + 4);
  return c;
}
