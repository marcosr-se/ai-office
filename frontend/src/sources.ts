import { parseEvent, type ClientCommand, type OfficeEvent } from './events';
import type { Clock, EventPlayer } from './player';

export interface RecordedRun {
  version: number;
  title: string;
  order: string;
  events: { delayMs?: number; event: OfficeEvent }[];
}

/** Modo demo: reproduce una ejecución grabada en JSON. */
export class ReplaySource {
  run: RecordedRun | null = null;
  private token = 0;

  constructor(
    private readonly url: string,
    private readonly player: EventPlayer,
    private readonly clock: Clock,
    private readonly onPlaying: (playing: boolean) => void,
  ) {}

  async load(): Promise<RecordedRun> {
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`No se pudo cargar ${this.url} (${res.status})`);
    const data = (await res.json()) as Partial<RecordedRun>;
    if (!Array.isArray(data.events)) throw new Error('La grabación no tiene "events"');
    const events: RecordedRun['events'] = [];
    for (const entry of data.events) {
      const event = parseEvent(entry?.event);
      if (event) events.push({ delayMs: Number(entry.delayMs) || 0, event });
      else console.warn('Evento inválido en la grabación, se ignora:', entry);
    }
    this.run = { version: data.version ?? 1, title: data.title ?? '', order: data.order ?? '', events };
    return this.run;
  }

  /** Dibuja la oficina en reposo (solo el primer OFFICE_STATE). */
  showInitial(): void {
    const first = this.run?.events.find((x) => x.event.type === 'OFFICE_STATE');
    if (first) this.player.push(first.event);
  }

  async play(): Promise<void> {
    if (!this.run) return;
    const my = ++this.token;
    this.onPlaying(true);
    for (const { delayMs, event } of this.run.events) {
      await this.player.whenIdle();
      if (my !== this.token) return;
      if (delayMs) await this.clock.sleep(delayMs);
      if (my !== this.token) return;
      this.player.push(event);
    }
    await this.player.whenIdle();
    if (my === this.token) this.onPlaying(false);
  }

  stop(): void {
    this.token++;
    this.onPlaying(false);
  }
}

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

/** Modo en vivo: recibe los eventos del backend por WebSocket. */
export class WebSocketSource {
  private ws: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly player: EventPlayer,
    private readonly onStatus: (s: ConnectionStatus) => void,
  ) {}

  connect(): void {
    this.onStatus('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => this.onStatus('open');
    ws.onclose = () => {
      this.onStatus('closed');
      setTimeout(() => this.connect(), 3000);
    };
    ws.onmessage = (msg) => {
      let data: unknown;
      try {
        data = JSON.parse(String(msg.data));
      } catch {
        console.warn('Mensaje que no es JSON, se ignora:', msg.data);
        return;
      }
      const event = parseEvent(data);
      if (event) this.player.push(event);
      else console.warn('Evento desconocido o incompleto, se ignora:', data);
    };
  }

  send(cmd: ClientCommand): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(cmd));
    return true;
  }
}
