/* =====================================================================
   JC-APK TV — Atualização 11
   Gerenciador de Ativadores, aparelhos, .config e relatório do Acesse Aqui
   Edge Functions: jc-activate + jc-download 13A
   ===================================================================== */
(function(){
  'use strict';

  const A=window.JC_APP;
  const EDGE_FUNCTION='jc-activate';
  const DOWNLOAD_EDGE_FUNCTION='jc-download';
  const ACTIONS={
    list:'admin_list_codes', device:'admin_get_code_device', history:'admin_get_code_history',
    configs:'admin_list_config_usage', recount:'admin_recount_configs',
    unlock:'admin_unlock_codes', disable:'admin_disable_codes', restart:'admin_restart_code_config',
    markTest:'admin_mark_test'
  };
  const state={
    loading:false, bound:false, accessMode:'', codeType:'', rows:[], selected:new Set(), configs:[], configsLoaded:false, accessHereLoaded:false
  };
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isAdmin=()=>state.accessMode==='admin';

  function formatDate(value){
    if(!value) return '—';
    const date=new Date(value);
    return Number.isNaN(date.getTime())?String(value):date.toLocaleString('pt-BR');
  }
  function formatPercent(value){return `${Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}%`;}
  function statusLabel(value){
    const map={active:'Ativo',reserved:'Reservado',used:'Utilizado',disabled:'Bloqueado',expired:'Expirado',failed:'Falhou',cancelled:'Cancelado',released:'Liberado',confirmed:'Confirmado'};
    return map[String(value||'').toLowerCase()]||String(value||'—');
  }
  function scopeLabel(mode){
    return mode==='admin'?'ADM — acesso completo':mode==='reseller_readonly'?'Revendedor — próprios códigos e clientes diretos':'Cliente final — somente leitura dos próprios dados';
  }
  function setBackend(kind,title,detail){
    const box=$('acmBackendStatus');
    box.className=`acm-backend ${kind||''}`;
    box.querySelector('b').textContent=title;
    box.querySelector('small').textContent=detail;
  }
  async function invoke(action,payload={}){
    if(!A?.client) throw new Error('Supabase não configurado em dados/supabase-config.js.');
    const {data,error}=await A.client.functions.invoke(EDGE_FUNCTION,{body:{action,...payload}});
    if(error) throw new Error(error.message||'Falha ao chamar a Edge Function.');
    if(!data?.ok) throw new Error(data?.reason||data?.error||'A operação não foi concluída.');
    return data;
  }
  async function invokeDownload(action,payload={}){
    if(!A?.client) throw new Error('Supabase não configurado em dados/supabase-config.js.');
    const {data,error}=await A.client.functions.invoke(DOWNLOAD_EDGE_FUNCTION,{body:{action,...payload}});
    if(error){
      let message=error.message||'Falha ao chamar a Edge Function jc-download.';
      try{const context=error?.context;if(context&&typeof context.json==='function'){const body=await context.clone().json();message=body?.error||message;}else if(context?.json?.error) message=context.json.error;}catch(_){}
      throw new Error(message);
    }
    if(!data?.ok) throw new Error(data?.error||'A operação não foi concluída.');
    return data;
  }
  function filters(){
    return {
      code_type:state.codeType,
      client_search:$('acmClientSearch').value.trim(),
      code_last4:$('acmLast4Search').value.replace(/\D/g,'').slice(0,4),
      status:$('acmStatusFilter').value,
      created_from:$('acmCreatedFrom').value,
      created_to:$('acmCreatedTo').value,
      limit:1000
    };
  }
  function normalize(row){
    return {
      ...row,
      id:String(row.id||''), code_type:String(row.code_type||''), code_last4:String(row.code_last4||'—'), code_plain:String(row.code_plain||''), display_code:String(row.display_code||''),
      client_name:String(row.client_name||'Não vinculado'), client_username:String(row.client_username||''),
      status:String(row.status||'—'), device_id:String(row.device_id||''), device_model:String(row.device_model||''),
      config_no:row.config_no??null, version_no:row.version_no??null
    };
  }
  function applyAccessMode(mode){
    state.accessMode=mode||'client_readonly';
    document.querySelectorAll('[data-admin-only]').forEach(el=>{el.hidden=!isAdmin();});
    const clientsLink=$('acmClientsLink'); if(clientsLink) clientsLink.hidden=!isAdmin();
    $('acmAccessTag').textContent=`🔐 ${scopeLabel(state.accessMode)}`;
    $('acmTopStatus').textContent=scopeLabel(state.accessMode);
    $('acmScopeDescription').textContent=state.accessMode==='admin'
      ?'ADM visualiza e administra todos os códigos, aparelhos, auditoria, .config e Acesse Aqui.'
      :state.accessMode==='reseller_readonly'
        ?'Você visualiza seus códigos e os clientes cadastrados diretamente por você. As ações administrativas ficam ocultas.'
        :'Você visualiza somente os próprios códigos, ativações e aparelho, em modo leitura.';
  }
  function renderSummary(summary={}){
    $('acmStatTotal').textContent=summary.total||0;
    $('acmStatActive').textContent=summary.active||0;
    $('acmStatReserved').textContent=summary.reserved||0;
    $('acmStatUsed').textContent=summary.used||0;
    $('acmStatDisabled').textContent=(summary.disabled||0)+(summary.expired||0);
    $('acmStatFailed').textContent=summary.failed||0;
  }
  function pill(status){return `<span class="acm-pill ${esc(String(status||'').toLowerCase())}">${esc(statusLabel(status))}</span>`;}
  function validity(row){
    if(!row.valid_until) return '<span class="acm-muted">Sem prazo registrado</span>';
    const until=row.valid_until?new Date(row.valid_until):null;
    const expired=until&&!Number.isNaN(until.getTime())&&until.getTime()<=Date.now();
    return `<b class="${expired?'acm-text-danger':''}">${esc(formatDate(row.valid_until))}</b><small>${expired?'Prazo encerrado':'Nova janela após desbloqueio ADM'}</small>`;
  }
  function actions(row){
    const common=`<button class="acm-btn ghost compact" data-action="device" data-id="${esc(row.id)}">Aparelho</button><button class="acm-btn ghost compact" data-action="history" data-id="${esc(row.id)}">Histórico</button>`;
    if(!isAdmin()) return common;
    const unlock=['disabled','expired'].includes(String(row.status||'').toLowerCase())
      ?`<button class="acm-btn success compact" data-action="unlock" data-id="${esc(row.id)}">Desbloquear</button>`:'';
    const restart=row.record_scope==='test'
      ?`<button class="acm-btn warning compact" data-action="restart" data-id="${esc(row.id)}">Reiniciar teste</button>`:'';
    return common+unlock+restart;
  }
  function renderRows(){
    const body=$('acmCodesBody');
    const mobile=$('acmCodesMobile');
    if(!state.rows.length){
      body.innerHTML='<tr><td colspan="9" class="acm-empty">Nenhum código encontrado.</td></tr>';
      mobile.innerHTML='<div class="acm-empty">Nenhum código encontrado.</div>';
      return;
    }
    body.innerHTML=state.rows.map(row=>`<tr>
      <td data-admin-only ${isAdmin()?'':'hidden'}><input class="acm-row-check" data-id="${esc(row.id)}" type="checkbox" ${state.selected.has(row.id)?'checked':''}></td>
      <td><div class="acm-code"><div class="acm-code-badge">${esc(row.code_type)}</div><div class="acm-code-meta"><b>${esc(row.display_code||(`•••• ${row.code_last4}`))}</b><small>${row.record_scope==='test'?'🧪 Teste':'Produção'}</small></div></div></td>
      <td><b>${esc(row.client_name)}</b><small>${esc(row.client_username||'—')}</small></td>
      <td>${pill(row.status)}${row.disabled_reason?`<small class="acm-text-danger">${esc(row.disabled_reason)}</small>`:''}</td>
      <td>${validity(row)}</td>
      <td><b>${row.config_no!=null?`config-${esc(String(row.config_no).padStart(3,'0'))}`:'—'}</b><small>${row.version_no!=null?`V${esc(row.version_no)}`:'Sem entrega'}</small></td>
      <td><b>${esc(row.device_model||'—')}</b><small>${esc(row.device_id||'Sem vínculo')}</small></td>
      <td><b>${esc(formatDate(row.created_at))}</b><small>Uso: ${esc(formatDate(row.used_at))}</small></td>
      <td><div class="acm-actions">${actions(row)}</div></td>
    </tr>`).join('');

    mobile.innerHTML=state.rows.map(row=>`<article class="acm-mobile-card">
      <div class="acm-mobile-head"><div class="acm-code"><div class="acm-code-badge">${esc(row.code_type)}</div><div class="acm-code-meta"><b>${esc(row.display_code||(`•••• ${row.code_last4}`))}</b><small>${esc(row.client_name)}</small></div></div>${pill(row.status)}</div>
      <div class="acm-mobile-grid"><div><small>Validade</small><b>${esc(formatDate(row.valid_until))}</b></div><div><small>CONFIG</small><b>${row.config_no!=null?`config-${esc(String(row.config_no).padStart(3,'0'))} / V${esc(row.version_no)}`:'—'}</b></div><div><small>Aparelho</small><b>${esc(row.device_model||row.device_id||'—')}</b></div><div><small>Criação</small><b>${esc(formatDate(row.created_at))}</b></div></div>
      ${isAdmin()?`<label class="acm-mobile-select"><input class="acm-row-check" data-id="${esc(row.id)}" type="checkbox" ${state.selected.has(row.id)?'checked':''}> Selecionar</label>`:''}
      <div class="acm-actions">${actions(row)}</div>
    </article>`).join('');
    bindDynamicActions();
  }
  function selectedIds(){return Array.from(state.selected);}
  function updateSelected(){
    $('acmSelectedCount').textContent=state.selected.size;
    if($('acmSelectAllCheckbox')) $('acmSelectAllCheckbox').checked=state.rows.length>0&&state.rows.every(row=>state.selected.has(row.id));
  }
  function bindDynamicActions(){
    document.querySelectorAll('.acm-row-check').forEach(check=>check.addEventListener('change',()=>{
      const id=check.dataset.id;
      if(check.checked) state.selected.add(id); else state.selected.delete(id);
      document.querySelectorAll(`.acm-row-check[data-id="${CSS.escape(id)}"]`).forEach(other=>{other.checked=check.checked;});
      updateSelected();
    }));
    document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>handleRowAction(button.dataset.action,button.dataset.id)));
    updateSelected();
  }
  async function loadCodes(){
    if(state.loading) return;
    state.loading=true;
    setBackend('','Carregando códigos...','Aplicando o escopo de acesso e o bloqueio automático de 36 horas.');
    try{
      const data=await invoke(ACTIONS.list,{filters:filters()});
      applyAccessMode(data.access_mode);
      state.rows=(data.codes||[]).map(normalize);
      const visibleIds=new Set(state.rows.map(row=>row.id));
      state.selected=new Set(selectedIds().filter(id=>visibleIds.has(id)));
      renderSummary(data.summary||{});renderRows();
      setBackend('ok','Backend atualizado e protegido',`${data.edge_version||'jc-activate'} • ${scopeLabel(state.accessMode)} • ${state.rows.length} registro(s).`);
    }catch(error){
      setBackend('error','Não foi possível carregar',error.message);
      A?.toast?.(error.message,'error');
    }finally{state.loading=false;}
  }
  function showModal(title,html){$('acmModalTitle').textContent=title;$('acmModalBody').innerHTML=html;$('acmModal').classList.add('show');}
  function detail(label,value){return `<div class="acm-detail"><small>${esc(label)}</small><b>${esc(value??'—')}</b></div>`;}
  async function handleRowAction(action,id){
    const row=state.rows.find(item=>item.id===id);
    try{
      if(action==='device'){
        showModal('Detalhes do aparelho','<div class="acm-loading">Carregando...</div>');
        const {device}=await invoke(ACTIONS.device,{code_id:id});
        $('acmModalBody').innerHTML=`<div class="acm-detail-grid">
          ${detail('Código',`${device.code_type||'—'} dígitos •••• ${device.code_last4||'—'}`)}${detail('Status',statusLabel(device.code_status))}
          ${detail('ID seguro',device.device_id)}${detail('Fabricante',device.manufacturer)}${detail('Marca',device.brand)}${detail('Modelo',device.model)}
          ${detail('Device / nome interno',device.device_name)}${detail('Product',device.product)}${detail('Android',device.android_version)}${detail('API',device.api_level)}
          ${detail('Ativador',device.app_version)}${detail('Pacote',device.package_name)}${detail('Resolução',device.screen_resolution)}
          ${detail('CONFIG',device.config_no!=null?`config-${String(device.config_no).padStart(3,'0')} / V${device.version_no}`:'—')}
          ${detail('Reserva',formatDate(device.reserved_at))}${detail('Confirmação',formatDate(device.confirmed_at))}${detail('Última tentativa',formatDate(device.last_attempt_at))}${detail('Último erro',device.last_attempt_error)}
        </div>`;
      }else if(action==='history'){
        showModal('Histórico do código','<div class="acm-loading">Carregando...</div>');
        const data=await invoke(ACTIONS.history,{code_id:id});
        $('acmModalBody').innerHTML=(data.history||[]).length?`<div class="acm-timeline">${data.history.map(item=>`<div class="acm-history"><b>${esc(item.message||item.event||'Evento')}</b><small>${esc(formatDate(item.created_at))}${item.admin_name?` • ${esc(item.admin_name)}`:''}</small>${item.details&&Object.keys(item.details).length?`<details><summary>Detalhes</summary><pre>${esc(JSON.stringify(item.details,null,2))}</pre></details>`:''}</div>`).join('')}</div>`:'<div class="acm-empty">Nenhum evento.</div>';
      }else if(action==='unlock'){
        if(!isAdmin()) throw new Error('Ação exclusiva do ADM.');
        if(!confirm(`Desbloquear o código •••• ${row?.code_last4||''}? Uma nova janela de três dias será iniciada quando aplicável.`)) return;
        await invoke(ACTIONS.unlock,{code_ids:[id]});
        A.toast('Código desbloqueado com auditoria.');await loadCodes();
      }else if(action==='restart'){
        if(!isAdmin()) throw new Error('Ação exclusiva do ADM.');
        const reason=prompt(`Reiniciar o teste do código •••• ${row?.code_last4||''}?\nO código volta para active, o aparelho é desvinculado e a CONFIG é recontada.\nInforme o motivo:`,'Reiniciar teste — Código + CONFIG');
        if(reason===null) return;
        await invoke(ACTIONS.restart,{code_id:id,reason:reason.trim()||'Reiniciar teste — Código + CONFIG'});
        A.toast('Código + CONFIG reiniciados com auditoria.');await loadCodes();
      }
    }catch(error){A.toast(error.message,'error');}
  }
  async function adminBatch(action,payload,successMessage){
    if(!isAdmin()) return A.toast('Ação exclusiva do ADM.','error');
    const ids=selectedIds();if(!ids.length) return A.toast('Selecione pelo menos um código.','error');
    try{await invoke(action,{code_ids:ids,...payload});A.toast(successMessage);await loadCodes();}catch(error){A.toast(error.message,'error');}
  }
  async function loadConfigs(){
    if(!isAdmin()) return;
    $('acmConfigsList').innerHTML='<div class="acm-loading">Carregando uso das CONFIGs...</div>';
    try{
      const data=await invoke(ACTIONS.configs);
      const configs=data.configs||[];state.configs=configs;state.configsLoaded=true;state.accessHereLoaded=false;
      const totals=configs.reduce((acc,item)=>{acc.limit+=Number(item.max_uses||0);acc.used+=Number(item.used_count||0);acc.reserved+=Number(item.reserved_count||0);acc.available+=Number(item.available_count||0);return acc;},{limit:0,used:0,reserved:0,available:0});
      $('acmConfigSummary').innerHTML=`${detail('Limite total',totals.limit)}${detail('Utilizadas',totals.used)}${detail('Reservadas',totals.reserved)}${detail('Disponíveis',totals.available)}`;
      $('acmConfigsList').innerHTML=configs.length?configs.map(item=>`<article class="acm-config-card">
        <div class="acm-config-head"><div><h4>${esc(item.config_label)} / ${esc(item.version_label)}</h4><small>${esc(item.object_path||'Caminho não exibido')}</small></div><b>${formatPercent(item.usage_percent)}</b></div>
        <div class="acm-progress"><span style="width:${Math.min(100,Number(item.usage_percent||0))}%"></span></div>
        <div class="acm-config-metrics">${detail('Limite',item.max_uses)}${detail('Usadas',item.used_count)}${detail('Reservadas',item.reserved_count)}${detail('Disponíveis',item.available_count)}</div>
        <details><summary>Ver ${item.details?.length||0} utilização(ões)</summary><div class="acm-delivery-list">${(item.details||[]).map(d=>`<div class="acm-delivery"><b>${esc(d.client_name||'Não vinculado')}</b><span>${esc(d.origin||'outro')} • ${esc(statusLabel(d.status))}${d.is_test?' • TESTE':''}</span><small>${esc(formatDate(d.confirmed_at||d.reserved_at))} • ${esc(d.device_id||'sem aparelho')}</small></div>`).join('')||'<div class="acm-empty">Sem entregas.</div>'}</div></details>
      </article>`).join(''):'<div class="acm-empty">Nenhuma versão de CONFIG encontrada.</div>';
    }catch(error){$('acmConfigsList').innerHTML=`<div class="acm-empty acm-text-danger">${esc(error.message)}</div>`;}
  }


  function accessUsage(item){
    if(item.download_mode==='admin'||item.unlimited_at_time) return item.download_mode==='admin'?'Não contabiliza':'Sem limite';
    const limit=Number(item.daily_limit_at_time||0);
    if(!limit) return 'Padrão atual';
    const position=Number(item.used_after??(Number(item.used_before||0)+(item.status==='confirmed'?1:0)));
    return `${position} de ${limit}`;
  }
  function renderAccessHere(data){
    if(!isAdmin()) return;
    const records=data.history||[];
    const summary=data.summary||{};
    $('acmAccessHereSummary').innerHTML=`${detail('Total de acessos',summary.total||0)}${detail('Confirmados',summary.confirmed||0)}${detail('Reservados',summary.reserved||0)}${detail('Cancelados/erros',summary.cancelled||0)}${detail('Clientes',summary.clients||0)}${detail('Como ADM',summary.admin||0)}`;
    $('acmAccessHereList').innerHTML=records.length?records.map(item=>{
      const target=item.download_mode==='admin'?'ADM — sem contabilizar':(item.target_client_name||'Não vinculado');
      const actor=item.legacy_record?'Registro antigo — autor não identificado':(item.actor_name||'Não identificado');
      const device=item.device_label||[item.platform_label,item.browser_label].filter(Boolean).join(' / ')||item.device_key||'Não informado';
      const error=item.error_message?`<div class="acm-empty acm-text-danger" style="margin-top:10px">${esc(item.error_message)}</div>`:'';
      return `<article class="acm-config-card">
        <div class="acm-config-head"><div><h4>${esc(item.config_label||'CONFIG')} / ${esc(item.version_label||'—')}</h4><small>${esc(target)}</small></div>${pill(item.status)}</div>
        <div class="acm-config-metrics">
          ${detail('Baixado para',target)}
          ${detail('Baixado por',actor)}
          ${detail('Tipo',item.download_mode==='admin'?'ADM':'Cliente')}
          ${detail('Uso diário',accessUsage(item))}
          ${detail('Dispositivo do download',device)}
          ${detail('Sistema',item.platform_label||'—')}
          ${detail('Navegador',item.browser_label||'—')}
          ${detail('Reserva',formatDate(item.reserved_at||item.created_at))}
          ${detail('Confirmação',formatDate(item.confirmed_at))}
        </div>${error}
      </article>`;
    }).join(''):'<div class="acm-empty">Ainda não há downloads registrados pelo Acesse Aqui.</div>';
    state.accessHereLoaded=true;
  }
  async function loadAccessHere(){
    if(!isAdmin()) return;
    $('acmAccessHereList').innerHTML='<div class="acm-loading">Carregando relatório detalhado do Acesse Aqui...</div>';
    try{
      const data=await invokeDownload('admin_list_history',{limit:1000,search:$('acmAccessHereSearch')?.value.trim()||'',status:$('acmAccessHereStatus')?.value||'',download_mode:$('acmAccessHereMode')?.value||''});
      renderAccessHere(data);
    }catch(error){$('acmAccessHereList').innerHTML=`<div class="acm-empty acm-text-danger">${esc(error.message)}</div>`;}
  }

  async function recountConfigs(){
    if(!isAdmin()) return;
    if(!confirm('Recontar utilizadas, reservadas e disponíveis usando as entregas existentes? Nenhum arquivo físico será removido.')) return;
    try{
      await invoke(ACTIONS.recount);
      A.toast('Recontagem segura concluída e registrada.');
      state.configsLoaded=false;state.accessHereLoaded=false;
      await loadConfigs();
    }catch(error){A.toast(error.message,'error');}
  }
  function switchView(name){
    if(!isAdmin()&&name!=='codes') return;
    document.querySelectorAll('.acm-view').forEach(view=>view.classList.toggle('active',view.id===`acm${name[0].toUpperCase()+name.slice(1)}View`));
    document.querySelectorAll('.acm-view-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===name));
    if(name==='configs'&&!state.configsLoaded) loadConfigs();
    if(name==='accessHere'&&!state.accessHereLoaded) loadAccessHere();
  }
  function bind(){
    if(state.bound) return;
    state.bound=true;
    $('acmRetryBtn').addEventListener('click',loadCodes);$('acmReloadBtn').addEventListener('click',loadCodes);$('acmFilterBtn').addEventListener('click',loadCodes);
    $('acmReloadConfigsBtn').addEventListener('click',loadConfigs);$('acmRecountConfigsBtn').addEventListener('click',recountConfigs);
    $('acmReloadAccessHereBtn').addEventListener('click',loadAccessHere);$('acmFilterAccessHereBtn')?.addEventListener('click',loadAccessHere);$('acmAccessHereSearch')?.addEventListener('keydown',event=>{if(event.key==='Enter') loadAccessHere();});
    $('acmModalClose').addEventListener('click',()=>$('acmModal').classList.remove('show'));$('acmModal').addEventListener('click',event=>{if(event.target===$('acmModal')) $('acmModal').classList.remove('show');});
    document.querySelectorAll('.acm-type-btn').forEach(btn=>btn.addEventListener('click',()=>{state.codeType=btn.dataset.codeType||'';document.querySelectorAll('.acm-type-btn').forEach(item=>item.classList.toggle('active',item===btn));loadCodes();}));
    document.querySelectorAll('.acm-view-btn').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
    $('acmSelectAllBtn').addEventListener('click',()=>{const all=state.rows.every(row=>state.selected.has(row.id));state.rows.forEach(row=>all?state.selected.delete(row.id):state.selected.add(row.id));renderRows();});
    $('acmSelectAllCheckbox').addEventListener('change',event=>{state.rows.forEach(row=>event.target.checked?state.selected.add(row.id):state.selected.delete(row.id));renderRows();});
    $('acmUnlockSelectedBtn').addEventListener('click',()=>adminBatch(ACTIONS.unlock,{},'Código(s) desbloqueado(s); nova janela de três dias iniciada quando aplicável.'));
    $('acmDisableSelectedBtn').addEventListener('click',()=>adminBatch(ACTIONS.disable,{reason:'Desativado pelo administrador'},'Código(s) desativado(s).'));
    $('acmMarkTestBtn').addEventListener('click',()=>adminBatch(ACTIONS.markTest,{is_test:true},'Registro(s) marcado(s) como teste.'));
    $('acmMarkProductionBtn').addEventListener('click',()=>adminBatch(ACTIONS.markTest,{is_test:false},'Registro(s) marcado(s) como produção.'));
    $('acmLogoutBtn').addEventListener('click',async()=>{await A.client?.auth.signOut();location.href='index.html';});
    ['acmClientSearch','acmLast4Search'].forEach(id=>$(id).addEventListener('keydown',event=>{if(event.key==='Enter') loadCodes();}));
  }
  async function init(){
    bind();
    if(!A?.ready||!A?.client){setBackend('error','Supabase não configurado','Confira dados/supabase-config.js.');return;}
    const {data:{session}}=await A.client.auth.getSession();
    if(!session){setBackend('','Sessão necessária','Use a janela de acesso desta página para entrar no painel.');return;}
    await loadCodes();
  }
  document.addEventListener('jc:admin-liberado',()=>{
    bind();
    loadCodes();
  });
  document.addEventListener('DOMContentLoaded',init);
})();
