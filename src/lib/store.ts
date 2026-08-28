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
  /** Bumped every minute so relative timestamps stay honest. */
  tick: number;

  refresh: () => Promise<void>;
  init: () => Promise<() => void>;
  setExpanded: (expanded: boolean) => Promise<void>;
  toggleExpanded: () => Promise<void>;
}

export const useHub = create<HubStore>((set, get) => ({
  state: EMPTY,
  rollups: [],
  summary: { unread: 0, activeProjects: 0, running: 0, blocked: 0, lastDone: null },
  server: null,
  serverError: null,
  expanded: false,
  loaded: false,
  tick: 0,

  refresh: async () => {
    const state = await api.getState();
    const rollups = rollupProjects(state);
    set({ state, rollups, summary: summarise(state, rollups), loaded: true });
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
    // Resize the native window first so the paint lands at the right size.
    await api.setPanelExpanded(expanded);
    set({ expanded });
  },

  toggleExpanded: async () => {
    await get().setExpanded(!get().expanded);
  },
}));

/** Mutations. Each awaits the backend, then leans on the broadcast to refresh. */
export const actions = {
  dismiss: (eventId: string) => api.dismiss(eventId),
  setRead: (eventId: string, read: boolean) => api.setRead(eventId, read),
  markAllRead: (projectId?: string) => api.markAllRead(projectId),
};
