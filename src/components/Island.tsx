/** The island: the resting state. One mark per platform on live work, plus the
 *  number of things waiting on you. No prose at all. */

import { useHub } from "../lib/store";
import * as api from "../lib/api";
import { PlatformIcon } from "./PlatformIcon";

export function Island() {
  const { summary, serverError, togglePanel } = useHub();
  const { platforms, asks } = summary;

  return (
    <button
      className="island"
      onClick={() => void togglePanel()}
      aria-label={asks > 0 ? `${asks} need you. Open Workhub.` : "Nothing needs you. Open Workhub."}
      title={platforms.map((p) => `${p.sourceApp}: ${p.status}`).join("\n") || "Nothing reporting"}
    >
      <span className="island-grip" data-tauri-drag-region onMouseUp={() => void api.savePosition()} />
      <span className="island-marks">
        {serverError ? (
          <span className="island-dead" />
        ) : platforms.length === 0 ? (
          <span className="island-idle" />
        ) : (
          platforms.map((p) => (
            <span key={p.sourceApp} className={`mark mark-${p.status}`}>
              <PlatformIcon sourceApp={p.sourceApp} size={16} />
            </span>
          ))
        )}
      </span>
      {asks > 0 ? <span className="island-count tnum">{asks}</span> : null}
    </button>
  );
}
