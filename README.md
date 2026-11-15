# #7KAZ MUSIC

React + Vite music discovery web app with an iOS-inspired mobile layout.

## Catalog sources
- **Audius:** discovery, search, and streaming for tracks available through Audius.
- **iTunes Search:** metadata, artwork, and short previews where provided.
- **YouTube:** official embedded video playback when the user supplies a video URL.
- **Spotify Embed:** official playlist and track embeds; no Spotify API key is needed for the embeds included in this project. Playback, availability, and account restrictions are controlled by Spotify.

The Spotify page includes the playlist `4z23IV1U9IF7ll70s9muMA` and track `0Lr4kGOYn9l83EjuK6cZFQ` supplied by the project owner.

## Setup
1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env` if you want to add a public read-only Audius API key.
3. Run `npm install`.
4. Run `npm run dev` for local development.
5. Run `npm run build` before deployment.

## Important
- Spotify Embed is not Spotify Web API. It does not provide full-catalog search or direct audio files.
- iTunes previews are generally short samples, not full-length tracks.
- No provider guarantees that every commercially released song is available.
- Deploy over HTTPS for browser media and notification features. Android WebView packaging may require native configuration for reliable media notifications.
- Do not put private API secrets or user access tokens in `VITE_` variables; Vite exposes them in the public client bundle.
