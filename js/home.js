/* DOLDOL HOME STEP 2 — live HUD */
(function(){
if(window.__doldolHomeClean)return; window.__doldolHomeClean=true;
const $=id=>document.getElementById(id);
window.__doldolResources=window.__doldolResources||{
 get gems(){return Math.max(0,Number(localStorage.getItem("doldol_gems_v1")||"980")||0)},
 get energy(){return Math.max(0,Number(localStorage.getItem("doldol_energy_v1")||"30")||0)},
 get maxEnergy(){return 30},
 setGems(v){localStorage.setItem("doldol_gems_v1",String(Math.max(0,Number(v)||0)));sync()},
 setEnergy(v){localStorage.setItem("doldol_energy_v1",String(Math.max(0,Math.min(30,Number(v)||0))));sync()}
};
function info(){let id="doldol",name="돌돌이",face="🐥",level=1,xp=0,next=50;
 try{id=localStorage.getItem("doldol_character_v1")||id;
  if(window.__duckGetSelectedCharacter){const c=window.__duckGetSelectedCharacter();if(c){id=c.id||id;name=c.name||name;face=c.face||face}}
  if(window.__duckCharacterProgress){const p=window.__duckCharacterProgress(id);if(p){level=p.level||1;xp=p.xp||0;next=p.next||50}}
 }catch(e){} return{id,name,face,level,xp,next}}
function sync(){const c=info(), set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
 set("homePlayerAvatar",c.face);set("homePlayerName",c.name);set("homePlayerLevel","Lv."+c.level);
 set("lobbyCoins",(window.__duckWallet?window.__duckWallet.coins:0).toLocaleString());
 set("homeGems",window.__doldolResources.gems.toLocaleString());
 set("homeEnergy",window.__doldolResources.energy+"/"+window.__doldolResources.maxEnergy);
 const x=$("homePlayerXp");if(x)x.style.width=Math.min(100,c.xp/Math.max(1,c.next)*100)+"%"}
window.__doldolSyncHomeHud=sync;
function rebuild(){const l=$("gameLobby");if(!l||l.dataset.cleanHome==="1")return!!l;
 const ids=["lobbyStart","lobbyStages","lobbyGrowth","lobbyGear","lobbyShop","lobbyBook","lobbySettings"],saved=ids.map($).filter(Boolean);
 if(!$("lobbyStart"))return false;saved.forEach(e=>e.remove());l.replaceChildren();l.className="doldolHomeClean";l.dataset.cleanHome="1";
 const h=document.createElement("header");h.className="ddHomeHud";h.innerHTML=`<div class="ddProfile"><div class="ddAvatar" id="homePlayerAvatar">🐥</div><div class="ddProfileText"><div><b id="homePlayerName">돌돌이</b><span id="homePlayerLevel">Lv.1</span></div><div class="ddXp"><i id="homePlayerXp"></i></div></div></div><div class="ddResources"><div class="ddRes">⚡ <b id="homeEnergy">30/30</b></div><div class="ddRes">🪙 <b id="lobbyCoins">0</b></div><div class="ddRes">💎 <b id="homeGems">980</b></div></div>`;l.appendChild(h);
 saved.forEach(e=>{if(e.id==="lobbySettings"){e.className="ddSettings";e.innerHTML="⚙"}else{e.className="homeControl";e.innerHTML=""}l.appendChild(e)});sync();return true}
const st=document.createElement("style");st.id="doldol-home-clean-css";st.textContent=`
#gameLobby.doldolHomeClean{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;margin:0!important;padding:0!important;overflow:hidden!important;background:url('./assets/home_base_bg.png') center/cover no-repeat!important;z-index:20!important;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}
#gameLobby.doldolHomeClean.hidden{display:none!important}#gameLobby .homeControl{display:none!important}
#gameLobby .ddHomeHud{position:absolute;left:12px;right:12px;top:max(12px,env(safe-area-inset-top));height:54px;display:flex;align-items:center;gap:6px;z-index:30;color:white}
#gameLobby .ddProfile{height:50px;min-width:132px;display:flex;align-items:center;gap:7px;padding:4px 8px 4px 5px;border:1px solid #ffffff55;border-radius:16px;background:#121d24cc;box-sizing:border-box;box-shadow:0 4px 12px #0005}
#gameLobby .ddAvatar{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:#f7c94a;font-size:25px;border:2px solid #fffd;box-sizing:border-box}
#gameLobby .ddProfileText>div:first-child{display:flex;gap:5px;align-items:baseline;white-space:nowrap}#gameLobby .ddProfileText b{font-size:12px}#gameLobby .ddProfileText span{font-size:9px;color:#ffd966;font-weight:800}
#gameLobby .ddXp{height:5px;margin-top:6px;background:#ffffff2b;border-radius:5px;overflow:hidden}#gameLobby .ddXp i{display:block;height:100%;background:#ffd34e;border-radius:5px}
#gameLobby .ddResources{margin-left:auto;display:flex;gap:4px}.ddRes{height:32px;display:flex;align-items:center;gap:2px;padding:0 6px;border-radius:11px;background:#121d24d9;border:1px solid #ffffff38;box-shadow:0 3px 9px #0004;font-size:11px;white-space:nowrap}
#gameLobby .ddSettings{position:absolute!important;right:12px!important;top:calc(max(12px,env(safe-area-inset-top)) + 60px)!important;width:34px!important;height:34px!important;display:grid!important;place-items:center!important;padding:0!important;border-radius:11px!important;border:1px solid #ffffff44!important;background:#121d24cc!important;color:white!important;font-size:17px!important;z-index:31!important}
@media(max-width:390px){#gameLobby .ddHomeHud{left:8px;right:8px}.ddRes{padding:0 4px!important}#gameLobby .ddProfile{min-width:122px}}`;document.head.appendChild(st);
const old=window.__duckSyncLobby;window.__duckSyncLobby=function(){if(typeof old==="function")try{old.apply(this,arguments)}catch(e){}sync()};
if(!rebuild()){const mo=new MutationObserver(()=>{if(rebuild())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true})}
window.addEventListener("storage",sync);
})();