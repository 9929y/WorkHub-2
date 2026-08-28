//! Storage seam.
//!
//! Every other module — commands, HTTP server, tray — talks only to `trait Store`.
//! Swapping the MVP `JsonStore` for a `SqliteStore` therefore touches this
//! directory and nothing else.

pub mod json;
pub mod seed;

use crate::model::*;

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("serialize: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("invalid input: {0}")]
    Invalid(String),
}

pub type Result<T> = std::result::Result<T, StoreError>;

pub trait Store: Send + Sync {
    /// Full state for the UI. Cheap enough at MVP scale to send wholesale.
    fn snapshot(&self) -> Result<HubState>;

    /// Upsert project + task, then append the event. See `json::JsonStore` for the rules.
    fn ingest_event(&self, payload: EventPayload) -> Result<Event>;

    fn add_note(
        &self,
        project_id: &str,
        source_app: Option<String>,
        text: String,
    ) -> Result<Note>;

    fn set_read(&self, event_id: &str, read: bool) -> Result<()>;
    fn mark_all_read(&self, project_id: Option<&str>) -> Result<usize>;
    fn dismiss(&self, event_id: &str) -> Result<()>;
    fn set_note_pinned(&self, note_id: &str, pinned: bool) -> Result<()>;
    fn delete_note(&self, note_id: &str) -> Result<()>;
    fn save_ui(&self, ui: UiState) -> Result<()>;
}
