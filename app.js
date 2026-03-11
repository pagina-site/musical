/* ============================================================
MediaHub — app.js (VERSÃO FUNCIONAL)
Fontes: YouTube (Piped), Radio Browser, iTunes Podcasts, Jamendo
============================================================ */
'use strict';

/* ── APIs ── */
const API = {
  piped:        'https://pipedapi.kavin.rocks',
  pipedAlt:     'https://pipedapi.adminforge.de',
  radioBrowser: 'https://de1.api.radio-browser.info/json',
  itunes:       'https://itunes.apple.com/search',
  jamendo:      'https://api.jamendo.com/3.0',
  lyrics:       'https://api.lyrics.ovh/v1',
};

/* ── Estado ── */
const STATE = {
  currentTrack:     null,
  queue:            [],
  queueIndex:       -1,
  shuffle:          false,
  repeat:           false,
  isPlaying:        false,
  searchType:       'all',
  activeView:       'home',
  activePlaylistId: null,
};

/* ── Elementos DOM ── */
const $ = id => document.getElementById(id);
const EL = {
  searchInput:      $('searchInput'),
  main:             $('main'),
  audioEl:          $('audioEl'),
  playerArt:        $('playerArt'),
  playerTitle:      $('playerTitle'),
  playerArtist:     $('playerArtist'),
  playerLike:       $('playerLike'),
  btnPlayPause:     $('btnPlayPause'),
  iconPlay:         $('iconPlay'),
  iconPause:        $('iconPause'),
  btnPrev:          $('btnPrev'),
  btnNext:          $('btnNext'),
  btnShuffle:       $('btnShuffle'),
  btnRepeat:        $('btnRepeat'),
  btnLyrics:        $('btnLyrics'),
  btnAddToPlaylist: $('btnAddToPlaylist'),
  progressBar:      $('progressBar'),
  progressFill:     $('progressFill'),
  timeCurrent:      $('timeCurrent'),
  timeDuration:     $('timeDuration'),
  volumeSlider:     $('volumeSlider'),
  videoPlayerWrap:  $('videoPlayerWrap'),
  videoFrame:       $('videoFrame'),
  videoTitle:       $('videoTitle'),
  closeVideo:       $('closeVideo'),
  lyricsModal:      $('lyricsModal'),
  lyricsContent:    $('lyricsContent'),
  musicResults:     $('musicResults'),
  clipsResults:     $('clipsResults'),
  podcastResults:   $('podcastResults'),
  radioResults:     $('radioResults'),
  radioFilters:     $('radioFilters'),
  likedResults:     $('likedResults'),
  homeCategories:   $('homeCategories'),
  featuredRadios:   $('featuredRadios'),
  playlistGrid:     $('playlistGrid'),
};

/* ══════════════════════════════════════════════════════════════
BUSCA YOUTUBE (PIPED) — ÁUDIO COMPLETO
══════════════════════════════════════════════════════════════ */
async function searchYouTube(query, limit = 20) {
  const endpoints = [API.piped, API.pipedAlt];
  
  for (const base of endpoints) {
    try {
      const url = `${base}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const items = (data.items || []).filter(i => i.type === 'stream').slice(0, limit);
      
      return items.map(i => ({
        id:       i.url?.replace('/watch?v=', '') || '',
        title:    i.title || 'Sem título',
        artist:   i.uploaderName || 'Artista desconhecido',
        art:      i.thumbnail || '',
        url:      `https://www.youtube.com/watch?v=${i.url?.replace('/watch?v=', '')}`,
        type:     'music',
        videoId:  i.url?.replace('/watch?v=', ''),
      }));
    } catch { continue; }
  }
  return [];
}

/* ══════════════════════════════════════════════════════════════
BUSCA VÍDEOS (PIPED)
══════════════════════════════════════════════════════════════ */
async function searchYouTubeVideos(query, limit = 20) {
  const endpoints = [API.piped, API.pipedAlt];
  
  for (const base of endpoints) {
    try {
      const url = `${base}/search?q=${encodeURIComponent(query)}&filter=videos`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const items = (data.items || []).filter(i => i.type === 'stream').slice(0, limit);
      
      return items.map(i => ({
        id:       i.url?.replace('/watch?v=', '') || '',
        title:    i.title || 'Sem título',
        artist:   i.uploaderName || '',
        art:      i.thumbnail || '',
        videoId:  i.url?.replace('/watch?v=', ''),
        type:     'video',
      }));
    } catch { continue; }
  }
  return [];
}

/* ══════════════════════════════════════════════════════════════
RÁDIO BROWSER
══════════════════════════════════════════════════════════════ */
async function fetchTopRadios(limit = 40) {
  try {
    const params = new URLSearchParams({ limit, hidebroken: true, order: 'clickcount', reverse: true, countrycode: 'BR' });
    const res = await fetch(`${API.radioBrowser}/stations?${params}`);
    return await res.json();
  } catch { return []; }
}

async function searchRadio(query, limit = 40) {
  try {
    const params = new URLSearchParams({ name: query, limit, hidebroken: true, order: 'votes' });
    const res = await fetch(`${API.radioBrowser}/stations/search?${params}`);
    return await res.json();
  } catch { return []; }
}

async function fetchRadioByTag(tag, limit = 40) {
  try {
    const params = new URLSearchParams({ tag, limit, hidebroken: true, order: 'votes' });
    const res = await fetch(`${API.radioBrowser}/stations/bytag?${params}`);
    return await res.json();
  } catch { return []; }
}

/* ══════════════════════════════════════════════════════════════
PODCASTS (iTunes)
══════════════════════════════════════════════════════════════ */
async function searchPodcasts(query, limit = 20) {
  try {
    const params = new URLSearchParams({ term: query, media: 'podcast', limit, country: 'BR' });
    const res = await fetch(`${API.itunes}?${params}`);
    const data = await res.json();
    return data.results || [];
  } catch { return []; }
}

/* ══════════════════════════════════════════════════════════════
BUSCA PRINCIPAL
══════════════════════════════════════════════════════════════ */
let searchDebounce = null;

EL.searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = EL.searchInput.value.trim();
  if (!q) return;
  searchDebounce = setTimeout(() => runSearch(q), 600);
});

EL.searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    clearTimeout(searchDebounce);
    const q = EL.searchInput.value.trim();
    if (q) runSearch(q);
  }
});

async function runSearch(query) {
  const type = STATE.searchType;
  
  if (type === 'all' || type === 'music') {
    navigateToView('music');
    showLoading(EL.musicResults);
    const results = await searchYouTube(query, 30);
    renderMusicResults(results);
  }
  
  if (type === 'video') {
    navigateToView('clips');
    showLoading(EL.clipsResults);
    const results = await searchYouTubeVideos(query, 24);
    renderClipResults(results);
  }
  
  if (type === 'podcast') {
    navigateToView('podcasts');
    showLoading(EL.podcastResults);
    const results = await searchPodcasts(query, 24);
    renderPodcastResults(results);
  }
  
  if (type === 'radio') {
    navigateToView('radio');
    loadRadioView(query);
  }
}

/* ══════════════════════════════════════════════════════════════
RENDER MÚSICAS
══════════════════════════════════════════════════════════════ */
function renderMusicResults(items) {
  if (!items.length) {
    EL.musicResults.innerHTML = emptyState('🎵', 'Nenhuma música encontrada');
    return;
  }
  
  EL.musicResults.innerHTML = '';
  items.forEach((track, i) => {
    const card = createCard({
      art:       track.art,
      title:     track.title,
      sub:       track.artist,
      type:      'MÚSICA',
      typeColor: 'var(--accent)',
      emoji:     '🎵',
      onClick:   () => playTrack(track, items, i),
    });
    EL.musicResults.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
RENDER CLIPES (COM EMBED FUNCIONAL)
══════════════════════════════════════════════════════════════ */
function renderClipResults(items) {
  if (!items.length) {
    EL.clipsResults.innerHTML = emptyState('🎬', 'Nenhum clipe encontrado');
    return;
  }
  
  EL.clipsResults.innerHTML = '';
  items.forEach(item => {
    const card = createCard({
      art:       item.art,
      title:     item.title,
      sub:       item.artist,
      type:      'VÍDEO',
      typeColor: 'var(--accent2)',
      emoji:     '🎬',
      onClick:   () => playVideo(item.videoId, item.title, item.artist),
    });
    EL.clipsResults.appendChild(card);
  });
}

function playVideo(videoId, title, artist) {
  if (!videoId) return;
  EL.videoTitle.textContent = title;
  EL.videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  EL.videoPlayerWrap.classList.remove('hidden');
}

EL.closeVideo.addEventListener('click', () => {
  EL.videoFrame.src = '';
  EL.videoPlayerWrap.classList.add('hidden');
});

/* ══════════════════════════════════════════════════════════════
RENDER PODCASTS
══════════════════════════════════════════════════════════════ */
function renderPodcastResults(items) {
  if (!items.length) {
    EL.podcastResults.innerHTML = emptyState('🎙️', 'Nenhum podcast encontrado');
    return;
  }
  
  EL.podcastResults.innerHTML = '';
  items.forEach(item => {
    const art = item.artworkUrl600 || item.artworkUrl100 || '';
    const card = createCard({
      art,
      title:     item.collectionName || item.trackName,
      sub:       item.artistName,
      type:      'PODCAST',
      typeColor: 'var(--accent4)',
      emoji:     '🎙️',
      onClick:   () => {
        if (item.previewUrl) {
          playTrack({
            id:     item.trackId,
            title:  item.collectionName,
            artist: item.artistName,
            art:    art,
            url:    item.previewUrl,
            type:   'podcast',
          });
        }
      },
    });
    EL.podcastResults.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
RENDER RÁDIO
══════════════════════════════════════════════════════════════ */
const RADIO_TAGS = ['pop','rock','jazz','electronic','mpb','samba','gospel','news'];

async function loadRadioView(query = '') {
  EL.radioResults.innerHTML = `<div class="loading-state"><div class="spinner"></div> Carregando…</div>`;
  
  if (!EL.radioFilters.children.length) {
    RADIO_TAGS.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'radio-filter-btn';
      btn.textContent = tag.toUpperCase();
      btn.addEventListener('click', () => {
        document.querySelectorAll('.radio-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadRadioByTag(tag);
      });
      EL.radioFilters.appendChild(btn);
    });
  }
  
  const stations = query ? await searchRadio(query) : await fetchTopRadios(60);
  renderRadioResults(stations);
}

async function loadRadioByTag(tag) {
  EL.radioResults.innerHTML = `<div class="loading-state"><div class="spinner"></div> Carregando…</div>`;
  const stations = await fetchRadioByTag(tag, 60);
  renderRadioResults(stations);
}

function renderRadioResults(stations) {
  if (!stations.length) {
    EL.radioResults.innerHTML = emptyState('📻', 'Nenhuma rádio encontrada');
    return;
  }
  
  EL.radioResults.innerHTML = '';
  stations.forEach(st => {
    const card = createRadioCard(st);
    EL.radioResults.appendChild(card);
  });
}

function createRadioCard(st) {
  const div = document.createElement('div');
  div.className = 'radio-card';
  div.innerHTML = `
    ${st.favicon ? `<img class="radio-logo" src="${st.favicon}" alt="">` : 
      `<div class="radio-logo-placeholder">📻</div>`}
    <div class="radio-info">
      <div class="radio-name">${escHtml(st.name)}</div>
      <div class="radio-genre">${escHtml(st.tags?.split(',')[0] || st.country || '')}</div>
      <div class="radio-live">AO VIVO</div>
    </div>
  `;
  
  div.addEventListener('click', () => {
    document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('playing'));
    div.classList.add('playing');
    playTrack({
      id:     st.stationuuid,
      title:  st.name,
      artist: st.tags?.split(',')[0] || 'Rádio',
      art:    st.favicon || '',
      url:    st.url_resolved || st.url,
      type:   'radio',
    });
  });
  
  return div;
}

/* ══════════════════════════════════════════════════════════════
PLAYER DE ÁUDIO
══════════════════════════════════════════════════════════════ */
function playTrack(track, queue = [], index = 0) {
  STATE.currentTrack = track;
  STATE.queue = queue.length ? queue : [track];
  STATE.queueIndex = index;
  
  // UI
  EL.playerTitle.textContent = track.title || '—';
  EL.playerArtist.textContent = track.artist || '';
  EL.playerArt.src = track.art || '';
  EL.playerArt.style.display = track.art ? 'block' : 'none';
  EL.btnAddToPlaylist.style.display = (track.type !== 'radio') ? 'flex' : 'none';
  
  // Like state
  const liked = getLiked();
  EL.playerLike.classList.toggle('liked', liked.some(t => t.id === track.id));
  
  // Áudio
  EL.audioEl.src = track.url;
  EL.audioEl.load();
  EL.audioEl.play().catch(() => {});
  STATE.isPlaying = true;
  updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
  EL.iconPlay.style.display = STATE.isPlaying ? 'none' : 'block';
  EL.iconPause.style.display = STATE.isPlaying ? 'block' : 'none';
}

EL.btnPlayPause.addEventListener('click', () => {
  if (!STATE.currentTrack) return;
  if (STATE.isPlaying) {
    EL.audioEl.pause();
    STATE.isPlaying = false;
  } else {
    EL.audioEl.play();
    STATE.isPlaying = true;
  }
  updatePlayPauseIcon();
});

EL.btnNext.addEventListener('click', () => skipTrack(1));
EL.btnPrev.addEventListener('click', () => skipTrack(-1));

function skipTrack(dir) {
  if (!STATE.queue.length) return;
  
  if (STATE.shuffle) {
    STATE.queueIndex = Math.floor(Math.random() * STATE.queue.length);
  } else {
    STATE.queueIndex = (STATE.queueIndex + dir + STATE.queue.length) % STATE.queue.length;
  }
  
  playTrack(STATE.queue[STATE.queueIndex], STATE.queue, STATE.queueIndex);
}

EL.audioEl.addEventListener('ended', () => {
  if (STATE.repeat === 'one') {
    EL.audioEl.currentTime = 0;
    EL.audioEl.play();
  } else if (STATE.queue.length > 1) {
    skipTrack(1);
  } else {
    STATE.isPlaying = false;
    updatePlayPauseIcon();
  }
});

/* Shuffle & Repeat */
EL.btnShuffle.addEventListener('click', () => {
  STATE.shuffle = !STATE.shuffle;
  EL.btnShuffle.classList.toggle('active', STATE.shuffle);
});

EL.btnRepeat.addEventListener('click', () => {
  const modes = [false, 'one', 'all'];
  STATE.repeat = modes[(modes.indexOf(STATE.repeat) + 1) % modes.length];
  EL.btnRepeat.classList.toggle('active', !!STATE.repeat);
  EL.btnRepeat.title = STATE.repeat === 'one' ? 'Repetir esta' : STATE.repeat === 'all' ? 'Repetir tudo' : 'Repetir';
});

/* Progresso */
EL.audioEl.addEventListener('timeupdate', () => {
  const { currentTime, duration } = EL.audioEl;
  if (!duration || isNaN(duration)) return;
  const pct = (currentTime / duration) * 100;
  EL.progressFill.style.width = `${pct}%`;
  EL.timeCurrent.textContent = formatTime(currentTime);
  EL.timeDuration.textContent = formatTime(duration);
});

EL.progressBar.addEventListener('click', e => {
  const rect = EL.progressBar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  if (EL.audioEl.duration) EL.audioEl.currentTime = pct * EL.audioEl.duration;
});

/* Volume */
EL.audioEl.volume = 0.8;
EL.volumeSlider.addEventListener('input', () => {
  EL.audioEl.volume = parseFloat(EL.volumeSlider.value);
});

/* ══════════════════════════════════════════════════════════════
NAVEGAÇÃO
══════════════════════════════════════════════════════════════ */
function navigateTo(view) {
  STATE.activeView = view;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const target = $(`view-${view}`);
  if (target) target.classList.add('active');
  
  if (view === 'home') renderHome();
  if (view === 'radio') loadRadioView();
  if (view === 'liked') renderLiked();
  if (view === 'playlists') renderPlaylistGrid();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.view));
});

function navigateToView(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const target = $(`view-${view}`);
  if (target) target.classList.add('active');
  STATE.activeView = view;
}

/* Filtros de busca */
document.querySelectorAll('.ftab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    STATE.searchType = tab.dataset.type;
    const q = EL.searchInput.value.trim();
    if (q) runSearch(q);
  });
});

/* ══════════════════════════════════════════════════════════════
HOME
══════════════════════════════════════════════════════════════ */
const HOME_CATEGORIES = [
  { name: 'Pop', emoji: '🎤', color: '#ff4772', search: 'pop music' },
  { name: 'Rock', emoji: '🎸', color: '#ff8c47', search: 'rock music' },
  { name: 'Hip-Hop', emoji: '🎧', color: '#a847ff', search: 'hip hop' },
  { name: 'Eletrônica', emoji: '🎛️', color: '#47c8ff', search: 'electronic music' },
  { name: 'MPB', emoji: '🌿', color: '#4dbb7a', search: 'mpb brasileira' },
  { name: 'Samba', emoji: '🥁', color: '#ffb347', search: 'samba' },
];

async function renderHome() {
  EL.homeCategories.innerHTML = '';
  HOME_CATEGORIES.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.style.background = `linear-gradient(135deg, ${cat.color}33, ${cat.color}88)`;
    card.innerHTML = `<div class="cat-emoji">${cat.emoji}</div><div class="cat-name">${cat.name}</div>`;
    card.addEventListener('click', () => {
      EL.searchInput.value = cat.search;
      STATE.searchType = 'music';
      document.querySelectorAll('.ftab').forEach(t => t.classList.toggle('active', t.dataset.type === 'music'));
      runSearch(cat.search);
    });
    EL.homeCategories.appendChild(card);
  });
  
  EL.featuredRadios.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
  const stations = await fetchTopRadios(12);
  EL.featuredRadios.innerHTML = '';
  stations.slice(0, 10).forEach(st => {
    const card = createRadioCard(st);
    EL.featuredRadios.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
CURTIDAS
══════════════════════════════════════════════════════════════ */
function getLiked() {
  try { return JSON.parse(localStorage.getItem('mh_liked') || '[]'); }
  catch { return []; }
}

function saveLiked(arr) {
  localStorage.setItem('mh_liked', JSON.stringify(arr));
}

EL.playerLike.addEventListener('click', () => {
  if (!STATE.currentTrack) return;
  let liked = getLiked();
  const idx = liked.findIndex(t => t.id === STATE.currentTrack.id);
  if (idx >= 0) liked.splice(idx, 1);
  else liked.unshift({ ...STATE.currentTrack });
  saveLiked(liked);
  EL.playerLike.classList.toggle('liked', idx < 0);
  if (STATE.activeView === 'liked') renderLiked();
});

function renderLiked() {
  const liked = getLiked();
  if (!liked.length) {
    EL.likedResults.innerHTML = emptyState('❤️', 'Nenhuma música curtida');
    return;
  }
  EL.likedResults.innerHTML = '';
  liked.forEach((track, i) => {
    const card = createCard({
      art: track.art,
      title: track.title,
      sub: track.artist,
      type: track.type === 'podcast' ? 'PODCAST' : 'MÚSICA',
      typeColor: 'var(--accent2)',
      emoji: '❤️',
      onClick: () => playTrack(track, liked, i),
    });
    EL.likedResults.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
LETRAS
══════════════════════════════════════════════════════════════ */
EL.btnLyrics.addEventListener('click', () => {
  if (!STATE.currentTrack || STATE.currentTrack.type === 'radio') return;
  openLyrics(STATE.currentTrack.artist, STATE.currentTrack.title);
});

async function openLyrics(artist, title) {
  EL.lyricsModal.classList.remove('hidden');
  EL.lyricsContent.textContent = 'Buscando letra…';
  
  try {
    const cleanTitle = title.replace(/(feat\.|ft\.|.*)/g, '').trim();
    const cleanArtist = artist.split(',')[0].trim();
    const url = `${API.lyrics}/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
    const res = await fetch(url);
    const data = await res.json();
    EL.lyricsContent.textContent = data.lyrics || 'Letra não encontrada.';
  } catch {
    EL.lyricsContent.textContent = 'Erro ao buscar letra.';
  }
}

$('closeLyrics').addEventListener('click', () => EL.lyricsModal.classList.add('hidden'));
$('lyricsBackdrop').addEventListener('click', () => EL.lyricsModal.classList.add('hidden'));

/* ══════════════════════════════════════════════════════════════
UTILITÁRIOS
══════════════════════════════════════════════════════════════ */
function createCard({ art, title, sub, type, typeColor, emoji, onClick }) {
  const div = document.createElement('div');
  div.className = 'result-card';
  div.innerHTML = `
    ${art ? `<img class="card-art" src="${art}" alt="">` : 
      `<div class="card-art-placeholder">${emoji}</div>`}
    <div class="card-play-overlay"><button class="card-play-btn">▶</button></div>
    <div class="card-type" style="color:${typeColor}">${type}</div>
    <div class="card-body">
      <div class="card-title">${escHtml(title || '—')}</div>
      <div class="card-sub">${escHtml(sub || '')}</div>
    </div>
  `;
  div.addEventListener('click', onClick);
  return div;
}

function showLoading(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div> Carregando…</div>`;
}

function emptyState(icon, msg) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ══════════════════════════════════════════════════════════════
MOBILE UI
══════════════════════════════════════════════════════════════ */
function initMobileUI() {
  const hamburger = $('hamburgerBtn');
  const sidebar = $('sidebar');
  const backdrop = $('sidebarBackdrop');
  
  function openDrawer() {
    sidebar.classList.add('open');
    backdrop.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }
  
  function closeDrawer() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('visible');
    document.body.style.overflow = '';
  }
  
  hamburger?.addEventListener('click', openDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  
  document.querySelectorAll('#mobileNav .mnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#mobileNav .mnav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      navigateTo(btn.dataset.view);
      if (window.innerWidth <= 768) closeDrawer();
    });
  });
}

/* ══════════════════════════════════════════════════════════════
INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  initMobileUI();
});
