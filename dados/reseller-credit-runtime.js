(function(){
  'use strict';
  const A=window.JC_APP;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state={context:null,packages:[],clients:[],balances:[],functions:[],sellableFunctions:[],menuTimer:null,adminTimer:null};
  const LAUNCHER_RESELL_IDS=['reseller.launcher.resell','launcher.resell','launcher.reseller','launcher.credits.resell','reseller.launcher.open'];
  const GROUP_ORDER=['config','activator11','activator16','xplus','btv','stv','eaigo','packages','other'];
  const SIMPLE_RESELLER_GROUPS=new Set(['config','activator11','activator16','xplus','btv','stv','eaigo','packages']);

  function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function context(){return state.context||window.JC_GENERATOR_CONTEXT||{};}
  function permissions(){return context().permissions||{};}
  function isAdmin(){return String(context().mode||'').toLowerCase()==='admin';}
  function hasPerm(id){return isAdmin()||Boolean(permissions()[id]);}
  function permitted(){
    const c=context(),p=c.profile||{};
    return !isAdmin()&&Boolean(p.is_reseller)&&Boolean(permissions()['reseller.credit.open']);
  }
  function actorId(){return context()?.profile?.id||null;}
  function normalizeRows(value){return Array.isArray(value)?value:(Array.isArray(value?.packages)?value.packages:[]);}
  function normalizeProductKey(key){return String(key||'geral').toLowerCase().replace(/[^a-z0-9_-]/g,'')||'geral';}
  function usableBalances(){return state.balances.filter(x=>normalizeProductKey(x.product_key)!=='launcher');}
  function balanceFor(key){key=normalizeProductKey(key);return Number(usableBalances().find(x=>normalizeProductKey(x.product_key)===key)?.balance||0);}
  function clientLabel(c){return c?.full_name||c?.username||'Cliente';}
  function normalizePhone(v){let d=String(v||'').replace(/\D/g,'');if((d.length===10||d.length===11)&&!d.startsWith('55'))d='55'+d;return d.slice(0,13);}
  function usernameFromName(v){return String(v||'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'').slice(0,24)||'cliente';}
  function isLauncherFunction(f){const id=String(f?.id||'').toLowerCase(),gid=String(f?.group_id||'').toLowerCase(),name=String(f?.name||'').toLowerCase();return id.startsWith('launcher.')||gid==='launcher'||name.includes('launcher');}
  function canResellLauncher(){return isAdmin()||LAUNCHER_RESELL_IDS.some(hasPerm);}
  function canUseLauncherItem(item){return !isLauncherFunction(item)||canResellLauncher();}
  function isInternalResellerControl(f){const id=String(f?.id||'').toLowerCase();return id.startsWith('reseller.')||id.includes('revendedor')||id.includes('revenda');}
  function functionSearchText(f){return [f?.id,f?.group_id,f?.group_name,f?.category,f?.name,f?.label,f?.description,f?.credit_product_key,f?.product_key].map(x=>String(x||'').toLowerCase()).join(' ');}
  function productGroupFromText(txt){
    const has11=/(11\s*d[ií]gitos|11digitos|ativador\s*11|gerador\s*11|_11\b|\.11\b|\b11\b)/i.test(txt);
    const has16=/(16\s*d[ií]gitos|16digitos|ativador\s*16|gerador\s*16|_16\b|\.16\b|\b16\b)/i.test(txt);
    if(has11&&!has16)return {id:'activator11',name:'Ativador 11 dígitos'};
    if(has16&&!has11)return {id:'activator16',name:'Ativador 16 dígitos'};
    if(/x\s*plus|xplus|inxplus/.test(txt))return {id:'xplus',name:'XPLUS'};
    if(/\bbtv\b/.test(txt))return {id:'btv',name:'BTV'};
    if(/\bstv\b/.test(txt))return {id:'stv',name:'STV'};
    if(/eaigo/.test(txt))return {id:'eaigo',name:'EAIGO'};
    return null;
  }
  function groupForFunction(f){
    const id=String(f?.id||'').toLowerCase(),gid=String(f?.group_id||'').toLowerCase(),gname=String(f?.group_name||f?.category||'').trim(),txt=functionSearchText(f);
    const productGroup=productGroupFromText(txt);if(productGroup)return productGroup;
    if(id.startsWith('config')||gid==='config'||/config|acesse/i.test(gname+' '+f?.name))return {id:'config',name:'CONFIG / Acesse Aqui'};
    if(id.startsWith('package.')||gid==='packages'||/pacote|apk|download/i.test(gname+' '+f?.name))return {id:'packages',name:'Outros APKS / Downloads'};
    return {id:gid||'other',name:gname||'Outras funções'};
  }
  function actionLabelForFunction(f,groupId){
    const txt=functionSearchText(f),original=String(f?.name||f?.label||f?.id||'Função').trim();
    const isDownload=/(c[oó]digo\s*de\s*download|cod\.?\s*download|download|baixar|apk)/i.test(txt);
    if(groupId==='activator11')return isDownload?'Código de download do APK — Ativador 11':'Gerar código 11 dígitos numérico';
    if(groupId==='activator16')return isDownload?'Código de download do APK — Ativador 16':'Gerar código 16 dígitos numérico';
    if(groupId==='config')return isDownload?'Código de download — CONFIG':'Acesse Aqui — CONFIG';
    const names={xplus:'XPLUS',btv:'BTV',stv:'STV',eaigo:'EAIGO',packages:'Outros APKS / Downloads'};
    if(names[groupId])return isDownload?`Código de download — ${names[groupId]}`:`Liberar ${names[groupId]}`;
    return original;
  }
  function productKeyForFunction(f){
    const rawExplicit=String(f?.credit_product_key||f?.product_key||'').trim();
    if(rawExplicit)return normalizeProductKey(rawExplicit);
    const id=String(f?.id||'').toLowerCase(),g=productGroupFromText(functionSearchText(f));
    if(g)return g.id==='activator11'?'ativador11':g.id==='activator16'?'ativador16':g.id;
    if(id.startsWith('launcher.'))return 'launcher';
    if(id.startsWith('activator11.'))return 'ativador11';
    if(id.startsWith('activator16.'))return 'ativador16';
    if(id.startsWith('package.'))return id.split('.')[1]||'apks';
    if(id.startsWith('config.'))return 'config';
    return normalizeProductKey(f?.group_id||'geral');
  }
  function effectiveCreditCost(f){
    const raw=Number(f?.reseller_credit_cost ?? f?.credit_cost ?? f?.cost_credits ?? 0);
    return Number.isFinite(raw)&&raw>0?Math.ceil(raw):1;
  }
  function sellableFunction(f){
    if(!f||f.active===false)return false;
    const id=String(f.id||'');
    if(!id||isInternalResellerControl(f))return false;
    if(!hasPerm(id))return false;
    if(!SIMPLE_RESELLER_GROUPS.has(groupForFunction(f).id))return false;
    if(!canUseLauncherItem(f))return false;
    return true;
  }
  function groupedFunctions(list){
    const groups=new Map();
    (list||[]).forEach(f=>{const g=groupForFunction(f);if(!groups.has(g.id))groups.set(g.id,{...g,items:[]});groups.get(g.id).items.push(f);});
    return [...groups.values()].map(g=>({...g,items:g.items.sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)||String(a.name||'').localeCompare(String(b.name||''),'pt-BR'))})).sort((a,b)=>{const ia=GROUP_ORDER.indexOf(a.id),ib=GROUP_ORDER.indexOf(b.id);return (ia<0?999:ia)-(ib<0?999:ib)||a.name.localeCompare(b.name,'pt-BR');});
  }
  function packageAllowed(p){
    if(!p||!(p.status==='active'||p.active===true))return false;
    if(!['all','reseller'].includes(String(p.audience||'all')))return false;
    const product=normalizeProductKey(p.product_key||'');
    const ids=Array.isArray(p.function_ids)?p.function_ids.filter(Boolean):[];
    if(product==='launcher'&&!canResellLauncher())return false;
    if(ids.some(id=>String(id).startsWith('launcher.'))&&!canResellLauncher())return false;
    if(!ids.length)return product!=='launcher'||canResellLauncher();
    return ids.every(id=>hasPerm(id)&&(!String(id).startsWith('launcher.')||canResellLauncher()));
  }

  function injectStyles(){
    if($('jc_reseller_credit_styles'))return;
    const st=document.createElement('style');st.id='jc_reseller_credit_styles';st.textContent=`
      #jc_reseller_credit_block{margin:22px 0;border:1px solid rgba(73,211,161,.25);border-radius:25px;overflow:hidden;background:linear-gradient(145deg,rgba(8,27,37,.97),rgba(5,14,22,.98));box-shadow:0 24px 60px rgba(0,0,0,.34)}
      #jc_reseller_credit_block .jcrc-main-toggle{border-radius:0;background:linear-gradient(90deg,rgba(43,211,145,.18),rgba(39,143,255,.11));border-bottom:1px solid rgba(255,255,255,.08)}
      #jc_reseller_credit_block .jcrc-main-toggle strong{color:#caffea}
      #jc_reseller_credit_block .jcrc-body{display:none}#jc_reseller_credit_block .jcrc-body.is-open{display:block}
      .jcrc-access-toggle{width:100%;min-height:88px;padding:12px 16px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:13px!important;text-align:left!important}.jcrc-access-copy{display:flex;align-items:center;gap:13px;min-width:0}.jcrc-access-copy img{width:60px;height:60px;flex:0 0 60px;border-radius:13px;object-fit:cover;border:1px solid rgba(255,255,255,.2)}.jcrc-access-copy span{min-width:0}.jcrc-access-copy strong{display:block;margin-top:4px}
      .jcrc-gate-notice{display:none;margin:12px;padding:14px;border:1px solid rgba(76,199,255,.30);border-radius:16px;background:linear-gradient(145deg,rgba(5,29,45,.97),rgba(7,18,30,.98));grid-template-columns:1fr 150px;gap:14px;align-items:center}.jcrc-gate-notice.is-open{display:grid}.jcrc-gate-notice h3{margin:0 0 7px;color:#d9f5ff;font-size:15px}.jcrc-gate-notice p{margin:0;color:#a9bfca;font-size:11px;line-height:1.55}.jcrc-gate-notice b{display:block;margin-top:9px;color:#79ffd0;font:900 10px var(--mono,monospace)}.jcrc-gate-notice img{width:100%;aspect-ratio:1;border-radius:14px;object-fit:cover}
      .jcrc-admin-menu{margin:12px 0;border:1px solid rgba(62,180,255,.30);border-radius:18px;overflow:hidden;background:linear-gradient(90deg,rgba(26,107,181,.22),rgba(43,211,145,.10));box-shadow:0 14px 34px rgba(0,0,0,.24)}.jcrc-admin-menu button{border:0;background:transparent;color:#fff;cursor:pointer}.jcrc-admin-menu button:hover{filter:brightness(1.08)}
      .jcrc-head{display:flex;align-items:center;justify-content:space-between;gap:13px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,rgba(43,211,145,.12),rgba(39,143,255,.08))}.jcrc-head h2{margin:0;color:#caffea;font:950 16px var(--mono,monospace);letter-spacing:.08em}.jcrc-head p{margin:5px 0 0;color:#8fa9b6;font-size:11px}.jcrc-badge{padding:7px 10px;border-radius:999px;border:1px solid rgba(43,211,145,.34);background:rgba(43,211,145,.09);color:#aaffd3;font:900 9px var(--mono,monospace);white-space:nowrap}.jcrc-body{padding:17px}.jcrc-sim{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.jcrc-sim-card{padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:rgba(255,255,255,.03)}.jcrc-sim-card b,.jcrc-sim-card span{display:block}.jcrc-sim-card b{color:#d7f7ff;font-size:12px}.jcrc-sim-card span{margin-top:5px;color:#8fa8b5;font-size:10px;line-height:1.45}.jcrc-lock{margin-top:13px;padding:13px;border-radius:14px;border:1px solid rgba(255,183,43,.27);background:rgba(255,183,43,.07);color:#ffe2a5;font-size:11px;line-height:1.55}.jcrc-real{display:none;margin-top:15px;padding-top:15px;border-top:1px solid rgba(255,255,255,.09)}.jcrc-real.show{display:block}.jcrc-balance-list{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.jcrc-balance{padding:8px 10px;border-radius:11px;background:rgba(39,143,255,.09);border:1px solid rgba(39,143,255,.25);color:#cceaff;font:850 10px var(--mono,monospace)}.jcrc-balance.launcher{background:rgba(160,96,255,.1);border-color:rgba(160,96,255,.32);color:#e9dcff}.jcrc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.jcrc-field{display:grid;gap:6px}.jcrc-field label{font:900 9px var(--mono,monospace);letter-spacing:.08em;color:#a9c1cc}.jcrc-field select,.jcrc-field input,.jcrc-field textarea{width:100%;min-height:43px;padding:10px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:#061522;color:#fff}.jcrc-field textarea{min-height:82px;resize:vertical}.jcrc-full{grid-column:1/-1}.jcrc-summary{min-height:72px;padding:12px;border-radius:13px;border:1px solid rgba(43,211,145,.22);background:rgba(43,211,145,.06);color:#bff8d8;font-size:11px;line-height:1.55}.jcrc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.jcrc-btn{min-height:42px;border:0;border-radius:11px;padding:10px 13px;font-weight:950;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.jcrc-btn.green{background:#2bd391;color:#052117}.jcrc-btn.blue{background:#278fff;color:#fff}.jcrc-btn.dark{background:#17364a;color:#fff;border:1px solid rgba(255,255,255,.08)}.jcrc-btn:disabled{opacity:.45;cursor:wait}.jcrc-history{margin-top:12px;color:#9fb7c3;font-size:10px}.jcrc-status{min-height:21px;margin-top:10px;color:#baffdc;font-size:11px}.jcrc-tabs{display:flex;gap:7px;margin:13px 0 10px;flex-wrap:wrap}.jcrc-tab{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 11px;background:rgba(255,255,255,.04);color:#fff;font-weight:900;cursor:pointer}.jcrc-tab.active{background:#278fff}.jcrc-pane{display:none}.jcrc-register-note{padding:11px 12px;border-radius:12px;border:1px solid rgba(39,143,255,.25);background:rgba(39,143,255,.07);color:#c9e9ff;font-size:10px;line-height:1.5;margin-bottom:10px}.jcrc-pane.active{display:block}.jcrc-perm-tree{display:grid;gap:10px;margin-top:10px}.jcrc-perm-group{border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.025);overflow:hidden}.jcrc-perm-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 12px;background:rgba(255,255,255,.035)}.jcrc-perm-head strong{color:#e0f8ff;font-size:12px}.jcrc-perm-head small{display:block;color:#8da7b4;font-size:9px}.jcrc-check{display:flex;gap:8px;align-items:flex-start;padding:9px 12px;color:#e7f6fa;font-size:11px;cursor:pointer}.jcrc-check input{margin-top:2px;accent-color:#2bd391}.jcrc-check small{display:block;margin-top:3px;color:#87a2af;font-size:9px}.jcrc-group-launcher{border-color:rgba(160,96,255,.35)}.jcrc-launcher-note{margin-top:10px;padding:11px 12px;border-radius:12px;border:1px solid rgba(160,96,255,.34);background:rgba(160,96,255,.08);color:#eadcff;font-size:10px;line-height:1.5}
      @media(max-width:680px){.jcrc-head{align-items:flex-start;flex-direction:column}.jcrc-sim,.jcrc-grid{grid-template-columns:1fr}.jcrc-full{grid-column:auto}.jcrc-actions .jcrc-btn{width:100%}.jcrc-gate-notice{grid-template-columns:1fr}.jcrc-gate-notice img{width:min(180px,100%);margin:auto}.jcrc-access-toggle{min-height:78px}.jcrc-access-copy img{width:52px;height:52px;flex-basis:52px}}
    `;document.head.appendChild(st);
  }

  function blockMarkup(){return `<section id="jc_reseller_credit_block" data-jc-function-id="reseller.credit.open" data-jc-function-category="Revenda por Créditos" data-jc-function-name="Revenda por Créditos" data-jc-action-kind="entry" data-jc-order="9999">
    <button class="activation-full-toggle jcrc-main-toggle jcrc-access-toggle" id="jcrc_toggle" type="button" aria-controls="jcrc_body" aria-expanded="false"><span class="jcrc-access-copy"><img src="../assets/geradores/revenda-operacional.webp" alt=""><span>• MENU DO REVENDEDOR • <strong>Abrir Revenda por Créditos</strong></span></span><b id="jcrc_toggle_icon">▾</b></button>
    <div class="jcrc-gate-notice" id="jcrc_gate_notice" aria-hidden="true"><div><h3>Área operacional da revenda</h3><p>Cadastre clientes, confira as funções autorizadas pelo ADM e libere somente o que pertence ao saldo do revendedor. Os dados reais serão carregados apenas depois desta orientação.</p><b id="jcrc_gate_count">Abrindo em 10 segundos...</b></div><img src="../assets/geradores/revenda-operacional.webp" alt="Mini tela da operação de revenda"></div>
    <div class="jcrc-body" id="jcrc_body" aria-hidden="true">
      <div class="jcrc-head"><div><h2>REVENDA POR CRÉDITOS</h2><p>Envie o link de cadastro para o cliente e, depois que ele preencher, libere somente as funções que o ADM deixou para este revendedor. Mensal, teste e vitalício continuam bloqueados na revenda.</p></div><span class="jcrc-badge">HIERARQUIA PROTEGIDA</span></div>
      <div class="jcrc-sim">
        <article class="jcrc-sim-card"><b>1. Enviar cadastro</b><span>O revendedor manda o link e o cliente preenche o próprio formulário, igual no fluxo do ADM.</span></article>
        <article class="jcrc-sim-card"><b>2. Liberar cadastro</b><span>O cadastro recebido aparece para aprovação, com funções limitadas ao que o ADM liberou para o revendedor.</span></article>
        <article class="jcrc-sim-card"><b>3. Saldo separado</b><span>Os créditos só entram na liberação depois do cadastro. A tela mostra somente CONFIG, downloads e Ativador 11/16 liberados pelo ADM.</span></article>
      </div>
      <div class="jcrc-lock" id="jcrc_lock">Esta é uma demonstração. A operação real aparece somente para contas com a função <b>Revenda por Créditos</b> liberada.</div>
      <div class="jcrc-real" id="jcrc_real">
        <div class="jcrc-balance-list" id="jcrc_balances"></div><div class="jcrc-actions"><button type="button" class="jcrc-btn blue" id="jcrc_load_data">🔄 CARREGAR DADOS DA REVENDA</button></div>
        <div class="jcrc-tabs"><button class="jcrc-tab active" data-jcrc-pane="register">Enviar cadastro</button><button class="jcrc-tab" data-jcrc-pane="function">Liberar cadastro</button></div>
        <div class="jcrc-pane active" data-jcrc-content="register">
          <div class="jcrc-register-note">Envie o link para o cliente preencher o próprio cadastro. Nenhum crédito é pedido nessa etapa; o cadastro aparece para o revendedor liberar, sem passar pelo ADM.</div>
          <div class="jcrc-grid" style="margin-bottom:10px"><div class="jcrc-field"><label>ENVIAR PELO WHATSAPP</label><button type="button" class="jcrc-btn blue" id="jcrc_send_invite">Abrir WhatsApp com link de cadastro</button><small>Não precisa informar número. O WhatsApp abre e você escolhe o contato.</small></div><div class="jcrc-field"><label>LINK DE CADASTRO DA SUA REVENDA</label><input id="jcrc_cadastro_link" readonly placeholder="Carregando link da revenda..."></div></div>
          <div class="jcrc-actions"><button class="jcrc-btn dark" id="jcrc_copy_link" type="button">Copiar link de cadastro</button><a class="jcrc-btn blue" id="jcrc_open_form" href="../formulario-revenda-cliente.html" target="_blank" rel="noopener">Abrir formulário</a><a class="jcrc-btn dark" id="jcrc_admin_clients_link" href="../painel-clientes.html" target="_blank" rel="noopener">Abrir cadastro completo do ADM</a></div>
        </div>
        <div class="jcrc-pane" data-jcrc-content="function">
          <div class="jcrc-grid"><div class="jcrc-field jcrc-full"><label>CLIENTE</label><select id="jcrc_function_client"></select></div><div class="jcrc-full" id="jcrc_function_tree"></div><div class="jcrc-summary jcrc-full" id="jcrc_function_summary">Carregue os dados para escolher as funções.</div></div>
          <div class="jcrc-actions"><button class="jcrc-btn blue" id="jcrc_release_function">Liberar cadastro</button></div>
        </div>
        <div class="jcrc-status" id="jcrc_status"></div><div class="jcrc-history">Abrir a tela não altera saldo. O desconto ocorre somente quando a liberação é confirmada pelo fluxo protegido da revenda.</div>
      </div>
    </div>
  </section>`;}

  function closeOtherMainSections(){
    if(window.JC_GENERATOR_UI){window.JC_GENERATOR_UI.setMainSectionClosed('activation',true);window.JC_GENERATOR_UI.setMainSectionClosed('package',true);}
    document.dispatchEvent(new CustomEvent('jc:main-section-open',{detail:{section:'reseller'}}));
  }
  function bindCollapsible(toggle,body,icon){
    if(!toggle||!body||toggle.dataset.jcrcBound==='1')return;
    toggle.dataset.jcrcBound='1';
    const notice=$('jcrc_gate_notice'),count=$('jcrc_gate_count');
    const setOpen=(open,announce)=>{clearInterval(state.menuTimer);state.menuTimer=null;if(!open){body.classList.remove('is-open');body.setAttribute('aria-hidden','true');notice?.classList.remove('is-open');notice?.setAttribute('aria-hidden','true');toggle.setAttribute('aria-expanded','false');if(icon)icon.textContent='▾';return;}closeOtherMainSections();toggle.setAttribute('aria-expanded','true');if(icon)icon.textContent='▴';notice?.classList.add('is-open');notice?.setAttribute('aria-hidden','false');body.classList.remove('is-open');let remaining=10;if(count)count.textContent=`Abrindo em ${remaining} segundos...`;state.menuTimer=setInterval(()=>{remaining-=1;if(count)count.textContent=remaining>0?`Abrindo em ${remaining} segundos...`:'Área operacional liberada.';if(remaining<=0){clearInterval(state.menuTimer);state.menuTimer=null;notice?.classList.remove('is-open');notice?.setAttribute('aria-hidden','true');body.classList.add('is-open');body.setAttribute('aria-hidden','false');if(announce&&toggle.id==='jcrc_toggle')loadRealData(false).catch(e=>status(e.message||'Não foi possível carregar a revenda.',true));}},1000);};
    toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true',true));
    document.addEventListener('jc:main-section-open',event=>{if(event.detail?.section!=='reseller')setOpen(false,false);});
    setOpen(false,false);
  }
  function setupResellerCollapsibles(){
    const demoBody=document.querySelector('#jc_reseller_credit_demo_card .jc-reseller-credit-body');
    if(demoBody){demoBody.classList.add('is-open');demoBody.setAttribute('aria-hidden','false');}
    bindCollapsible($('jcrc_toggle'),$('jcrc_body'),$('jcrc_toggle_icon'));
  }

  function insertAdminTrackingMenu(){
    injectStyles();
    if($('jc_reseller_admin_tracking_menu'))return;
    const demo=$('jc_reseller_credit_demo_card');
    const html=`<section id="jc_reseller_admin_tracking_menu" class="jcrc-admin-menu"><button id="jcrc_admin_tracking_toggle" class="jcrc-access-toggle" type="button"><span class="jcrc-access-copy"><img src="../assets/geradores/revenda-acompanhamento-adm.webp" alt=""><span>• ACOMPANHAMENTO ADM • <strong>Revendedores, clientes e históricos</strong></span></span><b>ABRIR ↗</b></button><div class="jcrc-gate-notice" id="jcrc_admin_gate" aria-hidden="true"><div><h3>Acompanhamento administrativo</h3><p>Consulte vendedores, clientes vinculados, permissões, créditos e históricos sem misturar essa visão com a operação diária do revendedor.</p><b id="jcrc_admin_gate_count">Abrindo em 10 segundos...</b></div><img src="../assets/geradores/revenda-acompanhamento-adm.webp" alt="Mini tela do acompanhamento administrativo"></div></section>`;
    if(demo)demo.insertAdjacentHTML('afterend',html);else (document.querySelector('.wrapper')||document.body).insertAdjacentHTML('beforeend',html);
    const button=$('jcrc_admin_tracking_toggle'),gate=$('jcrc_admin_gate'),count=$('jcrc_admin_gate_count');
    button.onclick=()=>{clearInterval(state.adminTimer);gate.classList.add('is-open');gate.setAttribute('aria-hidden','false');let remaining=10;count.textContent=`Abrindo em ${remaining} segundos...`;state.adminTimer=setInterval(()=>{remaining-=1;count.textContent=remaining>0?`Abrindo em ${remaining} segundos...`:'Abrindo acompanhamento...';if(remaining<=0){clearInterval(state.adminTimer);location.href='../painel-clientes.html?secao=revendedores';}},1000);};
  }

  function insertBlock(){
    injectStyles();if($('jc_reseller_credit_block'))return;
    const footer=document.querySelector('.wrapper > .footer')||document.querySelector('.footer');
    if(footer)footer.insertAdjacentHTML('beforebegin',blockMarkup());
    else (document.querySelector('.wrapper')||document.body).insertAdjacentHTML('beforeend',blockMarkup());
    document.querySelectorAll('[data-jcrc-pane]').forEach(btn=>btn.onclick=()=>{
      document.querySelectorAll('[data-jcrc-pane]').forEach(x=>x.classList.toggle('active',x===btn));
      document.querySelectorAll('[data-jcrc-content]').forEach(x=>x.classList.toggle('active',x.dataset.jcrcContent===btn.dataset.jcrcPane));
    });
    $('jcrc_package')?.addEventListener('change',renderPackageSummary);
    $('jcrc_sell_package')?.addEventListener('click',sellPackage);
    $('jcrc_release_function')?.addEventListener('click',releaseFunctions);
    $('jcrc_send_invite')?.addEventListener('click',sendCadastroInvite);
    $('jcrc_copy_link')?.addEventListener('click',copyCadastroLink);
    $('jcrc_load_data')?.addEventListener('click',()=>loadRealData(true));
    setupResellerCollapsibles();
  }

  async function loadPackages(){
    let rows=[];
    try{const {data,error}=await A.client.rpc('jc_get_sales_packages');if(error)throw error;rows=normalizeRows(data);}catch(_){const {data,error}=await A.client.from('jc_sales_packages').select('*').eq('status','active').order('sort_order');if(error)throw error;rows=data||[];}
    state.packages=rows.filter(packageAllowed);
  }
  async function loadClients(){
    const p=context()?.profile;
    if(!p?.id)return;
    if(isAdmin()){
      const {data,error}=await A.client.from('profiles').select('id,username,full_name,whatsapp,whatsapp2,whatsapp3,status,reseller_parent_id').neq('role','admin').eq('status','active').order('full_name');if(error)throw error;state.clients=data||[];
    }else{
      const {data,error}=await A.client.from('profiles').select('id,username,full_name,whatsapp,whatsapp2,whatsapp3,status,reseller_parent_id').eq('reseller_parent_id',p.id).eq('status','active').order('full_name');if(error)throw error;state.clients=data||[];
    }
  }
  async function loadBalances(){
    const {data,error}=await A.client.rpc('jc_reseller_get_product_balances',{p_owner_id:actorId()});if(error)throw error;state.balances=Array.isArray(data?.balances)?data.balances:[];
  }
  function renderFunctionTree(){
    const host=$('jcrc_function_tree');if(!host)return;
    state.sellableFunctions=(context()?.functions||[]).filter(sellableFunction);
    const groups=groupedFunctions(state.sellableFunctions);
    if(!groups.length){
      host.innerHTML='<div class="jcrc-register-note">Nenhuma função disponível para revenda. Peça ao ADM para liberar funções para este revendedor.</div>';
      renderFunctionSummary();return;
    }
    host.innerHTML=`<div class="jcrc-perm-tree">${groups.map(g=>`<div class="jcrc-perm-group jcrc-group-${esc(g.id)}"><div class="jcrc-perm-head"><div><strong>${esc(g.name)}</strong><small>${g.items.length} função(ões) disponível(is)</small></div><label class="jcrc-check"><input type="checkbox" data-jcrc-group-all="${esc(g.id)}"><span>marcar tudo</span></label></div>${g.items.map(f=>{const key=productKeyForFunction(f),cost=effectiveCreditCost(f);return `<label class="jcrc-check"><input type="checkbox" data-jcrc-function-check data-group="${esc(g.id)}" value="${esc(f.id)}"><span><b>${esc(actionLabelForFunction(f,g.id))}</b><small>${esc(g.name)} • ${esc(key)} • desconto ${cost} crédito(s)</small></span></label>`;}).join('')}</div>`).join('')}</div>`;
    host.querySelectorAll('[data-jcrc-group-all]').forEach(ch=>{
      const sync=()=>{const items=[...host.querySelectorAll(`[data-jcrc-function-check][data-group="${CSS.escape(ch.dataset.jcrcGroupAll)}"]`)];ch.checked=items.length>0&&items.every(x=>x.checked);ch.indeterminate=items.some(x=>x.checked)&&!items.every(x=>x.checked);};
      ch.onchange=()=>{host.querySelectorAll(`[data-jcrc-function-check][data-group="${CSS.escape(ch.dataset.jcrcGroupAll)}"]`).forEach(x=>x.checked=ch.checked);renderFunctionSummary();sync();};
      host.querySelectorAll(`[data-jcrc-function-check][data-group="${CSS.escape(ch.dataset.jcrcGroupAll)}"]`).forEach(x=>x.addEventListener('change',()=>{sync();renderFunctionSummary();}));
      sync();
    });
    renderFunctionSummary();
  }
  function fillSelects(){
    const clientOptions=state.clients.length?state.clients.map(c=>`<option value="${esc(c.id)}">${esc(clientLabel(c))}${c.whatsapp?' • '+esc(c.whatsapp):''}</option>`).join(''):'<option value="">Nenhum cliente cadastrado</option>';
    ['jcrc_package_client','jcrc_function_client'].forEach(id=>{if($(id))$(id).innerHTML=clientOptions;});
    if($('jcrc_package'))$('jcrc_package').innerHTML=state.packages.length?state.packages.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} — ${Number(p.credit_cost||0)} créditos</option>`).join(''):'<option value="">Nenhum pacote disponível para esta revenda</option>'; 
    const label=x=>normalizeProductKey(x.product_key)==='launcher'?'Launcher':esc(x.product_key);
    const visibleBalances=usableBalances();
    $('jcrc_balances').innerHTML=visibleBalances.length?visibleBalances.map(x=>`<span class="jcrc-balance ${normalizeProductKey(x.product_key)==='launcher'?'launcher':''}">${label(x)}: ${Number(x.balance||0)}</span>`).join(''):'<span class="jcrc-balance">Nenhum saldo disponível para estas funções</span>';
    renderFunctionTree();if($('jcrc_package'))renderPackageSummary();
  }
  function renderPackageSummary(){if(!$('jcrc_package')||!$('jcrc_package_summary'))return;const p=state.packages.find(x=>String(x.id)===String($('jcrc_package')?.value));if(!p){$('jcrc_package_summary').textContent='Nenhum pacote disponível para as permissões atuais do revendedor.';return;}const key=normalizeProductKey(p.product_key||'geral'),saldo=balanceFor(key),cost=Number(p.credit_cost||0),after=saldo-cost;$('jcrc_package_summary').innerHTML=`<b>${esc(p.name)}</b><br>${esc(p.description||'Pacote comercial configurado pelo ADM.')}<br>Produto/saldo: <b>${esc(key)}</b> • Venda sugerida: <b>${money(p.price_brl)}</b> • Custo: <b>${cost} créditos</b> • Saldo após: <b>${after}</b>`;}
  function selectedFunctionIds(){return [...document.querySelectorAll('[data-jcrc-function-check]:checked')].map(x=>x.value);}
  function renderFunctionSummary(){
    const ids=selectedFunctionIds();const box=$('jcrc_function_summary');if(!box)return;
    if(!state.sellableFunctions.length){box.textContent='Nenhuma função disponível para liberar.';return;}
    if(!ids.length){box.innerHTML='Marque uma ou mais funções. Só aparecem funções compradas/liberadas pelo ADM para este revendedor, separadas por categoria.';return;}
    const selected=ids.map(id=>state.sellableFunctions.find(f=>f.id===id)).filter(Boolean);
    const totals={};selected.forEach(f=>{const key=productKeyForFunction(f);totals[key]=(totals[key]||0)+effectiveCreditCost(f);});
    const lines=Object.entries(totals).map(([key,total])=>{const after=balanceFor(key)-total;return `${esc(key)}: desconto <b>${total}</b> crédito(s) • saldo após: <b>${after}</b>`;}).join('<br>');
    box.innerHTML=`<b>${selected.length} função(ões) marcada(s)</b><br>${lines}<br><small>Só aparecem CONFIG/Acesse Aqui, Ativador 11/16 e downloads/produtos liberados pelo ADM.</small>`;
  }
  function setBusy(button,busy,label){if(!button)return;if(!button.dataset.label)button.dataset.label=button.textContent;button.disabled=busy;button.textContent=busy?label:button.dataset.label;}
  function cadastroFormPath(){return window.location.pathname.includes('/geradores/')?'../formulario-revenda-cliente.html':'formulario-revenda-cliente.html';}
  function resellerCadastroUrl(){
    const p=context()?.profile||{};
    const url=new URL(cadastroFormPath(), window.location.href);
    url.searchParams.set('revendedor',p.id||'');
    url.searchParams.set('r',p.id||'');
    url.searchParams.set('nome_revendedor',p.full_name||p.username||'');
    const phone=normalizePhone(p.whatsapp||p.whatsapp2||p.whatsapp3||'');
    if(phone)url.searchParams.set('contato',phone);
    return url.toString();
  }
  function refreshCadastroLink(){
    const link=resellerCadastroUrl();
    if($('jcrc_cadastro_link'))$('jcrc_cadastro_link').value=link;
    if($('jcrc_open_form'))$('jcrc_open_form').href=link;
    return link;
  }
  function cadastroInviteMessage(){
    const p=context()?.profile||{};
    const reseller=p.full_name||p.username||'revendedor JC-APK TV';
    const link=refreshCadastroLink();
    return `Olá! Sou ${reseller}, revendedor JC-APK TV. Para fazer seu cadastro por créditos, acesse o link abaixo e preencha seus dados:

${link}

Depois que você enviar o cadastro, eu confiro no painel, libero as funções combinadas e coloco os créditos.`;
  }
  function sendCadastroInvite(){
    window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(cadastroInviteMessage()),'_blank');
  }
  function copyCadastroLink(){
    const link=refreshCadastroLink();
    navigator.clipboard?.writeText(link).then(()=>status('Link de cadastro copiado.')).catch(()=>{prompt('Copie o link de cadastro:',link);});
  }

  async function registerCreditClient(){
    const btn=$('jcrc_register_client');
    const name=$('jcrc_new_name')?.value.trim()||'';
    const username=$('jcrc_new_username')?.value.trim()||usernameFromName(name);
    const email=$('jcrc_new_email')?.value.trim()||'';
    const whatsapp=normalizePhone($('jcrc_new_whatsapp')?.value);
    const notes=$('jcrc_new_notes')?.value.trim()||'';
    if(isAdmin()){status('No acesso ADM, use “Abrir cadastro completo do ADM” para criar a senha e testar o acesso com segurança.',true);return;}
    if(!name||!username||!email||whatsapp.length<12){status('Preencha nome, usuário, e-mail e WhatsApp com DDD.',true);return;}
    if(!confirm(`Cadastrar ${name} como cliente por créditos dentro da sua hierarquia?`))return;
    setBusy(btn,true,'Cadastrando...');
    try{
      const {data,error}=await A.client.rpc('reseller_submit_sale',{
        p_sale_kind:'new',p_client_user_id:null,p_username:username,p_full_name:name,p_email:email,
        p_whatsapp:whatsapp,p_whatsapp2:'',p_whatsapp3:'',p_account_type:'credits',
        p_plan_months:0,p_credits_quantity:0,p_customer_price:0,
        p_notes:[notes,'Cadastro simplificado pela Revenda por Créditos: somente dados do cliente, sem crédito inicial automático.'].filter(Boolean).join(' — ')
      });
      if(error)throw error;
      ['jcrc_new_name','jcrc_new_username','jcrc_new_email','jcrc_new_whatsapp','jcrc_new_notes'].forEach(id=>{if($(id))$(id).value='';});
      status(data?.message||(data?.status==='created'?'Cliente cadastrado. Atualizando a lista...':'Cadastro enviado pelo fluxo protegido da revenda. Assim que ficar ativo, aparecerá nas listas.'));
      await loadClients();fillSelects();
    }catch(e){status(e.message||'Não foi possível cadastrar o cliente.',true);}
    finally{setBusy(btn,false);}
  }
  async function sellPackage(){if(!state.packages.length||!state.clients.length)await loadRealData(true);const btn=$('jcrc_sell_package'),clientId=$('jcrc_package_client')?.value,packageId=$('jcrc_package')?.value;if(!clientId||!packageId)return status('Escolha cliente e pacote.',true);const p=state.packages.find(x=>String(x.id)===String(packageId));if(!packageAllowed(p))return status('Este pacote não está liberado para este revendedor.',true);if(!confirm('Confirmar esta venda e descontar os créditos configurados?'))return;setBusy(btn,true,'Processando...');try{const {data,error}=await A.client.rpc('jc_reseller_sell_package',{p_payload:{client_id:clientId,package_id:packageId}});if(error)throw error;status(data?.message||'Pacote liberado com sucesso.');await loadBalances();fillSelects();}catch(e){status(e.message||'Não foi possível liberar o pacote.',true);}finally{setBusy(btn,false);}}
  async function callReleaseFunction(clientId,functionId){
    const payload={client_id:clientId,function_id:functionId};
    let lastError=null;
    for(const rpcName of ['jc_reseller_release_function_v61','jc_reseller_release_function']){
      try{
        const {data,error}=await A.client.rpc(rpcName,{p_payload:payload});
        if(error)throw error;
        return data||{message:functionId};
      }catch(e){
        lastError=e;
        if(!/function .* does not exist|could not find the function|schema cache|not found/i.test(String(e?.message||e)))break;
      }
    }
    throw lastError||new Error('Não foi possível liberar a função.');
  }

  async function releaseFunctions(){
    if(!state.sellableFunctions.length||!state.clients.length)await loadRealData(true);
    const btn=$('jcrc_release_function'),clientId=$('jcrc_function_client')?.value,ids=selectedFunctionIds();
    if(!clientId||!ids.length)return status('Escolha cliente e marque pelo menos uma função.',true);
    const allowed=new Set(state.sellableFunctions.map(f=>f.id));
    const blocked=ids.filter(id=>!allowed.has(id));
    if(blocked.length)return status('Existem funções marcadas que não pertencem à liberação deste revendedor. Recarregue a tela.',true);
    if(!confirm(`Confirmar a liberação de ${ids.length} função(ões) para este cliente?`))return;
    setBusy(btn,true,'Liberando...');
    const ok=[],fail=[];
    try{
      for(const functionId of ids){
        try{
          const data=await callReleaseFunction(clientId,functionId);
          ok.push(data?.message||functionId);
        }catch(e){fail.push(functionId+': '+(e.message||'erro'));}
      }
      await loadBalances();fillSelects();
      if(fail.length)status(`${ok.length} função(ões) liberada(s). Falhou: ${fail.join(' | ')}`,true);else status(`${ok.length} função(ões) liberada(s) com sucesso.`);
    }finally{setBusy(btn,false);}
  }
  function status(text,error=false){const el=$('jcrc_status');if(el){el.textContent=text;el.style.color=error?'#ffd0d7':'#baffdc';}}

  async function loadRealData(force=false){
    if(!permitted())return;
    if(!force&&state.packages.length&&state.clients.length)return;
    const btn=$('jcrc_load_data');setBusy(btn,true,'Carregando...');
    try{await Promise.all([loadPackages(),loadClients(),loadBalances()]);fillSelects();status('Revenda por créditos pronta. Funções filtradas pelo que o ADM liberou para este revendedor.');}
    catch(e){status(e.message||'Não foi possível carregar a revenda.',true);}
    finally{setBusy(btn,false);}
  }
  async function activate(contextData){
    state.context=contextData||window.JC_GENERATOR_CONTEXT||{};
    const demo=$('jc_reseller_credit_demo_card');
    if(demo){demo.hidden=false;demo.style.display='';}
    if(isAdmin()){
      insertBlock();
      const real=$('jc_reseller_credit_block');
      if(real&&demo?.parentNode)demo.parentNode.insertBefore(real,demo.nextSibling);
      insertAdminTrackingMenu();
      setupResellerCollapsibles();
      $('jcrc_lock').style.display='none';
      $('jcrc_real').classList.add('show');
      if($('jcrc_admin_clients_link'))$('jcrc_admin_clients_link').style.display='inline-flex';
      refreshCadastroLink();
      $('jcrc_balances').innerHTML='<span class="jcrc-balance">Abra o submenu operacional para carregar os dados.</span>';
      status('ADM: use o acompanhamento para ver todos os revendedores ou abra o submenu operacional para conferir o fluxo atual.');
      return;
    }
    $('jc_reseller_admin_tracking_menu')?.remove();
    if(!permitted()){
      $('jc_reseller_credit_block')?.remove();
      setupResellerCollapsibles();
      return;
    }
    insertBlock();
    const real=$('jc_reseller_credit_block');
    if(real&&demo?.parentNode)demo.parentNode.insertBefore(real,demo.nextSibling);
    setupResellerCollapsibles();
    $('jcrc_lock').style.display='none';
    $('jcrc_real').classList.add('show');
    if($('jcrc_admin_clients_link'))$('jcrc_admin_clients_link').style.display='none';
    refreshCadastroLink();
    $('jcrc_balances').innerHTML='<span class="jcrc-balance">Abra o menu para carregar o saldo real da revenda.</span>';
    status('Área real pronta. Os dados serão carregados somente quando você abrir este menu.');
  }
  function init(){document.addEventListener('jc:access-ready',e=>activate(e.detail),{once:false});if(window.JC_GENERATOR_CONTEXT?.mode)activate(window.JC_GENERATOR_CONTEXT);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
