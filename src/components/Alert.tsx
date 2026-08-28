/** A sticky alert. Never auto-expires: only Dismiss removes it.
 *
 *  Unread alerts show in full because they need a decision. Once read, an alert
 *  collapses to a single line but stays until dismissed, which keeps the
 *  "sticky until dismissed" contract without the panel filling up. */

import { actions } from "../lib/store";
import { ago, isUnread } from "../lib/rollup";
import type { Event } from "../lib/types";
import { Close, Link } from "./Icons";
import { StatusDot } from "./StatusDot";

export function Alert({ event }: { event: Event }) {
  const unread = isUnread(event);

  if (!unread) {
    return (
      <div className="alert alert-read">
        <StatusDot status={event.status} size={9} />
        <span className="alert-name truncate">{event.taskName}</span>
        <span className="alert-time tnum">{ago(event.timestamp)}</span>
        <button
          className="btn icon quiet"
          onClick={() => void actions.dismiss(event.id)}
          aria-label={`Dismiss ${event.taskName}`}
          title="Dismiss"
        >
          <Close size={11} />
        </button>
      </div>
    );
  }

  return (
    <div className="alert alert-unread">
      <p className="alert-top">
        <StatusDot status={event.status} size={9} />
        <span className="alert-name truncate">{event.taskName}</span>
        <span className="alert-app">{event.sourceApp}</span>
        <span className="alert-time tnum">{ago(event.timestamp)}</span>
      </p>
      {event.summary ? <p className="alert-summary">{event.summary}</p> : null}
      <p className="alert-actions">
        <button className="link" onClick={() => void actions.setRead(event.id, true)}>
          Mark read
        </button>
        {event.url ? (
          <a className="link" href={event.url} target="_blank" rel="noreferrer">
            <Link size={11} /> Open
          </a>
        ) : null}
        <button className="link" onClick={() => void actions.dismiss(event.id)}>
          Dismiss
        </button>
      </p>
    </div>
  );
}
