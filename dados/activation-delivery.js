(function () {
  "use strict";

  const A = window.JC_APP;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

  const VIP_DOWNLOAD_CODE = '6211177';
  const VIP_APK_URL = 'https://github.com/JoaoJMuniz19/JC-APK-TV-Downloads/releases/download/downloads-oficiais/JC--Ativador-ONLINEVIP-digitos.apk';

  const state = {
    last: { 11: null, 16: null },
    batchType: "11",
    client: null,
    links: [],
    codes: [],
    versions: [],
    generated: [],
    tutorialUrl: "",
    timer: null,
    session: { 11: 0, 16: 0, vip: 0, test: 0 },
    whatsappOpening: false,
    deliveryMode: 'real',
    testSettings: null,
    flow: 'normal',
    flowOrigin: '',
  };

  function configureFlow(type) {
    const requested = String(type || '16').toLowerCase();
    state.flow = requested === 'vip' ? 'vip' : 'normal';
    state.flowOrigin = state.flow === 'vip' ? 'VIP-Ativador' : (requested === '11' ? '11-Ativador' : '16-Ativador normal');
    return requested === '11' ? '11' : '16';
  }

  function currentProductLabel() {
    return state.flow === 'vip' ? 'VIP-Ativador' : `Ativador ${state.batchType} Dígitos`;
  }

  let deadlineCheckDone = false;
  async function enforceDeadlinesOnce() {
    if (deadlineCheckDone || !A?.client) return;
    deadlineCheckDone = true;
    try {
      await A.client.rpc("jc_enforce_activation_deadlines");
    } catch (error) {
      console.warn("Prazo de 36h:", error.message || error);
    }
  }

  function normalizePhone(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) digits = "55" + digits;
    return digits.slice(0, 13);
  }

  function maskPhone(value) {
    const digits = normalizePhone(value);
    return digits.length >= 4 ? "(**) *****-" + digits.slice(-4) : "Não informado";
  }

  function parseItems(items) {
    return (Array.isArray(items) ? items : [])
      .map((raw, index) => {
        const text = String(raw || "").trim();
        const separator = text.indexOf("|");
        if (separator >= 0) {
          return {
            label: text.slice(0, separator).trim() || `Opção ${index + 1}`,
            value: text.slice(separator + 1).trim(),
          };
        }
        return { label: `Opção ${index + 1}`, value: text };
      })
      .filter((item) => item.value);
  }

  function addUniqueOption(list, item) {
    if (!item?.value) return null;
    const value = String(item.value).trim();
    const existing = list.findIndex((row) => String(row.value).trim() === value);
    if (existing >= 0) return existing;
    list.push({ label: item.label || `Opção ${list.length + 1}`, value });
    return list.length - 1;
  }

  function getApi() {
    return window.JC_ACTIVATION_CODES;
  }

  function injectStyles() {
    if ($("jc_activation_delivery_styles")) return;
    const style = document.createElement("style");
    style.id = "jc_activation_delivery_styles";
    style.textContent = `
      .jc-act-tools{display:grid;grid-template-columns:1fr;gap:8px;margin:11px 0;padding:11px;border-radius:15px;border:1px solid rgba(61,190,255,.25);background:rgba(5,31,49,.72)}
      .jc-act-counter{grid-column:1/-1;display:flex;justify-content:space-between;gap:10px;padding:9px 11px;border-radius:11px;background:rgba(255,255,255,.045);font:800 11px var(--mono,monospace);color:#bdeaff}.jc-act-counter b{color:#8dffd1}
      .jc-act-tools button{min-height:42px;border:0;border-radius:11px;padding:10px;font-weight:950;cursor:pointer}.jc-act-batch{background:linear-gradient(135deg,#278fff,#29d5ff);color:#041b28}.jc-act-whats{background:#25d366;color:#052117}.jc-act-whats:disabled{opacity:.45;cursor:not-allowed}
      .jc-act-modal{display:none;position:fixed;inset:0;z-index:2147483646;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.86);backdrop-filter:blur(9px)}.jc-act-modal.show{display:flex}
      .jc-act-box{width:min(1080px,100%);max-height:96vh;overflow:auto;border-radius:24px;border:1px solid rgba(65,190,255,.34);background:linear-gradient(155deg,#0b2233,#06121d);box-shadow:0 30px 100px rgba(0,0,0,.7);color:#fff}
      .jc-act-head,.jc-act-foot{position:sticky;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 18px;background:#091b29;border-bottom:1px solid rgba(255,255,255,.1)}.jc-act-head{top:0}.jc-act-foot{bottom:0;border-top:1px solid rgba(255,255,255,.1);border-bottom:0;justify-content:flex-end;flex-wrap:wrap}
      .jc-act-head h3{margin:0}.jc-act-x{border:0;border-radius:10px;padding:9px 12px;background:#713144;color:#fff;font-weight:900;cursor:pointer}.jc-act-body{padding:17px}
      .jc-act-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.jc-act-field{display:grid;gap:6px}.jc-act-field label{font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:#c8dae5}.jc-act-field input,.jc-act-field select{width:100%;padding:11px;border-radius:11px;border:1px solid rgba(255,255,255,.13);background:#061522;color:#fff}.jc-act-full{grid-column:1/-1}
      .jc-act-notice{display:grid;grid-template-columns:auto 1fr;gap:13px;align-items:center;margin:12px 0;padding:12px;border-radius:15px;border:1px solid rgba(255,183,43,.32);background:rgba(255,183,43,.08)}.jc-act-notice .jc-act-notice-icon{display:grid;place-items:center;width:54px;height:54px;border-radius:16px;background:rgba(255,183,43,.16);font-size:26px}.jc-act-notice b,.jc-act-notice span{display:block}.jc-act-notice span{margin-top:5px;color:#d8c7a0;font-size:12px;line-height:1.48}.jc-act-countdown{text-align:center;color:#ffe09b;font-weight:950;margin:9px 0}
      .jc-device-list{display:grid;gap:9px;margin-top:12px}.jc-device-row{display:grid;grid-template-columns:90px repeat(3,minmax(160px,1fr));gap:8px;padding:11px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035)}.jc-device-row strong{display:flex;align-items:center}.jc-device-row select{width:100%;padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.13);background:#071826;color:#fff}.jc-device-code{grid-column:1/-1;padding:8px;border-radius:9px;background:rgba(43,211,145,.08);color:#baffdc;font:850 12px var(--mono,monospace)}
      .jc-act-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.jc-act-actions button,.jc-act-foot button{border:0;border-radius:11px;padding:10px 13px;font-weight:950;cursor:pointer}.jc-act-secondary{background:#17364a;color:#fff}.jc-act-primary{background:#25d366;color:#052117}.jc-act-blue{background:#278fff;color:#fff}.jc-act-primary:disabled{opacity:.45;cursor:wait}.jc-act-result{min-height:22px;margin-top:10px;color:#baffdc;white-space:pre-wrap}.jc-act-save{display:flex;gap:7px;align-items:center;font-size:12px;color:#c6d8e2}.jc-act-save input{width:18px;height:18px}
      .jc-act-picker-box{width:min(620px,100%);max-height:88vh;overflow:auto;border-radius:20px;border:1px solid rgba(65,190,255,.34);background:#091b29;color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.7)}.jc-act-picker-head{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;background:#091b29;border-bottom:1px solid rgba(255,255,255,.1)}.jc-act-picker-body{padding:14px}.jc-act-picker-search{width:100%;padding:11px;border-radius:11px;border:1px solid rgba(255,255,255,.13);background:#061522;color:#fff}.jc-act-picker-list{display:grid;gap:8px;margin-top:10px}.jc-act-picker-option{display:block;width:100%;padding:11px 12px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.04);color:#fff;text-align:left;cursor:pointer}.jc-act-picker-option:hover{border-color:rgba(43,211,145,.45);background:rgba(43,211,145,.08)}.jc-act-picker-option b,.jc-act-picker-option small{display:block}.jc-act-picker-option small{margin-top:4px;color:#9eb6c2}.jc-mode-options{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:18px}.jc-mode-option{border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:20px;background:rgba(255,255,255,.05);color:#fff;text-align:left;cursor:pointer}.jc-mode-option:hover{border-color:#29d391;background:rgba(41,211,145,.1)}.jc-mode-option b,.jc-mode-option span{display:block}.jc-mode-option b{font-size:18px}.jc-mode-option span{margin-top:7px;color:#b7cbd7;line-height:1.45}
      @media(max-width:850px){.jc-device-row{grid-template-columns:90px 1fr 1fr}.jc-device-row [data-version]{grid-column:2/-1}}
      @media(max-width:700px){.jc-act-tools{grid-template-columns:1fr}.jc-act-counter{grid-column:auto}.jc-act-grid,.jc-device-row,.jc-act-notice{grid-template-columns:1fr}.jc-act-full,.jc-device-code,.jc-device-row [data-version]{grid-column:auto}.jc-act-notice .jc-act-notice-icon{width:100%;height:52px}}
    `;
    document.head.appendChild(style);
  }

  function counterTotal(type) {
    return Number(localStorage.getItem("jc_activation_generated_" + type) || 0);
  }

  function updateCounters() {
    ["11", "16", "vip", "test"].forEach((type) => {
      const element = $("jc_act_counter_" + type);
      if (element) {
        element.innerHTML = `<span>Gerados nesta sessão: <b>${state.session[type]}</b></span><span>Total neste navegador: <b>${counterTotal(type)}</b></span>`;
      }
    });
  }

  function addTools(type) {
    const panel = $(type === "11" ? "painel_gerador11_visual_11" : "painel_gerador11_visual");
    if (!panel || $("jc_act_tools_" + type)) return;
    const target = $(type === "11" ? "btn_copiar_codigo_11" : "btn_copiar_codigo_16")?.parentElement || panel;
    const box = document.createElement("div");
    box.id = "jc_act_tools_" + type;
    box.className = "jc-act-tools";
    box.innerHTML = `<div class="jc-act-counter" id="jc_act_counter_${type}"></div><button type="button" class="jc-act-whats" data-jc-whats="${type}">💬 ENVIAR 1 CÓDIGO PELO WHATSAPP</button>`;
    target.insertAdjacentElement("afterend", box);
    box.querySelector("[data-jc-whats]").onclick = () => openSingle(type);
    updateCounters();
  }

  function ensureModal() {
    let modal = $("jc_activation_delivery_modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "jc_activation_delivery_modal";
    modal.className = "jc-act-modal";
    modal.innerHTML = `<div class="jc-act-box" role="dialog" aria-modal="true"><div class="jc-act-head"><h3 id="jc_act_title">Envio dos códigos</h3><button type="button" class="jc-act-x" id="jc_act_close">Fechar</button></div><div class="jc-act-body"><div class="jc-act-grid"><div class="jc-act-field" id="jc_act_qty_field"><label>Quantidade de aparelhos</label><input id="jc_act_qty" type="number" min="1" max="100" value="1"></div><div class="jc-act-field"><label>Cliente / responsável</label><button type="button" class="jc-act-secondary" id="jc_act_choose_client">Escolher cliente</button><input id="jc_act_client_label" readonly value="Cliente atual"></div><div class="jc-act-field"><label>WhatsApp</label><input id="jc_act_phone" inputmode="tel" placeholder="3488590346"></div><label class="jc-act-save"><input id="jc_act_save_phone" type="checkbox"> Salvar este número no cadastro central do cliente</label></div><div class="jc-act-notice"><div class="jc-act-notice-icon">⚠️</div><div><b>Aviso profissional obrigatório</b><span>Mesmo quando link, código de download e aparência permanecem iguais, os Ativadores recebem atualizações internas contínuas de compatibilidade. Cada código deve ser ativado em até 36 horas e funciona em somente um aparelho.</span></div></div><div class="jc-act-countdown" id="jc_act_countdown"></div><div class="jc-act-actions" id="jc_act_batch_helpers"><button class="jc-act-secondary" id="jc_act_apply_all">Aplicar aparelho 1 a todos</button><button class="jc-act-secondary" id="jc_act_copy_previous">Copiar seleção anterior</button></div><div id="jc_act_devices" class="jc-device-list"></div><div id="jc_act_result" class="jc-act-result"></div></div><div class="jc-act-foot"><button class="jc-act-secondary" id="jc_act_copy_message" disabled>📋 Copiar mensagem</button><button class="jc-act-blue" id="jc_act_generate" disabled>🔐 Gerar códigos</button><button class="jc-act-primary" id="jc_act_open_whats" disabled>💬 Abrir WhatsApp</button></div></div>`;
    document.body.appendChild(modal);
    $("jc_act_close").onclick = closeModal;
    modal.onclick = (event) => { if (event.target === modal) closeModal(); };
    $("jc_act_qty").oninput = renderDeviceRows;
    $("jc_act_apply_all").onclick = applyAll;
    $("jc_act_copy_previous").onclick = copyPrevious;
    $("jc_act_choose_client").onclick = async () => {
      const mainModal = $("jc_activation_delivery_modal");
      const reopenAfterPicker = state.deliveryMode === "test" && mainModal?.classList.contains("show");
      if (reopenAfterPicker) mainModal.classList.remove("show");
      try {
        await chooseClient();
      } catch (error) {
        A.toast(error.message || String(error), "error");
      } finally {
        if (reopenAfterPicker) mainModal.classList.add("show");
      }
    };
    $("jc_act_generate").onclick = () => generateBatch().catch((error) => {
      $("jc_act_result").textContent = error.message || String(error);
      $("jc_act_generate").disabled = false;
    });
    $("jc_act_copy_message").onclick = () => copyMessage().catch((error) => A.toast(error.message || String(error), "error"));
    $("jc_act_open_whats").onclick = () => openWhats().catch((error) => A.toast(error.message || String(error), "error"));
    return modal;
  }

  function setQuantityMode(batch) {
    const quantity = $("jc_act_qty");
    const helpers = $("jc_act_batch_helpers");
    if (quantity) {
      quantity.max = batch ? "100" : "1";
      quantity.disabled = !batch;
      if (!batch) quantity.value = "1";
    }
    if (helpers) helpers.hidden = !batch;
  }

  async function loadVersionOptions(type) {
    state.versions = [];
    if (type === "16") {
      try {
        const runtime = window.JC_ACTIVATOR16_VERSIONS;
        if (runtime?.reload) await runtime.reload();
        const versions = (runtime?.state?.versions || []).filter((version) => version?.available);
        versions.forEach((version, index) => {
          const label = version.version_label || version.subtitle || `Versão ${index + 1}`;
          const linkIndex = addUniqueOption(state.links, { label, value: version.apk_url });
          const codeIndex = addUniqueOption(state.codes, { label, value: version.download_code });
          state.versions.push({
            label,
            key: version.version_key || version.id || String(index),
            linkIndex,
            codeIndex,
          });
        });
      } catch (error) {
        console.warn("Versões do Ativador 16 no envio:", error.message || error);
      }
    }

    if (!state.versions.length) {
      const normalizeLabel = (value) => String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      state.versions = state.links.map((link, index) => {
        const normalizedLinkLabel = normalizeLabel(link.label);
        let codeIndex = state.codes.findIndex((code) => normalizeLabel(code.label) === normalizedLinkLabel);
        if (codeIndex < 0 && state.codes.length === state.links.length && state.codes[index]) codeIndex = index;
        return {
          label: link.label || `Versão ${index + 1}`,
          key: String(index),
          linkIndex: index,
          codeIndex: codeIndex >= 0 ? codeIndex : null,
        };
      });
    }

    if (!state.versions.length) {
      state.versions = [{ label: "Versão atualizada", key: "current", linkIndex: null, codeIndex: null }];
    }

    // No envio do Ativador 16, a versão Tradicional deve ser sempre a primeira
    // opção e, por consequência, ficar selecionada por padrão. As versões
    // especiais continuam vindo apenas do filtro de permissões já existente.
    if (type === "16" && state.versions.length > 1) {
      const normalizeVersion = (value) => String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const isTraditional = (version) => /\b(tradicional|padrao|standard|default)\b/.test(
        normalizeVersion([version?.label, version?.key].filter(Boolean).join(" "))
      );
      state.versions = state.versions
        .map((version, index) => ({ version, index }))
        .sort((a, b) => Number(!isTraditional(a.version)) - Number(!isTraditional(b.version)) || a.index - b.index)
        .map((item) => item.version);
    }
  }

  const DELIVERY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  function deliveryCacheKey(type) {
    const normalized = state.flow === 'vip' ? 'vip' : (String(type) === '11' ? '11' : '16');
    return 'jc_activation_delivery_cache_v2_' + normalized;
  }

  function restoreDeliveryCache(type) {
    try {
      const cached = JSON.parse(localStorage.getItem(deliveryCacheKey(type)) || 'null');
      if (!cached || !Number(cached.savedAt) || Date.now() - Number(cached.savedAt) > DELIVERY_CACHE_TTL_MS) return false;
      if (!Array.isArray(cached.links) || !Array.isArray(cached.codes) || !Array.isArray(cached.versions)) return false;
      state.links = cached.links;
      state.codes = cached.codes;
      state.versions = cached.versions;
      state.tutorialUrl = String(cached.tutorialUrl || '');
      return true;
    } catch (_) {
      return false;
    }
  }

  function saveDeliveryCache(type) {
    try {
      localStorage.setItem(deliveryCacheKey(type), JSON.stringify({
        savedAt: Date.now(),
        links: state.links || [],
        codes: state.codes || [],
        versions: state.versions || [],
        tutorialUrl: state.tutorialUrl || '',
      }));
    } catch (_) {}
  }

  async function loadDeliveryOptions(type) {
    // Links, códigos de download, versões e tutorial são dados estáticos.
    // Depois da primeira leitura, reutiliza o navegador. A geração real de
    // ativação continua obrigatoriamente no Supabase, com crédito e histórico.
    if (restoreDeliveryCache(type)) return;

    if (state.flow === 'vip') {
      const vipIds = ['ativador_vip_digitos','download_vip','tutorial_ativador_vip_whatsapp'];
      const [{ data: linkRows, error: linkError }, { data: release, error: releaseError }] = await Promise.all([
        A.client.from('links_catalog').select('id,name,kind,value,items,active').in('id', vipIds),
        A.client.from('jc_app_releases').select('app_key,apk_url,latest_version_name,active').eq('app_key','activator_vip').maybeSingle(),
      ]);
      if (linkError) throw linkError;
      if (releaseError) throw releaseError;
      const rows = linkRows || [];
      const vipLinkRow = rows.find((row) => row.id === vipIds[0] && row.active !== false);
      const vipCodeRow = rows.find((row) => row.id === vipIds[1] && row.active !== false);
      state.links = parseItems(vipLinkRow?.items);
      state.codes = parseItems(vipCodeRow?.items);
      if (!state.links.length && String(vipLinkRow?.value || '').trim()) state.links = [{ label: vipLinkRow?.name || 'Ativador VIP', value: String(vipLinkRow.value).trim() }];
      if (!state.codes.length && String(vipCodeRow?.value || '').trim()) state.codes = [{ label: vipCodeRow?.name || 'Ativador VIP — DOWNLOAD', value: String(vipCodeRow.value).trim() }];
      const tutorialRow = rows.find((row) => row.id === vipIds[2] && row.active !== false);
      state.tutorialUrl = parseItems(tutorialRow?.items)[0]?.value || String(tutorialRow?.value || '').trim();
      if (!state.links.length && release?.active !== false && release?.apk_url) state.links = [{ label: 'VIP-Ativador ' + (release.latest_version_name || ''), value: release.apk_url }];
      if (!state.links.length) state.links = [{ label: 'Ativador VIP oficial', value: VIP_APK_URL }];
      if (!state.codes.length) state.codes = [{ label: 'Ativador VIP — DOWNLOAD', value: VIP_DOWNLOAD_CODE }];
      state.versions = state.links.map((link, index) => ({ label: link.label || `VIP ${index + 1}`, key: `vip-${index}`, linkIndex: index, codeIndex: state.codes[index] ? index : 0 }));
      saveDeliveryCache(type);
      return;
    }
    const tutorialId = `tutorial_ativador_${type}_whatsapp`;
    const ids = type === "11"
      ? ["ativador_11_digitos", "rotacao_11", tutorialId]
      : ["ativador_16_digitos", "download_16", tutorialId];
    const { data, error } = await A.client.from("links_catalog").select("id,name,kind,value,items,active").in("id", ids);
    if (error) throw error;
    const rows = data || [];
    state.links = parseItems(rows.find((row) => row.id === ids[0])?.items);
    state.codes = parseItems(rows.find((row) => row.id === ids[1])?.items);
    const tutorialRow = rows.find((row) => row.id === tutorialId && row.active !== false);
    const tutorialItems = parseItems(tutorialRow?.items);
    state.tutorialUrl = tutorialItems[0]?.value || String(tutorialRow?.value || "").trim();
    await loadVersionOptions(type);
    if (!state.links.length) state.links = [{ label: "Sem link no envio", value: "" }];
    if (!state.codes.length) state.codes = [{ label: "Sem código de download", value: "" }];
    saveDeliveryCache(type);
  }

  function optionHtml(list) {
    return list.map((item, index) => `<option value="${index}">${esc(item.label || `Opção ${index + 1}`)}</option>`).join("");
  }

  function versionHtml() {
    return state.versions.map((version, index) => `<option value="${index}">${esc(version.label)}</option>`).join("");
  }

  function syncRowVersion(row) {
    const version = state.versions[Number(row.querySelector("[data-version]")?.value || 0)];
    if (!version) return;
    if (Number.isInteger(version.linkIndex) && version.linkIndex >= 0 && state.links[version.linkIndex]) {
      row.querySelector("[data-link]").value = String(version.linkIndex);
    }
    if (Number.isInteger(version.codeIndex) && version.codeIndex >= 0 && state.codes[version.codeIndex]) {
      row.querySelector("[data-code]").value = String(version.codeIndex);
    }
  }

  function renderDeviceRows() {
    const quantity = Math.max(1, Math.min(100, Number($("jc_act_qty").value || 1)));
    $("jc_act_qty").value = quantity;
    $("jc_act_devices").innerHTML = Array.from({ length: quantity }, (_, index) => `<div class="jc-device-row" data-device="${index}"><strong>Aparelho ${index + 1}</strong><select data-version aria-label="Versão do aparelho ${index + 1}">${versionHtml()}</select><select data-link aria-label="Link do aparelho ${index + 1}">${optionHtml(state.links)}</select><select data-code aria-label="Código de download do aparelho ${index + 1}">${optionHtml(state.codes)}</select><div class="jc-device-code" data-generated>O código de ativação será gerado aqui.</div></div>`).join("");
    document.querySelectorAll("[data-device]").forEach((row) => {
      row.querySelector("[data-version]").onchange = () => syncRowVersion(row);
      syncRowVersion(row);
    });
  }

  function applyAll() {
    const rows = [...document.querySelectorAll("[data-device]")];
    if (!rows.length) return;
    const first = rows[0];
    const values = {
      version: first.querySelector("[data-version]").value,
      link: first.querySelector("[data-link]").value,
      code: first.querySelector("[data-code]").value,
    };
    rows.slice(1).forEach((row) => {
      row.querySelector("[data-version]").value = values.version;
      row.querySelector("[data-link]").value = values.link;
      row.querySelector("[data-code]").value = values.code;
    });
  }

  function copyPrevious() {
    const rows = [...document.querySelectorAll("[data-device]")];
    rows.forEach((row, index) => {
      if (!index) return;
      const previous = rows[index - 1];
      row.querySelector("[data-version]").value = previous.querySelector("[data-version]").value;
      row.querySelector("[data-link]").value = previous.querySelector("[data-link]").value;
      row.querySelector("[data-code]").value = previous.querySelector("[data-code]").value;
    });
  }

  function rowSelection(row) {
    const version = state.versions[Number(row.querySelector("[data-version]").value)] || state.versions[0] || {};
    return {
      version: version.label || "Versão atualizada",
      link: state.links[Number(row.querySelector("[data-link]").value)] || {},
      download: state.codes[Number(row.querySelector("[data-code]").value)] || {},
    };
  }

  function mergeCurrentSelections() {
    const rows = [...document.querySelectorAll("[data-device]")];
    state.generated = state.generated.map((item, index) => ({ ...item, ...rowSelection(rows[index] || rows[0]) }));
  }

  function chooseFromList(choices, title = "Escolher cliente") {
    return new Promise((resolve) => {
      let picker = $("jc_act_client_picker");
      if (!picker) {
        picker = document.createElement("div");
        picker.id = "jc_act_client_picker";
        picker.className = "jc-act-modal";
        picker.innerHTML = `<div class="jc-act-picker-box" role="dialog" aria-modal="true"><div class="jc-act-picker-head"><b id="jc_act_picker_title">Escolher cliente</b><button type="button" class="jc-act-x" id="jc_act_picker_close">Fechar</button></div><div class="jc-act-picker-body"><input class="jc-act-picker-search" id="jc_act_picker_search" placeholder="Pesquisar nome, usuário ou WhatsApp"><div class="jc-act-picker-list" id="jc_act_picker_list"></div></div></div>`;
        document.body.appendChild(picker);
      }
      let closed = false;
      const close = (value = null) => {
        if (closed) return;
        closed = true;
        picker.classList.remove("show");
        resolve(value);
      };
      $("jc_act_picker_title").textContent = title;
      $("jc_act_picker_close").onclick = () => close(null);
      picker.onclick = (event) => { if (event.target === picker) close(null); };
      const render = () => {
        const term = String($("jc_act_picker_search").value || "").trim().toLowerCase();
        const filtered = choices.filter((item) => [item.full_name, item.username, item.whatsapp, item.email].join(" ").toLowerCase().includes(term));
        $("jc_act_picker_list").innerHTML = filtered.length
          ? filtered.map((item, index) => `<button type="button" class="jc-act-picker-option" data-pick="${index}"><b>${esc(item.full_name || item.username || "Cliente")}</b><small>@${esc(item.username || "")}${item.whatsapp ? " • " + esc(item.whatsapp) : ""}</small></button>`).join("")
          : `<div class="jc-act-result">Nenhum cliente encontrado.</div>`;
        $("jc_act_picker_list").querySelectorAll("[data-pick]").forEach((button) => {
          button.onclick = () => close(filtered[Number(button.dataset.pick)] || null);
        });
      };
      $("jc_act_picker_search").value = "";
      $("jc_act_picker_search").oninput = render;
      render();
      picker.classList.add("show");
      setTimeout(() => { try { $("jc_act_picker_search").focus({ preventScroll: true }); } catch (_) {} }, 60);
    });
  }

  async function chooseClient() {
    const api = getApi();
    const profile = api?.profile?.();
    if (!api) return;
    if (api.mode?.() === "admin") {
      state.client = await api.chooseClient();
    } else if (profile?.is_reseller) {
      const { data, error } = await A.client.from("profiles")
        .select("id,username,full_name,whatsapp,whatsapp2,whatsapp3,status,reseller_parent_id")
        .eq("reseller_parent_id", profile.id)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      const choices = [
        { ...profile, full_name: `${profile.full_name || profile.username || "Meu cadastro"} (próprio)` },
        ...(data || []),
      ];
      state.client = await chooseFromList(choices, "Escolher cliente da sua revenda");
      if (!state.client) return;
    } else {
      state.client = profile;
    }
    if (state.client) {
      $("jc_act_client_label").value = state.client.full_name || state.client.username || "Cliente";
      $("jc_act_phone").value = state.client.whatsapp || state.client.whatsapp2 || state.client.whatsapp3 || "";
    }
  }

  function unlockBatchImmediately() {
    clearInterval(state.timer);
    state.timer = null;
    $("jc_act_countdown").textContent = "Geração liberada imediatamente. Confira as opções e prossiga.";
    $("jc_act_generate").disabled = false;
  }

  async function openBatch(type) {
    await enforceDeadlinesOnce();
    ensureModal();
    state.batchType = configureFlow(type);
    state.generated = [];
    state.client = null;
    setQuantityMode(true);
    $("jc_act_title").textContent = state.flow === 'vip' ? 'Ativador VIP — geração e envio em lote' : `Ativador ${state.batchType} — geração e envio em lote`;
    $("jc_act_qty").value = 1;
    $("jc_act_phone").value = "";
    $("jc_act_client_label").value = "Escolha o cliente";
    $("jc_act_result").textContent = "";
    $("jc_act_copy_message").disabled = true;
    $("jc_act_open_whats").disabled = true;
    await loadDeliveryOptions(state.batchType);
    renderDeviceRows();
    $("jc_activation_delivery_modal").classList.add("show");
    unlockBatchImmediately();
    await chooseClient();
  }

  function readDomActivation(type) {
    const codeId = String(type) === "11" ? "download_code_11" : "download_code_16";
    const element = $(codeId);
    const code = String(element?.dataset?.codigoAtual || element?.textContent || "").replace(/\D/g, "");
    if (code.length !== Number(type)) return null;
    const api = getApi();
    const profile = api?.profile?.() || {};
    return {
      ok: true,
      type: String(type),
      code,
      client_id: profile.id || null,
      client_name: profile.full_name || profile.username || "Cliente",
      whatsapp: profile.whatsapp || profile.whatsapp2 || profile.whatsapp3 || "",
      client: profile.id ? profile : null,
      generated_at: new Date().toISOString(),
      activation_deadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
      source: "dom_fallback"
    };
  }

  async function loadTestSettings(type) {
    const normalizedType = state.flow === 'vip' ? 'vip' : (String(type) === '11' ? '11' : '16');
    const appKey = normalizedType === 'vip' ? 'activator_vip' : (normalizedType === '11' ? 'activator_11' : 'activator_16');
    const cacheKey = 'jc_test_settings_' + normalizedType;

    // Depois da primeira carga, o Teste funciona somente com os dados do navegador.
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.apkUrl) return cached;
    } catch (_) {}

    const { data, error } = await A.client.from('jc_app_releases')
      .select('test_mode_active,test_code,test_download_code,test_apk_url,test_duration_days,test_message,test_tutorial_url')
      .eq('app_key', appKey).maybeSingle();
    if (error) throw error;

    // Os campos próprios do Teste têm prioridade total. Só busca o catálogo se
    // algum dado essencial ainda não estiver configurado.
    let apkUrl = String(data?.test_apk_url || '').trim();
    let downloadCode = String(data?.test_download_code || '').replace(/\D/g, '');

    if (!apkUrl || !downloadCode) {
      const realIds = normalizedType === '11'
        ? ['ativador_11_digitos', 'rotacao_11']
        : normalizedType === 'vip'
          ? ['ativador_vip_digitos', 'download_vip']
          : ['ativador_16_digitos', 'download_16'];
      const { data: catalogRows, error: catalogError } = await A.client.from('links_catalog')
        .select('id,value,items,active').in('id', realIds);
      if (catalogError) throw catalogError;
      const rows = catalogRows || [];
      const linkRow = rows.find((row) => row.id === realIds[0] && row.active !== false);
      const codeRow = rows.find((row) => row.id === realIds[1] && row.active !== false);
      if (!apkUrl) apkUrl = parseItems(linkRow?.items)[0]?.value || String(linkRow?.value || '').trim();
      if (!downloadCode) downloadCode = String(parseItems(codeRow?.items)[0]?.value || codeRow?.value || '').replace(/\D/g, '');
    }

    const digits = normalizedType === '11' ? 11 : 16;
    const settings = {
      active: data?.test_mode_active !== false,
      code: String(data?.test_code || '').replace(/\D/g, '') || '0'.repeat(digits),
      downloadCode: downloadCode || (normalizedType === 'vip' ? VIP_DOWNLOAD_CODE : ''),
      apkUrl: apkUrl || (normalizedType === 'vip' ? VIP_APK_URL : ''),
      durationDays: Number(data?.test_duration_days || 3),
      message: String(data?.test_message || ''),
      tutorialUrl: String(data?.test_tutorial_url || ''),
    };
    localStorage.setItem(cacheKey, JSON.stringify(settings));
    return settings;
  }

  async function generateRealSingle(type) {
    const api = getApi();
    if (!api?.generate) throw new Error('Gerador ainda não carregado.');
    if (!state.client) await chooseClient();
    if (!state.client) throw new Error('Escolha o cliente antes de gerar.');
    validateBatchCreditCapacity(type, 1);
    const operationId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const result = await api.generate(type, { client: state.client, origin: state.flowOrigin });
    if (!result?.ok || !result.code) throw new Error('Código não retornado.');
    await chargeAfterSuccess(type, operationId);
    return result;
  }

  async function openTestSingle(type) {
    ensureModal();
    state.deliveryMode = 'test';
    state.batchType = configureFlow(type);
    state.testSettings = await loadTestSettings(state.batchType);
    setQuantityMode(false);
    if (!state.testSettings.active) throw new Error('O modo teste está desativado no painel.');

    // Mantém o tutorial normal como fallback, mas isola link, download e versão
    // do teste para que o fluxo não reaproveite por engano opções da ativação real.
    await loadDeliveryOptions(type);
    state.tutorialUrl = state.testSettings.tutorialUrl || state.tutorialUrl;
    state.links = [{ label: 'APK de teste', value: state.testSettings.apkUrl }];
    state.codes = [{ label: 'Teste', value: state.testSettings.downloadCode }];
    state.versions = [{ label: 'Teste de 3 dias', key: 'test', linkIndex: 0, codeIndex: 0 }];

    state.generated = [{
      ok: true,
      type: String(type),
      code: state.testSettings.code,
      client_id: null,
      client_name: 'Teste de 3 dias',
      whatsapp: '',
      generated_at: new Date().toISOString(),
      record_scope: 'test',
      origin: state.flowOrigin,
      version: 'Teste de 3 dias',
      download: state.codes[0],
      link: state.links[0],
    }];
    state.client = null;

    $('jc_act_title').textContent = state.flow === 'vip' ? 'VIP-Ativador — enviar teste de 3 dias' : `Ativador ${state.batchType} — enviar teste de 3 dias`;
    $('jc_act_qty').value = 1;
    $('jc_act_client_label').value = 'Escolha o cliente ou informe o número';
    $('jc_act_phone').value = '';
    $('jc_act_result').textContent = 'Escolha o cliente ou digite diretamente o WhatsApp com DDD.';

    renderDeviceRows();
    const row = document.querySelector('[data-device]');
    if (row) {
      row.querySelector('[data-generated]').textContent = state.testSettings.code;
      row.querySelectorAll('select').forEach((select) => { select.disabled = true; });
    }

    clearInterval(state.timer);
    $('jc_act_countdown').textContent = 'Modo teste: nenhum código real será gerado ou consumido.';
    $('jc_act_generate').disabled = true;
    $('jc_act_copy_message').disabled = false;
    $('jc_act_open_whats').disabled = false;

    // No ADM, o seletor precisa abrir antes da janela principal. Antes ele ficava
    // atrás do modal do teste em alguns navegadores, parecendo que nada abriu.
    await chooseClient();
    if (state.client) {
      state.generated[0] = {
        ...state.generated[0],
        client_id: state.client.id || null,
        client_name: state.client.full_name || state.client.username || 'Cliente',
        whatsapp: state.client.whatsapp || state.client.whatsapp2 || state.client.whatsapp3 || '',
      };
    }

    $('jc_activation_delivery_modal').classList.add('show');
    window.setTimeout(() => {
      try { $('jc_act_phone')?.focus({ preventScroll: true }); } catch (_) {}
    }, 80);
  }

  function availableAutomaticTestTypes() {
    const api = getApi();
    if (api?.mode?.() === 'admin') return ['11', '16', 'vip'];
    const permissions = api?.access?.()?.permissions || window.JC_GENERATOR_CONTEXT?.permissions || {};
    const types = [];
    if (permissions['activator11.generate']) types.push('11');
    if (permissions['activator16.generate']) types.push('16');
    if (permissions['activatorvip.generate']) types.push('vip');
    return types.length ? types : ['16'];
  }

  function syncVisibleTestChoices() {
    const available = new Set(availableAutomaticTestTypes());
    document.querySelectorAll('[data-jc-test-type]').forEach((button) => {
      const visible = available.has(String(button.dataset.jcTestType || ''));
      button.hidden = !visible;
      button.style.display = visible ? '' : 'none';
    });
  }

  function chooseAutomaticTestType(types) {
    if (types.length === 1) return Promise.resolve(types[0]);
    return new Promise((resolve) => {
      let modal = $('jc_test_type_picker');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'jc_test_type_picker';
        modal.className = 'jc-act-modal';
        document.body.appendChild(modal);
      }
      const labels = { '11':'Teste 11 dígitos', '16':'Teste 16 tradicional', vip:'Teste VIP' };
      const icons = { '11':'../assets/geradores/ativador-11-oficial.webp', '16':'../assets/geradores/ativador-16-oficial.webp', vip:'../assets/geradores/ativador-vip-oficial.webp' };
      modal.innerHTML = `<div class="jc-act-picker-box"><div class="jc-act-picker-head"><div><b>Qual teste deseja enviar?</b><small style="display:block;margin-top:4px;color:#9fb7c3">Aparecem somente os ativadores reais já liberados nesta conta.</small></div><button type="button" class="jc-act-x" data-test-type-close>Fechar</button></div><div class="jc-mode-options">${types.map((type)=>`<button type="button" class="jc-mode-option" data-test-type-choice="${esc(type)}"><img src="${icons[type]}" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:12px"><span><b>${labels[type]}</b><small>APK, código de download e mensagem correspondentes</small></span></button>`).join('')}</div></div>`;
      const close = (value) => { modal.classList.remove('show'); resolve(value); };
      modal.querySelector('[data-test-type-close]').onclick = () => close(null);
      modal.querySelectorAll('[data-test-type-choice]').forEach((button)=>{button.onclick=()=>close(button.dataset.testTypeChoice);});
      modal.onclick = (event) => { if (event.target === modal) close(null); };
      modal.classList.add('show');
    });
  }

  async function openAutomaticTest() {
    state.client = null;
    const type = await chooseAutomaticTestType(availableAutomaticTestTypes());
    if (!type) return;
    return openTestSingle(type);
  }


  async function openPreparedTestLink() {
    // Abre a nova aba imediatamente no clique. Assim o navegador não bloqueia
    // o link enquanto o painel consulta o Supabase para descobrir o APK correto.
    const openReal = window.__JC_NATIVE_OPEN || window.open;
    const popup = openReal ? openReal('about:blank', '_blank') : null;
    try {
      let type = state.last.testType;
      if (!type) {
        type = await chooseAutomaticTestType(availableAutomaticTestTypes());
        if (!type) {
          if (popup) popup.close();
          return;
        }
      }
      configureFlow(type);
      const settings = await loadTestSettings(type);
      const url = String(settings.apkUrl || '').trim();
      if (!url) throw new Error('Link do APK de teste ainda não configurado para esta versão.');
      if (popup && popup.location) {
        try { popup.opener = null; } catch (_) {}
        try { popup.location.replace(url); } catch (_) { popup.location.href = url; }
      } else {
        const nativeOpen = window.__JC_NATIVE_OPEN;
        if (nativeOpen) nativeOpen(url, '_blank');
        else window.location.assign(url);
      }
    } catch (error) {
      if (popup) popup.close();
      throw error;
    }
  }

  async function openVipApkLink() {
    // Abre a aba durante o clique real para evitar bloqueio do navegador.
    // Depois reutiliza o link salvo localmente; só consulta o Supabase quando
    // ainda não há cache do VIP neste navegador.
    const openReal = window.__JC_NATIVE_OPEN || window.open;
    const popup = openReal ? openReal('about:blank', '_blank') : null;
    try {
      configureFlow('vip');
      const cacheKey = 'jc_activation_vip_link_cache_v1';
      let cached = null;
      try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (_) {}
      let url = String(cached?.apkUrl || '').trim();
      if (!url) {
        await loadDeliveryOptions('vip');
        url = String(state.links?.[0]?.value || '').trim();
        if (url) localStorage.setItem(cacheKey, JSON.stringify({ apkUrl:url, savedAt:new Date().toISOString() }));
      }
      if (!url) throw new Error('APK VIP ainda não configurado.');
      if (popup) {
        try { popup.opener = null; } catch (_) {}
        popup.location.replace(url);
      } else {
        window.location.assign(url);
      }
    } catch (error) {
      if (popup) try { popup.close(); } catch (_) {}
      throw error;
    }
  }


  async function generateVipOnly() {
    await enforceDeadlinesOnce();
    const type = configureFlow('vip');
    state.deliveryMode = 'real';
    state.testSettings = null;
    state.batchType = type;
    const api = getApi();
    const profile = api?.profile?.() || {};
    // No ADM, o VIP precisa seguir a mesma lógica do Ativador 16: escolher
    // o cliente antes de gerar. Usar o perfil do próprio ADM como cliente
    // fazia o backend recusar a geração. Para cliente logado, usa o próprio perfil.
    state.client = api?.mode?.() === 'admin'
      ? null
      : (profile?.id ? profile : {
          id: null,
          full_name: profile.full_name || profile.username || 'Cliente',
          whatsapp: profile.whatsapp || profile.whatsapp2 || profile.whatsapp3 || ''
        });
    try {
      const result = await generateRealSingle(type);
      state.last.vip = result;
      state.generated = [result];
      state.session.vip += 1;
      localStorage.setItem('jc_activation_generated_vip', String(counterTotal('vip') + 1));
      updateCounters();
      const activation = $('vip_activation_code');
      if (activation) activation.textContent = result.code;
      const download = $('vip_download_code');
      if (download) {
        await loadDeliveryOptions(type);
        download.textContent = String(state.codes?.[0]?.value || '-------');
      }
      A.toast('Código VIP gerado. Envie pelo WhatsApp somente quando desejar.', 'success');
      return result;
    } catch (error) {
      A.toast(error.message || String(error), 'error');
      return null;
    }
  }

  async function prepareTestOnly() {
    const available = availableAutomaticTestTypes();
    const type = await chooseAutomaticTestType(available);
    if (!type) return null;
    configureFlow(type);
    const settings = await loadTestSettings(type);
    const activation = $('trial_activation_code');
    const download = $('trial_download_code');
    if (activation) activation.textContent = settings.code;
    if (download) download.textContent = settings.downloadCode || '-------';
    state.session.test += 1;
    localStorage.setItem('jc_activation_generated_test', String(counterTotal('test') + 1));
    updateCounters();
    state.last.testType = type;
    const label = type === 'vip' ? 'VIP' : ('Ativador ' + type + ' dígitos');
    const title = document.querySelector('#trial_panel [data-jc-test-auto] .btn-title');
    const subtitle = document.querySelector('#trial_panel [data-jc-test-auto] .btn-subtitle');
    if (title) title.textContent = 'TESTE ' + label.toUpperCase() + ' (3 DIAS)';
    if (subtitle) subtitle.textContent = 'APK, link e código próprios desta versão';
    A.toast('Teste ' + label + ' preparado. Envie pelo WhatsApp somente quando desejar.', 'success');
  }

  async function copyVisualCode(id) {
    const value = String($(id)?.textContent || '').trim();
    if (!value || /^[-]+$/.test(value)) throw new Error('Gere o código primeiro.');
    if (window.JC_GENERATOR_UI?.copyText) await window.JC_GENERATOR_UI.copyText(value);
    else await navigator.clipboard.writeText(value);
    A.toast('Código copiado.', 'success');
  }

  async function openSingle(type) {
    await enforceDeadlinesOnce();
    const codeType = configureFlow(type);
    state.deliveryMode = 'real'; state.testSettings = null;
    setQuantityMode(false);
    const globalLast = window.JC_LAST_ACTIVATION;
    let last = state.flow === 'vip' ? (state.last.vip || null) : (state.last[codeType] || (String(globalLast?.type || '') === String(codeType) ? globalLast : null) || readDomActivation(codeType));
    ensureModal(); state.batchType = codeType;
    state.client = last?.client || (last ? { id:last.client_id,full_name:last.client_name,whatsapp:last.whatsapp } : null);
    $('jc_act_title').textContent = state.flow === 'vip' ? 'VIP-Ativador — preparar envio real' : `Ativador ${codeType} — preparar envio real`;
    $('jc_act_qty').value = 1; $('jc_act_client_label').value = last?.client_name || 'Escolha o cliente'; $('jc_act_phone').value = last?.whatsapp || '';
    await loadDeliveryOptions(codeType);
    if (!state.client) await chooseClient();
    if (!state.client) return;
    if (!last) {
      try { $('jc_act_result').textContent = 'Gerando o código real...'; last = await generateRealSingle(codeType); if(state.flow !== 'vip') state.last[codeType] = last; }
      catch (error) { A.toast(error.message || String(error), 'error'); return; }
    }
    state.generated = [last]; renderDeviceRows(); document.querySelector('[data-generated]').textContent = last.code;
    $('jc_activation_delivery_modal').classList.add('show'); clearInterval(state.timer);
    $('jc_act_countdown').textContent = 'Código real pronto. Escolha a versão, o link e o código de download antes de enviar.';
    $('jc_act_generate').disabled = true; $('jc_act_copy_message').disabled = false; $('jc_act_open_whats').disabled = false;
  }

  function closeModal() {
    clearInterval(state.timer);
    $("jc_activation_delivery_modal")?.classList.remove("show");
  }

  function batchCreditRule(type) {
    const api = getApi();
    const profile = api?.profile?.();
    // O ADM tem acesso total e nunca depende de saldo ou liberação de cliente.
    // O modo Teste também é sempre gratuito e não pode consumir créditos.
    if (api?.mode?.() === "admin" || state.deliveryMode === "test") return { charged: false, cost: 0, balance: Infinity, fn: null };
    if (String(profile?.account_type) !== "credits") return { charged: false, cost: 0, balance: Infinity, fn: null };
    const functionId = state.flow === 'vip' ? 'activatorvip.generate' : `activator${type}.generate`;
    const fn = (getApi()?.functions?.() || []).find((item) => item.id === functionId);
    const cost = Number(fn?.credit_cost || 0);
    if (String(fn?.credit_mode) !== "credits" || cost <= 0) return { charged: false, cost: 0, balance: Number(profile?.credits_balance || 0), fn };
    return { charged: true, cost, balance: Number(profile?.credits_balance || 0), fn };
  }

  function validateBatchCreditCapacity(type, quantity) {
    const rule = batchCreditRule(type);
    if (!rule.charged) return rule;
    const total = rule.cost * Math.max(1, Number(quantity || 1));
    if (rule.balance < total) {
      throw new Error(`Saldo insuficiente. Este lote precisa de ${total} créditos e o saldo atual é ${rule.balance}. Reduza a quantidade ou adicione créditos antes de gerar.`);
    }
    return rule;
  }

  async function chargeAfterSuccess(type, operationId) {
    const api = getApi();
    const profile = api?.profile?.();
    // Proteção final: teste e administrador jamais descontam créditos.
    if (api?.mode?.() === "admin" || state.deliveryMode === "test") return true;
    const rule = batchCreditRule(type);
    if (!rule.charged) return true;
    if (Number(profile?.credits_balance || 0) < rule.cost) throw new Error("Saldo insuficiente para concluir esta geração.");
    const { data, error } = await A.client.rpc("consume_credit", { p_function_id: rule.fn.id, p_operation_id: operationId });
    if (error) throw error;
    if (data?.balance != null && profile) profile.credits_balance = data.balance;
    return true;
  }

  async function generateBatch() {
    const api = getApi();
    if (!api?.generate) throw new Error("Gerador ainda não carregado.");
    if (!state.client) await chooseClient();
    if (!state.client) throw new Error("Escolha o cliente antes de gerar.");
    const rows = [...document.querySelectorAll("[data-device]")];
    validateBatchCreditCapacity(state.batchType, rows.length);
    state.generated = [];
    $("jc_act_generate").disabled = true;
    $("jc_act_result").textContent = "Gerando códigos. Não feche esta janela...";

    for (let index = 0; index < rows.length; index += 1) {
      const operationId = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + index;
      try {
        const permissionId = state.flow === 'vip' ? 'activators.mass.vip' : `activators.mass.${state.batchType}`;
        const result = await api.generate(state.batchType, { client: state.client, origin: state.flowOrigin, operationScope:'mass', requiredPermissionId:permissionId });
        if (!result?.ok || !result.code) throw new Error("Código não retornado.");
        await chargeAfterSuccess(state.batchType, operationId);
        const selection = rowSelection(rows[index]);
        const item = {
          ...result,
          device: index + 1,
          ...selection,
          activation_deadline: result.activation_deadline || new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
        };
        state.generated.push(item);
        rows[index].querySelector("[data-generated]").textContent = result.code;
      } catch (error) {
        rows[index].querySelector("[data-generated]").textContent = "Falha: " + (error.message || error);
      }
    }

    $("jc_act_result").textContent = `${state.generated.length} de ${rows.length} código(s) gerado(s) com sucesso.${state.generated.length < rows.length ? " Os itens que falharam não foram cobrados." : ""}`;
    $("jc_act_copy_message").disabled = !state.generated.length;
    $("jc_act_open_whats").disabled = !state.generated.length;
    await logAction("batch_generated", {
      quantity_requested: rows.length,
      quantity_generated: state.generated.length,
      codes: state.generated.map((item) => item.code),
    });
    if (state.generated.length) {
      const massType = state.flow === 'vip' ? 'vip' : state.batchType;
      document.dispatchEvent(new CustomEvent('jc:report-action', { detail: {
        function_id: `activators.mass.${massType}`,
        function_name: massType === 'vip' ? 'VIP em massa' : `${massType} dígitos em massa`,
        category: 'Operações em Massa',
        item_label: massType === 'vip' ? 'VIP em massa' : `${massType} dígitos em massa`,
        status: 'completed',
        quantity: state.generated.length,
        requested_quantity: rows.length,
        operation_id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      }}));
    }
  }

  function buildMessage() {
    mergeCurrentSelections();
    if (state.deliveryMode === 'test') {
      const t = state.testSettings || {};
      const fallback = ['Olá! 👋','','Seu teste da *JC APK TV* foi preparado com sucesso.','','🧪 *TESTE GRÁTIS POR 3 DIAS*','','O teste está disponível somente para aparelhos que ainda não utilizaram o aplicativo UniTV Mensal. Caso o aplicativo já tenha sido utilizado anteriormente, será necessário adquirir uma licença de ativação permanente, sem mensalidades.','',`📦 *Produto:* ${currentProductLabel()} — Teste de 3 dias`,'','📺 *Aparelho 1*','• *Versão:* Tradicional',`• *Código de download — Opção 1:* \`${t.downloadCode || ''}\``,'','🔗 *Link direto para instalação:*',t.apkUrl || '','', '▶️ *Tutorial de como utilizar:*',t.tutorialUrl || state.tutorialUrl || '','', '⏱️ *Duração do teste*','',`O próprio APK de teste controla automaticamente os ${t.durationDays || 3} dias. O teste não funcionará em aparelhos que já tenham utilizado o aplicativo UniTV Mensal.`,'','⚠️ *IMPORTANTE — TESTE GRATUITO*','','Não oferecemos suporte para instalação durante o período de teste gratuito. Siga corretamente o tutorial enviado acima.','','O suporte para instalação é disponibilizado somente após a compra do código de ativação.'];
      let template = String(t.message || '').trim().replace(/\\n/g, '\n');
      const legacyShortMessage = /^🧪\s*\*?TESTE GRÁTIS POR 3 DIAS\*?[\s\S]*não (?:consome|gera) código/i.test(template);
      if (!template || legacyShortMessage) return fallback.join('\n');
      return template.replaceAll('{{TIPO_ATIVADOR}}',currentProductLabel()).replaceAll('{{CODIGO_TESTE}}',t.code||state.generated[0]?.code||'').replaceAll('{{CODIGO_DOWNLOAD}}',t.downloadCode||'').replaceAll('{{LINK_VIDEO_TUTORIAL}}',t.tutorialUrl||state.tutorialUrl||'').replaceAll('{{DURACAO_DIAS}}',String(t.durationDays||3)).replaceAll('{{LINK_APK_TESTE}}',t.apkUrl||'');
    }
    const type = state.batchType;
    const messageVersion = (value) => {
      const label = String(value || "Versão atualizada").trim();
      return /^vers[aã]o\s+tradicional$/i.test(label) ? "Tradicional" : label;
    };
    const lines = [
      "Olá! 👋",
      "",
      "Seus acessos da *JC APK TV* foram preparados com sucesso.",
      "",
      `📦 *Produto:* ${currentProductLabel()}`,
      "",
    ];
    state.generated.forEach((item, index) => {
      lines.push(
        `📺 *Aparelho ${index + 1}*`,
        `• *Versão:* ${messageVersion(item.version)}`,
      );
      if (item.download?.value) {
        lines.push(`• *Código de download — ${item.download.label || "Opção 1"}:* \`${item.download.value}\``);
      }
      if (item.link?.value) {
        lines.push(
          "",
          "🔗 *Link direto para instalação:*",
          item.link.value,
        );
      }
      lines.push(
        "",
        "🔑 *Código de ativação:*",
        `\`${item.code}\``,
        "",
      );
    });
    if (state.tutorialUrl) {
      lines.push(
        "▶️ *Tutorial de como utilizar:*",
        state.tutorialUrl,
        "",
      );
    }
    lines.push(
      "🚨 *IMPORTANTE — APÓS A ATIVAÇÃO*",
      "",
      "Assim que a ativação for concluída e o aplicativo estiver funcionando normalmente, *desinstale o Ativador do aparelho*.",
      "",
      "Antes de desinstalar, confirme que está tudo funcionando corretamente.",
      "",
      "⚠️ *Uso exclusivo por aparelho*",
      "Cada código de ativação funciona em somente um aparelho e não deve ser reutilizado em outro dispositivo.",
      "",
      "⏱️ *Prazo para ativação*",
      "Utilize o código em até 36 horas após a geração. Depois desse período, códigos ainda não ativados poderão ser bloqueados preventivamente até a verificação do motivo.",
    );
    return lines.join("\n");
  }

  function historyVersionLabel() {
    mergeCurrentSelections();
    const labels = [...new Set(state.generated.map((item) => item.version).filter(Boolean))];
    return labels.length === 1 ? labels[0] : labels.length > 1 ? "Múltiplas versões" : "Versão atualizada";
  }

  function historySelections() {
    mergeCurrentSelections();
    return state.generated.map((item, index) => ({
      device: index + 1,
      version: item.version || "Versão atualizada",
      link_label: item.link?.label || null,
      download_label: item.download?.label || null,
    }));
  }

  async function logAction(action, metadata = {}) {
    try {
      const phone = normalizePhone($("jc_act_phone")?.value);
      await A.client.rpc("jc_log_activation_delivery", {
        p_payload: {
          client_id: state.client?.id || state.generated[0]?.client_id || null,
          activator_type: state.batchType,
          action,
          phone,
          phone_full: phone || null,
          save_whatsapp: Boolean($("jc_act_save_phone")?.checked),
          quantity: state.generated.length || 1,
          codes: state.generated.map((item) => item.code),
          version_label: historyVersionLabel(),
          metadata: {
            ...metadata,
            phone_full: phone || null,
            tutorial_url: state.tutorialUrl || null,
            selections: historySelections(),
            delivery_mode: state.deliveryMode,
            activator_origin: state.flowOrigin,
            test_duration_days: state.testSettings?.durationDays || null,
          },
        },
      });
    } catch (error) {
      console.warn("Histórico de envio:", error.message || error);
    }
  }

  async function copyMessage() {
    const text = buildMessage();
    if (window.JC_GENERATOR_UI?.copyText) await window.JC_GENERATOR_UI.copyText(text, $("jc_act_copy_message"));
    else await navigator.clipboard.writeText(text);
    await logAction("message_copied", { message_length: text.length });
  }

  async function logTestDelivery(phone, text) {
    if (state.deliveryMode !== 'test') return;
    const t = state.testSettings || {};
    const user = (await A.client.auth.getUser()).data?.user;
    const { error } = await A.client.from('jc_test_deliveries').insert({client_id:state.client?.id||null,actor_id:user?.id||null,activator_type:String(state.batchType),activator_origin:String(state.generated[0]?.origin||state.flowOrigin),phone_full:phone,phone_masked:maskPhone(phone),test_code:t.code||state.generated[0]?.code||'',download_code:t.downloadCode||'',apk_url:t.apkUrl||'',tutorial_url:t.tutorialUrl||state.tutorialUrl||'',message_text:text,duration_days:Number(t.durationDays||3),status:'whatsapp_opened',metadata:{source:'activation-delivery.js'}});
    if (error) console.warn('Histórico de teste:', error.message || error);
  }

  async function openWhats() {
    if (state.whatsappOpening) return;
    const button = $("jc_act_open_whats");
    const phone = normalizePhone($("jc_act_phone").value);
    if (phone.length < 12) throw new Error("Digite o WhatsApp com DDD.");
    const text = buildMessage();
    const url = "https://api.whatsapp.com/send?phone=" + phone + "&text=" + encodeURIComponent(text);

    state.whatsappOpening = true;
    if (button) button.disabled = true;
    let opened = null;
    try {
      // Abre somente uma janela. A versão anterior fazia uma segunda tentativa
      // quando o navegador retornava null por causa do noopener, duplicando o texto.
      opened = window.open("about:blank", "_blank");
      if (opened) {
        try { opened.opener = null; } catch (_) {}
        opened.location.href = url;
      }
      if (!opened) {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        throw new Error("O navegador bloqueou a abertura do WhatsApp. A mensagem foi copiada; abra o WhatsApp e cole manualmente.");
      }
      await logTestDelivery(phone, text);
      await logAction(state.deliveryMode === 'test' ? "test_whatsapp_opened" : "whatsapp_opened", { phone_masked: maskPhone(phone), message_length: text.length, url_type: "api.whatsapp.com", single_open: true });
    } finally {
      window.setTimeout(() => {
        state.whatsappOpening = false;
        if (button && state.generated.length) button.disabled = false;
      }, 1200);
    }
  }

  async function logDirectAction(type, action, detail = {}, metadata = {}) {
    try {
      const current = detail || state.last[type] || {};
      const client = current.client || {};
      await A.client.rpc("jc_log_activation_delivery", {
        p_payload: {
          client_id: current.client_id || client.id || null,
          activator_type: String(type),
          action,
          phone: current.whatsapp || client.whatsapp || "",
          phone_full: normalizePhone(current.whatsapp || client.whatsapp || "") || null,
          save_whatsapp: false,
          quantity: 1,
          codes: current.code ? [current.code] : [],
          version_label: current.version_label || "",
          metadata: {
            ...metadata,
            phone_full: normalizePhone(current.whatsapp || client.whatsapp || "") || null,
          },
        },
      });
    } catch (error) {
      console.warn("Histórico direto:", error.message || error);
    }
  }

  function bindCopyHistory() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("#btn_copiar_codigo_11,#btn_copiar_codigo_16,#btn_copiar_codigo_download_11,#btn_copiar_codigo_download_16");
      if (!button) return;
      const type = button.id.includes("_11") ? "11" : "16";
      const action = button.id.includes("download") ? "download_code_copied" : "activation_code_copied";
      setTimeout(() => logDirectAction(type, action, state.last[type], { button_id: button.id }), 80);
    }, false);
  }

  function onGenerated(detail) {
    const type = String(detail.type);
    if (!["11", "16"].includes(type) || !detail.code) return;
    state.last[type] = detail;
    state.session[type] += 1;
    localStorage.setItem("jc_activation_generated_" + type, String(counterTotal(type) + 1));
    const button = document.querySelector(`[data-jc-whats="${type}"]`);
    if (button) button.disabled = false;
    updateCounters();
    logDirectAction(type, "activation_generated", detail, { activation_deadline: detail.activation_deadline || null });
  }

  async function init() {
    injectStyles();
    addTools("11");
    addTools("16");
    document.querySelectorAll("#digits_mass_panel [data-jc-batch]").forEach((button) => {
      if(button.dataset.jcBatch === 'config') return;
      button.onclick = () => openBatch(['11','16','vip'].includes(button.dataset.jcBatch) ? button.dataset.jcBatch : '11');
    });
    document.querySelectorAll('[data-jc-test-type]').forEach((button) => { button.onclick = () => openTestSingle(button.dataset.jcTestType); });
    syncVisibleTestChoices();
    document.addEventListener('jc:access-ready', syncVisibleTestChoices);
    document.querySelectorAll('[data-jc-test-auto],[data-jc-test-whatsapp]').forEach((button) => { button.onclick = () => openAutomaticTest(); });
    document.querySelectorAll('[data-jc-test-generate],[data-jc-test-download-generate]').forEach((button) => { button.onclick = () => prepareTestOnly(); });
    document.querySelectorAll('[data-jc-test-copy]').forEach((button) => { button.onclick = () => copyVisualCode('trial_download_code').catch((e)=>A.toast(e.message||String(e),'error')); });
    document.querySelectorAll('[data-jc-vip-whatsapp]').forEach((button) => { button.onclick = () => openSingle('vip'); });
    document.querySelectorAll('[data-jc-vip-generate]').forEach((button) => { button.onclick = () => generateVipOnly(); });
    document.querySelectorAll('[data-jc-vip-copy-activation]').forEach((button) => { button.onclick = () => copyVisualCode('vip_activation_code').catch((e)=>A.toast(e.message||String(e),'error')); });
    document.querySelectorAll('[data-jc-test-copy-activation]').forEach((button) => { button.onclick = () => copyVisualCode('trial_activation_code').catch((e)=>A.toast(e.message||String(e),'error')); });
    document.querySelectorAll('[data-jc-test-open-link]').forEach((button) => { button.dataset.jcFreeAction='true'; button.onclick = () => openPreparedTestLink().catch((e)=>A.toast(e.message||String(e),'error')); });
    document.querySelectorAll('[data-jc-vip-open-link]').forEach((button) => { button.onclick = () => openVipApkLink().catch((e)=>A.toast(e.message||String(e),'error')); });
    document.querySelectorAll('[data-jc-vip-download-generate]').forEach((button) => { button.addEventListener('click', async () => { await loadDeliveryOptions(configureFlow('vip')); const el=$('vip_download_code'); if(el) el.textContent=String(state.codes?.[0]?.value||'-------'); }); });
    document.querySelectorAll('[data-jc-vip-copy]').forEach((button) => { button.addEventListener('click', () => copyVisualCode('vip_download_code').catch((e)=>A.toast(e.message||String(e),'error'))); });
    document.querySelector('[data-jc-vip-batch]')?.addEventListener('click', () => openBatch('vip'));
    ensureModal();
    bindCopyHistory();
    document.addEventListener("jc:activation-generated", (event) => onGenerated(event.detail || {}));
    // Economia de Supabase: a conferência de prazo de 36h não roda mais ao abrir o index.
    // Ela é executada somente quando o operador abre envio individual ou em lote.
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  window.JC_ACTIVATION_DELIVERY = { openBatch, openSingle, openTest: openTestSingle, openAutomaticTest, generateVipOnly, prepareTestOnly, buildMessage };
})();
