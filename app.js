/* ============================================================
   MediaHub — app.js
   Etapa 2: Navegação, Busca (iTunes + Radio Browser + Podcasts)
            e Player de Áudio
   ============================================================ */

'use strict';

/* ── Constantes de API ── */
const API = {
  itunes:       'https://itunes.apple.com/search',
  lyrics:       'https://api.lyrics.ovh/v1',
  radioBrowser: 'https://de1.api.radio-browser.info/json',
};

/* ── Estado global ── */
const STATE = {
  currentTrack:  null,
  queue:         [],
  queueIndex:    -1,
  shuffle:       false,
  repeat:        false,        // false | 'one' | 'all'
  isPlaying:     false,
  searchType:    'all',        // all | music | video | podcast | radio
  activeView:    'home',
  activePlaylistId: null,
};

/* ── Elementos do DOM ── */
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
  progressThumb:    $('progressThumb'),
  timeCurrent:      $('timeCurrent'),
  timeDuration:     $('timeDuration'),
  volumeSlider:     $('volumeSlider'),
  videoPlayerWrap:  $('videoPlayerWrap'),
  videoFrame:       $('videoFrame'),
  videoTitle:       $('videoTitle'),
  closeVideo:       $('closeVideo'),
  lyricsModal:      $('lyricsModal'),
  lyricsContent:    $('lyricsContent'),
  lyricsSongTitle:  $('lyricsSongTitle'),
  lyricsArtistName: $('lyricsArtistName'),
  closeLyrics:      $('closeLyrics'),
  lyricsBackdrop:   $('lyricsBackdrop'),
  playlistModal:    $('playlistModal'),
  playlistBackdrop: $('playlistBackdrop'),
  closePlaylistModal: $('closePlaylistModal'),
  playlistNameInput:  $('playlistNameInput'),
  confirmCreatePlaylist: $('confirmCreatePlaylist'),
  emojiGrid:        $('emojiGrid'),
  addToPlaylistModal: $('addToPlaylistModal'),
  addBackdrop:      $('addBackdrop'),
  closeAddModal:    $('closeAddModal'),
  addPlaylistList:  $('addPlaylistList'),
  btnNewPlaylist:   $('btnNewPlaylist'),
  btnNewPlaylist2:  $('btnNewPlaylist2'),
  playlistsList:    $('playlistsList'),
  playlistGrid:     $('playlistGrid'),
  plDetailArt:      $('plDetailArt'),
  plDetailName:     $('plDetailName'),
  plDetailCount:    $('plDetailCount'),
  plPlayAll:        $('plPlayAll'),
  plDeleteBtn:      $('plDeleteBtn'),
  plDetailTracks:   $('plDetailTracks'),
  featuredRadios:   $('featuredRadios'),
  homeCategories:   $('homeCategories'),
  musicResults:     $('musicResults'),
  clipsResults:     $('clipsResults'),
  podcastResults:   $('podcastResults'),
  radioResults:     $('radioResults'),
  radioFilters:     $('radioFilters'),
  likedResults:     $('likedResults'),
};

/* ══════════════════════════════════════════════════════════════
   NAVEGAÇÃO
══════════════════════════════════════════════════════════════ */
function navigateTo(view) {
  STATE.activeView = view;

  // Atualiza nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Troca a view visível
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const target = $(`view-${view}`);
  if (target) target.classList.add('active');

  // Ações específicas por view
  if (view === 'home')      renderHome();
  if (view === 'radio')     loadRadioView();
  if (view === 'liked')     renderLiked();
  if (view === 'playlists') renderPlaylistGrid();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.view));
});

/* ══════════════════════════════════════════════════════════════
   FILTROS DE BUSCA (tabs do topbar)
══════════════════════════════════════════════════════════════ */
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
   BUSCA
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

  // Navegar para a view adequada
  if (type === 'all' || type === 'music') navigateToView('music');
  if (type === 'video')   navigateToView('clips');
  if (type === 'podcast') navigateToView('podcasts');
  if (type === 'radio')   navigateToView('radio');

  if (type === 'all') {
    // Busca simultânea em todas as fontes
    showLoading(EL.musicResults);
    showLoading(EL.clipsResults);
    showLoading(EL.podcastResults);

    const [tracks, clips, pods] = await Promise.allSettled([
      searchItunes(query, 'music', 20),
      searchItunes(query, 'musicVideo', 12),
      searchItunes(query, 'podcast', 12),
    ]);

    renderMusicResults(tracks.value || []);
    renderClipResults(clips.value || []);
    renderPodcastResults(pods.value || []);
    navigateToView('music');
    return;
  }

  if (type === 'music') {
    showLoading(EL.musicResults);
    navigateToView('music');
    const results = await searchItunes(query, 'music', 30);
    renderMusicResults(results);
  }

  if (type === 'video') {
    showLoading(EL.clipsResults);
    navigateToView('clips');
    const results = await searchItunes(query, 'musicVideo', 24);
    renderClipResults(results);
  }

  if (type === 'podcast') {
    showLoading(EL.podcastResults);
    navigateToView('podcasts');
    const results = await searchItunes(query, 'podcast', 24);
    renderPodcastResults(results);
  }

  if (type === 'radio') {
    navigateToView('radio');
    loadRadioView(query);
  }
}

function navigateToView(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const target = $(`view-${view}`);
  if (target) target.classList.add('active');
  STATE.activeView = view;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

/* ── iTunes API ── */
async function searchItunes(query, mediaType, limit = 20) {
  const params = new URLSearchParams({
    term:    query,
    media:   mediaType === 'music' ? 'music' : mediaType === 'musicVideo' ? 'music' : 'podcast',
    entity:  mediaType,
    limit:   limit,
    country: 'BR',
  });
  try {
    const res  = await fetch(`${API.itunes}?${params}`);
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/* ── Radio Browser API ── */
async function searchRadio(query, limit = 40) {
  const params = new URLSearchParams({ name: query, limit, hidebroken: true, order: 'votes' });
  try {
    const res  = await fetch(`${API.radioBrowser}/stations/search?${params}`);
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchRadioByTag(tag, limit = 40) {
  const params = new URLSearchParams({ tag, limit, hidebroken: true, order: 'votes' });
  try {
    const res  = await fetch(`${API.radioBrowser}/stations/bytag?${params}`);
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchTopRadios(limit = 40) {
  const params = new URLSearchParams({ limit, hidebroken: true, order: 'clickcount', reverse: true, countrycode: 'BR' });
  try {
    const res  = await fetch(`${API.radioBrowser}/stations?${params}`);
    return await res.json();
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════════════════════════
   RENDER — MÚSICAS
══════════════════════════════════════════════════════════════ */
function renderMusicResults(items) {
  if (!items.length) {
    EL.musicResults.innerHTML = emptyState('🎵', 'Nenhuma música encontrada');
    return;
  }
  EL.musicResults.innerHTML = '';
  items.forEach((item, i) => {
    if (!item.previewUrl) return; // sem preview, sem card
    const art  = (item.artworkUrl100 || '').replace('100x100', '300x300');
    const card = createCard({
      art,
      title:    item.trackName || item.collectionName,
      sub:      item.artistName,
      type:     'MÚSICA',
      typeColor: 'var(--accent)',
      emoji:    '🎵',
      onClick:  () => playTrack({
        id:       item.trackId,
        title:    item.trackName || item.collectionName,
        artist:   item.artistName,
        art:      art,
        url:      item.previewUrl,
        type:     'music',
      }, items.filter(t => t.previewUrl).map(t => ({
        id:     t.trackId,
        title:  t.trackName || t.collectionName,
        artist: t.artistName,
        art:    (t.artworkUrl100 || '').replace('100x100','300x300'),
        url:    t.previewUrl,
        type:   'music',
      })), i),
    });
    EL.musicResults.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
   RENDER — CLIPES
══════════════════════════════════════════════════════════════ */
function renderClipResults(items) {
  if (!items.length) {
    EL.clipsResults.innerHTML = emptyState('🎬', 'Nenhum clipe encontrado');
    return;
  }
  EL.clipsResults.innerHTML = '';
  items.forEach(item => {
    const art  = (item.artworkUrl100 || '').replace('100x100', '300x300');
    const card = createCard({
      art,
      title:     item.trackName || item.collectionName,
      sub:       item.artistName,
      type:      'VÍDEO',
      typeColor: 'var(--accent2)',
      emoji:     '🎬',
      onClick:   () => openVideoSearch(item.trackName, item.artistName),
    });
    EL.clipsResults.appendChild(card);
  });
}

/* Abre busca no YouTube via embed nocookie (sem rastreio) */
function openVideoSearch(trackName, artistName) {
  const query = encodeURIComponent(`${artistName} ${trackName} official video`);
  // Redirect para busca YouTube nocookie — embed via search
  const searchUrl = `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=1`;
  EL.videoTitle.textContent = `${artistName} — ${trackName}`;
  EL.videoFrame.src = searchUrl;
  EL.videoPlayerWrap.classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════════
   RENDER — PODCASTS
══════════════════════════════════════════════════════════════ */
function renderPodcastResults(items) {
  if (!items.length) {
    EL.podcastResults.innerHTML = emptyState('🎙️', 'Nenhum podcast encontrado');
    return;
  }
  EL.podcastResults.innerHTML = '';
  items.forEach(item => {
    const art  = item.artworkUrl600 || item.artworkUrl100 || '';
    const card = createCard({
      art,
      title:     item.collectionName || item.trackName,
      sub:       item.artistName,
      type:      'PODCAST',
      typeColor: 'var(--accent4)',
      emoji:     '🎙️',
      onClick:   () => {
        if (item.feedUrl) {
          loadPodcastFeed(item.feedUrl, item.collectionName, art);
        } else if (item.previewUrl) {
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

/* Carrega episódios do feed RSS de podcast */
async function loadPodcastFeed(feedUrl, podName, podArt) {
  showLoading(EL.podcastResults);
  try {
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
    const res   = await fetch(proxy);
    const text  = await res.text();
    const parser = new DOMParser();
    const xml    = parser.parseFromString(text, 'text/xml');
    const items  = Array.from(xml.querySelectorAll('item')).slice(0, 30);

    if (!items.length) {
      EL.podcastResults.innerHTML = emptyState('🎙️', 'Feed sem episódios');
      return;
    }

    EL.podcastResults.innerHTML = '';
    const queue = [];

    items.forEach((item, i) => {
      const title  = item.querySelector('title')?.textContent || 'Episódio';
      const enclosure = item.querySelector('enclosure');
      const url    = enclosure?.getAttribute('url') || '';
      const imgEl  = item.querySelector('image') || item.querySelector('itunes\\:image');
      const art    = imgEl?.getAttribute('href') || podArt;

      if (!url) return;

      const track = { id: i, title, artist: podName, art, url, type: 'podcast' };
      queue.push(track);

      const card = createCard({
        art,
        title,
        sub:       podName,
        type:      'EPISÓDIO',
        typeColor: 'var(--accent4)',
        emoji:     '🎙️',
        onClick:   () => playTrack(track, queue, i),
      });
      EL.podcastResults.appendChild(card);
    });
  } catch {
    EL.podcastResults.innerHTML = emptyState('⚠️', 'Não foi possível carregar o feed');
  }
}

/* ══════════════════════════════════════════════════════════════
   RENDER — RÁDIO
══════════════════════════════════════════════════════════════ */
const RADIO_TAGS = ['pop','rock','jazz','classical','electronic','reggae','hip-hop','samba','mpb','gospel'];

async function loadRadioView(query = '') {
  EL.radioResults.innerHTML = `<div class="loading-state"><div class="spinner"></div> A carregar rádios…</div>`;

  // Filtros de gênero
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

  const stations = query
    ? await searchRadio(query)
    : await fetchTopRadios(60);

  renderRadioResults(stations);
}

async function loadRadioByTag(tag) {
  EL.radioResults.innerHTML = `<div class="loading-state"><div class="spinner"></div> A carregar rádios…</div>`;
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
    ${st.favicon
      ? `<img class="radio-logo" src="${escHtml(st.favicon)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : ''}
    <div class="radio-logo-placeholder" style="${st.favicon ? 'display:none' : ''}">📻</div>
    <div class="radio-info">
      <div class="radio-name">${escHtml(st.name)}</div>
      <div class="radio-genre">${escHtml(st.tags?.split(',')[0] || st.country || '')}</div>
      <div class="radio-live">AO VIVO</div>
    </div>`;
  div.addEventListener('click', () => {
    document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('playing'));
    div.classList.add('playing');
    playTrack({
      id:     st.stationuuid,
      title:  st.name,
      artist: st.tags?.split(',')[0] || 'Rádio ao Vivo',
      art:    st.favicon || '',
      url:    st.url_resolved || st.url,
      type:   'radio',
    });
  });
  return div;
}

/* ══════════════════════════════════════════════════════════════
   HOME
══════════════════════════════════════════════════════════════ */
const HOME_CATEGORIES = [
  { name: 'Pop',        emoji: '🎤', color: '#ff4772', search: 'pop' },
  { name: 'Rock',       emoji: '🎸', color: '#ff8c47', search: 'rock' },
  { name: 'Hip-Hop',    emoji: '🎧', color: '#a847ff', search: 'hip hop' },
  { name: 'Eletrônica', emoji: '🎛️', color: '#47c8ff', search: 'electronic' },
  { name: 'MPB',        emoji: '🌿', color: '#4dbb7a', search: 'mpb' },
  { name: 'Samba',      emoji: '🥁', color: '#ffb347', search: 'samba' },
  { name: 'Jazz',       emoji: '🎺', color: '#c8ff47', search: 'jazz' },
  { name: 'Clássico',   emoji: '🎻', color: '#ff47c8', search: 'classical' },
  { name: 'Gospel',     emoji: '🙏', color: '#47ffc8', search: 'gospel' },
  { name: 'K-Pop',      emoji: '💫', color: '#ff47a8', search: 'k-pop' },
];

async function renderHome() {
  // Categorias
  EL.homeCategories.innerHTML = '';
  HOME_CATEGORIES.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.style.background = `linear-gradient(135deg, ${cat.color}33, ${cat.color}88)`;
    card.style.border = `1px solid ${cat.color}44`;
    card.innerHTML = `<div class="cat-emoji">${cat.emoji}</div><div class="cat-name">${cat.name}</div>`;
    card.addEventListener('click', () => {
      EL.searchInput.value = cat.search;
      STATE.searchType = 'music';
      document.querySelectorAll('.ftab').forEach(t => t.classList.toggle('active', t.dataset.type === 'music'));
      runSearch(cat.search);
    });
    EL.homeCategories.appendChild(card);
  });

  // Rádios em destaque
  EL.featuredRadios.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
  const stations = await fetchTopRadios(12);
  EL.featuredRadios.innerHTML = '';
  stations.slice(0, 10).forEach(st => {
    const card = createRadioCard(st);
    EL.featuredRadios.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
   PLAYER DE ÁUDIO
══════════════════════════════════════════════════════════════ */
function playTrack(track, queue = [], index = 0) {
  STATE.currentTrack = track;
  STATE.queue        = queue.length ? queue : [track];
  STATE.queueIndex   = index;

  // UI do player
  EL.playerTitle.textContent  = track.title  || '—';
  EL.playerArtist.textContent = track.artist || '';
  EL.playerArt.src            = track.art    || '';
  EL.playerArt.style.display  = track.art ? 'block' : 'none';

  // Like state
  const liked = getLiked();
  EL.playerLike.classList.toggle('liked', liked.some(t => t.id === track.id));

  // Mostrar botão "adicionar à playlist" apenas para música/podcast
  EL.btnAddToPlaylist.style.display = (track.type !== 'radio') ? 'flex' : 'none';

  // Áudio
  EL.audioEl.src = track.url;
  EL.audioEl.load();
  EL.audioEl.play().catch(() => {});
  STATE.isPlaying = true;
  updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
  EL.iconPlay.style.display  = STATE.isPlaying ? 'none'  : 'block';
  EL.iconPause.style.display = STATE.isPlaying ? 'block' : 'none';
}

/* Controles */
EL.btnPlayPause.addEventListener('click', () => {
  if (!STATE.currentTrack) return;
  if (STATE.isPlaying) { EL.audioEl.pause(); STATE.isPlaying = false; }
  else                 { EL.audioEl.play();  STATE.isPlaying = true;  }
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

/* Shuffle */
EL.btnShuffle.addEventListener('click', () => {
  STATE.shuffle = !STATE.shuffle;
  EL.btnShuffle.classList.toggle('active', STATE.shuffle);
});

/* Repeat */
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
  EL.progressThumb.style.setProperty('--pct', `${pct}%`);
  EL.timeCurrent.textContent = formatTime(currentTime);
  EL.timeDuration.textContent = formatTime(duration);
});

EL.progressBar.addEventListener('click', e => {
  const rect = EL.progressBar.getBoundingClientRect();
  const pct  = (e.clientX - rect.left) / rect.width;
  if (EL.audioEl.duration) EL.audioEl.currentTime = pct * EL.audioEl.duration;
});

/* Volume */
EL.audioEl.volume = 0.8;
EL.volumeSlider.addEventListener('input', () => {
  EL.audioEl.volume = parseFloat(EL.volumeSlider.value);
});

/* Fechar vídeo */
EL.closeVideo.addEventListener('click', () => {
  EL.videoFrame.src = '';
  EL.videoPlayerWrap.classList.add('hidden');
});

/* ══════════════════════════════════════════════════════════════
   LETRAS (Lyrics.ovh)
══════════════════════════════════════════════════════════════ */
EL.btnLyrics.addEventListener('click', () => {
  if (!STATE.currentTrack || STATE.currentTrack.type === 'radio') return;
  openLyrics(STATE.currentTrack.artist, STATE.currentTrack.title);
});

async function openLyrics(artist, title) {
  EL.lyricsSongTitle.textContent  = title  || '—';
  EL.lyricsArtistName.textContent = artist || '';
  EL.lyricsContent.innerHTML = '<div class="lyrics-loading">A buscar letra…</div>';
  EL.lyricsModal.classList.remove('hidden');
  EL.btnLyrics.classList.add('active-lyrics');

  try {
    // Remove "(feat. ...)", "ft.", parênteses, etc. para melhorar a busca
    const cleanTitle  = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const cleanArtist = artist.split(',')[0].trim();
    const url = `${API.lyrics}/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.lyrics) {
      EL.lyricsContent.textContent = data.lyrics;
    } else {
      EL.lyricsContent.innerHTML = '<div class="lyrics-error">Letra não encontrada para esta música.</div>';
    }
  } catch {
    EL.lyricsContent.innerHTML = '<div class="lyrics-error">Erro ao buscar a letra. Tente novamente.</div>';
  }
}

EL.closeLyrics.addEventListener('click', closeLyricsModal);
EL.lyricsBackdrop.addEventListener('click', closeLyricsModal);
function closeLyricsModal() {
  EL.lyricsModal.classList.add('hidden');
  EL.btnLyrics.classList.remove('active-lyrics');
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
  const idx  = liked.findIndex(t => t.id === STATE.currentTrack.id);
  if (idx >= 0) liked.splice(idx, 1);
  else          liked.unshift({ ...STATE.currentTrack });
  saveLiked(liked);
  EL.playerLike.classList.toggle('liked', idx < 0);
  if (STATE.activeView === 'liked') renderLiked();
});

function renderLiked() {
  const liked = getLiked();
  if (!liked.length) {
    EL.likedResults.innerHTML = emptyState('❤️', 'Nenhuma música curtida ainda');
    return;
  }
  EL.likedResults.innerHTML = '';
  liked.forEach((track, i) => {
    const card = createCard({
      art:       track.art,
      title:     track.title,
      sub:       track.artist,
      type:      track.type === 'podcast' ? 'PODCAST' : 'MÚSICA',
      typeColor: 'var(--accent2)',
      emoji:     '❤️',
      onClick:   () => playTrack(track, liked, i),
    });
    EL.likedResults.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
   UTILITÁRIOS DE UI
══════════════════════════════════════════════════════════════ */
function createCard({ art, title, sub, type, typeColor, emoji, onClick }) {
  const div = document.createElement('div');
  div.className = 'result-card';
  div.innerHTML = `
    ${art
      ? `<img class="card-art" src="${escHtml(art)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : ''}
    <div class="card-art-placeholder" style="${art ? 'display:none' : ''}">${emoji}</div>
    <div class="card-play-overlay"><button class="card-play-btn">▶</button></div>
    <div class="card-type" style="color:${typeColor}">${type}</div>
    <div class="card-body">
      <div class="card-title" title="${escHtml(title || '')}">${escHtml(title || '—')}</div>
      <div class="card-sub">${escHtml(sub || '')}</div>
    </div>`;
  div.addEventListener('click', onClick);
  return div;
}

function showLoading(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div> A carregar…</div>`;
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
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  // Scripts de playlists são carregados em playlists.js (etapa 3)
});

/* ══════════════════════════════════════════════════════════════
   MOBILE — Hamburger drawer + nav bar inferior
══════════════════════════════════════════════════════════════ */
function initMobileUI() {
  const hamburger  = document.getElementById('hamburgerBtn');
  const sidebar    = document.getElementById('sidebar');
  const backdrop   = document.getElementById('sidebarBackdrop');

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

  // Fecha o drawer ao navegar (mobile)
  document.querySelectorAll('#sidebar .nav-btn, #sidebar .pl-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeDrawer();
    });
  });

  // Nav bar inferior mobile
  document.querySelectorAll('#mobileNav .mnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#mobileNav .mnav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      navigateTo(btn.dataset.view);
    });
  });
}

// Sincroniza a nav mobile ao navegar por qualquer meio
const _origNavigateTo = navigateTo;
window.navigateTo = function(view) {
  _origNavigateTo(view);
  document.querySelectorAll('#mobileNav .mnav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
};

document.addEventListener('DOMContentLoaded', initMobileUI);
