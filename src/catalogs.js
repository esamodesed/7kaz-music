import { getTrending, searchTracks as searchAudius, normalizeTrack as normalizeAudius } from './audius';

const ITUNES = 'https://itunes.apple.com';

async function jsonFetch(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

function normalizeItunes(t) {
  if (!t.previewUrl) return null;
  return {
    id: `itunes-${t.trackId}`, title: t.trackName || 'Unknown track',
    artist: t.artistName || 'Unknown artist', album: t.collectionName || 'iTunes',
    duration: Math.round((t.trackTimeMillis || 30000) / 1000),
    artwork: (t.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
    stream: t.previewUrl, plays: 0, genre: t.primaryGenreName || 'Music', source: 'iTunes',
    externalUrl: t.trackViewUrl || ''
  };
}

export async function getDiscovery() {
  const jobs = [
    getTrending(24).then(rows => rows.map(t => ({ ...normalizeAudius(t), source: 'Audius' }))),
    searchItunes('top hits', 12)
  ];
  const results = await Promise.allSettled(jobs);
  const merged = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  return unique(merged);
}

export async function searchItunes(query, limit = 20) {
  const url = new URL(`${ITUNES}/search`);
  url.searchParams.set('term', query); url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', String(limit)); url.searchParams.set('media', 'music');
  const data = await jsonFetch(url.toString());
  return (data.results || []).map(normalizeItunes).filter(Boolean);
}


export async function searchEverywhere(query, limit = 20) {
  const jobs = [
    searchAudius(query, limit).then(rows => rows.map(t => ({ ...normalizeAudius(t), source: 'Audius' }))),
    searchItunes(query, limit)
  ];
  const results = await Promise.allSettled(jobs);
  const tracks = unique(results.flatMap(r => r.status === 'fulfilled' ? r.value : []));
  if (!tracks.length) throw new Error('No tracks returned from available catalogs');
  return tracks;
}

function unique(tracks) {
  const seen = new Set();
  return tracks.filter(t => {
    const key = `${t.title}|${t.artist}`.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (seen.has(key)) return false; seen.add(key); return true;
  });
}
