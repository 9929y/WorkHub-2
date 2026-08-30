//! HUD window geometry: top-right placement and collapse/expand sizing.
//!
//! All maths happens in **logical** pixels inside a monitor's *work area* — the
//! region excluding the menu bar and the Dock — so nothing has to guess at
//! system chrome.

use tauri::{LogicalPosition, LogicalSize, Monitor, WebviewWindow};

/// The three shapes the window takes.
///
/// `Alert` is the transient toast the island morphs into when an agent reports:
/// wide enough for "which platform, what it needs", and nothing more.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Shape {
    Island,
    Alert,
    Panel,
}

impl Shape {
    pub fn parse(s: &str) -> Self {
        match s {
            "alert" => Shape::Alert,
            "panel" => Shape::Panel,
            _ => Shape::Island,
        }
    }

    pub fn size(self) -> (f64, f64) {
        match self {
            Shape::Island => ISLAND,
            Shape::Alert => ALERT,
            Shape::Panel => PANEL,
        }
    }
}

/// The island: a pill under the notch. Wide enough for a row of platform marks.
pub const ISLAND: (f64, f64) = (224.0, 36.0);
/// The toast: one arrival, readable at a glance.
pub const ALERT: (f64, f64) = (340.0, 78.0);
/// The panel: the queue, or the status board when the queue is empty.
pub const PANEL: (f64, f64) = (360.0, 420.0);

/// Gap from the work-area edges.
const MARGIN: f64 = 6.0;

/// Every shape shares this radius.
///
/// NSVisualEffectView is rounded once, at the window level, so the frost cannot
/// have a different corner from the shape drawn on top of it. The island is
/// 36pt tall, so its pill radius is 18, and everything else matches it.
pub const RADIUS: f64 = 18.0;

/// Frame-animation timings. Must match --morph-in / --morph-out in tokens.css.
/// Exit is deliberately shorter: closing should not be narrated.
const MORPH_IN_MS: u64 = 260;
const MORPH_OUT_MS: u64 = 200;

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

/// Park the island at top centre of the primary display's work area, directly
/// under the notch / menu bar.
///
/// It sits *below* the menu bar rather than over it: drawing above the menu bar
/// needs a status-level window and would cover the very thing the notch sits in.
pub fn place_top_centre(win: &WebviewWindow, width: f64) {
    if let Some(a) = default_area(win) {
        let _ = win.set_position(LogicalPosition::new(
            (a.x + (a.w - width) / 2.0).round(),
            a.y + MARGIN,
        ));
    }
}

/// Restore a remembered position, falling back to the corner if that position is
/// no longer on any display (an external monitor was unplugged, say).
pub fn restore_position(win: &WebviewWindow, saved: Option<[f64; 2]>, width: f64, height: f64) {
    let Some([x, y]) = saved else {
        place_top_centre(win, width);
        return;
    };
    match area_at(win, x, y) {
        Some(a) => {
            let _ = win.set_position(clamp_into(a, x, y, width, height));
        }
        None => place_top_centre(win, width),
    }
}

/// Keep a window fully inside a work area where it fits, and flush to the
/// top-left of that area where it does not.
fn clamp_into(a: Area, x: f64, y: f64, w: f64, h: f64) -> LogicalPosition<f64> {
    let max_x = (a.x + a.w - w - MARGIN).max(a.x);
    let max_y = (a.y + a.h - h - MARGIN).max(a.y);
    LogicalPosition::new(x.clamp(a.x, max_x), y.clamp(a.y, max_y))
}

/// Panel height bounds. The floor keeps a one-line panel from looking broken;
/// the ceiling stops a long list from covering half the desktop.
pub const PANEL_MIN_H: f64 = 96.0;
pub const PANEL_MAX_H: f64 = 520.0;

/// Resize the expanded panel to the height its content actually needs, so the
/// window never sits over the desktop as a transparent, click-swallowing slab.
pub fn set_panel_height(win: &WebviewWindow, height: f64) {
    let h = height.clamp(PANEL_MIN_H, PANEL_MAX_H);
    let scale = win.scale_factor().unwrap_or(2.0);
    let before = win
        .outer_position()
        .ok()
        .zip(win.outer_size().ok())
        .map(|(p, s)| (p.x as f64 / scale, p.y as f64 / scale, s.width as f64 / scale));

    let _ = win.set_size(LogicalSize::new(PANEL.0, h));

    if let Some((x, y, old_w)) = before {
        let centre = x + old_w / 2.0;
        let new_x = (centre - PANEL.0 / 2.0).round();
        let pos = match area_at(win, x, y).or_else(|| default_area(win)) {
            Some(a) => clamp_into(a, new_x, y, PANEL.0, h),
            None => LogicalPosition::new(new_x, y),
        };
        let _ = win.set_position(pos);
    }
}

/// Animate the window frame. AppKit does the interpolation; see frame_anim.rs
/// for why hand-rolling it was wrong.
pub fn animate_to(win: &WebviewWindow, to_w: f64, to_h: f64) {
    let scale = win.scale_factor().unwrap_or(2.0);
    let Ok(pos) = win.outer_position() else { return };
    let Ok(size) = win.outer_size() else { return };
    let (from_w, from_h) = (size.width as f64 / scale, size.height as f64 / scale);
    let (x, y) = (pos.x as f64 / scale, pos.y as f64 / scale);

    if (from_w - to_w).abs() < 0.5 && (from_h - to_h).abs() < 0.5 {
        return;
    }

    // Keep the horizontal centre fixed so everything unfolds straight down from
    // the island, then clamp so a taller shape cannot run off the screen.
    let centre = x + from_w / 2.0;
    let area = area_at(win, x, y).or_else(|| default_area(win));
    let (new_x, new_y) = match area {
        Some(a) => {
            let p = clamp_into(a, centre - to_w / 2.0, y, to_w, to_h);
            (p.x, p.y)
        }
        None => (centre - to_w / 2.0, y),
    };

    // Growing gets the longer duration; closing is not narrated.
    let growing = to_w * to_h >= from_w * from_h;
    let ms = if growing { MORPH_IN_MS } else { MORPH_OUT_MS };

    if let Ok(ns) = win.ns_window() {
        crate::frame_anim::animate_frame(ns, new_x.round(), new_y, to_w, to_h, ms as f64 / 1000.0);
    } else {
        let _ = win.set_size(LogicalSize::new(to_w, to_h));
        let _ = win.set_position(LogicalPosition::new(new_x.round(), new_y));
    }
}

/// Resize to a shape, keeping the **horizontal centre fixed** so everything
/// unfolds straight down from the island, the way a notch island does.
/// `height` lets the panel animate straight to its measured content height,
/// instead of opening at the 420px default and then settling to the real size.
pub fn set_shape(win: &WebviewWindow, shape: Shape, height: Option<f64>, instant: bool) {
    let (w, h) = shape.size();
    let h = match (shape, height) {
        (Shape::Panel, Some(px)) => px.clamp(PANEL_MIN_H, PANEL_MAX_H),
        _ => h,
    };
    // A user who asked for less motion was still getting a springing window:
    // prefers-reduced-motion reached the CSS but never the frame.
    if instant {
        set_shape_instant(win, w, h);
    } else {
        animate_to(win, w, h);
    }
}

fn set_shape_instant(win: &WebviewWindow, w: f64, h: f64) {

    let scale = win.scale_factor().unwrap_or(2.0);
    let before = win
        .outer_position()
        .ok()
        .zip(win.outer_size().ok())
        .map(|(p, s)| (p.x as f64 / scale, p.y as f64 / scale, s.width as f64 / scale));

    let _ = win.set_size(LogicalSize::new(w, h));

    if let Some((x, y, old_w)) = before {
        let centre = x + old_w / 2.0;
        let new_x = (centre - w / 2.0).round();
        let area = area_at(win, x, y).or_else(|| default_area(win));
        let pos = match area {
            Some(a) => clamp_into(a, new_x, y, w, h),
            None => LogicalPosition::new(new_x, y),
        };
        let _ = win.set_position(pos);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The island is a pill, so its radius is half its height. Every other shape
    /// shares that radius because the frost is rounded once, at the window.
    #[test]
    fn radius_is_the_island_pill() {
        assert_eq!(RADIUS, ISLAND.1 / 2.0);
    }

    /// The CSS must not set its own size: the window animates the frame, and a
    /// second animation on the same dimension would make the frost lag the shape.
    #[test]
    fn css_does_not_animate_size() {
        let css = std::fs::read_to_string(
            concat!(env!("CARGO_MANIFEST_DIR"), "/../src/styles/glass.css"),
        )
        .expect("glass.css should sit next to the crate");
        let morph = css
            .split(".morph {")
            .nth(1)
            .and_then(|s| s.split('}').next())
            .expect(".morph rule not found");
        // Look at the transition DECLARATION, not the whole block: `width: 100%`
        // is exactly what should be there.
        let transition = morph
            .split("transition:")
            .nth(1)
            .and_then(|s| s.split(';').next())
            .unwrap_or("");
        assert!(
            !transition.contains("width") && !transition.contains("height"),
            "`transition: {transition}` animates size; window::animate_to owns the frame"
        );
        assert!(morph.contains("width: 100%"), ".morph should fill the window");
    }

    /// `.morph` fills the window exactly, so an OUTER box-shadow lands outside
    /// the window and gets clipped against its edge, painting hard dark bands
    /// down the sides. Depth belongs to the compositor. This regressed twice.
    #[test]
    fn morph_has_no_outer_shadow() {
        // `.morph` clips its children, so an outer shadow anywhere inside it is
        // clipped too. Checking only `.morph` let `.island` keep one.
        let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/../src/styles/");
        for (file, selector) in [("glass.css", ".morph {"), ("components.css", ".island {")] {
            let css = std::fs::read_to_string(format!("{dir}{file}"))
                .unwrap_or_else(|_| panic!("{file} should sit next to the crate"));
            let Some(block) = css.split(selector).nth(1).and_then(|s| s.split('}').next()) else {
                continue;
            };
            let shadow = block
                .split("box-shadow:")
                .nth(1)
                .and_then(|s| s.split(';').next())
                .unwrap_or("");
            for layer in shadow.split(',') {
                let layer = layer.trim();
                if layer.is_empty() {
                    continue;
                }
                assert!(
                    layer.starts_with("inset"),
                    "{selector} has outer shadow layer `{layer}`; it will be clipped by .morph"
                );
            }
        }
    }

    /// The radius in CSS has to match the radius the vibrancy view was given.
    #[test]
    fn css_radius_matches_the_frost() {
        let tokens = std::fs::read_to_string(
            concat!(env!("CARGO_MANIFEST_DIR"), "/../src/styles/tokens.css"),
        )
        .expect("tokens.css should sit next to the crate");
        let found = tokens
            .split("--r-shape:")
            .nth(1)
            .and_then(|s| s.split("px").next())
            .and_then(|s| s.trim().parse::<f64>().ok())
            .expect("--r-shape not found");
        assert_eq!(found, RADIUS, "CSS --r-shape and window::RADIUS disagree");
    }
}
