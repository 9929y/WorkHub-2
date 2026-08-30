//! Commands callable from the React frontend.
//!
//! Each mutation emits `workhub://state` so every surface (HUD and any future
//! window) converges on the same snapshot without polling.

use crate::model::HubState;
use crate::server::STATE_EVENT;
use crate::{window, AppState};
use tauri::{AppHandle, Emitter, State, WebviewWindow};

type CmdResult<T> = Result<T, String>;

fn broadcast(app: &AppHandle) {
    // `None` = "state changed because the user did something", which must never
    // pop an alert. Only server.rs sends an id.
    let _ = app.emit(STATE_EVENT, None::<String>);
}

#[tauri::command]
pub fn get_state(state: State<'_, AppState>) -> CmdResult<HubState> {
    state.store.snapshot().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_read(
    app: AppHandle,
    state: State<'_, AppState>,
    event_id: String,
    read: bool,
) -> CmdResult<()> {
    state.store.set_read(&event_id, read).map_err(|e| e.to_string())?;
    broadcast(&app);
    Ok(())
}

#[tauri::command]
pub fn mark_all_read(
    app: AppHandle,
    state: State<'_, AppState>,
    project_id: Option<String>,
) -> CmdResult<usize> {
    let n = state
        .store
        .mark_all_read(project_id.as_deref())
        .map_err(|e| e.to_string())?;
    broadcast(&app);
    Ok(n)
}

#[tauri::command]
pub fn dismiss(app: AppHandle, state: State<'_, AppState>, event_id: String) -> CmdResult<()> {
    state.store.dismiss(&event_id).map_err(|e| e.to_string())?;
    broadcast(&app);
    Ok(())
}

/// Resize the window to one of the three shapes: island, alert, or panel.
///
/// `alert` is the transient toast the island morphs into when an agent reports;
/// it is not a mode the user can be left in, so it is not persisted.
#[tauri::command]
pub fn set_shape(
    win: WebviewWindow,
    state: State<'_, AppState>,
    shape: String,
    height: Option<f64>,
    instant: Option<bool>,
) -> CmdResult<()> {
    let shape = window::Shape::parse(&shape);
    window::set_shape(&win, shape, height, instant.unwrap_or(false));
    if shape == window::Shape::Alert {
        return Ok(());
    }
    let mut ui = state.store.snapshot().map_err(|e| e.to_string())?.ui;
    ui.collapsed = shape == window::Shape::Island;
    state.store.save_ui(ui).map_err(|e| e.to_string())
}

/// Fit the expanded panel to its measured content height.
#[tauri::command]
pub fn set_panel_height(win: WebviewWindow, height: f64) -> CmdResult<()> {
    window::set_panel_height(&win, height);
    Ok(())
}

/// Persist the window position after the user drags the HUD.
#[tauri::command]
pub fn save_position(win: WebviewWindow, state: State<'_, AppState>) -> CmdResult<()> {
    let scale = win.scale_factor().map_err(|e| e.to_string())?;
    let pos = win.outer_position().map_err(|e| e.to_string())?;
    let mut ui = state.store.snapshot().map_err(|e| e.to_string())?.ui;
    ui.position = Some([pos.x as f64 / scale, pos.y as f64 / scale]);
    state.store.save_ui(ui).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_position(win: WebviewWindow, state: State<'_, AppState>) -> CmdResult<()> {
    let collapsed = state.store.snapshot().map_err(|e| e.to_string())?.ui.collapsed;
    let width = if collapsed { window::ISLAND.0 } else { window::PANEL.0 };
    window::place_top_centre(&win, width);
    let mut ui = state.store.snapshot().map_err(|e| e.to_string())?.ui;
    ui.position = None;
    state.store.save_ui(ui).map_err(|e| e.to_string())
}

/// Exposed so the UI can show the port it is actually listening on.
/// Jump from a status line into the tool that reported it.
#[tauri::command]
pub fn open_target(app: AppHandle, source_app: String, url: Option<String>) -> CmdResult<()> {
    crate::launch::open(&app, &source_app, url.as_deref())
}

/// What appearance the window is actually in, read from the platform rather
/// than inferred from a CSS media query the webview may not honour.
#[tauri::command]
pub fn current_theme(win: WebviewWindow) -> CmdResult<String> {
    Ok(match win.theme() {
        Ok(tauri::Theme::Dark) => "dark".into(),
        _ => "light".into(),
    })
}

#[tauri::command]
pub fn server_info() -> CmdResult<UiServerInfo> {
    Ok(UiServerInfo {
        port: crate::server::PORT,
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiServerInfo {
    pub port: u16,
    pub version: String,
}
