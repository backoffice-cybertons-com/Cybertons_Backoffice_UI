import * as signalR from "@microsoft/signalr";

// ─────────────────────────────────────────────────────────────────────────────
// Environment-aware API base URL
//   Development  → REACT_APP_API_URL in .env.development  (e.g. https://localhost:7067)
//   Staging      → REACT_APP_API_URL in .env.staging       (e.g. https://staging-api.domain.com)
//   Production   → REACT_APP_API_URL in .env               (e.g. https://api.domain.com)
//
// CRA automatically picks the right .env file based on NODE_ENV.
// Strip any trailing slash so hub paths concatenate cleanly.
// ─────────────────────────────────────────────────────────────────────────────
const rawBaseUrl = process.env.REACT_APP_API_URL || "https://api.cybertons.com";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

// ─────────────────────────────────────────────────────────────────────────────
// Hub endpoint paths — extend this object when you add new hubs
// ─────────────────────────────────────────────────────────────────────────────
export const HUB_PATHS = {
  CHAT:          "/chatHub",
  NOTIFICATIONS: "/notificationHub",
  PRESENCE:      "/presenceHub",   // online users / typing indicators
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom exponential-backoff reconnect delays (ms)
// SignalR will attempt reconnect at these intervals before giving up.
// Production pattern: 0 s → 2 s → 10 s → 30 s → 60 s … (capped at 60 s)
// ─────────────────────────────────────────────────────────────────────────────
export const RECONNECT_DELAYS = [0, 2000, 10000, 30000, 60000];

// ─────────────────────────────────────────────────────────────────────────────
// Per-environment log level
// ─────────────────────────────────────────────────────────────────────────────
export const LOG_LEVEL =
  process.env.NODE_ENV === "production"
    ? signalR.LogLevel.Warning
    : signalR.LogLevel.Information;

// ─────────────────────────────────────────────────────────────────────────────
// Transport priority: WebSockets first, SSE as fallback, then Long Polling.
// Use HttpTransportType bitmask to enable all — SignalR negotiates downward.
// ─────────────────────────────────────────────────────────────────────────────
export const TRANSPORT_TYPE =
  signalR.HttpTransportType.WebSockets |
  signalR.HttpTransportType.ServerSentEvents |
  signalR.HttpTransportType.LongPolling;
