/** Per-project notes. Pinned first, then newest. Persisted through the store
 *  like everything else — nothing lives only in component state. */

import { useState } from "react";
import { actions } from "../lib/store";
import { ago } from "../lib/rollup";
import type { Note } from "../lib/types";
import { KNOWN_SOURCE_APPS } from "../lib/types";
import { Close, Pin, Plus } from "./Icons";

export function Notes({ projectId, notes }: { projectId: string; notes: Note[] }) {
  const [text, setText] = useState("");
  const [sourceApp, setSourceApp] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await actions.addNote(projectId, value, sourceApp || null);
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="notes">
      <header className="notes-head">
        <span className="label">Notes</span>
        <span className="notes-count tnum">{notes.length}</span>
      </header>

      {notes.length > 0 ? (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id} className={`note${n.pinned ? " note-pinned" : ""}`}>
              <p className="note-text">{n.text}</p>
              <div className="note-meta">
                {n.sourceApp ? <span className="note-app">{n.sourceApp}</span> : null}
                <span className="note-time tnum">{ago(n.timestamp)}</span>
                <div className="spacer" />
                <button
                  className={`btn icon quiet${n.pinned ? " btn-on" : ""}`}
                  onClick={() => void actions.pinNote(n.id, !n.pinned)}
                  aria-label={n.pinned ? "Unpin note" : "Pin note"}
                  title={n.pinned ? "Unpin note" : "Pin note"}
                >
                  <Pin size={12} />
                </button>
                <button
                  className="btn icon quiet danger"
                  onClick={() => void actions.deleteNote(n.id)}
                  aria-label="Delete note"
                  title="Delete note"
                >
                  <Close size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="note-add">
        <select
          className="note-select"
          value={sourceApp}
          onChange={(e) => setSourceApp(e.target.value)}
          aria-label="Attribute this note to a source app"
        >
          <option value="">No app</option>
          {KNOWN_SOURCE_APPS.map((app) => (
            <option key={app} value={app}>
              {app}
            </option>
          ))}
        </select>
        <input
          className="note-input"
          value={text}
          placeholder="Add a note…"
          aria-label="Note text"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <button
          className="btn icon"
          onClick={() => void submit()}
          disabled={!text.trim() || busy}
          aria-label="Add note"
          title="Add note (Enter)"
        >
          <Plus size={13} />
        </button>
      </div>
    </section>
  );
}
