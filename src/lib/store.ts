/** App state: a snapshot of the backend plus a live subscription.
 *
 *  The backend is the only source of truth. Every mutation round-trips and the
 *  resulting `workhub://state` broadcast triggers a refetch, so the HUD can
 *  never drift from what an agent actually reported. */

import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import * as api from "./api";
import { rollupProjects, summarise, type HudSummary, type ProjectRollup } from "./rollup";
import type { HubState, ServerInfo } from "./types";

/** Must match --morph / --morph-out in tokens.css. */
const MORPH_MS = 260;
/** Exit is deliberately faster than enter, so dismissing never feels sluggish. */
const MORPH_OUT_MS = 170;

/** Pending window-shrink, so re-opening mid-collapse can cancel it. */
let shrinkTimer: number | undefined;
/** Must match PANEL_MIN_H / PANEL_MAX_H in desktop/src/window.rs. */
const PANEL_MIN_H = 96;
const PANEL_MAX_H = 520;
const PANEL_FALLBACK_H = 260;

const EMPTY: HubState = {
  projects: [],
  tasks: [],
  events: [],
  ui: { position: null, collapsed: true },
};

interface HubStore {
  state: HubState;
  rollups: ProjectRollup[];
  summary: HudSummary;
  server: ServerInfo | null;
  serverError: string | null;
  expanded: boolean;
  loaded: boolean;
  /** Measured content height of the panel; the island sizes itself to it. */
  panelHeight: number;
  /** Bumped every minute so relative timestamps stay honest. */
  tick: number;

  refresh: () => Promise<void>;
  init: () => Promise<() => void>;
  setExpanded: (expanded: boolean) => Promise<void>;
  toggleExpanded: () => Promise<void>;
  /** Called by the panel once it knows how tall its content is. */
  fitPanel: (height: number) => void;
}

export const useHub = create<HubStore>((set, get) => ({
  state: EMPTY,
  rollups: [],
  summary: { needsYou: 0, running: 0, platforms: [], top: null },
  server: null,
  serverError: null,
  expanded: false,
  loaded: false,
  panelHeight: PANEL_FALLBACK_H,
  tick: 0,

  refresh: async () => {
    const state = await api.getState();
    const rollups = rollupProjects(state);
    set({ state, rollups, summary: summarise(rollups, state), loaded: true });
  },

  init: async () => {
    await get().refresh();

    // Restore the mode the HUD was last left in.
    const collapsed = get().state.ui.collapsed;
    set({ expanded: !collapsed });

    const unlistenState = await listen("workhub://state", () => {
      void get().refresh();
    });
    const unlistenError = await listen<string>("workhub://server-error", (e) => {
      set({ serverError: e.payload });
    });

    api.serverInfo().then((server) => set({ server })).catch(() => {});

    const timer = window.setInterval(() => set({ tick: get().tick + 1 }), 60_000);

    return () => {
      unlistenState();
      unlistenError();
      window.clearInterval(timer);
    };
  },

  setExpanded: async (expanded) => {
    // The island morphs in CSS; the native window only has to be big enough to
    // contain the animation. So grow before animating, and shrink after.
    // Re-opening mid-collapse must cancel the pending shrink. Without this the
    // window snaps back to island size while the panel is on screen, clipping it.
    if (shrinkTimer !== undefined) {
      window.clearTimeout(shrinkTimer);
      shrinkTimer = undefined;
    }

    if (expanded) {
      // Grow the window to the ceiling first so the morph has room; `fitPanel`
      // shrinks it to the real content height once the panel has rendered.
      await api.setPanelExpanded(true);
      set({ expanded: true });
      return;
    }
    set({ expanded: false });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    shrinkTimer = window.setTimeout(() => {
      shrinkTimer = undefined;
      // Guard again: the state can have flipped back while we waited.
      if (!useHub.getState().expanded) void api.setPanelExpanded(false);
    }, reduced ? 0 : MORPH_OUT_MS);
  },

  toggleExpanded: async () => {
    await get().setExpanded(!get().expanded);
  },

  fitPanel: (height) => {
    const h = Math.round(Math.min(Math.max(height, PANEL_MIN_H), PANEL_MAX_H));
    // Ignore sub-pixel churn, which would otherwise ping-pong with the observer.
    if (Math.abs(h - get().panelHeight) < 2) return;
    set({ panelHeight: h });
    if (!get().expanded) return;
    // Let the CSS morph land before the window shrinks around it, or the
    // animation gets clipped by the window edge.
    window.setTimeout(() => {
      if (useHub.getState().expanded) void api.setPanelHeight(h);
    }, MORPH_MS);
  },
}));

/** Mutations. Each awaits the backend, then leans on the broadcast to refresh. */
export const actions = {
  /** Suppress an item handled outside Workhub. The queue is otherwise derived
   *  from live status and clears itself when an agent reports progress. */
  dismiss: (eventId: string) => api.dismiss(eventId),
  markAllRead: (projectId?: string) => api.markAllRead(projectId),
  /** Jump into the tool that reported this. */
  open: (sourceApp: string, url?: string | null) => api.openTarget(sourceApp, url),
};
