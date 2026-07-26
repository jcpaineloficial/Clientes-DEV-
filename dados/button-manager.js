(function(){
  'use strict';
  const A=window.JC_APP;
  const $=function(id){return document.getElementById(id);};
  const DEFAULT_MESSAGE='Estamos trabalhando o mais rápido possível para atualizar esta função e trazer melhorias. Agradecemos pela compreensão. Tente novamente mais tarde.';
  const state={access:null,buttons:[],query:''};
  const EMERGENCY_PANEL_BUTTONS=[{"id":"support.open","name":"Suporte WhatsApp","category":"Suporte","selector":"","action_kind":"link","sort_order":100},{"id":"config.file_manager","name":"Gerenciador de arquivos","category":"Config","selector":"#btn_tutorial","action_kind":"link","sort_order":101},{"id":"config.system_update","name":"Limpeza do UniTv S/Formatar","category":"Config","selector":"#btn_atualizacao","action_kind":"link","sort_order":102},{"id":"config.open","name":"Gerar .Config Aqui","category":"Config","selector":"#btn_gerar","action_kind":"entry","sort_order":103},{"id":"config.generate_codes","name":"Gerar códigos de download","category":"Config","selector":"#btn_config_download_gerar_codigo","action_kind":"action","sort_order":104},{"id":"config.copy_code","name":"Copiar código de download","category":"Config","selector":"#btn_config_download_copiar_codigo","action_kind":"action","sort_order":105},{"id":"config.access","name":"Acesse aqui (.config)","category":"Config","selector":"#btn_config_pack","action_kind":"download","sort_order":106},{"id":"config.download_codes","name":"Versões / códigos de download","category":"Config","selector":"#btn_unitv_codigos","action_kind":"action","sort_order":107},{"id":"config.download_apk","name":"Download das versões do APK","category":"Config","selector":"#btn_versao","action_kind":"link","sort_order":108},{"id":"activator11.open","name":"Ativador 11 Dígitos","category":"Ativadores","selector":"#btn_gerador11_11","action_kind":"entry","sort_order":109},{"id":"activator11.access","name":"Ativador 11","category":"Ativadores","selector":"#btn_ativador_5100_11","action_kind":"link","sort_order":110},{"id":"activator11.reset","name":"Resetar ativador 11","category":"Ativadores","selector":"#btn_reset_ativador_11","action_kind":"action","sort_order":111},{"id":"activator11.generate","name":"Gerar ativação 11","category":"Ativadores","selector":"#btn_gerar_codigo_11","action_kind":"action","sort_order":112},{"id":"activator11.copy","name":"Copiar ativação 11","category":"Ativadores","selector":"#btn_copiar_codigo_11","action_kind":"action","sort_order":113},{"id":"activator11.generate_download","name":"Gerar código download 11","category":"Ativadores","selector":"#btn_gerar_codigo_download_11","action_kind":"action","sort_order":114},{"id":"activator11.copy_download","name":"Copiar código download 11","category":"Ativadores","selector":"#btn_copiar_codigo_download_11","action_kind":"action","sort_order":115},{"id":"activator16.open","name":"Ativador 16 Dígitos","category":"Ativadores","selector":"#btn_gerador11","action_kind":"entry","sort_order":116},{"id":"activator16.access","name":"Ativador 16","category":"Ativadores","selector":"#btn_ativador_5100","action_kind":"link","sort_order":117},{"id":"activator16.reset","name":"Resetar ativador 16","category":"Ativadores","selector":"#btn_reset_ativador_16","action_kind":"action","sort_order":118},{"id":"activator16.generate","name":"Gerar ativação 16","category":"Ativadores","selector":"#btn_gerar_codigo_16","action_kind":"action","sort_order":119},{"id":"activator16.copy","name":"Copiar ativação 16","category":"Ativadores","selector":"#btn_copiar_codigo_16","action_kind":"action","sort_order":120},{"id":"activator16.generate_download","name":"Gerar código download 16","category":"Ativadores","selector":"#btn_gerar_codigo_download","action_kind":"action","sort_order":121},{"id":"activator16.copy_download","name":"Copiar código download 16","category":"Ativadores","selector":"#btn_copiar_codigo_download_16","action_kind":"action","sort_order":122},{"id":"package.btv.open","name":"BTV APK","category":"Pacote de APK","selector":"#btn_pacote_gerar","action_kind":"entry","sort_order":123},{"id":"package.stv.open","name":"STV APK","category":"Pacote de APK","selector":"#btn_pacote_stv","action_kind":"entry","sort_order":124},{"id":"package.xplus.open","name":"XPLUS APK","category":"Pacote de APK","selector":"#btn_pacote_xplus","action_kind":"entry","sort_order":125},{"id":"package.eaigo.open","name":"EAIGO APK","category":"Pacote de APK","selector":"#btn_pacote_xplus_novo","action_kind":"entry","sort_order":126},{"id":"package.btv.generate","name":"BTV gerar códigos","category":"Pacote de APK","selector":"#btn_pacote_btv_gerar_codigo","action_kind":"action","sort_order":127},{"id":"package.btv.copy","name":"BTV copiar código","category":"Pacote de APK","selector":"#btn_pacote_btv_copiar_codigo","action_kind":"action","sort_order":128},{"id":"package.btv.access","name":"BTV APK","category":"Pacote de APK","selector":"#btn_pacote_btv_acessar","action_kind":"link","sort_order":129},{"id":"package.stv.generate","name":"STV gerar códigos","category":"Pacote de APK","selector":"#btn_pacote_stv_gerar_codigo","action_kind":"action","sort_order":130},{"id":"package.stv.copy","name":"STV copiar código","category":"Pacote de APK","selector":"#btn_pacote_stv_copiar_codigo","action_kind":"action","sort_order":131},{"id":"package.stv.access","name":"STV APK","category":"Pacote de APK","selector":"#btn_pacote_stv_acessar","action_kind":"link","sort_order":132},{"id":"package.xplus.generate","name":"XPLUS gerar códigos","category":"Pacote de APK","selector":"#btn_pacote_xplus_gerar_codigo","action_kind":"action","sort_order":133},{"id":"package.xplus.copy","name":"XPLUS copiar código","category":"Pacote de APK","selector":"#btn_pacote_xplus_copiar_codigo","action_kind":"action","sort_order":134},{"id":"package.xplus.access","name":"XPLUS APK","category":"Pacote de APK","selector":"#btn_pacote_xplus_acessar","action_kind":"link","sort_order":135},{"id":"package.eaigo.generate","name":"EAIGO gerar códigos","category":"Pacote de APK","selector":"#btn_pacote_eaigo_gerar_codigo","action_kind":"action","sort_order":136},{"id":"package.eaigo.copy","name":"EAIGO copiar código","category":"Pacote de APK","selector":"#btn_pacote_eaigo_copiar_codigo","action_kind":"action","sort_order":137},{"id":"package.eaigo.access","name":"EAIGO APK","category":"Pacote de APK","selector":"#btn_pacote_eaigo_acessar","action_kind":"link","sort_order":138},{"id":"launcher.open","name":"JC Launcher Lite / Pro","category":"JC Launcher","selector":"#jcboxdemo_toggle","action_kind":"entry","sort_order":139},{"id":"launcher.lite.preview","name":"Demonstrar Launcher Lite","category":"JC Launcher","selector":"#jc_launcher_preview_lite","action_kind":"action","sort_order":140},{"id":"launcher.pro.preview","name":"Demonstrar Launcher Pro","category":"JC Launcher","selector":"#jc_launcher_preview_pro","action_kind":"action","sort_order":141},{"id":"launcher.lite.generate_download","name":"Launcher Lite gerar código de download","category":"JC Launcher","selector":"#btn_launcher_lite_gerar_codigo","action_kind":"action","sort_order":142},{"id":"launcher.lite.copy_download","name":"Launcher Lite copiar código","category":"JC Launcher","selector":"#btn_launcher_lite_copiar_codigo","action_kind":"action","sort_order":143},{"id":"launcher.lite.download","name":"Baixar JC Launcher Lite","category":"JC Launcher","selector":"#btn_launcher_lite_download","action_kind":"link","sort_order":144},{"id":"launcher.pro.generate_download","name":"Launcher Pro gerar código de download","category":"JC Launcher","selector":"#btn_launcher_pro_gerar_codigo","action_kind":"action","sort_order":145},{"id":"launcher.pro.copy_download","name":"Launcher Pro copiar código","category":"JC Launcher","selector":"#btn_launcher_pro_copiar_codigo","action_kind":"action","sort_order":146},{"id":"launcher.pro.download","name":"Baixar JC Launcher Pro","category":"JC Launcher","selector":"#btn_launcher_pro_download","action_kind":"link","sort_order":147},{"id":"launcher.control.open","name":"Abrir painel JC Box Control","category":"JC Launcher","selector":"#jcboxdemo_open_control","action_kind":"link","sort_order":148}];

  // O antigo atalho de WhatsApp foi substituído pela Central interna de Sugestões.
  const obsoleteSupportIndex=EMERGENCY_PANEL_BUTTONS.findIndex(function(item){return item.id==='support.open';});
  if(obsoleteSupportIndex>=0)EMERGENCY_PANEL_BUTTONS.splice(obsoleteSupportIndex,1);
  EMERGENCY_PANEL_BUTTONS.push({id:'activators.mass.open',name:'Dígitos em Massa',category:'Dígitos em Massa',selector:'#btn_digits_mass',action_kind:'entry',sort_order:122.5});
  EMERGENCY_PANEL_BUTTONS.push({id:'launcher.tools.open',name:'Downloads e Painel de Controle',category:'JC Launcher',selector:'#jc_launcher_tools_toggle',action_kind:'entry',sort_order:140.5});
  EMERGENCY_PANEL_BUTTONS.push({id:'activatorvip.open',name:'Ativador VIP',category:'Ativador VIP',selector:'#btn_activator_vip',action_kind:'entry',sort_order:122.0});
  EMERGENCY_PANEL_BUTTONS.push({id:'activatorvip.access',name:'Abrir APK VIP',category:'Ativador VIP',selector:'#vip_panel [data-jc-vip-open-link]',action_kind:'link',sort_order:122.1});
  EMERGENCY_PANEL_BUTTONS.push({id:'activatorvip.reset',name:'Resetar ativador VIP',category:'Ativador VIP',selector:'#vip_panel .gerador16-reset-btn',action_kind:'action',sort_order:122.2});
  EMERGENCY_PANEL_BUTTONS.push({id:'activatorvip.generate',name:'Gerar ativação VIP',category:'Ativador VIP',selector:'[data-jc-vip-generate],[data-jc-vip-batch]',action_kind:'action',sort_order:122.3});
  EMERGENCY_PANEL_BUTTONS.push({id:'activatorvip.copy',name:'Copiar ativação VIP',category:'Ativador VIP',selector:'[data-jc-vip-copy-activation]',action_kind:'action',sort_order:122.4});
  EMERGENCY_PANEL_BUTTONS.push({id:'activatorvip.generate_download',name:'Gerar código download VIP',category:'Ativador VIP',selector:'[data-jc-vip-download-generate]',action_kind:'action',sort_order:122.5});
  EMERGENCY_PANEL_BUTTONS.push({id:'activatorvip.copy_download',name:'Copiar código download VIP',category:'Ativador VIP',selector:'[data-jc-vip-copy]',action_kind:'action',sort_order:122.55});
  [['config','CONFIG em massa'],['11','11 dígitos em massa'],['16','16 dígitos em massa'],['vip','VIP em massa']].forEach(function(item,index){EMERGENCY_PANEL_BUTTONS.push({id:'activators.mass.'+item[0],name:item[1],category:'Operações em Massa',selector:'[data-jc-batch="'+item[0]+'"]',action_kind:'action',sort_order:122.6+index/10});});
  EMERGENCY_PANEL_BUTTONS.push({id:'system.login.lock',name:'Bloquear acesso no login',category:'Manutenção Geral',selector:'#login-card',action_kind:'system',sort_order:9990});
  EMERGENCY_PANEL_BUTTONS.push({id:'system.generator.lock',name:'Bloquear todo o Gerenciador',category:'Manutenção Geral',selector:'.wrapper',action_kind:'system',sort_order:9991});

  function esc(value){return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function setStatus(message,type){const el=$('pbmStatus');el.textContent=message||'';el.className='pbm-status'+(type?' '+type:'');}
  function dateTime(value){if(!value)return 'Sem alteração registrada';const d=new Date(value);return Number.isNaN(d.getTime())?'Sem data':d.toLocaleString('pt-BR');}
  function openModal(id){const m=$(id);m.classList.add('open');m.setAttribute('aria-hidden','false');}
  function closeModals(){document.querySelectorAll('.pbm-modal.open').forEach(function(m){m.classList.remove('open');m.setAttribute('aria-hidden','true');});}

  async function verifyPanelButtonAdminAccess(){
    if(!A||!A.ready||!A.client)throw new Error('Configure primeiro o Supabase em dados/supabase-config.js.');
    const access=await A.requireAdmin();
    if(!access)throw new Error('A sessão atual não possui permissão administrativa.');
    state.access=access;return access;
  }

  function normalizeRows(data){
    const rows=Array.isArray(data)?data:(data&&Array.isArray(data.buttons)?data.buttons:[]);
    return rows.map(function(row){return {
      id:String(row.id||''),name:String(row.name||row.id||''),category:String(row.category||row.group_name||'Outras funções'),selector:String(row.selector||''),action_kind:String(row.action_kind||'entry'),status:String(row.status||row.panel_status||'active'),message:String(row.message||row.maintenance_message||DEFAULT_MESSAGE),updated_at:row.updated_at||row.panel_status_updated_at||null,updated_by_name:String(row.updated_by_name||row.actor_name||'')
    };});
  }

  async function loadPanelButtons(){
    setStatus('Carregando botões administráveis...');
    const result=await A.client.rpc('admin_list_panel_buttons');
    if(result.error)throw result.error;
    state.buttons=normalizeRows(result.data);
    renderPanelButtons();
    setStatus('Lista atualizada. O estado ativo não altera nenhuma função do botão.','ok');
  }

  function filteredButtons(){
    const q=state.query.trim().toLowerCase();
    if(!q)return state.buttons;
    return state.buttons.filter(function(item){return [item.name,item.id,item.category,item.selector].join(' ').toLowerCase().includes(q);});
  }

  function applyPanelButtonStatuses(){
    const total=state.buttons.length,maintenance=state.buttons.filter(function(x){return x.status==='maintenance';}).length;
    $('pbmTotal').textContent=String(total);$('pbmMaintenance').textContent=String(maintenance);$('pbmActive').textContent=String(total-maintenance);
  }

  function renderPanelButtons(){
    applyPanelButtonStatuses();
    const rows=filteredButtons();
    const host=$('pbmList');
    if(!rows.length){host.innerHTML='<div class="pbm-empty">Nenhum botão encontrado. Use “Sincronizar botões do painel”.</div>';return;}
    host.innerHTML=rows.map(function(item){
      const maintenance=item.status==='maintenance';
      return `<article class="pbm-row ${maintenance?'maintenance':''}" data-button-id="${esc(item.id)}"><div><h3>${esc(item.name)}</h3><div class="pbm-meta">ID: ${esc(item.id)}<br>Categoria: ${esc(item.category)}${item.selector?'<br>Seletor: '+esc(item.selector):''}</div></div><div><span class="pbm-badge ${maintenance?'maintenance':''}">${maintenance?'🛠️ EM MANUTENÇÃO':'✓ ATIVO'}</span>${maintenance?'<div class="pbm-message">'+esc(item.message)+'</div>':''}<div class="pbm-meta" style="margin-top:7px">Última alteração: ${esc(dateTime(item.updated_at))}${item.updated_by_name?'<br>Por: '+esc(item.updated_by_name):''}</div></div><div class="pbm-row-actions"><button class="pbm-btn" type="button" data-history="${esc(item.id)}">Histórico</button>${maintenance?`<button class="pbm-btn primary" type="button" data-activate="${esc(item.id)}">Ativar</button><button class="pbm-btn amber" type="button" data-maintenance="${esc(item.id)}">Editar aviso</button>`:`<button class="pbm-btn amber" type="button" data-maintenance="${esc(item.id)}">Colocar em manutenção</button>`}</div></article>`;
    }).join('');
    host.querySelectorAll('[data-activate]').forEach(function(btn){btn.onclick=function(){updatePanelButtonStatus(btn.dataset.activate,'active','').catch(showError);};});
    host.querySelectorAll('[data-maintenance]').forEach(function(btn){btn.onclick=function(){openMaintenanceEditor(btn.dataset.maintenance);};});
    host.querySelectorAll('[data-history]').forEach(function(btn){btn.onclick=function(){loadHistory(btn.dataset.history).catch(showError);};});
  }

  function openMaintenanceEditor(id){
    const item=state.buttons.find(function(x){return x.id===id;});if(!item)return;
    const professional=id==='system.login.lock'?'Nosso painel está temporariamente em manutenção programada. O acesso será restabelecido assim que a atualização for concluída. Nenhum dado da sua conta será perdido.':id==='system.generator.lock'?'O Gerenciador JC-APK TV está recebendo melhorias e está temporariamente indisponível. Tente novamente mais tarde; seus dados e permissões permanecem seguros.':DEFAULT_MESSAGE;
    $('pbmEditId').value=id;$('pbmEditTitle').textContent=item.name+' — manutenção';$('pbmMessage').value=item.status==='maintenance'&&item.message?item.message:professional;openModal('pbmEditModal');
  }

  function showPanelButtonMaintenanceMessage(name,message){
    $('pbmMessageTitle').textContent=(name?name+' — ':'')+'Em manutenção';$('pbmMessagePreview').textContent=message||DEFAULT_MESSAGE;openModal('pbmMessageModal');
  }

  async function updatePanelButtonStatus(id,status,message){
    const item=state.buttons.find(function(x){return x.id===id;});
    if(!item)throw new Error('Botão não encontrado.');
    const isMaintenance=status==='maintenance';
    if(!isMaintenance&&!confirm('Ativar novamente “'+item.name+'”? O botão voltará ao funcionamento original.'))return;
    setStatus(isMaintenance?'Salvando manutenção...':'Ativando botão...');
    const result=await A.client.rpc('admin_update_panel_button_status',{p_function_id:id,p_status:status,p_message:isMaintenance?(message||DEFAULT_MESSAGE):null});
    if(result.error)throw result.error;
    closeModals();await loadPanelButtons();A.toast(isMaintenance?'Botão colocado em manutenção.':'Botão ativado sem alterar seu funcionamento original.');
  }

  function categoryFor(id){if(id.startsWith('config.'))return 'Config';if(id.startsWith('activator'))return 'Ativadores';if(id.startsWith('package.'))return 'Pacotes APK';if(id.startsWith('launcher.'))return 'JC Launcher';return 'Outras funções';}
  function nameFromElement(el){return (el.getAttribute('data-jc-function-name')||el.getAttribute('data-jc-name')||el.getAttribute('aria-label')||el.querySelector('[data-jc-button-label],.btn-title,.brand-text')?.textContent||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,120);}

  function locatePanelButtons(doc){
    const map=new Map();
    doc.querySelectorAll('[data-jc-function-id]').forEach(function(el,index){
      const id=String(el.getAttribute('data-jc-function-id')||'').trim();if(!id||map.has(id))return;
      const htmlId=el.id||'';
      map.set(id,{id,name:nameFromElement(el)||id,category:el.getAttribute('data-jc-function-category')||categoryFor(id),selector:htmlId?'#'+htmlId:(el.getAttribute('data-jc-selector')||''),action_kind:el.getAttribute('data-jc-action-kind')||'entry',sort_order:100+index});
    });
    return [...map.values()];
  }

  async function registerNewPanelButtons(buttons){
    const result=await A.client.rpc('admin_sync_panel_buttons',{p_buttons:buttons});
    if(result.error)throw result.error;
    return result.data||{};
  }

  async function deactivateRemovedPanelButtons(foundIds){
    const result=await A.client.from('functions_catalog').select('id').eq('source_key','base').eq('panel_manageable',true).eq('active',true);
    if(result.error)throw result.error;
    const keep=new Set(foundIds);
    const removed=(result.data||[]).filter(function(row){return !keep.has(String(row.id||''));});
    for(const row of removed){
      const update=await A.client.from('functions_catalog').update({active:false}).eq('id',row.id).eq('source_key','base').eq('panel_manageable',true);
      if(update.error)throw update.error;
    }
    return removed.length;
  }

  async function readPanelButtons(){
    try{
      const response=await fetch('geradores/index.html?button-scan='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw new Error('Não foi possível ler o HTML principal do cliente.');
      const doc=new DOMParser().parseFromString(await response.text(),'text/html');
      const found=locatePanelButtons(doc);
      if(!found.length)throw new Error('Nenhum botão estrutural foi encontrado.');
      [
        {id:'system.login.lock',name:'Bloquear acesso no login',category:'Manutenção Geral',selector:'#login-card',action_kind:'system',sort_order:9990},
        {id:'system.generator.lock',name:'Bloquear todo o Gerenciador',category:'Manutenção Geral',selector:'.wrapper',action_kind:'system',sort_order:9991}
      ].forEach(function(systemItem){if(!found.some(function(item){return item.id===systemItem.id;}))found.push(systemItem);});
      return {buttons:found,emergency:false};
    }catch(error){
      console.warn('JC-APK: leitura do HTML falhou; usando lista de emergência sem desativar registros.',error);
      return {buttons:EMERGENCY_PANEL_BUTTONS.map(function(item){return Object.assign({},item);}),emergency:true};
    }
  }

  async function syncPanelButtons(){
    const button=$('pbmSyncBtn');button.disabled=true;setStatus('Lendo os botões principais de geradores/index.html...');
    try{
      const scan=await readPanelButtons();
      const found=scan.buttons;
      const result=await registerNewPanelButtons(found);
      const removed=scan.emergency?0:await deactivateRemovedPanelButtons(found.map(function(item){return item.id;}));
      await loadPanelButtons();
      const added=Array.isArray(result.added_ids)?result.added_ids.length:Number(result.added||0);
      const suffix=scan.emergency
        ?' A lista de emergência foi usada; nenhum registro existente foi desativado.'
        :` ${removed} botão(ões) removido(s) do HTML foi(ram) apenas desativado(s), sem apagar dados.`;
      setStatus(`${found.length} botão(ões) reconhecido(s). ${added} novo(s) adicionado(s), preservando os estados já salvos.${suffix}`,'ok');
      A.toast('Sincronização concluída.');
    }finally{button.disabled=false;}
  }

  async function loadHistory(id){
    const item=state.buttons.find(function(x){return x.id===id;});
    const result=await A.client.rpc('admin_get_panel_button_history',{p_function_id:id});
    if(result.error)throw result.error;
    const rows=Array.isArray(result.data)?result.data:(result.data&&result.data.history)||[];
    $('pbmHistoryTitle').textContent=(item?item.name:id)+' — histórico';
    $('pbmHistoryList').innerHTML=rows.length?rows.map(function(row){return `<div class="pbm-history-item"><b>${esc(String(row.new_status||row.status||'').toUpperCase())}</b><div>${esc(row.message||'Sem mensagem')}</div><small>${esc(dateTime(row.created_at))}${row.actor_name?' • '+esc(row.actor_name):''}</small></div>`;}).join(''):'<div class="pbm-empty">Ainda não existem alterações registradas.</div>';
    openModal('pbmHistoryModal');
  }

  function showError(error){setStatus(error.message||String(error),'error');A.toast(error.message||String(error),'error');}

  async function initializePanelButtonManager(){
    try{await verifyPanelButtonAdminAccess();await loadPanelButtons();}catch(error){showError(error);}
  }

  $('pbmSearch').addEventListener('input',function(){state.query=this.value;renderPanelButtons();});
  $('pbmReloadBtn').onclick=function(){loadPanelButtons().catch(showError);};
  $('pbmSyncBtn').onclick=function(){syncPanelButtons().catch(showError);};
  $('pbmPreviewBtn').onclick=function(){const item=state.buttons.find(function(x){return x.id===$('pbmEditId').value;});showPanelButtonMaintenanceMessage(item&&item.name,$('pbmMessage').value.trim()||DEFAULT_MESSAGE);};
  $('pbmSaveMaintenanceBtn').onclick=function(){updatePanelButtonStatus($('pbmEditId').value,'maintenance',$('pbmMessage').value.trim()||DEFAULT_MESSAGE).catch(showError);};
  document.querySelectorAll('[data-close-modal]').forEach(function(btn){btn.onclick=closeModals;});
  document.querySelectorAll('.pbm-modal').forEach(function(modal){modal.addEventListener('click',function(e){if(e.target===modal)closeModals();});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModals();});
  document.addEventListener('jc:admin-liberado',initializePanelButtonManager,{once:true});
  if(document.documentElement.classList.contains('jc-admin-liberado'))initializePanelButtonManager();

  window.initializePanelButtonManager=initializePanelButtonManager;
  window.loadPanelButtons=loadPanelButtons;
  window.syncPanelButtons=syncPanelButtons;
  window.registerNewPanelButtons=registerNewPanelButtons;
  window.updatePanelButtonStatus=updatePanelButtonStatus;
  window.applyPanelButtonStatuses=applyPanelButtonStatuses;
  window.showPanelButtonMaintenanceMessage=showPanelButtonMaintenanceMessage;
  window.verifyPanelButtonAdminAccess=verifyPanelButtonAdminAccess;
})();
