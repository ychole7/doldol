/* DOLDOL HOME — STEP 1: pure background */
(function(){
  if(window.__doldolHomeClean) return;
  window.__doldolHomeClean=true;
  const $=id=>document.getElementById(id);
  function rebuild(){
    const lobby=$('gameLobby');
    if(!lobby || lobby.dataset.cleanHome==='1') return !!lobby;
    const nodes=[$('lobbyStart'),$('lobbyStages'),$('lobbyGrowth'),$('lobbyGear'),$('lobbyShop'),$('lobbyBook')].filter(Boolean);
    if(!$('lobbyStart')) return false;
    nodes.forEach(el=>el.remove());
    lobby.replaceChildren();
    lobby.className='doldolHomeClean';
    lobby.dataset.cleanHome='1';
    nodes.forEach(el=>{el.className='homeControl';el.innerHTML='';lobby.appendChild(el);});
    return true;
  }
  const css=document.createElement('style');
  css.id='doldol-home-clean-css';
  css.textContent=`
    #gameLobby.doldolHomeClean{
      position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;
      margin:0!important;padding:0!important;overflow:hidden!important;
      background-image:url('./assets/home_base_bg.png')!important;
      background-position:center center!important;background-size:cover!important;
      background-repeat:no-repeat!important;z-index:20!important;
    }
    #gameLobby.doldolHomeClean.hidden{display:none!important}
    #gameLobby.doldolHomeClean .homeControl{display:none!important}
  `;
  document.head.appendChild(css);
  if(!rebuild()){
    const mo=new MutationObserver(()=>{if(rebuild())mo.disconnect()});
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }
})();