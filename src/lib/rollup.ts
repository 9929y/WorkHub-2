/** Every derived number in the UI is computed here, once.
 *
 *  The rules that matter:
 *  - unread  = not read AND not dismissed
 *  - sticky  = not dismissed AND (blocked OR done OR high priority).
 *              Sticky alerts NEVER auto-expire; only an explicit dismiss hides one.
 *  - project status = worst status among its tasks (blocked > waiting > running > done) */

import {
  type Event,
  type HubState,
  type Note,
  type Project,
  type Status,
  type Task,
  STATUS_SEVERITY,
} from "./types";

export interface ProjectRollup {
  project: Project;
  status: Status;
  tasks: Task[];
  /** Newest-first, capped for display. */
  timeline: Event[];
  latest: Event | null;
  unread: number;
  stickyAlerts: Event[];
  notes: Note[];
  /** One entry per sourceApp involved, showing that app's current status. */
  badges: { sourceApp: string; status: Status }[];
}

const TIMELINE_LIMIT = 6;

export const isUnread = (e: Event) => !e.read && !e.dismissed;

export const isSticky = (e: Event) =>
  !e.dismissed && (e.status === "blocked" || e.status === "done" || e.priority === "high");

const byNewest = (a: { timestamp: string }, b: { timestamp: string }) =>
  b.timestamp.localeCompare(a.timestamp);

/** Worst status wins, so a single blocked track surfaces at project level. */
function worstStatus(tasks: Task[]): Status {
  let worst: Status = "done";
  for (const t of tasks) {
    if (STATUS_SEVERITY[t.status] > STATUS_SEVERITY[worst]) worst = t.status;
  }
  return worst;
}

export function rollupProjects(state: HubState): ProjectRollup[] {
  const rollups = state.projects.map((project) => {
    const tasks = state.tasks
      .filter((t) => t.projectId === project.id)
      .sort((a, b) => STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status]);

    const events = state.events.filter((e) => e.projectId === project.id).sort(byNewest);

    // One badge per source app, carrying that app's most recently updated status.
    const badges: { sourceApp: string; status: Status }[] = [];
    for (const t of [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
      if (!badges.some((b) => b.sourceApp === t.sourceApp)) {
        badges.push({ sourceApp: t.sourceApp, status: t.status });
      }
    }

    return {
      project,
      status: worstStatus(tasks),
      tasks,
      timeline: events.slice(0, TIMELINE_LIMIT),
      latest: events[0] ?? null,
      unread: events.filter(isUnread).length,
      stickyAlerts: events.filter(isSticky),
      notes: state.notes
        .filter((n) => n.projectId === project.id)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || byNewest(a, b)),
      badges,
    };
  });

  // Most urgent first; ties broken by recency so live work floats up.
  return rollups.sort(
    (a, b) =>
      STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status] ||
      b.project.updatedAt.localeCompare(a.project.updatedAt),
  );
}

export interface HudSummary {
  unread: number;
  /** Projects with at least one running or waiting track. */
  activeProjects: number;
  running: number;
  blocked: number;
  /** Most recently completed task, for the collapsed widget's headline. */
  lastDone: Event | null;
}

export function summarise(state: HubState, rollups: ProjectRollup[]): HudSummary {
  const lastDone =
    state.events
      .filter((e) => e.status === "done")
      .sort(byNewest)[0] ?? null;

  return {
    unread: state.events.filter(isUnread).length,
    activeProjects: rollups.filter((r) => r.tasks.some((t) => t.status === "running" || t.status === "waiting"))
      .length,
    running: state.tasks.filter((t) => t.status === "running").length,
    blocked: state.tasks.filter((t) => t.status === "blocked").length,
    lastDone,
  };
}

/** Compact relative time: the HUD never has room for a full timestamp. */
export function ago(iso: string, now: number = Date.now()): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
