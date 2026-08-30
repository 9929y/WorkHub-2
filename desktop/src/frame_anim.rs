//! Frame animation, done by AppKit rather than by hand.
//!
//! The first version was a Rust loop calling `set_size` every 8ms. Measurement
//! killed it: the display refreshes every 16.67ms while the loop wrote every
//! 9.84ms, so **1.7 writes landed per presented frame**. The screen showed
//! whichever write happened to precede each vsync, which made the size deltas
//! between visible frames irregular. That reads as judder, and no easing curve
//! fixes it, because the animation was never phase-locked to the display.
//! `set_size` itself was never the problem: it measured 39µs worst case.
//!
//! `NSAnimationContext` hands the frame to Core Animation instead: locked to
//! vsync, interpolated on the compositor, with the vibrancy view and the window
//! shadow animated along with it by AppKit.

#[cfg(target_os = "macos")]
pub fn animate_frame(ns_window: *mut std::ffi::c_void, x: f64, y: f64, w: f64, h: f64, secs: f64) {
    use objc2::rc::Retained;
    use objc2_app_kit::{NSAnimatablePropertyContainer, NSAnimationContext, NSWindow};
    use objc2_foundation::{NSPoint, NSRect, NSSize};

    if ns_window.is_null() {
        return;
    }

    // SAFETY: Tauri hands us the live NSWindow backing this webview window, and
    // commands are dispatched on the main thread.
    let window: Retained<NSWindow> = match unsafe { Retained::retain(ns_window.cast()) } {
        Some(w) => w,
        None => return,
    };

    // AppKit's origin is bottom-left; the rest of this codebase is top-left, so
    // the caller passes a top-left rect and it is flipped against the screen.
    let screen_h = window.screen().map(|s| s.frame().size.height).unwrap_or(0.0);
    let frame = NSRect::new(NSPoint::new(x, screen_h - y - h), NSSize::new(w, h));

    NSAnimationContext::beginGrouping();
    NSAnimationContext::currentContext().setDuration(secs);
    window.animator().setFrame_display(frame, true);
    NSAnimationContext::endGrouping();
}

#[cfg(not(target_os = "macos"))]
pub fn animate_frame(_: *mut std::ffi::c_void, _: f64, _: f64, _: f64, _: f64, _: f64) {}
