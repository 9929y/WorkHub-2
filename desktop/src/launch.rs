//! Click-through: getting from "Cursor is blocked" to Cursor itself.
//!
//! An event's `url` always wins, because that points at the exact task. Only
//! when an adapter did not send one do we fall back to opening the platform.

use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

/// Where a platform lives when the event carried no url.
/// `app` is tried first and only used if it is actually installed, so an
/// uninstalled tool degrades to its website instead of failing silently.
struct Target {
    app: Option<&'static str>,
    url: Option<&'static str>,
}

fn target_for(source_app: &str) -> Target {
    match source_app.trim().to_ascii_lowercase().as_str() {
        "cursor" => Target { app: Some("/Applications/Cursor.app"), url: Some("https://cursor.com") },
        "codex" => Target { app: None, url: Some("https://chatgpt.com/codex") },
        "figma" => Target { app: Some("/Applications/Figma.app"), url: Some("https://www.figma.com/files") },
        "claude" | "claude code" => Target { app: None, url: Some("https://claude.ai") },
        "github" | "cloud" => Target { app: None, url: Some("https://github.com") },
        _ => Target { app: None, url: None },
    }
}

pub fn open(app: &AppHandle, source_app: &str, url: Option<&str>) -> Result<(), String> {
    // 1. The exact task, if the adapter told us where it is.
    if let Some(u) = url.map(str::trim).filter(|u| !u.is_empty()) {
        return app.opener().open_url(u, None::<&str>).map_err(|e| e.to_string());
    }

    let t = target_for(source_app);

    // 2. The desktop app, but only if it is really installed.
    if let Some(path) = t.app {
        if std::path::Path::new(path).exists() {
            return app.opener().open_path(path, None::<&str>).map_err(|e| e.to_string());
        }
    }

    // 3. The platform on the web.
    if let Some(u) = t.url {
        return app.opener().open_url(u, None::<&str>).map_err(|e| e.to_string());
    }

    Err(format!("No way to open {source_app}. Send a `url` with the event."))
}
