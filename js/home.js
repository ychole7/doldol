/* V36 CLEAN HOME — consolidated from the stable V35 HOME baseline.
   Same HOME design/functions; one initializer, one style tag, no stacked HOME fix passes. */
(function(){
if(window.__v36CleanHome)return;window.__v36CleanHome=1;
const $=id=>document.getElementById(id);



function retireLegacyTopHud(L){
 if(L.dataset.ddLegacyHudRetired==='1')return;
 const own=$('doldolHomeHud');
 [...L.children].forEach(el=>{
   if(el===own)return;
   const r=el.getBoundingClientRect();
   if(r.top<190 && r.bottom>80 && r.height<120 && r.width>40) el.classList.add('ddLegacyTopHud');
 });
 L.dataset.ddLegacyHudRetired='1';
}

function ensureHomeHud(){
 const L=$('gameLobby'); if(!L)return;
 let hud=$('doldolHomeHud');
 if(!hud){
   hud=document.createElement('div');
   hud.id='doldolHomeHud';
   hud.innerHTML=`
    <button class="ddProfile" type="button" aria-label="프로필">
      <span class="ddAvatar"></span>
      <span class="ddPlayer"><b>돌돌이</b><small>Lv.12</small><i><u></u></i></span>
    </button>
    <div class="ddCurrencies">
      <button class="ddMoney ddStone" type="button" aria-label="돌핵"><span class="ddStoneIcon">◆</span><b id="doldolHudStone">0</b><i>+</i></button>
      <button class="ddMoney ddGem" type="button" aria-label="다이아"><span>💎</span><b id="doldolHudGem">980</b><i>+</i></button>
    </div>
    <button class="ddSettings" type="button" aria-label="설정">⚙️</button>`;
   L.prepend(hud);
 }
 const stone=$('doldolHudStone');
 if(stone){
   const n=Number((window.__duckWallet&&window.__duckWallet.coins)||0);
   stone.textContent=n.toLocaleString();
 }
 return hud;
}


function apply(){
 const L=$('gameLobby'); if(!L)return;
 L.classList.add('v35cleanHome');
 retireLegacyTopHud(L);
 ensureHomeHud();

 const slogan=[...L.querySelectorAll('*')].find(e=>(e.textContent||'').trim()==='던져라! 막아라! 되돌려라!');
 if(slogan){
   let p=slogan.parentElement,best=null;
   for(let i=0;p&&p!==L&&i<6;i++,p=p.parentElement){
     const r=p.getBoundingClientRect();
     if(r.width>innerWidth*.65 && r.height>250) best=p;
   }
   if(best){best.classList.add('v35HeroClean'); slogan.classList.add('v35SloganOff');}
 }

 [...L.querySelectorAll('*')].forEach(e=>{
   const t=(e.textContent||'').replace(/\s+/g,' ').trim();
   if(t.includes('DOLDOL SPECIAL FORCE') && t.includes('작은 돌 하나가 세상을 바꾼다')){
     let p=e;
     for(let i=0;i<4 && p && p!==L;i++,p=p.parentElement){
       const r=p.getBoundingClientRect();
       if(r.width>180 && r.width<innerWidth*.9 && r.height>90 && r.height<280){p.classList.add('v35LogoOff');break;}
     }
   }
 });

 const old=$('v26stage'); if(old) old.classList.add('v35OldStageOff');
 let card=$('v35stage');
 const start=$('lobbyStart'), stages=$('lobbyStages');
 if(card && card.tagName==='BUTTON'){
   const fresh=document.createElement('div'); fresh.id='v35stage'; card.replaceWith(fresh); card=fresh;
 }
 if(!card){
   card=document.createElement('div'); card.id='v35stage';
   card.innerHTML='<span class="v35thumb"></span><span class="v35copy"><small>현재 진행 중</small><b>1. 돌무덤 초소</b><em>작은 돌 하나가 세상을 바꾼다!</em></span><i>›</i>';
   card.setAttribute('role','button'); card.tabIndex=0;
   card.onclick=()=>{if(stages)stages.click()};
   card.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&stages){e.preventDefault();stages.click()}};
   if(start) start.after(card); else L.appendChild(card);
 }
 card.classList.add('v35StageRootFixed');

 if(start){
   start.classList.add('v35CtaFixed');
   const b=start.querySelector('b'); if(b)b.textContent='전투 준비';
   const sm=start.querySelector('small'); if(sm && !/^STAGE\s/i.test(sm.textContent||'')) sm.textContent='STAGE 1';
   let a=start.querySelector('.v35Arrow');
   if(!a){a=document.createElement('i');a.className='v35Arrow';a.textContent='›';start.appendChild(a)}
 }
}

const css=document.createElement('style');
css.id='v36-clean-home-css';
css.textContent=`

/* V36 HOME-owned top HUD */
#gameLobby.v35cleanHome>#doldolHomeHud{
 position:absolute!important;z-index:50!important;left:14px!important;right:14px!important;
 top:max(12px,env(safe-area-inset-top))!important;height:58px!important;
 display:flex!important;align-items:center!important;gap:8px!important;
 pointer-events:none!important;
}
#gameLobby.v35cleanHome>#doldolHomeHud>*{pointer-events:auto!important}
#gameLobby.v35cleanHome>#doldolHomeHud~*:not(.v35HeroClean):not(#v35stage):not(#lobbyStart){
}
#doldolHomeHud .ddProfile,#doldolHomeHud .ddMoney,#doldolHomeHud .ddSettings{
 border:1px solid rgba(255,255,255,.35)!important;background:rgba(22,54,66,.88)!important;
 box-shadow:0 4px 0 rgba(0,0,0,.22),0 8px 16px rgba(0,0,0,.16)!important;color:#fff!important;
}
#doldolHomeHud .ddProfile{width:174px;height:58px;border-radius:20px;padding:5px 9px;display:flex;align-items:center;gap:8px}
#doldolHomeHud .ddAvatar{width:46px;height:46px;border-radius:14px;background-image:url('assets/player.png');background-size:cover;background-position:center;border:2px solid #fff;flex:none}
#doldolHomeHud .ddPlayer{min-width:0;text-align:left;display:flex;flex-direction:column;flex:1}
#doldolHomeHud .ddPlayer b{font-size:15px;line-height:17px;color:#fff}
#doldolHomeHud .ddPlayer small{font-size:11px;line-height:14px;color:#dbe7e9}
#doldolHomeHud .ddPlayer i{height:5px;border-radius:9px;background:rgba(0,0,0,.32);overflow:hidden;margin-top:3px}
#doldolHomeHud .ddPlayer u{display:block;width:62%;height:100%;background:#ffd54f;text-decoration:none}
#doldolHomeHud .ddCurrencies{display:flex;gap:7px;margin-left:auto}
#doldolHomeHud .ddMoney{height:48px;min-width:122px;border-radius:18px;padding:0 8px;display:flex;align-items:center;gap:7px}
#doldolHomeHud .ddMoney>span{font-size:20px}
#doldolHomeHud .ddMoney>b{font-size:17px;white-space:nowrap}
#doldolHomeHud .ddMoney>i{margin-left:auto;width:27px;height:27px;border-radius:50%;display:grid;place-items:center;background:#46a9df;font-style:normal;font-size:18px;font-weight:900}
#doldolHomeHud .ddStoneIcon{color:#ff9d32!important;text-shadow:0 0 7px rgba(255,157,50,.8);transform:rotate(45deg)}
#doldolHomeHud .ddSettings{width:48px;height:48px;border-radius:17px;font-size:24px;padding:0;flex:none}
@media(max-width:430px){
 #gameLobby.v35cleanHome>#doldolHomeHud{left:10px!important;right:10px!important;gap:5px!important}
 #doldolHomeHud .ddProfile{width:126px;padding:4px 6px;gap:5px}
 #doldolHomeHud .ddAvatar{width:40px;height:40px}
 #doldolHomeHud .ddPlayer b{font-size:13px}
 #doldolHomeHud .ddPlayer small{font-size:10px}
 #doldolHomeHud .ddMoney{min-width:88px;padding:0 6px;gap:4px}
 #doldolHomeHud .ddMoney>b{font-size:14px}
 #doldolHomeHud .ddMoney>i{width:23px;height:23px;font-size:15px}
 #doldolHomeHud .ddGem{min-width:84px}
 #doldolHomeHud .ddSettings{width:44px;height:44px}
}

#gameLobby.v35cleanHome>.ddLegacyTopHud{display:none!important}

#gameLobby.v35cleanHome{box-sizing:border-box!important;width:100%!important;max-width:100vw!important;overflow-x:hidden!important;background-image:linear-gradient(rgba(10,28,24,.06),rgba(28,74,49,.10)),url('assets/home_base_bg.png')!important;background-size:cover!important;background-position:center top!important}
#gameLobby.v35cleanHome .v35LogoOff{display:none!important}
#gameLobby.v35cleanHome .v35HeroClean{background:transparent!important;background-color:transparent!important;border-color:transparent!important;box-shadow:none!important;backdrop-filter:none!important;overflow:visible!important;min-height:360px!important;margin-top:12px!important;margin-bottom:4px!important;display:flex!important;align-items:flex-end!important;justify-content:center!important}
#gameLobby.v35cleanHome .v35HeroClean::before,#gameLobby.v35cleanHome .v35HeroClean::after{display:none!important;background:none!important;box-shadow:none!important;border:0!important}
#gameLobby.v35cleanHome .v35HeroClean>div{background-color:transparent!important;box-shadow:none!important}
#gameLobby.v35cleanHome .v35HeroClean img{transform:scale(1.16)!important;transform-origin:50% 100%!important;filter:drop-shadow(0 12px 8px rgba(0,0,0,.25))!important}
#gameLobby.v35cleanHome .v35SloganOff{display:none!important}
#v26stage.v35OldStageOff{display:none!important}
#gameLobby.v35cleanHome .v26start{box-sizing:border-box!important;position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;float:none!important;transform:none!important;translate:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;width:min(calc(100% - 48px),680px)!important;max-width:680px!important;min-width:0!important;min-height:112px!important;margin:8px auto 14px!important;padding:12px 72px!important;border:4px solid #ffe88f!important;border-radius:30px!important;background:linear-gradient(180deg,#ffdc62,#ffb72d)!important;box-shadow:0 10px 0 #9d651e,0 15px 22px rgba(0,0,0,.20)!important}
#gameLobby.v35cleanHome .v26start>span{font-size:36px!important}
#gameLobby.v35cleanHome .v26start b{font-size:31px!important}
#gameLobby.v35cleanHome .v26start small{font-size:14px!important;font-weight:900!important}
#gameLobby.v35cleanHome .v35Arrow{position:absolute!important;left:auto!important;right:24px!important;top:50%!important;bottom:auto!important;margin:0!important;transform:translateY(-52%)!important;font-style:normal!important;font-size:52px!important;line-height:1!important;color:#a86a1d!important}
#v35stage{appearance:none!important;-webkit-appearance:none!important;font:inherit!important;writing-mode:horizontal-tb!important;box-sizing:border-box!important;position:relative!important;left:auto!important;right:auto!important;transform:none!important;float:none!important;box-sizing:border-box!important;width:calc(100% - 54px)!important;max-width:680px!important;height:132px!important;margin:14px auto 24px!important;padding:10px 12px!important;display:grid!important;grid-template-columns:minmax(120px,40%) minmax(0,1fr) 28px!important;gap:13px!important;align-items:center!important;text-align:left!important;border:2px solid rgba(255,255,255,.48)!important;border-radius:27px!important;background:linear-gradient(180deg,rgba(35,62,70,.96),rgba(19,46,54,.96))!important;color:#fff!important;box-shadow:0 8px 18px rgba(0,0,0,.22)!important;overflow:hidden!important}
#v35stage>*{position:static!important;float:none!important;transform:none!important;writing-mode:horizontal-tb!important}
#v35stage .v35thumb{width:100%!important;height:108px!important;display:grid!important;place-items:center!important;border-radius:19px!important;background-image:linear-gradient(rgba(0,0,0,.04),rgba(0,0,0,.08)),url('assets/stage1_training.jpg')!important;background-size:cover!important;background-position:center 58%!important;border:2px solid rgba(255,255,255,.18)!important;line-height:1!important}
#v35stage .v35copy{min-width:0!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;writing-mode:horizontal-tb!important}
#v35stage .v35copy small{font-size:14px!important;opacity:.72!important;white-space:nowrap!important}
#v35stage .v35copy b{font-size:23px!important;line-height:1.2!important;margin-top:5px!important;white-space:nowrap!important}
#v35stage .v35copy em{font-style:normal!important;font-size:12px!important;opacity:.72!important;margin-top:6px!important;white-space:nowrap!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}
#v35stage i{font-style:normal!important;font-size:40px!important;line-height:1!important;justify-self:center!important;color:rgba(255,255,255,.86)!important}
@media(max-width:390px){
 #gameLobby.v35cleanHome .v35HeroClean{min-height:330px!important}
 #gameLobby.v35cleanHome .v35HeroClean img{transform:scale(1.10)!important}
 #gameLobby.v35cleanHome .v26start{width:calc(100% - 30px)!important;max-width:none!important;margin-left:auto!important;margin-right:auto!important;padding-left:58px!important;padding-right:58px!important}
 #v35stage{width:calc(100% - 30px)!important;grid-template-columns:37% minmax(0,1fr) 24px!important;gap:10px!important}
 #v35stage .v35copy b{font-size:18px!important}
 #v35stage .v35copy em{font-size:10px!important}
}


#v35stage.v35StageRootFixed{
  box-sizing:border-box!important;
  grid-column:1 / -1!important;
  justify-self:center!important;
  align-self:auto!important;
  flex:0 0 auto!important;
  width:min(90vw,680px)!important;
  min-width:min(90vw,680px)!important;
  max-width:calc(100vw - 24px)!important;
  height:132px!important;
  margin:14px auto 24px!important;
  padding:10px 12px!important;
  display:grid!important;
  grid-template-columns:minmax(112px,38%) minmax(0,1fr) 28px!important;
  grid-template-rows:1fr!important;
  gap:13px!important;
  align-items:center!important;
  overflow:hidden!important;
}
#v35stage.v35StageRootFixed .v35thumb{
  display:block!important;
  width:100%!important;
  min-width:0!important;
  height:108px!important;
  grid-column:1!important;
  grid-row:1!important;
}
#v35stage.v35StageRootFixed .v35copy{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
  width:auto!important;
  min-width:0!important;
  height:auto!important;
  grid-column:2!important;
  grid-row:1!important;
  overflow:visible!important;
}
#v35stage.v35StageRootFixed>i{
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
  grid-column:3!important;
  grid-row:1!important;
}
@media(max-width:390px){
 #v35stage.v35StageRootFixed{
   width:calc(100vw - 30px)!important;
   min-width:calc(100vw - 30px)!important;
   max-width:calc(100vw - 30px)!important;
   grid-template-columns:minmax(105px,36%) minmax(0,1fr) 22px!important;
   gap:9px!important;
 }
}


#gameLobby.v35cleanHome #lobbyStart.v35CtaFixed{
 box-sizing:border-box!important;position:relative!important;inset:auto!important;transform:none!important;float:none!important;
 width:min(90vw,680px)!important;min-width:0!important;max-width:calc(100vw - 30px)!important;
 min-height:0!important;height:104px!important;margin:8px auto 14px!important;padding:10px 58px 10px 34px!important;
 display:grid!important;grid-template-columns:72px minmax(0,1fr) 34px!important;grid-template-rows:1fr 28px!important;
 column-gap:12px!important;row-gap:0!important;align-items:center!important;justify-items:center!important;
 border:4px solid #ffe88f!important;border-radius:27px!important;background:linear-gradient(180deg,#ffdc62,#ffb72d)!important;
 box-shadow:0 8px 0 #9d651e,0 13px 20px rgba(0,0,0,.18)!important;color:#30220d!important;overflow:hidden!important;
}
#gameLobby.v35cleanHome #lobbyStart.v35CtaFixed>span{
 grid-column:1!important;grid-row:1 / 3!important;align-self:center!important;justify-self:center!important;
 font-size:42px!important;line-height:1!important;margin:0!important;padding:0!important;
}
#gameLobby.v35cleanHome #lobbyStart.v35CtaFixed>b{
 grid-column:2!important;grid-row:1!important;align-self:end!important;justify-self:center!important;
 font-size:31px!important;line-height:1!important;margin:0 0 5px!important;white-space:nowrap!important;
}
#gameLobby.v35cleanHome #lobbyStart.v35CtaFixed>small{
 grid-column:2!important;grid-row:2!important;align-self:start!important;justify-self:center!important;
 font-size:14px!important;line-height:1!important;font-weight:900!important;margin:0!important;white-space:nowrap!important;
}
#gameLobby.v35cleanHome #lobbyStart.v35CtaFixed>.v35Arrow{
 position:static!important;grid-column:3!important;grid-row:1 / 3!important;align-self:center!important;justify-self:center!important;
 transform:none!important;margin:0!important;font-size:52px!important;line-height:1!important;color:#a86a1d!important;
}
@media(max-width:390px){
 #gameLobby.v35cleanHome #lobbyStart.v35CtaFixed{width:calc(100vw - 30px)!important;max-width:calc(100vw - 30px)!important;height:98px!important;padding:9px 42px 9px 24px!important;grid-template-columns:62px minmax(0,1fr) 28px!important;}
 #gameLobby.v35cleanHome #lobbyStart.v35CtaFixed>span{font-size:38px!important}
 #gameLobby.v35cleanHome #lobbyStart.v35CtaFixed>b{font-size:27px!important}
 #gameLobby.v35cleanHome #lobbyStart.v35CtaFixed>.v35Arrow{font-size:46px!important}
}
`;
document.head.appendChild(css);

const run=()=>{apply();setTimeout(apply,500)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
