(function(){
  'use strict';
  const A=window.JC_APP;
  const PATCH_VERSION='CRIACAO-ADM-REVENDA-SEGURA-20260716';
  window.JC_RESELLER_PATCH_VERSION=PATCH_VERSION;
  console.info('[JC Revenda] correção carregada:',PATCH_VERSION);
  const $=(id)=>document.getElementById(id);
  let data=null;
  let externalCadastroRequests=[];
  let externalCadastroLoadError='';
  let balances=[];
  let commercialSettings={fee_percent:0.5,surcharge_per_50:0.5,tier_free_until:10,tier_first_max:50,tier_size_after:50};
  let customerBalanceTotals=new Map();
  let activePendingRequest=null;
  let activeClient=null;
  let activeClientBalances=[];
  let activeClientPermissionIds=new Set();
  let lastCreatedClientPassword='';
  let releaseInProgress=false;
  let clientControlRpcAvailable=true;
  const DEFAULT_CLIENT_PASSWORD='JC-APK TV';
  const LAUNCHER_RESELL_IDS=['reseller.launcher.resell','launcher.resell','launcher.reseller','launcher.credits.resell','reseller.launcher.open'];

  const esc=(v)=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const digits=(v)=>{let p=String(v||'').replace(/\D/g,'');if(p&&p.length<=11)p='55'+p;return p.slice(0,13);};
  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
  function truthyFlag(v){return v===true||['true','1','yes','sim'].includes(String(v??'').toLowerCase());}
  function resolvedStatus(v){return ['created','approved','used','rejected','cancelled','discarded'].includes(String(v??'').toLowerCase());}
  function resolvedRequestStorageKey(){return 'jc_reseller_resolved_requests_'+String(data?.profile?.id||'sem-revendedor');}
  function locallyResolvedRequestIds(){try{const raw=JSON.parse(localStorage.getItem(resolvedRequestStorageKey())||'{}');return raw&&typeof raw==='object'?raw:{};}catch(_){return {};}}
  function rememberResolvedRequest(requestId,status){
    if(!requestId)return;
    try{
      const rows=locallyResolvedRequestIds();
      rows[String(requestId)]={status:String(status||'resolved'),at:new Date().toISOString()};
      const entries=Object.entries(rows).sort((a,b)=>String(b[1]?.at||'').localeCompare(String(a[1]?.at||''))).slice(0,500);
      localStorage.setItem(resolvedRequestStorageKey(),JSON.stringify(Object.fromEntries(entries)));
    }catch(_){}
  }
  function isLocallyResolvedRequest(row){const id=String(row?.request_id||row?.id||'');return Boolean(id&&locallyResolvedRequestIds()[id]);}
  function technicalAuthEmail(sale){
    const normalize=(value)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,28);
    const local=normalize(sale?.username||sale?.full_name||'cliente')||'cliente';
    const request=normalize(String(sale?.request_id||sale?.id||Date.now()).replace(/^request[._-]?/i,''))||String(Date.now());
    const projectHost=String(A?.cfg?.url||'').replace(/^https?:\/\//i,'').replace(/\/.*$/,'')||'iwavyzzdrhbwmjjjxehr.supabase.co';
    return `jc.${local}.${request.slice(-18)}@${projectHost}`.slice(0,180);
  }
  function authLoginEmail(c){return String(c?.login_email||c?.auth_email||c?.email||'').trim().toLowerCase();}
  function isTechnicalEmail(value){return /^jc\.[^@]+@[^@]+\.supabase\.co$/i.test(String(value||'').trim());}
  function contactEmailOf(c){
    const value=String(c?.contact_email||c?.original_contact_email||c?.payload?.email||c?.email||'').trim();
    return isTechnicalEmail(value)?'':value;
  }
  function missingRpcMessage(message){return /function .* does not exist|could not find the function|schema cache|not found/i.test(String(message||''));}
  async function resellerClientControl(action,clientId,extra={}){
    if(!clientId)throw new Error('Cliente não informado.');
    const payload={action:String(action||'details'),client_id:clientId,...extra};
    const {data:result,error}=await A.client.rpc('jc_reseller_client_manage_v4',{p_payload:payload});
    if(error){
      const msg=String(error.message||error);
      if(missingRpcMessage(msg)){
        clientControlRpcAvailable=false;
        throw new Error('Execute uma vez o arquivo SQL-FINAL-ADM-REVENDA-FUNCIONAL.sql no mesmo Supabase do painel. Detalhe: '+msg);
      }
      throw error;
    }
    if(result&&result.ok===false)throw new Error(result.error||result.message||'O Supabase recusou a operação.');
    return result||{};
  }
  async function repairClientLoginMapping(c,{silent=true,password=''}={}){
    if(!c?.id)return c;
    try{
      const action=String(password||'').length>=8?'reset_login':'details';
      const result=await resellerClientControl(action,c.id,password?{password:String(password)}:{});
      const profile=result?.profile||{};
      Object.assign(c,profile);
      const loginEmail=String(result?.login_email||profile?.email||'').trim().toLowerCase();
      const contactEmail=String(result?.contact_email||profile?.contact_email||c?.contact_email||c?.original_contact_email||'').trim().toLowerCase();
      if(loginEmail){c.login_email=loginEmail;c.auth_email=loginEmail;}
      if(contactEmail){c.contact_email=contactEmail;c.original_contact_email=contactEmail;}
      return c;
    }catch(e){
      if(missingRpcMessage(e?.message||e)){
        clientControlRpcAvailable=false;
        if(!silent)throw new Error('Execute uma vez o arquivo SQL-FINAL-ADM-REVENDA-FUNCIONAL.sql no mesmo Supabase do painel.');
        return c;
      }
      if(!silent)throw e;
      console.warn('Correção do login do cliente:',e?.message||e);
      return c;
    }
  }
  async function repairLoadedCustomerLogins(){
    const rows=(data?.customers||[]).filter(c=>c?.id).slice(0,100);
    for(let i=0;i<rows.length&&clientControlRpcAvailable;i+=6){
      await Promise.all(rows.slice(i,i+6).map(c=>repairClientLoginMapping(c,{silent:true})));
    }
  }
  function isResolvedRequestRow(r){
    const p=r?.payload||{};
    return resolvedStatus(r?.status)
      || resolvedStatus(p.reseller_request_status)
      || resolvedStatus(p.reseller_status)
      || truthyFlag(p.reseller_discarded)
      || truthyFlag(p.reseller_used)
      || truthyFlag(p.discarded)
      || truthyFlag(p.used);
  }

  function collectIdsDeep(obj,out=new Set(),depth=0){
    if(!obj||depth>4)return out;
    if(Array.isArray(obj)){obj.forEach(x=>collectIdsDeep(x,out,depth+1));return out;}
    if(typeof obj==='object'){
      Object.entries(obj).forEach(([k,v])=>{
        if(/(^id$|_id$|client|user)/i.test(k)&&['string','number'].includes(typeof v)&&String(v).trim())out.add(String(v));
        if(v&&typeof v==='object')collectIdsDeep(v,out,depth+1);
      });
    }
    return out;
  }
  function toast(t,bad=false){A?.toast?A.toast(t,bad?'error':'ok'):alert(t);}
  function activatePane(paneId){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.pane===paneId));document.querySelectorAll('.pane').forEach(x=>x.classList.toggle('active',x.id===paneId));}
  function setView(ok){$('loginView')?.classList.toggle('hidden',ok);$('appView')?.classList.toggle('hidden',!ok);$('logoutBtn')?.classList.toggle('hidden',!ok);}
  function visibleBalances(){return balances.filter(x=>String(x?.product_key||'').toLowerCase()!=='launcher'||canResellLauncher());}
  function productBalanceTotal(){return visibleBalances().reduce((sum,x)=>sum+Number(x.balance||0),0);}
  function normalizeCommercialSettings(cfg){const legacy=Number(cfg?.tier_every_clients||10)===10&&Number(cfg?.fee_percent??1)===1&&!('tier_free_until' in (cfg||{}));return {fee_percent:legacy?0.5:Number(cfg?.fee_percent??0.5),surcharge_per_50:Number(cfg?.surcharge_per_50??cfg?.surcharge_per_10??0.5),tier_free_until:Number(cfg?.tier_free_until??10),tier_first_max:Number(cfg?.tier_first_max??50),tier_size_after:Number(cfg?.tier_size_after??50)};}
  function resellerMonthlyRate(count){count=Number(count||0);if(count<=Number(commercialSettings.tier_free_until||10))return 0;if(count<=Number(commercialSettings.tier_first_max||50))return Number(commercialSettings.fee_percent||0.5);const step=Math.max(1,Number(commercialSettings.tier_size_after||50));return Number((Number(commercialSettings.fee_percent||0.5)+Number(commercialSettings.surcharge_per_50||0.5)+(Math.floor((count-Number(commercialSettings.tier_first_max||50)-1)/step)*Number(commercialSettings.surcharge_per_50||0.5))).toFixed(2));}
  function directCreditBalance(c){return Math.max(0,Number(c?.credits_balance||0)+Number(c?.credit_balance||0)+Number(c?.product_credit_balance||0)+Number(c?.product_credits_balance||0));}
  function customerCreditBalance(c){return directCreditBalance(c)+Math.max(0,Number(customerBalanceTotals.get(c?.id)||0));}
  function visibleCustomers(){return (data?.customers||[]).filter(c=>c?.id&&!c?.archived_at&&String(c?.status||'active')==='active');}
  function activeCreditCustomers(){return visibleCustomers().filter(c=>customerCreditBalance(c)>0).length;}
  async function loadCustomerBalanceTotals(){customerBalanceTotals=new Map();const customers=(data?.customers||[]).filter(c=>String(c?.status||'')==='active'&&c?.id);for(let i=0;i<customers.length;i+=8){const chunk=customers.slice(i,i+8);const res=await Promise.allSettled(chunk.map(c=>A.client.rpc('jc_reseller_get_product_balances',{p_owner_id:c.id})));res.forEach((r,idx)=>{const c=chunk[idx];if(r.status==='fulfilled'&&!r.value?.error){const total=(r.value.data?.balances||[]).reduce((sum,x)=>sum+Math.max(0,Number(x.balance||0)),0);customerBalanceTotals.set(c.id,total);}});}}
  async function loadCommercialSettings(){try{const {data:row,error}=await A.client.from('links_catalog').select('value').eq('id','reseller_commercial_settings').maybeSingle();if(error)throw error;let cfg={};try{cfg=JSON.parse(String(row?.value||'{}'));}catch(_){cfg={};}commercialSettings=normalizeCommercialSettings(cfg);}catch(e){console.warn('Regra comercial da revenda:',e.message||e);}}

  async function loadExternalCadastroRequests(){
    externalCadastroRequests=[];
    externalCadastroLoadError='';
    const profile=data?.profile||{};
    const resellerId=String(profile.id||'');
    const resellerUsername=String(profile.username||'').toLowerCase();
    const resellerName=String(profile.full_name||'').toLowerCase();
    const resellerPhones=[profile.whatsapp,profile.whatsapp2,profile.whatsapp3].map(digits).filter(Boolean);
    if(!resellerId)return;
    const belongsToThisReseller=(r)=>{
      const p=r?.payload||{};
      const source=String(p.source||p.reseller_source||r?.source||r?.reseller_source||'');
      if(source&&source!=='reseller_public_form')return false;
      const rowResellerId=String(p.reseller_id||r?.reseller_id||r?.owner_id||'');
      if(rowResellerId&&rowResellerId===resellerId)return true;
      const rowUsername=String(p.reseller_username||r?.reseller_username||'').toLowerCase();
      if(resellerUsername&&rowUsername===resellerUsername)return true;
      const rowName=String(p.reseller_name||r?.reseller_name||'').toLowerCase();
      if(resellerName&&rowName===resellerName)return true;
      const contact=digits(p.reseller_contact||p.contato||r?.reseller_contact||r?.contato||'');
      return Boolean(contact&&resellerPhones.includes(contact));
    };
    const acceptRows=(rows,alreadyScoped=false)=>{
      const seen=new Set();
      const hasResellerMarker=(r)=>{const p=r?.payload||{};return Boolean(p.reseller_id||p.reseller_username||p.reseller_name||p.reseller_contact||r?.reseller_id||r?.reseller_username||r?.reseller_name||r?.reseller_contact);};
      externalCadastroRequests=(rows||[])
        .filter(r=>belongsToThisReseller(r)||(alreadyScoped&&!hasResellerMarker(r)))
        .filter(r=>!isResolvedRequestRow(r))
        .filter(r=>!isLocallyResolvedRequest(r))
        .map(normalizeExternalCadastro)
        .filter(r=>{const k=String(r.request_id||r.id);if(seen.has(k))return false;seen.add(k);return true;});
    };
    try{
      const {data:rows,error}=await A.client.rpc('jc_reseller_pending_client_requests_v3',{p_reseller_id:resellerId});
      if(error)throw error;
      // A versão v3 já recebe o ID do revendedor e deve devolver somente os pedidos dele.
      acceptRows(rows||[],true);
      return;
    }catch(e){
      externalCadastroLoadError=e?.message||String(e||'');
    }
    try{
      const {data:rows,error}=await A.client.rpc('jc_reseller_pending_client_requests');
      if(error)throw error;
      acceptRows(rows||[]);
      externalCadastroLoadError='';
      return;
    }catch(e){
      externalCadastroLoadError=e?.message||externalCadastroLoadError||String(e||'');
    }
    try{
      const {data:rows,error}=await A.client.from('client_requests')
        .select('*')
        .eq('request_type','client')
        .or('payload->>source.eq.reseller_public_form,payload->>reseller_source.eq.reseller_public_form')
        .filter('payload->>reseller_id','eq',resellerId)
        .order('created_at',{ascending:false})
        .limit(200);
      if(error)throw error;
      acceptRows(rows||[]);
      externalCadastroLoadError='';
      return;
    }catch(e){
      externalCadastroLoadError=e?.message||String(e||'');
    }
    try{
      const {data:rows,error}=await A.client.from('client_requests').select('*').eq('request_type','client').order('created_at',{ascending:false}).limit(300);
      if(error)throw error;
      acceptRows(rows||[]);
      externalCadastroLoadError='';
    }catch(err){
      console.warn('Cadastros públicos da revenda:',err.message||err);
      externalCadastroLoadError=err?.message||externalCadastroLoadError||'Não foi possível carregar as solicitações da revenda.';
    }
  }
  function pendingCreditRequests(){
    const rows=[...(externalCadastroRequests||[]),...((data?.sales||[]).filter(x=>String(x.account_type)==='credits'&&!isResolvedRequestRow(x)))];
    const seen=new Set();
    return rows.filter(x=>{const k=String(x._source||'sale')+'|'+String(x.request_id||x.id||'')+'|'+String(x.email||'')+'|'+String(x.username||'');if(seen.has(k))return false;seen.add(k);return true;});
  }

  function normalizeExternalCadastro(row){
    const p=row?.payload&&typeof row.payload==='object'?row.payload:{};
    const obs=String(p.observacao_revendedor||p.notes||p.note||row?.notes||row?.note||'').trim();
    const rawStatus=String(p.reseller_request_status||p.reseller_status||row?.reseller_request_status||row?.reseller_status||row?.status||'pending').toLowerCase();
    const requestId=row?.request_id||row?.id;
    return {id:'request_'+requestId,_source:'client_requests',request_id:requestId,reseller_id:p.reseller_id||row?.reseller_id||null,payload:p,username:row?.username||p.username||'',full_name:row?.full_name||p.full_name||'',email:row?.email||p.email||'',whatsapp:row?.whatsapp||p.whatsapp||'',whatsapp2:row?.whatsapp2||p.whatsapp2||'',whatsapp3:row?.whatsapp3||p.whatsapp3||'',account_type:'credits',plan_months:0,customer_price:0,status:['created','approved','used'].includes(rawStatus)?'created':(['rejected','cancelled','discarded'].includes(rawStatus)?'rejected':'pending'),created_at:row?.created_at||p.created_at||null,notes:obs||'Cadastro recebido pelo link público da revenda'};
  }

  function mergeExternalCadastros(){if(!data)return;const rows=externalCadastroRequests||[];if(!rows.length)return;const sales=data.sales||[];const exists=new Set(sales.map(x=>String((x.email||'')+'|'+(x.username||'')+'|'+(x.whatsapp||''))));rows.forEach(r=>{const key=String((r.email||'')+'|'+(r.username||'')+'|'+(r.whatsapp||''));if(!exists.has(key))sales.unshift(r);});data.sales=sales;}
  function functionIdSet(){return new Set((data?.functions||[]).map(f=>String(f.id||'')));}
  function canResellLauncher(){const set=functionIdSet();return LAUNCHER_RESELL_IDS.some(id=>set.has(id));}
  function isLauncherFunction(f){const id=String(f?.id||'').toLowerCase(),gid=String(f?.group_id||'').toLowerCase(),name=String(f?.name||'').toLowerCase();return id.startsWith('launcher.')||gid==='launcher'||name.includes('launcher');}
  function isInternalResellerFunction(f){const id=String(f?.id||'').toLowerCase();return id.startsWith('reseller.')||id.includes('revenda')||id.includes('revendedor');}
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
    const productGroup=productGroupFromText(txt);
    if(productGroup)return productGroup;
    if(id.startsWith('launcher')||gid==='launcher'||/launcher/i.test(gname))return {id:'launcher',name:'JC Launcher'};
    if(id.startsWith('config')||gid==='config'||/config|acesse/i.test(gname+' '+f?.name))return {id:'config',name:'CONFIG / Acesse Aqui'};
    if(id.startsWith('package.')||gid==='packages'||/pacote|apk/i.test(gname+' '+f?.name))return {id:'packages',name:'Outros APKS / Downloads'};
    if(id.startsWith('attendant')||gid==='attendant'||/atendente|\bia\b/i.test(gname+' '+f?.name))return {id:'attendant',name:'Atendente / IA'};
    if(id.startsWith('report')||gid==='reports'||/relat/i.test(gname+' '+f?.name))return {id:'reports',name:'Relatórios'};
    return {id:gid||'other',name:gname||'Outras funções'};
  }
  function sellableFunctions(){
    const allowedGroups=new Set(['config','activator11','activator16','xplus','btv','stv','eaigo','packages']);
    return (data?.functions||[]).filter(f=>{
      if(!f||f.active===false)return false;
      if(isInternalResellerFunction(f))return false;
      const g=groupForFunction(f);
      if(isLauncherFunction(f))return canResellLauncher();
      if(allowedGroups.has(g.id))return true;
      // Evita aparecer coisas soltas como ENTRAR NO SISTEMA, RECOLHER e LIMPAR CONTAGEM para cliente da revenda.
      return false;
    });
  }

  function productKeyForFunction(f){const raw=String(f?.credit_product_key||f?.product_key||'').trim();if(raw)return raw.toLowerCase().replace(/[^a-z0-9_-]/g,'')||'geral';const id=String(f?.id||'').toLowerCase(),txt=functionSearchText(f);const g=productGroupFromText(txt);if(g)return g.id==='activator11'?'ativador11':g.id==='activator16'?'ativador16':g.id;if(id.startsWith('launcher.'))return 'launcher';if(id.startsWith('config.'))return 'config';if(id.startsWith('package.'))return id.split('.')[1]||'apks';return String(f?.group_id||'geral').toLowerCase().replace(/[^a-z0-9_-]/g,'')||'geral';}
  function creditCostForFunction(f){const n=Number(f?.reseller_credit_cost??f?.credit_cost??f?.cost_credits??0);return Number.isFinite(n)&&n>0?Math.ceil(n):1;}
  function actionLabelForFunction(f,groupId){
    const txt=functionSearchText(f);
    const original=String(f?.name||f?.label||f?.id||'Função').trim();
    const isDownload=/(c[oó]digo\s*de\s*download|cod\.?\s*download|download|baixar|apk)/i.test(txt);
    if(groupId==='activator11')return isDownload?'Código de download do APK — Ativador 11':'Gerar código 11 dígitos numérico';
    if(groupId==='activator16')return isDownload?'Código de download do APK — Ativador 16':'Gerar código 16 dígitos numérico';
    if(groupId==='config')return isDownload?'Código de download — CONFIG':'Acesse Aqui — CONFIG';
    const names={xplus:'XPLUS',btv:'BTV',stv:'STV',eaigo:'EAIGO',packages:'Outros APKS / Downloads'};
    if(names[groupId])return isDownload?`Código de download — ${names[groupId]}`:`Liberar ${names[groupId]}`;
    return original;
  }
  function groupHint(g){
    if(g.id==='config')return 'Aparece separado: Acesse Aqui e código de download do CONFIG, se essas funções estiverem liberadas pelo ADM.';
    if(g.id==='activator11')return 'Mostra somente o que pertence ao Ativador 11: código numérico 11 dígitos e/ou código de download do APK.';
    if(g.id==='activator16')return 'Mostra somente o que pertence ao Ativador 16: código numérico 16 dígitos e/ou código de download do APK.';
    if(['xplus','btv','stv','eaigo'].includes(g.id))return 'Produto separado para não misturar com CONFIG, 11 ou 16.';
    return 'Somente funções que o ADM liberou para este revendedor.';
  }
  function groupedFunctions(list){
    const order=['config','activator11','activator16','xplus','btv','stv','eaigo','packages','launcher'];
    const map=new Map();
    list.forEach(f=>{
      const g=groupForFunction(f);
      if(!order.includes(g.id))return;
      if(!map.has(g.id))map.set(g.id,{...g,items:[],_seen:new Set()});
      const label=actionLabelForFunction(f,g.id);
      const normLabel=String(label||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
      const key=[g.id,normLabel].join('|');
      const group=map.get(g.id);
      if(group._seen.has(key))return;
      group._seen.add(key);
      group.items.push(f);
    });
    return [...map.values()].map(g=>{delete g._seen;return {...g,items:g.items.sort((a,b)=>String(actionLabelForFunction(a,g.id)||a.name||'').localeCompare(String(actionLabelForFunction(b,g.id)||b.name||''),'pt-BR'))};}).filter(g=>g.items.length).sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  }


  async function loadBalances(){
    balances=[];
    try{
      const {data:res,error}=await A.client.rpc('jc_reseller_get_product_balances',{p_owner_id:data?.profile?.id});
      if(error)throw error;
      balances=Array.isArray(res?.balances)?res.balances:[];
    }catch(e){
      console.warn('Saldo da revenda:',e.message||e);
    }
  }

  async function load(){
    const {data:d,error}=await A.client.rpc('get_reseller_dashboard');
    if(error)throw error;
    if(!d?.profile||d?.settings?.enabled===false)throw new Error('Sua área de revenda não está liberada ou está bloqueada.');
    data=d;window.JC_RESELLER_DASHBOARD=d;document.dispatchEvent(new CustomEvent('jc:reseller-dashboard-ready',{detail:d}));
    await Promise.all([loadBalances(),loadCommercialSettings(),loadExternalCadastroRequests()]);
    mergeExternalCadastros();
    await loadCustomerBalanceTotals();
    await repairLoadedCustomerLogins();
    setView(true);
    if($('topStatus'))$('topStatus').textContent='Revendedor por créditos: '+(d.profile.full_name||d.profile.username||'');
    if($('welcome'))$('welcome').textContent='Olá, '+(d.profile.full_name||d.profile.username||'');
    await autoCleanupFailedHistory();
    render();
  }

  function render(){
    const customers=visibleCustomers();
    const activeCustomers=activeCreditCustomers();
    if($('statCustomers'))$('statCustomers').textContent=customers.length;
    if($('statPending'))$('statPending').textContent=pendingCreditRequests().length;
    if($('statSales'))$('statSales').textContent=productBalanceTotal().toLocaleString('pt-BR');
    if($('statPlatform'))$('statPlatform').textContent=String((data.functions||[]).length);
    if($('statProfit'))$('statProfit').textContent=resellerMonthlyRate(activeCustomers).toLocaleString('pt-BR')+'%';
    if($('permissionList'))$('permissionList').innerHTML=sellableFunctions().map(f=>`<span>${esc(f.name)}</span>`).join('')||'<span>Nenhuma função liberada</span>';
    renderCreditCadastro();
    renderRequests();
    renderCustomers();
    renderFunctionRelease();
    updateReleaseBalanceSummary();
    renderSales();
    refreshCadastroLink();
  }

  function removeCadastroCreditFields(){
    const pane=$('salePane');if(!pane)return;
    const legacyIds=['saleCredits','saleCreditQuantity','saleInitialCredits','saleCreditBalance','saleCreditsQuantity','initialCredits','creditsQuantity','creditQuantity','saleQuantity','creditosIniciais','quantidadeCreditos'];
    legacyIds.forEach(id=>{const el=$(id);if(!el)return;el.value='0';const field=el.closest('.field');if(field)field.classList.add('hidden');});
    pane.querySelectorAll('.field').forEach(field=>{
      const label=(field.querySelector('label')?.textContent||'').toLowerCase();
      const controls=[...field.querySelectorAll('input,select,textarea')];
      const names=controls.map(el=>`${el.id||''} ${el.name||''} ${el.placeholder||''}`.toLowerCase()).join(' ');
      if(/cr[eé]dito|credit/.test(label+' '+names) && !controls.some(el=>el.id==='saleType')){
        controls.forEach(el=>{if('value' in el)el.value='0';el.required=false;});
        field.classList.add('hidden');
      }
    });
  }

  function renderCreditCadastro(){
    removeCadastroCreditFields();
    if($('saleType')){$('saleType').value='credits';$('saleType').disabled=true;}
    $('salePlanField')?.classList.add('hidden');
    if($('salePrice')){$('salePrice').value='0';$('salePrice').disabled=true;}
    if($('saleCalculation')){$('saleCalculation').innerHTML='';$('saleCalculation').classList.add('hidden');}
  }

  async function submitSale(){
    const username=$('saleUsername')?.value.trim()||'';
    const fullName=$('saleFullName')?.value.trim()||'';
    const email=$('saleEmail')?.value.trim()||'';
    const whatsapp=$('saleWhatsapp')?.value||'';
    if(!username||!fullName||!email||digits(whatsapp).length<12)throw new Error('Preencha usuário, nome, e-mail e WhatsApp com DDD.');
    const body={
      p_sale_kind:'new',
      p_client_user_id:null,
      p_username:username,
      p_full_name:fullName,
      p_email:email,
      p_whatsapp:whatsapp,
      p_whatsapp2:$('saleWhatsapp2')?.value||'',
      p_whatsapp3:$('saleWhatsapp3')?.value||'',
      p_account_type:'credits',
      p_plan_months:0,
      p_credits_quantity:0,
      p_customer_price:0,
      p_notes:[$('saleNotes')?.value||'', 'Cadastro feito pela Revenda por Créditos. A liberação será feita depois pelo revendedor dentro da própria hierarquia.'].filter(Boolean).join(' — ')
    };
    const {data:r,error}=await A.client.rpc('reseller_submit_sale',body);
    if(error)throw error;
    toast(r?.message||'Cadastro enviado. Abra Solicitações para criar e liberar o cliente.');
    ['saleUsername','saleFullName','saleEmail','saleWhatsapp','saleWhatsapp2','saleWhatsapp3','saleNotes'].forEach(id=>{if($(id))$(id).value='';});
    await load();
  }

  function clientPasswordStorageKey(clientId){return 'jc_reseller_client_password_'+String(clientId||'');}
  function rememberClientPassword(clientId,password){
    if(!clientId||!password)return;
    try{sessionStorage.setItem(clientPasswordStorageKey(clientId),String(password));}catch(_){}
  }
  function rememberedClientPassword(clientId){
    try{return sessionStorage.getItem(clientPasswordStorageKey(clientId))||'';}catch(_){return '';}
  }
  function panelAccessUrl(){return A?.cfg?.panelUrl || new URL('geradores/', location.href).href;}
  function selectedClientPhone(c){
    const selected=$('clientAccessWhatsapp')?.value||'';
    return digits(selected||c?.whatsapp||c?.whatsapp2||c?.whatsapp3||'');
  }
  function currentClientFunctionNames(){
    const byId=new Map(sellableFunctions().map(f=>[String(f.id),f.name||actionLabelForFunction(f,groupForFunction(f).id)||f.id]));
    return [...activeClientPermissionIds].map(id=>byId.get(String(id))).filter(Boolean);
  }
  function clientAccessMessage(c,password){
    const names=currentClientFunctionNames();
    const credits=(activeClientBalances||[]).reduce((sum,x)=>sum+Math.max(0,Number(x.balance||0)),0)+directCreditBalance(c);
    const passwordLine=String(password||'').trim()||'use sua senha atual';
    return `Olá, ${c?.full_name||c?.username||'Cliente'}! Seu acesso ao JC-APK TV foi liberado pelo revendedor.

📺 PAINEL JC-APK TV
Link: ${panelAccessUrl()}
Usuário: ${c?.username||''}
Senha: ${passwordLine}

💳 TIPO DE ACESSO: CRÉDITOS
Saldo atual: ${credits.toLocaleString('pt-BR')} crédito(s).

✅ Funções liberadas
${names.length?names.map(n=>'• '+n).join('\n'):'As funções liberadas aparecerão no painel conforme combinado.'}

⚠️ Entre usando o USUÁRIO informado acima. Não use o e-mail de contato.
⚠️ Guarde seus dados de acesso em um local seguro.`;
  }
  function refreshClientAccessPreview(){
    const c=activeClient||activePendingRequest;
    const preview=$('clientAccessPreview');if(!preview)return;
    if(!c){preview.textContent='Selecione ou crie um cliente para mostrar os dados.';return;}
    preview.textContent=clientAccessMessage(c,$('clientAccessPassword')?.value||'');
  }
  async function copyClientAccessData(){
    const c=activeClient||activePendingRequest;if(!c)return toast('Abra um cliente primeiro.',true);
    if(activePendingRequest&&!activeClient)return toast('Finalize o cadastro antes de copiar os dados de acesso.',true);
    const msg=clientAccessMessage(c,$('clientAccessPassword')?.value||'');
    try{await navigator.clipboard.writeText(msg);toast('Dados de acesso copiados.');}catch(_){prompt('Copie os dados de acesso:',msg);}
  }
  function sendClientAccessWhatsApp(){
    const c=activeClient||activePendingRequest;if(!c)return toast('Abra um cliente primeiro.',true);
    if(activePendingRequest&&!activeClient)return toast('Finalize o cadastro antes de enviar os dados.',true);
    const p=selectedClientPhone(c);if(!p)return toast('WhatsApp do cliente não encontrado.',true);
    const msg=clientAccessMessage(c,$('clientAccessPassword')?.value||'');
    window.open('https://wa.me/'+p+'?text='+encodeURIComponent(msg),'_blank');
  }
  async function repairCurrentClientAccess(){
    const c=activeClient;
    if(!c?.id)return toast('Abra um cliente liberado primeiro.',true);
    const password=String($('clientAccessPassword')?.value||'').trim();
    if(password.length<8)return toast('Digite uma senha com pelo menos 8 caracteres.',true);
    if(!confirm(`Corrigir o login de ${c.full_name||c.username||'cliente'} e definir a senha mostrada na ficha?`))return;
    const btn=$('repairClientAccessBtn');
    setButtonBusy(btn,true,'Corrigindo...');
    try{
      await repairClientLoginMapping(c,{silent:false,password});
      rememberClientPassword(c.id,password);
      renderClientSheetDetails(c,false);
      if($('clientAccessPassword'))$('clientAccessPassword').value=password;
      refreshClientAccessPreview();
      toast('Login corrigido. O cliente já pode entrar usando o usuário e esta senha.');
    }finally{setButtonBusy(btn,false);}
  }
  function renderClientPhoneOptions(c){
    const select=$('clientAccessWhatsapp');if(!select)return;
    const rows=[['WhatsApp principal',c?.whatsapp],['WhatsApp 2',c?.whatsapp2],['WhatsApp 3',c?.whatsapp3]].filter(([,v])=>digits(v));
    select.innerHTML=rows.length?rows.map(([label,v])=>`<option value="${esc(digits(v))}">${esc(label)} — ${esc(v)}</option>`).join(''):'<option value="">Nenhum WhatsApp cadastrado</option>';
  }
  function renderClientSheetDetails(c,pending=false){
    const title=$('clientSheetTitle'),subtitle=$('clientSheetSubtitle');
    if(title)title.textContent=pending?'Concluir cadastro de '+(c?.full_name||c?.username||'cliente'):'Cliente: '+(c?.full_name||c?.username||'');
    if(subtitle)subtitle.textContent=pending?'Confira os dados, créditos e funções antes de criar o acesso.':'Consulte o acesso e libere novos créditos ou funções sem refazer o cadastro.';
    if($('clientSheetName'))$('clientSheetName').textContent=c?.full_name||'—';
    if($('clientSheetUsername'))$('clientSheetUsername').textContent='@'+(c?.username||'—');
    if($('clientSheetEmail'))$('clientSheetEmail').textContent=contactEmailOf(c)||'Não informado';
    if($('clientSheetStatus'))$('clientSheetStatus').textContent=pending?'Aguardando criação':(c?.status||'active');
    if($('clientAccessPanel'))$('clientAccessPanel').value=panelAccessUrl();
    if($('clientAccessUsername'))$('clientAccessUsername').value=c?.username||'';
    if($('clientAccessEmail'))$('clientAccessEmail').value=authLoginEmail(c);
    renderClientPhoneOptions(c);
    const password=pending?initialClientPassword():(rememberedClientPassword(c?.id)||initialClientPassword());
    if($('clientAccessPassword'))$('clientAccessPassword').value=password;
    const disabled=pending&&!activeClient;
    if($('copyClientAccessBtn'))$('copyClientAccessBtn').disabled=disabled;
    if($('sendClientAccessWhatsappBtn'))$('sendClientAccessWhatsappBtn').disabled=disabled;
    refreshClientAccessPreview();
  }
  function renderActiveClientBalances(c){
    const rows=activeClientBalances||[];
    const direct=directCreditBalance(c);
    const total=rows.reduce((sum,x)=>sum+Math.max(0,Number(x.balance||0)),0)+direct;
    if($('clientCurrentCreditTotal'))$('clientCurrentCreditTotal').textContent=total.toLocaleString('pt-BR')+' créditos';
    const html=[];
    if(direct>0)html.push(`<div class="balance-chip"><b>${direct.toLocaleString('pt-BR')}</b><small>saldo geral do cadastro</small></div>`);
    rows.forEach(x=>html.push(`<div class="balance-chip"><b>${Math.max(0,Number(x.balance||0)).toLocaleString('pt-BR')}</b><small>${esc(String(x.product_key||'geral'))}</small></div>`));
    if($('clientCreditBalances'))$('clientCreditBalances').innerHTML=html.length?html.join(''):'<div class="balance-chip"><b>0</b><small>sem créditos liberados</small></div>';
  }
  function renderActiveClientPermissions(){
    const box=$('clientCurrentPermissions');if(!box)return;
    const list=sellableFunctions(),names=[...activeClientPermissionIds].map(id=>list.find(f=>String(f.id)===String(id))).filter(Boolean).map(f=>f.name||f.id);
    box.innerHTML=names.length?names.map(n=>`<span>${esc(n)}</span>`).join(''):'<span>Nenhuma função liberada ainda</span>';
  }
  async function loadActiveClientDetails(c){
    activeClient=c?{...c}:null;activeClientBalances=[];activeClientPermissionIds=new Set();
    const localPermissions=Array.isArray(c?.user_permissions)?c.user_permissions:(Array.isArray(c?.permissions)?c.permissions:[]);
    localPermissions.forEach(x=>{const id=typeof x==='string'?x:x?.function_id||x?.id;if(id&&(typeof x==='string'||x?.enabled!==false))activeClientPermissionIds.add(String(id));});
    if(!c?.id){renderClientSheetDetails(c,true);renderActiveClientBalances(c);renderActiveClientPermissions();return;}
    let loadedByControl=false;
    if(clientControlRpcAvailable){
      try{
        const result=await resellerClientControl('details',c.id);
        const profile=result?.profile||{};
        activeClient={...c,...profile};
        const loginEmail=String(result?.login_email||profile?.email||'').trim().toLowerCase();
        if(loginEmail){activeClient.login_email=loginEmail;activeClient.auth_email=loginEmail;}
        const contactEmail=String(result?.contact_email||profile?.contact_email||activeClient?.contact_email||'').trim().toLowerCase();
        if(contactEmail){activeClient.contact_email=contactEmail;activeClient.original_contact_email=contactEmail;}
        activeClientPermissionIds=new Set((Array.isArray(result?.permissions)?result.permissions:[]).filter(x=>x?.enabled!==false&&x?.function_id).map(x=>String(x.function_id)));
        loadedByControl=true;
      }catch(e){
        if(!/SQL-FINAL/i.test(String(e?.message||e)))console.warn('Detalhes do cliente:',e?.message||e);
      }
    }
    if(!loadedByControl){
      try{
        const {data:row,error}=await A.client.from('profiles').select('id,username,full_name,email,whatsapp,whatsapp2,whatsapp3,status,account_type,credits_balance,user_permissions(function_id,enabled)').eq('id',c.id).maybeSingle();
        if(!error&&row){activeClient={...c,...row};(row.user_permissions||[]).filter(x=>x.enabled!==false).forEach(x=>activeClientPermissionIds.add(String(x.function_id)));}
      }catch(_){ }
      if(!activeClientPermissionIds.size){
        try{const {data:rows,error}=await A.client.from('user_permissions').select('function_id,enabled').eq('user_id',c.id);if(!error)(rows||[]).filter(x=>x.enabled!==false).forEach(x=>activeClientPermissionIds.add(String(x.function_id)));}catch(_){ }
      }
      await repairClientLoginMapping(activeClient,{silent:true});
    }
    try{const {data:res,error}=await A.client.rpc('jc_reseller_get_product_balances',{p_owner_id:c.id});if(!error)activeClientBalances=Array.isArray(res?.balances)?res.balances:[];}catch(_){ }
    renderClientSheetDetails(activeClient,false);renderActiveClientBalances(activeClient);renderActiveClientPermissions();
  }


  function setButtonBusy(button,busy,text){
    if(!button)return;
    if(busy){button.dataset.originalText=button.textContent;button.disabled=true;button.textContent=text||'Aguarde...';}
    else{button.disabled=false;button.textContent=button.dataset.originalText||button.textContent;delete button.dataset.originalText;}
  }

  function resellerCadastroUrl(){
    const profile=data?.profile||{};
    const url=new URL('formulario-revenda-cliente.html', window.location.href);
    url.searchParams.set('revendedor', profile.id||'');
    url.searchParams.set('r', profile.id||'');
    url.searchParams.set('nome_revendedor', profile.full_name||profile.username||'');
    url.searchParams.set('usuario_revendedor', profile.username||'');
    const phone=digits(profile.whatsapp||profile.whatsapp2||profile.whatsapp3||'');
    if(phone)url.searchParams.set('contato', phone);
    return url.toString();
  }
  function refreshCadastroLink(){
    const link=resellerCadastroUrl();
    if($('resellerCadastroLink'))$('resellerCadastroLink').value=link;
    if($('openResellerCadastroLinkBtn'))$('openResellerCadastroLinkBtn').href=link;
    return link;
  }
  function resellerCadastroMessage(){
    const reseller=data?.profile?.full_name||data?.profile?.username||'revendedor';
    const link=refreshCadastroLink();
    return `Olá! Sou ${reseller}, revendedor JC-APK TV. Para fazer seu cadastro por créditos, acesse o link abaixo e preencha seus dados:

${link}

Depois que você enviar o cadastro, eu confiro no painel, libero as funções combinadas e coloco os créditos.`;
  }
  function sendCadastroInvite(){
    window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(resellerCadastroMessage()),'_blank');
  }
  function copyCadastroLink(){
    const link=refreshCadastroLink();
    navigator.clipboard?.writeText(link).then(()=>toast('Link de cadastro copiado.')).catch(()=>{prompt('Copie o link de cadastro:',link);});
  }

  async function openReleaseFor(c){
    if(!c)return;
    activePendingRequest=null;
    activeClient=c;
    activatePane('customersPane');
    $('customerReleaseBox')?.classList.add('open');
    $('customerReleaseBox')?.setAttribute('aria-hidden','false');
    if($('releaseCreditQuantity'))$('releaseCreditQuantity').value='0';
    await loadActiveClientDetails(c);
    renderFunctionRelease();
    const sel=$('resellerFunctionClient');if(sel){sel.value=c.id;}
    updateReleaseBalanceSummary();updateFunctionSummary();
  }

  function openReleaseForPending(sale){
    if(!sale)return;
    activePendingRequest=sale;
    activeClient=null;
    activatePane('customersPane');
    $('customerReleaseBox')?.classList.add('open');
    $('customerReleaseBox')?.setAttribute('aria-hidden','false');
    if($('releaseCreditQuantity'))$('releaseCreditQuantity').value='0';
    activeClientBalances=[];activeClientPermissionIds=new Set();
    renderClientSheetDetails(sale,true);renderActiveClientBalances(sale);renderActiveClientPermissions();
    renderFunctionRelease();
    const sel=$('resellerFunctionClient');if(sel)sel.value='__pending__';
    updateReleaseBalanceSummary();updateFunctionSummary();
  }

  function closeClientSheet(){
    activePendingRequest=null;activeClient=null;activeClientBalances=[];activeClientPermissionIds=new Set();
    $('customerReleaseBox')?.classList.remove('open');
    $('customerReleaseBox')?.setAttribute('aria-hidden','true');
  }


  function updateReleaseBalanceSummary(){
    const box=$('releaseBalanceSummary');if(!box)return;
    const total=productBalanceTotal();
    const items=visibleBalances().map(x=>`${esc(String(x.product_key||'geral'))}: ${Number(x.balance||0).toLocaleString('pt-BR')}`).join('<br>');
    box.innerHTML=`<b>${total.toLocaleString('pt-BR')}</b> crédito(s) disponível(is) na revenda${items?'<br><small>'+items+'</small>':''}`;
  }

  function selectedReleaseFunctions(){return [...document.querySelectorAll('[data-reseller-function-check]:checked')].map(x=>x.value);}
  function managedReleaseFunctions(){return [...document.querySelectorAll('[data-reseller-function-check]')].map(x=>x.value);}
  function permissionChanges(){
    const selected=new Set(selectedReleaseFunctions().map(String));
    const managed=new Set(managedReleaseFunctions().map(String));
    const added=[...selected].filter(id=>!activeClientPermissionIds.has(id));
    const removed=[...activeClientPermissionIds].filter(id=>managed.has(id)&&!selected.has(id));
    return {selected:[...selected],managed:[...managed],added,removed};
  }
  function updateFunctionSummary(){
    const box=$('resellerFunctionSummary');if(!box)return;
    const list=sellableFunctions();
    const extra=Math.max(0,Math.floor(Number($('releaseCreditQuantity')?.value||0)));
    const pending=activePendingRequest;
    const changes=permissionChanges();
    updateReleaseBalanceSummary();
    const pendingLine=pending?`<b>Cadastro novo:</b> ${esc(pending.full_name||pending.username||'cliente')}<br><small>O acesso será criado somente ao clicar em Salvar créditos e funções.</small><br>`:'';
    if(!list.length){box.innerHTML=pendingLine+'Nenhuma função disponível para revenda. Peça ao ADM para liberar funções para sua conta.';return;}
    if(!changes.added.length&&!changes.removed.length&&!extra){
      box.innerHTML=pendingLine+(activeClientPermissionIds.size?`Nenhuma alteração. Este cliente possui <b>${activeClientPermissionIds.size}</b> função(ões) liberada(s). Você pode marcar ou desmarcar e salvar.`:'Marque as funções e informe créditos somente quando quiser adicionar saldo ao cliente.');
      refreshClientAccessPreview();
      return;
    }
    const addedNames=changes.added.map(id=>list.find(f=>String(f.id)===id)?.name||id);
    const removedNames=changes.removed.map(id=>list.find(f=>String(f.id)===id)?.name||id);
    const lines=[];
    if(addedNames.length)lines.push(`<b>Liberar:</b> ${addedNames.map(esc).join(', ')}`);
    if(removedNames.length)lines.push(`<b>Remover:</b> ${removedNames.map(esc).join(', ')}`);
    if(extra)lines.push(`<b>Créditos adicionais:</b> ${extra}`);
    box.innerHTML=pendingLine+lines.join('<br>')+'<br><small>As funções são independentes por cliente e podem ser alteradas depois.</small>';
    refreshClientAccessPreview();
  }

  function renderFunctionRelease(){
    if(!$('resellerFunctionClient')||!$('resellerFunctionTree'))return;
    const customers=visibleCustomers();
    const pending=activePendingRequest;
    const pendingOption=pending?`<option value="__pending__">Solicitação: ${esc(pending.full_name||pending.username||'cliente')} — criar agora</option>`:'';
    const customerOptions=customers.length?customers.map(c=>`<option value="${esc(c.id)}">${esc(c.full_name||c.username)} — @${esc(c.username||'')}</option>`).join(''):'';
    $('resellerFunctionClient').innerHTML=pendingOption+customerOptions||'<option value="">Nenhum cliente vinculado</option>';
    const list=sellableFunctions(),groups=groupedFunctions(list);
    if(!groups.length){$('resellerFunctionTree').innerHTML='<div class="setup">Nenhuma função liberada pelo ADM para este revendedor.</div>';updateFunctionSummary();return;}
    $('resellerFunctionTree').innerHTML=groups.map(g=>`<div class="item" style="border-left:4px solid rgba(28,145,255,.75)"><div class="item-head"><div><b>${esc(g.name)}</b><br><small>${esc(groupHint(g))}</small></div><label style="display:flex;align-items:center;gap:7px"><input type="checkbox" data-reseller-group-all="${esc(g.id)}"> marcar grupo</label></div><div class="grid2">${g.items.map(f=>{const already=activeClientPermissionIds.has(String(f.id));return `<label class="field" style="display:flex;gap:10px;align-items:flex-start;margin:8px 0;padding:10px;border:1px solid ${already?'rgba(41,211,145,.34)':'rgba(255,255,255,.10)'};border-radius:12px;background:${already?'rgba(41,211,145,.07)':'rgba(255,255,255,.03)'}"><input type="checkbox" data-reseller-function-check data-group="${esc(g.id)}" value="${esc(f.id)}" ${already?'checked':''} style="margin-top:4px;min-width:18px"><span><b>${esc(actionLabelForFunction(f,g.id))}</b>${already?' <span class="badge">liberada</span>':''}<br><small>${esc(productKeyForFunction(f))} • ${creditCostForFunction(f)} crédito(s) quando usar</small></span></label>`;}).join('')}</div></div>`).join('')+(canResellLauncher()?'<div class="setup">Launcher liberada para revenda; saldo Launcher é separado dos outros créditos.</div>':'<div class="setup">Launcher fica oculta até o ADM liberar a função Revender Launcher para sua conta.</div>');
    document.querySelectorAll('[data-reseller-group-all]').forEach(ch=>{
      const selector=`[data-reseller-function-check][data-group="${CSS.escape(ch.dataset.resellerGroupAll)}"]`;
      const items=()=>[...document.querySelectorAll(selector)];
      const sync=()=>{const rows=items();ch.disabled=!rows.length;ch.checked=rows.length>0&&rows.every(x=>x.checked);ch.indeterminate=rows.some(x=>x.checked)&&!rows.every(x=>x.checked);};
      ch.onchange=()=>{items().forEach(x=>x.checked=ch.checked);sync();updateFunctionSummary();};
      items().forEach(x=>x.addEventListener('change',()=>{sync();updateFunctionSummary();}));
      sync();
    });
    updateFunctionSummary();
  }

  function initialClientPassword(){
    return String(data?.settings?.initial_password||data?.general?.initial_password||DEFAULT_CLIENT_PASSWORD);
  }
  function buildClientBodyFromPending(sale,password,permissions=[]){
    return {
      action:'create',
      username:sale.username||('cliente_'+String(sale.id||Date.now()).replace(/[^a-zA-Z0-9]/g,'').slice(0,8)),
      full_name:sale.full_name||sale.username||'Cliente',
      email:sale.email||'',
      whatsapp:sale.whatsapp||'',
      whatsapp2:sale.whatsapp2||'',
      whatsapp3:sale.whatsapp3||'',
      account_type:'credits',
      role:'client',
      billing_opt_in:false,
      status:'active',
      plan_months:0,
      plan_name:'Créditos',
      plan_value:0,
      starts_at:new Date().toISOString().slice(0,10),
      expires_at:null,
      grace_until:null,
      trial_expires_at:null,
      credits_balance:0,
      permissions:permissions||[],
      attendant_enabled:(permissions||[]).includes('attendant.open'),
      attendant_slug:A.slug(sale.username||sale.full_name||'cliente'),
      is_reseller:false,
      reseller_enabled:false,
      reseller_parent_id:data?.profile?.id||null,
      reseller_sale_id:null,
      avatar_data:null,
      avatar_required:false,
      password:password
    };
  }
  async function attachClientToResellerProfile(userId,sale,authEmail=''){
    if(!userId)throw new Error('Cliente criado sem ID de usuário.');
    const originalEmail=String(sale?.original_contact_email||sale?.email||'').trim().toLowerCase();
    const body=buildClientBodyFromPending({...sale,email:originalEmail||authEmail},initialClientPassword(),[]);
    const payload={
      user_id:userId,
      request_id:sale.request_id||sale.id||null,
      username:body.username,
      full_name:body.full_name,
      email:authEmail||sale?.auth_email||originalEmail,
      auth_email:authEmail||sale?.auth_email||null,
      contact_email:originalEmail||null,
      original_contact_email:originalEmail||null,
      whatsapp:body.whatsapp,
      whatsapp2:body.whatsapp2,
      whatsapp3:body.whatsapp3
    };
    // RPC exclusiva e segura: atualiza SOMENTE o perfil que possui o mesmo ID
    // devolvido pelo Supabase Auth. Nunca procura cliente por nome, e-mail ou telefone.
    const {data:attached,error}=await A.client.rpc('jc_reseller_attach_form_client_v1',{p_payload:payload});
    if(error){
      const msg=String(error.message||error);
      if(missingRpcMessage(msg))throw new Error('Execute uma vez o arquivo SQL-REVENDA-VINCULO-FORMULARIO-SEM-RESELLER-SALE.sql. A criação foi interrompida para não sobrescrever outro cliente.');
      throw new Error('Cliente criado no login, mas o vínculo seguro foi recusado. Nenhum crédito foi enviado. Detalhe: '+msg);
    }
    const attachedId=String(attached?.client_id||'');
    if(!attachedId||attachedId!==String(userId)){
      throw new Error('Proteção acionada: o Supabase tentou devolver outro cliente. O processo foi interrompido antes de enviar créditos.');
    }
    return attached;
  }

  async function createCustomerWithAdminUsers(sale,password,permissions){
    if(!A?.client?.functions?.invoke)throw new Error('Edge admin-users indisponível.');
    const body=buildClientBodyFromPending(sale,password,permissions);
    const {data:res,error}=await A.client.functions.invoke('admin-users',{body});
    if(error)throw error;
    if(!res?.ok)throw new Error(res?.error||'admin-users não criou o cliente.');
    await attachClientToResellerProfile(res.user_id,sale);
    return {client:{id:res.user_id,username:body.username,full_name:body.full_name,email:body.email,whatsapp:body.whatsapp,status:'active'},password,method:'admin-users+hierarquia'};
  }
  async function createCustomerWithSignupRpc(sale,password){
    if(!window.supabase?.createClient)throw new Error('Cliente Supabase temporário indisponível.');
    const originalEmail=String(sale?.email||'').trim().toLowerCase();
    const authEmail=technicalAuthEmail(sale);
    const body=buildClientBodyFromPending(sale,password,[]);
    const temp=window.supabase.createClient(A.cfg.url,A.cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'jc-temp-'+Date.now()}});
    const metadata={username:body.username,full_name:body.full_name,original_contact_email:originalEmail,reseller_parent_id:data?.profile?.id||null,reseller_request_id:String(sale?.request_id||sale?.id||'')};
    const signup=await temp.auth.signUp({email:authEmail,password,options:{data:metadata}});
    if(signup.error){
      const msg=String(signup.error?.message||signup.error);
      if(!/already registered|already exists|user.*exists|email.*registered/i.test(msg))throw signup.error;
    }

    // O Supabase pode devolver um ID mascarado quando o e-mail técnico já foi
    // criado numa tentativa anterior. Sempre fazemos login para obter o UUID real.
    let loginData=null;
    let loginError=null;
    for(let attempt=0;attempt<5;attempt++){
      if(attempt)await sleep(350*(attempt+1));
      const login=await temp.auth.signInWithPassword({email:authEmail,password});
      if(!login.error&&login.data?.user?.id){loginData=login.data;loginError=null;break;}
      loginError=login.error;
      if(!/email not confirmed|invalid login credentials|user not found/i.test(String(login.error?.message||login.error||'')))break;
    }

    // A RPC v4 também resolve pelo e-mail técnico + metadados da solicitação.
    // O ID retornado pelo signUp é apenas uma última referência e nunca escolhe
    // cliente por nome, telefone ou e-mail de contato.
    const candidateUserId=loginData?.user?.id||signup.data?.user?.id||null;
    const saleForAttach={...sale,original_contact_email:originalEmail,auth_email:authEmail};
    const attached=await attachClientToResellerProfile(candidateUserId,saleForAttach,authEmail);
    const cid=attached?.client_id||candidateUserId;
    if(!cid){
      const detail=String(loginError?.message||loginError||'UUID real não localizado');
      throw new Error('O login técnico foi criado, mas o Supabase não devolveu o usuário real. Detalhe: '+detail);
    }
    sale.auth_email=authEmail;
    sale.original_contact_email=originalEmail;
    return {client:{id:cid,username:body.username,full_name:body.full_name,email:authEmail,auth_email:authEmail,login_email:authEmail,contact_email:originalEmail,original_contact_email:originalEmail,whatsapp:body.whatsapp,status:'active'},password,method:'signup-rpc-form-v1',authEmail};
  }


  async function createCustomerFromPending(sale,extraCredits,selectedIds=[]){
    if(!sale)throw new Error('Solicitação não encontrada.');
    const password=initialClientPassword();
    const requestKey=String(sale.request_id||sale.id||'').replace(/^request_/,'');
    const requestedUsername=String(sale.username||'').trim().toLowerCase();
    const requestAuthEmail=technicalAuthEmail(sale).toLowerCase();
    // Uma solicitação só pode reutilizar o usuário criado PARA ELA MESMA.
    // Nunca reutiliza cliente apenas porque nome, e-mail, telefone ou usuário coincidiram.
    const linked=(data?.customers||[]).find(c=>
      (requestKey&&String(c.reseller_sale_id||'').replace(/^request_/,'')===requestKey) ||
      (requestAuthEmail&&authLoginEmail(c)===requestAuthEmail)
    );
    if(linked?.id)return {client:linked,creditsHandledByCreate:false,password:rememberedClientPassword(linked.id)||password,method:'mesma-solicitacao-ja-criada',existing:true};
    if(!requestedUsername)throw new Error('A solicitação está sem nome de usuário. Descarte e peça um novo cadastro.');
    const usernameOwner=(data?.customers||[]).find(c=>String(c.username||'').trim().toLowerCase()===requestedUsername);
    if(usernameOwner?.id)throw new Error('Já existe outro cliente com este nome de usuário. Escolha um usuário diferente; o sistema não vai sobrescrever o cadastro existente.');
    try{
      // Caminho único: cria o login uma vez e usa a RPC já existente para vincular o perfil
      // diretamente à hierarquia do revendedor. Não chama reseller_submit_sale e não repete Auth.
      return await createCustomerWithSignupRpc(sale,password);
    }catch(e){
      const msg=e?.message||String(e||'');
      if(/already registered|already exists|user.*exists|email.*registered|duplicate key/i.test(msg)){
        throw new Error('Este e-mail ou usuário já possui cadastro no Supabase, mas ainda não está vinculado a esta revenda. Não tente novamente para não duplicar. Confira o cadastro no ADM e vincule-o ao revendedor. Detalhe: '+msg);
      }
      if(/40 seconds|security purposes|rate|too many requests/i.test(msg)){
        throw new Error('O Supabase bloqueou novas tentativas por segurança. Não clique novamente agora. Aguarde 1 minuto e tente uma única vez. Detalhe: '+msg);
      }
      throw new Error('Não consegui criar e vincular este cliente à hierarquia do revendedor. A solicitação continua pendente. E-mail técnico tentado: '+technicalAuthEmail(sale)+'. Detalhe: '+msg);
    }
  }

  async function releaseResellerFunctions(){
    if(releaseInProgress)return;
    releaseInProgress=true;
    const releaseBtn=$('releaseResellerFunctionsBtn');
    setButtonBusy(releaseBtn,true,'Salvando...');
    let clientId=$('resellerFunctionClient')?.value;
    const changes=permissionChanges();
    const selected=changes.selected;
    const managed=changes.managed;
    const extraCredits=Math.max(0,Math.floor(Number($('releaseCreditQuantity')?.value||0)));
    const pending=clientId==='__pending__'?activePendingRequest:null;
    let c=pending?pending:(activeClient||visibleCustomers().find(x=>String(x.id)===String(clientId)));
    let createdFromPending=false;
    try{
      if(!clientId)throw new Error('Abra um cliente ou utilize uma solicitação.');
      if(!pending&&!changes.added.length&&!changes.removed.length&&extraCredits<=0){
        if(activeClient){
          const password=String($('clientAccessPassword')?.value||'').trim();
          await repairClientLoginMapping(activeClient,{silent:false,password});
          if(password)rememberClientPassword(activeClient.id,password);
          renderClientSheetDetails(activeClient,false);
          if($('clientAccessPassword'))$('clientAccessPassword').value=password||rememberedClientPassword(activeClient.id)||initialClientPassword();
          refreshClientAccessPreview();
          toast('Login e senha conferidos. O cliente pode entrar usando o usuário.');
          return;
        }
      }
      if(pending&&!selected.length&&extraCredits<=0)throw new Error('Marque pelo menos uma função ou informe créditos para criar este cliente.');

      const allowed=new Set(sellableFunctions().map(f=>String(f.id)));
      const blocked=selected.filter(id=>!allowed.has(String(id)));
      if(blocked.length)throw new Error('Existe função marcada que não está liberada para sua revenda. Recarregue a página.');

      const actionText=pending?'Criar o cliente':'Salvar as alterações de';
      if(!confirm(`${actionText} ${c?.full_name||c?.username||'cliente'}?\n\nLiberar: ${changes.added.length}\nRemover: ${changes.removed.length}\nCréditos adicionais: ${extraCredits}`))return;

      if(pending){
        const createdResult=await createCustomerFromPending(pending,0,selected);
        c=createdResult.client;
        clientId=c.id;
        createdFromPending=true;
        lastCreatedClientPassword=createdResult.password||initialClientPassword();
        rememberClientPassword(clientId,lastCreatedClientPassword);
        await repairClientLoginMapping(c,{silent:false,password:lastCreatedClientPassword});
      }

      const permissionResult=await resellerClientControl('set_permissions',clientId,{
        selected_function_ids:selected,
        managed_function_ids:managed
      });
      activeClientPermissionIds=new Set((permissionResult?.permissions||[]).filter(x=>x?.enabled!==false).map(x=>String(x.function_id)).filter(Boolean));

      if(extraCredits>0){
        const fromId=data?.profile?.id;
        const {error}=await A.client.rpc('jc_reseller_transfer_product_credits',{p_payload:{from_owner_id:fromId,to_owner_id:clientId,product_key:'geral',quantity:extraCredits}});
        if(error)throw error;
      }

      if(pending)await markPendingRequestStatus(pending,'used');

      activePendingRequest=null;
      if($('releaseCreditQuantity'))$('releaseCreditQuantity').value='0';
      await load();
      const finalClient=visibleCustomers().find(x=>String(x.id)===String(clientId))||c;
      await openReleaseFor(finalClient);
      if(createdFromPending&&$('clientAccessPassword'))$('clientAccessPassword').value=lastCreatedClientPassword||initialClientPassword();
      refreshClientAccessPreview();
      toast(createdFromPending?'Cliente criado separadamente. Confira e envie os dados de acesso.':'Créditos e funções atualizados na ficha do cliente.');
    }catch(e){
      if(pending)throw new Error((e?.message||e)+'. A solicitação foi mantida para você corrigir e tentar novamente sem perder o cadastro.');
      throw e;
    }finally{
      releaseInProgress=false;
      setButtonBusy(releaseBtn,false);
    }
  }


  async function markPendingRequestStatus(sale,status){
    if(!sale)return false;
    const canonical=['rejected','cancelled','discarded'].includes(String(status||'').toLowerCase())?'discarded':'used';
    const requestId=sale.request_id||null;
    const removeLocal=()=>{
      sale.status=canonical==='discarded'?'rejected':'created';
      if(requestId)rememberResolvedRequest(requestId,canonical);
      externalCadastroRequests=(externalCadastroRequests||[]).filter(x=>String(x.request_id)!==String(requestId));
      if(data?.sales)data.sales=(data.sales||[]).filter(x=>String(x.request_id||x.id)!==String(requestId||sale.id));
    };
    if(sale._source==='client_requests'&&requestId){
      const {data:result,error}=await A.client.rpc('jc_reseller_resolve_client_request_v2',{
        p_payload:{request_id:requestId,action:canonical}
      });
      if(error){
        const msg=String(error.message||error);
        if(/function.*does not exist|schema cache|could not find/i.test(msg)){
          throw new Error('Execute uma vez o arquivo SQL-FINAL-ADM-REVENDA-FUNCIONAL.sql no mesmo Supabase do painel. Detalhe: '+msg);
        }
        throw new Error('O Supabase não conseguiu '+(canonical==='discarded'?'descartar':'finalizar')+' esta solicitação. Nada foi removido apenas da tela. Detalhe: '+msg);
      }
      if(result&&result.ok===false)throw new Error(result.error||'O Supabase não confirmou a atualização da solicitação.');
      removeLocal();
      return true;
    }
    if(sale.id){
      const resellerSaleStatus=canonical==='discarded'?'rejected':'created';
      const {error}=await A.client.from('reseller_sales').update({status:resellerSaleStatus,updated_at:new Date().toISOString()}).eq('id',sale.id);
      if(error)throw error;
      if(data?.sales)data.sales=(data.sales||[]).filter(x=>String(x.id)!==String(sale.id));
      return true;
    }
    return false;
  }


  async function usePendingRequest(sale,button=null){
    if(!sale)return;
    openReleaseForPending(sale);
  }

  async function discardPendingRequest(sale,button=null){
    if(!sale)return;
    const name=sale.full_name||sale.username||'cliente';
    if(!confirm(`Descartar a solicitação de ${name}?`))return;
    setButtonBusy(button,true,'Descartando...');
    try{
      await markPendingRequestStatus(sale,'discarded');
      toast('Solicitação descartada.');
      render();
      load().catch(()=>{});
    }finally{setButtonBusy(button,false);}
  }



  function renderRequests(){
    if(!$('requestsList'))return;
    const pending=pendingCreditRequests();
    const pendingError=externalCadastroLoadError?`<div class="setup" style="margin-bottom:10px;border-color:rgba(255,193,7,.35);background:rgba(255,193,7,.08)"><b>Aviso:</b> o formulário enviou o cadastro para <code>client_requests</code>, mas esta conta ainda não conseguiu ler as solicitações vinculadas à revenda. Execute o SQL <b>SQL-67-REVENDAS-FINAL.sql</b> no Supabase.</div>`:'';
    const intro=`<div class="setup" style="margin-bottom:10px"><b>Solicitações para liberar:</b> abra o cadastro para conferir os dados, escolher créditos e funções. A entrega pelo WhatsApp aparece somente depois que o cliente for criado.</div>`;
    $('requestsList').innerHTML=intro+pendingError+(pending.length?pending.map(s=>`<div class="item"><div class="item-head"><div><b>${esc(s.full_name||s.username)}</b> <span class="badge warn">aguardando liberação</span><br><small>@${esc(s.username||'')} • ${esc(s.email||'')} • ${esc(s.whatsapp||'')}<br>Cadastro recebido pelo link da sua revenda • sem crédito inicial${s.notes?'<br>Obs.: '+esc(s.notes):''}</small></div><div class="actions"><button class="btn green" data-use-pending="${esc(s.id)}">Abrir cadastro</button><button class="btn red" data-discard-pending="${esc(s.id)}">Descartar</button></div></div></div>`).join(''):'<div class="muted" style="margin-bottom:12px">Nenhuma solicitação pendente do link da revenda.</div>');
    document.querySelectorAll('[data-use-pending]').forEach(b=>b.onclick=()=>usePendingRequest(pending.find(c=>String(c.id)===String(b.dataset.usePending)),b).catch(e=>toast(e.message,true)));
    document.querySelectorAll('[data-discard-pending]').forEach(b=>b.onclick=()=>discardPendingRequest(pending.find(c=>String(c.id)===String(b.dataset.discardPending)),b).catch(e=>toast(e.message,true)));
  }


  async function deleteResellerClient(c,button=null){
    if(!c?.id)return;
    const name=c.full_name||c.username||'este cliente';
    if(!confirm(`Excluir ${name} da revenda?

O acesso será bloqueado, as funções serão desativadas e o cliente desaparecerá da lista. O histórico financeiro será preservado.`))return;
    setButtonBusy(button,true,'Excluindo...');
    try{
      const result=await resellerClientControl('archive',c.id);
      if(result&&result.ok===false)throw new Error(result.error||'O Supabase não confirmou a exclusão.');
      if(activeClient&&String(activeClient.id)===String(c.id))closeClientSheet();
      if(data?.customers)data.customers=(data.customers||[]).filter(x=>String(x.id)!==String(c.id));
      toast('Cliente excluído da revenda e acesso bloqueado.');
      renderCustomers();
      await load();
      activatePane('customersPane');
    }catch(e){
      if(missingRpcMessage(e?.message||e)||/SQL-FINAL/i.test(String(e?.message||e)))throw new Error('Execute uma vez o arquivo SQL-FINAL-ADM-REVENDA-FUNCIONAL.sql no mesmo Supabase do painel. Depois atualize com Ctrl + F5.');
      throw e;
    }finally{setButtonBusy(button,false);}
  }


  function renderCustomers(){
    if(!$('customerList'))return;
    const customers=visibleCustomers();
    const pending=pendingCreditRequests();
    const pendingNotice=pending.length?`<div class="setup" style="margin-bottom:10px"><b>${pending.length} solicitação(ões) aguardando:</b> abra a aba <b>Solicitações</b> para criar cada cliente separadamente.</div>`:'';
    const customerHtml=customers.length?customers.map(c=>`<div class="item"><div class="item-head"><div><b>${esc(c.full_name||c.username)}</b> <span class="badge ${c.status==='active'?'':'bad'}">${esc(c.status||'')}</span><br><small>@${esc(c.username||'')} • ${esc(c.whatsapp||'')}<br>Cadastro individual • créditos atuais: ${customerCreditBalance(c).toLocaleString('pt-BR')}</small></div><div class="actions"><button class="btn green" data-open-client="${esc(c.id)}">Abrir cliente</button><button class="btn red" data-delete-client="${esc(c.id)}">Excluir cliente</button></div></div></div>`).join(''):'';
    $('customerList').innerHTML=pendingNotice+(customerHtml||'<div class="muted">Nenhum cliente liberado ainda. Envie o link de cadastro; quando o cliente preencher, ele aparece primeiro em Solicitações.</div>');
    document.querySelectorAll('[data-open-client]').forEach(b=>b.onclick=()=>openReleaseFor(customers.find(c=>String(c.id)===String(b.dataset.openClient))).catch(e=>toast(e.message,true)));
    document.querySelectorAll('[data-delete-client]').forEach(b=>b.onclick=()=>deleteResellerClient(customers.find(c=>String(c.id)===String(b.dataset.deleteClient)),b).catch(e=>toast(e.message,true)));
  }


  function successfulHistoryStatus(value){return ['created','approved','used'].includes(String(value||'').toLowerCase());}
  function hiddenHistoryStorageKey(){return 'jc_reseller_hidden_failed_history_'+String(data?.profile?.id||'sem-revendedor');}
  function hiddenHistoryIds(){try{return new Set(JSON.parse(localStorage.getItem(hiddenHistoryStorageKey())||'[]').map(String));}catch(_){return new Set();}}
  function rememberHiddenHistory(ids){
    try{
      const set=hiddenHistoryIds();
      (ids||[]).forEach(id=>{if(id)set.add(String(id));});
      localStorage.setItem(hiddenHistoryStorageKey(),JSON.stringify([...set].slice(-1000)));
    }catch(_){ }
  }
  function failedHistoryRows(){
    const hidden=hiddenHistoryIds();
    return (data?.sales||[]).filter(x=>x&&x._source!=='client_requests'&&x.id&&!hidden.has(String(x.id))&&!successfulHistoryStatus(x.status)&&!x.client_user_id);
  }
  async function cleanupFailedResellerHistory({silent=false,automatic=false}={}){
    const rows=failedHistoryRows();
    if(!rows.length){if(!silent)toast('Não há tentativas sem sucesso para limpar.');return 0;}
    if(!automatic&&!confirm(`Limpar ${rows.length} tentativa(s) sem sucesso do histórico da revenda? Cadastros já criados não serão apagados.`))return 0;
    const ids=[...new Set(rows.map(x=>String(x.id)).filter(Boolean))];
    let persisted=0,lastError=null;
    for(let i=0;i<ids.length;i+=50){
      const chunk=ids.slice(i,i+50);
      try{
        let q=A.client.from('reseller_sales').delete().in('id',chunk);
        if(data?.profile?.id)q=q.eq('reseller_id',data.profile.id);
        const {data:deleted,error}=await q.select('id');
        if(error)throw error;
        persisted+=Array.isArray(deleted)?deleted.length:0;
      }catch(e){
        lastError=e;
        try{
          let q=A.client.from('reseller_sales').update({status:'rejected',updated_at:new Date().toISOString()}).in('id',chunk);
          if(data?.profile?.id)q=q.eq('reseller_id',data.profile.id);
          const {data:updated,error}=await q.select('id');
          if(error)throw error;
          persisted+=Array.isArray(updated)?updated.length:0;
        }catch(e2){lastError=e2;}
      }
    }
    rememberHiddenHistory(ids);
    if(data?.sales)data.sales=data.sales.filter(x=>!ids.includes(String(x.id)));
    renderSales();
    if(!silent){
      if(persisted)toast(`${ids.length} tentativa(s) sem sucesso removida(s) do histórico.`);
      else toast(`As tentativas foram ocultadas deste painel, mas o Supabase recusou a exclusão. Detalhe: ${lastError?.message||'permissão negada'}`,true);
    }
    try{localStorage.setItem('jc_reseller_auto_history_cleanup_'+String(data?.profile?.id||''),PATCH_VERSION);}catch(_){ }
    return ids.length;
  }
  async function autoCleanupFailedHistory(){
    const key='jc_reseller_auto_history_cleanup_'+String(data?.profile?.id||'');
    try{if(localStorage.getItem(key)===PATCH_VERSION)return;}catch(_){ }
    await cleanupFailedResellerHistory({silent:true,automatic:true}).catch(e=>console.warn('Limpeza automática do histórico:',e?.message||e));
    try{localStorage.setItem(key,PATCH_VERSION);}catch(_){ }
  }

  function renderSales(){
    if(!$('salesList'))return;
    const hidden=hiddenHistoryIds();
    const rows=(data.sales||[]).filter(x=>String(x.account_type)==='credits'&&x._source!=='client_requests'&&!hidden.has(String(x.id))&&successfulHistoryStatus(x.status));
    $('salesList').innerHTML=rows.length?rows.map(x=>`<div class="item"><div class="item-head"><div><b>${esc(x.full_name||x.username)}</b> <span class="badge">${esc(x.status||'created')}</span><br><small>Cadastro por créditos concluído • ${x.created_at?new Date(x.created_at).toLocaleString('pt-BR'):''}</small></div><div><b>Cliente da revenda</b><br><small>Somente cadastros concluídos aparecem neste histórico.</small></div></div></div>`).join(''):'<div class="muted">Nenhum cadastro concluído no histórico da revenda.</div>';
  }


  function bind(){
    $('loginForm').onsubmit=async(e)=>{e.preventDefault();if($('loginMsg'))$('loginMsg').textContent='Entrando...';try{await A.login($('loginUser').value,$('loginPass').value);await load();if($('loginMsg'))$('loginMsg').textContent='';}catch(err){if($('loginMsg'))$('loginMsg').textContent=err.message||'Não foi possível entrar.';}};
    if($('logoutBtn'))$('logoutBtn').onclick=async()=>{await A.client.auth.signOut();location.reload();};
    document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.pane)?.classList.add('active');});
    $('submitSaleBtn')?.addEventListener('click',()=>submitSale().catch(e=>toast(e.message,true)));
    $('sendResellerCadastroWhatsappBtn')?.addEventListener('click',sendCadastroInvite);
    $('copyResellerCadastroLinkBtn')?.addEventListener('click',copyCadastroLink);
    $('releaseResellerFunctionsBtn')?.addEventListener('click',()=>releaseResellerFunctions().catch(e=>toast(e.message,true)));
    $('releaseCreditQuantity')?.addEventListener('input',updateFunctionSummary);
    $('clientAccessPassword')?.addEventListener('input',refreshClientAccessPreview);
    $('clientAccessWhatsapp')?.addEventListener('change',refreshClientAccessPreview);
    $('copyClientAccessBtn')?.addEventListener('click',()=>copyClientAccessData().catch(e=>toast(e.message,true)));
    $('sendClientAccessWhatsappBtn')?.addEventListener('click',sendClientAccessWhatsApp);
    $('repairClientAccessBtn')?.addEventListener('click',()=>repairCurrentClientAccess().catch(e=>toast(e.message,true)));
    $('closeCustomerReleaseBtn')?.addEventListener('click',closeClientSheet);
    $('cancelCustomerReleaseBtn')?.addEventListener('click',closeClientSheet);
    $('customerReleaseBox')?.addEventListener('click',(e)=>{if(e.target===$('customerReleaseBox'))closeClientSheet();});
    $('clearResellerFailedHistoryBtn')?.addEventListener('click',()=>cleanupFailedResellerHistory().catch(e=>toast(e.message,true)));
    document.addEventListener('jc:reseller-credits-updated',()=>Promise.all([loadBalances(),loadCustomerBalanceTotals()]).then(render).catch(()=>{}));
    renderCreditCadastro();
  }

  bind();
  (async()=>{if(!A.ready)return;const {data:{session}}=await A.client.auth.getSession();if(session)load().catch(async e=>{await A.client.auth.signOut();setView(false);if($('loginMsg'))$('loginMsg').textContent=e.message;});})();
})();
