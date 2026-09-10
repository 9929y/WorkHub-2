//! MVP persistence: the whole state in one JSON file, written atomically.
//!
//! Deliberately simple. The bounded `MAX_EVENTS` cap and the whole-file rewrite
//! are what a SQLite implementation would replace first.

use super::{Result, Store, StoreError};
use crate::model::*;
use chrono::Utc;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Ring-buffer cap on the event log so the file cannot grow without bound.
const MAX_EVENTS: usize = 2000;

pub struct JsonStore {
    path: PathBuf,
    state: Mutex<HubState>,
}

impl JsonStore {
    /// Loads `store.json`, seeding demo data on genuinely-first launch.
    /// A corrupt file is moved aside rather than deleted — never silently lose data.
    pub fn load(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref().to_path_buf();
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }

        let state = if path.exists() {
            let raw = std::fs::read_to_string(&path)?;
            match serde_json::from_str::<HubState>(&raw) {
                Ok(s) => s,
                Err(e) => {
                    let backup = path.with_extension("corrupt.json");
                    eprintln!(
                        "[workhub] store.json unreadable ({e}); preserved at {}",
                        backup.display()
                    );
                    let _ = std::fs::rename(&path, &backup);
                    super::seed::demo_state()
                }
            }
        } else {
            // Seed only when no file exists, so real events are never clobbered.
            super::seed::demo_state()
        };

        let store = Self { path, state: Mutex::new(state) };
        store.flush()?;
        Ok(store)
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, HubState> {
        // A poisoned lock means a previous writer panicked mid-mutation. The
        // state is still structurally valid, so recover rather than abort.
        self.state.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Write via temp file + rename so a crash mid-write cannot truncate the store.
    fn flush(&self) -> Result<()> {
        let state = self.lock();
        let json = serde_json::to_string_pretty(&*state)?;
        drop(state);
        let tmp = self.path.with_extension("json.tmp");
        std::fs::write(&tmp, json)?;
        std::fs::rename(&tmp, &self.path)?;
        Ok(())
    }
}

impl Store for JsonStore {
    fn snapshot(&self) -> Result<HubState> {
        Ok(self.lock().clone())
    }

    fn ingest_event(&self, payload: EventPayload) -> Result<Event> {
        let name = payload.project.trim().to_string();
        if name.is_empty() {
            return Err(StoreError::Invalid("`project` must not be empty".into()));
        }
        let source_app = payload.source_app.trim().to_string();
        if source_app.is_empty() {
            return Err(StoreError::Invalid("`sourceApp` must not be empty".into()));
        }

        let slug = slugify(&name);
        let task_name = payload
            .task_name
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .unwrap_or("Update")
            .to_string();
        let status = Status::parse(payload.status.as_deref());
        let priority = Priority::parse(payload.priority.as_deref());
        let timestamp = payload
            .timestamp
            .as_deref()
            .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
            .map(|t| t.with_timezone(&Utc))
            .unwrap_or_else(Utc::now);

        let mut state = self.lock();

        // 1. Resolve or create the project. Agents never register up front.
        let project_id = match state.projects.iter_mut().find(|p| p.slug == slug) {
            Some(p) => {
                p.updated_at = timestamp;
                p.id.clone()
            }
            None => {
                let id = new_id();
                state.projects.push(Project {
                    id: id.clone(),
                    name,
                    slug,
                    created_at: timestamp,
                    updated_at: timestamp,
                });
                id
            }
        };

        // 2. Resolve or create the task keyed on (project, sourceApp, taskName).
        let task_id = match state.tasks.iter_mut().find(|t| {
            t.project_id == project_id && t.source_app == source_app && t.name == task_name
        }) {
            Some(t) => {
                t.status = status;
                t.updated_at = timestamp;
                t.id.clone()
            }
            None => {
                let id = new_id();
                state.tasks.push(Task {
                    id: id.clone(),
                    project_id: project_id.clone(),
                    name: task_name.clone(),
                    source_app: source_app.clone(),
                    status,
                    updated_at: timestamp,
                });
                id
            }
        };

        // 3. Append the event, unread and undismissed.
        let event = Event {
            id: new_id(),
            project_id,
            task_id,
            source_app,
            task_name,
            status,
            summary: payload.summary.unwrap_or_default().trim().to_string(),
            priority,
            url: payload
                .url
                .map(|u| u.trim().to_string())
                .filter(|u| !u.is_empty()),
            timestamp,
            read: false,
            dismissed: false,
        };
        state.events.push(event.clone());
        state.events.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        if state.events.len() > MAX_EVENTS {
            let overflow = state.events.len() - MAX_EVENTS;
            state.events.drain(0..overflow);
        }
        drop(state);

        self.flush()?;
        Ok(event)
    }

    fn set_read(&self, event_id: &str, read: bool) -> Result<()> {
        let mut state = self.lock();
        let event = state
            .events
            .iter_mut()
            .find(|e| e.id == event_id)
            .ok_or_else(|| StoreError::NotFound(format!("event {event_id}")))?;
        event.read = read;
        drop(state);
        self.flush()
    }

    fn mark_all_read(&self, project_id: Option<&str>) -> Result<usize> {
        let mut state = self.lock();
        let mut n = 0;
        for e in state.events.iter_mut() {
            let in_scope = project_id.is_none_or(|p| e.project_id == p);
            if in_scope && !e.read {
                e.read = true;
                n += 1;
            }
        }
        drop(state);
        self.flush()?;
        Ok(n)
    }

    fn dismiss(&self, event_id: &str) -> Result<()> {
        let mut state = self.lock();
        let event = state
            .events
            .iter_mut()
            .find(|e| e.id == event_id)
            .ok_or_else(|| StoreError::NotFound(format!("event {event_id}")))?;
        // Dismissing implies acknowledgement, so it also clears unread.
        event.dismissed = true;
        event.read = true;
        drop(state);
        self.flush()
    }

    fn save_ui(&self, ui: UiState) -> Result<()> {
        self.lock().ui = ui;
        self.flush()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A store on a throwaway path, with the demo seed skipped so each test
    /// starts from a known-empty state.
    fn empty_store(tag: &str) -> JsonStore {
        let path = std::env::temp_dir().join(format!("workhub-test-{tag}-{}.json", new_id()));
        let store = JsonStore { path, state: Mutex::new(HubState::default()) };
        store.flush().unwrap();
        store
    }

    fn payload(project: &str, app: &str, task: &str, status: &str) -> EventPayload {
        EventPayload {
            project: project.into(),
            source_app: app.into(),
            task_name: Some(task.into()),
            status: Some(status.into()),
            summary: Some("s".into()),
            priority: None,
            url: None,
            timestamp: None,
        }
    }

    #[test]
    fn matches_projects_by_normalised_name() {
        let s = empty_store("slug");
        s.ingest_event(payload("AtlasNova Brand Kit", "Codex", "Impl", "running")).unwrap();
        s.ingest_event(payload("  atlasnova   brand kit ", "Cursor", "Debug", "blocked")).unwrap();

        let snap = s.snapshot().unwrap();
        assert_eq!(snap.projects.len(), 1, "case and whitespace must not fork the project");
        assert_eq!(snap.tasks.len(), 2, "different (app, task) pairs are separate tracks");
    }

    #[test]
    fn same_task_updates_in_place_rather_than_duplicating() {
        let s = empty_store("task");
        s.ingest_event(payload("P", "Codex", "Impl", "running")).unwrap();
        s.ingest_event(payload("P", "Codex", "Impl", "done")).unwrap();

        let snap = s.snapshot().unwrap();
        assert_eq!(snap.tasks.len(), 1);
        assert_eq!(snap.tasks[0].status, Status::Done, "latest report wins");
        assert_eq!(snap.events.len(), 2, "but both events stay on the timeline");
    }

    #[test]
    fn unknown_status_and_priority_fall_back_instead_of_failing() {
        let s = empty_store("forgiving");
        let mut p = payload("P", "NewTool", "T", "totally-made-up");
        p.priority = Some("whatever".into());
        let e = s.ingest_event(p).unwrap();
        assert_eq!(e.status, Status::Running);
        assert_eq!(e.priority, Priority::Normal);
    }

    #[test]
    fn synonyms_map_onto_the_four_statuses() {
        assert_eq!(Status::parse(Some("completed")), Status::Done);
        assert_eq!(Status::parse(Some("FAILED")), Status::Blocked);
        assert_eq!(Status::parse(Some(" queued ")), Status::Waiting);
        assert_eq!(Status::parse(None), Status::Running);
    }

    #[test]
    fn empty_project_or_source_app_is_rejected() {
        let s = empty_store("validate");
        assert!(s.ingest_event(payload("   ", "Codex", "T", "done")).is_err());
        assert!(s.ingest_event(payload("P", "  ", "T", "done")).is_err());
    }

    #[test]
    fn dismiss_hides_the_alert_and_also_clears_unread() {
        let s = empty_store("dismiss");
        let e = s.ingest_event(payload("P", "Codex", "T", "blocked")).unwrap();
        assert!(!e.read && !e.dismissed);

        s.dismiss(&e.id).unwrap();
        let got = s.snapshot().unwrap().events.remove(0);
        assert!(got.dismissed, "dismissed alerts never come back");
        assert!(got.read, "dismissing implies acknowledgement");
    }

    #[test]
    fn mark_all_read_can_be_scoped_to_one_project() {
        let s = empty_store("read");
        s.ingest_event(payload("A", "Codex", "T", "done")).unwrap();
        s.ingest_event(payload("B", "Cloud", "T", "done")).unwrap();
        let a_id = s.snapshot().unwrap().projects.iter().find(|p| p.slug == "a").unwrap().id.clone();

        assert_eq!(s.mark_all_read(Some(&a_id)).unwrap(), 1);
        let snap = s.snapshot().unwrap();
        let unread: Vec<_> = snap.events.iter().filter(|e| !e.read).collect();
        assert_eq!(unread.len(), 1, "the other project keeps its unread event");
        assert_ne!(unread[0].project_id, a_id);
    }

    #[test]
    fn reload_keeps_data_and_does_not_re_seed() {
        let path = std::env::temp_dir().join(format!("workhub-test-reload-{}.json", new_id()));
        {
            let s = JsonStore { path: path.clone(), state: Mutex::new(HubState::default()) };
            s.ingest_event(payload("Real Work", "Codex", "T", "done")).unwrap();
        }
        // Loading an existing file must not overlay the demo seed.
        let reloaded = JsonStore::load(&path).unwrap().snapshot().unwrap();
        assert_eq!(reloaded.projects.len(), 1);
        assert_eq!(reloaded.projects[0].name, "Real Work");
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn first_launch_seeds_demo_data_with_two_unread_sticky_alerts() {
        let path = std::env::temp_dir().join(format!("workhub-test-seed-{}.json", new_id()));
        let snap = JsonStore::load(&path).unwrap().snapshot().unwrap();

        assert_eq!(snap.projects.len(), 2);
        let apps: std::collections::HashSet<_> = snap.tasks.iter().map(|t| t.source_app.as_str()).collect();
        for expected in ["Codex", "Cursor", "Figma", "Cloud"] {
            assert!(apps.contains(expected), "seed should demo {expected}");
        }

        let unread_sticky = snap
            .events
            .iter()
            .filter(|e| !e.read && !e.dismissed)
            .filter(|e| e.status == Status::Blocked || e.status == Status::Done || e.priority == Priority::High)
            .count();
        assert!(unread_sticky >= 2, "brief requires at least 2 unread sticky notifications");
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn event_log_is_capped() {
        let s = empty_store("cap");
        for i in 0..(MAX_EVENTS + 25) {
            s.ingest_event(payload("P", "Codex", &format!("T{i}"), "running")).unwrap();
        }
        assert_eq!(s.snapshot().unwrap().events.len(), MAX_EVENTS);
    }
}
