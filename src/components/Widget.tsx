/** Collapsed HUD, 300x64. Two lines and nothing else:
 *  line 1 — what needs attention right now, plus the unread count
 *  line 2 — what most recently finished
 *  The wordmark and the separate metrics row are gone; neither answered a question. */

import { actions, useHub } from "../lib/store";
import { ago } from "../lib/rollup";
import * as api from "../lib/api";
import { ChevronDown, Grip } from "./Icons";
import { StatusDot } from "./StatusDot";

export function Widget() {
  const { summary, toggleExpanded, serverError } = useHub();
  const { blocked, running, unread, lastDone } = summary;

  return (
    <div className="shell widget">
      <div className="widget-line">
        <div
          className="grip"
          data-tauri-drag-region
          onMouseUp={() => void api.savePosition()}
          title="Drag to move"
        >
          <Grip size={11} />
        </div>

        <button className="widget-counts" onClick={() => void toggleExpanded()} aria-label="Expand panel">
          {serverError ? (
            <span className="count count-alert">Event bus offline</span>
          ) : blocked === 0 && running === 0 ? (
            <span className="count count-idle">Nothing running</span>
          ) : (
            <>
              {blocked > 0 ? (
                <span className="count">
                  <StatusDot status="blocked" size={9} />
                  <span className="tnum">{blocked}</span> blocked
                </span>
              ) : null}
              {running > 0 ? (
                <span className="count">
                  <StatusDot status="running" size={9} />
                  <span className="tnum">{running}</span> running
                </span>
              ) : null}
            </>
          )}
        </button>

        {unread > 0 ? (
          <button
            className="unread-pill tnum"
            onClick={() => void actions.markAllRead()}
            title={`${unread} unread. Click to mark all read.`}
          >
            {unread}
          </button>
        ) : null}

        <button
          className="btn icon quiet"
          onClick={() => void toggleExpanded()}
          aria-label="Expand panel"
        >
          <ChevronDown size={13} />
        </button>
      </div>

      <button className="widget-line widget-last" onClick={() => void toggleExpanded()} aria-label="Expand panel">
        {lastDone ? (
          <>
            <StatusDot status="done" size={9} />
            <span className="last-name truncate">{lastDone.taskName}</span>
            <span className="last-time tnum">{ago(lastDone.timestamp)}</span>
          </>
        ) : (
          <span className="last-empty">Nothing finished yet</span>
        )}
      </button>
    </div>
  );
}
