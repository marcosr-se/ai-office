import { ROLE_LABEL, type OfficeEvent } from '../events';
import type { OfficeStore } from '../state';

const STATUS_LABEL: Record<string, string> = { PENDING: 'Pendiente', IN_PROGRESS: 'En curso', DONE: 'Hecha' };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Panel lateral: encargo, velocidad, tareas, pizarra y registro. Todo el texto entra con textContent. */
export class Panel {
  private selectedFile: string | null = null;

  constructor(private readonly store: OfficeStore) {
    document.querySelectorAll<HTMLButtonElement>('.tabs button').forEach((b) =>
      b.addEventListener('click', () => this.showTab(b.dataset.tab!)),
    );
  }

  showTab(name: string): void {
    document.querySelectorAll<HTMLButtonElement>('.tabs button').forEach((b) => {
      const on = b.dataset.tab === name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll<HTMLElement>('.tab').forEach((t) => t.classList.toggle('on', t.id === `tab-${name}`));
  }

  onSpeed(cb: (speed: number) => void): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('#speed button');
    buttons.forEach((b) =>
      b.addEventListener('click', () => {
        buttons.forEach((x) => x.classList.toggle('on', x === b));
        cb(Number(b.dataset.speed));
      }),
    );
  }

  setMode(label: string, kind: 'demo' | 'live' | 'off'): void {
    const badge = $('mode');
    badge.textContent = label;
    badge.dataset.kind = kind;
  }

  setNote(text: string): void {
    $('order-note').textContent = text;
  }

  log(e: OfficeEvent): void {
    const text = this.describe(e);
    if (!text) return;
    const list = $('log');
    const li = el('li', `log-${e.type.toLowerCase()}`);
    li.append(el('span', 'log-type', e.type), el('span', 'log-text', text));
    list.append(li);
    while (list.children.length > 300) list.firstElementChild?.remove();
    const box = $('tab-registro');
    box.scrollTop = box.scrollHeight;
  }

  private describe(e: OfficeEvent): string | null {
    const n = (id: string) => this.store.agentName(id);
    switch (e.type) {
      case 'OFFICE_STATE':
        return `Oficina lista con ${e.agents.length} agentes`;
      case 'ORDER_RECEIVED':
        return `Cliente → ${this.store.ceo()?.name ?? 'CEO'}: ${e.order}`;
      case 'AGENT_THINKING':
        return e.active ? `${n(e.agent)} está pensando…` : null;
      case 'AGENT_MOVE':
        return `${n(e.agent)} va a ${e.to === 'DESK' ? 'su mesa' : 'la sala de reuniones'}`;
      case 'MESSAGE':
        return `${n(e.from)} → ${n(e.to)}: ${e.content}`;
      case 'TASK_CREATED':
        return `Nueva tarea ${e.task.id} (${ROLE_LABEL[e.task.role] ?? e.task.role}): ${e.task.title}`;
      case 'TASK_ASSIGNED':
        return `${e.taskId} asignada a ${n(e.agent)}`;
      case 'TASK_STARTED': {
        const t = this.store.tasks.get(e.taskId);
        return `${t?.assigneeId ? n(t.assigneeId) : '?'} empieza ${e.taskId}`;
      }
      case 'TASK_COMPLETED':
        return `${e.taskId} terminada: ${e.result}`;
      case 'FILE_WRITTEN':
        return `${n(e.agent)} deja ${e.path} en la pizarra`;
      case 'WARNING':
        return `Aviso: ${e.message}`;
      case 'ERROR':
        return `Error: ${e.message}`;
      case 'RUN_FINISHED':
        return 'Encargo terminado';
    }
  }

  clearLog(): void {
    $('log').replaceChildren();
  }

  render(): void {
    this.renderTasks();
    this.renderFiles();
  }

  private renderTasks(): void {
    const s = this.store;
    $('order-current').textContent = s.order ? `«${s.order}»` : 'Todavía no hay encargo.';
    const tasks = [...s.tasks.values()];
    const done = tasks.filter((t) => t.status === 'DONE').length;
    $('n-tareas').textContent = tasks.length ? `${done}/${tasks.length}` : '';
    const list = $('tasks');
    list.replaceChildren();
    if (!tasks.length) {
      list.append(el('li', 'empty', 'El CEO aún no ha repartido tareas.'));
      return;
    }
    for (const t of tasks) {
      const li = el('li', `task task-${t.status.toLowerCase()}`);
      const top = el('div', 'task-top');
      top.append(el('span', `role role-${t.role.toLowerCase()}`, ROLE_LABEL[t.role] ?? t.role), el('span', 'status', STATUS_LABEL[t.status] ?? t.status));
      li.append(top, el('p', 'task-title', t.title));
      const meta = t.assigneeId ? `${t.id} · ${s.agentName(t.assigneeId)}` : t.id;
      li.append(el('p', 'task-meta', meta));
      if (t.result) li.append(el('p', 'task-result', t.result));
      list.append(li);
    }
  }

  private renderFiles(): void {
    const files = this.store.files;
    $('n-pizarra').textContent = files.length ? String(files.length) : '';
    const list = $('files');
    list.replaceChildren();
    const view = $('file-view');
    if (!files.length) {
      list.append(el('li', 'empty', 'Aquí aparecerán los archivos que entreguen los agentes.'));
      view.replaceChildren();
      this.selectedFile = null;
      return;
    }
    if (!this.selectedFile || !files.some((f) => f.path === this.selectedFile)) this.selectedFile = files[files.length - 1].path;
    for (const f of files) {
      const li = el('li');
      const b = el('button', f.path === this.selectedFile ? 'file on' : 'file');
      b.type = 'button';
      b.append(el('span', 'file-path', f.path), el('span', 'file-by', this.store.agentName(f.agent)));
      b.addEventListener('click', () => {
        this.selectedFile = f.path;
        this.renderFiles();
      });
      li.append(b);
      list.append(li);
    }
    const f = files.find((x) => x.path === this.selectedFile)!;
    const parts: HTMLElement[] = [];
    if (/\.svg$/i.test(f.path)) {
      // <img> con data: no ejecuta scripts del SVG.
      const img = el('img', 'preview-img');
      img.alt = f.path;
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(f.content)}`;
      parts.push(img);
    } else if (/\.html?$/i.test(f.path)) {
      // sandbox vacío: se ve el HTML pero no se ejecuta ningún script.
      const frame = el('iframe', 'preview-frame');
      frame.setAttribute('sandbox', '');
      frame.title = `Vista previa de ${f.path}`;
      frame.srcdoc = f.content;
      parts.push(frame);
    }
    parts.push(el('pre', 'code', f.content));
    view.replaceChildren(...parts);
  }
}
