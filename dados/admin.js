(function () {
  "use strict";
  const A = window.JC_APP,
    $ = (id) => document.getElementById(id);
  const state = {
    access: null,
    clients: [],
    functions: [],
    plans: [],
    general: {},
    signature: {},
    salesMessages: {},
    billing: {},
    billingQueue: [],
    billingQueueIndex: 0,
    billingPenaltyCache: {},
    requests: [],
    resellerOrphanRequests: [],
    accountFilter: "all",
    paymentFilter: "all",
    editing: null,
    lastPasswords: {},
    testStatus: "pending",
    testChecks: [],
    previewToken: "",
    formDirty: false,
    activeRequestId: "",
    accessDefaults: { monthly: [], one_time: [], test: [], credits: [] },
    defaultAccessTab: "monthly",
    demoSettings: {},
    downloadCodes: [],
    resellers: [],
    resellerSales: [],
    activeResellerSaleId: "",
    resellerPermissionOverride: null,
    purchaseRequests: [],
    avatarData: "",
    clientProductCreditTotals: new Map(),
    resellerProductCreditTotals: new Map(),
    resellerProductCreditRows: new Map(),
    resellerCreditHistory: new Map(),
  };
  function makeSecureTemporaryPassword(){
    const groups=["ABCDEFGHJKLMNPQRSTUVWXYZ","abcdefghijkmnopqrstuvwxyz","23456789","!@#$%*-_"];
    const randomIndex=(length)=>{
      const values=new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0]%length;
    };
    const chars=groups.map((group)=>group[randomIndex(group.length)]);
    const all=groups.join("");
    while(chars.length<16)chars.push(all[randomIndex(all.length)]);
    for(let i=chars.length-1;i>0;i-=1){const j=randomIndex(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}
    return chars.join("");
  }
  const DEFAULT_ATTENDANT_TEMPLATE={
    templateVersion: "jc-apk-mila-20260620",
    brand: "JC-APK Informática",
    assistantName: "Mila",
    whatsapp: "5555997234936",
    pixKey: "",
    pixReceiver: "",
    pixBank: "",
    extraAccountPrice: 0,
    personalPrice1: 70,
    personalPrice2: 100,
    personalPrice5: 150,
    emulatorFee: 50,
    resellerMonthlyFee: 30,
    resellerPlan: "Painel inicial — consulte as condições",
    downloadCode: "",
    testLink: "",
    testCode: "",
    logoUrl: "",
    assistantMedia: "",
    assistantMediaType: "",
    backgroundMain: "",
    backgroundChat: "",
    backgroundOverlay: 82,
    chatOverlay: 68,
    panelColor: "#101c24",
    panel2Color: "#172731",
    lineColor: "#2b3943",
    discountEnabled: true,
    discountAmount: 20,
    cardEnabled: true,
    cardMaxFee: 36,
    cardBaseFee: 0,
    cardInstallmentFees: [3,6,9,12,15,18,21,24,27,30,33,36],
    channelUrl: "",
    channelUrls: ["","","","","","","","","",""],
    channelNames: ["Canal principal","Canal CH-IPTV","JC-APK TV","JC-APK OFERTAS","","","","","",""],
    socialNetworks: [],
    orderModules: [],
    menuVisibility: {personal:true,buyMore:true,test:true,tvBox:true,reseller:true,macro:true,support:true},
    welcome: "Olá! 👋 Eu sou a Mila. Vou entender o que você procura, responder suas dúvidas e liberar o WhatsApp apenas quando você decidir continuar com a compra."
  };
  function setPasswordVisibility(inputId, buttonId, visible) {
    const input = $(inputId), button = $(buttonId);
    if (!input || !button) return;
    input.type = visible ? "text" : "password";
    button.textContent = visible ? "🙈 Ocultar" : "👁 Mostrar";
    button.setAttribute("aria-label", visible ? "Ocultar senha" : "Mostrar senha");
  }
  function togglePasswordVisibility(inputId, buttonId) {
    const input = $(inputId);
    if (input) setPasswordVisibility(inputId, buttonId, input.type === "password");
  }
  function copyPasswordValue(inputId) {
    const input = $(inputId);
    const value = String(input?.value || "");
    if (!value) return A.toast("Digite uma senha antes de copiar.", "error");
    A.copy(value).then(() => A.toast("Senha copiada."));
  }
  const modal = (id) => $(id);
  function openModal(id) {
    const currentModal = modal(id);
    if (!currentModal) return;

    currentModal.classList.add("open");
    document.documentElement.classList.add("jc-client-modal-open");

    window.requestAnimationFrame(() => {
      const box = currentModal.querySelector(".modal-box");
      const body = currentModal.querySelector(".modal-body");
      if (box) box.scrollTop = 0;
      if (body) body.scrollTop = 0;
    });
  }
  function closeModals() {
    document
      .querySelectorAll(".modal")
      .forEach((x) => x.classList.remove("open"));

    document.documentElement.classList.remove("jc-client-modal-open");
  }
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => b.addEventListener("click", closeModals));
  document.querySelectorAll(".modal").forEach((m) =>
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModals();
    }),
  );
  const clientPaneAliases = {
    padroes: "startPane",
    clientes: "clientsPane",
    planos: "plansPane",
    mensagens: "messagesPane",
    cobrancas: "billingPane",
    solicitacoes: "requestsPane",
    revendedores: "resellersPane",
    configuracao: "settingsPane",
  };
  const clientAliasByPane = Object.fromEntries(
    Object.entries(clientPaneAliases).map(([alias, pane]) => [pane, alias]),
  );
  const clientPaneLabels = {
    startPane: "Padrões de acesso",
    clientsPane: "Clientes e permissões",
    plansPane: "Planos e valores",
    messagesPane: "Mensagens e formulários",
    billingPane: "Cobranças e acompanhamento",
    requestsPane: "Solicitações de cadastro",
    resellersPane: "Gestão de revendedores",
    settingsPane: "Configuração geral",
  };
  function activateClientPane(paneId, updateUrl = true) {
    const pane = $(paneId);
    if (!pane) return;
    const button = Array.from(document.querySelectorAll(".tab[data-pane]")).find(
      (item) => item.dataset.pane === paneId,
    );
    document
      .querySelectorAll(".tab[data-pane]")
      .forEach((item) => item.classList.toggle("active", item === button));
    document
      .querySelectorAll(".pane")
      .forEach((item) => item.classList.toggle("active", item === pane));
    const current = $("clientAreaCurrent");
    if (current) current.textContent = button?.dataset.label || button?.textContent.trim() || clientPaneLabels[paneId] || "Clientes";
    const menu = $("clientAreaMenu");
    if (menu) menu.open = false;
    if (updateUrl && clientAliasByPane[paneId]) {
      const url = new URL(window.location.href);
      url.searchParams.set("secao", clientAliasByPane[paneId]);
      window.history.replaceState(null, "", url);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll(".tab[data-pane]").forEach((button) =>
    button.addEventListener("click", () => activateClientPane(button.dataset.pane)),
  );
  const requestedClientArea = new URLSearchParams(window.location.search).get("secao");
  activateClientPane(clientPaneAliases[requestedClientArea] || "clientsPane", false);

  [["togglePasswordBtn", "password"], ["toggleTestPasswordBtn", "testPassword"], ["toggleNewPasswordBtn", "newPassword"], ["toggleNewAttendantPasswordBtn", "newAttendantPassword"]].forEach(([buttonId, inputId]) => {
    const button = $(buttonId);
    if (button) button.addEventListener("click", () => togglePasswordVisibility(inputId, buttonId));
  });
  [["copyPasswordBtn", "password"], ["copyTestPasswordBtn", "testPassword"], ["copyNewPasswordBtn", "newPassword"], ["copyNewAttendantPasswordBtn", "newAttendantPassword"]].forEach(([buttonId, inputId]) => {
    const button = $(buttonId);
    if (button) button.addEventListener("click", () => copyPasswordValue(inputId));
  });
  [["generatePasswordBtn", "password"], ["generateNewPasswordBtn", "newPassword"], ["generateNewAttendantPasswordBtn", "newAttendantPassword"]].forEach(([buttonId, inputId]) => {
    const button = $(buttonId);
    if (button) button.addEventListener("click", () => {
      $(inputId).value = makeSecureTemporaryPassword();
      setPasswordVisibility(inputId, buttonId === "generatePasswordBtn" ? "togglePasswordBtn" : inputId === "newPassword" ? "toggleNewPasswordBtn" : "toggleNewAttendantPasswordBtn", true);
      A.toast("Senha temporária exclusiva gerada.");
    });
  });

  function setupWarning() {
    if (A.ready) return;
    $("setupWarning").classList.remove("hidden");
    $("setupWarning").textContent =
      "Antes de usar: crie o novo Supabase, execute 01-CRIAR-BANCO-NOVO.sql e preencha dados/supabase-config.js.";
  }
  function paintConnectionStatus(id, text, ok) {
    const el = $(id);
    if (!el) return;
    el.classList.remove("hidden");
    el.textContent = text;
    el.style.borderColor = ok
      ? "rgba(41,211,145,.35)"
      : "rgba(255,101,120,.35)";
    el.style.background = ok ? "rgba(41,211,145,.09)" : "rgba(255,101,120,.09)";
    el.style.color = ok ? "#d7ffea" : "#ffd3da";
  }
  async function testConnection(statusId, buttonId) {
    const btn = $(buttonId);
    paintConnectionStatus(statusId, "Testando conexão...", true);
    if (btn) btn.disabled = true;
    try {
      const result = await A.testConnection();
      paintConnectionStatus(
        statusId,
        `Conexão confirmada com o Supabase em ${result.elapsed} ms.`,
        true,
      );
    } catch (err) {
      paintConnectionStatus(
        statusId,
        err.message || "Não foi possível conectar ao Supabase.",
        false,
      );
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  async function login(e) {
    e.preventDefault();
    $("loginMsg").textContent = "Entrando...";
    try {
      await A.login($("loginUser").value, $("loginPass").value);
      const access = await A.myAccess();
      if (!access?.profile || access.profile.role !== "admin")
        throw new Error("Este acesso não é de administrador.");
      state.access = access;
      showApp();
      await loadAll();
    } catch (err) {
      $("loginMsg").textContent = err.message || "Não foi possível entrar.";
    }
  }
  async function restore() {
    setupWarning();
    if (!A.ready) return;
    const {
      data: { session },
    } = await A.client.auth.getSession();
    if (!session) return;
    try {
      const access = await A.myAccess();
      if (access?.profile?.role === "admin") {
        state.access = access;
        showApp();
        await loadAll();
      }
    } catch (e) {}
  }
  function showApp() {
    $("loginView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    $("logoutBtn").classList.remove("hidden");
    $("topStatus").textContent =
      "Administrador: " + state.access.profile.full_name;
  }
  async function logout() {
    await A.client.auth.signOut();
    location.reload();
  }
  $("loginForm").addEventListener("submit", login);
  $("logoutBtn").addEventListener("click", logout);
  $("testConnectionLoginBtn").addEventListener("click", () =>
    testConnection("loginConnectionStatus", "testConnectionLoginBtn"),
  );
  $("testConnectionSettingsBtn").addEventListener("click", () =>
    testConnection("settingsConnectionStatus", "testConnectionSettingsBtn"),
  );

  async function loadAll() {
    // Não recalcula o status no carregamento do ADM. Essa rotina sobrescrevia
    // bloqueios manuais ao encontrar pagamento, validade ou competência futura.
    // Vencimento e atraso continuam sendo verificados pelas datas no painel e
    // no login do cliente, sem desfazer uma decisão manual do administrador.
    await Promise.all([loadPlans(), loadGeneral(), loadFunctions(), loadDownloadCodes()]);
    try { await syncFunctions(true); } catch (e) { console.warn("Sincronização automática:", e.message); }
    await Promise.all([loadClients(), loadRequests(), loadResellers(), loadPurchaseRequests()]);
    renderPlansMessage();
    renderDefaultAccessRules();
    renderDownloadCodes();
  }
  async function loadPlans() {
    const { data, error } = await A.client
      .from("plans")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    state.plans = data || [];
    renderPlanOptions();
    renderPlanCards();
  }
  async function loadGeneral() {
    const { data, error } = await A.client.from("app_settings").select("key,value").in("key", ["general", "signature", "sales_messages", "billing", "access_defaults", "demo"]);
    if (error) throw error;
    state.general = (data || []).find((x) => x.key === "general")?.value || {};
    state.signature = (data || []).find((x) => x.key === "signature")?.value || {};
    state.salesMessages = (data || []).find((x) => x.key === "sales_messages")?.value || {};
    state.billing = (data || []).find((x) => x.key === "billing")?.value || {};
    state.accessDefaults = (data || []).find((x) => x.key === "access_defaults")?.value || {monthly:[],one_time:[],test:[],credits:[]};
    state.demoSettings = (data || []).find((x) => x.key === "demo")?.value || {};
    $("demoServerName").value = state.demoSettings.server_name || "MediaFire";
    $("demoWatermark").value = state.demoSettings.watermark || "DEMONSTRAÇÃO";
    $("demoBadgeTitle").value = state.demoSettings.badge_title || "AMBIENTE DEMONSTRATIVO";
    $("demoBadgeText").value = state.demoSettings.badge_text || "Conteúdo fictício — nenhum arquivo ou download real.";
    $("demoDynamicTime").checked = state.demoSettings.dynamic_time !== false;
    $("generalPanelUrl").value = state.general.panel_url || A.cfg.panelUrl || "";
    $("generalAttendantUrl").value = state.general.attendant_url || A.cfg.attendantUrl || "";
    $("generalInitialPassword").value = "Senha temporária exclusiva e automática";
    if($("generalTestPassword")) $("generalTestPassword").value = state.general.test_public_password || "teste";
    if($("generalPurchaseWhatsapp")) $("generalPurchaseWhatsapp").value = state.general.purchase_whatsapp || state.billing.support_phone || "5555997234936";
    $("generalShowLocked").value = String(state.general.show_locked_functions !== false);
    $("generalTrialAmount").value = Number(state.general.trial_amount) || Number(state.general.trial_days) || 1;
    $("generalTrialUnit").value = state.general.trial_unit === "hours" ? "hours" : "days";
    $("signatureName").value = state.signature.name || "JC-APK TV";
    $("signatureWhatsapp").value = state.signature.whatsapp || "5555997234936";
    $("signatureInstagram").value = state.signature.instagram || "";
    $("signatureMessage").value = state.signature.message || "Desenvolvido por JC-APK TV";
    $("signatureShow").value = String(state.signature.show !== false);
    $("salesFormIntro").value = state.salesMessages.form_intro || "Olá! Para realizar seu cadastro no Painel JC-APK TV, preencha o formulário pelo link abaixo com seus dados corretos.";
    $("salesPlansIntro").value = state.salesMessages.plans_intro || "Confira também nossas opções de plano:";
    $("salesPlansFooter").value = state.salesMessages.plans_footer || "Você também pode solicitar orçamento para novas funções personalizadas.";
    $("salesAccessIntro").value = state.salesMessages.access_intro || "Seu acesso está pronto.";
    renderRequestMessages();
    $("billingCompanyName").value = state.billing.company_name || "JC-APK TV";
    $("billingSupportPhone").value = state.billing.support_phone || state.signature.whatsapp || "";
    $("billingAutoEnabled").checked = Boolean(state.billing.auto_enabled);
    $("billingDay5Enabled").checked = state.billing.day5_enabled !== false;
    $("billingDay10Enabled").checked = state.billing.day10_enabled !== false;
    $("billingTimezone").value = state.billing.timezone || "America/Sao_Paulo";
    $("billingReminderDaysBefore").value = Math.max(0, Math.min(30, Number(state.billing.reminder_days_before ?? 5)));
    $("billingGraceDaysAfter").value = Math.max(0, Math.min(30, Number(state.billing.grace_days_after ?? 5)));
    $("billingPanelNoticeEnabled").checked = state.billing.panel_notice_enabled !== false;
    $("billingAutoFillGrace").checked = state.billing.auto_fill_grace !== false;
    $("billingPixHolder").value = state.billing.pix_holder || "";
    $("billingPixBank").value = state.billing.pix_bank || "";
    $("billingPixKeyType").value = state.billing.pix_key_type || "Aleatória";
    $("billingPixKey").value = state.billing.pix_key || "";
    $("billingPixNote").value = state.billing.pix_note || "";
    const defaultDay5BillingMessage = "Olá, {nome}. Tudo bem?\n\nEste é um lembrete da {empresa} referente à mensalidade do plano {plano}.\n\nMensalidade: {valor}\nVencimento: {vencimento}\nPagamento permitido até: {limite_pagamento}\nBloqueio temporário somente a partir de: {data_bloqueio}\n{penalidade_bloco}\n{pix_bloco}\n\nApós pagar, envie o comprovante por aqui para confirmarmos a renovação.\n\nSuporte: {suporte}.";
    const defaultDay10BillingMessage = "Olá, {nome}. Tudo bem?\n\nSua mensalidade da {empresa} continua pendente. Este é o último aviso antes do bloqueio temporário.\n\nMensalidade: {valor}\nVencimento: {vencimento}\nÚltimo dia para pagamento: {limite_pagamento}\nBloqueio a partir de: {data_bloqueio}\n{penalidade_bloco}\n{pix_bloco}\n\nDepois do pagamento, envie o comprovante para liberarmos ou renovarmos o acesso.\n\nSuporte: {suporte}.";
    const defaultPanelReminder = "Olá, {nome}. Sua mensalidade vence em {vencimento}. O pagamento pode ser realizado até {limite_pagamento}, sem bloqueio antes desse prazo.";
    const defaultPanelGrace = "Sua mensalidade venceu em {vencimento}, mas seu painel continua liberado durante o prazo de pagamento. Regularize até {limite_pagamento}. O bloqueio ocorrerá somente em {data_bloqueio}.";
    const defaultPanelBlocked = "Seu acesso foi bloqueado temporariamente porque o prazo de pagamento terminou em {limite_pagamento}. Após o pagamento, envie o comprovante para {suporte}.";
    const savedDay5 = state.billing.day5_message || "";
    const savedDay10 = state.billing.day10_message || "";
    const needsBillingUpgrade = (text) => !text || !String(text).includes("{penalidade_bloco}") || /dia\s*(5|10)|até o dia 10|hoje, dia 10/i.test(String(text));
    state.billing.day5_message = needsBillingUpgrade(savedDay5) ? defaultDay5BillingMessage : savedDay5;
    state.billing.day10_message = needsBillingUpgrade(savedDay10) ? defaultDay10BillingMessage : savedDay10;
    $("billingDay5Message").value = state.billing.day5_message;
    $("billingDay10Message").value = state.billing.day10_message;
    state.billing.panel_reminder_message = state.billing.panel_reminder_message || defaultPanelReminder;
    state.billing.panel_grace_message = state.billing.panel_grace_message || defaultPanelGrace;
    state.billing.panel_blocked_message = state.billing.panel_blocked_message || defaultPanelBlocked;
    $("billingPanelReminderMessage").value = state.billing.panel_reminder_message;
    $("billingPanelGraceMessage").value = state.billing.panel_grace_message;
    $("billingPanelBlockedMessage").value = state.billing.panel_blocked_message;
    renderBillingRuleTimeline();
  }
  async function loadFunctions() {
    const { data, error } = await A.client.from("functions_catalog").select("*").eq("active", true).order("sort_order");
    if (error) throw error;
    state.functions = data || [];
    $("statFunctions").textContent = state.functions.length;
    renderPermissions(new Set(defaultPermissionIds("monthly")));
    renderDefaultAccessRules();
    renderFunctionMarket();
  }

  function marketParentOptions(selected=""){
    return '<option value="">Nenhuma / função principal</option>'+state.functions.filter((f)=>!f.is_extra).sort((a,b)=>Number(a.purchase_sort||a.sort_order||0)-Number(b.purchase_sort||b.sort_order||0)).map((f)=>`<option value="${esc(f.id)}" ${f.id===selected?'selected':''}>${esc(f.name)}</option>`).join('');
  }
  function renderFunctionMarket(){
    const host=$("functionMarketList");if(!host)return;
    const rows=[...state.functions].sort((a,b)=>Number(a.purchase_sort||a.sort_order||0)-Number(b.purchase_sort||b.sort_order||0)||String(a.name).localeCompare(String(b.name),"pt-BR"));
    host.innerHTML=rows.length?rows.map((f)=>`<div class="function-market-card ${f.is_extra?'extra':''}" data-market-row="${esc(f.id)}"><div class="title"><strong>${esc(f.purchase_icon||'🧩')} ${esc(f.name)}</strong><small>${esc(f.group_name)} • ID: ${esc(f.id)} • ${esc(f.action_kind||'action')}</small><div class="function-market-flags"><label><input type="checkbox" data-market-enabled="${esc(f.id)}" ${f.purchase_enabled?'checked':''}> Oferecer para compra</label><label><input type="checkbox" data-market-demo="${esc(f.id)}" ${f.demo_enabled!==false?'checked':''}> Permitir demonstração</label><label><input type="checkbox" data-market-extra="${esc(f.id)}" ${f.is_extra?'checked':''}> É extra</label></div></div><div class="field"><label>Preço</label><input type="number" min="0" step="0.01" data-market-price="${esc(f.id)}" value="${Number(f.purchase_price||0)}"><label style="margin-top:7px">Ícone</label><input data-market-icon="${esc(f.id)}" value="${esc(f.purchase_icon||'')}"></div><div class="field"><label>Função principal</label><select data-market-parent="${esc(f.id)}">${marketParentOptions(f.parent_function_id||'')}</select><label style="margin-top:7px">Descrição de compra</label><textarea data-market-description="${esc(f.id)}" rows="2">${esc(f.purchase_description||'')}</textarea>${f.source_key==='manual'?`<button class="btn red" type="button" data-disable-function="${esc(f.id)}" style="margin-top:7px">Desativar função manual</button>`:''}</div></div>`).join(''):'<div class="empty">Nenhuma função reconhecida. Use “Sincronizar funções do HTML”.</div>';
    host.querySelectorAll('[data-market-extra]').forEach((ch)=>ch.addEventListener('change',()=>{const row=ch.closest('[data-market-row]'),sel=row.querySelector('[data-market-parent]');sel.disabled=!ch.checked;if(!ch.checked)sel.value='';}));
    host.querySelectorAll('[data-market-row]').forEach((row)=>{const ch=row.querySelector('[data-market-extra]'),sel=row.querySelector('[data-market-parent]');if(sel)sel.disabled=!ch.checked;});
    host.querySelectorAll('[data-disable-function]').forEach((b)=>b.onclick=()=>disableManualFunction(b.dataset.disableFunction));
    if($("manualFunctionParent"))$("manualFunctionParent").innerHTML=marketParentOptions();
  }
  async function saveFunctionMarket(){
    const rows=state.functions.map((f)=>{
      const enabled=document.querySelector(`[data-market-enabled="${CSS.escape(f.id)}"]`);
      if(!enabled)return null;
      const extra=document.querySelector(`[data-market-extra="${CSS.escape(f.id)}"]`).checked;
      const parent=document.querySelector(`[data-market-parent="${CSS.escape(f.id)}"]`).value||null;
      if(extra&&!parent)throw new Error(`Escolha a função principal do extra: ${f.name}`);
      return {id:f.id,purchase_enabled:enabled.checked,purchase_price:Math.max(0,Number(document.querySelector(`[data-market-price="${CSS.escape(f.id)}"]`).value)||0),purchase_icon:document.querySelector(`[data-market-icon="${CSS.escape(f.id)}"]`).value.trim(),purchase_description:document.querySelector(`[data-market-description="${CSS.escape(f.id)}"]`).value.trim(),demo_enabled:document.querySelector(`[data-market-demo="${CSS.escape(f.id)}"]`).checked,is_extra:extra,parent_function_id:extra?parent:null,purchase_sort:Number(f.purchase_sort||f.sort_order||0),updated_at:new Date().toISOString()};
    }).filter(Boolean);
    const results=await Promise.all(rows.map((r)=>A.client.from("functions_catalog").update(r).eq("id",r.id)));
    const failed=results.find((r)=>r.error);if(failed)throw failed.error;
    await loadFunctions();A.toast("Catálogo de funções e extras salvo.");
  }
  function openManualFunction(){
    $("manualFunctionId").value="";$("manualFunctionName").value="";$("manualFunctionGroup").value="other";$("manualFunctionGroupName").value="Outras funções";$("manualFunctionSelector").value="";$("manualFunctionAction").value="entry";$("manualFunctionPrice").value=0;$("manualFunctionIsExtra").value="false";$("manualFunctionDescription").value="";$("manualFunctionParent").innerHTML=marketParentOptions();$("manualFunctionParent").value="";openModal("functionEditorModal");
  }
  function normalizeFunctionId(v){return String(v||"").toLowerCase().trim().replace(/[^a-z0-9._-]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,70);}
  async function saveManualFunction(){
    const id=normalizeFunctionId($("manualFunctionId").value),name=$("manualFunctionName").value.trim(),isExtra=$("manualFunctionIsExtra").value==="true",parent=$("manualFunctionParent").value||null;
    if(!id||id.length<3)throw new Error("Informe um ID interno válido.");
    if(!name)throw new Error("Informe o nome da função.");
    if(isExtra&&!parent)throw new Error("O extra precisa estar ligado a uma função principal.");
    const row={id,group_id:normalizeFunctionId($("manualFunctionGroup").value)||"other",group_name:$("manualFunctionGroupName").value.trim()||"Outras funções",name,selector:$("manualFunctionSelector").value.trim()||null,action_kind:$("manualFunctionAction").value,protected:false,active:true,source_key:"manual",sort_order:900+state.functions.length,purchase_enabled:true,purchase_price:Math.max(0,Number($("manualFunctionPrice").value)||0),purchase_description:$("manualFunctionDescription").value.trim(),purchase_icon:isExtra?"➕":"🧩",demo_enabled:true,is_extra:isExtra,parent_function_id:isExtra?parent:null,purchase_sort:900+state.functions.length,updated_at:new Date().toISOString()};
    const {error}=await A.client.from("functions_catalog").upsert(row,{onConflict:"id"});if(error)throw error;
    closeModals();await loadFunctions();A.toast("Função adicionada ao catálogo.");
  }
  async function disableManualFunction(id){
    const f=state.functions.find((x)=>x.id===id);if(!f||!confirm(`Desativar ${f.name}? Os clientes existentes não serão apagados.`))return;
    const {error}=await A.client.from("functions_catalog").update({active:false,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;await loadFunctions();A.toast("Função desativada.");
  }
  async function loadPurchaseRequests(){
    if(!$("purchaseRequestList"))return;
    const {data,error}=await A.client.from("function_purchase_requests").select("*").order("created_at",{ascending:false}).limit(200);
    if(error){console.warn("Solicitações de compra:",error.message);state.purchaseRequests=[];}else state.purchaseRequests=data||[];
    renderPurchaseRequests();
  }
  function renderPurchaseRequests(){
    const host=$("purchaseRequestList");if(!host)return;
    host.innerHTML=state.purchaseRequests.length?state.purchaseRequests.map((r)=>{const items=Array.isArray(r.items)?r.items:[];return `<div class="purchase-request-card"><div class="purchase-request-card-head"><div><b>${esc(r.customer_name||r.username||'Cliente')}</b> <span class="badge ${r.status==='released'?'':'blocked'}">${esc(r.status)}</span><br><small>@${esc(r.username||'')} • ${esc(r.customer_whatsapp||'')} • ${new Date(r.created_at).toLocaleString('pt-BR')}<br>${items.map((x)=>`${x.is_extra?'Extra: ':''}${esc(x.name)} — ${A.money(x.price||0)}`).join('<br>')}<br><b>Total: ${A.money(r.total||0)}</b></small></div><div class="row-actions"><button class="btn" data-purchase-status="contacted" data-purchase-id="${r.id}">Contatado</button><button class="btn green" data-purchase-status="paid" data-purchase-id="${r.id}">Pago</button><button class="btn blue" data-purchase-status="released" data-purchase-id="${r.id}">Liberado</button><button class="btn red" data-purchase-status="cancelled" data-purchase-id="${r.id}">Cancelar</button></div></div></div>`;}).join(''):'<div class="empty">Nenhuma solicitação de compra recebida.</div>';
    host.querySelectorAll('[data-purchase-id]').forEach((b)=>b.onclick=()=>updatePurchaseRequest(b.dataset.purchaseId,b.dataset.purchaseStatus));
  }
  async function updatePurchaseRequest(id,status){const {error}=await A.client.from("function_purchase_requests").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;await loadPurchaseRequests();A.toast("Solicitação atualizada.");}
  $("saveFunctionMarketBtn").onclick=()=>saveFunctionMarket().catch((e)=>A.toast(e.message,"error"));
  $("addManualFunctionBtn").onclick=openManualFunction;
  $("saveManualFunctionBtn").onclick=()=>saveManualFunction().catch((e)=>A.toast(e.message,"error"));
  $("reloadPurchaseRequestsBtn").onclick=()=>loadPurchaseRequests().catch((e)=>A.toast(e.message,"error"));

  async function loadClientProductCreditTotals(){
    state.clientProductCreditTotals=new Map();
    const targets=(state.clients||[]).filter((c)=>c?.id&&c.reseller_parent_id&&String(c.status||'active')==='active'&&accountTypeOf(c)==='credits'&&creditBalanceOf({...c,product_balances:[],product_credit_balances:null,reseller_product_balances:[],balances:[]})<=0);
    for(let i=0;i<targets.length;i+=10){
      const chunk=targets.slice(i,i+10);
      const res=await Promise.allSettled(chunk.map((c)=>A.client.rpc('jc_reseller_get_product_balances',{p_owner_id:c.id})));
      res.forEach((r,idx)=>{
        const c=chunk[idx];
        if(r.status==='fulfilled'&&!r.value?.error){
          const total=(r.value.data?.balances||[]).reduce((sum,x)=>sum+Math.max(0,Number(x.balance||0)),0);
          if(total>0)state.clientProductCreditTotals.set(c.id,total);
        }
      });
    }
  }

  function balanceRowsTotal(rows,includeLauncher=true){
    return (Array.isArray(rows)?rows:[]).filter((x)=>includeLauncher||String(x?.product_key||'').toLowerCase()!=='launcher').reduce((sum,x)=>sum+Math.max(0,Number(x?.balance||0)),0);
  }
  function resellerCreditRows(id){
    return state.resellerProductCreditRows instanceof Map?(state.resellerProductCreditRows.get(id)||[]):[];
  }
  function resellerCreditAvailable(id){
    if(state.resellerProductCreditTotals instanceof Map&&state.resellerProductCreditTotals.has(id))return Number(state.resellerProductCreditTotals.get(id)||0);
    const c=state.clients.find((x)=>x.id===id);
    return creditBalanceOf(c||{});
  }
  function resellerBalanceHtml(id){
    const rows=resellerCreditRows(id);
    const total=resellerCreditAvailable(id);
    const details=rows.length?rows.map((x)=>`${esc(String(x.product_key||'geral'))}: ${Number(x.balance||0).toLocaleString('pt-BR')}`).join('<br>'):'Sem detalhamento por produto carregado.';
    return `<b>${total.toLocaleString('pt-BR')}</b> crédito(s) disponível(is)<br><small>${details}</small>`;
  }
  function normalizeCreditHistoryRow(row){
    const quantity=Number(row?.quantity??row?.amount??row?.credits??row?.delta??row?.change_amount??0);
    const product=String(row?.product_key||row?.product||row?.category||'geral');
    const before=row?.balance_before??row?.previous_balance??row?.before_balance;
    const after=row?.balance_after??row?.new_balance??row?.after_balance??row?.balance;
    const date=row?.created_at||row?.inserted_at||row?.updated_at||row?.date;
    const meta=row?.metadata&&typeof row.metadata==='object'?row.metadata:{};
    const note=row?.description||row?.notes||row?.note||meta.description||meta.mode||meta.source||'';
    return {quantity,product,before,after,date,note};
  }
  function creditHistoryHtml(id){
    const rows=(state.resellerCreditHistory instanceof Map?(state.resellerCreditHistory.get(id)||[]):[]).map(normalizeCreditHistoryRow);
    if(!rows.length){
      const children=state.clients.filter((x)=>x.reseller_parent_id===id&&accountTypeOf(x)==='credits');
      const active=resellerCreditCustomers(id).length;
      return `Resumo atual: ${children.length} cliente(s) por créditos na hierarquia, ${active} com saldo ativo. Sem histórico detalhado retornado pelo Supabase ainda; use o saldo atual como referência para nova recarga/ajuste.`;
    }
    return rows.slice(0,8).map((h)=>{
      const q=Number.isFinite(h.quantity)&&h.quantity!==0?`${h.quantity>0?'+':''}${h.quantity.toLocaleString('pt-BR')} crédito(s)`:'lançamento';
      const when=h.date?new Date(h.date).toLocaleString('pt-BR'):'';
      const path=(h.before!==undefined||h.after!==undefined)?` • saldo ${h.before??'—'} → ${h.after??'—'}`:'';
      return `<div><b>${q}</b> • ${esc(h.product)}${path}<br><small>${esc(when)}${h.note?' • '+esc(h.note):''}</small></div>`;
    }).join('<hr style="border:0;border-top:1px solid rgba(255,255,255,.08);margin:7px 0">');
  }
  async function fetchCreditHistory(ownerId){
    const tables=['jc_product_credit_history','jc_product_credit_ledger','jc_reseller_credit_history','jc_launcher_credit_history','jc_credit_transactions','product_credit_transactions'];
    const ownerColumns=['owner_id','user_id','client_id','profile_id'];
    for(const table of tables){
      for(const column of ownerColumns){
        try{
          const {data,error}=await A.client.from(table).select('*').eq(column,ownerId).limit(12);
          if(!error&&Array.isArray(data))return [...data].sort((a,b)=>new Date(b.created_at||b.inserted_at||b.updated_at||0)-new Date(a.created_at||a.inserted_at||a.updated_at||0));
        }catch(_){/* tabela opcional */}
      }
    }
    return [];
  }
  async function loadResellerProductCreditSummaries(){
    state.resellerProductCreditTotals=new Map();
    state.resellerProductCreditRows=new Map();
    state.resellerCreditHistory=new Map();
    const targets=(state.clients||[]).filter((c)=>c?.id&&c.is_reseller);
    for(let i=0;i<targets.length;i+=8){
      const chunk=targets.slice(i,i+8);
      const balances=await Promise.allSettled(chunk.map((c)=>A.client.rpc('jc_reseller_get_product_balances',{p_owner_id:c.id})));
      const histories=await Promise.allSettled(chunk.map((c)=>fetchCreditHistory(c.id)));
      balances.forEach((r,idx)=>{
        const c=chunk[idx];
        if(r.status==='fulfilled'&&!r.value?.error){
          const rows=Array.isArray(r.value.data?.balances)?r.value.data.balances:[];
          state.resellerProductCreditRows.set(c.id,rows);
          state.resellerProductCreditTotals.set(c.id,balanceRowsTotal(rows,true));
        }
      });
      histories.forEach((r,idx)=>{
        const c=chunk[idx];
        if(r.status==='fulfilled'&&Array.isArray(r.value))state.resellerCreditHistory.set(c.id,r.value);
      });
    }
  }
  function renderResellerCreditPanel(c=state.editing){
    const visible=Boolean($('isReseller')?.checked);
    $('resellerOptions')?.classList.toggle('hidden',!visible);
    if(!visible)return;
    const id=$('clientId')?.value||c?.id||'';
    const balanceBox=$('resellerCurrentBalance'),historyBox=$('resellerCreditHistory');
    if(!id){
      if(balanceBox)balanceBox.innerHTML='Saldo será exibido depois que o revendedor for salvo.';
      if(historyBox)historyBox.innerHTML='O histórico começa depois da primeira recarga/ajuste.';
      return;
    }
    if(balanceBox)balanceBox.innerHTML=resellerBalanceHtml(id);
    if(historyBox)historyBox.innerHTML=creditHistoryHtml(id);
  }

  async function loadClients() {
    const { data, error } = await A.client
      .from("profiles")
      .select(
        "*,attendant_profiles(slug,published,config_password_changed_at,updated_at),user_permissions(function_id,enabled),reseller_profiles(enabled,fee_percent,price_table,billing_settings,updated_at)",
      )
      .in("role", ["client", "test"])
      .order("created_at", { ascending: false });
    if (error) throw error;
    const ids = (data || []).map((x) => x.id);
    let events = [];
    if (ids.length) {
      const r = await A.client
        .from("password_events")
        .select("user_id,access_type,created_at,change_source")
        .in("user_id", ids)
        .order("created_at", { ascending: false });
      if (!r.error) events = r.data || [];
    }
    const currentMonthKey=A.isoDate(new Date()).slice(0,7);
    let paidCompetencies=[];
    if(ids.length){
      const ph=await A.client.from('jc_client_payment_history')
        .select('client_id,reference_month,amount,paid_at,competency,status')
        .in('client_id',ids).eq('status','paid')
        .order('reference_month',{ascending:true});
      if(!ph.error){
        paidCompetencies=(ph.data||[]).filter((x)=>paymentMonthKey(x)>=currentMonthKey);
      }else console.warn('Histórico mensal de pagamentos:',ph.error.message);
    }
    state.clients = (data || []).map((c) => {
      const payments=paidCompetencies.filter((x)=>x.client_id===c.id);
      return {
        ...c,
        password_events: events.filter((e) => e.user_id === c.id),
        current_month_payment: payments.find((x)=>paymentMonthKey(x)===currentMonthKey)||null,
        next_paid_payment: payments.find((x)=>paymentMonthKey(x)>currentMonthKey)||null,
        paid_competencies: payments,
      };
    });
    await loadResellerProductCreditSummaries().catch((e)=>console.warn('Saldos da recarga dos revendedores:',e.message||e));
    await loadClientProductCreditTotals().catch((e)=>console.warn('Saldos por produto dos clientes da revenda:',e.message||e));
    renderClients();
    renderResellers();
    renderResellerCreditPanel();
    fillBillingPreviewClients();
    if($("billingPreviewDate")&&!$("billingPreviewDate").value)$("billingPreviewDate").value=A.isoDate(new Date());
    renderBillingPreview();
  }

  function isResellerPublicRequest(r) {
    const p = r?.payload || {};
    return String(p?.source || "") === "reseller_public_form";
  }
  function isOrphanResellerRequest(r) {
    if (!isResellerPublicRequest(r)) return false;
    const p = r?.payload || {};
    const resellerId = String(p.reseller_id || "").trim();
    const resellerUsername = String(p.reseller_username || "").trim();
    const resellerName = String(p.reseller_name || "").trim();
    const resellerContact = String(p.reseller_contact || "").replace(/\D/g, "");
    return !resellerId && !resellerUsername && !resellerName && !resellerContact;
  }
  async function loadRequests() {
    const { data, error } = await A.client.from("client_requests").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) { console.warn("Solicitações:", error.message); state.requests = []; state.resellerOrphanRequests = []; }
    else {
      const rows = data || [];
      state.requests = rows.filter((r)=>r.request_type!=="reseller_credit" && !isResellerPublicRequest(r) && !r?.payload?.reseller_id);
      state.resellerOrphanRequests = rows.filter((r)=>isOrphanResellerRequest(r) && !["created","rejected","cancelled"].includes(String(r.status||"pending")));
    }
    renderRequests();
    renderResellerOrphanRequests();
    renderStats();
  }
  function visibleDirectClients(){
    return (state.clients||[]).filter((c)=>c?.id&&!c.reseller_parent_id&&!c.archived_at);
  }
  function renderStats() {
    const c = visibleDirectClients();
    $("statClients").textContent = c.filter((x) => accountTypeOf(x) === "monthly" && Number(x.plan_months || 1) === 1).length;
    $("statActive").textContent = c.filter((x) => x.status === "active").length;
    $("statBlocked").textContent = c.filter((x) => x.status !== "active").length;
    $("statAttendant").textContent = c.filter((x) => x.attendant_enabled).length;
    $("statTrials").textContent = c.filter((x) => accountTypeOf(x) === "test").length;
    $("statCredits").textContent = c.filter((x) => accountTypeOf(x) === "credits").length;
    $("statRequests").textContent = state.requests.filter((x) => x.status === "pending").length;
    if ($("statResellers")) $("statResellers").textContent = state.clients.filter((x) => x.is_reseller).length;
  }
  function esc(v) {
    return String(v ?? "").replace(
      /[&<>"']/g,
      (s) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[s],
    );
  }

  const ADMIN_GROUP_ORDER = [
    "config",
    "activator11",
    "activator16",
    "activatorvip",
    "activators_mass",
    "packages",
    "launcher",
    "attendant",
    "reseller",
    "reports",
    "other",
  ];
  const MASS_PERMISSION_DEPENDENCIES = Object.freeze({
    "activators.mass.11": "activator11.generate",
    "activators.mass.16": "activator16.generate",
    "activators.mass.vip": "activatorvip.generate",
  });
  function normalizePermissionIds(rawIds, allowedIds = null) {
    const ids = new Set((rawIds || []).filter(Boolean));
    const allowed = allowedIds ? new Set(allowedIds) : null;

    Object.entries(MASS_PERMISSION_DEPENDENCIES).forEach(([massId, requiredId]) => {
      if (!ids.has(massId)) return;
      // Uma operação em massa nunca pode ser salva sem a permissão normal.
      // Em cadastros de revenda, se a permissão normal não puder ser concedida,
      // removemos a opção em massa em vez de persistir um conjunto inválido.
      if (allowed && (!allowed.has(massId) || !allowed.has(requiredId))) {
        ids.delete(massId);
        return;
      }
      ids.add(requiredId);
    });

    if (allowed) {
      [...ids].forEach((id) => { if (!allowed.has(id)) ids.delete(id); });
    }
    return [...ids];
  }

  function syncMassPermissionCheckboxes() {
    Object.entries(MASS_PERMISSION_DEPENDENCIES).forEach(([massId, requiredId]) => {
      const mass = document.querySelector(`.perm-check[value="${CSS.escape(massId)}"]`);
      const required = document.querySelector(`.perm-check[value="${CSS.escape(requiredId)}"]`);
      if (mass?.checked && required) required.checked = true;
    });
  }
  function canonicalPermissionGroup(f) {
    const id = String(f?.id || "").toLowerCase();
    const name = String(f?.name || "").toLowerCase();
    const selector = String(f?.selector || "").toLowerCase();
    const gid = String(f?.group_id || "").toLowerCase();
    const gname = String(f?.group_name || "").toLowerCase();
    const raw = `${id} ${name} ${selector} ${gid} ${gname}`;
    const activatorWords = /(ativador|gerador|ativa[cç][aã]o|codigo|c[oó]digo|download|resetar)/i;
    if (id.startsWith("activators.mass") || gid === "activators_mass" || raw.includes("gerar zip") || raw.includes("jc_config_bulk_generate")) {
      return { id: "activators_mass", name: "Geração em Lote" };
    }
    if (id.startsWith("activatorvip") || gid === "activatorvip") {
      return { id: "activatorvip", name: "Ativador VIP" };
    }
    // IDs oficiais têm prioridade sobre ids visuais antigos do HTML.
    // Ex.: o botão principal do Ativador 16 ainda usa id visual btn_gerador11,
    // mas o function_id oficial é activator16.open e deve ficar sempre no grupo 16.
    if (id.startsWith("activator16")) {
      return { id: "activator16", name: "Ativador 16 dígitos" };
    }
    if (id.startsWith("activator11")) {
      return { id: "activator11", name: "Ativador 11 dígitos" };
    }
    if (raw.includes("ativador_5100") && !/(^|[._-])11($|[._-])/.test(id)) {
      return { id: "activator16", name: "Ativador 16 dígitos" };
    }
    if (/(^|[._-])16($|[._-])/.test(id) || (/\b16\b/.test(raw) && activatorWords.test(raw))) {
      return { id: "activator16", name: "Ativador 16 dígitos" };
    }
    if (/(^|[._-])11($|[._-])/.test(id) || (/\b11\b/.test(raw) && activatorWords.test(raw))) {
      return { id: "activator11", name: "Ativador 11 dígitos" };
    }
    if (id.startsWith("launcher") || gid === "launcher" || raw.includes("jc launcher") || raw.includes("launcher lite") || raw.includes("launcher pro")) {
      return { id: "launcher", name: "JC Launcher Lite/Pro" };
    }
    if (id.startsWith("attendant") || gid === "attendant" || raw.includes("atendente")) {
      return { id: "attendant", name: "Atendente Virtual" };
    }
    if (id.startsWith("reseller") || gid === "reseller" || raw.includes("revendedor") || raw.includes("revenda")) {
      return { id: "reseller", name: "Revenda" };
    }
    if (gid === "config" || id.startsWith("config") || raw.includes(" config") || raw.includes(".config")) {
      return { id: "config", name: "Ativador — Download CONFIG" };
    }
    if (gid === "packages" || raw.includes("pacote") || raw.includes("btv") || raw.includes("stv") || raw.includes("xplus") || raw.includes("eaigo")) {
      return { id: "packages", name: "Pacote de APK" };
    }
    if (gid === "reports" || raw.includes("relat")) {
      return { id: "reports", name: "Relatórios" };
    }
    return null;
  }
  function functionGroupForAdmin(f) {
    const canonical = canonicalPermissionGroup(f);
    if (canonical) return canonical;
    return {
      id: String(f?.group_id || "other") || "other",
      name: String(f?.group_name || "Outras funções") || "Outras funções",
    };
  }
  function orderedFunctionGroups(functions = state.functions) {
    const byId = new Map();
    const virtualFunctions = [
      {id:"activator16.open",name:"Ativador 16 Dígitos",group_id:"activator16",group_name:"Ativador 16 dígitos",action_kind:"entry",sort_order:116.0,active:true},
      {id:"activator16.access",name:"Ativador 16",group_id:"activator16",group_name:"Ativador 16 dígitos",action_kind:"link",sort_order:117.0,active:true},
      {id:"activator16.reset",name:"Resetar ativador 16",group_id:"activator16",group_name:"Ativador 16 dígitos",action_kind:"action",sort_order:118.0,active:true},
      {id:"activator16.generate",name:"Gerar ativação 16",group_id:"activator16",group_name:"Ativador 16 dígitos",action_kind:"action",sort_order:119.0,active:true},
      {id:"activator16.copy",name:"Copiar ativação 16",group_id:"activator16",group_name:"Ativador 16 dígitos",action_kind:"action",sort_order:120.0,active:true},
      {id:"activator16.generate_download",name:"Gerar código download 16",group_id:"activator16",group_name:"Ativador 16 dígitos",action_kind:"action",sort_order:121.0,active:true},
      {id:"activator16.copy_download",name:"Copiar código download 16",group_id:"activator16",group_name:"Ativador 16 dígitos",action_kind:"action",sort_order:122.0,active:true},
      {id:"activatorvip.open",name:"Ativador VIP",group_id:"activatorvip",group_name:"Ativador VIP",action_kind:"entry",sort_order:122.0,active:true},
      {id:"activatorvip.access",name:"Abrir APK VIP",group_id:"activatorvip",group_name:"Ativador VIP",action_kind:"link",sort_order:122.1,active:true},
      {id:"activatorvip.reset",name:"Resetar ativador VIP",group_id:"activatorvip",group_name:"Ativador VIP",action_kind:"action",sort_order:122.2,active:true},
      {id:"activatorvip.generate",name:"Gerar ativação VIP",group_id:"activatorvip",group_name:"Ativador VIP",action_kind:"action",sort_order:122.3,active:true},
      {id:"activatorvip.copy",name:"Copiar ativação VIP",group_id:"activatorvip",group_name:"Ativador VIP",action_kind:"action",sort_order:122.4,active:true},
      {id:"activatorvip.generate_download",name:"Gerar código download VIP",group_id:"activatorvip",group_name:"Ativador VIP",action_kind:"action",sort_order:122.5,active:true},
      {id:"activatorvip.copy_download",name:"Copiar código download VIP",group_id:"activatorvip",group_name:"Ativador VIP",action_kind:"action",sort_order:122.55,active:true},
      {id:"activators.mass.config",name:"GERAR ZIP (CONFIG em massa)",group_id:"activators_mass",group_name:"Geração em Lote",action_kind:"action",sort_order:122.6,active:true},
      {id:"activators.mass.11",name:"11 dígitos em massa",group_id:"activators_mass",group_name:"Geração em Lote",action_kind:"action",sort_order:122.7,active:true},
      {id:"activators.mass.16",name:"16 dígitos em massa",group_id:"activators_mass",group_name:"Geração em Lote",action_kind:"action",sort_order:122.8,active:true},
      {id:"activators.mass.vip",name:"VIP em massa",group_id:"activators_mass",group_name:"Geração em Lote",action_kind:"action",sort_order:122.9,active:true},
    ];
    const merged=[...(functions||[])];
    virtualFunctions.forEach((item)=>{if(!merged.some((f)=>String(f?.id||"")===item.id))merged.push(item);});
    const fixedActivatorFunctions = {
      activator16: new Set(["activator16.open","activator16.access","activator16.reset","activator16.generate","activator16.copy","activator16.generate_download","activator16.copy_download"]),
      activatorvip: new Set(["activatorvip.open","activatorvip.access","activatorvip.reset","activatorvip.generate","activatorvip.copy","activatorvip.generate_download","activatorvip.copy_download"]),
    };
    const seenFunctionIds = new Set();
    merged.filter((f) => String(f?.id || "") !== "activators.mass.open").forEach((f) => {
      const functionId = String(f?.id || "").trim();
      if (!functionId || seenFunctionIds.has(functionId)) return;
      seenFunctionIds.add(functionId);
      const group = functionGroupForAdmin(f);
      // Os cards 16 e VIP usam a mesma estrutura enxuta, mas cada um conserva
      // seus próprios IDs/configurações. Itens herdados (como UniTV Free — Android 12+)
      // não pertencem mais a esses dois cards.
      if (fixedActivatorFunctions[group.id] && !fixedActivatorFunctions[group.id].has(functionId)) return;
      const item = { ...f, group_id: group.id, group_name: group.name };
      if (!byId.has(group.id)) byId.set(group.id, { id: group.id, name: group.name, items: [] });
      byId.get(group.id).items.push(item);
    });
    return [...byId.values()]
      .map((g) => ({ ...g, items: g.items.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.name || "").localeCompare(String(b.name || ""), "pt-BR")) }))
      .sort((a, b) => {
        const ia = ADMIN_GROUP_ORDER.indexOf(a.id), ib = ADMIN_GROUP_ORDER.indexOf(b.id);
        const oa = ia >= 0 ? ia : 999, ob = ib >= 0 ? ib : 999;
        return oa - ob || a.name.localeCompare(b.name, "pt-BR");
      });
  }

  function initials(value) {
    const parts=String(value||"").trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0]||"?")+(parts.length>1?(parts[parts.length-1]?.[0]||""):"")).toUpperCase();
  }
  function avatarHtml(c, sizeClass="") {
    const data=String(c?.avatar_data||"");
    const name=c?.full_name||c?.username||"Cliente";
    return `<span class="client-avatar ${sizeClass}">${data?`<img src="${esc(data)}" alt="Foto de ${esc(name)}">`:esc(initials(name))}</span>`;
  }
  function updateAvatarPreview(data, name) {
    state.avatarData=String(data||"");
    if($("avatarData")) $("avatarData").value=state.avatarData;
    const box=$("avatarPreview");
    if(!box) return;
    box.innerHTML=state.avatarData?`<img src="${esc(state.avatarData)}" alt="Prévia da foto">`:esc(initials(name||$("fullName")?.value||$("username")?.value));
  }
  async function compressAvatarFile(file) {
    if(!file) return "";
    if(!String(file.type||"").startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
    if(file.size>12*1024*1024) throw new Error("A imagem é muito grande. Escolha uma foto com até 12 MB.");
    const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error("Não foi possível ler a foto."));r.readAsDataURL(file);});
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error("Não foi possível abrir a foto."));i.src=src;});
    const size=320, canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;const ctx=canvas.getContext("2d");
    const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;
    ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
    let out=canvas.toDataURL("image/jpeg",.78);
    if(out.length>180000) out=canvas.toDataURL("image/jpeg",.62);
    if(out.length>180000) throw new Error("Não foi possível compactar a foto. Escolha outra imagem.");
    return out;
  }
  async function useAvatarFile(file) {
    const data=await compressAvatarFile(file);
    updateAvatarPreview(data);
    markTestDirty();
    A.toast("Foto preparada. Salve o cadastro para confirmar.");
  }

  function accountTypeOf(c) {
    if (c?.account_type) return c.account_type;
    if (c?.role === "test") return "test";
    if (Number(c?.plan_months) === 0) return "one_time";
    return "monthly";
  }
  function accountLabel(c) {
    return ({monthly:"Mensal",one_time:"Pagamento único",test:"Teste",credits:"Créditos"})[accountTypeOf(c)] || "Cliente";
  }
  function phoneList(c) { return [c?.whatsapp,c?.whatsapp2,c?.whatsapp3].filter(Boolean); }
  const whatsappDispatch={title:'',message:'',recipients:[],opened:new Set()};
  function waPhone(value){
    let n=String(value||'').replace(/\D/g,'');
    if(n.startsWith('00')) n=n.replace(/^00+/, '');
    if(n.startsWith('550')&&(n.length===13||n.length===14)) n='55'+n.slice(3);
    if(n.startsWith('0')&&(n.length===11||n.length===12)) n=n.slice(1);
    if((n.length===10||n.length===11)&&!n.startsWith('55')) n='55'+n;
    return n;
  }
  function whatsappRecipients(source){
    const raw=Array.isArray(source)?source:[
      {label:'WhatsApp principal',value:source?.whatsapp},
      {label:'WhatsApp 2',value:source?.whatsapp2},
      {label:'WhatsApp 3',value:source?.whatsapp3}
    ];
    const seen=new Set(),out=[];
    raw.forEach((item,index)=>{const phone=waPhone(item?.value??item);if(phone.length<12||phone.length>13||seen.has(phone))return;seen.add(phone);out.push({label:item?.label||`WhatsApp ${index+1}`,phone});});
    return out;
  }
  function ensureWhatsappDispatch(){
    if(document.getElementById('jcWhatsappDispatch'))return;
    const style=document.createElement('style');style.id='jcWhatsappDispatchStyle';style.textContent=`
      .jc-wa-overlay{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.78);backdrop-filter:blur(8px)}
      .jc-wa-overlay.open{display:flex}.jc-wa-box{width:min(660px,100%);max-height:94vh;overflow:auto;border:1px solid var(--line);border-radius:20px;background:#091a29;box-shadow:var(--shadow)}
      .jc-wa-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:17px 18px;border-bottom:1px solid var(--line)}.jc-wa-head h3{margin:0}.jc-wa-head p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.45}
      .jc-wa-list{display:grid;gap:9px;padding:16px 18px}.jc-wa-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.035)}
      .jc-wa-row b,.jc-wa-row small{display:block}.jc-wa-row small{color:var(--muted);margin-top:4px}.jc-wa-row.sent{border-color:rgba(37,211,102,.45);background:rgba(37,211,102,.07)}
      .jc-wa-foot{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:14px 18px;border-top:1px solid var(--line)}
      @media(max-width:600px){.jc-wa-row{grid-template-columns:1fr}.jc-wa-row .btn{width:100%}.jc-wa-foot{display:grid}.jc-wa-foot .btn{width:100%}}
    `;document.head.appendChild(style);
    const modal=document.createElement('div');modal.id='jcWhatsappDispatch';modal.className='jc-wa-overlay';modal.innerHTML=`<div class="jc-wa-box"><div class="jc-wa-head"><div><h3 id="jcWaTitle">Enviar pelo WhatsApp</h3><p id="jcWaSubtitle">Escolha um número cadastrado. O WhatsApp será aberto com a mensagem pronta; o envio final é confirmado por você.</p></div><button class="btn red" id="jcWaClose" type="button">Fechar</button></div><div class="jc-wa-list" id="jcWaList"></div><div class="jc-wa-foot"><button class="btn" id="jcWaCopy" type="button">Copiar mensagem</button><button class="btn green" id="jcWaNext" type="button">Abrir próximo número</button></div></div>`;document.body.appendChild(modal);
    const close=()=>modal.classList.remove('open');document.getElementById('jcWaClose').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});
    document.getElementById('jcWaCopy').onclick=()=>A.copy(whatsappDispatch.message).then(()=>A.toast('Mensagem copiada.'));
    document.getElementById('jcWaNext').onclick=()=>{const idx=whatsappDispatch.recipients.findIndex((_,i)=>!whatsappDispatch.opened.has(i));if(idx<0)return A.toast('Todos os números já foram abertos.');openWhatsappRecipient(idx);};
  }
  function renderWhatsappDispatch(){
    ensureWhatsappDispatch();document.getElementById('jcWaTitle').textContent=whatsappDispatch.title||'Enviar pelo WhatsApp';
    const list=document.getElementById('jcWaList');list.innerHTML=whatsappDispatch.recipients.map((r,i)=>`<div class="jc-wa-row ${whatsappDispatch.opened.has(i)?'sent':''}"><div><b>${esc(r.label)}</b><small>${esc(r.phone)}${whatsappDispatch.opened.has(i)?' • WhatsApp já aberto':''}</small></div><button class="btn green" type="button" data-jc-wa-index="${i}">${whatsappDispatch.opened.has(i)?'Abrir novamente':'Abrir WhatsApp'}</button></div>`).join('');
    list.querySelectorAll('[data-jc-wa-index]').forEach(b=>b.onclick=()=>openWhatsappRecipient(Number(b.dataset.jcWaIndex)));
    document.getElementById('jcWaNext').disabled=whatsappDispatch.recipients.every((_,i)=>whatsappDispatch.opened.has(i));document.getElementById('jcWhatsappDispatch').classList.add('open');
  }
  function openWhatsappUrl(phone,message){
    const opened=window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(String(message||'')),'_blank','noopener');
    if(!opened){A.copy(message).then(()=>A.toast('O navegador bloqueou a nova aba. A mensagem foi copiada. Permita pop-ups para este site.','error'));return false;}
    return true;
  }
  function openWhatsappRecipient(index){
    const r=whatsappDispatch.recipients[index];if(!r)return;if(openWhatsappUrl(r.phone,whatsappDispatch.message)){whatsappDispatch.opened.add(index);renderWhatsappDispatch();}
  }
  function sendWhatsappMessage(source,message,title){
    const recipients=whatsappRecipients(source);
    if(!recipients.length){A.copy(message).then(()=>A.toast('Nenhum WhatsApp válido. A mensagem foi copiada.'));return;}
    if(recipients.length===1){
      if(openWhatsappUrl(recipients[0].phone,message)) A.toast(`WhatsApp aberto para ${recipients[0].label}.`);
      return;
    }
    whatsappDispatch.title=title||'Enviar pelo WhatsApp';
    whatsappDispatch.message=String(message||'');
    whatsappDispatch.recipients=recipients;
    whatsappDispatch.opened=new Set();
    renderWhatsappDispatch();
  }
  function trialExpired(c) { return accountTypeOf(c)==="test" && c.trial_expires_at && new Date(c.trial_expires_at) < new Date(); }
  function dateOnly(value){ return String(value||"").slice(0,10); }
  function monthKey(value){
    const text=String(value||"").trim();
    if(!text)return "";
    const m=text.match(/^(\d{4}-\d{2})/);
    return m?m[1]:"";
  }
  function paymentMonthKey(payment){ return monthKey(payment?.reference_month)||monthKey(payment?.competency); }
  function billingStartsLater(c,today=A.isoDate(new Date())){ const start=dateOnly(c?.starts_at);return Boolean(start&&start>today); }
  function billingCoverageActive(c,today=A.isoDate(new Date())){
    const expiry=dateOnly(c?.expires_at), current=monthKey(today);
    return Boolean(expiry&&monthKey(expiry)>current);
  }
  function monthlyBillingOverdue(c,today=A.isoDate(new Date())){
    if(accountTypeOf(c)!=="monthly"||billingStartsLater(c,today)||billingCoverageActive(c,today)||c.current_month_payment||c.next_paid_payment)return false;
    const grace=dateOnly(c?.grace_until);return Boolean(grace&&grace<today);
  }
  function paymentRelatedBlock(c){
    const reason=String(c?.block_reason||"").toLowerCase();
    if(reason.includes("bloqueio manual")) return false;
    return /(pagamento|billing|vencid|atras|inadimpl|mensalidade)/.test(reason);
  }
  function manualBillingBlock(c){
    const reason=String(c?.block_reason||"").toLowerCase();
    return ["blocked","expired"].includes(String(c?.status||"")) && Boolean(c?.block_reason) && (reason.includes("bloqueio manual") || !paymentRelatedBlock(c));
  }
  function competencyLabel(value){
    const date=dateOnly(value);if(!date)return "";
    const label=new Date(date+"T12:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
    return label.charAt(0).toUpperCase()+label.slice(1);
  }
  function paymentState(c) {
    const type=accountTypeOf(c), today=A.isoDate(new Date());
    if(type==="one_time") return {text:"Sem mensalidade",cls:"payment-ok"};
    if(type==="credits") return {text:"Sem cobrança mensal",cls:"payment-ok"};
    if(type==="test") return {text:trialExpired(c)?"Teste encerrado":"Teste ativo",cls:trialExpired(c)?"payment-late":"payment-ok"};
    if(manualBillingBlock(c)) return {text:"Bloqueado manualmente",cls:"payment-late"};
    if(billingStartsLater(c,today)) return {text:"Cobrança inicia em "+A.date(c.starts_at),cls:"payment-ok"};
    if(c.current_month_payment) return {text:"PAGO NO MÊS • "+new Date(c.current_month_payment.paid_at).toLocaleDateString('pt-BR'),cls:"payment-ok"};
    if(c.next_paid_payment) return {text:"PAGO • próxima competência "+competencyLabel(c.next_paid_payment.reference_month||c.next_paid_payment.competency),cls:"payment-ok"};
    if(billingCoverageActive(c,today)) return {text:"PAGO • válido até "+A.date(c.expires_at),cls:"payment-ok"};
    if(monthlyBillingOverdue(c,today)) return {text:"Bloqueado por atraso",cls:"payment-late"};
    if(c.expires_at) return {text:"Em aberto • limite "+A.date(c.grace_until||c.expires_at),cls:"payment-warn"};
    return {text:"Vencimento não configurado",cls:"payment-warn"};
  }
  function paymentBucket(c){
    if(accountTypeOf(c)!=='monthly')return 'open';
    const today=A.isoDate(new Date());
    if(manualBillingBlock(c))return 'blocked';
    if(billingStartsLater(c,today))return 'open';
    if(c.current_month_payment||c.next_paid_payment||billingCoverageActive(c,today))return 'paid';
    if(monthlyBillingOverdue(c,today))return 'blocked';
    return 'open';
  }
  function paymentSection(bucket){
    const map={open:{key:'10-open',label:'EM ABERTO / NORMAL',note:'Cobrança do mês, clientes normais ou cobrança futura ainda não iniciada'},paid:{key:'20-paid',label:'──────── PAGOS NO MÊS ────────',note:'Pagos no mês, próxima competência ou já cobertos para mês futuro'},blocked:{key:'30-blocked',label:'──────── BLOQUEADOS ────────',note:'Bloqueados depois do último dia configurado'}};
    return map[bucket]||map.open;
  }
  function clientCategory(c){
    const type=accountTypeOf(c);
    if(type==="test") return {key:"00-test",label:"Clientes de teste",note:"Acesso completo em demonstração"};
    if(type==="credits") return {key:"90-credits",label:"Clientes por créditos",note:"Saldo de downloads e ações"};
    if(type==="one_time") return {key:"80-one",label:c.plan_name||"Pagamento único",note:"Sem mensalidade"};
    const months=Number(c.plan_months||1);
    const labels={1:"Mensal",3:"3 meses",6:"6 meses",12:"1 ano"};
    return {key:`10-${String(months).padStart(4,"0")}`,label:labels[months]||c.plan_name||`${months} meses`,note:`${months} ${months===1?"mês":"meses"}`};
  }
  function renderClients() {
    const q = $("searchInput").value.trim().toLowerCase();
    const paymentGrouping=state.accountFilter==='all'&&state.paymentFilter==='all';
    const list = visibleDirectClients().filter((c) => {
      const typeOk = state.accountFilter === "all" || accountTypeOf(c) === state.accountFilter;
      const payOk = state.paymentFilter === "all" || paymentBucket(c) === state.paymentFilter;
      const qOk = !q || [c.full_name,c.username,c.email,...phoneList(c)].some((v) => String(v || "").toLowerCase().includes(q));
      return typeOk && payOk && qOk;
    }).sort((a,b)=>{
      if(paymentGrouping){const pa=paymentSection(paymentBucket(a)),pb=paymentSection(paymentBucket(b));return pa.key.localeCompare(pb.key)||String(a.full_name||"").localeCompare(String(b.full_name||""),"pt-BR");}
      const ca=clientCategory(a),cb=clientCategory(b);
      return ca.key.localeCompare(cb.key)||String(a.full_name||"").localeCompare(String(b.full_name||""),"pt-BR");
    });
    let lastCategory="";
    const html=[], mobile=[];
    list.forEach((c) => {
      const category=paymentGrouping?paymentSection(paymentBucket(c)):clientCategory(c);
      if(category.key!==lastCategory){
        const count=list.filter((x)=>(paymentGrouping?paymentSection(paymentBucket(x)).key:clientCategory(x).key)===category.key).length;
        if(paymentGrouping){const bucket=paymentBucket(c);html.push(`<tr class="client-payment-section ${bucket}"><td colspan="8">${esc(category.label)} <small>${count} cliente${count===1?"":"s"} • ${esc(category.note)}</small></td></tr>`);mobile.push(`<div class="mobile-payment-section ${bucket}">${esc(category.label)}<small style="display:block;margin-top:4px">${count} cliente${count===1?"":"s"}</small></div>`);}else{html.push(`<tr class="client-category-row"><td colspan="8">${esc(category.label)} <small>${count} cliente${count===1?"":"s"} • ${esc(category.note)}</small></td></tr>`);mobile.push(`<div class="mobile-category">${esc(category.label)}<small>${count} cliente${count===1?"":"s"} • ${esc(category.note)}</small></div>`);}
        lastCategory=category.key;
      }
      const type=accountTypeOf(c), pay=paymentState(c);
      const perms=(c.user_permissions||[]).filter((p)=>p.enabled).length;
      const panelEvt=(c.password_events||[]).find((e)=>e.access_type==="panel");
      const attEvt=(c.password_events||[]).find((e)=>e.access_type==="attendant_settings");
      const att=Array.isArray(c.attendant_profiles)?c.attendant_profiles[0]:c.attendant_profiles;
      const testStatus=c.access_test_status||"pending";
      const testClass=testStatus==="passed"?"test-ok":testStatus==="failed"?"test-failed":"test-pending";
      const phones=phoneList(c).map((x,i)=>`${i+1}. ${esc(x)}`).join("<br>")||"Sem WhatsApp";
      const futureStart=type==="monthly"&&billingStartsLater(c);
      const expiry=type==="test"?(c.trial_expires_at?new Date(c.trial_expires_at).toLocaleString("pt-BR"):A.date(c.expires_at)):type==="monthly"?(futureStart?"Primeira cobrança em "+A.date(c.starts_at):(c.expires_at?"Validade "+A.date(c.expires_at):"Sem vencimento configurado")):"Sem vencimento";
      const billingLimit=type==="monthly"&&c.grace_until&&!futureStart?" • limite "+A.date(c.grace_until):"";
      const creditCell=type==="credits"?`<span class="balance-pill">${Number(c.credits_balance||0)} créditos</span><br><small>Total comprado: ${Number(c.credits_total_purchased||0)}</small>`:"—";
      const actions=[];
      actions.push(`<button class="btn" data-edit="${c.id}">Editar/Testar</button>`);
      actions.push(`<button class="btn blue" data-support="${c.id}">Acesso técnico</button>`);
      actions.push(`<button class="btn amber" data-pass="${c.id}">Redefinir senhas</button>`);
      actions.push(`<button class="btn green" data-msg="${c.id}" ${testStatus==="passed"?"":"disabled title='Aprove o pré-teste antes de enviar'"}>Acesso</button>`);
      if(type==="monthly") actions.push(`<button class="btn green" data-pay="${c.id}">Marcar pago</button><button class="btn amber" data-bill="${c.id}">Cobrar</button>`);
      if(type==="credits") actions.push(`<button class="btn blue" data-credit="${c.id}">Créditos</button>`);
      if(type!=="test") actions.push(`<button class="btn" data-renew="${c.id}">Planos</button>`);
      actions.push(`<button class="btn ${c.status==="active"?"amber":"green"}" data-toggle-block="${c.id}">${c.status==="active"?"Bloquear":"Desbloquear"}</button>`);
      actions.push(`<button class="btn red" data-del="${c.id}">Excluir</button>`);
      const avatar=avatarHtml(c);
      html.push(`<tr><td><div class="client-name-cell">${avatar}<div><b>${esc(c.full_name)}</b><br><small>@${esc(c.username)}</small><br><span class="badge">${accountLabel(c)}</span> <span class="badge ${c.status==="active"?"":"blocked"}">${esc(c.status)}</span>${c.is_reseller?' <span class="badge att">Revendedor</span>':''}</div></div></td><td>${esc(c.email)}<br>${phones}<br>${c.billing_opt_in?'<span class="badge">Cobrança autorizada</span>':'<span class="badge blocked">Sem cobrança</span>'}</td><td><b>${esc(c.plan_name||accountLabel(c))}</b><br>${type==="test"?"Demonstração":type==="credits"?"Uso por saldo":A.money(c.plan_value||0)}</td><td><span class="${pay.cls}">${pay.text}</span><br><small>${expiry}${billingLimit}</small></td><td>${creditCell}</td><td><span class="badge">${perms} funções</span>${c.attendant_enabled?`<br><span class="badge att">Atendente: ${esc(att?.slug||"configurar")}</span>`:""}<br><span class="badge ${testClass}">${esc(testStatus)}</span></td><td><small>Painel: ${panelEvt?new Date(panelEvt.created_at).toLocaleString("pt-BR"):"não alterada"}</small><br><small>Atendente: ${attEvt?new Date(attEvt.created_at).toLocaleString("pt-BR"):"não configurada"}</small></td><td><div class="row-actions">${actions.join("")}</div></td></tr>`);
      mobile.push(`<article class="mobile-client-card"><div class="mobile-client-head">${avatarHtml(c,"large")}<div><h4>${esc(c.full_name)}</h4><small>@${esc(c.username)}</small><div class="mobile-client-badges"><span class="badge">${accountLabel(c)}</span><span class="badge ${c.status==="active"?"":"blocked"}">${esc(c.status)}</span>${c.is_reseller?'<span class="badge att">Revendedor</span>':''}</div></div></div><div class="mobile-client-info"><div class="mobile-info-block"><b>Contato</b>${esc(c.email)}<br>${phones}</div><div class="mobile-info-block"><b>Plano e valor</b>${esc(c.plan_name||accountLabel(c))}<br>${type==="test"?"Demonstração":type==="credits"?"Uso por saldo":A.money(c.plan_value||0)}</div><div class="mobile-info-block"><b>Pagamento / validade</b><span class="${pay.cls}">${pay.text}</span><br>${expiry}${billingLimit}</div><div class="mobile-info-block"><b>Acessos</b>${perms} funções${c.attendant_enabled?`<br>Atendente: ${esc(att?.slug||"configurar")}`:""}<br>Teste: ${esc(testStatus)}</div></div><div class="row-actions">${actions.join("")}</div></article>`);
    });
    $("clientRows").innerHTML = html.length ? html.join("") : `<tr><td colspan="8" class="empty">Nenhum cliente encontrado.</td></tr>`;
    if($("mobileClientCards")) $("mobileClientCards").innerHTML=mobile.length?mobile.join(""):`<div class="empty">Nenhum cliente encontrado.</div>`;
    renderStats(); bindRows(); renderBillingClientList();
  }
  function bindRows() {
    document.querySelectorAll("[data-edit]").forEach((b)=>b.onclick=()=>openClient(state.clients.find((x)=>x.id===b.dataset.edit)));
    document.querySelectorAll("[data-support]").forEach((b)=>b.onclick=()=>openTechnicalAccess(b.dataset.support).catch((e)=>A.toast(e.message||"Não foi possível abrir o acesso técnico.","error")));
    document.querySelectorAll("[data-pass]").forEach((b)=>b.onclick=()=>openPassword(b.dataset.pass));
    document.querySelectorAll("[data-msg]").forEach((b)=>b.onclick=()=>openMessage(state.clients.find((x)=>x.id===b.dataset.msg)));
    document.querySelectorAll("[data-renew]").forEach((b)=>b.onclick=()=>sendPlansToClient(state.clients.find((x)=>x.id===b.dataset.renew)));
    document.querySelectorAll("[data-bill]").forEach((b)=>b.onclick=()=>openBillingClient(state.clients.find((x)=>x.id===b.dataset.bill)));
    document.querySelectorAll("[data-pay]").forEach((b)=>b.onclick=()=>openPayment(state.clients.find((x)=>x.id===b.dataset.pay)));
    document.querySelectorAll("[data-credit]").forEach((b)=>b.onclick=()=>openCredits(state.clients.find((x)=>x.id===b.dataset.credit)));
    document.querySelectorAll("[data-toggle-block]").forEach((b)=>b.onclick=()=>toggleClientBlock(b.dataset.toggleBlock,b).catch((e)=>A.toast(e.message||"Não foi possível alterar o bloqueio.","error")));
    document.querySelectorAll("[data-del]").forEach((b)=>b.onclick=()=>deleteClient(b.dataset.del,b).catch((e)=>A.toast(e.message||"Não foi possível excluir o cliente.","error")));
  }
  $("searchInput").addEventListener("input", renderClients);
  document.querySelectorAll("[data-account-filter]").forEach((b)=>b.addEventListener("click",()=>{
    state.accountFilter=b.dataset.accountFilter;
    document.querySelectorAll("[data-account-filter]").forEach((x)=>x.classList.toggle("active",x===b));
    renderClients();
  }));
  document.querySelectorAll("[data-payment-filter]").forEach((b)=>b.addEventListener("click",()=>{
    state.paymentFilter=b.dataset.paymentFilter;
    document.querySelectorAll("[data-payment-filter]").forEach((x)=>x.classList.toggle("active",x===b));
    renderClients();
  }));
  $("reloadBtn").addEventListener("click", () =>
    loadAll().catch((e) => A.toast(e.message, "error")),
  );

  function activePlans() {
    return state.plans.filter((p) => p.active !== false);
  }
  function planPriceText(p) {
    const value = Number(p?.value || 0);
    return value > 0 ? A.money(value) : "Valor sob consulta";
  }
  function planLine(p) {
    let line = `${p.name} — ${planPriceText(p)}`;
    if (Number(p.economy) > 0) line += ` (economia de ${A.money(p.economy)})`;
    if (String(p.note || "").trim()) line += ` — ${String(p.note).trim()}`;
    return line;
  }
  function renderPlanOptions(type = $("accountType")?.value || "monthly") {
    const current=$("planMonths")?.value;
    let plans=activePlans(); if(type==="one_time") plans=plans.filter((p)=>Number(p.months)===0); else plans=plans.filter((p)=>Number(p.months)>0);
    $("planMonths").innerHTML=plans.map((p)=>`<option value="${p.months}">${esc(p.name)} — ${planPriceText(p)}</option>`).join("");
    if(current&&plans.some((p)=>String(p.months)===current))$("planMonths").value=current;
  }
  function renderPlanCards() {
    $("planGrid").innerHTML = state.plans
      .map((p) =>
        `<div class="plan-card">
          <div class="field"><label>Nome do plano</label><input data-plan-name="${p.months}" value="${esc(p.name)}"></div>
          <div class="field"><label>Valor</label><input type="number" step="0.01" min="0" data-plan-value="${p.months}" value="${p.value}"></div>
          <div class="field"><label>Economia</label><input type="number" step="0.01" min="0" data-plan-economy="${p.months}" value="${p.economy}"></div>
          <div class="field"><label>Observação</label><input data-plan-note="${p.months}" value="${esc(p.note || "")}" placeholder="Ex.: Sem mensalidades"></div>
          <label class="checkline"><input type="checkbox" data-plan-active="${p.months}" ${p.active !== false ? "checked" : ""}> Exibir este plano</label>
          <div class="plan-card-actions"><button class="btn" type="button" data-edit-plan="${p.months}">Editar duração</button><button class="btn red" type="button" data-delete-plan="${p.months}">Excluir</button></div>
        </div>`,
      ).join("") + `<div class="plan-card add-plan-card" id="addPlanCard" role="button" tabindex="0"><div><div class="plus">＋</div><b>Adicionar novo plano</b><small>Crie outra duração, valor e descrição</small></div></div>`;
    $("addPlanCard").onclick=()=>openPlanEditor();
    $("addPlanCard").onkeydown=(e)=>{if(e.key==="Enter"||e.key===" ")openPlanEditor();};
    document.querySelectorAll("[data-edit-plan]").forEach((b)=>b.onclick=()=>openPlanEditor(state.plans.find((p)=>String(p.months)===b.dataset.editPlan)));
    document.querySelectorAll("[data-delete-plan]").forEach((b)=>b.onclick=()=>deletePlan(Number(b.dataset.deletePlan)));
  }
  function openPlanEditor(plan=null){
    $("planEditorTitle").textContent=plan?"Editar plano":"Adicionar novo plano";
    $("planEditorOriginalMonths").value=plan?String(plan.months):"";
    $("planEditorMonths").value=plan?Number(plan.months):"";
    $("planEditorName").value=plan?.name||"";
    $("planEditorValue").value=Number(plan?.value||0);
    $("planEditorEconomy").value=Number(plan?.economy||0);
    $("planEditorNote").value=plan?.note||"";
    $("planEditorOneTime").value=String(Boolean(plan?.one_time));
    $("planEditorActive").value=String(plan?.active!==false);
    openModal("planEditorModal");
  }
  async function saveNewPlan(){
    const old=$("planEditorOriginalMonths").value;
    const months=Math.max(0,Math.trunc(Number($("planEditorMonths").value)));
    const name=$("planEditorName").value.trim();
    if(!name)throw new Error("Informe o nome do plano.");
    if(state.plans.some((p)=>Number(p.months)===months&&String(p.months)!==old))throw new Error("Já existe um plano com esta duração.");
    const used=old&&Number(old)!==months&&state.clients.some((c)=>accountTypeOf(c)==="monthly"&&Number(c.plan_months)===Number(old));
    if(used)throw new Error("Este plano já possui clientes. Mantenha a duração e altere apenas nome e valor.");
    if(old&&Number(old)!==months){const del=await A.client.from("plans").delete().eq("months",Number(old));if(del.error)throw del.error;}
    const row={months,name,value:Math.max(0,Number($("planEditorValue").value)||0),economy:Math.max(0,Number($("planEditorEconomy").value)||0),note:$("planEditorNote").value.trim(),one_time:$("planEditorOneTime").value==="true",active:$("planEditorActive").value!=="false",sort_order:state.plans.length+1};
    const {error}=await A.client.from("plans").upsert(row,{onConflict:"months"});if(error)throw error;
    closeModals();await loadPlans();renderPlansMessage();A.toast("Plano salvo.");
  }
  async function deletePlan(months){
    const plan=state.plans.find((p)=>Number(p.months)===months);if(!plan)return;
    const used=state.clients.some((c)=>accountTypeOf(c)==="monthly"&&Number(c.plan_months)===months);
    if(used)return A.toast("Este plano possui clientes. Mova os clientes para outro plano antes de excluir.","error");
    if(!confirm(`Excluir o plano ${plan.name}?`))return;
    const {error}=await A.client.from("plans").delete().eq("months",months);if(error)throw error;
    await loadPlans();renderPlansMessage();A.toast("Plano excluído.");
  }
  async function savePlans() {
    const rows = state.plans.map((p) => ({
      ...p,
      name: document.querySelector(`[data-plan-name="${p.months}"]`).value.trim() || p.name,
      value: Number(document.querySelector(`[data-plan-value="${p.months}"]`).value),
      economy: Number(document.querySelector(`[data-plan-economy="${p.months}"]`).value),
      note: document.querySelector(`[data-plan-note="${p.months}"]`).value.trim(),
      active: document.querySelector(`[data-plan-active="${p.months}"]`).checked,
    }));
    const { error } = await A.client.from("plans").upsert(rows, { onConflict: "months" });
    if (error) throw error;
    A.toast("Planos salvos.");
    await loadPlans();
    renderPlansMessage();
  }
  $("savePlansBtn").onclick = () => savePlans().catch((e) => A.toast(e.message, "error"));
  $("saveNewPlanBtn").onclick = () => saveNewPlan().catch((e)=>A.toast(e.message,"error"));

  // A configuração de consumo foi removida desta página. A única fonte
  // administrativa agora é painel-creditos.html, organizada por ação.
  function publicFormUrl(test=false) {
    const u=new URL("formulario-cliente.html",location.href);if(test)u.searchParams.set("tipo","teste");return u.href;
  }
  function requestMessage(test=false) {
    const intro=state.salesMessages.form_intro||"Olá! Para realizar seu cadastro no Painel JC-APK TV, preencha o formulário pelo link abaixo com seus dados corretos.";
    const lines=[intro,"",test?"🧪 FORMULÁRIO PARA ACESSO DE TESTE":"📋 FORMULÁRIO DE CADASTRO",publicFormUrl(test),"","Informe nome de usuário, nome completo, e-mail e até 3 WhatsApps.","Clientes antigos podem informar o HTML da última versão.","Também é possível solicitar orçamento de uma nova função.","","Você poderá entrar usando seu nome de usuário ou e-mail."];
    if(test)lines.push("O teste é temporário e demonstrativo, sem download ou código real.");
    return lines.join("\n");
  }
  function renderRequestMessages(){if($("requestClientMessage"))$("requestClientMessage").textContent=requestMessage(false);if($("requestTestMessage"))$("requestTestMessage").textContent=requestMessage(true);}
  function openRequestWhatsApp(test){window.open("https://wa.me/?text="+encodeURIComponent(requestMessage(test)),"_blank");}
  function renderPlansMessage() {
    const lines = [state.salesMessages.plans_intro || "Confira também nossas opções de plano:", ""];
    activePlans().forEach((p) => lines.push(planLine(p)));
    lines.push("", state.salesMessages.plans_footer || "Responda esta mensagem informando o plano desejado.");
    $("plansMessage").textContent = lines.join("\n");
  }
  $("copyPlansBtn").onclick = () =>
    A.copy($("plansMessage").textContent).then(() => A.toast("Mensagem copiada."));
  $("whatsappPlansBtn").onclick = () =>
    window.open("https://wa.me/?text=" + encodeURIComponent($("plansMessage").textContent), "_blank");
  $("copyRequestClientBtn").onclick=()=>A.copy(requestMessage(false)).then(()=>A.toast("Pedido de cadastro copiado."));
  $("whatsappRequestClientBtn").onclick=()=>openRequestWhatsApp(false);
  $("copyRequestTestBtn").onclick=()=>A.copy(requestMessage(true)).then(()=>A.toast("Pedido de teste copiado."));
  $("whatsappRequestTestBtn").onclick=()=>openRequestWhatsApp(true);
  function plansMessageForClient(c) {
    const lines = [
      `Olá, ${c?.full_name || "cliente"}!`,
      state.salesMessages.plans_intro || "Confira também nossas opções de plano:",
      "",
    ];
    activePlans().forEach((p) => lines.push(planLine(p)));
    lines.push("", state.salesMessages.plans_footer || "Responda esta mensagem informando o plano desejado.");
    return lines.join("\n");
  }
  function sendPlansToClient(c) {
    if (!c) return;
    sendWhatsappMessage(c, plansMessageForClient(c), `Enviar planos para ${c.full_name || c.username || "cliente"}`);
  }

  async function saveSalesMessages() {
    const value = {
      form_intro: $("salesFormIntro").value.trim(),
      plans_intro: $("salesPlansIntro").value.trim(),
      plans_footer: $("salesPlansFooter").value.trim(),
      access_intro: $("salesAccessIntro").value.trim(),
    };
    const { error } = await A.client.from("app_settings").upsert({ key: "sales_messages", value }, { onConflict: "key" });
    if (error) throw error;
    state.salesMessages = value;
    renderPlansMessage();
    renderRequestMessages();
    updateClientMessage();
    A.toast("Textos salvos.");
  }
  $("saveSalesMessagesBtn").onclick = () => saveSalesMessages().catch((e) => A.toast(e.message, "error"));

  function billingRuleValues() {
    const reminderInput=$("billingReminderDaysBefore"),graceInput=$("billingGraceDaysAfter");
    return {
      reminderDays:Math.max(0,Math.min(30,Number(reminderInput?.value ?? state.billing.reminder_days_before ?? 5)||0)),
      graceDays:Math.max(0,Math.min(30,Number(graceInput?.value ?? state.billing.grace_days_after ?? 5)||0)),
      panelEnabled:$("billingPanelNoticeEnabled")?$("billingPanelNoticeEnabled").checked:state.billing.panel_notice_enabled!==false,
      autoFillGrace:$("billingAutoFillGrace")?$("billingAutoFillGrace").checked:state.billing.auto_fill_grace!==false,
    };
  }
  function daysBetweenDates(from,to){
    const a=String(from||"").slice(0,10),b=String(to||"").slice(0,10);if(!a||!b)return 0;
    const [ay,am,ad]=a.split("-").map(Number),[by,bm,bd]=b.split("-").map(Number);
    return Math.round((Date.UTC(by,bm-1,bd)-Date.UTC(ay,am-1,ad))/86400000);
  }
  function billingDates(c){
    const rules=billingRuleValues(),due=dateOnly(c?.expires_at),savedLimit=dateOnly(c?.grace_until);
    const limit=savedLimit||(due?A.addDays(due,rules.graceDays):"");
    return {due,limit,reminder:due?A.addDays(due,-rules.reminderDays):"",block:limit?A.addDays(limit,1):"",rules};
  }
  function billingStageForClient(c,today=A.isoDate(new Date()),forced="auto"){
    if(forced&&forced!=="auto")return forced;
    if(accountTypeOf(c)!=="monthly"||billingStartsLater(c,today))return "ok";
    const dates=billingDates(c);if(!dates.due)return "ok";
    if(today<dates.reminder)return "ok";
    if(today<dates.due)return "reminder";
    if(today===dates.due)return "due";
    if(!dates.limit||today<=dates.limit)return "grace";
    return "blocked";
  }
  function billingPanelTemplate(stage){
    if(stage==="blocked")return $("billingPanelBlockedMessage")?.value||state.billing.panel_blocked_message||"";
    if(stage==="grace"||stage==="due")return $("billingPanelGraceMessage")?.value||state.billing.panel_grace_message||"";
    return $("billingPanelReminderMessage")?.value||state.billing.panel_reminder_message||"";
  }
  function billingCommonVars(c,today=A.isoDate(new Date())){
    const dates=billingDates(c),remaining=dates.limit?Math.max(0,daysBetweenDates(today,dates.limit)):0;
    return {nome:c?.full_name||"cliente",usuario:c?.username||"",plano:c?.plan_name||"",valor:A.money(c?.plan_value||0),vencimento:A.date(dates.due),limite_pagamento:A.date(dates.limit),data_bloqueio:A.date(dates.block),dias_restantes:String(remaining),suporte:state.billing.support_phone||state.signature.whatsapp||"",empresa:state.billing.company_name||"JC-APK TV"};
  }
  function applyBillingVars(template,vars){
    return String(template||"").replace(/\{(nome|usuario|plano|valor|vencimento|limite_pagamento|data_bloqueio|dias_restantes|suporte|empresa)\}/g,(_,key)=>vars[key]??"").replace(/\n{3,}/g,"\n\n").trim();
  }
  function billingPanelView(c,today=A.isoDate(new Date()),forced="auto"){
    const stage=billingStageForClient(c,today,forced),dates=billingDates(c),vars=billingCommonVars(c,today);
    const titles={ok:"Nenhum aviso de cobrança",reminder:"Lembrete de mensalidade",due:"Sua mensalidade vence hoje",grace:"Pagamento pendente — painel ainda liberado",blocked:"Acesso temporariamente bloqueado"};
    let message=stage==="ok"?(dates.due?`Próximo vencimento em ${A.date(dates.due)}. Nenhum aviso precisa aparecer nesta data.`:"Configure o vencimento deste cliente para ativar a cobrança individual."):applyBillingVars(billingPanelTemplate(stage),vars);
    if(!message&&stage!=="ok")message=`Vencimento: ${vars.vencimento}. Pagamento permitido até ${vars.limite_pagamento}. Bloqueio a partir de ${vars.data_bloqueio}.`;
    return {stage,title:titles[stage]||titles.ok,message,meta:dates.due?`Vencimento ${A.date(dates.due)} • último dia ${A.date(dates.limit)} • bloqueio ${A.date(dates.block)}`:"Vencimento não configurado",dates,vars};
  }
  function renderBillingRuleTimeline(){
    const host=$("billingRuleTimeline");if(!host)return;
    const rules=billingRuleValues(),due="2026-07-20",reminder=A.addDays(due,-rules.reminderDays),limit=A.addDays(due,rules.graceDays),block=A.addDays(limit,1);
    host.innerHTML=`<div class="billing-step"><b>1. Lembrete • ${A.date(reminder)}</b><span>${rules.reminderDays} dia(s) antes do vencimento de exemplo.</span></div><div class="billing-step warning"><b>2. Vencimento • ${A.date(due)}</b><span>A data individual do cliente é respeitada.</span></div><div class="billing-step warning"><b>3. Prazo final • ${A.date(limit)}</b><span>${rules.graceDays} dia(s) de tolerância, ainda com acesso.</span></div><div class="billing-step danger"><b>4. Bloqueio • ${A.date(block)}</b><span>Somente no dia seguinte ao prazo final.</span></div>`;
    updateClientBillingDateNote();
  }
  function updateClientBillingDateNote(){
    const note=$("billingClientDateNote"),due=$("expiresAt")?.value,limit=$("graceUntil")?.value;if(!note)return;
    if(!due){note.textContent="Defina o vencimento para calcular o lembrete, o último dia e o bloqueio.";return;}
    const dates=billingDates({expires_at:due,grace_until:limit});
    note.textContent=`Lembrete em ${A.date(dates.reminder)} • vencimento em ${A.date(dates.due)} • pagamento até ${A.date(dates.limit)} • bloqueio a partir de ${A.date(dates.block)}.`;
  }
  function fillBillingPreviewClients(){
    const select=$("billingPreviewClient");if(!select)return;
    const previous=select.value,rows=(state.clients||[]).filter((c)=>accountTypeOf(c)==="monthly"&&!c.archived_at);
    select.innerHTML=rows.length?rows.map((c)=>`<option value="${esc(c.id)}">${esc(c.full_name||c.username)} — vence ${esc(A.date(c.expires_at)||"sem data")}</option>`).join(""):'<option value="">Nenhum cliente mensal</option>';
    if(rows.some((c)=>c.id===previous))select.value=previous;
  }
  function renderBillingPreview(){
    const panel=$("billingPanelPreview"),whatsapp=$("billingWhatsappPreview"),select=$("billingPreviewClient");if(!panel||!whatsapp||!select)return;
    const c=(state.clients||[]).find((x)=>x.id===select.value),today=$("billingPreviewDate")?.value||A.isoDate(new Date()),forced=$("billingPreviewStage")?.value||"auto";
    if(!c){panel.className="billing-panel-preview ok";panel.innerHTML="<strong>Selecione um cliente mensal</strong><span>A mensagem que ele verá será mostrada aqui.</span>";whatsapp.textContent="A mensagem de WhatsApp também aparecerá aqui.";return;}
    if(!billingRuleValues().panelEnabled){panel.className="billing-panel-preview ok";panel.innerHTML="<strong>Aviso no painel desativado</strong><span>Com a configuração atual, o cliente não verá nenhum cartão de cobrança dentro do painel.</span><small>O envio manual pelo WhatsApp continua disponível.</small>";whatsapp.textContent=billingMessageForClient(c,"reminder",emptyBillingPenalty(c),today);return;}
    const view=billingPanelView(c,today,forced);panel.className="billing-panel-preview "+view.stage;panel.innerHTML=`<strong>${esc(view.title)}</strong><span>${esc(view.message)}</span><small>${esc(view.meta)} • data simulada ${esc(A.date(today))}</small>`;
    const type=view.stage==="reminder"||view.stage==="ok"?"reminder":"final";whatsapp.textContent=billingMessageForClient(c,type,emptyBillingPenalty(c),today);
  }
  function billingTemplate(type) {
    return type === "day10" || type === "final" ? ($("billingDay10Message")?.value||state.billing.day10_message) : ($("billingDay5Message")?.value||state.billing.day5_message);
  }
  function billingReferenceMonth(c) {
    return monthKey(c?.expires_at) || A.isoDate(new Date()).slice(0, 7);
  }
  function billingMonthRange(month) {
    const start = `${month}-01T00:00:00.000-03:00`;
    const [year, value] = month.split("-").map(Number);
    const nextYear = value === 12 ? year + 1 : year;
    const nextMonth = value === 12 ? 1 : value + 1;
    const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00.000-03:00`;
    return { start, end };
  }
  function billingMonthLabel(month) {
    const [year, value] = String(month || "").split("-").map(Number);
    if (!year || !value) return "mês de referência";
    const date = new Date(year, value - 1, 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  function penaltyStatus(row) {
    const status = String(row?.status || "").toLowerCase();
    const reason = String(row?.disabled_reason || row?.reason || "").toLowerCase();
    return !row?.used_at && ["disabled", "expired", "reserved"].includes(status) && /(3 dias|36h|36 horas|sem uso|não utilizado|nao utilizado|vencid)/i.test(reason);
  }
  function formatPenaltyDate(value) {
    if (!value) return "Data não informada";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return A.date(value);
    return date.toLocaleDateString("pt-BR");
  }
  function emptyBillingPenalty(c) {
    const month = billingReferenceMonth(c);
    return { count: 0, blocks: 0, percent: 0, fee: 0, total: Number(c?.plan_value || 0), month, month_label: billingMonthLabel(month), dates: [], rows: [] };
  }
  function summarizeBillingPenalty(c, rows) {
    const month = billingReferenceMonth(c);
    const planValue = Number(c?.plan_value || 0);
    const filtered = (rows || []).filter(penaltyStatus);
    const blocks = Math.floor(filtered.length / 10);
    const percent = blocks * 5;
    const fee = Number(((planValue * percent) / 100).toFixed(2));
    const dates = filtered.map((row) => formatPenaltyDate(row.created_at || row.generated_at || row.reserved_at)).filter(Boolean);
    return { count: filtered.length, blocks, percent, fee, total: planValue + fee, month, month_label: billingMonthLabel(month), dates, rows: filtered };
  }
  async function loadBillingPenaltyForClient(c) {
    if (!c?.id) return emptyBillingPenalty(c);
    const month = billingReferenceMonth(c);
    const cacheKey = `${c.id}|${month}|${Number(c.plan_value || 0)}`;
    if (state.billingPenaltyCache[cacheKey]) return state.billingPenaltyCache[cacheKey];
    const { start, end } = billingMonthRange(month);
    let result = emptyBillingPenalty(c);
    try {
      const query = await A.client
        .from("jc_activation_codes")
        .select("id,client_id,code_type,code_last4,status,used_at,created_at,generated_at,reserved_at,disabled_reason")
        .eq("client_id", c.id)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: true });
      if (query.error) throw query.error;
      result = summarizeBillingPenalty(c, query.data || []);
    } catch (directError) {
      try {
        const data = await A.client.functions.invoke("jc-activate", { body: { action: "admin_list_codes", filters: { client_search: c.username || c.full_name || "", created_from: start.slice(0, 10), created_to: end.slice(0, 10), limit: 1000 } } });
        if (data.error) throw data.error;
        const expectedUsername = String(c.username || "").toLowerCase();
        const expectedName = String(c.full_name || "").toLowerCase();
        const rows = (data.data?.codes || data.data?.rows || []).filter((row) => {
          const username = String(row.client_username || "").toLowerCase();
          const name = String(row.client_name || "").toLowerCase();
          return (!expectedUsername && !expectedName) || username === expectedUsername || name === expectedName;
        });
        result = summarizeBillingPenalty(c, rows);
      } catch (fallbackError) {
        console.warn("Penalidade de códigos sem uso:", fallbackError.message || fallbackError, directError.message || directError);
        result = emptyBillingPenalty(c);
      }
    }
    state.billingPenaltyCache[cacheKey] = result;
    return result;
  }
  function billingPenaltyBlock(penalty) {
    if (!penalty || !penalty.blocks || !penalty.percent) return "";
    const dateLines = (penalty.dates || []).slice(0, 30).map((date, index) => `${index + 1}. ${date} — código gerado e não utilizado`).join("\n");
    const more = penalty.count > 30 ? `\n... e mais ${penalty.count - 30} registro(s) no período.` : "";
    return `\nResumo de acréscimo administrativo (${penalty.month_label}):\nCódigos gerados e não utilizados no mês: ${penalty.count}\nAcréscimo aplicado: ${penalty.percent}%\nValor do acréscimo: ${A.money(penalty.fee)}\nTotal atualizado da cobrança: ${A.money(penalty.total)}\n\nCódigos sem uso identificados no período:\n${dateLines}${more}\n`;
  }
  function billingMessageForClient(c, type = "reminder", penalty = null, today=A.isoDate(new Date())) {
    const pixLines=[];
    if(state.billing.pix_holder) pixLines.push("Titular: "+state.billing.pix_holder);
    if(state.billing.pix_bank) pixLines.push("Banco: "+state.billing.pix_bank);
    if(state.billing.pix_key_type||state.billing.pix_key) pixLines.push("Chave PIX ("+(state.billing.pix_key_type||"chave")+"): "+(state.billing.pix_key||""));
    if(state.billing.pix_note) pixLines.push(state.billing.pix_note);
    const pixBlock=pixLines.length?"DADOS PARA PAGAMENTO VIA PIX\n"+pixLines.join("\n"):"";
    const safePenalty = penalty || emptyBillingPenalty(c);
    const vars={...billingCommonVars(c,today),pix_nome:state.billing.pix_holder||"",pix_banco:state.billing.pix_bank||"",pix_tipo:state.billing.pix_key_type||"",pix_chave:state.billing.pix_key||"",pix_bloco:pixBlock,penalidade_bloco:billingPenaltyBlock(safePenalty),penalidade_qtd:String(safePenalty.count||0),penalidade_percentual:String(safePenalty.percent||0),penalidade_valor:A.money(safePenalty.fee||0),total_cobranca:A.money(safePenalty.total||Number(c?.plan_value||0)),mes_referencia:safePenalty.month_label||""};
    return String(billingTemplate(type)||"").replace(/\{(nome|usuario|plano|valor|vencimento|limite_pagamento|data_bloqueio|dias_restantes|suporte|empresa|pix_nome|pix_banco|pix_tipo|pix_chave|pix_bloco|penalidade_bloco|penalidade_qtd|penalidade_percentual|penalidade_valor|total_cobranca|mes_referencia)\}/g,(_,key)=>vars[key]??"").replace(/\n{3,}/g,"\n\n").trim();
  }
  async function billingMessageForClientAsync(c, type = "reminder") {
    const penalty = await loadBillingPenaltyForClient(c);
    return billingMessageForClient(c, type, penalty);
  }
  async function saveBillingSettings() {
    const rules=billingRuleValues();
    const value={company_name:$("billingCompanyName").value.trim()||"JC-APK TV",support_phone:$("billingSupportPhone").value.replace(/\D/g,""),auto_enabled:$("billingAutoEnabled").checked,day5_enabled:$("billingDay5Enabled").checked,day10_enabled:$("billingDay10Enabled").checked,timezone:$("billingTimezone").value.trim()||"America/Sao_Paulo",reminder_days_before:rules.reminderDays,grace_days_after:rules.graceDays,panel_notice_enabled:rules.panelEnabled,auto_fill_grace:rules.autoFillGrace,pix_holder:$("billingPixHolder").value.trim(),pix_bank:$("billingPixBank").value.trim(),pix_key_type:$("billingPixKeyType").value,pix_key:$("billingPixKey").value.trim(),pix_note:$("billingPixNote").value.trim(),day5_message:$("billingDay5Message").value.trim(),day10_message:$("billingDay10Message").value.trim(),panel_reminder_message:$("billingPanelReminderMessage").value.trim(),panel_grace_message:$("billingPanelGraceMessage").value.trim(),panel_blocked_message:$("billingPanelBlockedMessage").value.trim()};
    const {error}=await A.client.from("app_settings").upsert({key:"billing",value},{onConflict:"key"});
    if(error) throw error;
    state.billing=value;
    renderBillingRuleTimeline();
    renderBillingPreview();
    renderBillingClientList();
    A.toast("Configurações de cobrança, avisos e PIX salvas.");
  }
  $("saveBillingSettingsBtn").onclick = () => saveBillingSettings().catch((e) => A.toast(e.message, "error"));

  function eligibleBillingClients(scope = "due") {
    const today=A.isoDate(new Date()),type=$("billingBatchType")?.value||"reminder";
    return state.clients.filter((c)=>{
      if(accountTypeOf(c)!=="monthly"||c.status!=="active"||!c.billing_opt_in||c.reseller_parent_id||c.archived_at) return false;
      if(phoneList(c).join("").replace(/\D/g,"").length<10) return false;
      if(scope==="all") return true;
      if(billingStartsLater(c,today))return false;
      const stage=billingStageForClient(c,today);
      return type==="final"?["due","grace","blocked"].includes(stage):["reminder","due","grace","blocked"].includes(stage);
    });
  }
  function renderBillingClientList() {
    const scope = $("billingBatchScope")?.value || "due";
    const type = $("billingBatchType")?.value || "reminder";
    const list = eligibleBillingClients(scope);
    if (!$("billingClientList")) return;
    $("billingClientList").innerHTML = list.length ? list.map((c) => {
      const view=billingPanelView(c);
      return `<div class="billing-row"><div><b>${esc(c.full_name)}</b><br><small>@${esc(c.username)}</small></div><div>${phoneList(c).map((p,i)=>`${i+1}. ${esc(p)}`).join('<br>')||'Sem WhatsApp'}</div><div>${esc(c.plan_name)}<br><small>${esc(view.meta)}</small><br><span class="badge ${view.stage==='blocked'?'blocked':''}">${esc(view.title)}</span></div><div class="actions"><button class="btn green" data-quick-bill="${c.id}" data-bill-type="${type}">Escolher WhatsApp</button></div></div>`;
    }).join("") : '<div class="empty">Nenhum cliente autorizado nesta seleção.</div>';
    document.querySelectorAll("[data-quick-bill]").forEach((b) => b.onclick = () => {
      const c = state.clients.find((x) => x.id === b.dataset.quickBill);
      openBillingWhatsApp(c, b.dataset.billType).catch((e) => A.toast(e.message, "error"));
    });
  }
  function prepareBillingQueue() {
    state.billingQueue = eligibleBillingClients($("billingBatchScope").value);
    state.billingQueueIndex = 0;
    $("openNextBillingBtn").disabled = state.billingQueue.length === 0;
    updateBillingQueueStatus();
    renderBillingClientList();
  }
  function updateBillingQueueStatus() {
    const total = state.billingQueue.length;
    const done = Math.min(state.billingQueueIndex, total);
    $("billingQueueStatus").textContent = total ? `Fila preparada: ${done} de ${total} conversa(s) aberta(s).` : "Nenhuma fila preparada.";
    $("openNextBillingBtn").disabled = !total || done >= total;
  }
  async function openBillingWhatsApp(c, type) {
    if (!c) return;
    const message = await billingMessageForClientAsync(c, type);
    sendWhatsappMessage(c, message, `Enviar cobrança para ${c.full_name || c.username || "cliente"}`);
  }
  async function openNextBilling() {
    const c = state.billingQueue[state.billingQueueIndex];
    if (!c) return updateBillingQueueStatus();
    await openBillingWhatsApp(c, $("billingBatchType").value);
    state.billingQueueIndex += 1;
    updateBillingQueueStatus();
  }
  $("prepareBillingQueueBtn").onclick = prepareBillingQueue;
  $("openNextBillingBtn").onclick = () => openNextBilling().catch((e) => A.toast(e.message, "error"));
  $("copyBillingQueueBtn").onclick = async () => {
    const list = eligibleBillingClients($("billingBatchScope").value);
    const type = $("billingBatchType").value;
    const parts = await Promise.all(list.map(async (c, i) => `${i + 1}. ${c.full_name} — ${c.whatsapp}\n${await billingMessageForClientAsync(c, type)}`));
    const text = parts.join("\n\n");
    A.copy(text || "Nenhum cliente na seleção.").then(() => A.toast("Lista de cobranças copiada."));
  };
  $("billingBatchScope").onchange = renderBillingClientList;
  $("billingBatchType").onchange = renderBillingClientList;
  $("billingReminderDaysBefore").oninput=()=>{renderBillingRuleTimeline();renderBillingPreview();renderBillingClientList();};
  $("billingGraceDaysAfter").oninput=()=>{renderBillingRuleTimeline();renderBillingPreview();renderBillingClientList();};
  $("billingPanelNoticeEnabled").onchange=renderBillingPreview;
  $("billingAutoFillGrace").onchange=updateClientBillingDateNote;
  $("billingPreviewClient").onchange=renderBillingPreview;
  $("billingPreviewDate").onchange=renderBillingPreview;
  $("billingPreviewStage").onchange=renderBillingPreview;
  $("refreshBillingPreviewBtn").onclick=renderBillingPreview;
  ["billingDay5Message","billingDay10Message","billingPanelReminderMessage","billingPanelGraceMessage","billingPanelBlockedMessage"].forEach((id)=>$(id)?.addEventListener("input",renderBillingPreview));

  function openBillingClient(c) {
    if (!c) return;
    $("billingClientId").value = c.id;
    $("billingClientName").textContent = `${c.full_name} — ${phoneList(c).join(" • ") || "sem WhatsApp"}`;
    $("billingClientType").value = "reminder";
    $("billingClientPreview").textContent = "Calculando cobrança e conferindo códigos sem uso do mês...";
    openModal("billingClientModal");
    billingMessageForClientAsync(c, "reminder").then((message) => {
      if ($("billingClientId").value === c.id) $("billingClientPreview").textContent = message;
    }).catch((e) => {
      $("billingClientPreview").textContent = billingMessageForClient(c, "reminder");
      A.toast(e.message, "error");
    });
  }
  $("billingClientType").onchange = async () => {
    const c = state.clients.find((x) => x.id === $("billingClientId").value);
    $("billingClientPreview").textContent = "Calculando cobrança e conferindo códigos sem uso do mês...";
    try {
      $("billingClientPreview").textContent = await billingMessageForClientAsync(c, $("billingClientType").value);
    } catch (e) {
      $("billingClientPreview").textContent = billingMessageForClient(c, $("billingClientType").value);
      A.toast(e.message, "error");
    }
  };
  $("copyClientBillingBtn").onclick = () => A.copy($("billingClientPreview").textContent).then(() => A.toast("Cobrança copiada."));
  $("openClientBillingWhatsappBtn").onclick = () => {
    const c = state.clients.find((x) => x.id === $("billingClientId").value);
    openBillingWhatsApp(c, $("billingClientType").value).catch((e) => A.toast(e.message, "error"));
  };

  function testStatusText(status) {
    return {
      pending: "Teste pendente",
      checking: "Executando teste automático",
      automatic_ok: "Teste automático aprovado",
      preview_opened: "Pré-teste visual aberto",
      passed: "Acesso aprovado e liberado",
      failed: "Teste reprovado",
    }[status] || "Teste pendente";
  }
  function renderTestGate(detail = "", checks = state.testChecks) {
    const status = state.testStatus || "pending";
    const gate = $("accessTestGate");
    if (!gate) return;
    gate.className = "test-gate " + (status === "checking" ? "testing" : status);
    $("accessTestTitle").textContent = testStatusText(status);
    $("accessTestDetail").textContent = detail || {
      pending: "Salve o cliente e confira as permissões pelo acesso técnico protegido do ADM.",
      checking: "Verificando conexão, cadastro, arquivo-base e permissões sem consultar a senha do cliente.",
      automatic_ok: "A parte automática passou. Agora abra a prévia e confira os botões liberados e bloqueados.",
      preview_opened: "A prévia foi aberta. Depois de conferir, aprove o teste para liberar os dados de envio.",
      passed: "Tudo aprovado. Os botões de copiar e WhatsApp estão liberados.",
      failed: "Corrija o item indicado e execute o teste novamente.",
    }[status];
    const list = $("accessTestChecks");
    if (list) {
      list.innerHTML = (checks || []).map((x) => `<li class="${x.ok === false ? "fail" : x.warn ? "warn" : "ok"}">${esc(x.text)}</li>`).join("");
    }
    const hasClient = Boolean($("clientId").value);
    const automaticReady = status === "automatic_ok" || status === "preview_opened" || status === "passed";
    $("testClientAccessBtn").disabled = !hasClient || status === "checking";
    $("openClientPreviewBtn").disabled = !automaticReady || !state.previewToken;
    $("approveClientAccessBtn").disabled = status !== "preview_opened";
    const released = status === "passed" && !state.formDirty;
    $("copyClientMessageBtn").disabled = !released;
    $("openClientWhatsappBtn").disabled = !released;
  }
  function setTestState(status, detail = "", checks = []) {
    state.testStatus = status;
    state.testChecks = checks;
    renderTestGate(detail, checks);
  }
  function markTestDirty() {
    if (!$("clientModal").classList.contains("open")) return;
    state.formDirty = true;
    state.previewToken = "";
    setTestState("pending", "Há alterações ainda não testadas. Salve novamente para refazer o teste.", []);
  }
  function expectedPermissions() {
    return new Set(selectedPermissions());
  }
  function sameSet(a, b) {
    if (a.size !== b.size) return false;
    for (const item of a) if (!b.has(item)) return false;
    return true;
  }
  function previewStorageKey(token) {
    return "jc_admin_preview_" + token;
  }
  function makeToken() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(24);
    window.crypto?.getRandomValues?.(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("") || String(Date.now()) + Math.random();
  }
  function buildSignature(clientId, access) {
    const permissions = Object.entries(access?.permissions || {}).filter(([, enabled]) => enabled).map(([id]) => id).sort();
    return JSON.stringify({ clientId, username: access?.profile?.username || "", email: access?.profile?.email || "", permissions });
  }
  async function updateStoredTest(clientId, status, checks, signature = null) {
    const payload = {
      access_test_status: status,
      access_test_details: checks || [],
      access_test_signature: signature,
      access_tested_at: status === "passed" ? new Date().toISOString() : null,
      access_tested_by: status === "passed" ? state.access?.profile?.id || null : null,
      delivery_released_at: status === "passed" ? new Date().toISOString() : null,
    };
    const { error } = await A.client.from("profiles").update(payload).eq("id", clientId);
    if (error) throw error;
  }
  function selectorExists(doc, selector) {
    if (!selector) return true;
    try { return Boolean(doc.querySelector(selector)); } catch (e) { return false; }
  }
  async function runAutomaticTest(clientId) {
    if (!clientId) throw new Error("Salve o cliente antes de testar.");
    const isPublicTest = $("accountType").value === "test";
    if (!A.ready || !window.supabase) throw new Error("Configure o novo Supabase antes de testar.");
    const checks = [];
    state.formDirty = false;
    state.previewToken = "";
    setTestState("checking", "Executando todas as verificações...", checks);
    const expected = expectedPermissions();
    try {
      const baseUrl = new URL("geradores/index.html?access-test=" + Date.now(), location.href);
      const response = await fetch(baseUrl.href, { cache: "no-store" });
      if (!response.ok) throw new Error("O arquivo /geradores/index.html não abriu (HTTP " + response.status + ").");
      const source = await response.text();
      const doc = new DOMParser().parseFromString(source, "text/html");
      checks.push({ ok: true, text: "Arquivo-base /geradores/index.html carregado." });

      const missing = state.functions.filter((f) => f.id !== "attendant.open" && !selectorExists(doc, f.selector));
      const missingSelected = missing.filter((f) => expected.has(f.id));
      if (missingSelected.length) throw new Error("Botões liberados não encontrados no HTML: " + missingSelected.map((f) => f.name).join(", "));
      checks.push({ ok: true, warn: missing.length > 0, text: missing.length ? `${state.functions.length - missing.length} funções reconhecidas; ${missing.length} item(ns) não encontrado(s) no HTML e mantido(s) bloqueado(s).` : `${state.functions.length} funções reconhecidas no arquivo-base.` });

      const result = await A.client.rpc("admin_get_client_access", { p_user_id: clientId });
      if (result.error || !result.data?.profile) throw result.error || new Error("O acesso administrativo protegido não foi retornado.");
      let access = result.data;
      if (access.profile.id !== clientId) throw new Error("O acesso técnico abriu um cadastro diferente do cliente conferido.");
      if (access.profile.status !== "active") throw new Error("O cliente está com status " + access.profile.status + ".");

      if (isPublicTest) {
        if (access.profile.id !== clientId) throw new Error("A prévia abriu um cadastro diferente do cliente testado.");
        if (access.profile.trial_expires_at && new Date(access.profile.trial_expires_at) < new Date()) throw new Error("O período de teste já venceu.");
        const allDemoPermissions = {};
        state.functions.forEach((f) => { allDemoPermissions[f.id] = true; });
        access = {
          ...access,
          profile: { ...access.profile, role: "test", account_type: "test" },
          permissions: allDemoPermissions,
          general: { ...(access.general || {}), test_public_password: "teste" },
        };
        checks.push({ ok: true, text: "Modo de teste validado sem consultar nem alterar a senha interna do cliente." });
        checks.push({ ok: true, text: `${state.functions.length} função(ões) disponíveis para simulação completa, sem links ou códigos reais.` });
      } else {
        if (monthlyBillingOverdue(access.profile)) throw new Error("O último dia de pagamento já venceu.");
        checks.push({ ok: true, text: "Cadastro real ativo e dentro do prazo." });
        checks.push({ ok: true, text: "Acesso técnico do ADM aprovado sem pedir, revelar ou trocar a senha do cliente." });

        const returned = new Set(Object.entries(access.permissions || {}).filter(([, enabled]) => Boolean(enabled)).map(([id]) => id));
        if (!sameSet(expected, returned)) {
          const missingPerms = [...expected].filter((id) => !returned.has(id));
          const extraPerms = [...returned].filter((id) => !expected.has(id));
          throw new Error(`Permissões diferentes do cadastro. Faltando: ${missingPerms.join(", ") || "nenhuma"}. Extras: ${extraPerms.join(", ") || "nenhuma"}.`);
        }
        checks.push({ ok: true, text: `${returned.size} função(ões) liberada(s) exatamente como selecionado.` });
      }

      const token = makeToken();
      const previewAccess = {
        profile: access.profile,
        permissions: access.permissions || {},
        functions: access.functions || state.functions,
        general: access.general || state.general,
        demo: access.demo || state.demoSettings || {},
        billing: state.billing || {},
        download_codes: access.download_codes || state.downloadCodes || [],
        reseller: access.reseller || {},
        attendant: access.attendant || {},
        admin_preview: true,
      };
      localStorage.setItem(previewStorageKey(token), JSON.stringify({
        expiresAt: Date.now() + 15 * 60 * 1000,
        access: previewAccess,
      }));
      state.previewToken = token;
      const signature = buildSignature(clientId, access);
      await updateStoredTest(clientId, "automatic_ok", checks, signature);
      setTestState("automatic_ok", "Teste automático aprovado. Abra a prévia visual para clicar nos botões ativos e bloqueados.", checks);
      A.toast("Teste automático aprovado.");
      return access;
    } catch (error) {
      checks.push({ ok: false, text: error.message || String(error) });
      try { await updateStoredTest(clientId, "failed", checks, null); } catch (e) {}
      setTestState("failed", error.message || "O teste falhou.", checks);
      throw error;
    } finally {}
  }
  async function openClientPreview() {
    const clientId = $("clientId").value;
    if (!clientId || !state.previewToken) throw new Error("Execute o teste automático antes de abrir a prévia.");
    const base = state.general.panel_url || A.cfg.panelUrl || new URL("geradores/", location.href).href;
    const url = new URL(base, location.href);
    url.searchParams.set("jc_admin_preview", state.previewToken);
    const opened = window.open(url.href, "_blank");
    if (!opened) throw new Error("O navegador bloqueou a nova aba. Permita pop-ups para este site.");
    const checks = [...state.testChecks, { ok: true, text: "Pré-teste visual aberto pelo administrador." }];
    await updateStoredTest(clientId, "preview_opened", checks, null);
    setTestState("preview_opened", "Teste os botões na nova aba. Os liberados funcionam normalmente; os bloqueados abrem apenas demonstração.", checks);
  }
  async function openTechnicalAccess(clientId) {
    if (!clientId) throw new Error("Cliente não identificado.");
    let result = await A.client.rpc("jc_admin_start_support_access", { p_client_id: clientId });
    if (result.error) {
      result = await A.client.rpc("admin_get_client_access", { p_user_id: clientId });
    }
    const access = result.data?.access || result.data;
    if (result.error || !access?.profile) throw result.error || new Error("O acesso técnico protegido não pôde ser aberto.");
    const token = makeToken();
    localStorage.setItem(previewStorageKey(token), JSON.stringify({
      expiresAt: Date.now() + 15 * 60 * 1000,
      access: { ...access, billing: state.billing || {}, admin_preview: true, support_session_id: result.data?.support_session_id || null },
    }));
    const base = state.general.panel_url || A.cfg.panelUrl || new URL("geradores/", location.href).href;
    const url = new URL(base, location.href);
    url.searchParams.set("jc_admin_preview", token);
    const opened = window.open(url.href, "_blank");
    if (!opened) throw new Error("O navegador bloqueou a nova aba. Permita pop-ups para este site.");
    A.toast("Acesso técnico aberto por 15 minutos, sem usar a senha do cliente.");
  }
  async function approveClientAccess() {
    const clientId = $("clientId").value;
    if (!clientId || state.testStatus !== "preview_opened") throw new Error("Abra e confira a prévia visual antes de aprovar.");
    const checks = [...state.testChecks, { ok: true, text: "Pré-teste visual confirmado pelo administrador." }];
    await updateStoredTest(clientId, "passed", checks, null);
    state.formDirty = false;
    setTestState("passed", "Acesso aprovado. Agora os dados podem ser copiados ou enviados pelo WhatsApp.", checks);
    await loadClients();
    A.toast("Acesso aprovado e dados liberados.");
  }

  function permissionCheckbox(id) {
    return [...document.querySelectorAll('.perm-check')].find((item)=>item.value===id) || null;
  }
  function refreshPermissionGroups(){
    document.querySelectorAll('[data-group-all]').forEach((ch)=>{
      const items=[...document.querySelectorAll(`.perm-check[data-group="${CSS.escape(ch.dataset.groupAll)}"]`)];
      ch.checked=items.length>0&&items.every((x)=>x.checked);
      ch.indeterminate=items.some((x)=>x.checked)&&!items.every((x)=>x.checked);
    });
  }
  function syncAttendantAccessControls(){
    const use=$('useAttendant'),options=$('attendantAccessOptions'),mode=$('attendantAccessMode'),slug=$('attendantSlug');
    if(!use||!mode)return;
    const open=Boolean(permissionCheckbox('attendant.open')?.checked);
    const full=Boolean(permissionCheckbox('attendant.configure')?.checked);
    const basic=Boolean(permissionCheckbox('attendant.basic')?.checked);
    use.checked=open||full||basic;
    mode.value=full?'full':'basic';
    options?.classList.toggle('hidden',!use.checked);
    if(slug)slug.disabled=!use.checked;
    const hint=$('attendantSetupHint');if(hint)hint.textContent=mode.value==='full'?'O cliente poderá abrir todo o painel organizado da própria atendente.':'O cliente poderá alterar somente nome, empresa, WhatsApp, logo, mídia e mensagem inicial.';
  }
  function applyAttendantAccessControls(){
    const use=$('useAttendant'),mode=$('attendantAccessMode');if(!use||!mode)return;
    const enabled=use.checked,full=enabled&&mode.value==='full';
    const openBox=permissionCheckbox('attendant.open'),basicBox=permissionCheckbox('attendant.basic'),fullBox=permissionCheckbox('attendant.configure');
    if(openBox)openBox.checked=enabled;if(basicBox)basicBox.checked=enabled&&!full;if(fullBox)fullBox.checked=full;
    $('attendantAccessOptions')?.classList.toggle('hidden',!enabled);if($('attendantSlug'))$('attendantSlug').disabled=!enabled;
    const hint=$('attendantSetupHint');if(hint)hint.textContent=full?'O cliente poderá abrir todo o painel organizado da própria atendente.':'O cliente poderá alterar somente nome, empresa, WhatsApp, logo, mídia e mensagem inicial.';
    refreshPermissionGroups();updateClientMessage();markTestDirty();
  }
  async function ensureDefaultAttendantProfile(userId,slug){
    if(!userId)return;
    const cleanSlug=A.slug(slug||'cliente');
    const {data,error}=await A.client.from('attendant_profiles').select('user_id,slug,public_settings').eq('user_id',userId).maybeSingle();
    if(error)throw error;
    const existing=data?.public_settings&&typeof data.public_settings==='object'?data.public_settings:{};
    if(data&&Object.keys(existing).length){
      const normalized=Object.assign({},DEFAULT_ATTENDANT_TEMPLATE,existing);
      const {error:updateError}=await A.client.from('attendant_profiles').update({slug:data.slug||cleanSlug,public_settings:normalized}).eq('user_id',userId);
      if(updateError)throw updateError;
      return;
    }
    const payload={user_id:userId,slug:data?.slug||cleanSlug,public_settings:JSON.parse(JSON.stringify(DEFAULT_ATTENDANT_TEMPLATE)),published:false};
    const result=data?await A.client.from('attendant_profiles').update(payload).eq('user_id',userId):await A.client.from('attendant_profiles').insert(payload);
    if(result.error)throw result.error;
  }

  function renderPermissions(selected = new Set()) {
    const groups = orderedFunctionGroups(state.functions);
    $("permissionTree").innerHTML = groups
      .map((g) => {
        const gid = g.id;
        const countLabel = `${g.items.length} funç${g.items.length === 1 ? "ão" : "ões"}`;
        const launcherNote = gid === "launcher" ? '<div class="jc-launcher-admin-note"><strong>Licença separada:</strong> liberar a função permite acessar o módulo, mas cada Box continua usando a regra própria de 1 crédito por mês.<small>Lite e Pro podem ser liberadas separadamente; o saldo do Launcher não depende do plano principal do cliente.</small></div>' : '';
        const massNote = gid === "activators_mass" ? '<div class="jc-launcher-admin-note"><strong>Segurança dupla:</strong> somente a operação em massa exige também a função normal correspondente.<small>11, 16 e VIP normais funcionam sozinhos. Ao marcar uma opção em massa, o painel inclui automaticamente a permissão normal necessária.</small></div>' : '';
        return `<div class="perm-group perm-group-${esc(gid)}"><div class="perm-head"><div><strong>${esc(g.name)}</strong><small>${esc(countLabel)}</small></div><label class="check"><input type="checkbox" data-group-all="${esc(gid)}"><span>Liberar tudo</span></label></div>${launcherNote}${massNote}${g.items.map((f) => `<label class="check"><input type="checkbox" class="perm-check" data-group="${esc(gid)}" value="${esc(f.id)}" ${selected.has(f.id) ? "checked" : ""}><span>${esc(f.name)}</span></label>`).join("")}</div>`;
      })
      .join("");
    document.querySelectorAll("[data-group-all]").forEach((ch) => {
      const setState = () => {
        const items = [
          ...document.querySelectorAll(
            `.perm-check[data-group="${CSS.escape(ch.dataset.groupAll)}"]`,
          ),
        ];
        ch.checked = items.length > 0 && items.every((x) => x.checked);
        ch.indeterminate =
          items.some((x) => x.checked) && !items.every((x) => x.checked);
      };
      ch.onchange = () => {
        document
          .querySelectorAll(
            `.perm-check[data-group="${CSS.escape(ch.dataset.groupAll)}"]`,
          )
          .forEach((x) => (x.checked = ch.checked));
        syncMassPermissionCheckboxes();
        document.querySelectorAll("[data-group-all]").forEach((groupToggle) => {
          const items = [...document.querySelectorAll(`.perm-check[data-group="${CSS.escape(groupToggle.dataset.groupAll)}"]`)];
          groupToggle.checked = items.length > 0 && items.every((item) => item.checked);
          groupToggle.indeterminate = items.some((item) => item.checked) && !items.every((item) => item.checked);
        });
        syncAttendantAccessControls();
        updateClientMessage();
        markTestDirty();
      };
      document
        .querySelectorAll(
          `.perm-check[data-group="${CSS.escape(ch.dataset.groupAll)}"]`,
        )
        .forEach((x) =>
          x.addEventListener("change", () => {
            if (x.checked && MASS_PERMISSION_DEPENDENCIES[x.value]) {
              const required=document.querySelector(`.perm-check[value="${CSS.escape(MASS_PERMISSION_DEPENDENCIES[x.value])}"]`);
              if(required)required.checked=true;
            }
            setState();
            syncAttendantAccessControls();
            updateClientMessage();
            markTestDirty();
          }),
        );
      setState();
    });
    syncAttendantAccessControls();
  }
  function defaultPermissionIds(type) {
    const raw = state.accessDefaults?.[type];
    return Array.isArray(raw) ? raw.filter((id)=>state.functions.some((f)=>f.id===id&&f.active!==false)) : [];
  }
  function selectedPermissions() {
    const checked = [...document.querySelectorAll(".perm-check:checked")].map((x) => x.value);
    return normalizePermissionIds(
      checked,
      Array.isArray(state.resellerPermissionOverride) ? state.resellerPermissionOverride : null,
    );
  }
  function applyDefaultPermissions(type) {
    const ids = normalizePermissionIds(
      defaultPermissionIds(type),
      Array.isArray(state.resellerPermissionOverride) ? state.resellerPermissionOverride : null,
    );
    document.querySelectorAll(".perm-check").forEach((x)=>x.checked=ids.includes(x.value));
    syncMassPermissionCheckboxes();
    document.querySelectorAll("[data-group-all]").forEach((ch)=>{
      const items=[...document.querySelectorAll(`.perm-check[data-group="${CSS.escape(ch.dataset.groupAll)}"]`)];
      ch.checked=items.length>0&&items.every((x)=>x.checked);ch.indeterminate=items.some((x)=>x.checked)&&!items.every((x)=>x.checked);
    });
  }
  function planByMonths() {
    return (
      state.plans.find((p) => String(p.months) === $("planMonths").value) ||
      state.plans[0]
    );
  }
  function billingDueDate(start,months){
    const source=new Date((start||A.isoDate(new Date()))+"T12:00:00"),day=source.getDate();
    const target=new Date(source.getFullYear(),source.getMonth()+Math.max(1,Number(months)||1),1,12);
    const lastDay=new Date(target.getFullYear(),target.getMonth()+1,0,12).getDate();
    target.setDate(Math.min(day,lastDay));
    return target.toISOString().slice(0,10);
  }
  function updatePlan() {
    const type=$("accountType").value, p=planByMonths(), start=$("startsAt").value||A.isoDate(new Date());
    $("startsAt").value=start;
    if(type==="test"){
      $("planValue").value=0; $("expiresAt").value=""; $("graceUntil").value=""; $("billingOptIn").checked=false; updateTrialExpiry();
    }else if(type==="credits"){
      $("planValue").value=0; $("expiresAt").value=""; $("graceUntil").value=""; $("billingOptIn").checked=false;
    }else if(type==="one_time"){
      const one=state.plans.find((x)=>Number(x.months)===0)||p; if(one){$("planMonths").value="0";$("planValue").value=one.value||0;} $("expiresAt").value="";$("graceUntil").value="";$("billingOptIn").checked=false;
    }else if(p){
      $("planValue").value=p.value; $("expiresAt").value=billingDueDate(start,Number(p.months)||1); $("graceUntil").value=A.addDays($("expiresAt").value,billingRuleValues().graceDays); $("billingOptIn").checked=true;
    }
    updateClientMessage();
  }

  function updateTrialExpiry(){
    const amount=Math.max(1,Number($("trialAmount").value)||Number(state.general.trial_amount)||1), unit=$("trialUnit").value||state.general.trial_unit||"days";
    const d=new Date(); if(unit==="hours") d.setHours(d.getHours()+amount); else d.setDate(d.getDate()+amount);
    const local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); $("trialExpiresAt").value=local;
  }
  function applyAccountType(preservePermissions = false) {
    const type=$("accountType").value,isTrial=type==="test",isCredits=type==="credits",isMonthly=type==="monthly";
    $("trialInfo").classList.toggle("hidden",!isTrial); $("trialDurationField").classList.toggle("hidden",!isTrial); $("creditsField").classList.toggle("hidden",!isCredits);
    $("planMonths").disabled=isTrial||isCredits||type==="one_time"; $("planValue").readOnly=isTrial||isCredits; $("billingOptIn").disabled=!isMonthly;
    if(isTrial){$("trialAmount").value=Number(state.general.trial_amount)||1;$("trialUnit").value=state.general.trial_unit||"days";}
    const passwordLabel=$("passwordField")?.querySelector("label");
    const passwordInfo=$("passwordField")?.querySelector(".password-info");
    if(passwordLabel) passwordLabel.textContent=isTrial?"Senha pública do teste":"Senha inicial (mínimo 8 caracteres)";
    if(passwordInfo) passwordInfo.textContent=isTrial?'Preenchida automaticamente como "teste". Ela abre apenas a demonstração protegida.':'Senha temporária exclusiva, mostrada somente nesta sessão e trocada pelo cliente no primeiro acesso.';
    $("password").minLength=isTrial?1:8;
    if(!$("clientId").value){
      if(isTrial)$("password").value="teste";
      else if($("password").value==="teste"||$("password").value.length<8)$("password").value=makeSecureTemporaryPassword();
    }else if(state.editing&&accountTypeOf(state.editing)!==type&&accountTypeOf(state.editing)==="test"&&!isTrial){
      $("password").value=makeSecureTemporaryPassword();
    }
    renderPlanOptions(type); updatePlan(); if (!preservePermissions) applyDefaultPermissions(type); markTestDirty();
  }
  function attendantAccessText(permissions){
    const set=new Set(permissions||[]);
    if(set.has('attendant.configure'))return {label:'CONFIGURAÇÃO COMPLETA',detail:'Dentro do painel, abra “Minha Atendente” e depois “Configuração completa”. Você poderá alterar mensagens, planos, pagamentos, imagens, fundos, cartão, descontos e redes sociais.'};
    if(set.has('attendant.basic'))return {label:'DADOS ESSENCIAIS',detail:'Dentro do painel, abra “Minha Atendente” e depois “Editar dados essenciais”. Você poderá alterar somente empresa, nome da atendente, WhatsApp, logo, foto ou vídeo e PIX.'};
    return {label:'SOMENTE ACESSO À ATENDENTE',detail:'Dentro do painel, abra “Minha Atendente” para visualizar o link público e os relatórios liberados.'};
  }
  function userMessage(passwordOverride) {
    const type=$('accountType').value,p=planByMonths()||{},permissions=selectedPermissions();
    const names=[...new Set(state.functions.filter((f)=>permissions.includes(f.id)&&!["copy","reset"].some((w)=>String(f.name).toLowerCase().includes(w))).map((f)=>f.name))];
    const att=permissions.includes('attendant.open'),panel=state.general.panel_url||A.cfg.panelUrl,attBase=state.general.attendant_url||A.cfg.attendantUrl,slug=A.slug($('attendantSlug').value||$('username').value||'cliente');
    const pass=type==='test'?'teste':(passwordOverride||($('clientId').value?state.lastPasswords[$('clientId').value]||'use sua senha atual':$('password').value||makeSecureTemporaryPassword()));
    const intro=state.salesMessages.access_intro||'Seu acesso está pronto.';
    let s=`Olá, ${$('fullName').value||'Cliente'}! ${intro}\n\n📺 PAINEL JC-APK TV\nLink: ${panel}\nUsuário: ${$('username').value||''}\nE-mail: ${$('email').value||''}\nSenha: ${pass}\n\nVocê pode entrar usando o nome de usuário ou o e-mail. A senha é a mesma para as duas opções.`;
    if(type==='test'){
      const token=state.editing?.trial_token||'';const testLink=token?panel+(panel.includes('?')?'&':'?')+'teste='+encodeURIComponent(token):panel;
      s+=`\n\n🧪 TIPO DE ACESSO: TESTE TEMPORÁRIO\nDisponível até: ${$('trialExpiresAt').value?new Date($('trialExpiresAt').value).toLocaleString('pt-BR'):''}\nLink temporário: ${testLink}\n\nO painel abre em demonstração: nenhum link, download ou código real será liberado.`;
    }else if(type==='credits')s+=`\n\n💳 TIPO DE ACESSO: CRÉDITOS\nSaldo inicial: ${Number($('creditsBalance').value||0)} créditos\nAs funções gratuitas continuam funcionando mesmo quando o saldo chegar a zero.`;
    else{s+=`\n\nPlano: ${p.name||$('planMonths').selectedOptions[0]?.text||''}\nValor: ${planPriceText({value:$('planValue').value})}`;if(type==='monthly')s+=`\nVencimento: ${A.date($('expiresAt').value)}\nÚltimo dia para pagamento: ${A.date($('graceUntil').value)}`;else s+='\nPagamento único, sem mensalidades.';}
    s+=`\n\n✅ Funções liberadas\n${names.length?names.map((n)=>'• '+n).join('\n'):'Nenhuma função selecionada.'}`;
    if(att&&type!=='test'){
      const mode=attendantAccessText(permissions);
      s+=`\n\n🤖 SUA ATENDENTE VIRTUAL\nAcesso de configuração: ${mode.label}\n${mode.detail}\n\nLink público da atendente:\n${attBase}?cliente=${slug}\n\n📊 Relatórios\nNo painel, abra “Minha Atendente” e depois “Meus relatórios”.`;
    }
    s+='\n\n⚠️ Guarde seus dados de acesso em um local seguro.';return s;
  }
  function accessMessageForClient(c){
    const type=accountTypeOf(c),permissions=(c.user_permissions||[]).filter(x=>x.enabled).map(x=>x.function_id),names=[...new Set(state.functions.filter(f=>permissions.includes(f.id)&&!["copy","reset"].some(w=>String(f.name).toLowerCase().includes(w))).map(f=>f.name))];
    const panel=state.general.panel_url||A.cfg.panelUrl,attBase=state.general.attendant_url||A.cfg.attendantUrl,attRaw=c.attendant_profiles,att=Array.isArray(attRaw)?attRaw[0]:attRaw,pass=type==='test'?'teste':(state.lastPasswords[c.id]||'use sua senha atual');
    let s=`Olá, ${c.full_name||'Cliente'}! ${state.salesMessages.access_intro||'Seu acesso está pronto.'}\n\n📺 PAINEL JC-APK TV\nLink: ${panel}\nUsuário: ${c.username||''}\nE-mail: ${c.email||''}\nSenha: ${pass}\n\nVocê pode entrar usando o nome de usuário ou o e-mail.`;
    if(type==='test')s+=`\n\n🧪 TIPO DE ACESSO: TESTE TEMPORÁRIO\nDisponível até: ${c.trial_expires_at?new Date(c.trial_expires_at).toLocaleString('pt-BR'):A.date(c.expires_at)}\nO painel abre em demonstração.`;
    else if(type==='credits')s+=`\n\n💳 TIPO DE ACESSO: CRÉDITOS\nSaldo atual: ${Number(c.credits_balance||0)} créditos.`;
    else{s+=`\n\nPlano: ${c.plan_name||accountLabel(c)}\nValor: ${planPriceText({value:c.plan_value})}`;if(type==='monthly')s+=`\nVencimento: ${A.date(c.expires_at)}\nÚltimo dia para pagamento: ${A.date(c.grace_until)}`;else s+='\nPagamento único, sem mensalidades.';}
    s+=`\n\n✅ Funções liberadas\n${names.length?names.map(n=>'• '+n).join('\n'):'Nenhuma função selecionada.'}`;
    if(permissions.includes('attendant.open')&&type!=='test'){
      const mode=attendantAccessText(permissions),slug=att?.slug||A.slug(c.username||c.full_name||'cliente');
      s+=`\n\n🤖 SUA ATENDENTE VIRTUAL\nAcesso de configuração: ${mode.label}\n${mode.detail}\n\nLink público da atendente:\n${attBase}?cliente=${slug}\n\n📊 Relatórios\nNo painel, abra “Minha Atendente” e depois “Meus relatórios”.`;
    }
    s+='\n\n⚠️ Guarde seus dados de acesso em um local seguro.';return s;
  }
  function updateClientMessage() {
    $("attendantSlug").value = A.slug(
      $("attendantSlug").value || $("username").value,
    );
    $("clientMessage").textContent = userMessage();
  }
  [
    "username",
    "fullName",
    "email",
    "whatsapp",
    "whatsapp2",
    "whatsapp3",
    "creditsBalance",
    "resellerRechargeCredits",
    "trialAmount",
    "trialExpiresAt",
    "password",
    "planValue",
    "startsAt",
    "expiresAt",
    "graceUntil",
    "attendantSlug",
  ].forEach((id) => $(id).addEventListener("input", () => { updateClientMessage(); markTestDirty(); }));
  $("planMonths").addEventListener("change", () => { updatePlan(); markTestDirty(); });
  $("startsAt").addEventListener("change", () => { updatePlan(); markTestDirty(); });
  $("status").addEventListener("change", markTestDirty);
  $("accountType").addEventListener("change", () => applyAccountType(false));
  $("trialUnit").addEventListener("change",()=>{updateTrialExpiry();updateClientMessage();markTestDirty();});
  $("trialAmount").addEventListener("change",()=>{updateTrialExpiry();updateClientMessage();markTestDirty();});
  $("billingOptIn").addEventListener("change", markTestDirty);
  $("avatarRequired").addEventListener("change", markTestDirty);
  $("openAvatarCameraBtn").onclick=()=>$("avatarCameraInput").click();
  $("openAvatarFileBtn").onclick=()=>$("avatarFileInput").click();
  $("avatarCameraInput").onchange=(e)=>useAvatarFile(e.target.files?.[0]).catch((err)=>A.toast(err.message,"error"));
  $("avatarFileInput").onchange=(e)=>useAvatarFile(e.target.files?.[0]).catch((err)=>A.toast(err.message,"error"));
  $("removeAvatarBtn").onclick=()=>{updateAvatarPreview("");markTestDirty();A.toast("Foto removida. Salve o cadastro para confirmar.");};
  $("fullName").addEventListener("input",()=>{if(!state.avatarData)updateAvatarPreview("");});
  $("isReseller").addEventListener("change",()=>{renderResellerCreditPanel();markTestDirty();});
  function syncClientGraceDate(force=false){
    const due=$("expiresAt")?.value;if(!due){updateClientBillingDateNote();return;}
    if(force||billingRuleValues().autoFillGrace||!$("graceUntil").value)$("graceUntil").value=A.addDays(due,billingRuleValues().graceDays);
    updateClientBillingDateNote();
  }
  $("expiresAt")?.addEventListener("change",()=>{syncClientGraceDate(true);markTestDirty();});
  $("graceUntil")?.addEventListener("change",()=>{updateClientBillingDateNote();markTestDirty();});
  function resetForm() {
    state.editing=null; state.activeRequestId=""; state.activeResellerSaleId=""; state.resellerPermissionOverride=null; $("clientForm").reset(); $("clientId").value=""; $("resellerParentId").value=""; $("resellerSaleId").value=""; $("passwordField").classList.remove("hidden"); $("testPasswordField").classList.add("hidden"); $("testPassword").value=""; $("openPasswordFromClientBtn").classList.add("hidden"); updateAvatarPreview(""); $("avatarRequired").checked=true;
    $("password").value=makeSecureTemporaryPassword(); setPasswordVisibility("password", "togglePasswordBtn", false); $("startsAt").value=A.isoDate(new Date()); $("status").value="active"; $("accountType").value="monthly"; $("billingOptIn").checked=true; $("billingOptIn").disabled=false; $("creditsBalance").value=0;
    $("trialAmount").value=Number(state.general.trial_amount)||1; $("trialUnit").value=state.general.trial_unit||"days"; renderPlanOptions("monthly"); $("planMonths").value="1"; renderPermissions(new Set(defaultPermissionIds("monthly"))); $("attendantSlug").value=""; $("isReseller").checked=false; $("resellerOptions").classList.add("hidden"); if($("resellerRechargeCredits"))$("resellerRechargeCredits").value=0; $("resellerEnabled").value="true"; renderResellerCreditPanel(null); $("modalTitle").textContent="Novo cliente"; state.formDirty=false;state.previewToken=""; applyAccountType(); syncClientGraceDate(false); setTestState("pending","Preencha o cadastro e clique em Salvar e testar.",[]);
  }
  function openClient(c = null) {
    if(!c){resetForm();openModal("clientModal");return;}
    state.editing=c; const type=accountTypeOf(c); state.resellerPermissionOverride=null; $("clientId").value=c.id; $("resellerParentId").value=c.reseller_parent_id||""; $("resellerSaleId").value=c.reseller_sale_id||""; $("username").value=c.username; $("fullName").value=c.full_name; $("email").value=c.email; $("whatsapp").value=c.whatsapp||""; $("whatsapp2").value=c.whatsapp2||""; $("whatsapp3").value=c.whatsapp3||""; $("status").value=c.status; $("accountType").value=type; $("billingOptIn").checked=c.billing_opt_in!==false; $("creditsBalance").value=Number(c.credits_balance||0); updateAvatarPreview(c.avatar_data||"",c.full_name); $("avatarRequired").checked=c.avatar_required!==false;
    renderPlanOptions(type); $("planMonths").value=String(type==="one_time"?0:(c.plan_months||1)); $("planValue").value=c.plan_value; $("startsAt").value=c.starts_at||""; $("expiresAt").value=c.expires_at||""; $("graceUntil").value=c.grace_until||"";
    updateClientBillingDateNote();
    let savedTrial=""; if(c.trial_expires_at){const d=new Date(c.trial_expires_at);savedTrial=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);$("trialExpiresAt").value=savedTrial;}
    const att=Array.isArray(c.attendant_profiles)?c.attendant_profiles[0]:c.attendant_profiles; $("attendantSlug").value=att?.slug||A.slug(c.username); $("passwordField").classList.add("hidden"); $("testPasswordField").classList.add("hidden"); $("testPassword").value=""; setPasswordVisibility("testPassword", "toggleTestPasswordBtn", false); $("openPasswordFromClientBtn").classList.remove("hidden");
    if(c.reseller_parent_id){const parent=state.clients.find((x)=>x.id===c.reseller_parent_id);state.resellerPermissionOverride=(parent?.user_permissions||[]).filter((x)=>x.enabled).map((x)=>x.function_id);}
    let actualPermissions=(c.user_permissions||[]).filter((x)=>x.enabled).map((x)=>x.function_id);
    if(Array.isArray(state.resellerPermissionOverride)){const allowed=new Set(state.resellerPermissionOverride);actualPermissions=actualPermissions.filter((id)=>allowed.has(id));}
    renderPermissions(new Set(actualPermissions)); $("modalTitle").textContent="Editar "+c.full_name; applyAccountType(true);
    const rp=Array.isArray(c.reseller_profiles)?c.reseller_profiles[0]:c.reseller_profiles; $("isReseller").checked=Boolean(c.is_reseller); if($("resellerRechargeCredits"))$("resellerRechargeCredits").value=0; $("resellerEnabled").value=String(rp?.enabled!==false); renderResellerCreditPanel(c);
    $("planValue").value=c.plan_value; $("expiresAt").value=c.expires_at||""; $("graceUntil").value=c.grace_until||""; if(savedTrial) $("trialExpiresAt").value=savedTrial;
    state.formDirty=false;state.previewToken="";setTestState(c.access_test_status||"pending","",Array.isArray(c.access_test_details)?c.access_test_details:[]);updateClientMessage();openModal("clientModal");
  }
  $("newClientBtn").onclick = () => openClient();
  $("importClientBtn").onclick = () => {
    $("importClientText").value = "";
    $("importClientMsg").textContent = "";
    openModal("importClientModal");
  };
  function importedValue(text, labels) {
    const list=Array.isArray(labels)?labels:[labels];
    for(const label of list){ const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); const re=new RegExp("(?:^|\\n)\\s*"+escaped+"\\s*:\\s*(.+)","i"); const m=String(text||"").match(re); if(m) return m[1].trim(); }
    return "";
  }
  function applyImportedClient() {
    const text=$("importClientText").value;
    const data={username:importedValue(text,["Nome de usuário","Usuario","Usuário"]),fullName:importedValue(text,["Nome completo","Nome"]),email:importedValue(text,["E-mail","Email","email"]),whatsapp:importedValue(text,["WhatsApp principal","WhatsApp","Whatsapp"]),whatsapp2:importedValue(text,["WhatsApp 2","Whatsapp 2"]),whatsapp3:importedValue(text,["WhatsApp 3","Whatsapp 3"]),plan:importedValue(text,["Plano escolhido","Plano desejado","Plano"])};
    if(!data.username||!data.fullName||!data.email||!data.whatsapp){$("importClientMsg").textContent="Não encontrei usuário, nome, e-mail e WhatsApp. Confira a mensagem colada.";return;}
    closeModals();resetForm();$("username").value=data.username;$("fullName").value=data.fullName;$("email").value=data.email;$("whatsapp").value=data.whatsapp;$("whatsapp2").value=data.whatsapp2;$("whatsapp3").value=data.whatsapp3;$("attendantSlug").value=A.slug(data.username);
    const match=state.plans.find((p)=>data.plan&&data.plan.toLowerCase().includes(String(p.name||"").toLowerCase()));if(match){$("accountType").value=Number(match.months)===0?"one_time":"monthly";applyAccountType();$("planMonths").value=String(match.months);updatePlan();}
    updateClientMessage();openModal("clientModal");
  }
  $("applyImportedClientBtn").onclick = applyImportedClient;
  function makeInternalTestPassword(){
    const token=window.crypto?.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2));
    return "JC-Teste-"+token;
  }
  async function applyResellerRechargeIfNeeded(clientId){
    const input=$("resellerRechargeCredits");
    const amount=Math.trunc(Number(input?.value||0));
    if(!clientId||!$("isReseller")?.checked||amount===0)return null;
    const current=resellerCreditAvailable(clientId);
    if(amount<0&&current+amount<0)throw new Error('Ajuste recusado: saldo atual da revenda é '+current.toLocaleString('pt-BR')+' crédito(s). O ajuste deixaria o saldo negativo.');
    const direction=amount>0?'recarga':'correção negativa';
    const description=amount>0?'Recarga de créditos da revenda no cadastro do cliente':'Correção manual negativa da recarga da revenda no cadastro do cliente';
    const {data,error}=await A.client.rpc('jc_launcher_add_product_credits',{p_payload:{owner_id:clientId,product_key:'geral',quantity:amount,metadata:{source:'painel-clientes',mode:'recarga_revenda_adm',adjustment_type:direction,description,saldo_antes_tela:current}}});
    if(error)throw new Error('Cliente salvo, mas o ajuste da recarga da revenda falhou: '+error.message);
    if(Number(data?.balance_after)<0)throw new Error('Ajuste recusado: o saldo final da revenda não pode ficar negativo.');
    if(input)input.value=0;
    return data;
  }
  async function saveClient() {
    applyAttendantAccessControls();
    const previousId=$("clientId").value,type=$("accountType").value,p=planByMonths();
    const previousType=state.editing?accountTypeOf(state.editing):null;
    const trialIso=type==="test"&&$("trialExpiresAt").value?new Date($("trialExpiresAt").value).toISOString():null;
    const visiblePassword=$("password").value;
    const selectedPermissionIds=selectedPermissions();
    if(type==="monthly"&&$("expiresAt").value&&!$("graceUntil").value)syncClientGraceDate(true);
    // A Edge Function antiga valida somente IDs já existentes no catálogo.
    // Funções novas/virtuais (VIP e operações em massa) são gravadas logo abaixo
    // diretamente em user_permissions, sem impedir o salvamento do cliente.
    const catalogPermissionIds=new Set((state.functions||[]).map((f)=>String(f?.id||"")).filter(Boolean));
    const edgePermissionIds=selectedPermissionIds.filter((id)=>catalogPermissionIds.has(String(id)));
    const body={action:previousId?"update":"create",user_id:previousId||undefined,username:$("username").value.trim(),full_name:$("fullName").value.trim(),email:$("email").value.trim(),whatsapp:$("whatsapp").value,whatsapp2:$("whatsapp2").value,whatsapp3:$("whatsapp3").value,account_type:type,role:type==="test"?"test":"client",billing_opt_in:type==="monthly"&&$("billingOptIn").checked,status:$("status").value,plan_months:type==="monthly"?Number($("planMonths").value):0,plan_name:type==="test"?"Teste temporário":type==="credits"?"Créditos":type==="one_time"?(p?.name||"Pagamento único"):(p?.name||"Mensal"),plan_value:(type==="test"||type==="credits")?0:Number($("planValue").value),starts_at:$("startsAt").value,expires_at:type==="monthly"?$("expiresAt").value:type==="test"?(trialIso||"").slice(0,10):null,grace_until:type==="monthly"?$("graceUntil").value:type==="test"?(trialIso||"").slice(0,10):null,trial_expires_at:trialIso,credits_balance:type==="credits"?Math.max(0,Number($("creditsBalance").value)||0):0,permissions:edgePermissionIds,attendant_enabled:selectedPermissionIds.includes("attendant.open"),attendant_slug:A.slug($("attendantSlug").value||$("username").value),is_reseller:$("isReseller").checked&&type!=="test",reseller_enabled:$("resellerEnabled").value!=="false",reseller_fee_percent:Number((Array.isArray(state.editing?.reseller_profiles)?state.editing.reseller_profiles[0]:state.editing?.reseller_profiles)?.fee_percent||0),reseller_parent_id:$("resellerParentId").value||null,reseller_sale_id:$("resellerSaleId").value||null,avatar_data:$("avatarData").value||null,avatar_required:$("avatarRequired").checked};
    if(!previousId) body.password=type==="test"?makeInternalTestPassword():visiblePassword;
    else if(previousType==="test"&&type!=="test") body.password=$("password").value||makeSecureTemporaryPassword();
    else if(previousType!=="test"&&type==="test") body.password=makeInternalTestPassword();
    if(!body.username||!body.full_name||!body.email||!body.whatsapp) throw new Error("Preencha usuário, nome, e-mail e WhatsApp principal.");
    if(body.password&&type!=="test"&&body.password.length<8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
    let passwordForTest="";
    if(type==="test") passwordForTest="teste";
    else if(previousId&&previousType==="test") passwordForTest=body.password||$("password").value;
    else passwordForTest=previousId?($("testPassword").value||state.lastPasswords[previousId]||""):visiblePassword;
    $("saveClientBtn").disabled=true;setTestState("checking","Salvando o cadastro antes do teste...",[]);
    try{
      const {data,error}=await A.client.functions.invoke("admin-users",{body});
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||"Não foi possível salvar.");
      const clientId=data.user_id||previousId;
      $("clientId").value=clientId;

      // Garante que todas as permissões marcadas no painel sejam realmente
      // gravadas, inclusive CONFIG/ZIP e operações em massa 11, 16 e VIP.
      // Também grava false para o que foi desmarcado, permitindo decidir
      // separadamente o acesso de cada cliente.
      const previousPermissionIds=(state.editing?.user_permissions||[])
        .map((item)=>String(item?.function_id||""))
        .filter(Boolean);
      const permissionUniverse=new Set([
        ...(state.functions||[]).map((f)=>String(f?.id||"")).filter(Boolean),
        ...previousPermissionIds,
        ...selectedPermissionIds.map(String),
      ]);
      const permissionRows=[...permissionUniverse].map((functionId)=>({
        user_id:clientId,
        function_id:functionId,
        enabled:selectedPermissionIds.includes(functionId),
      }));
      for(let index=0;index<permissionRows.length;index+=400){
        const {error:permissionError}=await A.client
          .from('user_permissions')
          .upsert(permissionRows.slice(index,index+400),{onConflict:'user_id,function_id'});
        if(permissionError)throw new Error('Cliente salvo, mas não foi possível gravar todas as permissões: '+permissionError.message);
      }
      const rechargeResult=await applyResellerRechargeIfNeeded(clientId);
      if(rechargeResult)A.toast('Ajuste da recarga da revenda aplicado: '+(rechargeResult?.balance_before??'—')+' → '+(rechargeResult?.balance_after??'—')+' créditos.');
      if(body.attendant_enabled) await ensureDefaultAttendantProfile(clientId,body.attendant_slug);
      if(passwordForTest)state.lastPasswords[clientId]=passwordForTest;
      $("passwordField").classList.add("hidden");
      $("testPasswordField").classList.add("hidden");
      $("testPassword").value=passwordForTest;
      $("openPasswordFromClientBtn").classList.remove("hidden");
      state.formDirty=false;
      await loadClients();
      state.editing=state.clients.find((x)=>x.id===clientId)||state.editing;
      updateClientMessage();
      A.toast(previousId?"Cliente atualizado.":"Cliente cadastrado.");
      if(state.activeRequestId){await A.client.from("client_requests").update({status:"created",reviewed_at:new Date().toISOString(),reviewed_by:state.access.profile.id}).eq("id",state.activeRequestId);state.activeRequestId="";await loadRequests();}
      if(state.activeResellerSaleId){await A.client.from("reseller_sales").update({status:"created",client_user_id:clientId,approved_by:state.access.profile.id,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",state.activeResellerSaleId);state.activeResellerSaleId="";await loadResellers();}
      if(body.password&&type!=="test"){
        try{await A.client.rpc("jc_admin_mark_password_temporary",{p_user_id:clientId});}catch(_){/* compatibilidade antes da migração */}
      }
      await runAutomaticTest(clientId);
    }finally{$("saveClientBtn").disabled=false;}
  }
  $("useAttendant")?.addEventListener("change",applyAttendantAccessControls);
  $("attendantAccessMode")?.addEventListener("change",applyAttendantAccessControls);
  $("saveClientBtn").onclick = () => saveClient().catch((e) => A.toast(e.message, "error"));
  $("testClientAccessBtn").onclick = () => runAutomaticTest($("clientId").value).catch((e) => A.toast(e.message, "error"));
  $("openClientPreviewBtn").onclick = () => openClientPreview().catch((e) => A.toast(e.message, "error"));
  $("approveClientAccessBtn").onclick = () => approveClientAccess().catch((e) => A.toast(e.message, "error"));
  $("copyClientMessageBtn").onclick = () => {
    if (state.testStatus !== "passed" || state.formDirty) return A.toast("Aprove o teste antes de copiar os dados.", "error");
    A.copy($("clientMessage").textContent).then(() => A.toast("Mensagem copiada."));
  };
  $("openClientWhatsappBtn").onclick = () => {
    if (state.testStatus !== "passed" || state.formDirty) return A.toast("Aprove o teste antes de enviar os dados.", "error");
    sendWhatsappMessage({whatsapp:$("whatsapp").value,whatsapp2:$("whatsapp2").value,whatsapp3:$("whatsapp3").value},$("clientMessage").textContent,`Enviar acesso para ${$("fullName").value||"cliente"}`);
  };
  function openMessage(c) {
    if(!c)return;
    sendWhatsappMessage(c,accessMessageForClient(c),`Enviar dados de acesso para ${c.full_name||c.username||"cliente"}`);
  }
  function openPassword(id) {
    $("passwordUserId").value = id;
    $("newPassword").value = makeSecureTemporaryPassword();
    setPasswordVisibility("newPassword", "toggleNewPasswordBtn", false);
    $("newAttendantPassword").value = makeSecureTemporaryPassword();
    setPasswordVisibility("newAttendantPassword", "toggleNewAttendantPasswordBtn", false);
    openModal("passwordModal");
  }
  $("openPasswordFromClientBtn").onclick = () => {
    const id = $("clientId").value;
    if (!id) return;
    closeModals();
    openPassword(id);
  };
  async function savePassword() {
    const id = $("passwordUserId").value,
      pass = $("newPassword").value;
    if (pass.length < 8)
      throw new Error("A senha precisa ter no mínimo 8 caracteres.");
    const { data, error } = await A.client.functions.invoke("admin-users", {
      body: { action: "set_password", user_id: id, password: pass },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Falha ao redefinir.");
    try { await A.client.rpc("jc_admin_mark_password_temporary", { p_user_id: id }); } catch (_) {}
    state.lastPasswords[id] = pass;
    if ($("clientId").value === id) $("testPassword").value = pass;
    closeModals();
    A.toast("Senha temporária redefinida. O cliente deverá criar a própria senha no próximo acesso.");
    await loadClients();
  }
  $("savePasswordBtn").onclick = () =>
    savePassword().catch((e) => A.toast(e.message, "error"));
  async function saveAttendantPassword() {
    const id = $("passwordUserId").value,
      pass = $("newAttendantPassword").value;
    if (pass.length < 8)
      throw new Error("A senha precisa ter no mínimo 8 caracteres.");
    const { data, error } = await A.client.functions.invoke("admin-users", {
      body: { action: "reset_attendant_password", user_id: id, password: pass },
    });
    if (error) throw error;
    if (!data?.ok)
      throw new Error(
        data?.error || "Falha ao redefinir a senha da atendente.",
      );
    closeModals();
    A.toast("Senha das configurações da atendente redefinida.");
    await loadClients();
  }
  $("saveAttendantPasswordBtn").onclick = () =>
    saveAttendantPassword().catch((e) => A.toast(e.message, "error"));

  function openPayment(c){
    if(!c||accountTypeOf(c)!=="monthly") return A.toast("Este cliente não possui plano recorrente.","error");
    $("paymentClientId").value=c.id;$("paymentClientName").textContent=`${c.full_name} — ${c.plan_name}`;$("paymentAmount").value=Number(c.plan_value||0).toFixed(2);$("paymentNotes").value="PIX confirmado";
    const today=A.isoDate(new Date());
    const anchors=[dateOnly(c.expires_at),dateOnly(c.starts_at),today].filter(Boolean).sort();
    const current=anchors[anchors.length-1]||today, next=A.addMonths(current,Number(c.plan_months)||1), grace=A.addDays(next,billingRuleValues().graceDays);
    const startNote=billingStartsLater(c,today)?`\nInício de cobrança programado: ${A.date(c.starts_at)}`:"";
    $("paymentPreview").textContent=`Ao confirmar:${startNote}\nPróximo vencimento: ${A.date(next)}\nÚltimo dia: ${A.date(grace)}\nSe estiver bloqueado por atraso, o acesso será liberado.`;openModal("paymentModal");
  }
  async function confirmPayment(){
    const id=$("paymentClientId").value,amount=Number($("paymentAmount").value)||null,notes=$("paymentNotes").value||null;
    const {data,error}=await A.client.rpc("admin_confirm_payment",{p_user_id:id,p_amount:amount,p_notes:notes});if(error)throw error;
    const nextDue=dateOnly(data?.next_due_date),fallbackGrace=nextDue?A.addDays(nextDue,billingRuleValues().graceDays):null;
    let nextGrace=fallbackGrace;
    if(nextDue){
      const applied=await A.client.rpc("jc_admin_apply_billing_grace",{p_user_id:id,p_due_date:nextDue});
      if(!applied.error&&applied.data) nextGrace=dateOnly(applied.data)||fallbackGrace;
      else {
        const updated=await A.client.from("profiles").update({grace_until:fallbackGrace}).eq("id",id);
        if(updated.error) console.warn("Prazo final da cobrança:",applied.error?.message||updated.error.message);
      }
    }
    const month=new Date().toISOString().slice(0,7)+'-01';
    const history=await A.client.from('jc_client_payment_history').upsert({client_id:id,reference_month:month,competency:month.slice(0,7),amount,paid_at:new Date().toISOString(),status:'paid',notes,confirmed_by:state.access?.profile?.id,metadata:{next_due_date:nextDue||null,grace_until:nextGrace||null}},{onConflict:'client_id,reference_month'});
    if(history.error)console.warn('Histórico do pagamento:',history.error.message);
    closeModals();A.toast(`Pagamento confirmado. Próximo vencimento: ${A.date(nextDue)} • prazo final: ${A.date(nextGrace)}`);await loadClients();
  }
  $("confirmPaymentBtn").onclick=()=>confirmPayment().catch((e)=>A.toast(e.message,"error"));

  async function openCredits(c){
    if(!c||accountTypeOf(c)!=="credits") return;$("creditClientId").value=c.id;$("creditClientName").textContent=`${c.full_name} — saldo atual: ${Number(c.credits_balance||0)}`;$("creditAmount").value="";$("creditNotes").value="";
    const {data}=await A.client.from("credit_transactions").select("amount,balance_after,kind,notes,created_at,functions_catalog(name)").eq("user_id",c.id).order("created_at",{ascending:false}).limit(20);
    $("creditHistory").textContent=(data||[]).length?(data||[]).map((x)=>`${new Date(x.created_at).toLocaleString("pt-BR")} — ${x.amount>0?"+":""}${x.amount} — saldo ${x.balance_after}${x.functions_catalog?.name?" — "+x.functions_catalog.name:""}${x.notes?" — "+x.notes:""}`).join("\n"):"Nenhuma movimentação registrada.";openModal("creditModal");
  }
  async function saveCreditAmount(){const amount=Number($("creditAmount").value);if(!Number.isInteger(amount)||amount===0)throw new Error("Digite uma quantidade inteira diferente de zero.");const {data,error}=await A.client.rpc("admin_add_credits",{p_user_id:$("creditClientId").value,p_amount:amount,p_notes:$("creditNotes").value||null});if(error)throw error;closeModals();A.toast("Novo saldo: "+data.balance);await loadClients();}
  $("saveCreditAmountBtn").onclick=()=>saveCreditAmount().catch((e)=>A.toast(e.message,"error"));

  function resellerCandidatesForOrphan() {
    return (state.clients || []).filter((c)=>c && c.is_reseller);
  }
  function resellerPayloadFromClient(c) {
    return {
      source: "reseller_public_form",
      reseller_id: c?.id || "",
      reseller_username: c?.username || "",
      reseller_name: c?.full_name || c?.username || "",
      reseller_contact: String(c?.whatsapp || c?.whatsapp2 || c?.whatsapp3 || "").replace(/\D/g, ""),
      revenda_destino: "revendedor",
      vinculado_pelo_adm: true,
      vinculado_em: new Date().toISOString()
    };
  }
  function renderResellerOrphanRequests() {
    const host = $("orphanResellerRequestList");
    if (!host) return;
    const rows = state.resellerOrphanRequests || [];
    const resellers = resellerCandidatesForOrphan();
    if (!rows.length) { host.innerHTML = "<div class='empty'>Nenhuma solicitação órfã da revenda encontrada.</div>"; return; }
    const options = resellers.map((c)=>`<option value="${esc(c.id)}">${esc(c.full_name||c.username)} — @${esc(c.username||"")}</option>`).join("");
    host.innerHTML = rows.map((r)=>{
      const p = r.payload || {};
      const note = p.observacao_revendedor || p.notes || "";
      return `<div class="request-card"><div class="request-card-head"><div><b>${esc(r.full_name||r.username||"Cadastro da revenda")}</b> <span class="badge blocked">sem vínculo</span><div class="meta">@${esc(r.username||"")} • ${esc(r.email||"")}<br>${[r.whatsapp,r.whatsapp2,r.whatsapp3].filter(Boolean).map(esc).join(" • ")}<br>Recebido: ${r.created_at?new Date(r.created_at).toLocaleString("pt-BR"):""}${note?"<br>Obs.: "+esc(note):""}<br>Esse cadastro foi enviado pela revenda, mas não ficou ligado a um revendedor.</div></div><div class="row-actions"><select data-orphan-reseller-select="${esc(r.id)}">${options || '<option value="">Nenhum revendedor liberado</option>'}</select><button class="btn green" data-link-orphan-request="${esc(r.id)}">Vincular ao revendedor</button><button class="btn red" data-discard-orphan-request="${esc(r.id)}">Descartar</button></div></div></div>`;
    }).join("");
    document.querySelectorAll("[data-link-orphan-request]").forEach((b)=>b.onclick=()=>linkOrphanResellerRequest(b.dataset.linkOrphanRequest).catch((e)=>A.toast(e.message,"error")));
    document.querySelectorAll("[data-discard-orphan-request]").forEach((b)=>b.onclick=()=>discardOrphanResellerRequest(b.dataset.discardOrphanRequest).catch((e)=>A.toast(e.message,"error")));
  }
  async function linkOrphanResellerRequest(id) {
    const row = state.resellerOrphanRequests.find((x)=>String(x.id)===String(id));
    if (!row) return;
    const select = document.querySelector(`[data-orphan-reseller-select="${CSS.escape(String(id))}"]`);
    const resellerId = select?.value || "";
    const reseller = (state.clients || []).find((c)=>String(c.id)===String(resellerId));
    if (!reseller) throw new Error("Escolha o revendedor correto para vincular esse cadastro.");
    if (!confirm(`Vincular o cadastro de ${row.full_name||row.username||"cliente"} ao revendedor ${reseller.full_name||reseller.username}?`)) return;
    const payload = { ...(row.payload || {}), ...resellerPayloadFromClient(reseller), observacao_revendedor: row.payload?.observacao_revendedor || row.payload?.notes || "" };
    const { error } = await A.client.from("client_requests").update({ payload, status: "pending" }).eq("id", id);
    if (error) throw error;
    A.toast("Solicitação vinculada. Ela deve aparecer na aba Solicitações do revendedor.");
    await loadRequests();
  }
  async function discardOrphanResellerRequest(id) {
    if (!confirm("Descartar essa solicitação órfã da revenda?")) return;
    const { error } = await A.client.from("client_requests").update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: state.access?.profile?.id }).eq("id", id);
    if (error) throw error;
    A.toast("Solicitação descartada.");
    await loadRequests();
  }

  function renderRequests(){
    if(!$("requestList"))return;const filter=$("requestStatusFilter")?.value||"pending";const list=state.requests.filter((r)=>filter==="all"||r.status===filter);
    $("requestList").innerHTML=list.length?list.map((r)=>`<div class="request-card"><div class="request-card-head"><div><b>${esc(r.full_name)}</b> <span class="badge">${r.request_type==="test"?"TESTE":"CLIENTE"}</span><div class="meta">@${esc(r.username)} • ${esc(r.email)}<br>${[r.whatsapp,r.whatsapp2,r.whatsapp3].filter(Boolean).map(esc).join(" • ")}<br>Plano: ${esc(String(r.plan_months??"não escolhido"))} • Cliente antigo: ${r.old_client?"Sim":"Não"}${r.last_version_html_name?" • HTML: "+esc(r.last_version_html_name):""}${r.quote_requested?"<br>Orçamento: "+esc(r.quote_description||"Solicitado"):""}<br>Recebido: ${new Date(r.created_at).toLocaleString("pt-BR")}</div></div><div class="row-actions"><button class="btn green" data-use-request="${r.id}">Usar no cadastro</button><button class="btn red" data-reject-request="${r.id}">Descartar</button></div></div></div>`).join(""):"<div class='empty'>Nenhuma solicitação nesta seleção.</div>";
    document.querySelectorAll("[data-use-request]").forEach((b)=>b.onclick=()=>useRequest(b.dataset.useRequest));document.querySelectorAll("[data-reject-request]").forEach((b)=>b.onclick=()=>setRequestStatus(b.dataset.rejectRequest,"rejected"));
  }
  async function setRequestStatus(id,status){const {error}=await A.client.from("client_requests").update({status,reviewed_at:new Date().toISOString(),reviewed_by:state.access.profile.id}).eq("id",id);if(error)throw error;await loadRequests();}
  async function useRequest(id){const r=state.requests.find((x)=>x.id===id);if(!r)return;resetForm();state.activeRequestId=id;$("username").value=r.username;$("fullName").value=r.full_name;$("email").value=r.email;$("whatsapp").value=r.whatsapp||"";$("whatsapp2").value=r.whatsapp2||"";$("whatsapp3").value=r.whatsapp3||"";$("accountType").value=r.request_type==="test"?"test":"monthly";applyAccountType();if(r.plan_months!=null&&r.request_type!=="test"){$("planMonths").value=String(r.plan_months);updatePlan();}$("attendantSlug").value=A.slug(r.username);updateClientMessage();await setRequestStatus(id,"approved");openModal("clientModal");}
  $("reloadRequestsBtn").onclick=()=>loadRequests().catch((e)=>A.toast(e.message,"error"));$("requestStatusFilter").onchange=renderRequests;
  async function adminClientManage(action,id,extra={}){
    const {data,error}=await A.client.rpc('jc_admin_client_manage_v2',{p_payload:{action,client_id:id,...extra}});
    if(error){
      const msg=String(error.message||error);
      if(/function .* does not exist|could not find the function|schema cache|not found/i.test(msg)){
        throw new Error('Execute uma vez o arquivo SQL-FINAL-ADM-REVENDA-FUNCIONAL.sql no Supabase e atualize com Ctrl + F5.');
      }
      throw error;
    }
    if(data&&data.ok===false)throw new Error(data.error||data.message||'O Supabase recusou a operação.');
    return data||{};
  }

  async function toggleClientBlock(id,triggerButton=null){
    const c=state.clients.find((x)=>x.id===id);
    if(!c)return;
    const blocking=String(c.status||'active')==='active';
    const action=blocking?'block':'unblock';
    let reason='';
    if(blocking){
      const informedReason=prompt(`Motivo do bloqueio de ${c.full_name||c.username}:`,'Falta de pagamento')||'Sem motivo informado';
      reason=`Bloqueio manual — ${String(informedReason).replace(/^bloqueio manual\s*[—:|-]?\s*/i,'').trim()||'Sem motivo informado'}`;
      if(!confirm(`Bloquear novamente ${c.full_name||c.username}?\n\nO cadastro, os créditos e o histórico serão mantidos, mas o cliente perderá o acesso.`))return;
    }else if(!confirm(`Desbloquear ${c.full_name||c.username}?`))return;
    const buttons=[...document.querySelectorAll(`[data-toggle-block="${CSS.escape(id)}"]`)];
    if(triggerButton&&!buttons.includes(triggerButton))buttons.push(triggerButton);
    buttons.forEach((b)=>{b.disabled=true;b.textContent=blocking?'Bloqueando...':'Desbloqueando...';});
    try{
      await adminClientManage(action,id,{reason});
      A.toast(blocking?'Cliente bloqueado novamente.':'Cliente desbloqueado.');
      await loadClients();
    }finally{
      buttons.forEach((b)=>{b.disabled=false;});
    }
  }

  async function deleteClient(id, triggerButton = null) {
    const c = state.clients.find((x) => x.id === id);
    if (!confirm(`Excluir ${c?.full_name || 'este cliente'} da lista do ADM?\n\nO acesso será bloqueado e o cliente deixará de aparecer. O histórico financeiro será preservado.`)) return;
    const buttons = [...document.querySelectorAll(`[data-del="${CSS.escape(id)}"]`)];
    if(triggerButton && !buttons.includes(triggerButton)) buttons.push(triggerButton);
    buttons.forEach((button)=>{button.disabled=true;button.textContent='Excluindo...';});
    try{
      await adminClientManage('archive',id);
      A.toast('Cliente excluído da lista e acesso bloqueado.');
      await loadClients();
    }finally{
      buttons.forEach((button)=>{button.disabled=false;button.textContent='Excluir';});
    }
  }


  async function saveGeneral() {
    const value={panel_url:$("generalPanelUrl").value.trim(),attendant_url:$("generalAttendantUrl").value.trim(),initial_password:"",password_policy:"Senha temporária exclusiva com troca obrigatória no primeiro acesso",test_public_password:"teste",purchase_whatsapp:String($("generalPurchaseWhatsapp")?.value||"").replace(/\D/g,""),show_locked_functions:$("generalShowLocked").value==="true",trial_amount:Math.max(1,Number($("generalTrialAmount").value)||1),trial_unit:$("generalTrialUnit").value==="hours"?"hours":"days"};
    const {error}=await A.client.from("app_settings").upsert({key:"general",value},{onConflict:"key"});if(error)throw error;state.general=value;A.toast("Configuração geral salva.");
  }
  $("saveGeneralBtn").onclick = () =>
    saveGeneral().catch((e) => A.toast(e.message, "error"));
  async function saveSignature() {
    const value = {
      show: $("signatureShow").value === "true",
      name: $("signatureName").value.trim() || "JC-APK TV",
      whatsapp: $("signatureWhatsapp").value.replace(/\D/g, ""),
      instagram: $("signatureInstagram").value.trim(),
      message:
        $("signatureMessage").value.trim() || "Desenvolvido por JC-APK TV",
    };
    const { error } = await A.client
      .from("app_settings")
      .upsert({ key: "signature", value }, { onConflict: "key" });
    if (error) throw error;
    state.signature = value;
    A.toast("Assinatura protegida salva.");
  }
  $("saveSignatureBtn").onclick = () =>
    saveSignature().catch((e) => A.toast(e.message, "error"));


  // ==========================================================
  // CONFIGURAÇÕES PRINCIPAIS: padrões, demonstração e códigos.
  // ==========================================================
  const defaultAccessTypes = [
    ["monthly", "Mensal", "Padrão aplicado aos novos clientes com cobrança recorrente."],
    ["one_time", "Pagamento único", "Padrão aplicado às licenças sem mensalidade."],
    ["test", "Teste", "Funções mostradas no ambiente demonstrativo, sem links ou códigos reais."],
    ["credits", "Créditos", "Funções disponíveis aos clientes por créditos; o custo é definido no bloco de créditos."],
  ];
  function selectedDefaultAccessValue(){
    const value={};
    defaultAccessTypes.forEach(([type])=>{
      value[type]=[...document.querySelectorAll(`.default-perm-check[data-default-type="${CSS.escape(type)}"]:checked`)].map((item)=>item.value);
    });
    return value;
  }
  function defaultAccessChanges(previous,next){
    const changes=[];
    const visibleFunctionIds=new Set(state.functions.map((item)=>item.id));
    defaultAccessTypes.forEach(([type,label])=>{
      const before=new Set(Array.isArray(previous?.[type])?previous[type]:[]);
      const after=new Set(Array.isArray(next?.[type])?next[type]:[]);
      const ids=new Set([...before,...after]);
      ids.forEach((functionId)=>{
        // Funções removidas/inativas não são tratadas como mudança manual.
        if(!visibleFunctionIds.has(functionId))return;
        if(before.has(functionId)!==after.has(functionId))changes.push({type,typeLabel:label,functionId,enabled:after.has(functionId)});
      });
    });
    return changes;
  }
  function renderDefaultChangesSummary(){
    const host=$("defaultChangesSummary");if(!host)return;
    const next=selectedDefaultAccessValue();const changes=defaultAccessChanges(state.accessDefaults||{},next);
    if(!changes.length){host.textContent='Nenhuma alteração pendente nos padrões.';return;}
    const enabled=changes.filter((item)=>item.enabled).length;const disabled=changes.length-enabled;
    host.textContent=`Alterações pendentes: ${changes.length} função(ões) — ${enabled} para liberar e ${disabled} para retirar. Se a opção abaixo estiver marcada, somente essas funções serão atualizadas nos clientes existentes.`;
  }
  async function applyDefaultChangesToExisting(changes){
    if(!changes.length)return {clients:0,rows:0};
    const rows=[];const touchedClients=new Set();
    changes.forEach((change)=>{
      visibleDirectClients().filter((client)=>accountTypeOf(client)===change.type).forEach((client)=>{
        rows.push({user_id:client.id,function_id:change.functionId,enabled:change.enabled});
        touchedClients.add(client.id);
      });
    });
    for(let index=0;index<rows.length;index+=400){
      const batch=rows.slice(index,index+400);
      const {error}=await A.client.from('user_permissions').upsert(batch,{onConflict:'user_id,function_id'});
      if(error)throw error;
    }
    // Atualiza a cópia local sem mexer nas demais permissões.
    changes.forEach((change)=>{
      visibleDirectClients().filter((client)=>accountTypeOf(client)===change.type).forEach((client)=>{
        const list=Array.isArray(client.user_permissions)?client.user_permissions:[];
        const existing=list.find((item)=>item.function_id===change.functionId);
        if(existing)existing.enabled=change.enabled;
        else list.push({function_id:change.functionId,enabled:change.enabled});
        client.user_permissions=list;
      });
    });
    return {clients:touchedClients.size,rows:rows.length};
  }
  function defaultAccessGroups() {
    return orderedFunctionGroups(state.functions);
  }
  function updateDefaultAccessUi(type) {
    const escapedType = CSS.escape(type);
    const checks = [...document.querySelectorAll(`.default-perm-check[data-default-type="${escapedType}"]`)];
    const selected = checks.filter((x) => x.checked).length;
    const tabCount = document.querySelector(`[data-default-tab="${escapedType}"] .default-tab-count`);
    const panelCount = document.querySelector(`[data-default-selected-count="${escapedType}"]`);
    if (tabCount) tabCount.textContent = `${selected}/${checks.length}`;
    if (panelCount) panelCount.textContent = `${selected} de ${checks.length} funções selecionadas`;
    document.querySelectorAll(`[data-default-group-all][data-default-type="${escapedType}"]`).forEach((groupAll) => {
      const group = CSS.escape(groupAll.dataset.defaultGroup || "");
      const items = [...document.querySelectorAll(`.default-perm-check[data-default-type="${escapedType}"][data-default-group="${group}"]`)];
      groupAll.checked = items.length > 0 && items.every((x) => x.checked);
      groupAll.indeterminate = items.some((x) => x.checked) && !items.every((x) => x.checked);
    });
    renderDefaultChangesSummary();
  }
  function showDefaultAccessTab(type) {
    state.defaultAccessTab = type;
    document.querySelectorAll("[data-default-tab]").forEach((button) => button.classList.toggle("active", button.dataset.defaultTab === type));
    document.querySelectorAll("[data-default-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.defaultPanel === type));
  }
  function renderDefaultAccessRules(){
    if(!$("defaultAccessRules")||!state.functions.length)return;
    const types = defaultAccessTypes;
    const validTypes = new Set(types.map(([type]) => type));
    const activeType = validTypes.has(state.defaultAccessTab) ? state.defaultAccessTab : "monthly";
    const groups = defaultAccessGroups();
    const tabs = types.map(([type,label]) => {
      const count = defaultPermissionIds(type).length;
      return `<button class="default-type-tab ${type===activeType?'active':''}" data-default-tab="${type}" type="button"><span>${esc(label)}</span><small class="default-tab-count">${count}/${state.functions.length}</small></button>`;
    }).join("");
    const panels = types.map(([type,label,description]) => {
      const selected = new Set(defaultPermissionIds(type));
      const groupCards = groups.map((group) => `<div class="perm-group"><div class="perm-head"><strong>${esc(group.name)}</strong><label class="check"><input type="checkbox" data-default-group-all="true" data-default-type="${type}" data-default-group="${esc(group.id)}"><span>Liberar tudo</span></label></div>${group.items.map((f)=>`<label class="check"><input type="checkbox" class="default-perm-check" data-default-type="${type}" data-default-group="${esc(group.id)}" value="${esc(f.id)}" ${selected.has(f.id)?'checked':''}><span>${esc(f.name)}</span></label>`).join("")}</div>`).join("");
      return `<section class="default-type-panel ${type===activeType?'active':''}" data-default-panel="${type}"><div class="default-type-summary"><div><strong>Configuração padrão: ${esc(label)}</strong><span>${esc(description)} <b class="default-selection-count" data-default-selected-count="${type}"></b></span></div><div class="default-type-actions"><button class="btn blue" data-default-mark-all="${type}" type="button">Marcar tudo</button><button class="btn ghost" data-default-clear-all="${type}" type="button">Limpar seleção</button></div></div><div class="default-permissions">${groupCards}</div></section>`;
    }).join("");
    $("defaultAccessRules").innerHTML = `<div class="default-access-shell"><div class="default-type-tabs" role="tablist">${tabs}</div>${panels}</div>`;
    document.querySelectorAll("[data-default-tab]").forEach((button) => button.onclick = () => showDefaultAccessTab(button.dataset.defaultTab));
    document.querySelectorAll("[data-default-group-all]").forEach((groupAll) => {
      groupAll.onchange = () => {
        const type = groupAll.dataset.defaultType;
        const escapedType = CSS.escape(type);
        const group = CSS.escape(groupAll.dataset.defaultGroup || "");
        document.querySelectorAll(`.default-perm-check[data-default-type="${escapedType}"][data-default-group="${group}"]`).forEach((item) => item.checked = groupAll.checked);
        updateDefaultAccessUi(type);
      };
    });
    document.querySelectorAll(".default-perm-check").forEach((item) => item.onchange = () => updateDefaultAccessUi(item.dataset.defaultType));
    document.querySelectorAll("[data-default-mark-all]").forEach((button) => button.onclick = () => {
      const type = button.dataset.defaultMarkAll;
      document.querySelectorAll(`.default-perm-check[data-default-type="${CSS.escape(type)}"]`).forEach((item) => item.checked = true);
      updateDefaultAccessUi(type);
    });
    document.querySelectorAll("[data-default-clear-all]").forEach((button) => button.onclick = () => {
      const type = button.dataset.defaultClearAll;
      document.querySelectorAll(`.default-perm-check[data-default-type="${CSS.escape(type)}"]`).forEach((item) => item.checked = false);
      updateDefaultAccessUi(type);
    });
    types.forEach(([type]) => updateDefaultAccessUi(type));
    showDefaultAccessTab(activeType);
  }
  async function saveAccessDefaults(){
    const previous=JSON.parse(JSON.stringify(state.accessDefaults||{}));
    const value=selectedDefaultAccessValue();
    const changes=defaultAccessChanges(previous,value);
    const {error}=await A.client.from('app_settings').upsert({key:'access_defaults',value,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;
    let applied={clients:0,rows:0};
    if($("applyDefaultsExisting").checked&&changes.length)applied=await applyDefaultChangesToExisting(changes);
    state.accessDefaults=value;
    renderDefaultAccessRules();renderClients();
    if($("applyDefaultsExisting").checked){
      A.toast(changes.length?`Padrões salvos. ${changes.length} função(ões) alterada(s) em ${applied.clients} cliente(s), sem mexer nas demais permissões.`:'Padrões salvos. Não havia alterações para aplicar aos clientes.');
    }else A.toast('Padrões de acesso salvos para os próximos cadastros.');
  }
  $("saveAccessDefaultsBtn").onclick=()=>saveAccessDefaults().catch((e)=>A.toast(e.message,'error'));
  async function saveDemoSettings(){const value={server_name:$("demoServerName").value.trim()||'MediaFire',watermark:$("demoWatermark").value.trim()||'DEMONSTRAÇÃO',badge_title:$("demoBadgeTitle").value.trim()||'AMBIENTE DEMONSTRATIVO',badge_text:$("demoBadgeText").value.trim()||'Conteúdo fictício — nenhum arquivo ou download real.',dynamic_time:$("demoDynamicTime").checked};const {error}=await A.client.from('app_settings').upsert({key:'demo',value,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;state.demoSettings=value;A.toast('Ambiente demonstrativo salvo.');}
  $("saveDemoSettingsBtn").onclick=()=>saveDemoSettings().catch((e)=>A.toast(e.message,'error'));
  async function loadDownloadCodes(){const {data,error}=await A.client.from('download_code_items').select('*').order('sort_order').order('label');if(error){console.warn('Códigos dinâmicos:',error.message);state.downloadCodes=[];return;}state.downloadCodes=data||[];renderDownloadCodes();}
  function renderDownloadCodes(){if(!$("downloadCodeList"))return;$("downloadCodeList").innerHTML=state.downloadCodes.length?state.downloadCodes.map((x)=>`<div class="code-row"><div><b>${esc(x.label)}</b><small>${esc(x.section_name)} • ${esc(x.item_kind)}</small></div><div><code>${esc(x.code)}</code></div><div><span class="badge ${x.active?'':'blocked'}">${x.active?'Ativo':'Oculto'}</span></div><div class="row-actions"><button class="btn" data-edit-code="${x.id}">Editar</button><button class="btn ${x.active?'amber':'green'}" data-toggle-code="${x.id}">${x.active?'Ocultar':'Ativar'}</button><button class="btn red" data-delete-code="${x.id}">Excluir</button></div></div>`).join(''):'<div class="empty">Nenhum código cadastrado.</div>';
    document.querySelectorAll('[data-edit-code]').forEach((b)=>b.onclick=()=>editCode(b.dataset.editCode));document.querySelectorAll('[data-toggle-code]').forEach((b)=>b.onclick=()=>toggleCode(b.dataset.toggleCode));document.querySelectorAll('[data-delete-code]').forEach((b)=>b.onclick=()=>deleteCode(b.dataset.deleteCode));}
  function editCode(id){const x=state.downloadCodes.find((r)=>r.id===id);if(!x)return;$("editingCodeId").value=x.id;$("codeSection").value=x.section_name;$("codeLabel").value=x.label;$("codeValue").value=x.code;$("codeKind").value=x.item_kind;$("addCodeItemBtn").textContent='Salvar alteração';}
  async function saveCodeItem(){const id=$("editingCodeId").value;const row={section_name:$("codeSection").value.trim()||'UniTV Free Versões',label:$("codeLabel").value.trim(),code:$("codeValue").value.trim(),item_kind:$("codeKind").value,active:true,sort_order:id?(state.downloadCodes.find((x)=>x.id===id)?.sort_order||10):((state.downloadCodes.at(-1)?.sort_order||0)+10),updated_at:new Date().toISOString()};if(!row.label||!row.code)throw new Error('Preencha nome e código.');let q=id?A.client.from('download_code_items').update(row).eq('id',id):A.client.from('download_code_items').insert(row);const {error}=await q;if(error)throw error;$("editingCodeId").value='';$("codeLabel").value='';$("codeValue").value='';$("addCodeItemBtn").textContent='Adicionar';await loadDownloadCodes();A.toast('Lista de códigos atualizada.');}
  async function toggleCode(id){const x=state.downloadCodes.find((r)=>r.id===id);const {error}=await A.client.from('download_code_items').update({active:!x.active,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await loadDownloadCodes();}
  async function deleteCode(id){if(!confirm('Excluir este código?'))return;const {error}=await A.client.from('download_code_items').delete().eq('id',id);if(error)throw error;await loadDownloadCodes();}
  $("addCodeItemBtn").onclick=()=>saveCodeItem().catch((e)=>A.toast(e.message,'error'));

  // ==========================================================
  // REVENDEDORES E VENDAS PENDENTES.
  // ==========================================================
  async function loadResellers(){
    const [r1,r2]=await Promise.all([
      A.client.from('profiles').select('id,username,full_name,email,whatsapp,status,account_type,plan_name,expires_at,grace_until,is_reseller,user_permissions(function_id,enabled),reseller_profiles(enabled,fee_percent,price_table,billing_settings,notes,updated_at)').eq('is_reseller',true).order('full_name'),
      A.client.from('reseller_sales').select('*').order('created_at',{ascending:false}).limit(300)
    ]);
    if(r1.error){console.warn('Revendedores:',r1.error.message);state.resellers=[];}else state.resellers=r1.data||[];
    if(r2.error){console.warn('Vendas de revenda:',r2.error.message);state.resellerSales=[];}else state.resellerSales=r2.data||[];
    renderResellers();renderResellerSales();renderStats();
  }
  
  function creditBalanceOf(c){
    const direct=Number(c?.credits_balance||0)+Number(c?.credit_balance||0)+Number(c?.product_credit_balance||0)+Number(c?.product_credits_balance||0)+Number(c?.reseller_credit_balance||0);
    const arrays=[c?.product_balances,c?.product_credit_balances,c?.reseller_product_balances,c?.balances].filter(Array.isArray);
    const nested=arrays.flat().reduce((sum,x)=>sum+Math.max(0,Number(x?.balance||x?.credits||x?.amount||0)),0);
    const objectBalances=(!Array.isArray(c?.product_credit_balances)&&c?.product_credit_balances&&typeof c.product_credit_balances==='object')?Object.values(c.product_credit_balances).reduce((sum,v)=>sum+Math.max(0,Number(v?.balance??v??0)),0):0;
    const mapped=state.clientProductCreditTotals instanceof Map?Number(state.clientProductCreditTotals.get(c?.id)||0):0;
    return Math.max(0,direct+nested+objectBalances+mapped);
  }
  function hasActiveResellerCredits(c){
    return String(c?.status||'active')==='active' && accountTypeOf(c)==='credits' && creditBalanceOf(c)>0;
  }
  function resellerCreditCustomers(resellerId){
    return state.clients.filter((x)=>x.reseller_parent_id===resellerId&&!x.archived_at&&hasActiveResellerCredits(x));
  }
  function resellerMonthlyRate(activeCreditClients){
    const count=Number(activeCreditClients||0);
    if(count<=10)return 0;
    if(count<=50)return 0.5;
    return Number((1+(Math.floor((count-51)/50)*0.5)).toFixed(2));
  }
  function resellerMonthlyRateLabel(activeCreditClients){
    return resellerMonthlyRate(activeCreditClients).toLocaleString('pt-BR')+'%';
  }
  function resellerChildren(resellerId,{activeOnly=true}={}){
    return (state.clients||[]).filter((c)=>
      String(c?.reseller_parent_id||'')===String(resellerId)
      && !c?.archived_at
      && (!activeOnly||String(c?.status||'active')==='active')
    );
  }

  function ensureResellerClientsModal(){
    let modal=$('resellerClientsModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='resellerClientsModal';
    modal.className='modal';
    modal.innerHTML=`<div class="modal-box" style="width:min(1120px,96vw)"><div class="modal-head"><div><h3 id="resellerClientsTitle">Clientes do revendedor</h3><small class="muted" id="resellerClientsSubtitle">Saldos, uso, funções e histórico separados por cliente.</small></div><button class="btn red" id="closeResellerClientsModal" type="button">Fechar</button></div><div class="modal-body"><div id="resellerClientsDetailList" class="reseller-list"><div class="empty">Carregando...</div></div></div></div>`;
    document.body.appendChild(modal);
    const closeModal=()=>{modal.classList.remove('open');document.documentElement.classList.remove('jc-client-modal-open');};
    modal.querySelector('#closeResellerClientsModal').onclick=closeModal;
    modal.addEventListener('click',(e)=>{if(e.target===modal)closeModal();});
    return modal;
  }

  function clientCreditHistorySummary(rows){
    const normalized=(rows||[]).map(normalizeCreditHistoryRow);
    const received=normalized.reduce((sum,h)=>sum+(h.quantity>0?h.quantity:0),0);
    const used=normalized.reduce((sum,h)=>sum+(h.quantity<0?Math.abs(h.quantity):0),0);
    const recent=normalized.slice(0,5).map((h)=>{
      const qty=h.quantity?`${h.quantity>0?'+':''}${h.quantity.toLocaleString('pt-BR')}`:'lançamento';
      const when=h.date?new Date(h.date).toLocaleString('pt-BR'):'';
      return `<div><b>${esc(qty)} crédito(s)</b> • ${esc(h.product)}<br><small>${esc(when)}${h.note?' • '+esc(h.note):''}</small></div>`;
    }).join('<hr style="border:0;border-top:1px solid rgba(255,255,255,.08);margin:6px 0">');
    return {received,used,recent:recent||'<small>Sem movimentação detalhada encontrada.</small>'};
  }

  async function openResellerClients(resellerId){
    const reseller=state.resellers.find((r)=>String(r.id)===String(resellerId))||state.clients.find((r)=>String(r.id)===String(resellerId));
    if(!reseller)return;
    const modal=ensureResellerClientsModal();
    const list=modal.querySelector('#resellerClientsDetailList');
    modal.querySelector('#resellerClientsTitle').textContent=`Clientes de ${reseller.full_name||reseller.username}`;
    modal.querySelector('#resellerClientsSubtitle').textContent='Cada cliente permanece separado dos clientes diretos do ADM e dos clientes de outros revendedores.';
    list.innerHTML='<div class="empty">Carregando clientes e históricos...</div>';
    modal.classList.add('open');
    document.documentElement.classList.add('jc-client-modal-open');
    const children=resellerChildren(resellerId,{activeOnly:false});
    if(!children.length){list.innerHTML='<div class="empty">Este revendedor ainda não possui clientes.</div>';return;}
    const historyResults=await Promise.allSettled(children.map((c)=>fetchCreditHistory(c.id)));
    list.innerHTML=children.map((c,index)=>{
      const history=historyResults[index]?.status==='fulfilled'?historyResults[index].value:[];
      const summary=clientCreditHistorySummary(history);
      const functions=(c.user_permissions||[]).filter((p)=>p.enabled!==false);
      const balance=creditBalanceOf(c);
      return `<div class="reseller-card"><div class="reseller-card-head"><div><b>${esc(c.full_name||c.username)}</b> <span class="badge ${c.status==='active'?'att':'blocked'}">${esc(c.status||'active')}</span><br><small>@${esc(c.username||'')} • ${esc(c.whatsapp||'Sem WhatsApp')}</small></div><div class="row-actions"><button class="btn" data-open-reseller-child="${esc(c.id)}">Abrir ficha no ADM</button></div></div><div class="reseller-metrics"><div class="metric"><b>${balance.toLocaleString('pt-BR')}</b><small>saldo atual</small></div><div class="metric"><b>${summary.received.toLocaleString('pt-BR')}</b><small>créditos recebidos</small></div><div class="metric"><b>${summary.used.toLocaleString('pt-BR')}</b><small>créditos utilizados</small></div><div class="metric"><b>${functions.length}</b><small>funções liberadas</small></div></div><div class="grid2" style="margin-top:9px"><div class="field"><label>Funções</label><div class="readonly-note">${functions.length?functions.map((f)=>esc(state.functions.find((x)=>x.id===f.function_id)?.name||f.function_id)).join('<br>'):'Nenhuma função liberada'}</div></div><div class="field"><label>Histórico recente</label><div class="readonly-note">${summary.recent}</div></div></div></div>`;
    }).join('');
    list.querySelectorAll('[data-open-reseller-child]').forEach((b)=>b.onclick=()=>{
      modal.classList.remove('open');
      document.documentElement.classList.remove('jc-client-modal-open');
      const child=state.clients.find((c)=>String(c.id)===String(b.dataset.openResellerChild));
      if(child)openClient(child);
    });
  }

  function renderResellers(){
    if(!$('resellerList'))return;
    $('resellerList').innerHTML=state.resellers.length?state.resellers.map((r)=>{
      const rp=Array.isArray(r.reseller_profiles)?r.reseller_profiles[0]:r.reseller_profiles||{};
      const sales=state.resellerSales.filter((x)=>x.reseller_id===r.id);
      const activeCreditClients=resellerCreditCustomers(r.id).length;
      const registeredClients=resellerChildren(r.id).length;
      const total=sales.filter((x)=>x.status==='created').reduce((a,x)=>a+Number(x.customer_price||0),0);
      const monthlyRate=resellerMonthlyRate(activeCreditClients);
      const available=resellerCreditAvailable(r.id);
      const rows=resellerCreditRows(r.id);
      const detail=rows.length?rows.map((x)=>`${esc(String(x.product_key||'geral'))}: ${Number(x.balance||0).toLocaleString('pt-BR')}`).join('<br>'):'Saldo por produto não detalhado';
      const hist=creditHistoryHtml(r.id);
      return `<div class="reseller-card"><div class="reseller-card-head"><div><b>${esc(r.full_name)}</b> <span class="badge ${rp.enabled===false?'blocked':'att'}">${rp.enabled===false?'Bloqueado':'Ativo'}</span><br><small>@${esc(r.username)} • ${esc(r.whatsapp||'')}</small></div><div class="row-actions"><button class="btn" data-open-reseller="${r.id}">Abrir cliente</button><button class="btn green" data-save-reseller="${r.id}">Salvar regra</button></div></div><div class="reseller-metrics"><div class="metric"><b>${available.toLocaleString('pt-BR')}</b><small>créditos disponíveis</small></div><div class="metric"><b>${activeCreditClients}</b><small>clientes com crédito</small></div><button class="metric" data-view-reseller-clients="${r.id}" type="button" style="color:#fff;text-align:left;cursor:pointer"><b>${registeredClients}</b><small>clientes ativos totais • clicar para ver</small></button><div class="metric"><b>${resellerMonthlyRateLabel(activeCreditClients)}</b><small>taxa da mensalidade</small></div><div class="metric"><b>${A.money(total)}</b><small>saldo movimentado</small></div></div><div class="grid2" style="margin-top:9px"><div class="field"><label>Saldo atual da recarga</label><div class="readonly-note"><b>${available.toLocaleString('pt-BR')}</b> crédito(s)<br><small>${detail}</small></div></div><div class="field"><label>Status</label><select data-reseller-enabled="${r.id}"><option value="true" ${rp.enabled!==false?'selected':''}>Ativo</option><option value="false" ${rp.enabled===false?'selected':''}>Bloqueado</option></select></div><div class="field"><label>Regra automática da taxa</label><input data-reseller-fee="${r.id}" type="number" min="0" max="100" step="0.01" value="${monthlyRate}" readonly><span class="password-info">Conta somente clientes ativos com saldo atual de crédito. 1 a 10 = 0%, 11 a 50 = 0,5%, 51 a 100 = 1% e continua +0,5% a cada nova faixa de 50.</span></div><div class="field"><label>Histórico / resumo de créditos</label><div class="readonly-note">${hist}</div></div></div></div>`;
    }).join(''):'<div class="empty">Nenhum revendedor liberado. Abra um cliente e marque “Liberar área de revendedor”.</div>';
    document.querySelectorAll('[data-open-reseller]').forEach((b)=>b.onclick=()=>openClient(state.clients.find((x)=>x.id===b.dataset.openReseller)||state.resellers.find((x)=>x.id===b.dataset.openReseller)));
    document.querySelectorAll('[data-save-reseller]').forEach((b)=>b.onclick=()=>saveResellerRule(b.dataset.saveReseller));
    document.querySelectorAll('[data-view-reseller-clients]').forEach((b)=>b.onclick=()=>openResellerClients(b.dataset.viewResellerClients).catch((e)=>A.toast(e.message||'Não foi possível abrir os clientes do revendedor.','error')));
  }
  async function saveResellerRule(id){const activeCreditClients=resellerCreditCustomers(id).length;const fee=resellerMonthlyRate(activeCreditClients);const enabled=document.querySelector(`[data-reseller-enabled="${id}"]`).value==='true';const {error}=await A.client.from('reseller_profiles').upsert({user_id:id,fee_percent:fee,enabled,billing_settings:{count_basis:'active_credit_customers',active_credit_customers:activeCreditClients,rule:'1-10=0%;11-50=0.5%;51-100=1%;+0.5% per 50'},updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;await loadResellers();A.toast('Regra do revendedor salva: '+activeCreditClients+' cliente(s) com crédito, taxa '+fee.toLocaleString('pt-BR')+'%.');}
  function renderResellerSales(){if(!$("resellerSalesList"))return;const f=$("resellerSalesFilter")?.value||'pending';let rows=state.resellerSales;if(f==='pending')rows=rows.filter((x)=>['pending','awaiting_platform_payment','approved'].includes(x.status));else if(f==='created')rows=rows.filter((x)=>x.status==='created');$("resellerSalesList").innerHTML=rows.length?rows.map((x)=>{const r=state.resellers.find((y)=>y.id===x.reseller_id);return `<div class="sale-card"><div class="sale-card-head"><div><b>${esc(x.full_name)}</b> <span class="badge">${esc(x.account_type)}</span> <span class="badge ${x.status==='created'?'':'blocked'}">${esc(x.status)}</span><div class="meta">Revendedor: ${esc(r?.full_name||x.reseller_id)}<br>${esc(x.email||'')} • ${esc(x.whatsapp||'')}<br>Cadastro: ${x.account_type==='credits'?'cliente por créditos':'bloqueado para revenda'}<br>Revenda por Crédito: mensal, vitalício e teste não devem ser aprovados nesta área.</div></div><div class="row-actions">${x.status!=='created'&&x.status!=='rejected'?`<button class="btn green" data-use-sale="${x.id}">Conferir e criar</button><button class="btn red" data-reject-sale="${x.id}">Recusar</button>`:''}</div></div></div>`;}).join(''):'<div class="empty">Nenhuma venda nesta seleção.</div>';document.querySelectorAll('[data-use-sale]').forEach((b)=>b.onclick=()=>useResellerSale(b.dataset.useSale));document.querySelectorAll('[data-reject-sale]').forEach((b)=>b.onclick=()=>setResellerSaleStatus(b.dataset.rejectSale,'rejected'));}
  async function setResellerSaleStatus(id,status){const {error}=await A.client.from('reseller_sales').update({status,approved_by:state.access.profile.id,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await loadResellers();}
  async function useResellerSale(id){const sale=state.resellerSales.find((x)=>x.id===id);if(!sale)return;if(String(sale.account_type)!=='credits'){A.toast('Revenda por Crédito não aprova mensal, vitalício nem teste. Esta solicitação será recusada.','error');await setResellerSaleStatus(id,'rejected');return;}const reseller=state.resellers.find((x)=>x.id===sale.reseller_id);resetForm();state.activeResellerSaleId=id;state.resellerPermissionOverride=(reseller?.user_permissions||[]).filter((x)=>x.enabled).map((x)=>x.function_id);$("resellerParentId").value=sale.reseller_id;$("resellerSaleId").value=sale.id;$("username").value=sale.username||('cliente_'+String(sale.id).slice(0,6));$("fullName").value=sale.full_name;$("email").value=sale.email||'';$("whatsapp").value=sale.whatsapp||'';$("whatsapp2").value=sale.whatsapp2||'';$("whatsapp3").value=sale.whatsapp3||'';$("accountType").value=sale.account_type;applyAccountType();if(sale.account_type==='monthly'){$("planMonths").value=String(sale.plan_months);updatePlan();$("planValue").value=Number(sale.customer_price||0);}if(sale.account_type==='credits')$("creditsBalance").value=0;renderPermissions(new Set(state.resellerPermissionOverride));applyDefaultPermissions(sale.account_type);$("attendantSlug").value=A.slug($("username").value);updateClientMessage();openModal('clientModal');}
  if($("reloadResellersBtn"))$("reloadResellersBtn").onclick=()=>loadResellers().catch((e)=>A.toast(e.message,'error'));
  if($("resellerSalesFilter"))$("resellerSalesFilter").onchange=renderResellerSales;

  const knownIds = new Set([
    "btn_gerar",
    "btn_config_download_gerar_codigo",
    "btn_config_download_copiar_codigo",
    "btn_config_pack",
    "btn_unitv_codigos",
    "btn_versao",
    "btn_gerador11_11",
    "btn_ativador_5100_11",
    "btn_gerar_codigo_11",
    "btn_gerar_codigo_download_11",
    "btn_copiar_codigo_download_11",
    "btn_gerador11",
    "btn_ativador_5100",
    "btn_gerar_codigo_16",
    "btn_gerar_codigo_download",
    "btn_pacote_gerar",
    "btn_pacote_stv",
    "btn_pacote_xplus",
    "btn_pacote_xplus_novo",
    "btn_pacote_btv_gerar_codigo",
    "btn_pacote_btv_copiar_codigo",
    "btn_pacote_btv_acessar",
    "btn_pacote_stv_gerar_codigo",
    "btn_pacote_stv_copiar_codigo",
    "btn_pacote_stv_acessar",
    "btn_pacote_xplus_gerar_codigo",
    "btn_pacote_xplus_copiar_codigo",
    "btn_pacote_xplus_acessar",
    "btn_pacote_eaigo_gerar_codigo",
    "btn_pacote_eaigo_copiar_codigo",
    "btn_pacote_eaigo_acessar",
    "copiarCodigo11Direito",
    "copiarCodigo16Principal",
    "copiarCodigoDownload16",
  ]);
  function cleanId(v) {
    return String(v || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.|\.$/g, "")
      .slice(0, 70);
  }
  function classify(el) {
    const officialType = String(el.getAttribute("data-jc-activator-type") || "").trim();
    const officialFunctionId = String(el.getAttribute("data-jc-function-id") || el.getAttribute("data-jc-feature") || "").toLowerCase();
    if (officialType === "16" || officialFunctionId.startsWith("activator16")) return ["activator16", "Ativador 16 dígitos"];
    if (officialType === "11" || officialFunctionId.startsWith("activator11")) return ["activator11", "Ativador 11 dígitos"];
    const raw = (
      (el.id || "") +
      " " +
      (el.getAttribute("onclick") || "") +
      " " +
      (el.className || "")
    ).toLowerCase();
    if (raw.includes("config")) return ["config", "Config"];
    if (raw.includes("16") || raw.includes("ativador_5100"))
      return ["activator16", "Gerador de 16 dígitos"];
    if (raw.includes("11")) return ["activator11", "Gerador de 11 dígitos"];
    if (
      raw.includes("pacote") ||
      raw.includes("btv") ||
      raw.includes("stv") ||
      raw.includes("xplus") ||
      raw.includes("eaigo")
    )
      return ["packages", "Pacote de APK"];
    return ["other", "Outras funções"];
  }
  async function syncFunctions(silent = false) {
    const res = await fetch("geradores/index.html?scan=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("Não foi possível ler o arquivo-base.");
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const now = new Date().toISOString();
    const rowsById = new Map();
    const currentBySelector = new Map(state.functions.filter((f) => f.selector).map((f) => [f.selector, f]));
    const currentById = new Map(state.functions.map((f) => [f.id, f]));
    function utility(el, text, raw) {
      if (el.hasAttribute("data-jc-ignore")) return true;
      if (el.hasAttribute("data-jc-feature") || el.hasAttribute("data-jc-function-id")) return false;
      const controlRaw = ((el.id || "") + " " + (el.getAttribute("onclick") || "")).toLowerCase();
      return !text || /^(entrar|sair|fechar|cancelar|voltar|limpar|resetar|minimizar|maximizar|menu)$/i.test(text.trim()) || /validarlogin|(^|[^a-z])(toggle|fechar|reset|scroll|modal|cancel)([^a-z]|$)/i.test(controlRaw);
    }
    function addElement(el, index) {
      const id = el.id || "";
      const onclick = el.getAttribute("onclick") || "";
      const text = (el.getAttribute("data-jc-function-name") || el.getAttribute("data-jc-name") || el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
      const raw = `${id} ${onclick} ${el.className || ""}`;
      if (utility(el, text, raw)) return;
      let selector = el.getAttribute("data-jc-selector") || (id ? "#" + CSS.escape(id) : "");
      let fn = "";
      if (!selector) {
        const m = onclick.match(/([A-Za-z_$][\w$]*)\s*\(/);
        if (!m) return;
        fn = m[1];
        selector = `${el.tagName.toLowerCase()}[onclick*="${fn}"]`;
      }
      const explicitId = cleanId(el.getAttribute("data-jc-function-id") || el.getAttribute("data-jc-feature"));
      const existing = currentBySelector.get(selector) || (explicitId ? currentById.get(explicitId) : null);
      const classified = classify(el);
      const stableId = explicitId || existing?.id || "auto." + cleanId(id || fn || "item-" + index);
      if (!stableId) return;
      const canonicalGroup = canonicalPermissionGroup({ id: stableId, name: text, selector, group_id: classified[0], group_name: classified[1] });
      const gid = cleanId(el.getAttribute("data-jc-group")) || canonicalGroup?.id || existing?.group_id || classified[0];
      const gname = el.getAttribute("data-jc-group-name") || canonicalGroup?.name || existing?.group_name || classified[1];
      const actionKind = el.getAttribute("data-jc-action-kind") || existing?.action_kind || (/abrir|link|acess|download/i.test(onclick + " " + text) ? "link" : "action");
      rowsById.set(stableId, {
        id: stableId,
        group_id: gid || "other",
        group_name: gname || "Outras funções",
        name: text || existing?.name || stableId,
        selector,
        action_kind: actionKind,
        protected: el.getAttribute("data-jc-protected") === "true" || Boolean(existing?.protected) || /activator11|activator16/.test(gid),
        active: true,
        source_key: "base",
        last_seen_at: now,
        sort_order: Number(el.getAttribute("data-jc-order")) || existing?.sort_order || 800 + index,
      });
    }
    doc.querySelectorAll("[data-jc-function-id],[data-jc-feature]").forEach(addElement);
    doc.querySelectorAll("button[id],a[id],[role=button][id],button[onclick],a[onclick]").forEach(addElement);
    const rows = [...rowsById.values()];
    if (!rows.length) throw new Error("Nenhuma função válida foi encontrada no arquivo-base.");
    const { error } = await A.client.from("functions_catalog").upsert(rows, { onConflict: "id" });
    if (error) throw error;

    const allBase = await A.client.from("functions_catalog").select("id").eq("source_key", "base");
    if (allBase.error) throw allBase.error;
    const seen = new Set(rows.map((r) => r.id));
    const removed = (allBase.data || []).map((x) => x.id).filter((id) => !seen.has(id));
    if (removed.length) {
      const off = await A.client.from("functions_catalog").update({ active: false, updated_at: now }).in("id", removed);
      if (off.error) throw off.error;
    }
    await loadFunctions();
    if (!silent) A.toast(`${rows.length} função(ões) reconhecida(s); ${removed.length} removida(s) marcada(s) como inativa(s).`);
  }
  $("syncFunctionsBtn").onclick = () =>
    syncFunctions().catch((e) => A.toast(e.message, "error"));

  restore();
})();
