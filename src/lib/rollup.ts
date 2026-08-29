/** Every derived value in the UI is computed here, once.
 *
 *  The product rule, stated once:
 *
 *    running  the machine has the ball  -> icon only, never text
 *    done     nobody has the ball       -> fills the progress bar, never text
 *    blocked  YOU have the ball         -> needs you: decision
 *    waiting  YOU have the ball         -> needs you: review / sign-off
 *
 *  Only the last two ever produce a line of prose. If every finished task
 *  demanded a click this would be a to-do list again. */

import { type Event, type HubState, type Project, type Status, type Task, STATUS_SEVERITY } from "./types";

/** A platform working on a project, and what it currently needs. */
export interface Platform {
  sourceApp: string;
  status: Status;
  /** Latest event from this platform, used for click-through and timing. */
  latest: Event | null;
}

export interface NeedsYou {
  task: Task;
  event: Event | null;
  /** Two words, not a sentence. */
  reason: string;
}

export interface ProjectRollup {
  project: Project;
  status: Status;
  platforms: Platform[];
  needsYou: NeedsYou[];
  /** Stage = how many of this project's tracks have finished. */
  progress: { done: number; total: number };
  /** Every track finished and nothing waiting: belongs in History, not the list. */
  isComplete: boolean;
}

export const needsAttention = (s: Status) => s === "blocked" || s === "waiting";
export const isUnread = (e: Event) => !e.read && !e.dismissed;

const byNewest = (a: { timestamp: string }, b: { timestamp: string }) =>
  b.timestamp.localeCompare(a.timestamp);

const REASON: Record<string, string> = {
  blocked: "Needs a decision",
  waiting: "Waiting on you",
};

export function rollupProjects(state: HubState): ProjectRollup[] {
  const rollups = state.projects.map((project) => {
    const tasks = state.tasks.filter((t) => t.projectId === project.id);
    const events = state.events.filter((e) => e.projectId === project.id).sort(byNewest);

    // One entry per platform, carrying its most recently updated track.
    const platforms: Platform[] = [];
    for (const t of [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
      if (platforms.some((p) => p.sourceApp === t.sourceApp)) continue;
      platforms.push({
        sourceApp: t.sourceApp,
        status: t.status,
        latest: events.find((e) => e.sourceApp === t.sourceApp) ?? null,
      });
    }

    // The review queue: derived from live status, so it clears itself the moment
    // an agent reports progress. A dismissed event suppresses its track, which
    // is the escape hatch for work handled outside Workhub.
    const needsYou = tasks
      .filter((t) => needsAttention(t.status))
      .map((t) => ({
        task: t,
        event: events.find((e) => e.taskId === t.id) ?? null,
        reason: REASON[t.status] ?? "",
      }))
      .filter((n) => !n.event?.dismissed)
      .sort(
        (a, b) =>
          STATUS_SEVERITY[b.task.status] - STATUS_SEVERITY[a.task.status] ||
          b.task.updatedAt.localeCompare(a.task.updatedAt),
      );

    let worst: Status = "done";
    for (const t of tasks) if (STATUS_SEVERITY[t.status] > STATUS_SEVERITY[worst]) worst = t.status;

    const done = tasks.filter((t) => t.status === "done").length;
    return {
      project,
      status: worst,
      platforms,
      needsYou,
      progress: { done, total: tasks.length },
      isComplete: tasks.length > 0 && done === tasks.length && needsYou.length === 0,
    };
  });

  // Whatever needs you most, first.
  return rollups.sort(
    (a, b) =>
      b.needsYou.length - a.needsYou.length ||
      STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status] ||
      b.project.updatedAt.localeCompare(a.project.updatedAt),
  );
}

export interface HudSummary {
  /** The only number the island shows. */
  needsYou: number;
  running: number;
  /** Distinct platforms currently working or waiting, for the island's marks. */
  platforms: Platform[];
  /** The single most urgent thing, shown when the island is clicked open. */
  top: { project: Project; item: NeedsYou } | null;
}

export function summarise(rollups: ProjectRollup[], state: HubState): HudSummary {
  // Only platforms still on live work. A finished category's tools have nothing
  // to say, and the island is the glance state: it should carry today's work.
  const platforms: Platform[] = [];
  for (const r of rollups) {
    if (r.isComplete) continue;
    for (const p of r.platforms) {
      const seen = platforms.find((x) => x.sourceApp === p.sourceApp);
      if (!seen) platforms.push(p);
      else if (STATUS_SEVERITY[p.status] > STATUS_SEVERITY[seen.status]) seen.status = p.status;
    }
  }
  const first = rollups.find((r) => r.needsYou.length > 0);
  return {
    needsYou: rollups.reduce((n, r) => n + r.needsYou.length, 0),
    running: state.tasks.filter((t) => t.status === "running").length,
    platforms,
    top: first ? { project: first.project, item: first.needsYou[0] } : null,
  };
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
