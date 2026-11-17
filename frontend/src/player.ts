import type { OfficeEvent } from './events';

/** Velocidad global de reproducción (1×, 2×, 4×). */
export class Clock {
  speed = 1;
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms / this.speed));
  }
}

/**
 * Cola de eventos: los procesa de uno en uno, esperando a que termine la animación
 * del anterior. Así el backend puede enviar eventos tan rápido como quiera.
 */
export class EventPlayer {
  private queue: OfficeEvent[] = [];
  private running = false;
  private idleWaiters: (() => void)[] = [];

  constructor(private readonly handle: (e: OfficeEvent) => Promise<void>) {}

  push(e: OfficeEvent): void {
    this.queue.push(e);
    if (!this.running) void this.drain();
  }

  clear(): void {
    this.queue = [];
  }

  whenIdle(): Promise<void> {
    if (!this.running && this.queue.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private async drain(): Promise<void> {
    this.running = true;
    while (this.queue.length > 0) {
      const e = this.queue.shift()!;
      try {
        await this.handle(e);
      } catch (err) {
        if (!(err instanceof Aborted)) console.error('Error procesando evento', e, err);
      }
    }
    this.running = false;
    this.idleWaiters.splice(0).forEach((resolve) => resolve());
  }
}

/** Se lanza cuando se reinicia la oficina a mitad de una animación. */
export class Aborted extends Error {}
