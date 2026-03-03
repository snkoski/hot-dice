# Multi-User Features Plan: Shared Components & Cursor Visibility

This document outlines how to add multi-user collaboration features to Hot Dice: cursor visibility (already partially integrated) and shared interactive components like a dice that everyone can roll and see update in real time.

---

## 1. Current State: Multi-Mouse Integration

### What's Already There

- **`@multi-mouse/client`** – Browser library that shows other users' cursors
- **`@multi-mouse/server`** – Standalone WebSocket server (port 3001) for cursor positions
- **Hot-dice proxy** – `/ws/cursors` on the hot-dice server forwards to the multi-mouse server
- **Room:** All users connect to room `'dice-room'` (hardcoded in `public/main.js`)

### How Multi-Mouse Works

```
┌─────────────┐     cursor-move      ┌──────────────────┐     cursor-move      ┌─────────────┐
│  Browser A  │ ──────────────────► │  Multi-Mouse     │ ──────────────────►  │  Browser B  │
│  (mouse)    │     (x, y %)         │  Server         │     (broadcast)     │  (sees A)   │
└─────────────┘                     └──────────────────┘                     └─────────────┘
```

- Cursor positions are sent as normalized percentages (0–1) so different screen sizes work
- Multi-mouse only handles cursor data; it does not handle shared application state

### Limitation

Multi-mouse is cursor-only. For shared components (e.g., a dice everyone can roll), you need a separate real-time channel and server-side state.

---

## 2. Shared Dice Component: Architecture

### Goal

A single dice in the top corner that:

- Anyone can click "Roll" to roll it
- Everyone sees the same value update in real time
- Roll is server-authoritative (no client-side cheating)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HOT-DICE SERVER                                                             │
│                                                                              │
│  /ws/cursors  ──────► proxy to multi-mouse (cursor positions only)           │
│                                                                              │
│  /ws/shared  ──────► NEW: shared state channel                               │
│                      - Rooms (e.g. "dice-room", "game-abc123")               │
│                      - State: { diceValue: 3, lastRolledBy: "user-xyz" }     │
│                      - Client sends: { type: "roll" }                        │
│                      - Server rolls, broadcasts: { type: "dice-update", ... } │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │  All clients in same room receive same updates
         ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Browser A  │  │  Browser B  │  │  Browser C  │
│  [🎲 3] Roll│  │  [🎲 3] Roll│  │  [🎲 3] Roll│
└─────────────┘  └─────────────┘  └─────────────┘
```

### Room Alignment

| Scenario | Multi-Mouse Room | Shared State Room |
|----------|------------------|-------------------|
| General lobby (no game) | `dice-room` | `dice-room` |
| In an interactive game | `game-{gameId}` | `game-{gameId}` |

When users join an interactive game, both multi-mouse and shared state should use the same room ID so:

- They see each other's cursors
- They share the same dice (and future shared components)

When on the main page (no game), use a default room like `dice-room` so everyone on the site shares the lobby dice.

---

## 3. Implementation Plan

### Phase 1: Shared State WebSocket (Hot-Dice Server)

Add a new WebSocket endpoint on the hot-dice server (not multi-mouse):

**Endpoint:** `GET /ws/shared?room=dice-room`

**Server-side state (in-memory):**

```typescript
// Room ID → connected WebSocket clients
const sharedRooms = new Map<string, Set<WebSocket>>();

// Room ID → shared state for that room
const sharedState = new Map<string, {
  diceValue: number;
  lastRolledBy?: string;
  lastRolledAt?: number;
}>();
```

**Message protocol:**

| Direction | Type | Payload | Description |
|-----------|------|---------|-------------|
| Client → Server | `join` | `{ room: string }` | Join a room (from URL param) |
| Client → Server | `roll` | `{}` | Request to roll the shared dice |
| Server → Client | `state` | `{ diceValue, lastRolledBy? }` | Initial state when joining |
| Server → Client | `dice-update` | `{ value, rolledBy }` | Broadcast when anyone rolls |

**Server logic for `roll`:**

1. Validate client is in a room
2. Generate random 1–6 (or use seedrandom for reproducibility if desired)
3. Update `sharedState.get(roomId)`
4. Broadcast `{ type: 'dice-update', value, rolledBy: userId }` to all clients in room

### Phase 2: Client-Side Shared Dice Component

**UI placement:** Fixed in top-right (or top-left) corner, above/beside the multi-mouse status.

**Client logic:**

1. Connect to `/ws/shared?room=dice-room` (or `game-{id}` when in a game)
2. On `state` or `dice-update`, update the displayed dice value (with optional roll animation)
3. "Roll" button sends `{ type: 'roll' }`
4. Optionally disable button briefly after roll to avoid spam

**HTML structure (conceptual):**

```html
<div id="shared-dice-widget" style="position: fixed; top: 12px; right: 12px; z-index: 999999;">
  <div id="shared-dice-value">–</div>
  <button id="shared-dice-roll">Roll</button>
  <span id="shared-dice-roller" style="font-size: 0.8em; color: #666;"></span>
</div>
```

### Phase 3: Room Synchronization with Game Sessions

When a user starts an interactive game:

1. **Create game** → get `gameId` from API
2. **Connect multi-mouse** to room `game-{gameId}` (instead of `dice-room`)
3. **Connect shared state** to room `game-{gameId}`

When the user leaves the game or closes it:

1. Reconnect both to `dice-room` (or disconnect shared state if not needed on main page)

This keeps the shared dice (and future shared components) scoped to the right context.

### Phase 4: Extensibility for More Shared Components

The shared state channel can be generalized:

```typescript
interface SharedState {
  dice?: { value: number; lastRolledBy?: string };
  // Future: shared counter, shared timer, etc.
  [key: string]: unknown;
}
```

Or use a more generic "shared component" model:

```typescript
// Client → Server
{ type: 'action', component: 'dice', action: 'roll' }
{ type: 'action', component: 'counter', action: 'increment' }

// Server → Client
{ type: 'update', component: 'dice', payload: { value: 4, rolledBy: '...' } }
{ type: 'update', component: 'counter', payload: { value: 42 } }
```

This allows adding more shared widgets (counters, timers, etc.) without changing the protocol shape.

---

## 4. Technical Considerations

### Deployment

- **Multi-mouse:** Runs as separate process or is proxied through hot-dice. When using a tunnel (e.g., tunnel-service), the `/ws/cursors` proxy ensures clients connect to the same origin.
- **Shared state:** Lives on the hot-dice server. No extra process. Same-origin WebSocket works with tunnels.

### Persistence

- Shared state is in-memory. If the server restarts, rooms and state are lost.
- For a "lobby dice" this is fine. For game-critical state, the interactive game already uses API + server-side game state.

### Scaling

- In-memory rooms work for single-instance deployment.
- For multiple server instances, you'd need a shared store (Redis pub/sub, etc.) to broadcast across instances. Not required for initial implementation.

### Security

- Validate room IDs (alphanumeric, reasonable length)
- Rate-limit roll requests per client (e.g., 1 roll per 2 seconds)
- Optionally require authentication for game rooms (e.g., only players in the game can join `game-{id}`)

---

## 5. File Changes Summary

| File | Changes |
|------|---------|
| `src/web/server.ts` | Add `/ws/shared` WebSocket handler, room state, broadcast logic |
| `public/main.js` | Add shared dice widget, connect to `/ws/shared`, handle messages |
| `public/index.html` | Add container for shared dice widget (or create via JS) |
| `public/main.js` (game flow) | When starting interactive game, switch multi-mouse + shared room to `game-{id}` |

---

## 6. Future: Human vs Human Multiplayer

For full PvP (humans playing against each other):

- **Game state:** Already supported by `InteractiveStepGame` with `HumanStrategy`
- **Session model:** One "host" creates a game, gets a shareable link (e.g. `?game=abc123`)
- **Joining:** Second player opens link, gets assigned as player 2
- **Cursors:** Both in room `game-abc123`, see each other's cursors
- **Shared dice:** Same room, so any shared components are per-game

The shared state channel and room model above fit this flow. The main addition would be a "create shareable game" flow and a "join via link" flow, plus assigning human players to slots.

---

## 7. Summary for LLM Implementation

When implementing:

1. **Shared state is separate from multi-mouse** – Add `/ws/shared` on the hot-dice server; do not extend multi-mouse.
2. **Use rooms** – Same pattern as multi-mouse: `?room=dice-room` or `?room=game-{id}`.
3. **Server-authoritative rolls** – Client sends `roll`, server generates value and broadcasts.
4. **Align rooms** – When in a game, use `game-{gameId}` for both multi-mouse and shared state.
5. **Design for extension** – Structure shared state so more component types can be added later.

---

*Document created for Hot Dice multi-user features. March 2025.*
