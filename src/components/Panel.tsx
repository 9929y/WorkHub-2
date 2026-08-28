/** Expanded panel, 360x470. A flat list of projects and the alerts that still
 *  need a decision. No cards, no wells, no per-section labels, no footer:
 *  every one of those was chrome around three lines of actual information. */

import { actions, useHub } from "../lib/store";
import * as api from "../lib/api";
import { Check, ChevronUp, Grip } from "./Icons";
import { ProjectRow } from "./ProjectRow";

export function Panel() {
  const { rollups, summary, serverError, toggleExpanded } = useHub();

  return (
    <div className="shell panel">
      <header className="panel-head">
        <div
          className="grip"
          data-tauri-drag-region
          onMouseUp={() => void api.savePosition()}
          title="Drag to move"
        >
          <Grip size={11} />
        </div>
        <span className="panel-stat tnum">
          {summary.activeProjects} active
          {summary.blocked > 0 ? ` · ${summary.blocked} blocked` : ""}
        </span>
        <div className="spacer" />
        {summary.unread > 0 ? (
          <button className="btn quiet" onClick={() => void actions.markAllRead()}>
            <Check size={12} />
            <span className="tnum">{summary.unread}</span>
          </button>
        ) : null}
        <button className="btn icon quiet" onClick={() => void toggleExpanded()} aria-label="Collapse">
          <ChevronUp size={13} />
        </button>
      </header>

      {serverError ? <p className="banner">{serverError}</p> : null}

      <div className="scroll panel-scroll">
        {rollups.length === 0 ? (
          <p className="empty">
            No projects yet. POST an event to <code>localhost:8787/events</code> and it appears here.
          </p>
        ) : (
          rollups.map((r) => <ProjectRow key={r.project.id} rollup={r} />)
        )}
      </div>
    </div>
  );
}
