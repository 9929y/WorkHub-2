import { useEffect } from "react";
import { useHub } from "./lib/store";
import { Arrival } from "./components/Arrival";
import { Island } from "./components/Island";
import { Panel } from "./components/Panel";

export default function App() {
  const { shape, loaded, panelHeight, init } = useHub();

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

  // One element morphs between all three shapes. The native window is only
  // resized to make room; the spring itself is CSS.
  return (
    <div className={`morph is-${shape}`} style={shape === "panel" ? { height: panelHeight } : undefined}>
      {loaded ? shape === "panel" ? <Panel /> : shape === "alert" ? <Arrival /> : <Island /> : null}
    </div>
  );
}
