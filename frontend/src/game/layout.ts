// Plano de la oficina: una cuadrícula de 20×13 casillas de 16 px, dibujadas a ×3.

export const TILE = 16;
export const SCALE = 3;
export const T = TILE * SCALE; // 48 px por casilla en pantalla
export const COLS = 20;
export const ROWS = 13;
export const WIDTH = COLS * T; // 960
export const HEIGHT = ROWS * T; // 624

export interface Tile {
  x: number;
  y: number;
}
export interface Px {
  x: number;
  y: number;
}

export type Ground = 'wall-top' | 'wall-face' | 'floor' | 'carpet' | 'partition';

export const PARTITION_X = 11;
export const DOOR_ROWS = [6, 7];

export function groundAt(x: number, y: number): Ground {
  if (y === 0) return 'wall-top';
  if (y === 1) return 'wall-face';
  if (x === PARTITION_X) return DOOR_ROWS.includes(y) ? 'floor' : 'partition';
  return x > PARTITION_X ? 'carpet' : 'floor';
}

/** Mesa de trabajo de 2 casillas de ancho; el agente se sienta detrás (encima en pantalla). */
export interface Workstation {
  desk: Tile;
}
export const WORKSTATIONS: Workstation[] = [
  { desk: { x: 2, y: 4 } }, // CEO
  { desk: { x: 7, y: 4 } }, // Developer
  { desk: { x: 2, y: 9 } }, // Designer
  { desk: { x: 7, y: 9 } }, // Tester
];
export const ROLE_WORKSTATION: Record<string, number> = { CEO: 0, DEVELOPER: 1, DESIGNER: 2, TESTER: 3 };

export const seatTile = (ws: Workstation): Tile => ({ x: ws.desk.x, y: ws.desk.y - 1 });
export const seatPx = (ws: Workstation): Px => ({ x: ws.desk.x * T + 9 * SCALE, y: ws.desk.y * T + 7 * SCALE });

export const MEETING_TABLE = { x: 14, y: 6, w: 4, h: 2 };
export const MEETING_SEATS: Tile[] = [
  { x: 13, y: 6 },
  { x: 15, y: 5 },
  { x: 16, y: 5 },
  { x: 15, y: 8 },
  { x: 16, y: 8 },
  { x: 18, y: 6 },
  { x: 14, y: 5 },
  { x: 17, y: 5 },
  { x: 14, y: 8 },
  { x: 17, y: 8 },
];
export function meetingSeatPx(t: Tile): Px {
  // Los de arriba se "sientan" detrás de la mesa (la mesa les tapa las piernas).
  if (t.y === MEETING_TABLE.y - 1) return { x: t.x * T + T / 2, y: (t.y + 1) * T + 6 * SCALE };
  return standPx(t);
}

export const WHITEBOARD = { x: 14, y: 1, w: 4 };
export const BOOKSHELF = { x: 5, y: 1, w: 2 };
export const WINDOWS = [{ x: 1 }, { x: 8 }, { x: 18 }];
export const PLANTS: Tile[] = [
  { x: 0, y: 2 },
  { x: 10, y: 2 },
  { x: 12, y: 2 },
  { x: 19, y: 2 },
  { x: 19, y: 12 },
  { x: 12, y: 12 },
  { x: 10, y: 12 },
];
export const COFFEE: Tile = { x: 5, y: 2 };
export const ENTRANCE: Tile = { x: 0, y: 11 };

/** Punto donde apoya los pies un personaje de pie en esa casilla. */
export const standPx = (t: Tile): Px => ({ x: t.x * T + T / 2, y: t.y * T + T - 2 * SCALE });

// ---------- casillas bloqueadas y caminos ----------

const key = (x: number, y: number) => `${x},${y}`;
const blocked = new Set<string>();
for (let x = 0; x < COLS; x++) {
  blocked.add(key(x, 0));
  blocked.add(key(x, 1));
}
for (let y = 2; y < ROWS; y++) if (!DOOR_ROWS.includes(y)) blocked.add(key(PARTITION_X, y));
for (const ws of WORKSTATIONS) {
  blocked.add(key(ws.desk.x, ws.desk.y));
  blocked.add(key(ws.desk.x + 1, ws.desk.y));
}
for (let x = MEETING_TABLE.x; x < MEETING_TABLE.x + MEETING_TABLE.w; x++)
  for (let y = MEETING_TABLE.y; y < MEETING_TABLE.y + MEETING_TABLE.h; y++) blocked.add(key(x, y));
for (const p of PLANTS) blocked.add(key(p.x, p.y));
blocked.add(key(COFFEE.x, COFFEE.y));

export function walkable(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS && !blocked.has(key(x, y));
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Camino más corto (BFS) de `from` a `to`, sin incluir `from`. */
export function findPath(from: Tile, to: Tile): Tile[] {
  if (from.x === to.x && from.y === to.y) return [];
  const prev = new Map<string, string | null>([[key(from.x, from.y), null]]);
  const queue: Tile[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === to.x && cur.y === to.y) break;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (prev.has(k) || !walkable(nx, ny)) continue;
      prev.set(k, key(cur.x, cur.y));
      queue.push({ x: nx, y: ny });
    }
  }
  if (!prev.has(key(to.x, to.y))) return [to];
  const path: Tile[] = [];
  let k: string | null = key(to.x, to.y);
  while (k && k !== key(from.x, from.y)) {
    const [x, y] = k.split(',').map(Number);
    path.unshift({ x, y });
    k = prev.get(k) ?? null;
  }
  return path;
}

/** Casilla libre más cercana a `target` (para ponerse al lado de alguien). */
export function nearestFree(target: Tile, avoid: Set<string>): Tile {
  const seen = new Set([key(target.x, target.y)]);
  const queue: Tile[] = [target];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (seen.has(k) || nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      seen.add(k);
      if (walkable(nx, ny) && !avoid.has(k)) return { x: nx, y: ny };
      queue.push({ x: nx, y: ny });
    }
  }
  return target;
}

export const tileKey = (t: Tile) => key(t.x, t.y);
