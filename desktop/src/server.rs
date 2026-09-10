//! Local event bus: an axum server on 127.0.0.1:8787.
//!
//! Loopback-only and unauthenticated — see the README's Limitations section.
//! Runs inside the app process, so there is no sidecar to launch or supervise.

use crate::model::EventPayload;
use crate::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::json;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tower_http::cors::CorsLayer;

pub const PORT: u16 = 8787;

/// Emitted after every mutation; the frontend re-fetches on receipt.
pub const STATE_EVENT: &str = "workhub://state";

#[derive(Clone)]
struct Ctx {
    state: Arc<AppState>,
    app: AppHandle,
}

pub async fn serve(state: Arc<AppState>, app: AppHandle) {
    let ctx = Ctx { state, app: app.clone() };

    let router = Router::new()
        .route("/health", get(health))
        .route("/state", get(get_state))
        .route("/events", post(post_event))
        .layer(CorsLayer::permissive()) // so a browser-extension bridge can post later
        .with_state(ctx);

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], PORT));
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            // Fail loudly: a silently-dead event bus is the worst outcome here,
            // because the HUD would look fine while ingesting nothing.
            let msg = format!("Workhub could not bind 127.0.0.1:{PORT} — {e}");
            eprintln!("[workhub] {msg}");
            let _ = app.emit("workhub://server-error", msg);
            return;
        }
    };

    println!("[workhub] event bus listening on http://127.0.0.1:{PORT}");
    if let Err(e) = axum::serve(listener, router).await {
        eprintln!("[workhub] server stopped: {e}");
    }
}

async fn health() -> impl IntoResponse {
    Json(json!({
        "ok": true,
        "service": "workhub",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

async fn get_state(State(ctx): State<Ctx>) -> impl IntoResponse {
    match ctx.state.store.snapshot() {
        Ok(s) => (StatusCode::OK, Json(json!(s))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        ),
    }
}

async fn post_event(
    State(ctx): State<Ctx>,
    Json(payload): Json<EventPayload>,
) -> impl IntoResponse {
    match ctx.state.store.ingest_event(payload) {
        Ok(event) => {
            // Carry the id of what just landed. UI-driven mutations broadcast
            // `None`, so only a genuine agent report can raise an alert.
            let _ = ctx.app.emit(STATE_EVENT, Some(event.id.clone()));
            (StatusCode::CREATED, Json(json!({ "ok": true, "event": event })))
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": e.to_string() })),
        ),
    }
}
