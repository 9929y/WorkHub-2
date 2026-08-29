/** The arrival: one Ask, announced for six seconds, then gone.
 *
 *  It must answer three things or it is noise: WHO is asking, for WHICH
 *  project, and WHAT they need. An earlier version showed only the first and a
 *  generic "Needs a decision", which said nothing you could act on. */

import { actions, useHub } from "../lib/store";
import { PlatformIcon } from "./PlatformIcon";
import { StatusDot } from "./StatusDot";

export function Arrival() {
  const { alert, summary, dismissAlert, setShape } = useHub();
  if (!alert) return null;

  return (
    <div className="arrival">
      <span className="arrival-logo">
        <PlatformIcon sourceApp={alert.task.sourceApp} size={18} />
      </span>

      <button
        className="arrival-body"
        onClick={() => {
          dismissAlert();
          void actions.open(alert.task.sourceApp, alert.event?.url);
        }}
        title={`${alert.reason} · ${alert.project.name}\n\n${alert.detail}\n\nClick to open ${alert.task.sourceApp}.`}
      >
        <span className="arrival-top">
          <StatusDot status={alert.task.status} size={9} />
          <span className="arrival-app">{alert.task.sourceApp}</span>
          <span className="arrival-sep">·</span>
          <span className="arrival-project truncate">{alert.project.name}</span>
        </span>
        {/* The actual content. Two lines, because one is rarely enough. */}
        <span className="arrival-detail">{alert.detail}</span>
      </button>

      {summary.asks > 1 ? (
        <button
          className="arrival-more tnum"
          onClick={() => void setShape("panel")}
          aria-label={`${summary.asks} in the queue. Open it.`}
          title="Open the queue"
        >
          {summary.asks}
        </button>
      ) : null}
    </div>
  );
}
