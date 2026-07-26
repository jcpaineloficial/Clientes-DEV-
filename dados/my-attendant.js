(function(){
  'use strict';

  const A=window.JC_APP;
  const $=id=>document.getElementById(id);
  const state={access:null,isAdmin:false,attendant:null,general:{},publicUrl:''};
  const DEFAULT_SETTINGS={
    templateVersion:'jc-apk-mila-20260620',
    brand:'JC-APK TV',assistantName:'Mila',whatsapp:'5555997234936',
    pixKey:'',pixReceiver:'',pixBank:'',extraAccountPrice:0,
    personalPrice1:70,personalPrice2:100,personalPrice5:150,
    emulatorFee:50,resellerMonthlyFee:30,resellerPlan:'Painel inicial — consulte as condições',
    downloadCode:'',testLink:'',testCode:'',logoUrl:'',assistantMedia:'',assistantMediaType:'',
    backgroundMain:'',backgroundChat:'',backgroundOverlay:82,chatOverlay:68,
    panelColor:'#101c24',panel2Color:'#172731',lineColor:'#2b3943',
    discountEnabled:true,discountAmount:20,cardEnabled:true,cardMaxFee:36,cardBaseFee:0,
    cardInstallmentFees:[3,6,9,12,15,18,21,24,27,30,33,36],
    channelUrl:'',channelUrls:['','','','','','','','','',''],
    channelNames:['Canal principal','Canal CH-IPTV','JC-APK TV','JC-APK OFERTAS','','','','','',''],
    socialNetworks:[],orderModules:[],
    menuVisibility:{personal:true,buyMore:true,test:true,tvBox:true,reseller:true,macro:true,support:true},
    welcome:'Olá! 👋 Eu sou a Mila. Vou entender o que você procura, responder suas dúvidas e ajudar no atendimento da JC-APK TV.'
  };

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);}
  function normalizePhone(value){let n=String(value||'').replace(/\D/g,'');if((n.length===10||n.length===11)&&!n.startsWith('55'))n='55'+n;return n;}
  function publicBase(){return String(state.general?.attendant_url||state.access?.general?.attendant_url||A.cfg.attendantUrl||'../autoatendimento/').replace(/\?[^#]*$/,'').replace(/\/$/,'/');}
  function publicLink(slug){return publicBase()+'?cliente='+encodeURIComponent(slug||'');}
  function panelLink(name,params={}){const u=new URL(name,A.rootUrl);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v));});return u.href;}
  function action(icon,title,text,label,href,cls='blue',id=''){
    const target=/^https?:/i.test(href)?' target="_blank" rel="noopener"':'';
    return `<article class="action-card"><div class="icon">${icon}</div><h3>${esc(title)}</h3><p>${esc(text)}</p><a class="btn ${cls}" ${id?`id="${esc(id)}"`:''} href="${esc(href)}"${target}>${esc(label)}</a></article>`;
  }
  function buttonAction(icon,title,text,label,id,cls='blue'){
    return `<article class="action-card"><div class="icon">${icon}</div><h3>${esc(title)}</h3><p>${esc(text)}</p><button class="btn ${cls}" type="button" id="${esc(id)}">${esc(label)}</button></article>`;
  }
  function profileName(){return state.access?.profile?.full_name||state.access?.profile?.username||'Administrador';}

  async function loadData(){
    const [attRes,generalRes]=await Promise.all([
      A.client.from('attendant_profiles').select('user_id,slug,public_settings,published,updated_at').eq('user_id',state.access.profile.id).maybeSingle(),
      A.client.from('app_settings').select('value').eq('key','general').maybeSingle()
    ]);
    if(attRes.error)throw attRes.error;
    if(generalRes.error)throw generalRes.error;
    state.attendant=attRes.data||null;
    state.general=generalRes.data?.value||state.access.general||{};
    if(state.attendant)state.publicUrl=publicLink(state.attendant.slug);
  }

  async function uniqueOwnerSlug(){
    const preferred=state.isAdmin?'jc-apk-tv':(A.slug(state.access.profile.username)||'minha-atendente');
    const {data,error}=await A.client.from('attendant_profiles').select('slug');
    if(error)throw error;
    const used=new Set((data||[]).map(x=>String(x.slug||'')));
    if(!used.has(preferred))return preferred;
    const own=state.attendant?.slug;if(own)return own;
    for(let i=2;i<1000;i++){const next=(preferred.slice(0,43)+'-'+i).slice(0,48);if(!used.has(next))return next;}
    return preferred+'-'+Date.now().toString().slice(-6);
  }

  async function activateOwner(){
    const btn=$('activateOwnerBtn');if(btn)btn.disabled=true;
    try{
      const slug=await uniqueOwnerSlug();
      const settings=Object.assign({},DEFAULT_SETTINGS,{
        brand:'JC-APK TV',
        assistantName:'Mila',
        whatsapp:normalizePhone(state.access.profile.whatsapp)||DEFAULT_SETTINGS.whatsapp
      });
      const {data,error}=await A.client.from('attendant_profiles').insert({
        user_id:state.access.profile.id,slug,public_settings:settings,published:false
      }).select('user_id,slug,public_settings,published,updated_at').single();
      if(error)throw error;
      const {error:profileError}=await A.client.from('profiles').update({attendant_enabled:true}).eq('id',state.access.profile.id);
      if(profileError){await A.client.from('attendant_profiles').delete().eq('user_id',state.access.profile.id);throw profileError;}
      state.attendant=data;state.access.profile.attendant_enabled=true;state.publicUrl=publicLink(data.slug);
      A.toast('Sua atendente foi ativada. Agora você pode configurar e publicar.');
      render();
    }catch(err){A.toast(err.message||'Não foi possível ativar sua atendente.','error');if(btn)btn.disabled=false;}
  }

  function renderInactiveOwner(){
    $('attendantTitle').textContent='Minha Atendente — JC-APK TV';
    $('attendantDescription').textContent='Crie uma atendente de uso próprio, separada de todos os clientes cadastrados.';
    $('topStatus').textContent='Administrador: '+profileName();
    $('statusBadges').innerHTML='<span class="badge amber">Ainda não ativada</span><span class="badge">Uso próprio do administrador</span>';
    $('openPublicTop').classList.add('hidden');
    $('publicLink').value='A atendente ainda não foi ativada.';
    $('copyPublic').disabled=true;
    $('actionsGrid').innerHTML=buttonAction('✨','Ativar minha atendente','Cria um perfil próprio da JC-APK TV sem cadastrar você como cliente e sem misturar os dados dos clientes.','Ativar minha atendente','activateOwnerBtn','green');
    $('activateOwnerBtn').onclick=activateOwner;
    $('loadingView').classList.add('hidden');$('appView').classList.remove('hidden');
  }

  function openBasicModal(){
    const s=state.attendant?.public_settings||{};
    $('ownerBrand').value=s.brand||'JC-APK TV';
    $('ownerAssistantName').value=s.assistantName||'Mila';
    $('ownerWhatsapp').value=s.whatsapp||state.access.profile.whatsapp||'';
    $('ownerPublished').value=String(state.attendant?.published!==false);
    $('ownerConfigMsg').textContent='';
    $('basicConfigModal').classList.add('open');$('basicConfigModal').setAttribute('aria-hidden','false');
  }
  function closeBasicModal(){$('basicConfigModal').classList.remove('open');$('basicConfigModal').setAttribute('aria-hidden','true');}

  async function saveBasic(){
    const btn=$('saveBasicConfig');btn.disabled=true;$('ownerConfigMsg').textContent='Salvando...';
    try{
      const brand=$('ownerBrand').value.trim(),assistantName=$('ownerAssistantName').value.trim(),whatsapp=normalizePhone($('ownerWhatsapp').value);
      if(!brand)throw new Error('Preencha o nome da empresa ou marca.');
      if(!assistantName)throw new Error('Preencha o nome da atendente.');
      if(whatsapp.length<12||whatsapp.length>13)throw new Error('Digite o WhatsApp com país e DDD. Exemplo: 55997234936.');
      const current=state.attendant.public_settings&&typeof state.attendant.public_settings==='object'?state.attendant.public_settings:{};
      const settings=Object.assign({},DEFAULT_SETTINGS,current,{brand,assistantName,whatsapp});
      const published=$('ownerPublished').value==='true';
      const {data,error}=await A.client.from('attendant_profiles').update({public_settings:settings,published,updated_at:new Date().toISOString()}).eq('user_id',state.access.profile.id).select('user_id,slug,public_settings,published,updated_at').single();
      if(error)throw error;
      state.attendant=data;state.publicUrl=publicLink(data.slug);A.toast('Dados básicos da sua atendente foram salvos.');closeBasicModal();render();
    }catch(err){$('ownerConfigMsg').textContent=err.message||'Não foi possível salvar.';}
    finally{btn.disabled=false;}
  }

  function renderActive(){
    const s=state.attendant.public_settings||{};
    const p=state.access.permissions||{};
    const canFull=state.isAdmin||Boolean(p['attendant.configure']);
    const canBasic=state.isAdmin||Boolean(p['attendant.basic']);
    $('publicLink').value=state.publicUrl;
    $('attendantTitle').textContent=(s.assistantName||'Minha atendente')+' — '+(s.brand||profileName());
    $('attendantDescription').textContent=state.isAdmin?'Uso próprio do administrador. Esta atendente não pertence a nenhum cliente cadastrado.':'Use esta área sempre que precisar. Você não precisa pedir um novo link.';
    $('topStatus').textContent=(state.isAdmin?'Administrador: ':'')+profileName();
    $('statusBadges').innerHTML=`<span class="badge">${state.isAdmin?'Uso próprio — Administrador':'Atendente vinculada'}</span><span class="badge ${state.attendant.published===false?'amber':''}">${state.attendant.published===false?'Não publicada':'Publicada'}</span><span class="badge ${canFull?'':'amber'}">${canFull?'Configuração completa':canBasic?'Dados essenciais':'Somente visualização'}</span>`;
    $('openPublicTop').classList.remove('hidden');$('copyPublic').disabled=false;
    const cards=[];
    cards.push(action('🤖','Abrir minha atendente','Veja exatamente a página pública usada pelos seus clientes.','Abrir atendente',state.publicUrl,'green'));
    if(state.isAdmin){
      cards.push(buttonAction('📝','Configuração básica','Altere empresa, nome da atendente, WhatsApp e publicação sem apagar as configurações avançadas.','Configurar dados básicos','openOwnerBasic','blue'));
      cards.push(action('⚙️','Configuração completa','Altere mensagens, planos, pagamentos, aparência, imagens, fundos e redes sociais.','Abrir configuração completa',panelLink('configuracao-atendente.html',{mode:'config',v:'20260620-owner'}),'blue'));
      cards.push(action('📊','Meus relatórios','Veja apenas os registros da atendente da JC-APK TV usando o filtro do administrador.','Abrir meus relatórios',panelLink('relatorios-atendente.html',{cliente:state.access.profile.id}),'amber'));
      cards.push(action('🛠️','ADM / Desenvolvedor','Ajuste código, link e imagem do teste, faça backup e controle opções técnicas.','Abrir Desenvolvedor',panelLink('desenvolvedor-atendente.html',{cliente:state.access.profile.id}),'amber'));
    }else if(canFull){
      cards.push(action('⚙️','Configuração completa','Altere mensagens, planos, pagamentos, aparência, imagens e demais opções liberadas.','Abrir configuração completa',panelLink('configuracao-atendente.html',{mode:'config'}),'blue'));
      cards.push(action('📊','Meus relatórios','Veja os atendimentos registrados pela sua atendente e exclua um registro por vez.','Abrir meus relatórios',panelLink('relatorios-atendente.html'),'amber'));
    }else if(canBasic){
      cards.push(action('📝','Editar dados essenciais','Atualize empresa, nome da atendente, WhatsApp, logo, foto ou vídeo e PIX.','Editar dados essenciais',panelLink('atendente-dados.html'),'blue'));
      cards.push(action('📊','Meus relatórios','Veja os atendimentos registrados pela sua atendente e exclua um registro por vez.','Abrir meus relatórios',panelLink('relatorios-atendente.html'),'amber'));
    }else{
      cards.push(action('🔒','Configuração protegida','Seu acesso atual permite apenas abrir a atendente. Fale com o administrador para liberar alterações.','Voltar ao painel',panelLink('geradores/'),'amber'));
      cards.push(action('📊','Meus relatórios','Veja os atendimentos registrados pela sua atendente e exclua um registro por vez.','Abrir meus relatórios',panelLink('relatorios-atendente.html'),'amber'));
    }
    $('actionsGrid').innerHTML=cards.join('');
    if($('openOwnerBasic'))$('openOwnerBasic').onclick=e=>{e.preventDefault();openBasicModal();};
    $('openPublicTop').onclick=()=>window.open(state.publicUrl,'_blank','noopener');
    $('copyPublic').onclick=async()=>{await A.copy(state.publicUrl);A.toast('Link público copiado.');};
    $('loadingView').classList.add('hidden');$('appView').classList.remove('hidden');
    if(state.isAdmin&&new URLSearchParams(location.search).get('editar')==='basico')setTimeout(openBasicModal,80);
  }

  function render(){if(state.isAdmin&&!state.attendant)return renderInactiveOwner();if(!state.attendant)throw new Error('Ainda não existe uma atendente vinculada à sua conta.');renderActive();}

  async function init(){
    if(!A.ready||!A.client)throw new Error('O Supabase não está configurado.');
    const {data:{session}}=await A.client.auth.getSession();if(!session)throw new Error('Faça login no painel antes de abrir esta página.');
    state.access=await A.myAccess();if(!state.access?.profile)throw new Error('Não foi possível identificar seu acesso.');
    state.isAdmin=state.access.profile.role==='admin';
    await loadData();
    if(!state.isAdmin&&!state.access.profile.attendant_enabled)throw new Error('Ainda não existe uma atendente vinculada à sua conta.');
    render();
  }

  $('closeBasicConfig').onclick=closeBasicModal;$('cancelBasicConfig').onclick=closeBasicModal;$('saveBasicConfig').onclick=saveBasic;
  $('basicConfigModal').addEventListener('click',e=>{if(e.target===$('basicConfigModal'))closeBasicModal();});
  init().catch(e=>{$('loadingText').innerHTML=`${esc(e.message||String(e))}<br><br><a class="btn blue" href="geradores/">Voltar ao painel</a>`;});
})();
