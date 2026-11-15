const BASE = "https://api.audius.co/v1";
const API_KEY = import.meta.env.VITE_AUDIUS_API_KEY || "";
const APP_NAME = "7KAZ-MUSIC";

async function request(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("app_name", APP_NAME);
  if (API_KEY) url.searchParams.set("api_key", API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Audius API error (${response.status})`);
  const payload = await response.json();
  return payload.data ?? [];
}

export async function getTrending(limit = 24) {
  return request("/tracks/trending", { limit, time: "week" });
}

export async function searchTracks(query, limit = 30) {
  return request("/tracks/search", { query, limit });
}

export function streamUrl(trackId) {
  const url = new URL(`${BASE}/tracks/${encodeURIComponent(trackId)}/stream`);
  url.searchParams.set("app_name", APP_NAME);
  if (API_KEY) url.searchParams.set("api_key", API_KEY);
  return url.toString();
}

export function coverUrl(track, size = 480) {
  const artwork = track?.artwork;
  if (!artwork) return "";
  return artwork[`_${size}x${size}`] || artwork["_150x150"] || artwork["150x150"] || "";
}

export function normalizeTrack(track) {
  return {
    id: String(track.id),
    title: track.title || "Untitled",
    artist: track.user?.name || track.user?.handle || "Unknown artist",
    artistHandle: track.user?.handle || "",
    album: track.playlist_name || "Audius",
    duration: Number(track.duration || 0),
    artwork: coverUrl(track),
    permalink: track.permalink ? `https://audius.co${track.permalink}` : "https://audius.co",
    stream: streamUrl(track.id),
    plays: Number(track.play_count || 0),
    genre: track.genre || "Music"
  };
}
