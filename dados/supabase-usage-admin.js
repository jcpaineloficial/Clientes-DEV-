(function () {
  "use strict";
  const A = window.JC_APP;
  const CACHE_KEY = "jc_supabase_usage_v2";
  const CACHE_MS = 15 * 60 * 1000;
  const ACCOUNT_CACHE_PREFIX = "jc_monthly_account_usage_v1_";
  const ACCOUNT_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
  let started = false;
  let lastAccountData = null;
  let lastAccountSource = "";
  const $ = (id) => document.getElementById(id);

  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]); }
  function number(value) { return Number(value || 0).toLocaleString("pt-BR"); }
  function bytes(value) {
    const total = Math.max(0, Number(value || 0));
    if (total < 1024) return `${number(total)} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let size = total / 1024;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
    return `${size.toLocaleString("pt-BR", { minimumFractionDigits: size < 10 ? 2 : 0, maximumFractionDigits: size < 10 ? 2 : 1 })} ${units[index]}`;
  }
  function dateTime(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR"); }
  function shortDate(value) { const d = new Date(value + "T12:00:00"); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR", {day:"2-digit", month:"2-digit"}); }
  function projectRef() { const url = String((A && A.cfg && A.cfg.url) || ""); const m = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i); return m ? m[1] : ""; }
  function dashboardUrl() { const ref = projectRef(); return ref ? `https://supabase.com/dashboard/project/${encodeURIComponent(ref)}` : "https://supabase.com/dashboard"; }
  function readCache() { try { const p = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); return p && p.savedAt && p.data ? p : null; } catch (_) { return null; } }
  function saveCache(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({savedAt:Date.now(),data})); } catch (_) {} }

  function renderRows(id, rows, emptyText) {
    const body = $(id); if (!body) return;
    if (!Array.isArray(rows) || !rows.length) { body.innerHTML = `<tr><td colspan="4" class="empty">${esc(emptyText)}</td></tr>`; return; }
    body.innerHTML = rows.map((row) => `<tr><td><b>${esc(row.bucket_id || row.table_name || "—")}</b></td><td>${esc(row.pretty || "0 bytes")}</td><td>${number(row.objects != null ? row.objects : row.estimated_rows)}</td><td>${number(row.bytes)}</td></tr>`).join("");
  }

  function renderBarChart(id, rows, labelKey, limit) {
    const root = $(id); if (!root) return;
    const items = (Array.isArray(rows) ? rows : []).slice(0, limit || 8);
    if (!items.length) { root.innerHTML = '<div class="muted">Sem dados para o gráfico.</div>'; return; }
    const max = Math.max(1, ...items.map((r) => Number(r.bytes || 0)));
    root.innerHTML = items.map((r) => { const pct = Math.max(1, Math.round((Number(r.bytes || 0) / max) * 100)); return `<div class="bar-row"><div class="bar-label">${esc(r[labelKey] || "—")}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><div class="bar-value">${esc(r.pretty || "0 B")}</div></div>`; }).join("");
  }

  function renderDaily(rows) {
    const root = $("dailyChart"); if (!root) return;
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) { root.innerHTML = '<div class="muted">Sem atividade registrada.</div>'; return; }
    const max = Math.max(1, ...items.map((r) => Number(r.total || 0)));
    root.innerHTML = items.map((r) => { const value = Number(r.total || 0); const height = value ? Math.max(4, Math.round((value / max) * 100)) : 1; return `<div class="chart-col"><div class="chart-tip">${esc(shortDate(r.date))}: ${number(value)}</div><div class="chart-bar" style="height:${height}%"></div></div>`; }).join("");
  }

  function render(data, source) {
    const database = data.database || {}, storage = data.storage || {}, activity = data.activity || {};
    $("databaseSize").textContent = database.pretty || "0 bytes";
    $("storageSize").textContent = storage.pretty || "0 bytes";
    $("storageObjects").textContent = number(storage.objects);
    $("activity30d").textContent = number(activity.last_30_days);
    $("activity30dMirror").textContent = number(activity.last_30_days);
    $("activityToday").textContent = number(activity.today);
    $("activity7d").textContent = number(activity.last_7_days);
    $("real30d").textContent = number(activity.real_last_30_days);
    $("test30d").textContent = number(activity.test_last_30_days);
    $("generatedAt").textContent = dateTime(data.generated_at);
    $("dataSource").textContent = source === "cache" ? "Cache local de 15 minutos" : "Consulta nova ao Supabase";
    $("scopeNote").innerHTML = activity.scope_available ? "" : '<span>Observação: a tabela atual ainda não possui <b>record_scope</b>; por isso os registros existentes aparecem como reais.</span>';
    renderDaily(activity.daily);
    renderBarChart("bucketChart", storage.buckets, "bucket_id", 8);
    renderBarChart("tableChart", data.tables, "table_name", 8);
    renderRows("bucketBody", storage.buckets, "Nenhum arquivo encontrado no Storage.");
    renderRows("tableBody", data.tables, "Nenhuma tabela disponível.");
    $("loadingState").hidden = true; $("usageContent").hidden = false; $("status").textContent = ""; $("status").classList.remove("error");
  }

  async function load(force) {
    if (!A || !A.client) throw new Error("Supabase não configurado.");
    const cached = readCache();
    if (!force && cached && Date.now() - cached.savedAt < CACHE_MS) { render(cached.data, "cache"); return; }
    $("refreshBtn").disabled = true; $("status").textContent = "Consultando somente agora...";
    const {data, error} = await A.client.rpc("jc_admin_supabase_usage_summary");
    if (error) throw error;
    saveCache(data); render(data, "supabase");
  }

  function currentMonthValue() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function selectedAccountMonth() {
    const value = String($("accountUsageMonth")?.value || currentMonthValue());
    return /^\d{4}-\d{2}$/.test(value) ? value : currentMonthValue();
  }

  function accountCacheKey(month) { return ACCOUNT_CACHE_PREFIX + month; }
  function readAccountCache(month) {
    try {
      const payload = JSON.parse(localStorage.getItem(accountCacheKey(month)) || "null");
      return payload && payload.savedAt && payload.data ? payload : null;
    } catch (_) { return null; }
  }
  function saveAccountCache(month, data) {
    try { localStorage.setItem(accountCacheKey(month), JSON.stringify({ savedAt: Date.now(), data })); } catch (_) {}
  }

  function accountActivity(row) {
    return Number(row.codes_generated || 0) + Number(row.configs_generated || 0) + Number(row.activations_completed || 0) + Number(row.activations_failed || 0);
  }
  function accountWaste(row) {
    return Number(row.codes_unused || 0) + Number(row.configs_unused || 0) + Number(row.config_bytes_unused || 0);
  }
  function usageClass(value) {
    const pct = Number(value || 0);
    return pct >= 85 ? "usage-good" : pct >= 50 ? "usage-warn" : "usage-bad";
  }

  function calculateAccountTotals(rows) {
    return (rows || []).reduce((total, row) => {
      total.accounts += 1;
      ["member_count","codes_generated","codes_used","codes_unused","codes_expired","configs_generated","configs_used","configs_unused","config_bytes_generated","config_bytes_unused","activations_completed","activations_failed"].forEach((key) => { total[key] += Number(row[key] || 0); });
      return total;
    }, {accounts:0,member_count:0,codes_generated:0,codes_used:0,codes_unused:0,codes_expired:0,configs_generated:0,configs_used:0,configs_unused:0,config_bytes_generated:0,config_bytes_unused:0,activations_completed:0,activations_failed:0});
  }

  function renderAccountUsage(data, source) {
    lastAccountData = data || {};
    lastAccountSource = source || "supabase";
    const filter = String($("accountUsageFilter")?.value || "activity");
    let rows = Array.isArray(lastAccountData.rows) ? [...lastAccountData.rows] : [];
    if (filter === "activity") rows = rows.filter((row) => accountActivity(row) > 0);
    if (filter === "waste") rows = rows.filter((row) => accountWaste(row) > 0);
    rows.sort((a, b) => Number(b.config_bytes_unused || 0) - Number(a.config_bytes_unused || 0) || Number(b.codes_unused || 0) - Number(a.codes_unused || 0) || String(a.account_name || a.account_username || "").localeCompare(String(b.account_name || b.account_username || ""), "pt-BR"));

    const allRows = Array.isArray(lastAccountData.rows) ? lastAccountData.rows : [];
    const totals = lastAccountData.totals || calculateAccountTotals(allRows);
    $("accountTotalAccounts").textContent = number(totals.accounts != null ? totals.accounts : allRows.length);
    $("accountTotalCodes").textContent = number(totals.codes_generated);
    $("accountTotalUsedCodes").textContent = number(totals.codes_used);
    $("accountUnusedConfigs").textContent = number(totals.configs_unused);
    $("accountUnusedBytes").textContent = bytes(totals.config_bytes_unused);

    const body = $("accountUsageBody");
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="12" class="empty">Nenhuma conta encontrada para este filtro e mês.</td></tr>';
    } else {
      body.innerHTML = rows.map((row) => {
        const pct = Number(row.usage_percent || 0);
        const linked = Math.max(0, Number(row.member_count || 1) - 1);
        return `<tr>
          <td><div class="account-name"><b>${esc(row.account_name || row.account_username || "Conta sem nome")}</b><small>@${esc(row.account_username || "sem usuário")} • total agregado da conta</small></div></td>
          <td class="number-cell">${number(linked)}</td>
          <td class="number-cell">${number(row.codes_generated)}</td>
          <td class="number-cell">${number(row.codes_used)}</td>
          <td class="number-cell">${number(row.codes_unused)}</td>
          <td class="number-cell">${number(row.codes_expired)}</td>
          <td class="number-cell">${number(row.configs_generated)}</td>
          <td class="number-cell">${number(row.configs_used)}</td>
          <td class="number-cell">${number(row.configs_unused)}</td>
          <td class="number-cell">${bytes(row.config_bytes_generated)}</td>
          <td class="number-cell ${Number(row.config_bytes_unused || 0) > 0 ? "usage-bad" : "usage-good"}">${bytes(row.config_bytes_unused)}</td>
          <td class="number-cell"><span class="usage-badge ${usageClass(pct)}">${pct.toLocaleString("pt-BR", {maximumFractionDigits:1})}%</span></td>
        </tr>`;
      }).join("");
    }

    $("accountUsageUpdatedAt").textContent = dateTime(lastAccountData.refreshed_at || lastAccountData.generated_at);
    const serverLabel = lastAccountData.cached ? "Resumo mensal salvo no Supabase" : "Resumo mensal recalculado";
    $("accountUsageSource").textContent = source === "local" ? "Cache local de 7 dias" : serverLabel;
    const monthLabel = selectedAccountMonth().split("-").reverse().join("/");
    $("accountUsageStatus").textContent = `${rows.length} conta(s) exibida(s) em ${monthLabel}. O histórico dos outros meses permanece salvo.`;
    $("accountUsageStatus").classList.remove("error");
  }

  function showAccountError(error) {
    const message = error && error.message ? error.message : String(error || "Erro desconhecido");
    $("accountUsageStatus").textContent = `Falha no acompanhamento mensal: ${message}`;
    $("accountUsageStatus").classList.add("error");
    $("accountUsageBody").innerHTML = `<tr><td colspan="12" class="empty">${esc(message)}</td></tr>`;
  }

  async function loadAccountUsage(force) {
    if (!A || !A.client) throw new Error("Supabase não configurado.");
    const month = selectedAccountMonth();
    const cached = readAccountCache(month);
    if (!force && cached && Date.now() - cached.savedAt < ACCOUNT_CACHE_MS) {
      renderAccountUsage(cached.data, "local");
      return;
    }
    const button = $("accountUsageRefresh");
    if (button) button.disabled = true;
    $("accountUsageStatus").textContent = force ? "Recalculando o mês selecionado..." : "Carregando o resumo mensal...";
    $("accountUsageStatus").classList.remove("error");
    try {
      const { data, error } = await A.client.rpc("jc_admin_monthly_account_usage", { p_month: `${month}-01`, p_force: Boolean(force) });
      if (error) throw error;
      saveAccountCache(month, data);
      renderAccountUsage(data, "supabase");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function showError(error) { $("loadingState").hidden = true; $("usageContent").hidden = true; $("status").textContent = `Falha ao carregar: ${error && error.message ? error.message : error}`; $("status").classList.add("error"); }
  async function init() {
    if (started) return; started = true;
    const open = $("openDashboard"); if (open) open.href = dashboardUrl();
    if ($("accountUsageMonth")) $("accountUsageMonth").value = currentMonthValue();
    $("refreshBtn").addEventListener("click", () => load(true).catch(showError).finally(() => { $("refreshBtn").disabled = false; }));
    $("accountUsageRefresh")?.addEventListener("click", () => loadAccountUsage(true).catch(showAccountError));
    $("accountUsageMonth")?.addEventListener("change", () => loadAccountUsage(false).catch(showAccountError));
    $("accountUsageFilter")?.addEventListener("change", () => { if (lastAccountData) renderAccountUsage(lastAccountData, lastAccountSource); });
    try { await load(false); } catch (e) { showError(e); } finally { $("refreshBtn").disabled = false; }
    loadAccountUsage(false).catch(showAccountError);
  }
  document.addEventListener("jc:admin-liberado", init, {once:true});
  window.addEventListener("jc:admin-liberado", init, {once:true});
  if (window.JC_ADMIN_ACCESS) init();
})();
