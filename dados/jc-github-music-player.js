/*
  JC-APK TV — Player de música via GitHub Releases
  - Não baixa músicas do Supabase.
  - A reprodução oficial usa somente a playlist local e os arquivos do GitHub Releases.
  - Suporta player visível no gerador, player flutuante e página player-musica.html.
*/
(function(){
  'use strict';
  if(window.__JC_GITHUB_MUSIC_PLAYER_LOADED__) return;
  window.__JC_GITHUB_MUSIC_PLAYER_LOADED__ = true;

  var cfg = window.JC_GITHUB_MUSIC_CONFIG || {};
  if(cfg.enabled === false) return;

  var prefix = cfg.storagePrefix || 'jc_github_music_';
  var releaseInfo = cfg.githubRelease || { owner:'JoaoJMuniz19', repo:'JC-APK-TV-Midias', tag:'musicas-oficiais' };
  var releaseBase = 'https://github.com/' + releaseInfo.owner + '/' + releaseInfo.repo + '/releases/download/' + releaseInfo.tag + '/';

  var masterPlaylist = normalizePlaylist(cfg.playlist || []);
  var playlist = masterPlaylist.slice();
  var playbackMode = normalizePlaybackMode(cfg.playbackMode || 'sequence');
  var repeatMode = normalizeRepeatMode(cfg.repeatMode || 'list');
  var defaultVolume = normalizeVolume(cfg.defaultVolume, 5);
  var startMode = cfg.startMode === 'manual' || cfg.startOnFirstInteraction === false ? 'manual' : 'firstInteraction';
  var startOnFirstInteraction = startMode !== 'manual';
  var showFloatingPlayer = cfg.showFloatingPlayer !== false;
  var showPagePlayer = cfg.showPagePlayer !== false;
  var useSupabaseConfig = cfg.useSupabaseConfig === true;
  var disabledTracks = normalizeDisabled(cfg.disabledTracks || []);

  var audio = null;
  var started = false;
  var currentTrack = getStoredNumber('track_index', 0);
  var volume = getStoredNumber('volume', defaultVolume);
  var muted = false;
  var sourceTryIndex = 0;
  var currentSources = [];
  var uiInstances = [];
  var firstInteractionBound = false;
  var remoteConfigLoaded = false;

  try{ muted = localStorage.getItem(prefix + 'muted') === '1'; }catch(e){}
  if(volume < 0 || volume > 100) volume = defaultVolume;

  function text(value){ return value == null ? '' : String(value); }
  function slug(value){ return text(value).normalize ? text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') : text(value).toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
  function fileNameFromUrl(url){ try{ return decodeURIComponent(text(url).split('/').pop().split('?')[0].split('#')[0]); }catch(e){ return text(url).split('/').pop(); } }
  function cleanTitleFromFile(name){ return text(name).replace(/\.(mp3|wav|ogg|m4a|flac)$/i,'').replace(/[._-]+/g,' ').replace(/\s+/g,' ').trim(); }
  function titleCase(value){ return text(value).replace(/\b\w/g,function(c){ return c.toUpperCase(); }).replace(/\bJc\b/g,'JC').replace(/\bApk\b/g,'APK').replace(/\bTv\b/g,'TV').replace(/\bUnitv\b/g,'UniTV'); }
  function releaseAsset(name){ return releaseBase + encodeURIComponent(name); }
  function trackKey(track){ return text(track.key || track.id || fileNameFromUrl(track.src || track.url) || track.title || track.name || '').trim(); }
  function normalizePlaybackMode(value){ return value === 'random' ? 'random' : 'sequence'; }
  function normalizeRepeatMode(value){ return ['list','one','none'].indexOf(value) >= 0 ? value : 'list'; }
  function normalizeVolume(value, fallback){ var n = Number(value); if(!isFinite(n)) n = fallback; return Math.max(0, Math.min(100, n)); }
  function normalizeBool(value, fallback){ if(value === true || value === 'true' || value === 1 || value === '1') return true; if(value === false || value === 'false' || value === 0 || value === '0') return false; return fallback; }
  function normalizeDisabled(list){ var out = new Set(); (Array.isArray(list) ? list : []).forEach(function(item){ if(item) out.add(text(item)); }); return out; }
  function getStoredNumber(key, fallback){ try{ var raw = localStorage.getItem(prefix + key); if(raw === null || raw === '') return fallback; var n = Number(raw); return isFinite(n) ? n : fallback; }catch(e){ return fallback; } }
  function setStored(key, value){ try{ localStorage.setItem(prefix + key, String(value)); }catch(e){} }
  function hasStoredVolume(){ try{ return localStorage.getItem(prefix + 'volume') !== null; }catch(e){ return false; } }

  function normalizePlaylist(list){
    var result = [];
    (Array.isArray(list) ? list : []).forEach(function(item){
      if(!item) return;
      var track = typeof item === 'string' ? lineToTrack(item) : Object.assign({}, item);
      var src = text(track.src || track.url || '').trim();
      if(!src && track.file) src = releaseAsset(track.file);
      if(!src) return;
      var name = track.title || track.name || cleanTitleFromFile(fileNameFromUrl(src)) || 'Música JC-APK TV';
      var key = track.key || track.id || fileNameFromUrl(src) || slug(name);
      result.push(Object.assign({}, track, { key:key, title:name, src:src }));
    });
    return result;
  }

  function lineToTrack(line){
    var raw = text(line).trim();
    if(!raw) return null;
    var parts = raw.split(/\s*[|=]\s*/).map(function(v){ return v.trim(); }).filter(Boolean);
    var url = '';
    for(var i=parts.length-1;i>=0;i--){ if(/^https?:\/\//i.test(parts[i])){ url = parts[i]; break; } }
    if(!url){ var found = raw.match(/https?:\/\/\S+/i); url = found ? found[0] : ''; }
    if(!url) return null;
    var label = parts.length > 1 ? parts[0] : cleanTitleFromFile(fileNameFromUrl(url));
    return { key:fileNameFromUrl(url) || slug(label), title:label || 'Música JC-APK TV', src:url };
  }

  function applyTrackFilter(){
    playlist = masterPlaylist.filter(function(track){
      var k = trackKey(track), t = text(track.title || track.name);
      return !disabledTracks.has(k) && !disabledTracks.has(t) && !disabledTracks.has(fileNameFromUrl(track.src || track.url));
    });
    if(currentTrack < 0 || currentTrack >= playlist.length) currentTrack = 0;
  }

  function parseRowValue(row){
    if(!row) return null;
    try{
      if(row.value) return JSON.parse(String(row.value));
    }catch(e){}
    if(Array.isArray(row.items) && row.items.length){
      var payload = {};
      row.items.forEach(function(line){ var p = text(line).split(/\s*[|=]\s*/); if(p.length >= 2) payload[p[0].trim()] = p.slice(1).join('=').trim(); });
      return payload;
    }
    return null;
  }

  function applyConfig(next, silent){
    if(!next || typeof next !== 'object') return;
    playbackMode = normalizePlaybackMode(next.playbackMode || next.modo || playbackMode);
    repeatMode = normalizeRepeatMode(next.repeatMode || next.repetir || repeatMode);
    defaultVolume = normalizeVolume(next.defaultVolume != null ? next.defaultVolume : next.volumeInicial, defaultVolume);
    startMode = next.startMode === 'manual' || next.startOnFirstInteraction === false ? 'manual' : 'firstInteraction';
    startOnFirstInteraction = startMode !== 'manual';
    showFloatingPlayer = normalizeBool(next.showFloatingPlayer, showFloatingPlayer);
    showPagePlayer = normalizeBool(next.showPagePlayer, showPagePlayer);
    disabledTracks = normalizeDisabled(next.disabledTracks || []);
    if(!hasStoredVolume()) volume = defaultVolume;
    applyTrackFilter();
    updateVisibility();
    if(!silent) updateUi();
  }

  function catalogRow(id){
    try{
      if(typeof window.JC_getCatalogRow === 'function') return window.JC_getCatalogRow(id);
      if(window.JC_PANEL_RUNTIME && typeof window.JC_PANEL_RUNTIME.getLink === 'function') return window.JC_PANEL_RUNTIME.getLink(id);
    }catch(e){}
    return null;
  }

  function applyCatalogRows(){
    var mediaRow = catalogRow('musicas_oficiais');
    if(mediaRow && Array.isArray(mediaRow.items) && mediaRow.items.length){
      var tracks = normalizePlaylist(mediaRow.items.map(lineToTrack).filter(Boolean));
      if(tracks.length) masterPlaylist = tracks;
    }
    applyConfig(parseRowValue(catalogRow('musicas_player_config')), true);
    applyTrackFilter();
    if(!playlist.length) return;
    updateUi();
  }

  async function fetchRemoteRows(){
    if(!useSupabaseConfig){ remoteConfigLoaded = true; return; }
    if(remoteConfigLoaded) return;
    var app = window.JC_APP;
    if(!app || !app.client) return;
    try{
      var result = await app.client.from('links_catalog').select('id,value,items,active').in('id',['musicas_player_config','musicas_oficiais']).eq('active', true);
      if(result.error) throw result.error;
      (result.data || []).forEach(function(row){
        if(row.id === 'musicas_oficiais' && Array.isArray(row.items) && row.items.length){
          var tracks = normalizePlaylist(row.items.map(lineToTrack).filter(Boolean));
          if(tracks.length) masterPlaylist = tracks;
        }
        if(row.id === 'musicas_player_config') applyConfig(parseRowValue(row), true);
      });
      remoteConfigLoaded = true;
      applyTrackFilter();
      updateUi();
    }catch(e){ console.warn('JC-APK player: configuração leve não carregada.', e && e.message ? e.message : e); }
  }

  function directSources(track){
    var list = [];
    if(track && track.src) list.push(track.src);
    if(track && track.url && track.url !== track.src) list.push(track.url);
    if(track && Array.isArray(track.sources)) track.sources.forEach(function(src){ if(src && list.indexOf(src) < 0) list.push(src); });
    if(track && (track.fallbackSunoId || track.id)){
      var id = track.fallbackSunoId || track.id;
      ['https://cdn1.suno.ai/' + id + '.mp3','https://cdn2.suno.ai/' + id + '.mp3'].forEach(function(src){ if(list.indexOf(src) < 0) list.push(src); });
    }
    return list;
  }
  function getTrack(){ return playlist[currentTrack] || playlist[0] || null; }
  function getTrackTitle(){ var t = getTrack(); return text(t && (t.title || t.name) || 'Música JC-APK TV'); }
  function randomTrackIndex(){ if(playlist.length <= 1) return 0; var next = currentTrack, guard = 0; while(next === currentTrack && guard < 20){ next = Math.floor(Math.random() * playlist.length); guard++; } return next; }
  function nextTrackIndex(){ return playbackMode === 'random' ? randomTrackIndex() : currentTrack + 1; }
  function previousTrackIndex(){ return playbackMode === 'random' ? randomTrackIndex() : currentTrack - 1; }

  function updateUi(){
    uiInstances.forEach(function(ui){
      if(ui.title) ui.title.textContent = getTrackTitle();
      if(ui.play) ui.play.textContent = started && audio && !audio.paused ? '⏸' : '▶';
      if(ui.percent) ui.percent.textContent = String(Math.round(volume)) + '%';
      if(ui.volume && document.activeElement !== ui.volume) ui.volume.value = String(Math.round(volume));
      if(ui.mute) ui.mute.textContent = muted || volume === 0 ? '🔇' : '🔈';
      if(ui.status){
        var modo = playbackMode === 'random' ? 'aleatório' : 'sequência';
        var repetir = repeatMode === 'one' ? ' · repetir música' : repeatMode === 'none' ? ' · parar no fim' : ' · repetir lista';
        ui.status.textContent = (started && audio && !audio.paused ? 'tocando · ' : 'pausado · ') + modo + repetir;
      }
    });
  }
  function updateVisibility(){
    uiInstances.forEach(function(ui){
      if(!ui.root) return;
      if(ui.type === 'floating') ui.root.style.display = showFloatingPlayer ? '' : 'none';
      if(ui.type === 'embedded') ui.root.style.display = ui.root.dataset.jcForceVisible === 'true' || showPagePlayer ? '' : 'none';
    });
  }
  function applyVolume(){ if(!audio) return; audio.volume = Math.max(0, Math.min(1, volume / 100)); audio.muted = muted || volume === 0; setStored('volume', Math.round(volume)); setStored('muted', muted || volume === 0 ? '1' : '0'); updateUi(); }
  function prepareSources(){ currentSources = directSources(getTrack()); sourceTryIndex = 0; }
  function currentSource(){ return currentSources[sourceTryIndex] || ''; }
  function handleEnded(){ if(repeatMode === 'one'){ loadTrack(currentTrack, true); return; } if(repeatMode === 'none' && playbackMode === 'sequence' && currentTrack >= playlist.length - 1){ started = false; updateUi(); return; } loadTrack(nextTrackIndex(), true); }
  function buildAudio(){
    if(audio) return audio;
    audio = document.createElement('audio');
    audio.id = 'jc_github_bg_music';
    audio.preload = 'auto';
    audio.loop = false;
    audio.style.display = 'none';
    audio.setAttribute('playsinline', 'playsinline');
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', function(){ started = true; updateUi(); });
    audio.addEventListener('pause', updateUi);
    audio.addEventListener('error', function(){
      if(sourceTryIndex < currentSources.length - 1){ sourceTryIndex++; audio.src = currentSource(); if(started) playMusic(); return; }
      if(playlist.length > 1) loadTrack(nextTrackIndex(), started); else updateUi();
    });
    document.body.appendChild(audio);
    applyVolume();
    return audio;
  }
  function loadTrack(index, autoPlay){
    if(!playlist.length) return;
    currentTrack = (index + playlist.length) % playlist.length;
    setStored('track_index', currentTrack);
    prepareSources();
    var a = buildAudio();
    a.src = currentSource();
    try{ a.currentTime = 0; }catch(e){}
    updateUi();
    if(autoPlay) playMusic();
  }
  async function playMusic(){
    if(useSupabaseConfig && !remoteConfigLoaded) await fetchRemoteRows();
    var a = buildAudio(); if(!a.src){ prepareSources(); a.src = currentSource(); }
    applyVolume(); started = true; var promise = a.play(); if(promise && typeof promise.catch === 'function') promise.catch(function(){ updateUi(); }); updateUi();
  }
  function pauseMusic(){ if(audio) audio.pause(); started = false; updateUi(); }
  function togglePlay(){ var a = buildAudio(); if(a.paused) playMusic(); else pauseMusic(); }
  function next(){ loadTrack(nextTrackIndex(), started); }
  function prev(){ loadTrack(previousTrackIndex(), started); }

  function createStyle(){
    if(document.getElementById('jc-github-music-player-style')) return;
    var style = document.createElement('style');
    style.id = 'jc-github-music-player-style';
    style.textContent = [
      '.jc-music-panel{margin:0 0 18px;padding:15px;border:1px solid rgba(72,230,170,.28);border-radius:24px;background:linear-gradient(145deg,rgba(9,24,35,.94),rgba(3,9,14,.97));box-shadow:0 18px 42px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.04);color:#eafff7;font-family:Arial,sans-serif}',
      '.jc-music-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.jc-music-panel-head strong{font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#90ffd4}.jc-music-panel-head small{color:#9db4bf;font-size:11px;text-align:right}',
      '.jc-music-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.jc-music-controls button,.jc-github-music-player button{border:0;border-radius:12px;min-width:36px;height:36px;padding:0 10px;background:rgba(255,255,255,.08);color:#fff;font-weight:900;cursor:pointer}.jc-music-controls button:hover,.jc-github-music-player button:hover{background:rgba(72,230,170,.18)}',
      '.jc-music-title{min-width:0;flex:1 1 180px}.jc-music-title small{display:block;font-size:9px;letter-spacing:.12em;color:#79ffd0;text-transform:uppercase;font-weight:900}.jc-music-title strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#fff}',
      '.jc-music-volume{display:flex;align-items:center;gap:5px}.jc-music-volume input{width:82px;accent-color:#45e5a6}.jc-music-volume span{min-width:30px;font-size:10px;color:#b6cbd4}.jc-music-status{font-size:9px;color:#8ba6b3;text-transform:uppercase}',
      '.jc-github-music-player{position:fixed;right:14px;bottom:14px;z-index:2147482500;display:flex;align-items:center;gap:8px;max-width:min(560px,calc(100vw - 28px));padding:10px 11px;border:1px solid rgba(72,230,170,.32);border-radius:18px;background:linear-gradient(145deg,rgba(5,17,27,.96),rgba(2,7,12,.96));box-shadow:0 18px 45px rgba(0,0,0,.45);color:#eafff7;font-family:Arial,sans-serif;backdrop-filter:blur(8px)}',
      '.jc-github-music-player .jc-music-title{max-width:185px}.jc-github-music-player .jc-music-panel-head{display:none}',
      '@media(max-width:620px){.jc-github-music-player{left:10px;right:10px;bottom:10px;justify-content:center;gap:6px;padding:9px}.jc-music-status{display:none}.jc-music-volume input{width:54px}.jc-music-title{flex-basis:115px}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function buildControls(root, type){
    if(!root || root.__jcMusicReady) return;
    root.__jcMusicReady = true;
    createStyle();
    root.classList.add(type === 'floating' ? 'jc-github-music-player' : 'jc-music-panel');
    root.innerHTML = '' +
      '<div class="jc-music-panel-head"><strong>🎵 Player de Música JC-APK TV</strong><small>Áudios no GitHub Releases · sem consulta adicional ao Supabase</small></div>' +
      '<div class="jc-music-controls">' +
        '<button type="button" data-music="play" title="Tocar ou pausar">▶</button>' +
        '<div class="jc-music-title"><small>música do GitHub</small><strong data-music="title">Música JC-APK TV</strong></div>' +
        '<button type="button" data-music="prev" title="Música anterior">⏮</button>' +
        '<button type="button" data-music="next" title="Próxima música">⏭</button>' +
        '<button type="button" data-music="mute" title="Silenciar">🔈</button>' +
        '<div class="jc-music-volume"><input data-music="volume" type="range" min="0" max="100" step="1"><span data-music="percent">5%</span></div>' +
        '<span class="jc-music-status" data-music="status">pausado</span>' +
      '</div>';
    var ui = { root:root, type:type, play:root.querySelector('[data-music="play"]'), prev:root.querySelector('[data-music="prev"]'), next:root.querySelector('[data-music="next"]'), mute:root.querySelector('[data-music="mute"]'), volume:root.querySelector('[data-music="volume"]'), percent:root.querySelector('[data-music="percent"]'), title:root.querySelector('[data-music="title"]'), status:root.querySelector('[data-music="status"]') };
    ui.play.onclick = togglePlay;
    ui.prev.onclick = prev;
    ui.next.onclick = next;
    ui.mute.onclick = function(){ muted = !muted; applyVolume(); };
    ui.volume.oninput = function(){ volume = normalizeVolume(ui.volume.value, volume); if(volume > 0) muted = false; applyVolume(); };
    uiInstances.push(ui);
    updateVisibility();
    updateUi();
  }

  function createPlayers(){
    applyTrackFilter();
    if(!playlist.length) return;
    document.querySelectorAll('[data-jc-music-player]').forEach(function(el){ buildControls(el, 'embedded'); });
    if(showFloatingPlayer && !document.getElementById('jc_github_music_player')){
      var floating = document.createElement('div');
      floating.id = 'jc_github_music_player';
      document.body.appendChild(floating);
      buildControls(floating, 'floating');
    }
    updateUi();
  }

  function bindFirstInteraction(){
    if(firstInteractionBound || !startOnFirstInteraction) return;
    firstInteractionBound = true;
    var once = function(){ document.removeEventListener('click', once, true); document.removeEventListener('keydown', once, true); if(startOnFirstInteraction) playMusic(); };
    document.addEventListener('click', once, true);
    document.addEventListener('keydown', once, true);
  }

  var playerInitialized = false;
  function init(){
    if(playerInitialized) return;
    playerInitialized = true;
    createPlayers();
    applyCatalogRows();
    bindFirstInteraction();
  }

  window.addEventListener('jc-links-loaded', function(){ applyCatalogRows(); });
  // O player só é montado após o acesso. A configuração remota e o arquivo de
  // áudio só são consultados ao apertar Play.
  window.addEventListener('jc:access-ready', init);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ if(document.querySelector('[data-jc-music-player]')) init(); }, {once:true});
  else if(document.querySelector('[data-jc-music-player]')) init();
  window.JC_MUSIC_PLAYER = { play:playMusic, pause:pauseMusic, next:next, prev:prev, reloadConfig:fetchRemoteRows, getPlaylist:function(){ return playlist.slice(); } };

})();
