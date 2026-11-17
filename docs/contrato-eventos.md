# Contrato de eventos backend ↔ frontend

El backend cuenta lo que pasa en la oficina enviando **eventos JSON** al frontend por WebSocket.
El frontend solo dibuja: no decide nada. Si mañana cambias la lógica en Java, el frontend sigue
funcionando mientras respetes este contrato.

- Cada mensaje es **un objeto JSON** con un campo `type` y el resto de campos al mismo nivel.
- Los nombres de enums son los mismos que en Java (`Role`, `Location`, `TaskStatus`), tal cual los
  escribe Jackson por defecto: `"DEVELOPER"`, `"MEETING_ROOM"`, `"IN_PROGRESS"`.
- Los agentes se identifican por su `id` (`"ceo"`, `"dev"`…), igual que en `Office`.
- El frontend reproduce los eventos **en orden y de uno en uno** (espera a que acabe la animación
  de uno antes de empezar el siguiente). El backend puede enviarlos tan rápido como quiera.
- Un `type` desconocido o un evento al que le falten campos se ignora (sale un aviso en la consola).

Dirección: endpoint WebSocket `ws://localhost:8080/ws/office` (se crea en la fase 3).

## Backend → frontend

| `type` | Campos | Cuándo se envía (en `Simulation`) |
|---|---|---|
| `OFFICE_STATE` | `agents`: lista de `AgentInfo`, `tasks`: lista de `TaskInfo` | Al conectarse el frontend y al empezar cada encargo. Reinicia la oficina dibujada. |
| `ORDER_RECEIVED` | `order` (texto) | `receiveOrder`: el cliente entra y le da el encargo al CEO. |
| `AGENT_THINKING` | `agent` (id), `active` (bool) | `true` justo antes de `llm.complete(...)` y `false` justo después. |
| `TASK_CREATED` | `task`: `TaskInfo` | `createTasks`, por cada tarea válida. |
| `WARNING` | `message` | Avisos no graves (p. ej. «Skipped invalid line: …»). |
| `TASK_ASSIGNED` | `taskId`, `agent` (id) | Tras `task.assignTo(agent)`. |
| `MESSAGE` | `from` (id), `to` (id), `content` | Cada `office.send(...)`. Es el record `Message` tal cual. |
| `AGENT_MOVE` | `agent` (id), `to` (`Location`) | Cada `agent.moveTo(...)`. |
| `TASK_STARTED` | `taskId` | Tras `task.start()`. |
| `FILE_WRITTEN` | `agent` (id), `taskId` (o `null`), `path`, `content` | Cuando un agente entrega un archivo (va a la pizarra). |
| `TASK_COMPLETED` | `taskId`, `result` | Tras `task.complete(output)`. |
| `ERROR` | `message` | Algo ha fallado (p. ej. 429 de Gemini). |
| `RUN_FINISHED` | — | Al acabar `run`. |

`AgentInfo`:

```json
{ "id": "dev", "name": "Ana", "role": "DEVELOPER", "location": "DESK" }
```

`TaskInfo` (los getters de `Task`):

```json
{ "id": "task-1", "title": "Build the home page", "role": "DEVELOPER",
  "status": "PENDING", "assigneeId": null, "result": null }
```

### Ejemplo: una tarea completa

```json
{"type":"TASK_ASSIGNED","taskId":"task-1","agent":"dev"}
{"type":"MESSAGE","from":"ceo","to":"dev","content":"Your task: Build the home page"}
{"type":"AGENT_MOVE","agent":"dev","to":"DESK"}
{"type":"TASK_STARTED","taskId":"task-1"}
{"type":"AGENT_THINKING","agent":"dev","active":true}
{"type":"AGENT_THINKING","agent":"dev","active":false}
{"type":"FILE_WRITTEN","agent":"dev","taskId":"task-1","path":"index.html","content":"<!doctype html>..."}
{"type":"TASK_COMPLETED","taskId":"task-1","result":"index.html with a header and a menu"}
{"type":"MESSAGE","from":"dev","to":"ceo","content":"Done: Build the home page"}
```

## Frontend → backend

| `type` | Campos | Significado |
|---|---|---|
| `START_RUN` | `order` | El usuario escribe un encargo y pulsa «Enviar». |

## Grabaciones (modo demo)

Una grabación es un JSON con los mismos eventos y una pausa opcional antes de cada uno
(`delayMs`, para simular lo que tarda el LLM). Está en `frontend/public/runs/`.

```json
{
  "version": 1,
  "title": "Web para una cafetería",
  "order": "Make a website for a coffee shop",
  "events": [
    { "event": { "type": "OFFICE_STATE", "agents": [], "tasks": [] } },
    { "delayMs": 2500, "event": { "type": "AGENT_THINKING", "agent": "ceo", "active": false } }
  ]
}
```

En la fase 4, el backend guardará así cada ejecución real y la web estática las reproducirá sin clave.
