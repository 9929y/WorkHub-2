/** Sticky notifications. These never auto-dismiss — the only way one leaves the
 *  list is the user pressing Dismiss. */

import { actions } from "../lib/store";
import { ago, isUnread } from "../lib/rollup";
import type { Event } from "../lib/types";
import { Check, Close, Link } from "./Icons";
import { StatusChip } from "./StatusDot";

export function StickyAlerts({ alerts }: { alerts: Event[] }) {
  if (alerts.length === 0) return null;

  return (
    <ul className="alerts">
      {alerts.map((a) => (
        <li key={a.id} className={`alert${isUnread(a) ? " alert-unread" : ""}`}>
          <div className="alert-top">
            <StatusChip status={a.status} />
            <span className="alert-app">{a.sourceApp}</span>
            {a.priority === "high" ? <span className="chip chip-high">High</span> : null}
            <div className="spacer" />
            <span className="alert-time tnum">{ago(a.timestamp)}</span>
          </div>

          <p className="alert-task">{a.taskName}</p>
          {a.summary ? <p className="alert-summary">{a.summary}</p> : null}

          <div className="alert-actions">
            {isUnread(a) ? (
              <button className="btn" onClick={() => void actions.setRead(a.id, true)}>
                <Check size={12} /> Mark read
              </button>
            ) : (
              <span className="alert-read-flag">Read</span>
            )}
            {a.url ? (
              <a className="btn" href={a.url} target="_blank" rel="noreferrer">
                <Link size={12} /> Open
              </a>
            ) : null}
            <div className="spacer" />
            <button
              className="btn danger"
              onClick={() => void actions.dismiss(a.id)}
              title="Dismiss: removes this alert permanently"
            >
              <Close size={12} /> Dismiss
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
