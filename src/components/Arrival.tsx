/** The alert: one Ask, announced for six seconds, then gone.
 *
 *  Ignoring it costs nothing. The Ask is already in the queue before this is
 *  shown, so this is an announcement, not a decision point. */

import { actions, useHub } from "../lib/store";
import { PlatformIcon } from "./PlatformIcon";
import { StatusDot } from "./StatusDot";

export function Arrival() {
  const { alert, dismissAlert, setShape } = useHub();
  if (!alert) return null;

  return (
    <div className="arrival">
      <span className={`arrival-mark mark-${alert.task.status}`}>
        <PlatformIcon sourceApp={alert.task.sourceApp} size={20} />
      </span>

      <button
        className="arrival-body"
        onClick={() => {
          dismissAlert();
          void actions.open(alert.task.sourceApp, alert.event?.url);
        }}
        title={alert.event?.summary || alert.task.name}
      >
        <span className="arrival-top">
          <span className="arrival-app">{alert.task.sourceApp}</span>
          <StatusDot status={alert.task.status} size={9} />
          <span className="arrival-reason">{alert.reason}</span>
        </span>
        <span className="arrival-task truncate">{alert.task.name}</span>
      </button>

      <button
        className="arrival-more"
        onClick={() => void setShape("panel")}
        aria-label="Open the queue"
        title="Open the queue"
      >
        {useHub.getState().summary.asks}
      </button>
    </div>
  );
}
