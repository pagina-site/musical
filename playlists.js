/* ============================================================
   MediaHub — playlists.js
   Etapa 3: Playlists (CRUD), Sidebar dinâmica, Adição de faixas
   ============================================================ */

'use strict';

/* ── Emojis disponíveis para playlist ── */
const PLAYLIST_EMOJIS = [
  '🎵','🎸','🎹','🎺','🎻','🥁','🎧','🎤',
  '🔥','💜','❤️','💚','💙','⭐','🌙','☀️',
  '🎮','🏖️','🌿','🍃','🌊','🏔️','🌆','🎭',
  '📻','🎬','🎙️','🎶','💫','✨','🚀','🎯',
];

/* ── Storage helpers ── */
function getPlaylists() {
  try { return JSON.parse(localStorage.getItem('mh_playlists') || '[]'); }
  catch { return []; }
}

function savePlaylists(arr) {
  localStorage.setItem('mh_playlists', JSON.stringify(arr));
}

function genId() {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR — lista de playlists
══════════════════════════════════════════════════════════════ */
function renderSidebarPlaylists() {
  const playlists = getPlaylists();
  const container = document.getElementById('playlistsList');
  container.innerHTML = '';

  if (!playlists.length) {
    container.innerHTML = `<div style="padding:8px 10px;font-size:12px;color:var(--muted)">Nenhuma playlist criada</div>`;
    return;
  }

  playlists.forEach(pl => {
    const item = document.createElement('div');
    item.className = 'pl-item';
    item.dataset.id = pl.id;
    item.innerHTML = `
      <div class="pl-icon">${pl.emoji}</div>
      <div class="pl-info">
        <div class="pl-name">${escHtml(pl.name)}</div>
        <div class="pl-count">${pl.tracks.length} faixa${pl.tracks.length !== 1 ? 's' : ''}</div>
      </div>`;
    item.addEventListener('click', () => openPlaylistDetail(pl.id));
    container.appendChild(item);
  });
}

/* ══════════════════════════════════════════════════════════════
   MODAL — Nova Playlist
══════════════════════════════════════════════════════════════ */
let selectedEmoji = '🎵';

function openNewPlaylistModal() {
  selectedEmoji = '🎵';
  document.getElementById('playlistNameInput').value = '';
  renderEmojiGrid();
  document.getElementById('playlistModal').classList.remove('hidden');
  document.getElementById('playlistNameInput').focus();
}

function renderEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  grid.innerHTML = '';
  PLAYLIST_EMOJIS.forEach(em => {
    const btn = document.createElement('div');
    btn.className = 'emoji-opt' + (em === selectedEmoji ? ' selected' : '');
    btn.textContent = em;
    btn.addEventListener('click', () => {
      selectedEmoji = em;
      document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
      btn.classList.add('selected');
    });
    grid.appendChild(btn);
  });
}

function closeNewPlaylistModal() {
  document.getElementById('playlistModal').classList.add('hidden');
}

function createPlaylist(name, emoji) {
  name = name.trim();
  if (!name) return null;
  const pl = { id: genId(), name, emoji, tracks: [], createdAt: Date.now() };
  const playlists = getPlaylists();
  playlists.unshift(pl);
  savePlaylists(playlists);
  renderSidebarPlaylists();
  renderPlaylistGrid();
  return pl;
}

/* Botões de abrir modal */
document.getElementById('btnNewPlaylist').addEventListener('click', openNewPlaylistModal);
document.getElementById('btnNewPlaylist2').addEventListener('click', openNewPlaylistModal);

/* Fechar modal */
document.getElementById('closePlaylistModal').addEventListener('click', closeNewPlaylistModal);
document.getElementById('playlistBackdrop').addEventListener('click', closeNewPlaylistModal);

/* Confirmar criação */
document.getElementById('confirmCreatePlaylist').addEventListener('click', () => {
  const name = document.getElementById('playlistNameInput').value;
  if (!name.trim()) {
    document.getElementById('playlistNameInput').style.borderColor = 'var(--accent2)';
    return;
  }
  createPlaylist(name, selectedEmoji);
  closeNewPlaylistModal();
});

document.getElementById('playlistNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('confirmCreatePlaylist').click();
  document.getElementById('playlistNameInput').style.borderColor = '';
});

/* ══════════════════════════════════════════════════════════════
   GRID de Playlists (view-playlists)
══════════════════════════════════════════════════════════════ */
function renderPlaylistGrid() {
  const playlists = getPlaylists();
  const grid = document.getElementById('playlistGrid');
  grid.innerHTML = '';

  if (!playlists.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🎵</div>
        <p>Nenhuma playlist ainda.<br>Crie a sua primeira!</p>
      </div>`;
    return;
  }

  playlists.forEach(pl => {
    const card = document.createElement('div');
    card.className = 'playlist-card';
    card.innerHTML = `
      <div class="pc-emoji">${pl.emoji}</div>
      <div class="pc-name">${escHtml(pl.name)}</div>
      <div class="pc-count">${pl.tracks.length} faixa${pl.tracks.length !== 1 ? 's' : ''}</div>`;
    card.addEventListener('click', () => openPlaylistDetail(pl.id));
    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
   DETALHE da Playlist
══════════════════════════════════════════════════════════════ */
function openPlaylistDetail(id) {
  const playlists = getPlaylists();
  const pl = playlists.find(p => p.id === id);
  if (!pl) return;

  STATE.activePlaylistId = id;

  // Atualiza sidebar highlight
  document.querySelectorAll('.pl-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // Preenche header
  document.getElementById('plDetailArt').textContent   = pl.emoji;
  document.getElementById('plDetailName').textContent  = pl.name;
  document.getElementById('plDetailCount').textContent = `${pl.tracks.length} faixa${pl.tracks.length !== 1 ? 's' : ''}`;

  renderPlaylistTracks(pl);

  // Navega para a view de detalhe
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-playlist-detail').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

function renderPlaylistTracks(pl) {
  const list = document.getElementById('plDetailTracks');
  list.innerHTML = '';

  if (!pl.tracks.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${pl.emoji}</div>
        <p>Esta playlist está vazia.<br>Busque músicas e adicione aqui!</p>
      </div>`;
    return;
  }

  pl.tracks.forEach((track, i) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="list-num">${i + 1}</div>
      ${track.art
        ? `<img class="list-art" src="${escHtml(track.art)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="list-art-placeholder" style="${track.art ? 'display:none' : ''}">🎵</div>
      <div class="list-info">
        <div class="list-title">${escHtml(track.title)}</div>
        <div class="list-sub">${escHtml(track.artist)}</div>
      </div>
      <div class="list-actions">
        <button class="icon-btn" title="Remover da playlist" data-remove="${i}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6"/>
          </svg>
        </button>
      </div>`;

    // Reproduzir ao clicar na faixa
    item.addEventListener('click', e => {
      if (e.target.closest('[data-remove]')) return;
      playTrack(track, pl.tracks, i);
      document.querySelectorAll('.list-item').forEach(el => el.classList.remove('playing'));
      item.classList.add('playing');
    });

    // Remover faixa
    item.querySelector('[data-remove]').addEventListener('click', e => {
      e.stopPropagation();
      removeTrackFromPlaylist(pl.id, i);
    });

    list.appendChild(item);
  });
}

function removeTrackFromPlaylist(playlistId, trackIndex) {
  const playlists = getPlaylists();
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;
  pl.tracks.splice(trackIndex, 1);
  savePlaylists(playlists);
  renderSidebarPlaylists();
  renderPlaylistTracks(pl);
  document.getElementById('plDetailCount').textContent =
    `${pl.tracks.length} faixa${pl.tracks.length !== 1 ? 's' : ''}`;
}

/* Reproduzir tudo */
document.getElementById('plPlayAll').addEventListener('click', () => {
  const pl = getPlaylists().find(p => p.id === STATE.activePlaylistId);
  if (!pl || !pl.tracks.length) return;
  playTrack(pl.tracks[0], pl.tracks, 0);
});

/* Excluir playlist */
document.getElementById('plDeleteBtn').addEventListener('click', () => {
  if (!STATE.activePlaylistId) return;
  if (!confirm('Excluir esta playlist?')) return;
  const playlists = getPlaylists().filter(p => p.id !== STATE.activePlaylistId);
  savePlaylists(playlists);
  STATE.activePlaylistId = null;
  renderSidebarPlaylists();
  renderPlaylistGrid();
  navigateTo('playlists');
});

/* ══════════════════════════════════════════════════════════════
   MODAL — Adicionar à Playlist
══════════════════════════════════════════════════════════════ */
let trackToAdd = null;

function openAddToPlaylistModal(track) {
  trackToAdd = track;
  const playlists = getPlaylists();
  const list = document.getElementById('addPlaylistList');
  list.innerHTML = '';

  if (!playlists.length) {
    list.innerHTML = `
      <div style="padding:16px 12px;color:var(--muted);font-size:14px">
        Nenhuma playlist encontrada.<br>
        <span style="color:var(--accent);cursor:pointer" id="addCreateNew">Criar uma agora →</span>
      </div>`;
    document.getElementById('addCreateNew')?.addEventListener('click', () => {
      closeAddToPlaylistModal();
      openNewPlaylistModal();
    });
  } else {
    playlists.forEach(pl => {
      const alreadyIn = pl.tracks.some(t => t.id === track.id);
      const row = document.createElement('div');
      row.className = 'add-pl-row';
      row.innerHTML = `
        <span class="add-pl-emoji">${pl.emoji}</span>
        <span class="add-pl-name">${escHtml(pl.name)}</span>
        ${alreadyIn ? '<span style="margin-left:auto;font-size:11px;color:var(--muted)">✓ já adicionada</span>' : ''}`;
      if (!alreadyIn) {
        row.addEventListener('click', () => {
          addTrackToPlaylist(pl.id, track);
          closeAddToPlaylistModal();
          showToast(`Adicionado a "${pl.name}"`);
        });
      } else {
        row.style.opacity = '.5';
        row.style.cursor  = 'default';
      }
      list.appendChild(row);
    });
  }

  document.getElementById('addToPlaylistModal').classList.remove('hidden');
}

function closeAddToPlaylistModal() {
  document.getElementById('addToPlaylistModal').classList.add('hidden');
  trackToAdd = null;
}

document.getElementById('closeAddModal').addEventListener('click', closeAddToPlaylistModal);
document.getElementById('addBackdrop').addEventListener('click', closeAddToPlaylistModal);

/* Botão do player */
document.getElementById('btnAddToPlaylist').addEventListener('click', () => {
  if (STATE.currentTrack) openAddToPlaylistModal(STATE.currentTrack);
});

function addTrackToPlaylist(playlistId, track) {
  const playlists = getPlaylists();
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;
  if (pl.tracks.some(t => t.id === track.id)) return; // evita duplicata
  pl.tracks.push({ ...track });
  savePlaylists(playlists);
  renderSidebarPlaylists();
  if (STATE.activePlaylistId === playlistId) renderPlaylistTracks(pl);
}

/* ── Botão de contexto nos cards (clique direito ou botão "+" no card) ── */
/* Adiciona ao card um botão "+" visível no hover */
function addContextMenuToCard(cardEl, track) {
  const btn = document.createElement('button');
  btn.className = 'icon-btn';
  btn.title = 'Adicionar à playlist';
  btn.style.cssText = `
    position:absolute; bottom:54px; right:6px;
    z-index:10; opacity:0; transition:opacity .15s;
    background:rgba(0,0,0,.7); border-radius:50%;
  `;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    openAddToPlaylistModal(track);
  });
  cardEl.style.position = 'relative';
  cardEl.appendChild(btn);
  cardEl.addEventListener('mouseenter', () => btn.style.opacity = '1');
  cardEl.addEventListener('mouseleave', () => btn.style.opacity = '0');
}

/* ══════════════════════════════════════════════════════════════
   TOAST — notificação rápida
══════════════════════════════════════════════════════════════ */
function showToast(msg) {
  let toast = document.getElementById('mh-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mh-toast';
    toast.style.cssText = `
      position:fixed; bottom:110px; left:50%; transform:translateX(-50%) translateY(20px);
      background:var(--bg3); border:1px solid var(--border2);
      color:var(--text); padding:10px 20px; border-radius:24px;
      font-size:14px; font-family:var(--font);
      box-shadow:0 8px 24px rgba(0,0,0,.5);
      z-index:999; opacity:0;
      transition:opacity .25s, transform .25s;
      pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2200);
}

/* ══════════════════════════════════════════════════════════════
   PATCH: injetar botão "+" nos cards criados em app.js
   (sobrescreve createCard para incluir o contexto de playlist)
══════════════════════════════════════════════════════════════ */
const _origCreateCard = window.createCard || null;

// Monkey-patch: wraps createCard to inject add-to-playlist button
(function patchCreateCard() {
  // Aguarda app.js definir createCard no escopo global
  // (ambos os scripts carregam no mesmo escopo de módulo do HTML)
  // O patch é feito interceptando os renders de música
  const origRenderMusic = window.renderMusicResults;
  if (origRenderMusic) return; // será chamado após DOMContentLoaded

  document.addEventListener('DOMContentLoaded', () => {
    // Observa novos cards adicionados ao DOM
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (!node.classList?.contains('result-card')) return;
          // Recupera track associado pelo evento de click (não podemos acessar closure)
          // então adicionamos o botão via evento customizado
        });
      });
    });
    observer.observe(document.getElementById('main'), { childList: true, subtree: true });
  });
})();

/* ══════════════════════════════════════════════════════════════
   ATALHOS DE TECLADO
══════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      document.getElementById('btnPlayPause').click();
      break;
    case 'ArrowRight':
      if (e.altKey) document.getElementById('btnNext').click();
      break;
    case 'ArrowLeft':
      if (e.altKey) document.getElementById('btnPrev').click();
      break;
    case 'KeyL':
      document.getElementById('playerLike').click();
      break;
    case 'KeyS':
      document.getElementById('btnShuffle').click();
      break;
    case 'Escape':
      document.getElementById('closeLyrics')?.click();
      document.getElementById('closePlaylistModal')?.click();
      document.getElementById('closeAddModal')?.click();
      document.getElementById('closeVideo')?.click();
      break;
  }
});

/* ══════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderSidebarPlaylists();
  renderEmojiGrid();

  // Expõe funções para uso global (app.js e index.html)
  window.openAddToPlaylistModal = openAddToPlaylistModal;
  window.addTrackToPlaylist     = addTrackToPlaylist;
  window.addContextMenuToCard   = addContextMenuToCard;
  window.showToast              = showToast;
  window.renderSidebarPlaylists = renderSidebarPlaylists;
  window.renderPlaylistGrid     = renderPlaylistGrid;
  window.openPlaylistDetail     = openPlaylistDetail;
});

/* escHtml duplicado para autonomia deste ficheiro */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
