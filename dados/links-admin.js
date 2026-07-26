(function () {
  "use strict";

  const A = window.JC_APP;
  const $ = (id) => document.getElementById(id);
  const state = { access: null, rows: [], definitions: [], scanFailed: false, launcherCatalog: [], officialAutoImportDone: false, mediaAutoImportDone: false, accessHere: { defaultLimit: 20, exceptions: [], selectedClient: null, searchTimer: 0 } };
  const LAUNCHER_DELIVERY_ID = "launcher_access_delivery";
  const DEFAULT_LAUNCHER_DELIVERY_TEMPLATE = "Olá, {nome}! Seu acesso à {versao} foi criado.\n\nUsuário: {usuario}\nSenha: {senha}\nPlano: {plano}\nValidade: {vencimento}\nLink do APK: {link_apk}\nCódigo de download: {codigo_download}\nSuporte: {whatsapp_suporte}\n\n{instrucoes}";

  const EMERGENCY_DEFINITIONS = [
    { id: "gerenciador_arquivos", name: "Gerenciador de arquivos", group: "Config", type: "link", sort: 20 },
    { id: "atualizacao_sistema", name: "Limpeza do UniTv S/Formatar", group: "Config", type: "link", sort: 30 },
    { id: "unitv_free", name: "Download das versões do APK", group: "Config", type: "link", sort: 50 },
    { id: "ativador_11_digitos", name: "Ativador 11", group: "Ativadores", type: "link", sort: 60 },
    { id: "ativador_16_digitos", name: "Ativador 16", group: "Ativadores", type: "link", sort: 70 },
    { id: "ativador_vip_digitos", name: "Ativador VIP", group: "Ativadores", type: "link", sort: 71 },
    { id: "tutorial_ativador_11_whatsapp", name: "Tutorial WhatsApp — Ativador 11", group: "Tutoriais do envio WhatsApp", type: "link", sort: 72, defaultItems: [] },
    { id: "tutorial_ativador_16_whatsapp", name: "Tutorial WhatsApp — Ativador 16", group: "Tutoriais do envio WhatsApp", type: "link", sort: 73, defaultItems: ["Tutorial | https://youtu.be/v6LbxagmBng?is=UHAQZ1Ga1yWqoUya"] },
    { id: "btv_apk", name: "BTV APK", group: "Pacote de APK", type: "link", sort: 80 },
    { id: "stv_apk", name: "STV APK", group: "Pacote de APK", type: "link", sort: 90 },
    { id: "xplus_apk", name: "XPLUS APK", group: "Pacote de APK", type: "link", sort: 100 },
    { id: "eaigo_apk", name: "EAIGO APK", group: "Pacote de APK", type: "link", sort: 110 },
    { id: "extras_apks", name: "Extras / Ferramentas APK", group: "Extras / Ferramentas", type: "link", sort: 120 },
    { id: "musicas_oficiais", name: "Músicas oficiais", group: "Mídias / Mini Tela", type: "link", sort: 130 },
    { id: "mini_tela_video_padrao", name: "Mini tela — vídeo padrão", group: "Mídias / Mini Tela", type: "link", sort: 131 },
    { id: "mini_tela_unitv_video", name: "Mini tela UniTV — vídeo/tutorial", group: "Mídias / Mini Tela", type: "link", sort: 132 },
    { id: "mini_tela_xplus_video", name: "Mini tela XPLUS — vídeo/tutorial", group: "Mídias / Mini Tela", type: "link", sort: 133 },
    { id: "mini_tela_btv_video", name: "Mini tela BTV — vídeo/tutorial", group: "Mídias / Mini Tela", type: "link", sort: 134 },
    { id: "mini_tela_stv_video", name: "Mini tela STV — vídeo/tutorial", group: "Mídias / Mini Tela", type: "link", sort: 135 },
    { id: "mini_tela_eaigo_video", name: "Mini tela EAIGO — vídeo/tutorial", group: "Mídias / Mini Tela", type: "link", sort: 136 },
    { id: "mini_tela_digitos_massa_video", name: "Mini tela Dígitos em Massa — vídeo/tutorial", group: "Mídias / Mini Tela", type: "link", sort: 137 },
    { id: "launcher_tv_video", name: "Launcher Lite — vídeo demonstrativo", group: "Mídias / Launcher TV", type: "link", sort: 137 },
    { id: "launcher_pro_video", name: "Launcher Pro — vídeo demonstrativo", group: "Mídias / Launcher TV", type: "link", sort: 138 },
    { id: "launcher_tv_musicas", name: "Launcher TV — músicas", group: "Mídias / Launcher TV", type: "link", sort: 138 },
    { id: "revenda_creditos_video", name: "Revenda de Créditos — vídeo demonstrativo", group: "Mídias / Revenda", type: "link", sort: 139 },
    { id: "musicas_player_config", name: "Configuração do player de música", group: "Mídias / Mini Tela", type: "config", sort: 129 },
    { id: "mini_tela_icone_mao", name: "Mini tela — mão/JC abrir e fechar", group: "Mídias / Mini Tela", type: "link", sort: 139 },
    { id: "config_download_codes", name: "CONFIG — ATIVADOR DOWNLOAD", group: "Códigos de download", type: "code", sort: 210 },
    { id: "rotacao_11", name: "ATIVADOR 11 — DOWNLOAD", group: "Códigos de download", type: "code", sort: 220 },
    { id: "download_16", name: "ATIVADOR 16 — DOWNLOAD", group: "Códigos de download", type: "code", sort: 230 },
    { id: "download_vip", name: "ATIVADOR VIP — DOWNLOAD", group: "Códigos de download", type: "code", sort: 235 },
    { id: "btv_download_codes", name: "BTV — CÓDIGOS", group: "Pacote de APK", type: "code", sort: 240 },
    { id: "stv_download_codes", name: "STV — CÓDIGOS", group: "Pacote de APK", type: "code", sort: 250 },
    { id: "xplus_download_codes", name: "XPLUS — CÓDIGOS", group: "Pacote de APK", type: "code", sort: 260 },
    { id: "eaigo_download_codes", name: "EAIGO — CÓDIGOS", group: "Pacote de APK", type: "code", sort: 270 },
    { id: "launcher_lite_download_codes", name: "JC Launcher Lite — códigos", group: "JC Launcher Lite / Pro", type: "code", sort: 280 },
    { id: "launcher_pro_download_codes", name: "JC Launcher Pro — códigos", group: "JC Launcher Lite / Pro", type: "code", sort: 290 },
    { id: "launcher_lite_apk", name: "JC Launcher Lite APK", group: "JC Launcher Lite / Pro", type: "link", sort: 380 },
    { id: "launcher_pro_apk", name: "JC Launcher Pro APK", group: "JC Launcher Lite / Pro", type: "link", sort: 390 },
  ];

  const CURRENT_KNOWN_MANAGED_IDS = new Set(EMERGENCY_DEFINITIONS.map((item) => item.id).concat(["config_individual"]));
  const HIDDEN_ADMIN_LINK_IDS = new Set(["config_individual"]);
  const GITHUB_REPLACEABLE_LINK_IDS = new Set([
    "gerenciador_arquivos", "atualizacao_sistema", "unitv_free",
    "ativador_11_digitos", "ativador_16_digitos", "ativador_vip_digitos",
    "btv_apk", "stv_apk", "xplus_apk", "eaigo_apk",
    "extras_apks", "launcher_lite_apk", "launcher_pro_apk"
  ]);

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }
  function uniq(values) { return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]; }
  function toast(message, type) { if (A?.toast) A.toast(message, type); else alert(message); }
  const GITHUB_UPDATE_MODE_KEY = "jc_links_github_update_mode";
  const GITHUB_UPDATE_MODES = new Set(["manual", "apks", "media", "all"]);
  function githubUpdateMode() {
    try {
      const saved = localStorage.getItem(GITHUB_UPDATE_MODE_KEY) || "manual";
      return GITHUB_UPDATE_MODES.has(saved) ? saved : "manual";
    } catch (_) { return "manual"; }
  }
  function setGithubUpdateMode(mode) {
    const value = GITHUB_UPDATE_MODES.has(mode) ? mode : "manual";
    try { localStorage.setItem(GITHUB_UPDATE_MODE_KEY, value); } catch (_) {}
    renderGithubUpdateMode();
    return value;
  }
  function githubUpdateModeLabel(mode) {
    return {
      manual: "Manual — nada é puxado sozinho",
      apks: "Automático — somente APKs oficiais",
      media: "Automático — somente músicas e mini telas",
      all: "Automático — APKs, músicas e mini telas",
    }[mode] || "Manual";
  }
  function renderGithubUpdateMode() {
    const mode = githubUpdateMode();
    if ($("githubUpdateMode")) $("githubUpdateMode").value = mode;
    if ($("githubUpdateModeStatus")) {
      $("githubUpdateModeStatus").textContent = "Modo atual: " + githubUpdateModeLabel(mode) + ". Você ainda pode usar os botões para atualizar manualmente quando quiser.";
    }
  }

  const MUSIC_PLAYER_CONFIG_ID = "musicas_player_config";
  const DEFAULT_MUSIC_PLAYER_CONFIG = {
    playbackMode: "sequence",
    repeatMode: "list",
    defaultVolume: 5,
    startMode: "firstInteraction",
    startOnFirstInteraction: true,
    showFloatingPlayer: true,
    showPagePlayer: true,
    disabledTracks: [],
  };
  function parseMusicPlayerConfig(row) {
    const config = { ...DEFAULT_MUSIC_PLAYER_CONFIG };
    if (row?.value) {
      try { Object.assign(config, JSON.parse(String(row.value))); } catch (_) {}
    }
    if (Array.isArray(row?.items) && row.items.length && !row?.value) {
      row.items.forEach((line) => {
        const parts = String(line || "").split(/\s*[|=]\s*/);
        if (parts.length >= 2) config[parts[0].trim()] = parts.slice(1).join("=").trim();
      });
    }
    config.playbackMode = config.playbackMode === "random" ? "random" : "sequence";
    config.repeatMode = ["list", "one", "none"].includes(config.repeatMode) ? config.repeatMode : "list";
    config.defaultVolume = Math.max(0, Math.min(100, Number(config.defaultVolume || 5)));
    config.startMode = config.startMode === "manual" ? "manual" : "firstInteraction";
    config.startOnFirstInteraction = config.startMode !== "manual";
    config.showFloatingPlayer = config.showFloatingPlayer === false || config.showFloatingPlayer === "false" ? false : true;
    config.showPagePlayer = config.showPagePlayer === false || config.showPagePlayer === "false" ? false : true;
    config.disabledTracks = Array.isArray(config.disabledTracks) ? config.disabledTracks.map(String).filter(Boolean) : [];
    return config;
  }
  function musicFileNameFromUrl(url) {
    try { return decodeURIComponent(String(url || "").split("/").pop().split("?")[0].split("#")[0]); } catch (_) { return String(url || "").split("/").pop(); }
  }
  function musicLineToTrack(line) {
    const raw = String(line || "").trim();
    if (!raw) return null;
    const parts = raw.split(/\s*[|=]\s*/).map((v) => v.trim()).filter(Boolean);
    let url = "";
    for (let i = parts.length - 1; i >= 0; i--) if (/^https?:\/\//i.test(parts[i])) { url = parts[i]; break; }
    if (!url) {
      const found = raw.match(/https?:\/\/\S+/i);
      url = found ? found[0] : "";
    }
    if (!url) return null;
    const title = parts.length > 1 ? parts[0] : musicFileNameFromUrl(url).replace(/\.(mp3|wav|ogg|m4a|flac)$/i, "").replace(/[._-]+/g, " ").trim();
    return { key: musicFileNameFromUrl(url) || title, title: title || "Música JC-APK TV", url };
  }
  function musicDefaultTracks() {
    const list = window.JC_GITHUB_MUSIC_CONFIG?.playlist || [];
    return list.map((track) => {
      const url = String(track?.src || track?.url || "").trim();
      if (!url) return null;
      return { key: String(track.key || track.id || musicFileNameFromUrl(url) || track.title || track.name), title: String(track.title || track.name || musicFileNameFromUrl(url) || "Música JC-APK TV"), url };
    }).filter(Boolean);
  }
  function musicCatalogTracks() {
    const row = rowById("musicas_oficiais");
    const fromCatalog = Array.isArray(row?.items) ? row.items.map(musicLineToTrack).filter(Boolean) : [];
    const tracks = fromCatalog.length ? fromCatalog : musicDefaultTracks();
    const seen = new Set();
    return tracks.filter((track) => {
      const key = String(track.key || track.title || track.url || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function renderMusicTrackManager(config = currentMusicPlayerConfig()) {
    const host = $("musicTracksManager");
    if (!host) return;
    const tracks = musicCatalogTracks();
    const disabled = new Set(config.disabledTracks || []);
    if (!tracks.length) {
      host.innerHTML = '<div class="empty">Nenhuma música oficial foi reconhecida ainda. Clique em Atualizar mídias agora para puxar a release do GitHub.</div>';
      return;
    }
    host.innerHTML = tracks.map((track, index) => {
      const key = String(track.key || track.title || track.url || "");
      const checked = !disabled.has(key) && !disabled.has(track.title) ? "checked" : "";
      return `<label class="music-track-row"><input type="checkbox" data-music-track-key="${esc(key)}" ${checked}><span><b>${esc(track.title || "Música JC-APK TV")}</b><small>${esc(musicFileNameFromUrl(track.url) || track.url || key)}</small></span><em>#${index + 1}</em></label>`;
    }).join("");
  }
  function currentMusicPlayerConfig() {
    return parseMusicPlayerConfig(rowById(MUSIC_PLAYER_CONFIG_ID));
  }
  function renderMusicPlayerConfig() {
    if (!$("musicPlaybackMode")) return;
    const config = currentMusicPlayerConfig();
    $("musicPlaybackMode").value = config.playbackMode;
    $("musicRepeatMode").value = config.repeatMode;
    $("musicDefaultVolume").value = String(config.defaultVolume);
    $("musicStartMode").value = config.startMode;
    $("musicShowFloating").value = config.showFloatingPlayer ? "true" : "false";
    if ($("musicShowPagePlayer")) $("musicShowPagePlayer").value = config.showPagePlayer ? "true" : "false";
    renderMusicTrackManager(config);
    if ($("musicPlayerConfigStatus")) {
      const playText = config.playbackMode === "random" ? "aleatório" : "sequência";
      const repeatText = config.repeatMode === "one" ? "repetir música atual" : config.repeatMode === "none" ? "parar ao terminar" : "repetir lista";
      const activeTracks = musicCatalogTracks().filter((track) => !(config.disabledTracks || []).includes(String(track.key || track.title || track.url || ""))).length;
      $("musicPlayerConfigStatus").textContent = `Configuração atual: ${playText}, ${repeatText}, volume inicial ${config.defaultVolume}%, ${activeTracks || 0} música(s) ativa(s).`;
    }
  }
  async function saveMusicPlayerConfig() {
    if (!A?.ready || !A?.client) throw new Error("Configure a conexão do Supabase antes de salvar o player.");
    const volume = Math.max(0, Math.min(100, Number($("musicDefaultVolume")?.value || 5)));
    const config = {
      playbackMode: $("musicPlaybackMode")?.value === "random" ? "random" : "sequence",
      repeatMode: ["list", "one", "none"].includes($("musicRepeatMode")?.value) ? $("musicRepeatMode").value : "list",
      defaultVolume: volume,
      startMode: $("musicStartMode")?.value === "manual" ? "manual" : "firstInteraction",
      startOnFirstInteraction: $("musicStartMode")?.value !== "manual",
      showFloatingPlayer: $("musicShowFloating")?.value !== "false",
      showPagePlayer: $("musicShowPagePlayer")?.value !== "false",
      disabledTracks: (() => {
        const enabledKeys = new Set([...document.querySelectorAll("[data-music-track-key]:checked")].map((input) => String(input.dataset.musicTrackKey || "")));
        return musicCatalogTracks().filter((track) => {
          const key = String(track.key || track.title || track.url || "");
          return key && !enabledKeys.has(key);
        }).map((track) => String(track.key || track.title || track.url || "")).filter(Boolean);
      })(),
    };
    const row = rowById(MUSIC_PLAYER_CONFIG_ID);
    const payload = {
      id: MUSIC_PLAYER_CONFIG_ID,
      group_id: row?.group_id || "external_media",
      group_name: row?.group_name || "Mídias / Mini Tela",
      name: row?.name || "Configuração do player de música",
      kind: "direct",
      value: JSON.stringify(config),
      items: [],
      active: true,
      sort_order: Number(row?.sort_order || 129),
    };
    const { error } = await A.client.from("links_catalog").upsert(payload, { onConflict: "id" });
    if (error) throw error;
    if ($("musicPlayerConfigStatus")) $("musicPlayerConfigStatus").textContent = "Configuração do player salva. Arquivos continuam no GitHub; o Supabase guardou só as opções leves.";
    toast("Configuração do player salva.");
    await fetchRows();
    renderMusicPlayerConfig();
  }
  function setAllMusicTracks(checked) {
    document.querySelectorAll("[data-music-track-key]").forEach((input) => { input.checked = checked; });
    const config = currentMusicPlayerConfig();
    config.disabledTracks = checked ? [] : musicCatalogTracks().map((track) => String(track.key || track.title || track.url || "")).filter(Boolean);
    if ($("musicPlayerConfigStatus")) $("musicPlayerConfigStatus").textContent = checked ? "Todas as músicas foram marcadas. Clique em Salvar player para gravar." : "Todas as músicas foram ocultadas do player. Clique em Salvar player para gravar.";
  }

  function rowById(id) { return state.rows.find((row) => String(row.id || "") === String(id || "")) || null; }
  function definitionById(id) { return state.definitions.find((item) => item.id === id) || null; }
  function supportsNamedCodeOptions(id) {
    const definition = definitionById(id);
    const row = rowById(id);
    return definition?.type === "code" || row?.kind === "code_group";
  }
  function showModal(id) { const el = $(id); if (el) { el.classList.add("open"); el.setAttribute("aria-hidden", "false"); } }
  function closeModal(id) { const el = $(id); if (el) { el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); } }


  async function invokeAccessHere(body) {
    const { data, error } = await A.client.functions.invoke("jc-download", { body });
    if (error) {
      let message = error?.message || "A função jc-download recusou a solicitação.";
      try {
        const context = error?.context;
        if (context && typeof context.json === "function") {
          const payload = await context.clone().json();
          message = payload?.error || message;
        } else if (context?.json?.error) message = context.json.error;
      } catch (_) {}
      throw new Error(message);
    }
    if (!data?.ok) throw new Error(data?.error || "Não foi possível carregar a configuração do Acesse Aqui.");
    return data;
  }

  function usageText(item) {
    if (item?.unlimited) return "Sem limite";
    const used = Number(item?.used_today || 0);
    const pending = Number(item?.pending_today || 0);
    const limit = Number(item?.effective_limit || state.accessHere.defaultLimit || 20);
    return pending ? `${used} confirmado(s) + ${pending} pendente(s) de ${limit}` : `${used} de ${limit} hoje`;
  }

  function renderAccessHereLimits() {
    if (!$('accessDefaultLimit')) return;
    $('accessDefaultLimit').value = String(state.accessHere.defaultLimit || 20);
    const rows = state.accessHere.exceptions || [];
    $('accessExceptionsCaption').textContent = rows.length
      ? `${rows.length} cliente(s) com regra diferente do padrão.`
      : 'Nenhuma exceção. Todos usam o limite padrão.';
    $('accessExceptionsList').innerHTML = rows.length ? rows.map((item) => {
      const rule = item.unlimited ? 'Sem limite' : `${Number(item.daily_limit || item.effective_limit || 20)} por dia`;
      return `<div class="access-exception"><div><strong>${esc(item.client_name || item.username || 'Cliente')}</strong><small>@${esc(item.username || '')} · ${esc(usageText(item))}</small></div><b>${esc(rule)}</b></div>`;
    }).join('') : '<div class="empty">Nenhum cliente foi alterado. Todos usam o padrão.</div>';
  }

  async function loadAccessHereLimits() {
    try {
      const data = await invokeAccessHere({ action: 'admin_get_limits' });
      state.accessHere.defaultLimit = Number(data.default_daily_limit || 20);
      state.accessHere.exceptions = data.exceptions || [];
      renderAccessHereLimits();
    } catch (error) {
      console.warn('JC-APK: limites do Acesse Aqui não carregados.', error);
      if ($('accessExceptionsList')) $('accessExceptionsList').innerHTML = `<div class="empty" style="color:#ffd5dc">${esc(error.message)}</div>`;
      if ($('accessExceptionsCaption')) $('accessExceptionsCaption').textContent = 'Execute o SQL 13A e publique a jc-download atualizada.';
    }
  }

  function selectedClientView(client) {
    state.accessHere.selectedClient = client || null;
    const box = $('accessSelectedClient');
    if (!client) {
      box?.classList.add('hidden');
      return;
    }
    box.classList.remove('hidden');
    $('accessSelectedName').textContent = client.display_name || client.full_name || client.username || 'Cliente';
    $('accessSelectedMeta').textContent = `@${client.username || ''} · ${client.email || client.whatsapp || ''}`;
    $('accessSelectedUsage').textContent = usageText(client);
    const exception = (state.accessHere.exceptions || []).find((item) => item.client_id === client.id);
    const mode = exception ? (exception.unlimited ? 'unlimited' : 'custom') : 'default';
    $('accessClientMode').value = mode;
    $('accessClientLimit').value = String(exception?.daily_limit || client.effective_limit || state.accessHere.defaultLimit || 20);
    $('accessClientLimit').disabled = mode !== 'custom';
  }

  async function searchAccessClients() {
    const term = $('accessClientSearch').value.trim();
    if (term.length < 2) {
      $('accessClientResults').innerHTML = '<div class="empty">Digite pelo menos 2 caracteres.</div>';
      selectedClientView(null);
      return;
    }
    $('accessClientResults').innerHTML = '<div class="empty">Pesquisando...</div>';
    try {
      const data = await invokeAccessHere({ action: 'admin_search_clients', search: term });
      const clients = data.clients || [];
      $('accessClientResults').innerHTML = clients.length ? clients.map((client) => `
        <button type="button" class="access-client-result" data-access-client="${esc(client.id)}">
          <div><strong>${esc(client.display_name || client.full_name || client.username || 'Cliente')}</strong><small>@${esc(client.username || '')} · ${esc(client.email || client.whatsapp || '')}</small></div>
          <span>${esc(usageText(client))}</span>
        </button>`).join('') : '<div class="empty">Nenhum cliente ativo encontrado.</div>';
      $('accessClientResults').querySelectorAll('[data-access-client]').forEach((button) => {
        button.addEventListener('click', () => selectedClientView(clients.find((item) => item.id === button.dataset.accessClient)));
      });
    } catch (error) {
      $('accessClientResults').innerHTML = `<div class="empty" style="color:#ffd5dc">${esc(error.message)}</div>`;
    }
  }

  function openAccessClientManager() {
    $('accessClientSearch').value = '';
    $('accessClientResults').innerHTML = '<div class="empty">Pesquise um cliente para configurar.</div>';
    selectedClientView(null);
    showModal('accessClientsModal');
    setTimeout(() => $('accessClientSearch')?.focus(), 80);
  }

  async function saveAccessDefault() {
    const dailyLimit = Number($('accessDefaultLimit').value || 0);
    if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 10000) throw new Error('Informe um limite padrão entre 1 e 10000.');
    await invokeAccessHere({ action: 'admin_save_default_limit', daily_limit: dailyLimit });
    state.accessHere.defaultLimit = dailyLimit;
    toast('Limite padrão do Acesse Aqui salvo.');
    await loadAccessHereLimits();
  }

  async function saveAccessClient() {
    const client = state.accessHere.selectedClient;
    if (!client?.id) throw new Error('Selecione um cliente.');
    const mode = $('accessClientMode').value;
    if (mode === 'default') {
      await invokeAccessHere({ action: 'admin_delete_client_limit', client_id: client.id });
      toast('Cliente voltou a usar o limite padrão.');
    } else if (mode === 'unlimited') {
      await invokeAccessHere({ action: 'admin_save_client_limit', client_id: client.id, unlimited: true });
      toast('Cliente configurado sem limite diário.');
    } else {
      const dailyLimit = Number($('accessClientLimit').value || 0);
      if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 10000) throw new Error('Informe um limite personalizado entre 1 e 10000.');
      await invokeAccessHere({ action: 'admin_save_client_limit', client_id: client.id, unlimited: false, daily_limit: dailyLimit });
      toast('Limite personalizado salvo para o cliente.');
    }
    await loadAccessHereLimits();
    await searchAccessClients();
  }

  async function revertAccessClient() {
    const client = state.accessHere.selectedClient;
    if (!client?.id) throw new Error('Selecione um cliente.');
    await invokeAccessHere({ action: 'admin_delete_client_limit', client_id: client.id });
    toast('Cliente voltou a usar o limite padrão.');
    await loadAccessHereLimits();
    await searchAccessClients();
  }

  function itemsOf(row) {
    if (!row) return [];
    const items = Array.isArray(row.items) ? row.items : (() => {
      try { const value = JSON.parse(row.items || "[]"); return Array.isArray(value) ? value : []; } catch (_) { return []; }
    })();
    const output = items.map((value) => String(value || "").trim()).filter(Boolean);
    const direct = String(row.value || "").trim();
    if (row.kind === "direct" && direct && !output.includes(direct)) output.unshift(direct);
    return output;
  }

  function normalizedLabel(element, fallback) {
    return String(element.getAttribute("data-jc-link-name") || element.getAttribute("data-jc-function-name") || fallback || element.textContent || "")
      .replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function definitionsFromDocument(doc) {
    const map = new Map();
    doc.querySelectorAll("[data-jc-link-id]").forEach((element, index) => {
      const id = String(element.getAttribute("data-jc-link-id") || "").trim();
      if (!id || HIDDEN_ADMIN_LINK_IDS.has(id) || map.has("link:" + id)) return;
      map.set("link:" + id, {
        id,
        name: normalizedLabel(element, id),
        group: String(element.getAttribute("data-jc-function-category") || "Links de download"),
        type: "link",
        sort: 100 + index,
      });
    });
    doc.querySelectorAll('[data-jc-action="generate-code"][data-jc-code-group]').forEach((element, index) => {
      const id = String(element.getAttribute("data-jc-code-group") || "").trim();
      if (!id || map.has("code:" + id)) return;
      map.set("code:" + id, {
        id,
        name: normalizedLabel(element, id),
        group: String(element.getAttribute("data-jc-function-category") || "Códigos de download"),
        type: "code",
        sort: 500 + index,
      });
    });
    doc.querySelectorAll('[data-jc-action="generate-package-code"][data-jc-package]').forEach((element, index) => {
      const slug = String(element.getAttribute("data-jc-package") || "").trim();
      if (!slug) return;
      const id = slug + "_download_codes";
      if (map.has("code:" + id)) return;
      map.set("code:" + id, {
        id,
        name: normalizedLabel(element, slug.toUpperCase() + " — CÓDIGOS"),
        group: String(element.getAttribute("data-jc-function-category") || "Pacote de APK"),
        type: "code",
        sort: 600 + index,
      });
    });
    return mergeOfficialMinimumDefinitions([...map.values()]);
  }

  function mergeOfficialMinimumDefinitions(definitions) {
    const map = new Map();
    (definitions || []).forEach((item) => {
      if (!item?.id || !item?.type || HIDDEN_ADMIN_LINK_IDS.has(item.id)) return;
      map.set(item.type + ":" + item.id, { ...item });
    });
    EMERGENCY_DEFINITIONS.forEach((item) => {
      if (HIDDEN_ADMIN_LINK_IDS.has(item.id)) return;
      const key = item.type + ":" + item.id;
      if (!map.has(key)) map.set(key, { ...item, officialMinimum: true });
    });
    return [...map.values()].sort((a, b) => Number(a.sort || 900) - Number(b.sort || 900) || String(a.name || a.id).localeCompare(String(b.name || b.id)));
  }

  async function readHtmlDefinitions() {
    try {
      const response = await fetch("geradores/index.html?jc-link-scan=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível ler geradores/index.html.");
      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      const definitions = definitionsFromDocument(doc);
      if (!definitions.length) throw new Error("O HTML foi lido, mas nenhuma configuração estrutural foi encontrada.");
      state.scanFailed = false;
      return definitions;
    } catch (error) {
      console.warn("JC-APK: leitura estrutural falhou; usando lista de emergência sem desativar dados.", error);
      state.scanFailed = true;
      return EMERGENCY_DEFINITIONS.map((item) => ({ ...item }));
    }
  }

  async function fetchRows() {
    const { data, error } = await A.client.from("links_catalog").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true });
    if (error) throw error;
    state.rows = data || [];
  }

  function emptyRowFor(definition) {
    const defaultItems = Array.isArray(definition?.defaultItems)
      ? uniq(definition.defaultItems)
      : [];
    return {
      id: definition.id,
      group_id: definition.type === "code" ? "download_codes" : "html_buttons",
      group_name: definition.group || (definition.type === "code" ? "Códigos de download" : "Botões do HTML"),
      name: definition.name || definition.id,
      kind: definition.type === "code" ? "code_group" : "link_group",
      value: null,
      items: defaultItems,
      active: defaultItems.length > 0,
      sort_order: Number(definition.sort || 900),
    };
  }

  function isManagedRow(row) {
    const id = String(row.id || "");
    return CURRENT_KNOWN_MANAGED_IDS.has(id)
      || String(row.group_id || "") === "html_buttons"
      || /^extra_(?:link|code)__/.test(id)
      || /_apk$/.test(id)
      || /_download_codes$/.test(id);
  }

  async function synchronizeDefinitions(definitions, allowDeactivate) {
    const existing = new Map(state.rows.map((row) => [String(row.id), row]));
    const missing = definitions.filter((definition) => !existing.has(definition.id));
    if (missing.length) {
      const { error } = await A.client.from("links_catalog").upsert(missing.map(emptyRowFor), { onConflict: "id" });
      if (error) throw error;
    }

    let deactivated = 0;
    if (allowDeactivate) {
      const found = new Set(definitions.map((definition) => definition.id));
      const removed = state.rows.filter((row) => row.active !== false && isManagedRow(row) && !found.has(String(row.id)));
      for (const row of removed) {
        const { error } = await A.client.from("links_catalog").update({ active: false }).eq("id", row.id);
        if (error) throw error;
        deactivated += 1;
      }
    }
    return { created: missing.length, deactivated };
  }

  async function scanAndSync() {
    await fetchRows();
    const definitions = await readHtmlDefinitions();
    const result = await synchronizeDefinitions(definitions, !state.scanFailed);
    state.definitions = definitions;
    await fetchRows();
    return { ...result, found: definitions.length, emergency: state.scanFailed };
  }

  async function loadAll(sync) {
    if (sync) await scanAndSync();
    else {
      await fetchRows();
      state.definitions = await readHtmlDefinitions();
    }
    await loadAccessHereLimits();
    await loadLauncherCatalog();
    renderAll();
    renderMusicPlayerConfig();
    renderLauncherDelivery();
  }

  function launcherDeliveryConfig() {
    const row = rowById(LAUNCHER_DELIVERY_ID);
    try { return JSON.parse(String(row?.value || "{}")); }
    catch (_) { return {}; }
  }

  function renderLauncherDelivery() {
    if (!$("launcherDeliveryTemplate")) return;
    const config = launcherDeliveryConfig();
    $("launcherDeliveryTemplate").value = String(config.template || DEFAULT_LAUNCHER_DELIVERY_TEMPLATE);
    $("launcherDeliverySupport").value = String(config.support_whatsapp || "(31) 99760-9439");
    $("launcherDeliveryInstructions").value = String(config.instructions || "Instale o APK, abra e entre com o usuário e a senha.");
    $("launcherDeliveryStatus").textContent = rowById(LAUNCHER_DELIVERY_ID)
      ? "Mensagem carregada do Supabase."
      : "Use Salvar mensagem para criar a configuração oficial.";
  }

  async function saveLauncherDelivery() {
    const template = $("launcherDeliveryTemplate").value.trim();
    if (!template) throw new Error("Informe a mensagem da JC Launcher.");
    const config = {
      template,
      support_whatsapp: $("launcherDeliverySupport").value.trim(),
      instructions: $("launcherDeliveryInstructions").value.trim(),
    };
    $("launcherDeliveryStatus").textContent = "Salvando mensagem...";
    const old = rowById(LAUNCHER_DELIVERY_ID);
    const payload = {
      id: LAUNCHER_DELIVERY_ID,
      group_id: old?.group_id || "launcher_settings",
      group_name: old?.group_name || "JC Launcher",
      name: old?.name || "Mensagem de envio do acesso da JC Launcher",
      kind: old?.kind || "config",
      value: JSON.stringify(config),
      items: [],
      active: true,
      sort_order: Number(old?.sort_order || 395),
    };
    const { error } = await A.client.from("links_catalog").upsert(payload, { onConflict: "id" });
    if (error) throw error;
    await fetchRows();
    renderLauncherDelivery();
    $("launcherDeliveryStatus").textContent = "Mensagem salva e ligada ao envio da JC Launcher.";
    toast("Mensagem da JC Launcher salva.");
  }

  async function loadLauncherCatalog(){
    try{const data=await A.client.rpc('jc_launcher_get_install_catalog_settings');if(data.error)throw data.error;state.launcherCatalog=data.data?.catalog||[];}
    catch(error){console.warn('Catálogo da Launcher não carregado',error);state.launcherCatalog=[];}
    renderLauncherCatalog();
  }
  function renderLauncherCatalog(){
    const box=$('launcherCatalogGrid');if(!box)return;
    box.innerHTML=state.launcherCatalog.length?state.launcherCatalog.map(app=>`<article class="tile"><div class="tile-title"><h5>${esc(app.name)}</h5><span class="tag">${app.active?'Ativo':'Inativo'}</span></div><div class="desc">${esc(app.install_mode)} • ${esc(app.visibility_mode)}<br>ID Links: ${esc(app.link_catalog_id||'manual')}</div><div class="meta"><span class="pill">${(app.versions||[]).length} versão(ões)</span></div><div class="tile-actions"><button class="btn blue" data-edit-launcher-app="${esc(app.id)}">Editar</button><button class="btn green" data-new-launcher-version="${esc(app.id)}">+ Versão</button></div><div class="option-list">${(app.versions||[]).map(v=>`<button class="option-row" data-edit-launcher-version="${esc(v.id)}" data-app="${esc(app.id)}"><b>${esc(v.version_label)}</b><small>${esc(v.apk_url)}${v.restricted?' • RESTRITA':''}</small></button>`).join('')}</div></article>`).join(''):'<div class="empty">Execute o SQL 12D-03 para criar o catálogo.</div>';
    box.querySelectorAll('[data-edit-launcher-app]').forEach(b=>b.addEventListener('click',()=>openLauncherApp(b.dataset.editLauncherApp)));
    box.querySelectorAll('[data-new-launcher-version]').forEach(b=>b.addEventListener('click',()=>openLauncherVersion(b.dataset.newLauncherVersion,null)));
    box.querySelectorAll('[data-edit-launcher-version]').forEach(b=>b.addEventListener('click',()=>openLauncherVersion(b.dataset.app,b.dataset.editLauncherVersion)));
  }
  function openLauncherApp(id){const app=state.launcherCatalog.find(x=>x.id===id)||{};$('launcherAppId').value=app.id||'';$('launcherAppName').value=app.name||'';$('launcherAppKey').value=app.app_key||'';$('launcherAppPackage').value=app.package_name||'';$('launcherAppIcon').value=app.icon_url||'';$('launcherAppLinkId').value=app.link_catalog_id||'';$('launcherAppMode').value=app.install_mode||'simple';$('launcherAppVisibility').value=app.visibility_mode||'permission';$('launcherAppPermissions').value=(app.permission_ids||[]).join(', ');$('launcherAppSort').value=app.sort_order||0;$('launcherAppDescription').value=app.description||'';$('launcherAppActive').checked=app.active!==false;showModal('launcherAppModal');}
  async function saveLauncherApp(){const payload={id:$('launcherAppId').value||null,name:$('launcherAppName').value.trim(),app_key:$('launcherAppKey').value.trim(),package_name:$('launcherAppPackage').value.trim()||null,icon_url:$('launcherAppIcon').value.trim()||null,link_catalog_id:$('launcherAppLinkId').value.trim()||null,install_mode:$('launcherAppMode').value,visibility_mode:$('launcherAppVisibility').value,permission_ids:$('launcherAppPermissions').value.split(',').map(x=>x.trim()).filter(Boolean),sort_order:Number($('launcherAppSort').value||0),description:$('launcherAppDescription').value.trim(),active:$('launcherAppActive').checked};const r=await A.client.rpc('jc_launcher_save_install_app',{p_payload:payload});if(r.error)throw r.error;closeModal('launcherAppModal');toast('Aplicativo salvo.');await loadLauncherCatalog();}
  function openLauncherVersion(appId,id){const app=state.launcherCatalog.find(x=>x.id===appId)||{};const v=(app.versions||[]).find(x=>x.id===id)||{};$('launcherVersionId').value=v.id||'';$('launcherVersionAppId').value=appId;$('launcherVersionLabel').value=v.version_label||'';$('launcherVersionUrl').value=v.apk_url||'';$('launcherVersionCode').value=v.download_code||'';$('launcherVersionMinApi').value=v.min_api??'';$('launcherVersionMaxApi').value=v.max_api??'';$('launcherVersionRecommended').checked=Boolean(v.recommended);$('launcherVersionRestricted').checked=Boolean(v.restricted);$('launcherVersionActive').checked=v.active!==false;showModal('launcherVersionModal');}
  async function saveLauncherVersion(){const payload={id:$('launcherVersionId').value||null,app_id:$('launcherVersionAppId').value,version_label:$('launcherVersionLabel').value.trim(),apk_url:$('launcherVersionUrl').value.trim(),download_code:$('launcherVersionCode').value.trim()||null,min_api:$('launcherVersionMinApi').value||null,max_api:$('launcherVersionMaxApi').value||null,recommended:$('launcherVersionRecommended').checked,restricted:$('launcherVersionRestricted').checked,active:$('launcherVersionActive').checked};const r=await A.client.rpc('jc_launcher_save_install_version',{p_payload:payload});if(r.error)throw r.error;closeModal('launcherVersionModal');toast('Versão salva.');await loadLauncherCatalog();}
  async function syncLauncherCatalog(){const r=await A.client.rpc('jc_launcher_refresh_install_catalog_from_links');if(r.error)throw r.error;toast(`${r.data?.versions_synchronized||0} versão(ões) sincronizada(s).`);await loadLauncherCatalog();}

  const OFFICIAL_GITHUB = {
    owner: "JoaoJMuniz19",
    repo: "JC-APK-TV-Downloads",
    tag: "downloads-oficiais",
  };

  const OFFICIAL_FALLBACK_ASSETS = [
    "BTV.Vivo.TV.1.0.0.0.apk",
    "Gerenciador.de.Arquivos+.apk",
    "Max.Net.TV.12.4.apk",
    "STV.Esportes.20260124.apk",
    "TouroBox.Vod.2.4.0.apk",
    "UniTV.Free.5.1.0.0.apk",
    "UniTV.Free.5.2.0.0.apk",
    "UniTV.Free.5.3.0.0.apk",
    "UniTV.Free.5.3.1.0.apk",
    "UniTV.Free.5.4.0.0.apk",
    "UniTV.Free.5.4.1.0.apk",
    "UniTV.Free.5.5.0.0.apk",
    "UniTV.Utilizado.pra.TESTE.apk",
    "Xplus.Live.6.6.1.apk",
    "Xplus.Vod.2.63.apk",
  ];

  function officialAssetUrl(name) {
    return `https://github.com/${OFFICIAL_GITHUB.owner}/${OFFICIAL_GITHUB.repo}/releases/download/${OFFICIAL_GITHUB.tag}/${encodeURIComponent(name)}`;
  }

  function cleanOfficialName(name) {
    return String(name || "")
      .replace(/\.apk$/i, "")
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\bVod\b/i, "VOD")
      .replace(/\bTv\b/i, "TV")
      .replace(/\bBtv\b/i, "BTV")
      .replace(/\bStv\b/i, "STV")
      .replace(/\bXplus\b/i, "XPLUS")
      .replace(/\bUnitv\b/i, "UniTV")
      .trim();
  }

  function versionFromName(name) {
    const match = String(name || "").match(/(\d+(?:\.\d+){1,})/);
    return match ? match[1] : "";
  }

  function officialSortValue(text) {
    const version = versionFromName(text);
    if (!version) return 999999;
    return version.split(".").reduce((total, part, index) => total + Number(part || 0) * Math.pow(100, 6 - index), 0);
  }

  function classifyOfficialAsset(asset) {
    const name = String(asset?.name || "").trim();
    if (!/\.apk$/i.test(name)) return null;
    const lower = name.toLowerCase();
    const url = String(asset?.browser_download_url || asset?.url || "").trim() || officialAssetUrl(name);
    const version = versionFromName(name);
    let id = "extras_apks";
    let groupName = "Extras / Ferramentas";
    let rowName = "Extras / Ferramentas APK";
    let label = cleanOfficialName(name);
    let sort = 800000 + officialSortValue(name);

    if (/unitv/.test(lower)) {
      id = "unitv_free";
      groupName = "Config";
      rowName = "Download das versões do APK";
      label = /teste|test/i.test(lower) ? "UniTV Teste" : `UniTV Free${version ? ` (${version})` : ""}`;
      sort = /teste|test/i.test(lower) ? 700000 : officialSortValue(name);
    } else if (/\bbtv\b|btv\./.test(lower)) {
      id = "btv_apk";
      groupName = "Pacote de APK";
      rowName = "BTV APK";
      label = `BTV Vivo TV${version ? ` (${version})` : ""}`;
      sort = officialSortValue(name);
    } else if (/\bstv\b|stv\./.test(lower)) {
      id = "stv_apk";
      groupName = "Pacote de APK";
      rowName = "STV APK";
      label = `STV Esportes${version ? ` (${version})` : ""}`;
      sort = officialSortValue(name);
    } else if (/x\s*plus|xplus/.test(lower)) {
      id = "xplus_apk";
      groupName = "Pacote de APK";
      rowName = "XPLUS APK";
      const kind = /live/i.test(lower) ? "Live" : /vod/i.test(lower) ? "VOD" : "";
      label = `XPLUS${kind ? ` ${kind}` : ""}${version ? ` (${version})` : ""}`;
      sort = (/live/i.test(lower) ? 100000 : /vod/i.test(lower) ? 200000 : 300000) + officialSortValue(name);
    } else if (/eaigo/.test(lower)) {
      id = "eaigo_apk";
      groupName = "Pacote de APK";
      rowName = "EAIGO APK";
      label = `EAIGO${version ? ` (${version})` : ""}`;
      sort = officialSortValue(name);
    } else if (/ativador|activator|jc\s*apk\s*tv\s*ativador|jcapktvativador/.test(lower)) {
      if (/\b11\b|11\s*d[ií]gitos|ativador11|jcapktvativador11/.test(lower)) {
        id = "ativador_11_digitos";
        rowName = "Ativador 11";
        label = `Ativador 11${version ? ` (${version})` : ""}`;
      } else if (/\b16\b|16\s*d[ií]gitos|ativador16|jcapktvativador16/.test(lower)) {
        id = "ativador_16_digitos";
        rowName = "Ativador 16";
        label = `Ativador 16${/compativel|compat/i.test(lower) ? " Mais Compatível" : ""}${version ? ` (${version})` : ""}`;
      }
      groupName = "Ativadores";
      sort = officialSortValue(name);
    } else if (/launcher/.test(lower)) {
      if (/pro/.test(lower)) { id = "launcher_pro_apk"; rowName = "JC Launcher Pro APK"; label = `JC Launcher Pro${version ? ` (${version})` : ""}`; }
      else { id = "launcher_lite_apk"; rowName = "JC Launcher Lite APK"; label = `JC Launcher Lite${version ? ` (${version})` : ""}`; }
      groupName = "JC Launcher Lite / Pro";
      sort = officialSortValue(name);
    } else if (/gerenciador|arquivo|file\s*manager|files/.test(lower)) {
      id = "gerenciador_arquivos";
      groupName = "Config";
      rowName = "Gerenciador de arquivos";
      label = "Gerenciador de Arquivos+";
      sort = 10;
    } else if (/limpeza|atualizacao|atualiza[cç][aã]o|clean|maintenance/.test(lower)) {
      id = "atualizacao_sistema";
      groupName = "Config";
      rowName = "Limpeza do UniTv S/Formatar";
      sort = 20;
    }

    return { id, groupName, rowName, label, url, sourceName: name, sort, line: `${label} | ${url}` };
  }

  function groupOfficialAssets(assets) {
    const groups = new Map();
    (assets || []).forEach((asset) => {
      const item = classifyOfficialAsset(asset);
      if (!item) return;
      if (!groups.has(item.id)) groups.set(item.id, { id: item.id, groupName: item.groupName, rowName: item.rowName, items: [] });
      groups.get(item.id).items.push(item);
    });
    groups.forEach((group) => {
      group.items.sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
      group.lines = uniq(group.items.map((item) => item.line));
    });
    return [...groups.values()].sort((a, b) => {
      const da = definitionById(a.id)?.sort ?? (a.id === "extras_apks" ? 120 : 900);
      const db = definitionById(b.id)?.sort ?? (b.id === "extras_apks" ? 120 : 900);
      return da - db || a.rowName.localeCompare(b.rowName);
    });
  }

  async function fetchOfficialGithubAssets() {
    const apiUrl = `https://api.github.com/repos/${OFFICIAL_GITHUB.owner}/${OFFICIAL_GITHUB.repo}/releases/tags/${OFFICIAL_GITHUB.tag}`;
    try {
      const response = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`GitHub respondeu ${response.status}.`);
      const payload = await response.json();
      if (!Array.isArray(payload.assets)) throw new Error("Resposta do GitHub sem lista de assets.");
      return { source: "github", assets: payload.assets.map((asset) => ({ name: asset.name, browser_download_url: asset.browser_download_url })) };
    } catch (error) {
      console.warn("JC-APK: não foi possível ler a API do GitHub; usando lista local atual.", error);
      return { source: "fallback", assets: OFFICIAL_FALLBACK_ASSETS.map((name) => ({ name, browser_download_url: officialAssetUrl(name) })) };
    }
  }

  function rowForOfficialGroup(group) {
    const definition = definitionById(group.id) || { id: group.id, name: group.rowName, group: group.groupName, type: "link", sort: group.id === "extras_apks" ? 120 : 900 };
    const old = rowById(group.id);
    return {
      id: group.id,
      group_id: old?.group_id || "html_buttons",
      group_name: definition.group || group.groupName || old?.group_name || "Links de download",
      name: definition.name || group.rowName || old?.name || group.id,
      kind: "link_group",
      value: null,
      items: group.lines || [],
      active: Boolean(group.lines?.length),
      sort_order: Number(old?.sort_order || definition.sort || 900),
    };
  }

  function containsOldSupabaseStorage(row) {
    const values = [];
    if (row?.value) values.push(String(row.value));
    if (Array.isArray(row?.items)) values.push(...row.items.map((item) => String(item || "")));
    return values.some((value) => /supabase\.co\/storage|storage\/v1\/object|supabase\.in\/storage/i.test(value));
  }

  async function clearOldSupabaseDownloadLinks(importedIds) {
    const ids = new Set(importedIds || []);
    const rows = state.rows.filter((row) => {
      const id = String(row?.id || "");
      return (HIDDEN_ADMIN_LINK_IDS.has(id) || (GITHUB_REPLACEABLE_LINK_IDS.has(id) && !ids.has(id)))
        && row?.kind !== "code_group"
        && containsOldSupabaseStorage(row);
    });
    if (!rows.length) return 0;
    const payload = rows.map((row) => ({
      id: row.id,
      group_id: row.group_id || "html_buttons",
      group_name: row.group_name || "Links de download",
      name: row.name || row.id,
      kind: row.kind === "direct" ? "direct" : "link_group",
      value: null,
      items: [],
      active: false,
      sort_order: Number(row.sort_order || 900),
    }));
    const { error } = await A.client.from("links_catalog").upsert(payload, { onConflict: "id" });
    if (error) throw error;
    return payload.length;
  }

  function renderOfficialImportPreview(groups, source) {
    const box = $("officialImportPreview");
    if (!box) return;
    box.classList.remove("hidden");
    if (!groups.length) {
      box.innerHTML = '<div class="empty">Nenhum APK foi reconhecido na release.</div>';
      return;
    }
    const label = source === "github" ? "API GitHub" : "lista local";
    box.innerHTML = groups.map((group) => `<div class="official-import-row"><b>${esc(group.rowName)}</b><small>ID: ${esc(group.id)} · ${group.lines.length} link(s) reconhecido(s)</small><small>${esc(group.lines[0] || "")}</small><span>${esc(label)}</span></div>`).join("");
  }

  async function importOfficialGithubLinks(options = {}) {
    const button = $("importOfficialGithubBtn");
    const status = $("officialImportStatus");
    const silent = Boolean(options.silent);
    if (!A?.ready || !A?.client) throw new Error("Configure a conexão do Supabase antes de importar.");
    if (button) button.disabled = true;
    if (status) status.textContent = options.auto ? "Atualizando automaticamente os links oficiais no Supabase..." : "Buscando arquivos oficiais no GitHub...";
    try {
      await fetchRows();
      state.definitions = await readHtmlDefinitions();
      const result = await fetchOfficialGithubAssets();
      const groups = groupOfficialAssets(result.assets);
      renderOfficialImportPreview(groups, result.source);
      if (!groups.length) throw new Error("Nenhum arquivo .apk foi reconhecido na release.");
      const rows = groups.map(rowForOfficialGroup);
      const { error } = await A.client.from("links_catalog").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      const clearedOld = await clearOldSupabaseDownloadLinks(rows.map((row) => row.id));
      const totalLinks = rows.reduce((sum, row) => sum + (Array.isArray(row.items) ? row.items.length : 0), 0);
      if (status) status.textContent = `Atualizado: ${rows.length} grupo(s), ${totalLinks} link(s). ${clearedOld ? clearedOld + " link(s) antigo(s) do Storage desativado(s). " : ""}Liberações, códigos, créditos e clientes não foram alterados.`;
      if (!silent) toast("Links oficiais do GitHub atualizados no Supabase.");
      await loadAll(false);
      renderOfficialImportPreview(groups, result.source);
      return { groups: rows.length, links: totalLinks, source: result.source };
    } finally {
      if (button) button.disabled = false;
    }
  }


  const MEDIA_GITHUB = {
    owner: "JoaoJMuniz19",
    repo: "JC-APK-TV-Midias",
    tag: "musicas-oficiais",
  };

  const MEDIA_FALLBACK_ASSETS = ["jc-mini-video.mp4"];

  function mediaAssetUrl(name) {
    return `https://github.com/${MEDIA_GITHUB.owner}/${MEDIA_GITHUB.repo}/releases/download/${MEDIA_GITHUB.tag}/${encodeURIComponent(name)}`;
  }

  function mediaCleanName(name) {
    return String(name || "")
      .replace(/\.(mp4|webm|mov|m4v|mp3|wav|ogg|m4a|flac|png|jpe?g|webp|gif)$/i, "")
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\bJc\b/i, "JC")
      .replace(/\bApk\b/i, "APK")
      .replace(/\bTv\b/i, "TV")
      .replace(/\bUnitv\b/i, "UniTV")
      .replace(/\bXplus\b/i, "XPLUS")
      .replace(/\bBtv\b/i, "BTV")
      .replace(/\bStv\b/i, "STV")
      .trim();
  }

  function mediaExtension(name) {
    const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
    return match ? match[1] : "";
  }

  function mediaKind(name) {
    const ext = mediaExtension(name);
    if (["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) return "audio";
    if (["mp4", "webm", "mov", "m4v"].includes(ext)) return "video";
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
    return "other";
  }

  function mediaLine(label, url) {
    return `${label} | ${url}`;
  }

  async function fetchMediaGithubAssets() {
    const apiUrl = `https://api.github.com/repos/${MEDIA_GITHUB.owner}/${MEDIA_GITHUB.repo}/releases/tags/${MEDIA_GITHUB.tag}`;
    try {
      const response = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`GitHub respondeu ${response.status}.`);
      const payload = await response.json();
      if (!Array.isArray(payload.assets)) throw new Error("Resposta do GitHub sem lista de assets.");
      return { source: "github", assets: payload.assets.map((asset) => ({ name: asset.name, browser_download_url: asset.browser_download_url })) };
    } catch (error) {
      console.warn("JC-APK: não foi possível ler a API das mídias; usando lista local.", error);
      return { source: "fallback", assets: MEDIA_FALLBACK_ASSETS.map((name) => ({ name, browser_download_url: mediaAssetUrl(name) })) };
    }
  }

  function classifySpecificMiniId(name) {
    const lower = String(name || "").toLowerCase();
    if (/revenda|revendedor|cr[eé]ditos/.test(lower)) return "revenda_creditos_video";
    if (/d[ií]gitos?.*massa|massa.*d[ií]gitos?|gerador.*lote|11.*16.*massa/.test(lower)) return "mini_tela_digitos_massa_video";
    if (/unitv|uni\s*tv/.test(lower)) return "mini_tela_unitv_video";
    if (/x\s*plus|xplus/.test(lower)) return "mini_tela_xplus_video";
    if (/\bbtv\b|btv\./.test(lower)) return "mini_tela_btv_video";
    if (/\bstv\b|stv\./.test(lower)) return "mini_tela_stv_video";
    if (/eaigo/.test(lower)) return "mini_tela_eaigo_video";
    return "";
  }

  function groupMediaAssets(assets) {
    const groups = new Map();
    const ensure = (id, rowName, groupName) => {
      if (!groups.has(id)) groups.set(id, { id, rowName, groupName, lines: [], sourceNames: [] });
      return groups.get(id);
    };
    const videos = [];
    for (const asset of assets || []) {
      const name = String(asset?.name || "").trim();
      if (!name) continue;
      const kind = mediaKind(name);
      if (kind === "other") continue;
      const url = String(asset?.browser_download_url || "").trim() || mediaAssetUrl(name);
      const lower = name.toLowerCase();
      const clean = mediaCleanName(name) || name;
      if (kind === "audio") {
        const target = /launcher|tv/.test(lower) ? "launcher_tv_musicas" : "musicas_oficiais";
        const rowName = target === "launcher_tv_musicas" ? "Launcher TV — músicas" : "Músicas oficiais";
        ensure(target, rowName, target === "launcher_tv_musicas" ? "Mídias / Launcher TV" : "Mídias / Mini Tela")
          .lines.push(mediaLine(clean, url));
        continue;
      }
      if (kind === "image") {
        if (/m[aã]o|mao|hand|jc|abrir|fechar|open|close/.test(lower)) {
          ensure("mini_tela_icone_mao", "Mini tela — mão/JC abrir e fechar", "Mídias / Mini Tela")
            .lines.push(mediaLine(clean, url));
        }
        continue;
      }
      if (kind === "video") {
        videos.push({ name, url, clean, lower });
        if (/launcher|tv\s*box|tela\s*tv|fundo|background/.test(lower) && !/mini/.test(lower)) {
          const launcherVideoId = /(?:^|[-_.\s])pro(?:[-_.\s]|$)/.test(lower) ? "launcher_pro_video" : "launcher_tv_video";
          const launcherVideoName = launcherVideoId === "launcher_pro_video" ? "Launcher Pro — vídeo demonstrativo" : "Launcher Lite — vídeo demonstrativo";
          ensure(launcherVideoId, launcherVideoName, "Mídias / Launcher TV")
            .lines.push(mediaLine(clean, url));
        }
        const specificId = classifySpecificMiniId(name);
        if (specificId) {
          const rowName = {
            mini_tela_unitv_video: "Mini tela UniTV — vídeo/tutorial",
            mini_tela_xplus_video: "Mini tela XPLUS — vídeo/tutorial",
            mini_tela_btv_video: "Mini tela BTV — vídeo/tutorial",
            mini_tela_stv_video: "Mini tela STV — vídeo/tutorial",
            mini_tela_eaigo_video: "Mini tela EAIGO — vídeo/tutorial",
            mini_tela_digitos_massa_video: "Mini tela Dígitos em Massa — vídeo/tutorial",
            revenda_creditos_video: "Revenda de Créditos — vídeo demonstrativo",
          }[specificId] || "Mini tela — vídeo/tutorial";
          ensure(specificId, rowName, "Mídias / Mini Tela").lines.push(mediaLine(clean, url));
        }
        if (/mini|m[ií]ni|tutorial|mao|m[aã]o|hand|jc/.test(lower)) {
          ensure("mini_tela_video_padrao", "Mini tela — vídeo padrão", "Mídias / Mini Tela")
            .lines.push(mediaLine(clean, url));
        }
      }
    }

    const defaultVideo = groups.get("mini_tela_video_padrao")?.lines?.[0]
      || videos.find((item) => /mini|tutorial|jc|m[aã]o|mao|hand/.test(item.lower)) && mediaLine(videos.find((item) => /mini|tutorial|jc|m[aã]o|mao|hand/.test(item.lower)).clean, videos.find((item) => /mini|tutorial|jc|m[aã]o|mao|hand/.test(item.lower)).url)
      || videos[0] && mediaLine(videos[0].clean, videos[0].url)
      || "";
    if (defaultVideo) {
      ensure("mini_tela_video_padrao", "Mini tela — vídeo padrão", "Mídias / Mini Tela");
      const ids = [
        ["mini_tela_unitv_video", "Mini tela UniTV — vídeo/tutorial"],
        ["mini_tela_xplus_video", "Mini tela XPLUS — vídeo/tutorial"],
        ["mini_tela_btv_video", "Mini tela BTV — vídeo/tutorial"],
        ["mini_tela_stv_video", "Mini tela STV — vídeo/tutorial"],
        ["mini_tela_eaigo_video", "Mini tela EAIGO — vídeo/tutorial"],
        ["mini_tela_digitos_massa_video", "Mini tela Dígitos em Massa — vídeo/tutorial"],
      ];
      for (const [id, rowName] of ids) {
        const group = ensure(id, rowName, "Mídias / Mini Tela");
        if (!group.lines.length) group.lines.push(defaultVideo);
      }
    }

    for (const group of groups.values()) group.lines = uniq(group.lines);
    return [...groups.values()].filter((group) => group.lines.length).sort((a, b) => {
      const da = definitionById(a.id)?.sort ?? 900;
      const db = definitionById(b.id)?.sort ?? 900;
      return da - db || a.rowName.localeCompare(b.rowName);
    });
  }

  function rowForMediaGroup(group) {
    const definition = definitionById(group.id) || { id: group.id, name: group.rowName, group: group.groupName, type: "link", sort: 900 };
    const old = rowById(group.id);
    return {
      id: group.id,
      group_id: old?.group_id || "external_media",
      group_name: definition.group || group.groupName || old?.group_name || "Mídias externas",
      name: definition.name || group.rowName || old?.name || group.id,
      kind: "link_group",
      value: null,
      items: group.lines || [],
      active: Boolean(group.lines?.length),
      sort_order: Number(old?.sort_order || definition.sort || 900),
    };
  }

  function renderMediaImportPreview(groups, source) {
    const box = $("mediaImportPreview");
    if (!box) return;
    box.classList.remove("hidden");
    if (!groups.length) {
      box.innerHTML = '<div class="empty">Nenhuma música, vídeo ou imagem compatível foi reconhecida na release.</div>';
      return;
    }
    const label = source === "github" ? "API GitHub" : "lista local";
    box.innerHTML = groups.map((group) => `<div class="official-import-row"><b>${esc(group.rowName)}</b><small>ID: ${esc(group.id)} · ${group.lines.length} item(ns)</small><small>${esc(group.lines[0] || "")}</small><span>${esc(label)}</span></div>`).join("");
  }

  async function importMediaGithubLinks(options = {}) {
    const button = $("importMediaGithubBtn");
    const status = $("mediaImportStatus");
    const silent = Boolean(options.silent);
    if (!A?.ready || !A?.client) throw new Error("Configure a conexão do Supabase antes de importar mídias.");
    if (button) button.disabled = true;
    if (status) status.textContent = options.auto ? "Atualizando mídias automaticamente pelo GitHub..." : "Buscando músicas e vídeos oficiais no GitHub...";
    try {
      await fetchRows();
      state.definitions = await readHtmlDefinitions();
      const result = await fetchMediaGithubAssets();
      const groups = groupMediaAssets(result.assets);
      renderMediaImportPreview(groups, result.source);
      if (!groups.length) throw new Error("Nenhum arquivo de mídia compatível foi reconhecido na release.");
      const rows = groups.map(rowForMediaGroup);
      const { error } = await A.client.from("links_catalog").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      const total = rows.reduce((sum, row) => sum + (Array.isArray(row.items) ? row.items.length : 0), 0);
      if (status) status.textContent = `Atualizado: ${rows.length} configuração(ões), ${total} link(s). Arquivos pesados continuam no GitHub; aqui ficou só a configuração dos links.`;
      if (!silent) toast("Links das mídias oficiais do GitHub atualizados.");
      await loadAll(false);
      renderMediaImportPreview(groups, result.source);
      return { groups: rows.length, items: total, source: result.source };
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function autoImportOfficialGithubLinks() {
    if (state.officialAutoImportDone) return;
    state.officialAutoImportDone = true;
    try {
      const result = await importOfficialGithubLinks({ auto: true, silent: true });
      const status = $("officialImportStatus");
      if (status && result) status.textContent = `Atualização automática concluída: ${result.groups} grupo(s), ${result.links} link(s). Liberações preservadas.`;
    } catch (error) {
      const status = $("officialImportStatus");
      if (status) status.textContent = "Atualização automática não concluída: " + (error.message || "erro desconhecido") + ". Use o botão Atualizar APKs do GitHub.";
      console.warn("JC-APK: importação automática dos links oficiais falhou.", error);
    }
  }

  async function autoImportMediaGithubLinks() {
    if (state.mediaAutoImportDone) return;
    state.mediaAutoImportDone = true;
    try {
      const result = await importMediaGithubLinks({ auto: true, silent: true });
      const status = $("mediaImportStatus");
      if (status && result) status.textContent = `Atualização automática das mídias concluída: ${result.groups} configuração(ões), ${result.items} item(ns).`;
    } catch (error) {
      const status = $("mediaImportStatus");
      if (status) status.textContent = "Mídias não atualizadas automaticamente. Use o botão Atualizar mídias agora.";
      console.warn("JC-APK: importação automática das mídias falhou.", error);
    }
  }

  async function autoImportBySelectedMode() {
    renderGithubUpdateMode();
    const mode = githubUpdateMode();
    if (mode === "manual") {
      if ($("officialImportStatus")) $("officialImportStatus").textContent = "Modo manual ativo: APKs serão atualizados somente pelo botão Atualizar APKs agora.";
      if ($("mediaImportStatus")) $("mediaImportStatus").textContent = "Modo manual ativo: mídias serão atualizadas somente pelo botão Atualizar mídias agora.";
      return;
    }
    if (mode === "apks" || mode === "all") await autoImportOfficialGithubLinks();
    if (mode === "media" || mode === "all") await autoImportMediaGithubLinks();
  }

  function summary(row, type) {
    const items = itemsOf(row);
    const testCount = type === "link" ? items.filter((item) => /(?:^|\s|[-_])(teste|test)(?:$|\s|[-_])/i.test(String(item).split("|")[0])).length : 0;
    return {
      count: items.length,
      preview: items[0] || "Configuração vazia",
      testCount,
      active: Boolean(row?.active && items.length),
    };
  }

  function tile(definition, row, context) {
    const info = summary(row, definition.type);
    const badge = !row ? "Nova" : info.active ? "Ativo" : "Inativo";
    const test = info.testCount ? `<span class="pill">${info.testCount} versão(ões) de teste</span>` : "";
    return `<article class="tile"><div class="tile-title"><h5>${esc(definition.name)}</h5><span class="tag">${badge}</span></div><div class="desc">ID: ${esc(definition.id)}<br>${esc(definition.group || "")}</div><div class="meta"><span class="pill">${info.count} item(ns)</span>${test}</div><div class="desc">${esc(info.preview)}</div><div class="tile-actions"><button class="btn blue" data-edit-standard="${esc(definition.id)}" data-context="${esc(context || definition.type)}">Editar configuração</button></div></article>`;
  }

  function isMediaDefinition(item) {
    const group = String(item?.group || "").toLowerCase();
    const id = String(item?.id || "");
    return group.includes("mídias") || group.includes("midias") || id.startsWith("mini_tela_") || id.startsWith("launcher_tv_") || id === "musicas_oficiais";
  }

  function isWhatsappTutorialDefinition(item) {
    return String(item?.group || "").toLowerCase() === "tutoriais do envio whatsapp"
      || String(item?.id || "").startsWith("tutorial_ativador_");
  }

  function renderAll() {
    const codeDefs = state.definitions.filter((item) => item.type === "code");
    const packageCodes = codeDefs.filter((item) => item.group === "Pacote de APK");
    const simpleCodes = codeDefs.filter((item) => item.group !== "Pacote de APK");
    const tutorialDefs = state.definitions.filter((item) => item.type === "link" && !HIDDEN_ADMIN_LINK_IDS.has(item.id) && isWhatsappTutorialDefinition(item));
    const mediaDefs = state.definitions.filter((item) => item.type === "link" && !HIDDEN_ADMIN_LINK_IDS.has(item.id) && isMediaDefinition(item));
    const linkDefs = state.definitions.filter((item) => item.type === "link" && !HIDDEN_ADMIN_LINK_IDS.has(item.id) && !isMediaDefinition(item) && !isWhatsappTutorialDefinition(item));

    $("simpleCodesGrid").innerHTML = simpleCodes.length ? simpleCodes.map((item) => tile(item, rowById(item.id), "code")).join("") : '<div class="empty">Nenhum gerador de código foi encontrado no HTML.</div>';
    $("extraCodesGrid").innerHTML = packageCodes.length ? packageCodes.map((item) => tile(item, rowById(item.id), "code")).join("") : '<div class="empty">Nenhum pacote APK foi encontrado no HTML.</div>';
    if ($("tutorialLinksGrid")) $("tutorialLinksGrid").innerHTML = tutorialDefs.length ? tutorialDefs.map((item) => tile(item, rowById(item.id), "link")).join("") : '<div class="empty">Nenhum tutorial foi configurado.</div>';
    $("downloadLinksGrid").innerHTML = linkDefs.length ? linkDefs.map((item) => tile(item, rowById(item.id), "link")).join("") : '<div class="empty">Nenhum botão de link foi encontrado no HTML.</div>';
    if ($("mediaLinksGrid")) $("mediaLinksGrid").innerHTML = mediaDefs.length ? mediaDefs.map((item) => tile(item, rowById(item.id), "link")).join("") : '<div class="empty">Nenhuma mídia foi configurada.</div>';

    const foundIds = new Set(state.definitions.map((item) => item.id));
    const historical = state.rows.filter((row) => isManagedRow(row) && !HIDDEN_ADMIN_LINK_IDS.has(String(row.id)) && !foundIds.has(String(row.id)));
    $("otherLinksGrid").innerHTML = historical.length ? historical.map((row) => tile({ id: row.id, name: row.name || row.id, group: "Removido do HTML", type: row.kind === "code_group" ? "code" : "link" }, row, row.kind === "code_group" ? "code" : "link")).join("") : '<div class="empty">Nenhuma configuração removida do HTML.</div>';

    document.querySelectorAll("[data-edit-standard]").forEach((button) => button.addEventListener("click", () => openEditor(button.dataset.editStandard, button.dataset.context)));
  }

  function editorText(context, id) {
    if (context === "code") {
      if (supportsNamedCodeOptions(id)) return {
        label: "Códigos ou opções — um por linha",
        placeholder: "8626721\n9531840\n\nou\n(VOD) | 8626721\n(LIVE) | 9531840",
        help: "Esta regra vale para todos os grupos de códigos atuais e futuros. Somente números usam rotação aleatória e exibem um código por clique. Use Nome | Código em todas as linhas para criar opções; uma opção vai direto e duas ou mais abrem o seletor.",
      };
      return {
        label: "Códigos — um por linha",
        placeholder: "1234567\n7654321",
        help: "Somente números. O sistema mostra um código por clique e alterna aleatoriamente entre os cadastrados.",
      };
    }
    return {
      label: "Opções — uma por linha",
      placeholder: "Nome ou versão | https://exemplo.com/arquivo.apk\nVersão teste | https://exemplo.com/teste.apk",
      help: "Uma opção abre diretamente. Duas ou mais abrem o seletor. Nomes contendo “teste” recebem o selo VERSÃO DE TESTE.",
    };
  }

  function openEditor(id, context) {
    const row = rowById(id);
    const definition = definitionById(id) || { id, name: row?.name || id, group: row?.group_name || "Histórico", type: context };
    const copy = editorText(context, id);
    $("editorId").value = id;
    $("editorKind").value = context;
    $("editorContext").value = state.definitions.some((item) => item.id === id) ? "standard" : "historical";
    $("editorTitle").textContent = definition.name;
    $("editorNameField").classList.add("hidden");
    $("editorModeField").classList.add("hidden");
    $("editorItems").value = itemsOf(row).join("\n");
    $("editorItems").placeholder = copy.placeholder;
    $("editorItemsLabel").textContent = copy.label;
    $("editorItemsHelp").textContent = copy.help;
    $("editorModeHelp").innerHTML = context === "link"
      ? "Todos os botões de download usam a mesma regra: <strong>1 opção abre direto; 2 ou mais abrem o seletor.</strong>"
      : supportsNamedCodeOptions(id)
        ? "<strong>Regra universal:</strong> sem |, os códigos entram em rotação aleatória. Com <strong>Nome | Código</strong>, uma opção vai direto e duas ou mais abrem o seletor. Vale para CONFIG download, Ativadores download, Extras e futuros grupos. Não misture formatos."
        : "Os códigos numéricos são mostrados um por clique, em rotação aleatória, sem abrir seletor.";
    $("editorActive").checked = row ? row.active !== false : false;
    $("deleteEditorBtn").classList.toggle("hidden", !row);
    showModal("editorModal");
  }

  async function saveEditor() {
    const id = $("editorId").value.trim();
    const context = $("editorKind").value;
    const definition = definitionById(id);
    const old = rowById(id);
    if (!id) throw new Error("Identificador inválido.");
    let items = uniq($("editorItems").value.split(/\r?\n/));
    if (context === "code") {
      const packageMode = supportsNamedCodeOptions(id);
      const labeledCount = items.filter((value) => value.includes("|")).length;
      if (packageMode && labeledCount > 0) {
        if (labeledCount !== items.length) {
          throw new Error("Não misture códigos simples com Nome | Código. Use um único formato nesta configuração.");
        }
        items = items.map((value) => {
          const separator = value.indexOf("|");
          const label = value.slice(0, separator).trim();
          const code = value.slice(separator + 1).trim();
          if (!label) throw new Error("Informe o nome antes de |. Exemplo: (VOD) | 8626721");
          if (!/^\d+$/.test(code)) throw new Error("Depois de | use somente o código numérico. Revise: " + value);
          return `${label} | ${code}`;
        });
      } else {
        const invalid = items.find((value) => !/^\d+$/.test(value));
        if (invalid) {
          const message = packageMode
            ? "Use somente números ou o formato Nome | Código em todas as linhas. Revise: "
            : "Os códigos aceitam somente números. Revise: ";
          throw new Error(message + invalid);
        }
      }
    } else {
      const invalid = items.find((value) => {
        const separator = value.indexOf("|");
        const url = separator >= 0 ? value.slice(separator + 1).trim() : value.trim();
        return !/^(https?:|intent:|market:|mailto:|tel:)/i.test(url);
      });
      if (invalid) throw new Error("Use o formato Nome ou versão | URL. Revise: " + invalid);
    }
    const active = $("editorActive").checked && items.length > 0;
    const row = {
      id,
      group_id: old?.group_id || (context === "code" ? "download_codes" : "html_buttons"),
      group_name: old?.group_name || definition?.group || (context === "code" ? "Códigos de download" : "Botões do HTML"),
      name: old?.name || definition?.name || id,
      kind: context === "code" ? "code_group" : "link_group",
      value: null,
      items,
      active,
      sort_order: Number(old?.sort_order || definition?.sort || 900),
    };
    const { error } = await A.client.from("links_catalog").upsert(row, { onConflict: "id" });
    if (error) throw error;
    closeModal("editorModal");
    toast(items.length ? "Configuração salva no Supabase." : "Configuração mantida vazia e inativa.");
    await loadAll(false);
  }

  async function deactivateEditor() {
    const id = $("editorId").value.trim();
    if (!id || !confirm("Desativar esta configuração sem apagar os dados salvos?")) return;
    const { error } = await A.client.from("links_catalog").update({ active: false }).eq("id", id);
    if (error) throw error;
    closeModal("editorModal");
    toast("Configuração desativada. Nenhum dado foi apagado.");
    await loadAll(false);
  }

  async function login(event) {
    event.preventDefault();
    $("loginMsg").textContent = "Entrando...";
    try {
      if (!A?.ready) throw new Error("Configure a conexão do Supabase em dados/supabase-config.js.");
      await A.login($("loginUser").value, $("loginPass").value);
      const access = await A.myAccess();
      if (access?.profile?.role !== "admin") throw new Error("Acesso exclusivo do administrador.");
      state.access = access;
      showApp();
      await loadAll(true);
      await autoImportBySelectedMode();
    } catch (error) {
      $("loginMsg").textContent = error.message || "Não foi possível entrar.";
    }
  }

  function showApp() {
    $("loginView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    $("logoutBtn").classList.remove("hidden");
    $("topStatus").textContent = "Administrador: " + (state.access?.profile?.full_name || state.access?.profile?.username || "ADM");
  }

  async function restore() {
    if (!A?.ready) return;
    const { data: { session } } = await A.client.auth.getSession();
    if (!session) return;
    try {
      const access = await A.myAccess();
      if (access?.profile?.role === "admin") {
        state.access = access;
        showApp();
        await loadAll(true);
        await autoImportBySelectedMode();
      }
    } catch (error) { console.warn(error); }
  }

  function paintConnection(text, ok) {
    const el = $("connectionStatus");
    el.classList.remove("hidden");
    el.textContent = text;
    el.style.borderColor = ok ? "rgba(43,211,145,.35)" : "rgba(255,101,120,.38)";
    el.style.background = ok ? "rgba(43,211,145,.09)" : "rgba(255,101,120,.09)";
    el.style.color = ok ? "#dcffed" : "#ffd5dc";
  }

  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.close)));
  document.querySelectorAll(".modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal.id); }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelectorAll(".modal.open").forEach((modal) => closeModal(modal.id)); });

  $("loginForm").addEventListener("submit", login);
  $("logoutBtn").addEventListener("click", async () => { await A.client.auth.signOut(); location.reload(); });
  $("testConnectionBtn").addEventListener("click", async () => {
    paintConnection("Testando conexão...", true);
    $("testConnectionBtn").disabled = true;
    try { const result = await A.testConnection(); paintConnection(`Conexão confirmada em ${result.elapsed} ms.`, true); }
    catch (error) { paintConnection(error.message || "Não foi possível conectar.", false); }
    finally { $("testConnectionBtn").disabled = false; }
  });
  $("saveEditorBtn").addEventListener("click", () => saveEditor().catch((error) => toast(error.message, "error")));
  $("deleteEditorBtn").addEventListener("click", () => deactivateEditor().catch((error) => toast(error.message, "error")));
  $("syncButtonsBtn").addEventListener("click", async () => {
    $("syncButtonsBtn").disabled = true;
    try {
      const result = await scanAndSync();
      renderAll();
      const suffix = result.emergency ? " A lista de emergência foi usada; nenhum item existente foi desativado." : " Botões removidos foram apenas desativados, sem apagar dados.";
      toast(`${result.found} configuração(ões) reconhecida(s), ${result.created} nova(s) vazia(s) e ${result.deactivated} desativada(s).${suffix}`);
    } catch (error) { toast(error.message, "error"); }
    finally { $("syncButtonsBtn").disabled = false; }
  });
  $("reloadBtn").addEventListener("click", () => loadAll(false).then(() => toast("Dados atualizados.")).catch((error) => toast(error.message, "error")));
  $("importOfficialGithubBtn")?.addEventListener("click", () => importOfficialGithubLinks().catch((error) => { if ($("officialImportStatus")) $("officialImportStatus").textContent = error.message || "Não foi possível importar."; toast(error.message || "Não foi possível importar os links.", "error"); }));
  $("importMediaGithubBtn")?.addEventListener("click", () => importMediaGithubLinks().catch((error) => { if ($("mediaImportStatus")) $("mediaImportStatus").textContent = error.message || "Não foi possível importar as mídias."; toast(error.message || "Não foi possível importar as mídias.", "error"); }));
  $("githubUpdateMode")?.addEventListener("change", renderGithubUpdateMode);
  $("saveGithubUpdateModeBtn")?.addEventListener("click", () => { const mode = setGithubUpdateMode($("githubUpdateMode")?.value || "manual"); toast("Modo de atualização salvo: " + githubUpdateModeLabel(mode) + "."); });
  $("saveMusicPlayerConfigBtn")?.addEventListener("click", () => saveMusicPlayerConfig().catch((error) => toast(error.message, "error")));
  $("saveLauncherDeliveryBtn")?.addEventListener("click", () => saveLauncherDelivery().catch((error) => { $("launcherDeliveryStatus").textContent = error.message || "Não foi possível salvar."; toast(error.message, "error"); }));
  $("musicSelectAllBtn")?.addEventListener("click", () => setAllMusicTracks(true));
  $("musicUnselectAllBtn")?.addEventListener("click", () => setAllMusicTracks(false));
  $("saveAccessDefaultBtn")?.addEventListener("click", () => saveAccessDefault().catch((error) => toast(error.message, "error")));
  $("manageAccessClientsBtn")?.addEventListener("click", openAccessClientManager);
  $("accessClientSearchBtn")?.addEventListener("click", searchAccessClients);
  $("accessClientSearch")?.addEventListener("input", () => {
    clearTimeout(state.accessHere.searchTimer);
    state.accessHere.searchTimer = setTimeout(searchAccessClients, 350);
  });
  $("accessClientSearch")?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); searchAccessClients(); } });
  $("accessClientMode")?.addEventListener("change", () => { $("accessClientLimit").disabled = $("accessClientMode").value !== "custom"; });
  $("accessSaveClientBtn")?.addEventListener("click", () => saveAccessClient().catch((error) => toast(error.message, "error")));
  $("accessRevertClientBtn")?.addEventListener("click", () => revertAccessClient().catch((error) => toast(error.message, "error")));

  $('newLauncherAppBtn')?.addEventListener('click',()=>openLauncherApp(null));
  $('saveLauncherAppBtn')?.addEventListener('click',()=>saveLauncherApp().catch(e=>toast(e.message,'error')));
  $('saveLauncherVersionBtn')?.addEventListener('click',()=>saveLauncherVersion().catch(e=>toast(e.message,'error')));
  $('syncLauncherCatalogBtn')?.addEventListener('click',()=>syncLauncherCatalog().catch(e=>toast(e.message,'error')));

  renderGithubUpdateMode();
  renderMusicPlayerConfig();

  // Recursos antigos de opções separadas deixam de criar linhas paralelas.
  $("newOtherLinkBtn")?.classList.add("hidden");
  $("newOptionBtn")?.classList.add("hidden");
  $("optionsModal")?.setAttribute("aria-hidden", "true");
  $("optionEditorModal")?.setAttribute("aria-hidden", "true");

  restore();
})();
