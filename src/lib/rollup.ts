/** Every derived value in the UI is computed here, once.
 *
 *  The product is built around one object: an **Ask** — the moment an agent
 *  needs Yanice. Everything else is a level, and levels do not change what you
 *  do in the next ten seconds:
 *
 *    running  the machine has the ball  -> a mark, never a line
 *    done     nobody has the ball       -> fills the board, never a line
 *    blocked  YOU have the ball         -> an Ask: needs a decision
 *    waiting  YOU have the ball         -> an Ask: needs review
 */

import { type Event, type HubState, type Project, type Status, type Task, STATUS_SEVERITY } from "./types";

export interface Platform {
  sourceApp: string;
  status: Status;
  latest: Event | null;
}

export interface Ask {
  id: string;
  task: Task;
  event: Event | null;
  project: Project;
  /** Two words. "Needs a decision" or "Needs review". */
  reason: string;
  /** Raised before today: it has survived a night without being dealt with. */
  stale: boolean;
}

export interface ProjectRollup {
  project: Project;
  status: Status;
  platforms: Platform[];
  progress: { done: number; total: number };
  isComplete: boolean;
}

export const needsAttention = (s: Status) => s === "blocked" || s === "waiting";

const byNewest = (a: { timestamp: string }, b: { timestamp: string }) =>
  b.timestamp.localeCompare(a.timestamp);

const REASON: Record<string, string> = {
  blocked: "Needs a decision",
  waiting: "Needs review",
};

/** Local midnight. An Ask older than this has sat overnight and goes grey. */
function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** The queue. Derived from live status, so it clears itself the moment an agent
 *  reports progress: most Asks never need to be dismissed by hand. */
export function collectAsks(state: HubState, now = Date.now()): Ask[] {
  const midnight = startOfToday(now);
  const projects = new Map(state.projects.map((p) => [p.id, p]));
  const events = [...state.events].sort(byNewest);

  return state.tasks
    .filter((t) => needsAttention(t.status))
    .map((t) => {
      const project = projects.get(t.projectId);
      if (!project) return null;
      const event = events.find((e) => e.taskId === t.id) ?? null;
      if (event?.dismissed) return null;
      return {
        id: t.id,
        task: t,
        event,
        project,
        reason: REASON[t.status] ?? "",
        stale: new Date(t.updatedAt).getTime() < midnight,
      };
    })
    .filter((a): a is Ask => a !== null)
    .sort(
      (a, b) =>
        // Fresh above stale, then most urgent, then most recent.
        Number(a.stale) - Number(b.stale) ||
        STATUS_SEVERITY[b.task.status] - STATUS_SEVERITY[a.task.status] ||
        b.task.updatedAt.localeCompare(a.task.updatedAt),
    );
}

/** The status board, shown only when the queue is empty. */
export function rollupProjects(state: HubState): ProjectRollup[] {
  const rollups = state.projects.map((project) => {
    const tasks = state.tasks.filter((t) => t.projectId === project.id);
    const events = state.events.filter((e) => e.projectId === project.id).sort(byNewest);

    const platforms: Platform[] = [];
    for (const t of [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
      if (platforms.some((p) => p.sourceApp === t.sourceApp)) continue;
      platforms.push({
        sourceApp: t.sourceApp,
        status: t.status,
        latest: events.find((e) => e.sourceApp === t.sourceApp) ?? null,
      });
    }

    let worst: Status = "done";
    for (const t of tasks) if (STATUS_SEVERITY[t.status] > STATUS_SEVERITY[worst]) worst = t.status;
    const done = tasks.filter((t) => t.status === "done").length;

    return {
      project,
      status: worst,
      platforms,
      progress: { done, total: tasks.length },
      isComplete: tasks.length > 0 && done === tasks.length,
    };
  });

  return rollups.sort(
    (a, b) =>
      STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status] ||
      b.project.updatedAt.localeCompare(a.project.updatedAt),
  );
}

export interface HudSummary {
  /** The only number the island ever shows. */
  asks: number;
  fresh: number;
  /** Distinct platforms on live work, for the island's marks. */
  platforms: Platform[];
}

export function summarise(rollups: ProjectRollup[], asks: Ask[]): HudSummary {
  const platforms: Platform[] = [];
  for (const r of rollups) {
    if (r.isComplete) continue;
    for (const p of r.platforms) {
      const seen = platforms.find((x) => x.sourceApp === p.sourceApp);
      if (!seen) platforms.push(p);
      else if (STATUS_SEVERITY[p.status] > STATUS_SEVERITY[seen.status]) seen.status = p.status;
    }
  }
  return { asks: asks.length, fresh: asks.filter((a) => !a.stale).length, platforms };
}

/** Compact relative time. The HUD never has room for a real timestamp. */
export function ago(iso: string, now: number = Date.now()): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 45) return "now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
