'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Skeleton } from 'antd';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:4001';

// ─── Helpers
function formatTime(ms) {
  if (!ms || ms < 0) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function isMobileUA() {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function pickImage(images, preferLarge = true) {
  if (!images || !images.length) return null;
  if (preferLarge) return images[0]?.url;
  return images[images.length - 1]?.url;
}

async function be(path, opts = {}) {
  const res = await fetch(`${BE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    cache: 'no-store',
    ...opts,
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || `BE ${res.status}`);
  return json.data;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function MusicPage() {
  const [hydrated, setHydrated] = useState(false);
  const [onMobile, setOnMobile] = useState(false);

  // Auth
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState('');

  // Tabs
  const [tab, setTab] = useState('home'); // home | library | search

  // ═══ Home data
  const [recentlyPlayed, setRecentlyPlayed] = useState(null);
  const [yourPlaylists, setYourPlaylists] = useState(null); // replaces featured-playlists (Spotify restricted)
  const [topArtists, setTopArtists] = useState(null);       // replaces new-releases (Spotify restricted)
  const [topTracks, setTopTracks] = useState(null);

  // ═══ Library
  const [libraryTab, setLibraryTab] = useState('playlists'); // playlists | liked
  const [playlists, setPlaylists] = useState(null);
  const [likedTracks, setLikedTracks] = useState(null);
  const [libraryFilter, setLibraryFilter] = useState('');
  const [openCollection, setOpenCollection] = useState(null); // { kind:'playlist'|'album', id, data }
  const [collectionLoading, setCollectionLoading] = useState(false);

  // ═══ Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('track'); // track | album | artist
  const [searchResults, setSearchResults] = useState({ tracks: [], albums: [], artists: [] });
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef(null);

  // ═══ Liked map (for fast like checks)
  const [likedMap, setLikedMap] = useState({}); // { trackId: bool }

  // ═══ Web Playback SDK
  const [sdkReady, setSdkReady] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [sdkError, setSdkError] = useState('');
  const [volume, setVolume] = useState(0.5);
  const playerRef = useRef(null);

  // ═══ Mobile embed (when not premium / mobile)
  const [embedTrackId, setEmbedTrackId] = useState(null);
  const [embedKind, setEmbedKind] = useState('track'); // track | playlist | album

  // ═══ Playlist management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState(null); // track to add to a playlist
  const [toast, setToast] = useState('');

  const useCustomPlayer = !!profile && profile.product === 'premium' && !onMobile;

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

  const isQuotaError = (msg) => /forbidden|extended quota|insufficient/i.test(msg || '');
  const quotaMsg = "Locked by Spotify quota — apply for Extended Quota Mode in your developer dashboard.";

  const createPlaylist = useCallback(async ({ name, description, public: isPublic }) => {
    try {
      const data = await be('/api/spotify/create-playlist', {
        method: 'POST',
        body: JSON.stringify({ name, description, public: isPublic }),
      });
      try {
        const p = await be('/api/spotify/playlists?limit=50');
        setPlaylists(p.items || []);
        const homeP = await be('/api/spotify/playlists?limit=12');
        setYourPlaylists(homeP.items || []);
      } catch {}
      showToast(`Created "${name}"`);
      return data;
    } catch (err) {
      showToast(isQuotaError(err.message) ? quotaMsg : `Failed: ${err.message}`);
      throw err;
    }
  }, [showToast]);

  const addTrackToPlaylist = useCallback(async (playlistId, trackUri, playlistName) => {
    try {
      await be(`/api/spotify/playlist/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ uris: [trackUri] }),
      });
      showToast(`Added to "${playlistName}"`);
    } catch (err) {
      showToast(isQuotaError(err.message) ? quotaMsg : `Failed: ${err.message}`);
    }
  }, [showToast]);

  const deletePlaylist = useCallback(async (playlistId, playlistName) => {
    if (!confirm(`Remove "${playlistName}" from your library?`)) return;
    try {
      await be(`/api/spotify/playlist/${playlistId}/follow`, { method: 'DELETE' });
      setPlaylists(prev => prev?.filter(p => p.id !== playlistId) || null);
      setYourPlaylists(prev => prev?.filter(p => p.id !== playlistId) || null);
      setOpenCollection(null);
      showToast(`Removed "${playlistName}"`);
    } catch (err) {
      showToast(isQuotaError(err.message) ? quotaMsg : `Failed: ${err.message}`);
    }
  }, [showToast]);

  // ─── Hydrate
  useEffect(() => {
    setHydrated(true);
    setOnMobile(isMobileUA());
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify') === 'connected') {
      window.history.replaceState({}, '', '/music');
    }
    const errParam = params.get('spotify_error');
    if (errParam) {
      setAuthError(decodeURIComponent(errParam));
      window.history.replaceState({}, '', '/music');
    }
  }, []);

  // ─── Auth check
  const checkAuth = useCallback(async () => {
    try {
      const data = await be('/api/spotify/me');
      if (data.authenticated) setProfile(data.profile);
      else setProfile(null);
    } catch {
      setProfile(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);
  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLogout = async () => {
    try { await be('/api/spotify/logout', { method: 'POST' }); } catch {}
    if (playerRef.current) { try { playerRef.current.disconnect(); } catch {} playerRef.current = null; }
    setProfile(null); setDeviceId(null); setPlayerState(null); setSdkReady(false);
    setRecentlyPlayed(null); setFeatured(null); setNewReleases(null); setTopTracks(null);
    setPlaylists(null); setLikedTracks(null); setLikedMap({});
    setOpenCollection(null);
  };

  // ─── Web Playback SDK setup (desktop premium only)
  useEffect(() => {
    if (!profile || onMobile || profile.product !== 'premium') return;
    if (typeof window === 'undefined') return;
    if (document.getElementById('spotify-sdk-script')) {
      if (window.Spotify) setSdkReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'spotify-sdk-script';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);
  }, [profile, onMobile]);

  useEffect(() => {
    if (!sdkReady || !profile || onMobile || playerRef.current) return;
    const player = new window.Spotify.Player({
      name: 'For Amrita ♥',
      getOAuthToken: async (cb) => {
        try {
          const data = await be('/api/spotify/token');
          cb(data.access_token);
        } catch { setSdkError('Token fetch failed — reconnect?'); }
      },
      volume: 0.5,
    });
    player.addListener('ready', async ({ device_id }) => {
      setDeviceId(device_id);
      setSdkError('Activating device...');
      // CRITICAL: Spotify backend needs a moment to register the SDK device.
      // Wait, then transfer, then verify it's in the devices list.
      try {
        await new Promise(r => setTimeout(r, 1000));
        await be('/api/spotify/transfer', {
          method: 'POST',
          body: JSON.stringify({ deviceId: device_id, play: false }),
        });
        await new Promise(r => setTimeout(r, 800));
        // Verify
        const devs = await be('/api/spotify/devices');
        const found = devs.devices?.some(d => d.id === device_id);
        if (found) {
          setSdkError('');
        } else {
          setSdkError('Device registered. Try playing a song now.');
        }
      } catch (err) {
        console.warn('Activation error:', err.message);
        setSdkError('');
      }
    });
    player.addListener('player_state_changed', (state) => { if (state) setPlayerState(state); });
    player.addListener('initialization_error', ({ message }) => setSdkError(message));
    player.addListener('authentication_error', () => setSdkError('Auth error — reconnect.'));
    player.addListener('account_error', () => setSdkError('Premium required.'));
    player.connect().then((ok) => { if (ok) playerRef.current = player; });
    return () => { try { player.disconnect(); } catch {} playerRef.current = null; };
  }, [sdkReady, profile, onMobile]);

  // ─── Load Home data
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    (async () => {
      try {
        const r = await be('/api/spotify/recently-played?limit=20');
        if (alive) setRecentlyPlayed(r.items || []);
      } catch { if (alive) setRecentlyPlayed([]); }
      try {
        // featured-playlists is locked behind Spotify Extended Quota — use user playlists instead
        const p = await be('/api/spotify/playlists?limit=12');
        if (alive) setYourPlaylists(p.items || []);
      } catch { if (alive) setYourPlaylists([]); }
      try {
        // new-releases is locked too — use user top artists instead
        const a = await be('/api/spotify/top-artists?limit=12&time_range=short_term');
        if (alive) setTopArtists(a.items || []);
      } catch { if (alive) setTopArtists([]); }
      try {
        const t = await be('/api/spotify/top-tracks?limit=10&time_range=medium_term');
        if (alive) setTopTracks(t.items || []);
      } catch { if (alive) setTopTracks([]); }
      // Pre-load Liked Songs IDs so the heart icon shows correct state across all tabs.
      // /me/tracks/contains (bulk check) is locked behind Spotify Extended Quota,
      // so we just fetch the actual saved-tracks list and build the map from it.
      try {
        const liked = await be('/api/spotify/saved-tracks?limit=50');
        if (alive) {
          const m = {};
          (liked.items || []).forEach(it => { if (it.track?.id) m[it.track.id] = true; });
          setLikedMap(prev => ({ ...prev, ...m }));
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [profile]);

  // ─── Load Library data
  useEffect(() => {
    if (!profile || tab !== 'library') return;
    if (libraryTab === 'playlists' && playlists === null) {
      (async () => {
        try {
          const d = await be('/api/spotify/playlists?limit=50');
          setPlaylists(d.items || []);
        } catch { setPlaylists([]); }
      })();
    }
    if (libraryTab === 'liked' && likedTracks === null) {
      (async () => {
        try {
          const d = await be('/api/spotify/saved-tracks?limit=50');
          setLikedTracks(d.items || []);
          // populate likedMap
          const m = {};
          (d.items || []).forEach(it => { if (it.track?.id) m[it.track.id] = true; });
          setLikedMap(prev => ({ ...prev, ...m }));
        } catch { setLikedTracks([]); }
      })();
    }
  }, [profile, tab, libraryTab, playlists, likedTracks]);

  // ─── Search debounced — fetches tracks, albums, AND artists in one call
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim() || !profile) {
      setSearchResults({ tracks: [], albums: [], artists: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await be(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&type=track,album,artist&limit=10`);
        setSearchResults({
          tracks: data.tracks?.items || [],
          albums: data.albums?.items || [],
          artists: data.artists?.items || [],
        });
      } catch {
        setSearchResults({ tracks: [], albums: [], artists: [] });
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, profile]);

  // ─── Playback actions
  const playUri = useCallback(async ({ uri, contextUri, trackId }) => {
    // Mobile or non-premium: switch to embed
    if (!useCustomPlayer) {
      if (uri) {
        const m = uri.match(/spotify:(track|playlist|album|artist):([A-Za-z0-9]+)/);
        if (m) { setEmbedKind(m[1]); setEmbedTrackId(m[2]); return; }
      }
      if (contextUri) {
        const m = contextUri.match(/spotify:(playlist|album|artist):([A-Za-z0-9]+)/);
        if (m) { setEmbedKind(m[1]); setEmbedTrackId(m[2]); return; }
      }
      if (trackId) { setEmbedKind('track'); setEmbedTrackId(trackId); return; }
      return;
    }
    if (!deviceId) { setSdkError('Player not ready yet...'); return; }
    const body = { deviceId };
    // Spotify rule: only TRACK uris go in uris[]. Album/playlist/artist must use contextUri.
    if (uri && uri.startsWith('spotify:track:')) {
      body.uris = [uri];
    } else if (uri) {
      body.contextUri = uri;
    } else if (contextUri) {
      body.contextUri = contextUri;
    }

    const attemptPlay = async () => be('/api/spotify/play', { method: 'POST', body: JSON.stringify(body) });

    try {
      await attemptPlay();
      setSdkError('');
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      const isDeviceIssue = msg.includes('device') || msg.includes('not found') || msg.includes('restricted') || msg.includes('no active');
      if (!isDeviceIssue) {
        setSdkError(err.message);
        return;
      }
      // Up to 2 retries with progressively longer transfer + wait
      setSdkError('Activating device...');
      for (let i = 0; i < 2; i++) {
        try {
          await be('/api/spotify/transfer', { method: 'POST', body: JSON.stringify({ deviceId, play: false }) });
          await new Promise(r => setTimeout(r, 800 + i * 600));
          await attemptPlay();
          setSdkError('');
          return;
        } catch (retryErr) {
          if (i === 1) {
            setSdkError(`${retryErr.message}. Try refreshing or close other Spotify apps.`);
          }
        }
      }
    }
  }, [deviceId, useCustomPlayer]);

  const togglePlay = () => playerRef.current?.togglePlay();
  const nextTrack = () => playerRef.current?.nextTrack();
  const prevTrack = () => playerRef.current?.previousTrack();
  const seek = (ms) => playerRef.current?.seek(ms);
  const setVol = (v) => { setVolume(v); playerRef.current?.setVolume(v); };

  // ─── Shuffle / Repeat (server-side, follows playerState updates)
  const shuffle = !!playerState?.shuffle;
  const repeat = playerState?.repeat_mode === 1 ? 'context'
    : playerState?.repeat_mode === 2 ? 'track' : 'off';

  const toggleShuffle = useCallback(async () => {
    try {
      await be('/api/spotify/shuffle', {
        method: 'POST',
        body: JSON.stringify({ state: !shuffle, deviceId }),
      });
    } catch (err) { showToast(err.message); }
  }, [shuffle, deviceId, showToast]);

  const cycleRepeat = useCallback(async () => {
    const next = repeat === 'off' ? 'context' : repeat === 'context' ? 'track' : 'off';
    try {
      await be('/api/spotify/repeat', {
        method: 'POST',
        body: JSON.stringify({ state: next, deviceId }),
      });
    } catch (err) { showToast(err.message); }
  }, [repeat, deviceId, showToast]);

  const addToQueue = useCallback(async (track) => {
    try {
      await be('/api/spotify/queue', {
        method: 'POST',
        body: JSON.stringify({ uri: track.uri, deviceId }),
      });
      showToast(`Queued: ${track.name}`);
    } catch (err) { showToast(err.message); }
  }, [deviceId, showToast]);

  // ─── Like / unlike
  const toggleLike = useCallback(async (trackId) => {
    if (!trackId) return;
    const wasLiked = !!likedMap[trackId];
    setLikedMap(prev => ({ ...prev, [trackId]: !wasLiked }));
    try {
      await be(`/api/spotify/saved-tracks/${trackId}`, { method: wasLiked ? 'DELETE' : 'PUT' });
      // If unlike-from-library, refresh
      if (wasLiked && libraryTab === 'liked') {
        setLikedTracks(prev => prev?.filter(it => it.track?.id !== trackId));
      }
    } catch {
      setLikedMap(prev => ({ ...prev, [trackId]: wasLiked })); // revert
    }
  }, [likedMap, libraryTab]);

  // ─── Open a playlist or album
  const openCollectionDetail = useCallback(async (kind, id) => {
    setOpenCollection({ kind, id, data: null });
    setCollectionLoading(true);
    // Scroll up so user actually SEES the new view
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    try {
      const path = kind === 'album' ? `/api/spotify/album/${id}`
        : kind === 'artist' ? `/api/spotify/artist/${id}`
        : `/api/spotify/playlist/${id}`;
      const data = await be(path);
      setOpenCollection({ kind, id, data });
    } catch {
      setOpenCollection({ kind, id, data: { error: true } });
    } finally {
      setCollectionLoading(false);
    }
  }, []);

  // ─── Download preview
  const downloadPreview = (track) => {
    if (!track?.preview_url) return;
    const a = document.createElement('a');
    a.href = `${BE_URL}/api/spotify/preview/${track.id}?download=1`;
    a.download = `${track.artists.map(x => x.name).join(', ')} - ${track.name}.mp3`;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─── Filtered library
  const filteredPlaylists = useMemo(() => {
    if (!playlists) return null;
    const q = libraryFilter.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.owner?.display_name?.toLowerCase().includes(q));
  }, [playlists, libraryFilter]);

  const filteredLiked = useMemo(() => {
    if (!likedTracks) return null;
    const q = libraryFilter.trim().toLowerCase();
    if (!q) return likedTracks;
    return likedTracks.filter(it => {
      const t = it.track;
      if (!t) return false;
      return t.name?.toLowerCase().includes(q) ||
        t.artists?.some(a => a.name?.toLowerCase().includes(q)) ||
        t.album?.name?.toLowerCase().includes(q);
    });
  }, [likedTracks, libraryFilter]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={pageStyle}>
      <div style={glowStyle} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1, paddingTop: 16 }}>
        <Link href="/" style={backLinkStyle}>← Back</Link>
      </div>

      {/* Header */}
      <div style={{ ...headerStyle, maxWidth: 1100, margin: '20px auto 24px', padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={statusPillStyle(!!profile)}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: profile ? '#1ed760' : 'rgba(255,255,255,0.3)',
                boxShadow: profile ? '0 0 8px #1ed760' : 'none',
              }} />
              <span style={{ fontSize: '11px', color: profile ? '#1ed760' : 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.1em' }}>
                {profile ? 'CONNECTED' : 'SPOTIFY'}
              </span>
            </div>
            <h1 style={titleStyle}>Our Music</h1>
          </div>
          <div style={{ flexShrink: 0 }}>
            {authLoading ? (
              <Skeleton.Avatar active size={44} shape="circle" />
            ) : profile ? (
              <ProfileChip profile={profile} onLogout={handleLogout} />
            ) : (
              <a href="/api/spotify/login" style={connectBtnStyle}>
                <SpotifyIcon /> Connect Spotify
              </a>
            )}
          </div>
        </div>

        {authError && <ErrorBox>{authError}</ErrorBox>}
      </div>

      {/* Tabs */}
      {profile && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 1 }}>
          <div style={tabBarStyle}>
            {[
              { key: 'home', label: 'Home', icon: '🏠' },
              { key: 'library', label: 'Library', icon: '📚' },
              { key: 'search', label: 'Search', icon: '🔍' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setOpenCollection(null); }}
                style={tabBtnStyle(tab === t.key)}
              >
                <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: `0 16px ${useCustomPlayer ? '160px' : (!profile || onMobile) ? '120px' : '40px'}`,
        position: 'relative', zIndex: 1,
      }}>
        {!profile && !authLoading && (
          <UnauthHero />
        )}

        {/* Detail view takes priority over any tab when an item is opened */}
        {profile && openCollection ? (
          <CollectionDetailView
            collection={openCollection}
            loading={collectionLoading}
            onBack={() => setOpenCollection(null)}
            onPlay={playUri}
            likedMap={likedMap}
            onLike={toggleLike}
            onDownload={downloadPreview}
            onAddToQueue={addToQueue}
            onOpenCollection={openCollectionDetail}
          />
        ) : (
          <>
            {profile && tab === 'home' && (
              <HomeTab
                profile={profile}
                recentlyPlayed={recentlyPlayed}
                yourPlaylists={yourPlaylists}
                topArtists={topArtists}
                topTracks={topTracks}
                onPlay={playUri}
                onOpenCollection={openCollectionDetail}
                likedMap={likedMap}
                onLike={toggleLike}
                onDownload={downloadPreview}
                onAddToQueue={addToQueue}
              />
            )}

            {profile && tab === 'library' && (
              <LibraryTab
                libraryTab={libraryTab}
                setLibraryTab={setLibraryTab}
                libraryFilter={libraryFilter}
                setLibraryFilter={setLibraryFilter}
                playlists={filteredPlaylists}
                likedTracks={filteredLiked}
                onOpenCollection={openCollectionDetail}
                onPlay={playUri}
                likedMap={likedMap}
                onLike={toggleLike}
                onDownload={downloadPreview}
                onCreatePlaylist={() => setShowCreateModal(true)}
                onAddToQueue={addToQueue}
              />
            )}

            {profile && tab === 'search' && (
              <SearchTab
                query={searchQuery}
                setQuery={setSearchQuery}
                searchType={searchType}
                setSearchType={setSearchType}
                onOpenCollection={openCollectionDetail}
                results={searchResults}
                loading={searching}
                onAddToQueue={addToQueue}
                onPlay={playUri}
                likedMap={likedMap}
                onLike={toggleLike}
                onDownload={downloadPreview}
              />
            )}
          </>
        )}
      </div>

      {/* Sticky bottom player (desktop+premium) */}
      {useCustomPlayer && (
        <BottomPlayer
          player={playerRef.current}
          deviceId={deviceId}
          state={playerState}
          volume={volume}
          onTogglePlay={togglePlay}
          onNext={nextTrack}
          onPrev={prevTrack}
          onSeek={seek}
          onVolume={setVol}
          sdkError={sdkError}
          likedMap={likedMap}
          onLike={toggleLike}
          onShuffle={toggleShuffle}
          onRepeat={cycleRepeat}
          shuffle={shuffle}
          repeat={repeat}
        />
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createPlaylist}
        />
      )}

      {/* Add To Playlist Modal */}
      {addToPlaylistTrack && (
        <AddToPlaylistModal
          track={addToPlaylistTrack}
          playlists={playlists}
          ownerId={profile?.id}
          onClose={() => setAddToPlaylistTrack(null)}
          onAdd={(playlist) => {
            addTrackToPlaylist(playlist.id, addToPlaylistTrack.uri, playlist.name);
            setAddToPlaylistTrack(null);
          }}
          onCreateNew={() => {
            setAddToPlaylistTrack(null);
            setShowCreateModal(true);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: useCustomPlayer ? 110 : 90, left: '50%',
          transform: 'translateX(-50%)', zIndex: 100,
          background: 'rgba(30,215,96,0.95)', color: '#000',
          padding: '10px 20px', borderRadius: 50,
          fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'toast-in 0.25s ease',
        }}>{toast}</div>
      )}

      {/* Sticky mobile/free embed */}
      {profile && !useCustomPlayer && embedTrackId && (
        <div style={mobileEmbedStyle}>
          <iframe
            key={`${embedKind}-${embedTrackId}`}
            src={`https://open.spotify.com/embed/${embedKind}/${embedTrackId}?utm_source=generator&theme=0`}
            width="100%" height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: 12, border: 'none', display: 'block' }}
            title="Spotify"
          />
        </div>
      )}

      {/* Custom scrollbar + search bar polish */}
      <style>{`
        /* Slick green-tinted scrollbars on the music page horizontal rails */
        .music-hrow {
          scrollbar-width: thin;
          scrollbar-color: rgba(30,215,96,0.35) transparent;
        }
        .music-hrow::-webkit-scrollbar {
          height: 8px;
        }
        .music-hrow::-webkit-scrollbar-track {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
          border-radius: 8px;
          margin: 0 12px;
        }
        .music-hrow::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, rgba(30,215,96,0.5), rgba(179,136,255,0.5));
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
          transition: background 0.2s;
        }
        .music-hrow::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, rgba(30,215,96,0.8), rgba(179,136,255,0.8));
        }
        /* Search input polish */
        .music-search-shell {
          position: relative;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .music-search-shell:focus-within {
          background: rgba(30,215,96,0.06) !important;
          border-color: rgba(30,215,96,0.5) !important;
          box-shadow: 0 0 0 4px rgba(30,215,96,0.08), 0 6px 24px rgba(0,0,0,0.3);
        }
        .music-search-shell input::placeholder {
          color: rgba(255,255,255,0.35);
        }
        .music-search-shell input {
          caret-color: #1ed760;
        }
        .music-artist-link:hover {
          color: #fff !important;
          text-decoration: underline;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes modal-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function ProfileChip({ profile, onLogout }) {
  const [open, setOpen] = useState(false);
  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = () => setOpen(false);
    setTimeout(() => document.addEventListener('click', onClick), 0);
    return () => document.removeEventListener('click', onClick);
  }, [open]);
  return (
    <div style={{ position: 'relative', zIndex: 200 }} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} style={profileChipBtnStyle}>
        {profile.image ? (
          <img src={profile.image} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={avatarFallbackStyle}>{profile.display_name?.[0] || '?'}</div>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile.display_name}
        </span>
        {profile.product === 'premium' && <span style={premiumPillStyle}>PRO</span>}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>▾</span>
      </button>
      {open && (
        <div style={profileDropdownStyle}>
          <div style={{ padding: '10px 14px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {profile.product === 'premium' ? 'Premium account' : 'Free tier'}
          </div>
          <button onClick={() => { setOpen(false); onLogout(); }} style={dropdownItemStyle}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function UnauthHero() {
  return (
    <div style={{
      maxWidth: 580, margin: '40px auto', textAlign: 'center',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 24, padding: '40px 24px', backdropFilter: 'blur(12px)',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎵</div>
      <h2 style={{ fontSize: 22, margin: '0 0 12px', color: '#fff', fontWeight: 700 }}>
        Connect Spotify to begin
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 auto 24px', maxWidth: 400 }}>
        Browse your playlists, search for any song, like tracks, and play full songs (Premium) or 30-second previews.
      </p>
      <a href="/api/spotify/login" style={{ ...connectBtnStyle, display: 'inline-flex' }}>
        <SpotifyIcon /> Connect Spotify
      </a>
    </div>
  );
}

// ─── HOME TAB
function HomeTab({ profile, recentlyPlayed, yourPlaylists, topArtists, topTracks, onPlay, onOpenCollection, likedMap, onLike, onDownload, onAddToQueue }) {
  return (
    <div>
      <h2 style={greetingStyle}>{greeting()}, {profile.display_name?.split(' ')[0] || 'love'}</h2>

      <Section title="Recently Played">
        <HorizontalRow loading={recentlyPlayed === null}>
          {recentlyPlayed?.map((it, i) => {
            const t = it.track;
            if (!t) return null;
            return (
              <Card
                key={`${t.id}-${i}`}
                image={pickImage(t.album?.images)}
                title={t.name}
                subtitle={t.artists?.map(a => a.name).join(', ')}
                onClick={() => onPlay({ uri: t.uri, trackId: t.id })}
              />
            );
          })}
          {recentlyPlayed?.length === 0 && <EmptyHint>Nothing played yet.</EmptyHint>}
        </HorizontalRow>
      </Section>

      <Section title="Your Playlists">
        <HorizontalRow loading={yourPlaylists === null}>
          {yourPlaylists?.map(p => (
            <Card
              key={p.id}
              image={pickImage(p.images)}
              title={p.name}
              subtitle={p.owner?.display_name || ''}
              onClick={() => onOpenCollection('playlist', p.id)}
            />
          ))}
          {yourPlaylists?.length === 0 && <EmptyHint>No playlists yet — make some on Spotify.</EmptyHint>}
        </HorizontalRow>
      </Section>

      <Section title="Your Top Artists">
        <HorizontalRow loading={topArtists === null}>
          {topArtists?.map(a => (
            <Card
              key={a.id}
              image={pickImage(a.images)}
              title={a.name}
              subtitle="Artist"
              circular
              onClick={() => onOpenCollection('artist', a.id)}
            />
          ))}
          {topArtists?.length === 0 && <EmptyHint>Listen more to build your top artists.</EmptyHint>}
        </HorizontalRow>
      </Section>

      <Section title="Your Top Tracks">
        {topTracks === null ? (
          <SkeletonRows count={6} />
        ) : topTracks.length === 0 ? (
          <EmptyHint>Not enough listening history yet.</EmptyHint>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topTracks.map((t, i) => (
              <TrackRow
                key={t.id}
                rank={i + 1}
                track={t}
                onPlay={() => onPlay({ uri: t.uri, trackId: t.id })}
                liked={!!likedMap[t.id]}
                onLike={() => onLike(t.id)}
                onDownload={() => onDownload(t)}
                onAddToQueue={onAddToQueue ? () => onAddToQueue(t) : undefined}
              onOpenArtist={onOpenCollection ? (artistId) => onOpenCollection('artist', artistId) : undefined}
                onOpenArtist={onOpenCollection ? (artistId) => onOpenCollection('artist', artistId) : undefined}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── LIBRARY TAB
function LibraryTab({ libraryTab, setLibraryTab, libraryFilter, setLibraryFilter, playlists, likedTracks, onOpenCollection, onPlay, likedMap, onLike, onDownload, onAddToQueue }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ ...greetingStyle, margin: 0, flex: '0 0 auto' }}>Your Library</h2>
        <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="music-search-shell" style={{ ...searchBoxStyle, maxWidth: 280, flex: 1, minWidth: 180 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={libraryFilter}
              onChange={(e) => setLibraryFilter(e.target.value)}
              placeholder="Filter library..."
              style={searchInputStyle}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'playlists', label: 'Playlists' },
          { key: 'liked', label: 'Liked Songs' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setLibraryTab(t.key)}
            style={subTabBtnStyle(libraryTab === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {libraryTab === 'playlists' ? (
        playlists === null ? (
          <CardGridSkeleton />
        ) : playlists.length === 0 ? (
          <EmptyHint>No playlists match.</EmptyHint>
        ) : (
          <div style={cardGridStyle}>
            {playlists.map(p => (
              <Card
                key={p.id}
                image={pickImage(p.images)}
                title={p.name}
                subtitle={p.owner?.display_name || ''}
                onClick={() => onOpenCollection('playlist', p.id)}
                fullWidth
              />
            ))}
          </div>
        )
      ) : (
        likedTracks === null ? (
          <SkeletonRows count={8} />
        ) : likedTracks.length === 0 ? (
          <EmptyHint>No liked tracks match.</EmptyHint>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {likedTracks.map((it, i) => {
              const t = it.track;
              if (!t) return null;
              return (
                <TrackRow
                  key={`${t.id}-${i}`}
                  rank={i + 1}
                  track={t}
                  onPlay={() => onPlay({ uri: t.uri, trackId: t.id })}
                  liked={!!likedMap[t.id]}
                  onLike={() => onLike(t.id)}
                  onDownload={() => onDownload(t)}
                  onAddToQueue={onAddToQueue ? () => onAddToQueue(t) : undefined}
              onOpenArtist={onOpenCollection ? (artistId) => onOpenCollection('artist', artistId) : undefined}
                onOpenArtist={onOpenCollection ? (artistId) => onOpenCollection('artist', artistId) : undefined}
                />
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

// ─── SEARCH TAB
function SearchTab({ query, setQuery, results, loading, onPlay, onOpenCollection, likedMap, onLike, onDownload, onAddToQueue, searchType, setSearchType }) {
  const tracks = results?.tracks || [];
  const albums = results?.albums || [];
  const artists = results?.artists || [];
  const totalCount = tracks.length + albums.length + artists.length;

  return (
    <div>
      <div className="music-search-shell" style={{
        ...searchBoxStyle, padding: '14px 18px', marginBottom: 16,
        borderRadius: 16,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
          style={{ ...searchInputStyle, fontSize: 16, padding: '10px 8px', fontWeight: 500 }}
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} style={clearBtnStyle}>×</button>
        )}
      </div>

      {/* Type tabs */}
      {query.trim() && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'track', label: 'Songs', count: tracks.length },
            { key: 'album', label: 'Albums', count: albums.length },
            { key: 'artist', label: 'Artists', count: artists.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setSearchType(t.key)}
              style={subTabBtnStyle(searchType === t.key)}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {!query.trim() ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎧</div>
          <p style={{ fontSize: 14 }}>Search for a song, artist, or album...</p>
        </div>
      ) : loading ? (
        searchType === 'track' ? <SkeletonRows count={8} /> : <CardGridSkeleton />
      ) : totalCount === 0 ? (
        <EmptyHint>No results for "{query}"</EmptyHint>
      ) : searchType === 'track' ? (
        tracks.length === 0 ? <EmptyHint>No songs found.</EmptyHint> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                rank={i + 1}
                track={t}
                onPlay={() => onPlay({ uri: t.uri, trackId: t.id })}
                liked={!!likedMap[t.id]}
                onLike={() => onLike(t.id)}
                onDownload={() => onDownload(t)}
                onAddToQueue={onAddToQueue ? () => onAddToQueue(t) : undefined}
              onOpenArtist={onOpenCollection ? (artistId) => onOpenCollection('artist', artistId) : undefined}
                onOpenArtist={onOpenCollection ? (artistId) => onOpenCollection('artist', artistId) : undefined}
                showDownload
              />
            ))}
          </div>
        )
      ) : searchType === 'album' ? (
        albums.length === 0 ? <EmptyHint>No albums found.</EmptyHint> : (
          <div style={cardGridStyle}>
            {albums.map(a => (
              <Card
                key={a.id}
                image={pickImage(a.images)}
                title={a.name}
                subtitle={a.artists?.map(x => x.name).join(', ') || a.album_type || 'Album'}
                onClick={() => onOpenCollection && onOpenCollection('album', a.id)}
                fullWidth
              />
            ))}
          </div>
        )
      ) : (
        artists.length === 0 ? <EmptyHint>No artists found.</EmptyHint> : (
          <div style={cardGridStyle}>
            {artists.map(a => (
              <Card
                key={a.id}
                image={pickImage(a.images)}
                title={a.name}
                subtitle="Artist"
                circular
                onClick={() => onOpenCollection && onOpenCollection('artist', a.id)}
                fullWidth
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── COLLECTION DETAIL (playlist or album)
function CollectionDetailView({ collection, loading, onBack, onPlay, likedMap, onLike, onDownload, onAddToQueue, onOpenCollection }) {
  const { kind, id, data } = collection;
  if (loading || !data) {
    return (
      <div>
        <button onClick={onBack} style={backBtnStyle}>← Back</button>
        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          <Skeleton.Image active style={{ width: 200, height: 200, borderRadius: 12 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        </div>
        <div style={{ marginTop: 32 }}>
          <SkeletonRows count={8} />
        </div>
      </div>
    );
  }
  if (data.error) {
    return (
      <div>
        <button onClick={onBack} style={backBtnStyle}>← Back</button>
        <ErrorBox>Couldn't load this {kind}.</ErrorBox>
      </div>
    );
  }

  const image = pickImage(data.images);
  // For albums, Spotify omits the album field on each track item to save bytes.
  // Backfill it from the parent album so TrackRow can render the cover thumbnail.
  const tracks = kind === 'album'
    ? (data.tracks?.items || []).map(t => ({
        ...t,
        album: t.album || { images: data.images, name: data.name, id: data.id },
      }))
    : kind === 'artist'
    ? []
    : (data.tracks?.items || []).map(it => it.track).filter(Boolean);

  const playAll = () => {
    if (kind === 'artist') {
      onPlay({ uri: data.uri || `spotify:artist:${id}` });
    } else {
      onPlay({ contextUri: `spotify:${kind}:${id}` });
    }
  };

  const albums = kind === 'artist' ? (data.albums?.items || []) : [];

  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>

      <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {image ? (
          <img src={image} alt="" style={{
            ...collectionArtStyle,
            borderRadius: kind === 'artist' ? '50%' : 12,
          }} />
        ) : (
          <div style={{ ...collectionArtStyle, background: 'linear-gradient(135deg, #1ed760, #b388ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, borderRadius: kind === 'artist' ? '50%' : 12 }}>♪</div>
        )}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {kind}
          </div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: '6px 0 12px', color: '#fff', lineHeight: 1.1 }}>
            {data.name}
          </h2>
          {data.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px', lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: data.description }} />
          )}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {kind === 'playlist' && (data.owner?.display_name || '')}
            {kind === 'album' && data.artists?.map((a, i) => (
              <span key={a.id}>
                <button
                  onClick={() => onOpenCollection && onOpenCollection('artist', a.id)}
                  style={artistLinkStyle}
                >{a.name}</button>
                {i < data.artists.length - 1 && ', '}
              </span>
            ))}
            {kind === 'album' && tracks.length > 0 && ` · ${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`}
            {kind === 'artist' && albums.length > 0 && `${albums.length} albums`}
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={playAll} style={bigPlayBtnStyle}>▶ Play</button>
          </div>
        </div>
      </div>

      {kind === 'artist' && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 14px' }}>Top Tracks</h3>
          <iframe
            src={`https://open.spotify.com/embed/artist/${id}?utm_source=generator&theme=0`}
            width="100%" height="380"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: 12, border: 'none', display: 'block' }}
            title={data.name}
          />

          {albums.length > 0 && (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '32px 0 14px' }}>Albums</h3>
              <div style={cardGridStyle}>
                {albums.map(a => (
                  <Card
                    key={a.id}
                    image={pickImage(a.images)}
                    title={a.name}
                    subtitle={`${a.album_type || 'album'} · ${(a.release_date || '').slice(0, 4)}`}
                    onClick={() => onOpenCollection && onOpenCollection('album', a.id)}
                    fullWidth
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {kind !== 'artist' && (
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tracks.length === 0 ? (
          kind === 'playlist' ? (
            <iframe
              src={`https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`}
              width="100%" height="500"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ borderRadius: 12, border: 'none', display: 'block' }}
              title={data.name}
            />
          ) : (
            <EmptyHint>No tracks in this {kind}.</EmptyHint>
          )
        ) : (
          tracks.map((t, i) => (
            <TrackRow
              key={`${t.id}-${i}`}
              rank={i + 1}
              track={t}
              onPlay={() => onPlay({ uri: t.uri, contextUri: `spotify:${kind}:${id}`, trackId: t.id })}
              liked={!!likedMap[t.id]}
              onLike={() => onLike(t.id)}
              onDownload={() => onDownload(t)}
              onAddToQueue={onAddToQueue ? () => onAddToQueue(t) : undefined}
              onOpenArtist={onOpenCollection ? (artistId) => onOpenCollection('artist', artistId) : undefined}
              hideAlbum={kind === 'album'}
            />
          ))
        )}
      </div>
      )}
    </div>
  );
}

// ─── BOTTOM PLAYER
function BottomPlayer({ state, volume, onTogglePlay, onNext, onPrev, onSeek, onVolume, sdkError, likedMap, onLike, onShuffle, onRepeat, shuffle, repeat }) {
  const track = state?.track_window?.current_track;
  const isPaused = state?.paused !== false;
  const position = state?.position || 0;
  const duration = state?.duration || track?.duration_ms || 0;

  const [localPos, setLocalPos] = useState(position);
  useEffect(() => { setLocalPos(position); }, [position]);
  useEffect(() => {
    if (isPaused || !duration) return;
    const t = setInterval(() => setLocalPos(p => Math.min(p + 1000, duration)), 1000);
    return () => clearInterval(t);
  }, [isPaused, duration]);

  const progress = duration ? (localPos / duration) * 100 : 0;

  if (!track) {
    return (
      <div style={bottomPlayerStyle}>
        <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          {sdkError || 'Pick a song to start playing...'}
        </div>
      </div>
    );
  }

  return (
    <div style={bottomPlayerStyle}>
      {/* Track info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 240px', minWidth: 0 }}>
        {track.album?.images?.[0]?.url ? (
          <img src={track.album.images[0].url} alt="" style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 8, background: 'linear-gradient(135deg, #1ed760, #b388ff)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.artists?.map(a => a.name).join(', ')}
          </div>
        </div>
        <button
          onClick={() => onLike(track.id)}
          style={{ ...iconBtnStyle(likedMap[track.id] ? '#1ed760' : 'rgba(255,255,255,0.4)'), flexShrink: 0 }}
          title={likedMap[track.id] ? 'Unlike' : 'Like'}
        >
          {likedMap[track.id] ? '♥' : '♡'}
        </button>
      </div>

      {/* Center controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '2 1 360px', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onShuffle} title="Shuffle"
            style={{ ...iconBtnStyle(shuffle ? '#1ed760' : 'rgba(255,255,255,0.5)'), flexShrink: 0, fontSize: 14 }}>
            ⇄
          </button>
          <button onClick={onPrev} style={ctrlBtn(false)}>⏮</button>
          <button onClick={onTogglePlay} style={ctrlBtn(true)}>{isPaused ? '▶' : '⏸'}</button>
          <button onClick={onNext} style={ctrlBtn(false)}>⏭</button>
          <button onClick={onRepeat} title={`Repeat: ${repeat}`}
            style={{ ...iconBtnStyle(repeat !== 'off' ? '#1ed760' : 'rgba(255,255,255,0.5)'), flexShrink: 0, fontSize: 14 }}>
            {repeat === 'track' ? '🔂' : '🔁'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', minWidth: 30, textAlign: 'right' }}>{formatTime(localPos)}</span>
          <div onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - r.left) / r.width;
            const p = Math.floor(pct * duration);
            setLocalPos(p); onSeek(p);
          }} style={{ ...progressBarStyle, flex: 1 }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${progress}%`, borderRadius: 3,
              background: 'linear-gradient(90deg, #1ed760, #b388ff)',
              transition: 'width 0.3s linear',
            }} />
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', minWidth: 30 }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 140px', justifyContent: 'flex-end', minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>🔊</span>
        <input type="range" min={0} max={1} step={0.01} value={volume}
          onChange={(e) => onVolume(parseFloat(e.target.value))}
          style={{ flex: 1, maxWidth: 100, accentColor: '#1ed760' }} />
      </div>
    </div>
  );
}

// ─── PRIMITIVES
function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function HorizontalRow({ children, loading }) {
  if (loading) {
    return (
      <div className="music-hrow" style={hRowStyle}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: '0 0 auto', width: 160 }}>
            <Skeleton.Image active style={{ width: 160, height: 160, borderRadius: 10 }} />
            <Skeleton active paragraph={{ rows: 1 }} title={{ width: '80%' }} style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>
    );
  }
  return <div className="music-hrow" style={hRowStyle}>{children}</div>;
}

function Card({ image, title, subtitle, onClick, fullWidth, circular }) {
  const [hover, setHover] = useState(false);
  const imgRadius = circular ? '50%' : 8;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...(fullWidth ? cardGridItemStyle : cardStyle),
        background: hover ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: imgRadius, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        {image ? (
          <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: 'linear-gradient(135deg, #1ed760, #b388ff)' }}>♪</div>
        )}
        {hover && (
          <div style={{
            position: 'absolute', right: 8, bottom: 8,
            width: 40, height: 40, borderRadius: '50%',
            background: '#1ed760', color: '#000', fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}>▶</div>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function TrackRow({ rank, track, onPlay, liked, onLike, onDownload, onAddToPlaylist, onAddToQueue, onOpenArtist, showDownload, hideAlbum }) {
  const [hover, setHover] = useState(false);
  const img = pickImage(track.album?.images, false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 12px', borderRadius: 8,
        background: hover ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ width: 24, textAlign: 'right', fontSize: 13, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
        {hover ? (
          <button onClick={onPlay} style={{ ...iconBtnStyle('#1ed760'), width: 24, height: 24, fontSize: 11 }}>▶</button>
        ) : rank}
      </div>
      {img ? (
        <img src={img} alt="" style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0, objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.name}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.artists?.map((a, i) => (
            <span key={a.id || i}>
              {onOpenArtist && a.id ? (
                <button onClick={(e) => { e.stopPropagation(); onOpenArtist(a.id); }} style={artistLinkStyle} className="music-artist-link">
                  {a.name}
                </button>
              ) : a.name}
              {i < track.artists.length - 1 && ', '}
            </span>
          ))}
        </div>
      </div>
      {!hideAlbum && (
        <div style={{ flex: '0 1 200px', minWidth: 0, display: 'none', fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          className="track-album">
          {track.album?.name}
        </div>
      )}
      {onAddToQueue && (
        <button
          onClick={onAddToQueue}
          style={{ ...iconBtnStyle('rgba(255,255,255,0.5)'), flexShrink: 0 }}
          title="Add to queue"
        >
          +
        </button>
      )}
      <button
        onClick={onLike}
        style={{ ...iconBtnStyle(liked ? '#1ed760' : 'rgba(255,255,255,0.4)'), flexShrink: 0 }}
        title={liked ? 'Unlike' : 'Like'}
      >
        {liked ? '♥' : '♡'}
      </button>
      {showDownload && (
        <button
          onClick={onDownload}
          disabled={!track.preview_url}
          style={{
            ...iconBtnStyle('#b388ff'),
            opacity: track.preview_url ? 1 : 0.3,
            cursor: track.preview_url ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
          title={track.preview_url ? 'Download 30s preview' : 'No preview'}
        >↓</button>
      )}
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 40, textAlign: 'right', flexShrink: 0 }}>
        {formatTime(track.duration_ms)}
      </div>
    </div>
  );
}

function SkeletonRows({ count = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Skeleton.Avatar active size={40} shape="square" />
          <div style={{ flex: 1 }}>
            <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div style={cardGridStyle}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i}>
          <Skeleton.Image active style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 10 }} />
          <Skeleton active paragraph={{ rows: 1 }} title={{ width: '80%' }} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

function EmptyHint({ children }) {
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
      {children}
    </div>
  );
}

// ─── CREATE PLAYLIST MODAL
function CreatePlaylistModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim(), public: isPublic });
      onClose();
    } catch {} finally { setBusy(false); }
  };

  return (
    <ModalShell onClose={onClose} title="Create Playlist">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          autoFocus value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name" maxLength={100}
          style={modalInputStyle}
        />
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)" rows={3} maxLength={300}
          style={{ ...modalInputStyle, resize: 'vertical', minHeight: 70 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
            style={{ accentColor: '#1ed760' }} />
          Public playlist
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{
            padding: '10px 18px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button type="submit" disabled={!name.trim() || busy} style={{
            padding: '10px 22px', borderRadius: 50, border: 'none',
            background: !name.trim() ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #1ed760, #15a849)',
            color: '#000', fontSize: 13, fontWeight: 700,
            cursor: !name.trim() || busy ? 'not-allowed' : 'pointer',
          }}>{busy ? 'Creating...' : 'Create'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── ADD TO PLAYLIST MODAL
function AddToPlaylistModal({ track, playlists, ownerId, onClose, onAdd, onCreateNew }) {
  const [filter, setFilter] = useState('');
  const ownPlaylists = (playlists || []).filter(p => p.owner?.id === ownerId);
  const filtered = ownPlaylists.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <ModalShell onClose={onClose} title={`Add "${track.name}" to...`}>
      <div className="music-search-shell" style={{
        ...searchBoxStyle, marginBottom: 12, padding: '8px 12px',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Find a playlist..." style={searchInputStyle} autoFocus />
      </div>

      <button onClick={onCreateNew} style={{
        width: '100%', padding: '12px 14px', marginBottom: 10,
        background: 'rgba(30,215,96,0.1)', border: '1px solid rgba(30,215,96,0.3)',
        borderRadius: 10, color: '#1ed760', fontWeight: 700, fontSize: 13,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        New playlist
      </button>

      <div style={{ maxHeight: 320, overflowY: 'auto', marginX: -4 }} className="music-hrow">
        {filtered.length === 0 ? (
          <EmptyHint>No playlists{filter ? ' match' : ' yet'}.</EmptyHint>
        ) : (
          filtered.map(p => (
            <div key={p.id} onClick={() => onAdd(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: 8, borderRadius: 8, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {pickImage(p.images, false) ? (
                <img src={pickImage(p.images, false)} alt="" width={40} height={40} style={{ borderRadius: 6, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 6, background: 'linear-gradient(135deg, #1ed760, #b388ff)', flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{p.owner?.display_name || ''}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
}

// ─── MODAL SHELL
function ModalShell({ title, onClose, children }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'modal-in 0.2s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440,
        background: 'linear-gradient(180deg, #161634, #0d0d2b)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18, padding: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const modalInputStyle = {
  width: '100%', padding: '10px 14px', fontSize: 14,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

function ErrorBox({ children }) {
  return (
    <div style={{
      padding: '10px 14px', fontSize: 12, color: '#ff6b9d',
      background: 'rgba(233,30,140,0.08)', border: '1px solid rgba(233,30,140,0.2)',
      borderRadius: 10, margin: '12px 0',
    }}>{children}</div>
  );
}

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #07071a 0%, #0d0d2b 50%, #07071a 100%)',
  color: '#fff', fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Inter, sans-serif",
  paddingBottom: 0,
};
const glowStyle = {
  position: 'fixed', top: '-120px', left: '50%', transform: 'translateX(-50%)',
  width: '900px', height: '500px', maxWidth: '100%',
  background: 'radial-gradient(ellipse, rgba(30,215,96,0.10) 0%, rgba(179,136,255,0.06) 40%, transparent 70%)',
  pointerEvents: 'none', zIndex: 0,
};
const backLinkStyle = {
  color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14,
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '0 16px',
};
const headerStyle = { position: 'relative', zIndex: 1 };
const statusPillStyle = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '4px 12px', borderRadius: 50,
  background: active ? 'rgba(30,215,96,0.1)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${active ? 'rgba(30,215,96,0.25)' : 'rgba(255,255,255,0.08)'}`,
  marginBottom: 8,
});
const titleStyle = {
  fontFamily: "'Dancing Script', cursive",
  fontSize: 'clamp(2.2rem, 6vw, 3rem)', fontWeight: 700,
  background: 'linear-gradient(135deg, #1ed760, #b388ff, #e91e8c)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  margin: 0,
};
const greetingStyle = {
  fontSize: 'clamp(1.6rem, 4vw, 2rem)', fontWeight: 800, color: '#fff',
  margin: '0 0 24px', letterSpacing: '-0.01em',
};
const artistLinkStyle = {
  background: 'transparent', border: 'none', padding: 0, margin: 0,
  color: 'inherit', font: 'inherit', cursor: 'pointer',
  textDecoration: 'none', fontWeight: 500,
};
const profileChipBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '4px 12px 4px 4px', borderRadius: 50,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', cursor: 'pointer', minHeight: 40,
};
const profileDropdownStyle = {
  position: 'absolute', top: '100%', right: 0, marginTop: 6,
  background: 'rgba(20,20,40,0.98)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12, minWidth: 180, zIndex: 1000,
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
  overflow: 'hidden',
};
const dropdownItemStyle = {
  width: '100%', padding: '10px 14px', fontSize: 13, color: '#fff',
  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
  borderTop: '1px solid rgba(255,255,255,0.06)',
};
const avatarFallbackStyle = {
  width: 32, height: 32, borderRadius: '50%',
  background: '#1ed760', color: '#000', fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
  flexShrink: 0,
};
const premiumPillStyle = {
  padding: '2px 6px', borderRadius: 50,
  background: 'rgba(30,215,96,0.2)', color: '#1ed760',
  fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
};
const connectBtnStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  background: 'linear-gradient(135deg, #1ed760, #15a849)',
  color: '#000', padding: '10px 18px', borderRadius: 50,
  textDecoration: 'none', fontWeight: 700, fontSize: 13,
  boxShadow: '0 4px 20px rgba(30,215,96,0.25)', transition: 'transform 0.15s',
  border: 'none', cursor: 'pointer',
};
const tabBarStyle = {
  display: 'flex', gap: 6, padding: 6,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, marginBottom: 24,
  backdropFilter: 'blur(12px)',
  overflowX: 'auto', WebkitOverflowScrolling: 'touch',
};
const tabBtnStyle = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 18px', borderRadius: 10,
  background: active ? 'linear-gradient(135deg, rgba(30,215,96,0.18), rgba(179,136,255,0.18))' : 'transparent',
  border: active ? '1px solid rgba(30,215,96,0.3)' : '1px solid transparent',
  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  whiteSpace: 'nowrap', flex: '0 0 auto',
  fontFamily: 'inherit', minHeight: 40,
});
const subTabBtnStyle = (active) => ({
  padding: '8px 16px', borderRadius: 50,
  background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
  border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit',
});
const searchBoxStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '6px 12px',
  backdropFilter: 'blur(12px)',
};
const searchInputStyle = {
  flex: 1, padding: '8px 4px', fontSize: 13,
  background: 'transparent', border: 'none', color: '#fff', outline: 'none',
  fontFamily: 'inherit', minWidth: 0,
};
const clearBtnStyle = {
  background: 'rgba(255,255,255,0.08)', border: 'none',
  color: 'rgba(255,255,255,0.5)', width: 24, height: 24, borderRadius: '50%',
  cursor: 'pointer', fontSize: 16, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
const hRowStyle = {
  display: 'flex', gap: 14, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
  padding: '4px 0 16px',
  scrollbarWidth: 'thin',
};
const cardStyle = {
  flex: '0 0 auto', width: 160,
  padding: 12, borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(8px)',
  cursor: 'pointer',
  transition: 'all 0.2s',
};
const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))',
  gap: 14,
};
const cardGridItemStyle = {
  padding: 12, borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(8px)',
  cursor: 'pointer',
  transition: 'all 0.2s',
};
const collectionArtStyle = {
  width: 200, height: 200, borderRadius: 12, objectFit: 'cover',
  flexShrink: 0,
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
};
const backBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 14px', borderRadius: 50,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit',
};
const bigPlayBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '12px 28px', borderRadius: 50,
  background: '#1ed760', color: '#000',
  fontSize: 14, fontWeight: 800, cursor: 'pointer',
  border: 'none',
  boxShadow: '0 6px 20px rgba(30,215,96,0.3)',
  transition: 'transform 0.15s',
  fontFamily: 'inherit',
};
const progressBarStyle = {
  position: 'relative', height: 4,
  background: 'rgba(255,255,255,0.12)', borderRadius: 3, cursor: 'pointer',
};
const ctrlBtn = (primary) => ({
  width: primary ? 36 : 30, height: primary ? 36 : 30, borderRadius: '50%',
  background: primary ? '#fff' : 'transparent',
  color: primary ? '#000' : 'rgba(255,255,255,0.7)',
  border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: primary ? 14 : 13, transition: 'transform 0.15s', flexShrink: 0,
  fontFamily: 'inherit',
});
const iconBtnStyle = (color) => ({
  width: 32, height: 32, borderRadius: '50%',
  background: 'transparent', border: 'none',
  color, fontSize: 16, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'transform 0.15s',
  fontFamily: 'inherit',
});
const bottomPlayerStyle = {
  position: 'fixed', bottom: 12, left: 12, right: 12,
  zIndex: 50,
  display: 'flex', alignItems: 'center', gap: 16,
  padding: '12px 18px',
  background: 'rgba(15,15,30,0.85)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  backdropFilter: 'blur(20px)',
  boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
  flexWrap: 'wrap',
};
const mobileEmbedStyle = {
  position: 'fixed', bottom: 8, left: 8, right: 8, zIndex: 50,
  background: 'rgba(0,0,0,0.6)', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  padding: 4, backdropFilter: 'blur(12px)',
};
