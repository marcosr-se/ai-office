import Phaser from 'phaser';
import { COLS, ROWS, TILE, groundAt } from './layout';

// Todo el pixel-art se dibuja aquí con código (sin imágenes externas).

type Ctx = CanvasRenderingContext2D;

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  if (scene.textures.exists(key)) return scene.textures.get(key) as Phaser.Textures.CanvasTexture;
  const tex = scene.textures.createCanvas(key, w, h)!;
  draw(tex.getContext());
  tex.refresh();
  return tex;
}

function rect(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Añade un borde oscuro de 1 px alrededor de los píxeles opacos. */
function outline(ctx: Ctx, x0: number, y0: number, w: number, h: number, color = [26, 22, 38]) {
  const img = ctx.getImageData(x0, y0, w, h);
  const d = img.data;
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const marks: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!opaque(x, y) && (opaque(x + 1, y) || opaque(x - 1, y) || opaque(x, y + 1) || opaque(x, y - 1)))
        marks.push((y * w + x) * 4);
  for (const i of marks) {
    d[i] = color[0];
    d[i + 1] = color[1];
    d[i + 2] = color[2];
    d[i + 3] = 255;
  }
  ctx.putImageData(img, x0, y0);
}

// ---------- personajes ----------

const BODY = [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hssssssh....',
  '....ssessess....',
  '....ssssssss....',
  '.....ssssss.....',
  '....bbbddbbb....',
  '...bbbbddbbbb...',
  '...bbbbbbbbbb...',
  '...sbbbbbbbbs...',
  '....bbbbbbbb....',
  '....pppppppp....',
];
const LEGS = {
  idle: ['....ppp..ppp....', '....ppp..ppp....', '....kkk..kkk....'],
  w1: ['....ppp..ppp....', '...ppp....pp....', '...kkk....kk....'],
  w2: ['....ppp..ppp....', '....pp....ppp...', '....kk....kkk...'],
};

export interface Palette {
  h: string; // pelo
  s: string; // piel
  e: string; // ojos
  b: string; // camisa
  d: string; // detalle (corbata / botones)
  p: string; // pantalón
  k: string; // zapatos
}

export const PALETTES: Record<string, Palette> = {
  CEO: { h: '#3a3a4a', s: '#c68642', e: '#1a1a1a', b: '#34386a', d: '#d9473b', p: '#2a2a3c', k: '#15151d' },
  DEVELOPER: { h: '#6b3e26', s: '#f1c27d', e: '#1a1a1a', b: '#3a7bd5', d: '#2c5fa8', p: '#3b3b4f', k: '#1e1e26' },
  DESIGNER: { h: '#e07b39', s: '#8d5524', e: '#1a1a1a', b: '#d65db1', d: '#a8478a', p: '#2f2f44', k: '#1e1e26' },
  TESTER: { h: '#f2d16b', s: '#e0ac69', e: '#1a1a1a', b: '#3fa36b', d: '#2e7d52', p: '#3b3b4f', k: '#1e1e26' },
  CLIENT: { h: '#2b2b2b', s: '#e8b98a', e: '#1a1a1a', b: '#a0703c', d: '#7d5428', p: '#4a4a58', k: '#1e1e26' },
  OTHER: { h: '#555566', s: '#e0ac69', e: '#1a1a1a', b: '#8a8a99', d: '#6a6a77', p: '#3b3b4f', k: '#1e1e26' },
};

/** Textura con 3 frames (idle, w1, w2) y la animación de andar `<key>-walk`. */
export function characterTexture(scene: Phaser.Scene, paletteName: string): string {
  const key = `char-${paletteName}`;
  if (scene.textures.exists(key)) return key;
  const pal = PALETTES[paletteName] ?? PALETTES.OTHER;
  const frames = ['idle', 'w1', 'w2'] as const;
  const tex = canvasTexture(scene, key, TILE * 3 + 6, TILE + 2, (ctx) => {
    frames.forEach((f, i) => {
      const ox = i * (TILE + 2) + 1;
      const rows = [...BODY, ...LEGS[f]];
      rows.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c !== '.') rect(ctx, pal[c as keyof Palette], ox + x, 1 + y);
        }),
      );
      outline(ctx, ox - 1, 0, TILE + 2, TILE + 2);
    });
  });
  frames.forEach((f, i) => tex.add(f, 0, i * (TILE + 2), 0, TILE + 2, TILE + 2));
  scene.anims.create({
    key: `${key}-walk`,
    frames: [
      { key, frame: 'w1' },
      { key, frame: 'w2' },
    ],
    frameRate: 7,
    repeat: -1,
  });
  return key;
}

// ---------- suelo y paredes ----------

function drawFloor(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  rect(ctx, '#c9a27e', ox, oy, 16, 16);
  for (let r = 0; r < 4; r++) {
    rect(ctx, '#b08661', ox, oy + r * 4 + 3, 16, 1);
    const seam = (tx * 7 + ty * 3 + r * 5) % 16;
    rect(ctx, '#b08661', ox + seam, oy + r * 4, 1, 3);
    rect(ctx, '#d4ae8b', ox + ((seam + 6) % 16), oy + r * 4 + 1, 3, 1);
  }
}

function drawCarpet(ctx: Ctx, ox: number, oy: number) {
  rect(ctx, '#4f5d7a', ox, oy, 16, 16);
  for (let y = 0; y < 16; y += 4)
    for (let x = 0; x < 16; x += 4) {
      rect(ctx, '#5a6a8a', ox + x + ((y / 4) % 2) * 2, oy + y);
      rect(ctx, '#46536e', ox + x + 1, oy + y + 2);
    }
}

function drawWallTop(ctx: Ctx, ox: number, oy: number) {
  rect(ctx, '#2f2b3a', ox, oy, 16, 16);
  rect(ctx, '#3a3548', ox, oy + 14, 16, 2);
}

function drawWallFace(ctx: Ctx, ox: number, oy: number) {
  rect(ctx, '#e9dfcc', ox, oy, 16, 16);
  rect(ctx, '#ddd1bb', ox, oy + 6, 16, 1);
  rect(ctx, '#cfc3ad', ox, oy, 16, 1);
  rect(ctx, '#8c7b66', ox, oy + 13, 16, 3);
}

function drawPartition(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  drawFloor(ctx, ox, oy, tx, ty);
  rect(ctx, '#4f5d7a', ox + 10, oy, 6, 16);
  rect(ctx, '#2f2b3a', ox + 5, oy, 6, 16);
  rect(ctx, '#3f3a4f', ox + 5, oy, 1, 16);
}

export function buildTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'ground', COLS * TILE, ROWS * TILE, (ctx) => {
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const ox = x * TILE;
        const oy = y * TILE;
        const g = groundAt(x, y);
        if (g === 'floor') drawFloor(ctx, ox, oy, x, y);
        else if (g === 'carpet') drawCarpet(ctx, ox, oy);
        else if (g === 'wall-top') drawWallTop(ctx, ox, oy);
        else if (g === 'wall-face') drawWallFace(ctx, ox, oy);
        else drawPartition(ctx, ox, oy, x, y);
      }
  });

  canvasTexture(scene, 'window', 32, 16, (ctx) => {
    rect(ctx, '#8c7b66', 1, 1, 30, 12);
    rect(ctx, '#9fd3f5', 3, 3, 26, 8);
    rect(ctx, '#c6e8fb', 4, 4, 8, 2);
    rect(ctx, '#8c7b66', 15, 3, 2, 8);
    rect(ctx, '#ffffff', 22, 5, 4, 1);
  });

  canvasTexture(scene, 'desk', 32, 16, (ctx) => {
    rect(ctx, '#9c6b3e', 0, 0, 32, 9);
    rect(ctx, '#b8834f', 0, 0, 32, 1);
    rect(ctx, '#7a4f2b', 0, 9, 32, 7);
    rect(ctx, '#5e3b1f', 0, 9, 2, 7);
    rect(ctx, '#5e3b1f', 30, 9, 2, 7);
    rect(ctx, '#6b4424', 2, 9, 28, 1);
    rect(ctx, '#f4f1e8', 3, 3, 5, 4);
    rect(ctx, '#c9c4b5', 4, 4, 3, 1);
    rect(ctx, '#d9473b', 13, 4, 2, 2);
  });

  const monitor = (key: string, screen: string, line: string | null, shift: number) =>
    canvasTexture(scene, key, 12, 10, (ctx) => {
      rect(ctx, '#2b2b35', 0, 0, 12, 8);
      rect(ctx, screen, 1, 1, 10, 6);
      if (line) for (let r = 0; r < 3; r++) rect(ctx, line, 2 + ((r + shift) % 2) * 2, 2 + r * 2, 4 + ((r * 3 + shift) % 4), 1);
      rect(ctx, '#2b2b35', 5, 8, 2, 1);
      rect(ctx, '#2b2b35', 3, 9, 6, 1);
    });
  monitor('monitor-off', '#34495e', null, 0);
  monitor('monitor-on', '#7fd6ff', '#2e86c1', 0);
  monitor('monitor-on2', '#7fd6ff', '#2e86c1', 1);

  canvasTexture(scene, 'table', 64, 32, (ctx) => {
    rect(ctx, '#7a4a26', 0, 0, 64, 24);
    rect(ctx, '#93603a', 0, 0, 64, 1);
    rect(ctx, '#93603a', 0, 0, 1, 24);
    rect(ctx, '#5b371c', 0, 24, 64, 8);
    rect(ctx, '#45290f', 0, 24, 64, 1);
    rect(ctx, '#f4f1e8', 10, 8, 6, 8);
    rect(ctx, '#f4f1e8', 44, 10, 7, 5);
    rect(ctx, '#e74c3c', 30, 10, 3, 3);
  });

  canvasTexture(scene, 'plant', 16, 16, (ctx) => {
    rect(ctx, '#3d8b3d', 4, 2, 8, 8);
    rect(ctx, '#3d8b3d', 2, 4, 12, 4);
    rect(ctx, '#55a855', 5, 3, 3, 3);
    rect(ctx, '#55a855', 9, 5, 3, 2);
    rect(ctx, '#2e6b2e', 7, 1, 2, 2);
    rect(ctx, '#b5651d', 4, 10, 8, 6);
    rect(ctx, '#cf7a2e', 3, 10, 10, 2);
    outline(ctx, 0, 0, 16, 16);
  });

  canvasTexture(scene, 'coffee', 16, 16, (ctx) => {
    rect(ctx, '#4a4a55', 3, 1, 10, 15);
    rect(ctx, '#2b2b33', 5, 3, 6, 4);
    rect(ctx, '#e74c3c', 10, 2, 1, 1);
    rect(ctx, '#2b2b33', 5, 9, 6, 5);
    rect(ctx, '#ffffff', 7, 11, 3, 3);
    rect(ctx, '#6b4424', 7, 11, 3, 1);
    outline(ctx, 0, 0, 16, 16);
  });

  canvasTexture(scene, 'bookshelf', 32, 16, (ctx) => {
    rect(ctx, '#7a5230', 0, 0, 32, 14);
    rect(ctx, '#5e3b1f', 1, 6, 30, 1);
    const books = ['#d9473b', '#3a7bd5', '#3fa36b', '#f2d16b', '#d65db1', '#e9dfcc'];
    for (let i = 0; i < 9; i++) {
      rect(ctx, books[i % books.length], 2 + i * 3, 1 + (i % 2), 2, 5 - (i % 2));
      rect(ctx, books[(i + 2) % books.length], 2 + i * 3, 8 + ((i + 1) % 2), 2, 5 - ((i + 1) % 2));
    }
  });

  canvasTexture(scene, 'whiteboard', 64, 14, (ctx) => {
    rect(ctx, '#9aa3ad', 0, 0, 64, 13);
    rect(ctx, '#fbfbf7', 2, 2, 60, 9);
    rect(ctx, '#7d858f', 4, 12, 56, 2);
    rect(ctx, '#d9473b', 50, 12, 3, 1);
    rect(ctx, '#3a7bd5', 54, 12, 3, 1);
  });

  canvasTexture(scene, 'paper', 7, 9, (ctx) => {
    rect(ctx, '#1a1626', 0, 0, 7, 9);
    rect(ctx, '#fbfbf7', 1, 1, 5, 7);
    rect(ctx, '#9aa3ad', 2, 3, 3, 1);
    rect(ctx, '#9aa3ad', 2, 5, 3, 1);
  });
}
