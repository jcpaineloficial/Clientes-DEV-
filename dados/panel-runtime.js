(function () {
  "use strict";

  const A = window.JC_APP;
  const UI = window.JC_GENERATOR_UI;
  const state = {
    context: null,
    links: new Map(),
    maintenance: new Map(),
    queues: new Map(),
    loading: null,
    ready: false,
    maintenanceReady: false,
  };

  const LINK_SCHEMES = /^(https?:|intent:|market:|mailto:|tel:)/i;
  const IMAGE_ONLY = /\.(?:png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function notify(message, type) {
    if (A?.toast) A.toast(message, type === "error" ? "error" : "ok");
    else window.alert(message);
  }

  function mode() {
    return String(state.context?.mode || window.JC_GENERATOR_CONTEXT?.mode || "").toLowerCase();
  }

  function isTest() {
    return mode() === "test";
  }

  function demoFunction(element, fallbackName) {
    const id = element?.dataset?.jcFunctionId || "";
    const functions = state.context?.functions || window.JC_GENERATOR_CONTEXT?.functions || [];
    return functions.find((item) => item.id === id) || {
      id,
      name: element?.dataset?.jcFunctionName || fallbackName || element?.textContent?.trim() || "Função demonstrativa",
      action_kind: element?.dataset?.jcActionKind || "link",
      demo_enabled: true,
    };
  }

  function showDemo(element, fallbackName, server) {
    const fn = demoFunction(element, fallbackName);
    if (server && window.JC_DEMO_RUNTIME?.showServer) window.JC_DEMO_RUNTIME.showServer(fn);
    else if (window.JC_DEMO_RUNTIME?.show) window.JC_DEMO_RUNTIME.show(fn, false);
    else notify("Demonstração visual: nenhum link, arquivo ou código real foi entregue.");
  }

  function normalizeItems(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw == null || raw === "") return [];
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [raw];
      } catch (_) {
        return raw.split(/\r?\n/).filter(Boolean);
      }
    }
    return [raw];
  }

  function parseLinkOption(raw, index) {
    let name = "";
    let url = "";
    if (raw && typeof raw === "object") {
      name = String(raw.name || raw.label || raw.version || "").trim();
      url = String(raw.url || raw.value || raw.link || "").trim();
    } else {
      const text = String(raw || "").trim();
      const separator = text.indexOf("|");
      if (separator >= 0) {
        name = text.slice(0, separator).trim();
        url = text.slice(separator + 1).trim();
      } else {
        url = text;
      }
    }
    if (!LINK_SCHEMES.test(url)) return null;
    if (!name) {
      if (IMAGE_ONLY.test(url)) return null;
      try {
        const decoded = decodeURIComponent(new URL(url, location.href).pathname.split("/").filter(Boolean).pop() || "");
        name = decoded.replace(/\.(apk|zip|config|properties)$/i, "") || "Opção " + (index + 1);
      } catch (_) {
        name = "Opção " + (index + 1);
      }
    }
    return {
      name,
      url,
      isTest: /(?:^|\s|[-_])(teste|test)(?:$|\s|[-_])/i.test(name),
    };
  }

  function rowLinkOptions(row) {
    if (!row || row.active === false) return [];
    const raw = [];
    if (String(row.value || "").trim()) raw.push({ name: row.name, url: row.value });
    raw.push(...normalizeItems(row.items));
    return raw.map(parseLinkOption).filter(Boolean);
  }

  function parseCodeOption(raw, index) {
    if (raw && typeof raw === "object") {
      const code = String(raw.code || raw.value || "").trim();
      const name = String(raw.name || raw.label || "").trim();
      return /^\d+$/.test(code) ? { name: name || "Código " + (index + 1), code, labeled: Boolean(name) } : null;
    }
    const text = String(raw || "").trim();
    if (!text) return null;
    const separator = text.indexOf("|");
    if (separator >= 0) {
      const name = text.slice(0, separator).trim() || "Código " + (index + 1);
      const code = text.slice(separator + 1).trim();
      return /^\d+$/.test(code) ? { name, code, labeled: true } : null;
    }
    return /^\d+$/.test(text) ? { name: "Código " + (index + 1), code: text, labeled: false } : null;
  }

  function rowCodeOptions(row) {
    if (!row || row.active === false) return [];
    const raw = [];
    if (String(row.value || "").trim()) raw.push(row.value);
    raw.push(...normalizeItems(row.items));
    return raw.map(parseCodeOption).filter(Boolean);
  }


  // JC-APK 13A-25 — Mini telas configuráveis.
  // Arquivo pesado fica no GitHub/servidor externo. O Supabase guarda só links/configuração em links_catalog.
  const MINI_GITHUB_DEFAULT_URL = "https://github.com/JoaoJMuniz19/JC-APK-TV-Midias/releases/download/musicas-oficiais/jc-mini-video.mp4";
  const MINI_GITHUB_DEFAULTS = {
    launcher_tv_video: "https://github.com/JoaoJMuniz19/JC-APK-TV-Midias/releases/download/musicas-oficiais/jc-launcher-demo.mp4",
    revenda_creditos_video: "https://github.com/JoaoJMuniz19/JC-APK-TV-Midias/releases/download/musicas-oficiais/jc-revenda-creditos-demo.mp4",
  };
  const SUPABASE_STORAGE_MEDIA = /supabase\.co\/storage\/v1\/object\//i;
  const MINI_MEDIA_IDS = [
    "mini_tela_video_padrao",
    "mini_tela_unitv_video",
    "mini_tela_btv_video",
    "mini_tela_stv_video",
    "mini_tela_xplus_video",
    "mini_tela_eaigo_video",
    "mini_tela_digitos_massa_video",
    "launcher_tv_video",
    "launcher_pro_video",
    "revenda_creditos_video",
  ];
  const VIDEO_MEDIA = /\.(?:mp4|webm|mov|m4v)(?:[?#].*)?$/i;
  const IMAGE_MEDIA = /\.(?:png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i;

  function parseMediaOption(raw, index) {
    let name = "";
    let url = "";
    if (raw && typeof raw === "object") {
      name = String(raw.name || raw.label || raw.version || "").trim();
      url = String(raw.url || raw.value || raw.link || "").trim();
    } else {
      const text = String(raw || "").trim();
      const separator = text.indexOf("|");
      if (separator >= 0) {
        name = text.slice(0, separator).trim();
        url = text.slice(separator + 1).trim();
      } else {
        url = text;
      }
    }
    if (!LINK_SCHEMES.test(url)) return null;
    // Regra oficial: mini telas não carregam arquivo pesado do Supabase Storage.
    // Se ainda existir um link antigo do Storage salvo, ignora e cai no GitHub padrão.
    if (SUPABASE_STORAGE_MEDIA.test(url)) return null;
    if (!VIDEO_MEDIA.test(url) && !IMAGE_MEDIA.test(url)) return null;
    if (!name) {
      try {
        name = decodeURIComponent(new URL(url, location.href).pathname.split("/").filter(Boolean).pop() || "") || "Mídia " + (index + 1);
      } catch (_) {
        name = "Mídia " + (index + 1);
      }
    }
    return { name, url, type: VIDEO_MEDIA.test(url) ? "video" : "image" };
  }

  function rowMediaOptions(row) {
    if (!row || row.active === false) return [];
    const raw = [];
    if (String(row.value || "").trim()) raw.push({ name: row.name, url: row.value });
    raw.push(...normalizeItems(row.items));
    return raw.map(parseMediaOption).filter(Boolean);
  }

  function ensureMiniMediaCss() {
    if (document.getElementById("jc_configurable_mini_media_css")) return;
    const style = document.createElement("style");
    style.id = "jc_configurable_mini_media_css";
    style.textContent = `
      html body #config_notice .config-pre-layout,
      html body #ativador11_notice .jc-reminder-layout,
      html body #ativador16_notice .jc-reminder-layout,
      html body #digits_mass_notice .jc-reminder-layout{display:grid!important;grid-template-columns:minmax(0,1fr) 150px!important;gap:16px!important;align-items:stretch!important;}
      html body #config_notice .mine-tv-demo,
      html body #ativador11_notice .jc-reminder-mini-screen,
      html body #ativador16_notice .jc-reminder-mini-screen,
      html body #digits_mass_notice .jc-reminder-mini-screen{display:block!important;width:150px!important;height:180px!important;margin:0!important;float:none!important;border-radius:16px!important;overflow:hidden!important;border:2px solid rgba(255,255,255,.25)!important;background:#111!important;align-self:center!important;box-sizing:border-box!important;}
      html body #config_notice .mine-tv-demo video,
      html body #config_notice .mine-tv-demo img,
      html body #ativador11_notice .jc-reminder-mini-screen video,
      html body #ativador11_notice .jc-reminder-mini-screen img,
      html body #ativador16_notice .jc-reminder-mini-screen video,
      html body #ativador16_notice .jc-reminder-mini-screen img,
      html body #digits_mass_notice .jc-reminder-mini-screen video,
      html body #digits_mass_notice .jc-reminder-mini-screen img,
      html body .pacote-apk-card .jc-package-media video,
      html body .pacote-apk-card .jc-package-media img{width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;background:#111!important;}
      @media(max-width:820px){
        html body #config_notice .config-pre-layout,
        html body #ativador11_notice .jc-reminder-layout,
        html body #ativador16_notice .jc-reminder-layout,
        html body #digits_mass_notice .jc-reminder-layout{grid-template-columns:1fr!important;gap:12px!important;}
        html body #config_notice .mine-tv-demo,
        html body #ativador11_notice .jc-reminder-mini-screen,
        html body #ativador16_notice .jc-reminder-mini-screen,
        html body #digits_mass_notice .jc-reminder-mini-screen{width:min(100%,280px)!important;height:155px!important;justify-self:center!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function renderMediaElement(container, media, alt) {
    if (!container || !media?.url) return;
    container.innerHTML = "";
    if (media.type === "video") {
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      video.setAttribute("aria-label", alt || media.name || "Vídeo");
      container.appendChild(video);
      const activate = () => {
        if (!video.src) video.src = media.url;
        video.preload = "metadata";
        video.play().catch(() => {});
      };
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            activate();
          }
        }, { rootMargin: "120px" });
        observer.observe(video);
      } else video.addEventListener("click", activate, { once: true });
    } else {
      const img = document.createElement("img");
      img.src = media.url;
      img.alt = alt || media.name || "Mídia";
      img.loading = "lazy";
      img.decoding = "async";
      container.appendChild(img);
    }
  }

  function firstMedia(map, id, fallbackId) {
    const own = map.get(id) || [];
    if (own.length) return own[0];
    if (MINI_GITHUB_DEFAULTS[id]) return { name: id, url: MINI_GITHUB_DEFAULTS[id], type: "video" };
    const fallback = map.get(fallbackId || "mini_tela_video_padrao") || [];
    return fallback[0] || { name: "JC mini vídeo padrão", url: MINI_GITHUB_DEFAULT_URL, type: "video" };
  }

  function ensureConfigMiniBox() {
    const layout = document.querySelector("#config_notice .config-pre-layout");
    if (!layout) return null;
    let box = layout.querySelector(".mine-tv-demo");
    if (!box) {
      box = document.createElement("div");
      box.className = "mine-tv-demo";
      box.setAttribute("aria-hidden", "true");
      layout.appendChild(box);
    }
    return box;
  }

  function ensureReminderMiniBox(noticeId) {
    const layout = document.querySelector(`#${noticeId} .jc-reminder-layout`);
    if (!layout) return null;
    let box = layout.querySelector(".jc-reminder-mini-screen");
    if (!box) {
      box = document.createElement("div");
      box.className = "jc-reminder-mini-screen";
      box.setAttribute("aria-hidden", "true");
      layout.appendChild(box);
    }
    return box;
  }

  function packageMediaBox(slug) {
    const count = document.getElementById("jc_package_count_" + slug);
    return count?.closest(".jc-package-notice")?.querySelector(".jc-package-media") || null;
  }

  function applyMediaRows(rows) {
    const map = new Map();
    (rows || []).forEach((row) => map.set(String(row.id || ""), rowMediaOptions(row)));
    ensureMiniMediaCss();

    const defaultMedia = firstMedia(map, "mini_tela_video_padrao");
    renderMediaElement(ensureConfigMiniBox(), defaultMedia, "Vídeo padrão da mini tela");
    renderMediaElement(ensureReminderMiniBox("ativador11_notice"), defaultMedia, "Vídeo do lembrete do Ativador 11");
    renderMediaElement(ensureReminderMiniBox("ativador16_notice"), defaultMedia, "Vídeo do lembrete do Ativador 16");
    renderMediaElement(ensureReminderMiniBox("digits_mass_notice"), firstMedia(map, "mini_tela_digitos_massa_video"), "Vídeo do gerador de dígitos em massa");

    const packageMap = {
      btv: "mini_tela_btv_video",
      stv: "mini_tela_stv_video",
      xplus: "mini_tela_xplus_video",
      eaigo: "mini_tela_eaigo_video",
    };
    Object.entries(packageMap).forEach(([slug, id]) => {
      renderMediaElement(packageMediaBox(slug), firstMedia(map, id), "Vídeo da mini tela " + slug.toUpperCase());
    });
    renderMediaElement(
      document.getElementById("jc_reseller_credit_media"),
      firstMedia(map, "revenda_creditos_video"),
      "Demonstração da Revenda de Créditos"
    );
    setupLauncherVideoSwitch(map);
  }

  function setupLauncherVideoSwitch(map) {
    const host = document.getElementById("jc_launcher_video_media");
    const buttons = Array.from(document.querySelectorAll("[data-jc-launcher-video]"));
    if (!host || !buttons.length) return;
    const media = {
      lite: firstMedia(map, "launcher_tv_video"),
      pro: (map.get("launcher_pro_video") || [])[0] || null,
    };
    const show = (edition) => {
      buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.jcLauncherVideo === edition));
      if (media[edition]?.url) renderMediaElement(host, media[edition], "Demonstração do JC Launcher " + edition.toUpperCase());
      else host.innerHTML = '<div class="jc-launcher-video-unavailable"><div><b>JC LAUNCHER PRO</b>Vídeo em desenvolvimento.<br><small>Assim que o vídeo Pro for configurado, ele aparecerá aqui.</small></div></div>';
    };
    buttons.forEach((button) => { button.onclick = () => show(button.dataset.jcLauncherVideo || "lite"); });
    show("lite");
  }

  let miniMediaLoadStarted = false;
  async function loadConfiguredMiniMedia() {
    if (miniMediaLoadStarted) return;
    miniMediaLoadStarted = true;
    if (isTest()) return;
    if (!A?.client) return;
    try {
      const { data, error } = await A.client
        .from("links_catalog")
        .select("id,name,value,items,active")
        .in("id", MINI_MEDIA_IDS)
        .eq("active", true);
      if (error) throw error;
      applyMediaRows(data || []);
    } catch (error) {
      console.warn("JC-APK: não foi possível carregar a configuração das mini telas; usando vídeo padrão do GitHub.", error);
      applyMediaRows([]);
    }
  }

  function ensureModal() {
    let modal = document.getElementById("jc_runtime_selector");
    if (modal) return modal;
    const style = document.createElement("style");
    style.id = "jc_runtime_selector_style";
    style.textContent = `
      #jc_runtime_selector{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.84);backdrop-filter:blur(8px)}
      #jc_runtime_selector.show{display:flex}#jc_runtime_selector .jc-rs-box{width:min(620px,96vw);max-height:90vh;overflow:auto;border-radius:24px;padding:22px;background:linear-gradient(155deg,#071c27,#06100f);border:1px solid rgba(73,255,173,.32);box-shadow:0 28px 90px rgba(0,0,0,.7);color:#fff;font-family:Arial,sans-serif}
      #jc_runtime_selector .jc-rs-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}#jc_runtime_selector h3{margin:0;color:#b8ffd8}#jc_runtime_selector p{margin:7px 0 0;color:#a9c4bb;line-height:1.45}
      #jc_runtime_selector .jc-rs-close{border:0;border-radius:10px;padding:9px 12px;background:#75303b;color:#fff;font-weight:800;cursor:pointer}#jc_runtime_selector .jc-rs-list{display:grid;gap:10px;margin-top:16px}
      #jc_runtime_selector .jc-rs-option{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;border-radius:15px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.055);color:#fff;text-align:left;font-weight:800;cursor:pointer}
      #jc_runtime_selector .jc-rs-option:hover{border-color:rgba(73,255,173,.55);transform:translateY(-1px)}#jc_runtime_selector .jc-rs-option.is-test{border-color:rgba(255,190,66,.72);background:linear-gradient(135deg,rgba(255,183,45,.17),rgba(116,57,0,.22))}
      #jc_runtime_selector .jc-rs-badge{display:inline-flex;margin-left:8px;padding:4px 7px;border-radius:999px;background:#ffb52e;color:#321b00;font-size:10px;font-weight:950;letter-spacing:.05em}#jc_runtime_selector .jc-rs-warning{display:none;margin-top:14px;padding:11px 13px;border-radius:12px;border:1px solid rgba(255,190,66,.42);background:rgba(255,183,45,.1);color:#ffe2a8;font-size:12px;line-height:1.5}#jc_runtime_selector.has-test .jc-rs-warning{display:block}
    `;
    document.head.appendChild(style);
    modal = document.createElement("div");
    modal.id = "jc_runtime_selector";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = '<div class="jc-rs-box" role="dialog" aria-modal="true"><div class="jc-rs-head"><div><h3 id="jc_rs_title">Escolha uma opção</h3><p id="jc_rs_subtitle"></p></div><button class="jc-rs-close" type="button" data-jc-action="close-selector">Fechar</button></div><div class="jc-rs-list" id="jc_rs_list"></div><div class="jc-rs-warning">⚠️ A opção marcada como <strong>VERSÃO DE TESTE</strong> é destinada somente a testes e pode ter limitações.</div></div>';
    document.body.appendChild(modal);
    return modal;
  }

  function closeSelector() {
    const modal = document.getElementById("jc_runtime_selector");
    if (!modal) return;
    modal.classList.remove("show", "has-test");
    modal.setAttribute("aria-hidden", "true");
    modal._jcOptions = [];
    modal._jcResolver = null;
  }

  function chooseOption(title, subtitle, options, kind) {
    return new Promise((resolve) => {
      const modal = ensureModal();
      modal._jcOptions = options;
      modal._jcResolver = resolve;
      document.getElementById("jc_rs_title").textContent = title || "Escolha uma opção";
      document.getElementById("jc_rs_subtitle").textContent = subtitle || "Selecione uma das opções configuradas.";
      const list = document.getElementById("jc_rs_list");
      list.innerHTML = options.map((option, index) => {
        const badge = option.isTest ? '<span class="jc-rs-badge">VERSÃO DE TESTE</span>' : "";
        return `<button type="button" class="jc-rs-option ${option.isTest ? "is-test" : ""}" data-jc-action="select-runtime-option" data-jc-option-index="${index}"><span>${esc(option.name)}${badge}</span><span>${kind === "code" ? "USAR" : "ABRIR"} ›</span></button>`;
      }).join("");
      modal.classList.toggle("has-test", options.some((option) => option.isTest));
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
    });
  }

  function closeReservedWindow(element) {
    const reserved = element?._jcCreditWindow;
    if (element) delete element._jcCreditWindow;
    try { if (reserved && !reserved.closed) reserved.close(); } catch (_) {}
  }

  async function openUrl(url, element) {
    const raw = String(url || "").trim();
    if (!LINK_SCHEMES.test(raw)) {
      closeReservedWindow(element);
      throw new Error("O endereço configurado é inválido.");
    }
    const reserved = element?._jcCreditWindow;
    if (element) delete element._jcCreditWindow;
    if (reserved && !reserved.closed) {
      reserved.opener = null;
      reserved.location.replace(raw);
      return;
    }
    const win = window.open(raw, "_blank", "noopener,noreferrer");
    if (win) win.opener = null;
    else window.location.assign(raw);
  }

  async function openConfiguredLink(linkId, element) {
    if (isTest()) {
      showDemo(element, element?.dataset?.jcLinkName || "Download demonstrativo", true);
      return;
    }
    await loadCatalog();
    const row = state.links.get(String(linkId || ""));
    const options = rowLinkOptions(row);
    if (!options.length) {
      closeReservedWindow(element);
      notify("Este botão ainda não possui link configurado no Supabase.", "error");
      return;
    }
    let option = options[0];
    if (options.length > 1) {
      option = await chooseOption(row?.name || element?.dataset?.jcLinkName || "Escolha uma opção", "Há mais de uma opção configurada para este botão.", options, "link");
      if (!option) { closeReservedWindow(element); return; }
    }
    await openUrl(option.url, element);
  }

  function demoCode(length) {
    const size = Math.max(7, Number(length) || 7);
    return Array.from({ length: size }, (_, index) => (index === 1 || index === 4 ? "X" : Math.floor(Math.random() * 10))).join("");
  }

  function nextQueuedCode(groupId, options) {
    const key = String(groupId || "codes");
    let queue = state.queues.get(key) || [];
    if (!queue.length) queue = options.map((_, index) => index).sort(() => Math.random() - 0.5);
    const index = queue.shift();
    state.queues.set(key, queue);
    return options[index] || options[0];
  }

  async function generateCode(groupId, targetId, statusId, element, allowNamedSelector = true) {
    if (isTest()) {
      const code = demoCode(7);
      UI?.setCode(targetId, code);
      UI?.setStatus(statusId, "Código fictício gerado para demonstração. Nenhum código real foi reservado.", true);
      return;
    }
    await loadCatalog();
    const row = state.links.get(groupId);
    const options = rowCodeOptions(row);
    if (!options.length) {
      UI?.setCode(targetId, "");
      UI?.setStatus(statusId, "Nenhum código foi cadastrado no Supabase para esta função.", false);
      return;
    }

    const hasNamed = options.some((option) => option.labeled);
    const hasSimple = options.some((option) => !option.labeled);
    if (allowNamedSelector && hasNamed && hasSimple) {
      UI?.setCode(targetId, "");
      UI?.setStatus(statusId, "Configuração inválida: não misture códigos simples com Nome | Código.", false);
      return;
    }

    let option;
    if (allowNamedSelector && hasNamed) {
      option = options[0];
      if (options.length > 1) {
        option = await chooseOption(
          row?.name || element?.dataset?.jcFunctionName || "Escolha o código",
          "Selecione a opção desejada.",
          options,
          "code"
        );
        if (!option) return;
      }
      UI?.setStatus(statusId, options.length > 1 ? `Opção ${option.name} selecionada.` : `Código ${option.name} carregado do Supabase.`, true);
    } else {
      option = nextQueuedCode(groupId, options);
      UI?.setStatus(statusId, options.length > 1 ? "Um código foi escolhido pela rotação aleatória configurada no Supabase." : "Código carregado do Supabase.", true);
    }

    UI?.setCode(targetId, option.code);
    document.dispatchEvent(new CustomEvent("jc:download-code-generated", { detail: { group_id: groupId, label: option.name, selector: Boolean(allowNamedSelector && hasNamed) } }));
  }

  async function copyCode(targetId, statusId, button) {
    try {
      await UI.copyText(UI.getCode(targetId), button);
      UI.setStatus(statusId, "Código copiado com sucesso.", true);
    } catch (error) {
      UI.setStatus(statusId, error.message || "Não foi possível copiar.", false);
    }
  }

  function configGroupFor(element) {
    return element.dataset.jcCodeGroup || "";
  }

  function packageIds(slug) {
    return {
      group: slug + "_download_codes",
      target: "jc_package_code_" + slug,
      status: "jc_package_status_" + slug,
    };
  }

  function shaHex(text) {
    if (!crypto?.subtle) return Promise.reject(new Error("O navegador não oferece SHA-256 seguro."));
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then((buffer) => Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join(""));
  }

  function randomOctet() {
    const chars = "0123456789EADFCB";
    return chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
  }

  async function generateConfigPreview() {
    const input = document.getElementById("mac_input");
    const suffix = String(input?.value || "").trim().toUpperCase();
    if (suffix && !/^[0-9EADFCB]{2}:[0-9EADFCB]{2}$/.test(suffix)) {
      const status = document.getElementById("status_bar");
      if (status) status.className = "status-bar error visible";
      if (document.getElementById("status_icon")) document.getElementById("status_icon").textContent = "✖";
      if (document.getElementById("status_msg")) document.getElementById("status_msg").textContent = "Formato inválido. Use XX:XX com números ou letras E, A, D, F, C e B.";
      return;
    }
    const middle = suffix ? suffix.split(":") : [randomOctet(), randomOctet()];
    const mac = `9C:00:D3:${middle[0]}:${middle[1]}:${randomOctet()}`;
    try {
      const hash = await shaHex(mac);
      const parts = mac.split(":");
      const masked = `${parts[0]}:${parts[1]}:${parts[2]}:XX:X${parts[4].slice(-1)}:${parts[5]}`;
      const content = document.getElementById("preview_content");
      const box = document.getElementById("preview_box");
      if (content) content.innerHTML = `<span class="hl">MAC Oculta:</span> ${esc(masked)}\n\n#personal info\n#${esc(new Date().toString())}\nkey_device_id_unitvfree=${hash}\nkey_sn_token_unitvfree=${hash}`;
      if (box) box.classList.add("preview-config-bg", "visible");
      const status = document.getElementById("status_bar");
      if (status) status.className = "status-bar success visible";
      if (document.getElementById("status_icon")) document.getElementById("status_icon").textContent = "✔";
      if (document.getElementById("status_msg")) document.getElementById("status_msg").textContent = "1 combinação de .config gerada com sucesso.";
    } catch (error) {
      notify(error.message || "Falha ao gerar a pré-visualização.", "error");
    }
  }

  function normalizeMaintenance(data) {
    const rows = Array.isArray(data) ? data : Array.isArray(data?.buttons) ? data.buttons : [];
    return rows.map((row) => ({
      id: String(row.id || row.function_id || ""),
      name: String(row.name || row.function_name || "Função"),
      status: String(row.status || row.panel_status || "active"),
      message: String(row.message || row.maintenance_message || "Esta função está temporariamente em manutenção."),
    })).filter((row) => row.id);
  }

  async function loadMaintenance(force) {
    if (state.maintenanceReady && !force) return;
    if (!A?.client) return;
    try {
      const { data, error } = await A.client.rpc("get_panel_button_statuses");
      if (error) throw error;
      state.maintenance = new Map(normalizeMaintenance(data).map((row) => [row.id, row]));
      state.maintenanceReady = true;
    } catch (error) {
      state.maintenanceReady = true;
      console.warn("JC-APK: não foi possível carregar os estados de manutenção.", error);
    }
  }

  function showMaintenance(row) {
    let modal = document.getElementById("jc_runtime_maintenance");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "jc_runtime_maintenance";
      modal.style.cssText = "position:fixed;inset:0;z-index:2147483645;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.82)";
      modal.innerHTML = '<div style="width:min(460px,94vw);padding:24px;border-radius:22px;background:#111b20;border:1px solid rgba(255,184,73,.42);color:#fff;text-align:center;font-family:Arial,sans-serif"><div style="font-size:34px">🛠️</div><h3 id="jc_rm_title" style="color:#ffd28b"></h3><p id="jc_rm_message" style="line-height:1.6;color:#c7d1d5"></p><button type="button" data-jc-action="close-maintenance" style="border:0;border-radius:10px;padding:11px 18px;background:#ffb84d;color:#281700;font-weight:900;cursor:pointer">Entendi</button></div>';
      document.body.appendChild(modal);
    }
    document.getElementById("jc_rm_title").textContent = row.name + " — em manutenção";
    document.getElementById("jc_rm_message").textContent = row.message;
    modal.style.display = "flex";
  }

  async function loadCatalog(force) {
    if (isTest()) {
      state.links.clear();
      state.ready = true;
      return;
    }
    if (state.ready && !force) return;
    if (state.loading && !force) return state.loading;
    if (!A?.client) throw new Error("Supabase não está disponível.");
    state.loading = (async () => {
      const { data, error } = await A.client.from("links_catalog").select("id,group_id,group_name,name,kind,value,items,active,sort_order").eq("active", true).order("sort_order", { ascending: true });
      if (error) throw error;
      state.links = new Map((data || []).map((row) => [String(row.id), row]));
      state.ready = true;
    })().finally(() => { state.loading = null; });
    return state.loading;
  }

  function checkMaintenance(element) {
    const id = element?.dataset?.jcFunctionId;
    const row = id ? state.maintenance.get(id) : null;
    if (row?.status === "maintenance") {
      showMaintenance(row);
      return true;
    }
    return false;
  }

  function shouldCheckMaintenance(action) {
    return ["open-link", "generate-code", "generate-package-code", "generate-activation"].includes(String(action || ""));
  }

  async function handleAction(element, event) {
    const action = element.dataset.jcAction;
    if (!action) return;
    if (shouldCheckMaintenance(action)) await loadMaintenance(false);
    if (action !== "close-selector" && action !== "select-runtime-option" && action !== "close-maintenance" && checkMaintenance(element)) return;

    switch (action) {
      case "login":
        await window.validarLogin?.();
        break;
      case "toggle-activation-menu":
        UI.toggleActivationMenu();
        break;
      case "toggle-package-menu":
        UI.togglePackageMenu();
        break;
      case "open-config":
        UI.openConfig();
        break;
      case "open-activator":
        UI.openActivator(element.dataset.jcActivatorType);
        break;
      case "open-trial":
        UI.openTrial();
        break;
      case "open-vip":
        UI.openVip();
        break;
      case "open-digits-mass":
        UI.openDigitsMass();
        break;
      case "open-package":
        UI.openPackage(element.dataset.jcPackage);
        break;
      case "open-link":
        await openConfiguredLink(element.dataset.jcLinkId, element);
        break;
      case "open-unitv-codes":
        UI.openUnitvCodes();
        break;
      case "close-unitv-codes":
        UI.closeUnitvCodes();
        break;
      case "generate-activation":
        if (!window.JC_ACTIVATION_CODES?.generate) throw new Error("O gerador de ativação ainda não foi preparado.");
        await window.JC_ACTIVATION_CODES.generate(element.dataset.jcActivatorType);
        break;
      case "generate-code":
        await generateCode(configGroupFor(element), element.dataset.jcTargetId, element.dataset.jcStatusId, element, true);
        break;
      case "generate-package-code": {
        const ids = packageIds(element.dataset.jcPackage);
        await generateCode(ids.group, ids.target, ids.status, element, true);
        break;
      }
      case "copy-code":
        await copyCode(element.dataset.jcTargetId, element.dataset.jcStatusId, element);
        break;
      case "copy-package-code": {
        const ids = packageIds(element.dataset.jcPackage);
        await copyCode(ids.target, ids.status, element);
        break;
      }
      case "reset-activation":
        UI.resetPanel(element.dataset.jcActivatorType);
        break;
      case "toggle-tutorial":
        UI.toggleTutorial(element);
        break;
      case "clear-counters":
        UI.clearCounters();
        break;
      case "copy-unitv-code":
        await UI.copyText(element.dataset.copyCode || element.closest(".jc-unitv-copy-line,.jc-unitv-code-row")?.querySelector(".jc-unitv-copy-value")?.textContent || "", element);
        break;
      case "close-selector": {
        const modal = document.getElementById("jc_runtime_selector");
        modal?._jcResolver?.(null);
        closeSelector();
        break;
      }
      case "select-runtime-option": {
        const modal = document.getElementById("jc_runtime_selector");
        const option = modal?._jcOptions?.[Number(element.dataset.jcOptionIndex)];
        modal?._jcResolver?.(option || null);
        closeSelector();
        break;
      }
      case "close-maintenance":
        document.getElementById("jc_runtime_maintenance").style.display = "none";
        break;
      default:
        break;
    }
  }

  document.addEventListener("click", (event) => {
    const element = event.target.closest?.("[data-jc-action]");
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    Promise.resolve(handleAction(element, event)).catch((error) => {
      console.error("JC-APK runtime:", error);
      notify(error.message || "Não foi possível concluir esta ação.", "error");
    });
  }, false);

  document.addEventListener("jc:config-preview-ready", () => { generateConfigPreview(); });
  document.addEventListener("jc:access-ready", (event) => {
    // Economia máxima de Supabase: ao confirmar o usuário, o index não carrega
    // catálogo, manutenção nem links automaticamente. Esses dados só são buscados
    // quando o usuário executa uma ação real: gerar código, Acesse Aqui ou download.
    // Minivídeos e sua configuração são carregados sob demanda quando o usuário
    // abre um card relacionado. Os arquivos pesados continuam no GitHub Releases.
    state.context = event.detail || window.JC_GENERATOR_CONTEXT || {};
    state.ready = false;
    state.maintenanceReady = false;
    state.links.clear();
    state.maintenance.clear();
  });
  document.addEventListener("jc:main-section-open", () => loadConfiguredMiniMedia());
  document.addEventListener("click", (event) => {
    if (event.target.closest('[data-jc-action="open-config"],[data-jc-action="open-activator"],[data-jc-action="open-trial"],[data-jc-action="open-vip"],[data-jc-action="open-digits-mass"],[data-jc-action="open-package"],#jcboxdemo_toggle,#jc_reseller_credit_toggle')) loadConfiguredMiniMedia();
  }, { passive: true });
  function observeShowcaseMedia() {
    const targets = [document.getElementById("jc_launcher_video_media"), document.getElementById("jc_reseller_credit_media")].filter(Boolean);
    if (!targets.length) return;
    if (!("IntersectionObserver" in window)) return void loadConfiguredMiniMedia();
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadConfiguredMiniMedia();
    }, { rootMargin: "500px 0px" });
    targets.forEach((target) => observer.observe(target));
  }
  document.addEventListener("jc:access-ready", observeShowcaseMedia, { once: true });

  window.JC_PANEL_RUNTIME = {
    load: () => loadCatalog(true),
    reload: () => Promise.all([loadCatalog(true), loadMaintenance(true)]),
    openLink: openConfiguredLink,
    generateCode: (groupId,targetId,statusId,element,allowNamedSelector=true) => generateCode(groupId,targetId,statusId,element,allowNamedSelector),
    getLink: (id) => state.links.get(id) || null,
    isMaintenance: (id) => state.maintenance.get(String(id || ""))?.status === "maintenance",
  };
})();
