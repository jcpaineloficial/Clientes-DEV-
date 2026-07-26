(function(){
  'use strict';

  const A=window.JC_APP;
  if(!A || !A.client) return;

  const localKeys=[
    'unitv_click_counters_v2','jc_apk_click_counters_v2',
    'jc_apk_pacote_apk_click_counters_v1'
  ];
  const sent=new Set();

  function uuid(){
    return window.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);});
  }

  function cleanupLegacyCounters(){
    try{
      if(localStorage.getItem('jc_reports_legacy_cleaned_v1')!=='1'){
        localKeys.forEach(function(key){ localStorage.removeItem(key); });
        Object.keys(localStorage).filter(function(key){return /^jc_apk_.*click.*counter/i.test(key);}).forEach(function(key){localStorage.removeItem(key);});
        localStorage.setItem('jc_reports_legacy_cleaned_v1','1');
      }
    }catch(_){ }

    ['jc_clear_counts_btn','jc_pacote_clear_counts_btn'].forEach(function(id){
      const el=document.getElementById(id); if(el) el.remove();
    });
    ['click_panel','pacote_apk_click_panel'].forEach(function(id){
      const el=document.getElementById(id); if(el) el.style.display='none';
    });
    document.querySelectorAll('button').forEach(function(btn){
      const text=String(btn.textContent||'').trim().toLowerCase();
      if(text.includes('limpar contagem')) btn.remove();
    });
  }

  async function record(detail){
    detail=detail||{};
    if(!detail.function_id) return;
    const operationId=detail.operation_id||uuid();
    const key=String(operationId);
    if(sent.has(key)) return;
    sent.add(key);
    setTimeout(function(){sent.delete(key);},15000);
    try{
      const {error}=await A.client.rpc('record_download_event',{
        p_function_id:String(detail.function_id),
        p_operation_id:operationId,
        p_item_label:detail.item_label||detail.function_name||null,
        p_status:detail.status||'opened',
        p_metadata:detail.metadata||{},
        p_config_no:Number.isFinite(Number(detail.config_no))?Number(detail.config_no):null,
        p_version_no:Number.isFinite(Number(detail.version_no))?Number(detail.version_no):null
      });
      if(error) throw error;
    }catch(error){
      console.warn('JC Relatórios: não foi possível registrar o acesso.',error);
    }
  }

  document.addEventListener('jc:report-action',function(event){
    record(event.detail||{});
  });

  function statusLabel(status){
    return ({delivered:'Entregue',opened:'Aberto',requested:'Solicitado',failed:'Falhou',admin_test:'Teste ADM'})[status]||status;
  }

  function formatDate(value){
    try{return new Date(value).toLocaleString('pt-BR');}catch(_){return String(value||'');}
  }

  function ensureHistoryModal(){
    let modal=document.getElementById('jc_history_modal');
    if(modal) return modal;
    const style=document.createElement('style');
    style.id='jc_history_styles';
    style.textContent=`
      #jc_history_modal{display:none;position:fixed;inset:0;z-index:100000600;background:rgba(0,0,0,.82);padding:14px;align-items:center;justify-content:center;backdrop-filter:blur(8px)}
      #jc_history_modal.show{display:flex}.jc-history-box{width:min(840px,100%);max-height:92vh;overflow:auto;border:1px solid rgba(90,170,255,.32);border-radius:22px;background:linear-gradient(145deg,#0a1e30,#06111c);color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.62)}
      .jc-history-head{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;background:rgba(6,17,28,.96);border-bottom:1px solid rgba(255,255,255,.1);z-index:2}.jc-history-head h3{margin:0}.jc-history-close{width:42px;height:42px;border:0;border-radius:12px;background:rgba(255,255,255,.09);color:#fff;font-size:22px;cursor:pointer}
      .jc-history-body{padding:16px}.jc-history-note{padding:11px 12px;border-radius:12px;background:rgba(28,145,255,.09);border:1px solid rgba(28,145,255,.28);color:#d8ebff;font-size:12px;line-height:1.5;margin-bottom:12px}
      .jc-history-list{display:grid;gap:9px}.jc-history-row{display:grid;grid-template-columns:minmax(120px,.7fr) minmax(170px,1.2fr) minmax(130px,.8fr) auto;gap:10px;align-items:center;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.035)}
      .jc-history-row b,.jc-history-row span,.jc-history-row small{display:block}.jc-history-row small{color:#9eb3c1;margin-top:4px}.jc-history-pill{padding:6px 9px;border-radius:999px;background:rgba(41,211,145,.1);border:1px solid rgba(41,211,145,.28);color:#d7ffea;font-size:10px;font-weight:900;white-space:nowrap}.jc-history-empty{text-align:center;color:#9eb3c1;padding:30px}
      @media(max-width:680px){.jc-history-row{grid-template-columns:1fr}.jc-history-pill{justify-self:start}.jc-history-box{border-radius:17px}.jc-history-body{padding:12px}}
    `;
    document.head.appendChild(style);
    modal=document.createElement('div');
    modal.id='jc_history_modal';
    modal.innerHTML=`<div class="jc-history-box"><div class="jc-history-head"><div><h3>Meu histórico de acessos</h3><small style="color:#9eb3c1">Registros oficiais do Supabase</small></div><button class="jc-history-close" type="button">×</button></div><div class="jc-history-body"><div class="jc-history-note">Este histórico é somente para consulta. O cliente não pode apagar ou alterar os registros.</div><div class="jc-history-list" id="jc_history_list"><div class="jc-history-empty">Carregando...</div></div></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.jc-history-close').onclick=function(){modal.classList.remove('show');};
    modal.addEventListener('click',function(e){if(e.target===modal)modal.classList.remove('show');});
    return modal;
  }

  async function openHistory(){
    const modal=ensureHistoryModal();
    const list=modal.querySelector('#jc_history_list');
    modal.classList.add('show');
    list.innerHTML='<div class="jc-history-empty">Carregando...</div>';
    try{
      const {data,error}=await A.client.rpc('get_my_download_history',{p_limit:200});
      if(error) throw error;
      const rows=Array.isArray(data)?data:[];
      if(!rows.length){list.innerHTML='<div class="jc-history-empty">Nenhum acesso registrado depois do início da contagem oficial.</div>';return;}
      list.innerHTML=rows.map(function(row){
        const config=row.config_no?`CONFIG ${String(row.config_no).padStart(3,'0')} • V${row.version_no||1}`:'';
        return `<div class="jc-history-row"><div><b>${escapeHtml(row.category)}</b><small>${formatDate(row.created_at)}</small></div><div><span>${escapeHtml(row.item_label)}</span>${config?`<small>${escapeHtml(config)}</small>`:''}</div><div><span>${escapeHtml(statusLabel(row.status))}</span><small>${row.credit_cost>0?row.credit_cost+' crédito(s)':'Sem consumo de crédito'}</small></div><span class="jc-history-pill">Registrado</span></div>`;
      }).join('');
    }catch(error){
      list.innerHTML='<div class="jc-history-empty">Não foi possível carregar o histórico: '+escapeHtml(error.message||'erro desconhecido')+'</div>';
    }
  }

  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function installButtons(context){
    cleanupLegacyCounters();
    const bar=document.querySelector('#jc_client_bar .jc-client-actions');
    if(!bar) return;
    const mode=context?.mode||window.JC_GENERATOR_CONTEXT?.mode||'';
    if(mode==='admin'){
      if(!document.getElementById('jc_reports_admin_link')){
        const link=document.createElement('a');
        link.id='jc_reports_admin_link';
        link.href='../painel-relatorios.html';
        link.textContent='📊 Relatórios';
        link.style.background='#1c91ff';
        link.style.color='#fff';
        bar.prepend(link);
      }
      return;
    }
    if(mode==='client' && !document.getElementById('jc_my_history_btn')){
      const button=document.createElement('button');
      button.id='jc_my_history_btn';
      button.type='button';
      button.textContent='📋 Meu histórico';
      button.onclick=openHistory;
      bar.prepend(button);
    }
  }

  document.addEventListener('jc:access-ready',function(event){
    setTimeout(function(){installButtons(event.detail||{});},60);
  });

  function init(){
    cleanupLegacyCounters();
    if(window.JC_GENERATOR_CONTEXT) installButtons(window.JC_GENERATOR_CONTEXT);
    let cleanupTimer=0;
    const observer=new MutationObserver(function(){
      clearTimeout(cleanupTimer);
      cleanupTimer=setTimeout(cleanupLegacyCounters,80);
    });
    if(document.body) observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  window.JC_DOWNLOAD_REPORTS={record:record,openHistory:openHistory};
})();
