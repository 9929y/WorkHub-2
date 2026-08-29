/** One category: how far along it is, which platforms are on it, and only the
 *  items that need you.
 *
 *  Platform marks carry their name here. In the island a bare mark is right,
 *  because you are glancing; in the panel an unlabelled glyph is just a riddle. */

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
        <span className="project-name truncate" title={project.name}>
          {project.name}
        </span>
        <span
          className="progress"
          role="img"
          aria-label={`${progress.done} of ${progress.total} platforms finished`}
        >
          <span className="progress-fill" style={{ width: `${pct}%` }} />
        </span>
        {/* "1/3" alone reads as a riddle; say what it counts. */}
        <span className="progress-num">
          <span className="tnum">
            {progress.done}/{progress.total}
          </span>{" "}
          done
        </span>
      </h2>

      <div className="platforms">
        {platforms.map((p) => (
          <button
            key={p.sourceApp}
            className={`platform mark-${p.status}`}
            onClick={() => void actions.open(p.sourceApp, p.latest?.url)}
            title={`Open ${p.sourceApp} (${p.status})`}
          >
            <PlatformIcon sourceApp={p.sourceApp} size={14} />
            <span className="platform-name">{p.sourceApp}</span>
          </button>
        ))}
      </div>

      {needsYou.map((n) => (
        <div key={n.task.id} className="need">
          <StatusDot status={n.task.status} size={9} />
          <button
            className="need-main"
            onClick={() => void actions.open(n.task.sourceApp, n.event?.url)}
            title={`${n.task.name}\n${n.reason}. Click to open ${n.task.sourceApp}.${n.event?.summary ? `\n\n${n.event.summary}` : ""}`}
          >
            {/* Which platform is asking is the first thing you need to know. */}
            <PlatformIcon sourceApp={n.task.sourceApp} size={13} />
            <span className="need-app">{n.task.sourceApp}</span>
            <span className="need-task truncate">{n.task.name}</span>
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
