/** The island: 224x36, centred under the notch.
 *
 *  Collapsed it carries NO prose at all. One mark per platform, tinted by what
 *  that platform currently needs, plus a count of things waiting on you. That is
 *  the whole readout: which tools are working, and whether any of them is stuck.
 *
 *  Everything with words lives behind the click. */

import { useHub } from "../lib/store";
import * as api from "../lib/api";

import { PlatformIcon } from "./PlatformIcon";

export function Island() {
  const { summary, serverError, toggleExpanded } = useHub();
  const { platforms, needsYou } = summary;

  return (
    <button
      className="island"
      onClick={() => void toggleExpanded()}
      aria-label={
        needsYou > 0 ? `${needsYou} items need you. Open Workhub.` : "Nothing needs you. Open Workhub."
      }
      title={platforms.map((p) => `${p.sourceApp}: ${p.status}`).join("\n") || "No platforms reporting"}
    >
      {/* The drag handle is a thin strip, not the whole island, so the island
          itself stays clickable. */}
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

      {needsYou > 0 ? <span className="island-count tnum">{needsYou}</span> : null}
    </button>
  );
}
