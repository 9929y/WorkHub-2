/** Thin wrappers over the native command layer. Nothing else in the app calls
 *  `invoke` directly, so a change in the native surface stays contained here. */

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { HubState, Note, ServerInfo } from "./types";

export const getState = () => invoke<HubState>("get_state");
export const serverInfo = () => invoke<ServerInfo>("server_info");

export const addNote = (projectId: string, text: string, sourceApp?: string | null) =>
  invoke<Note>("add_note", { projectId, text, sourceApp: sourceApp ?? null });

export const setRead = (eventId: string, read: boolean) =>
  invoke<void>("set_read", { eventId, read });

export const markAllRead = (projectId?: string) =>
  invoke<number>("mark_all_read", { projectId: projectId ?? null });

export const dismiss = (eventId: string) => invoke<void>("dismiss", { eventId });

export const setNotePinned = (noteId: string, pinned: boolean) =>
  invoke<void>("set_note_pinned", { noteId, pinned });

export const deleteNote = (noteId: string) => invoke<void>("delete_note", { noteId });

export const setPanelExpanded = (expanded: boolean) =>
  invoke<void>("set_panel_expanded", { expanded });

export const savePosition = () => invoke<void>("save_position");
export const resetPosition = () => invoke<void>("reset_position");

/** Native drag. Called from the grip only — see `.grip` in glass.css. */
export const startDragging = () => getCurrentWindow().startDragging();
