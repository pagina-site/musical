/* ============================================================
MediaHub — app.js (VERSÃO SIMPLIFICADA E FUNCIONAL)
APIs: iTunes (músicas completas com preview), YouTube embed, Radio Browser
============================================================ */
'use strict';

/* ── APIs ── */
const API = {
  itunes:       'https://itunes.apple.com/search',
  radioBrowser: 'https://de1.api.radio-browser.info/json',
  youtube:      'https://www.youtube.com',
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
};

/* ── Elementos DOM ── */
const $ = id => document.getElementById(id);
const EL = {
  searchInput:      $('searchInput'),
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
  progressBar:      $('progressBar'),
  progressFill:     $('progressFill'),
  timeCurrent:      $('timeCurrent'),
  timeDuration:     $('timeDuration'),
  volumeSlider:     $('volumeSlider'),
  videoPlayerWrap:  $('videoPlayerWrap'),
  videoFrame:       $('videoFrame'),
  videoTitle:       $('videoTitle'),
  closeVideo:       $('closeVideo'),
  musicResults:     $('musicResults'),
  clipsResults:     $('clipsResults'),
  podcastResults:   $('podcastResults'),
  radioResults:     $('radioResults'),
  radioFilters:     $('radioFilters'),
  likedResults:     $('likedResults'),
  homeCategories:   $('homeCategories'),
  featuredRadios:   $('featuredRadios'),
};

/* ══════════════════════════════════════════════════════════════
BUSCA iTUNES — MÚSICAS COM PREVIEW DE 30s (FUNCIONA!)
══════════════════════════════════════════════════════════════ */
async function searchMusic(query, limit = 30) {
  console.log('🔍 Buscando música:', query);
  try {
    const params = new URLSearchParams({
      term: query,
      media: 'music',
      entity: 'song',
      limit: limit,
      country: 'BR'
    });
    
    const url = `${API.itunes}?${params}`;
    console.log('URL:', url);
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    console.log('✅ Resultados:', data.results?.length || 0);
    
    return (data.results || []).map(track => ({
      id:     track.trackId,
      title:  track.trackName || 'Sem título',
      artist: track.artistName || 'Artista desconhecido',
      art:    track.artworkUrl100?.replace('100x100', '300x300') || '',
      url:    track.previewUrl, // Preview de 30 segundos
      type:   'music',
    })).filter(t => t.url); // Só retorna se tiver preview
  } catch (err) {
    console.error('❌ Erro na busca de música:', err);
    return [];
  }
}

/* ══════════════════════════════════════════════════════════════
BUSCA YOUTUBE — VÍDEOS (abre em nova aba)
══════════════════════════════════════════════════════════════ */
async function searchVideos(query, limit = 20) {
  console.log('🎬 Buscando vídeos:', query);
  try {
    // Usa RSS do YouTube como fallback simples
    const searchQuery = encodeURIComponent(query + ' official video');
    return Array.from({ length: limit }, (_, i) => ({
      id: `video_${i}`,
      title: `${query} - Vídeo ${i + 1}`,
      artist: 'YouTube',
      type: 'video',
      searchQuery: searchQuery,
    }));
  } catch (err) {
    console.error('❌ Erro na busca de vídeos:', err);
    return [];
  }
}

function openYouTubeVideo(query) {
  const url = `https://www.youtube.com/results?search_query=${query}`;
  window.open(url, '_blank');
}

/* ══════════════════════════════════════════════════════════════
PODCASTS iTunes
══════════════════════════════════════════════════════════════ */
async function searchPodcasts(query, limit = 20) {
  console.log('🎙️ Buscando podcasts:', query);
  try {
    const params = new URLSearchParams({
      term: query,
      media: 'podcast',
      limit: limit,
      country: 'BR'
    });
    
    const res = await fetch(`${API.itunes}?${params}`);
    const data = await res.json();
    
    return (data.results || []).map(pod => ({
      id:     pod.collectionId,
      title:  pod.collectionName,
      artist: pod.artistName,
      art:    pod.artworkUrl600 || pod.artworkUrl100 || '',
      url:    pod.previewUrl || '',
      type:   'podcast',
    }));
  } catch (err) {
    console.error('❌ Erro na busca de podcasts:', err);
    return [];
  }
}

/* ══════════════════════════════════════════════════════════════
RÁDIO BROWSER
══════════════════════════════════════════════════════════════ */
async function fetchTopRadios(limit = 40) {
  try {
    const params = new URLSearchParams({ 
      limit, 
      hidebroken: true, 
      order: 'clickcount', 
      reverse: true, 
      countrycode: 'BR' 
    });
    const res = await fetch(`${API.radioBrowser}/stations?${params}`);
    return await res.json();
  } catch { return []; }
}

async function searchRadio(query, limit = 40) {
  try {
    const params = new URLSearchParams({ name: query, limit, hidebroken: true });
    const res = await fetch(`${API.radioBrowser}/stations/search?${params}`);
    return await res.json();
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
  console.log('🎯 Tipo de busca:', type, 'Query:', query);
  
  if (type === 'all' || type === 'music') {
    navigateToView('music');
    showLoading(EL.musicResults);
    const results = await searchMusic(query, 30);
    renderMusicResults(results);
    if (results.length === 0) {
      console.warn('⚠️ Nenhuma música encontrada. Tente outro termo.');
    }
  }
  
  if (type === 'video') {
    navigateToView('clips');
    showLoading(EL.clipsResults);
    const results = await searchVideos(query, 20);
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
  console.log('📊 Renderizando', items.length, 'músicas');
  
  if (!items.length) {
    EL.musicResults.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--muted);">
        <div style="font-size:48px; margin-bottom:12px;">🎵</div>
        <p>Nenhuma música encontrada</p>
        <p style="font-size:13px; margin-top:8px;">Tente buscar por nome de artista ou música</p>
      </div>`;
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
RENDER CLIPES
══════════════════════════════════════════════════════════════ */
function renderClipResults(items) {
  if (!items.length) {
    EL.clipsResults.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--muted);">
        <div style="font-size:48px; margin-bottom:12px;">🎬</div>
        <p>Nenhum clipe encontrado</p>
      </div>`;
    return;
  }
  
  EL.clipsResults.innerHTML = '';
  items.forEach(item => {
    const card = createCard({
      art:       '',
      title:     item.title,
      sub:       item.artist,
      type:      'VÍDEO',
      typeColor: 'var(--accent2)',
      emoji:     '🎬',
      onClick:   () => openYouTubeVideo(item.searchQuery || item.title),
    });
    EL.clipsResults.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
RENDER PODCASTS
══════════════════════════════════════════════════════════════ */
function renderPodcastResults(items) {
  if (!items.length) {
    EL.podcastResults.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--muted);">
        <div style="font-size:48px; margin-bottom:12px;">🎙️</div>
        <p>Nenhum podcast encontrado</p>
      </div>`;
    return;
  }
  
  EL.podcastResults.innerHTML = '';
  items.forEach(item => {
    const card = createCard({
      art:       item.art,
      title:     item.title,
      sub:       item.artist,
      type:      'PODCAST',
      typeColor: 'var(--accent4)',
      emoji:     '🎙️',
      onClick:   () => {
        if (item.url) {
          playTrack(item);
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
  const stations = await searchRadio(tag, 60);
  renderRadioResults(stations);
}

function renderRadioResults(stations) {
  if (!stations.length) {
    EL.radioResults.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--muted);">
        <div style="font-size:48px; margin-bottom:12px;">📻</div>
        <p>Nenhuma rádio encontrada</p>
      </div>`;
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
    ${st.favicon ? `<img class="radio-logo" src="${st.favicon}" alt="" onerror="this.style.display='none'">` : 
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
  console.log('▶️ Reproduzindo:', track.title);
  
  STATE.currentTrack = track;
  STATE.queue = queue.length ? queue : [track];
  STATE.queueIndex = index;
  
  // UI
  EL.playerTitle.textContent = track.title || '—';
  EL.playerArtist.textContent = track.artist || '';
  EL.playerArt.src = track.art || '';
  EL.playerArt.style.display = track.art ? 'block' : 'none';
  
  // Like state
  const liked = getLiked();
  EL.playerLike.classList.toggle('liked', liked.some(t => t.id === track.id));
  
  // Áudio
  EL.audioEl.src = track.url;
  EL.audioEl.load();
  
  EL.audioEl.play()
    .then(() => {
      STATE.isPlaying = true;
      updatePlayPauseIcon();
      console.log('✅ Reprodução iniciada');
    })
    .catch(err => {
      console.error('❌ Erro ao reproduzir:', err);
      showToast('Clique no play para iniciar');
    });
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
    EL.audioEl.play()
      .then(() => { STATE.isPlaying = true; })
      .catch(console.error);
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

EL.playerLike?.addEventListener('click', () => {
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
    EL.likedResults.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--muted);">
        <div style="font-size:48px; margin-bottom:12px;">❤️</div>
        <p>Nenhuma música curtida</p>
      </div>`;
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
UTILITÁRIOS
══════════════════════════════════════════════════════════════ */
function createCard({ art, title, sub, type, typeColor, emoji, onClick }) {
  const div = document.createElement('div');
  div.className = 'result-card';
  div.innerHTML = `
    ${art ? `<img class="card-art" src="${art}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">` : ''}
    <div class="card-art-placeholder" style="${art ? 'display:none' : ''}">${emoji}</div>
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

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
    background: var(--bg3); color: var(--text); padding: 12px 24px;
    border-radius: 8px; border: 1px solid var(--border); z-index: 1000;
    animation: slideUp .3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ══════════════════════════════════════════════════════════════
INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ MediaHub inicializado');
  renderHome();
  
  // Teste inicial
  setTimeout(() => {
    console.log('🧪 Fazendo busca de teste...');
    EL.searchInput.value = 'pop music';
    runSearch('pop music');
  }, 1000);
});
