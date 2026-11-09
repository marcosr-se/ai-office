# Proyecto: Oficina IA

## Idea
Oficina 2D en pixel-art en el navegador donde agentes de IA trabajan como una empresa. Mezcla de oficina visual, empresa simulada (estilo ChatDev) y simulación social (estilo Generative Agents).
- El usuario hace de cliente y escribe un encargo. El CEO lo divide en tareas y las asigna a Dev, Diseñador y Tester. Los agentes caminan a sus mesas o a la sala de reuniones, hablan con bocadillos de texto y entregan el resultado.
- Cada agente tiene una memoria corta de lo que ha hecho y de lo que le han dicho.
- Entregables: archivos de texto (Markdown y código) en una carpeta de trabajo, mostrados en una "pizarra". Los agentes NO ejecutan el código que generan (haría falta un sandbox).

## Reparto del trabajo
- `backend/`: lo programa Marcos para aprender Java/Spring. No escribas ni modifiques código en `backend/src/` salvo petición explícita. Tu papel ahí es de profesor: explicar, revisar y exigir un diseño limpio.
- `frontend/`: se genera con agentes (Antigravity).
- Setup, configuración, Git y terminal: puedes ayudar directamente.

## Decisiones
- Coste 0: Gemini API (tier gratuito, clave de Google AI Studio) como proveedor principal y Groq como secundario.
- Por los límites gratuitos (~15–30 peticiones/minuto), el LLM solo se llama ante eventos (encargo, traspaso de tarea, reunión). El movimiento y las animaciones son simulación local.
- BYOK: el repo no incluye ninguna clave. Va en `.env`, que está en `.gitignore` (plantilla en `.env.example`).
- Dos modos:
  - Demo: sin clave, reproduce ejecuciones grabadas en JSON. Se desplegará como web estática para el portfolio.
  - Real: con clave en `.env`, ejecutándose en local.
- Interfaz `LLMProvider` con `GeminiProvider`, `GroqProvider`, `MockProvider` y `ReplayProvider`. Más adelante, fallback automático ante errores 429.
- Llamadas al LLM con `java.net.http.HttpClient` + Jackson, sin SDKs.
- Contrato back↔front: eventos JSON por WebSocket, por ejemplo `{"type":"AGENT_MOVE","agent":"dev","to":"meeting_room"}`. Definirlo pronto para que el frontend avance en paralelo con eventos falsos.

## Stack
- Backend: Java 21 (Microsoft OpenJDK 21; en la máquina también hay 25 y 26 —el `java` por defecto es el 26—, que no se usan), Spring Boot 4.1.2, Maven, solo Spring Web MVC + WebSocket (sin Lombok). IDE: IntelliJ. Paquete base `com.marcosr_se.backend`.
- Frontend: Phaser 3 + sprites CC0 (Kenney).
- Monorepo `oficina-ia/` con `backend/` y `frontend/`. Git en la raíz.

## Comandos
- Compilar y testear con Java 21: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) ./mvnw verify`
- Arrancar: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) ./mvnw spring-boot:run`

## Hoja de ruta
0. Setup: proyecto Spring Boot, Git, `.gitignore` con `.env`, repo en GitHub y endpoint `GET /api/health` → `{"status":"ok"}` (lo escribe Marcos).
1. Dominio sin IA: `Agent`, `Role`, `Task`, `Message`, `Office` + simulación por consola con `MockProvider`.
2. `LLMProvider` + `GeminiProvider`, respuestas JSON estructuradas y manejo de respuestas inválidas.
3. WebSocket con eventos + frontend Phaser.
4. Grabación/replay → modo demo → despliegue estático.
5. Memoria de agentes, más roles, `GroqProvider` y fallback ante 429.

## Estado actual
- Fase 0 terminada: proyecto Spring Boot en `backend/`, Git + repo en GitHub (https://github.com/marcosr-se/ai-office), `.gitignore` con `.env`, `.env.example`, IntelliJ con SDK 21 y `GET /api/health` → `{"status":"ok"}` (paquete `health`: `HealthController` + record `HealthResponse`).
- Siguiente: fase 1 (dominio sin IA).
