/* DOLDOL HOME — clean structural rebuild. No legacy patch stack. */
(function(){
  if(window.__doldolHomeClean) return;
  window.__doldolHomeClean = true;

  const $ = id => document.getElementById(id);

  function rebuild(){
    const lobby = $('gameLobby');
    if(!lobby || lobby.dataset.cleanHome === '1') return !!lobby;

    /* Preserve the ORIGINAL functional button nodes so game.js event handlers survive. */
    const start  = $('lobbyStart');
    const stages = $('lobbyStages');
    const growth = $('lobbyGrowth');
    const gear   = $('lobbyGear');
    const shop   = $('lobbyShop');
    const book   = $('lobbyBook');
    if(!start) return false;

    [start, stages, growth, gear, shop, book].filter(Boolean).forEach(el => el.remove());
    lobby.replaceChildren();
    lobby.className = 'doldolHomeClean';
    lobby.dataset.cleanHome = '1';

    const addHit=(el, cls, label)=>{
      if(!el) return;
      el.className='homeHit '+cls;
      el.innerHTML='';
      el.setAttribute('aria-label',label);
      lobby.appendChild(el);
    };

    addHit(start,  'homeHitStart',  '전투 시작');
    addHit(stages, 'homeHitStage',  '스테이지');
    addHit(growth, 'homeHitGrowth', '특공대');
    addHit(gear,   'homeHitGear',   '장비');
    addHit(shop,   'homeHitShop',   '상점');
    addHit(book,   'homeHitBook',   '기타');
    return true;
  }

  const css=document.createElement('style');
  css.id='doldol-home-clean-css';
  css.textContent=`
    #gameLobby.doldolHomeClean{
      position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;
      margin:0!important;padding:0!important;overflow:hidden!important;
      background:url('./assets/home_final_locked.jpg') center top/100% 100% no-repeat!important;
      z-index:20!important;
    }
    #gameLobby.doldolHomeClean.hidden{display:none!important}
    #gameLobby.doldolHomeClean .homeHit{
      position:absolute!important;display:block!important;visibility:visible!important;
      border:0!important;margin:0!important;padding:0!important;background:transparent!important;
      box-shadow:none!important;opacity:0!important;z-index:10!important;
      pointer-events:auto!important;touch-action:manipulation!important;
    }
    #gameLobby.doldolHomeClean .homeHitStart{left:8%!important;top:58%!important;width:84%!important;height:10.5%!important}
    #gameLobby.doldolHomeClean .homeHitStage{left:5%!important;top:70%!important;width:90%!important;height:15%!important}
    #gameLobby.doldolHomeClean .homeHitGrowth{left:20%!important;bottom:0!important;width:20%!important;height:11%!important}
    #gameLobby.doldolHomeClean .homeHitGear{left:40%!important;bottom:0!important;width:20%!important;height:11%!important}
    #gameLobby.doldolHomeClean .homeHitShop{left:60%!important;bottom:0!important;width:20%!important;height:11%!important}
    #gameLobby.doldolHomeClean .homeHitBook{display:none!important}
  `;
  document.head.appendChild(css);

  if(!rebuild()){
    const mo=new MutationObserver(()=>{if(rebuild())mo.disconnect()});
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
