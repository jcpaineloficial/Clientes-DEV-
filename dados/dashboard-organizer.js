(function(){
  "use strict";
  const grid=document.querySelector(".hero > .grid");
  if(!grid||grid.classList.contains("jc-dashboard-organized"))return;
  const clientCard=grid.querySelector('a.card[href="painel-clientes.html"]');
  if(clientCard)clientCard.href="painel-clientes.html?secao=clientes";
  const resellerCard=grid.querySelector('a.card[href="painel-revenda.html"]');
  if(resellerCard){resellerCard.href="painel-clientes.html?secao=revendedores";const title=resellerCard.querySelector('h2');if(title)title.textContent="Acompanhamento da Revenda";const description=resellerCard.querySelector('p');if(description)description.textContent="Acompanhe vendedores, clientes, permissões, créditos e históricos pelo ADM.";}
  const extraCards=[
    ["painel-clientes.html?secao=padroes","🧭","Padrões de Acesso","Defina funções padrão e o ambiente demonstrativo usado nos novos cadastros.","Configurar padrões →"],
    ["painel-clientes.html?secao=planos","🗓️","Planos e Valores","Organize durações, preços, economia, observações e visibilidade dos planos.","Configurar planos →"],
    ["painel-clientes.html?secao=mensagens","💬","Mensagens e Formulários","Edite textos comerciais, pedidos de cadastro, testes e mensagens de acesso.","Configurar mensagens →"],
    ["painel-clientes.html?secao=cobrancas","🧾","Cobranças","Configure lembretes, PIX, vencimentos e a fila de cobrança pelo WhatsApp.","Abrir cobranças →"],
    ["painel-clientes.html?secao=solicitacoes","📥","Solicitações de Cadastro","Confira formulários recebidos e aprove somente os cadastros corretos.","Ver solicitações →"],
    ["painel-clientes.html?secao=revendedores","🤝","Gestão de Revendedores","Acompanhe clientes, créditos, funções e históricos de cada revendedor.","Gerenciar revendedores →"],
    ["painel-sugestoes.html","💡","Sugestões dos Clientes","Receba ideias como conversas, responda e acompanhe cada pedido até a conclusão.","Abrir sugestões →"],
    ["painel-clientes.html?secao=configuracao","⚙️","Configuração Geral","Centralize links, segurança, teste, assinatura e regras gerais do painel.","Abrir configuração →"],
    ["painel-limpeza.html","🧹","Limpeza Administrativa","Faça limpezas seletivas com confirmação reforçada, backup e auditoria.","Abrir central de limpeza →"],
    ["painel-ativacoes.html","🔐","Gerenciador 11, 16 e CONFIG","Gerencie códigos, aparelhos, validade, uso das CONFIGs e o relatório completo do Acesse Aqui.","Abrir gerenciador completo →"],
    ["jc-box-control.html","📺","JC Box Control","Controle Boxes, aplicativos, arquivos, cobranças, licenças e comandos remotos.","Abrir controle das Boxes →"],
    ["painel-inventario-aparelhos.html","🧠","Inventário dos Aparelhos","Consulte modelo, processador, memória, placa, armazenamento e Android de cada Box.","Abrir inventário técnico →"]
  ];
  extraCards.forEach(([href,icon,title,description,action])=>{
    if(grid.querySelector(`a.card[href="${href}"]`))return;
    const card=document.createElement("a");
    card.className="card admin";
    card.href=href;
    card.innerHTML=`<div><div class="icon">${icon}</div><h2>${title}</h2><p>${description}</p></div><span>${action}</span>`;
    grid.appendChild(card);
  });
  const reportsCard=grid.querySelector("#card-jc-relatorios");
  const activationManager=grid.querySelector('a.card[href="painel-ativacoes.html"]');
  if(reportsCard&&activationManager)reportsCard.insertAdjacentElement("afterend",activationManager);
  const cards=Array.from(grid.children).filter(node=>node.matches?.("a.card"));
  const definitions=[
    {
      id:"clients",
      title:"Clientes e acessos",
      description:"Cadastros, permissões, planos, solicitações, acompanhamento e cobrança em uma área própria.",
      icon:"👥",
      matches:["geradores/","formulario-cliente.html","painel-clientes.html","painel-clientes.html?secao=clientes","painel-clientes.html?secao=planos","painel-clientes.html?secao=cobrancas","painel-clientes.html?secao=solicitacoes"]
    },
    {
      id:"service",
      title:"Atendimento, cobranças e revenda",
      description:"Mensagens, solicitações, cobranças, atendentes e acompanhamento dos revendedores.",
      icon:"💬",
      matches:["painel-clientes.html?secao=mensagens","painel-clientes.html?secao=revendedores","painel-sugestoes.html","painel-atendentes.html","minha-atendente.html","painel-revenda.html"]
    },
    {
      id:"sales",
      title:"Produtos, vendas e créditos",
      description:"Pacotes comerciais, valores de funções e custos em créditos sem duplicação dentro de Clientes.",
      icon:"🛍️",
      matches:["painel-pacotes.html","painel-funcoes-compras.html","painel-creditos.html"]
    },
    {
      id:"content",
      title:"Aplicativos, links e mídias",
      description:"Atualizações, downloads, imagens e criadores organizados fora das áreas comerciais.",
      icon:"📦",
      matches:["painel-atualizacoes.html","painel-links.html","gerenciador-imagens.html","criadores.html"]
    },
    {
      id:"reports",
      title:"Relatórios, históricos e limpeza",
      description:"Consulta separada das operações de limpeza e das ferramentas de compatibilidade.",
      icon:"📊",
      matches:["painel-relatorios.html","painel-ativacoes.html","historicos-envio-whatsapp.html","painel-limpeza.html","painel-consumo-supabase.html"]
    },
    {
      id:"launcher",
      title:"JC Launcher e Boxes",
      description:"Controle remoto e inventário técnico dos aparelhos em áreas próprias.",
      icon:"📺",
      matches:["jc-box-control.html","painel-inventario-aparelhos.html"]
    },
    {
      id:"system",
      title:"Sistema e manutenção",
      description:"Padrões, configuração geral, ferramentas administrativas, GitHub, diagnóstico e recuperação de acesso.",
      icon:"⚙️",
      matches:["painel-clientes.html?secao=padroes","painel-clientes.html?secao=configuracao","painel-botoes.html","painel-github-configuracoes.html","redefinir-senha.html","teste-conexao.html"]
    }
  ];
  function normalizedHref(card){
    const raw=card.getAttribute("href")||"";
    try{
      const url=new URL(raw,location.href);
      const current=new URL(location.href);
      return url.origin===current.origin?url.pathname.split("/").pop()+(url.pathname.endsWith("/")?"/":""):raw;
    }catch(_){return raw.split("?")[0];}
  }
  function matches(card,items){
    const rawFull=(card.getAttribute("href")||"").replace(/^\.\//,"");
    const raw=rawFull.split("?")[0];
    const normalized=normalizedHref(card);
    return items.some(item=>item.includes("?")?rawFull===item:!rawFull.includes("?")&&(raw===item||normalized===item||raw.endsWith("/"+item)));
  }
  const used=new Set();
  definitions.forEach(definition=>{
    const selected=cards.filter(card=>!used.has(card)&&matches(card,definition.matches));
    if(!selected.length)return;
    const section=document.createElement("section");
    section.className="jc-dashboard-group";
    section.dataset.dashboardGroup=definition.id;
    const head=document.createElement("header");
    head.className="jc-dashboard-group-head";
    head.innerHTML=`<div><h2>${definition.icon} ${definition.title}</h2><p>${definition.description}</p></div><span>${selected.length} acesso(s)</span>`;
    const sectionGrid=document.createElement("div");
    sectionGrid.className="jc-dashboard-group-grid";
    selected.forEach(card=>{used.add(card);sectionGrid.appendChild(card);});
    section.append(head,sectionGrid);
    grid.appendChild(section);
  });
  const remaining=cards.filter(card=>!used.has(card));
  if(remaining.length){
    const section=document.createElement("section");
    section.className="jc-dashboard-group";
    section.innerHTML=`<header class="jc-dashboard-group-head"><div><h2>🧰 Outras ferramentas</h2><p>Acessos administrativos complementares.</p></div><span>${remaining.length} acesso(s)</span></header><div class="jc-dashboard-group-grid"></div>`;
    const sectionGrid=section.querySelector(".jc-dashboard-group-grid");
    remaining.forEach(card=>sectionGrid.appendChild(card));
    grid.appendChild(section);
  }
  grid.classList.add("jc-dashboard-organized");

  async function loadSuggestionNotice(){
    if(!window.JC_APP?.client)return;
    try{
      const {data,error}=await window.JC_APP.client.rpc("jc_suggestion_admin_list");
      if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      const unread=rows.filter(row=>Number(row.unread_admin||0)>0);
      const card=grid.querySelector('a.card[href="painel-sugestoes.html"]');
      if(card){
        let badge=card.querySelector(".jc-dashboard-card-badge");
        if(!badge){badge=document.createElement("b");badge.className="jc-dashboard-card-badge";card.appendChild(badge)}
        badge.textContent=unread.length?`${unread.length} nova(s)`:"Tudo lido";
        badge.classList.toggle("is-empty",!unread.length);
      }
      document.querySelector(".jc-dashboard-suggestion-notice")?.remove();
      if(!unread.length)return;
      const latest=unread.sort((a,b)=>new Date(b.last_message_at||b.updated_at)-new Date(a.last_message_at||a.updated_at))[0];
      const safe=value=>String(value||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
      const notice=document.createElement("a");
      notice.className="jc-dashboard-suggestion-notice";
      notice.href=`painel-sugestoes.html?conversa=${encodeURIComponent(latest.id||"")}`;
      notice.innerHTML=`<span class="jc-dashboard-bell">🔔</span><span><b>${safe(latest.client_name||latest.client_username||"Um cliente")} enviou uma sugestão</b><small>${safe(latest.subject||"Abrir conversa")}</small></span><em>${unread.length} conversa(s) com novidade →</em>`;
      grid.parentNode.insertBefore(notice,grid);
    }catch(error){
      if(!/jc_suggestion_|schema cache|not found|does not exist/i.test(String(error?.message||error)))console.warn("Sugestões:",error);
    }
  }
  document.addEventListener("jc:admin-liberado",loadSuggestionNotice,{once:true});
  if(document.documentElement.classList.contains("jc-admin-liberado"))loadSuggestionNotice();
})();
