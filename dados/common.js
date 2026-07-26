(function(){
  'use strict';
  const cfg = window.JC_SUPABASE_CONFIG || {};
  let rootUrl='';
  try{
    const scriptUrl=new URL((document.currentScript&&document.currentScript.src)||location.href,location.href);
    rootUrl=new URL('../',scriptUrl).href;
  }catch(e){
    rootUrl=new URL('./',location.href).href;
  }
  if(!cfg.siteUrl) cfg.siteUrl=rootUrl.replace(/\/+$/,'');
  if(!cfg.panelUrl) cfg.panelUrl=new URL('geradores/',rootUrl).href;
  if(!cfg.recoveryUrl) cfg.recoveryUrl=new URL('redefinir-senha.html',rootUrl).href;
  const ready = /^https:\/\/.+\.supabase\.co$/i.test(String(cfg.url||'')) && String(cfg.publishableKey||'').length > 30;
  let client = null;
  if(ready && window.supabase && typeof window.supabase.createClient === 'function'){
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
  }
  async function copyText(text){
    const value=String(text||'');
    if(navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
    const area=document.createElement('textarea');
    area.value=value;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';
    document.body.appendChild(area);area.select();
    const ok=document.execCommand('copy');area.remove();
    if(!ok) throw new Error('Não foi possível copiar automaticamente.');
  }
  window.JC_APP = {
    cfg, ready, client, rootUrl,
    money(value){ return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); },
    date(value){ if(!value) return ''; const d=new Date(value+'T12:00:00'); return Number.isNaN(d.getTime())?'':d.toLocaleDateString('pt-BR'); },
    isoDate(date){ const d=date instanceof Date?date:new Date(date); return d.toISOString().slice(0,10); },
    addMonths(date, months){ const d=new Date(date+'T12:00:00'); d.setMonth(d.getMonth()+Number(months||0)); return d.toISOString().slice(0,10); },
    addDays(date, days){ const d=new Date(date+'T12:00:00'); d.setDate(d.getDate()+Number(days||0)); return d.toISOString().slice(0,10); },
    slug(value){ return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48); },
    async resolveEmail(identifier){
      const raw=String(identifier||'').trim();
      if(!raw) throw new Error('Digite o usuário ou e-mail.');
      if(cfg.adminUsername && cfg.adminEmail && raw.toLowerCase()===String(cfg.adminUsername).toLowerCase()) return String(cfg.adminEmail).toLowerCase();
      if(!client) throw new Error('Supabase ainda não configurado.');
      let data=null;
      const primary=await client.rpc('jc_resolve_login_email_v2',{p_identifier:raw});
      if(!primary.error) data=primary.data;
      else if(/function .* does not exist|could not find the function|schema cache|not found/i.test(String(primary.error.message||primary.error))){
        const legacy=await client.rpc('resolve_login_email',{p_identifier:raw});
        if(!legacy.error) data=legacy.data;
        else if(!raw.includes('@')) throw legacy.error;
      }else throw primary.error;
      // Para clientes da revenda, o e-mail de contato é resolvido para o e-mail interno do Auth.
      // Se a RPC ainda não conhece um e-mail direto antigo, tenta o próprio endereço como compatibilidade.
      if(!data && raw.includes('@')) return raw.toLowerCase();
      if(!data) throw new Error('Usuário não encontrado.');
      return String(data).toLowerCase();
    },
    async login(identifier,password){
      if(!client) throw new Error('Configure o novo Supabase em dados/supabase-config.js.');
      const email=await this.resolveEmail(identifier);
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error) throw error;
      return data;
    },
    async myAccess(){
      if(!client) throw new Error('Supabase não configurado.');
      const {data,error}=await client.rpc('get_my_access');
      if(error) throw error;

      // A RPC continua sendo a fonte principal do perfil e das configurações.
      // Porém, as permissões são relidas diretamente de user_permissions para
      // evitar que uma versão antiga de get_my_access mantenha botões bloqueados
      // depois que o administrador acabou de liberar o cliente.
      try{
        const {data:{session}}=await client.auth.getSession();
        const userId=session?.user?.id;
        if(userId){
          const direct=await client
            .from('user_permissions')
            .select('function_id,enabled')
            .eq('user_id',userId);
          if(!direct.error&&Array.isArray(direct.data)){
            const permissions={...(data?.permissions||{})};
            direct.data.forEach((row)=>{
              const id=String(row?.function_id||'').trim();
              if(id)permissions[id]=row?.enabled===true;
            });
            if(data&&typeof data==='object')data.permissions=permissions;
          }
        }
      }catch(permissionRefreshError){
        console.warn('Atualização direta das permissões:',permissionRefreshError?.message||permissionRefreshError);
      }
      return data;
    },
    async requireAdmin(){
      if(!client) return null;
      const {data:{session}}=await client.auth.getSession();
      if(!session) return null;
      const access=await this.myAccess();
      return access && access.profile && access.profile.role==='admin' ? access : null;
    },
    async testConnection(){
      if(!ready || !client) throw new Error('Preencha a URL e a chave pública em dados/supabase-config.js.');
      const started=Date.now();
      const primary=await client.rpc('jc_resolve_login_email_v2',{p_identifier:'__jc_connection_test__'});
      if(primary.error && /function .* does not exist|could not find the function|schema cache|not found/i.test(String(primary.error.message||primary.error))){
        const legacy=await client.rpc('resolve_login_email',{p_identifier:'__jc_connection_test__'});
        if(legacy.error) throw new Error('O Supabase respondeu, mas a função de login por usuário não está pronta: '+legacy.error.message);
      }else if(primary.error) throw new Error('O Supabase respondeu, mas a função de login por usuário não está pronta: '+primary.error.message);
      const {error:attendantError}=await client.rpc('get_public_attendant',{p_slug:'__jc_connection_test__'});
      if(attendantError) throw new Error('A conexão funciona, mas a função get_public_attendant não está pronta: '+attendantError.message);
      return {ok:true,url:String(cfg.url||''),elapsed:Date.now()-started,attendant:true};
    },
    toast(text,type='ok'){
      let el=document.getElementById('jc-global-toast');
      if(!el){ el=document.createElement('div'); el.id='jc-global-toast'; document.body.appendChild(el); }
      el.textContent=text; el.className='jc-global-toast '+type+' show';
      clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),3500);
    },
    copy:copyText
  };
})();

// Carrega a organização por categorias somente no painel principal.
(function loadDashboardOrganizer(){
  const dashboard=document.querySelector(".hero > .grid #card-gerenciador-botoes-painel");
  if(!dashboard||document.querySelector('script[data-jc-dashboard-organizer]'))return;
  const style=document.createElement("link");
  style.rel="stylesheet";
  style.href="dados/dashboard-organizer.css?v=20260720-03";
  style.dataset.jcDashboardOrganizer="style";
  document.head.appendChild(style);
  const script=document.createElement("script");
  script.src="dados/dashboard-organizer.js?v=20260720-03";
  script.dataset.jcDashboardOrganizer="script";
  document.head.appendChild(script);
})();
