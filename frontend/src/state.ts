import type { AgentInfo, OfficeEvent, TaskInfo } from './events';

export interface FileEntry {
  path: string;
  content: string;
  agent: string;
  taskId: string | null;
}

/** Estado de la oficina tal y como lo cuentan los eventos (lo usa el panel lateral). */
export class OfficeStore {
  agents = new Map<string, AgentInfo>();
  tasks = new Map<string, TaskInfo>();
  files: FileEntry[] = [];
  order: string | null = null;
  finished = false;

  agentName(id: string): string {
    if (id === 'client') return 'Cliente';
    return this.agents.get(id)?.name ?? id;
  }

  ceo(): AgentInfo | undefined {
    return [...this.agents.values()].find((a) => a.role === 'CEO');
  }

  apply(e: OfficeEvent): void {
    switch (e.type) {
      case 'OFFICE_STATE':
        this.agents = new Map(e.agents.map((a) => [a.id, { ...a }]));
        this.tasks = new Map(e.tasks.map((t) => [t.id, { ...t }]));
        this.files = [];
        this.order = null;
        this.finished = false;
        break;
      case 'ORDER_RECEIVED':
        this.order = e.order;
        break;
      case 'AGENT_MOVE': {
        const a = this.agents.get(e.agent);
        if (a) a.location = e.to;
        break;
      }
      case 'TASK_CREATED':
        this.tasks.set(e.task.id, { ...e.task });
        break;
      case 'TASK_ASSIGNED': {
        const t = this.tasks.get(e.taskId);
        if (t) t.assigneeId = e.agent;
        break;
      }
      case 'TASK_STARTED': {
        const t = this.tasks.get(e.taskId);
        if (t) t.status = 'IN_PROGRESS';
        break;
      }
      case 'TASK_COMPLETED': {
        const t = this.tasks.get(e.taskId);
        if (t) {
          t.status = 'DONE';
          t.result = e.result;
        }
        break;
      }
      case 'FILE_WRITTEN': {
        const entry = { path: e.path, content: e.content, agent: e.agent, taskId: e.taskId };
        const i = this.files.findIndex((f) => f.path === e.path);
        if (i >= 0) this.files[i] = entry;
        else this.files.push(entry);
        break;
      }
      case 'RUN_FINISHED':
        this.finished = true;
        break;
      default:
        break;
    }
  }
}
