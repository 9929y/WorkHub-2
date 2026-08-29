/** The unfolded island: what needs you, grouped by project. */

import { useLayoutEffect, useRef } from "react";
import { useHub } from "../lib/store";
import * as api from "../lib/api";
import { ChevronUp } from "./Icons";
import { History } from "./History";
import { ProjectRow } from "./ProjectRow";

export function Panel() {
  const { rollups, summary, serverError, toggleExpanded, fitPanel } = useHub();
  const active = rollups.filter((r) => !r.isComplete);
  const complete = rollups.filter((r) => r.isComplete);

  // Measure the content so the island can size itself to it. Without this the
  // window sits over the desktop as a transparent slab that swallows clicks.
  // Measure the CONTENT, never the scroll container. The container is flex:1 and
  // therefore already stretched to the window, so measuring it just reports the
  // height we are trying to compute and the panel never shrinks.
  const content = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = content.current;
    if (!el) return;
    const measure = () => fitPanel((head.current?.offsetHeight ?? 34) + el.offsetHeight + 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitPanel, rollups]);

  return (
    <div className="shell panel">
      <header className="panel-head" ref={head}>
        <span className="panel-grip" data-tauri-drag-region onMouseUp={() => void api.savePosition()} />
        <span className="panel-stat">
          {summary.needsYou > 0 ? (
            <>
              <span className="tnum strong">{summary.needsYou}</span> need you
            </>
          ) : (
            "Nothing needs you"
          )}
        </span>
        <button className="btn icon quiet" onClick={() => void toggleExpanded()} aria-label="Close">
          <ChevronUp size={13} />
        </button>
      </header>

      {serverError ? <p className="banner">{serverError}</p> : null}

      <div className="scroll panel-scroll">
        {/* This inner wrapper is what gets measured: it is the natural height of
            the content, unlike the scroll container above it. */}
        <div className="panel-content" ref={content}>
          {rollups.length === 0 ? (
            <p className="empty">
              Nothing reporting yet. POST to <code>localhost:8787/events</code>.
            </p>
          ) : (
            <>
              {active.map((r) => (
                <ProjectRow key={r.project.id} rollup={r} />
              ))}
              <History items={complete} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
