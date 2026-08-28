//! Workhub — an always-on-top macOS HUD that aggregates AI workflow status
//! across Cursor, Codex, Figma and Cloud jobs.

mod commands;
mod launch;
mod model;
mod server;
mod store;
mod window;

use std::sync::Arc;
use store::{json::JsonStore, Store};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WebviewWindow};

/// Shared across commands and the HTTP server. Only the trait is exposed, which
/// is what keeps the SQLite swap contained to `store/`.
pub struct AppState {
    pub store: Arc<dyn Store>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_state,
            commands::set_read,
            commands::mark_all_read,
            commands::dismiss,
            commands::set_panel_expanded,
            commands::set_panel_height,
            commands::save_position,
            commands::reset_position,
            commands::open_target,
            commands::server_info,
        ])
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let store: Arc<dyn Store> = Arc::new(JsonStore::load(data_dir.join("store.json"))?);
            let ui = store.snapshot()?.ui;

            // Commands reach the store through Tauri's managed state; the HTTP
            // server gets its own handle to the same `Arc`.
            app.manage(AppState { store: store.clone() });
            let server_state = Arc::new(AppState { store });

            let win = app
                .get_webview_window("hud")
                .expect("window `hud` is declared in tauri.conf.json");

            setup_window(&win, &ui);
            setup_tray(app.handle())?;

            // Event bus runs in-process; no sidecar to supervise.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(server::serve(server_state, handle));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Workhub");
}

fn setup_window(win: &WebviewWindow, ui: &model::UiState) {
    // No native vibrancy here, deliberately.
    //
    // NSVisualEffectView fills the *window*, but the island morphs an *element*
    // inside it, so a frosted rectangle would flash around the pill for the
    // duration of every collapse. A Dynamic Island is opaque anyway, so CSS owns
    // the whole surface and the blur follows the shape exactly.

    let expanded = !ui.collapsed;
    let (w, h) = if expanded { window::EXPANDED } else { window::COLLAPSED };
    let _ = win.set_size(tauri::LogicalSize::new(w, h));
    window::restore_position(win, ui.position, w, h);

    // Follow the user across Spaces — a status HUD that vanishes on Space switch
    // is not a status HUD.
    let _ = win.set_visible_on_all_workspaces(true);
    let _ = win.show();
}

/// The tray is the only way to quit: `LSUIElement` in Info.plist removes the
/// Dock icon, so without this menu there is no exit.
fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let toggle = MenuItem::with_id(app, "toggle", "Show / Hide HUD", true, None::<&str>)?;
    let reset = MenuItem::with_id(app, "reset", "Recentre Island", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Workhub", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &reset, &sep, &quit])?;

    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))?;

    TrayIconBuilder::with_id("workhub-tray")
        .icon(icon)
        .icon_as_template(true) // let macOS tint it for light/dark menu bars
        .tooltip("Workhub")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let Some(win) = app.get_webview_window("hud") else { return };
            match event.id().as_ref() {
                "toggle" => {
                    if win.is_visible().unwrap_or(false) {
                        let _ = win.hide();
                    } else {
                        let _ = win.show();
                    }
                }
                "reset" => {
                    let collapsed = app
                        .state::<AppState>()
                        .store
                        .snapshot()
                        .map(|s| s.ui.collapsed)
                        .unwrap_or(true);
                    let width = if collapsed { window::COLLAPSED.0 } else { window::EXPANDED.0 };
                    window::place_top_centre(&win, width);
                }
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}
