/** Finished categories.
 *
 *  Collapsed and grey by default: they are the record of what happened, and the
 *  panel is meant to answer what needs you now. */

import { useState } from "react";
import type { ProjectRollup } from "../lib/rollup";
import { ChevronDown, ChevronUp } from "./Icons";
import { PlatformIcon } from "./PlatformIcon";

export function History({ items }: { items: ProjectRollup[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <section className="history">
      <button className="history-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>History</span>
        <span className="tnum history-count">{items.length}</span>
        <span className="spacer" />
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open
        ? items.map((r) => (
            <div key={r.project.id} className="history-row">
              <span className="truncate">{r.project.name}</span>
              <span className="history-marks">
                {r.platforms.map((p) => (
                  <PlatformIcon key={p.sourceApp} sourceApp={p.sourceApp} size={12} />
                ))}
              </span>
              <span className="tnum history-num">{r.progress.total}</span>
            </div>
          ))
        : null}
    </section>
  );
}
