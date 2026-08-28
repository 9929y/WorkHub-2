/** Progress timeline for one project: newest first, one row per event. */

import { ago } from "../lib/rollup";
import type { Event } from "../lib/types";
import { StatusDot } from "./StatusDot";

export function Timeline({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return <p className="empty-line">No activity reported yet.</p>;
  }

  return (
    <ol className="timeline">
      {events.map((e) => (
        <li key={e.id} className="tl-row">
          <span className="tl-rail">
            <StatusDot status={e.status} size={10} />
          </span>
          <span className="tl-main">
            <span className="tl-head">
              <span className="tl-task truncate">{e.taskName}</span>
              <span className="tl-app">{e.sourceApp}</span>
              <span className="tl-time tnum">{ago(e.timestamp)}</span>
            </span>
            {e.summary ? <span className="tl-summary">{e.summary}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
