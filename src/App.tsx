import { useEffect } from "react";
import { useHub } from "./lib/store";
import { Panel } from "./components/Panel";
import { Widget } from "./components/Widget";

export default function App() {
  const { expanded, loaded, init } = useHub();

  useEffect(() => {
    // `init` is async, so StrictMode's double-invoke can run cleanup before the
    // first call has handed back its disposer. The flag makes the late disposer
    // fire immediately instead of leaking a duplicate event listener.
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

  // Paint nothing until the first snapshot lands — a flash of empty HUD reads
  // as "no work in flight", which is exactly the wrong signal.
  if (!loaded) return <div className="shell" />;

  return expanded ? <Panel /> : <Widget />;
}
