(function(){
  'use strict';

  const A=window.JC_APP;
  const ctx=window.JC_ATTENDANT_CONTEXT||{};
  const $=id=>document.getElementById(id);
  const BUCKET='attendant-media';
  const MEDIA_FIELDS={
    logoUrl:{slot:'logo',max:2*1024*1024},
    assistantMedia:{slot:'atendente',max:5*1024*1024},
    backgroundMain:{slot:'fundo-principal',max:3*1024*1024},
    backgroundChat:{slot:'fundo-conversa',max:3*1024*1024},
    testImage:{slot:'imagem-teste',max:3*1024*1024}
  };
  let unlocked=false;
  let publishing=false;

  function toast(text){
    const fn=window.toast;
    if(typeof fn==='function'){
      try{return fn(text);}catch(e){}
    }
    alert(text);
  }

  function fixedSignature(settings){
    const s=ctx.signature||{};
    settings.developerShow=s.show!==false;
    settings.developerName=s.name||'JC-APK TV';
    settings.developerWhatsapp=String(s.whatsapp||'5555997234936').replace(/\D/g,'');
    settings.developerInstagram=s.instagram||'';
    settings.developerMessage=s.message||'Desenvolvido por JC-APK TV';
    return settings;
  }

  function localSettings(){
    try{return JSON.parse(localStorage.getItem(ctx.storageKey)||'{}');}
    catch(e){return {};}
  }

  function cleanSlug(value){
    return String(value||'atendente').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'atendente';
  }

  function isDataUrl(value){
    return /^data:[^;]+;base64,/i.test(String(value||''));
  }

  function extensionFor(type){
    const map={
      'image/png':'png','image/jpeg':'jpg','image/jpg':'jpg','image/webp':'webp','image/gif':'gif',
      'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'
    };
    return map[String(type||'').toLowerCase()]||'bin';
  }

  async function dataUrlToBlob(dataUrl){
    const response=await fetch(dataUrl);
    if(!response.ok)throw new Error('Não foi possível preparar o arquivo selecionado.');
    return response.blob();
  }

  function storagePathFromPublicUrl(value){
    try{
      const url=new URL(String(value||''));
      const marker=`/storage/v1/object/public/${BUCKET}/`;
      const index=url.pathname.indexOf(marker);
      if(index<0)return '';
      return decodeURIComponent(url.pathname.slice(index+marker.length));
    }catch(e){return '';}
  }

  async function uploadDataMedia(value,field,targetId,slug,oldValue){
    if(!isDataUrl(value))return {value,oldPath:'',newPath:''};
    const meta=MEDIA_FIELDS[field];
    if(!meta)return {value,oldPath:'',newPath:''};

    const blob=await dataUrlToBlob(value);
    if(blob.size>meta.max){
      const mb=Math.round(meta.max/1024/1024);
      throw new Error(`${meta.slot}: o arquivo ultrapassa ${mb} MB. Use um arquivo menor ou um link.`);
    }

    const ext=extensionFor(blob.type);
    const safeSlug=cleanSlug(slug);
    const path=`${targetId}/${safeSlug}/${meta.slot}-${Date.now()}.${ext}`;
    const {error:uploadError}=await A.client.storage.from(BUCKET).upload(path,blob,{
      contentType:blob.type||undefined,
      cacheControl:'31536000',
      upsert:false
    });
    if(uploadError)throw uploadError;

    const {data:urlData}=A.client.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl=urlData?.publicUrl||urlData?.publicURL||'';
    if(!publicUrl)throw new Error(`Não foi possível obter o endereço público de ${meta.slot}.`);

    return {
      value:publicUrl,
      oldPath:storagePathFromPublicUrl(oldValue),
      newPath:path
    };
  }

  async function prepareMedia(settings,existing,targetId,slug){
    const result=Object.assign({},settings);
    const oldPaths=[];
    for(const field of Object.keys(MEDIA_FIELDS)){
      if(!isDataUrl(result[field]))continue;
      toast(`Enviando ${MEDIA_FIELDS[field].slot} para o Supabase...`);
      const uploaded=await uploadDataMedia(result[field],field,targetId,slug,existing[field]);
      result[field]=uploaded.value;
      if(uploaded.oldPath&&uploaded.oldPath!==uploaded.newPath)oldPaths.push(uploaded.oldPath);
    }
    return {settings:result,oldPaths};
  }

  async function removeOldMedia(paths){
    const unique=[...new Set((paths||[]).filter(Boolean))];
    if(!unique.length)return;
    const {error}=await A.client.storage.from(BUCKET).remove(unique);
    if(error)console.warn('[JC Atendente] Não foi possível remover mídia antiga:',error.message||error);
  }

  async function syncSettings(){
    if(!ctx.configMode||publishing)return;
    if(ctx.previewMode){toast('Prévia administrativa: nada foi salvo.');return;}
    if(ctx.testMode){toast('Modo teste: a configuração foi simulada, mas não foi publicada.');return;}

    publishing=true;
    const saveButton=$('saveSettings');
    if(saveButton)saveButton.disabled=true;

    try{
      const access=ctx.access||await A.myAccess();
      if(!access?.profile)throw new Error('Sessão não encontrada.');

      let query=A.client.from('attendant_profiles').select('user_id,slug,public_settings');
      if(ctx.targetUserId)query=query.eq('user_id',ctx.targetUserId);
      else if(ctx.slug)query=query.eq('slug',ctx.slug);
      else query=query.eq('user_id',access.profile.id);

      const {data:profile,error:findError}=await query.maybeSingle();
      if(findError)throw findError;
      if(!profile)throw new Error('Atendente do cliente não encontrada.');
      if(ctx.adminTarget&&ctx.targetUserId&&profile.user_id!==ctx.targetUserId){
        throw new Error('O cliente carregado não corresponde ao cliente selecionado.');
      }

      const existing=profile.public_settings&&typeof profile.public_settings==='object'?profile.public_settings:{};
      let settings=fixedSignature(Object.assign({},existing,localSettings()));
      const prepared=await prepareMedia(settings,existing,profile.user_id,profile.slug||ctx.slug);
      settings=prepared.settings;

      const {data,error}=await A.client
        .from('attendant_profiles')
        .update({public_settings:settings,published:true,updated_at:new Date().toISOString()})
        .eq('user_id',profile.user_id)
        .select('user_id,slug,updated_at')
        .single();
      if(error)throw error;

      localStorage.setItem(ctx.storageKey,JSON.stringify(settings));
      await removeOldMedia(prepared.oldPaths);

      ctx.targetUserId=data.user_id;
      ctx.slug=data.slug;
      ctx.usingDefaultTemplate=false;
      ctx.settingsSource='supabase';
      toast(ctx.adminTarget
        ?`Configurações de ${ctx.clientName||data.slug} salvas e publicadas.`
        :'Configurações salvas e publicadas na sua atendente.');
    }finally{
      publishing=false;
      if(saveButton)saveButton.disabled=false;
    }
  }

  function hidePublicAdmin(){
    if(ctx.configMode)return;
    const b=$('adminBtn');if(b)b.style.display='none';
    const m=$('adminModal');if(m)m.remove();
  }

  function addPublicLink(){
    if(!ctx.configMode)return;
    const panel=$('panel-settings');
    if(!panel||$('jc_attendant_account_box'))return;
    const box=document.createElement('section');
    box.id='jc_attendant_account_box';
    box.style.cssText='margin:14px 0;padding:14px;border-radius:14px;border:1px solid rgba(77,163,255,.3);background:rgba(77,163,255,.07)';
    const base=A.cfg.attendantUrl||location.origin+location.pathname;
    const link=base+'?cliente='+encodeURIComponent(ctx.slug);
    const adminText=ctx.adminTarget?'<p style="padding:9px;border-radius:10px;background:rgba(37,211,102,.08);border:1px solid rgba(37,211,102,.25);color:#d8ffea"><b>Modo administrador:</b> você está alterando somente esta atendente.</p>':'';
    const passwordArea=ctx.adminTarget?'':`<hr style="border:0;border-top:1px solid var(--line);margin:15px 0"><h3>Senha das configurações</h3><p style="color:var(--muted)">Essa senha protege somente a edição da atendente.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input id="jc_att_pass1" type="password" placeholder="Nova senha (mín. 8)" style="padding:11px;border-radius:10px;border:1px solid var(--line);background:rgba(0,0,0,.2);color:#fff"><input id="jc_att_pass2" type="password" placeholder="Confirmar senha" style="padding:11px;border-radius:10px;border:1px solid var(--line);background:rgba(0,0,0,.2);color:#fff"></div><button id="jc_save_att_pass" type="button" class="primary-btn" style="margin-top:8px">Salvar senha das configurações</button>`;
    box.innerHTML=`<h3 style="margin-top:0">Acesso e link público</h3>${adminText}<p style="color:var(--muted)">Logo, avatar, fundos e vídeos enviados por arquivo são armazenados automaticamente no Supabase.</p><input id="jc_public_link" readonly value="${link}" style="width:100%;padding:11px;border-radius:10px;border:1px solid var(--line);background:rgba(0,0,0,.2);color:#fff"><button id="jc_copy_public_link" type="button" class="ghost-btn" style="margin-top:8px">Copiar link público</button>${passwordArea}`;
    panel.prepend(box);
    $('jc_copy_public_link').onclick=()=>navigator.clipboard.writeText(link).then(()=>toast('Link público copiado.'));
    if($('jc_save_att_pass'))$('jc_save_att_pass').onclick=saveConfigPassword;
  }

  async function saveConfigPassword(){
    const a=$('jc_att_pass1').value,b=$('jc_att_pass2').value;
    if(a.length<8)return toast('A senha precisa ter pelo menos 8 caracteres.');
    if(a!==b)return toast('As senhas não conferem.');
    const {error}=await A.client.rpc('set_attendant_password',{p_password:a});
    if(error)return toast(error.message);
    $('jc_att_pass1').value=$('jc_att_pass2').value='';
    unlocked=true;
    toast('Senha das configurações salva.');
  }

  function passwordModal(){
    let m=$('jc_att_password_gate');if(m)return m;
    m=document.createElement('div');m.id='jc_att_password_gate';
    m.style.cssText='display:none;position:fixed;inset:0;z-index:99999999;align-items:center;justify-content:center;background:rgba(0,0,0,.78);padding:10px';
    m.innerHTML='<div style="width:min(430px,100%);padding:22px;border-radius:20px;border:1px solid rgba(255,255,255,.14);background:#0b1d29;color:#fff"><h3>Senha das configurações</h3><p style="color:#aebbc3">Digite a senha criada para editar sua atendente.</p><input id="jc_att_gate_input" type="password" style="width:100%;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#06131b;color:#fff"><div id="jc_att_gate_msg" style="min-height:20px;color:#ff9ba8;margin-top:7px"></div><div style="display:flex;gap:7px"><button id="jc_att_gate_cancel" style="flex:1;padding:10px;border-radius:10px;border:0">Cancelar</button><button id="jc_att_gate_ok" style="flex:1;padding:10px;border-radius:10px;border:0;background:#25d366;color:#052117;font-weight:900">Entrar</button></div></div>';
    document.body.appendChild(m);
    $('jc_att_gate_cancel').onclick=()=>m.style.display='none';
    $('jc_att_gate_ok').onclick=verifyGate;
    return m;
  }

  async function verifyGate(){
    const p=$('jc_att_gate_input').value;
    const {data,error}=await A.client.rpc('verify_attendant_password',{p_password:p});
    if(error||!data){$('jc_att_gate_msg').textContent=error?.message||'Senha incorreta.';return;}
    unlocked=true;
    $('jc_att_password_gate').style.display='none';
    $('adminBtn').click();
  }

  function protectAdmin(){
    if(!ctx.configMode||ctx.testMode)return;
    if(ctx.adminTarget){unlocked=true;return;}
    const configured=Boolean(ctx.access?.attendant?.password_configured);
    if(!configured){unlocked=true;return;}
    document.addEventListener('click',e=>{
      const b=e.target.closest('#adminBtn');
      if(!b||unlocked)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const m=passwordModal();m.style.display='flex';
      setTimeout(()=>$('jc_att_gate_input').focus(),30);
    },true);
  }

  function lockSignatureUI(){
    const fields=$('developerProtectedFields');if(fields)fields.disabled=true;
    const pin=$('developerPinInput'),unlock=$('unlockDeveloperSettings'),lock=$('lockDeveloperSettings');
    if(pin)pin.closest('.brand-lock-row')?.remove();
    if(unlock)unlock.remove();if(lock)lock.remove();
    const status=$('developerLockStatus');
    if(status){status.textContent='🔐 Assinatura protegida. Somente o administrador altera no painel JC-APK TV.';status.style.color='var(--green)';}
  }

  function bindSave(){
    const b=$('saveSettings');if(!b)return;
    b.addEventListener('click',()=>setTimeout(()=>syncSettings().catch(e=>toast('Não foi possível publicar: '+(e.message||e))),180));
  }

  function init(){
    hidePublicAdmin();lockSignatureUI();addPublicLink();protectAdmin();bindSave();
    if(ctx.configMode&&ctx.testMode){
      const panel=$('panel-settings');
      if(panel){
        const n=document.createElement('div');
        n.style.cssText='padding:10px;border:1px solid rgba(255,191,71,.3);background:rgba(255,191,71,.08);border-radius:12px;margin-bottom:12px;color:#ffe5a6';
        n.textContent='MODO TESTE — você pode simular as configurações, mas elas não serão publicadas.';
        panel.prepend(n);
      }
    }
  }

  async function startWhenReady(){
    try{await(window.JC_ATTENDANT_BOOT_PROMISE||Promise.resolve());}catch(e){}
    if(window.JC_ATTENDANT_CONTEXT?.error)return;
    init();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startWhenReady,{once:true});
  else startWhenReady();
})();
