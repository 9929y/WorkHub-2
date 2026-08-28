/** One project: status, name, the tools working on it, and its latest line.
 *  Alerts that still need a decision hang directly underneath.
 *
 *  Replaces the old ProjectCard: no card, no collapse toggle, no timeline,
 *  no notes. Separation is spacing and a single hairline, not a container. */

import { ago } from "../lib/rollup";
import type { ProjectRollup } from "../lib/rollup";
import { Alert } from "./Alert";
import { SourceBadge } from "./SourceBadge";
import { StatusDot } from "./StatusDot";

export function ProjectRow({ rollup }: { rollup: ProjectRollup }) {
  const { project, status, latest, unread, stickyAlerts, badges } = rollup;

  return (
    <section className="project">
      <h2 className="project-head">
        <StatusDot status={status} size={11} />
        <span className="project-name truncate">{project.name}</span>
        {unread > 0 ? <span className="unread-pill tnum">{unread}</span> : null}
      </h2>

      <div className="project-badges">
        {badges.map((b) => (
          <SourceBadge key={b.sourceApp} sourceApp={b.sourceApp} status={b.status} />
        ))}
      </div>

      {latest ? (
        <p className="project-latest">
          <span className="truncate">{latest.summary || latest.taskName}</span>
          <span className="latest-time tnum">{ago(latest.timestamp)}</span>
        </p>
      ) : null}

      {stickyAlerts.map((a) => (
        <Alert key={a.id} event={a} />
      ))}
    </section>
  );
}
