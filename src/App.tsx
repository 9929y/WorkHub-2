import { useEffect } from "react";
import { useHub } from "./lib/store";
import { Arrival } from "./components/Arrival";
import { Island } from "./components/Island";
import { Panel } from "./components/Panel";

export default function App() {
  const { shape, leaving, loaded, init } = useHub();

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void init().then((fn) => {
      if (cancelled) fn();
      else dispose = fn;
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [init]);

  // The element simply fills the window. The window is what animates (see
  // window::animate_to), because NSVisualEffectView is the window: making the
  // frost and the shape the same object is the only way to have both.
  return (
    <div className={`morph is-${shape}`} data-leaving={leaving || undefined}>
      {loaded ? shape === "panel" ? <Panel /> : shape === "alert" ? <Arrival /> : <Island /> : null}
    </div>
  );
}
