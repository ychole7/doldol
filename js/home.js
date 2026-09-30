/* DOLDOL HOME STEP 2 — HUD final */
(function(){
if(window.__doldolHomeClean)return;window.__doldolHomeClean=true;
const $=id=>document.getElementById(id);
window.__doldolResources=window.__doldolResources||{get gems(){return Math.max(0,Number(localStorage.getItem("doldol_gems_v1")||"980")||0)},setGems(v){localStorage.setItem("doldol_gems_v1",String(Math.max(0,Number(v)||0)));sync()}};
function info(){let id="doldol",name="돌돌이",face="🐥",level=1,xp=0,next=50;try{id=localStorage.getItem("doldol_character_v1")||id;if(window.__duckGetSelectedCharacter){const c=window.__duckGetSelectedCharacter();if(c){id=c.id||id;name=c.name||name;face=c.face||face}}if(window.__duckCharacterProgress){const p=window.__duckCharacterProgress(id);if(p){level=p.level||1;xp=p.xp||0;next=p.next||50}}}catch(e){}return{id,name,face,level,xp,next}}
function sync(){const c=info(),set=(id,v)=>{const e=$(id);if(e)e.textContent=v};set("homePlayerAvatar",c.face);set("homePlayerName",c.name);set("homePlayerLevel","Lv."+c.level);set("lobbyCoins",(window.__duckWallet?window.__duckWallet.coins:0).toLocaleString());set("homeGems",window.__doldolResources.gems.toLocaleString());const x=$("homePlayerXp");if(x)x.style.width=Math.min(100,c.xp/Math.max(1,c.next)*100)+"%"}
window.__doldolSyncHomeHud=sync;
function rebuild(){const l=$("gameLobby");if(!l||l.dataset.cleanHome==="1")return!!l;const ids=["lobbyStart","lobbyStages","lobbyGrowth","lobbyGear","lobbyShop","lobbyBook","lobbySettings"],saved=ids.map($).filter(Boolean);if(!$("lobbyStart"))return false;saved.forEach(e=>e.remove());l.replaceChildren();l.className="doldolHomeClean";l.dataset.cleanHome="1";
const h=document.createElement("header");h.className="ddHomeHud";h.innerHTML=`<div class="ddProfile"><div class="ddAvatar" id="homePlayerAvatar">🐥</div><div class="ddProfileText"><b id="homePlayerName">돌돌이</b><span id="homePlayerLevel">Lv.1</span><div class="ddXp"><i id="homePlayerXp"></i></div></div></div><div class="ddResources"><div class="ddRes ddCore"><img src="./assets/doldol_stone_core.png" alt="돌핵"><b id="lobbyCoins">0</b><button class="ddPlus" id="homeCorePlus" aria-label="돌핵 추가">+</button></div><div class="ddRes"><span class="ddGem">💎</span><b id="homeGems">980</b><button class="ddPlus" id="homeGemPlus" aria-label="보석 추가">+</button></div></div>`;l.appendChild(h);
 const squad=document.createElement("section");
 squad.className="ddSquad";
 squad.setAttribute("aria-label","특공대 편성");
 squad.innerHTML=`
   <img class="ddChar ddNinja" data-character="ninja" src="./assets/home_chars/home_char_ninja.png" alt="닌자">
   <img class="ddChar ddCat" data-character="nyang" src="./assets/home_chars/home_char_cat.png" alt="냥특공">
   <img class="ddChar ddDoldol" data-character="doldol" src="./assets/home_chars/home_char_doldol.png" alt="돌돌이">
   <img class="ddChar ddRabbit" data-character="rabbit" src="./assets/home_chars/home_char_rabbit.png" alt="토끼특공">
   <img class="ddChar ddPanda" data-character="panda" src="./assets/home_chars/home_char_panda.png" alt="판다특공">
 `;
 l.appendChild(squad);
saved.forEach(e=>{if(e.id==="lobbySettings"){e.className="ddSettings";e.innerHTML="⚙";h.appendChild(e)}else{e.className="homeControl";e.innerHTML="";l.appendChild(e)}});sync();return true}
const st=document.createElement("style");st.id="doldol-home-clean-css";st.textContent=`
#gameLobby.doldolHomeClean{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;margin:0!important;padding:0!important;overflow:hidden!important;background:url('./assets/home_base_bg.png') center/cover no-repeat!important;z-index:20!important;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}
#gameLobby.doldolHomeClean.hidden{display:none!important}#gameLobby .homeControl{display:none!important}
#gameLobby .ddHomeHud{
  position:absolute;
  left:clamp(8px,2.6vw,16px);
  right:clamp(8px,2.6vw,16px);
  top:max(clamp(10px,2vw,16px),env(safe-area-inset-top));
  display:grid;
  grid-template-columns:minmax(0,1.15fr) minmax(0,.95fr) minmax(0,.78fr) auto;
  align-items:center;
  gap:clamp(4px,1.25vw,8px);
  z-index:30;
  color:#fff;
  box-sizing:border-box;
}
#gameLobby .ddProfile{
  min-width:0;
  height:clamp(44px,7.1vw,52px);
  display:flex;
  align-items:center;
  gap:clamp(5px,1vw,8px);
  padding:4px clamp(6px,1.6vw,10px) 4px 5px;
  border:1px solid #ffffff55;
  border-radius:clamp(14px,2.5vw,17px);
  background:#121d24d9;
  box-sizing:border-box;
  box-shadow:0 4px 12px #0005;
  overflow:hidden;
}
#gameLobby .ddAvatar{
  width:clamp(36px,6.4vw,42px);
  height:clamp(36px,6.4vw,42px);
  flex:0 0 auto;
  display:grid;
  place-items:center;
  border-radius:clamp(11px,1.9vw,13px);
  background:#f7c94a;
  font-size:clamp(21px,3.7vw,26px);
  border:2px solid #fffd;
  box-sizing:border-box;
}
#gameLobby .ddProfileText{
  min-width:0;
  display:flex;
  flex-direction:column;
  line-height:1.05;
}
#gameLobby .ddProfileText b{
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-size:clamp(11px,2.25vw,13px);
}
#gameLobby .ddProfileText span{
  font-size:clamp(9px,1.8vw,10px);
  color:#fff;
  margin-top:3px;
  font-weight:800;
}
#gameLobby .ddXp{
  width:100%;
  height:clamp(4px,.9vw,5px);
  margin-top:5px;
  background:#ffffff2b;
  border-radius:5px;
  overflow:hidden;
}
#gameLobby .ddXp i{
  display:block;
  height:100%;
  background:#ffd34e;
  border-radius:5px;
}
#gameLobby .ddResources{
  display:contents;
}
#gameLobby .ddRes{
  min-width:0;
  height:clamp(36px,6.2vw,42px);
  display:flex;
  align-items:center;
  gap:clamp(2px,.8vw,5px);
  padding:0 clamp(4px,1vw,7px);
  border-radius:clamp(12px,2.2vw,14px);
  background:#123143e8;
  border:1px solid #ffffff42;
  box-shadow:0 4px 11px #0004;
  box-sizing:border-box;
  white-space:nowrap;
  overflow:hidden;
}
#gameLobby .ddRes b{
  min-width:0;
  margin-left:auto;
  font-size:clamp(12px,2.35vw,15px);
  overflow:hidden;
  text-overflow:ellipsis;
}
#gameLobby .ddCore img{
  width:clamp(42px,7.8vw,51px);
  height:clamp(42px,7.8vw,51px);
  object-fit:contain;
  display:block;
  flex:0 0 auto;
}
#gameLobby .ddGem{
  font-size:clamp(14px,2.6vw,17px);
  flex:0 0 auto;
}
#gameLobby .ddPlus{
  width:clamp(22px,4.3vw,27px)!important;
  height:clamp(22px,4.3vw,27px)!important;
  min-width:clamp(22px,4.3vw,27px)!important;
  padding:0!important;
  margin:0!important;
  border:0!important;
  border-radius:50%!important;
  background:#2196df!important;
  color:#fff!important;
  font-size:clamp(17px,3.4vw,21px)!important;
  font-weight:900!important;
  line-height:1!important;
  display:grid!important;
  place-items:center!important;
  box-shadow:none!important;
  flex:0 0 auto;
}
#gameLobby .ddSettings{
  position:static!important;
  width:clamp(36px,6.2vw,42px)!important;
  height:clamp(36px,6.2vw,42px)!important;
  min-width:clamp(36px,6.2vw,42px)!important;
  display:grid!important;
  place-items:center!important;
  padding:0!important;
  border-radius:clamp(12px,2.2vw,14px)!important;
  border:1px solid #ffffff44!important;
  background:#123143e8!important;
  color:#fff!important;
  font-size:clamp(18px,3.4vw,21px)!important;
  z-index:31!important;
  box-shadow:0 4px 11px #0004!important;
  justify-self:end;
}



/* STEP 3 — independent responsive character layer */
#gameLobby .ddSquad{
  position:absolute;
  left:50%;
  bottom:clamp(390px,35vh,520px);
  width:min(92vw,620px);
  height:clamp(180px,25vw,245px);
  transform:translateX(-50%);
  z-index:18;
  pointer-events:none;
}
#gameLobby .ddChar{
  position:absolute;
  bottom:0;
  display:block;
  width:auto;
  height:auto;
  object-fit:contain;
  filter:drop-shadow(0 10px 8px rgba(35,24,10,.26));
  transform-origin:50% 100%;
}
#gameLobby .ddNinja{left:3%;height:52%;z-index:2}
#gameLobby .ddCat{left:19%;height:49%;z-index:3}
#gameLobby .ddDoldol{left:50%;height:82%;transform:translateX(-50%);z-index:5}
#gameLobby .ddRabbit{right:19%;height:51%;z-index:3}
#gameLobby .ddPanda{right:2%;height:53%;z-index:2}

@media(max-width:420px){
  #gameLobby .ddSquad{
    width:94vw;
    bottom:clamp(360px,34vh,475px);
    height:clamp(165px,28vw,215px);
  }
}
@media(max-width:360px){
  #gameLobby .ddSquad{
    width:96vw;
    bottom:clamp(330px,33vh,430px);
    height:160px;
  }
}

/* Narrow phones: keep all four columns, compress content rather than overlap. */
@media(max-width:420px){
  #gameLobby .ddHomeHud{
    grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr) minmax(0,.76fr) auto;
    gap:4px;
  }
  #gameLobby .ddProfile{padding-right:5px}
  #gameLobby .ddRes{padding-left:4px;padding-right:4px}
}
@media(max-width:360px){
  #gameLobby .ddProfileText span{display:none}
  #gameLobby .ddProfile{height:42px}
  #gameLobby .ddAvatar{width:34px;height:34px}
  #gameLobby .ddRes{height:34px}
  #gameLobby .ddCore img{width:39px;height:39px}
  #gameLobby .ddPlus{width:21px!important;height:21px!important;min-width:21px!important}
  #gameLobby .ddSettings{width:34px!important;height:34px!important;min-width:34px!important}
}
`;document.head.appendChild(st);
const old=window.__duckSyncLobby;window.__duckSyncLobby=function(){if(typeof old==="function")try{old.apply(this,arguments)}catch(e){}sync()};if(!rebuild()){const mo=new MutationObserver(()=>{if(rebuild())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true})}window.addEventListener("storage",sync);
})();