/** Mirrors `desktop/src/model.rs`. Both sides serialise camelCase, so there is
 *  no mapping layer — change one, change the other. */

export type Status = "running" | "done" | "blocked" | "waiting";
export type Priority = "low" | "normal" | "high";

/** Free-form: the four known apps get a badge colour, anything else falls back
 *  to neutral. Adapters can invent their own without a code change here. */
export type SourceApp = string;

export interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

/** One track of work — a (sourceApp, taskName) pair inside a project. */
export interface Task {
  id: string;
  projectId: string;
  name: string;
  sourceApp: SourceApp;
  status: Status;
  updatedAt: string;
}

export interface Event {
  id: string;
  projectId: string;
  taskId: string;
  sourceApp: SourceApp;
  taskName: string;
  status: Status;
  summary: string;
  priority: Priority;
  url: string | null;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
}

export interface UiState {
  position: [number, number] | null;
  collapsed: boolean;
}

export interface HubState {
  projects: Project[];
  tasks: Task[];
  events: Event[];
  ui: UiState;
}

export interface ServerInfo {
  port: number;
  version: string;
}

export const STATUS_ORDER: Status[] = ["blocked", "waiting", "running", "done"];

export const STATUS_LABEL: Record<Status, string> = {
  running: "Running",
  done: "Done",
  blocked: "Blocked",
  waiting: "Waiting",
};

/** Severity for project rollups — must match `Status::severity` in Rust. */
export const STATUS_SEVERITY: Record<Status, number> = {
  blocked: 3,
  waiting: 2,
  running: 1,
  done: 0,
};

export const KNOWN_SOURCE_APPS = ["Cursor", "Codex", "Figma", "Cloud"] as const;
