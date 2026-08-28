//! Data model. Mirrored field-for-field by `src/lib/types.ts` on the frontend.
//! Everything serialises as camelCase so the TypeScript side needs no mapping layer.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Lifecycle of a task as reported by an agent.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Running,
    Done,
    Blocked,
    Waiting,
}

impl Status {
    /// Forgiving parse: an adapter sending an unexpected value should not get a
    /// 400, it should get a sane default. Unknown => Running.
    pub fn parse(raw: Option<&str>) -> Self {
        match raw.map(str::trim).map(str::to_ascii_lowercase).as_deref() {
            Some("done") | Some("complete") | Some("completed") | Some("success") => Status::Done,
            Some("blocked") | Some("error") | Some("failed") | Some("failure") => Status::Blocked,
            Some("waiting") | Some("pending") | Some("queued") | Some("review") => Status::Waiting,
            _ => Status::Running,
        }
    }

    /// Severity for project rollups: the worst status among a project's tasks wins.
    pub fn severity(self) -> u8 {
        match self {
            Status::Blocked => 3,
            Status::Waiting => 2,
            Status::Running => 1,
            Status::Done => 0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Low,
    Normal,
    High,
}

impl Priority {
    pub fn parse(raw: Option<&str>) -> Self {
        match raw.map(str::trim).map(str::to_ascii_lowercase).as_deref() {
            Some("high") | Some("urgent") | Some("critical") => Priority::High,
            Some("low") => Priority::Low,
            _ => Priority::Normal,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    /// Normalised key used to match incoming events to an existing project.
    pub slug: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// One track of work inside a project — a (sourceApp, taskName) pair.
/// This is the "thread" concept: Codex-implementation and Cursor-debug are two
/// tasks of the same project, which is what makes cross-tool aggregation work.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub source_app: String,
    pub status: Status,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: String,
    pub project_id: String,
    pub task_id: String,
    pub source_app: String,
    pub task_name: String,
    pub status: Status,
    pub summary: String,
    pub priority: Priority,
    pub url: Option<String>,
    pub timestamp: DateTime<Utc>,
    /// Cleared by "mark as read"; drives the unread badge.
    pub read: bool,
    /// Cleared by "dismiss"; sticky alerts never auto-expire, only dismissal hides them.
    pub dismissed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub project_id: String,
    pub source_app: Option<String>,
    pub text: String,
    pub timestamp: DateTime<Utc>,
    pub pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct UiState {
    /// Last logical window position, so the HUD reopens where it was left.
    pub position: Option<[f64; 2]>,
    pub collapsed: bool,
}

impl Default for UiState {
    fn default() -> Self {
        // A fresh install opens as the small widget, not the full panel.
        Self { position: None, collapsed: true }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct HubState {
    pub projects: Vec<Project>,
    pub tasks: Vec<Task>,
    pub events: Vec<Event>,
    pub notes: Vec<Note>,
    pub ui: UiState,
}

/// Body of `POST /events`. Only `project` and `sourceApp` are required; unknown
/// fields are ignored so adapters can evolve without breaking the endpoint.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventPayload {
    pub project: String,
    pub source_app: String,
    #[serde(default)]
    pub task_name: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub priority: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub timestamp: Option<String>,
}

/// Collapse a project name to a stable matching key: lowercased, trimmed,
/// internal whitespace collapsed. "AtlasNova  Brand Kit " == "atlasnova brand kit".
pub fn slugify(name: &str) -> String {
    name.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}
