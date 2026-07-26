(function(){
  "use strict";
  const A=window.JC_APP;
  const state={threads:[],activeId:null,busy:false,started:false};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const dt=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleString("pt-BR")};
  const statusLabel=value=>({open:"Aberta",in_review:"Em análise",planned:"Planejada",done:"Concluída",closed:"Encerrada"})[value]||"Aberta";
  const missing=error=>/jc_suggestion_|schema cache|could not find the function|does not exist|not found/i.test(String(error?.message||error||""));
  function notice(text,error){const el=$("suggestNotice");el.textContent=text;el.classList.toggle("error",Boolean(error))}
  async function rpc(name,args){const {data,error}=await A.client.rpc(name,args||{});if(error)throw error;return data}
  function renderStats(){
    $("suggestUnread").textContent=state.threads.filter(row=>Number(row.unread_admin||0)>0).length;
    $("suggestOpen").textContent=state.threads.filter(row=>["open","in_review"].includes(row.status)).length;
    $("suggestPlanned").textContent=state.threads.filter(row=>row.status==="planned").length;
    $("suggestDone").textContent=state.threads.filter(row=>["done","closed"].includes(row.status)).length;
  }
  function filtered(){
    const query=$("suggestSearch").value.trim().toLocaleLowerCase("pt-BR"),filter=$("suggestFilter").value;
    return state.threads.filter(row=>{
      const text=[row.client_name,row.client_username,row.subject,row.last_message].join(" ").toLocaleLowerCase("pt-BR");
      const statusOk=filter==="all"||(filter==="active"&&!["done","closed"].includes(row.status))||(filter==="unread"&&Number(row.unread_admin||0)>0)||row.status===filter;
      return statusOk&&(!query||text.includes(query));
    });
  }
  function renderList(){
    const rows=filtered(),root=$("suggestList");
    root.innerHTML=rows.length?rows.map(row=>`<button class="suggest-admin-thread ${row.id===state.activeId?"is-active":""}" type="button" data-suggest-id="${esc(row.id)}">${Number(row.unread_admin||0)?'<span class="bell">🔔 Nova</span>':""}<strong>${esc(row.client_name||row.client_username||"Cliente")}</strong><span>${esc(row.subject||"Sugestão")}</span><small>${esc(statusLabel(row.status))} • ${esc(dt(row.last_message_at||row.updated_at))}</small></button>`).join(""):'<div class="suggest-admin-empty">Nenhuma sugestão encontrada neste filtro.</div>';
    root.querySelectorAll("[data-suggest-id]").forEach(button=>button.onclick=()=>openThread(button.dataset.suggestId));
  }
  function renderConversation(thread){
    $("suggestTitle").textContent=thread.subject||"Sugestão";
    $("suggestClient").textContent=`${thread.client_name||"Cliente"}${thread.client_username?` • @${thread.client_username}`:""} • criada em ${dt(thread.created_at)}`;
    $("suggestStatus").disabled=false;$("suggestStatus").value=thread.status||"open";
    const messages=Array.isArray(thread.messages)?thread.messages:[];
    $("suggestMessages").innerHTML=messages.length?messages.map(message=>`<div class="jc-suggestion-message ${message.sender_role==="admin"?"is-mine":""}"><b>${esc(message.sender_role==="admin"?"Administração":message.sender_name||thread.client_name||"Cliente")}</b><div>${esc(message.body).replace(/\n/g,"<br>")}</div><small>${esc(dt(message.created_at))}</small></div>`).join(""):'<div class="suggest-admin-empty">Nenhuma mensagem nesta conversa.</div>';
    $("suggestMessages").scrollTop=$("suggestMessages").scrollHeight;
    $("suggestCompose").hidden=["done","closed"].includes(thread.status);
  }
  async function load(preferred){
    notice("Atualizando sugestões...");
    const data=await rpc("jc_suggestion_admin_list");state.threads=Array.isArray(data)?data:[];renderStats();renderList();
    const queryId=new URLSearchParams(location.search).get("conversa");const id=preferred||state.activeId||queryId;
    if(id&&state.threads.some(row=>row.id===id))await openThread(id,true);else if(state.threads.length)await openThread(state.threads[0].id,true);
    notice(state.threads.length?`${state.threads.length} conversa(s) carregada(s). Clique em uma sugestão para acompanhar.`:"Ainda não há sugestões enviadas pelos clientes.");
  }
  async function openThread(id,force){
    if(state.busy&&!force)return;state.busy=true;state.activeId=id;renderList();$("suggestMessages").innerHTML='<div class="suggest-admin-empty">Carregando conversa...</div>';
    try{const thread=await rpc("jc_suggestion_admin_thread",{p_thread_id:id});const summary=state.threads.find(row=>row.id===id);if(summary)summary.unread_admin=0;renderStats();renderList();renderConversation(thread)}catch(error){notice(error.message||"Não foi possível abrir a conversa.",true)}finally{state.busy=false}
  }
  async function reply(){
    if(state.busy||!state.activeId)return;const input=$("suggestReply"),body=input.value.trim();if(!body)return;
    state.busy=true;const button=$("suggestCompose").querySelector("button");button.disabled=true;
    try{await rpc("jc_suggestion_admin_reply",{p_thread_id:state.activeId,p_body:body,p_status:$("suggestStatus").value});input.value="";await load(state.activeId);notice("Resposta enviada ao cliente.")}catch(error){notice(error.message||"Não foi possível responder.",true)}finally{state.busy=false;button.disabled=false}
  }
  async function changeStatus(){
    if(state.busy||!state.activeId)return;state.busy=true;$("suggestStatus").disabled=true;
    try{await rpc("jc_suggestion_admin_status",{p_thread_id:state.activeId,p_status:$("suggestStatus").value});await load(state.activeId);notice(`Status alterado para ${statusLabel($("suggestStatus").value)}.`)}catch(error){notice(error.message||"Não foi possível mudar o status.",true)}finally{state.busy=false;$("suggestStatus").disabled=false}
  }
  function bind(){
    $("suggestRefresh").onclick=()=>load(state.activeId).catch(showSetupError);$("suggestSearch").oninput=renderList;$("suggestFilter").onchange=renderList;$("suggestCompose").onsubmit=e=>{e.preventDefault();reply()};$("suggestStatus").onchange=changeStatus;
  }
  function showSetupError(error){notice(missing(error)?"A central visual está pronta, mas o banco ainda precisa receber o arquivo instalacao/supabase-sugestoes.sql uma única vez.":error.message||"Não foi possível carregar as sugestões.",true)}
  function start(){if(state.started)return;state.started=true;bind();load().catch(showSetupError)}
  document.addEventListener("jc:admin-liberado",start,{once:true});if(document.documentElement.classList.contains("jc-admin-liberado"))start();
})();
