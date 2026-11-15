import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines, Disc3, Heart, Home, ListMusic, Menu, Pause, Play, Repeat,
  Repeat1, Search, SkipBack, SkipForward, Shuffle, Volume2, X, Headphones,
  Sparkles, ExternalLink, LoaderCircle, Music2, Youtube, MoreVertical,
  Users, Info, PlayCircle
} from "lucide-react";
import { getDiscovery, searchEverywhere } from "./catalogs";

const fmt = (n = 0) => !Number.isFinite(n) ? "0:00" : `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
const ytId = (value) => {
  try {
    const u = new URL(value);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0];
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2];
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2];
      return u.searchParams.get("v") || "";
    }
  } catch {}
  return "";
};
const developerPicks = [
  { name: "Kahitna", note: "Pilihan musik", query: "Kahitna" },
  { name: "Takkan Terganti", note: "Lagu favorit", query: "Takkan Terganti" },
  { name: "Hindia", note: "Pilihan musik", query: "Hindia" },
  { name: "Taylor Swift", note: "Developer favorite", query: "Taylor Swift" },
  { name: "Love Story", note: "Taylor Swift · Fan favorite", query: "Taylor Swift Love Story" },
  { name: "Pop Indonesia", note: "Lagu populer Indonesia", query: "lagu pop Indonesia" },
  { name: "Lagu Galau", note: "Temani suasana", query: "lagu galau Indonesia" }
];

export default function App() {
  const audio = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("home");
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem("7kaz-favs") || "[]"); } catch { return []; } });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(.8);
  const [repeat, setRepeat] = useState("all");
  const [shuffle, setShuffle] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [thanksOpen, setThanksOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() => typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeId, setYoutubeId] = useState("");
  const [youtubeError, setYoutubeError] = useState("");
  const [queue, setQueue] = useState([]);

  const loadTrending = async () => {
    setLoading(true); setError("");
    try { setTracks(await getDiscovery()); }
    catch { setError("Katalog musik belum bisa dimuat. Periksa koneksi internet, lalu coba lagi."); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadTrending(); }, []);
  useEffect(() => { localStorage.setItem("7kaz-favs", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);

  // Android lock-screen / notification media card: app name is the album, track title is shown below it.
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title || "Unknown track",
        artist: current.artist || "Unknown artist",
        album: "#7KAZ MUSIC",
        artwork: current.artwork ? [
          { src: current.artwork, sizes: "96x96", type: "image/jpeg" },
          { src: current.artwork, sizes: "256x256", type: "image/jpeg" },
          { src: current.artwork, sizes: "512x512", type: "image/jpeg" }
        ] : []
      });
      navigator.mediaSession.setActionHandler("play", () => setPlaying(true));
      navigator.mediaSession.setActionHandler("pause", () => setPlaying(false));
      navigator.mediaSession.setActionHandler("previoustrack", previousTrack);
      navigator.mediaSession.setActionHandler("nexttrack", nextTrack);
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (audio.current && Number.isFinite(details.seekTime)) audio.current.currentTime = details.seekTime;
      });
    } catch (err) { console.warn("Media Session unavailable", err); }
    return () => {
      try { ["play", "pause", "previoustrack", "nexttrack", "seekto"].forEach(a => navigator.mediaSession.setActionHandler(a, null)); } catch {}
    };
  }, [current]);

  useEffect(() => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  async function enableNotifications() {
    if (!("Notification" in window)) { setNotificationPermission("unsupported"); setNotificationMessage("Browser ini belum mendukung notifikasi web."); return; }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      setNotificationMessage(result === "granted" ? "Notifikasi berhasil diaktifkan." : result === "denied" ? "Izin ditolak. Ubah dari pengaturan situs di browser." : "Izin notifikasi belum diberikan.");
      if (result === "granted") new Notification("#7KAZ MUSIC", { body: current ? `Siap memutar: ${current.title}` : "Notifikasi musik telah aktif.", icon: current?.artwork || "/favicon.svg", tag: "7kaz-ready" });
    } catch { setNotificationMessage("Tidak bisa meminta izin notifikasi. Pastikan situs memakai HTTPS."); }
  }

  useEffect(() => {
    if (!current || !playing || notificationPermission !== "granted") return;
    try { new Notification("#7KAZ MUSIC", { body: `${current.title} — ${current.artist}`, icon: current.artwork || "/favicon.svg", tag: "7kaz-now-playing", silent: true }); } catch {}
  }, [current, playing, notificationPermission]);
  const visible = useMemo(() => tab === "favorites" ? tracks.filter(t => favorites.includes(t.id)) : tracks, [tracks, tab, favorites]);

  async function runSearch(e) {
    e?.preventDefault();
    if (tab === "youtube") {
      const q = query.trim();
      if (q) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (!query.trim()) { setSearching(false); loadTrending(); return; }
    setSearching(true); setLoading(true); setError("");
    try { setTracks(await searchEverywhere(query.trim(), 20)); setTab("home"); }
    catch { setError("Pencarian semua katalog gagal. Coba kata kunci lain atau periksa koneksi."); }
    finally { setLoading(false); }
  }
  function playTrack(track) { setCurrent(track); setPlaying(true); setProgress(0); setDuration(track.duration || 0); setQueue(old => old.length ? old : tracks); }
  function togglePlay() { if (!current) { if (tracks[0]) playTrack(tracks[0]); return; } setPlaying(v => !v); }
  function nextTrack() {
    if (!tracks.length) return;
    const i = tracks.findIndex(t => t.id === current?.id);
    let n = shuffle ? Math.floor(Math.random() * tracks.length) : (i + 1) % tracks.length;
    if (tracks.length > 1 && shuffle && n === i) n = (n + 1) % tracks.length;
    playTrack(tracks[n]);
  }
  function previousTrack() { if (!tracks.length) return; const i = tracks.findIndex(t => t.id === current?.id); playTrack(tracks[(i - 1 + tracks.length) % tracks.length]); }
  function toggleFavorite(id) { setFavorites(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]); }
  function onEnded() {
    if (repeat === "one" && audio.current) { audio.current.currentTime = 0; audio.current.play().catch(() => setPlaying(false)); }
    else if (repeat === "all" || shuffle) nextTrack(); else { setPlaying(false); setProgress(duration || 0); }
  }
  useEffect(() => { if (!audio.current || !current) return; audio.current.src = current.stream; audio.current.load(); if (playing) audio.current.play().catch(() => setPlaying(false)); }, [current]);
  useEffect(() => { if (!audio.current) return; if (playing && current) audio.current.play().catch(() => setPlaying(false)); else audio.current.pause(); }, [playing]);
  function loadYoutube(e) {
    e.preventDefault(); const id = ytId(youtubeUrl.trim());
    if (!id) { setYoutubeError("Link YouTube tidak valid. Tempel URL video biasa, Shorts, atau youtu.be."); return; }
    setYoutubeError(""); setYoutubeId(id);
  }
  const title = tab === "favorites" ? "Favorit" : tab === "albums" ? "Pilihan developer" : tab === "youtube" ? "YouTube" : tab === "spotify" ? "Spotify" : "Temukan musik";
  const changeTab = (next) => { setTab(next); setMenuOpen(false); if (next !== "home") setSearching(false); };

  return <div className="app">
    <audio ref={audio} onTimeUpdate={e => setProgress(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration || current?.duration || 0)} onEnded={onEnded} />
    <aside className={`sidebar ${menuOpen ? "show" : ""}`}>
      <div className="brand"><div className="brand-icon"><AudioLines size={22}/></div><div>#7KAZ <b>MUSIC</b><small>YOUR SOUND, YOUR SPACE</small></div><button className="mobile-close" onClick={() => setMenuOpen(false)}><X/></button></div>
      <div className="side-label">LIBRARY</div>
      <button className={`nav ${tab === "home" ? "active" : ""}`} onClick={() => changeTab("home")}><Home/> Discover</button>
      <button className={`nav ${tab === "albums" ? "active" : ""}`} onClick={() => changeTab("albums")}><ListMusic/> Developer picks</button>
      <button className={`nav ${tab === "favorites" ? "active" : ""}`} onClick={() => changeTab("favorites")}><Heart/> Favorites <span>{favorites.length}</span></button>
      <button className={`nav ${tab === "youtube" ? "active" : ""}`} onClick={() => changeTab("youtube")}><Youtube/> YouTube player</button>
      <div className="sidebar-bottom"><div className="side-card"><Sparkles size={18}/><b>Find your next favorite.</b><p>Search Audius, iTunes previews, Jamendo, and YouTube.</p></div><small className="side-foot">#7KAZ MUSIC · LISTEN YOUR WAY</small></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="hamburger" onClick={() => setMenuOpen(true)}><Menu/></button>
        <div className="crumb">#7KAZ MUSIC <span>/</span> {title}</div>
        <form className="search" onSubmit={runSearch}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tab === "youtube" ? "Cari di YouTube..." : "Cari lagu, artis, atau genre..."}/>{query && <button type="button" onClick={()=>setQuery("")}><X size={15}/></button>}</form>
        <button className="search-btn" onClick={runSearch}>Search</button>
        <div className="more-wrap"><button className="more-btn" aria-label="More options" onClick={()=>setMoreOpen(v=>!v)}><MoreVertical/></button>{moreOpen && <div className="more-menu"><button onClick={()=>{setThanksOpen(true);setMoreOpen(false)}}><Users size={16}/> Thanks to</button><button onClick={()=>{enableNotifications();setMoreOpen(false)}}><Info size={16}/> {notificationPermission === "granted" ? "Notifications on" : "Enable notifications"}</button><button onClick={()=>{setThanksOpen(true);setMoreOpen(false)}}><Info size={16}/> About #7KAZ</button></div>}</div>
      </header>

      <div className="content">
        {tab === "home" && !searching && <section className="hero"><div className="hero-text"><div className="kicker"><span/> THE SOUND OF NOW</div><h1>Music for<br/><em>every mood.</em></h1><p>Jelajahi beberapa katalog musik, dengarkan preview, dan simpan lagu favoritmu.</p><button className="hero-cta" onClick={()=>changeTab("youtube")}><Headphones size={17}/> Find your music</button></div><div className="hero-visual"><div className="halo halo-a"/><div className="halo halo-b"/><div className="vinyl"><div className="vinyl-label"><AudioLines size={31}/></div></div><div className="floating f1">♫</div><div className="floating f2">✦</div><div className="visual-tag">PLAY<br/>YOUR WAY</div></div><div className="hero-bottom">#7KAZ <b>·</b> LISTEN WITHOUT LIMITS</div></section>}

        {tab === "home" && !searching && <section className="catalog-strip"><div><b>Multi-catalog search</b><span>Audius · iTunes · YouTube · Spotify Embed</span></div><small>Spotify diputar melalui embed resmi.</small></section>}

        {tab === "spotify" ? <section className="spotify-section"><div className="kicker red">SPOTIFY EMBED PLAYER</div><h2>Your Spotify corner</h2><p className="section-desc">Putar playlist dan lagu pilihan lewat pemutar resmi Spotify. Tidak perlu Spotify API key untuk menampilkan embed ini; ketersediaan dan durasi pemutaran mengikuti Spotify dan akun pengguna.</p><div className="spotify-feature"><div className="spotify-feature-head"><div><b>7KAZ · Playlist</b><span>Spotify playlist</span></div><a href="https://open.spotify.com/playlist/4z23IV1U9IF7ll70s9muMA" target="_blank" rel="noreferrer">Open Spotify <ExternalLink size={14}/></a></div><iframe title="7KAZ Spotify playlist" src="https://open.spotify.com/embed/playlist/4z23IV1U9IF7ll70s9muMA?utm_source=generator&theme=0" width="100%" height="352" style={{minHeight:360}} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"/></div><div className="spotify-feature"><div className="spotify-feature-head"><div><b>Developer track pick</b><span>Single track embed</span></div><a href="https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ" target="_blank" rel="noreferrer">Open track <ExternalLink size={14}/></a></div><iframe title="7KAZ Spotify track" src="https://open.spotify.com/embed/track/0Lr4kGOYn9l83EjuK6cZFQ?utm_source=generator&theme=0" width="100%" height="152" style={{border:0,borderRadius:12}} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"/></div></section> : null}
        {tab === "youtube" ? <section className="youtube-section"><div className="kicker red">YOUTUBE VIDEO PLAYER</div><h2>Play from YouTube</h2><p className="section-desc">Cari judul lagu di YouTube, lalu tempel link video pilihanmu untuk memutarnya di sini. Lagu komersial tersedia sesuai katalog dan pengaturan pemilik video.</p><form className="youtube-form" onSubmit={loadYoutube}><input value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)} placeholder="Tempel link YouTube di sini..."/><button type="submit"><PlayCircle size={17}/> Play video</button></form>{youtubeError && <div className="error">{youtubeError}</div>}{youtubeId ? <div className="youtube-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0`} title="#7KAZ YouTube player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div> : <div className="youtube-placeholder"><Youtube size={48}/><b>YouTube player ready</b><span>Tempel link video YouTube untuk mulai memutar. Player akan tetap tersedia sampai kamu memilih lagu lain.</span></div>}<a className="youtube-open" href="https://music.youtube.com/" target="_blank" rel="noreferrer">Open YouTube Music <ExternalLink size={14}/></a></section> : null}

        {tab === "albums" ? <><section className="section-head"><div><div className="kicker red">DEVELOPER'S FAVORITES</div><h2>Top music picks</h2></div></section><div className="pick-grid">{developerPicks.map((pick,i)=><a className="pick-card" key={pick.name} href={`https://music.youtube.com/search?q=${encodeURIComponent(pick.query)}`} target="_blank" rel="noreferrer"><div className="pick-number">0{i+1}</div><div className="pick-art"><Disc3 size={34}/></div><b>{pick.name}</b><span>{pick.note}</span><ExternalLink size={15}/></a>)}</div><p className="picks-note">Daftar pilihan musik dari developer #7KAZ MUSIC. Klik kartu untuk mencari di YouTube Music.</p></> : null}

        {(tab === "home" || tab === "favorites") && <><section className="section-head"><div><div className="kicker red">{searching ? "SEARCH RESULTS" : tab === "favorites" ? "YOUR COLLECTION" : "MADE FOR DISCOVERY"}</div><h2>{searching ? `Hasil untuk “${query}”` : tab === "favorites" ? "Your favorites" : "Discover across catalogs"}</h2></div><button className="refresh" onClick={()=>{setSearching(false);setQuery("");setTab("home");loadTrending()}}>Refresh ↻</button></section>
        {error && <div className="error"><span>{error}</span><button onClick={loadTrending}>Coba lagi</button></div>}
        {loading ? <div className="loading"><LoaderCircle className="spin" size={27}/><span>Memuat katalog musik...</span></div> : visible.length ? <div className="track-list"><div className="list-header"><span>#</span><span>TRACK</span><span>GENRE</span><span>PLAYS</span><span/></div>{visible.map((track,i)=><div className={`track ${current?.id===track.id?"selected":""}`} key={track.id}><span className="index">{current?.id===track.id && playing ? <AudioLines size={16}/> : String(i+1).padStart(2,"0")}</span><button className="track-main" onClick={()=>playTrack(track)}><div className="cover">{track.artwork ? <img src={track.artwork} alt=""/> : <Disc3/>}<span><Play size={17} fill="currentColor"/></span></div><div className="track-meta"><b>{track.title}</b><small>{track.artist}</small></div></button><span className="genre">{track.source || track.genre}</span><span className="plays">{track.source === "iTunes" ? "30s preview" : track.plays.toLocaleString("en-US")}</span><div className="track-actions"><button className={favorites.includes(track.id)?"liked":""} onClick={()=>toggleFavorite(track.id)} title="Favorite"><Heart size={17} fill={favorites.includes(track.id)?"currentColor":"none"}/></button><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.title} ${track.artist}`)}`} target="_blank" rel="noreferrer" title="Find on YouTube"><Youtube size={15}/></a></div></div>)}</div> : <div className="empty"><Music2 size={35}/><b>{tab==="favorites"?"Belum ada favorit":"Tidak ada lagu ditemukan"}</b><p>{tab==="favorites"?"Tekan ikon hati pada lagu untuk menyimpannya.":"Coba kata pencarian lain."}</p></div>}</>}
        <div className="powered">CURATED FOR YOUR LISTENING <span>·</span> #7KAZ MUSIC</div>
        {notificationMessage && <div className="notification-status" role="status">{notificationMessage}<button onClick={()=>setNotificationMessage("")} aria-label="Close">×</button></div>}
      </div>
    </main>

    <nav className="ios-nav"><button className={tab === "home" ? "on" : ""} onClick={()=>changeTab("home")}><Home/><span>Home</span></button><button className={tab === "albums" ? "on" : ""} onClick={()=>changeTab("albums")}><Disc3/><span>Picks</span></button><button className={tab === "favorites" ? "on" : ""} onClick={()=>changeTab("favorites")}><Heart/><span>Liked</span></button><button className={tab === "youtube" ? "on" : ""} onClick={()=>changeTab("youtube")}><Youtube/><span>YouTube</span></button><button className={tab === "spotify" ? "on" : ""} onClick={()=>changeTab("spotify")}><Music2/><span>Spotify</span></button></nav>
    <footer className="player"><div className="now"><div className="now-cover">{current?.artwork ? <img src={current.artwork} alt=""/> : <Disc3/>}</div><div className="now-meta"><b>{current?.title || "Pilih lagu untuk diputar"}</b><small>{current ? `${current.artist} · #7KAZ MUSIC` : "Choose a track to start"}</small></div>{current && <button className={`heart ${favorites.includes(current.id)?"liked":""}`} onClick={()=>toggleFavorite(current.id)}><Heart size={18} fill={favorites.includes(current.id)?"currentColor":"none"}/></button>}</div><div className="player-center"><div className="controls"><button className={shuffle?"active-control":""} onClick={()=>setShuffle(!shuffle)} title="Shuffle"><Shuffle size={17}/></button><button onClick={previousTrack} title="Previous"><SkipBack size={19} fill="currentColor"/></button><button className="main-play" onClick={togglePlay}>{playing?<Pause size={19} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}</button><button onClick={nextTrack} title="Next"><SkipForward size={19} fill="currentColor"/></button><button className={repeat!=="off"?"active-control":""} onClick={()=>setRepeat(r=>r==="off"?"all":r==="all"?"one":"off")} title="Repeat">{repeat==="one"?<Repeat1 size={17}/>:<Repeat size={17}/>}</button></div><div className="seek"><span>{fmt(progress)}</span><input type="range" min="0" max={duration||0} step=".1" value={Math.min(progress,duration||0)} onChange={e=>{if(audio.current)audio.current.currentTime=Number(e.target.value)}}/><span>{fmt(duration)}</span></div></div><div className="player-right"><Volume2 size={18}/><input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div></footer>

    {thanksOpen && <div className="modal-backdrop" onClick={()=>setThanksOpen(false)}><section className="thanks-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setThanksOpen(false)}><X/></button><div className="kicker red">#7KAZ MUSIC CREDITS</div><h2>Thanks to</h2><p>Terima kasih untuk orang-orang yang ikut memberi warna dalam perjalanan project ini.</p><div className="credit-list"><div><b>Esa</b><span>Developer</span></div><div><b>Diana</b><span>Inspiration</span></div><div><b>Arya</b><span>Friends</span></div><div><b>Tama</b><span>Partner</span></div><div><b>Remon</b><span>Friends</span></div><div><b>Ridwan</b><span>Friends</span></div></div><div className="thanks-footer">MADE WITH ♡ BY #7KAZ</div></section></div>}
  </div>;
}
