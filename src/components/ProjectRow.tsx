/** One category: its name, how far along it is, which platforms are on it, and
 *  only the items that need you.
 *
 *  A project with nothing blocked or waiting shows no prose whatsoever: just a
 *  name, a progress bar and a row of marks. */

import { actions } from "../lib/store";
import { ago } from "../lib/rollup";
import type { ProjectRollup } from "../lib/rollup";
import { Close } from "./Icons";
import { PlatformIcon } from "./PlatformIcon";
import { StatusDot } from "./StatusDot";

export function ProjectRow({ rollup }: { rollup: ProjectRollup }) {
  const { project, platforms, needsYou, progress } = rollup;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className="project">
      <h2 className="project-head">
        <span className="project-name truncate">{project.name}</span>
        <span
          className="progress"
          role="img"
          aria-label={`${progress.done} of ${progress.total} platforms finished`}
          title={`${progress.done}/${progress.total} finished`}
        >
          <span className="progress-fill" style={{ width: `${pct}%` }} />
        </span>
        <span className="progress-num tnum">
          {progress.done}/{progress.total}
        </span>
      </h2>

      {/* Click a mark to land in that tool. */}
      <div className="platforms">
        {platforms.map((p) => (
          <button
            key={p.sourceApp}
            className={`platform mark-${p.status}`}
            onClick={() => void actions.open(p.sourceApp, p.latest?.url)}
            aria-label={`Open ${p.sourceApp} (${p.status})`}
            title={`Open ${p.sourceApp} — ${p.status}`}
          >
            <PlatformIcon sourceApp={p.sourceApp} size={17} />
          </button>
        ))}
      </div>

      {needsYou.map((n) => (
        <div key={n.task.id} className="need">
          <StatusDot status={n.task.status} size={9} />
          <button
            className="need-main"
            onClick={() => void actions.open(n.task.sourceApp, n.event?.url)}
            title={n.event?.summary || n.task.name}
          >
            <span className="need-task truncate">{n.task.name}</span>
            <span className="need-reason">{n.reason}</span>
          </button>
          <span className="need-time tnum">{ago(n.task.updatedAt)}</span>
          {n.event ? (
            <button
              className="btn icon quiet"
              onClick={() => void actions.dismiss(n.event!.id)}
              aria-label={`Dismiss ${n.task.name}`}
              title="Dismiss"
            >
              <Close size={11} />
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}
