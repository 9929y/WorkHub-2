# Workhub

An always-on-top frosted-glass HUD for macOS that aggregates the AI work you have
running in parallel across **Cursor, Codex, Figma and Cloud** jobs.

It is not a todo app. Nothing is maintained by hand: agents POST events to a local
HTTP endpoint, Workhub groups them by project, rolls up status across tools, and
holds notifications until you explicitly dismiss them.

```
┌─ collapsed (320×96) ────────────────┐
│ ⠿ Workhub               ▣ 2    ⌄   │
│ ● Brainstorm IA          6m ago    │
│   Portfolio Rewrite                │
│ 2 active │ ● 2 running │ ● 1 blocked│
└─────────────────────────────────────┘
        click → status panel (420×620)
```

---

## Install

**Prerequisites**

| Tool | Notes |
|---|---|
| Rust | Required. `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Xcode Command Line Tools | `xcode-select --install` |
| Node 20+ and pnpm | `brew install pnpm` |

Rust plus a Tauri `desktop/target/` directory needs **3–5 GB of free disk**.

```bash
pnpm install
```

## Run

```bash
pnpm dev
```

First launch compiles the Rust binary (a few minutes); afterwards it is seconds.
The HUD appears in the **top-right corner** and stays above other windows.

There is **no Dock icon** — Workhub is a menu-bar accessory. Use the **tray icon**
in the menu bar to `Show / Hide`, `Reset Position`, or `Quit`.

Release build:

```bash
pnpm build
```

Produces `desktop/target/release/bundle/macos/Workhub.app` (unsigned — see Limitations).

## Send a test event

With the app running:

```bash
curl -X POST http://localhost:8787/events -H "Content-Type: application/json" -d '{"project":"AtlasNova","sourceApp":"Codex","taskName":"Implementation","status":"done","summary":"Task finished.","priority":"normal"}'
```

The HUD updates immediately — no reload, no polling. Post a second event with
`"status":"blocked"` to the same project and watch the project rollup flip to
blocked while the Codex track stays green.

```bash
curl http://localhost:8787/health
```

### Endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/events` | Ingest an event. The one contract adapters need. |
| `GET` | `/health` | `{"ok":true,"service":"workhub","version":"0.1.0"}` |
| `GET` | `/state` | Read-only snapshot of everything. Useful for debugging. |

---

## Data structures

### Event payload (`POST /events`)

| Field | Type | Required | Default |
|---|---|---|---|
| `project` | string | **yes** | — matched case-insensitively; created if new |
| `sourceApp` | string | **yes** | — e.g. `Cursor`, `Codex`, `Figma`, `Cloud`, or anything else |
| `taskName` | string | no | `"Update"` |
| `status` | `running` \| `done` \| `blocked` \| `waiting` | no | `running` |
| `summary` | string | no | `""` |
| `priority` | `low` \| `normal` \| `high` | no | `normal` |
| `url` | string | no | `null` — rendered as an **Open** button on the alert |
| `timestamp` | RFC 3339 string | no | now |

The endpoint is deliberately forgiving: **unknown fields are ignored**, and
unrecognised `status` / `priority` values fall back to their defaults instead of
returning a 400. An adapter should never fail because it sent one extra key.
Common synonyms are accepted (`completed`/`success` → `done`, `failed`/`error` →
`blocked`, `pending`/`queued` → `waiting`).

### Model

Defined once in [`desktop/src/model.rs`](desktop/src/model.rs) and mirrored
field-for-field in [`src/lib/types.ts`](src/lib/types.ts). Both serialise
camelCase, so there is no mapping layer — change one, change the other.

```
Project  { id, name, slug, createdAt, updatedAt }
Task     { id, projectId, name, sourceApp, status, updatedAt }
Event    { id, projectId, taskId, sourceApp, taskName, status,
           summary, priority, url, timestamp, read, dismissed }
Note     { id, projectId, sourceApp, text, timestamp, pinned }
```

**`Task` is the "thread" concept and it is what makes aggregation work.** A task is
keyed on `(project, sourceApp, taskName)`. Codex-implementation and Cursor-debug
are therefore two tracks of one project, which is why the panel can show a single
project as `blocked` while its Codex badge stays green.

Ingest does three things ([`desktop/src/store/json.rs`](desktop/src/store/json.rs)):

1. **Resolve or create the project** by slug (lowercased, whitespace-collapsed).
   Agents never register a project up front.
2. **Resolve or create the task** by `(projectId, sourceApp, taskName)`; an existing
   task has its status updated.
3. **Append the event** as unread and undismissed, then broadcast to the UI.

### Derived values

Every number in the UI comes from [`src/lib/rollup.ts`](src/lib/rollup.ts) and
nowhere else:

- **unread** — `!read && !dismissed`
- **sticky alert** — `!dismissed && (blocked || done || priority === high)`.
  Sticky alerts **never auto-expire**; only pressing *Dismiss* removes one.
- **project status** — worst status among its tasks: `blocked > waiting > running > done`
- **active projects** — projects with at least one `running` or `waiting` track

### Storage — and the SQLite seam

State lives in one JSON file, written atomically (temp file + rename):

```
~/Library/Application Support/com.yanice.workhub/store.json
```

Everything else in the app talks **only** to `trait Store` in
[`desktop/src/store/mod.rs`](desktop/src/store/mod.rs). Commands, the HTTP server
and the tray never touch the JSON. Adding `SqliteStore` therefore means writing one
new file next to `json.rs` and changing the single constructor call in `lib.rs` —
no other module changes.

The event log is capped at 2000 entries (oldest dropped). A corrupt `store.json` is
renamed to `store.corrupt.json` rather than deleted.

Demo data is seeded **only when no store file exists**, so real events are never
clobbered. Delete `store.json` to get the demo back.

---

## Limitations

These are real MVP constraints, not TODOs I forgot:

1. **The event bus is unauthenticated.** It binds `127.0.0.1` only, so nothing off
   the machine can reach it, but any local process can post. Next step would be a
   shared-secret header checked in `server.rs`.
2. **On a multi-display setup the HUD always opens on the primary display** — the
   one with the menu bar — not on whichever screen the cursor is on. Placement uses
   the real work area (`NSScreen.visibleFrame` via Tauri's `Monitor::work_area()`),
   so it sits clear of the menu bar and the Dock without any hardcoded inset. Drag
   it to another screen and the position is remembered; *Reset Position* in the tray
   menu brings it back to the primary corner. If the display it was left on is gone
   at next launch, it falls back to the corner rather than opening off-screen.
3. **Frost comes from the native material, not CSS.** `backdrop-filter` alone over a
   transparent macOS window is unreliable, so the window applies
   `NSVisualEffectView` (`HudWindow`) via the `window-vibrancy` crate and the CSS only
   composites tint and hairlines on top. If vibrancy ever fails to apply it logs a
   warning and the CSS tint alone still renders legibly.
4. **No Dock icon** (`LSUIElement` in `desktop/Info.plist`), so the **tray icon is the
   only way to quit**.
5. **The release build is unsigned.** On first open macOS Gatekeeper will object;
   right-click → Open, or sign it with your own certificate.
6. **Dark only.** The HUD floats over arbitrary wallpaper; a light variant would lose
   contrast against bright desktops. Type is 10–13 px by design — this is a dense
   status console, not a document.
7. **`pnpm build` occasionally fails on its first attempt** with
   ``beforeBuildCommand `pnpm vite:build` failed``, when another pnpm or cargo
   process has just finished. `pnpm vite:build` always succeeds on its own, and the
   retry produces an identical bundle. Just run it again.
8. **pnpm blocks esbuild's install script** on this machine (build scripts are gated
   by default in pnpm 11). It does not matter: esbuild's native binary ships inside
   `@esbuild/darwin-arm64` and vite resolves it directly. `pnpm-workspace.yaml` sets
   `verifyDepsBeforeRun: false` so the pending approval does not abort `pnpm run`.

---

## Project layout

```
workhub/
├── src/                      React + TypeScript frontend
│   ├── App.tsx               collapsed ⇄ expanded switch
│   ├── lib/
│   │   ├── types.ts          mirrors desktop/src/model.rs
│   │   ├── rollup.ts         ALL derived values live here
│   │   ├── store.ts          zustand + live event subscription
│   │   └── api.ts            the only file that calls invoke()
│   ├── components/           Widget, Panel, ProjectCard, Timeline,
│   │                         StickyAlerts, Notes, SourceBadge, StatusDot
│   └── styles/
│       ├── tokens.css        colour / space / radius / type — single source of truth
│       ├── glass.css         layout + glass surface recipes
│       └── components.css    component styles
└── desktop/                  native side (named `desktop`, not `src-tauri`)
    ├── tauri.conf.json       frameless, transparent, always-on-top window
    ├── Info.plist            LSUIElement — menu-bar accessory
    └── src/
        ├── lib.rs            setup: vibrancy, placement, tray, server spawn
        ├── model.rs          the data model
        ├── store/            mod.rs (trait) · json.rs (MVP) · seed.rs (demo)
        ├── server.rs         axum on 127.0.0.1:8787
        ├── commands.rs       frontend-callable commands
        └── window.rs         top-right placement, collapse/expand sizing
```

### Design tokens

All colour, spacing, radius and type live in
[`src/styles/tokens.css`](src/styles/tokens.css). Components never use raw hex.

| | |
|---|---|
| Surfaces | `rgba(22,23,26,0.62)` base · `rgba(38,40,45,0.55)` raised — tint only, blur is native |
| Text | three levels: 0.94 / 0.62 / 0.40 alpha |
| Status | running `#4A9EFF` · done `#35C17E` · blocked `#FF5F56` · waiting `#F0A83C` |
| Radii | 12 px window · 10 px card · 8 px chip |
| Motion | 120–180 ms, honours `prefers-reduced-motion` |

Status is never conveyed by colour alone — every dot carries an accessible label,
unread alerts get a left rule as well as a colour, and all counters use tabular
figures so numbers do not jitter as they change.

---

## Wiring up your tools

The point of the HTTP endpoint is that every adapter is just a POST. Nothing needs
to know about Workhub's internals.

**Cloud / CI** — one line at the end of a pipeline:

```bash
curl -sS -X POST http://localhost:8787/events -H "Content-Type: application/json" \
  -d "{\"project\":\"Portfolio Rewrite\",\"sourceApp\":\"Cloud\",\"taskName\":\"Build & deploy\",\"status\":\"done\",\"summary\":\"Deployed $GIT_COMMIT\"}"
```

**Codex / Claude Code** — post from a stop hook or at the end of a task, using the
same `project` string every time so events aggregate onto one card.

**Cursor** — a small extension that posts on task completion and on test failure
(`status: "blocked"` with the failing test in `summary`).

**Figma** — a webhook receiver mapping `FILE_COMMENT` → `waiting` and
`LIBRARY_PUBLISH` → `done`. Needs a public endpoint, so this one wants a relay
rather than a direct call to localhost.

Because `sourceApp` is a free string, a new tool needs **no code change** — it just
renders with a neutral (dashed) badge instead of a known one. Add it to
`KNOWN_SOURCE_APPS` in `src/lib/types.ts` when you want it styled as first-class.

### Deliberately not in the MVP

macOS Notification Center listening, a browser-extension bridge, and polling
adapters that reach into Figma/Cursor APIs directly. The local event bus is the
foundation those would all sit on; it works and is worth living with first.
