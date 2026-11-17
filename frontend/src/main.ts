import Phaser from 'phaser';
import './style.css';
import { HEIGHT, WIDTH } from './game/layout';
import { OfficeScene } from './game/OfficeScene';
import { Clock, EventPlayer } from './player';
import { ReplaySource, WebSocketSource } from './sources';
import { OfficeStore } from './state';
import { Panel } from './ui/Panel';

const store = new OfficeStore();
const clock = new Clock();
const scene = new OfficeScene(store);
const panel = new Panel(store);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  pixelArt: true,
  backgroundColor: '#1d1b26',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [scene],
});

const player = new EventPlayer(async (e) => {
  panel.log(e);
  try {
    await scene.play(e);
  } finally {
    store.apply(e);
    panel.render();
  }
});

scene.onWhiteboardClick = () => panel.showTab('pizarra');
panel.onSpeed((speed) => {
  clock.speed = speed;
  scene.setSpeed(speed);
});
panel.render();

const form = document.getElementById('order-form') as HTMLFormElement;
const input = document.getElementById('order') as HTMLInputElement;
const button = document.getElementById('order-btn') as HTMLButtonElement;

// ?ws=ws://localhost:8080/ws/office → modo en vivo con el backend. Sin parámetro → demo grabada.
const params = new URLSearchParams(location.search);
const wsUrl = params.get('ws');

if (wsUrl) {
  const source = new WebSocketSource(wsUrl, player, (status) => {
    const label = { connecting: 'Conectando…', open: 'En vivo', closed: 'Sin conexión' }[status];
    panel.setMode(label, status === 'open' ? 'live' : 'off');
    button.disabled = status !== 'open';
    panel.setNote(status === 'open' ? 'Escribe un encargo para la oficina.' : `Intentando conectar con ${wsUrl}…`);
  });
  source.connect();
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const order = input.value.trim();
    if (!order) return;
    if (source.send({ type: 'START_RUN', order })) {
      panel.clearLog();
      input.value = '';
    }
  });
} else {
  const run = params.get('run') ?? 'cafeteria';
  const replay = new ReplaySource(`${import.meta.env.BASE_URL}runs/${encodeURIComponent(run)}.json`, player, clock, (playing) => {
    button.textContent = playing ? 'Reiniciar' : 'Reproducir';
  });
  panel.setMode('Demo', 'demo');
  input.readOnly = true;
  button.disabled = true;
  replay
    .load()
    .then((r) => {
      input.value = r.order;
      panel.setNote(`Ejecución grabada: «${r.title}». Para hablar con tu backend, abre la página con ?ws=ws://localhost:8080/ws/office`);
      button.disabled = false;
      replay.showInitial();
    })
    .catch((err: Error) => panel.setNote(err.message));

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    replay.stop();
    player.clear();
    scene.abort();
    panel.clearLog();
    void replay.play();
  });
}
