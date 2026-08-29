/** The queue: everything waiting on Yanice, and nothing else.
 *
 *  Grouped by project only where a group actually has more than one Ask;
 *  a heading above a single row is a level of hierarchy that earns nothing. */

import { Fragment } from "react";
import { actions, useHub } from "../lib/store";
import { ago } from "../lib/rollup";
import type { Ask } from "../lib/rollup";
import { Close } from "./Icons";
import { PlatformIcon } from "./PlatformIcon";
import { StatusDot } from "./StatusDot";

export function Queue({ asks }: { asks: Ask[] }) {
  const showProject = new Set(asks.map((a) => a.project.id)).size > 1;
  const firstStale = asks.findIndex((a) => a.stale);

  return (
    <ul className="queue">
      {asks.map((a, i) => (
        <Fragment key={a.id}>
          {/* Sediment is expressed by POSITION, not by fading. Dimming these
              rows was measured at 2.3:1 in light mode: unreadable. The divider
              and the age column carry it instead, at no contrast cost. */}
          {i === firstStale ? (
            <li className="queue-divider" aria-hidden>
              <span>Earlier</span>
            </li>
          ) : null}
          <li className="ask">
          <button
            className="ask-main"
            onClick={() => void actions.open(a.task.sourceApp, a.event?.url)}
            title={`${a.task.name}\n${a.reason}. Click to open ${a.task.sourceApp}.${
              a.event?.summary ? `\n\n${a.event.summary}` : ""
            }`}
          >
            <StatusDot status={a.task.status} size={10} />
            <span className={`ask-mark mark-${a.task.status}`}>
              <PlatformIcon sourceApp={a.task.sourceApp} size={15} />
            </span>
            <span className="ask-text">
              <span className="ask-app">{a.task.sourceApp}</span>
              <span className="ask-reason">{a.reason}</span>
              {showProject ? <span className="ask-project truncate">{a.project.name}</span> : null}
            </span>
          </button>
          <span className="ask-age tnum">{ago(a.task.updatedAt)}</span>
          {a.event ? (
            <button
              className="btn icon quiet"
              onClick={() => void actions.dismiss(a.event!.id)}
              aria-label={`Dismiss ${a.task.name}`}
              title="Dismiss"
            >
              <Close size={11} />
            </button>
          ) : null}
          </li>
        </Fragment>
      ))}
    </ul>
  );
}

/** Shown only when the queue is empty: now you are browsing, not acting, so
 *  levels (who is working, how far along) finally earn their place. */
export function Board() {
  const { rollups } = useHub();
  const live = rollups.filter((r) => !r.isComplete);
  const done = rollups.filter((r) => r.isComplete);

  if (rollups.length === 0) {
    return (
      <p className="empty">
        Nothing reporting yet. POST to <code>localhost:8787/events</code>.
      </p>
    );
  }

  return (
    <div className="board">
      {live.map((r) => {
        const pct = r.progress.total ? Math.round((r.progress.done / r.progress.total) * 100) : 0;
        return (
          <div key={r.project.id} className="board-row">
            <span className="board-name truncate" title={r.project.name}>
              {r.project.name}
            </span>
            <span className="board-marks">
              {r.platforms.map((p) => (
                <button
                  key={p.sourceApp}
                  className={`board-mark mark-${p.status}`}
                  onClick={() => void actions.open(p.sourceApp, p.latest?.url)}
                  title={`Open ${p.sourceApp} (${p.status})`}
                >
                  <PlatformIcon sourceApp={p.sourceApp} size={14} />
                </button>
              ))}
            </span>
            <span className="progress" role="img" aria-label={`${r.progress.done} of ${r.progress.total} done`}>
              <span className="progress-fill" style={{ width: `${pct}%` }} />
            </span>
          </div>
        );
      })}
      {done.length > 0 ? (
        <p className="board-done tnum">
          {done.length} finished
        </p>
      ) : null}
    </div>
  );
}
