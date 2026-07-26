(function(){
  'use strict';
  const A=window.JC_APP;
  const $=id=>document.getElementById(id);
  const state={access:null,clients:[],requests:[],general:{},current:null,currentSettings:{},step:1,fromPicker:false,media:{logo:null,assistant:null,assistantType:null}};
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

  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);}
  function normalizePhone(value){let n=String(value||'').replace(/\D/g,'');if(!n)return '';if((n.length===10||n.length===11)&&!n.startsWith('55'))n='55'+n;return n;}
  function formatDate(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR');}
  function profileAttendant(client){const raw=client?.attendant_profiles;return Array.isArray(raw)?(raw[0]||null):(raw||null);}
  function permissionMap(client){const map={};(client?.user_permissions||[]).forEach(p=>{map[p.function_id]=Boolean(p.enabled);});return map;}
  function modeFor(client){const p=permissionMap(client);if(p['attendant.configure'])return 'full';if(p['attendant.basic'])return 'basic';return 'none';}
  function modeLabel(mode){return mode==='full'?'Configuração completa':mode==='basic'?'Dados essenciais':'Acesso não liberado';}
  function modeBadge(mode){return mode==='full'?'purple':mode==='basic'?'amber':'red';}
  function publicBase(){return String(state.general.attendant_url||A.cfg.attendantUrl||'../autoatendimento/').replace(/\?[^#]*$/,'').replace(/\/$/,'/');}
  function publicLink(slug){return publicBase()+'?cliente='+encodeURIComponent(slug||'');}
  function fullConfigLink(slug){const u=new URL('configuracao-atendente.html',window.location.href);u.searchParams.set('mode','config');u.searchParams.set('admin','1');u.searchParams.set('cliente',slug||'');u.searchParams.set('v','20260620-4');return u.href;}
  function rootPage(name){return new URL(name,A.rootUrl).href;}
  function closeModals(){document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));}
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModals));
  document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModals();}));

  async function login(e){
    e.preventDefault();$('loginMsg').textContent='Entrando...';
    try{await A.login($('loginUser').value,$('loginPass').value);const access=await A.myAccess();if(access?.profile?.role!=='admin')throw new Error('Este acesso não é de administrador.');state.access=access;showApp();await loadAll();}
    catch(err){$('loginMsg').textContent=err.message||'Não foi possível entrar.';}
  }
  async function restore(){if(!A.ready)return;const {data:{session}}=await A.client.auth.getSession();if(!session)return;try{const access=await A.myAccess();if(access?.profile?.role==='admin'){state.access=access;showApp();await loadAll();}}catch(e){console.warn(e);}}
  function showApp(){$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');$('topStatus').textContent='Administrador: '+(state.access?.profile?.full_name||state.access?.profile?.username||'');}
  async function logout(){await A.client.auth.signOut();location.reload();}

  async function loadAll(){
    $('clientGrid').innerHTML='<div class="card empty">Carregando atendentes...</div>';
    const [clientsRes,generalRes,requestsRes]=await Promise.all([
      A.client.from('profiles').select('id,username,full_name,email,whatsapp,whatsapp2,whatsapp3,role,status,attendant_enabled,created_at,attendant_profiles(user_id,slug,public_settings,published,updated_at),user_permissions(function_id,enabled)').in('role',['client','test']).order('created_at',{ascending:false}),
      A.client.from('app_settings').select('value').eq('key','general').maybeSingle(),
      A.client.from('attendant_basic_requests').select('*').eq('status','pending').order('created_at',{ascending:false})
    ]);
    if(clientsRes.error)throw clientsRes.error;if(generalRes.error)throw generalRes.error;
    if(requestsRes.error){if(String(requestsRes.error.message||'').toLowerCase().includes('attendant_basic_requests'))throw new Error('Execute o SQL do módulo de atendentes no Supabase.');throw requestsRes.error;}
    state.clients=clientsRes.data||[];state.general=generalRes.data?.value||{};state.requests=requestsRes.data||[];
    renderStats();renderRequests();renderClients();fillPicker();
  }
  function attendants(){return state.clients.filter(c=>Boolean(profileAttendant(c)));}
  function renderStats(){const list=attendants();$('statTotal').textContent=list.length;$('statEnabled').textContent=list.filter(c=>c.attendant_enabled).length;$('statPublished').textContent=list.filter(c=>profileAttendant(c)?.published).length;$('statPending').textContent=state.requests.length;}
  function mediaLabel(value){if(!value)return 'Não informada';if(String(value).startsWith('data:'))return 'Arquivo local enviado';return value;}
  function renderRequests(){
    const box=$('requestList');if(!state.requests.length){box.innerHTML='<div class="empty">Nenhuma solicitação pendente.</div>';return;}
    box.innerHTML=state.requests.map(r=>{const c=state.clients.find(x=>x.id===r.user_id)||{};const p=r.payload||{};return `<article class="request-card"><div><h4>${esc(c.full_name||c.username||'Cliente')}</h4><p>${esc(p.brand||'Empresa não informada')} • Atendente: ${esc(p.assistantName||'—')} • Enviado em ${esc(formatDate(r.created_at))}</p></div><button class="btn amber" data-request="${esc(r.id)}">Conferir solicitação</button></article>`;}).join('');
    box.querySelectorAll('[data-request]').forEach(b=>b.onclick=()=>openRequest(b.dataset.request));
  }
  function filteredClients(){
    const q=$('searchInput').value.trim().toLowerCase(),f=$('filterMode').value;
    return attendants().filter(c=>{const a=profileAttendant(c),s=a?.public_settings||{},m=modeFor(c);const hay=[c.full_name,c.username,c.email,c.whatsapp,s.brand,s.assistantName].join(' ').toLowerCase();if(q&&!hay.includes(q))return false;if(f==='enabled'&&!c.attendant_enabled)return false;if(f==='disabled'&&c.attendant_enabled)return false;if(f==='published'&&!a?.published)return false;if(f==='unpublished'&&a?.published)return false;if(['basic','full'].includes(f)&&m!==f)return false;return true;});
  }
  function renderClients(){
    const box=$('clientGrid'),list=filteredClients();if(!list.length){box.innerHTML='<div class="card empty">Nenhuma atendente encontrada neste filtro.</div>';return;}
    box.innerHTML=list.map(c=>{const a=profileAttendant(c),s=Object.assign({},DEFAULT_ATTENDANT_TEMPLATE,a?.public_settings||{}),m=modeFor(c),active=c.status==='active';return `<article class="client-card"><div class="client-head"><div><h3>${esc(c.full_name||c.username)}</h3><small>@${esc(c.username)} • ${esc(c.email||'')}</small></div><div class="badges"><span class="badge ${active?'':'red'}">${active?'Cliente ativo':esc(c.status)}</span><span class="badge ${c.attendant_enabled?'blue':'red'}">${c.attendant_enabled?'Atendente ativa':'Atendente desativada'}</span>${a?.published?'<span class="badge">Publicada</span>':'<span class="badge amber">Não publicada</span>'}<span class="badge ${modeBadge(m)}">${esc(modeLabel(m))}</span></div></div><div class="meta"><div><small>Empresa</small><b>${esc(s.brand||'Não configurada')}</b></div><div><small>Atendente</small><b>${esc(s.assistantName||'Não configurada')}</b></div><div><small>WhatsApp</small><b>${esc(s.whatsapp||c.whatsapp||'Não configurado')}</b></div><div><small>Link público</small><b>${esc(publicLink(a.slug))}</b></div></div><div class="row-actions"><button class="btn green" data-config="${esc(c.id)}">Configurar</button><button class="btn blue" data-full="${esc(c.id)}">Configuração completa</button><button class="btn green" data-send-access="${esc(c.id)}">Enviar acesso</button><button class="btn amber" data-reports="${esc(c.id)}">Relatórios</button><button class="btn" data-open="${esc(c.id)}">Abrir atendente</button><button class="btn ghost" data-copy="${esc(c.id)}">Copiar link</button><button class="btn purple" data-dev="${esc(c.id)}">ADM / Desenvolvedor</button></div></article>`;}).join('');
    box.querySelectorAll('[data-config]').forEach(b=>b.onclick=()=>openConfig(b.dataset.config));box.querySelectorAll('[data-full]').forEach(b=>b.onclick=()=>openFull(b.dataset.full));box.querySelectorAll('[data-reports]').forEach(b=>b.onclick=()=>openReports(b.dataset.reports));box.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openPublic(b.dataset.open));box.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copyPublic(b.dataset.copy));box.querySelectorAll('[data-send-access]').forEach(b=>b.onclick=()=>openAccessWhatsapp(b.dataset.sendAccess));box.querySelectorAll('[data-dev]').forEach(b=>b.onclick=()=>openDeveloper(b.dataset.dev));
  }
  function fillPicker(){$('clientPicker').innerHTML=state.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.full_name||c.username)} — @${esc(c.username)}${profileAttendant(c)?' • já possui atendente':''}</option>`).join('');}

  function setStep(step){state.step=step;document.querySelectorAll('.step').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===step));[1,2,3].forEach(n=>$('step'+n).classList.toggle('active',n===step));$('backStepBtn').style.visibility=step===1?'hidden':'visible';$('nextStepBtn').classList.toggle('hidden',step===3);$('previewBtn').classList.toggle('hidden',step!==3);$('saveBtn').classList.toggle('hidden',step!==3);$('saveSendBtn')?.classList.toggle('hidden',step!==3);$('nextStepBtn').textContent=step===1?'Escolher tipo de acesso':'Revisar configuração';if(step===3)renderReview();}
  function selectedMode(){return document.querySelector('input[name="accessMode"]:checked')?.value||'basic';}
  function inferMediaType(value,provided){if(provided)return provided;const s=String(value||'').toLowerCase();return s.startsWith('data:video/')||/\.(mp4|webm)(\?|#|$)/.test(s)?'video':'image';}
  function collectBasic(){const old=state.currentSettings||{};const logo=state.media.logo===null?(old.logoUrl||''):state.media.logo;const assistant=state.media.assistant===null?(old.assistantMedia||''):state.media.assistant;const assistantType=state.media.assistant===null?(old.assistantMediaType||inferMediaType(assistant)):state.media.assistantType;return{brand:$('brand').value.trim(),assistantName:$('assistantName').value.trim(),whatsapp:normalizePhone($('whatsapp').value),welcome:$('welcome').value.trim(),panelColor:$('panelColor').value||'#101c24',logoUrl:logo||'',assistantMedia:assistant||'',assistantMediaType:assistant?inferMediaType(assistant,assistantType):'',pixKey:$('pixKey').value.trim(),pixReceiver:$('pixReceiver').value.trim(),pixBank:$('pixBank').value.trim()};}
  function validateBasic(){const v=collectBasic();if(!v.brand)throw new Error('Preencha o nome da empresa ou marca.');if(!v.assistantName)throw new Error('Preencha o nome da atendente.');if(v.whatsapp.length<12||v.whatsapp.length>13)throw new Error('Digite o WhatsApp com DDD. Exemplo: 55997234936.');return v;}
  function renderMediaPreview(id,value,type,fallback){const box=$(id);if(!box)return;if(!value){box.textContent=fallback;return;}box.innerHTML=type==='video'?`<video src="${esc(value)}" muted controls playsinline></video>`:`<img src="${esc(value)}" alt="Prévia">`;}
  function resetMediaState(settings){state.media={logo:null,assistant:null,assistantType:null};$('logoFile').value='';$('assistantMediaFile').value='';$('logoUrl').value=settings.logoUrl&&!String(settings.logoUrl).startsWith('data:')?settings.logoUrl:'';$('assistantMediaUrl').value=settings.assistantMedia&&!String(settings.assistantMedia).startsWith('data:')?settings.assistantMedia:'';renderMediaPreview('logoPreview',settings.logoUrl,'image','Usando a logo atual ou padrão.');renderMediaPreview('assistantMediaPreview',settings.assistantMedia,inferMediaType(settings.assistantMedia,settings.assistantMediaType),'Usando a mídia atual ou padrão.');}
  function openConfig(id,fromPicker=false){
    let c=state.clients.find(x=>x.id===id);state.fromPicker=fromPicker;$('pickerField').classList.toggle('hidden',!fromPicker);if(fromPicker){const chosen=$('clientPicker').value||state.clients[0]?.id;c=state.clients.find(x=>x.id===chosen);if(!c)return A.toast('Nenhum cliente cadastrado.','error');$('clientPicker').value=c.id;}
    state.current=c;const a=profileAttendant(c),raw=a?.public_settings||{},s=Object.assign({},DEFAULT_ATTENDANT_TEMPLATE,raw),m=modeFor(c);state.currentSettings=s;$('clientId').value=c.id;$('clientSlug').value=a?.slug||'';$('configTitle').textContent=a?'Configurar atendente':'Vincular e configurar atendente';$('configSubtitle').textContent=(c.full_name||c.username)+' • @'+c.username;$('brand').value=s.brand||c.full_name||DEFAULT_ATTENDANT_TEMPLATE.brand;$('assistantName').value=s.assistantName||DEFAULT_ATTENDANT_TEMPLATE.assistantName;$('whatsapp').value=s.whatsapp||c.whatsapp||'';$('welcome').value=s.welcome||DEFAULT_ATTENDANT_TEMPLATE.welcome;$('panelColor').value=/^#[0-9a-f]{6}$/i.test(s.panelColor||'')?s.panelColor:'#101c24';$('pixKey').value=s.pixKey||'';$('pixReceiver').value=s.pixReceiver||'';$('pixBank').value=s.pixBank||'';resetMediaState(s);const mode=m==='full'?'full':'basic';const radio=document.querySelector(`input[name="accessMode"][value="${mode}"]`);if(radio)radio.checked=true;$('published').value=String(a?.published!==false);$('configMsg').textContent='';setStep(1);$('configModal').classList.add('open');
  }
  function switchPicker(){const id=$('clientPicker').value;if(id)openConfig(id,true);}
  function renderReview(){
    const v=validateBasic(),mode=selectedMode(),published=$('published').value==='true';$('previewBrand').textContent=v.brand;$('previewAssistant').textContent=v.assistantName+' está online';$('previewWelcome').textContent=`Olá! 👋 Eu sou ${v.assistantName}. ${v.welcome||'Vou ajudar você durante este atendimento.'}`;$('previewPayment').innerHTML=`<b>Pagamento</b><br>WhatsApp: ${esc(v.whatsapp)}<br>PIX: ${esc(v.pixKey||'Ainda não configurado')}<br>Recebedor: ${esc(v.pixReceiver||'—')}<br>Banco: ${esc(v.pixBank||'—')}`;$('previewPhone')?.style?.setProperty?.('--preview-color',v.panelColor);const avatar=$('previewAvatar');avatar.style.background=v.panelColor;avatar.innerHTML=v.assistantMedia?(v.assistantMediaType==='video'?`<video src="${esc(v.assistantMedia)}" muted autoplay loop playsinline></video>`:`<img src="${esc(v.assistantMedia)}" alt="Atendente">`):'🤖';const slug=$('clientSlug').value||A.slug(state.current?.username||state.current?.full_name||'cliente');const rows=[['Cliente',state.current?.full_name||state.current?.username],['Empresa ou marca',v.brand],['Nome da atendente',v.assistantName],['WhatsApp',v.whatsapp],['Logo',mediaLabel(v.logoUrl)],['Foto ou vídeo',mediaLabel(v.assistantMedia)],['Chave PIX',v.pixKey||'Não informada'],['Recebedor',v.pixReceiver||'Não informado'],['Banco',v.pixBank||'Não informado'],['Acesso do cliente',modeLabel(mode)],['Publicação',published?'Publicar ao salvar':'Salvar sem publicar'],['Link previsto',publicLink(slug)]];$('reviewList').innerHTML=rows.map(([a,b])=>`<div class="check-row"><span>${esc(a)}</span><b>${esc(b||'—')}</b></div>`).join('');
  }
  async function ensureAttendant(c){let a=profileAttendant(c);if(a)return a;const slugs=state.clients.map(x=>profileAttendant(x)?.slug).filter(Boolean);let base=A.slug(c.username||c.full_name||'cliente')||('cliente-'+c.id.replace(/-/g,'').slice(0,8));if(base.length<3)base='cliente-'+c.id.replace(/-/g,'').slice(0,8);base=base.slice(0,48);let slug=base,i=2;while(slugs.includes(slug)){slug=(base.slice(0,43)+'-'+i).slice(0,48);i++;}const {data,error}=await A.client.from('attendant_profiles').insert({user_id:c.id,slug,public_settings:JSON.parse(JSON.stringify(DEFAULT_ATTENDANT_TEMPLATE)),published:false}).select('*').single();if(error)throw error;const {error:profileError}=await A.client.from('profiles').update({attendant_enabled:true}).eq('id',c.id);if(profileError)throw profileError;a=data;c.attendant_enabled=true;c.attendant_profiles=a;return a;}
  async function savePermissions(userId,mode){const rows=[{user_id:userId,function_id:'attendant.open',enabled:true},{user_id:userId,function_id:'attendant.basic',enabled:mode==='basic'},{user_id:userId,function_id:'attendant.configure',enabled:mode==='full'}];const {error}=await A.client.from('user_permissions').upsert(rows,{onConflict:'user_id,function_id'});if(error)throw error;}
  async function saveCurrent(sendAfter=false){$('configMsg').textContent=sendAfter?'Salvando e preparando o WhatsApp...':'Salvando...';$('saveBtn').disabled=true;if($('saveSendBtn'))$('saveSendBtn').disabled=true;try{const c=state.current;if(!c)throw new Error('Cliente não selecionado.');const v=validateBasic(),mode=selectedMode(),published=$('published').value==='true',a=await ensureAttendant(c),merged=Object.assign({},DEFAULT_ATTENDANT_TEMPLATE,a.public_settings||{},v);const {data,error}=await A.client.from('attendant_profiles').update({public_settings:merged,published}).eq('user_id',c.id).select('*').single();if(error)throw error;await savePermissions(c.id,mode);c.attendant_profiles=data;c.attendant_enabled=true;c.user_permissions=(c.user_permissions||[]).filter(p=>!['attendant.open','attendant.basic','attendant.configure'].includes(p.function_id)).concat([{function_id:'attendant.open',enabled:true},{function_id:'attendant.basic',enabled:mode==='basic'},{function_id:'attendant.configure',enabled:mode==='full'}]);A.toast(sendAfter?'Atendente salva. Escolha o WhatsApp do cliente.':'Atendente salva. As configurações avançadas foram preservadas.');closeModals();if(sendAfter)openAccessWhatsapp(c.id,mode);await loadAll();}catch(err){$('configMsg').textContent=err.message||'Não foi possível salvar.';A.toast($('configMsg').textContent,'error');}finally{$('saveBtn').disabled=false;if($('saveSendBtn'))$('saveSendBtn').disabled=false;}}
  function previewCurrent(){try{const v=validateBasic(),c=state.current,a=profileAttendant(c),slug=a?.slug||A.slug(c.username||c.full_name||'cliente'),merged=Object.assign({},DEFAULT_ATTENDANT_TEMPLATE,a?.public_settings||{},v);localStorage.setItem('jc_attendant_admin_preview_'+slug,JSON.stringify({settings:merged,createdAt:Date.now(),expiresAt:Date.now()+15*60*1000}));window.open(publicBase()+'?cliente='+encodeURIComponent(slug)+'&preview=admin','_blank','noopener');}catch(err){$('configMsg').textContent=err.message;}}
  function openFull(id){const c=state.clients.find(x=>x.id===id),a=profileAttendant(c);if(!a?.slug)return A.toast('Configure os dados essenciais primeiro.','error');window.open(fullConfigLink(a.slug),'_blank','noopener');}
  function openPublic(id){const c=state.clients.find(x=>x.id===id),a=profileAttendant(c);if(a?.slug)window.open(publicLink(a.slug),'_blank','noopener');}
  function openReports(id){window.open(rootPage('relatorios-atendente.html')+'?cliente='+encodeURIComponent(id),'_blank','noopener');}
  function openDeveloper(id){window.open(rootPage('desenvolvedor-atendente.html')+'?cliente='+encodeURIComponent(id),'_blank','noopener');}
  async function copyPublic(id){const c=state.clients.find(x=>x.id===id),a=profileAttendant(c);if(!a?.slug)return;await A.copy(publicLink(a.slug));A.toast('Link público copiado.');}


  const whatsappDispatch={title:'',message:'',recipients:[],opened:new Set()};
  function waPhone(value){let n=String(value||'').replace(/\D/g,'');if((n.length===10||n.length===11)&&!n.startsWith('55'))n='55'+n;return n;}
  function whatsappRecipients(source){
    const raw=[{label:'WhatsApp principal',value:source?.whatsapp},{label:'WhatsApp 2',value:source?.whatsapp2},{label:'WhatsApp 3',value:source?.whatsapp3}];
    const seen=new Set(),out=[];raw.forEach((item,index)=>{const phone=waPhone(item.value);if(phone.length<12||phone.length>13||seen.has(phone))return;seen.add(phone);out.push({label:item.label||`WhatsApp ${index+1}`,phone});});return out;
  }
  function ensureWhatsappDispatch(){
    if(document.getElementById('jcAttendantWhatsappDispatch'))return;
    const style=document.createElement('style');style.id='jcAttendantWhatsappDispatchStyle';style.textContent=`
      .jc-wa-overlay{position:fixed;inset:0;z-index:400;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.8);backdrop-filter:blur(8px)}
      .jc-wa-overlay.open{display:flex}.jc-wa-box{width:min(680px,100%);max-height:94vh;overflow:auto;border:1px solid var(--line);border-radius:20px;background:#091a29;box-shadow:var(--shadow)}
      .jc-wa-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:17px 18px;border-bottom:1px solid var(--line)}.jc-wa-head h3{margin:0}.jc-wa-head p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.45}
      .jc-wa-message{margin:14px 18px 0;padding:12px;border:1px solid rgba(41,211,145,.25);border-radius:13px;background:rgba(41,211,145,.06);color:#dfffee;font-size:12px;line-height:1.5;white-space:pre-wrap;max-height:170px;overflow:auto}
      .jc-wa-list{display:grid;gap:9px;padding:14px 18px}.jc-wa-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.035)}
      .jc-wa-row b,.jc-wa-row small{display:block}.jc-wa-row small{color:var(--muted);margin-top:4px}.jc-wa-row.sent{border-color:rgba(37,211,102,.45);background:rgba(37,211,102,.07)}
      .jc-wa-foot{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:14px 18px;border-top:1px solid var(--line)}
      @media(max-width:600px){.jc-wa-row{grid-template-columns:1fr}.jc-wa-row .btn{width:100%}.jc-wa-foot{display:grid}.jc-wa-foot .btn{width:100%}}
    `;document.head.appendChild(style);
    const modal=document.createElement('div');modal.id='jcAttendantWhatsappDispatch';modal.className='jc-wa-overlay';modal.innerHTML=`<div class="jc-wa-box"><div class="jc-wa-head"><div><h3 id="jcAttWaTitle">Enviar configuração pelo WhatsApp</h3><p>Escolha um número cadastrado. A mensagem será aberta pronta no WhatsApp; você confirma o envio.</p></div><button class="btn red" id="jcAttWaClose" type="button">Fechar</button></div><div class="jc-wa-message" id="jcAttWaMessage"></div><div class="jc-wa-list" id="jcAttWaList"></div><div class="jc-wa-foot"><button class="btn" id="jcAttWaCopy" type="button">Copiar mensagem</button><button class="btn green" id="jcAttWaNext" type="button">Abrir próximo número</button></div></div>`;document.body.appendChild(modal);
    const close=()=>modal.classList.remove('open');document.getElementById('jcAttWaClose').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});
    document.getElementById('jcAttWaCopy').onclick=()=>A.copy(whatsappDispatch.message).then(()=>A.toast('Mensagem copiada.'));
    document.getElementById('jcAttWaNext').onclick=()=>{const idx=whatsappDispatch.recipients.findIndex((_,i)=>!whatsappDispatch.opened.has(i));if(idx<0)return A.toast('Todos os números já foram abertos.');openWhatsappRecipient(idx);};
  }
  function renderWhatsappDispatch(){
    ensureWhatsappDispatch();document.getElementById('jcAttWaTitle').textContent=whatsappDispatch.title||'Enviar configuração pelo WhatsApp';document.getElementById('jcAttWaMessage').textContent=whatsappDispatch.message;
    const list=document.getElementById('jcAttWaList');list.innerHTML=whatsappDispatch.recipients.map((r,i)=>`<div class="jc-wa-row ${whatsappDispatch.opened.has(i)?'sent':''}"><div><b>${esc(r.label)}</b><small>${esc(r.phone)}${whatsappDispatch.opened.has(i)?' • WhatsApp já aberto':''}</small></div><button class="btn green" type="button" data-jc-att-wa-index="${i}">${whatsappDispatch.opened.has(i)?'Abrir novamente':'Abrir WhatsApp'}</button></div>`).join('');
    list.querySelectorAll('[data-jc-att-wa-index]').forEach(b=>b.onclick=()=>openWhatsappRecipient(Number(b.dataset.jcAttWaIndex)));document.getElementById('jcAttWaNext').disabled=whatsappDispatch.recipients.every((_,i)=>whatsappDispatch.opened.has(i));document.getElementById('jcAttendantWhatsappDispatch').classList.add('open');
  }
  function openWhatsappRecipient(index){const r=whatsappDispatch.recipients[index];if(!r)return;const opened=window.open('https://wa.me/'+r.phone+'?text='+encodeURIComponent(whatsappDispatch.message),'_blank','noopener');if(!opened)return A.toast('O navegador bloqueou a nova aba. Permita pop-ups para este site.','error');whatsappDispatch.opened.add(index);renderWhatsappDispatch();}
  function accessMessage(c,forcedMode){
    const a=profileAttendant(c),mode=forcedMode||modeFor(c),name=c?.full_name||c?.username||'cliente',panel=rootPage('index.html'),mine=rootPage('minha-atendente.html'),pub=a?.slug?publicLink(a.slug):'';
    const level=mode==='full'?'Configuração completa':'Dados essenciais';
    const instruction=mode==='full'?'Você poderá alterar mensagens, planos, pagamentos, cartão, descontos, redes sociais, imagens, fundos e demais opções liberadas.':'Você poderá atualizar empresa, nome da atendente, WhatsApp, logo, foto ou vídeo e dados essenciais liberados.';
    return [`Olá, ${name}! 👋`,``,`O acesso de gerenciamento da sua atendente virtual já está liberado.`,``,`🔐 PAINEL JC-APK TV`,panel,``,`Entre com seu usuário ou e-mail e a sua senha cadastrada.`,``,`🤖 MINHA ATENDENTE`,mine,``,`Nível liberado: ${level}`,instruction,``,`📊 RELATÓRIOS`,`Dentro de “Minha Atendente”, abra “Meus relatórios” para acompanhar somente os atendimentos da sua própria atendente.`,pub?`\n🌐 LINK PÚBLICO PARA SEUS CLIENTES\n${pub}`:'',``,`Você pode voltar ao painel sempre que precisar alterar uma configuração ou consultar os relatórios.`,``,`🔒 Não compartilhe sua senha.`].filter(Boolean).join('\n');
  }
  function openAccessWhatsapp(id,forcedMode){
    const c=state.clients.find(x=>x.id===id);if(!c)return A.toast('Cliente não encontrado.','error');const recipients=whatsappRecipients(c),message=accessMessage(c,forcedMode);
    if(!recipients.length){A.copy(message).then(()=>A.toast('Nenhum WhatsApp válido. A mensagem foi copiada.'));return;}
    whatsappDispatch.title='Enviar acesso da atendente para '+(c.full_name||c.username||'cliente');whatsappDispatch.message=message;whatsappDispatch.recipients=recipients;whatsappDispatch.opened=new Set();renderWhatsappDispatch();
  }

  function openRequest(id){const r=state.requests.find(x=>x.id===id);if(!r)return;const c=state.clients.find(x=>x.id===r.user_id)||{},p=r.payload||{};$('requestId').value=r.id;$('requestSubtitle').textContent=(c.full_name||c.username||'Cliente')+' • enviado em '+formatDate(r.created_at);const rows=[['Empresa ou marca',p.brand],['Nome da atendente',p.assistantName],['WhatsApp',p.whatsapp],['Mensagem',p.welcome],['Logo',mediaLabel(p.logoUrl)],['Foto ou vídeo',mediaLabel(p.assistantMedia)],['Chave PIX',p.pixKey],['Recebedor',p.pixReceiver],['Banco',p.pixBank]];$('requestValues').innerHTML=rows.map(([a,b])=>`<div><small>${esc(a)}</small><b>${esc(b||'Não informado')}</b></div>`).join('');$('requestMsg').textContent='';$('requestModal').classList.add('open');}
  async function applyRequest(){const id=$('requestId').value;if(!id)return;$('applyRequestBtn').disabled=true;$('requestMsg').textContent='Aplicando...';try{const {error}=await A.client.rpc('admin_apply_attendant_basic_request',{p_request_id:id});if(error)throw error;A.toast('Dados conferidos e aplicados na atendente.');closeModals();await loadAll();}catch(err){$('requestMsg').textContent=err.message||'Não foi possível aplicar.';}finally{$('applyRequestBtn').disabled=false;}}
  async function rejectRequest(){const id=$('requestId').value;if(!id)return;const {error}=await A.client.from('attendant_basic_requests').update({status:'rejected',reviewed_by:state.access.profile.id,reviewed_at:new Date().toISOString(),admin_note:'Rejeitada pelo administrador.'}).eq('id',id);if(error){$('requestMsg').textContent=error.message;return;}A.toast('Solicitação rejeitada.');closeModals();await loadAll();}

  async function readMediaFile(file,kind){if(!file)return null;const image=file.type.startsWith('image/'),video=file.type.startsWith('video/');if(kind==='logo'&&!image)throw new Error('A logo precisa ser uma imagem.');if(kind==='assistant'&&!image&&!video)throw new Error('Escolha uma imagem ou vídeo compatível.');const limit=video?5*1024*1024:2*1024*1024;if(file.size>limit)throw new Error(video?'O vídeo local deve ter no máximo 5 MB. Para vídeos maiores, use o link.':'A imagem local deve ter no máximo 2 MB. Para imagens maiores, use o link.');return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({value:String(reader.result||''),type:video?'video':'image'});reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));reader.readAsDataURL(file);});}
  $('logoUrl').addEventListener('input',()=>{const v=$('logoUrl').value.trim();if(v){state.media.logo=v;renderMediaPreview('logoPreview',v,'image','Usando a logo atual ou padrão.');}else state.media.logo=null;});
  $('assistantMediaUrl').addEventListener('input',()=>{const v=$('assistantMediaUrl').value.trim();if(v){state.media.assistant=v;state.media.assistantType=inferMediaType(v);renderMediaPreview('assistantMediaPreview',v,state.media.assistantType,'Usando a mídia atual ou padrão.');}else{state.media.assistant=null;state.media.assistantType=null;}});
  $('logoFile').addEventListener('change',async e=>{try{const r=await readMediaFile(e.target.files?.[0],'logo');if(!r)return;state.media.logo=r.value;$('logoUrl').value='';renderMediaPreview('logoPreview',r.value,'image','');}catch(err){e.target.value='';A.toast(err.message,'error');}});
  $('assistantMediaFile').addEventListener('change',async e=>{try{const r=await readMediaFile(e.target.files?.[0],'assistant');if(!r)return;state.media.assistant=r.value;state.media.assistantType=r.type;$('assistantMediaUrl').value='';renderMediaPreview('assistantMediaPreview',r.value,r.type,'');}catch(err){e.target.value='';A.toast(err.message,'error');}});
  $('removeLogo').onclick=()=>{state.media.logo='';$('logoUrl').value='';$('logoFile').value='';renderMediaPreview('logoPreview','','image','Logo personalizada será removida ao salvar.');};
  $('removeAssistantMedia').onclick=()=>{state.media.assistant='';state.media.assistantType='';$('assistantMediaUrl').value='';$('assistantMediaFile').value='';renderMediaPreview('assistantMediaPreview','','image','Mídia personalizada será removida ao salvar.');};

  $('loginForm').addEventListener('submit',login);$('logoutBtn').onclick=logout;$('refreshBtn').onclick=()=>loadAll().catch(e=>A.toast(e.message,'error'));$('newAttendantBtn').onclick=()=>openConfig($('clientPicker').value||state.clients[0]?.id,true);$('clientPicker').onchange=switchPicker;$('searchInput').oninput=renderClients;$('filterMode').onchange=renderClients;$('backStepBtn').onclick=()=>setStep(Math.max(1,state.step-1));$('nextStepBtn').onclick=()=>{try{if(state.step===1)validateBasic();setStep(Math.min(3,state.step+1));$('configMsg').textContent='';}catch(err){$('configMsg').textContent=err.message;}};$('previewBtn').onclick=previewCurrent;$('saveBtn').onclick=()=>saveCurrent(false);$('saveSendBtn').onclick=()=>saveCurrent(true);$('applyRequestBtn').onclick=applyRequest;$('rejectRequestBtn').onclick=rejectRequest;
  restore().catch(e=>{$('loginMsg').textContent=e.message||String(e);});
})();

/* JC-APK TV — card da atendente de uso próprio do administrador */
(function(){
  'use strict';
  const A=window.JC_APP;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  function publicBase(general){return String(general?.attendant_url||A.cfg.attendantUrl||'../autoatendimento/').replace(/\?[^#]*$/,'').replace(/\/$/,'/');}
  function panelLink(name,params={}){const u=new URL(name,A.rootUrl);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v));});return u.href;}
  async function renderOwner(){
    const app=document.getElementById('appView');if(!app||app.classList.contains('hidden')||!A?.client)return;
    const access=await A.myAccess();if(access?.profile?.role!=='admin')return;
    const [profileRes,generalRes]=await Promise.all([
      A.client.from('profiles').select('id,username,full_name,whatsapp,attendant_enabled,attendant_profiles(user_id,slug,public_settings,published,updated_at)').eq('id',access.profile.id).maybeSingle(),
      A.client.from('app_settings').select('value').eq('key','general').maybeSingle()
    ]);
    if(profileRes.error)throw profileRes.error;if(generalRes.error)throw generalRes.error;
    const profile=profileRes.data||access.profile,raw=profile.attendant_profiles,att=Array.isArray(raw)?raw[0]:raw;
    let section=document.getElementById('jc-owner-attendant-card');
    if(!section){section=document.createElement('section');section.id='jc-owner-attendant-card';app.insertBefore(section,app.firstElementChild);}
    section.className='card';section.style.cssText='border-color:rgba(28,145,255,.42);background:linear-gradient(145deg,rgba(13,48,76,.96),rgba(8,24,38,.94))';
    if(!att){
      section.innerHTML=`<div class="hero"><div><h2 style="margin:0">✨ Minha Atendente — JC-APK TV</h2><p class="muted">Atendente de uso próprio do administrador, separada das atendentes dos clientes.</p><div class="badges"><span class="badge amber">Ainda não ativada</span><span class="badge blue">Uso próprio</span></div></div><a class="btn green" href="${esc(panelLink('minha-atendente.html'))}">Ativar minha atendente</a></div>`;
      return;
    }
    const s=att.public_settings||{},pub=publicBase(generalRes.data?.value||{})+'?cliente='+encodeURIComponent(att.slug||'');
    section.innerHTML=`<div class="client-head"><div><h2 style="margin:0 0 5px">✨ Minha Atendente — JC-APK TV</h2><small>Uso próprio do administrador • não é cadastrada como cliente</small></div><div class="badges"><span class="badge blue">Administrador</span><span class="badge ${att.published===false?'amber':''}">${att.published===false?'Não publicada':'Publicada'}</span></div></div><div class="meta" style="margin-top:12px"><div><small>Empresa</small><b>${esc(s.brand||'JC-APK TV')}</b></div><div><small>Atendente</small><b>${esc(s.assistantName||'Mila')}</b></div><div><small>WhatsApp</small><b>${esc(s.whatsapp||profile.whatsapp||'Não configurado')}</b></div><div><small>Identificador</small><b>${esc(att.slug)}</b></div></div><div class="row-actions" style="margin-top:13px"><a class="btn green" href="${esc(panelLink('minha-atendente.html',{editar:'basico'}))}">Configurar básico</a><a class="btn blue" href="${esc(panelLink('configuracao-atendente.html',{mode:'config',v:'20260620-owner'}))}">Configuração completa</a><a class="btn" href="${esc(pub)}" target="_blank" rel="noopener">Abrir atendente</a><a class="btn amber" href="${esc(panelLink('relatorios-atendente.html',{cliente:profile.id}))}">Relatórios</a><a class="btn ghost" href="${esc(panelLink('desenvolvedor-atendente.html',{cliente:profile.id}))}">ADM / Desenvolvedor</a></div>`;
  }
  async function start(){for(let i=0;i<80;i++){const app=document.getElementById('appView');if(app&&!app.classList.contains('hidden')){try{await renderOwner();}catch(e){console.warn('[Minha Atendente]',e);}return;}await new Promise(r=>setTimeout(r,150));}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('click',e=>{if(e.target.closest('#refreshBtn'))setTimeout(()=>renderOwner().catch(console.warn),700);});
})();
