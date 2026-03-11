/* Playlists básicas */
function getPlaylists() {
  try { return JSON.parse(localStorage.getItem('mh_playlists') || '[]'); }
  catch { return []; }
}

function savePlaylists(arr) {
  localStorage.setItem('mh_playlists', JSON.stringify(arr));
}

function renderPlaylistGrid() {
  const playlists = getPlaylists();
  const grid = $('playlistGrid');
  
  if (!playlists.length) {
    grid.innerHTML = '<div class="empty-state"><p>Nenhuma playlist criada</p></div>';
    return;
  }
  
  grid.innerHTML = '';
  playlists.forEach((pl, i) => {
    const card = document.createElement('div');
    card.className = 'playlist-card';
    card.innerHTML = `
      <div class="pc-emoji">${pl.emoji || '🎵'}</div>
      <div class="pc-name">${pl.name}</div>
      <div class="pc-count">${pl.tracks?.length || 0} faixas</div>
    `;
    card.addEventListener('click', () => openPlaylistDetail(i));
    grid.appendChild(card);
  });
}

function openPlaylistDetail(index) {
  // Implementar detalhe da playlist
  navigateTo('playlists');
}

// Expor para app.js
window.renderPlaylistGrid = renderPlaylistGrid;
window.getPlaylists = getPlaylists;
window.savePlaylists = savePlaylists;
