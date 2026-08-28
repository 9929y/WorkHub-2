/** Expanded status panel — 420x620. Grouped by project, most urgent first. */

import { actions, useHub } from "../lib/store";
import * as api from "../lib/api";
import { Check, ChevronUp, Grip, Inbox } from "./Icons";
import { ProjectCard } from "./ProjectCard";

export function Panel() {
  const { rollups, summary, server, serverError, toggleExpanded } = useHub();

  return (
    <div className="shell panel">
      <header className="panel-head">
        <div
          className="grip"
          data-tauri-drag-region
          onMouseUp={() => void api.savePosition()}
          title="Drag to move"
        >
          <Grip size={12} />
        </div>
        <span className="wordmark">Workhub</span>
        <span className="panel-stat tnum">
          {summary.activeProjects} active · {summary.running} running
          {summary.blocked > 0 ? ` · ${summary.blocked} blocked` : ""}
        </span>
        <div className="spacer" />
        {summary.unread > 0 ? (
          <button className="btn" onClick={() => void actions.markAllRead()} title="Mark everything read">
            <Check size={12} /> <span className="tnum">{summary.unread}</span>
          </button>
        ) : null}
        <button
          className="btn icon quiet"
          onClick={() => void toggleExpanded()}
          aria-label="Collapse to widget"
          title="Collapse to widget"
        >
          <ChevronUp size={14} />
        </button>
      </header>

      {serverError ? <div className="banner banner-error">{serverError}</div> : null}

      <div className="scroll panel-scroll">
        {rollups.length === 0 ? (
          <div className="empty-state">
            <Inbox size={20} />
            <p className="empty-title">No projects yet</p>
            <p className="empty-body">
              POST an event to <code>localhost:{server?.port ?? 8787}/events</code> and it will appear
              here.
            </p>
          </div>
        ) : (
          rollups.map((r) => <ProjectCard key={r.project.id} rollup={r} />)
        )}
      </div>

      <footer className="panel-foot">
        <span className={`bus ${serverError ? "bus-down" : "bus-up"}`} aria-hidden />
        <span className="foot-text tnum">
          {serverError ? "bus offline" : `:${server?.port ?? 8787}`}
        </span>
        <div className="spacer" />
        <button className="btn quiet" onClick={() => void api.resetPosition()} title="Move back to the top-right corner">
          Reset position
        </button>
        <span className="foot-text tnum">v{server?.version ?? "0.1.0"}</span>
      </footer>
    </div>
  );
}
