(function(){
  'use strict';

  const A=window.JC_APP;
  const params=new URLSearchParams(location.search);
  let cached={};
  try{ cached=JSON.parse(sessionStorage.getItem('jc_apk_access')||'{}'); }catch(e){}

  const publicSlug=(params.get('cliente')||'').toLowerCase().replace(/[^a-z0-9-]/g,'');
  const configMode=params.get('mode')==='config';
  const previewMode=params.get('preview')==='admin';
  const cachedSlug=cached?.attendant?.slug||cached?.profile?.username||'';
  const slug=publicSlug||cachedSlug||'jc-apk-tv';
  const DEFAULT_TEMPLATE={
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

  window.JC_ATTENDANT_DEFAULT_TEMPLATE=JSON.parse(JSON.stringify(DEFAULT_TEMPLATE));
  window.JC_ATTENDANT_CONTEXT={
    slug,configMode,previewMode,adminTarget:false,targetUserId:null,
    storageKey:`demo_ai_settings_v1_${slug}`,leadsKey:`demo_ai_leads_v1_${slug}`,
    access:null,signature:null,testMode:cached?.mode==='test',ready:false,error:null,
    usingDefaultTemplate:false,clientName:'',settingsSource:'supabase'
  };

  const ctx=window.JC_ATTENDANT_CONTEXT;
  const overlay=document.createElement('div');
  overlay.id='jc_attendant_loading';
  overlay.style.cssText='position:fixed;inset:0;z-index:999999999;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#06111d,#0b2637);color:#fff;font-family:Arial,sans-serif;padding:20px;text-align:center';
  overlay.innerHTML='<div><div style="font-size:38px">🤖</div><h2>Carregando Atendente Virtual</h2><p id="jc_attendant_loading_text" style="color:#aebbc3">Buscando as configurações corretas deste cliente...</p></div>';
  document.body.appendChild(overlay);

  const clone=value=>JSON.parse(JSON.stringify(value));
  const isObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
  function mergeDefaults(base,stored){
    const result=clone(base||{});
    Object.entries(stored||{}).forEach(([key,value])=>{
      if(isObject(value)&&isObject(result[key])) result[key]=mergeDefaults(result[key],value);
      else if(value!==undefined&&value!==null) result[key]=value;
    });
    return result;
  }
  function legacySettings(raw,profile){
    const source=isObject(raw)?clone(raw):{};
    const out={...source};
    if(!out.brand) out.brand=source.companyName||source.company||source.brandTitle||DEFAULT_TEMPLATE.brand;
    if(!out.assistantName) out.assistantName=source.attendantName||source.botName||source.assistant||DEFAULT_TEMPLATE.assistantName;
    if(!out.whatsapp) out.whatsapp=source.phone||source.whatsappNumber||profile?.whatsapp||DEFAULT_TEMPLATE.whatsapp;
    if(!out.welcome) out.welcome=source.welcomeMessage||source.initialMessage||source.greeting||DEFAULT_TEMPLATE.welcome;
    if(!out.logoUrl) out.logoUrl=source.logo||source.companyLogo||'';
    if(!out.assistantMedia) out.assistantMedia=source.avatar||source.assistantImage||source.assistantVideo||'';
    if(!out.assistantMediaType&&out.assistantMedia) out.assistantMediaType=/^data:video|\.(mp4|webm)(\?|#|$)/i.test(out.assistantMedia)?'video':'image';
    if(!out.backgroundMain) out.backgroundMain=source.siteBackground||source.mainBackground||source.backgroundImage||'';
    if(!out.backgroundChat) out.backgroundChat=source.chatBackground||source.conversationBackground||'';
    return mergeDefaults(DEFAULT_TEMPLATE,out);
  }
  function signatureSettings(sig){sig=sig||{};return{developerShow:sig.show!==false,developerName:sig.name||'JC-APK TV',developerWhatsapp:String(sig.whatsapp||'5555997234936').replace(/\D/g,''),developerInstagram:sig.instagram||'',developerMessage:sig.message||'Desenvolvido por JC-APK TV'}}
  function finish(){document.getElementById('jc_attendant_loading')?.remove();}
  function showError(text,technical){ctx.error=technical||text;const el=document.getElementById('jc_attendant_loading_text');if(el)el.innerHTML=text;}
  function setContextSlug(value){const clean=String(value||'').toLowerCase().replace(/[^a-z0-9-]/g,'');if(!clean)return;ctx.slug=clean;ctx.storageKey=`demo_ai_settings_v1_${clean}`;ctx.leadsKey=`demo_ai_leads_v1_${clean}`;}
  function refreshCachedAccess(access){try{const next=Object.assign({},cached,{profile:access?.profile||cached.profile||{},attendant:access?.attendant||cached.attendant||{},permissions:access?.permissions||cached.permissions||{},general:access?.general||cached.general||{}});sessionStorage.setItem('jc_apk_access',JSON.stringify(next));cached=next;}catch(e){}}
  async function authenticatedAccess(){const{data:{session},error}=await A.client.auth.getSession();if(error)throw error;if(!session)return null;return A.myAccess();}
  async function clientProfile(userId){if(!userId)return null;const{data,error}=await A.client.from('profiles').select('id,username,full_name,whatsapp').eq('id',userId).maybeSingle();if(error)throw error;return data||null;}

  window.JC_ATTENDANT_BOOT_PROMISE=(async()=>{
    if(!A?.ready||!A.client){showError('Não foi possível conectar ao Supabase.<br>Confira <b>dados/supabase-config.js</b> e se a biblioteca do Supabase carregou.');return false;}
    try{
      let settings=null,signature=null,updated='',profile=null,rawSettings={};
      if(previewMode){
        if(!publicSlug){showError('A prévia precisa do identificador do cliente.');return false;}
        const access=await authenticatedAccess();if(access?.profile?.role!=='admin'){showError('Esta prévia é restrita ao administrador.');return false;}
        ctx.access=access;ctx.adminTarget=true;const raw=localStorage.getItem('jc_attendant_admin_preview_'+publicSlug);if(!raw){showError('A prévia expirou ou não foi preparada. Volte ao painel de atendentes.');return false;}
        const draft=JSON.parse(raw);if(Number(draft.expiresAt||0)<Date.now()){localStorage.removeItem('jc_attendant_admin_preview_'+publicSlug);showError('A prévia expirou. Gere uma nova no painel de atendentes.');return false;}
        const sigRes=await A.client.from('app_settings').select('value').eq('key','signature').maybeSingle();if(sigRes.error)throw sigRes.error;setContextSlug(publicSlug);rawSettings=draft.settings||{};settings=legacySettings(rawSettings,null);signature=sigRes.data?.value||{};updated='preview-'+String(draft.createdAt||Date.now());ctx.settingsSource='preview';
      }else if(configMode){
        if(ctx.testMode){ctx.ready=true;setTimeout(finish,250);return true;}
        const access=await authenticatedAccess();if(!access){showError('Faça login no painel do cliente antes de configurar.<br><a style="color:#25d366" href="'+(A.cfg.panelUrl||'../geradores/')+'">Ir para o painel</a>');return false;}
        ctx.access=access;refreshCachedAccess(access);if(access?.profile?.role==='test'){ctx.testMode=true;ctx.ready=true;setTimeout(finish,250);return true;}
        const isAdmin=access?.profile?.role==='admin';const canConfigure=isAdmin||Boolean(access?.permissions?.['attendant.configure']);if(!canConfigure){showError('A configuração completa não está liberada para este usuário.<br><a style="color:#25d366" href="'+(A.cfg.panelUrl||'../geradores/')+'">Voltar ao painel</a>');return false;}
        let attQuery=A.client.from('attendant_profiles').select('user_id,slug,public_settings,published,config_password_changed_at,updated_at');if(isAdmin&&publicSlug){attQuery=attQuery.eq('slug',publicSlug);ctx.adminTarget=true;}else attQuery=attQuery.eq('user_id',access.profile.id);
        const[attRes,sigRes]=await Promise.all([attQuery.maybeSingle(),A.client.from('app_settings').select('value').eq('key','signature').maybeSingle()]);if(attRes.error)throw attRes.error;if(sigRes.error)throw sigRes.error;if(!attRes.data){showError('O perfil da atendente não foi encontrado.<br>Abra o cadastro do cliente e marque que ele utilizará uma atendente.');return false;}
        ctx.targetUserId=attRes.data.user_id;setContextSlug(attRes.data.slug);if(!ctx.adminTarget&&access.attendant)access.attendant.slug=attRes.data.slug;if(!ctx.adminTarget)refreshCachedAccess(access);profile=await clientProfile(attRes.data.user_id);ctx.clientName=profile?.full_name||profile?.username||attRes.data.slug;rawSettings=isObject(attRes.data.public_settings)?attRes.data.public_settings:{};ctx.usingDefaultTemplate=Object.keys(rawSettings).length===0;settings=legacySettings(rawSettings,profile);signature=sigRes.data?.value||{};updated=attRes.data.updated_at||'';ctx.settingsSource=ctx.usingDefaultTemplate?'default':'supabase';
      }else{
        if(!publicSlug){showError('Link incompleto. Use o endereço público com <b>?cliente=identificador</b>.');return false;}
        const{data,error:rpcError}=await A.client.rpc('get_public_attendant',{p_slug:publicSlug});if(rpcError)throw rpcError;if(!data){showError('Atendente não encontrado, ainda não publicado ou acesso temporariamente indisponível.');return false;}
        setContextSlug(data.slug||publicSlug);rawSettings=isObject(data.settings)?data.settings:{};ctx.usingDefaultTemplate=Object.keys(rawSettings).length===0;settings=legacySettings(rawSettings,null);signature=data.signature||{};updated=data.updated_at||'';ctx.settingsSource=ctx.usingDefaultTemplate?'default':'supabase';
      }
      ctx.signature=signature;const merged=Object.assign({},settings,signatureSettings(signature));const key=ctx.storageKey;let old={};try{old=JSON.parse(localStorage.getItem(key)||'{}');}catch(e){}const next=JSON.stringify(merged),prev=JSON.stringify(old);
      if(prev!==next){localStorage.setItem(key,next);const mark='jc_att_reload_'+ctx.slug+(ctx.previewMode?'_preview':'');const version=updated||next;const last=sessionStorage.getItem(mark);if(last!==version){sessionStorage.setItem(mark,version);location.reload();return false;}}
      ctx.ready=true;setTimeout(finish,150);return true;
    }catch(e){console.error('[JC Atendente] Falha ao carregar:',e);showError('Não foi possível carregar a atendente.<br><small>'+(e.message||e)+'</small>',e);return false;}
  })();
})();
