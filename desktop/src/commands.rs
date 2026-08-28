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
    let _ = app.emit(STATE_EVENT, ());
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

/// Grow or shrink the native window to match the UI mode, and remember the choice.
#[tauri::command]
pub fn set_panel_expanded(
    win: WebviewWindow,
    state: State<'_, AppState>,
    expanded: bool,
) -> CmdResult<()> {
    window::set_expanded(&win, expanded);
    let mut ui = state
        .store
        .snapshot()
        .map_err(|e| e.to_string())?
        .ui;
    ui.collapsed = !expanded;
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
    let expanded = !state.store.snapshot().map_err(|e| e.to_string())?.ui.collapsed;
    let width = if expanded { window::EXPANDED.0 } else { window::COLLAPSED.0 };
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
