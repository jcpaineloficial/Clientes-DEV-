(function(){
'use strict';

const A=window.JC_APP;
const state={ready:false,versions:[],baseAccess:false,mode:'download',packageCompatibility:false};

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(m,t){if(A?.toast)A.toast(m,t);else alert(m);}
function androidText(v){if(v.min_api&&v.max_api)return `Android API ${v.min_api} a ${v.max_api}`;if(v.min_api)return `Android API ${v.min_api} ou superior`;if(v.max_api)return `Até Android API ${v.max_api}`;return 'Compatibilidade ampla';}
function availableVersions(){return state.versions.filter(v=>v&&v.available);}
function canOpen(mode){
  if(!state.ready||!state.baseAccess||!state.versions.length||!availableVersions().length)return false;
  if(mode==='download')return state.versions.some(v=>v.available&&v.apk_url);
  return true;
}
function closeModal(){const m=document.getElementById('jc_a16_versions_modal');if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true');}}
function setGeneratedCode(value,label){
  const code=String(value||'').trim();
  const field=document.getElementById('download_code_16_right');
  const status=document.getElementById('status_msg');
  if(field){field.textContent=code;field.dataset.codigoAtual=code;}
  if(status){status.textContent=code?`Código de download gerado — ${label}.`:'Nenhum código foi configurado para esta versão.';status.style.color=code?'#8fffc8':'#ffd5d5';}
  return Boolean(code);
}
function requestAccess(versionLabel){
  const text=`Olá! Solicito a liberação da ${versionLabel} do Ativador 16 para minha conta.`;
  const done=()=>toast('Pedido de liberação copiado. Envie ao responsável pelo seu painel.');
  if(A?.copy){Promise.resolve(A.copy(text)).then(done).catch(()=>toast('Solicite a liberação ao responsável pelo seu painel.'));return;}
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(done).catch(()=>toast('Solicite a liberação ao responsável pelo seu painel.'));return;}
  toast('Solicite a liberação ao responsável pelo seu painel.');
}
function generateVersionCode(v){
  if(!v?.available)return false;
  if(v.download_code){setGeneratedCode(v.download_code,v.version_label);closeModal();return false;}
  // A versão tradicional continua usando o grupo de códigos já existente,
  // preservando a rotação e o funcionamento anterior do painel.
  if(window.JC_PANEL_RUNTIME&&typeof window.JC_PANEL_RUNTIME.generateCode==='function'){
    closeModal();
    const button=document.getElementById('btn_gerar_codigo_download');
    return window.JC_PANEL_RUNTIME.generateCode(
      'download_16',
      'download_code_16_right',
      'status_bar',
      button,
      true
    );
  }
  setGeneratedCode('',v.version_label||'versão escolhida');
  return false;
}
function openVersionDownload(v){
  if(!v?.available||!v.apk_url)return false;
  closeModal();
  window.open(v.apk_url,'_blank','noopener,noreferrer');
  return false;
}
function ensureModal(){
  let m=document.getElementById('jc_a16_versions_modal');
  if(m)return m;
  const st=document.createElement('style');
  st.id='jc_a16_versions_style';
  st.textContent=`#jc_a16_versions_modal{display:none;position:fixed;inset:0;z-index:2147483600;align-items:center;justify-content:center;padding:14px;background:rgba(0,0,0,.84);backdrop-filter:blur(9px);font-family:Arial,sans-serif}#jc_a16_versions_modal.show{display:flex}.jc-a16-box{width:min(920px,100%);max-height:94vh;overflow:auto;border:1px solid rgba(85,191,255,.32);border-radius:24px;background:linear-gradient(145deg,#0a2031,#06131f);color:#fff;box-shadow:0 35px 110px rgba(0,0,0,.7)}.jc-a16-top{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.10);background:rgba(7,23,35,.96)}.jc-a16-top h3{margin:0 0 5px;font-size:22px}.jc-a16-top p{margin:0;color:#a9bdc9;font-size:12px;line-height:1.45}.jc-a16-close{width:42px;height:42px;border:0;border-radius:12px;background:rgba(255,255,255,.09);color:#fff;font-size:24px;cursor:pointer}.jc-a16-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px}.jc-a16-card{position:relative;padding:16px;border:1px solid rgba(74,184,255,.30);border-radius:18px;background:linear-gradient(145deg,rgba(12,50,77,.92),rgba(5,24,39,.96));display:flex;flex-direction:column;gap:10px;min-height:250px}.jc-a16-card.locked{border-color:rgba(255,183,43,.38);background:linear-gradient(145deg,rgba(63,43,10,.72),rgba(24,20,13,.96))}.jc-a16-title{display:flex;justify-content:space-between;gap:8px}.jc-a16-title h4{margin:0;font-size:18px}.jc-a16-tags{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.jc-a16-tag{padding:5px 7px;border-radius:999px;border:1px solid rgba(88,194,255,.30);background:rgba(88,194,255,.10);font-size:8px;font-weight:1000;white-space:nowrap}.jc-a16-tag.new{border-color:rgba(255,183,43,.45);background:rgba(255,183,43,.14);color:#ffe1a0}.jc-a16-tag.lock{border-color:rgba(255,101,120,.42);background:rgba(255,101,120,.12);color:#ffd5dc}.jc-a16-sub{font-weight:900;color:#d9f1ff;font-size:12px}.jc-a16-desc{margin:0;color:#abc0cb;font-size:12px;line-height:1.52}.jc-a16-status{padding:10px;border-radius:12px;background:rgba(255,255,255,.045);font-size:10px;color:#cce4ef;line-height:1.5}.jc-a16-lockmsg{padding:11px;border:1px solid rgba(255,183,43,.26);border-radius:12px;background:rgba(255,183,43,.07);color:#ffe5aa;font-size:11px;line-height:1.5}.jc-a16-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:auto}.jc-a16-actions button{min-height:46px;border:0;border-radius:12px;font-weight:1000;cursor:pointer}.jc-a16-download{background:linear-gradient(135deg,#25d391,#0da8e9);color:#041b1f}.jc-a16-code{background:linear-gradient(135deg,#20c77d,#1286e0);color:#fff}.jc-a16-disabled{background:#263947;color:#9db0bc;cursor:not-allowed!important}.jc-a16-request{background:linear-gradient(135deg,#ffb72b,#f48819);color:#2b1700}.jc-a16-empty{padding:30px;text-align:center;color:#aac0cc}@media(max-width:650px){.jc-a16-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(st);
  m=document.createElement('div');
  m.id='jc_a16_versions_modal';
  m.setAttribute('aria-hidden','true');
  m.innerHTML='<div class="jc-a16-box"><div class="jc-a16-top"><div><h3 id="jc_a16_modal_title">Ativador 16 — escolha a versão</h3><p id="jc_a16_modal_help"></p></div><button class="jc-a16-close" type="button" aria-label="Fechar">×</button></div><div class="jc-a16-grid" id="jc_a16_versions_grid"></div></div>';
  document.body.appendChild(m);
  m.querySelector('.jc-a16-close').onclick=closeModal;
  m.onclick=e=>{if(e.target===m)closeModal();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  return m;
}
function render(){
  const m=ensureModal();
  const g=m.querySelector('#jc_a16_versions_grid');
  const title=m.querySelector('#jc_a16_modal_title');
  const help=m.querySelector('#jc_a16_modal_help');
  const codeMode=state.mode==='code';
  title.textContent=codeMode?'Ativador 16 — gerar código de download':'Ativador 16 — baixar APK';
  help.textContent=codeMode
    ?'Escolha a versão. O código será gerado no campo de CÓDIGO DE DOWNLOAD, como no funcionamento anterior.'
    :'Escolha a versão. O APK será aberto no botão de LINK / BAIXAR APK, como no funcionamento anterior.';
  g.innerHTML=state.versions.length?state.versions.map(v=>{
    const locked=!v.available;
    let action='';
    if(locked){
      action=`<button type="button" class="jc-a16-request" data-a16-request="${esc(v.id)}">SOLICITAR LIBERAÇÃO</button>`;
    }else if(codeMode){
      const hasCode=Boolean(v.download_code)||Boolean(window.JC_PANEL_RUNTIME&&typeof window.JC_PANEL_RUNTIME.generateCode==='function');
      action=hasCode
        ?`<button type="button" class="jc-a16-code" data-a16-generate="${esc(v.id)}">GERAR CÓDIGO DESTA VERSÃO</button>`
        :'<button type="button" class="jc-a16-disabled" disabled>CÓDIGO NÃO CONFIGURADO</button>';
    }else{
      action=v.apk_url
        ?`<button type="button" class="jc-a16-download" data-a16-download="${esc(v.id)}">BAIXAR ESTA VERSÃO</button>`
        :'<button type="button" class="jc-a16-disabled" disabled>LINK NÃO CONFIGURADO</button>';
    }
    return `<article class="jc-a16-card ${locked?'locked':''}"><div class="jc-a16-title"><h4>${esc(v.version_label)}</h4><div class="jc-a16-tags">${v.is_new?'<span class="jc-a16-tag new">NOVA</span>':''}${v.recommended?'<span class="jc-a16-tag">RECOMENDADA</span>':''}${locked?'<span class="jc-a16-tag lock">RESTRITA</span>':'<span class="jc-a16-tag">LIBERADA</span>'}</div></div><div class="jc-a16-sub">${esc(v.subtitle||v.status_label||'')}</div><p class="jc-a16-desc">${esc(v.description||'')}</p><div class="jc-a16-status"><b>${esc(v.status_label||'')}</b><br>${esc(androidText(v))}</div>${locked?`<div class="jc-a16-lockmsg">${esc(v.locked_message||'Esta versão precisa de liberação específica.')}</div>`:''}<div class="jc-a16-actions">${action}</div></article>`;
  }).join(''):'<div class="jc-a16-empty">Nenhuma versão foi configurada.</div>';

  g.querySelectorAll('[data-a16-download]').forEach(b=>b.onclick=()=>openVersionDownload(state.versions.find(x=>x.id===b.dataset.a16Download)));
  g.querySelectorAll('[data-a16-generate]').forEach(b=>b.onclick=()=>generateVersionCode(state.versions.find(x=>x.id===b.dataset.a16Generate)));
  g.querySelectorAll('[data-a16-request]').forEach(b=>b.onclick=()=>{const v=state.versions.find(x=>x.id===b.dataset.a16Request);requestAccess(v?.version_label||'versão especial');});
}
function open(mode){state.mode=mode==='code'?'code':'download';render();const m=ensureModal();m.classList.add('show');m.setAttribute('aria-hidden','false');return false;}
let loadingPromise=null;
async function load(){
  if(state.ready)return true;
  if(loadingPromise)return loadingPromise;
  if(!A?.client)return false;
  loadingPromise=(async()=>{
    try{
      const s=await A.client.auth.getSession();
      if(!s.data?.session)return false;
      const r=await A.client.rpc('jc_activator16_get_versions');
      if(r.error)throw r.error;
      state.baseAccess=Boolean(r.data?.base_access)||state.packageCompatibility;
      state.versions=(r.data?.versions||[]).map(v=>state.packageCompatibility?{...v,available:true,locked_message:'Liberada pelo pacote Mais Compatibilidade.'}:v);
      state.ready=true;
      return true;
    }catch(e){console.warn('Ativador 16 versões por cliente:',e.message||e);state.ready=false;return false;}
    finally{loadingPromise=null;}
  })();
  return loadingPromise;
}
function bindButtons(){
  document.addEventListener('click',e=>{
    const downloadButton=e.target.closest&&e.target.closest('#btn_ativador_5100');
    const codeButton=e.target.closest&&e.target.closest('#btn_gerar_codigo_download');
    if(!downloadButton&&!codeButton)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    (async()=>{
      if(downloadButton){
        await load();
        if(canOpen('download')) return open('download');
        if(window.JC_PANEL_RUNTIME?.openLink) return window.JC_PANEL_RUNTIME.openLink(downloadButton.dataset.jcLinkId||'ativador_16_digitos', downloadButton);
        return false;
      }
      if(codeButton){
        await load();
        if(canOpen('code')) return open('code');
        if(window.JC_PANEL_RUNTIME?.generateCode) return window.JC_PANEL_RUNTIME.generateCode(codeButton.dataset.jcCodeGroup||'download_16', codeButton.dataset.jcTargetId||'download_code_16_right', codeButton.dataset.jcStatusId||'status_bar', codeButton, true);
      }
    })().catch(err=>toast(err.message||'Não foi possível abrir a versão do Ativador 16.','error'));
  },true);
}

window.JC_ACTIVATOR16_VERSIONS={
  state,
  canOpenDownload:()=>canOpen('download'),
  canOpenCode:()=>canOpen('code'),
  openDownload:()=>open('download'),
  openCode:()=>open('code'),
  reload:()=>load()
};

document.addEventListener('jc:access-ready',e=>{const c=e.detail||window.JC_GENERATOR_CONTEXT||{};state.packageCompatibility=Boolean(c.mode==='admin'||c.permissions?.['activator16.more_compatibility']);if(state.ready&&state.packageCompatibility){state.baseAccess=true;state.versions=state.versions.map(v=>({...v,available:true,locked_message:'Liberada pelo pacote Mais Compatibilidade.'}));}},false);
document.addEventListener('DOMContentLoaded',()=>{bindButtons();});
})();
