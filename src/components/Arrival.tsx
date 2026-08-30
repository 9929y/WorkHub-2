/** The arrival: one Ask, announced for six seconds, then gone.
 *
 *  It must answer three things or it is noise: WHO is asking, for WHICH
 *  project, and WHAT they need.
 *
 *  It is also a **one-slot carousel onto the queue**. That gives the product one
 *  coherent axis rule:
 *
 *    vertical   = this item changed state
 *    horizontal = you are looking at a different item
 *
 *  So a second Ask arriving while one is up slides in from the right while the
 *  first leaves to the left. Time runs left to right. */

import { useEffect, useRef, useState } from "react";
import { actions, useHub } from "../lib/store";
import type { Ask } from "../lib/rollup";
import { PlatformIcon } from "./PlatformIcon";
import { StatusDot } from "./StatusDot";

/** Must equal --dur-swap-out in tokens.css. */
const SWAP_OUT_MS = 130;

interface Card {
  ask: Ask;
  phase: "in" | "out";
}

export function Arrival() {
  const { alert, summary, dismissAlert, setShape } = useHub();
  const [cards, setCards] = useState<Card[]>([]);
  // Whether the incoming Ask came from a different tool than the outgoing one.
  const swapped = useRef(false);
  const prevApp = useRef<string | null>(null);

  useEffect(() => {
    if (!alert) return;
    swapped.current = prevApp.current !== null && prevApp.current !== alert.task.sourceApp;
    prevApp.current = alert.task.sourceApp;

    setCards((prev) => [
      ...prev.filter((c) => c.phase === "in").map((c) => ({ ...c, phase: "out" as const })),
      { ask: alert, phase: "in" as const },
    ]);
    const t = window.setTimeout(
      () => setCards((prev) => prev.filter((c) => c.phase === "in")),
      SWAP_OUT_MS,
    );
    return () => window.clearTimeout(t);
  }, [alert?.id]);

  if (!alert) return null;

  return (
    <div className="arrival">
      {/* The logo is the identity anchor and deliberately does NOT slide when
          the same agent asks twice: holding it still while the text moves
          underneath is what makes this read as a live surface rather than a
          slideshow. It only cross-fades when the tool actually changes. */}
      <span className="arrival-logo" data-swapped={swapped.current || undefined}>
        <PlatformIcon sourceApp={alert.task.sourceApp} size={18} />
      </span>

      <div className="arrival-slot">
        {cards.map((c) => (
          <div key={c.ask.id} className="arrival-card" data-phase={c.phase}>
            <button
              className="arrival-body"
              onClick={() => {
                dismissAlert();
                void actions.open(c.ask.task.sourceApp, c.ask.event?.url);
              }}
              title={`${c.ask.reason} · ${c.ask.project.name}\n\n${c.ask.detail}\n\nClick to open ${c.ask.task.sourceApp}.`}
            >
              <span className="arrival-top">
                <StatusDot status={c.ask.task.status} size={9} />
                <span className="arrival-app">{c.ask.task.sourceApp}</span>
                <span className="arrival-sep">·</span>
                <span className="arrival-project truncate">{c.ask.project.name}</span>
              </span>
              <span className="arrival-detail">{c.ask.detail}</span>
            </button>
          </div>
        ))}
      </div>

      {summary.asks > 1 ? (
        <button
          className="arrival-more tnum"
          onClick={() => void setShape("panel")}
          aria-label={`${summary.asks} in the queue. Open it.`}
          title="Open the queue"
        >
          {summary.asks}
        </button>
      ) : null}
    </div>
  );
}
