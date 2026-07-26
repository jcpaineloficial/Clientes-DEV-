(function(){
  'use strict';
  if('scrollRestoration' in history)history.scrollRestoration='manual';

  const selectors=[
    '[data-jc-action="open-config"]','[data-jc-action="open-activator"]','[data-jc-action="open-package"]',
    '#btn_gerar_combinacoes','#btn_gerador11','#btn_gerador16','#btn_pacote_gerar','#btn_pacote_stv','#btn_pacote_xplus','#btn_pacote_xplus_novo',
    '#activation_full_toggle','#pacote_apk_full_toggle'
  ].join(',');
  let guard=null;
  let userMoved=false;

  function stop(){if(guard?.raf)cancelAnimationFrame(guard.raf);guard=null;userMoved=false;}
  function markUserMove(){userMoved=true;}
  function keepAnchor(target){
    stop();
    const start=performance.now();
    const initialTop=target.getBoundingClientRect().top;
    const initialScroll=window.scrollY;
    guard={raf:0};
    const frame=now=>{
      if(!guard||userMoved||now-start>1800){stop();return;}
      const rect=target.getBoundingClientRect();
      const delta=rect.top-initialTop;
      if(Math.abs(delta)>1&&Math.abs(window.scrollY-initialScroll)<900)window.scrollBy(0,delta);
      guard.raf=requestAnimationFrame(frame);
    };
    guard.raf=requestAnimationFrame(frame);
  }
  function boot(){
    document.documentElement.classList.add('jc-index-stable-scroll');
    document.addEventListener('pointerdown',event=>{const target=event.target.closest?.(selectors);if(target)keepAnchor(target);},true);
    document.addEventListener('wheel',markUserMove,{passive:true,capture:true});
    document.addEventListener('touchmove',markUserMove,{passive:true,capture:true});
    document.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))markUserMove();},true);
    window.addEventListener('blur',stop);
    // Evita restauração de uma posição antiga ou hash acidental ao entrar no painel.
    if(!location.hash)setTimeout(()=>{if(window.scrollY>80)window.scrollTo({top:0,left:0,behavior:'auto'});},0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
