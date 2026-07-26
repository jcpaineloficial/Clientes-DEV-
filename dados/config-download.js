/* JC-APK TV — Acesse Aqui 13D
   Histórico detalhado, escolha ADM/cliente, limite diário e aviso de renomeação. */
(function () {
  "use strict";

  const A = window.JC_APP;
  let busy = false;
  let captureBound = false;
  let pickerResolver = null;
  let pickerClients = [];

  function app() {
    if (!A?.client) throw new Error("A conexão com o Supabase ainda não foi preparada.");
    return A;
  }

  function currentMode() {
    const contextMode = String(window.JC_GENERATOR_CONTEXT?.mode || "").toLowerCase();
    if (contextMode) return contextMode;
    try {
      const stored = String(sessionStorage.getItem("jc_apk_tipo_usuario") || "").toLowerCase();
      return stored === "teste" ? "test" : stored;
    } catch (_) {
      return "";
    }
  }

  function isAdminMode() {
    return currentMode() === "admin" || window.JC_GENERATOR_CONTEXT?.profile?.role === "admin";
  }

  function isTestMode() {
    return currentMode() === "test" || currentMode() === "teste";
  }

  function randomId() {
    return window.crypto?.randomUUID?.()
      || (Date.now().toString(36) + Math.random().toString(36).slice(2));
  }

  function deviceKey() {
    const storageKey = "jc_apk_config_device_key";
    try {
      let value = localStorage.getItem(storageKey);
      if (!value) {
        value = "web-" + randomId();
        localStorage.setItem(storageKey, value);
      }
      return value;
    } catch (_) {
      return "web-session-" + randomId();
    }
  }

  function requestKey() {
    return "acesso-aqui-" + randomId();
  }

  async function invoke(body) {
    const result = await app().client.functions.invoke("jc-download", { body });
    if (result.error) {
      let message = result.error?.message || "A função jc-download recusou a solicitação.";
      try {
        const context = result.error?.context;
        if (context && typeof context.json === "function") {
          const payload = await context.clone().json();
          message = payload?.error || message;
        } else if (context?.json?.error) message = context.json.error;
      } catch (_) {}
      throw new Error(message);
    }
    if (!result.data || result.data.ok !== true) {
      throw new Error(result.data?.error || "Não foi possível preparar o arquivo.");
    }
    return result.data;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[char]));
  }

  function browserInfo() {
    const ua = String(navigator.userAgent || "");
    let platform = "Dispositivo";
    let browser = "Navegador";

    if (/iPhone/i.test(ua)) platform = "iPhone";
    else if (/iPad/i.test(ua)) platform = "iPad";
    else if (/Android/i.test(ua)) {
      const model = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|;|\))/i)?.[1]?.trim();
      platform = model && !/^(wv|en-us|pt-br)$/i.test(model) ? `Android — ${model}` : "Celular/Tablet Android";
    } else if (/Windows/i.test(ua)) platform = "PC Windows";
    else if (/Macintosh|Mac OS X/i.test(ua)) platform = "Mac";
    else if (/CrOS/i.test(ua)) platform = "Chromebook";
    else if (/Linux/i.test(ua)) platform = "PC Linux";

    if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
    else if (/SamsungBrowser\//i.test(ua)) browser = "Samsung Internet";
    else if (/OPR\//i.test(ua)) browser = "Opera";
    else if (/CriOS\//i.test(ua)) browser = "Chrome";
    else if (/FxiOS\//i.test(ua)) browser = "Firefox";
    else if (/Firefox\//i.test(ua)) browser = "Firefox";
    else if (/Chrome\//i.test(ua)) browser = "Chrome";
    else if (/Safari\//i.test(ua)) browser = "Safari";

    return {
      device_label: `${platform} / ${browser}`,
      platform_label: platform,
      browser_label: browser,
      user_agent: ua.slice(0, 1000),
    };
  }

  function closeDestinationPicker(value) {
    const modal = document.getElementById("jc_config_destination_picker");
    if (modal) modal.classList.remove("show");
    const resolver = pickerResolver;
    pickerResolver = null;
    if (typeof resolver === "function") resolver(value || null);
  }

  function clientSearchText(client) {
    return [
      client?.display_name,
      client?.full_name,
      client?.username,
      client?.email,
      client?.whatsapp,
      client?.whatsapp2,
      client?.whatsapp3,
    ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
  }

  function clientUsageText(client) {
    if (client?.unlimited) return "Sem limite diário";
    const used = Number(client?.used_today || 0);
    const limit = Number(client?.effective_limit || 20);
    return `${used} de ${limit} hoje`;
  }

  function renderDestinationClients(term = "") {
    const list = document.getElementById("jc_config_client_list");
    if (!list) return;

    const query = String(term || "").trim().toLocaleLowerCase("pt-BR");
    const showDirect = "venda direta meu suporte jc apk tv adm".includes(query);
    const clients = pickerClients.filter((client) => !query || clientSearchText(client).includes(query));
    list.innerHTML = "";

    if (showDirect) {
      const directButton = document.createElement("button");
      directButton.type = "button";
      directButton.className = "jc-config-client-option jc-direct-sale";
      directButton.innerHTML = `<strong>🏠 Venda direta JC APK TV — Meu suporte</strong><span>Baixa como ADM, não contabiliza no limite diário e não consome a CONFIG.</span>`;
      directButton.onclick = () => closeDestinationPicker({
        download_mode: "admin",
        target_client_id: null,
        target_name: "Venda direta JC APK TV",
      });
      list.appendChild(directButton);
    }

    clients.forEach((client) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "jc-config-client-option";
      button.innerHTML = `<strong>${escapeHtml(client.display_name || client.full_name || client.username || "Cliente")}</strong><span>@${escapeHtml(client.username || "")} · ${escapeHtml(client.email || client.whatsapp || "")} · ${escapeHtml(clientUsageText(client))}</span>`;
      button.onclick = () => closeDestinationPicker({
        download_mode: "client",
        target_client_id: client.id,
        target_name: client.display_name || client.full_name || client.username || "Cliente",
      });
      list.appendChild(button);
    });

    if (!showDirect && !clients.length) {
      list.innerHTML = '<div class="jc-config-client-loading">Nenhum responsável encontrado.</div>';
    }
  }

  function ensureDestinationPicker() {
    let modal = document.getElementById("jc_config_destination_picker");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "jc_config_destination_picker";
    modal.innerHTML = `
      <div class="jc-config-client-box" role="dialog" aria-modal="true" aria-labelledby="jc_config_destination_title">
        <div class="jc-config-client-head">
          <div>
            <h3 id="jc_config_destination_title">Escolha o responsável pelo download</h3>
            <p>Venda direta baixa como ADM. Para cliente, escolha o responsável pelo arquivo.</p>
          </div>
          <button type="button" id="jc_config_destination_close" aria-label="Fechar">×</button>
        </div>
        <input id="jc_config_client_search" type="search" autocomplete="off" placeholder="Buscar venda direta, nome, usuário, e-mail ou WhatsApp">
        <div id="jc_config_client_list" class="jc-config-client-list"></div>
      </div>`;
    document.body.appendChild(modal);

    if (!document.getElementById("jc_config_destination_styles")) {
      const style = document.createElement("style");
      style.id = "jc_config_destination_styles";
      style.textContent = `
        #jc_config_destination_picker{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(8px)}
        #jc_config_destination_picker.show{display:flex}
        .jc-config-client-box{width:min(660px,96vw);max-height:86vh;overflow:auto;border-radius:24px;padding:20px;background:linear-gradient(145deg,#071522,#02070d);border:1px solid rgba(67,177,255,.35);box-shadow:0 28px 90px rgba(0,0,0,.65);color:#fff;font-family:Arial,sans-serif}
        .jc-config-client-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
        .jc-config-client-head h3{margin:0;font-size:23px}
        .jc-config-client-head p{margin:6px 0 0;color:#9db2bd;line-height:1.45}
        .jc-config-client-head button{width:42px;height:42px;border:0;border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-size:24px;cursor:pointer}
        #jc_config_client_search{width:100%;box-sizing:border-box;margin:16px 0 12px;padding:13px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.16);background:#07101b;color:#fff;font-size:15px}
        .jc-config-client-list{display:grid;gap:9px}
        .jc-config-client-option{display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:13px 14px;border-radius:14px;border:1px solid rgba(62,175,255,.28);background:rgba(21,83,153,.34);color:#fff;text-align:left;cursor:pointer}
        .jc-config-client-option:hover{background:rgba(31,111,205,.5)}
        .jc-config-client-option.jc-direct-sale{border-color:rgba(54,225,141,.62);background:linear-gradient(135deg,rgba(18,125,74,.52),rgba(13,74,117,.46));box-shadow:inset 0 0 0 1px rgba(54,225,141,.12)}
        .jc-config-client-option.jc-direct-sale:hover{background:linear-gradient(135deg,rgba(24,159,92,.62),rgba(20,99,151,.56))}
        .jc-config-client-option strong{font-size:15px}
        .jc-config-client-option span,.jc-config-client-loading{font-size:12px;color:#a9bdc9}
        .jc-config-client-option.jc-direct-sale span{color:#bfffe0}
        .jc-config-client-loading{padding:18px;text-align:center}`;
      document.head.appendChild(style);
    }

    document.getElementById("jc_config_destination_close").onclick = () => closeDestinationPicker(null);
    modal.onclick = (event) => { if (event.target === modal) closeDestinationPicker(null); };
    document.getElementById("jc_config_client_search").addEventListener("input", (event) => {
      renderDestinationClients(event.target.value);
    });
    return modal;
  }

  async function chooseDestination() {
    if (!isAdminMode()) {
      return { download_mode: "client", target_client_id: null, target_name: "Minha conta" };
    }

    const modal = ensureDestinationPicker();
    const list = document.getElementById("jc_config_client_list");
    const search = document.getElementById("jc_config_client_search");
    pickerClients = [];
    search.value = "";
    list.innerHTML = '<div class="jc-config-client-loading">Carregando clientes...</div>';
    modal.classList.add("show");
    const selection = new Promise((resolve) => { pickerResolver = resolve; });

    try {
      const data = await invoke({ action: "admin_search_clients", search: "" });
      pickerClients = Array.isArray(data.clients) ? data.clients : [];
      if (modal.classList.contains("show")) {
        renderDestinationClients("");
        window.setTimeout(() => { try { search.focus({preventScroll:true}); } catch (_) { search.focus(); } }, 80);
      }
    } catch (error) {
      modal.classList.remove("show");
      const resolver = pickerResolver;
      pickerResolver = null;
      if (typeof resolver === "function") resolver(null);
      throw error;
    }

    return await selection;
  }

  function buttonTitle(button) {
    return button?.querySelector?.(".btn-title") || null;
  }

  function setButtonBusy(button, value) {
    if (!button) return;
    button.disabled = value;
    button.setAttribute("aria-busy", value ? "true" : "false");
    const title = buttonTitle(button);
    if (value) {
      button.dataset.jcOriginalTitle = title?.textContent || button.textContent?.trim() || "Acesse Aqui";
      if (title) title.textContent = "Preparando .config...";
      button.classList.add("is-loading");
    } else {
      if (title && button.dataset.jcOriginalTitle) title.textContent = button.dataset.jcOriginalTitle;
      button.classList.remove("is-loading");
    }
  }

  function startNamedDownload(blob, signedUrl, fileName) {
    const safeName = String(fileName || "JC.config").replace(/[^A-Za-z0-9._-]/g, "") || "JC.config";
    const link = document.createElement("a");
    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = safeName;
    } catch (_) {
      link.href = String(signedUrl || "");
    }
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }, 3000);
  }

  function showRenameNotice(fileName) {
    return new Promise((resolve) => {
      const old = document.getElementById("jc_config_rename_notice");
      if (old) old.remove();

      const modal = document.createElement("div");
      modal.id = "jc_config_rename_notice";
      modal.innerHTML = `
        <div class="jc-config-notice-box" role="dialog" aria-modal="true" aria-labelledby="jc_config_notice_title">
          <div class="jc-config-notice-icon">⚠️</div>
          <h3 id="jc_config_notice_title">Atenção antes de usar o arquivo</h3>
          <p>O arquivo será baixado como <strong>${escapeHtml(fileName)}</strong>.</p>
          <div class="jc-config-rename-rule">Depois de baixar, renomeie e deixe somente <strong>.config</strong> para poder utilizar.</div>
          <p class="jc-config-notice-help">Altere apenas o nome. Não abra nem edite o conteúdo do arquivo.</p>
          <div class="jc-config-notice-actions">
            <button type="button" class="jc-config-notice-cancel">Cancelar</button>
            <button type="button" class="jc-config-notice-download" disabled>Baixar em 10 segundos</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      if (!document.getElementById("jc_config_rename_notice_styles")) {
        const style = document.createElement("style");
        style.id = "jc_config_rename_notice_styles";
        style.textContent = `
          #jc_config_rename_notice{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
          .jc-config-notice-box{width:min(520px,96vw);padding:24px;border-radius:24px;background:linear-gradient(145deg,#0b1723,#03080e);border:1px solid rgba(255,190,61,.48);box-shadow:0 30px 90px rgba(0,0,0,.7);color:#fff;text-align:center;font-family:Arial,sans-serif}
          .jc-config-notice-icon{font-size:42px;line-height:1;margin-bottom:8px}
          .jc-config-notice-box h3{margin:0 0 12px;font-size:23px}
          .jc-config-notice-box p{margin:8px 0;color:#c1d0d9;line-height:1.5}
          .jc-config-notice-box p strong{color:#fff;font-size:17px}
          .jc-config-rename-rule{margin:16px 0;padding:15px;border-radius:15px;background:rgba(255,179,33,.12);border:1px solid rgba(255,190,61,.34);color:#ffe5aa;line-height:1.5}
          .jc-config-rename-rule strong{display:inline-block;padding:2px 7px;border-radius:7px;background:#fff;color:#08111a;font-size:18px}
          .jc-config-notice-help{font-size:13px!important;color:#91a8b6!important}
          .jc-config-notice-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:10px;margin-top:20px}
          .jc-config-notice-actions button{min-height:48px;border:0;border-radius:13px;font-weight:800;cursor:pointer}
          .jc-config-notice-cancel{background:rgba(255,255,255,.11);color:#fff}
          .jc-config-notice-download{background:linear-gradient(135deg,#13a664,#19c77b);color:#03120b}
          .jc-config-notice-download:disabled{cursor:not-allowed;opacity:.55;filter:grayscale(.25)}
          @media(max-width:520px){.jc-config-notice-actions{grid-template-columns:1fr}.jc-config-notice-box{padding:20px}}`;
        document.head.appendChild(style);
      }

      const cancel = modal.querySelector(".jc-config-notice-cancel");
      const download = modal.querySelector(".jc-config-notice-download");
      let seconds = 10;
      let finished = false;
      let timer = 0;

      const finish = (value) => {
        if (finished) return;
        finished = true;
        if (timer) window.clearInterval(timer);
        modal.remove();
        resolve(Boolean(value));
      };

      cancel.onclick = () => finish(false);
      modal.onclick = (event) => { if (event.target === modal) finish(false); };
      download.onclick = () => { if (!download.disabled) finish(true); };

      timer = window.setInterval(() => {
        seconds -= 1;
        if (seconds > 0) {
          download.textContent = `Baixar em ${seconds} segundo${seconds === 1 ? "" : "s"}`;
          return;
        }
        window.clearInterval(timer);
        timer = 0;
        download.disabled = false;
        download.textContent = "Baixar arquivo";
        try { download.focus({preventScroll:true}); } catch (_) { download.focus(); }
      }, 1000);
    });
  }

  function report(detail) {
    document.dispatchEvent(new CustomEvent("jc:report-action", { detail }));
  }

  function demoDownload() {
    if (typeof window.jcDemoAbrirArquivoFake === "function") {
      window.jcDemoAbrirArquivoFake("btn_config_pack");
      return false;
    }
    app().toast?.("Modo teste: download real bloqueado.", "error");
    return false;
  }

  function usageMessage(confirmation, destination) {
    if (confirmation?.admin_test || destination?.download_mode === "admin") {
      return "Download como ADM concluído sem contabilizar e sem consumir a CONFIG.";
    }
    if (confirmation?.unlimited) return `Arquivo .config baixado para ${destination?.target_name || "o cliente"}. Cliente sem limite diário.`;
    const used = Number(confirmation?.used_today || 0);
    const limit = Number(confirmation?.effective_limit || 20);
    return `Arquivo .config baixado para ${destination?.target_name || "o cliente"}. Uso hoje: ${used} de ${limit}.`;
  }

  async function realDownload(button) {
    if (busy) return false;
    if (isTestMode()) return demoDownload();

    busy = true;
    setButtonBusy(button, true);
    let historyId = "";
    let destination = null;

    try {
      const sessionResult = await app().client.auth.getSession();
      if (!sessionResult.data?.session) throw new Error("Entre no painel antes de baixar o arquivo.");

      destination = await chooseDestination();
      if (!destination) return false;

      const device = browserInfo();
      const reserved = await invoke({
        action: "reserve",
        request_key: requestKey(),
        device_key: deviceKey(),
        channel: "acesso_aqui",
        download_mode: destination.download_mode,
        target_client_id: destination.target_client_id,
        ...device,
      });
      historyId = reserved.history_id || "";

      if (!reserved.signed_url) throw new Error("O Supabase não retornou o link temporário da CONFIG.");
      const fileName = String(reserved.file_name || (destination.download_mode === "admin" ? "JC.config" : "CL.config"));
      const approved = await showRenameNotice(fileName);
      if (!approved) {
        await invoke({
          action: "cancel",
          history_id: historyId,
          failed: false,
          error_message: "Download cancelado antes da liberação do arquivo.",
        });
        historyId = "";
        return false;
      }

      const response = await fetch(reserved.signed_url, { cache: "no-store" });
      if (!response.ok) throw new Error("O arquivo privado não pôde ser baixado. Código " + response.status + ".");
      const blob = await response.blob();
      if (!blob || blob.size < 1) throw new Error("O arquivo recebido está vazio.");

      const confirmation = await invoke({ action: "confirm", history_id: historyId });
      startNamedDownload(blob, reserved.signed_url, fileName);

      report({
        function_id: "config.access",
        function_name: "Acesse aqui (.config)",
        category: "CONFIG",
        item_label: "CONFIG " + String(reserved.config_no || "").padStart(3, "0") + " — V" + String(reserved.version_no || 1),
        status: "delivered",
        operation_id: randomId(),
        config_no: reserved.config_no || null,
        version_no: reserved.version_no || null,
        metadata: {
          admin_test: Boolean(reserved.admin_test),
          download_mode: destination.download_mode,
          target_client_id: destination.target_client_id || null,
          device_label: device.device_label,
          source: "jc-download",
          file_name: String(reserved.file_name || ""),
        },
      });

      app().toast?.(usageMessage(confirmation, destination));
      return false;
    } catch (error) {
      if (historyId) {
        try {
          await invoke({
            action: "cancel",
            history_id: historyId,
            failed: true,
            error_message: String(error?.message || error || "Falha desconhecida"),
          });
        } catch (_) {
          // A falha original continua sendo a mensagem principal.
        }
      }
      console.error("JC-APK CONFIG:", error);
      report({
        function_id: "config.access",
        function_name: "Acesse aqui (.config)",
        category: "CONFIG",
        status: "failed",
        operation_id: randomId(),
        metadata: {
          message: String(error?.message || error || "Falha desconhecida"),
          download_mode: destination?.download_mode || null,
          target_client_id: destination?.target_client_id || null,
          source: "jc-download",
        },
      });
      app().toast?.(error?.message || "Não foi possível baixar o arquivo .config.", "error");
      return false;
    } finally {
      busy = false;
      setButtonBusy(button, false);
    }
  }

  let crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        crcTable[n] = c >>> 0;
      }
    }
    let crc = 0xffffffff;
    bytes.forEach((byte) => { crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); });
    return (crc ^ 0xffffffff) >>> 0;
  }

  function zipStored(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const le16 = (view, at, value) => view.setUint16(at, value, true);
    const le32 = (view, at, value) => view.setUint32(at, value >>> 0, true);
    files.forEach((file) => {
      const name = encoder.encode(file.name);
      const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length);
      const lv = new DataView(local.buffer);
      le32(lv, 0, 0x04034b50); le16(lv, 4, 20); le16(lv, 6, 0x0800); le16(lv, 8, 0);
      le16(lv, 10, 0); le16(lv, 12, 0); le32(lv, 14, crc); le32(lv, 18, data.length); le32(lv, 22, data.length);
      le16(lv, 26, name.length); le16(lv, 28, 0); local.set(name, 30);
      localParts.push(local, data);
      const central = new Uint8Array(46 + name.length);
      const cv = new DataView(central.buffer);
      le32(cv, 0, 0x02014b50); le16(cv, 4, 20); le16(cv, 6, 20); le16(cv, 8, 0x0800); le16(cv, 10, 0);
      le16(cv, 12, 0); le16(cv, 14, 0); le32(cv, 16, crc); le32(cv, 20, data.length); le32(cv, 24, data.length);
      le16(cv, 28, name.length); le16(cv, 30, 0); le16(cv, 32, 0); le16(cv, 34, 0); le16(cv, 36, 0); le32(cv, 38, 0); le32(cv, 42, offset); central.set(name, 46);
      centralParts.push(central);
      offset += local.length + data.length;
    });
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    le32(ev, 0, 0x06054b50); le16(ev, 4, 0); le16(ev, 6, 0); le16(ev, 8, files.length); le16(ev, 10, files.length);
    le32(ev, 12, centralSize); le32(ev, 16, offset); le16(ev, 20, 0);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  async function bulkDownload(quantity, progress) {
    if (busy) throw new Error('Já existe uma preparação de CONFIG em andamento.');
    if (isTestMode()) return demoDownload();
    const total = Math.max(1, Math.min(50, Number(quantity) || 1));
    busy = true;
    let destination = null;
    const files = [];
    const failures = [];
    try {
      const sessionResult = await app().client.auth.getSession();
      if (!sessionResult.data?.session) throw new Error('Entre no painel antes de gerar o lote.');
      destination = await chooseDestination();
      if (!destination) throw new Error('Operação cancelada.');
      const device = browserInfo();
      for (let index = 0; index < total; index += 1) {
        let historyId = '';
        try {
          progress?.({ current: index + 1, total, message: `Buscando CONFIG ${index + 1} de ${total}...` });
          const reserved = await invoke({ action:'reserve', request_key:requestKey(), device_key:deviceKey(), channel:'acesso_aqui_lote', operation_scope:'mass', required_permission_id:'activators.mass.config', download_mode:destination.download_mode, target_client_id:destination.target_client_id, ...device });
          historyId = reserved.history_id || '';
          if (!reserved.signed_url) throw new Error('O Supabase não retornou o arquivo reservado.');
          const response = await fetch(reserved.signed_url, { cache:'no-store' });
          if (!response.ok) throw new Error(`Falha ao baixar a CONFIG ${index + 1}.`);
          const data = new Uint8Array(await response.arrayBuffer());
          if (!data.length) throw new Error(`A CONFIG ${index + 1} veio vazia.`);
          await invoke({ action:'confirm', history_id:historyId });
          historyId = '';
          const number = String(index + 1).padStart(3, '0');
          const original = String(reserved.file_name || 'JC.config').replace(/[^A-Za-z0-9._-]/g, '');
          files.push({ name:`${number}-${original.endsWith('.config') ? original : original + '.config'}`, data });
        } catch (error) {
          if (historyId) {
            try { await invoke({ action:'cancel', history_id:historyId, failed:true, error_message:String(error?.message || error) }); } catch (_) {}
          }
          failures.push({ index:index + 1, message:String(error?.message || error) });
          if (!files.length) throw error;
          break;
        }
      }
      if (!files.length) throw new Error('Nenhuma CONFIG foi preparada para o ZIP.');
      progress?.({ current:files.length, total, message:`Montando ZIP com ${files.length} arquivo(s)...` });
      const blob = zipStored(files);
      startNamedDownload(blob, '', `JC-CONFIG-LOTE-${files.length}.zip`);
      report({ function_id:'activators.mass.config', function_name:'GERAR ZIP (CONFIG em massa)', category:'Operações em Massa', status:failures.length ? 'partial' : 'delivered', operation_id:randomId(), metadata:{ quantity_requested:total, quantity_delivered:files.length, failures, download_mode:destination.download_mode, target_client_id:destination.target_client_id || null, source:'jc-download-bulk' } });
      return { requested:total, delivered:files.length, failures };
    } finally {
      busy = false;
    }
  }

  function canTakeClick(button) {
    if (!button) return false;
    if (button.classList.contains("jc-function-locked")) return false;
    if (button.classList.contains("jc-panel-maintenance")) return false;
    if (button.getAttribute("aria-disabled") === "true") return false;
    if (window.JC_PANEL_RUNTIME?.isMaintenance?.("config.access")) return false;
    return true;
  }

  function bindCapture() {
    if (captureBound) return;
    captureBound = true;

    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("#btn_config_pack,[data-jc-function-id='config.access']");
      if (!button || !canTakeClick(button)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      event.__jcConfigDeliveryHandled = true;
      Promise.resolve(realDownload(button)).catch((error) => {
        console.error("JC-APK CONFIG:", error);
        app().toast?.(error?.message || "Não foi possível baixar o arquivo .config.", "error");
      });
    }, true);
  }

  // 13D: vincula imediatamente para garantir que o aviso de 10 segundos
  // funcione mesmo se o evento jc:access-ready já tiver sido disparado.
  bindCapture();
  document.addEventListener("jc:access-ready", bindCapture, { once: true });
  if (window.JC_GENERATOR_CONTEXT?.mode) bindCapture();

  window.JC_CONFIG_DOWNLOAD = Object.freeze({
    download: realDownload,
    bulk: bulkDownload,
    isBusy: () => busy,
    bind: bindCapture,
  });
})();
