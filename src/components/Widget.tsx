/** Collapsed HUD — 320x96. Three aligned zones, no wasted padding:
 *  header (identity + unread), headline (last completed task), metrics row. */

import { actions, useHub } from "../lib/store";
import { ago } from "../lib/rollup";
import * as api from "../lib/api";
import { ChevronDown, Grip, Inbox } from "./Icons";
import { StatusDot } from "./StatusDot";

export function Widget() {
  // Subscribing to the whole store means the minute `tick` also refreshes
  // the relative timestamp below without any extra wiring.
  const { summary, rollups, toggleExpanded, serverError } = useHub();
  const lastDone = summary.lastDone;
  const project = lastDone
    ? rollups.find((r) => r.project.id === lastDone.projectId)?.project.name
    : null;

  return (
    <div className="shell widget">
      <div className="widget-head">
        <div
          className="grip"
          data-tauri-drag-region
          onMouseUp={() => void api.savePosition()}
          title="Drag to move"
        >
          <Grip size={12} />
        </div>
        <span className="wordmark">Workhub</span>
        <div className="spacer" />
        {summary.unread > 0 ? (
          <button
            className="unread-pill"
            onClick={(e) => {
              e.stopPropagation();
              void actions.markAllRead();
            }}
            title={`${summary.unread} unread — click to mark all read`}
          >
            <Inbox size={11} />
            <span className="tnum">{summary.unread}</span>
          </button>
        ) : (
          <span className="all-clear">Clear</span>
        )}
        <button
          className="btn icon quiet"
          onClick={() => void toggleExpanded()}
          aria-label="Expand status panel"
          title="Expand status panel"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Whole body is a click target for expanding — the grip above is the
          only region that drags instead. */}
      <button className="widget-body" onClick={() => void toggleExpanded()} aria-label="Expand status panel">
        {serverError ? (
          <span className="headline blocked-text truncate">Event bus offline</span>
        ) : lastDone ? (
          <>
            <StatusDot status="done" />
            <span className="headline truncate">{lastDone.taskName}</span>
            <span className="headline-meta tnum">{ago(lastDone.timestamp)}</span>
          </>
        ) : (
          <span className="headline headline-empty">No completed tasks yet</span>
        )}
        {project && !serverError ? <span className="headline-sub truncate">{project}</span> : null}
      </button>

      <div className="widget-metrics">
        <Metric value={summary.activeProjects} label="active" />
        <span className="metric-sep" />
        <Metric value={summary.running} label="running" status="running" />
        <span className="metric-sep" />
        <Metric value={summary.blocked} label="blocked" status="blocked" />
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
  status,
}: {
  value: number;
  label: string;
  status?: "running" | "blocked";
}) {
  const muted = value === 0;
  return (
    <span className={`metric${muted ? " metric-muted" : ""}`}>
      {status && !muted ? <StatusDot status={status} size={6} /> : null}
      <span className="metric-value tnum">{value}</span>
      <span className="metric-label">{label}</span>
    </span>
  );
}
