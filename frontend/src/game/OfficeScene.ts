import Phaser from 'phaser';
import type { AgentInfo, OfficeEvent } from '../events';
import { Aborted } from '../player';
import type { OfficeStore } from '../state';
import { AgentView } from './AgentView';
import {
  BOOKSHELF,
  COFFEE,
  ENTRANCE,
  MEETING_SEATS,
  MEETING_TABLE,
  PLANTS,
  ROLE_WORKSTATION,
  SCALE,
  T,
  WHITEBOARD,
  WIDTH,
  WINDOWS,
  WORKSTATIONS,
  findPath,
  meetingSeatPx,
  nearestFree,
  seatPx,
  seatTile,
  standPx,
  tileKey,
  walkable,
  type Px,
  type Tile,
} from './layout';
import { PALETTES, buildTextures, characterTexture } from './textures';

const STEP_MS = 170; // tiempo por casilla al andar
const ROLE_INK: Record<string, number> = { CEO: 0x34386a, DEVELOPER: 0x3a7bd5, DESIGNER: 0xd65db1, TESTER: 0x3fa36b };

export class OfficeScene extends Phaser.Scene {
  readonly ready: Promise<void>;
  onWhiteboardClick: () => void = () => {};

  private resolveReady!: () => void;
  private agents = new Map<string, AgentView>();
  private client: AgentView | null = null;
  private monitors: Phaser.GameObjects.Image[] = [];
  private monitorTimers: (Phaser.Time.TimerEvent | null)[] = [];
  private ink!: Phaser.GameObjects.Graphics;
  private inkCount = 0;
  private board!: Phaser.GameObjects.Image;
  private gen = 0;
  private pending = new Set<() => void>();

  constructor(private readonly store: OfficeStore) {
    super('office');
    this.ready = new Promise((resolve) => (this.resolveReady = resolve));
  }

  create(): void {
    buildTextures(this);
    this.drawOffice();
    this.resolveReady();
  }

  update(): void {
    for (const a of this.agents.values()) a.sync();
    this.client?.sync();
  }

  setSpeed(speed: number): void {
    this.tweens.timeScale = speed;
    this.time.timeScale = speed;
    this.anims.globalTimeScale = speed;
  }

  /** Corta todas las animaciones en curso (al reiniciar). */
  abort(): void {
    this.gen++;
    this.tweens.killAll();
    this.time.removeAllEvents();
    const waiting = [...this.pending];
    this.pending.clear();
    waiting.forEach((resolve) => resolve());
  }

  // ---------- dibujo fijo ----------

  private drawOffice(): void {
    const img = (x: number, y: number, key: string, depth: number) =>
      this.add.image(x, y, key).setOrigin(0, 0).setScale(SCALE).setDepth(depth);

    img(0, 0, 'ground', -1000);
    for (const w of WINDOWS) img(w.x * T, T, 'window', -900);
    img(BOOKSHELF.x * T, T, 'bookshelf', -900);
    this.board = img(WHITEBOARD.x * T, T + SCALE, 'whiteboard', -900);
    this.board.setInteractive({ useHandCursor: true });
    this.board.on('pointerover', () => this.board.setTint(0xfff4d6));
    this.board.on('pointerout', () => this.board.clearTint());
    this.board.on('pointerdown', () => this.onWhiteboardClick());
    this.ink = this.add.graphics().setDepth(-899);
    this.add
      .text(WHITEBOARD.x * T + WHITEBOARD.w * T - 6, T * 2 - 6, 'pizarra', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '10px',
        color: '#5b5470',
      })
      .setOrigin(1, 1)
      .setResolution(2)
      .setDepth(-898);

    WORKSTATIONS.forEach((ws) => {
      const depth = (ws.desk.y + 1) * T;
      img(ws.desk.x * T, ws.desk.y * T, 'desk', depth);
      this.monitors.push(img(ws.desk.x * T + 18 * SCALE, ws.desk.y * T - 4 * SCALE, 'monitor-off', depth + 1));
      this.monitorTimers.push(null);
    });
    img(MEETING_TABLE.x * T, MEETING_TABLE.y * T, 'table', (MEETING_TABLE.y + MEETING_TABLE.h) * T);
    for (const p of PLANTS) img(p.x * T, p.y * T, 'plant', (p.y + 1) * T);
    img(COFFEE.x * T, COFFEE.y * T, 'coffee', (COFFEE.y + 1) * T);
  }

  // ---------- utilidades async ----------

  private tween(g: number, target: object, props: object, duration: number): Promise<void> {
    return this.guard(
      g,
      new Promise<void>((resolve) => {
        const done = () => {
          this.pending.delete(done);
          resolve();
        };
        this.pending.add(done);
        this.tweens.add({ targets: target, ...props, duration, onComplete: done });
      }),
    );
  }

  private wait(g: number, ms: number): Promise<void> {
    return this.guard(
      g,
      new Promise<void>((resolve) => {
        const done = () => {
          this.pending.delete(done);
          resolve();
        };
        this.pending.add(done);
        this.time.delayedCall(ms, done);
      }),
    );
  }

  private async guard(g: number, p: Promise<void>): Promise<void> {
    await p;
    if (g !== this.gen) throw new Aborted();
  }

  private async walk(g: number, a: AgentView, to: Tile, finalPx?: Px): Promise<void> {
    const path = findPath(a.tile, to);
    a.setWalking(true);
    try {
      const here = standPx(a.tile);
      if (Math.hypot(here.x - a.pos.x, here.y - a.pos.y) > 1) await this.tween(g, a.pos, here, STEP_MS);
      for (const t of path) {
        await this.tween(g, a.pos, standPx(t), STEP_MS);
        a.tile = t;
      }
      a.tile = to;
      if (finalPx) await this.tween(g, a.pos, finalPx, STEP_MS);
    } finally {
      a.setWalking(false);
    }
  }

  private say(g: number, a: AgentView, text: string, header?: string): Promise<void> {
    a.showBubble(text, header);
    const ms = Phaser.Math.Clamp(900 + text.length * 35, 1600, 4200);
    return this.wait(g, ms).finally(() => a.hideBubble());
  }

  private home(a: AgentView): { tile: Tile; px: Px } {
    if (a.location === 'MEETING_ROOM') {
      const seat = MEETING_SEATS[a.meetingIndex % MEETING_SEATS.length];
      return { tile: seat, px: meetingSeatPx(seat) };
    }
    if (a.ws >= 0) {
      const ws = WORKSTATIONS[a.ws];
      return { tile: seatTile(ws), px: seatPx(ws) };
    }
    const t = nearestFree({ x: 5, y: 7 }, this.occupied(a));
    return { tile: t, px: standPx(t) };
  }

  private occupied(except?: AgentView): Set<string> {
    const s = new Set<string>();
    for (const a of this.agents.values()) if (a !== except) s.add(tileKey(a.tile));
    return s;
  }

  private ceo(): AgentView | undefined {
    return [...this.agents.values()].find((a) => a.role === 'CEO');
  }

  private assigneeOf(taskId: string): AgentView | undefined {
    const id = this.store.tasks.get(taskId)?.assigneeId;
    return id ? this.agents.get(id) : undefined;
  }

  private setMonitor(a: AgentView, on: boolean): void {
    if (a.ws < 0) return;
    const m = this.monitors[a.ws];
    this.monitorTimers[a.ws]?.remove();
    this.monitorTimers[a.ws] = null;
    m.setTexture(on ? 'monitor-on' : 'monitor-off');
    if (on) {
      let flip = false;
      this.monitorTimers[a.ws] = this.time.addEvent({
        delay: 300,
        loop: true,
        callback: () => m.setTexture((flip = !flip) ? 'monitor-on2' : 'monitor-on'),
      });
    }
  }

  private float(text: string, at: Px, color: string): void {
    const t = this.add
      .text(at.x, at.y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color, stroke: '#1a1626', strokeThickness: 5 })
      .setOrigin(0.5)
      .setResolution(2)
      .setDepth(11000);
    this.tweens.add({ targets: t, y: at.y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  private banner(text: string, bg: number): void {
    const label = this.add
      .text(WIDTH / 2, 12, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#1d1b26',
        backgroundColor: `#${bg.toString(16).padStart(6, '0')}`,
        padding: { x: 10, y: 6 },
        wordWrap: { width: WIDTH - 80 },
      })
      .setOrigin(0.5, 0)
      .setResolution(2)
      .setDepth(12000);
    this.tweens.add({ targets: label, alpha: 0, delay: 2600, duration: 600, onComplete: () => label.destroy() });
  }

  // ---------- eventos ----------

  async play(e: OfficeEvent): Promise<void> {
    await this.ready;
    if (e.type === 'OFFICE_STATE') {
      this.abort();
      this.reset(e.agents);
      return;
    }
    const g = this.gen;
    switch (e.type) {
      case 'ORDER_RECEIVED':
        return this.orderReceived(g, e.order);
      case 'AGENT_THINKING': {
        this.agents.get(e.agent)?.setThinking(e.active);
        return;
      }
      case 'AGENT_MOVE': {
        const a = this.agents.get(e.agent);
        if (!a) return;
        await this.guard(g, a.busy);
        if (a.location === e.to && tileKey(a.tile) === tileKey(this.home(a).tile)) return;
        a.location = e.to;
        const target = this.home(a);
        a.busy = this.walk(g, a, target.tile, target.px).catch(() => {});
        return this.wait(g, 220);
      }
      case 'MESSAGE':
        return this.message(g, e.from, e.to, e.content);
      case 'TASK_CREATED': {
        const ceo = this.ceo();
        if (ceo) this.float('+', ceo.headPx, '#f5b14c');
        return this.wait(g, 250);
      }
      case 'TASK_ASSIGNED':
        return;
      case 'TASK_STARTED': {
        const a = this.assigneeOf(e.taskId);
        if (!a) return;
        await this.guard(g, a.busy);
        this.setMonitor(a, true);
        a.setWorking(true);
        return this.wait(g, 300);
      }
      case 'TASK_COMPLETED': {
        const a = this.assigneeOf(e.taskId);
        if (!a) return;
        this.setMonitor(a, false);
        a.setWorking(false);
        this.float('✓', a.headPx, '#5ee08a');
        return this.wait(g, 500);
      }
      case 'FILE_WRITTEN':
        return this.fileWritten(g, e.agent);
      case 'WARNING':
        this.banner(`⚠ ${e.message}`, 0xf5d76e);
        return this.wait(g, 700);
      case 'ERROR':
        this.banner(`✖ ${e.message}`, 0xff8a7a);
        return this.wait(g, 1000);
      case 'RUN_FINISHED': {
        for (const a of this.agents.values()) await this.guard(g, a.busy);
        const ceo = this.ceo();
        if (ceo) await this.say(g, ceo, '¡Encargo terminado!');
        return;
      }
    }
  }

  private reset(agents: AgentInfo[]): void {
    for (const a of this.agents.values()) a.destroy();
    this.agents.clear();
    this.client?.destroy();
    this.client = null;
    this.monitors.forEach((m) => m.setTexture('monitor-off'));
    this.monitorTimers = this.monitorTimers.map(() => null);
    this.ink.clear();
    this.inkCount = 0;

    const usedWs = new Set<number>();
    agents.forEach((info, i) => {
      let ws = ROLE_WORKSTATION[info.role] ?? -1;
      if (ws < 0 || usedWs.has(ws)) ws = WORKSTATIONS.findIndex((_, k) => !usedWs.has(k));
      if (ws >= 0) usedWs.add(ws);
      const key = characterTexture(this, PALETTES[info.role] ? info.role : 'OTHER');
      const view = new AgentView(this, info.id, info.name, info.role, key, { x: 0, y: 0 }, { x: 0, y: 0 });
      view.ws = ws;
      view.meetingIndex = i;
      view.location = info.location;
      const h = this.home(view);
      view.tile = h.tile;
      Object.assign(view.pos, h.px);
      view.sync();
      this.agents.set(info.id, view);
    });
  }

  private async orderReceived(g: number, order: string): Promise<void> {
    const ceo = this.ceo();
    const key = characterTexture(this, 'CLIENT');
    const start = standPx(ENTRANCE);
    const client = new AgentView(this, 'client', 'Cliente', 'CLIENT', key, { x: -T, y: start.y }, ENTRANCE);
    this.client = client;
    try {
      await this.tween(g, client.pos, { x: start.x }, STEP_MS * 2);
      const front = ceo ? { x: ceo.tile.x, y: ceo.tile.y + 2 } : { x: 3, y: 8 };
      const spot = walkable(front.x, front.y) ? front : nearestFree(front, this.occupied());
      await this.walk(g, client, spot);
      await this.say(g, client, order, ceo ? `→ ${ceo.name}` : undefined);
      if (ceo) await this.say(g, ceo, '¡Entendido! Lo organizo con el equipo.');
      await this.walk(g, client, ENTRANCE);
      await this.tween(g, client.pos, { x: -T }, STEP_MS * 2);
    } finally {
      client.destroy();
      if (this.client === client) this.client = null;
    }
  }

  private async message(g: number, fromId: string, toId: string, content: string): Promise<void> {
    const from = this.agents.get(fromId);
    if (!from) return;
    const to = this.agents.get(toId);
    await this.guard(g, from.busy);
    if (to) await this.guard(g, to.busy);
    const header = `→ ${to?.name ?? toId}`;
    const sameRoom = to && from.location === 'MEETING_ROOM' && to.location === 'MEETING_ROOM';
    if (!to || sameRoom) return this.say(g, from, content, header);

    const spot = nearestFree(to.tile, this.occupied(from));
    await this.walk(g, from, spot);
    await this.say(g, from, content, header);
    const back = this.home(from);
    await this.walk(g, from, back.tile, back.px);
  }

  private async fileWritten(g: number, agentId: string): Promise<void> {
    const a = this.agents.get(agentId);
    const from = a?.headPx ?? { x: WIDTH / 2, y: 300 };
    const slot = this.inkCount++;
    const col = Math.floor(slot / 3) % 4;
    const row = slot % 3;
    const bx = WHITEBOARD.x * T + 4 * SCALE + col * 15 * SCALE;
    const by = T + 4 * SCALE + row * 3 * SCALE;
    const paper = this.add.image(from.x, from.y, 'paper').setScale(SCALE).setDepth(11000);
    await this.tween(g, paper, { x: bx + 5 * SCALE, y: by, angle: 360, scale: SCALE * 0.6 }, 900).finally(() => paper.destroy());
    const color = ROLE_INK[a?.role ?? ''] ?? 0x5b5470;
    this.ink.fillStyle(color, 1);
    for (let i = 0; i < 4; i++) this.ink.fillRect(bx + i * 3 * SCALE, by + (i % 2) * SCALE, 2 * SCALE + (i % 3) * SCALE, SCALE);
    this.board.setTint(0xfff1b8);
    await this.wait(g, 250);
    this.board.clearTint();
  }
}
