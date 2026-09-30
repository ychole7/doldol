/* DOLDOL HOME V1 — clean rebuild. No legacy patch stack. */
(function(){
  if(window.__doldolHomeV1) return;
  window.__doldolHomeV1 = true;

  const $ = id => document.getElementById(id);

  function init(){
    const lobby = $('gameLobby');
    const start = $('lobbyStart');
    if(!lobby || !start) return false;

    lobby.classList.add('ddHomeV1');

    /* Keep the game's ORIGINAL battle button and click handler.
       Only its visual is transparent over the approved artwork. */
    start.className = 'ddHomeV1Start';
    start.innerHTML = '';
    start.removeAttribute('style');

    /* Hide only the old HOME content blocks by their known IDs/classes.
       Do not touch navigation/gameplay wiring. */
    const oldStage = $('v26stage');
    if(oldStage) oldStage.style.display='none';

    const stage = $('v35stage');
    if(stage) stage.style.display='none';

    const oldHud = $('doldolHomeHud');
    if(oldHud) oldHud.style.display='none';

    /* Remove the legacy hero/logo block if it was tagged by older builds. */
    lobby.querySelectorAll('.v35HeroClean,.v35LogoOff,.v35LogoShellOff,.v35DotsClean')
      .forEach(el => el.style.display='none');

    return true;
  }

  const style=document.createElement('style');
  style.id='doldol-home-v1-style';
  style.textContent=`
    #gameLobby.ddHomeV1{
      position:relative!important;
      width:100%!important;
      min-height:100dvh!important;
      overflow:hidden!important;
      background:url('./assets/home_final_locked.jpg') center top/100% 100% no-repeat!important;
    }

    /* original battle action, exact invisible hit area */
    #gameLobby.ddHomeV1 #lobbyStart.ddHomeV1Start{
      display:block!important;
      visibility:visible!important;
      position:absolute!important;
      left:8%!important;
      top:58%!important;
      width:84%!important;
      height:10.5%!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
      opacity:0!important;
      z-index:100!important;
      pointer-events:auto!important;
      touch-action:manipulation!important;
    }
    #gameLobby.ddHomeV1 #lobbyStart.ddHomeV1Start *{display:none!important;}
  `;
  document.head.appendChild(style);

  if(!init()){
    const mo=new MutationObserver(()=>{ if(init()) mo.disconnect(); });
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
