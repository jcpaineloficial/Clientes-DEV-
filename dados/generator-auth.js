(function () {
  "use strict";
  const A = window.JC_APP,
    $ = (id) => document.getElementById(id);
  const state = {
    access: null,
    mode: "",
    profile: null,
    permissions: {},
    functions: [],
    salesPackages: [],
    general: {},
    billing: {},
    demo: {},
    downloadCodes: [],
    creditPending: new WeakSet(),
    creditBypass: new WeakSet(),
    activationNoticePending: new WeakSet(),
    activationNoticeBypass: new WeakSet(),
    activationPending: { "11": false, "16": false },
    passwordChangeRequired: false,
  };
  const knownFallback = [
    ["config.open", "config", "Config", "Abrir Config", "#btn_gerar", "entry"],
    [
      "config.generate_codes",
      "config",
      "Config",
      "Gerar códigos de download",
      "#btn_config_download_gerar_codigo",
      "action",
    ],
    [
      "config.copy_code",
      "config",
      "Config",
      "Copiar código de download",
      "#btn_config_download_copiar_codigo",
      "action",
    ],
    [
      "config.access",
      "config",
      "Config",
      "Acesse aqui (.config)",
      "#btn_config_pack",
      "download",
    ],
    [
      "config.download_codes",
      "config",
      "Config",
      "Versões / códigos de download",
      "#btn_unitv_codigos",
      "action",
    ],
    [
      "config.download_apk",
      "config",
      "Config",
      "Download das versões do APK",
      "#btn_versao",
      "link",
    ],
    [
      "config.file_manager",
      "config",
      "Config",
      "Gerenciador de arquivos",
      "#btn_tutorial",
      "link",
    ],
    [
      "config.system_update",
      "config",
      "Config",
      "Limpeza do UniTv S/Formatar",
      "#btn_atualizacao",
      "link",
    ],
    [
      "activator11.open",
      "activator11",
      "Gerador de 11 dígitos",
      "Abrir gerador 11",
      "#btn_gerador11_11",
      "entry",
    ],
    [
      "activator11.access",
      "activator11",
      "Gerador de 11 dígitos",
      "Ativador 11",
      "#btn_ativador_5100_11",
      "link",
    ],
    [
      "activator11.generate",
      "activator11",
      "Gerador de 11 dígitos",
      "Gerar ativação 11",
      "#btn_gerar_codigo_11",
      "action",
    ],
    [
      "activator11.copy",
      "activator11",
      "Gerador de 11 dígitos",
      "Copiar ativação 11",
      "#btn_copiar_codigo_11",
      "action",
    ],
    [
      "activator11.generate_download",
      "activator11",
      "Gerador de 11 dígitos",
      "Gerar código download 11",
      "#btn_gerar_codigo_download_11",
      "action",
    ],
    [
      "activator11.copy_download",
      "activator11",
      "Gerador de 11 dígitos",
      "Copiar código download 11",
      "#btn_copiar_codigo_download_11",
      "action",
    ],
    [
      "activator16.open",
      "activator16",
      "Gerador de 16 dígitos",
      "Abrir gerador 16",
      "#btn_gerador11",
      "entry",
    ],
    [
      "activator16.access",
      "activator16",
      "Gerador de 16 dígitos",
      "Ativador 16",
      "#btn_ativador_5100",
      "link",
    ],
    [
      "activator16.generate",
      "activator16",
      "Gerador de 16 dígitos",
      "Gerar ativação 16",
      "#btn_gerar_codigo_16",
      "action",
    ],
    [
      "activator16.copy",
      "activator16",
      "Gerador de 16 dígitos",
      "Copiar ativação 16",
      "#btn_copiar_codigo_16",
      "action",
    ],
    [
      "activator16.generate_download",
      "activator16",
      "Gerador de 16 dígitos",
      "Gerar código download 16",
      "#btn_gerar_codigo_download",
      "action",
    ],
    [
      "activator16.copy_download",
      "activator16",
      "Gerador de 16 dígitos",
      "Copiar código download 16",
      "#btn_copiar_codigo_download_16",
      "action",
    ],
    ["activatorvip.open", "activatorvip", "Ativador VIP", "Ativador VIP", "#btn_activator_vip", "entry"],
    ["activatorvip.access", "activatorvip", "Ativador VIP", "Abrir APK VIP", "#vip_panel [data-jc-vip-open-link]", "link"],
    ["activatorvip.reset", "activatorvip", "Ativador VIP", "Resetar ativador VIP", "#vip_panel .gerador16-reset-btn", "action"],
    ["activatorvip.generate", "activatorvip", "Ativador VIP", "Gerar ativação VIP", "[data-jc-vip-generate],[data-jc-vip-batch]", "action"],
    ["activatorvip.copy", "activatorvip", "Ativador VIP", "Copiar ativação VIP", "[data-jc-vip-copy-activation]", "action"],
    ["activatorvip.generate_download", "activatorvip", "Ativador VIP", "Gerar código download VIP", "[data-jc-vip-download-generate]", "action"],
    ["activatorvip.copy_download", "activatorvip", "Ativador VIP", "Copiar código download VIP", "[data-jc-vip-copy]", "action"],
    ["activators.mass.open", "activators_mass", "Operações em Massa", "Abrir Operações em Massa", "#btn_digits_mass", "entry"],
    ["activators.mass.config", "activators_mass", "Operações em Massa", "GERAR ZIP (CONFIG em massa)", "[data-jc-batch='config'],#jc_config_bulk_generate", "action"],
    ["activators.mass.11", "activators_mass", "Operações em Massa", "11 dígitos em massa", "[data-jc-batch='11']", "action"],
    ["activators.mass.16", "activators_mass", "Operações em Massa", "16 dígitos em massa", "[data-jc-batch='16']", "action"],
    ["activators.mass.vip", "activators_mass", "Operações em Massa", "VIP em massa", "[data-jc-batch='vip']", "action"],
    [
      "package.btv.open",
      "packages",
      "Pacote de APK",
      "BTV APK",
      "#btn_pacote_gerar",
      "entry",
    ],
    [
      "package.btv.generate",
      "packages",
      "Pacote de APK",
      "BTV gerar códigos",
      "#btn_pacote_btv_gerar_codigo",
      "action",
    ],
    [
      "package.btv.copy",
      "packages",
      "Pacote de APK",
      "BTV copiar código",
      "#btn_pacote_btv_copiar_codigo",
      "action",
    ],
    [
      "package.btv.access",
      "packages",
      "Pacote de APK",
      "BTV acesse aqui",
      "#btn_pacote_btv_acessar",
      "link",
    ],
    [
      "package.stv.open",
      "packages",
      "Pacote de APK",
      "STV APK",
      "#btn_pacote_stv",
      "entry",
    ],
    [
      "package.stv.generate",
      "packages",
      "Pacote de APK",
      "STV gerar códigos",
      "#btn_pacote_stv_gerar_codigo",
      "action",
    ],
    [
      "package.stv.copy",
      "packages",
      "Pacote de APK",
      "STV copiar código",
      "#btn_pacote_stv_copiar_codigo",
      "action",
    ],
    [
      "package.stv.access",
      "packages",
      "Pacote de APK",
      "STV acesse aqui",
      "#btn_pacote_stv_acessar",
      "link",
    ],
    [
      "package.xplus.open",
      "packages",
      "Pacote de APK",
      "XPLUS APK",
      "#btn_pacote_xplus",
      "entry",
    ],
    [
      "package.xplus.generate",
      "packages",
      "Pacote de APK",
      "XPLUS gerar códigos",
      "#btn_pacote_xplus_gerar_codigo",
      "action",
    ],
    [
      "package.xplus.copy",
      "packages",
      "Pacote de APK",
      "XPLUS copiar código",
      "#btn_pacote_xplus_copiar_codigo",
      "action",
    ],
    [
      "package.xplus.access",
      "packages",
      "Pacote de APK",
      "XPLUS acesse aqui",
      "#btn_pacote_xplus_acessar",
      "link",
    ],
    [
      "package.eaigo.open",
      "packages",
      "Pacote de APK",
      "EAIGO APK",
      "#btn_pacote_xplus_novo",
      "entry",
    ],
    [
      "package.eaigo.generate",
      "packages",
      "Pacote de APK",
      "EAIGO gerar códigos",
      "#btn_pacote_eaigo_gerar_codigo",
      "action",
    ],
    [
      "package.eaigo.copy",
      "packages",
      "Pacote de APK",
      "EAIGO copiar código",
      "#btn_pacote_eaigo_copiar_codigo",
      "action",
    ],
    [
      "package.eaigo.access",
      "packages",
      "Pacote de APK",
      "EAIGO acesse aqui",
      "#btn_pacote_eaigo_acessar",
      "link",
    ],
  ].map((x, i) => ({
    id: x[0],
    group_id: x[1],
    group_name: x[2],
    name: x[3],
    selector: x[4],
    action_kind: x[5],
    sort_order: i,
  }));


  // Regra visual e operacional dos clientes por créditos.
  // Somente estas ações podem consumir créditos no painel do cliente.
  const CREDIT_CHARGE_ACTIONS = Object.freeze({
    "activator11.generate": { order: 10, group: "ATIVADORES", label: "Gerar ativação de 11 dígitos", icon: "11" },
    "activator16.generate": { order: 20, group: "ATIVADORES", label: "Gerar ativação de 16 dígitos", icon: "16" },
    "config.access": { order: 30, group: "CONFIG", label: "Acesse Aqui — baixar .config", icon: "↓" },
    "config.generate_codes": { order: 40, group: "CONFIG", label: "Gerar código de download CONFIG", icon: "#" },
    "package.btv.generate": { order: 50, group: "BTV", label: "Gerar código BTV", icon: "B" },
    "package.btv.access": { order: 60, group: "BTV", label: "Acesse Aqui BTV", icon: "↗" },
    "package.stv.generate": { order: 70, group: "STV", label: "Gerar código STV", icon: "S" },
    "package.stv.access": { order: 80, group: "STV", label: "Acesse Aqui STV", icon: "↗" },
    "package.xplus.generate": { order: 90, group: "XPLUS", label: "Gerar código XPLUS", icon: "X" },
    "package.xplus.access": { order: 100, group: "XPLUS", label: "Acesse Aqui XPLUS", icon: "↗" },
    "package.eaigo.generate": { order: 110, group: "EAIGO", label: "Gerar código EAIGO", icon: "E" },
    "package.eaigo.access": { order: 120, group: "EAIGO", label: "Acesse Aqui EAIGO", icon: "↗" },
  });

  function dynamicCreditEligible(f) {
    if (!f) return false;
    const id = String(f.id || "");
    const kind = String(f.action_kind || "");
    const text = (id + " " + String(f.name || "")).toLowerCase();
    if (id.startsWith("activator11.") || id.startsWith("activator16.")) {
      return id === "activator11.generate" || id === "activator16.generate";
    }
    if (Boolean(f.credit_eligible)) return true;
    if (["link", "download"].includes(kind) && (/\.access$|\.download$|acesse|baixar|download/.test(text))) return true;
    return kind === "action" && /(generate|gerar).*(code|codigo|código|download)|generate_download|generate_codes/i.test(text);
  }

  function creditActionDefinition(functionId, f = null) {
    const fixed = CREDIT_CHARGE_ACTIONS[String(functionId || "")];
    if (fixed) return fixed;
    if (!dynamicCreditEligible(f)) return null;
    const id = String(f.id || functionId || "");
    const group = String(f.group_name || f.group_id || "OUTRAS").toUpperCase();
    const action = String(f.action_kind || "");
    return {
      order: Number(f.sort_order || 9999),
      group,
      label: f.name || id,
      icon: action === "link" || action === "download" ? "↗" : "#",
    };
  }

  function effectiveCreditCost(f) {
    if (!f || !creditActionDefinition(f.id, f)) return 0;
    const mode = String(f.credit_mode || "").toLowerCase();
    const configured = Number(f.credit_cost || 0);
    // O ADM pode reconfigurar qualquer ação no futuro: grátis, por créditos
    // ou totalmente desativada. Nunca existe custo mínimo escondido no HTML.
    return mode === "credits" && Number.isFinite(configured) && configured > 0
      ? Math.max(1, configured)
      : 0;
  }

  function isCreditChargeAction(f) {
    return effectiveCreditCost(f) > 0;
  }

  function previewStorageKey(token) {
    return "jc_admin_preview_" + token;
  }
  function readAdminPreview() {
    const token = new URLSearchParams(location.search).get("jc_admin_preview");
    if (!token) return null;
    try {
      const key = previewStorageKey(token);
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error("Pré-teste não encontrado.");
      const payload = JSON.parse(raw);
      localStorage.removeItem(key);
      if (!payload?.access || Number(payload.expiresAt || 0) < Date.now()) throw new Error("O pré-teste expirou. Volte ao painel e gere outro.");
      return payload.access;
    } catch (error) {
      console.warn(error);
      return { error: error.message || "Pré-teste inválido." };
    }
  }

  function msg(text, ok = false) {
    const el = $("login_msg");
    if (el) {
      el.style.color = ok ? "#1dff95" : "#ff626f";
      el.textContent = text;
    }
  }
  async function maintenanceLock(id){
    if(!A?.client)return null;
    try{
      let {data,error}=await A.client.rpc("get_panel_button_statuses");
      if(error){
        const fallback=await A.client.rpc("jc_general_maintenance_status");
        data=fallback.data;error=fallback.error;
      }
      if(error)throw error;
      const rows=Array.isArray(data)?data:(Array.isArray(data?.buttons)?data.buttons:[]);
      const row=rows.find((item)=>String(item?.id||item?.function_id||"")===id && String(item?.status||item?.panel_status||"active")==="maintenance");
      return row?{
        name:String(row.name||row.function_name||"Gerenciador JC-APK TV"),
        message:String(row.message||row.maintenance_message||"Nosso painel está temporariamente em manutenção programada. Tente novamente mais tarde.")
      }:null;
    }catch(error){
      console.warn("JC-APK: estado geral de manutenção indisponível.",error);
      return null;
    }
  }
  function billingDateOnly(value){return String(value||"").slice(0,10);}
  function billingToday(){
    try{
      const parts=new Intl.DateTimeFormat("en-CA",{timeZone:state.billing?.timezone||"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
      const map=Object.fromEntries(parts.map((part)=>[part.type,part.value]));
      return `${map.year}-${map.month}-${map.day}`;
    }catch(error){
      const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
    }
  }
  function addBillingDays(value,amount){
    const source=billingDateOnly(value);if(!source)return "";
    const [year,month,day]=source.split("-").map(Number),date=new Date(Date.UTC(year,month-1,day));
    date.setUTCDate(date.getUTCDate()+Number(amount||0));return date.toISOString().slice(0,10);
  }
  function billingDaysBetween(from,to){
    const a=billingDateOnly(from),b=billingDateOnly(to);if(!a||!b)return 0;
    const [ay,am,ad]=a.split("-").map(Number),[by,bm,bd]=b.split("-").map(Number);
    return Math.round((Date.UTC(by,bm-1,bd)-Date.UTC(ay,am-1,ad))/86400000);
  }
  function billingRules(){
    return {
      reminderDays:Math.max(0,Math.min(30,Number(state.billing?.reminder_days_before??5)||0)),
      graceDays:Math.max(0,Math.min(30,Number(state.billing?.grace_days_after??5)||0)),
      panelEnabled:state.billing?.panel_notice_enabled!==false,
    };
  }
  function billingDates(profile){
    const rules=billingRules(),due=billingDateOnly(profile?.expires_at),savedLimit=billingDateOnly(profile?.grace_until);
    const limit=savedLimit||(due?addBillingDays(due,rules.graceDays):"");
    return {due,limit,reminder:due?addBillingDays(due,-rules.reminderDays):"",block:limit?addBillingDays(limit,1):"",rules};
  }
  function billingStage(profile,today=billingToday()){
    const type=profile?.account_type||(profile?.role==="test"?"test":Number(profile?.plan_months)===0?"one_time":"monthly");
    if(type!=="monthly")return "ok";
    const start=billingDateOnly(profile?.starts_at);if(start&&start>today)return "ok";
    const dates=billingDates(profile);if(!dates.due)return profile?.status==="blocked"?"blocked":"ok";
    if(profile?.status==="blocked"&&today>dates.limit)return "blocked";
    if(today<dates.reminder)return "ok";
    if(today<dates.due)return "reminder";
    if(today===dates.due)return "due";
    if(!dates.limit||today<=dates.limit)return "grace";
    return "blocked";
  }
  function billingFormatDate(value){
    const source=billingDateOnly(value);if(!source)return "não definida";
    const [year,month,day]=source.split("-");return `${day}/${month}/${year}`;
  }
  function billingVariables(profile,today=billingToday()){
    const dates=billingDates(profile),remaining=dates.limit?Math.max(0,billingDaysBetween(today,dates.limit)):0;
    return {nome:profile?.full_name||profile?.username||"cliente",usuario:profile?.username||"",plano:profile?.plan_name||"",vencimento:billingFormatDate(dates.due),limite_pagamento:billingFormatDate(dates.limit),data_bloqueio:billingFormatDate(dates.block),dias_restantes:String(remaining),suporte:state.billing?.support_phone||state.general?.support_phone||"o suporte",empresa:state.billing?.company_name||"JC-APK TV"};
  }
  function applyBillingVariables(template,profile,today=billingToday()){
    const vars=billingVariables(profile,today);
    return String(template||"").replace(/\{(nome|usuario|plano|vencimento|limite_pagamento|data_bloqueio|dias_restantes|suporte|empresa)\}/g,(_,key)=>vars[key]??"").trim();
  }
  function billingView(profile,today=billingToday()){
    const stage=billingStage(profile,today),dates=billingDates(profile);
    const titles={reminder:"Lembrete de mensalidade",due:"Sua mensalidade vence hoje",grace:"Pagamento pendente — painel ainda liberado",blocked:"Acesso temporariamente bloqueado",ok:"Cobrança em dia"};
    const defaults={
      reminder:"Olá, {nome}. Sua mensalidade vence em {vencimento}. O pagamento pode ser realizado até {limite_pagamento}, sem bloqueio antes desse prazo.",
      grace:"Sua mensalidade venceu em {vencimento}, mas seu painel continua liberado durante o prazo de pagamento. Regularize até {limite_pagamento}. O bloqueio ocorrerá somente em {data_bloqueio}.",
      blocked:"Seu acesso foi bloqueado temporariamente porque o prazo de pagamento terminou em {limite_pagamento}. Após o pagamento, envie o comprovante para {suporte}."
    };
    const key=stage==="blocked"?"panel_blocked_message":stage==="grace"||stage==="due"?"panel_grace_message":"panel_reminder_message";
    const fallback=stage==="blocked"?defaults.blocked:stage==="grace"||stage==="due"?defaults.grace:defaults.reminder;
    return {stage,title:titles[stage]||titles.ok,message:applyBillingVariables(state.billing?.[key]||fallback,profile,today),dates};
  }
  async function loadBillingSettings(access){
    const embedded=access?.billing||access?.general?.billing;
    if(embedded&&typeof embedded==="object"&&Object.keys(embedded).length){state.billing=embedded;access.billing=embedded;return embedded;}
    const profile=access?.profile,type=profile?.account_type||(profile?.role==="test"?"test":Number(profile?.plan_months)===0?"one_time":"monthly");
    if(type!=="monthly")return state.billing;
    try{
      let result=await A.client.rpc("jc_get_my_billing_settings");
      if(result.error)result=await A.client.from("app_settings").select("value").eq("key","billing").maybeSingle();
      if(result.error)throw result.error;
      const value=result.data?.value||result.data||{};
      if(value&&typeof value==="object")state.billing=value;
    }catch(error){console.warn("Avisos de cobrança:",error?.message||error);}
    access.billing=state.billing;
    return state.billing;
  }
  function blockedAccessMessage(profile){
    const view=billingView(profile);
    if(profile?.status==="blocked"&&view.stage!=="blocked")return `Seu acesso foi bloqueado pelo administrador. Fale com o suporte: ${billingVariables(profile).suporte}.`;
    if(view.stage==="blocked")return view.message||"Seu acesso está temporariamente bloqueado. Fale com o administrador.";
    return "Seu acesso venceu. Fale com o administrador.";
  }
  function expired(p) {
    if (p.status !== "active") return true;
    const type=p.account_type || (p.role==="test"?"test":Number(p.plan_months)===0?"one_time":"monthly");
    if(type==="test" && p.trial_expires_at) return new Date(p.trial_expires_at) < new Date();
    if(type==="monthly")return billingStage(p)==="blocked";
    return false;
  }
  function store() {
    try {
      sessionStorage.setItem(
        "jc_apk_access",
        JSON.stringify({
          profile: state.profile,
          mode: state.mode,
          permissions: state.permissions,
          general: state.general,
          billing: state.billing,
          demo: state.demo,
          download_codes: state.downloadCodes,
          attendant: state.access?.attendant || {},
        }),
      );
      sessionStorage.setItem(
        "jc_apk_tipo_usuario",
        state.mode === "test" ? "teste" : state.mode,
      );
      sessionStorage.setItem(
        "jc_apk_nome_usuario",
        state.profile?.full_name || "TESTE",
      );
    } catch (e) {}
  }
  function shouldRequireAvatar() {
    if(state.access?.admin_preview) return false;
    if(!["client","test"].includes(state.mode)) return false;
    return state.profile?.avatar_required!==false && !String(state.profile?.avatar_data||"").trim();
  }
  function activationDemoCode(type) {
    const length = type === "11" ? 11 : 16;
    let output = "";
    for (let i = 0; i < length; i += 1) {
      output += (i === 0 || i === length - 1 || i % 4 === 0)
        ? String(Math.floor(Math.random() * 10))
        : "X";
    }
    return output;
  }
  function activationCodeElement(type) {
    return $(type === "11" ? "download_code_11" : "download_code_16");
  }
  function setActivationGeneratorStatus(type, message, ok) {
    if (type === "11") {
      const bar = $("download_status_11");
      const icon = $("download_status_icon_11");
      const text = $("download_status_msg_11");
      if (bar) {
        bar.classList.add("visible");
        bar.classList.remove("success", "error");
        bar.classList.add(ok === false ? "error" : "success");
      }
      if (icon) icon.textContent = ok === false ? "⚠️" : "✅";
      if (text) text.textContent = message;
      return;
    }
    const bar = $("status_bar");
    const icon = $("status_icon");
    const text = $("status_msg");
    if (bar) {
      bar.classList.add("visible");
      bar.classList.remove("success", "error");
      bar.classList.add(ok === false ? "error" : "success");
    }
    if (icon) icon.textContent = ok === false ? "⚠️" : "✅";
    if (text) text.textContent = message;
  }
  function setActivationCodeValue(type, value) {
    const element = activationCodeElement(type);
    if (!element) return;
    element.textContent = String(value || "");
    element.dataset.codigoAtual = String(value || "");
  }
  function closeActivationClientPicker(value) {
    const modal = $("jc_activation_client_picker");
    if (modal) modal.classList.remove("show");
    const resolver = window.__jcActivationClientResolver;
    window.__jcActivationClientResolver = null;
    if (typeof resolver === "function") resolver(value || null);
  }
  function ensureActivationClientPicker() {
    let modal = $("jc_activation_client_picker");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "jc_activation_client_picker";
    modal.innerHTML = `
      <div class="jc-activation-client-box" role="dialog" aria-modal="true" aria-labelledby="jc_activation_client_title">
        <div class="jc-activation-client-head">
          <div><h3 id="jc_activation_client_title">Escolha o responsável pelo código</h3><p>Venda direta usa seu cadastro. Para revenda, escolha o cliente responsável pelo suporte.</p></div>
          <button type="button" id="jc_activation_client_close" aria-label="Fechar">×</button>
        </div>
        <input id="jc_activation_client_search" type="search" placeholder="Buscar venda direta, nome, usuário ou e-mail">
        <div id="jc_activation_client_list" class="jc-activation-client-list"></div>
      </div>`;
    document.body.appendChild(modal);
    if (!$("jc_activation_client_styles")) {
      const style = document.createElement("style");
      style.id = "jc_activation_client_styles";
      style.textContent = `#jc_activation_client_picker{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(8px)}#jc_activation_client_picker.show{display:flex}.jc-activation-client-box{width:min(660px,96vw);max-height:86vh;overflow:auto;border-radius:24px;padding:20px;background:linear-gradient(145deg,#071522,#02070d);border:1px solid rgba(67,177,255,.35);box-shadow:0 28px 90px rgba(0,0,0,.65);color:#fff;font-family:Arial,sans-serif}.jc-activation-client-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.jc-activation-client-head h3{margin:0;font-size:23px}.jc-activation-client-head p{margin:6px 0 0;color:#9db2bd}.jc-activation-client-head button{width:42px;height:42px;border:0;border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-size:24px;cursor:pointer}#jc_activation_client_search{width:100%;box-sizing:border-box;margin:16px 0 12px;padding:13px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.16);background:#07101b;color:#fff;font-size:15px}.jc-activation-client-list{display:grid;gap:9px}.jc-activation-client-option{display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:13px 14px;border-radius:14px;border:1px solid rgba(62,175,255,.28);background:rgba(21,83,153,.34);color:#fff;text-align:left;cursor:pointer}.jc-activation-client-option:hover{background:rgba(31,111,205,.5)}.jc-activation-client-option.jc-direct-sale{border-color:rgba(54,225,141,.62);background:linear-gradient(135deg,rgba(18,125,74,.52),rgba(13,74,117,.46));box-shadow:inset 0 0 0 1px rgba(54,225,141,.12)}.jc-activation-client-option.jc-direct-sale:hover{background:linear-gradient(135deg,rgba(24,159,92,.62),rgba(20,99,151,.56))}.jc-activation-client-option strong{font-size:15px}.jc-activation-client-option span,.jc-activation-client-loading{font-size:12px;color:#a9bdc9}.jc-activation-client-option.jc-direct-sale span{color:#bfffe0}.jc-activation-client-loading{padding:18px;text-align:center}`;
      document.head.appendChild(style);
    }
    $("jc_activation_client_close").onclick = () => closeActivationClientPicker(null);
    modal.onclick = (event) => { if (event.target === modal) closeActivationClientPicker(null); };
    return modal;
  }
  async function chooseActivationClient() {
    const modal = ensureActivationClientPicker();
    const list = $("jc_activation_client_list");
    const search = $("jc_activation_client_search");
    list.innerHTML = '<div class="jc-activation-client-loading">Carregando clientes...</div>';
    search.value = "";
    modal.classList.add("show");

    const result = await A.client
      .from("profiles")
      .select("id,username,full_name,email,whatsapp,whatsapp2,whatsapp3,role,status,account_type")
      .eq("status", "active")
      .order("full_name", { ascending: true });
    if (result.error) {
      modal.classList.remove("show");
      throw result.error;
    }

    const clients = (result.data || []).filter((item) =>
      item && item.role !== "admin" && item.role !== "test" && item.account_type !== "test"
    );

    const directSale = {
      id: state.profile?.id || "",
      username: state.profile?.username || "admin",
      full_name: "Venda direta JC APK TV",
      email: state.profile?.email || "",
      whatsapp: state.profile?.whatsapp || "",
      whatsapp2: state.profile?.whatsapp2 || "",
      whatsapp3: state.profile?.whatsapp3 || "",
      role: "admin",
      account_type: "direct_sale",
      direct_sale: true,
    };

    if (!directSale.id) {
      modal.classList.remove("show");
      throw new Error("Sua sessão administrativa não possui identificação.");
    }

    return await new Promise((resolve) => {
      window.__jcActivationClientResolver = resolve;
      const render = () => {
        const term = String(search.value || "").trim().toLowerCase();
        const matches = (item) =>
          [item.full_name, item.username, item.email, item.direct_sale ? "venda direta meu suporte jc apk tv" : ""]
            .join(" ")
            .toLowerCase()
            .includes(term);

        const filteredClients = clients.filter(matches);
        const showDirect = matches(directSale);

        list.innerHTML = "";

        if (showDirect) {
          const directButton = document.createElement("button");
          directButton.type = "button";
          directButton.className = "jc-activation-client-option jc-direct-sale";
          directButton.innerHTML = `<strong>🏠 Venda direta JC APK TV — Meu suporte</strong><span>Usa o WhatsApp principal do seu cadastro e não desconta créditos de revendedor.</span>`;
          directButton.onclick = () => closeActivationClientPicker(directSale);
          list.appendChild(directButton);
        }

        filteredClients.forEach((item) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "jc-activation-client-option";
          button.innerHTML = `<strong>${escapeHtml(item.full_name || item.username || "Cliente")}</strong><span>@${escapeHtml(item.username || "")} · ${escapeHtml(item.email || "")}</span>`;
          button.onclick = () => closeActivationClientPicker({ ...item, direct_sale: false });
          list.appendChild(button);
        });

        if (!showDirect && !filteredClients.length) {
          list.innerHTML = '<div class="jc-activation-client-loading">Nenhum responsável encontrado.</div>';
        }
      };

      search.oninput = render;
      render();
      setTimeout(() => { try { search.focus({preventScroll:true}); } catch (_) { search.focus(); } }, 80);
    });
  }
  function activationErrorMessage(error) {
    const raw = String(error?.message || error || "").trim();
    const messages = {
      AUTHENTICATED_SESSION_REQUIRED: "Sua sessão não foi reconhecida. Saia do painel, entre novamente e tente outra vez.",
      INVALID_SESSION: "Sua sessão expirou. Saia do painel, entre novamente e tente outra vez.",
      CALLER_NOT_ACTIVE: "Este acesso não está ativo.",
      TEST_USER_CANNOT_CREATE_REAL_CODE: "O usuário de teste gera somente código demonstrativo.",
      INVALID_CODE_TYPE: "Tipo de código inválido.",
      CLIENT_REQUIRED: "Cliente não identificado.",
      CLIENT_CAN_ONLY_CREATE_FOR_SELF: "O cliente só pode gerar código para o próprio cadastro.",
      CLIENT_NOT_ACTIVE: "O cadastro do cliente não está ativo.",
      REAL_CLIENT_REQUIRED: "Selecione um cliente real e ativo.",
      DIRECT_SALE_ADMIN_ONLY: "A opção Venda direta JC APK TV está disponível somente para o administrador.",
      CLIENT_ACCESS_EXPIRED: "O acesso deste cliente está vencido.",
      CLIENT_FUNCTION_NOT_ALLOWED: "Esta função não está liberada para este cliente.",
      SERVER_SECRETS_NOT_CONFIGURED: "A função do servidor ainda não está configurada corretamente.",
      SERVER_DID_NOT_RETURN_CODE: "O servidor não devolveu o código. Tente novamente uma vez.",
      SERVER_REQUEST_FAILED: "Não foi possível concluir a solicitação no servidor.",
    };
    if (messages[raw]) return messages[raw];
    if (/Failed to send a request/i.test(raw)) return "Não foi possível alcançar o servidor. Verifique a internet e tente novamente.";
    if (/FunctionsHttpError|non-2xx/i.test(raw)) return "O servidor recusou a geração. Confira a permissão do cliente e a sessão do painel.";
    return raw || "Não foi possível gerar o código no servidor.";
  }
  function activationButton(type) {
    return $(type === "11" ? "btn_gerar_codigo_11" : "btn_gerar_codigo_16");
  }
  function setActivationButtonBusy(type, busy) {
    const button = activationButton(type);
    if (!button) return;
    if (!button.dataset.jcOriginalHtml) button.dataset.jcOriginalHtml = button.innerHTML;
    button.disabled = Boolean(busy);
    button.classList.toggle("loading", Boolean(busy));
    button.setAttribute("aria-busy", busy ? "true" : "false");
    button.innerHTML = busy
      ? `<span>⏳ GERANDO CÓDIGO REAL DE ${type} DÍGITOS...</span>`
      : button.dataset.jcOriginalHtml;
  }
  async function createServerActivationCode(type, options = {}) {
    type = String(type || "");
    if (!["11", "16"].includes(type)) return false;

    if (state.activationPending[type]) {
      setActivationGeneratorStatus(type, "A geração já está em andamento. Aguarde a resposta do servidor.", true);
      return false;
    }

    if (state.mode === "test" || state.mode === "preview") {
      setActivationCodeValue(type, activationDemoCode(type));
      setActivationGeneratorStatus(type, "Código DEMO gerado. Ele contém X e nunca será válido.", true);
      return false;
    }

    state.activationPending[type] = true;
    setActivationButtonBusy(type, true);
    setActivationCodeValue(type, "AGUARDE...");
    const codeElement = activationCodeElement(type);
    if (codeElement) codeElement.dataset.codigoAtual = "";
    setActivationGeneratorStatus(type, "Enviando a solicitação ao servidor. Não clique novamente.", true);

    try {
      let clientId = state.profile?.id || "";
      let clientLabel = state.profile?.full_name || state.profile?.username || "cliente";
      let clientWhatsapp = state.profile?.whatsapp || state.profile?.whatsapp2 || state.profile?.whatsapp3 || "";
      let selectedClient = state.profile || null;
      let directSale = false;

      if (options.client && state.mode !== "admin") {
        const selected = options.client;
        selectedClient = selected;
        directSale = selected.direct_sale === true;
        clientWhatsapp = selected.whatsapp || selected.whatsapp2 || selected.whatsapp3 || "";
        clientId = selected.id;
        clientLabel = selected.full_name || selected.username || "cliente";
      } else if (state.mode === "admin") {
        const selected = options.client || await chooseActivationClient();
        if (!selected) {
          setActivationCodeValue(type, "CANCELADO");
          setActivationGeneratorStatus(type, "Geração cancelada.", false);
          return false;
        }

        directSale = selected.direct_sale === true;
        selectedClient = selected;
        clientWhatsapp = selected.whatsapp || selected.whatsapp2 || selected.whatsapp3 || "";
        clientId = selected.id;
        clientLabel = directSale
          ? "Venda direta JC APK TV"
          : (selected.full_name || selected.username || "cliente");
      }

      if (!clientId) throw new Error("CLIENT_REQUIRED");

      const response = await A.client.functions.invoke("jc-activate", {
        body: {
          action: "create_code",
          code_type: type,
          client_id: clientId,
          direct_sale: directSale,
          activation_origin: String(options.origin || (type === "11" ? "11-Ativador" : "16-Ativador normal")),
          operation_scope: String(options.operationScope || "single"),
          required_permission_id: String(options.requiredPermissionId || (type === "11" ? "activator11.generate" : "activator16.generate")),
        },
      });

      if (response.error) {
        let serverError = "";
        try {
          const context = response.error.context;
          if (context && typeof context.json === "function") {
            const body = await context.json();
            serverError = body?.error || "";
          }
        } catch (_) {}
        throw new Error(serverError || response.error.message || "SERVER_REQUEST_FAILED");
      }
      if (!response.data?.ok || !response.data?.code) {
        throw new Error(response.data?.error || "SERVER_DID_NOT_RETURN_CODE");
      }

      const code = String(response.data.code).replace(/\D/g, "");
      if (code.length !== Number(type)) throw new Error("O servidor devolveu um código com tamanho incorreto.");

      setActivationCodeValue(type, code);
      setActivationGeneratorStatus(
        type,
        directSale
          ? `Código real de ${type} dígitos criado como venda direta JC APK TV.`
          : `Código real de ${type} dígitos criado para ${clientLabel}.`,
        true
      );
      const generated = {
        ok: true,
        type,
        code,
        client_id: clientId,
        client_name: clientLabel,
        whatsapp: clientWhatsapp,
        direct_sale: directSale,
        client: selectedClient,
        generated_at: new Date().toISOString(),
        activation_deadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
        origin: String(options.origin || (type === "11" ? "11-Ativador" : "16-Ativador normal"))
      };
      window.JC_LAST_ACTIVATION = generated;
      document.dispatchEvent(new CustomEvent("jc:activation-generated", { detail: generated }));
      return generated;
    } catch (error) {
      console.error("Falha ao gerar código real:", error);
      setActivationCodeValue(type, "NÃO GERADO");
      const failedElement = activationCodeElement(type);
      if (failedElement) failedElement.dataset.codigoAtual = "";
      setActivationGeneratorStatus(type, activationErrorMessage(error), false);
      return false;
    } finally {
      state.activationPending[type] = false;
      setActivationButtonBusy(type, false);
    }
  }
  function installServerActivationGenerators() {
    // Um único caminho oficial para a geração real. O runtime chama esta API
    // nas contas comuns; nas contas por créditos, a mesma função é chamada
    // diretamente depois da confirmação e do débito, sem repetir o clique.
    window.JC_ACTIVATION_CODES = {
      generate: createServerActivationCode,
      chooseClient: chooseActivationClient,
      mode: () => state.mode,
      profile: () => state.profile,
      access: () => state.access,
      functions: () => state.functions
    };
  }
  async function loadClientDownloadCodes() {
    // Correção pontual do botão “VERSÕES COD. DOWNLOAD”.
    // Para clientes autorizados, busca a lista real em uma RPC protegida caso
    // get_my_access não a tenha devolvido. ADM, teste e demais funções não mudam.
    if (
      state.mode !== "client" ||
      !Boolean(state.permissions?.["config.download_codes"])
    ) return;

    try {
      const { data, error } = await A.client.rpc("get_my_download_codes");
      if (error) throw error;
      if (Array.isArray(data)) {
        state.downloadCodes = data;
        if (state.access && typeof state.access === "object") {
          state.access.download_codes = data;
        }
      }
    } catch (error) {
      // Mantém o acesso funcionando mesmo antes de o SQL ser executado.
      console.warn("Versões/códigos de download:", error?.message || error);
    }
  }
  async function completeGrant() {
    await loadClientDownloadCodes();
    store();
    installServerActivationGenerators();
    applyPermissions();
    renderDownloadCodePopup();
    if (state.mode === "test") {
      installTestGuard();
      scrubTestLinks();
    }
    window.JC_GENERATOR_CONTEXT={mode:state.mode,profile:state.profile,functions:state.functions,permissions:state.permissions,billing:state.billing};
    window.JC_DEMO_RUNTIME={show:demoDialog,showServer:showDemoServer};
    injectClientBar();
    document.body.classList.add("jc-panel-access-ready");
    document.dispatchEvent(new CustomEvent("jc:access-ready",{detail:window.JC_GENERATOR_CONTEXT}));
    if(state.passwordChangeRequired&&state.mode==="client")setTimeout(()=>showPasswordModal(true),80);
    if (typeof window.liberarSistemaAposEspera === "function")
      window.liberarSistemaAposEspera(state.mode === "test" ? "teste" : state.mode);
    else {
      const lock = $("tokenLock");
      if (lock) lock.style.display = "none";
    }
  }
  function avatarInitials(value){
    const parts=String(value||"").trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0]||"?")+(parts.length>1?(parts[parts.length-1]?.[0]||""):"")).toUpperCase();
  }
  function profileAvatarMarkup(){
    const name=state.profile?.full_name||state.profile?.username||"Cliente";
    const data=String(state.profile?.avatar_data||"");
    if(data) return `<img src="${escapeHtml(data)}" alt="Foto de ${escapeHtml(name)}">`;
    if(state.mode==="admin") return `<img src="../assets/avatar-admin.webp" alt="Avatar administrativo JC-APK">`;
    return escapeHtml(avatarInitials(name));
  }
  async function compressProfileAvatar(file){
    if(!file) return "";
    if(!String(file.type||"").startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
    if(file.size>12*1024*1024) throw new Error("A imagem é muito grande. Escolha uma foto com até 12 MB.");
    const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error("Não foi possível ler a foto."));r.readAsDataURL(file);});
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error("Não foi possível abrir a foto."));i.src=src;});
    const size=320,canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;const ctx=canvas.getContext("2d");
    const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;
    ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
    let out=canvas.toDataURL("image/jpeg",.78);
    if(out.length>180000) out=canvas.toDataURL("image/jpeg",.62);
    if(out.length>180000) throw new Error("Não foi possível compactar a foto. Escolha outra imagem.");
    return out;
  }
  function showAvatarGate(){
    injectStyles();
    let m=$("jc_avatar_gate");
    if(!m){
      m=document.createElement("div");m.id="jc_avatar_gate";m.className="jc-avatar-gate show";
      m.innerHTML=`<div class="jc-avatar-box"><div class="jc-avatar-preview" id="jc_avatar_preview">${profileAvatarMarkup()}</div><h2>Complete sua identificação para continuar</h2><p>Para tornar seu acesso mais seguro e facilitar a identificação do seu cadastro, precisamos que você adicione uma foto de perfil.</p><p>Depois que a imagem for salva, seu acesso será liberado automaticamente e essa solicitação não aparecerá novamente.</p><p class="jc-avatar-note">A foto será usada somente como avatar de identificação dentro do painel.</p><div class="jc-avatar-buttons"><button id="jc_avatar_camera" type="button">📷 Abrir câmera</button><button id="jc_avatar_file" type="button">🖼️ Escolher foto do aparelho</button></div><input id="jc_avatar_camera_input" type="file" accept="image/*" capture="user" hidden><input id="jc_avatar_file_input" type="file" accept="image/*" hidden><button class="jc-avatar-save" id="jc_avatar_save" type="button" disabled>✅ Salvar e liberar acesso</button><div class="jc-avatar-msg" id="jc_avatar_msg"></div></div>`;
      document.body.appendChild(m);
      const camera=$("jc_avatar_camera_input"),fileInput=$("jc_avatar_file_input"),save=$("jc_avatar_save"),preview=$("jc_avatar_preview"),message=$("jc_avatar_msg");
      let prepared="";
      const choose=async(file)=>{try{message.textContent="Preparando foto...";prepared=await compressProfileAvatar(file);preview.innerHTML=`<img src="${escapeHtml(prepared)}" alt="Prévia da foto">`;save.disabled=false;message.textContent="Foto pronta para salvar.";}catch(e){prepared="";save.disabled=true;message.textContent=e.message||"Não foi possível preparar a foto.";}};
      $("jc_avatar_camera").onclick=()=>camera.click();
      $("jc_avatar_file").onclick=()=>fileInput.click();
      camera.onchange=(e)=>choose(e.target.files?.[0]);
      fileInput.onchange=(e)=>choose(e.target.files?.[0]);
      save.onclick=async()=>{if(!prepared)return;save.disabled=true;message.textContent="Salvando foto...";try{let result;if(state.mode==="test"){result=await A.client.rpc("set_test_avatar_by_username",{p_identifier:state.profile.username,p_password:"teste",p_avatar_data:prepared});}else{result=await A.client.rpc("set_my_avatar",{p_avatar_data:prepared});}if(result.error)throw result.error;state.profile.avatar_data=prepared;state.profile.avatar_updated_at=new Date().toISOString();m.classList.remove("show");completeGrant();}catch(e){save.disabled=false;message.textContent=e.message||"Não foi possível salvar a foto.";}};
    }else m.classList.add("show");
  }
  function grant(mode, access) {
    state.mode = mode;
    state.access = access || {};
    state.profile = access?.profile || {
      username: "teste",
      full_name: "USUÁRIO TESTE",
      role: "test",
      status: "active",
    };
    state.permissions = access?.permissions || {};
    const receivedFunctions = Array.isArray(access?.functions) ? access.functions : [];
    const mergedFunctions = receivedFunctions.length ? [...receivedFunctions] : [...knownFallback];
    knownFallback.forEach((fallback) => {
      if (!mergedFunctions.some((item) => String(item?.id || "") === fallback.id)) mergedFunctions.push(fallback);
    });
    state.functions = mergedFunctions.map((item) =>
      String(item?.id || "") === "config.access"
        ? { ...item, selector: "#btn_config_pack", action_kind: "download" }
        : item
    );
    state.general = access?.general || {};
    state.billing = access?.billing || state.billing || {};
    state.demo = access?.demo || {};
    state.downloadCodes = Array.isArray(access?.download_codes) ? access.download_codes : [];
    loadSalesPackages().catch((e)=>console.warn("Pacotes comerciais:", e?.message || e));
    if(shouldRequireAvatar()) { showAvatarGate(); return; }
    completeGrant();
  }
  async function readPasswordChangeRequired(mode,access){
    if(mode!=="client")return false;
    if(access?.profile?.must_change_password===true)return true;
    try{
      const {data,error}=await A.client.rpc("jc_password_change_required");
      if(error)throw error;
      return data===true||data?.required===true;
    }catch(error){
      if(!/does not exist|not found|schema cache/i.test(String(error?.message||error)))console.warn("Política de senha:",error?.message||error);
      return false;
    }
  }
  async function validate() {
    const user = $("login_user")?.value.trim() || "",
      pass = $("login_pass")?.value || "";
    if (!user || !pass) {
      msg("Digite usuário/e-mail e senha.");
      return;
    }
    msg("VALIDANDO ACESSO...");
    try {
      const loginLock=await maintenanceLock("system.login.lock");
      if(loginLock)throw new Error(loginLock.message);
      // Cliente da categoria Teste usa a palavra pública "teste".
      // Este caminho não cria sessão autenticada e retorna somente o ambiente demonstrativo.
      if (pass === "teste") {
        const { data, error } = await A.client.rpc("get_test_access_by_username", {
          p_identifier: user,
          p_password: pass,
        });
        if (error) throw error;
        if (!data?.profile) throw new Error("Usuário de teste não encontrado, bloqueado ou com prazo encerrado.");
        const generatorLock=await maintenanceLock("system.generator.lock");
        if(generatorLock)throw new Error(generatorLock.message);
        msg("ABRINDO DEMONSTRAÇÃO...", true);
        grant("test", data);
        return;
      }
      await A.login(user, pass);
      const access = await A.myAccess();
      if (!access?.profile)
        throw new Error("Cadastro do usuário não encontrado.");
      await loadBillingSettings(access);
      if (expired(access.profile))
        throw new Error(blockedAccessMessage(access.profile));
      const mode = access.profile.role === "admin" ? "admin" : access.profile.role === "test" ? "test" : "client";
      if(mode!=="admin"){
        const generatorLock=await maintenanceLock("system.generator.lock");
        if(generatorLock){await A.client.auth.signOut();throw new Error(generatorLock.message);}
      }
      state.passwordChangeRequired=await readPasswordChangeRequired(mode,access);
      msg("PREPARANDO ACESSO...", true);
      grant(mode, access);
    } catch (e) {
      msg(e.message || "Usuário ou senha incorretos.");
    }
  }
  window.validarLogin = validate;
  function entryScopeAllowed(f) {
    const id = String(f?.id || "");

    // Entradas de catálogo ficam visíveis e podem abrir o submenu para todos.
    // A permissão continua sendo exigida nos botões internos que geram códigos,
    // fazem download ou executam operações reais.
    if (id === "activatorvip.open" || id === "activators.mass.open") return true;

    // O card de massa é uma única entrada. Ele aparece quando o ADM libera
    // geração de 11 e/ou 16 no card "Dígitos em Massa" da tela de Clientes.
    
    // Cada pacote é independente. Antes, BTV, STV, XPLUS e EAIGO usavam o
    // mesmo group_id "packages"; ter qualquer permissão nesse grupo fazia
    // todos os botões principais parecerem liberados.
    const packageMatch = id.match(/^package\.(btv|stv|xplus|eaigo)\.open$/);
    if (packageMatch) {
      const prefix = "package." + packageMatch[1] + ".";
      return state.functions.some(
        (x) =>
          String(x.id || "").startsWith(prefix) &&
          Boolean(state.permissions?.[x.id]),
      );
    }

    // Mantém a regra histórica para os demais grupos do projeto.
    return state.functions.some(
      (x) => x.group_id === f.group_id && Boolean(state.permissions?.[x.id]),
    );
  }

  function allowed(f) {
    if (state.mode === "admin") return true;
    // No modo teste, cada função só aparece quando “Permitir demonstração”
    // estiver habilitado no Supabase.
    if (state.mode === "test") return f.demo_enabled !== false;
    // Todo botão de entrada abre o submenu para apresentar a função.
    // Somente as ações internas dependem da permissão liberada pelo ADM.
    if (f.action_kind === "entry") return true;
    // As permissões normais são totalmente independentes do módulo Em Massa.
    // Ao liberar o Ativador 11 ou 16 no painel de Clientes, os controles
    // auxiliares da mesma versão (abrir APK, copiar e código de download)
    // acompanham a permissão principal. Isso vale igualmente para clientes
    // mensais, vitalícios e por créditos.
    const normalActivatorPermission = {
      "activator11.generate": "activator11.generate",
      "activator11.access": "activator11.generate",
      "activator11.copy": "activator11.generate",
      "activator11.generate_download": "activator11.generate",
      "activator11.copy_download": "activator11.generate",
      "activator16.generate": "activator16.generate",
      "activator16.access": "activator16.generate",
      "activator16.copy": "activator16.generate",
      "activator16.generate_download": "activator16.generate",
      "activator16.copy_download": "activator16.generate",
      "activatorvip.generate": "activatorvip.generate",
      "activatorvip.access": "activatorvip.generate",
      "activatorvip.copy": "activatorvip.generate",
      "activatorvip.generate_download": "activatorvip.generate",
      "activatorvip.copy_download": "activatorvip.generate",
      "activatorvip.reset": "activatorvip.generate",
    };
    if (normalActivatorPermission[f.id]) {
      return Boolean(state.permissions[f.id] || state.permissions[normalActivatorPermission[f.id]]);
    }

    // Somente o caminho inverso exige duas permissões: uma operação em massa
    // precisa da própria permissão em massa e da função normal correspondente.
    const massRequires = {
      "activators.mass.11": "activator11.generate",
      "activators.mass.16": "activator16.generate",
      "activators.mass.vip": "activatorvip.generate",
    };
    if (massRequires[f.id]) return Boolean(state.permissions[f.id] && state.permissions[massRequires[f.id]]);
    if (state.permissions[f.id]) return true;
    if (f.action_kind === "entry") return entryScopeAllowed(f);
    return false;
  }
  function demoCode(value) {
    const raw=String(value||"");
    if(/^33XX/i.test(raw)) return raw;
    const n=Math.max(3,raw.length-4);
    return "33XX"+"X".repeat(n);
  }
  function renderDownloadCodePopup() {
    const modal=$("jc_unitv_codes_modal");
    if(!modal) return;
    if(!state.downloadCodes.length){
      const rows=modal.querySelectorAll(".jc-unitv-test-code.jc-unitv-copy-line");rows.forEach((x)=>x.style.display="none");
      const list=modal.querySelector(".jc-unitv-code-list");if(list)list.innerHTML='<div style="padding:14px;text-align:center;color:#ffd0d7">Nenhum código liberado para este acesso.</div>';
      return;
    }
    const items=state.downloadCodes.filter((x)=>x&&x.active!==false).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
    const managers=items.filter((x)=>x.item_kind==="manager");
    const versions=items.filter((x)=>x.item_kind==="version"||x.item_kind==="other");
    const tests=items.filter((x)=>x.item_kind==="test");
    const rows=modal.querySelectorAll(".jc-unitv-test-code.jc-unitv-copy-line");
    const manager=rows[0],test=rows[rows.length-1],list=modal.querySelector(".jc-unitv-code-list");
    const codeOf=(x)=>state.mode==="test"?demoCode(x.code):String(x.code||"");
    const copyButton=(code)=>`<button type="button" class="jc-unitv-copy-btn" data-jc-action="copy-unitv-code" data-copy-code="${escapeHtml(code)}" aria-label="Copiar código ${escapeHtml(code)}">COPIAR</button>`;
    if(manager){
      const x=managers[0];
      manager.style.display=x?"":"none";
      if(x){const c=codeOf(x);manager.innerHTML=`<span>${escapeHtml(x.label)} - <span class="jc-unitv-copy-value">${escapeHtml(c)}</span></span>${copyButton(c)}`;}
    }
    if(list){
      list.innerHTML=versions.map((x)=>{const c=codeOf(x);return `<div class="jc-unitv-code-row"><strong>${escapeHtml(x.label)}</strong><span class="jc-unitv-code-actions"><span class="jc-unitv-copy-value">${escapeHtml(c)}</span>${copyButton(c)}</span></div>`;}).join("");
    }
    if(test){
      const x=tests[0];
      test.style.display=x?"":"none";
      if(x){const c=codeOf(x);test.innerHTML=`<span>${escapeHtml(x.label)} - <span class="jc-unitv-copy-value">${escapeHtml(c)}</span></span>${copyButton(c)}`;}
    }
    const titles=modal.querySelectorAll(".jc-unitv-test-title");
    if(titles[0]) titles[0].textContent=(versions[0]?.section_name||"UniTV Free Versões");
    if(titles[1]) titles[1].textContent=(tests[0]?.section_name||"Código de teste");
  }
  function scrubTestLinks() {
    document.querySelectorAll("a[href],a[download]").forEach((a)=>{
      const raw=a.getAttribute("href")||"";
      try{const u=new URL(raw,location.href);if(a.hasAttribute("download")||u.origin!==location.origin){a.removeAttribute("href");a.removeAttribute("download");a.dataset.jcDemoOnly="true";}}catch(e){}
    });
    const functions=state.functions.length?state.functions:knownFallback;
    functions.filter((f)=>f.action_kind==="link").forEach((f)=>{
      let els=[];try{els=[...document.querySelectorAll(f.selector)];}catch(e){}
      els.forEach((el)=>{
        if(el.matches?.("a")){el.removeAttribute("href");el.removeAttribute("download");}
        el.querySelectorAll?.("a[href],a[download]").forEach((a)=>{a.removeAttribute("href");a.removeAttribute("download");});
        el.dataset.jcDemoOnly="true";
      });
    });
  }
  function demoFileInfo(f) {
    const name=String(f?.name||"Arquivo demonstrativo").trim();
    let ext=".APK";
    if(/config/i.test(name)) ext=".CONFIG";
    else if(/zip|pacote/i.test(name)) ext=".ZIP";
    else if(/atualiza/i.test(name)) ext=".BIN";
    else if(/gerenciador/i.test(name)) ext=".APK";
    const base=name.replace(/\s+/g," ");
    const bytes=(base.length*13791+Number(new Date().getMinutes())*997)%85000000+1800000;
    const size=bytes>1000000?(bytes/1000000).toFixed(1)+" MB":Math.round(bytes/1000)+" KB";
    return {name:base+(/\.[A-Z0-9]{2,7}$/i.test(base)?"":ext.toLowerCase()),type:ext,size};
  }
  function showDemoServer(f) {
    injectStyles();
    let m=$("jc_demo_server_modal");
    if(!m){
      m=document.createElement("div");m.id="jc_demo_server_modal";m.className="jc-demo-server-modal";
      m.innerHTML='<div class="jc-demo-page"><button class="jc-demo-x" id="jc_demo_server_close" type="button">×</button><div class="jc-demo-watermarks" id="jc_demo_watermarks"></div><div class="jc-demo-server-main"><div class="jc-demo-server-top"><div class="jc-demo-file-icon">📄</div><div class="jc-demo-top-tools">↗ &nbsp; 🔗 &nbsp; ＋</div><button type="button" class="jc-demo-download" id="jc_demo_download">DOWNLOAD</button></div><div class="jc-demo-server-hint">O botão abaixo simula o servidor, sem entregar arquivo ou endereço real.</div><div class="jc-demo-file-card"><div class="jc-demo-file-big">📄</div><div><div class="jc-demo-file-name" id="jc_demo_file_name"></div><div class="jc-demo-file-type" id="jc_demo_file_type"></div><div class="jc-demo-meta"><b>Tamanho:</b> <span id="jc_demo_file_size"></span><br><b>Atualizado:</b> <span id="jc_demo_file_time"></span><br><b>Servidor:</b> <span id="jc_demo_server_name"></span></div><h4>Sobre o arquivo</h4><p>Arquivo apresentado em ambiente demonstrativo para conhecer o funcionamento do Painel JC-APK TV.</p></div><div class="jc-demo-side"><b id="jc_demo_side_type"></b><span>Compatibilidade do sistema</span><select disabled><option>Windows / Android</option></select><p>✅ Arquivo compatível com o sistema selecionado.</p></div></div></div><div class="jc-demo-fixed-badge"><b>🛡️ <span id="jc_demo_badge_title"></span></b><small id="jc_demo_badge_text"></small><button type="button" class="jc-demo-buy" id="jc_demo_buy">Ver valor / comprar</button></div></div>';
      document.body.appendChild(m);
      $("jc_demo_server_close").onclick=()=>m.classList.remove("show");
      m.onclick=(e)=>{if(e.target===m)m.classList.remove("show");};
      $("jc_demo_download").onclick=()=>demoDialog({name:"Download demonstrativo",purchase_enabled:false});
    }
    const buy=$("jc_demo_buy");if(buy){const canBuy=Boolean(f.purchase_enabled)||Number(f.purchase_price||0)>0;buy.style.display=canBuy?"":"none";buy.onclick=()=>{m.classList.remove("show");openPurchaseCenter(f.id);};}
    const info=demoFileInfo(f),now=new Date();
    const server=state.demo.server_name||"MediaFire",watermark=state.demo.watermark||"DEMONSTRAÇÃO";
    $("jc_demo_file_name").textContent=info.name;
    $("jc_demo_file_type").textContent=`Documento (${info.type})`;
    $("jc_demo_file_size").textContent=info.size;
    $("jc_demo_file_time").textContent=now.toLocaleString("pt-BR");
    $("jc_demo_server_name").textContent=server;
    $("jc_demo_side_type").textContent=info.type.toLowerCase();
    $("jc_demo_download").textContent=`DOWNLOAD (${info.size})`;
    $("jc_demo_badge_title").textContent=state.demo.badge_title||"AMBIENTE DEMONSTRATIVO";
    $("jc_demo_badge_text").textContent=state.demo.badge_text||"Conteúdo fictício — nenhum arquivo ou download real.";
    $("jc_demo_watermarks").style.setProperty("--jc-watermark",JSON.stringify(watermark));
    m.classList.add("show");
  }
  function installTestGuard() {
    if (window.__jcTestGuard) return;
    window.__jcTestGuard = true;
    const nativeOpen = window.open ? window.open.bind(window) : null;
    // Acesso controlado para os botões de teste que precisam abrir o APK real.
    // Mantém a proteção geral do modo teste para todos os outros links.
    window.__JC_NATIVE_OPEN = nativeOpen;
    window.open = function (url) {
      const raw=String(url||"");
      try{
        const u=new URL(raw,location.href);
        const isWhatsapp=["wa.me","api.whatsapp.com","web.whatsapp.com"].includes(u.hostname);
        if(isWhatsapp&&nativeOpen)return nativeOpen.apply(window,arguments);
        if(u.origin===location.origin&&u.pathname.includes("/autoatendimento/")&&u.searchParams.get("mode")==="config"&&nativeOpen)return nativeOpen.apply(window,arguments);
      }catch(e){}
      showDemoServer({name:"Link ou download protegido",action_kind:"link"});
      return {opener:null,focus:function(){},close:function(){}};
    };
    document.addEventListener("click",function(e){
      const a=e.target.closest&&e.target.closest("a[href],a[download]");if(!a)return;const raw=a.getAttribute("href")||"";
      if(a.hasAttribute("download")||/^https?:/i.test(raw)){
        try{
          const u=new URL(raw,location.href);
          if(["wa.me","api.whatsapp.com","web.whatsapp.com"].includes(u.hostname))return;
          if(u.origin===location.origin&&u.pathname.includes("/autoatendimento/")&&u.searchParams.get("mode")==="config")return;
        }catch(err){}
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();showDemoServer({name:a.dataset?.jcFunctionName||a.textContent?.trim()||(a.hasAttribute("download")?"Download demonstrativo":"Link demonstrativo"),action_kind:"link"});
      }
    },true);
    const nativeFetch=window.fetch?window.fetch.bind(window):null;
    if(nativeFetch){window.fetch=function(input,init){const raw=typeof input==="string"?input:(input&&input.url)||"";try{const u=new URL(raw,location.href),supabaseOrigin=A.cfg.url?new URL(A.cfg.url).origin:"";if(u.origin!==location.origin&&u.origin!==supabaseOrigin){demoDialog({name:"Acesso externo demonstrativo"});return Promise.reject(new Error("Modo teste: acesso externo bloqueado."));}}catch(e){}return nativeFetch(input,init);};}
    if(window.XMLHttpRequest){const nativeXhrOpen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url){try{const u=new URL(String(url||""),location.href),supabaseOrigin=A.cfg.url?new URL(A.cfg.url).origin:"";if(u.origin!==location.origin&&u.origin!==supabaseOrigin){demoDialog({name:"Acesso externo demonstrativo"});throw new Error("Modo teste: acesso externo bloqueado.");}}catch(e){if(String(e.message||e).includes("Modo teste"))throw e;}return nativeXhrOpen.apply(this,arguments);};}
    document.addEventListener("submit",function(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();demoDialog({name:"Envio demonstrativo"});},true);
  }
  function blockedDialog(f) {
    let m = $("jc_permission_modal");
    if (!m) {
      m = document.createElement("div");
      m.id = "jc_permission_modal";
      m.innerHTML =
        '<div class="jc-permission-box"><div class="jc-permission-icon">🔒</div><h3 id="jc_permission_title"></h3><p>Esta função não está incluída no seu acesso. Entre em contato com a JC-APK TV para solicitar a liberação.</p><button type="button" id="jc_permission_close">Entendi</button></div>';
      document.body.appendChild(m);
      $("jc_permission_close").onclick = () => m.classList.remove("show");
      m.onclick = (e) => {
        if (e.target === m) m.classList.remove("show");
      };
    }
    $("jc_permission_title").textContent = f.name;
    m.classList.add("show");
  }
  function applyPermissions() {
    const functions = state.functions.length ? state.functions : knownFallback;
    functions.forEach((f) => {
      let els = [];
      try { if (f.selector) els = [...document.querySelectorAll(f.selector)]; } catch (e) {}
      document.querySelectorAll("[data-jc-function-id]").forEach((candidate) => {
        if (candidate.dataset.jcFunctionId === f.id && !els.includes(candidate)) els.push(candidate);
      });
      els.forEach((el) => {
        el.dataset.jcFunctionId = f.id;
        el.dataset.jcFunctionName = f.name;
        const yes = allowed(f);
        el.classList.toggle("jc-function-locked", !yes && state.mode !== "preview");
        el.classList.toggle("jc-function-demo", state.mode === "test");
        el.classList.toggle("jc-preview-active", state.mode === "preview" && yes);
        el.classList.toggle("jc-preview-blocked", state.mode === "preview" && !yes);
        if (!yes && state.mode === "test" && f.demo_enabled === false) {
          el.style.display = "none";
          el.setAttribute("aria-hidden", "true");
        } else if (!yes && f.action_kind !== "entry" && state.mode !== "preview" && state.general.show_locked_functions === false) {
          el.style.display = "none";
        } else {
          if (state.mode === "preview") el.style.removeProperty("display");
          if (!yes) {
            el.setAttribute("aria-disabled", "true");
            el.title = state.mode === "preview" ? "Bloqueado para este cliente — clique para ver a demonstração" : "Função não incluída no acesso";
          } else {
            el.removeAttribute("aria-disabled");
            if (state.mode === "preview") el.title = "Liberado para este cliente";
          }
        }
      });
    });
    if (!window.__jcPermissionCaptureBound) {
      document.addEventListener("click", permissionCapture, true);
      window.__jcPermissionCaptureBound = true;
    }
  }

  function accountType(){return state.profile?.account_type || (state.profile?.role==="test"?"test":Number(state.profile?.plan_months)===0?"one_time":"monthly");}
  function reportOperationId(){
    return crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(c)=>{const r=Math.random()*16|0,v=c==="x"?r:(r&3|8);return v.toString(16);});
  }
  function dispatchReportAction(el,f,operationId){
    if(!f || f.report_enabled===false || String(f.report_trigger||"click")!=="click") return;
    if(state.mode==="test" || state.mode==="preview") return;
    const detail={
      function_id:f.id,
      function_name:f.name,
      category:f.report_category||f.group_name||f.name,
      item_label:f.report_label||f.name,
      status:"opened",
      operation_id:operationId||reportOperationId()
    };
    document.dispatchEvent(new CustomEvent("jc:report-action",{detail}));
  }
  window.JC_GENERATOR_CONTEXT=window.JC_GENERATOR_CONTEXT||{};
  function injectCreditCenterStyles(){
    if($("jc_credit_center_styles"))return;
    const st=document.createElement("style");st.id="jc_credit_center_styles";
    st.textContent=`
      .jc-credit-center{position:relative;margin:16px auto 18px;width:min(1180px,calc(100% - 24px));overflow:hidden;border:1px solid rgba(82,221,255,.28);border-radius:24px;background:linear-gradient(145deg,rgba(7,31,47,.97),rgba(6,18,29,.98));box-shadow:0 22px 60px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.06);color:#fff;font-family:var(--sans,"IBM Plex Sans",Arial,sans-serif)}
      .jc-credit-center::before{content:"";position:absolute;inset:0 auto auto 0;width:100%;height:3px;background:linear-gradient(90deg,#20d7ff,#28f0a1,#ffd35d)}
      .jc-credit-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:20px 22px 15px}.jc-credit-title{display:flex;align-items:center;gap:14px}.jc-credit-title-icon{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(145deg,#13b8e9,#25e19c);color:#06202b;font-size:25px;box-shadow:0 10px 24px rgba(29,215,202,.22)}
      .jc-credit-eyebrow{display:block;color:#73e8ff;font-size:11px;font-weight:950;letter-spacing:.18em;text-transform:uppercase}.jc-credit-title h2{margin:4px 0 3px;font-size:clamp(19px,2.3vw,27px)}.jc-credit-title p{margin:0;color:#a9bec9;font-size:13px;line-height:1.45}
      .jc-credit-balance-card{min-width:155px;padding:12px 18px;border-radius:18px;text-align:center;background:linear-gradient(145deg,rgba(32,232,159,.18),rgba(29,181,255,.12));border:1px solid rgba(72,242,186,.32)}.jc-credit-balance-card strong{display:block;font-family:var(--mono,"IBM Plex Mono",monospace);font-size:32px;line-height:1;color:#8dffd1}.jc-credit-balance-card span{display:block;margin-top:6px;color:#c8f7e4;font-size:11px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
      .jc-credit-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:0 22px 17px}.jc-credit-action{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;min-height:68px;padding:10px 12px;border-radius:15px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09)}.jc-credit-action-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:rgba(39,196,244,.13);border:1px solid rgba(69,213,255,.23);font-weight:1000;color:#9eeaff}.jc-credit-action b{display:block;font-size:13px;line-height:1.25}.jc-credit-action small{display:block;margin-top:3px;color:#7895a4;font-size:10px;font-weight:900;letter-spacing:.08em}.jc-credit-cost{white-space:nowrap;padding:6px 8px;border-radius:999px;background:rgba(255,205,91,.13);border:1px solid rgba(255,205,91,.28);color:#ffe09b;font-size:11px;font-weight:950}
      .jc-credit-note{display:flex;gap:9px;align-items:flex-start;padding:12px 22px 16px;border-top:1px solid rgba(255,255,255,.07);color:#9fb5c0;font-size:12px;line-height:1.5}.jc-credit-note b{color:#d8f7ff}
      .jc-credit-confirm{display:none;position:fixed;inset:0;z-index:2147483647;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.84);backdrop-filter:blur(9px)}.jc-credit-confirm.show{display:flex}.jc-credit-confirm-box{width:min(480px,96vw);padding:23px;border-radius:23px;background:linear-gradient(150deg,#0b2535,#07141f);border:1px solid rgba(82,221,255,.32);box-shadow:0 30px 100px rgba(0,0,0,.65);color:#fff}.jc-credit-confirm-box h3{margin:0 0 7px;font-size:22px}.jc-credit-confirm-box>p{margin:0 0 15px;color:#aac0ca;line-height:1.5}.jc-credit-summary{display:grid;gap:8px;padding:13px;border-radius:15px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09)}.jc-credit-summary div{display:flex;justify-content:space-between;gap:12px}.jc-credit-summary span{color:#9eb3bd}.jc-credit-summary b{color:#fff}.jc-credit-summary .after b{color:#89ffd0}.jc-credit-confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.jc-credit-confirm-actions button{border:0;border-radius:12px;padding:12px;font-weight:950;cursor:pointer}.jc-credit-cancel{background:#243845;color:#fff}.jc-credit-accept{background:linear-gradient(135deg,#20d99d,#28bde9);color:#06202b}
      @media(max-width:900px){.jc-credit-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.jc-credit-center{width:calc(100% - 14px);border-radius:19px}.jc-credit-head{grid-template-columns:1fr;padding:18px 14px 13px}.jc-credit-balance-card{display:flex;align-items:center;justify-content:center;gap:9px;min-width:0}.jc-credit-balance-card strong{font-size:27px}.jc-credit-balance-card span{margin:0}.jc-credit-actions{grid-template-columns:1fr;padding:0 14px 14px}.jc-credit-note{padding:11px 14px 14px}.jc-credit-confirm-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }
  function creditFunctionsForPanel(){
    return (state.functions||[]).map((f)=>{
      const meta=creditActionDefinition(f.id,f);
      if(!meta||!allowed(f)||!isCreditChargeAction(f))return null;
      return {f,meta,cost:effectiveCreditCost(f)};
    }).filter(Boolean).sort((a,b)=>Number(a.meta.order||9999)-Number(b.meta.order||9999));
  }
  function renderCreditCenter(){
    if(accountType()!=="credits"||state.mode==="admin"||state.mode==="test")return;
    injectCreditCenterStyles();
    let center=$("jc_credit_center");
    if(!center){center=document.createElement("section");center.id="jc_credit_center";center.className="jc-credit-center";const header=document.querySelector(".wrapper .header")||document.querySelector(".header");if(header)header.insertAdjacentElement("afterend",center);else(document.querySelector(".wrapper")||document.body).prepend(center);}
    const rows=creditFunctionsForPanel();
    const actions=rows.length?rows.map(({meta,cost})=>`<div class="jc-credit-action"><span class="jc-credit-action-icon">${escapeHtml(meta.icon)}</span><span><b>${escapeHtml(meta.label)}</b><small>${escapeHtml(meta.group)}</small></span><span class="jc-credit-cost">${cost} crédito${cost>1?"s":""}</span></div>`).join(""):`<div class="jc-credit-action" style="grid-column:1/-1"><span class="jc-credit-action-icon">✓</span><span><b>Nenhuma ação com cobrança configurada</b><small>As funções liberadas estão gratuitas neste momento.</small></span></div>`;
    const isPreview=state.mode==="preview";
    center.innerHTML=`<div class="jc-credit-head"><div class="jc-credit-title"><span class="jc-credit-title-icon">💳</span><div><span class="jc-credit-eyebrow">${isPreview?"Pré-visualização dos créditos":"Central de créditos"}</span><h2>${isPreview?"Como os créditos funcionarão nesta conta":"Seu saldo e as cobranças do painel"}</h2><p>${isPreview?"A prévia apenas demonstra os custos; nenhum crédito ou arquivo real é utilizado.":"Você sempre confirma antes de qualquer desconto."}</p></div></div><div class="jc-credit-balance-card"><strong data-jc-credit-value>${Number(state.profile?.credits_balance||0)}</strong><span>créditos disponíveis</span></div></div><div class="jc-credit-actions">${actions}</div><div class="jc-credit-note"><span>ℹ️</span><span><b>Não consomem créditos:</b> abrir menus, visualizar telas, copiar códigos, consultar versões, fechar ou resetar a visualização. ${isPreview?"Ao clicar nas ações cobradas, será mostrada somente uma simulação do desconto.":"Somente as ações listadas acima podem descontar saldo."}</span></div>`;
  }
  function closeReservedCreditWindow(el){
    const popup=el?._jcCreditWindow;delete el?._jcCreditWindow;
    try{if(popup&&!popup.closed)popup.close();}catch(_){ }
  }
  function confirmCreditUse(f,cost,balance){
    injectCreditCenterStyles();
    return new Promise((resolve)=>{
      let modal=$("jc_credit_confirm");
      if(!modal){modal=document.createElement("div");modal.id="jc_credit_confirm";modal.className="jc-credit-confirm";modal.innerHTML=`<div class="jc-credit-confirm-box" role="dialog" aria-modal="true"><h3>Confirmar uso de créditos</h3><p id="jc_credit_confirm_name"></p><div class="jc-credit-summary"><div><span>Custo da ação</span><b id="jc_credit_confirm_cost"></b></div><div><span>Saldo atual</span><b id="jc_credit_confirm_balance"></b></div><div class="after"><span>Saldo após confirmar</span><b id="jc_credit_confirm_after"></b></div></div><div class="jc-credit-confirm-actions"><button type="button" class="jc-credit-cancel" id="jc_credit_confirm_cancel">Cancelar</button><button type="button" class="jc-credit-accept" id="jc_credit_confirm_accept">Confirmar e continuar</button></div></div>`;document.body.appendChild(modal);}
      const finish=(confirmed)=>{modal.classList.remove("show");modal.setAttribute("aria-hidden","true");let popup=null;if(confirmed&&String(f.action_kind||"")==="link"&&String(f.id||"")!=="config.access"){try{popup=window.open("about:blank","_blank");if(popup){popup.document.title="JC-APK TV — preparando acesso";popup.document.body.innerHTML='<p style="font-family:Arial;padding:24px">Preparando seu acesso...</p>';}}catch(_){popup=null;}}resolve({confirmed,popup});};
      $("jc_credit_confirm_name").textContent=(creditActionDefinition(f.id,f)?.label||f.name||"Esta função")+".";
      $("jc_credit_confirm_cost").textContent=cost+" crédito"+(cost>1?"s":"");
      $("jc_credit_confirm_balance").textContent=balance+" crédito"+(balance!==1?"s":"");
      $("jc_credit_confirm_after").textContent=(balance-cost)+" crédito"+(balance-cost!==1?"s":"");
      $("jc_credit_confirm_cancel").onclick=()=>finish(false);$("jc_credit_confirm_accept").onclick=()=>finish(true);modal.onclick=(event)=>{if(event.target===modal)finish(false);};modal.classList.add("show");modal.setAttribute("aria-hidden","false");
    });
  }
  function updateCreditBalance(balance){
    state.profile.credits_balance=Number(balance||0);document.querySelectorAll("[data-jc-credit-value]").forEach((el)=>{el.textContent=state.profile.credits_balance;});
  }
  async function consumeCreditAndReplay(el,f){
    if(state.creditPending.has(el))return;state.creditPending.add(el);
    try{
      const cost=effectiveCreditCost(f);const balance=Number(state.profile.credits_balance||0);
      if(balance<cost){demoDialog({name:"Créditos insuficientes"});$("jc_demo_text").textContent=`Seus créditos acabaram ou são insuficientes. Saldo atual: ${balance}. As funções gratuitas continuam disponíveis. Entre em contato para comprar mais.`;return;}
      const confirmation=await confirmCreditUse(f,cost,balance);if(!confirmation.confirmed)return;if(confirmation.popup)el._jcCreditWindow=confirmation.popup;
      const operationId=crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(c)=>{const r=Math.random()*16|0,v=c==="x"?r:(r&3|8);return v.toString(16);});

      // 13A-16: Ativadores 11/16 descontam somente após a geração real confirmada.
      // Cancelamento, aviso profissional, erro do servidor ou tentativa incompleta não consomem.
      if(f.id==="activator11.generate"||f.id==="activator16.generate"){
        const generated=await createServerActivationCode(f.id==="activator11.generate"?"11":"16");
        if(!generated?.ok||!generated?.code)return;
        const {data,error}=await A.client.rpc("consume_credit",{p_function_id:f.id,p_operation_id:operationId});if(error)throw error;
        updateCreditBalance(data?.balance);
        dispatchReportAction(el,f,operationId);
        return;
      }

      // Demais ações mantêm a proteção contra clique duplo e só repetem a ação após o débito confirmado.
      const {data,error}=await A.client.rpc("consume_credit",{p_function_id:f.id,p_operation_id:operationId});if(error)throw error;
      updateCreditBalance(data?.balance);
      el.dataset.jcReportOperationId=operationId;state.creditBypass.add(el);setTimeout(()=>state.creditBypass.delete(el),3000);el.click();
    }catch(err){closeReservedCreditWindow(el);demoDialog({name:"Não foi possível usar os créditos"});$("jc_demo_text").textContent=err.message||"Falha ao confirmar o consumo.";}finally{state.creditPending.delete(el);}
  }
  function activationSafetyNoticeContent(type) {
    if (String(type) === "11") {
      return {
        badge: "11 DÍGITOS",
        title: "Evite o erro EA2 — Aparelho desabilitado",
        intro: "Antes de gerar o código, confira estas orientações importantes:",
        items: [
          "Use somente a versão atualizada do JC Ativador 11.",
          "Para maior estabilidade, recomendamos formatar ou restaurar o aparelho antes da ativação.",
          "Se preferir evitar a formatação, utilize o Ativador 16, que já possui auto limpeza integrada e normalmente dispensa formatação.",
          "Não utilize o CH Ativador: ele não é compatível com o painel atual e pode causar erros ou bloqueio do aparelho.",
          "Ative o código em até 36 horas. Após esse prazo, códigos não utilizados podem ser bloqueados preventivamente até a verificação do motivo."
        ],
        note: "Mesmo quando o link, o código de download e a aparência parecem iguais, o JC Ativador 11 recebe atualizações internas contínuas de compatibilidade, permissões e suporte para novos aparelhos. Versões antigas e resíduos podem causar o erro EA2 — Aparelho desabilitado.",
        actionLabel: "Entendi e gerar código 11"
      };
    }
    return {
      badge: "16 DÍGITOS",
      title: "Evite o erro EA2 — Aparelho desabilitado",
      intro: "Antes de gerar o código, confira estas orientações importantes:",
      items: [
        "Use somente a versão atualizada do JC Ativador 16.",
        "O Ativador 16 possui auto limpeza integrada e normalmente não precisa formatar o aparelho.",
        "Não utilize o CH Ativador: ele não é compatível com o painel atual e pode causar erros ou bloqueio do aparelho.",
        "Ative o código em até 36 horas. Após esse prazo, códigos não utilizados podem ser bloqueados preventivamente até a verificação do motivo."
      ],
      note: "Mesmo quando o link, o código de download e a aparência parecem iguais, o JC Ativador 16 recebe atualizações internas contínuas para aparelhos recentes, permissões, armazenamento e versões do Android. Versões antigas podem causar EA2 e outras falhas de compatibilidade.",
      actionLabel: "Entendi e gerar código 16"
    };
  }
  function ensureActivationSafetyNotice() {
    let modal = $("jc_activation_safety_modal");
    if (modal) return modal;
    const style = document.createElement("style");
    style.id = "jc_activation_safety_styles";
    style.textContent = `
      #jc_activation_safety_modal{display:none;position:fixed;inset:0;z-index:100000700;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.86);backdrop-filter:blur(9px)}
      #jc_activation_safety_modal.show{display:flex}
      .jc-activation-safety-box{width:min(720px,100%);max-height:94vh;overflow:auto;padding:22px;border:1px solid rgba(80,190,255,.35);border-radius:23px;background:linear-gradient(145deg,#0a2132,#06141e);color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.68)}
      .jc-activation-safety-head{display:flex;gap:12px;align-items:flex-start}.jc-activation-safety-icon{width:54px;height:54px;flex:0 0 auto;display:grid;place-items:center;border-radius:16px;background:linear-gradient(145deg,#ff9a3d,#ff3f5d);color:#fff;font-size:26px;font-weight:1000;box-shadow:0 10px 28px rgba(255,63,93,.24)}
      .jc-activation-safety-badge{display:inline-block;margin-bottom:5px;padding:5px 8px;border-radius:999px;background:rgba(255,191,71,.12);border:1px solid rgba(255,191,71,.35);color:#ffe09b;font-size:10px;font-weight:950;letter-spacing:.13em}.jc-activation-safety-box h3{margin:0;font-size:clamp(21px,4vw,29px);line-height:1.12}
      .jc-activation-safety-intro{margin:15px 0 10px;color:#bdd0dc;line-height:1.55}.jc-activation-safety-mini{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;margin:10px 0 13px;padding:10px;border-radius:15px;border:1px solid rgba(80,190,255,.25);background:rgba(26,101,157,.11)}.jc-activation-safety-mini .jc-activation-safety-mini-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:rgba(80,190,255,.14);font-size:24px}.jc-activation-safety-mini b,.jc-activation-safety-mini span{display:block}.jc-activation-safety-mini b{color:#d9f5ff}.jc-activation-safety-mini span{margin-top:5px;color:#9ebdca;font-size:12px;line-height:1.45}@media(max-width:520px){.jc-activation-safety-mini{grid-template-columns:1fr}.jc-activation-safety-mini .jc-activation-safety-mini-icon{width:100%;height:48px}}.jc-activation-safety-list{display:grid;gap:9px;margin:0;padding:0;list-style:none}.jc-activation-safety-list li{position:relative;padding:11px 12px 11px 40px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.035);line-height:1.48}.jc-activation-safety-list li:before{content:'✓';position:absolute;left:13px;top:11px;width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#25d366;color:#052117;font-weight:1000}
      .jc-activation-safety-note{margin-top:11px;padding:11px 12px;border-radius:13px;border:1px solid rgba(255,83,104,.38);background:rgba(255,83,104,.1);color:#ffd9df;line-height:1.48;font-weight:750}.jc-activation-safety-note b{color:#fff}
      .jc-activation-safety-count{margin:13px 0 0;text-align:center;color:#ffe09b;font-size:13px;font-weight:950;letter-spacing:.04em}.jc-activation-safety-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:9px;margin-top:14px}.jc-activation-safety-actions button{min-height:46px;border:0;border-radius:12px;padding:11px 13px;font-weight:950;cursor:pointer}.jc-activation-safety-cancel{background:#263b49;color:#fff}.jc-activation-safety-continue{background:#25d366;color:#052117}.jc-activation-safety-continue:disabled{opacity:.48;cursor:wait}
      @media(max-width:520px){.jc-activation-safety-box{padding:18px}.jc-activation-safety-head{align-items:center}.jc-activation-safety-icon{width:47px;height:47px}.jc-activation-safety-actions{grid-template-columns:1fr}.jc-activation-safety-cancel{order:2}}
    `;
    document.head.appendChild(style);
    modal = document.createElement("div");
    modal.id = "jc_activation_safety_modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `<div class="jc-activation-safety-box" role="dialog" aria-modal="true" aria-labelledby="jc_activation_safety_title">
      <div class="jc-activation-safety-head"><div class="jc-activation-safety-icon">⚠</div><div><span class="jc-activation-safety-badge" id="jc_activation_safety_badge"></span><h3 id="jc_activation_safety_title"></h3></div></div>
      <p class="jc-activation-safety-intro" id="jc_activation_safety_intro"></p>
      <div class="jc-activation-safety-mini"><div class="jc-activation-safety-mini-icon">🔄</div><div><b>Atualização contínua de compatibilidade</b><span>O link pode permanecer o mesmo enquanto o aplicativo recebe melhorias internas. Esta tela não carrega vídeo, música ou mídia pesada.</span></div></div>
      <ul class="jc-activation-safety-list" id="jc_activation_safety_list"></ul>
      <div class="jc-activation-safety-note"><b>Importante:</b> <span id="jc_activation_safety_note"></span></div>
      <div class="jc-activation-safety-count" id="jc_activation_safety_count"></div>
      <div class="jc-activation-safety-actions"><button type="button" class="jc-activation-safety-cancel" id="jc_activation_safety_cancel">Cancelar</button><button type="button" class="jc-activation-safety-continue" id="jc_activation_safety_continue" disabled>Aguarde 10 segundos</button></div>
    </div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function showActivationSafetyNotice(element, type) {
    if (!element || state.activationNoticePending.has(element)) return;
    state.activationNoticePending.add(element);
    const modal = ensureActivationSafetyNotice();
    const content = activationSafetyNoticeContent(type);
    $("jc_activation_safety_badge").textContent = content.badge;
    $("jc_activation_safety_title").textContent = content.title;
    $("jc_activation_safety_intro").textContent = content.intro;
    $("jc_activation_safety_note").textContent = content.note;
    $("jc_activation_safety_list").innerHTML = content.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const count = $("jc_activation_safety_count");
    const cancel = $("jc_activation_safety_cancel");
    const proceed = $("jc_activation_safety_continue");
    let remaining = 10;
    let timer = null;
    let finished = false;
    const close = (continueGeneration) => {
      if (finished) return;
      finished = true;
      if (timer) window.clearInterval(timer);
      state.activationNoticePending.delete(element);
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      if (continueGeneration) {
        state.activationNoticeBypass.add(element);
        window.setTimeout(() => element.click(), 0);
      }
    };
    const update = () => {
      count.textContent = remaining > 0
        ? `Leia o aviso. A geração será liberada em ${remaining} segundo${remaining === 1 ? "" : "s"}.`
        : "Aviso concluído. Você já pode continuar.";
      proceed.disabled = remaining > 0;
      proceed.textContent = remaining > 0 ? `Aguarde ${remaining} segundo${remaining === 1 ? "" : "s"}` : content.actionLabel;
    };
    cancel.onclick = () => close(false);
    proceed.onclick = () => close(true);
    modal.onclick = (event) => { if (event.target === modal) close(false); };
    update();
    timer = window.setInterval(() => {
      remaining -= 1;
      update();
      if (remaining <= 0 && timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }, 1000);
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }
  function permissionCapture(e) {
    // Ações do módulo Teste são sempre gratuitas e não entram no fluxo de cobrança.
    if (e.target.closest('[data-jc-free-action="true"]')) return;
    const el=e.target.closest("[data-jc-function-id]");if(!el)return;
    const f=(state.functions.length?state.functions:knownFallback).find((x)=>x.id===el.dataset.jcFunctionId);if(!f)return;
    if(!allowed(f)){
      if(state.mode==="preview"){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();demoDialog(f,true);return;
      }
      if(f.demo_enabled!==false){
        // O botão principal pode abrir seu submenu para o cliente conhecer a função.
        // Ações, links, downloads e códigos não comprados continuam protegidos.
        if(f.action_kind==="entry"){
          showPurchaseHint(f);
          return;
        }
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        if(f.action_kind==="link" || f.action_kind==="download") showDemoServer(f);
        else demoDialog(f,false);
        return;
      }
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();blockedDialog(f);return;
    }
    if(state.mode==="preview") {
      // A pré-visualização administrativa nunca executa códigos, links ou downloads reais.
      // Botões de entrada continuam abrindo apenas os respectivos menus visuais.
      if(f.action_kind==="entry") return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(accountType()==="credits"&&isCreditChargeAction(f)){
        const cost=effectiveCreditCost(f);
        const balance=Number(state.profile?.credits_balance||0);
        demoDialog({name:creditActionDefinition(f.id,f)?.label||f.name,purchase_enabled:false,purchase_price:0});
        $("jc_demo_title").textContent=(creditActionDefinition(f.id,f)?.label||f.name)+" — consome "+cost+" crédito"+(cost>1?"s":"");
        $("jc_demo_text").textContent="Na conta real, esta ação pedirá confirmação antes do desconto. Saldo atual: "+balance+". Saldo depois: "+Math.max(0,balance-cost)+". Nesta pré-visualização nenhum crédito foi descontado e nenhum download, código ou link real foi liberado.";
        const buy=$("jc_demo_buy");if(buy)buy.style.display="none";
      }else if(f.action_kind==="link" || f.action_kind==="download"){
        showDemoServer(f);
      }else{
        demoDialog(f,false);
        $("jc_demo_text").textContent="Pré-visualização segura: esta ação foi apenas simulada. Nenhum código válido foi gerado e nenhum dado real foi entregue.";
      }
      return;
    }
    if(state.mode==="test") {
      // Geradores usam a demonstração existente; links e downloads nunca abrem o endereço real.
      if((f.action_kind==="link" || f.action_kind==="download") && f.id!=="config.access") {
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        showDemoServer(f);
      }
      return;
    }

    // A orientação usa o tempo padrão de 10 segundos para 11 e 16 dígitos.
    // O gerador em massa já passou pela própria mini tela e pela mensagem específica de 10 segundos.
    // Evita mostrar em seguida o aviso individual de 11/16 e criar uma espera duplicada.
    const activationNoticeType = el.closest("#digits_mass_panel") ? "" : (f.id === "activator11.generate" ? "11" : (f.id === "activator16.generate" ? "16" : ""));
    if (activationNoticeType) {
      if (state.activationNoticeBypass.has(el)) {
        state.activationNoticeBypass.delete(el);
      } else {
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        showActivationSafetyNotice(el, activationNoticeType);
        return;
      }
    }

    if(accountType()==="credits"&&f.credit_mode==="disabled"){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      demoDialog({name:f.name,purchase_enabled:false,purchase_price:0});
      $("jc_demo_title").textContent=f.name+" — desativado para clientes por créditos";
      $("jc_demo_text").textContent="Esta função está desativada na regra geral dos clientes por créditos. O administrador poderá ativá-la depois como gratuita ou definir quantos créditos ela consome.";
      const buy=$("jc_demo_buy");if(buy)buy.style.display="none";
      return;
    }
    if(accountType()==="credits"&&isCreditChargeAction(f)){
      // O bypass pertence somente ao elemento clicado. Ele não libera os
      // demais pacotes e existe apenas para repetir o clique após o débito.
      if(state.creditBypass.has(el)){
        state.creditBypass.delete(el);
        const operationId=el.dataset.jcReportOperationId||reportOperationId();
        delete el.dataset.jcReportOperationId;
        dispatchReportAction(el,f,operationId);
        return;
      }
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();consumeCreditAndReplay(el,f);return;
    }
    dispatchReportAction(el,f);
  }
  function demoDialog(f, blockedPreview = false) {
    let m = $("jc_demo_modal");
    if (!m) {
      m = document.createElement("div");
      m.id = "jc_demo_modal";
      m.innerHTML = '<div class="jc-permission-box"><div class="jc-permission-icon">🧪</div><h3 id="jc_demo_title"></h3><p id="jc_demo_text"></p><div class="jc-demo-actions"><button type="button" id="jc_demo_close">Entendi</button><button type="button" id="jc_demo_buy" class="jc-buy-button">Ver valor / comprar</button></div></div>';
      document.body.appendChild(m);
      $("jc_demo_close").onclick = () => m.classList.remove("show");
      m.onclick = (e) => { if (e.target === m) m.classList.remove("show"); };
    }
    $("jc_demo_title").textContent = f.name + (blockedPreview ? " — bloqueado para este cliente" : " — demonstração");
    $("jc_demo_text").textContent = blockedPreview
      ? "No acesso real deste cliente esta função ficará bloqueada. Nesta prévia ela aparece somente como demonstração, sem código válido, download real ou link externo."
      : "Esta ação é demonstrativa. Nenhum download ou link real foi liberado. Você pode consultar o valor e enviar sua escolha pelo WhatsApp.";
    const buy=$("jc_demo_buy");
    const canBuy=Boolean(f.purchase_enabled)||Number(f.purchase_price||0)>0;
    buy.style.display=canBuy?"":"none";
    buy.onclick=()=>{m.classList.remove("show");openPurchaseCenter(f.id);};
    m.classList.add("show");
  }
  function injectStyles() {
    if ($("jc_access_styles")) return;
    const st = document.createElement("style");
    st.id = "jc_access_styles";
    st.textContent = `.jc-function-locked{filter:grayscale(.7)!important;opacity:.58!important;position:relative!important}.jc-function-locked::after{content:' 🔒'}.jc-function-demo{outline:1px dashed rgba(255,191,71,.65)!important}.jc-client-bar{margin:12px auto 16px;padding:12px 14px;border:1px solid rgba(37,211,102,.24);border-radius:16px;background:rgba(5,19,27,.86);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.jc-client-info b,.jc-client-info small{display:block}.jc-client-info small{color:#aebbc3;margin-top:3px}.jc-client-actions{display:flex;gap:7px;flex-wrap:wrap}.jc-client-actions button,.jc-client-actions a{padding:9px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.13);background:#163247;color:#fff;text-decoration:none;font-weight:800;cursor:pointer}.jc-client-actions .att{background:#25d366;color:#052117}.jc-client-actions .att-report{background:#1c91ff;color:#fff}.jc-client-actions .logout{background:rgba(255,101,120,.15);color:#ffd6dc}.jc-credit-banner{padding:8px 11px;border-radius:10px;background:rgba(28,145,255,.12);border:1px solid rgba(28,145,255,.35);color:#d8ebff;font-size:11px;font-weight:900}.jc-demo-banner{width:100%;padding:8px;border-radius:10px;background:rgba(255,191,71,.09);border:1px solid rgba(255,191,71,.28);color:#ffe5a5;text-align:center;font-size:11px;font-weight:800}.jc-preview-banner{width:100%;padding:9px;border-radius:10px;background:rgba(28,145,255,.1);border:1px solid rgba(28,145,255,.35);color:#d8ebff;text-align:center;font-size:11px;font-weight:850}.jc-preview-active{outline:2px solid rgba(41,211,145,.75)!important;box-shadow:0 0 0 3px rgba(41,211,145,.08)!important}.jc-preview-blocked{outline:2px dashed rgba(248,188,69,.8)!important;filter:grayscale(.6)!important;opacity:.66!important;position:relative!important}.jc-preview-blocked::after{content:' 🔒 DEMO';font-size:10px!important}.jc-permission-box{width:min(430px,92vw);padding:24px;border-radius:22px;background:#0b1d29;border:1px solid rgba(255,255,255,.13);text-align:center;box-shadow:0 25px 80px rgba(0,0,0,.5)}#jc_permission_modal,#jc_demo_modal{display:none;position:fixed;inset:0;z-index:99999999;align-items:center;justify-content:center;background:rgba(0,0,0,.76);backdrop-filter:blur(8px)}#jc_permission_modal.show,#jc_demo_modal.show{display:flex}.jc-permission-icon{font-size:35px}.jc-permission-box h3{margin:10px 0}.jc-permission-box p{color:#abc0cb;line-height:1.5}.jc-permission-box button{padding:10px 14px;border:0;border-radius:10px;background:#25d366;color:#052117;font-weight:900}.jc-password-modal{display:none;position:fixed;inset:0;z-index:99999999;align-items:center;justify-content:center;background:rgba(0,0,0,.76);padding:10px}.jc-password-modal.show{display:flex}.jc-password-box{width:min(450px,100%);padding:20px;border:1px solid rgba(255,255,255,.13);border-radius:20px;background:#0b1d29}.jc-password-box input{width:100%;padding:11px;margin:6px 0;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#06131b;color:#fff}.jc-password-box .row{display:flex;gap:7px;margin-top:10px}.jc-password-box button{flex:1;padding:10px;border:0;border-radius:10px;font-weight:800;cursor:pointer}`;
    st.textContent += `.jc-demo-server-modal{display:none;position:fixed;inset:0;z-index:100000000;background:rgba(0,0,0,.82);overflow:auto;padding:18px}.jc-demo-server-modal.show{display:block}.jc-demo-page{position:relative;min-height:calc(100vh - 36px);max-width:1180px;margin:auto;background:#fff;color:#20242a;border-radius:10px;overflow:hidden;box-shadow:0 25px 100px rgba(0,0,0,.55)}.jc-demo-x{position:absolute;right:12px;top:10px;z-index:5;border:0;background:#111;color:#fff;width:38px;height:38px;border-radius:50%;font-size:27px;cursor:pointer}.jc-demo-watermarks{position:absolute;inset:0;pointer-events:none;opacity:.13;background-image:repeating-linear-gradient(-22deg,transparent 0 105px,rgba(0,0,0,.015) 106px 210px);overflow:hidden}.jc-demo-watermarks:after{content:var(--jc-watermark,'DEMONSTRAÇÃO');position:absolute;inset:-30%;font-size:28px;letter-spacing:2px;word-spacing:130px;line-height:180px;transform:rotate(-18deg);white-space:normal;color:#7b8490}.jc-demo-server-main{position:relative;z-index:1;width:min(760px,92%);margin:24px auto 120px}.jc-demo-server-top{min-height:130px;background:linear-gradient(#202020,#303030);border-radius:9px 9px 0 0;display:flex;align-items:center;gap:18px;padding:24px;color:#fff}.jc-demo-file-icon,.jc-demo-file-big{font-size:64px}.jc-demo-top-tools{font-size:28px;flex:1}.jc-demo-download{border:0;border-radius:5px;background:#087cf0;color:#fff;font-weight:900;font-size:16px;padding:25px 48px;cursor:pointer}.jc-demo-server-hint{padding:14px;background:#3b3b3b;color:#eee;text-align:center;border-radius:0 0 9px 9px}.jc-demo-file-card{display:grid;grid-template-columns:64px 1fr 250px;gap:20px;margin-top:55px;align-items:start}.jc-demo-file-name{font-size:24px;font-weight:500}.jc-demo-file-type{font-size:24px;font-weight:900;margin-bottom:32px}.jc-demo-meta{line-height:1.55;font-size:16px}.jc-demo-file-card h4{font-size:18px;margin-bottom:8px}.jc-demo-file-card p{line-height:1.5}.jc-demo-side{background:linear-gradient(135deg,#f4f4f4,#ddd);padding:18px;display:grid;gap:12px}.jc-demo-side b{font-size:18px}.jc-demo-side select{padding:12px;border:0;background:#fff}.jc-demo-fixed-badge{position:absolute;z-index:2;left:22px;bottom:22px;padding:14px 18px;border:1px solid #ccd2d9;border-radius:8px;background:rgba(255,255,255,.94);box-shadow:0 8px 25px rgba(0,0,0,.12)}.jc-demo-fixed-badge b,.jc-demo-fixed-badge small{display:block}.jc-demo-fixed-badge small{margin-top:5px;color:#555}.jc-client-actions .reseller{background:#7b61ff;color:#fff}.jc-client-actions .jc-shop-button{background:#f0a52d;color:#211300}@media(max-width:760px){.jc-demo-server-main{width:94%;margin-top:60px}.jc-demo-server-top{flex-wrap:wrap}.jc-demo-download{width:100%;padding:18px}.jc-demo-file-card{grid-template-columns:48px 1fr}.jc-demo-side{grid-column:1/-1}.jc-demo-file-icon,.jc-demo-file-big{font-size:44px}}`;
    st.textContent += `.jc-client-info{display:flex;align-items:center;gap:10px}.jc-client-info>span:last-child{min-width:0}.jc-client-avatar{width:46px;height:46px;flex:0 0 auto;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:linear-gradient(145deg,#1c91ff,#26d9ff);color:#03121d;font-weight:1000;border:2px solid rgba(255,255,255,.16)}.jc-client-avatar img{width:100%;height:100%;object-fit:cover}.jc-avatar-gate{display:none;position:fixed;inset:0;z-index:100000500;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.88);backdrop-filter:blur(10px)}.jc-avatar-gate.show{display:flex}.jc-avatar-box{width:min(520px,100%);max-height:96vh;overflow:auto;padding:24px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:linear-gradient(145deg,#0d2535,#071722);color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.65);text-align:center}.jc-avatar-box h2{margin:14px 0 10px;font-size:24px}.jc-avatar-box p{margin:8px 0;color:#b7c9d3;line-height:1.55}.jc-avatar-box .jc-avatar-note{font-size:12px;color:#8fa6b2}.jc-avatar-preview{width:112px;height:112px;margin:auto;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,#1c91ff,#26d9ff);color:#03121d;font-size:34px;font-weight:1000;border:4px solid rgba(255,255,255,.15);box-shadow:0 18px 40px rgba(0,0,0,.35)}.jc-avatar-preview img{width:100%;height:100%;object-fit:cover}.jc-avatar-buttons{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.jc-avatar-buttons button,.jc-avatar-save{border:0;border-radius:12px;padding:12px 13px;font-weight:900;cursor:pointer}.jc-avatar-buttons button{background:#17364a;color:#fff;border:1px solid rgba(255,255,255,.12)}.jc-avatar-save{width:100%;margin-top:10px;background:#25d366;color:#052117}.jc-avatar-save:disabled{opacity:.45;cursor:not-allowed}.jc-avatar-msg{min-height:20px;margin-top:9px;color:#ffd0d7;font-size:12px}@media(max-width:520px){.jc-avatar-box{padding:19px}.jc-avatar-buttons{grid-template-columns:1fr}.jc-avatar-box h2{font-size:21px}.jc-client-info{width:100%}}`;
    st.textContent += `.jc-client-billing-notice{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr);gap:11px;align-items:start;padding:12px 13px;border:1px solid rgba(248,188,69,.42);border-radius:13px;background:linear-gradient(145deg,rgba(67,45,8,.94),rgba(30,23,8,.96));color:#fff}.jc-client-billing-notice.due{border-color:rgba(255,154,56,.58);background:linear-gradient(145deg,rgba(73,32,7,.96),rgba(35,19,8,.97))}.jc-client-billing-notice.grace,.jc-client-billing-notice.blocked{border-color:rgba(255,101,120,.58);background:linear-gradient(145deg,rgba(73,16,28,.96),rgba(34,10,16,.97))}.jc-client-billing-icon{font-size:24px;line-height:1}.jc-client-billing-notice b,.jc-client-billing-notice span,.jc-client-billing-notice small{display:block}.jc-client-billing-notice b{font-size:13px}.jc-client-billing-notice span span{margin-top:4px;color:#f1f5f7;font-size:12px;line-height:1.5}.jc-client-billing-notice small{margin-top:6px;color:#c4d0d7;font-size:10px;line-height:1.4}@media(max-width:520px){.jc-client-billing-notice{padding:11px}.jc-client-billing-icon{font-size:20px}}`;
    document.head.appendChild(st);
  }
  function money(value){return Number(value||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
  function actuallyOwned(f){
    if(state.mode==="admin")return true;
    if(state.mode==="test")return false;
    if(state.permissions?.[f.id])return true;
    if(String(f?.id||"")==="activators.mass.open")return Boolean(state.permissions?.["activators.mass.config"]||state.permissions?.["activators.mass.11"]||state.permissions?.["activators.mass.16"]||state.permissions?.["activators.mass.vip"]);
    if(String(f?.id||"")==="activatorvip.open")return Boolean(state.permissions?.["activatorvip.generate"]);
    if(f.action_kind==="entry")return (state.functions||[]).some((x)=>x.group_id===f.group_id&&Boolean(state.permissions?.[x.id]));
    return false;
  }
  function purchasable(){
    return (state.functions||[]).filter((f)=>f.active!==false&&(f.purchase_enabled||Number(f.purchase_price||0)>0)).sort((a,b)=>Number(a.purchase_sort||a.sort_order||0)-Number(b.purchase_sort||b.sort_order||0)||String(a.name).localeCompare(String(b.name),"pt-BR"));
  }
  async function loadSalesPackages(){
    if(!A?.client) return;
    try{
      const {data,error}=await A.client.from("jc_sales_packages").select("*").eq("status","active").order("sort_order").order("name");
      if(error) throw error;
      state.salesPackages=Array.isArray(data)?data:[];
      if($("jc_market_list")) renderPurchaseCenter();
    }catch(e){
      state.salesPackages=[];
      console.warn("Pacotes comerciais indisponíveis", e?.message || e);
    }
  }
  function purchasablePackages(){
    return (state.salesPackages||[]).filter((p)=>p&&p.status==="active"&&Number(p.price_brl||0)>0).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)||String(a.name).localeCompare(String(b.name),"pt-BR"));
  }
  function packageFunctions(pkg){
    const ids=Array.isArray(pkg?.function_ids)?pkg.function_ids:[];
    return ids.map((id)=>(state.functions||[]).find((f)=>f.id===id)).filter(Boolean);
  }
  function packageQuote(pkg){
    const full=Number(pkg?.price_brl||0);
    const funcs=packageFunctions(pkg);
    if(!funcs.length) return {full,discount:0,total:full,owned:[],missing:[]};
    const owned=funcs.filter((f)=>actuallyOwned(f));
    const missing=funcs.filter((f)=>!actuallyOwned(f));
    const configuredSum=funcs.reduce((sum,f)=>sum+Number(f.purchase_price||0),0);
    let discount=0;
    if(configuredSum>0){
      discount=owned.reduce((sum,f)=>sum+Number(f.purchase_price||0),0);
    }else{
      discount=(full/funcs.length)*owned.length;
    }
    discount=Math.min(full,Math.max(0,discount));
    return {full,discount,total:Math.max(0,full-discount),owned,missing};
  }
  function selectedPackages(){
    const rows=purchasablePackages();
    const ids=[...document.querySelectorAll('#jc_market_list [data-buy-package]:checked')].map((x)=>x.dataset.buyPackage);
    return ids.map((id)=>rows.find((x)=>String(x.id)===String(id))).filter(Boolean);
  }
  function selectedPackageFunctionIds(){
    const set=new Set();
    selectedPackages().forEach((pkg)=>packageFunctions(pkg).forEach((f)=>set.add(f.id)));
    return set;
  }
  function showPurchaseHint(f){
    injectMarketStyles();
    let t=$("jc_purchase_hint");
    if(!t){t=document.createElement("button");t.id="jc_purchase_hint";t.className="jc-purchase-hint";document.body.appendChild(t);}
    const value=Number(f.purchase_price||0)>0?money(f.purchase_price):"consulte o valor";
    t.innerHTML=`🧪 Demonstração de <b>${escapeHtml(f.name)}</b> • ${escapeHtml(value)} <span>Ver opções</span>`;
    t.onclick=()=>openPurchaseCenter(f.id);
    t.classList.add("show");clearTimeout(t.__timer);t.__timer=setTimeout(()=>t.classList.remove("show"),6500);
  }
  function installPriceChips(){
    purchasable().forEach((f)=>{
      let els=[];try{els=[...document.querySelectorAll(f.selector||"")]}catch(e){}
      els.forEach((el)=>{
        if(el.querySelector?.(`.jc-price-chip[data-price-id="${CSS.escape(f.id)}"]`))return;
        if(state.mode!=="test"&&actuallyOwned(f))return;
        const chip=document.createElement("span");chip.className="jc-price-chip";chip.dataset.priceId=f.id;
        chip.textContent=(f.is_extra?"Extra + ":"")+ (Number(f.purchase_price||0)>0?money(f.purchase_price):"Valor a definir");
        try{el.appendChild(chip)}catch(e){}
      });
    });
  }
  function injectMarketStyles(){
    if($("jc_market_styles"))return;
    const st=document.createElement("style");st.id="jc_market_styles";st.textContent=`
      .jc-price-chip{display:inline-flex!important;margin-left:8px!important;padding:4px 7px!important;border-radius:999px!important;background:rgba(255,191,71,.15)!important;border:1px solid rgba(255,191,71,.4)!important;color:#ffe5ad!important;font:800 10px Arial!important;letter-spacing:0!important;text-transform:none!important;vertical-align:middle!important;white-space:nowrap!important}
      .jc-purchase-hint{position:fixed;left:50%;bottom:18px;z-index:100000001;transform:translate(-50%,30px);opacity:0;pointer-events:none;max-width:min(720px,94vw);padding:13px 16px;border:1px solid rgba(255,191,71,.45);border-radius:13px;background:#172731;color:#fff;box-shadow:0 18px 60px rgba(0,0,0,.5);transition:.2s;cursor:pointer}.jc-purchase-hint.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}.jc-purchase-hint span{color:#8df0b0;margin-left:8px}
      .jc-market-modal{display:none;position:fixed;inset:0;z-index:100000002;align-items:center;justify-content:center;padding:10px;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}.jc-market-modal.show{display:flex}.jc-market-box{width:min(780px,100%);max-height:94vh;overflow:auto;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:#091b29;color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.62)}.jc-market-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;background:#091b29;border-bottom:1px solid rgba(255,255,255,.1)}.jc-market-head h3{margin:0}.jc-market-close{border:0;border-radius:10px;padding:9px 12px;background:#833142;color:#fff;font-weight:900;cursor:pointer}.jc-market-body{padding:17px}.jc-market-intro{color:#aebdc5;line-height:1.5;margin:0 0 13px}.jc-market-list{display:grid;gap:10px}.jc-market-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:start;padding:13px;border:1px solid rgba(255,255,255,.11);border-radius:15px;background:rgba(255,255,255,.03)}.jc-market-item.extra{margin-left:24px;border-style:dashed}.jc-market-item.package{border-color:rgba(37,211,102,.30);background:rgba(37,211,102,.055)}.jc-market-section-title{margin:10px 0 2px;color:#8fdcff;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.07em}.jc-market-discount{color:#8df0b0!important}.jc-market-item.owned{opacity:.72}.jc-market-item input{margin-top:5px;accent-color:#25d366}.jc-market-item strong{display:block}.jc-market-item small{display:block;color:#9eb1bc;line-height:1.4;margin-top:4px}.jc-market-price{font-weight:950;color:#ffe2a4;white-space:nowrap}.jc-market-owned{color:#8df0b0}.jc-market-warning{padding:10px 12px;border-radius:11px;background:rgba(255,191,71,.08);border:1px solid rgba(255,191,71,.25);color:#ffe2a4;font-size:12px;line-height:1.45;margin-top:12px}.jc-market-foot{position:sticky;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 17px;background:#091b29;border-top:1px solid rgba(255,255,255,.1)}.jc-market-total b{font-size:20px}.jc-market-whatsapp{border:0;border-radius:11px;padding:12px 15px;background:#25d366;color:#052117;font-weight:950;cursor:pointer}.jc-market-whatsapp:disabled{opacity:.45;cursor:not-allowed}.jc-demo-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.jc-buy-button{background:#25d366!important;color:#052117!important}.jc-demo-fixed-badge .jc-demo-buy{display:block;margin-top:9px;width:100%;padding:9px;border:0;border-radius:8px;background:#25d366;color:#052117;font-weight:900;cursor:pointer}@media(max-width:620px){.jc-market-item{grid-template-columns:auto minmax(0,1fr)}.jc-market-price{grid-column:2}.jc-market-item.extra{margin-left:10px}.jc-market-foot{align-items:stretch;flex-direction:column}.jc-market-whatsapp{width:100%}}
    `;document.head.appendChild(st);
  }
  let purchaseFocusId="";
  function openPurchaseCenter(focusId=""){
    injectMarketStyles();purchaseFocusId=focusId||"";
    let m=$("jc_market_modal");
    if(!m){m=document.createElement("div");m.id="jc_market_modal";m.className="jc-market-modal";m.innerHTML='<div class="jc-market-box"><div class="jc-market-head"><div><h3>Pacotes, funções e valores</h3><small>Escolha e envie para negociação no WhatsApp</small></div><button class="jc-market-close" type="button">Fechar</button></div><div class="jc-market-body"><p class="jc-market-intro">Escolha pacotes prontos ou funções avulsas. O valor estimado desconta o que já estiver liberado no seu acesso.</p><div class="jc-market-list" id="jc_market_list"></div><div class="jc-market-warning">A escolha não libera nada automaticamente. Ela é enviada pelo WhatsApp para negociação; depois o administrador libera manualmente o que for aprovado.</div></div><div class="jc-market-foot"><div class="jc-market-total">Total escolhido<br><b id="jc_market_total">R$ 0,00</b></div><button class="jc-market-whatsapp" id="jc_market_whatsapp" type="button" disabled>💬 Enviar escolha no WhatsApp</button></div></div>';document.body.appendChild(m);m.querySelector('.jc-market-close').onclick=()=>m.classList.remove('show');m.onclick=(e)=>{if(e.target===m)m.classList.remove('show')};$("jc_market_whatsapp").onclick=finishPurchase;}
    renderPurchaseCenter();m.classList.add("show");
  }
  function renderPurchaseCenter(){
    const rows=purchasable(),packs=purchasablePackages(),list=$("jc_market_list");if(!list)return;
    if(!rows.length&&!packs.length){list.innerHTML='<div style="padding:18px;text-align:center;color:#9eb1bc">Nenhum valor foi configurado ainda.</div>';$("jc_market_whatsapp").disabled=true;return;}
    const mains=rows.filter((f)=>!f.is_extra),extras=rows.filter((f)=>f.is_extra);
    const html=[];
    if(packs.length){
      html.push('<div class="jc-market-section-title">Pacotes prontos</div>');
      packs.forEach((pkg)=>{
        const q=packageQuote(pkg);
        const ownedNames=q.owned.map((f)=>f.name).slice(0,3).join(', ');
        const missingNames=q.missing.map((f)=>f.name).slice(0,3).join(', ');
        const details=[ownedNames?`Já possui: ${escapeHtml(ownedNames)}${q.owned.length>3?'...':''}`:'',q.discount>0?`Desconto estimado: ${money(q.discount)}`:'',missingNames?`Faltam: ${escapeHtml(missingNames)}${q.missing.length>3?'...':''}`:''].filter(Boolean).join(' • ');
        html.push(`<label class="jc-market-item package"><input type="checkbox" data-buy-package="${escapeHtml(pkg.id)}"><div><strong>📦 ${escapeHtml(pkg.name)}</strong><small>${escapeHtml(pkg.description||pkg.sale_message||'Pacote comercial configurado pelo administrador.')}</small>${details?`<small class="jc-market-discount">${details}</small>`:''}</div><span class="jc-market-price">${q.discount>0?`<small style="text-decoration:line-through;color:#9eb1bc">${money(q.full)}</small>${money(q.total)}`:money(q.full)}</span></label>`);
      });
    }
    if(rows.length) html.push('<div class="jc-market-section-title">Funções avulsas</div>');
    mains.forEach((main)=>{
      const owned=actuallyOwned(main);const checked=purchaseFocusId===main.id&&!owned;
      html.push(`<label class="jc-market-item ${owned?'owned':''}"><input type="checkbox" data-buy-id="${escapeHtml(main.id)}" ${owned?'disabled':checked?'checked':''}><div><strong>${escapeHtml(main.purchase_icon||'🧩')} ${escapeHtml(main.name)}</strong><small>${escapeHtml(main.purchase_description||'Função principal do painel.')}</small></div><span class="jc-market-price ${owned?'jc-market-owned':''}">${owned?'Já liberado':Number(main.purchase_price||0)>0?money(main.purchase_price):'Sob consulta'}</span></label>`);
      extras.filter((x)=>x.parent_function_id===main.id).forEach((extra)=>{
        const extraOwned=actuallyOwned(extra);const wantsFocus=purchaseFocusId===extra.id&&!extraOwned;const parentReady=owned||checked||wantsFocus;
        html.push(`<label class="jc-market-item extra ${extraOwned?'owned':''}"><input type="checkbox" data-buy-id="${escapeHtml(extra.id)}" data-parent-id="${escapeHtml(main.id)}" ${extraOwned?'disabled':wantsFocus?'checked':parentReady?'':'disabled'}><div><strong>${escapeHtml(extra.purchase_icon||'➕')} ${escapeHtml(extra.name)}</strong><small>${escapeHtml(extra.purchase_description||'Extra opcional. Só funciona com a função principal.')}</small></div><span class="jc-market-price ${extraOwned?'jc-market-owned':''}">${extraOwned?'Já liberado':Number(extra.purchase_price||0)>0?'+ '+money(extra.purchase_price):'Sob consulta'}</span></label>`);
      });
    });
    // Extras sem pai válido continuam visíveis, mas não podem ser comprados sozinhos.
    extras.filter((x)=>!mains.some((m)=>m.id===x.parent_function_id)).forEach((extra)=>html.push(`<label class="jc-market-item extra"><input type="checkbox" disabled><div><strong>${escapeHtml(extra.name)}</strong><small>Defina a função principal deste extra no painel administrativo.</small></div><span class="jc-market-price">${Number(extra.purchase_price||0)>0?'+ '+money(extra.purchase_price):'Sob consulta'}</span></label>`));
    list.innerHTML=html.join("");
    if(purchaseFocusId){
      const focus=rows.find((x)=>x.id===purchaseFocusId);if(focus?.is_extra&&!actuallyOwned(focus)){const parent=list.querySelector(`[data-buy-id="${CSS.escape(focus.parent_function_id||'')}"]`);if(parent&&!parent.disabled)parent.checked=true;}
    }
    list.querySelectorAll('[data-buy-id]').forEach((ch)=>ch.addEventListener('change',()=>{
      const id=ch.dataset.buyId;
      if(!ch.checked){list.querySelectorAll(`[data-parent-id="${CSS.escape(id)}"]`).forEach((e)=>{e.checked=false;e.disabled=true});}
      else{list.querySelectorAll(`[data-parent-id="${CSS.escape(id)}"]`).forEach((e)=>{if(!actuallyOwned(rows.find((f)=>f.id===e.dataset.buyId)))e.disabled=false});}
      updatePurchaseTotal();
    }));
    list.querySelectorAll('[data-buy-package]').forEach((ch)=>ch.addEventListener('change',updatePurchaseTotal));
    updatePurchaseTotal();
  }
  function selectedPurchases(){const rows=purchasable(),ids=[...document.querySelectorAll('#jc_market_list [data-buy-id]:checked')].map((x)=>x.dataset.buyId),covered=selectedPackageFunctionIds();return ids.map((id)=>rows.find((x)=>x.id===id)).filter(Boolean).filter((x)=>!covered.has(x.id));}
  function updatePurchaseTotal(){const selected=selectedPurchases(),packs=selectedPackages();const packageTotal=packs.reduce((sum,p)=>sum+packageQuote(p).total,0);const functionTotal=selected.reduce((sum,x)=>sum+Number(x.purchase_price||0),0);const total=packageTotal+functionTotal;if($("jc_market_total"))$("jc_market_total").textContent=money(total);if($("jc_market_whatsapp"))$("jc_market_whatsapp").disabled=!selected.length&&!packs.length;}
  async function finishPurchase(){
    const selected=selectedPurchases(),packs=selectedPackages();if(!selected.length&&!packs.length)return;
    const packageTotal=packs.reduce((sum,p)=>sum+packageQuote(p).total,0);
    const functionTotal=selected.reduce((sum,x)=>sum+Number(x.purchase_price||0),0);
    const total=packageTotal+functionTotal;
    const intro=state.mode==="test"?"Olá! Fiz o teste e tenho interesse nestas opções:":"Olá! Tenho interesse em negociar estas opções para meu painel:";
    const lines=[];
    packs.forEach((pkg)=>{const q=packageQuote(pkg);lines.push(`📦 Pacote: ${pkg.name}`);lines.push(`Valor cheio: ${money(q.full)}`);if(q.discount>0)lines.push(`Desconto por funções que já possuo: ${money(q.discount)}`);lines.push(`Valor estimado: ${money(q.total)}`);if(q.owned.length)lines.push(`Já possuo: ${q.owned.map((f)=>f.name).join(', ')}`);if(q.missing.length)lines.push(`Funções a liberar: ${q.missing.map((f)=>f.name).join(', ')}`);lines.push("");});
    selected.forEach((x)=>lines.push(`${x.is_extra?'Extra: ':'• '}${x.name} — ${Number(x.purchase_price||0)>0?money(x.purchase_price):'valor sob consulta'}`));
    const text=[intro,"",...lines,`Total estimado: ${money(total)}`,"","Gostaria de negociar a compra e, se possível, verificar desconto. A liberação pode ser feita manualmente pelo ADM após a confirmação."].join("\n");
    const phone=String(state.general.purchase_whatsapp||state.general.support_phone||"5555997234936").replace(/\D/g,"");
    const url=`https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url,"_blank");
  }
  function billingNoticeMarkup(){
    const preview=state.mode==="preview";
    if((state.mode!=="client"&&!preview)||accountType()!=="monthly"||!billingRules().panelEnabled)return "";
    const view=billingView(state.profile);if(view.stage==="ok")return "";
    const icon=view.stage==="blocked"?"🔒":view.stage==="grace"?"⚠️":"📅";
    return `<div class="jc-client-billing-notice ${escapeHtml(view.stage)}"><span class="jc-client-billing-icon">${icon}</span><span><b>${escapeHtml(view.title)}</b><span>${escapeHtml(view.message)}</span><small>Vencimento: ${escapeHtml(billingFormatDate(view.dates.due))} • pagamento até: ${escapeHtml(billingFormatDate(view.dates.limit))} • bloqueio: ${escapeHtml(billingFormatDate(view.dates.block))}</small></span></div>`;
  }
  function injectClientBar() {
    injectStyles();injectMarketStyles();if($("jc_client_bar"))return;const wrapper=document.querySelector(".wrapper")||document.body,bar=document.createElement("div");bar.id="jc_client_bar";bar.className="jc-client-bar";
    const preview=state.mode==="preview",type=accountType();
    const attEnabled=state.mode==="admin"||Boolean(state.permissions["attendant.open"])||Boolean(state.profile.attendant_enabled);
    const attHref=state.mode==="admin"
      ? new URL("painel-atendentes.html",A.rootUrl).href
      : new URL("minha-atendente.html",A.rootUrl).href;
    const attReportsHref=new URL("relatorios-atendente.html",A.rootUrl).href;
    const attLabel=state.mode==="admin"?"Gerenciar atendentes":"Minha Atendente";
    const title=state.mode==="test"?"🧪 Modo de demonstração":preview?"🔎 Pré-teste de "+escapeHtml(state.profile.full_name||state.profile.username):"Olá, "+escapeHtml(state.profile.full_name||state.profile.username);
    const labels={monthly:"Plano mensal",one_time:"Pagamento único — sem mensalidades",credits:"Acesso por créditos",test:"Teste temporário"};const subtitle=state.mode==="admin"?"Administrador":state.mode==="test"?"Acesso visual completo, com códigos fictícios e sem downloads reais":preview?"Verde = liberado • Amarelo = bloqueado em demonstração":labels[type]||escapeHtml(state.profile.plan_name||"Cliente");
    const credit="";const reseller=Boolean(state.profile?.is_reseller)&&state.access?.reseller?.enabled!==false&&!preview&&state.mode!=="test"?'<a class="reseller" href="../painel-revenda.html">📊 Minha revenda</a>':"";const expiry=type==="test"&&state.profile.trial_expires_at?" • termina "+new Date(state.profile.trial_expires_at).toLocaleString("pt-BR"):type==="monthly"&&state.profile.expires_at?" • vence "+formatDate(state.profile.expires_at):"";
    const shop=state.mode!=="admin"&&!preview?'<button id="jc_open_market" class="jc-shop-button">🛒 Pacotes e preços</button>':"";
    const attendantActions=attEnabled&&!preview&&state.mode!=="test"
      ? (state.mode==="admin"
          ? `<a class="att" href="${attHref}">🤖 ${attLabel}</a>`
          : `<a class="att-report" href="${attReportsHref}">📊 Relatórios da atendente</a><a class="att" href="${attHref}">🤖 ${attLabel}</a>`)
      : "";
    bar.innerHTML=`<div class="jc-client-info"><span class="jc-client-avatar">${profileAvatarMarkup()}</span><span><b>${title}</b><small>${subtitle}${expiry}</small></span></div><div class="jc-client-actions">${credit}${reseller}${shop}${attendantActions}${state.mode!=="test"&&!preview?'<button id="jc_change_password">Minha senha</button>':""}<button id="jc_logout" class="logout">${preview?"Fechar pré-teste":"Sair"}</button></div>${state.mode==="test"?'<div class="jc-demo-banner">MODO TESTE — o painel abre completo para avaliação, mas links e downloads verdadeiros são bloqueados. Consulte os valores em “Pacotes e preços”.</div>':""}${preview?'<div class="jc-preview-banner">PRÉ-TESTE ADMINISTRATIVO — confira as funções e depois aprove o acesso no painel.</div>':""}${billingNoticeMarkup()}`;
    const header=wrapper.querySelector(".header");if(header)header.insertAdjacentElement("afterend",bar);else wrapper.prepend(bar);
    $("jc_logout").onclick=async()=>{if(preview){window.close();return;}if(A.client)await A.client.auth.signOut();sessionStorage.clear();location.reload();};if($("jc_change_password"))$("jc_change_password").onclick=showPasswordModal;if($("jc_open_market"))$("jc_open_market").onclick=()=>openPurchaseCenter();
    renderCreditCenter();
    setTimeout(installPriceChips,200);
  }
  function escapeHtml(v) {
    return String(v || "").replace(
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
  function formatDate(v) {
    const d = new Date(v + "T12:00:00");
    return d.toLocaleDateString("pt-BR");
  }
  function showPasswordModal(forceChange = false) {
    injectStyles();
    let m = $("jc_password_modal");
    if (!m) {
      m = document.createElement("div");
      m.id = "jc_password_modal";
      m.className = "jc-password-modal";
      m.innerHTML =
        '<div class="jc-password-box"><h3 id="jc_pass_title">Alterar senha do painel</h3><p id="jc_pass_help" style="color:#abc0cb">Use pelo menos 8 caracteres. O administrador verá somente que a senha foi alterada e a data, nunca a senha escolhida.</p><input id="jc_new_pass" type="password" autocomplete="new-password" placeholder="Nova senha"><input id="jc_new_pass2" type="password" autocomplete="new-password" placeholder="Confirmar nova senha"><div class="row"><button id="jc_pass_cancel">Cancelar</button><button id="jc_pass_save" style="background:#25d366;color:#052117">Salvar</button></div><div id="jc_pass_msg" style="margin-top:8px;color:#ff9ca8"></div></div>';
      document.body.appendChild(m);
      $("jc_pass_cancel").onclick = () => m.classList.remove("show");
      $("jc_pass_save").onclick = changePassword;
    }
    m.dataset.forceChange=forceChange?"true":"false";
    m.classList.add("show");
    const cancel=$("jc_pass_cancel");
    if(cancel)cancel.style.display=forceChange?"none":"";
    if($("jc_pass_title"))$("jc_pass_title").textContent=forceChange?"Crie sua nova senha para continuar":"Alterar senha do painel";
    if($("jc_pass_help"))$("jc_pass_help").textContent=forceChange?"Esta senha temporária precisa ser substituída agora. A nova senha será conhecida somente por você.":"Use pelo menos 8 caracteres. O administrador verá somente que a senha foi alterada e a data, nunca a senha escolhida.";
  }
  async function changePassword() {
    const a = $("jc_new_pass").value,
      b = $("jc_new_pass2").value,
      me = $("jc_pass_msg");
    if (a.length < 8)
      return (me.textContent = "A senha precisa ter pelo menos 8 caracteres.");
    if (a !== b) return (me.textContent = "As senhas não conferem.");
    me.textContent = "Salvando...";
    const { error } = await A.client.auth.updateUser({ password: a });
    if (error) return (me.textContent = error.message);
    const completed=await A.client.rpc("jc_complete_password_change");
    if(completed.error) await A.client.rpc("log_panel_password_change");
    state.passwordChangeRequired=false;
    me.style.color = "#8cf0b0";
    me.textContent = "Senha alterada com sucesso.";
    setTimeout(() => {$("jc_password_modal").classList.remove("show");location.reload();}, 900);
  }
  async function restore() {
    const preview = readAdminPreview();
    if (preview?.error) {
      msg(preview.error);
      return;
    }
    if (preview) {
      state.passwordChangeRequired=false;
      msg("ABRINDO PRÉ-TESTE...", true);
      grant(preview?.profile?.account_type === "test" || preview?.profile?.role === "test" ? "test" : "preview", preview);
      return;
    }
    if (!A.ready) return;
    const trialToken=new URLSearchParams(location.search).get("teste");
    if(trialToken){
      try{const {data,error}=await A.client.rpc("get_trial_access",{p_token:trialToken});if(error)throw error;if(!data?.profile)throw new Error("Este link de teste expirou ou não é válido.");msg("ABRINDO TESTE TEMPORÁRIO...",true);grant("test",data);return;}catch(e){msg(e.message||"Link de teste inválido.");return;}
    }
    const { data: { session } } = await A.client.auth.getSession();
    if (!session) return;
    try {
      const access = await A.myAccess();
      if(access?.profile)await loadBillingSettings(access);
      if (access?.profile && !expired(access.profile)) {
        const mode=access.profile.role === "admin" ? "admin" : access.profile.role === "test" ? "test" : "client";
        state.passwordChangeRequired=await readPasswordChangeRequired(mode,access);
        msg("RESTAURANDO ACESSO...", true);
        grant(mode, access);
      } else if(access?.profile&&expired(access.profile)) msg(blockedAccessMessage(access.profile));
    } catch (e) { console.warn(e); }
  }
  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    restore();
  });
})();
