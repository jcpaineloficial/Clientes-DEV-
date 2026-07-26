(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const A=window.JC_APP;
  let started=false,devices=[],profiles=new Map();
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  const objects=row=>[row,row?.device_info,row?.hardware_info,row?.system_info,row?.metadata,row?.metadata?.device_info,row?.metadata?.hardware,row?.metadata?.system].filter(value=>value&&typeof value==="object");
  function pick(row,names){for(const source of objects(row)){for(const name of names){const value=source[name];if(value!==undefined&&value!==null&&String(value).trim()!=="")return value;}}return "";}
  function formatCapacity(value){
    if(value===undefined||value===null||value==="")return "Não informado";
    const number=Number(value);
    if(!Number.isFinite(number))return String(value);
    if(number>1024*1024*1024)return (number/1024/1024/1024).toFixed(number>=10*1024*1024*1024?0:1)+" GB";
    if(number>1024*1024)return (number/1024/1024).toFixed(0)+" MB";
    if(number>1024)return (number/1024).toFixed(0)+" KB";
    return number+" MB";
  }
  function date(value){if(!value)return "Nunca";const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value):parsed.toLocaleString("pt-BR");}
  function isOnline(row){const status=String(row.status||"").toLowerCase();if(["offline","detached","deleted","blocked"].includes(status))return false;const seen=new Date(row.last_seen_at||row.updated_at||0).getTime();return status==="online"||(seen&&Date.now()-seen<180000);}
  function details(row){
    return {
      name:pick(row,["label","device_name","name"])||"TV Box",
      model:pick(row,["model","device_model"])||"Não informado",
      manufacturer:pick(row,["manufacturer","brand","vendor"])||"Não informado",
      processor:pick(row,["processor","soc","cpu","chipset","cpu_model"])||"Não informado",
      board:pick(row,["board","hardware","board_name","hardware_id","product"])||"Não informado",
      memory:formatCapacity(pick(row,["ram_bytes","memory_bytes","total_memory_bytes","ram_mb","memory_mb","ram","memory","total_memory"])),
      storage:formatCapacity(pick(row,["storage_bytes","total_storage_bytes","disk_bytes","storage_mb","storage","disk","total_storage"])),
      android:pick(row,["android_version","os_version","release"])||"Não informado",
      api:pick(row,["api_level","sdk_int","sdk"])||"—",
      serial:pick(row,["serial","serial_number","device_hash","android_id"])||String(row.id||"—"),
      edition:String(pick(row,["edition","launcher_edition"])||"lite").toUpperCase(),
    };
  }
  function filtered(){
    const search=String($("invSearch")?.value||"").toLowerCase();
    const status=$("invStatusFilter")?.value||"";
    const edition=$("invEditionFilter")?.value||"";
    return devices.filter(row=>{
      const d=details(row),owner=profiles.get(row.owner_id)||{};
      const hay=[d.name,d.model,d.manufacturer,d.processor,d.board,d.memory,d.storage,d.android,d.serial,owner.full_name,owner.username].join(" ").toLowerCase();
      return(!search||hay.includes(search))&&(!status||(status==="online")===isOnline(row))&&(!edition||String(row.edition||"lite").toLowerCase()===edition);
    });
  }
  function render(){
    const list=filtered();
    $("invTotal").textContent=devices.length;
    $("invOnline").textContent=devices.filter(isOnline).length;
    $("invOffline").textContent=devices.filter(row=>!isOnline(row)).length;
    $("invIncomplete").textContent=devices.filter(row=>{const d=details(row);return [d.processor,d.board,d.memory].some(value=>value==="Não informado");}).length;
    $("invList").innerHTML=list.length?list.map(row=>{
      const d=details(row),owner=profiles.get(row.owner_id)||{},online=isOnline(row);
      return `<article class="inv-device"><div class="inv-device-head"><div><h3>${esc(d.name)}</h3><small>${esc(owner.full_name||owner.username||"Responsável não identificado")} • ${esc(d.edition)}</small></div><span class="inv-pill ${online?"":"offline"}">${online?"ONLINE":"OFFLINE"}</span></div><div class="inv-grid"><div class="inv-detail"><small>Modelo</small><b>${esc(d.model)}</b></div><div class="inv-detail"><small>Fabricante</small><b>${esc(d.manufacturer)}</b></div><div class="inv-detail"><small>Processador / SoC</small><b>${esc(d.processor)}</b></div><div class="inv-detail"><small>Placa / hardware</small><b>${esc(d.board)}</b></div><div class="inv-detail"><small>Memória RAM</small><b>${esc(d.memory)}</b></div><div class="inv-detail"><small>Armazenamento</small><b>${esc(d.storage)}</b></div><div class="inv-detail"><small>Android</small><b>${esc(d.android)} • API ${esc(d.api)}</b></div><div class="inv-detail"><small>Último contato</small><b>${esc(date(row.last_seen_at||row.updated_at))}</b></div><div class="inv-detail"><small>ID técnico</small><b>${esc(d.serial)}</b></div></div><div class="inv-device-actions"><button class="inv-btn" data-copy-device="${esc(row.id)}" type="button">📋 Copiar ficha técnica</button><a class="inv-btn" href="jc-box-control.html?device=${encodeURIComponent(row.id||"")}">Abrir no Box Control</a></div></article>`;
    }).join(""):'<div class="inv-empty">Nenhum aparelho encontrado com estes filtros.</div>';
    $("invList").querySelectorAll("[data-copy-device]").forEach(button=>button.onclick=()=>copyDevice(button.dataset.copyDevice));
    $("invStatus").textContent=`${list.length} de ${devices.length} aparelho(s) exibido(s).`;
  }
  async function copyDevice(id){
    const row=devices.find(item=>String(item.id)===String(id));if(!row)return;
    const d=details(row),owner=profiles.get(row.owner_id)||{};
    const text=[`APARELHO: ${d.name}`,`CLIENTE: ${owner.full_name||owner.username||"Não identificado"}`,`MODELO: ${d.model}`,`FABRICANTE: ${d.manufacturer}`,`PROCESSADOR: ${d.processor}`,`PLACA / HARDWARE: ${d.board}`,`MEMÓRIA RAM: ${d.memory}`,`ARMAZENAMENTO: ${d.storage}`,`ANDROID: ${d.android} / API ${d.api}`,`ÚLTIMO CONTATO: ${date(row.last_seen_at||row.updated_at)}`,`ID: ${d.serial}`].join("\n");
    try{await navigator.clipboard.writeText(text);A?.toast?.("Ficha técnica copiada.");}catch(_){window.prompt("Copie a ficha técnica:",text);}
  }
  async function load(){
    $("invReload").disabled=true;$("invStatus").classList.remove("error");$("invStatus").textContent="Carregando aparelhos...";
    try{
      let result=await A.client.from("jc_launcher_devices").select("*").order("created_at",{ascending:false});
      if(result.error)throw result.error;
      devices=(result.data||[]).filter(row=>!row.deleted_at&&String(row.status||"").toLowerCase()!=="deleted");
      const owners=[...new Set(devices.map(row=>row.owner_id).filter(Boolean))];profiles=new Map();
      if(owners.length){const people=await A.client.from("profiles").select("id,username,full_name").in("id",owners);if(!people.error)(people.data||[]).forEach(row=>profiles.set(row.id,row));}
      render();
    }catch(error){$("invStatus").textContent=`Falha ao carregar: ${error.message||error}`;$("invStatus").classList.add("error");$("invList").innerHTML='<div class="inv-empty">Não foi possível consultar os aparelhos.</div>';}
    finally{$("invReload").disabled=false;}
  }
  function init(){if(started)return;started=true;$("invReload").onclick=load;["invSearch","invStatusFilter","invEditionFilter"].forEach(id=>$(id).addEventListener(id==="invSearch"?"input":"change",render));load();}
  document.addEventListener("jc:admin-liberado",init,{once:true});window.addEventListener("jc:admin-liberado",init,{once:true});if(window.JC_ADMIN_ACCESS)init();
})();

