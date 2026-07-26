(function(){
  'use strict';
  const A=window.JC_APP,$=id=>document.getElementById(id);
  const DEFAULT_PRODUCTS=['geral | Créditos gerais','config | CONFIG / Acesse Aqui','ativador11 | Ativador 11 dígitos','ativador16 | Ativador 16 dígitos','apks | Pacote APKs','launcher | Créditos Launcher (separado)'];
  let selectedOwner=null;
  const toast=(t,type='ok')=>A?.toast?A.toast(t,type):alert(t);
  const parseProducts=()=>String($('resellerProducts')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{const p=line.indexOf('|');return {key:(p<0?line:line.slice(0,p)).trim().toLowerCase().replace(/[^a-z0-9_-]/g,''),name:(p<0?line:line.slice(p+1)).trim()};}).filter(x=>x.key&&x.name);
  function status(text,bad=false){const el=$('resellerCommercialStatus');if(el){el.textContent=text;el.style.color=bad?'#ffd5dc':'#baffdc';}}
  function fillProducts(){const rows=parseProducts();$('resellerCreditProduct').innerHTML=rows.map(x=>`<option value="${x.key}">${x.name}</option>`).join('');}
  async function load(){
    if(!A?.client||!$('resellerCommercialSection'))return;
    const {data:{session}}=await A.client.auth.getSession();if(!session)return;
    const {data,error}=await A.client.from('links_catalog').select('value').eq('id','reseller_commercial_settings').maybeSingle();
    if(error){status('Não foi possível carregar: '+error.message,true);return;}
    let cfg={};try{cfg=JSON.parse(String(data?.value||'{}'));}catch(_){cfg={};}
    $('resellerFeePercent').value=(Number(cfg.tier_every_clients||10)===10&&Number(cfg.fee_percent??1)===1&&!('tier_free_until' in cfg))?0.5:(cfg.fee_percent??0.5);
    $('resellerBaseCredits').value=cfg.base_credits??10000;
    $('resellerBaseValue').value=cfg.base_value??300;
    $('resellerSurchargePercent').value=cfg.surcharge_per_50??cfg.surcharge_per_10??0.5;
    $('resellerProducts').value=Array.isArray(cfg.products)&&cfg.products.length?cfg.products.map(x=>`${x.key} | ${x.name}`).join('\n'):DEFAULT_PRODUCTS.join('\n');
    fillProducts();status('Revenda por crédito carregada. Use esta área para colocar saldo no revendedor junto com a função/pacote. Créditos Launcher ficam separados e só podem ser revendidos se o revendedor também tiver comprado/recebido a função Revender Launcher. Taxa mensal: conta somente clientes ativos com crédito. 1 a 10 = 0%, 11 a 50 = 0,5%, 51 a 100 = 1%, e depois +0,5% por faixa de 50.');
  }
  async function save(){
    const products=parseProducts();if(!products.length)throw new Error('Cadastre pelo menos um produto.');
    const cfg={fee_percent:Number($('resellerFeePercent').value||0.5),tier_free_until:10,tier_first_max:50,tier_size_after:50,base_credits:Number($('resellerBaseCredits').value||10000),base_value:Number($('resellerBaseValue').value||300),surcharge_per_50:Number($('resellerSurchargePercent').value||0.5),surcharge_per_10:Number($('resellerSurchargePercent').value||0.5),products};
    const row={id:'reseller_commercial_settings',group_id:'panel_settings',group_name:'Revenda',name:'Regras comerciais da revenda',kind:'settings',value:JSON.stringify(cfg),items:products.map(x=>`${x.key} | ${x.name}`),active:true,sort_order:680};
    const {error}=await A.client.from('links_catalog').upsert(row,{onConflict:'id'});if(error)throw error;
    fillProducts();status('Regras salvas no Supabase.');toast('Configurações da Revenda por Crédito salvas.');
  }
  function profileLabel(p){return `${p.full_name||p.username||'Cliente'} — @${p.username||'sem-usuario'}${p.email?' • '+p.email:''}`;}
  async function searchClients(){
    const q=String($('resellerCreditClientSearch').value||'').trim();if(q.length<2){toast('Digite pelo menos 2 caracteres.','error');return;}
    status('Pesquisando...');
    const safe=q.replace(/[,%()]/g,' ');
    const {data,error}=await A.client.from('profiles').select('id,full_name,username,email,role,account_type').or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%,email.ilike.%${safe}%`).order('full_name').limit(20);
    if(error)throw error;
    const box=$('resellerCreditClientResults');box.innerHTML=(data||[]).length?(data||[]).map(p=>`<button class="access-client-result" type="button" data-credit-owner="${p.id}"><b>${profileLabel(p)}</b><small>${p.role||'client'} • ${p.account_type||'sem tipo'}</small></button>`).join(''):'<div class="empty">Nenhum cadastro encontrado.</div>';
    box.querySelectorAll('[data-credit-owner]').forEach(btn=>btn.onclick=()=>{selectedOwner=(data||[]).find(x=>x.id===btn.dataset.creditOwner);$('resellerCreditOwnerId').value=selectedOwner?.id||'';box.querySelectorAll('[data-credit-owner]').forEach(x=>x.classList.toggle('selected',x===btn));status('Selecionado: '+profileLabel(selectedOwner));});
  }
  async function applyCredits(){
    const ownerId=$('resellerCreditOwnerId').value,product=$('resellerCreditProduct').value,quantity=Number($('resellerCreditQuantity').value||0);
    if(!ownerId||!selectedOwner)throw new Error('Selecione o cliente ou revendedor.');if(!product||!Number.isInteger(quantity)||quantity===0)throw new Error('Informe produto e quantidade inteira diferente de zero.');
    if(!confirm(`Aplicar ${quantity>0?'+':''}${quantity} crédito(s) de ${product} para ${selectedOwner.full_name||selectedOwner.username}?`))return;
    if(product==='launcher'&&!confirm('Os créditos Launcher são separados. Confirme somente se este revendedor também comprou/recebeu a função Revender Launcher. Continuar?'))return;
    const {data,error}=await A.client.rpc('jc_launcher_add_product_credits',{p_payload:{owner_id:ownerId,product_key:product,quantity,metadata:{source:'painel-links',mode:'revenda_por_credito_adm',launcher_separado:product==='launcher'}}});if(error)throw error;
    status(`Saldo atualizado: ${data?.balance_before??'—'} → ${data?.balance_after??'—'}.`);toast('Créditos aplicados e registrados no histórico.');
  }
  function boot(){
    $('saveResellerCommercialBtn')?.addEventListener('click',()=>save().catch(e=>{status(e.message,true);toast(e.message,'error');}));
    $('resellerProducts')?.addEventListener('input',fillProducts);
    $('resellerCreditSearchBtn')?.addEventListener('click',()=>searchClients().catch(e=>{status(e.message,true);toast(e.message,'error');}));
    $('resellerCreditClientSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchClients().catch(x=>toast(x.message,'error'));}});
    $('resellerCreditApplyBtn')?.addEventListener('click',()=>applyCredits().catch(e=>{status(e.message,true);toast(e.message,'error');}));
    load().catch(e=>status(e.message,true));
    A?.client?.auth?.onAuthStateChange?.((_e,session)=>{if(session)setTimeout(()=>load().catch(()=>{}),300);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
