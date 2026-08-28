import { useEffect } from "react";
import { useHub } from "./lib/store";
import { Island } from "./components/Island";
import { Panel } from "./components/Panel";

export default function App() {
  const { expanded, loaded, panelHeight, init } = useHub();

  useEffect(() => {
    // `init` is async, so StrictMode's double-invoke can run cleanup before the
    // first call has handed back its disposer. The flag makes the late disposer
    // fire immediately instead of leaking a duplicate listener.
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

  // One element morphs between the two states. The native window is only ever
  // resized to make room; the animation itself is CSS, which is the only way to
  // get a spring out of a resize the window server does instantly.
  return (
    <div
      className={`morph ${expanded ? "is-panel" : "is-island"}`}
      style={expanded ? { height: panelHeight } : undefined}
    >
      {loaded ? (expanded ? <Panel /> : <Island />) : null}
    </div>
  );
}
