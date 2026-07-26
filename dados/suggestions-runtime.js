(function(){
  "use strict";
  const A=window.JC_APP;
  const state={context:null,threads:[],activeId:null,ready:false,busy:false};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})};
  const statusLabel=value=>({open:"Aberta",in_review:"Em análise",planned:"Planejada",done:"Concluída",closed:"Encerrada"})[value]||"Aberta";
  function installCss(){if(document.querySelector('link[data-jc-suggestions-css]'))return;const link=document.createElement("link");link.rel="stylesheet";link.href="../dados/suggestions.css?v=20260720-01";link.dataset.jcSuggestionsCss="1";document.head.appendChild(link)}
  function missingFeature(error){return /jc_suggestion_|schema cache|could not find the function|does not exist|not found/i.test(String(error?.message||error||""))}
  function ensureModal(){
    let modal=$("jc_suggestion_modal");if(modal)return modal;
    modal=document.createElement("div");modal.id="jc_suggestion_modal";modal.setAttribute("aria-hidden","true");
    modal.innerHTML=`<div class="jc-suggestion-shell" id="jc_suggestion_shell" role="dialog" aria-modal="true" aria-labelledby="jc_suggestion_title">
      <aside class="jc-suggestion-side"><div class="jc-suggestion-side-head"><div><h2>Minhas sugestões</h2><p>Acompanhe respostas e andamento.</p></div></div><button class="jc-suggestion-new" id="jc_suggestion_new" type="button">＋ Nova sugestão</button><div class="jc-suggestion-thread-list" id="jc_suggestion_thread_list"></div></aside>
      <section class="jc-suggestion-chat"><header class="jc-suggestion-chat-head"><div><h3 id="jc_suggestion_title">Sugestões para o painel</h3><p id="jc_suggestion_subtitle">Conte sua ideia diretamente para a administração.</p></div><button class="jc-suggestion-close" id="jc_suggestion_close" type="button" aria-label="Fechar">×</button></header><div class="jc-suggestion-messages" id="jc_suggestion_messages"></div><form class="jc-suggestion-compose" id="jc_suggestion_compose" hidden><textarea id="jc_suggestion_reply" maxlength="2000" placeholder="Escreva uma nova mensagem..." required></textarea><button class="jc-suggestion-send" type="submit">Enviar</button></form></section>
    </div>`;
    document.body.appendChild(modal);
    $("jc_suggestion_close").onclick=close;
    modal.onclick=e=>{if(e.target===modal)close()};
    $("jc_suggestion_new").onclick=showNewForm;
    $("jc_suggestion_compose").onsubmit=e=>{e.preventDefault();sendReply()};
    return modal;
  }
  function close(){const modal=$("jc_suggestion_modal");if(modal){modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true")}}
  function showError(message){const host=$("jc_suggestion_messages");if(host)host.innerHTML=`<div class="jc-suggestion-empty">${esc(message)}</div>`;const form=$("jc_suggestion_compose");if(form)form.hidden=true}
  function setBadge(){const unread=state.threads.reduce((sum,row)=>sum+Number(row.unread_client||0),0);const badge=$("jc_suggestion_badge");if(!badge)return;badge.textContent=unread>99?"99+":String(unread);badge.hidden=!unread}
  function renderList(){
    const root=$("jc_suggestion_thread_list");if(!root)return;
    root.innerHTML=state.threads.length?state.threads.map(row=>`<button class="jc-suggestion-thread ${row.id===state.activeId?"is-active":""}" type="button" data-suggestion-thread="${esc(row.id)}">${Number(row.unread_client||0)?`<span class="unread">${Number(row.unread_client)}</span>`:""}<strong>${esc(row.subject||"Sugestão")}</strong><small>${esc(statusLabel(row.status))} • ${esc(date(row.last_message_at||row.updated_at))}</small></button>`).join(""):'<div class="jc-suggestion-empty">Você ainda não enviou sugestões.</div>';
    root.querySelectorAll("[data-suggestion-thread]").forEach(button=>button.onclick=()=>selectThread(button.dataset.suggestionThread));
    setBadge();
  }
  function renderThread(){
    const thread=state.threads.find(row=>row.id===state.activeId);const host=$("jc_suggestion_messages"),form=$("jc_suggestion_compose");
    renderList();
    if(!thread){showNewForm();return}
    $("jc_suggestion_title").textContent=thread.subject||"Sugestão";
    $("jc_suggestion_subtitle").innerHTML=`Status: <b>${esc(statusLabel(thread.status))}</b>`;
    const messages=Array.isArray(thread.messages)?thread.messages:[];
    host.innerHTML=messages.length?messages.map(message=>`<div class="jc-suggestion-message ${message.sender_role==="client"?"is-mine":"is-admin"}"><b>${esc(message.sender_role==="admin"?"Administração":message.sender_name||"Você")}</b><div>${esc(message.body).replace(/\n/g,"<br>")}</div><small>${esc(date(message.created_at))}</small></div>`).join(""):'<div class="jc-suggestion-empty">Nenhuma mensagem nesta conversa.</div>';
    host.scrollTop=host.scrollHeight;
    form.hidden=["done","closed"].includes(thread.status);
    if(form.hidden)host.insertAdjacentHTML("beforeend",'<div class="jc-suggestion-error">Esta conversa foi concluída. Você pode abrir uma nova sugestão.</div>');
  }
  function showNewForm(){
    state.activeId=null;renderList();
    $("jc_suggestion_title").textContent="Nova sugestão";$("jc_suggestion_subtitle").textContent="Explique a ideia e onde ela ajudaria no painel.";$("jc_suggestion_compose").hidden=true;
    $("jc_suggestion_messages").innerHTML=`<form class="jc-suggestion-new-form" id="jc_suggestion_new_form"><h3>💡 Enviar uma ideia</h3><p>Use um título curto e depois descreva sua sugestão com detalhes.</p><label for="jc_suggestion_subject">Título</label><input id="jc_suggestion_subject" maxlength="100" placeholder="Ex.: área em massa de CONFIG" required><label for="jc_suggestion_body">Sugestão</label><textarea id="jc_suggestion_body" maxlength="2000" placeholder="Explique como você imagina essa função..." required></textarea><div class="jc-suggestion-form-actions"><button class="jc-suggestion-action" id="jc_suggestion_cancel_new" type="button">Cancelar</button><button class="jc-suggestion-action primary" type="submit">Enviar sugestão</button></div></form>`;
    $("jc_suggestion_cancel_new").onclick=()=>state.threads.length?selectThread(state.threads[0].id):close();
    $("jc_suggestion_new_form").onsubmit=e=>{e.preventDefault();sendNew()};
  }
  async function rpc(name,args){const result=await A.client.rpc(name,args||{});if(result.error)throw result.error;return result.data}
  async function load(selectId){
    const data=await rpc("jc_suggestion_list_my");state.threads=Array.isArray(data)?data:[];
    const wanted=selectId||state.activeId;if(wanted&&state.threads.some(row=>row.id===wanted))state.activeId=wanted;else if(state.threads.length&&!state.activeId)state.activeId=state.threads[0].id;
    renderList();if(state.activeId)renderThread();
  }
  async function selectThread(id){state.activeId=id;renderThread();try{await rpc("jc_suggestion_mark_read",{p_thread_id:id});const row=state.threads.find(x=>x.id===id);if(row)row.unread_client=0;setBadge()}catch(_){} }
  async function sendNew(){
    if(state.busy)return;const subject=$("jc_suggestion_subject").value.trim(),body=$("jc_suggestion_body").value.trim();if(!subject||!body)return;
    state.busy=true;const button=$("jc_suggestion_new_form").querySelector('button[type="submit"]');button.disabled=true;button.textContent="Enviando...";
    try{const data=await rpc("jc_suggestion_send",{p_thread_id:null,p_subject:subject,p_body:body});A.toast?.("Sugestão enviada para a administração.");await load(data?.thread_id||null)}catch(error){A.toast?.(missingFeature(error)?"A central de sugestões precisa ser ativada no Supabase pelo administrador.":error.message,"error");button.disabled=false;button.textContent="Enviar sugestão"}finally{state.busy=false}
  }
  async function sendReply(){
    if(state.busy||!state.activeId)return;const input=$("jc_suggestion_reply"),body=input.value.trim();if(!body)return;
    state.busy=true;const button=$("jc_suggestion_compose").querySelector("button");button.disabled=true;
    try{await rpc("jc_suggestion_send",{p_thread_id:state.activeId,p_subject:null,p_body:body});input.value="";await load(state.activeId)}catch(error){A.toast?.(error.message||"Não foi possível enviar.","error")}finally{state.busy=false;button.disabled=false}
  }
  async function open(){
    if(state.context?.mode==="admin"){location.href="../painel-sugestoes.html";return}
    const modal=ensureModal();modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");showError("Carregando suas sugestões...");
    if(["test","preview"].includes(state.context?.mode)){showError("A conversa de sugestões fica disponível quando o cliente entra com uma conta cadastrada.");return}
    try{await load();if(!state.threads.length)showNewForm()}catch(error){showError(missingFeature(error)?"A central de sugestões ainda precisa ser ativada pela administração.":error.message||"Não foi possível carregar.")}
  }
  function activate(context){state.context=context||window.JC_GENERATOR_CONTEXT||{};state.ready=true;const button=$("jc_suggestion_open");if(button)button.onclick=open;if(state.context.mode!=="test"&&state.context.mode!=="preview")load().catch(()=>{})}
  installCss();ensureModal();const button=$("jc_suggestion_open");if(button)button.onclick=open;
  document.addEventListener("jc:access-ready",event=>activate(event.detail));if(window.JC_GENERATOR_CONTEXT?.mode)activate(window.JC_GENERATOR_CONTEXT);
})();
