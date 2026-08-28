//! HUD window geometry: top-right placement and collapse/expand sizing.
//!
//! All maths happens in **logical** pixels inside a monitor's *work area* — the
//! region excluding the menu bar and the Dock — so nothing has to guess at
//! system chrome.

use tauri::{LogicalPosition, LogicalSize, Monitor, WebviewWindow};

pub const COLLAPSED: (f64, f64) = (320.0, 96.0);
pub const EXPANDED: (f64, f64) = (420.0, 620.0);

/// Gap from the work-area edges.
const MARGIN: f64 = 8.0;

/// A monitor's work area in logical pixels: `(x, y, width, height)`.
#[derive(Clone, Copy, Debug)]
struct Area {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

impl Area {
    fn of(monitor: &Monitor) -> Self {
        let scale = monitor.scale_factor();
        let wa = monitor.work_area();
        Self {
            x: wa.position.x as f64 / scale,
            y: wa.position.y as f64 / scale,
            w: wa.size.width as f64 / scale,
            h: wa.size.height as f64 / scale,
        }
    }

    fn contains(&self, x: f64, y: f64) -> bool {
        x >= self.x && x < self.x + self.w && y >= self.y && y < self.y + self.h
    }
}

/// Where the HUD belongs by default.
///
/// The **primary** monitor, not `current_monitor()`. The primary display is the
/// one with the menu bar, which is where the tray icon lives and where the user
/// expects a status HUD. `current_monitor()` reports whichever display the
/// window happens to overlap before it has been placed, which on a multi-display
/// setup can be a screen the user is not even looking at.
fn default_area(win: &WebviewWindow) -> Option<Area> {
    win.primary_monitor()
        .ok()
        .flatten()
        .or_else(|| win.current_monitor().ok().flatten())
        .map(|m| Area::of(&m))
}

/// The work area of whichever monitor contains the given logical point.
fn area_at(win: &WebviewWindow, x: f64, y: f64) -> Option<Area> {
    let areas: Vec<Area> = win
        .available_monitors()
        .ok()?
        .iter()
        .map(Area::of)
        .collect();
    areas.into_iter().find(|a| a.contains(x, y))
}

/// Park the HUD in the top-right corner of the primary display's work area.
pub fn place_top_right(win: &WebviewWindow, width: f64) {
    if let Some(a) = default_area(win) {
        let _ = win.set_position(LogicalPosition::new(a.x + a.w - width - MARGIN, a.y + MARGIN));
    }
}

/// Restore a remembered position, falling back to the corner if that position is
/// no longer on any display (an external monitor was unplugged, say).
pub fn restore_position(win: &WebviewWindow, saved: Option<[f64; 2]>, width: f64, height: f64) {
    let Some([x, y]) = saved else {
        place_top_right(win, width);
        return;
    };
    match area_at(win, x, y) {
        Some(a) => {
            let _ = win.set_position(clamp_into(a, x, y, width, height));
        }
        None => place_top_right(win, width),
    }
}

/// Keep a window fully inside a work area where it fits, and flush to the
/// top-left of that area where it does not.
fn clamp_into(a: Area, x: f64, y: f64, w: f64, h: f64) -> LogicalPosition<f64> {
    let max_x = (a.x + a.w - w - MARGIN).max(a.x);
    let max_y = (a.y + a.h - h - MARGIN).max(a.y);
    LogicalPosition::new(x.clamp(a.x, max_x), y.clamp(a.y, max_y))
}

/// Resize between collapsed and expanded, keeping the **right edge anchored** so
/// the panel grows down-and-left, then clamping so the taller panel cannot run
/// off the bottom of the screen.
pub fn set_expanded(win: &WebviewWindow, expanded: bool) {
    let (w, h) = if expanded { EXPANDED } else { COLLAPSED };

    let scale = win.scale_factor().unwrap_or(2.0);
    let before = win
        .outer_position()
        .ok()
        .zip(win.outer_size().ok())
        .map(|(p, s)| {
            (
                p.x as f64 / scale,
                p.y as f64 / scale,
                s.width as f64 / scale,
            )
        });

    let _ = win.set_size(LogicalSize::new(w, h));

    if let Some((x, y, old_w)) = before {
        // Anchor the right edge: the left edge moves, the corner stays put.
        let new_x = x + old_w - w;
        let area = area_at(win, x, y).or_else(|| default_area(win));
        let pos = match area {
            Some(a) => clamp_into(a, new_x, y, w, h),
            None => LogicalPosition::new(new_x, y),
        };
        let _ = win.set_position(pos);
    }
}
