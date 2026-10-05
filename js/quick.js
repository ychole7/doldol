/* 돌돌 특공대 — 홈 퀵버튼(출석 / 업적) + 출석 체크
   - 홈 상단 HUD 아래 왼쪽에 세로 버튼 2개
   - 받을 게 있을 때만 빨간 점 표시
   - 의존: window.__duckWallet, window.__doldolResources, window.__duckOpenAchievements
   - 선택: window.__duckAchievementHasReward (없으면 업적 빨간 점만 안 뜸) */
(function(){
if(window.__doldolQuickInit)return;
window.__doldolQuickInit=true;

const $=id=>document.getElementById(id);
const KEY='doldol_attendance_v1';

/* 7일 주기 보상. 7일차에만 보석 포함 */
const REWARDS=[
  {core:200},
  {medkit:3},
  {grenade:3},
  {gems:100},
  {core:500},
  {medkit:3,grenade:3},
  {core:1000,gems:100,grenade:5}
];

function today(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function load(){
  try{
    const a=JSON.parse(localStorage.getItem(KEY)||'{}')||{};
    return{last:String(a.last||''),count:Math.max(0,Number(a.count)||0)};
  }catch(e){return{last:'',count:0}}
}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
function canClaim(){return load().last!==today()}
function achReady(){
  try{
    if(typeof window.__duckAchievementHasReward==='function')
      return !!window.__duckAchievementHasReward();

    if(typeof window.__duckMissionState!=='function')return false;
    const s=window.__duckMissionState()||{};
    const claimed=s.claimed||{};
    const defs=[
      ['clear5','clears',5],
      ['clear20','clears',20],
      ['clear50','clears',50],
      ['kill50','kills',50],
      ['kill200','kills',200],
      ['perfect10','perfect',10],
      ['perfect50','perfect',50],
      ['level10','levels',10],
      ['gear10','gear',10],
      ['item10','items',10],
      ['play30','plays',30]
    ];
    return defs.some(function(d){
      return Number(s[d[1]]||0)>=d[2]&&!claimed[d[0]];
    });
  }catch(e){return false}
}

/* ---------- 스타일 ---------- */
function injectStyle(){
  if($('ddQuickStyle'))return;
  const st=document.createElement('style');
  st.id='ddQuickStyle';
  st.textContent=`
#gameLobby .ddQuick{
  position:absolute;
  left:clamp(10px,2.8vw,16px);
  top:calc(max(clamp(10px,2vw,16px),env(safe-area-inset-top)) + 66px);
  display:flex;flex-direction:column;gap:8px;
  z-index:30;
}
#gameLobby .ddQuickBtn{
  position:relative;
  width:50px;height:54px;padding:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  border:1px solid #ffffff42;border-radius:15px;
  background:#123143e8;box-shadow:0 4px 11px #0004;
  color:#fff;font-family:inherit;cursor:pointer;
  -webkit-tap-highlight-color:transparent;touch-action:manipulation;
}
#gameLobby .ddQuickBtn:active{transform:translateY(2px)}
#gameLobby .ddQuickBtn i{font-style:normal;font-size:24px;line-height:1}
#gameLobby .ddQuickBtn span{font-size:10px;font-weight:800;line-height:1;letter-spacing:-.2px}
#gameLobby .ddQuickBtn .ddDot{
  position:absolute;top:-3px;right:-3px;
  width:14px;height:14px;border-radius:50%;
  background:#ff3b30;border:2px solid #fff;box-sizing:border-box;
  display:none;
}
#gameLobby .ddQuickBtn.hasDot .ddDot{display:block}

#ddAttend{
  position:fixed;inset:0;z-index:9500;display:none;
  align-items:center;justify-content:center;
  padding:calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 16px);
  background:rgba(8,18,24,.72);
  font-family:system-ui,-apple-system,sans-serif;
}
#ddAttend.show{display:flex}
#ddAttend .adCard{
  width:min(100%,420px);
  background:#123143;border:2px solid #ffffff55;border-radius:22px;
  box-shadow:0 14px 40px #000a;color:#fff;overflow:hidden;
}
#ddAttend .adHead{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px;background:#0d2433;border-bottom:1px solid #ffffff22;
}
#ddAttend .adHead b{font-size:18px}
#ddAttend .adHead small{display:block;margin-top:3px;font-size:12px;opacity:.7}
#ddAttend .adClose{
  width:34px;height:34px;border:0;border-radius:50%;
  background:#ffffff22;color:#fff;font-size:20px;line-height:1;cursor:pointer;
}
#ddAttend .adGrid{
  display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px;
}
#ddAttend .adDay{
  position:relative;min-height:96px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;
  border-radius:14px;background:#1b4560;border:1px solid #ffffff2e;
}
#ddAttend .adDay.big{grid-column:span 2}
#ddAttend .adDay.big .adRewardIcon{height:36px}
#ddAttend .adDay.big .adRewardImg,#ddAttend .adDay.big .adSvgIcon{width:38px;height:38px}
#ddAttend .adDay.big .adGemIcon{font-size:30px}
#ddAttend .adDay.big .adRewardSet.multi{gap:10px}
#ddAttend .adDay.big .adRewardLabel{font-size:9px}
#ddAttend .adDay.big .adRewardValue{font-size:12px}
#ddAttend .adDay em{font-style:normal;font-size:11px;font-weight:800;opacity:.75}
#ddAttend .adRewardSet{width:100%;display:flex;align-items:center;justify-content:center;gap:6px}
#ddAttend .adRewardSet.single .adRewardUnit{width:100%}
#ddAttend .adRewardSet.multi{gap:4px}
#ddAttend .adRewardUnit{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
#ddAttend .adRewardIcon{height:38px;display:flex;align-items:center;justify-content:center}
#ddAttend .adRewardImg{width:42px;height:42px;object-fit:cover;object-position:29% 50%;display:block}
#ddAttend .adSvgIcon{width:42px;height:42px;display:block}
#ddAttend .adSvgIcon svg{width:100%;height:100%;display:block}
#ddAttend .adGemIcon{font-size:34px;line-height:1}
#ddAttend .adRewardLabel{font-size:10px;font-weight:800;color:#fff;white-space:nowrap;line-height:1.05}
#ddAttend .adRewardValue{font-size:13px;font-weight:900;color:#ffd866;white-space:nowrap;line-height:1.05}
#ddAttend .adDay.done{opacity:.55}
#ddAttend .adDay.done::after{
  content:"✓";position:absolute;inset:0;display:grid;place-items:center;
  font-size:34px;font-weight:900;color:#7dff9c;text-shadow:0 2px 6px #0008;
}
#ddAttend .adDay.today{
  background:linear-gradient(#ffe27a,#f5b93a);border-color:#fff6cf;
  box-shadow:0 0 0 2px #ffd34e66;
}
#ddAttend .adDay.today em{color:#5b3a00;opacity:1}
#ddAttend .adDay.today strong{color:#3a2500}
#ddAttend .adFoot{padding:0 14px 16px}
#ddAttend .adBtn{
  width:100%;height:48px;border:0;border-radius:15px;
  font-size:17px;font-weight:900;cursor:pointer;
  background:linear-gradient(#ffe27a,#f5b93a);color:#3a2500;
  box-shadow:0 4px 0 #b57a12;
}
#ddAttend .adBtn:disabled{
  background:#3b5668;color:#ffffffaa;box-shadow:none;cursor:default;
}
#ddAttend .adToast{
  min-height:18px;margin-top:10px;text-align:center;
  font-size:13px;font-weight:800;color:#7dff9c;
}
@media(max-width:390px){
  #ddAttend .adGrid{gap:6px;padding:12px}
  #ddAttend .adDay{min-height:90px}
  #ddAttend .adRewardImg,#ddAttend .adSvgIcon{width:36px;height:36px}
  #ddAttend .adGemIcon{font-size:30px}
  #ddAttend .adRewardLabel{font-size:9px}
  #ddAttend .adRewardValue{font-size:12px}
}
`;
  document.head.appendChild(st);
}

/* ---------- 출석 화면 ---------- */

function iconCore(){
  return '<img class="adRewardImg core" src="./assets/doldol_stone_core.png" alt="돌핵">';
}
function iconMedkit(){
  return '<span class="adSvgIcon">'+
  '<svg viewBox="0 0 64 64" aria-hidden="true">'+
  '<rect x="10" y="17" width="44" height="34" rx="9" fill="#ef5548" stroke="#7d211c" stroke-width="3"/>'+
  '<rect x="15" y="22" width="34" height="24" rx="6" fill="#fff4e8"/>'+
  '<rect x="27" y="26" width="10" height="16" rx="2" fill="#e7433a"/>'+
  '<rect x="24" y="29" width="16" height="10" rx="2" fill="#e7433a"/>'+
  '<path d="M24 17v-5h16v5" fill="none" stroke="#4b5666" stroke-width="4" stroke-linecap="round"/>'+
  '</svg></span>';
}
function iconGrenade(){
  return '<span class="adSvgIcon">'+
  '<svg viewBox="0 0 64 64" aria-hidden="true">'+
  '<path d="M25 18h18l6 9-3 22-11 8-12-8-5-22z" fill="#7d8b35" stroke="#343b1b" stroke-width="3"/>'+
  '<path d="M24 29h22M22 38h25M30 19l-4 34M39 19l3 33" stroke="#a9b34f" stroke-width="2" opacity=".75"/>'+
  '<rect x="30" y="10" width="15" height="9" rx="2" fill="#555e69"/>'+
  '<path d="M43 12c8 0 10 6 5 10" fill="none" stroke="#727b85" stroke-width="4" stroke-linecap="round"/>'+
  '</svg></span>';
}
function iconGems(){
  return '<span class="adGemIcon">💎</span>';
}
function rewardParts(r){
  const out=[];
  if(r.core)out.push({icon:iconCore(),label:'돌핵',value:r.core.toLocaleString()});
  if(r.medkit)out.push({icon:iconMedkit(),label:'응급키트',value:'x'+r.medkit});
  if(r.grenade)out.push({icon:iconGrenade(),label:'수류탄',value:'x'+r.grenade});
  if(r.gems)out.push({icon:iconGems(),label:'보석',value:r.gems.toLocaleString()});
  return out;
}
function rewardMarkup(r){
  const parts=rewardParts(r);
  return '<div class="adRewardSet '+(parts.length>1?'multi':'single')+'">'+
    parts.map(p=>'<div class="adRewardUnit"><div class="adRewardIcon">'+p.icon+'</div>'+
    '<div class="adRewardLabel">'+p.label+'</div><div class="adRewardValue">'+p.value+'</div></div>').join('')+
    '</div>';
}

function rewardText(r){
  return rewardParts(r).map(p=>p.label+' '+p.value).join(' · ');
}
function ensureModal(){
  let m=$('ddAttend');
  if(m)return m;
  m=document.createElement('section');
  m.id='ddAttend';
  m.innerHTML=
    '<div class="adCard">'+
      '<div class="adHead"><div><b>출석 체크</b><small>매일 접속하고 보상을 받으세요</small></div>'+
      '<button class="adClose" type="button" aria-label="닫기">×</button></div>'+
      '<div class="adGrid" id="adGrid"></div>'+
      '<div class="adFoot"><button class="adBtn" id="adClaim" type="button">받기</button>'+
      '<div class="adToast" id="adToast"></div></div>'+
    '</div>';
  document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m)closeModal()});
  m.querySelector('.adClose').onclick=closeModal;
  m.querySelector('#adClaim').onclick=claim;
  return m;
}
function renderModal(){
  const m=ensureModal(),s=load(),claimedToday=s.last===today();
  const cyc=Math.floor(Math.max(0,claimedToday?s.count-1:s.count)/REWARDS.length);
  const base=cyc*REWARDS.length;
  m.querySelector('#adGrid').innerHTML=REWARDS.map((r,i)=>{
    const abs=base+i;
    let cls='adDay'+(i===REWARDS.length-1?' big':'');
    if(abs<s.count)cls+=' done';
    else if(!claimedToday&&abs===s.count)cls+=' today';
    return '<div class="'+cls+'"><em>'+(i+1)+'일차</em>'+rewardMarkup(r)+'</div>';
  }).join('');
  const btn=m.querySelector('#adClaim');
  btn.disabled=claimedToday;
  btn.textContent=claimedToday?'오늘 수령 완료':'받기';
}
function openModal(){
  ensureModal();
  renderModal();
  $('adToast').textContent='';
  $('ddAttend').classList.add('show');
}
function closeModal(){const m=$('ddAttend');if(m)m.classList.remove('show')}
function claim(){
  const s=load();
  if(s.last===today())return;
  const r=REWARDS[s.count%REWARDS.length];
  if(r.core&&window.__duckWallet)window.__duckWallet.addCoins(r.core);
  if(r.gems&&window.__doldolResources)
    window.__doldolResources.setGems(window.__doldolResources.gems+r.gems);
  if(r.medkit&&window.__duckBattleItems&&window.__duckBattleItems.add)
    window.__duckBattleItems.add('medkit',r.medkit);
  if(r.grenade&&window.__duckBattleItems&&window.__duckBattleItems.add)
    window.__duckBattleItems.add('grenade',r.grenade);
  s.last=today();
  s.count+=1;
  save(s);
  renderModal();
  $('adToast').textContent=rewardText(r)+' 획득!';
  refresh();
  if(window.__duckSyncLobby)try{window.__duckSyncLobby()}catch(e){}
  if(window.__doldolSyncHomeHud)try{window.__doldolSyncHomeHud()}catch(e){}
}

/* ---------- 홈 퀵버튼 ---------- */
function refresh(){
  const a=$('ddQuickAttend'),b=$('ddQuickAch');
  if(a)a.classList.toggle('hasDot',canClaim());
  if(b)b.classList.toggle('hasDot',achReady());
}
function makeBtn(id,icon,label,onclick){
  const b=document.createElement('button');
  b.type='button';b.id=id;b.className='ddQuickBtn';
  b.setAttribute('aria-label',label);
  b.innerHTML='<i>'+icon+'</i><span>'+label+'</span><b class="ddDot"></b>';
  b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();onclick()});
  return b;
}
function install(){
  const lobby=$('gameLobby');
  if(!lobby||!lobby.classList.contains('doldolHomeClean'))return false;
  injectStyle();
  if(!$('ddQuick')){
    const box=document.createElement('div');
    box.id='ddQuick';box.className='ddQuick';
    box.appendChild(makeBtn('ddQuickAttend','🎁','출석',openModal));
    box.appendChild(makeBtn('ddQuickAch','🏆','업적',function(){
      if(typeof window.__duckOpenAchievements==='function')window.__duckOpenAchievements();
    }));
    lobby.appendChild(box);
  }
  refresh();
  return true;
}

/* 홈은 home.js가 비동기로 다시 만들기 때문에, 준비될 때까지 기다렸다가 설치 */
function boot(){
  let tries=0;
  const t=setInterval(function(){
    tries++;
    if(install()||tries>100)clearInterval(t);
  },200);
  const old=window.__duckSyncLobby;
  window.__duckSyncLobby=function(){
    if(typeof old==='function')try{old.apply(this,arguments)}catch(e){}
    install();
  };
  setInterval(refresh,2000);
  window.addEventListener('pageshow',function(){setTimeout(refresh,0)});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(refresh,0)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
