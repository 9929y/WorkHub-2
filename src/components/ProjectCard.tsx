/** One project: rollup status, per-app badges, latest status, timeline, sticky
 *  alerts and notes. Collapsible so a long list stays scannable. */

import { useState } from "react";
import { actions } from "../lib/store";
import { ago } from "../lib/rollup";
import type { ProjectRollup } from "../lib/rollup";
import { STATUS_LABEL } from "../lib/types";
import { ChevronDown, ChevronUp, Check } from "./Icons";
import { Notes } from "./Notes";
import { SourceBadge } from "./SourceBadge";
import { StatusDot } from "./StatusDot";
import { StickyAlerts } from "./StickyAlerts";
import { Timeline } from "./Timeline";

export function ProjectCard({ rollup }: { rollup: ProjectRollup }) {
  const [open, setOpen] = useState(true);
  const { project, status, latest, unread, stickyAlerts, notes, badges, timeline } = rollup;

  return (
    <article className="project card">
      <header className="project-head">
        <button
          className="project-title-btn"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <StatusDot status={status} size={8} />
          <h2 className="project-name truncate">{project.name}</h2>
          {unread > 0 ? <span className="project-unread tnum">{unread}</span> : null}
          <div className="spacer" />
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </header>

      <div className="project-badges">
        {badges.map((b) => (
          <SourceBadge key={b.sourceApp} sourceApp={b.sourceApp} status={b.status} />
        ))}
      </div>

      {latest ? (
        <p className="project-latest">
          <span className={`latest-status status-${latest.status}`}>{STATUS_LABEL[latest.status]}</span>
          <span className="latest-sep">·</span>
          <span className="truncate">{latest.summary || latest.taskName}</span>
          <span className="latest-time tnum">{ago(latest.timestamp)}</span>
        </p>
      ) : null}

      {open ? (
        <div className="project-body">
          {stickyAlerts.length > 0 ? (
            <section>
              <header className="section-head">
                <span className="label">Sticky alerts</span>
                <span className="section-count tnum">{stickyAlerts.length}</span>
                <div className="spacer" />
                {unread > 0 ? (
                  <button
                    className="btn quiet"
                    onClick={() => void actions.markAllRead(project.id)}
                    title="Mark this project's events read"
                  >
                    <Check size={12} /> Mark all read
                  </button>
                ) : null}
              </header>
              <StickyAlerts alerts={stickyAlerts} />
            </section>
          ) : null}

          <section>
            <header className="section-head">
              <span className="label">Timeline</span>
            </header>
            <Timeline events={timeline} />
          </section>

          <Notes projectId={project.id} notes={notes} />
        </div>
      ) : null}
    </article>
  );
}
