// Tipos del contrato de eventos. Fuente de verdad: docs/contrato-eventos.md

export type RoleName = 'CEO' | 'DEVELOPER' | 'DESIGNER' | 'TESTER';
export type LocationName = 'DESK' | 'MEETING_ROOM';
export type TaskStatusName = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface AgentInfo {
  id: string;
  name: string;
  role: RoleName;
  location: LocationName;
}

export interface TaskInfo {
  id: string;
  title: string;
  role: RoleName;
  status: TaskStatusName;
  assigneeId: string | null;
  result: string | null;
}

export type OfficeEvent =
  | { type: 'OFFICE_STATE'; agents: AgentInfo[]; tasks: TaskInfo[] }
  | { type: 'ORDER_RECEIVED'; order: string }
  | { type: 'AGENT_THINKING'; agent: string; active: boolean }
  | { type: 'AGENT_MOVE'; agent: string; to: LocationName }
  | { type: 'MESSAGE'; from: string; to: string; content: string }
  | { type: 'TASK_CREATED'; task: TaskInfo }
  | { type: 'TASK_ASSIGNED'; taskId: string; agent: string }
  | { type: 'TASK_STARTED'; taskId: string }
  | { type: 'TASK_COMPLETED'; taskId: string; result: string }
  | { type: 'FILE_WRITTEN'; agent: string; taskId: string | null; path: string; content: string }
  | { type: 'WARNING'; message: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RUN_FINISHED' };

export type ClientCommand = { type: 'START_RUN'; order: string };

const REQUIRED: Record<OfficeEvent['type'], string[]> = {
  OFFICE_STATE: ['agents', 'tasks'],
  ORDER_RECEIVED: ['order'],
  AGENT_THINKING: ['agent', 'active'],
  AGENT_MOVE: ['agent', 'to'],
  MESSAGE: ['from', 'to', 'content'],
  TASK_CREATED: ['task'],
  TASK_ASSIGNED: ['taskId', 'agent'],
  TASK_STARTED: ['taskId'],
  TASK_COMPLETED: ['taskId', 'result'],
  FILE_WRITTEN: ['agent', 'path', 'content'],
  WARNING: ['message'],
  ERROR: ['message'],
  RUN_FINISHED: [],
};

/** Devuelve el evento si tiene un type conocido y todos sus campos; si no, null. */
export function parseEvent(raw: unknown): OfficeEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.type !== 'string' || !(o.type in REQUIRED)) return null;
  for (const field of REQUIRED[o.type as OfficeEvent['type']]) {
    if (o[field] === undefined || o[field] === null) return null;
  }
  if (o.type === 'FILE_WRITTEN' && o.taskId === undefined) o.taskId = null;
  return o as unknown as OfficeEvent;
}

export const ROLE_LABEL: Record<string, string> = {
  CEO: 'CEO',
  DEVELOPER: 'Developer',
  DESIGNER: 'Designer',
  TESTER: 'Tester',
};
