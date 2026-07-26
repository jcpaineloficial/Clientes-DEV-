(function(){
  'use strict';

  const A = window.JC_APP;
  if(!A || !A.client) return;

  const TEST_ACCOUNT = Object.freeze({
    username: 'testejc',
    full_name: 'JC APK Informática',
    email: 'jcapkinformatica@gmail.com',
    password: '110613'
  });

  function fileToDataUrl(path){
    return fetch(new URL(path, window.location.href), {cache:'no-store'})
      .then(function(response){
        if(!response.ok) throw new Error('Não foi possível carregar '+path+'.');
        return response.blob();
      })
      .then(function(blob){
        return new Promise(function(resolve,reject){
          const reader = new FileReader();
          reader.onload = function(){ resolve(String(reader.result||'')); };
          reader.onerror = function(){ reject(new Error('Não foi possível preparar a imagem de perfil.')); };
          reader.readAsDataURL(blob);
        });
      });
  }

  async function invokeAdmin(body){
    const result = await A.client.functions.invoke('admin-users',{body:body});
    if(result.error) throw result.error;
    if(!result.data || result.data.ok !== true) throw new Error(result.data?.error || 'A operação administrativa falhou.');
    return result.data;
  }

  async function setupProfiles(button){
    if(button.dataset.running === '1') return;
    if(!window.confirm('Configurar a foto do administrador e criar/atualizar o usuário TESTEJC agora?')) return;

    button.dataset.running='1';
    button.disabled=true;
    const originalText=button.textContent;
    button.textContent='Configurando...';

    try{
      const sessionResult = await A.client.auth.getSession();
      const session = sessionResult.data?.session;
      if(!session) throw new Error('Entre como administrador antes de executar esta configuração.');

      const [adminAvatar,testAvatar,functionsResult] = await Promise.all([
        fileToDataUrl('assets/avatar-admin.webp'),
        fileToDataUrl('assets/avatar-testejc.webp'),
        A.client.from('functions_catalog').select('id').eq('active',true).order('sort_order')
      ]);
      if(functionsResult.error) throw functionsResult.error;
      const permissions=(functionsResult.data||[]).map(function(row){return row.id;}).filter(Boolean);

      const avatarResult = await A.client.rpc('set_my_avatar',{p_avatar_data:adminAvatar});
      if(avatarResult.error) throw avatarResult.error;
      await A.client.from('profiles').update({avatar_required:false,updated_at:new Date().toISOString()}).eq('id',session.user.id);

      const existingResult = await A.client
        .from('profiles')
        .select('id,username,email,account_type,role')
        .eq('username',TEST_ACCOUNT.username)
        .maybeSingle();
      if(existingResult.error) throw existingResult.error;

      const commonBody={
        username:TEST_ACCOUNT.username,
        full_name:TEST_ACCOUNT.full_name,
        email:TEST_ACCOUNT.email,
        whatsapp:'',
        whatsapp2:'',
        whatsapp3:'',
        account_type:'test',
        role:'test',
        billing_opt_in:false,
        status:'active',
        plan_months:0,
        plan_name:'Teste permanente',
        plan_value:0,
        starts_at:new Date().toISOString().slice(0,10),
        expires_at:null,
        grace_until:null,
        trial_expires_at:null,
        credits_balance:0,
        permissions:permissions,
        attendant_enabled:false,
        attendant_slug:TEST_ACCOUNT.username,
        is_reseller:false,
        avatar_data:testAvatar,
        avatar_required:false
      };

      let userId='';
      if(existingResult.data?.id){
        userId=existingResult.data.id;
        await invokeAdmin(Object.assign({action:'update',user_id:userId},commonBody));
        await invokeAdmin({action:'set_password',user_id:userId,password:TEST_ACCOUNT.password});
      }else{
        const created=await invokeAdmin(Object.assign({action:'create',password:TEST_ACCOUNT.password},commonBody));
        userId=created.user_id;
      }

      A.toast('Perfis configurados. TESTEJC já pode entrar por usuário ou e-mail.');
      window.setTimeout(function(){ window.location.reload(); },1200);
    }catch(error){
      console.error(error);
      A.toast(error.message || 'Não foi possível configurar os perfis.','error');
    }finally{
      button.dataset.running='0';
      button.disabled=false;
      button.textContent=originalText;
    }
  }

  function install(){
    const newClient=document.getElementById('newClientBtn');
    if(!newClient || document.getElementById('setupStandardProfilesBtn')) return;
    const button=document.createElement('button');
    button.type='button';
    button.id='setupStandardProfilesBtn';
    button.className='btn amber';
    button.textContent='Configurar ADM + TESTEJC';
    button.title='Aplica a foto do administrador e cria/atualiza o usuário testejc.';
    button.addEventListener('click',function(){setupProfiles(button);});
    newClient.parentNode.insertBefore(button,newClient);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
