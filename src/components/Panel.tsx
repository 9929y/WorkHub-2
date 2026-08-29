/** The panel takes one of two forms, decided by whether anything needs you.
 *
 *  Asks pending  -> a queue, and nothing else. You are acting.
 *  Queue empty   -> the status board. You are browsing, so levels are welcome.
 *
 *  This is what resolves "I want progress and platforms" against "it is too
 *  heavy": both are right, just never at the same time. */

import { useLayoutEffect, useRef } from "react";
import { useHub } from "../lib/store";
import * as api from "../lib/api";
import { ChevronUp } from "./Icons";
import { Board, Queue } from "./Queue";

export function Panel() {
  const { asks, summary, serverError, togglePanel, fitPanel } = useHub();

  // Measure the CONTENT, never the scroll container: the container is flex:1 and
  // already stretched to the window, so measuring it reports the height we are
  // trying to compute and the panel never shrinks.
  const content = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = content.current;
    if (!el) return;
    const measure = () => fitPanel((head.current?.offsetHeight ?? 32) + el.offsetHeight + 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitPanel, asks]);

  const stale = asks.length - summary.fresh;

  return (
    <div className="shell panel">
      <header className="panel-head" ref={head}>
        <span className="panel-grip" data-tauri-drag-region onMouseUp={() => void api.savePosition()} />
        <span className="panel-title">
          {asks.length === 0 ? (
            "Nothing needs you"
          ) : (
            <>
              <span className="tnum strong">{asks.length}</span> need you
              {stale > 0 ? <span className="panel-sub tnum"> · {stale} from earlier</span> : null}
            </>
          )}
        </span>
        <button className="btn icon quiet" onClick={() => void togglePanel()} aria-label="Close">
          <ChevronUp size={13} />
        </button>
      </header>

      {serverError ? <p className="banner">{serverError}</p> : null}

      <div className="scroll panel-scroll">
        <div className="panel-content" ref={content}>
          {asks.length > 0 ? <Queue asks={asks} /> : <Board />}
        </div>
      </div>
    </div>
  );
}
