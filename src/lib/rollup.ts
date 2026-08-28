/** Every derived number in the UI is computed here, once.
 *
 *  - unread = not read AND not dismissed
 *  - sticky = not dismissed AND (blocked OR done OR high priority).
 *    Sticky alerts NEVER auto-expire; only an explicit dismiss removes one.
 *    Read-but-undismissed alerts stay in the list, rendered compactly, so the
 *    "sticky until dismissed" contract holds without the noise.
 *  - project status = worst status among its tasks (blocked > waiting > running > done) */

import { type Event, type HubState, type Project, type Status, type Task, STATUS_SEVERITY } from "./types";

export interface ProjectRollup {
  project: Project;
  status: Status;
  latest: Event | null;
  unread: number;
  stickyAlerts: Event[];
  /** One entry per sourceApp involved, showing that app's current status. */
  badges: { sourceApp: string; status: Status }[];
}

export const isUnread = (e: Event) => !e.read && !e.dismissed;

export const isSticky = (e: Event) =>
  !e.dismissed && (e.status === "blocked" || e.status === "done" || e.priority === "high");

const byNewest = (a: { timestamp: string }, b: { timestamp: string }) =>
  b.timestamp.localeCompare(a.timestamp);

/** Worst status wins, so a single blocked track surfaces at project level. */
function worstStatus(tasks: Task[]): Status {
  let worst: Status = "done";
  for (const t of tasks) if (STATUS_SEVERITY[t.status] > STATUS_SEVERITY[worst]) worst = t.status;
  return worst;
}

export function rollupProjects(state: HubState): ProjectRollup[] {
  const rollups = state.projects.map((project) => {
    const tasks = state.tasks.filter((t) => t.projectId === project.id);
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
      latest: events[0] ?? null,
      unread: events.filter(isUnread).length,
      // Unread first: what needs a decision sits above what is merely on record.
      stickyAlerts: events
        .filter(isSticky)
        .sort((a, b) => Number(isUnread(b)) - Number(isUnread(a))),
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
  activeProjects: number;
  running: number;
  blocked: number;
  /** Most recently completed task, for the widget's second line. */
  lastDone: Event | null;
}

export function summarise(state: HubState, rollups: ProjectRollup[]): HudSummary {
  return {
    unread: state.events.filter(isUnread).length,
    activeProjects: rollups.filter((r) => r.status !== "done").length,
    running: state.tasks.filter((t) => t.status === "running").length,
    blocked: state.tasks.filter((t) => t.status === "blocked").length,
    lastDone: state.events.filter((e) => e.status === "done").sort(byNewest)[0] ?? null,
  };
}

/** Compact relative time: the HUD never has room for a full timestamp. */
export function ago(iso: string, now: number = Date.now()): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 45) return "now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
