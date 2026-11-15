// Public Audius API key for browser-side read-only catalog requests.
// Never put an Audius Bearer Token or API Secret in VITE_* variables.
export const AUDIUS_API_KEY = import.meta.env.VITE_AUDIUS_API_KEY || "";
export const AUDIUS_API_BASE = "https://api.audius.co/v1";
export const AUDIUS_APP_NAME = "7KAZ MUSIC";
