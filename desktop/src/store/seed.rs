//! Demo data for first launch.
//!
//! Written only when no `store.json` exists (see `JsonStore::load`), so real
//! events are never overwritten. Timestamps are relative to first launch, which
//! keeps the timeline looking live whenever the app is first opened.

use crate::model::*;
use chrono::{Duration, Utc};

/// Builder that keeps the seed readable: one line per reported event.
struct Seeder {
    state: HubState,
}

impl Seeder {
    fn new() -> Self {
        Self { state: HubState::default() }
    }

    fn project(&mut self, name: &str, age_min: i64) -> String {
        let id = new_id();
        let at = Utc::now() - Duration::minutes(age_min);
        self.state.projects.push(Project {
            id: id.clone(),
            name: name.to_string(),
            slug: slugify(name),
            created_at: at,
            updated_at: Utc::now(),
        });
        id
    }

    /// Records a task and its event exactly the way `ingest_event` would.
    #[allow(clippy::too_many_arguments)]
    fn event(
        &mut self,
        project_id: &str,
        source_app: &str,
        task_name: &str,
        status: Status,
        summary: &str,
        priority: Priority,
        age_min: i64,
        read: bool,
    ) {
        let at = Utc::now() - Duration::minutes(age_min);
        let existing = self
            .state
            .tasks
            .iter_mut()
            .find(|t| t.project_id == project_id && t.source_app == source_app && t.name == task_name);

        let task_id = match existing {
            Some(t) => {
                t.status = status;
                t.updated_at = at;
                t.id.clone()
            }
            None => {
                let id = new_id();
                self.state.tasks.push(Task {
                    id: id.clone(),
                    project_id: project_id.to_string(),
                    name: task_name.to_string(),
                    source_app: source_app.to_string(),
                    status,
                    updated_at: at,
                });
                id
            }
        };

        self.state.events.push(Event {
            id: new_id(),
            project_id: project_id.to_string(),
            task_id,
            source_app: source_app.to_string(),
            task_name: task_name.to_string(),
            status,
            summary: summary.to_string(),
            priority,
            url: None,
            timestamp: at,
            read,
            dismissed: false,
        });
    }

}

pub fn demo_state() -> HubState {
    use Priority::{High, Normal};
    use Status::{Blocked, Done, Running, Waiting};

    let mut s = Seeder::new();

    // ---- Project A: three tools running in parallel on one deliverable ----
    let a = s.project("AtlasNova Brand Kit", 260);
    s.event(&a, "Codex", "Implementation", Running, "Scaffolding token export pipeline.", Normal, 240, true);
    s.event(&a, "Figma", "Design review", Waiting, "Waiting on Yanice to sign off on the type scale.", Normal, 176, true);
    s.event(&a, "Codex", "Implementation", Done, "Finished layout implementation and tests passed.", Normal, 54, true);
    s.event(&a, "Cursor", "Debug token conflicts", Running, "Reproducing the duplicate --space-4 definition.", Normal, 33, true);
    // Unread sticky #1: blocked and high priority, needs a decision.
    s.event(&a, "Cursor", "Debug token conflicts", Blocked, "Two sources define --space-4 differently. Need a call on which wins before I can continue.", High, 11, false);

    // ---- Project B: a long-running cloud job plus finished ideation ----
    let b = s.project("Portfolio Rewrite", 190);
    s.event(&b, "Cloud", "Build & deploy", Running, "Astro build running on the yyp branch, step 4 of 7.", Normal, 21, true);
    // Unread sticky #2: a completed handoff Yanice has not looked at yet.
    s.event(&b, "Codex", "Brainstorm IA", Done, "Three navigation structures drafted; case-study-first is the recommendation.", Normal, 6, false);

    s.state.events.sort_by(|x, y| x.timestamp.cmp(&y.timestamp));
    s.state
}
