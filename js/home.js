/* DOLDOL HOME STEP 2 — HUD final */
(function(){
if(window.__doldolHomeClean)return;window.__doldolHomeClean=true;
const $=id=>document.getElementById(id);
window.__doldolResources=window.__doldolResources||{get gems(){return Math.max(0,Number(localStorage.getItem("doldol_gems_v1")||"980")||0)},setGems(v){localStorage.setItem("doldol_gems_v1",String(Math.max(0,Number(v)||0)));sync()}};
function info(){
  let id="doldol",name="돌돌이",face="🐥",level=1,xp=0,next=50;
  try{
    id=localStorage.getItem("doldol_character_v1")||id;
    if(window.__duckGetSelectedCharacter){
      const c=window.__duckGetSelectedCharacter();
      if(c){id=c.id||id;name=c.name||name;face=c.face||face}
    }
    if(window.__duckCharacterProgress){
      const p=window.__duckCharacterProgress(id);
      if(p){level=p.level||1;xp=p.xp||0;next=p.next||50}
    }
  }catch(e){}
  return{id,name,face,level,xp,next}
}
function getHomeStage(){
  let unlocked=1;
  try{
    unlocked=Math.max(1,Number(localStorage.getItem("doldol_unlocked_stage_v1")||1)||1);
  }catch(e){}
  return Math.max(1,Math.min(500,unlocked));
}
function stageMeta(stage){
  if(stage===1)return{title:"1. 돌무덤 초소",desc:"작은 돌 하나가 세상을 바꾼다!",img:"./assets/stage1_training.jpg"};
  if(stage===2)return{title:"2. 훈련장 진입",desc:"더 강한 적을 상대할 준비를 하자!",img:"./assets/stage2_training.jpg"};
  return{title:stage+". 특공 작전",desc:stage%5===0?"강력한 보스가 기다리고 있다!":"특공대의 다음 작전을 시작하자!",img:stage%2===0?"./assets/stage2_training.jpg":"./assets/stage1_training.jpg"};
}
function sync(){
  const c=info(),set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  set("homePlayerAvatar",c.face);
  set("homePlayerName",c.name);
  set("homePlayerLevel","Lv."+c.level);
  set("lobbyCoins",(window.__duckWallet?window.__duckWallet.coins:0).toLocaleString());
  set("homeGems",window.__doldolResources.gems.toLocaleString());
  const stage=getHomeStage(),meta=stageMeta(stage);
  set("homeStageNo","STAGE "+stage);
  set("homeStageTitle",meta.title);
  const desc=$("homeStageDesc");if(desc)desc.textContent=meta.desc;
  const img=$("homeStageImage");if(img&&img.getAttribute("src")!==meta.img)img.setAttribute("src",meta.img);
  const x=$("homePlayerXp");if(x)x.style.width=Math.min(100,c.xp/Math.max(1,c.next)*100)+"%";
}
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
const nav=document.createElement("nav");nav.className="ddBottomNav";nav.setAttribute("aria-label","메인 메뉴");
const homeBtn=document.createElement("button");homeBtn.type="button";homeBtn.className="ddNavItem isActive";homeBtn.setAttribute("aria-current","page");homeBtn.innerHTML=`<span class="ddNavIcon ddNavHomeIcon" aria-hidden="true"><i class="ddHouseRoof"></i><i class="ddHouseBody"></i><i class="ddHouseDoor"></i></span><b>홈</b>`;nav.appendChild(homeBtn);
saved.forEach(e=>{if(e.id==="lobbySettings"){e.className="ddSettings";e.innerHTML="⚙";h.appendChild(e);return}if(e.id==="lobbyStart"){e.className="ddBattleStart";e.innerHTML=`<span class="ddBattleIcon">⚔️</span><span class="ddBattleCopy"><b>전투 시작</b><small id="homeStageNo">STAGE 1</small></span><span class="ddBattleArrow">›</span>`;l.appendChild(e);return}if(e.id==="lobbyStages"){const card=document.createElement("section");card.id="homeStageCard";card.className="ddStageCard";card.setAttribute("aria-label","현재 진행 스테이지");card.innerHTML=`<img id="homeStageImage" src="./assets/stage1_training.jpg" alt="현재 스테이지"><span class="ddStageCopy"><small>현재 진행 중</small><b id="homeStageTitle">1. 돌무덤 초소</b><em id="homeStageDesc">작은 돌 하나가 세상을 바꾼다!</em></span>`;l.appendChild(card);return}if(e.id==="lobbyGrowth"){e.className="ddNavItem";e.innerHTML=`<span class="ddNavIcon ddNavTroopIcon" aria-hidden="true"><i class="ddTroopHead"></i><i class="ddTroopHelmet"></i><i class="ddTroopBody"></i></span><b>특공대</b>`;nav.appendChild(e);return}if(e.id==="lobbyGear"){e.className="ddNavItem";e.innerHTML=`<span class="ddNavIcon ddNavGearIcon" aria-hidden="true"><i class="ddBagHandle"></i><i class="ddBagBody"></i><i class="ddBagPocket"></i></span><b>장비</b>`;nav.appendChild(e);return}if(e.id==="lobbyShop"){e.className="ddNavItem";e.innerHTML=`<span class="ddNavIcon ddNavShopIcon" aria-hidden="true"><i class="ddShopAwning"></i><i class="ddShopBody"></i><i class="ddShopWindow"></i></span><b>상점</b>`;nav.appendChild(e);return}e.className="homeControl";e.innerHTML="";l.appendChild(e)});l.appendChild(nav);sync();return true}
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

/* STEP 4 — real battle/start progress controls */
#gameLobby.doldolHomeClean::before,
#gameLobby.doldolHomeClean::after,
#gameLobby.doldolHomeClean .homeHero::before,
#gameLobby.doldolHomeClean .homeHero::after{content:none!important;display:none!important;background:none!important}
#gameLobby.doldolHomeClean>.homeHero,
#gameLobby.doldolHomeClean>.homeModes,
#gameLobby.doldolHomeClean>.homeBanner,
#gameLobby.doldolHomeClean>.homeDots,
#gameLobby.doldolHomeClean>.homeNav,
#gameLobby.doldolHomeClean>.homeNoticeRow,
#gameLobby.doldolHomeClean>.homeTop{display:none!important}
#gameLobby .ddBattleStart{
  position:absolute!important;
  left:max(clamp(32px,9vw,64px),env(safe-area-inset-left))!important;
  right:max(clamp(32px,9vw,64px),env(safe-area-inset-right))!important;
  bottom:clamp(292px,25.5vh,360px)!important;
  transform:none!important;
  width:auto!important;
  min-height:clamp(76px,10.5vw,92px)!important;
  display:grid!important;
  grid-template-columns:auto 1fr auto!important;
  align-items:center!important;
  gap:clamp(10px,2vw,16px)!important;
  padding:clamp(9px,1.8vw,13px) clamp(18px,4vw,28px)!important;
  border:2px solid rgba(255,246,183,.95)!important;
  border-radius:clamp(23px,4vw,31px)!important;
  background:linear-gradient(180deg,#ffe46c 0%,#ffc53c 72%,#f1a928 100%)!important;
  color:#35250d!important;
  box-shadow:0 7px 0 #9a6425,0 13px 24px rgba(65,42,14,.32)!important;
  z-index:24!important;
  overflow:hidden!important;
  box-sizing:border-box!important;
}
#gameLobby .ddBattleStart:active{transform:translateY(3px)!important;box-shadow:0 4px 0 #9a6425,0 8px 18px rgba(65,42,14,.26)!important}
#gameLobby .ddBattleIcon{font-size:clamp(29px,6vw,42px)!important;line-height:1!important}
#gameLobby .ddBattleCopy{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;line-height:1!important}
#gameLobby .ddBattleCopy b{font-size:clamp(24px,5vw,34px)!important;font-weight:1000!important;letter-spacing:-1.2px!important}
#gameLobby .ddBattleCopy small{margin-top:6px!important;font-size:clamp(11px,2.2vw,14px)!important;font-weight:1000!important;color:#5b3c10!important}
#gameLobby .ddBattleArrow{font-size:clamp(38px,7vw,50px)!important;font-weight:800!important;line-height:.8!important}
#gameLobby .ddStageCard{
  position:absolute!important;
  left:50%!important;
  bottom:clamp(166px,14.2vh,205px)!important;
  transform:translateX(-50%)!important;
  width:min(90vw,590px)!important;
  min-height:clamp(96px,13vw,116px)!important;
  display:grid!important;
  grid-template-columns:clamp(84px,20vw,126px) minmax(0,1fr) auto!important;
  align-items:center!important;
  gap:clamp(10px,2.3vw,16px)!important;
  padding:clamp(8px,1.5vw,10px)!important;
  border:1px solid rgba(255,255,255,.38)!important;
  border-radius:clamp(22px,4vw,28px)!important;
  background:rgba(12,47,60,.92)!important;
  color:#fff!important;
  box-shadow:0 10px 24px rgba(0,0,0,.24)!important;
  z-index:23!important;
  overflow:hidden!important;
  box-sizing:border-box!important;
  text-align:left!important;
}
#gameLobby .ddStageCard img{width:100%!important;height:clamp(78px,11.5vw,96px)!important;object-fit:cover!important;border-radius:clamp(15px,2.7vw,19px)!important;display:block!important}
#gameLobby .ddStageCopy{min-width:0!important;display:flex!important;flex-direction:column!important;gap:4px!important;font-style:normal!important}
#gameLobby .ddStageCopy small{font-size:clamp(10px,2vw,13px)!important;color:#d2dde1!important}
#gameLobby .ddStageCopy b{font-size:clamp(17px,3.6vw,24px)!important;font-weight:1000!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#gameLobby .ddStageCopy em{font-size:clamp(9px,1.9vw,12px)!important;font-style:normal!important;color:#d8e2e5!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
@media(max-height:760px){
  #gameLobby .ddBattleStart{bottom:246px!important;min-height:68px!important}
  #gameLobby .ddStageCard{bottom:142px!important;min-height:90px!important}
  #gameLobby .ddStageCard img{height:74px!important}
}

/* STEP 5 — real bottom navigation */
#gameLobby .ddBottomNav{
  position:absolute!important;
  left:0!important;
  right:0!important;
  bottom:0!important;
  min-height:clamp(92px,11vh,112px)!important;
  padding:clamp(8px,1.5vw,12px) clamp(12px,3vw,22px) max(clamp(9px,1.7vw,13px),env(safe-area-inset-bottom))!important;
  display:grid!important;
  grid-template-columns:repeat(4,minmax(0,1fr))!important;
  align-items:start!important;
  gap:clamp(5px,1.5vw,10px)!important;
  box-sizing:border-box!important;
  background:linear-gradient(180deg,rgba(91,51,26,.94),rgba(49,27,16,.98))!important;
  border-top:1px solid rgba(255,218,145,.38)!important;
  box-shadow:0 -9px 24px rgba(37,21,10,.28)!important;
  z-index:26!important;
}
#gameLobby .ddNavItem{
  min-width:0!important;
  height:clamp(72px,8.6vh,88px)!important;
  margin:0!important;
  padding:clamp(5px,1vw,7px) 3px!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  gap:2px!important;
  border:1px solid transparent!important;
  border-radius:clamp(15px,2.8vw,20px)!important;
  background:transparent!important;
  color:#fff!important;
  box-shadow:none!important;
  font:inherit!important;
  box-sizing:border-box!important;
  overflow:visible!important;
  -webkit-tap-highlight-color:transparent!important;
}
#gameLobby .ddNavItem.isActive{
  border:2px solid #ffd653!important;
  background:linear-gradient(180deg,rgba(255,205,73,.20),rgba(255,171,39,.10))!important;
  box-shadow:0 0 14px rgba(255,201,64,.58),inset 0 0 12px rgba(255,210,90,.12)!important;
}
#gameLobby .ddNavIcon{
  height:clamp(42px,5.4vh,54px)!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  font-size:clamp(34px,6.7vw,47px)!important;
  line-height:1!important;
  filter:drop-shadow(0 4px 3px rgba(0,0,0,.28));
}

/* STEP 7 — game-style bottom navigation icons (CSS only; layout locked) */
#gameLobby .ddNavIcon{position:relative!important;width:clamp(42px,6.7vw,50px)!important}
#gameLobby .ddNavIcon i{position:absolute;display:block;box-sizing:border-box}

/* Home */
#gameLobby .ddHouseRoof{left:7px;top:5px;width:31px;height:31px;background:#df5a3f;border:2px solid #7c3826;border-radius:5px;transform:rotate(45deg);box-shadow:inset 3px 3px 0 #f28a61}
#gameLobby .ddHouseBody{left:8px;top:17px;width:30px;height:25px;background:#f5dfb1;border:2px solid #7b5532;border-radius:4px;box-shadow:inset 0 -5px 0 #d5b67b}
#gameLobby .ddHouseDoor{left:20px;top:27px;width:8px;height:15px;background:#8b552e;border:1px solid #5f381f;border-radius:2px}

/* Troop */
#gameLobby .ddTroopHead{left:13px;top:9px;width:23px;height:25px;background:#ffd24a;border:2px solid #9c681d;border-radius:48% 48% 45% 45%;box-shadow:inset 4px 2px 0 #ffe98b}
#gameLobby .ddTroopHelmet{left:10px;top:4px;width:29px;height:17px;background:#5b6844;border:2px solid #303b27;border-radius:18px 18px 7px 7px;box-shadow:inset 0 4px 0 #7c895f}
#gameLobby .ddTroopBody{left:10px;top:31px;width:29px;height:12px;background:#46543a;border:2px solid #283224;border-radius:7px 7px 5px 5px}

/* Equipment */
#gameLobby .ddBagHandle{left:14px;top:3px;width:22px;height:14px;border:4px solid #8c392c;border-bottom:0;border-radius:10px 10px 0 0}
#gameLobby .ddBagBody{left:7px;top:12px;width:36px;height:31px;background:#c94635;border:2px solid #762b24;border-radius:9px;box-shadow:inset 5px 0 0 #df6752,inset 0 -6px 0 #a6322a}
#gameLobby .ddBagPocket{left:15px;top:24px;width:20px;height:13px;background:#e45b45;border:2px solid #842f27;border-radius:4px}

/* Shop */
#gameLobby .ddShopBody{left:7px;top:17px;width:36px;height:26px;background:#d9a75c;border:2px solid #76512d;border-radius:3px;box-shadow:inset 0 -5px 0 #b87d3e}
#gameLobby .ddShopAwning{left:5px;top:6px;width:40px;height:16px;border:2px solid #813b2d;border-radius:6px 6px 10px 10px;background:repeating-linear-gradient(90deg,#f4eee0 0 8px,#df5b43 8px 16px);box-shadow:0 3px 0 #8b5934}
#gameLobby .ddShopWindow{left:15px;top:25px;width:20px;height:12px;background:#61b9cf;border:2px solid #5c452c;border-radius:2px;box-shadow:inset 3px 2px 0 #a7e0e8}

#gameLobby .ddNavItem b{
  font-size:clamp(11px,2.35vw,14px)!important;
  line-height:1!important;
  font-weight:900!important;
  color:#fff!important;
  text-shadow:0 2px 3px rgba(0,0,0,.55)!important;
  white-space:nowrap!important;
}
#gameLobby .ddNavItem.isActive b{color:#fff6cf!important}
#gameLobby .ddNavItem:active{transform:translateY(2px)!important}
@media(max-height:760px){
  #gameLobby .ddBottomNav{min-height:78px!important;padding-top:6px!important}
  #gameLobby .ddNavItem{height:62px!important}
  #gameLobby .ddNavIcon{height:36px!important;font-size:31px!important}
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
const old=window.__duckSyncLobby;
window.__duckSyncLobby=function(){
  if(typeof old==="function")try{old.apply(this,arguments)}catch(e){}
  sync();
};
function bindLiveState(){
  const lobby=$("gameLobby"),start=$("lobbyStart");
  if(start){
    start.onclick=function(e){
      e.preventDefault();
      const stage=getHomeStage();
      window.__selectedDuckStage=stage;
      try{localStorage.removeItem("doldol_run_skills_v1")}catch(_e){}
      if(lobby)lobby.classList.add("hidden");
      if(window.__duckStartStage)window.__duckStartStage(stage);
    };
  }
  if(lobby){
    new MutationObserver(()=>{if(!lobby.classList.contains("hidden"))sync()})
      .observe(lobby,{attributes:true,attributeFilter:["class"]});
  }
  const charScreen=$("characterScreen"),charGrid=$("charGrid"),charBack=$("charBack");
  if(charGrid&&!charGrid.dataset.homeSyncBound){
    charGrid.dataset.homeSyncBound="1";
    charGrid.addEventListener("click",()=>requestAnimationFrame(sync));
  }
  if(charBack&&!charBack.dataset.homeSyncBound){
    charBack.dataset.homeSyncBound="1";
    charBack.addEventListener("click",()=>requestAnimationFrame(sync));
  }
  if(charScreen){
    new MutationObserver(()=>{if(!charScreen.classList.contains("show"))sync()})
      .observe(charScreen,{attributes:true,attributeFilter:["class"]});
  }
  if(window.__duckWallet&&!window.__duckWallet.__homeSyncBound){
    ["addCoins","spendCoins","setCoins"].forEach(k=>{
      const fn=window.__duckWallet[k];
      if(typeof fn==="function")window.__duckWallet[k]=function(){
        const r=fn.apply(this,arguments);sync();return r;
      };
    });
    Object.defineProperty(window.__duckWallet,"__homeSyncBound",{value:true,configurable:true});
  }
}
if(!rebuild()){
  const mo=new MutationObserver(()=>{if(rebuild()){bindLiveState();mo.disconnect()}});
  mo.observe(document.documentElement,{childList:true,subtree:true});
}else bindLiveState();
window.addEventListener("storage",sync);
window.addEventListener("pageshow",sync);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync()});
})();