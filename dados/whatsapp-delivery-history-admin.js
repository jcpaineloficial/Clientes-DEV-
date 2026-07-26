(function () {
  "use strict";

  const A = window.JC_APP;
  const $ = (id) => document.getElementById(id);
  const labels = {
    activation_generated: "Código gerado",
    batch_generated: "Lote gerado",
    activation_code_copied: "Código copiado",
    download_code_copied: "Código de download copiado",
    message_copied: "Mensagem copiada",
    whatsapp_opened: "Mensagem preparada / WhatsApp aberto",
  };

  const state = {
    loaded: false,
    loading: false,
    rows: [],
    profiles: new Map(),
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function normalizePhone(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) digits = "55" + digits;
    return digits.slice(0, 13);
  }

  function formatPhone(value) {
    const digits = normalizePhone(value);
    const local = digits.startsWith("55") ? digits.slice(2) : digits;
    if (local.length === 11) return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    if (local.length === 10) return `+55 (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    return digits ? `+${digits}` : "—";
  }

  function fmt(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
  }

  function metadataOf(row) {
    if (row?.metadata && typeof row.metadata === "object") return row.metadata;
    try { return JSON.parse(String(row?.metadata || "{}")); } catch (_) { return {}; }
  }

  function codesOf(row) {
    if (Array.isArray(row?.codes)) return row.codes.map(String).filter(Boolean);
    const metadata = metadataOf(row);
    return Array.isArray(metadata.codes) ? metadata.codes.map(String).filter(Boolean) : [];
  }

  function profileOf(id) {
    return id ? state.profiles.get(String(id)) || null : null;
  }

  function profileName(id, fallback) {
    const profile = profileOf(id);
    return profile?.full_name || profile?.username || fallback;
  }

  function profilePhones(profile) {
    return [profile?.whatsapp, profile?.whatsapp2, profile?.whatsapp3]
      .map(normalizePhone)
      .filter((phone, index, list) => phone.length >= 12 && list.indexOf(phone) === index);
  }

  function rowPhone(row) {
    const metadata = metadataOf(row);
    const direct = [
      row?.phone_full,
      row?.phone,
      row?.whatsapp,
      metadata.phone_full,
      metadata.phone,
      metadata.whatsapp,
    ].map(normalizePhone).find((phone) => phone.length >= 12);
    if (direct) return { value: direct, exact: true, source: "registro" };

    const profile = profileOf(row?.client_id);
    const candidates = profilePhones(profile);
    const last4 = String(row?.phone_masked || "").replace(/\D/g, "").slice(-4);
    const matched = last4 ? candidates.find((phone) => phone.endsWith(last4)) : null;
    if (matched) return { value: matched, exact: true, source: "cadastro do cliente" };
    if (candidates[0]) return { value: candidates[0], exact: true, source: "WhatsApp principal atual" };
    return { value: String(row?.phone_masked || ""), exact: false, source: "registro antigo mascarado" };
  }

  function selectionText(row) {
    const selections = metadataOf(row).selections;
    if (!Array.isArray(selections) || !selections.length) return "—";
    return selections.map((item) => {
      const parts = [`Aparelho ${item.device || "—"}`, item.version || row.version_label || "Versão não informada"];
      if (item.download_label) parts.push(`download: ${item.download_label}`);
      if (item.link_label) parts.push(`link: ${item.link_label}`);
      return parts.join(" • ");
    }).join(" | ");
  }

  async function fetchAllHistory() {
    const rows = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await A.client
        .from("jc_activation_delivery_history")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const batch = data || [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }
    return rows;
  }

  async function loadProfiles(rows) {
    state.profiles = new Map();
    const ids = [...new Set(rows.flatMap((row) => [row.client_id, row.actor_id]).filter(Boolean).map(String))];
    for (let start = 0; start < ids.length; start += 200) {
      const { data, error } = await A.client
        .from("profiles")
        .select("id,full_name,username,email,whatsapp,whatsapp2,whatsapp3")
        .in("id", ids.slice(start, start + 200));
      if (error) {
        console.warn("Perfis do histórico:", error.message || error);
        continue;
      }
      (data || []).forEach((profile) => state.profiles.set(String(profile.id), profile));
    }
  }

  function dateOnly(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function filteredRows() {
    const query = String($("historySearch")?.value || "").trim().toLowerCase();
    const type = $("historyType")?.value || "";
    const action = $("historyAction")?.value || "";
    const from = $("historyFrom")?.value || "";
    const to = $("historyTo")?.value || "";

    return state.rows.filter((row) => {
      const phone = rowPhone(row);
      const codes = codesOf(row);
      const client = profileName(row.client_id, "Venda direta / sem cliente");
      const actor = profileName(row.actor_id, "Operador");
      const haystack = [
        client,
        actor,
        row.activator_type,
        labels[row.action] || row.action,
        row.version_label,
        phone.value,
        row.phone_masked,
        selectionText(row),
        ...codes,
      ].join(" ").toLowerCase();
      const day = dateOnly(row.created_at);
      return (!query || haystack.includes(query))
        && (!type || String(row.activator_type) === type)
        && (!action || row.action === action)
        && (!from || day >= from)
        && (!to || day <= to);
    });
  }

  function uniquePhones(rows) {
    return [...new Set(rows.map((row) => rowPhone(row)).filter((phone) => phone.exact).map((phone) => normalizePhone(phone.value)).filter((phone) => phone.length >= 12))];
  }

  function updateStats(rows) {
    const opened = rows.filter((row) => row.action === "whatsapp_opened").length;
    const clients = new Set(rows.map((row) => row.client_id || profileName(row.client_id, "Venda direta / sem cliente"))).size;
    $("statTotal").textContent = String(rows.length);
    $("statOpened").textContent = String(opened);
    $("statClients").textContent = String(clients);
    $("statPhones").textContent = String(uniquePhones(rows).length);
    $("historyCount").textContent = `${rows.length} registro(s) exibido(s)`;
  }

  function phoneCell(row) {
    const phone = rowPhone(row);
    if (!phone.exact) {
      return `<div class="phone-box old"><b>${esc(phone.value || "—")}</b><small>${esc(phone.source)}</small></div>`;
    }
    const normalized = normalizePhone(phone.value);
    return `<div class="phone-box"><b>${esc(formatPhone(normalized))}</b><small>${esc(normalized)} • ${esc(phone.source)}</small><div class="mini-actions"><button type="button" class="mini-btn" data-copy-phone="${esc(normalized)}">Copiar</button><button type="button" class="mini-btn whatsapp" data-open-phone="${esc(normalized)}">WhatsApp</button></div></div>`;
  }

  function render() {
    const rows = filteredRows();
    updateStats(rows);
    const body = $("historyBody");
    const mobile = $("historyMobile");
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="9" class="empty-cell">Nenhum registro encontrado.</td></tr>';
      mobile.innerHTML = '<div class="mobile-card empty-card">Nenhum registro encontrado.</div>';
      return;
    }

    body.innerHTML = rows.map((row) => {
      const codes = codesOf(row);
      return `<tr>
        <td>${esc(fmt(row.created_at))}</td>
        <td><b>${esc(profileName(row.client_id, "Venda direta / sem cliente"))}</b></td>
        <td><span class="pill">${esc(row.activator_type || "—")} dígitos</span></td>
        <td><span class="action-pill">${esc(labels[row.action] || row.action || "—")}</span><small>${Number(row.quantity || 1)} item(ns)</small></td>
        <td>${phoneCell(row)}</td>
        <td><div class="code-list">${codes.length ? codes.map((code) => `<span>${esc(code)}</span>`).join("") : "—"}</div></td>
        <td>${esc(row.version_label || "—")}</td>
        <td>${esc(profileName(row.actor_id, "Operador"))}</td>
        <td><details><summary>Ver dados</summary><div class="details-text">${esc(selectionText(row))}</div></details></td>
      </tr>`;
    }).join("");

    mobile.innerHTML = rows.map((row) => {
      const codes = codesOf(row);
      return `<article class="mobile-card">
        <div class="mobile-head"><div><b>Ativador ${esc(row.activator_type || "—")} — ${esc(labels[row.action] || row.action || "—")}</b><small>${esc(fmt(row.created_at))}</small></div><span class="pill">${Number(row.quantity || 1)}</span></div>
        <div class="mobile-data"><b>Cliente:</b> ${esc(profileName(row.client_id, "Venda direta / sem cliente"))}<br><b>Responsável:</b> ${esc(profileName(row.actor_id, "Operador"))}<br><b>Versão:</b> ${esc(row.version_label || "—")}</div>
        ${phoneCell(row)}
        <div class="code-list">${codes.length ? codes.map((code) => `<span>${esc(code)}</span>`).join("") : "Sem código registrado"}</div>
        <details><summary>Dados dos aparelhos</summary><div class="details-text">${esc(selectionText(row))}</div></details>
      </article>`;
    }).join("");
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    $("historyStatus").textContent = "Carregando histórico completo...";
    $("reloadHistoryBtn").disabled = true;
    try {
      state.rows = await fetchAllHistory();
      await loadProfiles(state.rows);
      state.loaded = true;
      $("historyStatus").textContent = `${state.rows.length} registro(s) carregado(s). Os números novos são preservados por inteiro; registros antigos usam o cadastro atual do cliente quando disponível.`;
      render();
    } catch (error) {
      const message = error?.message || "Não foi possível carregar o histórico.";
      $("historyStatus").textContent = message;
      $("historyBody").innerHTML = `<tr><td colspan="9" class="empty-cell error">${esc(message)}</td></tr>`;
      $("historyMobile").innerHTML = `<div class="mobile-card empty-card error">${esc(message)}</div>`;
    } finally {
      state.loading = false;
      $("reloadHistoryBtn").disabled = false;
    }
  }

  async function copyFilteredPhones() {
    const phones = uniquePhones(filteredRows());
    if (!phones.length) {
      A.toast("Nenhum número completo disponível neste filtro.", "error");
      return;
    }
    await A.copy(phones.join("\n"));
    A.toast(`${phones.length} número(s) completo(s) copiado(s).`);
  }

  function bind() {
    ["historySearch", "historyType", "historyAction", "historyFrom", "historyTo"].forEach((id) => {
      const element = $(id);
      if (!element) return;
      element.addEventListener(element.tagName === "INPUT" ? "input" : "change", render);
    });
    $("reloadHistoryBtn").addEventListener("click", load);
    $("clearFiltersBtn").addEventListener("click", () => {
      ["historySearch", "historyType", "historyAction", "historyFrom", "historyTo"].forEach((id) => { if ($(id)) $(id).value = ""; });
      render();
    });
    $("copyFilteredPhonesBtn").addEventListener("click", () => copyFilteredPhones().catch((error) => A.toast(error.message || String(error), "error")));
    document.addEventListener("click", (event) => {
      const copyButton = event.target.closest("[data-copy-phone]");
      if (copyButton) {
        A.copy(copyButton.dataset.copyPhone).then(() => A.toast("Número completo copiado.")).catch((error) => A.toast(error.message, "error"));
        return;
      }
      const openButton = event.target.closest("[data-open-phone]");
      if (openButton) {
        window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent(openButton.dataset.openPhone)}`, "_blank", "noopener,noreferrer");
      }
    });
  }

  function init() {
    bind();
    if (window.JC_ADMIN_ACCESS) load();
    else document.addEventListener("jc:admin-liberado", load, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
