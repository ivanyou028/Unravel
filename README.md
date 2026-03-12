# Unravel

A voice-native ideation tool. Speak your thoughts out loud and watch them materialize as a structured knowledge graph in real time. The system listens via Deepgram, processes your speech with Claude, and emits graph deltas that render on a React Flow canvas with auto-layout.

## Setup

```bash
npm install
cp .env.example .env  # then fill in your API keys
```

You need two keys:

- `ANTHROPIC_API_KEY` — for Claude (graph generation + consolidation)
- `DEEPGRAM_API_KEY` — for real-time speech-to-text

## Running

Start both servers:

```bash
npm run dev          # Vite frontend on :3000
npm run dev:server   # Express + WebSocket backend on :3001
```

Open [http://localhost:3000](http://localhost:3000) and click "start yapping."

## How It Works

1. You press the mic button and start talking.
2. Browser captures audio, downsamples to 16kHz PCM, and streams it over a WebSocket.
3. The server pipes audio to Deepgram for real-time transcription.
4. Transcripts accumulate and are periodically sent to Claude, which decides what graph operations to emit (add/update/remove nodes and edges).
5. A separate consolidation pass runs every 5s to merge duplicates and clean up the graph.
6. Graph events stream back to the client over the same WebSocket.
7. The Zustand store applies events, Dagre computes layout, and React Flow renders the result.

## Architecture

```
Browser                         Server
  |                               |
  |-- audio (binary ws) --------->|-- Deepgram (STT)
  |                               |     |
  |<-- transcript (json ws) ------|<----|
  |                               |
  |                               |-- Claude (graph generation)
  |                               |     |
  |<-- graph events (json ws) ---|<----|
  |                               |
  |                               |-- Claude (graph consolidation, periodic)
  |                               |     |
  |<-- graph events (json ws) ---|<----|
```

### Server (`server/`)

| File | Purpose |
|------|---------|
| `index.ts` | Express app, REST endpoints, WebSocket server |
| `ws/sessionHandler.ts` | Per-session pipeline: Deepgram + Claude + graph state |
| `services/deepgram.ts` | Deepgram streaming STT client |
| `services/ai.ts` | Claude integration for graph generation and consolidation |
| `services/session.ts` | Session state manager (graph + conversation history) |
| `services/shared-types.ts` | Shared type definitions for the event protocol |

### Client (`src/`)

| File | Purpose |
|------|---------|
| `features/workspace/components/workspace-shell.tsx` | Top-level shell, mic button, voice session lifecycle |
| `features/graph/components/graph-canvas.tsx` | React Flow canvas |
| `features/graph/components/graph-node-card.tsx` | Generic node renderer |
| `features/graph/store/graph-store.ts` | Zustand store for graph state + event application |
| `features/graph/lib/layout-graph.ts` | Dagre auto-layout |
| `features/graph/contracts/inbound-graph-events.ts` | Zod schemas for validating inbound events |
| `features/realtime/ws-session-adapter.ts` | WebSocket adapter (implements `GraphEventAdapter`) |
| `features/realtime/graph-event-adapter.ts` | Adapter interface |
| `voice/client/useVoiceSession.ts` | React hook: session lifecycle, mic capture, audio streaming |

## Graph Event Protocol

Events flow server-to-client over WebSocket and are validated with Zod before reaching the store.

**Event types:** `graph.node.upsert`, `graph.node.remove`, `graph.edge.upsert`, `graph.edge.remove`, `graph.layout`, `graph.reset`

Each event includes an envelope:

```ts
{ version: 1, eventId: string, occurredAt: string }
```

Node and edge `kind` fields are free-form strings — Claude chooses whatever labels fit the brainstorm context (e.g. `"idea"`, `"question"`, `"action"`, `"theme"`, `"builds-on"`, etc).

## Stack

- **Frontend:** React, TanStack Start, Tailwind CSS v4, Motion
- **Graph:** @xyflow/react, @dagrejs/dagre, Zustand, Zod
- **Backend:** Express, WebSocket (ws)
- **AI:** Anthropic Claude SDK
- **STT:** Deepgram streaming API

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run dev:server` | Start backend server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run check` | Format + lint fix |
