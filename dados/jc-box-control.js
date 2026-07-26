(function(){
  'use strict';

  const A=window.JC_APP||{};
  const $=id=>document.getElementById(id);
  const $$=selector=>Array.from(document.querySelectorAll(selector));
  const PREVIEW_KEY='jcboxControlPreviewV1';


  const OFFICIAL_GITHUB_RELEASE={
    owner:'JoaoJMuniz19',
    repo:'JC-APK-TV-Downloads',
    tag:'downloads-oficiais'
  };

  const OFFICIAL_FALLBACK_APK_ASSETS=[
    'BTV.Vivo.TV.1.0.0.0.apk',
    'Gerenciador.de.Arquivos+.apk',
    'Max.Net.TV.12.4.apk',
    'STV.Esportes.20260124.apk',
    'TouroBox.Vod.2.4.0.apk',
    'UniTV.Free.5.1.0.0.apk',
    'UniTV.Free.5.2.0.0.apk',
    'UniTV.Free.5.3.0.0.apk',
    'UniTV.Free.5.3.1.0.apk',
    'UniTV.Free.5.4.0.0.apk',
    'UniTV.Free.5.4.1.0.apk',
    'UniTV.Free.5.5.0.0.apk',
    'UniTV.Utilizado.pra.TESTE.apk',
    'Xplus.Live.6.6.1.apk',
    'Xplus.Vod.2.63.apk',
  ];

  function officialApkUrl(name){
    return `https://github.com/${OFFICIAL_GITHUB_RELEASE.owner}/${OFFICIAL_GITHUB_RELEASE.repo}/releases/download/${OFFICIAL_GITHUB_RELEASE.tag}/${encodeURIComponent(name)}`;
  }

  function cleanApkName(name){
    return String(name||'')
      .replace(/\.apk$/i,'')
      .replace(/[._-]+/g,' ')
      .replace(/\s+/g,' ')
      .replace(/\bVod\b/ig,'VOD')
      .replace(/\bTv\b/ig,'TV')
      .replace(/\bBtv\b/ig,'BTV')
      .replace(/\bStv\b/ig,'STV')
      .replace(/\bXplus\b/ig,'XPLUS')
      .replace(/\bUnitv\b/ig,'UniTV')
      .replace(/\bOnline\b/ig,'ONLINE')
      .trim();
  }

  function officialVersionFromName(name){
    const match=String(name||'').match(/(\d+(?:\.\d+){1,})/);
    return match?match[1]:'';
  }

  function officialVersionSort(text){
    const version=officialVersionFromName(text);
    if(!version)return 999999999;
    return version.split('.').reduce((total,part,index)=>total+Number(part||0)*Math.pow(100,6-index),0);
  }

  function isActivatorCatalogText(value){
    return /ativador|activator|jc\s*apk\s*tv\s*ativador|jcapktvativador|online\s*11|online\s*16|11\s*d[ií]gitos|16\s*d[ií]gitos/i.test(String(value||''));
  }

  function isAllowedUnitvLauncherAsset(name){
    const text=String(name||'');
    return /5\.1\.0(?:\.0)?/i.test(text)||/5\.3\.1(?:\.0)?/i.test(text);
  }

  function classifyOfficialLauncherApk(asset){
    const sourceName=String(asset?.name||'').trim();
    if(!/\.apk$/i.test(sourceName))return null;
    const lower=sourceName.toLowerCase();
    const url=String(asset?.browser_download_url||'').trim()||officialApkUrl(sourceName);
    const version=officialVersionFromName(sourceName);
    const base={source:'github_release',source_name:sourceName,apk_url:url,min_api:null,max_api:null,active:true,restricted:false,restricted_for_client:false,sort_order:officialVersionSort(sourceName)};

    if(/unitv/.test(lower)){
      if(!isAllowedUnitvLauncherAsset(sourceName))return null;
      const primary=/5\.1\.0(?:\.0)?/i.test([sourceName,version].join(' '));
      const fallback=/5\.3\.1(?:\.0)?/i.test([sourceName,version].join(' '));
      return {
        id:'unitv_free',
        name:'UniTV Free',
        app_key:'unitv_free',
        package_name:'',
        install_mode:'unitv_free_auto',
        description:'Instalação automática: tenta 5.1.0 primeiro usando somente CONFIG; se der erro real, limpa de novo e tenta 5.3.1 com CONFIG + .properties + google.wav aleatórios.',
        sort:10,
        version:Object.assign(base,{
          id:primary?'unitv_free_510':'unitv_free_531',
          version_label:primary?'UniTV Free 5.1.0 — principal':'UniTV Free 5.3.1 — fallback',
          recommended:primary,
          sort_order:primary?10:(fallback?20:officialVersionSort(sourceName))
        })
      };
    }
    if(/\bbtv\b|btv\./.test(lower))return {id:'btv_apk',name:'BTV',app_key:'btv',package_name:'',install_mode:'simple',description:'APK oficial do GitHub.',sort:20,version:Object.assign(base,{id:'btv_'+slug(version||sourceName),version_label:`BTV Vivo TV${version?` (${version})`:''}`})};
    if(/x\s*plus|xplus/.test(lower)){
      const kind=/live/.test(lower)?'Live':/vod/.test(lower)?'VOD':'';
      return {id:'xplus_apk',name:'XPLUS',app_key:'xplus',package_name:'',install_mode:'simple',description:'APK oficial do GitHub.',sort:30,version:Object.assign(base,{id:'xplus_'+slug(kind||'apk')+'_'+slug(version||sourceName),version_label:`XPLUS${kind?` ${kind}`:''}${version?` (${version})`:''}`,sort_order:(kind==='Live'?100000:kind==='VOD'?200000:300000)+officialVersionSort(sourceName)})};
    }
    if(/\bstv\b|stv\./.test(lower))return {id:'stv_apk',name:'STV',app_key:'stv',package_name:'',install_mode:'simple',description:'APK oficial do GitHub.',sort:40,version:Object.assign(base,{id:'stv_'+slug(version||sourceName),version_label:`STV Esportes${version?` (${version})`:''}`})};
    if(/eaigo/.test(lower))return {id:'eaigo_apk',name:'EAIGO',app_key:'eaigo',package_name:'',install_mode:'simple',description:'APK oficial do GitHub.',sort:50,version:Object.assign(base,{id:'eaigo_'+slug(version||sourceName),version_label:`EAIGO${version?` (${version})`:''}`})};
    if(/ativador|activator|jc\s*apk\s*tv\s*ativador|jcapktvativador|online\s*11|online\s*16/.test(lower)){
      return null;
    }
    if(/launcher/.test(lower)){
      const pro=/pro/.test(lower);
      return {id:pro?'launcher_pro_apk':'launcher_lite_apk',name:pro?'JC Launcher Pro':'JC Launcher Lite',app_key:pro?'launcher_pro':'launcher_lite',package_name:'',install_mode:'simple',description:'Launcher oficial do GitHub.',sort:pro?90:80,version:Object.assign(base,{id:(pro?'launcher_pro_':'launcher_lite_')+slug(version||sourceName),version_label:`JC Launcher ${pro?'Pro':'Lite'}${version?` (${version})`:''}`})};
    }
    if(/gerenciador|arquivo|file\s*manager|files/.test(lower))return {id:'gerenciador_arquivos',name:'Gerenciador de Arquivos+',app_key:'gerenciador_arquivos',package_name:'',install_mode:'simple',description:'Ferramenta oficial do GitHub.',sort:100,version:Object.assign(base,{id:'gerenciador_arquivos_'+slug(version||sourceName),version_label:'Gerenciador de Arquivos+'})};
    if(/max\s*net/.test(lower))return {id:'max_net_tv',name:'Max Net TV',app_key:'max_net_tv',package_name:'',install_mode:'simple',description:'APK oficial do GitHub.',sort:110,version:Object.assign(base,{id:'max_net_tv_'+slug(version||sourceName),version_label:`Max Net TV${version?` (${version})`:''}`})};
    if(/touro/.test(lower))return {id:'tourobox_vod',name:'TouroBox VOD',app_key:'tourobox_vod',package_name:'',install_mode:'simple',description:'APK oficial do GitHub.',sort:120,version:Object.assign(base,{id:'tourobox_vod_'+slug(version||sourceName),version_label:`TouroBox VOD${version?` (${version})`:''}`})};
    if(/limpeza|atualizacao|atualiza[cç][aã]o|clean|maintenance/.test(lower))return {id:'limpeza_unitv',name:'Limpeza do UniTV S/Formatar',app_key:'limpeza_unitv',package_name:'',install_mode:'simple',description:'Ferramenta oficial do GitHub.',sort:130,version:Object.assign(base,{id:'limpeza_unitv_'+slug(version||sourceName),version_label:`Limpeza do UniTV${version?` (${version})`:''}`})};

    const clean=cleanApkName(sourceName)||'APK oficial';
    const appId='github_'+slug(clean);
    return {id:appId,name:clean,app_key:appId,package_name:'',install_mode:'simple',description:'APK oficial do GitHub.',sort:800,version:Object.assign(base,{id:appId+'_v1',version_label:clean})};
  }

  async function fetchOfficialGithubApks(){
    const apiUrl=`https://api.github.com/repos/${OFFICIAL_GITHUB_RELEASE.owner}/${OFFICIAL_GITHUB_RELEASE.repo}/releases/tags/${OFFICIAL_GITHUB_RELEASE.tag}`;
    try{
      const response=await fetch(apiUrl,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
      if(!response.ok)throw new Error(`GitHub respondeu ${response.status}`);
      const payload=await response.json();
      if(!Array.isArray(payload.assets))throw new Error('Resposta sem assets');
      return {source:'github_release',assets:payload.assets.map(asset=>({name:asset.name,browser_download_url:asset.browser_download_url}))};
    }catch(error){
      console.warn('Não foi possível carregar assets do GitHub; usando fallback local.',error);
      return {source:'github_release_fallback',assets:OFFICIAL_FALLBACK_APK_ASSETS.map(name=>({name,browser_download_url:officialApkUrl(name)}))};
    }
  }

  function mergeOfficialCatalogWithExisting(officialItems,existingCatalog){
    const existingRows=asArray(existingCatalog?.catalog).filter(row=>!isActivatorCatalogText([row.id,row.name,row.app_key,row.install_mode,row.package_name].join(' ')));
    const byId=new Map(existingRows.map(row=>[String(row.id),row]));
    const byKey=new Map(existingRows.filter(row=>row.app_key).map(row=>[String(row.app_key),row]));
    const used=new Set();
    const official=officialItems.map(app=>{
      const existing=byId.get(String(app.id))||byKey.get(String(app.app_key));
      if(existing)used.add(String(existing.id));
      const existingVersions=asArray(existing?.versions);
      const versionByLabel=new Map(existingVersions.map(v=>[String(v.version_label||'').toLowerCase(),v]));
      const versionByUrl=new Map(existingVersions.map(v=>[String(v.apk_url||'').toLowerCase(),v]));
      const versions=asArray(app.versions).map(v=>{
        const old=versionByUrl.get(String(v.apk_url||'').toLowerCase())||versionByLabel.get(String(v.version_label||'').toLowerCase())||{};
        return Object.assign({},v,{id:old.id||v.id,download_code:old.download_code||v.download_code||null,min_api:old.min_api??v.min_api??null,max_api:old.max_api??v.max_api??null,recommended:Boolean(old.recommended)||Boolean(v.recommended),restricted:Boolean(old.restricted)||Boolean(v.restricted),active:old.active!==false&&v.active!==false});
      }).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)||String(a.version_label).localeCompare(String(b.version_label)));
      const nonTest=versions.filter(v=>!/teste|test/i.test([v.version_label,v.source_name].join(' ')));
      const unitvPrimary=String(app.app_key||app.id||'').toLowerCase().includes('unitv')?versions.find(v=>/5\.1\.0/.test([v.version_label,v.apk_url,v.source_name].join(' '))):null;
      const recommended=unitvPrimary||versions.find(v=>v.recommended)||(nonTest.length?nonTest[nonTest.length-1]:versions[versions.length-1]);
      versions.forEach(v=>{v.recommended=String(v.id)===String(recommended?.id);});
      return Object.assign({},app,{
        id:existing?.id||app.id,
        app_key:existing?.app_key||app.app_key,
        package_name:existing?.package_name||app.package_name||'',
        icon_url:existing?.icon_url||app.icon_url||'',
        description:existing?.description||app.description,
        available:Boolean(existing?.available),
        explicit_grant:existing?.explicit_grant??Boolean(existing?.available),
        automatic_permission:Boolean(existing?.automatic_permission),
        visibility_mode:existing?.visibility_mode||'permission',
        source:'github_release',
        versions,
        _official_github:true
      });
    });
    const extras=existingRows.filter(row=>!used.has(String(row.id))&&!official.some(app=>String(app.id)===String(row.id))).map(row=>Object.assign({},row,{source:row.source||'catalog'}));
    return {ok:true,source:'github_release',catalog:[...official,...extras].sort((a,b)=>Number(a.sort||a.sort_order||0)-Number(b.sort||b.sort_order||0)||String(a.name).localeCompare(String(b.name)))};
  }

  async function loadOfficialInstallCatalog(existingCatalog){
    const github=await fetchOfficialGithubApks();
    const grouped=new Map();
    github.assets.forEach(asset=>{
      const item=classifyOfficialLauncherApk(asset);
      if(!item)return;
      if(!grouped.has(item.id))grouped.set(item.id,Object.assign({},item,{versions:[]}));
      grouped.get(item.id).versions.push(item.version);
    });
    const official=[...grouped.values()].filter(app=>app.versions.length);
    return mergeOfficialCatalogWithExisting(official,existingCatalog||{});
  }

  const MESSAGE_DEFINITIONS=[
    {key:'billing_available',title:'Mensalidade disponível',message:'Sua mensalidade da JC Launcher está disponível para pagamento.'},
    {key:'billing_overdue',title:'Mensalidade vencida',message:'Sua mensalidade está vencida. Regularize o pagamento para manter os aplicativos contratados liberados.'},
    {key:'billing_apps_blocked',title:'Aplicativos bloqueados',message:'Os aplicativos vinculados à mensalidade foram temporariamente bloqueados. Após a confirmação do pagamento, a liberação poderá ocorrer automaticamente.'},
    {key:'equipment_return',title:'Devolução do equipamento',message:'Este equipamento foi cedido em regime de aluguel ou empréstimo. Caso não deseje continuar com o serviço, entre em contato para combinar a devolução do aparelho.'},
    {key:'equipment_return_blocked',title:'Equipamento aguardando devolução',message:'O uso deste equipamento está temporariamente bloqueado porque foi solicitada a devolução do aparelho cedido em aluguel ou empréstimo. Entre em contato para regularizar ou combinar a entrega.'}
  ];

  // Demo local sem Boxes pré-cadastradas. Assim o painel não mistura as duas Boxes antigas
  // de demonstração com cadastro real de cliente/ADM.
  const DEMO_DEVICES=[];

  const state={
    real:false,
    access:null,
    devices:[],
    selected:null,
    filter:'all',
    activeTab:'overview',
    config:null,
    dashboard:null,
    tokenStatus:null,
    commandDashboard:null,
    ownerCommandDiagnostics:null,
    syncAudit:null,
    automation:null,
    pendingCommand:'',
    equipmentRequestBlock:false,
    lastError:null,
    accessOwners:[],
    accessCredential:null,
    accessGeneratedPassword:'',
    installCatalog:null,
    installSearch:"",
    launcherHistory:null,
    favorites:[],
    accessDelivery:null
  };

  function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function asArray(value){return Array.isArray(value)?value:[];}
  function bool(value,fallback=false){return typeof value==='boolean'?value:fallback;}
  function number(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
  function money(value){try{return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}catch(e){return 'R$ 0,00';}}
  function dateText(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pt-BR');}
  function dateTime(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR');}
  function relativeTime(value){if(!value)return 'Nunca';const d=new Date(value);if(Number.isNaN(d.getTime()))return '—';const diff=Date.now()-d.getTime();if(diff<60000)return 'Agora';if(diff<3600000)return Math.max(1,Math.floor(diff/60000))+' min atrás';if(diff<86400000)return Math.max(1,Math.floor(diff/3600000))+' h atrás';return dateText(value);}
  function monthStart(){const d=new Date();return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)).toISOString().slice(0,10);}
  function slug(value){return String(value||'app').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,45)||'app';}
  function profileDisplayName(profile){return profile?.full_name||profile?.username||profile?.email||null;}
  function ownerDisplayName(device){
    const explicit=device?.owner_name||device?.owner_full_name||null;
    if(explicit)return explicit;
    const owner=String(device?.owner_id||'');
    const current=state.access?.profile;
    if(owner&&current&&String(current.id)===owner)return profileDisplayName(current)||'Administrador';
    return owner?`Conta ${owner.slice(0,8)}`:'—';
  }
  function credentialStatusLabel(status){
    const value=String(status||'').toLowerCase();
    const map={active:'ATIVO',revoked:'TOKEN REVOGADO',expired:'TOKEN EXPIRADO'};
    return map[value]||String(status||'ATIVO').toUpperCase();
  }
  function equipmentStatusLabel(status){
    const value=String(status||'active').toLowerCase();
    const map={active:'ATIVO',return_requested:'DEVOLUÇÃO SOLICITADA',returned:'DEVOLVIDO'};
    return map[value]||String(status||'ATIVO').toUpperCase();
  }
  function ownerId(){return state.selected?.owner_id||state.access?.profile?.id||null;}
  function selectedId(){return state.selected?.id||null;}
  function errorText(error){
    const raw=String(error?.message||error||'Erro desconhecido');
    if(/permission denied.*jc_launcher_devices/i.test(raw))return 'Sem permissão na tabela de Boxes. Execute o SQL-CORRIGIR-RLS-BOX-FIRST-LAUNCHER.sql no Supabase e teste de novo.';
    const map={AUTH_REQUIRED:'Faça login novamente.',FORBIDDEN:'Esta conta não tem permissão para esta ação.',DEVICE_NOT_FOUND:'A Box selecionada não foi encontrada.',EQUIPMENT_NOT_FOUND:'Cadastre o equipamento antes de solicitar a devolução.',RETURN_ONLY_FOR_RENTED_OR_LOANED_EQUIPMENT:'A devolução só pode ser solicitada para aparelho alugado ou emprestado.',BILLING_CYCLE_NOT_FOUND:'O ciclo mensal não foi encontrado.',OWNER_INACTIVE_OR_NOT_FOUND:'O cliente não existe ou está inativo.',PASSWORD_LENGTH_INVALID:'A senha deve ter entre 6 e 128 caracteres.',INVALID_EDITION:'Versão da Launcher inválida.',DEVICE_LIMIT_REACHED:'Este acesso ainda está com limite antigo. Salve novamente as regras da Launcher para liberar cadastro de Boxes sem limite fixo.',DEVICE_ALREADY_LINKED:'Este aparelho já está vinculado a outra conta.',INVALID_CONFIRMATION:'Digite EXCLUIR para confirmar.',INSUFFICIENT_LAUNCHER_CREDITS:'Saldo de créditos insuficiente para esta licença.'};
    for(const key of Object.keys(map)){if(raw.includes(key))return map[key];}
    return raw;
  }
  function toast(text,type='ok'){if(typeof A.toast==='function')A.toast(text,type);else alert(text);}
  function isMissingFunctionError(error){return /(function|rpc|does not exist|schema cache|not found)/i.test(String(error?.message||error||''));}
  function loading(show,text='Carregando'){const el=$('loadingOverlay');if(!el)return;$('loadingText').textContent=text;el.classList.toggle('show',Boolean(show));}
  function setMode(text,kind){const el=$('modeBadge');el.textContent=text;el.className='mode '+kind;}
  function openModal(id){const el=$(id);if(el)el.classList.add('open');}
  function closeModal(id){const el=$(id);if(el)el.classList.remove('open');}
  function closeModals(){$$('.modal').forEach(el=>el.classList.remove('open'));}
  function openDeviceModal(ownerIdValue){
    const modal=$('deviceModal');
    const defaultOwner=ownerIdValue||state.access?.profile?.id||ownerId()||'';
    if(modal)modal.dataset.ownerId=defaultOwner;
    setInput('deviceName','Nova Box');
    setInput('deviceModel','Aguardando vínculo');
    setInput('deviceEdition','lite');
    openModal('deviceModal');
  }
  function requireSelected(){if(!state.selected){toast('Selecione uma Box.','error');return false;}return true;}
  function deviceSeenValue(device){
    const value=device?.last_seen_at||device?.last_online_at||device?.last_sync_at||device?.updated_at||device?.created_at||null;
    const time=value?new Date(value).getTime():0;
    return Number.isFinite(time)?time:0;
  }
  function deviceCreatedValue(device){
    const value=device?.created_at||device?.updated_at||device?.last_seen_at||null;
    const time=value?new Date(value).getTime():0;
    return Number.isFinite(time)?time:0;
  }
  function isOnlineDevice(device){return String(device?.status||'').toLowerCase()==='online';}
  function deviceRecencyScore(device){return (isOnlineDevice(device)?9e15:0)+deviceSeenValue(device)+Math.floor(deviceCreatedValue(device)/1000);}
  function sortDevicesForSafety(devices){return asArray(devices).slice().sort((a,b)=>deviceRecencyScore(b)-deviceRecencyScore(a));}
  function pickBestDevice(previousId){
    const devices=sortDevicesForSafety(state.devices),previous=devices.find(item=>String(item.id)===String(previousId));
    const best=devices[0]||null;
    if(!previous)return best;
    if(isOnlineDevice(previous))return previous;
    const online=devices.find(isOnlineDevice);
    return online||previous||best;
  }
  function sameOwnerDevices(device){
    const owner=String(device?.owner_id||'');
    return sortDevicesForSafety(state.devices).filter(item=>String(item.id)!==String(device?.id)&&(!owner||String(item.owner_id||'')===owner));
  }
  function newestOnlineDuplicate(device){
    if(!device)return null;
    const selectedSeen=deviceSeenValue(device);
    return sameOwnerDevices(device).find(item=>isOnlineDevice(item)&&(!isOnlineDevice(device)||deviceSeenValue(item)>selectedSeen||(!selectedSeen&&deviceCreatedValue(item)>deviceCreatedValue(device))));
  }
  function selectedDeviceWarning(){
    const d=state.selected;
    if(!d)return null;
    const newer=newestOnlineDuplicate(d);
    const oldPending=asArray(state.ownerCommandDiagnostics?.commands).filter(command=>{
      const status=String(command.status||'').toLowerCase();
      const type=String(command.command_type||'').toLowerCase();
      return String(command.device_id||'')!==String(d.id)&&/install/.test(type)&&['pending','queued','processing'].includes(status)&&number(command.delivery_attempts,0)===0;
    });
    if(newer){
      return {kind:'warning',device:newer,message:`Existe outra Box ONLINE mais recente para este mesmo responsável: ${newer.label||newer.device_name||'TV Box'} • último contato ${relativeTime(newer.last_seen_at||newer.updated_at)}. Para evitar enviar APK para device_id antigo, selecione a Box ONLINE mais recente antes de instalar.`};
    }
    if(!isOnlineDevice(d)){
      return {kind:'error',message:'A Box selecionada está OFFLINE. O painel não deve enviar instalação automática para Box offline/antiga. Abra a Launcher na Box atual ou selecione a Box ONLINE.'};
    }
    if(oldPending.length){
      return {kind:'warning',message:`Atenção: há ${oldPending.length} instalação pendente em outra Box com delivery_attempts = 0. Isso normalmente indica comando enviado para device_id antigo. Exclua/desconecte a Box antiga ou selecione a Box correta.`};
    }
    return null;
  }
  function commandTargetReady(actionLabel='enviar comando'){
    if(!requireSelected())return false;
    const warning=selectedDeviceWarning();
    if(warning&&warning.device){toast('Selecione a Box ONLINE mais recente antes de '+actionLabel+'.','error');return false;}
    if(!isOnlineDevice(state.selected)){toast('A Box selecionada está OFFLINE. Abra a Launcher atual ou selecione a Box ONLINE antes de '+actionLabel+'.','error');return false;}
    return true;
  }
  function isAdmin(){return String(state.access?.profile?.role||'').toLowerCase()==='admin';}
  function isDemoLikeText(value){return /(^|[^a-z0-9])(demo|demonstracao|demonstração)([^a-z0-9]|$)/i.test(String(value||''));}
  function normalizeAccessOwner(row){
    if(!row)return null;
    const id=row.user_id||row.owner_id||row.id;
    if(!id)return null;
    return {
      user_id:id,
      id,
      username:row.username||row.user_name||row.login||'',
      full_name:row.full_name||row.name||row.display_name||'',
      email:row.email||'',
      whatsapp:row.whatsapp||row.phone||row.telefone||'',
      phone:row.phone||row.telefone||'',
      status:row.status||'active',
      role:row.role||'',
      can_manage:row.can_manage!==false
    };
  }
  function isDemoOwner(row){
    const owner=normalizeAccessOwner(row)||{};
    const id=String(owner.user_id||owner.id||'');
    // Não considerar cliente real chamado "demo" como demonstração.
    // Demo local é somente o ID interno antigo usado nos testes.
    return id==='demo-owner'||/^demo[-_]/i.test(id);
  }
  function isDemoDeviceRow(device){
    const id=String(device?.id||'');
    const owner=String(device?.owner_id||'');
    return owner==='demo-owner'||/^demo[-_]/i.test(id)||id==='demo-sala'||id==='demo-quarto';
  }
  function parseLinkLine(value){
    const text=String(value||'').trim();
    if(!text)return null;
    const pos=text.indexOf('|');
    const label=(pos>=0?text.slice(0,pos):text).trim();
    const url=(pos>=0?text.slice(pos+1):text).trim();
    if(!/^(https?:|intent:|market:)/i.test(url))return null;
    return {label:label||url.split('/').pop()||'APK',url};
  }
  function versionFromText(value){const match=String(value||'').match(/(\d+(?:\.\d+){1,})/);return match?match[1]:'';}
  function versionScore(value){const version=versionFromText(value);if(!version)return 0;return version.split('.').reduce((total,part,index)=>total+Number(part||0)*Math.pow(100,6-index),0);}
  function androidMajor(){const raw=String(state.selected?.android_version||state.selected?.model||'');const match=raw.match(/(\d{1,2})(?:\.\d+)?/);return match?Number(match[1]):0;}
  function androidApi(){const major=androidMajor();return major>=14?34:major>=13?33:major>=12?31:major>=11?30:major>=10?29:major>=9?28:major>=8?26:0;}
  function isUnitvApp(app){return /unitv/i.test(String(app?.name||app?.app_key||app?.install_mode||''))||['unitv_free','unitv_free_special'].includes(String(app?.install_mode||'').toLowerCase());}
  function catalogVersionCompatible(app,version){
    if(!version||version.active===false)return false;
    const api=androidApi();
    if(version.min_api&&api&&api<Number(version.min_api))return false;
    if(version.max_api&&api&&api>Number(version.max_api))return false;
    return version.compatible!==false;
  }
  function selectedCompatibleVersions(app){return asArray(app?.versions).filter(v=>catalogVersionCompatible(app,v)&&!v.restricted_for_client&&v.apk_url);}
  function unitvCatalogVersion(app,kind){
    const versions=asArray(app?.versions);
    const regex=kind==='primary'?/5\.1\.0(?:\.0)?/i:/5\.3\.1(?:\.0)?/i;
    return versions.find(v=>regex.test([v.version_label,v.apk_url,v.source_name,v.id].join(' ')))||null;
  }

  function unitvSpecialInstallPayload(app,primaryVersion,fallbackVersion){
    const primary=primaryVersion||unitvCatalogVersion(app,'primary')||{};
    const fallback=fallbackVersion||unitvCatalogVersion(app,'fallback')||{};
    const primaryUrl=String(primary.apk_url||'').trim()||officialApkUrl('UniTV.Free.5.1.0.0.apk');
    const fallbackUrl=String(fallback.apk_url||'').trim()||officialApkUrl('UniTV.Free.5.3.1.0.apk');
    const supabasePublicBase='https://iwavyzzdrhbwmjjjxehr.supabase.co/storage/v1/object/public';
    const configSource={
      provider:'supabase_storage',
      bucket:'configs',
      selection:'random_existing_available',
      respect_existing_logic:true,
      respect_inventory:true,
      do_not_create_new_files:true,
      mark_used_after_integrity:true,
      release_reservation_on_failure:true,
      save_as:'.config',
      destinations:['.config']
    };
    const propertiesSource={
      role:'properties',
      provider:'supabase_storage',
      bucket:'arquivos',
      selection:'random_existing_available_independent',
      same_folder_as_config:false,
      optional:true,
      match:['properties_payload.bin','.properties','properties'],
      save_as:'.properties',
      destinations:['.properties']
    };
    const googleWavSource={
      role:'google_wav',
      provider:'supabase_storage',
      bucket:'arquivos',
      selection:'random_existing_available_independent',
      same_folder_as_config:false,
      optional:true,
      match:['google.wav','Alarms/system_uf/google.wav'],
      save_as:'Alarms/system_uf/google.wav',
      destinations:['Alarms/system_uf/google.wav']
    };
    return {
      provider:'jc_apk_tv_supabase',
      mode:'unitv_free_auto_510_then_531',
      supabase_public_base_url:supabasePublicBase,
      force_primary_first:true,
      receive_files_before_install:true,
      cleanup_before_receive:true,
      cleanup_targets:['.config','.properties','Alarms/system_uf/google.wav'],
      root_destinations:['Environment.getExternalStorageDirectory()','/storage/emulated/0','/sdcard'],
      apk_strategy:{
        primary:{version:'5.1.0',version_label:primary.version_label||'UniTV Free 5.1.0 — principal',apk_url:primaryUrl},
        fallback:{version:'5.3.1',version_label:fallback.version_label||'UniTV Free 5.3.1 — fallback',apk_url:fallbackUrl},
        fallback_only_after_real_error:true,
        real_error_checks:['package_install_failed','apk_install_failed','app_open_failed','launch_failed','file_integrity_failed']
      },
      primary_install:{
        version:'5.1.0',
        apk_url:primaryUrl,
        cleanup_before_receive:true,
        receive_files_before_install:true,
        config_source:configSource,
        required_files:['config'],
        optional_extra_files:[],
        skip_properties:true,
        skip_google_wav:true,
        install_after_files:true
      },
      fallback_install:{
        version:'5.3.1',
        apk_url:fallbackUrl,
        cleanup_before_receive:true,
        receive_files_before_install:true,
        config_source:configSource,
        required_files:['config'],
        optional_extra_files:[propertiesSource,googleWavSource],
        extras_independent_from_config:true,
        install_after_files:true
      },
      // Campos antigos preservados para compatibilidade com a Launcher já instalada.
      reserve_random_config:true,
      config_source:configSource,
      extra_files_source:{
        provider:'supabase_storage',
        bucket:'arquivos',
        enabled:'fallback_5_3_1_only',
        selection:'random_existing_available_independent',
        same_folder_as_config:false,
        skip_on_primary_5_1_0:true,
        do_not_force_install:true,
        roles:[propertiesSource,googleWavSource]
      },
      file_write_map:[
        {role:'config',save_as:'.config',destinations:['.config'],versions:['5.1.0','5.3.1']},
        {role:'properties',source_name:'properties_payload.bin',save_as:'.properties',destinations:['.properties'],versions:['5.3.1']},
        {role:'google_wav',source_name:'google.wav',save_as:'Alarms/system_uf/google.wav',destinations:['Alarms/system_uf/google.wav'],versions:['5.3.1']}
      ],
      steps:[
        'Limpar ativação anterior se detectar arquivos antigos',
        'Receber CONFIG aleatório do Supabase',
        'Gravar .config na memória principal da Box',
        'Instalar UniTV Free 5.1.0 primeiro',
        'Se 5.1.0 falhar de verdade, limpar novamente',
        'Receber CONFIG + .properties + google.wav aleatórios',
        'Gravar .config, .properties e Alarms/system_uf/google.wav',
        'Instalar UniTV Free 5.3.1 como fallback'
      ],
      mark_config_used_after_integrity:true,
      release_reservation_on_failure:true
    };
  }
  function linkItemsOf(row){
    const items=Array.isArray(row?.items)?row.items:(()=>{try{const parsed=JSON.parse(row?.items||'[]');return Array.isArray(parsed)?parsed:[];}catch(_){return [];}})();
    const output=items.map(item=>String(item||'').trim()).filter(Boolean);
    const direct=String(row?.value||'').trim();
    if(direct&&!output.includes(direct))output.unshift(direct);
    return output;
  }
  function buildInstallCatalogFromLinks(rows){
    const defs={
      unitv_free:{id:'links_unitv_free',name:'UniTV Free',app_key:'unitv_free',package_name:'',install_mode:'unitv_free',description:'Instalação especial: compatibilidade, limpeza e gravação segura dos arquivos de ativação.',sort:10},
      btv_apk:{id:'links_btv_apk',name:'BTV',app_key:'btv',package_name:'',install_mode:'simple',description:'APK vindo de Atualizar Links.',sort:20},
      xplus_apk:{id:'links_xplus_apk',name:'XPLUS',app_key:'xplus',package_name:'',install_mode:'simple',description:'APK vindo de Atualizar Links.',sort:30},
      stv_apk:{id:'links_stv_apk',name:'STV',app_key:'stv',package_name:'',install_mode:'simple',description:'APK vindo de Atualizar Links.',sort:40},
      eaigo_apk:{id:'links_eaigo_apk',name:'EAIGO',app_key:'eaigo',package_name:'',install_mode:'simple',description:'APK vindo de Atualizar Links.',sort:50},
      extras_apks:{id:'links_extras_apks',name:'Extras / Ferramentas',app_key:'extras',package_name:'',install_mode:'simple',description:'Ferramentas extras cadastradas em Atualizar Links.',sort:90}
    };
    const catalog=[];
    asArray(rows).forEach(row=>{
      const def=defs[String(row.id)];
      if(!def||row.active===false)return;
      const versions=linkItemsOf(row).map((line,index)=>{
        const parsed=parseLinkLine(line);if(!parsed)return null;
        const ver=versionFromText(parsed.label)||versionFromText(parsed.url);
        return {id:`${def.id}_v_${index}`,version_label:parsed.label||`${def.name}${ver?` ${ver}`:''}`,apk_url:parsed.url,download_code:null,min_api:null,max_api:null,recommended:false,restricted:false,active:true,sort_order:versionScore(parsed.label)||index};
      }).filter(Boolean).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)||String(a.version_label).localeCompare(String(b.version_label)));
      if(versions.length){
        const recommendedIndex=def.id==='links_unitv_free'?Math.max(0,versions.findIndex(v=>/5\.1\.0/.test(v.version_label)||/5\.1\.0/.test(v.apk_url))):0;
        versions.forEach((v,i)=>{v.recommended=i===(recommendedIndex>=0?recommendedIndex:0);});
        catalog.push(Object.assign({},def,{available:true,automatic_permission:true,explicit_grant:true,visibility_mode:'links_catalog',source:'links_catalog',versions}));
      }
    });
    return {ok:true,source:'links_catalog_fallback',catalog:catalog.sort((a,b)=>Number(a.sort||0)-Number(b.sort||0))};
  }
  function buildDemoInstallCatalog(){
    return {ok:true,source:'demo',catalog:[
      {id:'demo_unitv',name:'UniTV Free',app_key:'unitv_free',package_name:'',install_mode:'unitv_free',description:'Instalação especial com limpeza automática.',available:true,automatic_permission:true,explicit_grant:true,versions:[
        {id:'demo_unitv_5100',version_label:'UniTV Free 5.1.0 — principal',apk_url:'https://exemplo.com/unitv-5.1.0.0.apk',recommended:true,active:true},
        {id:'demo_unitv_5310',version_label:'UniTV Free 5.3.1 — fallback',apk_url:'https://exemplo.com/unitv-5.3.1.0.apk',recommended:false,active:true}
      ]},
      {id:'demo_btv',name:'BTV',app_key:'btv',package_name:'',install_mode:'simple',description:'APK exemplo do catálogo.',available:true,automatic_permission:true,explicit_grant:true,versions:[{id:'demo_btv_1',version_label:'BTV Vivo TV (1.0.0.0)',apk_url:'https://exemplo.com/btv.apk',recommended:true,active:true}]},
      {id:'demo_xplus',name:'XPLUS',app_key:'xplus',package_name:'',install_mode:'simple',description:'Duas opções para demonstrar o seletor.',available:true,automatic_permission:true,explicit_grant:true,versions:[{id:'demo_xplus_live',version_label:'XPLUS LIVE',apk_url:'https://exemplo.com/xplus-live.apk',recommended:true,active:true},{id:'demo_xplus_vod',version_label:'XPLUS VOD',apk_url:'https://exemplo.com/xplus-vod.apk',recommended:false,active:true}]}
    ]};
  }
  async function loadInstallCatalogFromLinksFallback(){
    if(!state.real||!A.client||!isAdmin())return null;
    try{
      const ids=['unitv_free','btv_apk','xplus_apk','stv_apk','eaigo_apk','extras_apks'];
      const {data,error}=await A.client.from('links_catalog').select('id,name,value,items,active').in('id',ids);
      if(error)throw error;
      const fallback=buildInstallCatalogFromLinks(data||[]);
      return asArray(fallback.catalog).length?fallback:null;
    }catch(error){console.warn('Catálogo de instalação via links não carregado:',error);return null;}
  }

  async function rpc(name,args){
    if(!A.client)throw new Error('Supabase não configurado.');
    const result=await A.client.rpc(name,args||{});
    if(result.error)throw result.error;
    return result.data;
  }

  function buildDemoConfig(device){
    const isSala=device.id==='demo-sala';
    const messages=MESSAGE_DEFINITIONS.map(item=>({owner_id:'demo-owner',template_key:item.key,title:item.title,message:item.message,enabled:true}));
    return {
      ok:true,
      owner_id:'demo-owner',
      device_id:device.id,
      billing_profile:isSala?{
        id:'demo-profile',owner_id:'demo-owner',device_id:device.id,title:'Mensalidade JC Launcher',amount:30,message:'Use o PIX abaixo para regularizar sua mensalidade.',pix_key:'(31) 99999-9999',pix_key_type:'phone',pix_copy_paste:'',qr_code_payload:'',receiver_name:'João da Silva',bank_name:'Banco Digital',account_label:'Conta principal',payment_url:'',whatsapp_contact:'(31) 99760-9439',display_from_day:5,due_day:10,allow_dismiss:true,repeat_monthly:true,enabled:true,reminder_enabled:true,block_after_days:1,automatic_block_mode:'apps_only',auto_release_after_payment:true
      }:null,
      message_templates:messages,
      billing_app_targets:isSala?[
        {id:'demo-app-1',owner_id:'demo-owner',device_id:device.id,package_name:'com.google.android.youtube.tv',app_name:'YouTube',enabled:true,block_on_overdue:true},
        {id:'demo-app-2',owner_id:'demo-owner',device_id:device.id,package_name:'com.netflix.ninja',app_name:'Netflix',enabled:true,block_on_overdue:true}
      ]:[],
      equipment:{id:'demo-equipment',owner_id:'demo-owner',device_id:device.id,equipment_type:'tv_box',ownership_mode:'customer_owned',serial_number:'',asset_tag:'',notes:'',status:'active',return_required:false,launcher_full_block_enabled:false,return_message_template_key:'equipment_return'},
      current_cycle:isSala?{id:'demo-cycle',reference_month:monthStart(),due_date:monthStart().slice(0,8)+'10',amount:30,status:'open',paid_at:null,blocked_at:null}:null,
      cycles:isSala?[{id:'demo-cycle',reference_month:monthStart(),due_date:monthStart().slice(0,8)+'10',amount:30,status:'open',paid_at:null,blocked_at:null}]:[],
      rules:{billing_full_launcher_block:false,billing_block_mode:'apps_only',equipment_full_launcher_block_available:true}
    };
  }

  function buildEmptyConfig(device){
    const owner=device?.owner_id||state.access?.profile?.id||null;
    const deviceId=device?.id||null;
    const messages=MESSAGE_DEFINITIONS.map(item=>({owner_id:owner,template_key:item.key,title:item.title,message:item.message,enabled:true}));
    return {
      ok:true,
      owner_id:owner,
      device_id:deviceId,
      billing_profile:null,
      message_templates:messages,
      billing_app_targets:[],
      equipment:{id:null,owner_id:owner,device_id:deviceId,equipment_type:'tv_box',ownership_mode:'customer_owned',serial_number:'',asset_tag:'',notes:'',status:'active',return_required:false,launcher_full_block_enabled:false,return_message_template_key:'equipment_return'},
      current_cycle:null,
      cycles:[],
      rules:{billing_full_launcher_block:false,billing_block_mode:'apps_only',equipment_full_launcher_block_available:true}
    };
  }

  function useDemo(reason){
    state.real=false;
    state.access={profile:{id:'demo-owner',role:'admin',full_name:'Demonstração'}};
    state.devices=clone(DEMO_DEVICES);
    state.selected=state.devices[0]||null;
    state.config=state.selected?buildDemoConfig(state.selected):null;
    state.dashboard={configured_apps:2,cycles_overdue:0,equipment_return_pending:0,pending_commands:0};
    state.tokenStatus={configured:false,credential:null};
    state.commandDashboard={summary:{total:0,pending:0,completed:0,failed:0},commands:[]};
    state.ownerCommandDiagnostics={commands:[]};
    state.syncAudit={summary:{total:0,success:0,denied:0,failed:0},history:[]};
    state.installCatalog=buildDemoInstallCatalog();
    state.automation=null;
    state.lastError=reason||null;
    setMode(reason?'DEMONSTRAÇÃO — SUPABASE INDISPONÍVEL':'DEMONSTRAÇÃO LOCAL',reason?'error':'demo');
    renderAll();
    activateHashTab();
    if(reason)toast('O painel abriu em demonstração: '+reason,'error');
  }

  function normalizeLauncherDeviceRows(rows){
    const devices=asArray(rows).map(row=>{
      const licenses=asArray(row.jc_launcher_licenses).slice().sort((a,b)=>new Date(b.created_at||b.expires_at||0)-new Date(a.created_at||a.expires_at||0));
      const license=licenses[0]||{};
      return Object.assign({},row,{
        label:row.label||row.device_name||row.name||'TV Box',
        edition:license.edition||row.edition||'lite',
        license_status:license.status||row.license_status||'inactive',
        license_expires_at:license.expires_at||row.license_expires_at||null
      });
    });
    return sortDevicesForSafety(devices.filter(device=>{
      const status=String(device.status||'').toLowerCase();
      return !isDemoDeviceRow(device) && !device.deleted_at && status!=='deleted' && status!=='removed';
    }));
  }

  async function loadDevices(){
    if(state.real){
      try{
        const rpcRows=await rpc('jc_launcher_list_devices_safe',{});
        if(Array.isArray(rpcRows))return normalizeLauncherDeviceRows(rpcRows);
      }catch(error){
        if(!isMissingFunctionError(error))console.warn('RPC seguro de Boxes não carregou; tentando consulta direta:',error);
      }
    }
    const selectAttempts=[
      () => A.client.from('jc_launcher_devices').select('*,jc_launcher_licenses(status,expires_at,edition,created_at)').order('created_at',{ascending:false}).is('deleted_at',null),
      () => A.client.from('jc_launcher_devices').select('*,jc_launcher_licenses(status,expires_at,edition,created_at)').order('created_at',{ascending:false}),
      () => A.client.from('jc_launcher_devices').select('*').order('created_at',{ascending:false}).is('deleted_at',null),
      () => A.client.from('jc_launcher_devices').select('*').order('created_at',{ascending:false})
    ];
    let result=null,lastError=null;
    for(const attempt of selectAttempts){
      result=await attempt();
      if(!result.error)break;
      lastError=result.error;
    }
    if(!result||result.error)throw result?.error||lastError||new Error('Não foi possível consultar as Boxes.');
    const devices=normalizeLauncherDeviceRows(result.data);

    const ownerIds=[...new Set(devices.map(item=>item.owner_id).filter(Boolean))];
    if(ownerIds.length){
      const profileAttempts=['id,full_name,username,email','id,full_name,username,email,phone,whatsapp','id,full_name,username,email,role,status'];
      for(const fields of profileAttempts){
        const profiles=await A.client.from('profiles').select(fields).in('id',ownerIds);
        if(!profiles.error){
          const byId=new Map(asArray(profiles.data).map(profile=>[String(profile.id),profileDisplayName(profile)]));
          devices.forEach(device=>{device.owner_name=byId.get(String(device.owner_id))||device.owner_name||null;});
          break;
        }
      }
    }

    return devices;
  }

  async function load(){
    loading(true,'Carregando JC Box Control');
    let access=null;
    try{
      if(!A.client)throw new Error('Supabase não configurado.');
      access=await A.myAccess();
      if(!access?.profile)throw new Error('Faça login no painel antes de abrir o JC Box Control.');
      const isAdminAccount=String(access.profile.role||'').toLowerCase()==='admin';
      const permissions=access.permissions||{};
      const allowed=isAdminAccount||Boolean(permissions['launcher.control.open'])||Boolean(permissions['launcher.open']);
      if(!allowed)throw new Error('O módulo JC Launcher não está liberado para esta conta.');
      state.access=access;
      state.real=true;
      const previousId=state.selected?.id;
      try{
        state.devices=await loadDevices();
        state.lastError=null;
      }catch(deviceError){
        console.error('Não foi possível carregar Boxes reais:',deviceError);
        state.devices=[];
        state.lastError=errorText(deviceError);
        toast('Conectado ao Supabase, mas a lista de Boxes não carregou: '+errorText(deviceError),'error');
      }
      state.selected=pickBestDevice(previousId);
      setMode(state.lastError?'CONECTADO — AJUSTAR BOXES':'CONECTADO AO SUPABASE',state.lastError?'error':'real');
      renderDeviceList();
      if(state.selected){
        try{
          await loadSelectedData();
        }catch(selectedError){
          console.error('A Box carregou, mas as configurações falharam:',selectedError);
          state.lastError=errorText(selectedError);
          state.config=buildEmptyConfig(state.selected);
          state.dashboard={configured_apps:0,cycles_overdue:0,equipment_return_pending:0,pending_commands:0};
          state.tokenStatus={configured:false,credential:null};
          state.commandDashboard={summary:{total:0,pending:0,completed:0,failed:0},commands:[]};
          state.ownerCommandDiagnostics={commands:[]};
          state.syncAudit={summary:{total:0,success:0,denied:0,failed:0},history:[]};
          state.installCatalog=null;
          state.launcherHistory=null;
          state.favorites=[];
          setMode('CONECTADO — AJUSTAR CONFIGURAÇÕES','error');
          renderAll();
          toast('A Box está cadastrada, mas algumas configurações não carregaram: '+errorText(selectedError),'error');
        }
      }else renderAll();
      activateHashTab();
    }catch(error){
      console.error('JC Box Control:',error);
      // Não transformar conta real em DEMO por erro de permissão/tabela. Demo local só quando não existe sessão/configuração.
      if(access?.profile){
        state.access=access;
        state.real=true;
        state.devices=[];
        state.selected=null;
        state.config=null;
        state.dashboard=null;
        state.tokenStatus=null;
        state.commandDashboard=null;
        state.ownerCommandDiagnostics=null;
        state.syncAudit=null;
        state.installCatalog=null;
        state.lastError=errorText(error);
        setMode('CONECTADO — SEM ACESSO AO MÓDULO','error');
        renderAll();
        activateHashTab();
        toast(errorText(error),'error');
      }else{
        useDemo(errorText(error));
      }
    }finally{
      loading(false);
    }
  }

  async function settledRpc(name,args){
    try{return await rpc(name,args);}catch(error){console.warn(name,error);return {__error:errorText(error)};}
  }

  async function logPanelEvent(eventType,payload={},success=true,packageName=null){
    if(!state.real||!ownerId())return;
    await settledRpc('jc_launcher_log_panel_event',{p_payload:{owner_id:ownerId(),device_id:selectedId()||null,event_type:eventType,package_name:packageName,success,payload}});
  }

  async function loadFavorites(owner,device){
    const args={p_owner_id:owner,p_device_id:device};
    const current=await settledRpc('jc_launcher_get_favorites_v2',args);
    if(!current?.__error)return current;
    return settledRpc('jc_launcher_get_favorites',args);
  }

  async function loadLauncherHistory(owner,device){
    const args={p_owner_id:owner,p_device_id:device,p_limit:250,p_event_type:null};
    const [current,legacy]=await Promise.all([
      settledRpc('jc_launcher_get_launcher_history_v2',args),
      settledRpc('jc_launcher_get_launcher_history',args)
    ]);
    if(current?.__error&&legacy?.__error)return current;
    const merged=[...asArray(current?.history),...asArray(legacy?.history)];
    const seen=new Set(),history=merged.filter(item=>{const key=String(item.id||[item.event_type,item.occurred_at,item.device_id,JSON.stringify(item.payload||{})].join('|'));if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>new Date(b.occurred_at||0)-new Date(a.occurred_at||0)).slice(0,250);
    return {ok:true,history};
  }

  async function loadOwnerCommandDiagnostics(owner,device){
    if(!state.real||!A.client||!owner)return {commands:[]};
    try{
      const result=await A.client.from('jc_launcher_commands')
        .select('id,owner_id,device_id,command_type,status,delivery_attempts,last_delivery_at,completed_at,created_at,payload')
        .eq('owner_id',owner)
        .order('created_at',{ascending:false})
        .limit(80);
      if(result.error)throw result.error;
      return {commands:asArray(result.data)};
    }catch(error){
      console.warn('Diagnóstico da fila de comandos não carregou:',error);
      return {commands:[],__error:errorText(error)};
    }
  }

  async function loadSelectedData(){
    if(!state.selected){renderAll();return;}
    // A escolha de bloquear nesta solicitação é temporária e recomeça desmarcada ao recarregar a Box.
    state.equipmentRequestBlock=false;
    loading(true,'Carregando configurações da Box');
    const owner=ownerId(),device=selectedId(),adminProfile=state.access?.profile?.role==='admin';
    try{
      const calls=[
        settledRpc('jc_launcher_get_billing_configuration',{p_owner_id:owner,p_device_id:device}),
        settledRpc('jc_launcher_get_billing_dashboard',{p_owner_id:owner}),
        settledRpc('jc_launcher_get_device_sync_token_status',{p_device_id:device,p_owner_id:owner}),
        settledRpc('jc_launcher_get_billing_command_dashboard',{p_owner_id:owner,p_device_id:device,p_limit:50}),
        loadOwnerCommandDiagnostics(owner,device),
        settledRpc('jc_launcher_get_device_sync_audit',{p_owner_id:owner,p_device_id:device,p_limit:50}),
        settledRpc('jc_launcher_get_install_catalog_admin',{p_owner_id:owner,p_device_id:device}),
        loadLauncherHistory(owner,device),
        loadFavorites(owner,device),
        adminProfile?settledRpc('jc_launcher_get_billing_automation_status',{p_limit:10}):Promise.resolve(null)
      ];
      const [config,dashboard,tokenStatus,commandDashboard,ownerCommandDiagnostics,syncAudit,installCatalog,launcherHistory,favorites,automation]=await Promise.all(calls);
      state.config=(config?.__error||!config)?buildEmptyConfig(state.selected):config;
      state.dashboard=dashboard?.__error?null:dashboard;
      state.tokenStatus=tokenStatus?.__error?null:tokenStatus;
      state.commandDashboard=commandDashboard?.__error?null:commandDashboard;
      state.ownerCommandDiagnostics=ownerCommandDiagnostics?.__error?{commands:[]}:ownerCommandDiagnostics;
      state.syncAudit=syncAudit?.__error?null:syncAudit;
      let installCatalogData=installCatalog?.__error?null:installCatalog;
      if(adminProfile){
        try{
          installCatalogData=await loadOfficialInstallCatalog(installCatalogData||{});
        }catch(error){
          console.warn('Catálogo oficial do GitHub não carregado:',error);
          if(!installCatalogData||!asArray(installCatalogData.catalog).length){
            const fallbackCatalog=await loadInstallCatalogFromLinksFallback();
            if(fallbackCatalog)installCatalogData=fallbackCatalog;
          }
        }
      }
      state.installCatalog=installCatalogData;
      state.launcherHistory=launcherHistory?.__error?null:launcherHistory;
      state.favorites=favorites?.__error?[]:asArray(favorites?.favorites||favorites);
      state.automation=automation?.__error?null:automation;
      renderAll();
    }finally{
      loading(false);
    }
  }

  async function selectDevice(id){
    const found=state.devices.find(item=>String(item.id)===String(id));
    if(!found)return;
    state.selected=found;
    state.equipmentRequestBlock=false;
    renderDeviceList();
    if(state.real)await loadSelectedData();
    else{
      state.config=buildDemoConfig(found);
      state.dashboard={configured_apps:asArray(state.config.billing_app_targets).length,cycles_overdue:0,equipment_return_pending:0,pending_commands:0};
      renderAll();
    }
  }

  function filteredDevices(){
    return state.devices.filter(device=>{
      if(state.filter==='all')return true;
      if(state.filter==='online')return String(device.status).toLowerCase()==='online';
      return String(device.edition).toLowerCase()===state.filter;
    });
  }

  function renderDeviceList(){
    const list=$('deviceList');
    const devices=filteredDevices();
    list.innerHTML=devices.length?devices.map(device=>{
      const online=String(device.status).toLowerCase()==='online';
      const detached=String(device.status).toLowerCase()==='detached';
      const active=state.selected&&String(state.selected.id)===String(device.id);
      const duplicate=newestOnlineDuplicate(device);
      const rowClass=`device-row${active?' active':''}${duplicate?' has-newer-device':''}`;
      const seenText=`Último contato ${relativeTime(device.last_seen_at||device.updated_at)} • ID ${String(device.id||'').slice(0,8)}`;
      return `<div class="${rowClass}"><button class="device${active?' active':''}" data-device-id="${esc(device.id)}" type="button"><span class="device-icon">📺</span><span><b>${esc(device.label||device.device_name||'TV Box')}</b><small>${esc(String(device.edition||'lite').toUpperCase())} • ${esc(device.model||device.android_version||'Android TV')}</small><small class="device-last-seen">${esc(seenText)}${duplicate?' • existe Box ONLINE mais recente':''}</small></span><span class="pill ${detached?'offline':online?'online':'offline'}">${detached?'DESCONECTADA':online?'ONLINE':'OFFLINE'}</span></button><div class="device-row-actions"><button class="btn small blue" data-list-access-device="${esc(device.id)}" type="button">Acesso</button><button class="btn small green" data-list-install-device="${esc(device.id)}" type="button">Apps</button>${!detached?`<button class="btn small" data-list-disconnect-device="${esc(device.id)}" type="button">Desconectar</button>`:''}<button class="btn small red" data-list-delete-device="${esc(device.id)}" type="button">Excluir</button></div></div>`;
    }).join(''):'<div class="empty">Nenhuma Box encontrada neste filtro.</div>';
    list.querySelectorAll('[data-device-id]').forEach(button=>button.addEventListener('click',()=>selectDevice(button.dataset.deviceId)));
    list.querySelectorAll('[data-list-access-device]').forEach(button=>button.addEventListener('click',async(event)=>{event.stopPropagation();await selectDevice(button.dataset.listAccessDevice);await openLauncherAccess();}));
    list.querySelectorAll('[data-list-install-device]').forEach(button=>button.addEventListener('click',async(event)=>{event.stopPropagation();await selectDevice(button.dataset.listInstallDevice);activateTab('install');toast('Escolha o aplicativo liberado para instalar nesta Box.');}));
    list.querySelectorAll('[data-list-disconnect-device]').forEach(button=>button.addEventListener('click',(event)=>{event.stopPropagation();detachLauncherAccessDevice(button.dataset.listDisconnectDevice);}));
    list.querySelectorAll('[data-list-delete-device]').forEach(button=>button.addEventListener('click',(event)=>{event.stopPropagation();openDeleteSelectedBox(button.dataset.listDeleteDevice);}));
  }

  function renderStats(){
    const devices=state.devices;
    $('statDevices').textContent=devices.length;
    $('statOnline').textContent=devices.filter(d=>String(d.status).toLowerCase()==='online').length;
    $('statLite').textContent=devices.filter(d=>String(d.edition).toLowerCase()==='lite').length;
    $('statPro').textContent=devices.filter(d=>String(d.edition).toLowerCase()==='pro').length;
    $('statConfiguredApps').textContent=number(state.dashboard?.configured_apps,asArray(state.config?.billing_app_targets).filter(t=>t.enabled!==false).length);
    $('statOverdue').textContent=number(state.dashboard?.cycles_overdue,0);
    $('statReturns').textContent=number(state.dashboard?.equipment_return_pending,0);
    $('statPendingCommands').textContent=number(state.dashboard?.pending_commands,0);
  }

  function renderHeader(){
    const empty=$('detailEmpty'),detail=$('detail');
    if(!state.selected){empty.style.display='grid';detail.classList.remove('active');return;}
    empty.style.display='none';detail.classList.add('active');
    const d=state.selected,online=String(d.status).toLowerCase()==='online';
    $('detailEdition').textContent=String(d.edition||'lite').toUpperCase();
    $('detailName').textContent=d.label||d.device_name||'TV Box';
    $('detailModel').textContent=d.model||d.device_name||'Android TV';
    $('detailStatus').textContent=online?'ONLINE':'OFFLINE';
    $('detailStatus').className='pill '+(online?'online':'offline');
    $('detailOwner').textContent='Proprietário: '+ownerDisplayName(d);
    $('detailSeen').textContent=relativeTime(d.last_seen_at);
    $('detailAndroid').textContent=d.android_version||d.api_level||'—';
    $('detailLicense').textContent=String(d.license_status||'inactive').toLowerCase()==='active'?'Ativa':'Inativa';
    $('detailExpires').textContent=dateText(d.license_expires_at);
    $('detailConfigVersion').textContent=number(d.configuration_version,0);
    const warningBox=$('boxSelectionWarning');
    if(warningBox){
      const warning=selectedDeviceWarning();
      if(warning){
        warningBox.hidden=false;
        warningBox.className='box-selection-warning '+(warning.kind==='error'?'error':'warning');
        warningBox.innerHTML=`<b>${warning.kind==='error'?'Box offline/antiga':'Possível Box duplicada'}</b><span>${esc(warning.message)}</span>${warning.device?`<button class="btn small green" data-switch-newer-device="${esc(warning.device.id)}" type="button">Selecionar Box ONLINE</button>`:''}`;
        warningBox.querySelector('[data-switch-newer-device]')?.addEventListener('click',()=>selectDevice(warning.device.id));
      }else{
        warningBox.hidden=true;
        warningBox.innerHTML='';
      }
    }
  }

  function equipmentLabel(mode){return mode==='rented'?'ALUGADO':mode==='loaned'?'EMPRESTADO':'PRÓPRIO';}
  function cycleLabel(status){const map={open:'ABERTO',overdue:'VENCIDO',paid:'PAGO',cancelled:'CANCELADO'};return map[String(status||'').toLowerCase()]||String(status||'—').toUpperCase();}
  function cyclePill(status){return status==='paid'?'success':status==='overdue'?'failed':status==='open'?'pending':'info';}

  function renderOverview(){
    if(!state.selected)return;
    const profile=state.config?.billing_profile||null;
    const targets=asArray(state.config?.billing_app_targets).filter(item=>item.enabled!==false&&item.block_on_overdue!==false);
    const cycle=state.config?.current_cycle||null;
    const equipment=state.config?.equipment||null;
    const credential=state.tokenStatus?.credential||null;
    $('summaryBilling').textContent=profile&&profile.enabled!==false?'ON':'OFF';
    $('summaryBillingText').textContent=profile?`${money(profile.amount)} • vence dia ${profile.due_day||10}`:'Não configurada';
    $('summaryApps').textContent=targets.length;
    $('summaryCycle').textContent=cycle?cycleLabel(cycle.status):'—';
    $('summaryCycleText').textContent=cycle?`${dateText(cycle.due_date)} • ${money(cycle.amount)}`:'Sem ciclo neste mês';
    $('summaryEquipment').textContent=equipmentLabel(equipment?.ownership_mode);
    $('summaryEquipmentText').textContent=equipment?.return_required?'Devolução solicitada':'Sem devolução pendente';
    $('summarySync').textContent=state.tokenStatus?.configured?credentialStatusLabel(credential?.status):'—';
    $('summarySyncText').textContent=state.tokenStatus?.configured?`Final ${credential?.token_last4||'—'} • último uso ${relativeTime(credential?.last_used_at)}`:'Credencial ainda não emitida';
  }

  function setInput(id,value){const el=$(id);if(el)el.value=value??'';}
  function setCheck(id,value){const el=$(id);if(el)el.checked=Boolean(value);}

  function fillBillingForm(){
    const p=state.config?.billing_profile||{};
    setInput('billingTitle',p.title||'Mensalidade JC Launcher');
    setInput('billingAmount',p.amount==null?'':String(p.amount).replace('.',','));
    setInput('billingWhatsapp',p.whatsapp_contact||'');
    setInput('billingDisplayFrom',p.display_from_day||5);
    setInput('billingDueDay',p.due_day||10);
    setInput('billingBlockAfter',p.block_after_days==null?1:p.block_after_days);
    setInput('billingReceiver',p.receiver_name||'');
    setInput('billingBank',p.bank_name||'');
    setInput('billingAccount',p.account_label||'');
    setInput('billingPixType',p.pix_key_type||'');
    setInput('billingPixKey',p.pix_key||'');
    setInput('billingPixCopy',p.pix_copy_paste||'');
    setInput('billingQrPayload',p.qr_code_payload||'');
    setInput('billingPaymentUrl',p.payment_url||'');
    setInput('billingMessage',p.message||'Sua mensalidade da JC Launcher está disponível para pagamento.');
    setCheck('billingEnabled',p.id?bool(p.enabled,true):false);
    setCheck('billingReminder',p.id?bool(p.reminder_enabled,true):true);
    setCheck('billingAllowDismiss',p.id?bool(p.allow_dismiss,true):true);
    setCheck('billingRepeat',p.id?bool(p.repeat_monthly,true):true);
    setCheck('billingAutoRelease',p.id?bool(p.auto_release_after_payment,true):true);
    renderCycleBox();
  }

  function readBillingForm(){
    return {
      id:state.config?.billing_profile?.id||null,
      owner_id:ownerId(),device_id:selectedId(),
      title:$('billingTitle').value.trim()||'Mensalidade JC Launcher',
      amount:String($('billingAmount').value||'0').trim().replace(',','.'),
      whatsapp_contact:$('billingWhatsapp').value.trim(),
      display_from_day:Math.max(1,Math.min(28,number($('billingDisplayFrom').value,5))),
      due_day:Math.max(1,Math.min(28,number($('billingDueDay').value,10))),
      block_after_days:Math.max(0,Math.min(30,number($('billingBlockAfter').value,1))),
      receiver_name:$('billingReceiver').value.trim(),
      bank_name:$('billingBank').value.trim(),
      account_label:$('billingAccount').value.trim(),
      pix_key_type:$('billingPixType').value,
      pix_key:$('billingPixKey').value.trim(),
      pix_copy_paste:$('billingPixCopy').value.trim(),
      qr_code_payload:$('billingQrPayload').value.trim(),
      payment_url:$('billingPaymentUrl').value.trim(),
      message:$('billingMessage').value.trim()||'Sua mensalidade da JC Launcher está disponível para pagamento.',
      enabled:$('billingEnabled').checked,
      reminder_enabled:$('billingReminder').checked,
      allow_dismiss:$('billingAllowDismiss').checked,
      repeat_monthly:$('billingRepeat').checked,
      auto_release_after_payment:$('billingAutoRelease').checked,
      automatic_block_mode:'apps_only'
    };
  }

  function renderCycleBox(){
    const cycle=state.config?.current_cycle||null;
    if(!cycle){$('cycleTitle').textContent='Ciclo atual: não criado';$('cycleDescription').textContent='A rotina diária criará o ciclo automaticamente; também é possível confirmar o pagamento agora.';$('confirmPaymentBtn').disabled=false;return;}
    $('cycleTitle').textContent=`Ciclo atual: ${cycleLabel(cycle.status)} • ${money(cycle.amount)}`;
    $('cycleDescription').textContent=`Vencimento ${dateText(cycle.due_date)}${cycle.paid_at?' • pago em '+dateTime(cycle.paid_at):''}`;
    $('confirmPaymentBtn').disabled=String(cycle.status).toLowerCase()==='paid';
  }

  function renderApps(){
    const list=$('appTargetList');
    const targets=asArray(state.config?.billing_app_targets);
    if(!targets.length){list.innerHTML='<div class="empty">Nenhum aplicativo vinculado. Sem aplicativos selecionados, a cobrança não bloqueará nada.</div>';return;}
    list.innerHTML=targets.map(target=>{
      const active=target.enabled!==false&&target.block_on_overdue!==false;
      const scope=target.device_id?'Somente esta Box':'Todas as Boxes da conta';
      return `<div class="app-row"><div><b>${esc(target.app_name||target.package_name)}</b><small>${esc(target.package_name)} • ${esc(scope)}</small></div><div class="row-actions"><span class="pill ${active?'success':'offline'}">${active?'ATIVO':'INATIVO'}</span><button class="btn small ghost" data-app-toggle="${esc(target.id)}" type="button">${active?'Desativar':'Ativar'}</button><button class="btn small red" data-app-remove="${esc(target.id)}" type="button">Remover</button></div></div>`;
    }).join('');
    list.querySelectorAll('[data-app-toggle]').forEach(button=>button.addEventListener('click',()=>toggleAppTarget(button.dataset.appToggle)));
    list.querySelectorAll('[data-app-remove]').forEach(button=>button.addEventListener('click',()=>removeAppTarget(button.dataset.appRemove)));
  }

  function messageMap(){const map={};asArray(state.config?.message_templates).forEach(item=>{map[item.template_key]=item;});return map;}

  function fillEquipment(){
    const e=state.config?.equipment||{};
    setInput('equipmentOwnership',e.ownership_mode||'customer_owned');
    setInput('equipmentType',e.equipment_type||'tv_box');
    setInput('equipmentSerial',e.serial_number||'');
    setInput('equipmentAsset',e.asset_tag||'');
    setInput('equipmentNotes',e.notes||'');
    setCheck('equipmentFullBlock',bool(e.launcher_full_block_enabled,false));
    const messages=messageMap();
    setInput('equipmentReturnMessage',messages.equipment_return?.message||MESSAGE_DEFINITIONS.find(x=>x.key==='equipment_return').message);
    // Esta opção vale somente para a solicitação atual: inicia desmarcada ao carregar,
    // mas permanece marcada enquanto o usuário prepara e confirma a devolução.
    setCheck('equipmentRequestBlock',Boolean(state.equipmentRequestBlock));
    updateEquipmentControls();
    renderEquipmentStatus();
  }

  function updateEquipmentControls(){
    const mode=$('equipmentOwnership').value;
    const ceded=mode==='rented'||mode==='loaned';
    $('equipmentFullBlock').disabled=!ceded;
    if(!ceded)$('equipmentFullBlock').checked=false;
    $('equipmentRequestBlock').disabled=!ceded||!$('equipmentFullBlock').checked;
    if($('equipmentRequestBlock').disabled){
      $('equipmentRequestBlock').checked=false;
      state.equipmentRequestBlock=false;
    }else{
      $('equipmentRequestBlock').checked=Boolean(state.equipmentRequestBlock);
    }
    $('equipmentModeBadge').textContent=equipmentLabel(mode);
  }

  function renderEquipmentStatus(){
    const e=state.config?.equipment||null;
    if(!e){$('equipmentStatusTitle').textContent='Equipamento ainda não cadastrado';$('equipmentStatusText').textContent='Salve o tipo de propriedade para liberar as ações de devolução.';$('equipmentStatusBadge').textContent='NÃO CADASTRADO';$('equipmentStatusBadge').className='pill info';$('requestReturnBtn').disabled=true;$('markReturnedBtn').disabled=true;return;}
    const returnPending=Boolean(e.return_required)&&!e.returned_at;
    const returned=String(e.status||'').toLowerCase()==='returned'||Boolean(e.returned_at);
    $('equipmentStatusTitle').textContent=`${equipmentLabel(e.ownership_mode)} • ${equipmentStatusLabel(e.status)}`;
    $('equipmentStatusText').textContent=returnPending?`Devolução solicitada em ${dateTime(e.return_requested_at)}${state.selected?.blocked?' • Launcher bloqueada':''}`:returned?`Equipamento devolvido em ${dateTime(e.returned_at)}.`:'Sem devolução pendente.';
    $('equipmentStatusBadge').textContent=returnPending?'DEVOLUÇÃO PENDENTE':returned?'DEVOLVIDO':'ATIVO';
    $('equipmentStatusBadge').className='pill '+(returnPending?'failed':returned?'info':'success');
    const ceded=e.ownership_mode==='rented'||e.ownership_mode==='loaned';
    $('requestReturnBtn').disabled=!ceded||returnPending;
    $('markReturnedBtn').disabled=!returnPending;
  }

  function renderMessages(){
    const map=messageMap();
    $('messageList').innerHTML=MESSAGE_DEFINITIONS.map(def=>{
      const item=map[def.key]||def;
      return `<article class="message-card" data-message-key="${esc(def.key)}"><header><div><b>${esc(def.title)}</b><small>${esc(def.key)}</small></div><span class="pill ${item.enabled===false?'offline':'success'}">${item.enabled===false?'DESATIVADA':'ATIVA'}</span></header><div class="form-grid"><div><div class="field"><label>Título</label><input data-message-title value="${esc(item.title||def.title)}"></div><div class="field" style="margin-top:8px"><label>Mensagem</label><textarea data-message-text>${esc(item.message||def.message)}</textarea></div></div><div class="enabled-box"><div class="check-row"><input data-message-enabled id="msg_enabled_${esc(def.key)}" type="checkbox" ${item.enabled===false?'':'checked'}><label for="msg_enabled_${esc(def.key)}">Ativa</label></div><button class="btn small green" data-message-save type="button" style="margin-top:8px;width:100%">Salvar</button></div></div></article>`;
    }).join('');
    $('messageList').querySelectorAll('[data-message-save]').forEach(button=>button.addEventListener('click',()=>saveMessage(button.closest('[data-message-key]'))));
  }

  function renderCycles(){
    const cycles=asArray(state.config?.cycles);
    $('cycleHistory').innerHTML=cycles.length?cycles.map(cycle=>`<div class="timeline-row"><div><b>${dateText(cycle.reference_month)} • ${money(cycle.amount)}</b><small>Vencimento ${dateText(cycle.due_date)}${cycle.paid_at?' • pago '+dateTime(cycle.paid_at):''}</small></div><span class="pill ${cyclePill(cycle.status)}">${esc(cycleLabel(cycle.status))}</span></div>`).join(''):'<div class="empty">Nenhum ciclo mensal registrado.</div>';
  }

  function renderCommands(){
    const commands=asArray(state.commandDashboard?.commands);
    $('commandHistory').innerHTML=commands.length?commands.map(command=>{
      const attempts=number(command.delivery_attempts,0),status=String(command.status||'pending').toLowerCase(),type=String(command.command_type||'comando'),payload=command.payload||{};
      const remoteType=String(payload.remote_command_type||payload.launcher_action||payload.actual_command_type||payload.original_command_type||payload.command_action||payload.action||'');
      const stalled=status==='pending'&&(/install/.test(type)||/install/.test(remoteType)||String(payload.reason||'').includes('remote_install'))&&attempts===0;
      const extra=stalled?' • ainda não buscado pela Box — confira se esta é a Box ONLINE correta':'';
      return `<div class="timeline-row${stalled?' command-stalled':''}"><div><b>${esc(type)}</b><small>${dateTime(command.created_at)} • tentativas ${attempts}${extra}</small><code>${esc(JSON.stringify(command.payload||{}))}</code></div><span class="pill ${status==='completed'?'success':status==='failed'?'failed':'pending'}">${esc(String(command.status||'pending').toUpperCase())}</span></div>`;
    }).join(''):'<div class="empty">Nenhum comando enviado para esta Box.</div>';
  }

  function renderAudit(){
    const history=asArray(state.syncAudit?.history);
    $('syncAuditHistory').innerHTML=history.length?history.map(item=>`<div class="timeline-row"><div><b>${esc(String(item.action||'sync').toUpperCase())}</b><small>${dateTime(item.started_at)}${item.error_message?' • '+esc(item.error_message):''}</small></div><span class="pill ${item.status==='success'?'success':item.status==='failed'||item.status==='denied'?'failed':'pending'}">${esc(String(item.status||'running').toUpperCase())}</span></div>`).join(''):'<div class="empty">Nenhuma sincronização registrada. O teste definitivo será feito pelo APK.</div>';
  }

  function renderAutomation(){
    const box=$('automationStatus');
    if(!state.automation){box.innerHTML='<div class="empty">Informação disponível ao ADM quando a função de automação estiver acessível.</div>';return;}
    const job=state.automation.job||null,last=state.automation.last_run||null;
    box.innerHTML=`<div class="timeline-row"><div><b>${job?.active?'ROTINA ATIVA':'ROTINA INATIVA'}</b><small>${job?`Agenda ${esc(job.schedule||'—')} • America/Sao_Paulo`:'Job não encontrado'}</small>${last?`<small>Última execução: ${dateTime(last.started_at)} • ${esc(String(last.status||'—').toUpperCase())}</small>`:''}</div><span class="pill ${job?.active?'success':'failed'}">${job?.active?'ON':'OFF'}</span></div>`;
  }

  function renderInstallCatalog(){
    const box=$('installCatalogList');if(!box)return;
    const rows=asArray(state.installCatalog?.catalog);
    if(!rows.length){box.innerHTML='<div class="empty">Nenhum aplicativo cadastrado. Cadastre os APKs oficiais no GitHub ou sincronize o catálogo em Atualizar Links.</div>';return;}
    const targetWarning=selectedDeviceWarning();
    const targetBlocked=Boolean(targetWarning&&targetWarning.kind==='error')||Boolean(targetWarning&&targetWarning.device);
    const warningHtml=targetWarning?`<div class="install-target-warning ${targetWarning.kind==='error'?'error':'warning'}"><b>${targetWarning.kind==='error'?'Instalação bloqueada para esta Box':'Confira a Box selecionada'}</b><span>${esc(targetWarning.message)}</span></div>`:'';
    box.innerHTML=warningHtml+rows.map(app=>{
      const versions=asArray(app.versions).map(v=>Object.assign({},v,{_compatible:catalogVersionCompatible(app,v)}));
      const compatible=versions.filter(v=>v._compatible&&!v.restricted_for_client&&v.apk_url);
      const available=Boolean(app.available);
      const appSource=String(app.source||state.installCatalog?.source||'');
      const fromLinks=appSource.includes('links_catalog')||String(app.id||'').startsWith('links_');
      const fromGithub=appSource.includes('github_release')||Boolean(app._official_github);
      const explicit=app.explicit_grant;
      const source=fromGithub?'GitHub oficial':fromLinks?'Vindo de Atualizar Links':(explicit===null||explicit===undefined)?(app.automatic_permission?'Herdado das funções do cliente':'Liberação manual necessária'):'Liberação manual';
      const recommended=compatible.find(v=>v.recommended)||compatible.slice().sort((a,b)=>versionScore(b.version_label)-versionScore(a.version_label))[0]||compatible[0];
      const icon=app.icon_url?`<img src="${esc(app.icon_url)}" alt="">`:`<span class="app-icon-placeholder">${esc(String(app.name||'AP').slice(0,2).toUpperCase())}</span>`;
      const unitvAuto=isUnitvApp(app);
      const options=compatible.map(v=>`<option value="${esc(v.id)}" ${String(v.id)===String(recommended?.id)?'selected':''}>${esc(v.version_label)}${v.recommended?' — recomendada':''}</option>`).join('');
      const versionBadges=versions.length?versions.map(v=>`<span class="pill ${v._compatible?'success':'offline'}">${esc(v.version_label||'Versão')}${v.recommended?' • PRINCIPAL':''}${unitvAuto&&/5\.3\.1/.test(String(v.version_label||''))?' • FALLBACK':''}${v.restricted?' • RESTRITA':''}${!v._compatible?' • INCOMPATÍVEL':''}</span>`).join(''):'<span class="pill offline">SEM VERSÃO</span>';
      const unitvTools=unitvAuto?`<div class="catalog-install-tools unitv-step-tools"><button class="btn" data-unitv-verify="${esc(app.id)}" type="button" ${targetBlocked?'disabled':''}>1. Verificar arquivos</button><button class="btn amber" data-unitv-config="${esc(app.id)}" type="button" ${targetBlocked?'disabled':''}>2. Enviar .config</button><button class="btn green" data-install-catalog="${esc(app.id)}" data-default-version="${esc(recommended?.id||'')}" type="button" ${targetBlocked?'disabled':''}>3. Instalar UniTV Free</button></div><small style="display:block;margin-top:8px;color:#cfe8ff">Fluxo seguro: verificar a Box → enviar somente .config → instalar o APK. Nova tentativa deve começar verificando de novo.</small>`:'';
      const normalTools=!unitvAuto?`<div class="catalog-install-tools">${compatible.length>1?`<select data-install-version="${esc(app.id)}" ${targetBlocked?'disabled':''}>${options}</select>`:''}<button class="btn green" data-install-catalog="${esc(app.id)}" data-default-version="${esc(recommended?.id||'')}" type="button" ${targetBlocked?'disabled':''}>${compatible.length>1?'Instalar versão escolhida':'Instalar'}</button></div>`:'';
      const installTools=available&&compatible.length?`${unitvTools||normalTools}${targetBlocked?'<small class="install-warning">Instalação bloqueada até selecionar uma Box ONLINE válida.</small>':''}`:available?'<small style="display:block;margin-top:8px;color:#ffcf88">Nenhuma versão compatível com esta Box foi encontrada.</small>':'<small style="display:block;margin-top:8px;color:#ffcf88">Libere este aplicativo para o cliente antes de instalar.</small>';
      return `<div class="app-item"><div class="app-main" style="flex:1"><div class="app-main-row">${icon}<div><b>${esc(app.name||'Aplicativo')}</b><small>${esc(app.package_name||'Pacote não informado')} • ${esc(app.description||source)}</small><small>${esc(source)} • ${versions.length} versão(ões)</small></div></div><div class="install-version-list">${versionBadges}</div>${installTools}</div><label class="switch-line"><input type="checkbox" data-install-grant="${esc(app.id)}" ${available?'checked':''}><span>${available?'Liberado':'Bloqueado'}</span></label></div>`;
    }).join('');
    box.querySelectorAll('[data-install-grant]').forEach(input=>input.addEventListener('change',()=>setInstallGrant(input.dataset.installGrant,input.checked)));
    box.querySelectorAll('[data-unitv-verify]').forEach(button=>button.addEventListener('click',()=>sendUnitvVerify(button.dataset.unitvVerify)));
    box.querySelectorAll('[data-unitv-config]').forEach(button=>button.addEventListener('click',()=>sendUnitvConfig(button.dataset.unitvConfig)));
    box.querySelectorAll('[data-install-catalog]').forEach(button=>button.addEventListener('click',()=>{
      const appId=button.dataset.installCatalog,select=box.querySelector(`[data-install-version="${CSS.escape(appId)}"]`);
      installCatalogApp(appId,select?.value||button.dataset.defaultVersion||null);
    }));
  }


  async function ensureOfficialCatalogAppPersisted(app){
    if(!state.real||!isAdmin()||!app||!app._official_github)return;
    if(app._persisted)return;
    try{
      await rpc('jc_launcher_save_install_app',{p_payload:{id:app.id,name:app.name,app_key:app.app_key||slug(app.name),package_name:app.package_name||null,icon_url:app.icon_url||null,link_catalog_id:null,install_mode:app.install_mode||'simple',visibility_mode:app.visibility_mode||'permission',permission_ids:app.permission_ids||[],sort_order:Number(app.sort||app.sort_order||0),description:app.description||'APK oficial do GitHub',active:true}});
      for(const version of selectedCompatibleVersions(Object.assign({},app,{available:true})).length?asArray(app.versions):asArray(app.versions)){
        await rpc('jc_launcher_save_install_version',{p_payload:{id:version.id,app_id:app.id,version_label:version.version_label,apk_url:version.apk_url,download_code:version.download_code||null,min_api:version.min_api??null,max_api:version.max_api??null,recommended:Boolean(version.recommended),restricted:Boolean(version.restricted),active:version.active!==false}});
      }
      app._persisted=true;
    }catch(error){
      console.warn('Não foi possível gravar o APK oficial no catálogo antes da ação:',error);
    }
  }


  // 12D-07: envio compatível da instalação pela fila que a Launcher já recebe.
  // A Edge Function atual entrega sync_configuration, então o comando de instalação
  // precisa ir como sync_configuration com payload completo de instalação.
  function buildRemoteInstallPayload(basePayload,remoteType,reason){
    const apkUrl=String(basePayload?.apk_url||basePayload?.download_url||basePayload?.url||'').trim();
    const appName=String(basePayload?.app_name||basePayload?.name||basePayload?.app_key||basePayload?.app_id||'Aplicativo').trim();
    return Object.assign({},basePayload,{
      remote_command_type:remoteType,
      launcher_action:remoteType,
      actual_command_type:remoteType,
      original_command_type:remoteType,
      command_action:remoteType,
      action:remoteType,
      reason,
      install_request_source:'jc_box_control_12d07',
      compatibility_delivery:'sync_configuration_remote_install',
      apk_url:apkUrl,
      download_url:apkUrl,
      url:apkUrl,
      app_name:appName,
      name:appName,
      target_device_id:selectedId(),
      target_device_label:state.selected?.label||state.selected?.device_name||null,
      requested_at:new Date().toISOString()
    });
  }

  function validateRemoteInstallPayload(payload,remoteType){
    const errors=[];
    if(!selectedId())errors.push('device_id ausente');
    if(String(payload?.target_device_id||'')!==String(selectedId()))errors.push('target_device_id diferente da Box selecionada');
    if(!/^https?:/i.test(String(payload?.apk_url||'')))errors.push('apk_url ausente ou inválida');
    if(!String(payload?.app_name||payload?.name||'').trim())errors.push('app_name ausente');
    const aliases=[payload?.remote_command_type,payload?.launcher_action,payload?.actual_command_type,payload?.original_command_type,payload?.command_action,payload?.action].map(x=>String(x||''));
    if(!aliases.includes(remoteType))errors.push('alias de instalação ausente no payload');
    return errors;
  }

  async function insertRemoteInstallViaSync(basePayload,remoteType,reason,logEventType,logPayload,packageName){
    const deliveryCommandType='sync_configuration';
    const payload=buildRemoteInstallPayload(basePayload,remoteType,reason);
    const errors=validateRemoteInstallPayload(payload,remoteType);
    if(errors.length)throw new Error('Payload de instalação incompleto: '+errors.join(', '));
    const row={
      owner_id:ownerId(),
      device_id:selectedId(),
      command_type:deliveryCommandType,
      payload,
      status:'pending',
      requested_by:state.access.profile.id,
      created_at:new Date().toISOString()
    };
    const result=await A.client.from('jc_launcher_commands').insert(row).select('id,device_id,command_type,payload,status,delivery_attempts,created_at').single();
    if(result.error)throw result.error;
    const saved=result.data||row;
    const savedPayload=saved.payload||payload;
    const savedErrors=validateRemoteInstallPayload(savedPayload,remoteType);
    if(savedErrors.length)throw new Error('Comando salvo, mas payload voltou incompleto: '+savedErrors.join(', '));
    await logPanelEvent(logEventType,Object.assign({},logPayload,{delivery_command_type:deliveryCommandType,remote_command_type:remoteType,command_id:saved.id,compatibility_delivery:'sync_configuration_remote_install'}),true,packageName||null);
    return saved;
  }

  // 12D-08: ações do UniTV Free em etapas. O APK só é enviado depois que
  // a Box verificar/gravar o .config e confirmar pelo status do comando.
  function buildRemoteActionPayload(basePayload,remoteType,reason){
    const appName=String(basePayload?.app_name||basePayload?.name||basePayload?.app_key||basePayload?.app_id||'UniTV Free').trim();
    return Object.assign({},basePayload,{
      remote_command_type:remoteType,
      launcher_action:remoteType,
      actual_command_type:remoteType,
      original_command_type:remoteType,
      command_action:remoteType,
      action:remoteType,
      reason,
      install_request_source:'jc_box_control_12d08',
      compatibility_delivery:'sync_configuration_remote_action',
      app_name:appName,
      name:appName,
      target_device_id:selectedId(),
      target_device_label:state.selected?.label||state.selected?.device_name||null,
      requested_at:new Date().toISOString()
    });
  }

  function validateRemoteActionPayload(payload,remoteType){
    const errors=[];
    if(!selectedId())errors.push('device_id ausente');
    if(String(payload?.target_device_id||'')!==String(selectedId()))errors.push('target_device_id diferente da Box selecionada');
    if(!String(payload?.app_name||payload?.name||'').trim())errors.push('app_name ausente');
    const aliases=[payload?.remote_command_type,payload?.launcher_action,payload?.actual_command_type,payload?.original_command_type,payload?.command_action,payload?.action].map(x=>String(x||''));
    if(!aliases.includes(remoteType))errors.push('alias de ação ausente no payload');
    return errors;
  }

  async function insertRemoteActionViaSync(basePayload,remoteType,reason,logEventType,logPayload,packageName){
    const deliveryCommandType='sync_configuration';
    const payload=buildRemoteActionPayload(basePayload,remoteType,reason);
    const errors=validateRemoteActionPayload(payload,remoteType);
    if(errors.length)throw new Error('Payload da ação incompleto: '+errors.join(', '));
    const row={
      owner_id:ownerId(),
      device_id:selectedId(),
      command_type:deliveryCommandType,
      payload,
      status:'pending',
      requested_by:state.access.profile.id,
      created_at:new Date().toISOString()
    };
    const result=await A.client.from('jc_launcher_commands').insert(row).select('id,device_id,command_type,payload,status,delivery_attempts,created_at').single();
    if(result.error)throw result.error;
    const saved=result.data||row;
    const savedErrors=validateRemoteActionPayload(saved.payload||payload,remoteType);
    if(savedErrors.length)throw new Error('Comando salvo, mas payload voltou incompleto: '+savedErrors.join(', '));
    await logPanelEvent(logEventType,Object.assign({},logPayload,{delivery_command_type:deliveryCommandType,remote_command_type:remoteType,command_id:saved.id,compatibility_delivery:'sync_configuration_remote_action'}),true,packageName||null);
    return saved;
  }

  function unitvCommandBasePayload(app){
    const compatible=selectedCompatibleVersions(app);
    const unitvPrimary=compatible.find(v=>/5\.1\.0/.test([v.version_label,v.apk_url,v.id].join(' ')))||unitvCatalogVersion(app,'primary')||compatible.find(x=>x.recommended)||compatible[0]||{};
    const unitvFallback=compatible.find(v=>/5\.3\.1/.test([v.version_label,v.apk_url,v.id].join(' ')))||unitvCatalogVersion(app,'fallback')||null;
    const special=unitvSpecialInstallPayload(app,unitvPrimary,unitvFallback);
    return {
      app_id:app.id,
      app_key:app.app_key||app.id,
      app_name:app.name||'UniTV Free',
      package_name:app.package_name||null,
      install_mode:'unitv_free_step_by_step',
      source:app.source||state.installCatalog?.source||'catalog',
      version_id:unitvPrimary.id||null,
      version_label:unitvPrimary.version_label||'UniTV Free 5.1.0 — principal',
      apk_url:unitvPrimary.apk_url||officialApkUrl('UniTV.Free.5.1.0.0.apk'),
      fallback_apk_url:special.apk_strategy?.fallback?.apk_url||null,
      special_install:special
    };
  }

  async function sendUnitvVerify(appId){
    if(!commandTargetReady('verificar arquivos UniTV Free'))return;
    const app=asArray(state.installCatalog?.catalog).find(x=>String(x.id)===String(appId));
    if(!app||!isUnitvApp(app)){toast('Selecione o UniTV Free.','error');return;}
    if(!confirm(`Verificar arquivos técnicos do UniTV Free na ${state.selected.label||'Box selecionada'}?`))return;
    loading(true,'Enviando verificação para a Box');
    try{
      await ensureOfficialCatalogAppPersisted(app);
      const payload=unitvCommandBasePayload(app);
      payload.check_files=['.config','.properties','Alarms/system_uf/google.wav'];
      payload.no_cleanup=true;
      await insertRemoteActionViaSync(payload,'verify_unitv_files','unitv_verify_files_requested_12D08','unitv_files_verify_requested',{app_name:app.name,step:'verify_files'},app.package_name||null);
      toast('Verificação enviada para a Box. Aguarde a confirmação na fila.');
      await loadSelectedData();
    }catch(error){toast(errorText(error),'error');}finally{loading(false);}
  }

  async function sendUnitvConfig(appId){
    if(!commandTargetReady('enviar .config do UniTV Free'))return;
    const app=asArray(state.installCatalog?.catalog).find(x=>String(x.id)===String(appId));
    if(!app||!isUnitvApp(app)){toast('Selecione o UniTV Free.','error');return;}
    if(!confirm(`Enviar somente o arquivo .config para ${state.selected.label||'esta Box'}?

Depois que a Box confirmar, use o botão Instalar UniTV Free.`))return;
    loading(true,'Enviando .config para a Box');
    try{
      await ensureOfficialCatalogAppPersisted(app);
      const payload=unitvCommandBasePayload(app);
      payload.prepare_step='config_only';
      payload.file_role='config';
      payload.save_as='.config';
      payload.cleanup_before_receive=false;
      payload.verify_before_receive=true;
      payload.config_source=payload.special_install?.primary_install?.config_source||payload.special_install?.config_source||null;
      payload.required_files=['config'];
      payload.install_after_files=false;
      payload.do_not_install_apk=true;
      await insertRemoteActionViaSync(payload,'prepare_unitv_config','unitv_prepare_config_requested_12D08','unitv_config_send_requested',{app_name:app.name,step:'prepare_config_only'},app.package_name||null);
      toast('.config enviado para a fila da Box. Aguarde completar antes de instalar o APK.');
      await loadSelectedData();
    }catch(error){toast(errorText(error),'error');}finally{loading(false);}
  }

  async function installCatalogApp(appId,versionId){
    if(!commandTargetReady('instalar APK'))return;
    const app=asArray(state.installCatalog?.catalog).find(x=>String(x.id)===String(appId));
    const compatible=selectedCompatibleVersions(app);
    const specialUniTV=isUnitvApp(app);
    const unitvPrimary=specialUniTV?(compatible.find(v=>/5\.1\.0/.test([v.version_label,v.apk_url,v.id].join(' ')))||unitvCatalogVersion(app,'primary')):null;
    const unitvFallback=specialUniTV?(compatible.find(v=>/5\.3\.1/.test([v.version_label,v.apk_url,v.id].join(' ')))||unitvCatalogVersion(app,'fallback')):null;
    const version=specialUniTV?(unitvPrimary||compatible.find(x=>x.recommended)||compatible[0]):(compatible.find(x=>String(x.id)===String(versionId))||compatible.find(x=>x.recommended)||compatible[0]);
    if(!app||!version){toast('Nenhuma versão compatível foi encontrada.','error');return;}
    if(!/^(https?:|intent:|market:)/i.test(String(version.apk_url||''))){toast('A versão escolhida não possui URL válida de APK.','error');return;}
    const confirmText=specialUniTV?`Instalar o APK UniTV Free em ${state.selected.label||'esta Box'}?\n\nUse este botão somente depois que a Box confirmar o recebimento do .config.`:`Enviar a instalação de ${app.name} ${version.version_label} para ${state.selected.label||'esta Box'}?`;
    if(!confirm(confirmText))return;
    loading(true,'Enviando instalação para a Box');
    try{
      await ensureOfficialCatalogAppPersisted(app);
      const commandType=specialUniTV?'install_unitv_free':'install_catalog_app';
      const payload={app_id:app.id,app_key:app.app_key||app.id,app_name:app.name,package_name:app.package_name||null,version_id:version.id,version_label:version.version_label,apk_url:version.apk_url,download_code:version.download_code||null,install_mode:specialUniTV?'unitv_free_apk_after_config':(app.install_mode||'simple'),source:app.source||state.installCatalog?.source||'catalog'};
      if(specialUniTV){const special=unitvSpecialInstallPayload(app,unitvPrimary,unitvFallback);payload.special_install=special;payload.fallback_apk_url=special.apk_strategy.fallback.apk_url;payload.config_required_before_install=true;payload.must_verify_config_before_install=true;payload.do_not_prepare_files=true;}
      if(state.real){await insertRemoteInstallViaSync(payload,commandType,specialUniTV?'unitv_apk_after_config_requested_12D08':'remote_install_requested_12D08',specialUniTV?'unitv_apk_install_queued':'install_queued',{app_name:app.name,version_label:version.version_label,install_mode:payload.install_mode,source:payload.source,special_install:Boolean(payload.special_install)},app.package_name||null);}
      toast('Instalação adicionada à fila da Box.');await loadSelectedData();
    }catch(error){toast(errorText(error),'error');}finally{loading(false);}
  }

  async function setInstallGrant(appId,enabled){
    if(!requireSelected())return;
    loading(true,enabled?'Liberando aplicativo':'Retirando aplicativo');
    try{
      const app=asArray(state.installCatalog?.catalog).find(x=>String(x.id)===String(appId));
      await ensureOfficialCatalogAppPersisted(app);
      if(state.real)await rpc('jc_launcher_set_install_grant',{p_payload:{owner_id:ownerId(),app_id:appId,version_id:null,enabled}});
      await loadSelectedData();
      toast(enabled?'Aplicativo liberado para este cliente.':'Aplicativo retirado da área de instalação.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  function toggleAdvancedInstall(){
    const card=$('advancedInstallCard');if(!card)return;
    if(!isAdmin()){toast('Modo avançado disponível somente para ADM.','error');return;}
    const hidden=card.classList.toggle('hidden');
    card.setAttribute('aria-hidden',hidden?'true':'false');
  }

  async function sendManualInstall(){
    if(!commandTargetReady('instalar APK manual'))return;
    if(!isAdmin()){toast('Instalação manual disponível somente para ADM.','error');return;}
    const name=$('manualInstallName')?.value.trim()||'APK manual';
    const packageName=$('manualInstallPackage')?.value.trim()||null;
    const versionLabel=$('manualInstallVersion')?.value.trim()||'Manual';
    const apkUrl=$('manualInstallUrl')?.value.trim()||'';
    const installMode=$('manualInstallMode')?.value||'simple';
    if(!/^(https?:|intent:|market:)/i.test(apkUrl)){toast('Informe uma URL direta válida do APK.','error');return;}
    if(!confirm(`Enviar instalação manual de ${name} para ${state.selected.label||'esta Box'}?`))return;
    loading(true,'Enviando APK manual para a Box');
    try{
      const specialUniTV=installMode==='unitv_free';
      const payload={manual:true,source:'advanced_admin',app_id:'manual_'+Date.now(),app_key:'manual',app_name:name,package_name:packageName,version_id:null,version_label:versionLabel,apk_url:apkUrl,download_code:null,install_mode:installMode};
      if(specialUniTV)payload.special_install=unitvSpecialInstallPayload(null,{apk_url:apkUrl,version_label:versionLabel},null);
      const commandType=specialUniTV?'install_unitv_free':'install_catalog_app';
      if(state.real){await insertRemoteInstallViaSync(payload,commandType,'remote_manual_install_requested_12D07','install_manual_queued',{app_name:name,version_label:versionLabel,install_mode:installMode},packageName);}
      ['manualInstallName','manualInstallPackage','manualInstallVersion','manualInstallUrl'].forEach(id=>{const el=$(id);if(el)el.value='';});
      toast('APK manual adicionado à fila da Box.');await loadSelectedData();
    }catch(error){toast(errorText(error),'error');}finally{loading(false);}
  }

  function renderLauncherEvents(){
    const box=$('launcherEventHistory');if(!box)return;
    const days=Number($('historyPeriod')?.value||0),type=$('historyTypeFilter')?.value||'all',term=String($('historyAppFilter')?.value||'').trim().toLowerCase(),status=$('historyStatusFilter')?.value||'all';
    const cutoff=days?Date.now()-days*86400000:0;
    const rows=asArray(state.launcherHistory?.history).filter(item=>{
      const payload=item.payload||{},event=String(item.event_type||'').toLowerCase(),failed=event.includes('failed')||Boolean(payload.error)||item.success===false;
      const text=[event,item.package_name,payload.app_name,payload.version_label].join(' ').toLowerCase();
      const typeOk=type==='all'||(type==='login'&&/(login|connect|disconnect|session)/.test(event))||(type==='install'&&/install/.test(event))||(type==='config'&&/(config|properties|google_wav|activation|cleanup)/.test(event))||(type==='command'&&/(command|message|block|unlock)/.test(event))||(type==='billing'&&/(billing|payment|overdue)/.test(event))||(type==='favorite'&&/favorite/.test(event))||(type==='license'&&/(license|credit)/.test(event))||(type==='device'&&/(device|box|equipment)/.test(event))||(type==='sync'&&/(sync|ack|heartbeat)/.test(event));
      return typeOk&&(!cutoff||new Date(item.occurred_at).getTime()>=cutoff)&&(!term||text.includes(term))&&(status==='all'||(status==='error'&&failed)||(status==='success'&&!failed));
    });
    box.innerHTML=rows.length?rows.map(item=>{const payload=item.payload||{},label=payload.app_name||payload.version_label||item.package_name||item.event_type,failed=String(item.event_type||'').includes('failed')||Boolean(payload.error);return `<div class="timeline-row"><div><b>${esc(String(item.event_type||'evento').replace(/_/g,' ').toUpperCase())}</b><small>${esc(label||'Launcher')} • ${dateTime(item.occurred_at)}${payload.error?' • '+esc(payload.error):''}</small></div><span class="pill ${failed?'failed':'success'}">${failed?'ERRO':'OK'}</span></div>`;}).join(''):'<div class="empty">Nenhum evento encontrado com estes filtros.</div>';
  }

  function renderFavorites(){
    const box=$('favoriteList');if(!box)return;
    const rows=asArray(state.favorites).slice().sort((a,b)=>number(a.sort_order,0)-number(b.sort_order,0));
    box.innerHTML=rows.length?rows.map((item,index)=>`<div class="app-row"><div><b>${esc(item.app_name||item.package_name)}</b><small>${esc(item.package_name)}</small></div><div class="row-actions favorite-order-actions"><button class="btn small" data-fav-up="${index}" ${index===0?'disabled':''}>↑</button><button class="btn small" data-fav-down="${index}" ${index===rows.length-1?'disabled':''}>↓</button><button class="btn small red" data-fav-remove="${index}">Remover</button></div></div>`).join(''):'<div class="empty">Nenhum favorito remoto configurado.</div>';
    box.querySelectorAll('[data-fav-up]').forEach(b=>b.onclick=()=>moveFavorite(Number(b.dataset.favUp),-1));box.querySelectorAll('[data-fav-down]').forEach(b=>b.onclick=()=>moveFavorite(Number(b.dataset.favDown),1));box.querySelectorAll('[data-fav-remove]').forEach(b=>b.onclick=()=>removeFavorite(Number(b.dataset.favRemove)));
  }
  function normalizeFavoriteOrder(){state.favorites=asArray(state.favorites).map((x,i)=>({...x,sort_order:i}));renderFavorites();}
  function moveFavorite(index,delta){const rows=asArray(state.favorites).slice().sort((a,b)=>number(a.sort_order,0)-number(b.sort_order,0)),target=index+delta;if(target<0||target>=rows.length)return;[rows[index],rows[target]]=[rows[target],rows[index]];state.favorites=rows;normalizeFavoriteOrder();}
  function removeFavorite(index){const rows=asArray(state.favorites).slice().sort((a,b)=>number(a.sort_order,0)-number(b.sort_order,0));rows.splice(index,1);state.favorites=rows;normalizeFavoriteOrder();}
  function addFavorite(){const app_name=$('favoriteAppName').value.trim(),package_name=$('favoritePackage').value.trim();if(!package_name||!/^([a-zA-Z][\w]*\.)+[a-zA-Z][\w]*$/.test(package_name)){toast('Informe um pacote Android válido.','error');return;}if(asArray(state.favorites).some(x=>x.package_name===package_name)){toast('Este pacote já está nos favoritos.','error');return;}state.favorites.push({app_name:app_name||package_name,package_name,sort_order:state.favorites.length});$('favoriteAppName').value='';$('favoritePackage').value='';renderFavorites();}
  async function saveFavorites(){if(!requireSelected())return;loading(true,'Salvando favoritos');try{const payload={owner_id:ownerId(),device_id:selectedId(),favorites:asArray(state.favorites).map((x,i)=>({app_name:x.app_name,package_name:x.package_name,sort_order:i}))};if(state.real){try{await rpc('jc_launcher_save_favorites_v2',{p_payload:payload});}catch(error){if(String(error?.message||error).toLowerCase().includes('function')||String(error?.message||error).toLowerCase().includes('does not exist'))await rpc('jc_launcher_save_favorites',{p_payload:payload});else throw error;}}toast('Favoritos salvos e sincronização enviada.');await loadSelectedData();}catch(error){toast(errorText(error),'error');}finally{loading(false);}}

  function renderAll(){
    renderDeviceList();
    renderStats();
    renderHeader();
    if(!state.selected)return;
    renderOverview();
    fillBillingForm();
    renderApps();
    fillEquipment();
    renderMessages();
    renderInstallCatalog();
    renderFavorites();
    renderCycles();
    renderCommands();
    renderAudit();
    renderLauncherEvents();
    renderAutomation();
    activateTab(state.activeTab,false);
  }

  function activateTab(name,updateHash=true){
    const valid=['overview','billing','apps','install','favorites','equipment','messages','history'];
    const tab=valid.includes(name)?name:'overview';
    state.activeTab=tab;
    $$('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));
    $$('[data-pane]').forEach(el=>el.classList.toggle('active',el.dataset.pane===tab));
    if(updateHash){history.replaceState(null,'','#'+tab);}
  }

  function activateHashTab(){const hash=location.hash.replace('#','');if(hash)activateTab(hash,false);}

  function syncPreview(showBilling,billingData){
    if(!state.selected)return;
    const profile=billingData||readBillingForm();
    const defaultApps=[
      {id:'jc',name:'JC APK TV',icon:'JC'},
      {id:'youtube',name:'YouTube',icon:'▶'},
      {id:'netflix',name:'Netflix',icon:'N'},
      {id:'playstore',name:'Play Store',icon:'PS'},
      {id:'files',name:'Arquivos',icon:'FM'},
      {id:'settings',name:'Ajustes',icon:'⚙'}
    ];
    const known=new Set(defaultApps.map(app=>app.name.toLowerCase()));
    asArray(state.config?.billing_app_targets).filter(t=>t.enabled!==false).forEach(target=>{
      const name=target.app_name||target.package_name;
      if(!known.has(String(name).toLowerCase())){defaultApps.push({id:slug(target.package_name),name,icon:String(name).slice(0,2).toUpperCase()});known.add(String(name).toLowerCase());}
    });
    const qr=String(profile.qr_code_payload||'');
    const preview={
      deviceName:state.selected.label||state.selected.device_name||'TV Box',
      edition:state.selected.edition||'pro',
      status:state.selected.status||'offline',
      boxBlocked:Boolean(state.selected.blocked),
      blockReason:state.selected.block_message||'Entre em contato com o responsável para combinar a devolução do equipamento.',
      apps:defaultApps,
      billing:{
        enabled:Boolean(profile.enabled),displayFromDay:number(profile.display_from_day,5),dueDay:number(profile.due_day,10),amount:String(profile.amount||'0').replace('.',','),recipientName:profile.receiver_name||'',pixKey:profile.pix_key||profile.pix_copy_paste||'',accountLabel:[profile.bank_name,profile.account_label].filter(Boolean).join(' • '),qrCodeUrl:/^(https?:|data:image)/i.test(qr)?qr:'',message:profile.message||'',allowDismiss:Boolean(profile.allow_dismiss),repeatMonthly:Boolean(profile.repeat_monthly)
      },
      billingPreview:Boolean(showBilling)
    };
    try{localStorage.setItem(PREVIEW_KEY,JSON.stringify(preview));}catch(e){}
    try{const channel=new BroadcastChannel('jc-box-control');channel.postMessage({type:'state',state:preview});channel.close();}catch(e){}
    if(showBilling)toast('Prévia enviada para a demonstração no início do painel.');
  }

  async function saveBilling(){
    if(!requireSelected())return;
    const payload=readBillingForm();
    loading(true,'Salvando cobrança');
    try{
      if(state.real){await rpc('jc_launcher_save_billing_configuration',{p_payload:payload});await loadSelectedData();}
      else{state.config.billing_profile=Object.assign({id:'demo-profile'},payload);renderAll();}
      syncPreview(false,payload);
      toast('Cobrança salva. O bloqueio permanece limitado aos aplicativos selecionados.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function addAppTarget(){
    if(!requireSelected())return;
    const packageName=$('appTargetPackage').value.trim().toLowerCase(),appName=$('appTargetName').value.trim();
    if(!/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/i.test(packageName)){toast('Digite um nome de pacote válido, por exemplo com.exemplo.app.','error');return;}
    const payload={owner_id:ownerId(),device_id:$('appTargetAllDevices').checked?null:selectedId(),package_name:packageName,app_name:appName||packageName,enabled:true,block_on_overdue:true};
    loading(true,'Salvando aplicativo');
    try{
      if(state.real){await rpc('jc_launcher_save_billing_app_target',{p_payload:payload});await loadSelectedData();}
      else{state.config.billing_app_targets=asArray(state.config.billing_app_targets).filter(t=>!(t.package_name===packageName&&String(t.device_id||'')===String(payload.device_id||''))).concat([Object.assign({id:'demo-'+Date.now()},payload)]);renderAll();}
      $('appTargetName').value='';$('appTargetPackage').value='';toast('Aplicativo incluído na cobrança.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function toggleAppTarget(id){
    const target=asArray(state.config?.billing_app_targets).find(item=>String(item.id)===String(id));if(!target)return;
    const payload={owner_id:ownerId(),device_id:target.device_id||null,package_name:target.package_name,app_name:target.app_name,enabled:target.enabled===false,block_on_overdue:true};
    loading(true,'Atualizando aplicativo');
    try{
      if(state.real){await rpc('jc_launcher_save_billing_app_target',{p_payload:payload});await loadSelectedData();}
      else{target.enabled=payload.enabled;renderApps();renderOverview();}
      toast(payload.enabled?'Aplicativo ativado.':'Aplicativo retirado do bloqueio automático.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function removeAppTarget(id){
    const target=asArray(state.config?.billing_app_targets).find(item=>String(item.id)===String(id));if(!target)return;
    if(!confirm(`Remover ${target.app_name||target.package_name} da cobrança?`))return;
    loading(true,'Removendo aplicativo');
    try{
      if(state.real){await rpc('jc_launcher_remove_billing_app_target',{p_payload:{owner_id:ownerId(),id:target.id,device_id:target.device_id||null,package_name:target.package_name}});await loadSelectedData();}
      else{state.config.billing_app_targets=asArray(state.config.billing_app_targets).filter(item=>String(item.id)!==String(id));renderAll();}
      toast('Aplicativo removido da cobrança.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  function equipmentPayload(){
    const mode=$('equipmentOwnership').value;
    return {owner_id:ownerId(),device_id:selectedId(),equipment_type:$('equipmentType').value.trim()||'tv_box',ownership_mode:mode,serial_number:$('equipmentSerial').value.trim(),asset_tag:$('equipmentAsset').value.trim(),notes:$('equipmentNotes').value.trim(),launcher_full_block_enabled:(mode==='rented'||mode==='loaned')&&$('equipmentFullBlock').checked,return_message_template_key:'equipment_return'};
  }

  async function saveEquipment(showToast=true){
    if(!requireSelected())return null;
    const payload=equipmentPayload();
    try{
      if(state.real){const data=await rpc('jc_launcher_save_device_equipment',{p_payload:payload});if(showToast)await loadSelectedData();return data;}
      state.config.equipment=Object.assign({id:'demo-equipment',status:'active',return_required:false},payload);if(showToast)renderAll();return {ok:true,equipment:state.config.equipment};
    }catch(error){toast(errorText(error),'error');throw error;}
  }

  async function handleSaveEquipment(){
    loading(true,'Salvando equipamento');
    try{await saveEquipment(true);toast('Equipamento salvo.');}
    catch(e){}
    finally{loading(false);}
  }

  async function requestReturn(){
    if(!requireSelected())return;
    const mode=$('equipmentOwnership').value;
    if(mode!=='rented'&&mode!=='loaned'){toast('A devolução só pode ser solicitada para aparelho alugado ou emprestado.','error');return;}
    const wantsBlock=$('equipmentRequestBlock').checked&&$('equipmentFullBlock').checked;
    const message=$('equipmentReturnMessage').value.trim();
    const warning=wantsBlock?'A Launcher inteira será bloqueada para solicitar a devolução do aparelho cedido. Continuar?':'Será registrada uma solicitação de devolução sem bloquear a Launcher. Continuar?';
    if(!confirm(warning))return;
    loading(true,'Solicitando devolução');
    try{
      await saveEquipment(false);
      if(state.real){await rpc('jc_launcher_request_equipment_return',{p_payload:{owner_id:ownerId(),device_id:selectedId(),message,block_launcher:wantsBlock}});await load();}
      else{state.config.equipment.return_required=true;state.config.equipment.status='return_requested';state.config.equipment.return_requested_at=new Date().toISOString();state.selected.blocked=wantsBlock;state.selected.block_reason=wantsBlock?'equipment_return':null;state.selected.block_message=wantsBlock?message:null;renderAll();}
      syncPreview(false,readBillingForm());
      state.equipmentRequestBlock=false;
      toast(wantsBlock?'Devolução solicitada e bloqueio de equipamento registrado.':'Devolução solicitada sem bloqueio total.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function markReturned(){
    if(!requireSelected()||!confirm('Confirmar que o equipamento foi devolvido? O bloqueio de devolução será retirado.'))return;
    loading(true,'Confirmando devolução');
    try{
      if(state.real){await rpc('jc_launcher_mark_equipment_returned',{p_payload:{owner_id:ownerId(),device_id:selectedId()}});await load();}
      else{state.config.equipment.status='returned';state.config.equipment.return_required=false;state.config.equipment.returned_at=new Date().toISOString();state.selected.blocked=false;state.selected.block_reason=null;state.selected.block_message=null;renderAll();}
      syncPreview(false,readBillingForm());toast('Equipamento marcado como devolvido e bloqueio de devolução retirado.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function saveMessage(card){
    if(!requireSelected()||!card)return;
    const key=card.dataset.messageKey,payload={owner_id:ownerId(),template_key:key,title:card.querySelector('[data-message-title]').value.trim(),message:card.querySelector('[data-message-text]').value.trim(),enabled:card.querySelector('[data-message-enabled]').checked};
    if(!payload.message){toast('A mensagem não pode ficar vazia.','error');return;}
    loading(true,'Salvando mensagem');
    try{
      if(state.real){await rpc('jc_launcher_save_message_template',{p_payload:payload});await loadSelectedData();}
      else{const list=asArray(state.config.message_templates),index=list.findIndex(item=>item.template_key===key);if(index>=0)list[index]=Object.assign(list[index],payload);else list.push(Object.assign({id:'demo-'+Date.now()},payload));renderAll();}
      toast('Mensagem salva.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function confirmPayment(){
    if(!requireSelected())return;
    const cycle=state.config?.current_cycle||null;
    if(cycle&&String(cycle.status).toLowerCase()==='paid'){toast('Este ciclo já está pago.');return;}
    if(!confirm('Confirmar o pagamento deste mês e gerar a liberação automática dos aplicativos?'))return;
    const reference=prompt('Referência do pagamento (opcional):','')||'';
    loading(true,'Confirmando pagamento');
    try{
      const payload={owner_id:ownerId(),device_id:selectedId(),cycle_id:cycle?.id||null,reference_month:cycle?.reference_month||monthStart(),payment_reference:reference,notes:'Pagamento confirmado pelo JC Box Control'};
      if(state.real){const result=await rpc('jc_launcher_confirm_billing_payment',{p_payload:payload});await loadSelectedData();toast(`Pagamento confirmado. ${number(result?.release_commands,0)} comando(s) de liberação criado(s).`);}
      else{if(!state.config.current_cycle)state.config.current_cycle={id:'demo-cycle',reference_month:monthStart(),due_date:monthStart().slice(0,8)+'10',amount:number(state.config.billing_profile?.amount,0)};state.config.current_cycle.status='paid';state.config.current_cycle.paid_at=new Date().toISOString();state.config.cycles=[state.config.current_cycle];renderAll();toast('Demonstração: pagamento confirmado e aplicativos liberados.');}
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function insertDeviceReal(row){
    try{
      const created=await rpc('jc_launcher_admin_create_device_safe',{p_payload:row});
      if(created&&typeof created==='object')return created;
    }catch(error){
      if(!isMissingFunctionError(error))throw error;
      console.warn('RPC seguro de criação de Box ainda não existe; tentando insert direto:',error);
    }
    const common={edition:row.edition,model:row.model,status:row.status,owner_id:row.owner_id};
    const attempts=[
      row,
      Object.assign({device_name:row.label},common,{blocked:row.blocked,configuration_version:row.configuration_version,metadata:row.metadata}),
      Object.assign({device_name:row.label},common),
      {device_name:row.label,status:row.status,owner_id:row.owner_id}
    ];
    let lastError=null;
    for(const payload of attempts){
      const result=await A.client.from('jc_launcher_devices').insert(payload).select().single();
      if(!result.error)return result.data;
      lastError=result.error;
      const msg=String(result.error?.message||'');
      if(/permission denied/i.test(msg))throw result.error;
      if(!/column|schema cache|could not find|does not exist/i.test(msg))break;
    }
    throw lastError||new Error('Não foi possível cadastrar a Box.');
  }

  async function addDevice(){
    const targetOwner=$('deviceModal')?.dataset.ownerId||ownerId()||state.access?.profile?.id||'';
    if(!targetOwner){toast('Selecione o cliente responsável pela Box.','error');return;}
    const row={label:$('deviceName').value.trim()||'Nova Box',edition:$('deviceEdition').value,model:$('deviceModel').value.trim()||'Android TV',status:'offline',blocked:false,configuration_version:0,owner_id:targetOwner,metadata:{created_from:'jc-box-control',created_for_owner:targetOwner,flow:'box_first_precreated',access_created_after:false}};
    loading(true,'Adicionando Box');
    try{
      if(state.real){const data=await insertDeviceReal(row);state.selected=Object.assign({},data,{label:data?.label||data?.device_name||row.label});closeModal('deviceModal');await load();if($('launcherAccessModal')?.classList.contains('open')){await loadLauncherAccessOwners();await loadLauncherAccessCredential();}}
      else{row.id='demo-'+Date.now();row.license_status='inactive';state.devices.unshift(row);state.selected=row;state.config=buildDemoConfig(row);closeModal('deviceModal');renderAll();}
      toast('Box adicionada e selecionada. Agora você pode clicar em Acesso para gerar usuário e senha.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function saveLicense(){
    if(!requireSelected())return;
    const months=Math.max(1,number($('licenseMonths').value,1)),edition=$('licenseEdition').value;
    loading(true,'Atualizando licença');
    try{
      if(state.real){try{await rpc('jc_launcher_grant_license_v2',{p_payload:{owner_id:ownerId(),device_id:selectedId(),edition,months}});}catch(error){if(String(error?.message||error).includes('function')||String(error?.message||error).includes('does not exist'))await rpc('admin_launcher_grant_license',{p_device_id:selectedId(),p_edition:edition,p_months:months});else throw error;}closeModals();await load();}
      else{state.selected.edition=edition;state.selected.license_status='active';state.selected.license_expires_at=new Date(Date.now()+months*30*864e5).toISOString();closeModals();renderAll();}
      toast(`${months} crédito(s) = ${months} mês(es) liberado(s).`);
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function sendCommand(){
    if(!requireSelected()||!state.pendingCommand)return;
    const payload={notes:$('commandPayload').value.trim()};
    loading(true,'Registrando comando');
    try{
      if(state.real){const result=await A.client.from('jc_launcher_commands').insert({owner_id:ownerId(),device_id:selectedId(),command_type:state.pendingCommand,payload,status:'pending',requested_by:state.access.profile.id,created_at:new Date().toISOString()});if(result.error)throw result.error;await logPanelEvent('command_queued',{command_type:state.pendingCommand,notes:payload.notes||''},true,null);}
      closeModals();$('commandPayload').value='';toast('Comando registrado. A entrega será concluída pelo APK autenticado.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }


  function accessOwnerName(owner){
    return owner?.full_name||owner?.username||'Cliente';
  }

  function selectedBoxForAccess(owner){
    const selected=state.selected;
    const ownerValue=String(owner?.user_id||owner?.id||owner||$('launcherAccessOwner')?.value||'');
    if(!selected||!ownerValue)return null;
    if(String(selected.owner_id||'')===ownerValue)return selected;
    const currentUser=String(state.access?.profile?.id||'');
    const selectedOwner=String(selected.owner_id||'');
    const adminPreSale=isAdmin()&&currentUser&&selectedOwner===currentUser;
    const precreated=String(selected.metadata?.flow||'').includes('box_first')||String(selected.metadata?.created_from||'')==='jc-box-control';
    return (adminPreSale&&precreated)?selected:null;
  }

  function suggestedAccessUsername(owner){
    const selectedBox=selectedBoxForAccess(owner);
    const ownerName=accessOwnerName(owner);
    const boxName=selectedBox?(selectedBox.label||selectedBox.device_name||selectedBox.model||''):'';
    const source=boxName?`${ownerName}-${boxName}`:ownerName;
    const base=source.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'')||'Cliente';
    return 'JC-L-'+base.split('-').filter(Boolean).map(part=>part.charAt(0).toUpperCase()+part.slice(1).toLowerCase()).join('-');
  }

  function dateTimeLocalValue(value){
    if(!value)return '';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '';
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function selectedAccessOwner(){
    const id=$('launcherAccessOwner')?.value||'';
    return state.accessOwners.find(item=>String(item.user_id)===String(id))||null;
  }

  function accessMessageText(){
    const owner=selectedAccessOwner(),access=state.accessCredential?.access||{},password=state.accessGeneratedPassword;
    if(!access.username)return 'Gere o acesso para montar a mensagem de envio.';
    const selectedEdition=$('launcherAccessEdition')?.value||access.edition||'lite',edition=selectedEdition==='pro'?'JC Launcher Pro':'JC Launcher Lite',cfg=state.accessDelivery||{},template=cfg.template||'Olá, {nome}! Seu acesso à {versao} foi criado.\n\nUsuário: {usuario}\nSenha: {senha}\nPlano: {plano}\nValidade: {vencimento}\nLink do APK: {link_apk}\nCódigo de download: {codigo_download}\nSuporte: {whatsapp_suporte}\n\n{instrucoes}';
    const delivery=state.accessCredential?.delivery||{},policy=$('launcherAccessPolicy')?.value||access.metadata?.policy||'credits';
    const vars={nome:accessOwnerName(owner),usuario:access.username,senha:password||'[redefina a senha para copiar novamente]',versao:edition,plano:policy==='admin_unlimited'?'ADM ilimitado':policy==='lifetime_benefit'?'Benefício vitalício inicial':'Licença por créditos',valor:delivery.value||'—',vencimento:access.expires_at?dateText(access.expires_at):'conforme créditos aplicados',quantidade:policy==='lifetime_benefit'?'cadastro sem limite; benefício inicial até 50 aparelhos, acima disso usa créditos':'cadastro de Box sem limite fixo',whatsapp_suporte:cfg.support_whatsapp||'(31) 99760-9439',link_apk:delivery.apk_url||'Configure em Atualizar Links',codigo_download:delivery.download_code||'Configure em Atualizar Links',instrucoes:cfg.instructions||'Instale o APK, abra a Launcher e entre com o usuário e a senha.'};
    return template.replace(/\{(nome|usuario|senha|versao|plano|valor|vencimento|quantidade|whatsapp_suporte|link_apk|codigo_download|instrucoes)\}/g,(_,key)=>vars[key]??'');
  }

  async function loadAccessDelivery(){
    if(!state.real||!A.client)return;const edition=$('launcherAccessEdition')?.value||'lite',ids=['launcher_access_delivery',`launcher_${edition}_apk`,`launcher_${edition}_download_codes`];
    const {data,error}=await A.client.from('links_catalog').select('id,value,items').in('id',ids);if(error){console.warn(error);return;}
    const settings=(data||[]).find(x=>x.id==='launcher_access_delivery');try{state.accessDelivery=JSON.parse(String(settings?.value||'{}'));}catch(_){state.accessDelivery={};}
    const link=(data||[]).find(x=>x.id===`launcher_${edition}_apk`),codes=(data||[]).find(x=>x.id===`launcher_${edition}_download_codes`),firstLink=asArray(link?.items)[0]||link?.value||'',firstCode=asArray(codes?.items)[0]||codes?.value||'';
    const parse=value=>{const text=String(value||''),pos=text.indexOf('|');return (pos>=0?text.slice(pos+1):text).trim();};
    state.accessCredential=state.accessCredential||{};state.accessCredential.delivery={apk_url:parse(firstLink),download_code:parse(firstCode)};
  }

  function updateAccessPolicyUI(){
    const policy=$('launcherAccessPolicy')?.value||'credits',field=$('launcherAccessAdminCapField');
    if(field)field.classList.add('hidden');
    if($('launcherAccessMaxDevices'))$('launcherAccessMaxDevices').value=999999;
    if(state.accessCredential?.access)$('launcherAccessMessagePreview').textContent=accessMessageText();
  }
  function renderLauncherAccess(){
    const configured=Boolean(state.accessCredential?.configured);
    const access=state.accessCredential?.access||null;
    const devices=asArray(state.accessCredential?.devices);
    const owner=selectedAccessOwner();
    const selectedBoxCard=$('launcherAccessSelectedBoxCard');
    if(selectedBoxCard){
      const ownerValue=$('launcherAccessOwner')?.value||'';
      const selected=selectedBoxForAccess(ownerValue);
      if(selected){
        const online=String(selected.status||'').toLowerCase()==='online';
        const sameOwner=String(selected.owner_id||'')===String(ownerValue);
        selectedBoxCard.hidden=false;
        selectedBoxCard.innerHTML=`<div><b>Box selecionada: ${esc(selected.label||selected.device_name||'TV Box')}</b><small>${sameOwner?'O acesso será criado para o responsável desta Box.':'Ao salvar o acesso, esta Box pré-cadastrada será vinculada ao cliente selecionado.'} Depois é só enviar usuário e senha para o cliente entrar no APK.</small></div><span class="pill ${online?'online':'offline'}">${online?'ONLINE':'OFFLINE'}</span>`;
      }else{
        selectedBoxCard.hidden=true;
        selectedBoxCard.innerHTML='';
      }
    }

    if(access){
      $('launcherAccessUsername').value=access.username||suggestedAccessUsername(owner);
      $('launcherAccessEdition').value=access.edition||'lite';
      $('launcherAccessPolicy').value=access.metadata?.policy||'credits';
      $('launcherAccessMaxDevices').value=999999;
      $('launcherAccessStatus').value=access.status||'active';
      $('launcherAccessExpires').value=dateTimeLocalValue(access.expires_at);
      $('launcherAccessStatusCard').innerHTML=`<b>${esc(access.username)} • ${String(access.status||'active').toUpperCase()}</b><span>${number(access.active_devices,0)} aparelho(s) vinculado(s) • cadastro de Box sem limite fixo • regra ${esc($('launcherAccessPolicy').selectedOptions[0]?.textContent||'por créditos')} • senha final ${esc(access.password_last4||'—')} • último acesso ${esc(dateTime(access.last_login_at))}</span>`;
    }else{
      $('launcherAccessUsername').value=suggestedAccessUsername(owner);
      $('launcherAccessEdition').value='lite';
      $('launcherAccessPolicy').value=state.access?.profile?.role==='admin'?'admin_unlimited':'credits';
      $('launcherAccessMaxDevices').value=999999;
      $('launcherAccessStatus').value='active';
      $('launcherAccessExpires').value='';
      $('launcherAccessStatusCard').innerHTML='<b>Acesso ainda não criado</b><span>Ao salvar ou gerar, o painel criará o usuário e uma senha segura.</span>';
    }

    const secret=$('launcherAccessSecret');
    secret.hidden=!state.accessGeneratedPassword;
    $('launcherAccessGeneratedPassword').textContent=state.accessGeneratedPassword||'—';
    $('launcherAccessMessagePreview').textContent=accessMessageText();
    updateAccessPolicyUI();

    const list=$('launcherAccessDeviceList');
    const header=`<div class="access-device-header"><b>Boxes vinculadas</b><button class="btn small green" id="launcherAccessAddBoxBtn" type="button">+ Cadastrar Box</button></div>`;
    if(!devices.length){
      list.innerHTML=header+'<div class="empty-small">Nenhum aparelho vinculado por este acesso.</div>';
    }else{
      list.innerHTML=header+devices.map(device=>{
        const pre=Boolean(device._precreated);
        return `<div class="access-device-item"><div><b>${esc(device.label||device.device_name||device.model||'Box')}</b><small>${esc(device.model||'Android')} • ${pre?'pré-cadastrada / aguardando login':esc(device.status||'offline')} • último contato ${esc(relativeTime(device.last_seen_at))}<br>Device ID interno: ${esc(device.id)}</small></div><div class="access-device-actions">${pre?'<span class="pill info">BOX CRIADA PRIMEIRO</span>':String(device.status)!=='detached'?`<button class="btn small" data-detach-access-device="${esc(device.id)}" type="button">Desconectar</button>`:'<span class="pill offline">DESCONECTADO</span>'}<button class="btn small red" data-delete-access-device="${esc(device.id)}" type="button">Excluir Box</button></div></div>`;
      }).join('');
      list.querySelectorAll('[data-detach-access-device]').forEach(button=>button.addEventListener('click',()=>detachLauncherAccessDevice(button.dataset.detachAccessDevice)));
      list.querySelectorAll('[data-delete-access-device]').forEach(button=>button.addEventListener('click',()=>openDeleteSelectedBox(button.dataset.deleteAccessDevice)));
    }
    const addBtn=$('launcherAccessAddBoxBtn');
    if(addBtn)addBtn.addEventListener('click',()=>openDeviceModal($('launcherAccessOwner')?.value||''));
  }

  async function queryProfileOwnersFallback(){
    const current=normalizeAccessOwner(state.access?.profile);
    if(!state.real||!A.client)return current?[current]:[];
    if(!isAdmin())return current?[Object.assign(current,{can_manage:true})]:[];
    const fieldAttempts=[
      'id,username,full_name,email,whatsapp,phone,status,role',
      'id,username,full_name,email,phone,status,role',
      'id,username,full_name,email,status,role',
      'id,username,full_name,email'
    ];
    for(const fields of fieldAttempts){
      try{
        let query=A.client.from('profiles').select(fields);
        if(fields.includes('full_name'))query=query.order('full_name',{ascending:true});
        const result=await query.limit(500);
        if(result.error)throw result.error;
        const rows=asArray(result.data).map(normalizeAccessOwner).filter(Boolean).filter(row=>row.can_manage!==false&&!isDemoOwner(row));
        if(rows.length)return rows;
      }catch(error){
        console.warn('Fallback profiles para donos da Launcher falhou:',error);
      }
    }
    return current?[Object.assign(current,{can_manage:true})]:[];
  }

  async function loadLauncherAccessOwners(){
    let rows=[];
    if(state.real){
      try{
        rows=asArray(await rpc('jc_launcher_list_accessible_owners',{})).map(normalizeAccessOwner).filter(Boolean);
      }catch(error){
        console.warn('RPC jc_launcher_list_accessible_owners indisponível; usando profiles como fallback.',error);
        rows=await queryProfileOwnersFallback();
      }
      rows=rows.filter(item=>item.can_manage!==false&&!isDemoOwner(item));
      if(!rows.length)rows=await queryProfileOwnersFallback();
      const selectedOwnerId=state.selected?.owner_id;
      if(selectedOwnerId&&!rows.some(item=>String((normalizeAccessOwner(item)||{}).user_id)===String(selectedOwnerId))){
        rows.unshift({user_id:selectedOwnerId,username:'',full_name:state.selected?.owner_name||`Responsável da ${state.selected?.label||state.selected?.device_name||'Box'}`,status:'active',can_manage:true});
      }
    }else{
      rows=[];
    }
    const unique=[];
    const seen=new Set();
    rows.forEach(item=>{
      const owner=normalizeAccessOwner(item);
      if(!owner||seen.has(String(owner.user_id)))return;
      seen.add(String(owner.user_id));
      unique.push(owner);
    });
    state.accessOwners=unique;
    const select=$('launcherAccessOwner');
    const preferred=state.selected?.owner_id||state.access?.profile?.id||state.accessOwners[0]?.user_id||'';
    select.innerHTML=state.accessOwners.length?state.accessOwners.map(item=>`<option value="${esc(item.user_id)}">${esc(accessOwnerName(item))} • ${esc(item.username||item.email||'sem usuário')}</option>`).join(''):'<option value="">Nenhum cliente disponível</option>';
    if(state.accessOwners.some(item=>String(item.user_id)===String(preferred)))select.value=preferred;
    else if(state.accessOwners[0])select.value=state.accessOwners[0].user_id;
  }

  async function loadLauncherAccessCredential(){
    const owner=$('launcherAccessOwner').value;
    state.accessGeneratedPassword='';
    if(!owner){state.accessCredential={configured:false,access:null,devices:[]};renderLauncherAccess();return;}
    if(state.real){
      state.accessCredential=await rpc('jc_launcher_get_access_credential',{p_owner_id:owner});
    }else{
      state.accessCredential={ok:true,owner_id:owner,configured:false,access:null,devices:[]};
    }
    const selectedBox=selectedBoxForAccess(owner);
    if(selectedBox){
      const devices=asArray(state.accessCredential?.devices).slice();
      if(!devices.some(item=>String(item.id)===String(selectedBox.id))){
        devices.unshift(Object.assign({},selectedBox,{status:selectedBox.status||'pré-cadastrada',_precreated:true}));
        state.accessCredential=Object.assign({ok:true,owner_id:owner},state.accessCredential||{},{devices});
      }
    }
    renderLauncherAccess();
  }

  async function openLauncherAccess(){
    loading(true,'Carregando acessos da Launcher');
    try{
      await loadLauncherAccessOwners();
      openModal('launcherAccessModal');
      await loadLauncherAccessCredential();
      await loadAccessDelivery();
      renderLauncherAccess();
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  function readLauncherAccessPayload(resetPassword){
    const expires=$('launcherAccessExpires').value;
    return {
      owner_id:$('launcherAccessOwner').value,
      device_id:selectedBoxForAccess($('launcherAccessOwner').value)?.id||selectedId()||null,
      selected_box_id:selectedBoxForAccess($('launcherAccessOwner').value)?.id||selectedId()||null,
      username:$('launcherAccessUsername').value.trim(),
      edition:$('launcherAccessEdition').value,
      max_devices:999999,
      status:$('launcherAccessStatus').value,
      expires_at:expires?new Date(expires).toISOString():null,
      reset_password:Boolean(resetPassword),
      metadata:{updated_from:'jc-box-control-13B',policy:$('launcherAccessPolicy').value,commercial_limit:false,box_registration_unlimited:true,selected_box_id:selectedBoxForAccess($('launcherAccessOwner').value)?.id||selectedId()||null,selected_box_name:selectedBoxForAccess($('launcherAccessOwner').value)?.label||selectedBoxForAccess($('launcherAccessOwner').value)?.device_name||null,flow:'box_first_access_after',lifetime_initial_benefit_devices:$('launcherAccessPolicy').value==='lifetime_benefit'?50:null,extra_devices_use_credits:$('launcherAccessPolicy').value==='lifetime_benefit'}
    };
  }

  async function assignSelectedBoxToAccessOwner(ownerIdValue,editionValue){
    const box=selectedBoxForAccess(ownerIdValue);
    if(!state.real||!box||!ownerIdValue)return;
    if(String(box.owner_id||'')===String(ownerIdValue))return;
    const payload={device_id:box.id,owner_id:ownerIdValue,edition:editionValue||$('launcherAccessEdition')?.value||box.edition||'lite',reason:'Vinculada ao criar acesso da Launcher'};
    try{
      const updated=await rpc('jc_launcher_assign_device_owner_safe',{p_payload:payload});
      if(updated&&typeof updated==='object')state.selected=Object.assign({},state.selected,updated,{label:updated.label||updated.device_name||state.selected?.label});
      return;
    }catch(error){
      if(!isMissingFunctionError(error))throw error;
      console.warn('RPC seguro de vínculo de Box ainda não existe; tentando update direto:',error);
    }
    const result=await A.client.from('jc_launcher_devices').update({owner_id:ownerIdValue,edition:payload.edition,metadata:Object.assign({},box.metadata||{},{owner_reassigned_from:box.owner_id,owner_reassigned_at:new Date().toISOString(),access_created_after:true})}).eq('id',box.id).select().single();
    if(result.error)throw result.error;
    state.selected=Object.assign({},state.selected,result.data,{label:result.data?.label||result.data?.device_name||state.selected?.label});
  }

  async function saveLauncherAccess(resetPassword){
    const mustGeneratePassword=Boolean(resetPassword||!state.accessCredential?.configured||!state.accessCredential?.access);
    const payload=readLauncherAccessPayload(mustGeneratePassword);
    if(!payload.owner_id){toast('Selecione o cliente.','error');return;}
    if(!payload.username){toast('Informe ou mantenha o usuário sugerido para a Launcher.','error');return;}
    loading(true,mustGeneratePassword?'Gerando usuário e senha':'Salvando regras');
    try{
      if(state.real){
        const result=await rpc('jc_launcher_save_access_credential',{p_payload:payload});
        state.accessGeneratedPassword=result?.generated_password||'';
        await assignSelectedBoxToAccessOwner(payload.owner_id,payload.edition);
        state.accessCredential=await rpc('jc_launcher_get_access_credential',{p_owner_id:payload.owner_id});
      }else{
        const owner=selectedAccessOwner();
        state.accessGeneratedPassword=mustGeneratePassword?'JCL-DEMO12345':'';
        state.accessCredential={ok:true,configured:true,access:{username:payload.username||suggestedAccessUsername(owner),edition:payload.edition,max_devices:payload.max_devices,active_devices:0,status:payload.status,expires_at:payload.expires_at,password_last4:state.accessGeneratedPassword.slice(-4),updated_at:new Date().toISOString(),metadata:payload.metadata},devices:[]};
      }
      renderLauncherAccess();
      toast(state.accessGeneratedPassword?'Acesso criado. Copie a senha agora.':'Regras do acesso salvas.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function copyLauncherAccess(){
    const access=state.accessCredential?.access;
    if(!access?.username){toast('Gere o acesso primeiro.','error');return;}
    if(!state.accessGeneratedPassword){toast('Por segurança, a senha não pode ser consultada. Use “Gerar / redefinir senha” para criar uma nova e copiar a mensagem.','error');return;}
    const text=accessMessageText();
    try{await navigator.clipboard.writeText(text);toast('Usuário, senha e mensagem copiados.');}
    catch(e){prompt('Copie a mensagem:',text);}
  }

  async function detachLauncherAccessDevice(deviceId,skipConfirmation=false){
    if(!deviceId)return;
    if(!skipConfirmation&&!confirm('Desconectar este aparelho? O token atual será revogado e a Box precisará entrar novamente.'))return;
    loading(true,'Desconectando aparelho');
    try{
      if(state.real){await rpc('jc_launcher_detach_access_device',{p_payload:{device_id:deviceId,reason:'Desconectado no JC Box Control'}});}
      const previous=deviceId;
      state.devices=state.real?await loadDevices():state.devices;
      state.selected=state.devices.find(item=>String(item.id)===String(previous))||state.devices[0]||null;
      if(state.accessCredential?.access&&$('launcherAccessOwner')?.value){
        try{await loadLauncherAccessCredential();}catch(error){console.warn('Acesso da Launcher não estava aberto durante a desconexão:',error);}
      }
      if(state.selected&&state.real)await loadSelectedData();else renderAll();
      toast('Aparelho desconectado.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }

  async function sendLauncherAccessWhatsapp(){
    const access=state.accessCredential?.access;if(!access?.username||!state.accessGeneratedPassword){toast('Gere ou redefina a senha antes de enviar.','error');return;}
    const owner=selectedAccessOwner(),phone=String(owner?.whatsapp||owner?.phone||'').replace(/\D/g,'');if(!phone){toast('O cliente não possui WhatsApp cadastrado. Copie a mensagem manualmente.','error');return;}
    const normalized=phone.length<=11?'55'+phone:phone;window.open('https://wa.me/'+normalized+'?text='+encodeURIComponent(accessMessageText()),'_blank','noopener');
  }
  async function disconnectSelectedBox(){if(!requireSelected())return;if(!confirm(`Desconectar ${state.selected.label||'esta Box'}? A sessão atual será revogada, mas o histórico será preservado.`))return;await detachLauncherAccessDevice(selectedId(),true);}
  function findDeviceForAction(deviceId){
    const id=String(deviceId||'');
    return state.devices.find(item=>String(item.id)===id)||asArray(state.accessCredential?.devices).find(item=>String(item.id)===id)||null;
  }
  async function deleteDeviceSafeReal(deviceId){
    try{
      await rpc('jc_launcher_delete_device_safe',{p_payload:{device_id:deviceId,confirmation:'EXCLUIR',reason:'Exclusão solicitada no JC Box Control'}});
      return;
    }catch(error){
      if(!isMissingFunctionError(error))throw error;
      console.warn('RPC jc_launcher_delete_device_safe indisponível; usando fallback seguro no painel.',error);
    }
    const now=new Date().toISOString();
    let result=await A.client.from('jc_launcher_devices').update({deleted_at:now,status:'deleted',blocked:true,metadata:{deleted_from:'jc-box-control',deleted_at:now}}).eq('id',deviceId);
    if(!result.error)return;
    result=await A.client.from('jc_launcher_devices').update({status:'detached',blocked:true,metadata:{deleted_from:'jc-box-control',deleted_at:now}}).eq('id',deviceId);
    if(!result.error)return;
    throw result.error;
  }

  function openDeleteSelectedBox(deviceId){
    const targetId=deviceId||selectedId();
    if(!targetId){toast('Selecione uma Box.','error');return;}
    const device=findDeviceForAction(targetId)||state.selected||{id:targetId,label:'Box'};
    const modal=$('deleteBoxModal');
    modal.dataset.deleteDeviceId=targetId;
    $('deleteBoxConfirmText').value='';
    $('deleteBoxIdentity').innerHTML=`<b>${esc(device.label||device.device_name||device.model||'Box')}</b><span>Cliente: ${esc(ownerDisplayName(device)||accessOwnerName(selectedAccessOwner())||'—')}<br>Device ID interno: ${esc(targetId)}</span>`;
    openModal('deleteBoxModal');
  }
  async function confirmDeleteSelectedBox(){
    const deviceId=$('deleteBoxModal').dataset.deleteDeviceId||selectedId();
    if(!deviceId){toast('Selecione uma Box.','error');return;}
    if($('deleteBoxConfirmText').value.trim().toUpperCase()!=='EXCLUIR'){toast('Digite EXCLUIR para confirmar.','error');return;}
    loading(true,'Excluindo Box com segurança');
    try{
      if(state.real)await deleteDeviceSafeReal(deviceId);
      state.devices=state.devices.filter(x=>String(x.id)!==String(deviceId));
      if(state.selected&&String(state.selected.id)===String(deviceId))state.selected=state.devices[0]||null;
      closeModals();
      if(state.real)await load();else renderAll();
      toast('Box excluída. Cliente e histórico foram preservados.');
    }catch(error){toast(errorText(error),'error');}
    finally{loading(false);}
  }
  function bind(){
    $('reloadBtn').addEventListener('click',load);
    $('newDeviceBtn').addEventListener('click',()=>openDeviceModal(''));
    $('launcherAccessBtn').addEventListener('click',openLauncherAccess);
    $('launcherAccessOwner').addEventListener('change',async()=>{await loadLauncherAccessCredential();await loadAccessDelivery();renderLauncherAccess();});
    $('launcherAccessSaveBtn').addEventListener('click',()=>saveLauncherAccess(false));
    $('launcherAccessGenerateBtn').addEventListener('click',()=>saveLauncherAccess(true));
    $('launcherAccessCopyBtn').addEventListener('click',copyLauncherAccess);
    $('launcherAccessWhatsappBtn').addEventListener('click',sendLauncherAccessWhatsapp);
    $('launcherAccessEdition').addEventListener('change',()=>loadAccessDelivery().then(()=>{$('launcherAccessMessagePreview').textContent=accessMessageText();}));
    $('launcherAccessPolicy').addEventListener('change',updateAccessPolicyUI);
    $('saveDeviceBtn').addEventListener('click',addDevice);
    $('licenseBtn').addEventListener('click',()=>{if(!requireSelected())return;$('licenseEdition').value=state.selected.edition||'lite';openModal('licenseModal');});
    $('saveLicenseBtn').addEventListener('click',saveLicense);
    $('saveBillingBtn').addEventListener('click',saveBilling);
    $('previewBillingBtn').addEventListener('click',()=>syncPreview(true,readBillingForm()));
    $('confirmPaymentBtn').addEventListener('click',confirmPayment);
    $('addAppTargetBtn').addEventListener('click',addAppTarget);
    $('addFavoriteBtn').addEventListener('click',addFavorite);
    $('saveFavoritesBtn').addEventListener('click',saveFavorites);
    $('disconnectSelectedBoxBtn').addEventListener('click',disconnectSelectedBox);
    $('deleteSelectedBoxBtn').addEventListener('click',openDeleteSelectedBox);
    $('confirmDeleteBoxBtn').addEventListener('click',confirmDeleteSelectedBox);
    $('equipmentOwnership').addEventListener('change',updateEquipmentControls);
    $('equipmentFullBlock').addEventListener('change',updateEquipmentControls);
    $('equipmentRequestBlock').addEventListener('change',()=>{
      state.equipmentRequestBlock=$('equipmentRequestBlock').checked;
    });
    $('saveEquipmentBtn').addEventListener('click',handleSaveEquipment);
    $('requestReturnBtn').addEventListener('click',requestReturn);
    $('markReturnedBtn').addEventListener('click',markReturned);
    $('refreshHistoryBtn').addEventListener('click',()=>state.real?loadSelectedData():renderAll());
    $('historyPeriod').addEventListener('change',renderLauncherEvents);
    $('historyTypeFilter').addEventListener('change',renderLauncherEvents);
    $('historyAppFilter').addEventListener('input',renderLauncherEvents);
    $('historyStatusFilter').addEventListener('change',renderLauncherEvents);
    $('installCatalogSearch')?.addEventListener('input',event=>{state.installSearch=event.target.value;renderInstallCatalog();});
    $('refreshInstallCatalogBtn')?.addEventListener('click',()=>state.real?loadSelectedData():renderAll());
    $('advancedInstallToggleBtn')?.addEventListener('click',toggleAdvancedInstall);
    $('sendManualInstallBtn')?.addEventListener('click',sendManualInstall);
    $('sendCommandBtn').addEventListener('click',sendCommand);
    $$('[data-close]').forEach(button=>button.addEventListener('click',closeModals));
    $$('.modal').forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal)closeModals();}));
    $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.filter=button.dataset.filter;$$('[data-filter]').forEach(item=>item.classList.toggle('active',item===button));renderDeviceList();}));
    $$('[data-tab]').forEach(button=>button.addEventListener('click',()=>activateTab(button.dataset.tab)));
    $$('[data-open-tab]').forEach(button=>button.addEventListener('click',()=>activateTab(button.dataset.openTab)));
    $$('[data-command]').forEach(button=>button.addEventListener('click',()=>{if(!requireSelected())return;if(button.dataset.command==='install_app'){activateTab('install');toast('Escolha o APK no catálogo autorizado.');return;}state.pendingCommand=button.dataset.command;$('commandTitle').textContent=button.textContent.trim();openModal('commandModal');}));
    window.addEventListener('hashchange',activateHashTab);
    window.addEventListener('beforeunload',()=>{if(state.selected)syncPreview(false,state.config?.billing_profile||readBillingForm());});
  }

  bind();
  load();
})();
