/** App state and the shape lifecycle.
 *
 *  Three shapes, one at a time:
 *
 *    island  the resting state: platform marks and a count
 *    alert   an arrival, shown for ALERT_MS then demoted to the island
 *    panel   the queue (or the status board, when the queue is empty)
 *
 *  An arrival never blocks: ignoring the alert costs nothing, because the Ask
 *  is already in the queue before the alert is shown. */

import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import * as api from "./api";
import { collectAsks, rollupProjects, summarise, type Ask, type HudSummary, type ProjectRollup } from "./rollup";
import type { HubState, ServerInfo } from "./types";

/** Must match --morph / --morph-out in tokens.css. */
const MORPH_MS = 260;
const MORPH_OUT_MS = 170;
/** How long an arrival stays up before demoting itself to a count. */
const ALERT_MS = 6000;
/** Must match PANEL_MIN_H / PANEL_MAX_H in desktop/src/window.rs. */
const PANEL_MIN_H = 96;
const PANEL_MAX_H = 520;
const PANEL_FALLBACK_H = 260;

export type Shape = "island" | "alert" | "panel";

const EMPTY: HubState = { projects: [], tasks: [], events: [], ui: { position: null, collapsed: true } };

let shrinkTimer: number | undefined;
let alertTimer: number | undefined;
/** Set only when the panel was opened deliberately. The alert dwell must never
 *  be able to leave the window in panel shape, and conditioning the return on
 *  "are we still in the alert shape" trusted a piece of state that was observed
 *  drifting. This trusts intent instead, which cannot drift. */
let openedByUser = false;

interface HubStore {
  state: HubState;
  asks: Ask[];
  rollups: ProjectRollup[];
  summary: HudSummary;
  server: ServerInfo | null;
  serverError: string | null;
  shape: Shape;
  /** The Ask currently being announced, if any. */
  alert: Ask | null;
  loaded: boolean;
  panelHeight: number;

  refresh: (arrivedEventId?: string | null) => Promise<void>;
  init: () => Promise<() => void>;
  setShape: (shape: Shape) => Promise<void>;
  togglePanel: () => Promise<void>;
  dismissAlert: () => void;
  fitPanel: (height: number) => void;
}

export const useHub = create<HubStore>((set, get) => ({
  state: EMPTY,
  asks: [],
  rollups: [],
  summary: { asks: 0, fresh: 0, platforms: [] },
  server: null,
  serverError: null,
  shape: "island",
  alert: null,
  loaded: false,
  panelHeight: PANEL_FALLBACK_H,

  refresh: async (arrivedEventId) => {
    const state = await api.getState();
    const asks = collectAsks(state);
    const rollups = rollupProjects(state);
    set({ state, asks, rollups, summary: summarise(rollups, asks), loaded: true });

    if (!arrivedEventId) return;
    // Announce only if what arrived actually needs Yanice, and only when we are
    // not already showing the queue: interrupting an open panel is pointless.
    const arrived = asks.find((a) => a.event?.id === arrivedEventId);
    if (!arrived || get().shape === "panel") return;
    void get().setShape("alert");
    set({ alert: arrived });
    if (alertTimer !== undefined) window.clearTimeout(alertTimer);
    alertTimer = window.setTimeout(() => get().dismissAlert(), ALERT_MS);
  },

  init: async () => {
    await get().refresh();
    set({ shape: get().state.ui.collapsed ? "island" : "panel" });

    const unlistenState = await listen<string | null>("workhub://state", (e) => {
      void get().refresh(e.payload);
    });
    const unlistenError = await listen<string>("workhub://server-error", (e) =>
      set({ serverError: e.payload }),
    );

    // The webview does not reliably honour prefers-color-scheme, so the theme
    // is taken from the platform and stamped onto <html>.
    const applyTheme = (name: string) =>
      document.documentElement.setAttribute("data-theme", name === "dark" ? "dark" : "light");
    api.currentTheme().then(applyTheme).catch(() => {});
    const unlistenTheme = await listen<string>("workhub://theme", (e) => applyTheme(e.payload));
    api.serverInfo().then((server) => set({ server })).catch(() => {});

    // Recompute staleness across midnight without a reload.
    const timer = window.setInterval(() => void get().refresh(), 60_000);

    return () => {
      unlistenState();
      unlistenError();
      unlistenTheme();
      window.clearInterval(timer);
      if (alertTimer !== undefined) window.clearTimeout(alertTimer);
      if (shrinkTimer !== undefined) window.clearTimeout(shrinkTimer);
    };
  },

  setShape: async (shape) => {
    if (shape === "panel") openedByUser = true;
    if (shape === "island") openedByUser = false;
    // Re-opening mid-collapse must cancel the pending shrink, or the window
    // snaps back to island size while a larger shape is on screen.
    if (shrinkTimer !== undefined) {
      window.clearTimeout(shrinkTimer);
      shrinkTimer = undefined;
    }
    if (shape !== "alert" && alertTimer !== undefined) {
      window.clearTimeout(alertTimer);
      alertTimer = undefined;
      set({ alert: null });
    }

    const prev = get().shape;
    if (shape === prev) return;

    // Growing: resize first so the CSS morph has room. Shrinking: let the morph
    // finish, then pull the window in around it.
    const order = { island: 0, alert: 1, panel: 2 } as const;
    if (order[shape] >= order[prev]) {
      await api.setShape(shape);
      set({ shape });
      return;
    }
    set({ shape });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    shrinkTimer = window.setTimeout(() => {
      shrinkTimer = undefined;
      if (useHub.getState().shape === shape) void api.setShape(shape);
    }, reduced ? 0 : MORPH_OUT_MS);
  },

  togglePanel: async () => {
    const next = get().shape === "panel" ? "island" : "panel";
    openedByUser = next === "panel";
    await get().setShape(next);
  },

  dismissAlert: () => {
    if (alertTimer !== undefined) {
      window.clearTimeout(alertTimer);
      alertTimer = undefined;
    }
    set({ alert: null });
    // Unconditional: if the user did not open the panel, the dwell ends at the
    // island, whatever shape the store currently believes it is in.
    if (!openedByUser) {
      set({ shape: "island" });
      void api.setShape("island");
    }
  },

  fitPanel: (height) => {
    const h = Math.round(Math.min(Math.max(height, PANEL_MIN_H), PANEL_MAX_H));
    if (Math.abs(h - get().panelHeight) < 2) return;
    set({ panelHeight: h });
    if (get().shape !== "panel") return;
    window.setTimeout(() => {
      if (useHub.getState().shape === "panel") void api.setPanelHeight(h);
    }, MORPH_MS);
  },
}));

export const actions = {
  /** Suppress an Ask handled outside Workhub. Rarely needed: the queue clears
   *  itself when an agent reports progress. */
  dismiss: (eventId: string) => api.dismiss(eventId),
  /** Jump into the tool that raised the Ask. */
  open: (sourceApp: string, url?: string | null) => api.openTarget(sourceApp, url),
};
