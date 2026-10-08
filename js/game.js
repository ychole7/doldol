
/* DOLDOL SPECIAL FORCES V26 - PERSISTENT CHARACTER GROWTH */
/* DOLDOL SPECIAL FORCE V20 - Combat Variety */

(() => {
'use strict';

// ASSET LOADING V1: keep first lobby paint light, then warm battle assets in idle time.
const __duckDeferredAssets = [];
function __duckQueueAsset(img, src, priority){
  if(priority === 'critical'){
    img.src = src;
    return;
  }
  __duckDeferredAssets.push({img,src});
}
function __duckWarmDeferredAssets(){
  if(!__duckDeferredAssets.length) return;
  const batch = __duckDeferredAssets.splice(0, __duckDeferredAssets.length);
  const load = () => batch.forEach(({img,src}) => { if(!img.src) img.src = src; });
  if('requestIdleCallback' in window){
    requestIdleCallback(load,{timeout:1200});
  }else{
    setTimeout(load,350);
  }
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', () => setTimeout(__duckWarmDeferredAssets,120));
}else{
  setTimeout(__duckWarmDeferredAssets,120);
}


window.__duckStoneImg = window.__duckStoneImg || function(art, icon, name, cls){
  return '<span class="'+(cls||'stoneArtWrap')+'"><img src="'+art+'" alt="'+name+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-grid\'"><span class="stoneArtFallback" style="display:none">'+icon+'</span></span>';
};


// V24: persistent wallet shared by combat and growth screens.
window.__duckWallet = window.__duckWallet || {
  get coins(){ return Number(localStorage.getItem('doldol_coins_v1') || '12340'); },
  addCoins(n){ const v=Math.max(0,this.coins+(Number(n)||0)); localStorage.setItem('doldol_coins_v1',String(v)); return v; },
  spendCoins(n){ const cost=Math.max(0,Number(n)||0); if(this.coins<cost)return false; localStorage.setItem('doldol_coins_v1',String(this.coins-cost)); return true; },
  setCoins(n){ const v=Math.max(0,Number(n)||0); localStorage.setItem('doldol_coins_v1',String(v)); return v; }
};

const STAGE1_BG = new Image();
STAGE1_BG.decoding = "async";
STAGE1_BG.onload = () => { window.__duckStage1BgReady = true; };
STAGE1_BG.onerror = () => { window.__duckStage1BgReady = false; };
__duckQueueAsset(STAGE1_BG,"../assets/stage1_training.jpg","critical");

const STAGE2_BG = new Image();
STAGE2_BG.decoding = "async";
STAGE2_BG.onload = () => { window.__duckStage2BgReady = true; };
STAGE2_BG.onerror = () => { window.__duckStage2BgReady = false; };
__duckQueueAsset(STAGE2_BG,"../assets/stage2_training.jpg","defer");

const ENEMY_ASSAULT_IMG = new Image();
let enemyAssaultReady = false;
ENEMY_ASSAULT_IMG.onload = () => { enemyAssaultReady = true; };
ENEMY_ASSAULT_IMG.onerror = () => { enemyAssaultReady = false; };
__duckQueueAsset(ENEMY_ASSAULT_IMG,"../assets/enemy_assault.png","critical");

const ENEMY_RIFLE_IMG = new Image();
let enemyRifleReady = false;
ENEMY_RIFLE_IMG.onload = () => { enemyRifleReady = true; };
ENEMY_RIFLE_IMG.onerror = () => { enemyRifleReady = false; };
__duckQueueAsset(ENEMY_RIFLE_IMG,"../assets/enemy_rifleman.png","defer");

const ENEMY_HEAVY_IMG = new Image();
let enemyHeavyReady = false;
ENEMY_HEAVY_IMG.onload = () => { enemyHeavyReady = true; };
ENEMY_HEAVY_IMG.onerror = () => { enemyHeavyReady = false; };
__duckQueueAsset(ENEMY_HEAVY_IMG,"../assets/enemy_heavy.png","defer");

const ENEMY_BOSS_IMG = new Image();
let enemyBossReady = false;
ENEMY_BOSS_IMG.onload = () => { enemyBossReady = true; };
ENEMY_BOSS_IMG.onerror = () => { enemyBossReady = false; };
__duckQueueAsset(ENEMY_BOSS_IMG,"../assets/enemy_boss.png","defer");

const DUCK_IMG = new Image();
DUCK_IMG.onload = () => { window.__duckReady = true; };
DUCK_IMG.onerror = () => { window.__duckReady = false; };
DUCK_IMG.src = "./assets/characters/character_doldol.png";
window.__duckReady = false;


const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const wrap = document.body;

let vw=1, vh=1, dpr=1, running=false, last=0;
let player, enemies=[], rocks=[], shots=[], particles=[], damageTexts=[];
let covers=[];
let pickups=[], coins=0, xp=0, level=1, levelXp=0, nextXp=50, levelFlash=0;
let joy={active:false,id:null,baseX:0,baseY:0,x:0,y:0};
let stage=1, kills=0, total=8, clearTimer=0, message='', messageTimer=0, combo=0, comboTimer=0, shake=0, perfect=0, gate=false, intro=1.25, boss=false, paused=false;
let pendingNextStage=0;

/* =========================================================
   DOLDOL FARM MATERIALS V2
   - index.html untouched
   - isolated from legacy combat-item systems
   - enemy defeat -> chance to drop -> visible pickup -> persistent inventory
   - no crafting / no item combat effects yet
   ========================================================= */
const FARM_ITEMS_V2=[
  {id:'wood',name:'나무 조각',icon:'🪵'},
  {id:'stone',name:'단단한 돌',icon:'🪨'},
  {id:'ember',name:'불씨',icon:'🪨'},
  {id:'ice',name:'얼음 조각',icon:'❄️'},
  {id:'herb',name:'약초',icon:'🌿'},
  {id:'gem',name:'보석 조각',icon:'💎'},
  {id:'vial',name:'액체 병',icon:'🧪'},
  {id:'powder',name:'화약',icon:'💣'},
  {id:'spark',name:'전기 조각',icon:'⚡'},
  {id:'special',name:'특수 조각',icon:'⭐'}
];
const FARM_INV_KEY_V2='doldol_farm_inventory_v2';
function farmLoadV2(){
  try{
    const raw=JSON.parse(localStorage.getItem(FARM_INV_KEY_V2)||'{}');
    const out={};
    for(const item of FARM_ITEMS_V2) out[item.id]=Math.max(0,Number(raw[item.id])||0);
    return out;
  }catch(e){ return Object.fromEntries(FARM_ITEMS_V2.map(x=>[x.id,0])); }
}
let farmInventoryV2=farmLoadV2();
function farmSaveV2(){try{localStorage.setItem(FARM_INV_KEY_V2,JSON.stringify(farmInventoryV2));}catch(e){}}
function farmRandomItemV2(){return FARM_ITEMS_V2[Math.floor(Math.random()*FARM_ITEMS_V2.length)];}
function spawnFarmDropV2(x,y){
  if(Math.random()>=0.45) return false;
  const item=farmRandomItemV2();
  pickups.push({
    x:Number(x)||vw*.5,y:Number(y)||vh*.5,type:'farm',
    farmId:item.id,farmName:item.name,farmIcon:item.icon,
    life:10,bob:Math.random()*Math.PI*2,farmPicked:false
  });
  return true;
}
window.__doldolFarmV2={
  version:2,
  items:FARM_ITEMS_V2.map(x=>({...x})),
  inventory:()=>({...farmInventoryV2}),
  get:id=>Number(farmInventoryV2[id]||0),
  add:(id,n=1)=>{
    if(!farmInventoryV2[id]) farmInventoryV2[id]=0;
    farmInventoryV2[id]+=Math.max(0,Number(n)||0);
    farmSaveV2();
    try{if(window.__duckRefreshFarmInventory)window.__duckRefreshFarmInventory();}catch(e){}
    return farmInventoryV2[id];
  },
  spend:(id,n=1)=>{
    if(!farmInventoryV2[id]) farmInventoryV2[id]=0;
    const cost=Math.max(0,Number(n)||0);
    if(farmInventoryV2[id]<cost) return false;
    farmInventoryV2[id]-=cost;
    farmSaveV2();
    try{if(window.__duckRefreshFarmInventory)window.__duckRefreshFarmInventory();}catch(e){}
    return true;
  },
  reset:()=>{
    farmInventoryV2=Object.fromEntries(FARM_ITEMS_V2.map(x=>[x.id,0]));
    farmSaveV2();
    return {...farmInventoryV2};
  }
};

let upgradeOpen=false;
const upgradeChoices=['⚡ 공격속도 +12%','❤️ 최대 HP +20','🛡️ 패링 판정 +20%'];
let skillCooldown=0;
let skillTimer=0;
let skillState=null;
let skillFx=0;
let skillMessage='';
// V40: battle stone selection / ammo
const STONE_DEFS={
  basic:{icon:'🪨',art:'assets/%20%20%20%20stone_basic.png',name:'기본돌',max:Infinity,damage:1.00,color:'#9da7ae',unlock:0,role:'표준형',desc:'안정적인 기본 공격'},
  fire:{icon:'🔥',art:'assets/%20%20%20%20stone_fire.png',name:'불돌',max:1,damage:1.00,color:'#ff7043',unlock:5,role:'지속딜',desc:'적중 시 추가 화상 피해'},
  ice:{icon:'❄️',art:'assets/%20%20%20%20stone_ice.png',name:'얼음돌',max:1,damage:.95,color:'#65cfff',unlock:10,role:'제어형',desc:'적중 시 이동속도 감소'},
  bomb:{icon:'💥',art:'assets/%20%20%20%20stone_bomb.png',name:'폭발돌',max:1,damage:1.00,color:'#b9a6ff',unlock:15,role:'광역형',desc:'주변 적에게 범위 피해'},
  lightning:{icon:'⚡',art:'assets/%20%20%20%20stone_lightning.png',name:'번개돌',max:1,damage:1.00,color:'#ffd84d',unlock:20,role:'연쇄형',desc:'주변 적에게 연쇄 피해'},
  skill:{icon:'✨',art:'assets/%20%20%20%20stone_skill.png',name:'스킬돌',max:1,damage:.95,color:'#9d7cff',unlock:25,role:'특수형',desc:'적중 시 스킬 재사용 대기시간 감소'}
};
window.__duckStoneDefs=STONE_DEFS;
let selectedStone='basic';
let equippedStone='basic';
let battleStone='basic';
let stoneAmmo={basic:Infinity,fire:1,ice:1,bomb:1,lightning:1,skill:1}; // ownership flag; not consumed per shot
function resetStoneLoadout(){
  stoneAmmo={basic:Infinity,fire:1,ice:1,bomb:1,lightning:1,skill:1}; // ownership flag; not consumed per shot
  selectedStone=equippedStone||'basic';
  if(selectedStone!=='basic' && !(stoneAmmo[selectedStone]>0)) selectedStone='basic';
}
function selectStone(id){
  if(!STONE_DEFS[id]) return false;
  if(id!=='basic' && !(stoneAmmo[id]>0)){
    message='사용할 '+STONE_DEFS[id].name+'이 없습니다'; messageTimer=.7;
    return false;
  }
  selectedStone=id;
  message=STONE_DEFS[id].name+' 선택!'; messageTimer=.35;
  return true;
}
function equipStone(id){
  if(!STONE_DEFS[id]) return false;
  equippedStone=id;
  try{localStorage.setItem('doldol_prebattle_stone_v1',id);}catch(e){}
  return selectStone(id);
}
try{ equippedStone=localStorage.getItem('doldol_prebattle_stone_v1')||'basic'; }catch(e){ equippedStone='basic'; }
if(!STONE_DEFS[equippedStone]) equippedStone='basic';
// V42: expose the REAL combat stone selector to menus/UI.
window.__duckSelectStone=selectStone;
window.__duckEquipStone=equipStone;
window.__duckGetSelectedStone=()=>selectedStone;
window.__duckGetEquippedStone=()=>equippedStone;
window.__duckGetBattleStone=()=>battleStone;
function consumeSelectedStone(){
  if(selectedStone==='basic') return;
  stoneAmmo[selectedStone]=Math.max(0,(stoneAmmo[selectedStone]||0)-1);
  if(stoneAmmo[selectedStone]<=0){
    selectedStone='basic';
    message='특수돌 소진 · 기본돌로 전환'; messageTimer=.6;
  }
}
let bossIntroTimer=0, bossDefeatFx=0, bossPatternLabel='', bossPatternTimer=0;
const CHAR_SKILL_KEY='doldol_skill_progress_v1';
function loadCharacterSkillProgress(){ try{return JSON.parse(localStorage.getItem(CHAR_SKILL_KEY)||'{}')||{};}catch(e){return {};} }
function getCharacterSkillProgress(id){
  const all=loadCharacterSkillProgress(); const v=all[id]||{};
  return {level:Math.max(1,Math.min(5,Number(v.level)||1))};
}
function upgradeCharacterSkill(id){
  const all=loadCharacterSkillProgress(); const v=getCharacterSkillProgress(id);
  if(v.level>=5) return false;
  v.level++; all[id]=v; try{localStorage.setItem(CHAR_SKILL_KEY,JSON.stringify(all));}catch(e){}
  return v.level;
}
window.__duckCharacterSkillProgress=getCharacterSkillProgress;
window.__duckUpgradeCharacterSkill=upgradeCharacterSkill;
function getSkillLevel(id){ return getCharacterSkillProgress(id).level; }

function getActiveSkillDef(){
  const c=getSelectedCharacter();
  return c.skill || {name:'특공 스킬',desc:'고유 스킬',cd:9};
}
function clearSkillState(){
  if(!player) return;
  if(skillState){
    if(skillState.speedMul) player.speed/=skillState.speedMul;
    if(skillState.attackMul) player.skillAttackMul=1;
    if(skillState.parryMul) player.skillParryMul=1;
    if(skillState.perfectMul) player.skillPerfectMul=1;
    if(skillState.multiShot) player.skillMultiShot=false;
  }
  player.skillInvincible=false;
  player.skillShield=0;
  player.skillAutoParry=false;
  skillState=null;
  skillTimer=0;
}

function showBattleHud(){
  const host=document.getElementById('battleControls');
  if(!host) return;
  let hud=document.getElementById('battleHud');
  if(!hud){
    hud=document.createElement('div');
    hud.id='battleHud';
    Object.assign(hud.style,{
      position:'absolute',left:'12px',right:'12px',
      top:'calc(10px + env(safe-area-inset-top))',
      display:'flex',alignItems:'center',justifyContent:'center',
      pointerEvents:'none',zIndex:'28',fontFamily:'system-ui',
      textShadow:'0 2px 5px rgba(0,0,0,.55)'
    });
    hud.innerHTML=`
      <div id="hudStage" style="min-width:150px;padding:8px 14px;border-radius:16px;background:rgba(10,16,22,.76);border:1px solid rgba(255,255,255,.16);box-shadow:0 7px 18px rgba(0,0,0,.18);text-align:center">
        <div id="hudStageMain" style="font-size:15px;font-weight:1000;letter-spacing:.5px;color:#fff">STAGE 1</div>
        <div id="hudWave" style="font-size:10px;font-weight:800;color:#cfd6df;margin-top:1px">WAVE 1/3</div>
      </div>`;
    host.appendChild(hud);

    const left=document.createElement('div');
    left.id='hudPlayer';
    Object.assign(left.style,{
      position:'absolute',left:'0',top:'54px',width:'min(230px,46vw)',
      padding:'9px 11px',borderRadius:'14px',
      background:'rgba(10,16,22,.72)',border:'1px solid rgba(255,255,255,.15)',
      boxShadow:'0 7px 18px rgba(0,0,0,.16)',color:'#fff'
    });
    left.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span id="hudName" style="font-size:11px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></span>
        <span id="hudHpText" style="font-size:10px;font-weight:900"></span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,.13);border-radius:6px;overflow:hidden;margin-top:6px">
        <i id="hudHpBar" style="display:block;width:100%;height:100%;border-radius:6px;background:linear-gradient(90deg,#ff6262,#ff9d42);transition:width .12s ease"></i>
      </div>`;
    host.appendChild(left);

    const right=document.createElement('div');
    right.id='hudCombo';
    Object.assign(right.style,{
      position:'absolute',right:'0',top:'54px',minWidth:'88px',
      padding:'8px 10px',borderRadius:'14px',
      background:'rgba(10,16,22,.72)',border:'1px solid rgba(255,255,255,.15)',
      boxShadow:'0 7px 18px rgba(0,0,0,.16)',color:'#fff',textAlign:'center'
    });
    right.innerHTML=`
      <div style="font-size:9px;font-weight:900;color:#cfd6df">COMBO</div>
      <div id="hudComboNum" style="font-size:22px;font-weight:1000;line-height:24px;color:#ffd84d">0</div>`;
    host.appendChild(right);
  }

  const c=getSelectedCharacter();
  const waveCount=Math.max(1,Math.min(3,Math.ceil((total||1)/3)));
  const waveNow=Math.max(1,Math.min(waveCount,Math.floor((kills||0)/Math.max(1,(total||1)/waveCount))+1));
  const hp=Math.max(0,player?.hp||0);
  const maxHp=Math.max(1,player?.maxHp||120);
  const pct=Math.max(0,Math.min(100,(hp/maxHp)*100));

  const stageMain=document.getElementById('hudStageMain');
  const wave=document.getElementById('hudWave');
  const name=document.getElementById('hudName');
  const hpText=document.getElementById('hudHpText');
  const hpBar=document.getElementById('hudHpBar');
  const comboNum=document.getElementById('hudComboNum');

  if(stageMain) stageMain.textContent='STAGE '+(stage||1)+(boss?' · BOSS':'');
  if(wave) wave.textContent=`WAVE ${waveNow}/${waveCount}`;
  if(name) name.textContent=`${c.face} ${c.name}`;
  if(hpText) hpText.textContent=`${Math.ceil(hp)} / ${Math.ceil(maxHp)}`;
  if(hpBar) hpBar.style.width=pct+'%';
  if(comboNum) comboNum.textContent=String(Math.max(0,combo||0));
}

function showStoneBar(){
  const host=document.getElementById('battleControls');
  if(!host) return;
  let bar=document.getElementById('battleStoneBar');
  if(!bar){
    bar=document.createElement('div'); bar.id='battleStoneBar';
    Object.assign(bar.style,{position:'absolute',left:'50%',bottom:'14px',transform:'translateX(-50%)',display:'flex',gap:'7px',alignItems:'center',justifyContent:'center',zIndex:'31',pointerEvents:'auto',touchAction:'manipulation'});
    Object.keys(STONE_DEFS).forEach(id=>{
      const d=STONE_DEFS[id], b=document.createElement('button');
      b.type='button'; b.dataset.stone=id; b.className='battleStone';
      b.innerHTML=`<span class="stoneIcon">${d.icon}</span><span class="stoneName">${d.name}</span><b class="stoneCount">∞</b>`;
      Object.assign(b.style,{width:'62px',height:'58px',borderRadius:'15px',border:'1px solid rgba(255,255,255,.18)',background:'rgba(8,16,23,.92)',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'system-ui',padding:'3px',boxShadow:'0 5px 14px rgba(0,0,0,.28)',cursor:'pointer'});
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();selectStone(id);renderStoneBar();});
      bar.appendChild(b);
    });
    host.appendChild(bar);
  }
  bar.style.display='none';
  bar.querySelectorAll('.battleStone').forEach(b=>{
    const id=b.dataset.stone,d=STONE_DEFS[id],count=stoneAmmo[id];
    const active=id===selectedStone;
    b.style.borderColor=active?d.color:'rgba(255,255,255,.18)';
    b.style.boxShadow=active?`0 0 0 2px ${d.color}, 0 7px 18px rgba(0,0,0,.35)`:'0 5px 14px rgba(0,0,0,.28)';
    b.style.transform=active?'translateY(-3px)':'translateY(0)';
    b.style.opacity=(id!=='basic' && count<=0)?.38:'1';
    const c=b.querySelector('.stoneCount'); if(c)c.textContent=id==='basic'?'∞':String(count);
    const n=b.querySelector('.stoneName'); if(n)n.textContent=d.name;
    const ic=b.querySelector('.stoneIcon'); if(ic)ic.style.fontSize='20px';
  });
}
function renderStoneBar(){ const bar=document.getElementById('battleStoneBar'); if(bar) bar.style.display='none'; }

function getSkillVisual(id){
  const map={
    doldol:{icon:'★',accent:'#ffd84d',glow:'rgba(255,216,77,.34)'},
    nyang:{icon:'⚡',accent:'#55e7ff',glow:'rgba(85,231,255,.34)'},
    rabbit:{icon:'✦',accent:'#ff8bea',glow:'rgba(255,139,234,.34)'},
    panda:{icon:'🛡',accent:'#72d6ff',glow:'rgba(114,214,255,.34)'},
    king:{icon:'✹',accent:'#ff8a4d',glow:'rgba(255,138,77,.34)'},
    turtle:{icon:'◆',accent:'#7dff9b',glow:'rgba(125,255,155,.34)'},
    shiba:{icon:'↯',accent:'#b794ff',glow:'rgba(183,148,255,.34)'}
  };
  return map[id]||{icon:'★',accent:'#ffd84d',glow:'rgba(255,216,77,.34)'};
}
function showSkillButton(){
  const host=document.getElementById('battleControls');
  if(!host) return null;
  let b=document.getElementById('battleSkill');
  if(!b){
    b=document.createElement('button');
    b.id='battleSkill';
    b.type='button';
    b.setAttribute('aria-label','고유 스킬');
    b.innerHTML='<strong>SKILL</strong><small>고유 스킬</small>';
    Object.assign(b.style,{
      position:'absolute',right:'14px',bottom:'92px',
      width:'78px',height:'78px',borderRadius:'50%',
      border:'2px solid rgba(255,255,255,.24)',
      background:'linear-gradient(180deg,#8c5cff,#5a2fd1)',
      color:'#fff',display:'none',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      boxShadow:'0 10px 24px rgba(0,0,0,.28)',
      fontFamily:'system-ui',fontWeight:'900',zIndex:'30',
      touchAction:'manipulation',cursor:'pointer',padding:'0'
    });
    b.querySelector('strong').style.fontSize='17px';
    b.querySelector('small').style.fontSize='9px';
    b.addEventListener('pointerdown',e=>{
      e.preventDefault();
      e.stopPropagation();
      activateSkill();
    });
    host.appendChild(b);
  }
  const def=getActiveSkillDef();
  const visual=getSkillVisual(getSelectedCharacter().id);
  b.querySelector('small').textContent=skillCooldown>0 ? Math.ceil(skillCooldown)+'s' : def.name;
  b.style.display=(running?'flex':'none');
  b.style.opacity=skillCooldown>0?.58:'1';
  b.style.transform=skillCooldown>0?'scale(.96)':'scale(1)';
  b.style.borderColor=visual.accent;
  b.style.boxShadow=skillTimer>0
    ? `0 0 0 7px ${visual.glow}, 0 12px 26px rgba(0,0,0,.30)`
    : `0 10px 24px rgba(0,0,0,.28)`;
  b.title=def.name+' — '+def.desc;
  if(skillTimer>0) {
    b.style.background=`linear-gradient(180deg,${visual.accent},#ff8a22)`;
    b.querySelector('strong').textContent='ACTIVE';
  } else if(skillCooldown<=0) {
    b.style.background=`linear-gradient(180deg,${visual.accent},#6d35cf)`;
    b.querySelector('strong').textContent=visual.icon+' SKILL';
  } else {
    b.style.background='linear-gradient(180deg,#5b6270,#39404b)';
    b.querySelector('strong').textContent=visual.icon+' SKILL';
  }
  return b;
}
function activateSkill(){
  if(!running || paused || upgradeOpen || skillCooldown>0 || !player) return false;
  const c=getSelectedCharacter();
  const id=c.id;
  const skillLevel=getSkillLevel(id);
  const cd=Math.max(5,(c.skill&&c.skill.cd||9)-(skillLevel-1)*0.6);
  clearSkillState();
  skillCooldown=cd;
  skillFx=1.05;
  skillMessage=(c.skill&&c.skill.name)||'고유 스킬';
  skillState={id,attackMul:1,speedMul:1,parryMul:1,perfectMul:1,multiShot:false,skillLevel};
  if(id==='doldol'){
    player.skillInvincible=true;
    player.skillParryMul=1.45+0.06*(skillLevel-1);
    player.skillPerfectMul=1.2+0.04*(skillLevel-1);
    skillState.parryMul=player.skillParryMul; skillState.perfectMul=player.skillPerfectMul;
    skillTimer=3;
  }else if(id==='nyang'){
    player.speed*=1.45+0.06*(skillLevel-1);
    player.skillAttackMul=1.25+0.06*(skillLevel-1);
    player.skillMultiShot=false;
    skillState.speedMul=1.45+0.06*(skillLevel-1); skillState.attackMul=player.skillAttackMul;
    skillTimer=3;
  }else if(id==='rabbit'){
    player.skillPerfectMul=1.75+0.08*(skillLevel-1);
    player.skillParryMul=1.30+0.05*(skillLevel-1);
    skillState.perfectMul=player.skillPerfectMul; skillState.parryMul=player.skillParryMul;
    skillTimer=2.5;
  }else if(id==='panda'){
    player.hp=Math.min(player.maxHp,player.hp+32+8*(skillLevel-1));
    player.skillShield=1;
    skillTimer=5+0.3*(skillLevel-1);
  }else if(id==='king'){
    player.skillAttackMul=1.9+0.10*(skillLevel-1);
    player.skillMultiShot=true;
    skillState.attackMul=1.9; skillState.multiShot=true;
    skillTimer=4;
  }else if(id==='turtle'){
    player.hp=Math.min(player.maxHp,player.hp+50+10*(skillLevel-1));
    player.skillInvincible=true;
    skillTimer=2+0.2*(skillLevel-1);
  }else if(id==='shiba'){
    player.skillAutoParry=true;
    player.skillPerfectMul=1.5+0.07*(skillLevel-1);
    player.skillParryMul=1.25+0.05*(skillLevel-1);
    skillState.perfectMul=player.skillPerfectMul; skillState.parryMul=player.skillParryMul;
    skillTimer=3+0.25*(skillLevel-1);
    for(const r of rocks.slice()){
      if(!r.parried && Math.hypot(r.x-player.x,r.y-player.y)<170) parryAt(player.x,player.y);
    }
  }else{
    player.skillInvincible=true;
    skillTimer=2+0.2*(skillLevel-1);
  }
  message=skillMessage+' 발동!';
  messageTimer=.80;
  burst(player.x,player.y,28);
  shake=7;
  showSkillButton();
  return true;
}


function resize(){
  const r=cv.getBoundingClientRect();
  vw=Math.max(1,r.width); vh=Math.max(1,r.height);
  dpr=Math.min(3, window.devicePixelRatio||1);
  const bw=Math.round(vw*dpr), bh=Math.round(vh*dpr);
  if(cv.width!==bw || cv.height!==bh){ cv.width=bw; cv.height=bh; }
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
new ResizeObserver(resize).observe(wrap);
addEventListener('resize',resize);
addEventListener('orientationchange',()=>setTimeout(resize,80));
addEventListener('pageshow',resize);
resize();

const EXIT_GATE_IMG=new Image();
let EXIT_GATE_READY=false;
EXIT_GATE_IMG.onload=()=>{EXIT_GATE_READY=true;};
EXIT_GATE_IMG.onerror=()=>{EXIT_GATE_READY=false;};
EXIT_GATE_IMG.src='assets/gate/exit_gate.png';

const COVER_ART={}, COVER_READY={};
for(const id of ['sand','concrete','trap','crate','barrel']){
  COVER_READY[id]=false;
  const img=new Image();
  img.onload=()=>{COVER_READY[id]=true;};
  img.onerror=()=>{COVER_READY[id]=false;};
  img.src='assets/obstacles/'+id+'.png';
  COVER_ART[id]=img;
}
function makeCovers(){
  covers=[];
  if(stage<2)return;
  const P=[
   [[.25,.58,56,25,'sand'],[.72,.55,58,25,'concrete'],[.47,.69,48,28,'crate']],
   [[.20,.62,48,27,'barrel'],[.78,.64,56,25,'sand'],[.46,.53,50,25,'trap']],
   [[.28,.55,58,25,'concrete'],[.70,.58,48,28,'crate'],[.52,.72,52,25,'sand']],
   [[.20,.55,50,25,'trap'],[.78,.55,48,27,'barrel'],[.34,.70,50,28,'crate'],[.68,.72,56,25,'sand']],
   [[.30,.61,54,25,'sand'],[.70,.61,54,25,'concrete']]
  ],pat=P[(stage-2)%P.length];
  for(const [px,py,w,h,type] of pat)covers.push({x:vw*px,y:vh*py,w,h,r:7,type});
}
function drawVisibleCovers(){
  for(const c of covers){
    const img=COVER_ART[c.type];
    if(!COVER_READY[c.type] || !img || !img.naturalWidth) continue;
    const aspect=img.naturalWidth/img.naturalHeight;
    // Slightly larger art so every active cover is unmistakably visible.
    const dh=Math.max(68,c.h*2.65), dw=dh*aspect;
    ctx.drawImage(img,c.x-dw/2,c.y-dh*.80,dw,dh);
  }
}
function circleRectHit(c,rect){
  // Safety rule: an obstacle that has not visibly loaded can never block movement.
  if(rect && rect.type && !COVER_READY[rect.type]) return false;
  const nx=clamp(c.x,rect.x-rect.w/2,rect.x+rect.w/2);
  const ny=clamp(c.y,rect.y-rect.h/2,rect.y+rect.h/2);
  return Math.hypot(c.x-nx,c.y-ny)<c.r;
}
function moveAroundCovers(obj,dx,dy){
  const ox=obj.x,oy=obj.y;
  obj.x+=dx; obj.y+=dy;
  for(const c of covers){
    if(circleRectHit(obj,c)){
      obj.x=ox; obj.y=oy;
      return false;
    }
  }
  return true;
}
const CHARACTER_DEFS=[
  {id:'doldol',face:'🐥',name:'돌돌이',role:'밸런스형',desc:'기본에 충실한 올라운더',skill:{name:'특공대 정신',desc:'3초간 무적 + 패링 판정 강화',cd:9},mods:{atk:1.00,speed:1.00,hp:1.00,parry:1.00,move:1.00,perfect:1.00}},
  {id:'nyang',face:'🐱',name:'냥특공',role:'기동형',desc:'빠르게 움직이고 연속 공격합니다.',skill:{name:'질풍돌진',desc:'3초간 이동/공격 속도 대폭 증가',cd:8},mods:{atk:.92,speed:1.16,hp:.90,parry:.95,move:1.18,perfect:.95}},
  {id:'rabbit',face:'🐰',name:'토끼특공',role:'정밀형',desc:'완벽한 타이밍에 특화됩니다.',skill:{name:'초집중',desc:'2.5초간 PERFECT 보정 극대화',cd:8},mods:{atk:1.05,speed:.98,hp:.94,parry:1.18,move:1.04,perfect:1.25}},
  {id:'panda',face:'🐼',name:'판다특공',role:'방어형',desc:'튼튼하게 버티며 묵직하게 공격합니다.',skill:{name:'철벽 방패',desc:'5초간 보호막 1회 + HP 회복',cd:10},mods:{atk:1.10,speed:.86,hp:1.25,parry:1.05,move:.88,perfect:1.05}},
  {id:'king',face:'🤖',name:'킹특공',role:'공격형',desc:'공격력은 높지만 공격 템포가 느립니다.',skill:{name:'화력 폭주',desc:'4초간 공격력 대폭 증가 + 3연발',cd:10},mods:{atk:1.30,speed:.80,hp:.94,parry:.96,move:.92,perfect:1.10}},
  {id:'turtle',face:'🐢',name:'거북특공',role:'탱커형',desc:'최대 HP와 패링 안정성이 뛰어납니다.',skill:{name:'거대 등껍질',desc:'2초간 무적 + 큰 폭의 즉시 회복',cd:11},mods:{atk:.82,speed:.76,hp:1.40,parry:1.22,move:.78,perfect:1.00}},
  {id:'shiba',face:'🦊',name:'시바특공',role:'특수형',desc:'기동력과 PERFECT 보너스의 균형형입니다.',skill:{name:'반격 본능',desc:'3초간 자동 반격 보조 + PERFECT 강화',cd:9},mods:{atk:.98,speed:1.08,hp:.95,parry:1.10,move:1.12,perfect:1.18}},
  {id:'charge',face:'🐶',name:'돌격특공',role:'근접형',desc:'잠금 해제 후 사용할 수 있습니다.',skill:{name:'돌격',desc:'강한 근접 돌파 스킬',cd:10},mods:{atk:1.18,speed:.94,hp:1.08,parry:1.05,move:1.00,perfect:1.08},locked:true}
];
window.CHARACTER_DEFS=CHARACTER_DEFS;
/* --- V26 persistent character level / XP --- */
const CHAR_PROGRESS_KEY='doldol_character_progress_v1';
function loadCharacterProgress(){
  try{
    const raw=JSON.parse(localStorage.getItem(CHAR_PROGRESS_KEY)||'{}');
    return raw && typeof raw==='object' ? raw : {};
  }catch(e){ return {}; }
}
function saveCharacterProgress(data){ try{localStorage.setItem(CHAR_PROGRESS_KEY,JSON.stringify(data));}catch(e){} }
function getCharacterProgress(id){
  const all=loadCharacterProgress();
  const v=all[id]||{};
  return {level:Math.max(1,Number(v.level)||1),xp:Math.max(0,Number(v.xp)||0),next:Math.max(50,Number(v.next)||50)};
}
function addCharacterXP(amount,id){
  const cid=id||((localStorage.getItem('doldol_character_v1')||'doldol'));
  const all=loadCharacterProgress();
  const v=getCharacterProgress(cid);
  let gained=Math.max(0,Number(amount)||0), levels=0;
  v.xp+=gained;
  while(v.xp>=v.next && v.level<50){
    v.xp-=v.next; v.level++; levels++; v.next=Math.round(v.next*1.24);
  }
  all[cid]=v; saveCharacterProgress(all);
  return {id:cid,level:v.level,xp:v.xp,next:v.next,levels};
}
window.__duckCharacterProgress=getCharacterProgress;
window.__duckAddCharacterXP=addCharacterXP;
window.__duckIsCharacterUnlocked=isCharacterUnlocked;
function isCharacterUnlocked(c){
  if(!c) return false;
  if(!c.locked) return true;
  return getCharacterProgress(c.id).level>=10;
}
function getSelectedCharacter(){
  try{
    const id=localStorage.getItem('doldol_character_v1')||'doldol';
    return CHARACTER_DEFS.find(c=>c.id===id && isCharacterUnlocked(c))||CHARACTER_DEFS[0];
  }catch(e){ return CHARACTER_DEFS[0]; }
}
// Explicit global bridge: the growth screen must work even if this script is
// embedded in a scope where the function declaration is not globally visible.
window.__duckGetSelectedCharacter=function(){
  try{ return getSelectedCharacter(); }catch(e){
    try{
      const id=localStorage.getItem('doldol_character_v1')||'doldol';
      return CHARACTER_DEFS.find(c=>c.id===id && isCharacterUnlocked(c))||CHARACTER_DEFS[0];
    }catch(_e){ return CHARACTER_DEFS[0]; }
  }
};
function getGrowthStats(){
  try{
    const v=JSON.parse(localStorage.getItem('doldol_growth_v1')||'{}');
    return {
      atk:Number(v.atk??25),
      speed:Number(v.speed??1.2),
      hp:Number(v.hp??120),
      parry:Number(v.parry??20)
    };
  }catch(e){
    return {atk:25,speed:1.2,hp:120,parry:20};
  }
}
function getEquippedGearStats(){
  const UPGRADE_KEY='doldol_gear_upgrade_v1';
  let upgradeLevels={};
  try{upgradeLevels=JSON.parse(localStorage.getItem(UPGRADE_KEY)||'{}')||{};}catch(e){}
  const levelOf=id=>Math.max(1,Math.min(20,Number(upgradeLevels[id]||1)||1));
  const scaled=(value,id)=>Math.round((Number(value)||0)*(1+(levelOf(id)-1)*.10));
  const defs={
    helmet:{slot:'armor',def:18},vest:{slot:'armor',hp:35},heavy:{slot:'armor',def:30},light:{slot:'armor',def:22,hp:18},
    gloves:{slot:'support',special:8},boots:{slot:'support',special:10},scope:{slot:'support',atk:14,special:6},pack:{slot:'support',hp:24,special:5}
  };
  let loadout={armor:'helmet',support:'gloves'};
  try{
    const saved=JSON.parse(localStorage.getItem('doldol_gear_loadout_v1')||'{}')||{};
    if(saved.armor)loadout.armor=saved.armor;
    if(saved.support)loadout.support=saved.support;
  }catch(e){}
  const out={atk:24,def:0,hp:0,special:0,loadout:Object.assign({},loadout)};
  ['armor','support'].forEach(slot=>{
    const item=defs[loadout[slot]];
    if(!item||item.slot!==slot)return;
    const id=loadout[slot];
    out.atk+=scaled(item.atk,id); out.def+=scaled(item.def,id);
    out.hp+=scaled(item.hp,id); out.special+=scaled(item.special,id);
  });
  return out;
}
window.__duckGearStats=getEquippedGearStats;

function applyGrowthToPlayer(){
  const g=getGrowthStats();
  const c=getSelectedCharacter();
  const cp=getCharacterProgress(c.id);
  const gear=getEquippedGearStats();
  const levelMul=1+Math.min(0.35,(cp.level-1)*0.012);
  const hpMul=1+Math.min(0.30,(cp.level-1)*0.010);
  const m=c.mods||{};
  player.characterId=c.id;
  player.characterName=c.name;
  player.characterRole=c.role;
  player.characterFace=c.face;
  player.characterMods=m;
  player.growth=g;
  player.gearStats=gear;
  const previousMaxHp=Math.max(1,Number(player.maxHp)||1);
  const previousHp=Number(player.hp);
  const wasInCombat=running && Number.isFinite(previousHp);
  player.maxHp=Math.max(1,Math.round(g.hp*(m.hp||1)*hpMul + gear.hp));
  // Combat HP is persistent state. Recalculating growth/equipment must never heal it.
  player.hp=wasInCombat ? Math.max(0,Math.min(player.maxHp,previousHp)) : player.maxHp;
  player.attack=Math.max(1,Math.round(g.atk*(m.atk||1)*levelMul + gear.atk));
  player.defense=Math.max(0,Math.round(gear.def));
  const effectiveSpeed=Math.max(.35,g.speed*(m.speed||1));
  player.attackInterval=Math.max(.24,1/effectiveSpeed);
  player.parryRange=72 + Math.min(80,Math.max(0,(g.parry-20))*1.0)*(m.parry||1) + gear.special;
  player.speed=325*(m.move||1);
  player.perfectMultiplier=m.perfect||1;
}

function reset(){
  stage=1; kills=0; total=8; clearTimer=0; message=''; messageTimer=0; combo=0; comboTimer=0; shake=0; perfect=0; gate=false; intro=1.25; boss=false; paused=false; skillCooldown=0; skillTimer=0; skillState=null; skillFx=0; skillMessage='';
  player={x:vw*.5,y:vh*.80,r:24,hp:120,maxHp:120,speed:325,fire:0,inv:0,dir:0,attack:25,attackInterval:.833,parryRange:72,perfectMultiplier:1,skillAttackMul:1,skillParryMul:1,skillPerfectMul:1,skillMultiShot:false,skillInvincible:false,skillShield:0,skillAutoParry:false};
showSkillButton();
  applyGrowthToPlayer();
  enemies=[]; rocks=[]; shots=[]; particles=[]; damageTexts=[]; pickups=[];
  xp=0; level=1; levelXp=0; nextXp=50; levelFlash=0; upgradeOpen=false;
  makeCovers();
  for(let i=0;i<total;i++){
      spawnEnemy(i);
      if(!boss && stage>=8 && i===total-1){
        const elite=enemies[enemies.length-1];
        elite.elite=true;
        elite.hp=Math.round(elite.hp*1.5);
        elite.max=elite.hp;
        elite.speed*=1.12;
        elite.r+=3;
      }
    }
  running=true; last=performance.now();
}
function stageFeatureLabel(n){
  if(n%5===0) return n>=20?'FINAL BOSS · 정예 지원병':n>=15?'BOSS · 중장병 지원':n>=10?'BOSS · 혼성 지원병':'BOSS · 첫 지휘관';
  if(n>=18) return '폭격병 출현 · 전면전';
  if(n>=15) return '돌진병 출현 · 강화 혼성전';
  if(n>=11) return '정예 혼성 부대';
  if(n>=8) return '저격병 · 중장병 경계';
  if(n>=6) return '적 증원 · 전투 강화';
  return '전투 준비!';
}
function startStage(n){
  // V7: HUD wave is calculated from kills/total.
  // Do not assign an undeclared `wave` variable here; it aborts stage startup.

  // V43: the weapon/equipment menu is the single source of truth for the starting stone.
  try{ equippedStone=localStorage.getItem('doldol_prebattle_stone_v1')||'basic'; }catch(e){ equippedStone='basic'; }
  if(!STONE_DEFS[equippedStone]) equippedStone='basic';
  resetStoneLoadout();
  // Re-assert the equipped loadout after all battle state has been reset.
  selectedStone=equippedStone||'basic';
  if(selectedStone!=='basic' && !(stoneAmmo[selectedStone]>0)) selectedStone='basic';
  battleStone=selectedStone;
  if(battleStone!=='basic'){ message=STONE_DEFS[battleStone].name+' 장착 · 출격!'; messageTimer=.8; }
  if(window.__duckMissionEvent) window.__duckMissionEvent('play',1);
  window.__duckPendingNextStage=0;
  // One reward grant per actual battle run. Reset only when a new stage starts.
  window.__duckBattleRewardGranted=false;
  window.__duckLastBattleItemReward=null;
  stage=n;
  window.__duckStage=stage;
  window.__selectedDuckStage=stage;
  kills=0;
  boss=(stage%5===0);
  // V50: 출시용 초반 밸런스. 6~20은 적 수가 갑자기 튀지 않도록 완만하게 증가한다.
  const stageEnemyCounts={6:10,7:10,8:11,9:12,11:12,12:13,13:13,14:14,16:14,17:15,18:15,19:16};
  total=boss?1:(stageEnemyCounts[stage]||Math.min(16,7+Math.floor(stage*.8)));
  clearTimer=0;
  gate=false;
  skillCooldown=0; skillTimer=0; skillState=null; skillFx=0; skillMessage='';
  paused=false;
  message='';
  messageTimer=0;
  combo=0;
  comboTimer=0;
  intro=1.25;
  bossIntroTimer=boss?1.35:0; bossDefeatFx=0; bossPatternLabel=boss?'INCOMING BOSS':''; bossPatternTimer=boss?1.35:0;
  rocks=[]; shots=[]; particles=[]; damageTexts=[]; pickups=[];
  makeCovers();
  enemies=[];
  if(boss){
    const bossScale=1+Math.min(3.6,(stage-1)*.082);
    enemies.push({
      type:'boss',x:vw*.5,y:vh*.20,r:48,
      hp:Math.max(12,Math.round(12*bossScale)),
      max:Math.max(12,Math.round(12*bossScale)),
      speed:38*(1+Math.min(.45,(stage-1)*.02)),
      fire:.8/(1+Math.min(.42,(stage-1)*.018)),
      patternIndex:0,
      bossPhase:1,
      phase:0,
      moveFx:0,
      attackIndex:0,
      enraged:false,
      attackWarn:0
    });
    // V50: 5스테이지마다 보스 + 소수 지원병. 보스 패턴은 그대로 두고 조합만 단계적으로 확장한다.
    const bossSupports={
      5:['normal','sniper','normal'],
      10:['normal','sniper','fast'],
      15:['normal','sniper','tank','fast'],
      20:['normal','sniper','tank','charger']
    };
    const supportTypes=bossSupports[stage]||[];
    for(let i=0;i<supportTypes.length;i++) spawnEnemy(i,{forcedType:supportTypes[i], bossSupport:true});
    total=1+supportTypes.length;
  }else{
    for(let i=0;i<total;i++) spawnEnemy(i);
  }
  player.x=vw*.5;
  player.y=vh*.80;
  applyGrowthToPlayer();
  if(window.__duckApplyRunRewards) window.__duckApplyRunRewards();
  player.skillAttackMul=1; player.skillParryMul=1; player.skillPerfectMul=1; player.skillMultiShot=false; player.skillInvincible=false; player.skillShield=0; player.skillAutoParry=false;
  showSkillButton();
  player.hp=Math.min(player.maxHp, player.hp+25);
  player.x=clamp(player.x,32,Math.max(32,vw-32));
  player.y=clamp(player.y,vh*.20,Math.max(vh*.20,vh-90));
  player.inv=.8;
  running=true;
  last=performance.now();
}

function nextStage(){
  startStage(stage+1);
}

// GAME18: load result/transition styles from external CSS without requiring an HTML rewrite.
(function(){
  const href='CSS/result.css';
  if(!document.querySelector('link[data-doldol-result-css]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.dataset.doldolResultCss='1';
    document.head.appendChild(link);
  }
})();

// GAME18: lightweight transition before entering the next stage.
function showNextStageTransition(nextStageNumber, callback){
  let el=document.getElementById('doldolStageTransition');
  if(!el){
    el=document.createElement('div');
    el.id='doldolStageTransition';
    el.innerHTML='<div class="dstPanel"><div class="dstKicker">NEXT MISSION</div><div class="dstStage">STAGE <b id="dstStageNo">2</b></div><div class="dstSub">출격 준비</div></div>';
    document.body.appendChild(el);
  }
  const n=Math.max(1,Math.min(500,Number(nextStageNumber)||1));
  const no=el.querySelector('#dstStageNo');
  if(no) no.textContent=n;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(function(){
    el.classList.remove('show');
    if(typeof callback==='function') callback();
  },520);
}

function spawnEnemy(i,opts){
  // V46: 초기 1~5 스테이지는 적 조합이 명확하게 단계적으로 늘어난다.
  // 6스테이지 이후 기존 특수 적 해금 규칙은 그대로 유지한다.
  const pool = stage===1 ? ['normal']
             : stage===2 ? ['normal','sniper']
             : stage===3 ? ['normal','sniper','tank']
             : stage===4 ? ['normal','sniper','tank','fast']
             // V50: 6~20 적 해금. 새 타입은 한꺼번에 넣지 않고 구간별로 하나씩 추가한다.
             : stage>=18 ? ['normal','fast','tank','sniper','charger','bomber']
             : stage>=15 ? ['normal','fast','tank','sniper','charger']
             : stage>=11 ? ['normal','fast','tank','sniper']
             : stage>=8  ? ['normal','fast','sniper','tank']
             : ['normal','fast','tank'];
  const difficulty=1+Math.min(3.25,(stage-1)*.066);
  const type=(opts&&opts.forcedType)||pool[i%pool.length];
  const margin=55;
  const baseHp={tank:4,sniper:2,charger:3,bomber:3,fast:1,normal:2}[type]||2;
  const baseSpeed={tank:42,sniper:45,charger:92,bomber:50,fast:115,normal:68}[type]||68;
  const baseFire={tank:2.0,sniper:2.25,charger:1.75,bomber:2.35,fast:1.15,normal:1.55}[type]||1.55;
  const radius={tank:30,sniper:21,charger:25,bomber:27,fast:20,normal:23}[type]||23;
  const earlyLayouts={
    1:[.22,.38,.54,.70,.82,.30,.66],
    2:[.18,.34,.50,.66,.82,.28,.58,.76],
    3:[.16,.30,.44,.58,.72,.84,.24,.52,.68],
    4:[.14,.27,.40,.53,.66,.79,.86,.34,.60,.74]
  };
  const layout=earlyLayouts[stage];
  let xPos,yPos;
  if(layout){
    xPos=margin+(layout[i%layout.length])*(vw-margin*2);
    yPos=vh*.20+(0.10+((i*0.17)%0.24))*vh;
  }else{
    // Stage 5+: readable two-row formation instead of a central/random blob.
    const assumedTotal=Math.min(10,Math.max(5,5+Math.floor((stage-5)/3)));
    const frontCount=Math.ceil(assumedTotal/2);
    const front=i<frontCount;
    const rowIndex=front?i:i-frontCount;
    const rowCount=Math.max(1,front?frontCount:assumedTotal-frontCount);
    const usable=Math.min(vw*.78,410);
    const gap=rowCount>1?Math.min(92,usable/(rowCount-1)):0;
    xPos=clamp(vw*.5+(rowIndex-(rowCount-1)/2)*gap+(((i*37)%11)-5),margin,vw-margin);
    yPos=(front?vh*.45:vh*.32)+((i%2)*8-4);
  }
  enemies.push({
    type,x:xPos,y:yPos,r:radius,
    hp:Math.max(1,Math.round(baseHp*difficulty)),max:Math.max(1,Math.round(baseHp*difficulty)),
    speed:baseSpeed*(1+Math.min(.48,(stage-1)*.018)),
    fire:(.7+Math.random()*1.5)/(1+Math.min(.42,(stage-1)*.018)),
    baseFire,telegraph:0,patternIndex:0,phase:Math.random()*6.28,moveFx:0,chargeTimer:0
  });
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function burst(x,y,n=12){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, sp=40+Math.random()*150;
    particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.45+Math.random()*.35});
  }
}
function feedbackV1(kind){
  try{
    if(!navigator.vibrate) return;
    const ms=kind==='clear'?55:kind==='kill'?28:kind==='pickup'?18:kind==='parry'?22:kind==='upgrade'?30:12;
    navigator.vibrate(ms);
  }catch(e){}
}

function shootPlayer(){
  // V45: the pre-battle loadout is copied into battleStone at stage start.
  // The firing engine uses battleStone directly, so the equipped weapon cannot
  // silently fall back to the basic stone because of a stale UI variable.
  if(!battleStone || !STONE_DEFS[battleStone]) battleStone=equippedStone||'basic';
  const def=STONE_DEFS[battleStone]||STONE_DEFS.basic;
  const damage=Math.max(1,Math.round((player.attack||25)*(player.skillAttackMul||1)/25*def.damage*(window.__duckWeaponUpgradeMul?window.__duckWeaponUpgradeMul():1)));
  const stone=battleStone;
  // Core combat aim: every normal shot is aimed at a living enemy instead of
  // travelling vertically through empty space. This keeps hitEnemy() as the
  // single enemy-HP mutation path.
  let target=null, best=Infinity;
  for(const e of enemies){
    if(!e || e.dead || !(e.hp>0)) continue;
    const d=Math.hypot(e.x-player.x,e.y-player.y);
    if(d<best){best=d;target=e;}
  }
  const addShot=(angleOffset=0)=>{
    let dx=0,dy=-1;
    if(target){dx=target.x-player.x;dy=target.y-(player.y-25);}
    let a=Math.atan2(dy,dx)+angleOffset;
    const speed=520;
    shots.push({x:player.x,y:player.y-25,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:stone==='bomb'?12:7,life:2,damage,stone});
  };
  if(player.skillMultiShot){
    for(const a of [-0.12,0,0.12]) addShot(a);
  }else addShot();
  // Only special-weapon ammo is consumed. When it reaches zero, the battle
  // automatically switches to the unlimited basic stone.
  // V46: equipped special stone is a weapon, not per-shot ammunition.
  // Keep the equipped stone active for the entire battle.
  renderStoneBar();
}

function enemyShoot(e){
  const dx=player.x-e.x,dy=player.y-e.y,L=Math.hypot(dx,dy)||1;
  const base=Math.atan2(dy,dx);
  const speed=190*(1+Math.min(.35,(stage-1)*.012));
  function addRock(angle,spd,r=10,extra={}){
    rocks.push({x:e.x,y:e.y,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,r,life:4,parried:false,pattern:e.type==='boss'?'boss':e.type,source:e,...extra});
  }
  if(e.type==='boss'){
    const phase=e.bossPhase||1,idx=(e.patternIndex||0);
    const attack=(e.attackIndex||0)%4;
    e.attackIndex=(e.attackIndex||0)+1;
    if(phase===1){
      bossPatternLabel='BOSS · 부채꼴 포격'; bossPatternTimer=.7;
      for(let i=-2;i<=2;i++) addRock(base+i*.14,speed*1.02,10);
    }else if(phase===2){
      bossPatternLabel='BOSS · 연속 추격탄'; bossPatternTimer=.7;
      for(let i=0;i<3;i++) setTimeout(()=>{if(running&&!paused&&e&&!e.dead){const a=Math.atan2(player.y-e.y,player.x-e.x);addRock(a,speed*1.16,10);}},i*135);
    }else{
      if(attack===0 || attack===2){
        bossPatternLabel='BOSS · 광역 7연탄'; bossPatternTimer=.7;
        for(let i=-3;i<=3;i++) addRock(base+i*.13,speed*1.12,10);
      }else{
        bossPatternLabel='BOSS · 직격 강탄'; bossPatternTimer=.7;
        addRock(base,speed*1.55,14); addRock(base-.16,speed*1.10,9); addRock(base+.16,speed*1.10,9);
      }
    }
    e.patternIndex=idx+1; return;
  }
  if(e.type==='sniper'){
    addRock(base,speed*1.55,8,{sniper:true});
  }else if(e.type==='charger'){
    // 돌진 적은 전조 후 플레이어 방향으로 한 번 강하게 돌진한다.
    e.chargeTimer=.75;
    addRock(base-.07,speed*1.12,9); addRock(base+.07,speed*1.12,9);
  }else if(e.type==='bomber'){
    // 폭격형은 느리지만 플레이어 주변으로 넓게 퍼지는 5발을 쏜다.
    for(let i=-2;i<=2;i++) addRock(base+i*.19,speed*.9,11,{bomber:true});
  }else if(e.type==='fast' && stage>=4){
    addRock(base-.10,speed*1.08,9); addRock(base+.10,speed*1.08,9);
  }else if(e.type==='normal' && stage>=7){
    addRock(base-.075,speed,10); addRock(base+.075,speed,10);
  }else addRock(base,speed*(e.elite?1.08:1),10);
}
function combatImpactFx(e,damage,dead){
  // Visual feedback only: no HP, AI, collision or stage-flow changes.
  const power=dead?1.45:(damage>1?1.18:1);
  for(let i=0;i<(dead?12:6);i++){
    const a=Math.random()*Math.PI*2, sp=(dead?42:28)+Math.random()*(dead?58:32);
    particles.push({
      x:e.x+Math.cos(a)*5,y:e.y+Math.sin(a)*4,
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-12,
      life:(dead?.48:.28)+Math.random()*.16,
      size:(dead?3.8:2.7)+Math.random()*2.2,
      impact:true
    });
  }
  e.impactKick=.11*power;
}
function hitEnemy(e,damage=1){
  damage=Math.max(1,Number(damage)||1);
  const wasBossPhase=e.bossPhase||1;
  e.hp-=damage;
  if(e.type==='boss' && e.max>0){
    const ratio=e.hp/e.max;
    const nextPhase=ratio<=.33?3:(ratio<=.66?2:1);
    if(nextPhase!==wasBossPhase){
      e.bossPhase=nextPhase;
      e.patternIndex=0;
      e.telegraph=.55;
      e.moveFx=.7;
      message=nextPhase===2?'BOSS PHASE 2!':'BOSS PHASE 3!';
      messageTimer=1.0;
      bossPatternLabel=nextPhase===2?'PHASE 2 · 광폭화':'PHASE 3 · 최종 공격';
      bossPatternTimer=1.0;
      shake=14;
      bossIntroTimer=.65;
      e.enraged=nextPhase>=2;
      burst(e.x,e.y,28);
    }
  }
  e.hitFlash=.16;
  feedbackV1('hit');
  damageTexts.push({x:e.x,y:e.y-e.r-8,text:'-'+damage,life:.55,vy:-34,crit:damage>1});
  burst(e.x,e.y,10);
  combatImpactFx(e,damage,false);
  shake=Math.max(shake,damage>1?4:3);
  if(e.hp<=0){
    kills++;
    if(window.__duckMissionEvent) window.__duckMissionEvent("kill",1);
    feedbackV1('kill');
    if(e.type==='boss'){ bossDefeatFx=1.8; bossPatternLabel='BOSS DEFEATED!'; bossPatternTimer=1.8; shake=18; burst(e.x,e.y,54); }
    burst(e.x,e.y,18);
    combatImpactFx(e,damage,true);
    e.dead=true;
    pickups.push({x:e.x,y:e.y,type:Math.random()<.72?'coin':'xp',life:8,bob:Math.random()*6.28});
    spawnFarmDropV2(e.x,e.y);
    message='격파!';
    messageTimer=.28;
  }
}

function parryAt(x,y){
  if(!player || player.parryCd>0) return false;

  // 패링은 누른 위치가 아니라 "플레이어 바로 앞에 들어온 돌"만 잡는다.
  // 예전에는 클릭 위치 기준이라 멀리 있는 돌도 쉽게 받아칠 수 있었다.
  const range=(player.parryRange||72)*(player.skillParryMul||1);
  let best=null, bestD=Infinity;
  for(let i=rocks.length-1;i>=0;i--){
    const r=rocks[i];
    if(r.parried) continue;
    const d=Math.hypot(r.x-player.x,r.y-player.y);
    if(d<=range && d<bestD){ best=r; bestD=d; }
  }
  if(!best) return false;

  const r=best;
  const nearPlayer=bestD;
  const perfectThreshold=30 + Math.min(18,Math.max(0,(player.growth?.parry||20)-20)*0.22);
  const isPerfect=nearPlayer<perfectThreshold;

  // 패링 성공 후에는 발사자에게 정확히 되돌려 보낸다.
  let target=r.source && !r.source.dead ? r.source : null;
  if(!target){
    for(const e of enemies){
      if(e.dead) continue;
      const d=Math.hypot(r.x-e.x,r.y-e.y);
      if(!target || d<Math.hypot(r.x-target.x,r.y-target.y)) target=e;
    }
  }

  let dx=0,dy=-1;
  if(target){
    dx=target.x-r.x;
    dy=target.y-r.y;
  }
  const L=Math.hypot(dx,dy)||1;
  const reflectedSpeed=isPerfect?900:720;
  r.parried=true;
  r.owner='player';
  r.damage=Math.max(1,Math.round((player.attack||25)/25*(window.__duckWeaponUpgradeMul?window.__duckWeaponUpgradeMul():1)));
  r.vx=dx/L*reflectedSpeed;
  r.vy=dy/L*reflectedSpeed;
  r.x=player.x;
  r.y=player.y-4;
  r.life=4;

  // 연속 난타를 막아 패링 타이밍을 만들기 위한 짧은 쿨다운.
  player.parryCd=isPerfect?.18:.34;
  combo++;
  comboTimer=1.6;

  if(isPerfect){
    perfect++;
    if(window.__duckMissionEvent){ window.__duckMissionEvent("parry",1); window.__duckMissionEvent("perfect",1); }
    r.vx*=1.35; r.vy*=1.35;
    r.damage=Math.max(1,Math.round(Math.round(((player.attack||25)*(player.skillAttackMul||1))/25)*2*(player.perfectMultiplier||1)*(player.skillPerfectMul||1)*(window.__duckWeaponUpgradeMul?window.__duckWeaponUpgradeMul():1)));
    message='PERFECT PARRY!';
    messageTimer=.62;
    shake=8;
  }else{
    message='PARRY!';
    messageTimer=.38;
    shake=4;
  }
  burst(r.x,r.y,isPerfect?18:10);
  feedbackV1('parry');
  return true;
}

function chooseUpgrade(i){
  if(!upgradeOpen) return;
  if(i===0){ player.fire=Math.max(0,player.fire-.08); player.speed+=10; }
  if(i===1){ player.maxHp+=20; player.hp=player.maxHp; }
  if(i===2){ player.parryBonus=Math.min(.2,(player.parryBonus||0)+.04); }
  upgradeOpen=false; running=true; feedbackV1('upgrade'); message='강화 완료!'; messageTimer=.55; levelFlash=.55; burst(player.x,player.y,18); shake=0; last=performance.now();
}

function pointerPos(e){
  const r=cv.getBoundingClientRect();
  return {x:e.clientX-r.left,y:e.clientY-r.top};
}

addEventListener('keydown',e=>{
  if(e.code==='Space' && !e.repeat){
    e.preventDefault();
    activateSkill();
  }
});

document.getElementById('start').addEventListener('click', e=>{
  e.preventDefault();
  reset();
  e.currentTarget.style.display='none';
});

cv.addEventListener('pointerdown',e=>{
  e.preventDefault();
  const p=pointerPos(e);
  if(upgradeOpen){
    const w=Math.min(vw-36,430), h=250, x=(vw-w)/2, y=(vh-h)/2;
    const bh=45, gap=10, by=y+82;
    for(let i=0;i<3;i++){
      const yy=by+i*(bh+gap);
      if(p.x>=x+18 && p.x<=x+w-18 && p.y>=yy && p.y<=yy+bh){ chooseUpgrade(i); return; }
    }
    return;
  }
  if(!running){
    // V5: result flow owns retry/next-stage navigation.
    // Never call legacy reset() here: reset() sends the run back to STAGE 1.
    return;
  }
  if(p.y>vh*.55){
    joy.active=true; joy.id=e.pointerId; joy.baseX=p.x; joy.baseY=p.y; joy.x=p.x; joy.y=p.y;
  }
  parryAt(p.x,p.y);
});
cv.addEventListener('pointermove',e=>{
  if(!joy.active || e.pointerId!==joy.id) return;
  const p=pointerPos(e), dx=p.x-joy.baseX,dy=p.y-joy.baseY,L=Math.hypot(dx,dy),m=62;
  if(L>m){joy.x=joy.baseX+dx/L*m;joy.y=joy.baseY+dy/L*m;}
  else {joy.x=p.x;joy.y=p.y;}
});
function joyEnd(e){
  if(e.pointerId===joy.id){joy.active=false;joy.id=null;}
}
cv.addEventListener('pointerup',joyEnd);
cv.addEventListener('pointercancel',joyEnd);

function update(dt){
  if(!running || paused) return;
  if(intro>0){ intro-=dt; }

  if(player.inv>0) player.inv-=dt;
  if(player.parryCd>0) player.parryCd=Math.max(0,player.parryCd-dt);
  if(messageTimer>0) messageTimer-=dt;
  for(const d of damageTexts){ d.y+=d.vy*dt; d.vy*=.96; d.life-=dt; }
  damageTexts=damageTexts.filter(d=>d.life>0);
  if(levelFlash>0) levelFlash-=dt;
  if(skillCooldown>0) skillCooldown=Math.max(0,skillCooldown-dt);
  if(skillFx>0) skillFx=Math.max(0,skillFx-dt);
  if(bossIntroTimer>0) bossIntroTimer=Math.max(0,bossIntroTimer-dt);
  if(bossPatternTimer>0) bossPatternTimer=Math.max(0,bossPatternTimer-dt);
  if(bossDefeatFx>0) bossDefeatFx=Math.max(0,bossDefeatFx-dt);
  if(skillTimer>0){
    skillTimer-=dt;
    if(skillTimer<=0) clearSkillState();
  }
  if(player && player.skillAutoParry){
    // V2 enemy spacing: keep large sprites readable instead of stacking into one blob.
  // Gentle pairwise push; bosses/heavies get a little more personal space.
  for(let i=0;i<enemies.length;i++){
    const a=enemies[i]; if(a.dead) continue;
    for(let j=i+1;j<enemies.length;j++){
      const b=enemies[j]; if(b.dead) continue;
      let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      if(d<.01){dx=(i%2?1:-1);dy=.2;d=Math.hypot(dx,dy);}
      const ar=(a.type==='boss'?52:(a.type==='tank'?42:34));
      const br=(b.type==='boss'?52:(b.type==='tank'?42:34));
      const minD=ar+br+10;
      if(d<minD){
        const push=Math.min(5.5,(minD-d)*.10),nx=dx/d,ny=dy/d;
        a.x-=nx*push;a.y-=ny*push*.82;b.x+=nx*push;b.y+=ny*push*.82;
        a.x=clamp(a.x,30,vw-30);b.x=clamp(b.x,30,vw-30);
        a.y=clamp(a.y,vh*.12,vh*.78);b.y=clamp(b.y,vh*.12,vh*.78);
      }
    }
  }

  for(const r of rocks){
      if(!r.parried && Math.hypot(r.x-player.x,r.y-player.y)<player.parryRange*1.15){
        parryAt(player.x,player.y);
        break;
      }
    }
  }
  if(comboTimer>0){comboTimer-=dt;}else{combo=0;}
  shake=Math.max(0,shake-dt*24);

  let ax=0,ay=0;
  if(joy.active){
    ax=clamp((joy.x-joy.baseX)/62,-1,1);
    ay=clamp((joy.y-joy.baseY)/62,-1,1);
  }
  const len=Math.hypot(ax,ay)||1;
  moveAroundCovers(player,ax/len*player.speed*1.06*dt,ay/len*player.speed*1.06*dt);
  player.x=clamp(player.x,32,vw-32);
  player.y=clamp(player.y,vh*.20,vh-90);

  player.fire-=dt;
  if(player.fire<=0){player.fire=Math.max(.18,player.attackInterval/(player.skillAttackMul||1)-(level-1)*.012);shootPlayer();}

  for(const e of enemies){
    if(e.dead) continue;

    // STONE EFFECT V1: fire burn ticks independently from the initial hit.
    if(e.burnUntil && performance.now()<e.burnUntil){
      e.burnTick=(e.burnTick||0)-dt;
      if(e.burnTick<=0){
        e.burnTick=.65;
        hitEnemy(e,1);
        if(!e.dead){
          burst(e.x,e.y,5);
          damageTexts.push({x:e.x+8,y:e.y-e.r-3,text:'🔥',life:.38,vy:-18,crit:false});
        }
      }
    }else{
      e.burnUntil=0;
      e.burnTick=0;
    }

    const stoneSlow=(e.slowUntil && performance.now()<e.slowUntil)?.55:1;
    if(e.hitFlash>0) e.hitFlash-=dt;
    if(e.moveFx>0) e.moveFx-=dt;
    const dx=player.x-e.x,dy=player.y-e.y,L=Math.hypot(dx,dy)||1;
    if(e.type==='charger' && !e.dead){
      if(e.chargeTimer>0){
        e.chargeTimer-=dt;
        e.x+=dx/L*e.speed*stoneSlow*2.8*dt; e.y+=dy/L*e.speed*stoneSlow*2.8*dt;
        e.moveFx=.12;
      }else{
        e.x+=(vw*.5-e.x)*Math.min(1,dt*1.4); e.y+=(vh*.30-e.y)*Math.min(1,dt*1.4);
      }
    }else if(e.type==='sniper'){
      // V14: sniper stays in the rear and holds a side firing lane.
      const desired=315;
      if(e.roleSide==null) e.roleSide=(e.x<vw*.5?-1:1);
      const tx=vw*.5+e.roleSide*vw*.24, ty=vh*.255;
      if(L<desired){ e.x-=dx/L*e.speed*stoneSlow*.48*dt; e.y-=dy/L*e.speed*stoneSlow*.48*dt; }
      e.x+=(tx-e.x)*Math.min(1,dt*.52);
      e.y+=(ty-e.y)*Math.min(1,dt*.30);
    }else if(e.type==='bomber'){
      const desired=245;
      if(L>desired) moveAroundCovers(e,dx/L*e.speed*stoneSlow*dt,dy/L*e.speed*stoneSlow*dt);
      else e.x+=(vw*.5-e.x)*Math.min(1,dt*.7);
    }else{
      // V14: role-based spacing; combat stats and attack logic stay untouched.
      const desired=e.type==='boss'?260:e.type==='fast'?145:e.type==='tank'?205:180;
      if(e.roleSide==null) e.roleSide=(e.x<vw*.5?-1:1);
      if(L>desired){
        const roleMul=e.type==='tank'?.78:e.type==='fast'?1.12:1;
        moveAroundCovers(e,dx/L*e.speed*stoneSlow*roleMul*dt,dy/L*e.speed*stoneSlow*roleMul*dt);
        if(e.type!=='boss'){
          const spread=e.type==='tank'?.16:e.type==='fast'?.28:.22;
          const tx=vw*.5+e.roleSide*vw*spread;
          e.x+=(tx-e.x)*Math.min(1,dt*.24);
        }
      }else if(e.type==='boss'){
      e.phase+=dt;
      const bp=e.bossPhase||1;
      // 보스 이동도 페이즈별로 달라진다.
      if(bp===1){
        // 1페이즈: 느린 좌우 순환 — 공격 패턴을 읽기 쉽게
        const targetX=vw*.5+Math.sin(e.phase*.9)*vw*.28;
        const targetY=vh*.18+Math.sin(e.phase*1.7)*18;
        e.x+=(targetX-e.x)*Math.min(1,dt*(e.enraged?4.4:3.2));
        e.y+=(targetY-e.y)*Math.min(1,dt*(e.enraged?4.4:3.2));
      }else if(bp===2){
        // 2페이즈: 좌우로 크게 움직이며 간헐적으로 반대편으로 전환
        const targetX=vw*.5+Math.sin(e.phase*1.65)*vw*.34;
        const targetY=vh*.20+Math.sin(e.phase*2.4)*24;
        e.x+=(targetX-e.x)*Math.min(1,dt*5.5);
        e.y+=(targetY-e.y)*Math.min(1,dt*5.5);
      }else{
        // 3페이즈: 플레이어 위치를 일부 따라가되 상단 전투영역을 유지
        const desiredX=player.x+Math.sin(e.phase*2.2)*110;
        const desiredY=vh*.19+Math.sin(e.phase*3.1)*30;
        e.x+=(desiredX-e.x)*Math.min(1,dt*4.2);
        e.y+=(desiredY-e.y)*Math.min(1,dt*4.2);
      }
    }else if(e.type==='fast'){
      moveAroundCovers(e,-dx/L*e.speed*stoneSlow*.35*dt,-dy/L*e.speed*stoneSlow*.35*dt);
    }
    }
    e.x=clamp(e.x,30,vw-30); e.y=clamp(e.y,vh*.12,vh*.48);
    if(e.telegraph>0){
      e.telegraph-=dt;
      if(e.telegraph<=0){
        e.fire=(e.type==='boss') ? ((e.bossPhase||1)===3?.58:(e.bossPhase||1)===2?.70:.90) : (e.type==='sniper'?2.25:(e.type==='charger'?1.75:(e.type==='bomber'?2.35:(e.type==='tank'?2.0:(e.type==='fast'?1.15:1.55)))));
        enemyShoot(e);
      }
    }else{
      e.fire-=dt;
      if(e.fire<=0) e.telegraph=e.type==='boss'?((e.bossPhase||1)===3?.28:(e.bossPhase||1)===2?.24:.32):(e.type==='sniper'?.55:(e.type==='charger'?.32:(e.type==='bomber'?.42:(stage>=10?.24:.28))));
    }
  }

  // V49: 적끼리 한 점에 완전히 겹쳐 보이지 않도록 아주 약한 separation만 적용한다.
  // 전투 AI/공격 패턴은 유지하고, 시각적 가독성만 개선한다.
  for(let i=0;i<enemies.length;i++){
    const a=enemies[i]; if(!a || a.dead) continue;
    for(let j=i+1;j<enemies.length;j++){
      const b=enemies[j]; if(!b || b.dead) continue;
      let dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy);
      const minD=Math.max(34,((a.r||18)+(b.r||18))*.82);
      if(d<minD){
        if(d<.001){ dx=(i%2?1:-1); dy=(j%2?1:-1); d=Math.hypot(dx,dy); }
        const push=(minD-d)*.18, nx=dx/d, ny=dy/d;
        a.x-=nx*push; a.y-=ny*push;
        b.x+=nx*push; b.y+=ny*push;
      }
    }
    a.x=clamp(a.x,30,vw-30); a.y=clamp(a.y,vh*.12,vh*.48);
  }

  for(const s of shots){
    s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    for(const c of covers){
      if(circleRectHit(s,c)){s.life=0;burst(s.x,s.y,4);break;}
    }
    if(s.life<=0) continue;
    for(const e of enemies){
      if(e.dead) continue;
      if(Math.hypot(s.x-e.x,s.y-e.y)<s.r+e.r){
        s.life=0;
        hitEnemy(e,s.damage||1);
        if(s.stone==='bomb'){
          // Wide splash: easy to feel when enemies group up.
          for(const other of enemies){
            if(other!==e && !other.dead && Math.hypot(s.x-other.x,s.y-other.y)<112){
              hitEnemy(other,Math.max(1,Math.round((s.damage||1)*.70)));
            }
          }
          burst(s.x,s.y,30); shake=Math.max(shake,7); message='💥 범위 폭발!'; messageTimer=.42;
        }else if(s.stone==='fire'){
          // Burn for ~2.6 sec, ticking every .65 sec.
          e.burnUntil=performance.now()+2600;
          e.burnTick=.38;
          burst(e.x,e.y,14); message='🔥 화상!'; messageTimer=.38;
        }else if(s.stone==='ice'){
          // Stronger, longer slow so the control identity is obvious.
          e.slowUntil=performance.now()+2600;
          burst(e.x,e.y,12); message='❄️ 빙결 감속!'; messageTimer=.38;
        }else if(s.stone==='lightning'){
          // Chain to up to 2 nearby enemies with diminishing damage.
          let pool=enemies
            .filter(other=>other!==e && !other.dead)
            .map(other=>({other,d:Math.hypot(other.x-e.x,other.y-e.y)}))
            .filter(v=>v.d<215)
            .sort((a,b)=>a.d-b.d)
            .slice(0,2);
          pool.forEach((v,idx)=>{
            const mul=idx===0?.72:.52;
            hitEnemy(v.other,Math.max(1,Math.round((s.damage||1)*mul)));
            burst(v.other.x,v.other.y,12);
          });
          message=pool.length>1?'⚡ 2연쇄!':'⚡ 연쇄!'; messageTimer=.38;
        }else if(s.stone==='skill'){
          // Noticeable cooldown refund on every hit.
          const before=skillCooldown;
          skillCooldown=Math.max(0,skillCooldown-2.5);
          burst(s.x,s.y,14);
          message=before>0?'✨ 스킬 충전 -2.5초':'✨ 스킬 에너지!';
          messageTimer=.42;
        }
        break;
      }
    }
  }
  shots=shots.filter(s=>s.life>0 && s.y>-30);

  for(const r of rocks){
    r.x+=r.vx*dt;r.y+=r.vy*dt;r.life-=dt;
    for(const c of covers){
      if(circleRectHit(r,c)){ r.life=0; burst(r.x,r.y,6); break; }
    }
    if(r.life<=0) continue;
    if(!r.parried && player.inv<=0 && !player.skillInvincible && Math.hypot(r.x-player.x,r.y-player.y)<r.r+player.r){
      if(player.skillShield>0){
        player.skillShield=0;
        player.inv=.55;
        burst(player.x,player.y,20);
        message='방패 방어!';
        messageTimer=.38;
        r.life=0;
      }else{
        const stageDamage=14+Math.min(34,(Math.max(1,Number(stage)||1)-1)*.70);
        const incomingDamage=Math.max(1,Math.round(stageDamage*(100/(100+Math.max(0,Number(player.defense)||0)))));
          player.hp-=incomingDamage;player.inv=.55;burst(player.x,player.y,14);
        message='피격!';messageTimer=.28;
        if(player.hp<=0){
          running=false;gate=false;message='GAME OVER';messageTimer=999;
          window.__duckBattleResultSnapshot={
            stage:Math.max(1,Number(stage)||1),
            hpNow:Math.max(0,Number(player.hp)||0),
            hpMax:Math.max(1,Number(player.maxHp)||1),
            perfectCount:Math.max(0,Number(perfect)||0)
          };
          try{if(window.__duckShowResult)window.__duckShowResult(false)}catch(e){}
        }
        r.life=0;
      }
    }
    if(r.parried){
      for(const e of enemies){
        if(e.dead) continue;
        if(Math.hypot(r.x-e.x,r.y-e.y)<r.r+e.r){r.life=0;hitEnemy(e,r.damage||1);break;}
      }
    }
  }
  rocks=rocks.filter(r=>r.life>0 && r.x>-50 && r.x<vw+50 && r.y>-50 && r.y<vh+50);

  for(const p of pickups){
    p.life-=dt; p.bob+=dt*4;
    const d=Math.hypot(p.x-player.x,p.y-player.y);
    if(d<42){
      if(p.type==='coin'){
        const walletCoins=window.__duckWallet.addCoins(1);
        message='+1 COIN  ·  '+walletCoins.toLocaleString();
        if(window.__duckSyncLobby)window.__duckSyncLobby();
      }else if(p.type==='farm'){
        const count=window.__doldolFarmV2.add(p.farmId,1);
        message=(p.farmIcon||'⭐')+' '+(p.farmName||'재료')+' +1';
        messageTimer=.65;
        p.farmPicked=true;
        feedbackV1('pickup');
      }else{
        const gained=10;
        xp+=gained;
        levelXp+=gained;
        const prog=window.__duckAddCharacterXP?window.__duckAddCharacterXP(gained,player.characterId):null;if(window.__duckRefreshCharacters)window.__duckRefreshCharacters();
        message='+'+gained+' XP';
        if(levelXp>=nextXp){
          level++;
          levelXp-=nextXp;
          nextXp=Math.round(nextXp*1.28);
          levelFlash=1.15;
          message='';
          messageTimer=0;
          // Combat level-up does not refill HP.
          // V47: 레벨업은 전투를 멈추거나 선택창을 띄우지 않는다.
          // 기존 자동 성장(레벨에 따른 공격 템포/HP 회복)은 유지하고,
          // 전투 화면에는 짧은 LEVEL UP 안내만 표시한다.
          upgradeOpen=false;
          running=true;
          burst(player.x,player.y,24);
          feedbackV1('levelup');
        }
        if(prog && prog.levels>0){
          player.characterLevel=prog.level;
          message='🎉 '+player.characterName+' Lv.'+prog.level+' UP!';
          messageTimer=1.35;
          levelFlash=1.35;
          applyGrowthToPlayer();
          burst(player.x,player.y,30);
          feedbackV1('levelup');
        }
      }
      messageTimer=Math.max(messageTimer,.32);
      burst(p.x,p.y,8);
      p.life=0;
    }else if(d<130){
      const dx=player.x-p.x,dy=player.y-p.y,L=Math.hypot(dx,dy)||1;
      p.x+=dx/L*80*dt;p.y+=dy/L*80*dt;
    }
  }
  pickups=pickups.filter(p=>p.life>0);

  for(const d of damageTexts){
    // drawn in draw()
  }

  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;}
  particles=particles.filter(p=>p.life>0);

  enemies=enemies.filter(e=>!e.dead);

  // V-GATE-FLOW: 적 전멸 후에는 결과 화면으로 가지 않는다.
  // 1) 파밍 가능 상태 유지 → 2) 관문 오픈 → 3) 플레이어가 직접 관문 통과 → 4) 결과 화면
  if(enemies.length===0 && !gate){
    clearTimer+=dt;
    if(clearTimer>.8){
      gate=true;
      running=true;
      message='관문이 열렸습니다!  관문으로 이동하세요';
      messageTimer=1.4;
      burst(vw*.5,vh*.18,36);
    }
  }

  // 관문에 실제로 도착했을 때만 스테이지 클리어 처리
  if(gate && running){
    const gx=vw*.5, gy=vh*.18;
    if(Math.hypot(player.x-gx,player.y-gy)<82){
      gate=false;
      running=false;
      if(window.__duckMissionEvent) window.__duckMissionEvent('clear',1);
      message='STAGE CLEAR!';
      messageTimer=999;
      burst(gx,gy,42);
      window.__duckBattleResultSnapshot={
        stage:Math.max(1,Number(stage)||1),
        hpNow:Math.max(0,Number(player.hp)||0),
        hpMax:Math.max(1,Number(player.maxHp)||1),
        perfectCount:Math.max(0,Number(perfect)||0)
      };
      try{if(window.__duckShowResult)window.__duckShowResult(true)}catch(e){}
    }
  }
}

function roundRect(x,y,w,h,r){
  r=Math.min(r,w/2,h/2);ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function drawDuck(x,y,scale=1){
  ctx.save();
  ctx.translate(x,y);
  if(window.__duckReady && DUCK_IMG.naturalWidth){
    const w=58*scale, h=64*scale;
    ctx.shadowColor='rgba(0,0,0,.35)';
    ctx.shadowBlur=10;
    ctx.shadowOffsetY=7;
    ctx.drawImage(DUCK_IMG,-w/2,-h*.62,w,h);
  }else{
    ctx.fillStyle='#f2c94c';ctx.beginPath();ctx.arc(0,0,24*scale,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f28b30';ctx.beginPath();ctx.ellipse(18*scale,3*scale,13*scale,8*scale,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#15191f';ctx.beginPath();ctx.arc(9*scale,-8*scale,3.5*scale,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#61707b';roundRect(-18*scale,-29*scale,36*scale,13*scale,5*scale);ctx.fill();
  }
  ctx.restore();
}
function drawEnemy(e){
  ctx.save();
  ctx.translate(e.x,e.y);
  if(e.impactKick>0){
    const k=Math.min(1,e.impactKick/.13);
    ctx.scale(1+k*.07,1-k*.06);
    e.impactKick=Math.max(0,e.impactKick-.018);
  }
  const r=e.r;
  const hitFlash=e.hitFlash||0;
  if(hitFlash>0){ctx.globalAlpha=Math.min(1,hitFlash/.16);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,r+5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  ctx.shadowColor='rgba(0,0,0,.28)';ctx.shadowBlur=9;ctx.shadowOffsetY=5;

  // V48: 모든 실전 적 타입은 캐릭터 아트로 렌더링한다.
  // 이미지 로딩이 늦더라도 SNIPER/FAST 등이 예전 원형 임시 적으로 돌아가지 않도록
  // 준비된 다른 캐릭터 아트를 안전한 fallback으로 사용한다.
  let art=null, ew=58, eh=68, badge='';
  if(e.type==='boss'){
    if(enemyBossReady && ENEMY_BOSS_IMG.naturalWidth){ art=ENEMY_BOSS_IMG; ew=104; eh=112; }
  }else if(e.type==='tank'){
    if(enemyHeavyReady && ENEMY_HEAVY_IMG.naturalWidth){ art=ENEMY_HEAVY_IMG; ew=78; eh=82; }
    else if(enemyAssaultReady && ENEMY_ASSAULT_IMG.naturalWidth){ art=ENEMY_ASSAULT_IMG; ew=64; eh=74; }
  }else if(e.type==='sniper'){
    if(enemyRifleReady && ENEMY_RIFLE_IMG.naturalWidth){ art=ENEMY_RIFLE_IMG; ew=58; eh=74; }
    else if(enemyAssaultReady && ENEMY_ASSAULT_IMG.naturalWidth){ art=ENEMY_ASSAULT_IMG; ew=56; eh=68; }
  }else if(e.type==='fast'){
    // FAST 전용 아트는 출시 후 확장. V1에서는 돌격병 아트를 재사용하되 작고 빠르게 보이게 한다.
    if(enemyAssaultReady && ENEMY_ASSAULT_IMG.naturalWidth){ art=ENEMY_ASSAULT_IMG; ew=52; eh=62; badge='⚡'; }
  }else if(e.type==='charger'){
    if(enemyHeavyReady && ENEMY_HEAVY_IMG.naturalWidth){ art=ENEMY_HEAVY_IMG; ew=68; eh=74; badge='➜'; }
    else if(enemyAssaultReady && ENEMY_ASSAULT_IMG.naturalWidth){ art=ENEMY_ASSAULT_IMG; ew=58; eh=68; }
  }else if(e.type==='bomber'){
    if(enemyRifleReady && ENEMY_RIFLE_IMG.naturalWidth){ art=ENEMY_RIFLE_IMG; ew=60; eh=76; badge='●'; }
    else if(enemyAssaultReady && ENEMY_ASSAULT_IMG.naturalWidth){ art=ENEMY_ASSAULT_IMG; ew=58; eh=68; }
  }else{
    if(enemyAssaultReady && ENEMY_ASSAULT_IMG.naturalWidth){ art=ENEMY_ASSAULT_IMG; ew=72; eh=84; } // V49: 돌격병 체감 크기 약 10% 추가 확대
  }

  if(art){
    ctx.shadowColor=e.type==='boss'?'rgba(0,0,0,.38)':'rgba(0,0,0,.30)';
    ctx.shadowBlur=e.type==='boss'?12:8;ctx.shadowOffsetY=e.type==='boss'?7:5;
    ctx.drawImage(art,-ew/2,-eh*.68,ew,eh);
    ctx.shadowColor='transparent';
    if(badge){
      ctx.font='900 14px system-ui';ctx.textAlign='center';
      ctx.fillStyle=e.type==='fast'?'#ffe36b':e.type==='charger'?'#ffb45f':'#d9a4ff';
      ctx.fillText(badge,ew*.34,-eh*.48);
    }
  }else{
    // 첫 프레임 등 모든 이미지가 아직 준비되지 않은 극히 짧은 순간만 사용하는 중립 fallback.
    ctx.fillStyle=e.type==='boss'?'#633452':'#59636b';
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    ctx.shadowColor='transparent';
  }
  ctx.restore();
}
function drawUpgrade(){
  if(!upgradeOpen) return;
  ctx.save();
  ctx.fillStyle='rgba(8,12,18,.76)'; ctx.fillRect(0,0,vw,vh);
  const w=Math.min(vw-36,430), h=250, x=(vw-w)/2, y=(vh-h)/2;
  ctx.fillStyle='#fff8e7'; roundRect(x,y,w,h,22); ctx.fill();
  ctx.fillStyle='#35281d'; ctx.font='900 25px system-ui'; ctx.textAlign='center'; ctx.fillText('LEVEL UP!',vw/2,y+42);
  ctx.font='700 15px system-ui'; ctx.fillStyle='#78624d'; ctx.fillText('강화 하나를 선택하세요',vw/2,y+67);
  const bh=45, gap=10, by=y+82;
  for(let i=0;i<3;i++){
    const bx=x+18, bw=w-36, yy=by+i*(bh+gap);
    ctx.fillStyle='#f0d39a'; roundRect(bx,yy,bw,bh,13); ctx.fill();
    ctx.fillStyle='#3b2b20'; ctx.font='800 17px system-ui'; ctx.fillText((i+1)+'  '+upgradeChoices[i],vw/2,yy+29);
  }
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,vw,vh);

  const sx=shake?(Math.random()-.5)*shake:0;
  const sy=shake?(Math.random()-.5)*shake:0;
  ctx.save();
  ctx.translate(sx,sy);

  // Training-camp background rotation.
  // Stage 1/2 keep their original backgrounds; stage 3+ reuse them alternately
  // so later stages never fall back to the old black placeholder arena.
  const bg = stage===1 ? STAGE1_BG : (stage===2 ? STAGE2_BG : (stage % 2 === 1 ? STAGE1_BG : STAGE2_BG));
  if(bg && bg.complete && bg.naturalWidth){
    const iw=bg.naturalWidth, ih=bg.naturalHeight;
    const scale=Math.max(vw/iw,vh/ih);
    const dw=iw*scale, dh=ih*scale;
    ctx.drawImage(bg,(vw-dw)/2,(vh-dh)/2,dw,dh);
  }else{
    // Fallback only if the background image fails to load.
    const g=ctx.createLinearGradient(0,0,0,vh);
    g.addColorStop(0,'#26303a');g.addColorStop(1,'#141a22');ctx.fillStyle=g;ctx.fillRect(0,0,vw,vh);

    ctx.strokeStyle='rgba(255,255,255,.035)';ctx.lineWidth=1;
    for(let x=0;x<vw;x+=42){ctx.beginPath();ctx.moveTo(x,vh*.45);ctx.lineTo(x,vh);ctx.stroke();}
    for(let y=vh*.45;y<vh;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(vw,y);ctx.stroke();}

    for(let i=0;i<5;i++){
      const px=42+i*((vw-84)/4), py=vh*.57+(i%2)*vh*.16;
      ctx.fillStyle='rgba(92,106,112,.38)';
      roundRect(px-18,py-12,36,24,7);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=2;ctx.stroke();
    }
    ctx.fillStyle='rgba(255,216,102,.16)';
    roundRect(vw*.5-58,vh*.47,116,4,2);ctx.fill();

    for(const c of covers){
      ctx.fillStyle='rgba(81,94,101,.72)';
      roundRect(c.x-c.w/2,c.y-c.h/2,c.w,c.h,c.r);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.08)';
      roundRect(c.x-c.w/2+7,c.y-c.h/2+6,c.w-14,7,4);ctx.fill();
    }
  }

  // Draw the exact collision obstacles on top of every background.
  // This must live in draw(), not update(), otherwise clearRect erases them
  // and they behave like invisible walls.
  drawVisibleCovers();

  for(const p of pickups){
    const bob=Math.sin(p.bob)*3;
    ctx.save();ctx.translate(p.x,p.y+bob);
    if(p.type==='coin'){
      ctx.fillStyle='#ffd34f';ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff0a6';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#7a5510';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillText('₩',0,4);
    }else if(p.type==='farm'){
      const pulse=1+Math.sin(performance.now()/150)*.08;
      ctx.globalAlpha=.18;ctx.fillStyle='#ffd866';ctx.beginPath();ctx.arc(0,0,18*pulse,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      ctx.font='24px "Apple Color Emoji","Segoe UI Emoji",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(p.farmIcon||'⭐',0,1);
      ctx.textBaseline='alphabetic';
      ctx.font='800 9px system-ui';ctx.fillStyle='#fff';ctx.fillText(p.farmName||'재료',0,23);
    }else{
      ctx.fillStyle='#76d8ff';ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#e8fbff';ctx.font='900 9px system-ui';ctx.textAlign='center';ctx.fillText('XP',0,3);
    }
    ctx.restore();
  }

  // V21 boss cinematic overlay / attack callout
  if(bossIntroTimer>0 && boss){
    const t=1-Math.max(0,bossIntroTimer)/1.35;
    ctx.save();
    ctx.fillStyle='rgba(120,0,0,'+(0.12+0.18*Math.sin(t*Math.PI))+')';ctx.fillRect(0,0,vw,vh);
    ctx.strokeStyle='rgba(255,90,90,.75)';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(vw/2,vh*.20,58+24*Math.sin(performance.now()/100),0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 30px system-ui';ctx.textAlign='center';ctx.fillText('⚠ BOSS INCOMING',vw/2,vh*.34);
    ctx.fillStyle='#ffb5b5';ctx.font='800 13px system-ui';ctx.fillText('패턴을 읽고 PARRY 타이밍을 잡으세요',vw/2,vh*.34+25);
    ctx.restore();
  }
  if(bossPatternTimer>0 && bossPatternLabel){
    const a=Math.min(1,bossPatternTimer*2.5);
    ctx.save();ctx.globalAlpha=a;
    const bw=Math.min(vw-48,300),bh=38,bx=(vw-bw)/2,by=vh*.38;
    ctx.fillStyle='rgba(8,12,18,.88)';roundRect(bx,by,bw,bh,19);ctx.fill();
    ctx.strokeStyle='rgba(255,110,110,.65)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 13px system-ui';ctx.textAlign='center';ctx.fillText(bossPatternLabel,vw/2,by+24);ctx.restore();
  }
  if(bossDefeatFx>0){
    ctx.save();const p=1-bossDefeatFx/1.8;ctx.globalAlpha=Math.max(0,bossDefeatFx/1.8);
    ctx.strokeStyle='#ffd866';ctx.lineWidth=7;
    ctx.beginPath();ctx.arc(vw*.5,vh*.20,55+p*180,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 28px system-ui';ctx.textAlign='center';ctx.fillText('BOSS DEFEATED!',vw/2,vh*.34);ctx.restore();
  }

  // Top HUD is rendered by showBattleHud() as DOM.
  // Keep the canvas layer free of duplicate HUD panels so the stage/player/
  // combo cards do not overlap on mobile screens.

  if(boss && enemies[0] && !enemies[0].dead){
    const be=enemies[0], bw=Math.min(vw-56,360), bx=(vw-bw)/2, by=vh*.105;
    ctx.fillStyle='rgba(8,12,18,.78)';roundRect(bx,by,bw,26,13);ctx.fill();
    ctx.fillStyle='#ff5964';roundRect(bx+3,by+3,(bw-6)*Math.max(0,be.hp/be.max),20,10);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText('⚠ BOSS  ·  '+be.hp+' / '+be.max,vw/2,by+17);
  }

  for(const s of shots){
    // V44: make the equipped stone visually unmistakable in flight.
    const st=s.stone||'basic';
    const cfg={
      basic:{glow:'rgba(255,216,102,.18)',fill:'#f2eee2',stroke:'#ffd866'},
      fire:{glow:'rgba(255,85,35,.30)',fill:'#ff6b35',stroke:'#ffd04a'},
      ice:{glow:'rgba(75,190,255,.28)',fill:'#8ee8ff',stroke:'#d7f8ff'},
      bomb:{glow:'rgba(90,70,150,.30)',fill:'#25283a',stroke:'#c5b4ff'},
      lightning:{glow:'rgba(255,225,50,.32)',fill:'#ffe44d',stroke:'#fff7a8'},
      skill:{glow:'rgba(157,124,255,.34)',fill:'#9d7cff',stroke:'#efe7ff'}
    }[st] || {glow:'rgba(255,216,102,.18)',fill:'#f2eee2',stroke:'#ffd866'};
    ctx.globalAlpha=.18;ctx.fillStyle=cfg.glow;ctx.beginPath();ctx.arc(s.x,s.y+14,s.r*3.2,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle=cfg.fill;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=cfg.stroke;ctx.lineWidth=2.5;ctx.stroke();
    if(st==='fire'){
      ctx.fillStyle='#fff2a6';ctx.beginPath();ctx.arc(s.x,s.y-2,s.r*.42,0,Math.PI*2);ctx.fill();
    }else if(st==='ice'){
      ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(s.x-s.r*.65,s.y);ctx.lineTo(s.x+s.r*.65,s.y);ctx.moveTo(s.x,s.y-s.r*.65);ctx.lineTo(s.x,s.y+s.r*.65);ctx.stroke();
    }else if(st==='bomb'){
      ctx.fillStyle='#d8d0ff';ctx.fillRect(s.x+s.r*.45,s.y-s.r*.8,3,5);
    }else if(st==='lightning'){
      ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x-2,s.y-5);ctx.lineTo(s.x+2,s.y);ctx.lineTo(s.x-2,s.y+5);ctx.stroke();
    }else if(st==='skill'){
      ctx.strokeStyle='#fff';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(s.x-s.r*.6,s.y);ctx.lineTo(s.x+s.r*.6,s.y);ctx.moveTo(s.x,s.y-s.r*.6);ctx.lineTo(s.x,s.y+s.r*.6);ctx.stroke();
    }
  }
  for(const r of rocks){
    ctx.save();
    ctx.globalAlpha=r.parried?.25:.16;
    ctx.fillStyle=r.parried?'#ffdc65':'#c5ccd1';
    ctx.beginPath();ctx.arc(r.x-r.vx*.055,r.y-r.vy*.055,r.r*1.8,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    ctx.translate(r.x,r.y);ctx.rotate(Math.atan2(r.vy,r.vx));
    ctx.fillStyle=r.parried?'#ffdc65':'#9fa8ae';
    ctx.beginPath();ctx.moveTo(-r.r*.9,-r.r*.55);ctx.lineTo(r.r*.65,-r.r);
    ctx.lineTo(r.r,0);ctx.lineTo(r.r*.35,r.r*.8);ctx.lineTo(-r.r*.85,r.r*.55);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(-r.r*.45,-r.r*.45,r.r*.55,3);
    if(r.parried){ctx.strokeStyle='#fff2a8';ctx.lineWidth=3;ctx.stroke();}
    ctx.restore();
  }
  for(const e of enemies){
    if(e.telegraph>0){
      if(e.type==='boss'){
        const a=Math.atan2(player.y-e.y,player.x-e.x);
        const len=Math.min(vw*.72,Math.hypot(player.x-e.x,player.y-e.y));
        ctx.save();
        ctx.translate(e.x,e.y);ctx.rotate(a);
        ctx.globalAlpha=.20;
        ctx.fillStyle='#ff5a5a';ctx.fillRect(0,-5,len,10);
        ctx.globalAlpha=.85;
        ctx.fillStyle='#ff7b7b';ctx.beginPath();ctx.arc(len,-0,7,0,Math.PI*2);ctx.fill();
        ctx.restore();
      }

      const pulse=1+Math.sin(performance.now()/55)*.08;
      ctx.strokeStyle='rgba(255,90,90,.72)';
      ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(e.x,e.y,(e.r+13)*pulse,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='rgba(255,90,90,.75)';
      ctx.beginPath();ctx.arc(e.x,e.y- e.r-20,4,0,Math.PI*2);ctx.fill();
    }
    drawEnemy(e);
    if(e.type==='boss'){
      const ph=e.bossPhase||1;
      ctx.fillStyle=ph===3?'#ff6b6b':ph===2?'#ffd866':'#9fe3ff';
      ctx.font='900 9px system-ui';ctx.textAlign='center';
      ctx.fillText('PHASE '+ph,e.x,e.y+33);
      if(e.enraged){ctx.fillStyle='#ff5d66';ctx.font='900 9px system-ui';ctx.fillText('ENRAGED',e.x,e.y+45);}
    }
    ctx.fillStyle='#2b3035';roundRect(e.x-(e.type==='boss'?48:24),e.y-e.r-12,(e.type==='boss'?96:48),6,3);ctx.fill();
    ctx.fillStyle=e.elite?'#ffb84d':'#ef5a5a';roundRect(e.x-(e.type==='boss'?48:24),e.y-e.r-12,(e.type==='boss'?96:48)*(e.hp/e.max),6,3);ctx.fill();
    if(e.elite){
      ctx.fillStyle='#ffcf66';ctx.font='900 8px system-ui';ctx.textAlign='center';ctx.fillText('ELITE',e.x,e.y-e.r-17);
    }
  }

  if(player.inv<=0 || Math.floor(performance.now()/70)%2===0) drawDuck(player.x,player.y);

  let dangerRock=null, dangerDist=Infinity;
  for(const r of rocks){
    if(r.parried) continue;
    const d=Math.hypot(r.x-player.x,r.y-player.y);
    if(d<180 && d<dangerDist){dangerRock=r;dangerDist=d;}
  }
  showBattleHud();
  const skillBtn=showSkillButton();
  const activeChar=getSelectedCharacter();
  const skillVisual=getSkillVisual(activeChar.id);
  if(skillFx>0){
    const a=Math.min(.22,skillFx*.21);
    ctx.fillStyle=skillVisual.glow.replace('.34)',a+')');
    ctx.fillRect(0,0,vw,vh);
    const cx=player.x, cy=player.y;
    const pulse=1+(1-skillFx/1.05)*.55;
    ctx.save();
    ctx.strokeStyle=skillVisual.accent;
    ctx.globalAlpha=Math.min(1,skillFx*1.8);
    ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(cx,cy,46+58*pulse,0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cx,cy,72+92*pulse,0,Math.PI*2);ctx.stroke();
    ctx.restore();

    const bw=Math.min(vw-36,330), bh=62, bx=(vw-bw)/2, by=vh*.285;
    ctx.fillStyle='rgba(8,12,18,.90)';roundRect(bx,by,bw,bh,18);ctx.fill();
    ctx.strokeStyle=skillVisual.accent;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=skillVisual.accent;ctx.font='900 23px system-ui';ctx.textAlign='left';
    ctx.fillText(skillVisual.icon,bx+16,by+30);
    ctx.fillStyle='#fff';ctx.font='900 17px system-ui';ctx.textAlign='left';
    ctx.fillText(skillMessage,bx+48,by+27);
    ctx.fillStyle='#cdd5dd';ctx.font='11px system-ui';
    ctx.fillText(activeChar.skill?.desc||'',bx+48,by+47);
  }

  // Persistent shield cue for defensive skills.
  if(player.skillShield>0){
    ctx.save();
    ctx.strokeStyle='#72d6ff';ctx.globalAlpha=.85;ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(player.x,player.y,42+Math.sin(performance.now()/100)*3,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  if(player.skillInvincible && skillTimer>0){
    ctx.save();
    ctx.strokeStyle=skillVisual.accent;ctx.globalAlpha=.55;ctx.lineWidth=7;
    ctx.beginPath();ctx.arc(player.x,player.y,50+Math.sin(performance.now()/90)*5,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  const parryBtn=document.getElementById('battleParry');
  if(parryBtn){
    parryBtn.classList.remove('ready','perfect');
    const close=dangerRock && dangerDist<145;
    const perfectWindow=dangerRock && dangerDist<96;
    if(perfectWindow){parryBtn.classList.add('perfect');parryBtn.querySelector('strong').textContent='NOW!';parryBtn.querySelector('small').textContent='PERFECT';}
    else if(close){parryBtn.classList.add('ready');parryBtn.querySelector('strong').textContent='PARRY';parryBtn.querySelector('small').textContent='지금 반격!';}
    else {parryBtn.querySelector('strong').textContent='PARRY';parryBtn.querySelector('small').textContent='반격 타이밍';}
  }
  if(dangerRock){
    const alpha=0.10+0.08*(1+Math.sin(performance.now()/70));
    ctx.strokeStyle=`rgba(255,216,102,${alpha+0.18})`;
    ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(player.x,player.y,48,0,Math.PI*2);ctx.stroke();
  }

  for(const d of damageTexts){
    ctx.globalAlpha=Math.min(1,d.life*2);
    ctx.fillStyle='#fff';ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=3;
    ctx.font='900 18px system-ui';ctx.textAlign='center';
    ctx.strokeText(d.text,d.x,d.y);ctx.fillText(d.text,d.x,d.y);
    ctx.globalAlpha=1;
  }

  for(const p of particles){
    ctx.globalAlpha=Math.max(0,p.life*1.5);ctx.fillStyle='#fff';
    ctx.fillRect(p.x,p.y,3,3);ctx.globalAlpha=1;
  }

  // V-GATE-FLOW: 관문은 결과창이 아니라 전투 화면 위에 실제로 표시한다.
  if(gate){
    const gx=vw*.5, gy=vh*.18;
    const pulse=1+Math.sin(performance.now()/180)*.035;
    ctx.save();
    ctx.translate(gx,gy);
    ctx.scale(pulse,pulse);
    // V13: designed battlefield EXIT gate art. Gameplay position/hit radius are unchanged.
    if(EXIT_GATE_READY && EXIT_GATE_IMG.naturalWidth){
      const gw=190, gh=gw*(EXIT_GATE_IMG.naturalHeight/EXIT_GATE_IMG.naturalWidth);
      ctx.shadowColor='rgba(255,210,72,.48)';ctx.shadowBlur=18;
      ctx.drawImage(EXIT_GATE_IMG,-gw/2,-gh*.53,gw,gh);
      ctx.shadowBlur=0;
    }else{
      ctx.fillStyle='rgba(20,28,32,.82)';roundRect(-42,-26,84,56,16);ctx.fill();
      ctx.strokeStyle='#ffd866';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle='#ffd866';ctx.font='900 11px system-ui';ctx.textAlign='center';
      ctx.fillText('EXIT',0,4);
    }
    ctx.restore();
  }

  // V41: no visible MOVE joystick. Dragging on the lower battle area still moves the character.

  if(intro>0){
    ctx.fillStyle='rgba(5,8,12,.52)';ctx.fillRect(0,0,vw,vh);
    ctx.fillStyle='#fff';ctx.font='900 34px system-ui';ctx.textAlign='center';
    ctx.fillText(boss?'BOSS STAGE':'STAGE '+stage,vw/2,vh*.43);
    ctx.font='bold 16px system-ui';ctx.fillStyle='#ffd866';
    ctx.fillText(stageFeatureLabel(stage),vw/2,vh*.49);
  }

  if(levelFlash>0){
    ctx.globalAlpha=Math.min(1,levelFlash);
    ctx.fillStyle='rgba(255,216,102,.10)';ctx.fillRect(0,0,vw,vh);
    ctx.fillStyle='#ffd866';ctx.font='900 30px system-ui';ctx.textAlign='center';
    ctx.fillText('LEVEL UP!',vw/2,vh*.31);
    ctx.font='800 14px system-ui';
    ctx.fillText('Lv.'+level,vw/2,vh*.345);
    ctx.globalAlpha=1;
  }

  if(messageTimer>0){
    const perfectMsg=message.includes('PERFECT');
    ctx.fillStyle=perfectMsg?'rgba(255,184,50,.10)':'rgba(0,0,0,.22)';
    ctx.fillRect(0,0,vw,vh);
    const mw=perfectMsg?210:150, mh=44, my=vh*.37;
    ctx.fillStyle=perfectMsg?'rgba(255,191,48,.94)':'rgba(10,16,23,.88)';
    roundRect(vw*.5-mw/2,my,mw,mh,16);ctx.fill();
    ctx.strokeStyle=perfectMsg?'rgba(255,245,180,.8)':'rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=perfectMsg?'#3d2600':'#fff';
    ctx.font=perfectMsg?'900 19px system-ui':'900 18px system-ui';ctx.textAlign='center';
    ctx.fillText(message,vw*.5,my+29);
  }

  // V6: legacy canvas result overlay removed; DOM result screen owns navigation.
  drawUpgrade();
  if(paused){
    ctx.fillStyle='rgba(5,8,12,.58)';ctx.fillRect(0,0,vw,vh);
    ctx.fillStyle='rgba(12,18,24,.94)';roundRect(vw/2-118,vh*.38,236,132,24);ctx.fill();
    ctx.strokeStyle='rgba(255,216,102,.32)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 26px system-ui';ctx.textAlign='center';ctx.fillText('PAUSED',vw/2,vh*.38+43);
    ctx.fillStyle='#ffd866';ctx.font='800 14px system-ui';ctx.fillText('전투를 잠시 멈췄어요',vw/2,vh*.38+69);
    ctx.fillStyle='#fff';ctx.font='800 12px system-ui';ctx.fillText('오른쪽 위 일시정지 버튼으로 계속',vw/2,vh*.38+97);
  }
  ctx.restore();
}

function loop(t){
  try{
    const dt=Math.min(.033,(t-last)/1000||0);
    last=t;
    update(dt);
    draw();
  }catch(err){
    // Keep the game alive; reset only transient combat objects.
    rocks=[]; shots=[]; particles=[];
    if(player){
      player.x=clamp(player.x||vw*.5,32,Math.max(32,vw-32));
      player.y=clamp(player.y||vh*.8,vh*.48,Math.max(vh*.48,vh-90));
    }
  }
  requestAnimationFrame(loop);
}
running=false; player={x:vw*.5,y:vh*.80,r:24,hp:120,maxHp:120,speed:300,fire:0,inv:0,dir:0,attack:25,attackInterval:.833,parryRange:72,perfectMultiplier:1,parryCd:0}; applyGrowthToPlayer(); window.__duckApplyRunRewards&&window.__duckApplyRunRewards(); enemies=[]; rocks=[]; shots=[]; particles=[]; for(let i=0;i<8;i++) spawnEnemy(i); requestAnimationFrame(loop);

  window.__duckParry=function(){
    try{ if(running && !paused && player) return parryAt(player.x,player.y); }catch(e){ console.error('parry failed:',e); }
    return false;
  };
  window.__duckSkill=function(){
    try{ return activateSkill(); }catch(e){ console.error('skill failed:',e); return false; }
  };
  window.__duckTogglePause=function(){
    if(!running) return;
    paused=!paused;
    const b=document.getElementById('battlePause');
    if(b) b.textContent=paused?'▶':'Ⅱ';
  };
  const BATTLE_ITEM_DEFS={
    medkit:{icon:'✚',name:'응급키트',desc:'HP 35% 회복'},
    grenade:{icon:'💥',name:'수류탄',desc:'모든 적에게 큰 피해'},
    shield:{icon:'🛡',name:'방탄막',desc:'4초간 피해 무효'}
  };
  const BATTLE_ITEM_KEY='doldol_battle_items_v1';
  function readBattleItems(){
    const base={medkit:3,grenade:3,shield:3};
    try{
      const raw=JSON.parse(localStorage.getItem(BATTLE_ITEM_KEY)||'null');
      if(raw&&typeof raw==='object') Object.keys(base).forEach(k=>base[k]=Math.max(0,Number(raw[k])||0));
    }catch(e){}
    return base;
  }
  function writeBattleItems(inv){ try{localStorage.setItem(BATTLE_ITEM_KEY,JSON.stringify(inv));}catch(e){} }
  function grantBattleItemReward(stageNo){
    const inv=readBattleItems();
    const stage=Math.max(1,Number(stageNo)||1);
    const pool=['medkit','grenade','shield'];
    const rewardCount=(stage%5===0)?2:1;
    const gained={medkit:0,grenade:0,shield:0};
    for(let i=0;i<rewardCount;i++){
      const id=pool[Math.floor(Math.random()*pool.length)];
      inv[id]=(inv[id]||0)+1;
      gained[id]++;
    }
    writeBattleItems(inv);
    renderBattleItems();
    const rewards=Object.keys(gained).filter(id=>gained[id]>0).map(id=>({id,count:gained[id],...BATTLE_ITEM_DEFS[id]}));
    window.__duckLastBattleItemReward=rewards;
    return rewards;
  }
  function renderBattleItems(){
    const box=document.getElementById('battleItemSlots'); if(!box)return;
    const inv=readBattleItems();
    box.innerHTML='<div class="battleItemTitle">ITEM</div>'+Object.entries(BATTLE_ITEM_DEFS).map(([id,it])=>`<button class="battleItemBtn" data-battle-item="${id}" aria-label="${it.name}" ${inv[id]<=0?'disabled':''}><span class="battleItemIcon">${it.icon}</span><span class="battleItemCount">${inv[id]}</span></button>`).join('');
  }
  function useBattleItem(id){
    if(!running||paused||!player||!BATTLE_ITEM_DEFS[id])return false;
    const inv=readBattleItems(); if((inv[id]||0)<=0)return false;
    if(id==='medkit'){
      if(player.hp>=player.maxHp){ message='HP가 가득 찼어요'; messageTimer=.7; return false; }
      const heal=Math.max(1,Math.round(player.maxHp*.35));
      player.hp=Math.min(player.maxHp,player.hp+heal); message='응급키트 +'+heal; messageTimer=.8;
    }else if(id==='grenade'){
      let hit=0;
      enemies.forEach(e=>{ if(!e||e.dead)return; const dmg=Math.max(1,Math.round((e.max||e.hp||1)*.35)); e.hp=Math.max(0,(e.hp||0)-dmg); hit++; if(e.hp<=0) hitEnemy(e,Math.max(1,dmg)); });
      if(!hit){ message='대상이 없어요'; messageTimer=.7; return false; }
      message='수류탄!'; messageTimer=.8; shake=Math.max(shake,10);
    }else if(id==='shield'){
      player.inv=Math.max(Number(player.inv)||0,4); message='방탄막 4초'; messageTimer=.8;
    }
    inv[id]-=1; writeBattleItems(inv); renderBattleItems(); if(window.__duckMissionEvent)window.__duckMissionEvent('item',1); return true;
  }
  function addBattleItems(id,count){
    if(!BATTLE_ITEM_DEFS[id])return false;
    const inv=readBattleItems();
    inv[id]=Math.max(0,(Number(inv[id])||0)+Math.max(0,Number(count)||0));
    writeBattleItems(inv); renderBattleItems(); return inv[id];
  }
  window.__duckBattleItems={get:readBattleItems,use:useBattleItem,refresh:renderBattleItems,grantClearReward:grantBattleItemReward,add:addBattleItems};
  function ensureBattleItemSlots(){
    const host=document.getElementById('battleControls');
    if(!host)return;
    let box=document.getElementById('battleItemSlots');
    if(!box){
      box=document.createElement('div'); box.id='battleItemSlots'; host.appendChild(box);
      box.addEventListener('click',ev=>{ const btn=ev.target.closest&&ev.target.closest('[data-battle-item]'); if(btn){ev.preventDefault();ev.stopPropagation();useBattleItem(btn.dataset.battleItem);} });
    }
    renderBattleItems();
  }

  window.__duckSetBattleControls=function(show){
    ensureBattleItemSlots();
    const c=document.getElementById('battleControls');
    if(c){ c.classList.toggle('show',!!show); c.setAttribute('aria-hidden',show?'false':'true'); }

    const stoneBar=document.getElementById('battleStoneBar');
    if(stoneBar) stoneBar.style.display='none';

  const b=document.getElementById('battleSkill');
    if(b) b.style.display=show?'flex':'none';

    const h=document.getElementById('battleHud');
    if(h) h.style.display=show?'flex':'none';

    // 전투 중에는 로비/맵에서 쓰는 '전투 시작' 버튼을 숨긴다.
    const startButtons=document.querySelectorAll(
      '#start, #startBattle, #startStage, #battleStart, .startBattle, .stageStart, [data-action="start-battle"]'
    );
    startButtons.forEach(el=>{
      el.style.visibility=show?'hidden':'';
      el.style.pointerEvents=show?'none':'';
    });
  };

  // Public entry point: this MUST live inside the combat engine IIFE,
  // because stage/running/startStage are lexical variables here.
  window.__duckApplyRunRewards=function(){
    try{
      const saved=JSON.parse(localStorage.getItem("doldol_run_skills_v1")||"[]");
      if(Array.isArray(saved)){
        saved.forEach(id=>{ if(window.__duckApplyReward) window.__duckApplyReward(id); });
      }
    }catch(e){ console.warn("run reward restore failed:",e); }
  };

  window.__duckApplyReward=function(id){
    try{
      if(!player)return false;
      switch(id){
        case "power": player.attack=Math.round((player.attack||25)*1.15); break;
        case "rapid": player.attackInterval=Math.max(.18,(player.attackInterval||.5)*.85); break;
        case "vital": player.maxHp=(player.maxHp||120)+25; player.hp=player.maxHp; break;
        case "parry": player.parryRange=(player.parryRange||55)*1.15; break;
        case "perfect": player.perfectMultiplier=(player.perfectMultiplier||1)*1.20; break;
        case "move": player.speed=(player.speed||240)*1.12; break;
        default:return false;
      }
      return true;
    }catch(e){
      console.error("reward apply failed:",e);
      return false;
    }
  };

  window.__duckStartStage=function(s){
    try{
      s=Math.max(1,Math.min(500,Number(s)||1));
      window.__duckStage=s;
      window.__selectedDuckStage=s;
      const rs=document.getElementById("resultScreen");
      if(rs) rs.classList.remove("show");
      const lobby=document.getElementById("gameLobby");
      if(lobby) lobby.classList.add("hidden");
      const map=document.getElementById("mapScreen");
      if(map) map.classList.remove("show");
      startStage(s);
      running=true;
      const legacyStart=document.getElementById('start');
      if(legacyStart){
        legacyStart.style.visibility='hidden';
        legacyStart.style.pointerEvents='none';
      }
      if(window.__duckSetBattleControls)window.__duckSetBattleControls(true);
      intro=1.25;
      gate=false;
      last=performance.now();
    }catch(e){
      console.error("combat start failed:",e);
    }
  };
  window.__duckStopCombat=function(){
    try{
      running=false;
      paused=false;
      gate=false;
      clearSkillState();
      skillCooldown=0; skillFx=0; skillMessage='';
      if(window.__duckSetBattleControls)window.__duckSetBattleControls(false);
      shake=0;
      message="";
      messageTimer=0;
      if(joy){joy.active=false;joy.id=null;}
      if(rocks)rocks.length=0;
      if(shots)shots.length=0;
      const stoneBar=document.getElementById('battleStoneBar'); if(stoneBar)stoneBar.style.display='none';
      if(particles)particles.length=0;
      if(damageTexts)damageTexts.length=0;
    }catch(e){console.error("stop combat failed:",e);}
  };

})();


/* --- extracted script block --- */

(function(){
 const t=document.getElementById("titleScreen"),b=document.getElementById("titleStart"),l=document.getElementById("gameLobby");
 if(!t||!b||!l)return;
 b.addEventListener("click",function(){t.classList.add("hidden");l.classList.remove("hidden");if(window.__duckStopCombat)window.__duckStopCombat();if(window.__duckSyncLobby)window.__duckSyncLobby();});
})();


/* --- extracted script block --- */

(function(){
 const map=document.getElementById("mapScreen"),menu=document.getElementById("menuScreen"),result=document.getElementById("resultScreen"),lobby=document.getElementById("gameLobby");
 let selected=Math.max(1,Number((typeof stage!=="undefined"?stage:1))||1);
 function closePanels(){map.classList.remove("show");menu.classList.remove("show");result.classList.remove("show");}
 function syncMap(){
   selected=Math.max(1,Math.min(500,Number((typeof stage!=="undefined"?stage:selected))||1));
   document.querySelectorAll(".mapNode").forEach(n=>n.classList.toggle("current",Number(n.dataset.stage)===selected));
   const boss=selected%5===0;
   document.getElementById("mapInfoTitle").textContent="STAGE "+selected+(boss?" · BOSS":" · 출격 준비");
   document.getElementById("mapInfoSub").textContent=boss?"⚠️ 보스 스테이지 · 준비가 필요합니다":"스테이지를 선택했습니다 · 아래 출격하기로 전투 시작";
 }
 function syncUnlockedStages(){
  try{
    const unlocked=Math.max(1,Number(localStorage.getItem("doldol_unlocked_stage_v1")||1));
    document.querySelectorAll(".mapNode").forEach(n=>{
      const st=Number(n.dataset.stage)||1;
      if(st<=unlocked)n.classList.remove("lock"); else n.classList.add("lock");
    });
  }catch(e){}
}
function openMap(){closePanels();map.classList.add("show");syncMap();}
 function openMenu(kind){
   closePanels();menu.classList.add("show");
   const body=document.getElementById("menuBody"), title=document.getElementById("menuTitle");
   const lvl=(typeof level!=="undefined"?level:1);
   const img="./assets/characters/character_doldol.png";
   if(kind==="growth"){
    title.textContent="📈 성장";
    body.innerHTML='<div class="profile"><img src="'+img+'" alt="돌돌 특공대"><div><b>돌돌 특공대</b><span>LV.'+lvl+' · 전투로 성장합니다.</span></div></div>'+
      '<div class="growthItem">⚔️ 공격력 <b>25</b><div class="bar"><i style="width:62%"></i></div></div>'+
      '<div class="growthItem">⚡ 공격속도 <b>1.2</b><div class="bar"><i style="width:48%"></i></div></div>'+
      '<div class="growthItem">❤️ 최대 HP <b>120</b><div class="bar"><i style="width:70%"></i></div></div>'+
      '<div class="growthItem">🛡️ 패링 판정 <b>강화 가능</b><div class="bar"><i style="width:54%"></i></div></div>';
   }else if(kind==="gear"){
    title.textContent="🛡️ 장비";
    body.innerHTML='<div class="profile"><img src="'+img+'" alt="돌돌 특공대"><div><b>현재 장비</b><span>기본 장비 · LV.1</span></div></div>'+
      '<div class="menuGrid"><button class="menuItem">🪨 기본돌<small>기본 투사체</small></button><button class="menuItem">🔥 불돌<small>공격력 증가</small></button><button class="menuItem">❄️ 얼음돌<small>감속 효과</small></button><button class="menuItem">💥 폭발돌<small>범위 피해</small></button></div>';
   }else if(kind==="shop"){
    title.textContent="🛒 상점";
    body.innerHTML='<div class="shopItem"><div>🪙 코인 팩<small>코인 5,000</small></div><button class="buy">💎 300</button></div>'+
      '<div class="shopItem"><div>🎁 무기 상자<small>랜덤 무기 1개</small></div><button class="buy">💎 300</button></div>'+
      '<div class="shopItem"><div>🎨 스킨 상자<small>특공대 스킨</small></div><button class="buy">💎 500</button></div>'+
      '<div class="shopItem"><div>⭐ XP 부스터<small>1시간 동안 XP 증가</small></div><button class="buy">💎 300</button></div>';
   }else if(kind==="mission"){
    title.textContent="📋 미션 / 업적";
    body.innerHTML='<div class="missionItem"><div>적 50마리 처치<div class="bar"><i style="width:40%"></i></div></div><b>20/50</b></div>'+
      '<div class="missionItem"><div>패링 10회 성공<div class="bar"><i style="width:30%"></i></div></div><b>3/10</b></div>'+
      '<div class="missionItem"><div>스테이지 5 클리어<div class="bar"><i style="width:20%"></i></div></div><b>1/5</b></div>'+
      '<div class="missionItem"><div>게임 1회 플레이<div class="bar"><i style="width:100%"></i></div></div><b>완료</b></div>';
   }else{
    title.textContent="📖 적 도감";
    const names=["일반병","빠른병","탱커","스나이퍼","폭격병","돌격병","엘리트","정예","보스"];
    const faces=["🐗","👺","🥷","🐺","🦏","👹","👻","🦾","👑"];
    body.innerHTML='<div class="bookGrid">'+faces.map((x,i)=>'<div class="bookItem"><div class="enemyFace">'+x+'</div><small>'+names[i]+'</small></div>').join("")+'</div>';
   }
 }
 document.getElementById("lobbyStages").addEventListener("click",()=>{syncUnlockedStages();openMap();});
 document.getElementById("mapBack").addEventListener("click",()=>{map.classList.remove("show");lobby.classList.remove("hidden");});
 document.getElementById("mapLobby").addEventListener("click",()=>{map.classList.remove("show");lobby.classList.remove("hidden");});
 document.getElementById("mapGo").addEventListener("click",()=>{map.classList.remove("show");if(window.__duckStartStage)window.__duckStartStage(selected);});
 document.getElementById("mapReset").addEventListener("click",syncMap);
 document.querySelectorAll(".mapNode").forEach(n=>n.addEventListener("click",()=>{
   if(n.classList.contains("lock"))return;
   selected=Number(n.dataset.stage)||1;
   document.querySelectorAll(".mapNode").forEach(x=>x.classList.remove("current"));
   n.classList.add("current");
   const boss=selected%5===0;
   document.getElementById("mapInfoTitle").textContent="STAGE "+selected+(boss?" · BOSS":" · 출격 준비");
   document.getElementById("mapInfoSub").textContent=boss?"⚠️ 보스 스테이지 · 아래 출격하기":"선택 완료 · 아래 출격하기로 전투 시작";
 }));
 document.getElementById("menuClose").addEventListener("click",()=>menu.classList.remove("show"));
 document.getElementById("lobbyShop").addEventListener("click",()=>{if(window.__duckOpenShop)window.__duckOpenShop();else openMenu("shop");});
 document.getElementById("lobbyGrowth").addEventListener("click",()=>{if(window.__duckOpenCharacters)window.__duckOpenCharacters();});
 document.getElementById("lobbyGear").addEventListener("click",()=>openMenu("gear"));
 document.getElementById("lobbyBook").addEventListener("click",()=>openMenu("book"));
 window.__duckShowResult=function(clear){
    const s=Math.max(1,Number((typeof stage!=="undefined"?stage:1))||1);
    const hpNow=Math.max(0,Number((typeof player!=="undefined"&&player)?player.hp:0)||0);
    const hpMax=Math.max(1,Number((typeof player!=="undefined"&&player)?player.maxHp:120)||120);
    const hpRate=hpNow/hpMax;
    const pCount=Math.max(0,Number((typeof perfect!=="undefined"?perfect:0))||0);
    let stars=1;
    if(clear&&hpRate>=.45)stars=2;
    if(clear&&hpRate>=.75&&pCount>=1)stars=3;
    document.getElementById("resultTitle").textContent=clear?"CLEAR!":"GAME OVER";
    document.getElementById("resultSub").textContent=clear?"STAGE "+s+" 클리어!":"STAGE "+s+"에서 쓰러졌습니다";
    document.getElementById("resultStars").textContent=clear?("★ ".repeat(stars)+"☆ ".repeat(3-stars)).trim():"★ ☆ ☆";
    document.getElementById("resultCoins").textContent=clear?String(100+s*15):"0";
    document.getElementById("resultXp").textContent=clear?String(30+s*5):"0";
    document.getElementById("resultNext").textContent=clear?"다음 스테이지":"다시 도전";
    let detail=document.getElementById("resultDetail");
    if(!detail){
      detail=document.createElement("div"); detail.id="resultDetail";
      Object.assign(detail.style,{margin:"10px auto 0",padding:"9px 12px",maxWidth:"330px",borderRadius:"12px",background:"rgba(255,255,255,.08)",color:"#dbe2ea",font:"800 11px system-ui",textAlign:"center"});
      const sub=document.getElementById("resultSub");
      if(sub&&sub.parentNode)sub.parentNode.insertBefore(detail,sub.nextSibling);
    }
    detail.textContent=clear?`❤️ HP ${Math.ceil(hpNow)}/${Math.ceil(hpMax)}  ·  ✦ PERFECT ${pCount}회`:`이번 전투  ·  ✦ PERFECT ${pCount}회`;
    if(clear){
      try{
        const unlocked=Math.max(s+1,Number(localStorage.getItem("doldol_unlocked_stage_v1")||1));
        localStorage.setItem("doldol_unlocked_stage_v1",String(unlocked));
      }catch(e){}
    }
    result.classList.add("show");
  };
 document.getElementById("resultLobby").addEventListener("click",()=>{result.classList.remove("show");if(window.__duckShowLobby)window.__duckShowLobby();});
})();


/* --- extracted script block --- */

(function(){
 const map=document.getElementById("mapScreen"), menu=document.getElementById("menuScreen"), result=document.getElementById("resultScreen"), lobby=document.getElementById("gameLobby");
 let selected=1;
 const body=document.getElementById("menuBody"), menuTitle=document.getElementById("menuTitle");

 function closeAll(){map.classList.remove("show");menu.classList.remove("show");result.classList.remove("show");}
 function openMap(){closeAll();map.classList.add("show");syncMap();}
 function syncMap(){
   selected=Math.max(1,Math.min(500,Number((typeof stage!=="undefined"?stage:1))||1));
   document.querySelectorAll(".mapNode").forEach(n=>n.classList.toggle("current",Number(n.dataset.stage)===selected));
   document.getElementById("mapInfoTitle").textContent="STAGE "+selected+(selected%5===0?" · BOSS":" · 출격 준비");
   document.getElementById("mapInfoSub").textContent=selected%5===0?"⚠️ 강력한 보스가 등장합니다":"작은 적들이 몰려옵니다 · 다음 보스 STAGE "+(Math.ceil(selected/5)*5);
 }
 function openMenu(kind){
   closeAll();menu.classList.add("show");
   const coinsNow=(typeof coins!=="undefined"?coins:0), lvl=(typeof level!=="undefined"?level:1);
   if(kind==="growth"){
     menuTitle.textContent="📈 성장";
     body.innerHTML='<div class="profile"><img src="'+`./assets/characters/character_doldol.png`+'"><div><b>돌돌 특공대</b><span>LV.'+lvl+' · 전투를 거듭할수록 강해집니다.</span></div></div>'+
       '<div class="growthItem">⚔️ 공격력 <b>25</b><div class="bar"><i style="width:62%"></i></div></div>'+
       '<div class="growthItem">⚡ 공격속도 <b>1.2</b><div class="bar"><i style="width:48%"></i></div></div>'+
       '<div class="growthItem">❤️ 최대 HP <b>120</b><div class="bar"><i style="width:70%"></i></div></div>'+
       '<div class="growthItem">🛡️ 패링 판정 <b>강화 가능</b><div class="bar"><i style="width:54%"></i></div></div>';
   }else if(kind==="gear"){
     menuTitle.textContent="🛡️ 장비";
     body.innerHTML='<div class="profile"><img src="'+`./assets/characters/character_doldol.png`+'"><div><b>현재 장비</b><span>기본 장비 · LV.1</span></div></div>'+
       '<div class="menuGrid"><button class="menuItem">🪨 기본돌<small>기본 투사체</small></button><button class="menuItem">🔥 불돌<small>공격력 증가</small></button><button class="menuItem">❄️ 얼음돌<small>적 이동속도 감소</small></button><button class="menuItem">💥 폭발돌<small>범위 피해</small></button></div>';
   }else if(kind==="shop"){
     menuTitle.textContent="🛒 상점";
     body.innerHTML='<div class="shopItem"><div>🪙 코인 팩<small>코인 5,000</small></div><button class="buy">💎 300</button></div>'+
       '<div class="shopItem"><div>🎁 무기 상자<small>랜덤 무기 1개</small></div><button class="buy">💎 300</button></div>'+
       '<div class="shopItem"><div>🎨 스킨 상자<small>특공대 스킨</small></div><button class="buy">💎 500</button></div>'+
       '<div class="shopItem"><div>⭐ XP 부스터<small>1시간 동안 XP 증가</small></div><button class="buy">💎 300</button></div>';
   }else if(kind==="mission"){
     menuTitle.textContent="📋 미션 / 업적";
     body.innerHTML='<div class="missionItem"><div>적 50마리 처치<div class="bar"><i style="width:40%"></i></div></div><b>20/50</b></div>'+
       '<div class="missionItem"><div>패링 10회 성공<div class="bar"><i style="width:30%"></i></div></div><b>3/10</b></div>'+
       '<div class="missionItem"><div>스테이지 5 클리어<div class="bar"><i style="width:20%"></i></div></div><b>1/5</b></div>'+
       '<div class="missionItem"><div>게임 1회 플레이<div class="bar"><i style="width:100%"></i></div></div><b>완료</b></div>';
   }else if(kind==="book"){
     menuTitle.textContent="📖 적 도감";
     body.innerHTML='<div class="bookGrid">'+
       ['🐗','👺','🥷','🐺','🦏','👹','👻','🦾','👑'].map((x,i)=>'<div class="bookItem"><div class="enemyFace">'+x+'</div><small>'+["일반병","빠른병","탱커","스나이퍼","폭격병","돌격병","엘리트","정예","보스"][i]+'</small></div>').join("")+
       '</div>';
   }
 }
 document.getElementById("lobbyStages").addEventListener("click",()=>{syncUnlockedStages();openMap();});
 document.getElementById("mapBack").addEventListener("click",()=>{map.classList.remove("show");lobby.classList.remove("hidden")});
 document.getElementById("mapLobby").addEventListener("click",()=>{map.classList.remove("show");lobby.classList.remove("hidden")});
 document.getElementById("mapGo").addEventListener("click",()=>{map.classList.remove("show");if(window.__duckStartStage)window.__duckStartStage(selected)});
 document.getElementById("mapReset").addEventListener("click",syncMap);
 document.querySelectorAll(".mapNode").forEach(n=>n.addEventListener("click",()=>{
   if(n.classList.contains("lock"))return;
   selected=Number(n.dataset.stage)||1;
   document.querySelectorAll(".mapNode").forEach(x=>x.classList.remove("current"));
   n.classList.add("current");
   const boss=selected%5===0;
   document.getElementById("mapInfoTitle").textContent="STAGE "+selected+(boss?" · BOSS":" · 출격 준비");
   document.getElementById("mapInfoSub").textContent=boss?"⚠️ 강력한 보스가 등장합니다":"이 스테이지를 선택했습니다 · 아래 출격하기를 눌러 전투 시작";
 }));
 document.getElementById("menuClose").addEventListener("click",()=>menu.classList.remove("show"));
 document.getElementById("lobbyShop").addEventListener("click",()=>{if(window.__duckOpenShop)window.__duckOpenShop();else openMenu("shop");});
 document.getElementById("lobbyGrowth").addEventListener("click",()=>{if(window.__duckOpenCharacters)window.__duckOpenCharacters();});
 document.getElementById("lobbyGear").addEventListener("click",()=>openMenu("gear"));
 document.getElementById("lobbyBook").addEventListener("click",()=>openMenu("book"));
 const mission=document.getElementById("lobbyStages"); // keep stage button mapped; mission can be reached later
 window.__duckShowResult=function(clear){
    const s=Math.max(1,Number((typeof stage!=="undefined"?stage:1))||1);
    const hpNow=Math.max(0,Number((typeof player!=="undefined"&&player)?player.hp:0)||0);
    const hpMax=Math.max(1,Number((typeof player!=="undefined"&&player)?player.maxHp:120)||120);
    const hpRate=hpNow/hpMax;
    const pCount=Math.max(0,Number((typeof perfect!=="undefined"?perfect:0))||0);
    let stars=1;
    if(clear&&hpRate>=.45)stars=2;
    if(clear&&hpRate>=.75&&pCount>=1)stars=3;
    document.getElementById("resultTitle").textContent=clear?"CLEAR!":"GAME OVER";
    document.getElementById("resultSub").textContent=clear?"STAGE "+s+" 클리어!":"STAGE "+s+"에서 쓰러졌습니다";
    document.getElementById("resultStars").textContent=clear?("★ ".repeat(stars)+"☆ ".repeat(3-stars)).trim():"★ ☆ ☆";
    document.getElementById("resultCoins").textContent=clear?String(100+s*15):"0";
    document.getElementById("resultXp").textContent=clear?String(30+s*5):"0";
    document.getElementById("resultNext").textContent=clear?"다음 스테이지":"다시 도전";
    let detail=document.getElementById("resultDetail");
    if(!detail){
      detail=document.createElement("div"); detail.id="resultDetail";
      Object.assign(detail.style,{margin:"10px auto 0",padding:"9px 12px",maxWidth:"330px",borderRadius:"12px",background:"rgba(255,255,255,.08)",color:"#dbe2ea",font:"800 11px system-ui",textAlign:"center"});
      const sub=document.getElementById("resultSub");
      if(sub&&sub.parentNode)sub.parentNode.insertBefore(detail,sub.nextSibling);
    }
    detail.textContent=clear?`❤️ HP ${Math.ceil(hpNow)}/${Math.ceil(hpMax)}  ·  ✦ PERFECT ${pCount}회`:`이번 전투  ·  ✦ PERFECT ${pCount}회`;
    if(clear){
      try{
        const unlocked=Math.max(s+1,Number(localStorage.getItem("doldol_unlocked_stage_v1")||1));
        localStorage.setItem("doldol_unlocked_stage_v1",String(unlocked));
      }catch(e){}
    }
    result.classList.add("show");
  };
 document.getElementById("resultLobby").addEventListener("click",()=>{result.classList.remove("show");if(window.__duckShowLobby)window.__duckShowLobby()});
})();


/* --- extracted script block --- */

(function(){
  const $=id=>document.getElementById(id);
  const lobby=$("gameLobby"), map=$("mapScreen"), menu=$("menuScreen"), result=$("resultScreen"), title=$("titleScreen");
  const start=$("lobbyStart"), stages=$("lobbyStages"), mapGo=$("mapGo"), mapBack=$("mapBack"), mapLobby=$("mapLobby");
  const resultLobby=$("resultLobby"), resultNext=$("resultNext");

  function hidePanels(){
    if(map)map.classList.remove("show");
    if(menu)menu.classList.remove("show");
    if(result)result.classList.remove("show");
  }
  function startBattle(s){
    hidePanels();
    if(lobby)lobby.classList.add("hidden");
    if(title)title.classList.add("hidden");
    if(window.__duckStartStage) window.__duckStartStage(s||1);
  }
  function showLobby(){
    if(window.__duckStopCombat)window.__duckStopCombat();
    hidePanels();
    if(title)title.classList.add("hidden");
    if(lobby)lobby.classList.remove("hidden");
    if(window.__duckSyncLobby)window.__duckSyncLobby();
  }

  if(start)start.onclick=function(e){
    e.preventDefault();
    try{localStorage.removeItem("doldol_run_skills_v1");}catch(e){}
    startBattle(Number((window.__duckStage||1))||1);
  };
  if(stages)stages.onclick=function(e){e.preventDefault();hidePanels();lobby.classList.add("hidden");if(map)map.classList.add("show");};
  if(mapGo)mapGo.onclick=function(e){e.preventDefault();startBattle(Number(window.__selectedDuckStage||1)||1);};
  if(mapBack)mapBack.onclick=showLobby;
  if(mapLobby)mapLobby.onclick=showLobby;
  if(resultLobby)resultLobby.onclick=showLobby;

  // Result next button: CLEAR goes to reward selection first.
  if(resultNext)resultNext.onclick=function(e){
    e.preventDefault();
    const clear=$("resultTitle") && $("resultTitle").textContent==="CLEAR!";
    const s=Math.max(1,Math.min(500,Number(window.__duckStage||1)||1));
    if(clear){
      // 다음 스테이지를 클릭 시점에 고정한다. 이후 UI 이벤트가 stage 값을
      // 바꿔도 보상 선택 후 반드시 정확히 다음 스테이지로 진행한다.
      window.__duckPendingNextStage=Math.min(500,s+1);
      if(window.__duckOpenStageReward){
        window.__duckOpenStageReward();
        return;
      }
    }
    try{localStorage.removeItem("doldol_run_skills_v1");}catch(e){}
    if(result)result.classList.remove("show");
    startBattle(clear?Math.min(500,s+1):s);
  };

  const battlePause=document.getElementById('battlePause');
  const battleParry=document.getElementById('battleParry');
  if(battlePause) battlePause.addEventListener('click',e=>{e.preventDefault(); if(window.__duckTogglePause)window.__duckTogglePause();});
  if(battleParry) battleParry.addEventListener('pointerdown',e=>{e.preventDefault(); if(window.__duckParry)window.__duckParry();});

  // Map nodes select a stage directly; no secondary stage-selection screen.
  document.querySelectorAll(".mapNode").forEach(function(n){
    n.onclick=function(){
      if(n.classList.contains("lock"))return;
      window.__selectedDuckStage=Math.max(1,Number(n.dataset.stage)||1);
      document.querySelectorAll(".mapNode").forEach(x=>x.classList.remove("current"));
      n.classList.add("current");
      const s=window.__selectedDuckStage, boss=s%5===0;
      const t=$("mapInfoTitle"), sub=$("mapInfoSub");
      if(t)t.textContent="STAGE "+s+(boss?" · BOSS":" · 출격 준비");
      if(sub)sub.textContent=boss?"⚠️ 보스 스테이지 · 아래 출격하기":"선택 완료 · 아래 출격하기로 전투 시작";
    };
  });
})();


/* --- extracted script block --- */

(function(){
  window.__duckSyncLobby=function(){
    const s=Number((window.__selectedDuckStage||1))||1;
    const el=document.getElementById("lobbyStage");
    if(el)el.textContent="STAGE "+s;

    const c=document.getElementById("lobbyCoins");
    if(c){
      const n=Math.max(0,Number(window.__duckWallet.coins)||0);
      const compact=(v)=>{
        const fmt=(x,s)=>{
          const d=x<100?1:0;
          return x.toFixed(d).replace(/\.0$/,'')+s;
        };
        if(v>=1e9)return fmt(v/1e9,'B');
        if(v>=1e6)return fmt(v/1e6,'M');
        if(v>=1e3)return fmt(v/1e3,'K');
        return String(Math.floor(v));
      };
      c.textContent=compact(n);
      c.title=n.toLocaleString();
    }

    const chars={
      doldol:["돌돌이","./assets/characters/character_doldol.png"],
      nyang:["냥특공","./assets/characters/character_nyang.png"],
      rabbit:["토끼특공","./assets/characters/character_rabbit.png"],
      panda:["판다특공","./assets/characters/character_panda.png"],
      king:["그림자특공","./assets/characters/character_shadow.png"],
      turtle:["거북특공","./assets/characters/character_turtle.png"],
      shiba:["시바특공","./assets/characters/character_shiba.png"],
      charge:["돌격특공","./assets/characters/character_charge.png"]
    };
    let id="doldol";
    try{id=localStorage.getItem("doldol_character_v1")||"doldol"}catch(e){}
    const meta=chars[id]||chars.doldol;
    const img=document.getElementById("lobbyProfileImg");
    if(img){img.src=meta[1];img.alt=meta[0]}
    const name=document.getElementById("lobbyProfileName");
    if(name)name.textContent=meta[0];

    const card=document.getElementById("lobbyProfile");
    if(card){
      const levelEl=card.querySelector("span");
      if(levelEl){
        let level=1;
        try{
          const p=window.__duckCharacterProgress?window.__duckCharacterProgress(id):null;
          if(p&&p.level) level=Math.max(1,Number(p.level)||1);
        }catch(e){}
        levelEl.textContent="Lv."+level;
      }
    }
  };
})();


/* --- extracted script block --- */

(function(){
  const screen=document.getElementById('characterScreen');
  if(!screen) return;

  if(!document.querySelector('link[data-doldol-squad-style]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/squad.css?v=20261006-squad23';
    link.dataset.doldolSquadStyle='1';
    document.head.appendChild(link);
  }

  const uiRoster=[
    {id:'doldol', face:'🐥', art:'./assets/characters/character_doldol.png', gateStage:1, unlockCost:0, name:'돌돌이', role:'밸런스형', atk:100, hp:100, counter:3, timing:3, skill:'돌핵 폭발', skillDesc:'PERFECT 반격 시 충격파 +30% 피해', gate:'기본 캐릭터'},
    {id:'nyang', face:'🐱', art:'./assets/characters/character_nyang.png', gateStage:10, unlockCost:3000, name:'냥특공', role:'스피드형', atk:90, hp:85, counter:5, timing:3, skill:'냥냥 연타', skillDesc:'PERFECT 후 다음 반격속도 +20%', gate:'STAGE 10 · 돌핵 3,000'},
    {id:'rabbit', face:'🐰', art:'./assets/characters/character_rabbit.png', gateStage:15, unlockCost:5000, name:'토끼특공', role:'타이밍형', atk:95, hp:90, counter:4, timing:5, skill:'초집중', skillDesc:'4회 반격마다 다음 PERFECT 판정폭 +35%', gate:'STAGE 15 · 돌핵 5,000'},
    {id:'panda', face:'🐼', art:'./assets/characters/character_panda.png', gateStage:20, unlockCost:7000, name:'판다특공', role:'탱커형', atk:105, hp:150, counter:2, timing:3, skill:'철벽 자세', skillDesc:'5회 피격마다 다음 피해 70% 감소', gate:'STAGE 20 · 돌핵 7,000'},
    {id:'king', face:'🥷', art:'./assets/characters/character_shadow.png', gateStage:20, unlockCost:10000, name:'그림자특공', role:'치명타형', atk:140, hp:75, counter:4, timing:2, skill:'그림자 일격', skillDesc:'PERFECT 시 25% 확률로 2배 피해', gate:'STAGE 20 · 돌핵 10,000'},
    {id:'turtle', art:'./assets/characters/character_turtle.png', face:'🐢', gateStage:30, unlockCost:12000, name:'거북특공', role:'방어형', atk:80, hp:180, counter:2, timing:4, skill:'등껍질 방어', skillDesc:'20초마다 1회 피해 80% 감소', gate:'STAGE 30 · 돌핵 12,000'},
    {id:'shiba', art:'./assets/characters/character_shiba.png', face:'🐕', gateStage:40, unlockCost:15000, name:'시바특공', role:'콤보형', atk:110, hp:105, counter:4, timing:3, skill:'불굴의 추격', skillDesc:'연속 반격마다 공격 +5%, 최대 +30%', gate:'STAGE 40 · 돌핵 15,000'},
    {id:'charge', art:'./assets/characters/character_charge.png', face:'🦅', gateStage:50, unlockCost:20000, name:'돌격특공', role:'파워형', atk:160, hp:100, counter:2, timing:2, skill:'초강타', skillDesc:'PERFECT 피해 +60%', gate:'STAGE 50 · 돌핵 20,000'}
  ];

  let selectedId=(()=>{try{return localStorage.getItem('doldol_character_v1')||'doldol'}catch(e){return 'doldol'}})();

  const style=document.createElement('style');
  style.id='doldol-squad-step1-style';
  style.textContent=`
    #characterScreen{position:fixed!important;inset:0!important;z-index:99998!important;display:none;overflow:hidden!important;
      background:linear-gradient(rgba(29,22,13,.12),rgba(29,22,13,.34)),url('./assets/home_base_bg.png') center/cover fixed!important;
      color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box}
    #characterScreen.show{display:block!important}
    #characterScreen *{box-sizing:border-box}
    #characterScreen .sqWrap{
      width:min(100%,560px);height:100%;margin:auto;
      padding:calc(58px + env(safe-area-inset-top)) 7px calc(8px + env(safe-area-inset-bottom));
      position:relative;display:flex;flex-direction:column;min-height:0
    }
    #characterScreen .sqTop{
      flex:0 0 auto;display:grid;grid-template-columns:48px 1fr;gap:8px;align-items:center;
      margin:0 0 7px
    }
    #characterScreen .sqBack{
      width:46px;height:46px;border:2px solid #c7853f;border-radius:14px;
      background:linear-gradient(#82491d,#542c12);color:#fff;font-size:30px;font-weight:1000;
      box-shadow:0 3px 0 #2b170c,inset 0 1px rgba(255,255,255,.18)
    }
    #characterScreen .sqTitle{
      min-height:46px;display:grid;place-items:center;border:2px solid #c98742;border-radius:13px;
      background:linear-gradient(#9b5829,#6d391a);
      box-shadow:inset 0 1px rgba(255,255,255,.25),0 3px 0 #3e220f;
      font-size:23px;font-weight:1000;text-shadow:0 2px 2px #3a1d0b
    }
    #characterScreen .sqMoney{height:43px;padding:0 11px;display:flex;align-items:center;gap:6px;border-radius:14px;background:rgba(15,25,28,.88);font-weight:1000;color:#ffd866;font-size:13px}
    #characterScreen .sqTabs{
      flex:0 0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:7px;
      border-radius:15px 15px 0 0;background:rgba(45,28,18,.95);
      border:2px solid rgba(194,132,66,.72);border-bottom:0
    }
    #characterScreen .sqTab{
      min-height:42px;border:0;border-radius:10px;padding:7px 3px;
      background:rgba(24,22,21,.74);color:#e8d9c7;font-size:11px;font-weight:1000
    }
    #characterScreen .sqTab.on{
      background:linear-gradient(#ffe985,#ffc83f);color:#3f2b14;
      box-shadow:0 3px 0 #a96d1d,inset 0 1px rgba(255,255,255,.46)
    }
    #characterScreen .sqGrid{
      flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;
      display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:minmax(176px,1fr);
      align-content:stretch;gap:8px;padding:9px;
      background:linear-gradient(180deg,rgba(45,29,18,.96),rgba(39,25,17,.94));
      border:2px solid rgba(194,132,66,.72);border-top:0;border-radius:0 0 18px 18px;
      scrollbar-width:none
    }
    #characterScreen .sqGrid::-webkit-scrollbar{display:none}
    #characterScreen .sqCard{
      position:relative;min-height:176px;padding:8px 5px 8px;border:2px solid #8d9296;border-radius:15px;
      background:linear-gradient(180deg,#484848,#242424);color:#fff;
      box-shadow:inset 0 0 0 2px rgba(255,255,255,.05),0 5px 10px rgba(0,0,0,.24);
      overflow:hidden
    }
    #characterScreen .sqCard.selected{
      border:3px solid #39d5ff;background:linear-gradient(180deg,#86632f,#3f301e);
      box-shadow:0 0 0 2px rgba(255,214,89,.72),0 0 18px rgba(44,211,255,.48)
    }
    #characterScreen .sqCard.locked{filter:grayscale(1);opacity:.72}
    #characterScreen .sqSelected{
      position:absolute;top:0;left:50%;transform:translateX(-50%);
      padding:4px 12px;border-radius:0 0 10px 10px;background:#20bdf2;color:#fff;
      font-size:9px;font-weight:1000;white-space:nowrap;z-index:4;
      box-shadow:0 2px 6px rgba(0,0,0,.22)
    }
    #characterScreen .sqFace{
      height:104px;display:grid;place-items:center;font-size:66px;
      filter:drop-shadow(0 7px 6px rgba(0,0,0,.28));overflow:hidden
    }
#characterScreen .sqFace img{width:134px;height:112px;object-fit:contain;object-position:center;display:block;max-width:none}
#characterScreen .sqHeroFace{overflow:hidden}
#characterScreen .sqHeroFace img{width:112px;height:94px;object-fit:contain;object-position:center;display:block;max-width:none}
    #characterScreen .sqName{display:block;font-size:14px;font-weight:1000;line-height:1.12}
    #characterScreen .sqRole{display:block;margin-top:3px;font-size:9.5px;color:#e5d8c8;font-weight:900}
    #characterScreen .sqLv{display:block;margin-top:5px;font-size:12px;color:#ffe166;font-weight:1000}
    #characterScreen .sqLock{
      position:absolute;top:8px;right:8px;left:auto;bottom:auto;width:30px;height:30px;
      display:grid;place-items:center;font-size:17px;background:rgba(18,23,26,.82);
      border:1px solid rgba(255,255,255,.35);border-radius:9px;z-index:3
    }
    #characterScreen .sqDetail{margin-top:10px;padding:13px;border:2px solid rgba(194,132,66,.7);border-radius:18px;background:linear-gradient(180deg,rgba(57,38,24,.96),rgba(35,29,24,.97));box-shadow:0 10px 26px rgba(0,0,0,.28)}
    #characterScreen .sqHero{display:flex;align-items:center;gap:12px}
    #characterScreen .sqHeroFace{width:76px;height:76px;display:grid;place-items:center;border-radius:18px;background:linear-gradient(#e6b860,#81572b);border:2px solid #e9c77b;font-size:58px}
    #characterScreen .sqHeroText{flex:1;min-width:0}
    #characterScreen .sqHeroName{font-size:22px;font-weight:1000}
    #characterScreen .sqHeroRole{margin-top:2px;color:#ffd866;font-size:11px;font-weight:1000}
    #characterScreen .sqXp{height:9px;margin-top:8px;border-radius:99px;overflow:hidden;background:#17191a}
    #characterScreen .sqXp>i{display:block;height:100%;background:linear-gradient(90deg,#4ecbff,#8ee7ff);border-radius:99px}
    #characterScreen .sqStatGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px}
    #characterScreen .sqStat{padding:8px 9px;border-radius:10px;background:rgba(0,0,0,.24);font-size:11px;font-weight:900}
    #characterScreen .sqStat b{float:right;color:#fff}
    #characterScreen .sqSkill{margin-top:9px;padding:10px;border-radius:12px;background:#f4ead6;color:#4a3421}
    #characterScreen .sqSkill strong{font-size:12px}
    #characterScreen .sqSkill p{margin:3px 0 0;font-size:10px;line-height:1.4;color:#705942;font-weight:700}
    #characterScreen .sqActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    #characterScreen .sqDetailPage{position:absolute;inset:calc(58px + env(safe-area-inset-top)) 0 0;padding:0 8px 18px;background:transparent;border:0;border-radius:0;overflow:auto}
    #characterScreen .sqDetailPage[hidden]{display:none!important}
    #characterScreen .sqDetailBtns{display:flex;gap:6px}
    #characterScreen .sqSkinPage{position:absolute;inset:calc(58px + env(safe-area-inset-top)) 0 0;padding:0 8px 18px;background:transparent;overflow:auto}
    #characterScreen .sqSkinPage[hidden]{display:none!important}
    #characterScreen .sqSkinHero{height:430px;margin:8px 14px 0;display:grid;place-items:center;overflow:hidden}
    #characterScreen .sqSkinHero img{width:96%;height:100%;object-fit:contain}
    #characterScreen .sqSkinHero .emoji{font-size:170px}
    #characterScreen .sqSkinLabel{text-align:center;font-size:18px;font-weight:1000}
    #characterScreen .sqSkinEquipped{width:max-content;margin:8px auto 14px;padding:7px 16px;border-radius:99px;background:#246f3d;color:#a7f2ba;font-size:12px;font-weight:1000}
    #characterScreen .sqSkinRail{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:0 14px;padding:9px;border-radius:14px;background:rgba(0,0,0,.35)}
    #characterScreen .sqSkinCard{position:relative;min-height:105px;padding:5px;border:2px solid #806142;border-radius:11px;background:rgba(45,35,29,.92);color:#fff}
    #characterScreen .sqSkinCard.on{border-color:#ffd45a}
    #characterScreen .sqSkinThumb{height:68px;display:grid;place-items:center;overflow:hidden}
    #characterScreen .sqSkinThumb img{width:82px;height:76px;object-fit:contain}
    #characterScreen .sqSkinCard b{display:block;margin-top:5px;font-size:10px}
    #characterScreen .sqSkinLock{position:absolute;inset:0;display:grid;place-items:center;border-radius:9px;background:rgba(9,11,12,.66);font-size:23px}
    #characterScreen .sqDetailHead{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;gap:8px;margin-bottom:8px}
    #characterScreen .sqDetailBack{width:44px;height:44px;border:2px solid #d39a55;border-radius:12px;background:linear-gradient(#75451f,#4b2a15);color:#fff;font-size:29px;font-weight:1000;box-shadow:0 3px 0 #321a0c}
    #characterScreen .sqDetailTitle{text-align:center;font-size:23px;font-weight:1000;text-shadow:0 2px 2px #3a1d0b}
    #characterScreen .sqDetailHero{height:285px;margin:12px 14px 0;display:grid;place-items:center;overflow:hidden;border-radius:16px;background:linear-gradient(rgba(255,255,255,.08),rgba(0,0,0,.18))}
    #characterScreen .sqDetailHero img{width:96%;height:106%;object-fit:contain;display:block;transform:translateY(1%)}
    #characterScreen .sqDetailHero .emoji{font-size:126px}
    #characterScreen .sqDetailLevel{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;margin:10px 14px;padding:10px;border-radius:12px;background:rgba(0,0,0,.28)}
    #characterScreen .sqDetailLevel button,#characterScreen .sqSelectBig{border:0;border-radius:11px;background:linear-gradient(#ffe168,#ffb92f);color:#3d2b10;font-weight:1000}
    #characterScreen .sqDetailLevel button{padding:10px 13px}
    #characterScreen .sqDetailTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:0 14px}
    #characterScreen .sqDetailTabs button{padding:11px 3px;border:0;border-radius:9px;background:#38291f;color:#ead9c5;font-weight:1000}
    #characterScreen .sqDetailTabs button.on{background:#f7e6ad;color:#49351f}
    #characterScreen .sqDetailBody{margin:8px 14px 0;min-height:118px;padding:12px;border-radius:12px;background:rgba(0,0,0,.23)}
    #characterScreen .sqDetailBody .row{display:flex;justify-content:space-between;padding:8px 3px;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px;font-weight:900}
    #characterScreen .sqSkillCard{display:grid;grid-template-columns:56px 1fr auto;gap:9px;align-items:center;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,.12)}
    #characterScreen .sqSkillCard:last-child{border-bottom:0}
    #characterScreen .sqSkillIcon{width:52px;height:52px;display:grid;place-items:center;border-radius:12px;background:#5b3821;border:2px solid #b77b3b;font-size:27px}
    #characterScreen .sqSkillInfo{min-width:0}.sqSkillInfo strong{display:block;font-size:14px}.sqSkillInfo small{display:block;color:#ffd65b;font-weight:900;margin:2px 0}.sqSkillInfo p{margin:0!important;color:#e6d8ca!important;font-size:10px!important}
    #characterScreen .sqSkillUp{min-width:78px;padding:8px 6px;border:0;border-radius:10px;background:linear-gradient(#ffe16b,#ffbd2b);color:#3c280f;font-size:10px;font-weight:1000;box-shadow:0 3px 0 #93601b}
    #characterScreen .sqSkillUp:disabled{background:#756b60;color:#cbc4bc;box-shadow:none}.lockedSkill{opacity:.78}
    #characterScreen .sqDetailBody .skillBox{padding:10px;border-radius:10px;background:#f4ead6;color:#4a3421}
    #characterScreen .sqDetailBody .skillBox p{margin:5px 0 0;font-size:11px;line-height:1.45}
    #characterScreen .sqSelectBig{width:calc(100% - 28px);min-height:50px;margin:10px 14px 0;font-size:15px}
    #characterScreen .sqLevelModal{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:18px;background:rgba(8,13,15,.72);backdrop-filter:blur(7px)}
    #characterScreen .sqLevelModal[hidden]{display:none!important}
    #characterScreen .sqLevelPanel{width:min(100%,390px);overflow:hidden;border:2px solid #b9793d;border-radius:20px;background:#f5e7c7;color:#382719;box-shadow:0 18px 48px rgba(0,0,0,.48)}
    #characterScreen .sqLevelHead{height:56px;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;padding:0 10px;background:linear-gradient(#aa642e,#81451f);color:#fff}
    #characterScreen .sqLevelHead b{text-align:center;font-size:20px}.sqLevelClose{width:38px;height:38px;border:2px solid #e0a765;border-radius:11px;background:#75411f;color:#fff;font-size:24px;font-weight:1000}
    #characterScreen .sqLevelContent{padding:14px}
    #characterScreen .sqLevelChar{display:grid;grid-template-columns:68px 1fr;gap:12px;align-items:center}.sqLevelPortrait{width:68px;height:68px;display:grid;place-items:center;overflow:hidden;border-radius:14px;background:#e6bd68;border:2px solid #d49a42}.sqLevelPortrait img{width:90px;height:78px;object-fit:contain;max-width:none}
    #characterScreen .sqLevelName{font-size:18px;font-weight:1000}.sqLevelJump{margin-top:5px;font-size:18px;font-weight:1000}.sqLevelJump em{font-style:normal;color:#27a969}
    #characterScreen .sqLevelStats{margin-top:13px;padding:10px 13px;border-radius:14px;background:#503528;color:#fff}.sqLevelStat{display:grid;grid-template-columns:1fr auto 22px auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.14)}.sqLevelStat:last-child{border-bottom:0}.sqLevelStat .next{color:#45d888;font-weight:1000}
    #characterScreen .sqLevelCost{margin-top:12px;padding:13px;text-align:center;border-radius:14px;background:#fff7e6}.sqLevelCost small{display:block;font-weight:900}.sqLevelCost b{display:block;margin-top:5px;font-size:20px}
    #characterScreen .sqLevelConfirm{width:100%;height:52px;margin-top:12px;border:0;border-radius:13px;background:linear-gradient(#ffe16b,#ffbd2b);color:#3b2a13;font-size:17px;font-weight:1000;box-shadow:0 4px 0 #b37a26}.sqLevelConfirm:disabled{background:#d9caa7;color:#807763;box-shadow:0 4px 0 #aa9d80}

    #characterScreen .sqBtn{min-height:48px;border:0;border-radius:13px;font-size:14px;font-weight:1000}
    #characterScreen .sqBtn.sub{background:#f3e7cc;color:#52391e}
    #characterScreen .sqBtn.main{background:linear-gradient(#ffe168,#ffb92f);color:#3d2b10;box-shadow:0 4px 0 #ad6c18}
    #characterScreen .sqBtn:disabled{filter:grayscale(.8);opacity:.55;box-shadow:none}
    #characterScreen .sqHud{
      position:absolute;left:8px;right:8px;top:calc(7px + env(safe-area-inset-top));
      height:50px;display:flex;align-items:center;gap:6px;z-index:8
    }
    #characterScreen .sqHudProfile{
      width:84px;min-width:84px;flex:0 0 84px;height:46px;
      display:flex;align-items:center;gap:5px;padding:4px 7px 4px 4px;
      border:2px solid rgba(255,255,255,.28);border-radius:16px;
      background:rgba(30,48,55,.82);box-shadow:0 4px 10px rgba(0,0,0,.15);
      overflow:hidden
    }
    #characterScreen .sqHudFace{
      width:26px;height:26px;min-width:26px;flex:0 0 26px;
      display:grid;place-items:center;overflow:hidden;border-radius:11px;
      background:#f7dca0;border:1.5px solid #fff
    }
    #characterScreen .sqHudFace img{
      width:100%;height:100%;object-fit:contain;display:block;max-width:none
    }
    #characterScreen .sqHudWho{min-width:0;flex:1;line-height:1.02;overflow:hidden}
    #characterScreen .sqHudWho b{
      display:block;font-size:9px;line-height:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis
    }
    #characterScreen .sqHudWho small{display:block;font-size:8px;line-height:10px;color:#fff;opacity:.85;margin:0}
    #characterScreen .sqHudXp{display:block;width:26px;height:3px;margin-top:2px;background:#1d2a2a;border-radius:9px;overflow:hidden}
    #characterScreen .sqHudXp i{display:block;width:62%;height:100%;background:#ffd34e}
    #characterScreen .sqHudResources{
      display:flex;align-items:center;justify-content:flex-end;gap:5px;flex:1 1 auto;min-width:0
    }
    #characterScreen .sqHudRes{
      height:50px;display:flex;align-items:center;gap:4px;box-sizing:border-box;
      border:1px solid rgba(255,255,255,.22);border-radius:16px;
      background:rgba(30,48,55,.82);white-space:nowrap;overflow:hidden
    }
    #characterScreen .sqHudCoreRes{
      width:108px;min-width:108px;max-width:108px;flex:0 0 108px;padding:5px 5px 5px 7px
    }
    #characterScreen .sqHudGemRes{
      width:84px;min-width:84px;max-width:84px;flex:0 0 84px;padding:5px 5px 5px 7px
    }
    #characterScreen .sqHudCoreRes img{
      width:28px;height:28px;object-fit:cover;object-position:29% 50%;flex:0 0 28px
    }
    #characterScreen .sqHudGemIcon{font-size:16px;line-height:1;flex:0 0 auto}
    #characterScreen .sqHudRes b{
      flex:1 1 auto;min-width:0;text-align:center;overflow:visible;text-overflow:clip;
      white-space:nowrap;font-size:13px;line-height:1;font-weight:1000;letter-spacing:-.3px
    }
    #characterScreen .sqHudRes button{
      display:grid;place-items:center;flex:0 0 24px;width:24px;height:24px;min-width:24px;
      padding:0;margin:0;border:0;border-radius:50%;background:#55aeea;color:#fff;
      font-size:18px;font-weight:1000;line-height:1
    }
    #characterScreen .sqHudSettings{
      width:40px;height:40px;min-width:40px;flex:0 0 40px;border:0;border-radius:14px;
      background:rgba(30,48,55,.82);color:#fff;font-size:22px
    }
    @media(max-width:390px){
      #characterScreen .sqHud{gap:4px;left:5px;right:5px}
      #characterScreen .sqHudProfile{width:82px;min-width:82px;flex-basis:82px;height:44px}
      #characterScreen .sqHudFace{width:25px;height:25px;min-width:25px;flex-basis:25px}
      #characterScreen .sqHudCoreRes{width:103px;min-width:103px;max-width:103px;flex-basis:103px}
      #characterScreen .sqHudGemRes{width:80px;min-width:80px;max-width:80px;flex-basis:80px}
      #characterScreen .sqHudRes b{font-size:12px}
      #characterScreen .sqHudRes button{width:23px;height:23px;min-width:23px;flex-basis:23px}
      #characterScreen .sqHudSettings{width:38px;height:38px;min-width:38px;flex-basis:38px}
    }
    #characterScreen .sqUnlockBody{margin:10px 14px 0;padding:16px;border-radius:14px;background:rgba(22,25,27,.82);text-align:center}
    #characterScreen .sqUnlockBody h3{margin:0 0 5px;font-size:18px}.sqUnlockBody p{margin:0;color:#e8dfd2;font-size:12px;line-height:1.55}
    #characterScreen .sqUnlockReq{display:grid;gap:7px;margin-top:13px;text-align:left}.sqUnlockReq div{padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.08);font-size:12px;font-weight:900}
    #characterScreen .sqUnlockReq .ok{color:#7ee39a}.sqUnlockReq .no{color:#ffb0a5}
    @media(max-width:390px){#characterScreen .sqHud{grid-template-columns:minmax(92px,1fr) auto auto 38px;gap:3px;left:5px;right:5px}#characterScreen .sqHudRes{font-size:10px!important;padding-inline:5px!important}#characterScreen .sqHudBox{padding:4px 5px!important}}
    /* character optical-size normalization */
    #characterScreen .sqCard[data-id="nyang"] .sqArt img{transform:scale(1.08) translateY(3%)}
    #characterScreen .sqCard[data-id="rabbit"] .sqArt img{transform:scale(1.04) translateY(2%)}
    #characterScreen .sqCard[data-id="panda"] .sqArt img{transform:scale(1.03) translateY(2%)}
    #characterScreen .sqCard[data-id="king"] .sqArt img{transform:scale(1.02) translateY(1%)}
    #characterScreen .sqCard[data-id="turtle"] .sqArt img{transform:scale(.96) translateY(1%)}
    #characterScreen .sqCard[data-id="shiba"] .sqArt img{transform:scale(1.04) translateY(2%)}
    #characterScreen .sqCard[data-id="charge"] .sqArt img{transform:scale(.91) translateY(1%)}
    @media(max-width:370px){
      #characterScreen .sqGrid{gap:6px;padding:7px;grid-auto-rows:minmax(160px,1fr)}
      #characterScreen .sqCard{min-height:160px}
      #characterScreen .sqFace{height:91px;font-size:54px!important}
      #characterScreen .sqFace img{width:118px;height:100px}
    }
  `;
  document.head.appendChild(style);

  /* ===== UI 아이콘 (assets/ui_icons/*.png) — 파일이 없으면 이모지로 자동 대체 ===== */
  const UI_ICON={atk:'stat_attack',defense:'stat_defense',hp:'stat_hp',special:'stat_special',counter:'stat_counter',timing:'stat_timing',speed:'role_speed',critical:'role_critical',combo:'role_combo',power:'role_power',balance:'role_balance',lock:'ui_lock'};
  function uiIc(key,fb){return `<img class="uiIc" src="./assets/ui_icons/${UI_ICON[key]}.png" alt="" data-fb="${fb}" onerror="this.outerHTML=this.dataset.fb">`}
  function lockIc(){return `<img class="lockIc" src="./assets/ui_icons/${UI_ICON.lock}.png" alt="잠금" data-fb="🔒" onerror="this.outerHTML=this.dataset.fb">`}
  const STORY={
    doldol:['돌돌이','돌을 사랑하는 노란 오리 대장. 겁은 많지만 동료가 위험할 때면 누구보다 먼저 돌을 던집니다.','"돌 하나면 충분하다꽥!"'],
    nyang:['냥특공','발소리 없이 전장을 누비는 날쌘 고양이. 눈 깜짝할 새에 연타를 꽂아 넣습니다.','"느리다냥. 이미 끝났다냥."'],
    rabbit:['토끼특공','먼 곳의 적도 놓치지 않는 저격수. 숨을 고르고 딱 한 발, 정확한 타이밍을 노립니다.','"지금이야, 딱 한 번!"'],
    panda:['판다특공','든든한 몸으로 동료 앞에 서는 방패. 느긋해 보여도 한번 막으면 절대 물러서지 않습니다.','"내 뒤로 와~ 괜찮아."'],
    king:['그림자특공','그림자 속에서 나타나 급소만 노리는 암살자. 정체는 아직 아무도 모릅니다.','"…이미 뒤에 있어."'],
    turtle:['거북특공','단단한 등껍질로 모든 공격을 받아내는 철벽. 느리지만 끝까지 살아남습니다.','"천천히, 그래도 확실하게."'],
    shiba:['시바특공','콤보가 이어질수록 흥분하는 열혈 대원. 꼬리가 흔들리면 폭풍 공격이 시작됩니다.','"더 더 더! 멈추지 마!"'],
    charge:['돌격특공','앞뒤 가리지 않고 적진으로 뛰어드는 파워 대원. 한 방의 무게가 남다릅니다.','"전원 돌격! 내가 선두다!"']
  };
  function storyHtml(c){
    const s=STORY[c.id]||[c.name,(c.role||'')+' 특공대원입니다.',''];
    return `<div class="sqStory"><div class="sqStoryHead"><span>📖</span><b>${s[0]}의 이야기</b></div><p>${s[1]}</p>${s[2]?`<q>${s[2]}</q>`:''}<div class="sqStoryFoot">${c.role||''} · ${c.skill||''}</div></div>`;
  }
  function coreIc(){return '<img class="coreIc" src="./assets/doldol_stone_core.png" alt="돌핵">'}
  /* ===== 스킨 시스템 (외형만 변경, 능력치 영향 없음) ===== */
  const SKIN_KEY='doldol_skins_v1';
  const SKINS={
    doldol:[
      {id:'army',name:'육군 스킨',art:'./assets/skins/doldol_army.png',cond:{type:'level',v:5},desc:'거친 지형도 문제없다. 믿음직한 육군 전투복.',quote:'"땅은 내가 지킨다꽥!"'},
      {id:'navy',name:'해군 스킨',art:'./assets/skins/doldol_navy.png',cond:{type:'level',v:10},desc:'거친 파도를 가르는 해군 전투복.',quote:'"출항 준비 완료꽥!"'},
      {id:'airforce',name:'공군 스킨',art:'./assets/skins/doldol_airforce.png',cond:{type:'core',v:5000},desc:'하늘을 지배하는 공군 비행복.',quote:'"하늘은 내 구역이다꽥!"'},
      {id:'marines',name:'해병 스킨',art:'./assets/skins/doldol_marines.png',cond:{type:'gem',v:500},desc:'상륙 작전의 선봉, 해병 전투복.',quote:'"한 번 해병은 영원한 해병꽥!"'}
    ],
    nyang:[
      {id:'recon',name:'정찰대 스킨',short:'정찰대',art:'./assets/skins/nyang_recon.png',cond:{type:'level',v:5},desc:'소리 없이 정보를 모으는 정찰대 전투복.',quote:'"조용히, 빠르게, 정확하다냥."'},
      {id:'night',name:'야간잠입 스킨',short:'야간잠입',art:'./assets/skins/nyang_night.png',cond:{type:'level',v:10},desc:'어둠 속에서 움직이는 야간 잠입 장비.',quote:'"밤은 내 편이다냥."'},
      {id:'pilot',name:'파일럿 스킨',short:'파일럿',art:'./assets/skins/nyang_pilot.png',cond:{type:'core',v:5000},desc:'하늘을 가르는 비행사 스타일 전투복.',quote:'"이륙 준비 완료다냥!"'},
      {id:'cyber',name:'사이버 스카우트 스킨',short:'스카우트',art:'./assets/skins/nyang_cyber.png',cond:{type:'gem',v:500},desc:'네온빛 첨단 장비를 갖춘 사이버 정찰병.',quote:'"데이터 확인 완료다냥."'}
    ],
    rabbit:[
      {id:'recon',name:'정찰저격 스킨',short:'정찰',art:'./assets/skins/rabbit_recon.png',cond:{type:'level',v:5},desc:'먼 곳을 살피는 정찰 저격수 복장.',quote:'"조준 완료, 숨을 고르고…"'},
      {id:'snow',name:'설원저격 스킨',short:'설원',art:'./assets/skins/rabbit_snow.png',cond:{type:'level',v:10},desc:'눈밭에 완벽히 녹아드는 설원 위장복.',quote:'"눈에 띄지 않는 게 내 실력이야."'},
      {id:'desert',name:'사막저격 스킨',short:'사막',art:'./assets/skins/rabbit_desert.png',cond:{type:'core',v:5000},desc:'뜨거운 모래바람을 견디는 사막 저격 장비.',quote:'"바람을 읽고 쏜다."'},
      {id:'gold',name:'황금명사수 스킨',short:'황금',art:'./assets/skins/rabbit_gold.png',cond:{type:'gem',v:500},desc:'전설의 명사수에게만 허락된 황금 장비.',quote:'"한 발이면 충분해!"'}
    ],
    panda:[
      {id:'heavy',name:'중장갑 스킨',short:'중장갑',art:'./assets/skins/panda_heavy.png',cond:{type:'level',v:5},desc:'어떤 공격도 버텨내는 두꺼운 중장갑 전투복.',quote:'"덤벼봐, 끄떡없다판다!"'},
      {id:'swat',name:'진압대 스킨',short:'진압대',art:'./assets/skins/panda_swat.png',cond:{type:'level',v:10},desc:'앞장서서 길을 여는 진압대 장비.',quote:'"내가 먼저 간다판다!"'},
      {id:'shield',name:'공성방패 스킨',short:'공성방패',art:'./assets/skins/panda_shield.png',cond:{type:'core',v:5000},desc:'성벽처럼 든든한 대형 공성 방패.',quote:'"여긴 절대 못 지나간다판다."'},
      {id:'gold',name:'황금수호 스킨',short:'황금',art:'./assets/skins/panda_gold.png',cond:{type:'gem',v:500},desc:'동료를 지키는 황금빛 수호자의 갑옷.',quote:'"모두 내 뒤로 오라판다!"'}
    ]
  };
  /* 테스트용: true면 모든 캐릭터·스킨 잠금이 풀려요. 확인이 끝나면 false로 바꾸세요 */
  const TEST_UNLOCK_ALL=true;
  function skinState(){try{const s=JSON.parse(localStorage.getItem(SKIN_KEY)||'{}')||{};return{owned:s.owned||{},equipped:s.equipped||{}}}catch(e){return{owned:{},equipped:{}}}}
  function saveSkin(s){try{localStorage.setItem(SKIN_KEY,JSON.stringify(s))}catch(e){}}
  function skinList(cid){
    const c=uiRoster.find(x=>x.id===cid)||{};
    return [{id:'base',name:'기본 스킨',art:null,cond:null,desc:'특공대의 기본 전투복. 언제 어디서든 달려갈 준비가 되어있다.',quote:((STORY[cid]||[])[2])||''}].concat(SKINS[cid]||[]);
  }
  function skinOwned(cid,sk){
    if(!sk.cond||TEST_UNLOCK_ALL)return true;
    if(((skinState().owned[cid])||[]).includes(sk.id))return true;
    return sk.cond.type==='level'&&progress(cid).level>=sk.cond.v;
  }
  function equippedSkin(cid){
    const list=skinList(cid),id=skinState().equipped[cid]||'base';
    const sk=list.find(x=>x.id===id);
    return sk&&skinOwned(cid,sk)?sk:list[0];
  }
  function skinArt(cid){return equippedSkin(cid).art||null}
  window.__doldolSkinArt=skinArt;
  uiRoster.forEach(c=>{const base=c.art;c.baseArt=base;Object.defineProperty(c,'art',{configurable:true,enumerable:true,get(){return skinArt(c.id)||base},set(v){}})});
  function skinCondText(sk){
    if(!sk.cond)return '';
    if(sk.cond.type==='level')return 'Lv.'+sk.cond.v+' 달성';
    if(sk.cond.type==='core')return sk.cond.v.toLocaleString()+' 돌핵';
    return '💎 '+sk.cond.v;
  }
  function progress(id){return window.__duckCharacterProgress?window.__duckCharacterProgress(id):{level:1,xp:0,next:50}}
  function core(){try{return window.__duckWallet?window.__duckWallet.coins:Number(localStorage.getItem('doldol_coins_v1')||0)}catch(e){return 0}}
  function clearedStage(){
    try{return Number(localStorage.getItem('doldol_unlocked_stage_v1')||1)}catch(e){return 1}
  }
  function owned(id){
    const c=uiRoster.find(x=>x.id===id);
    if(!c || id==='doldol' || TEST_UNLOCK_ALL) return true;
    const p=progress(id);
    if(Number(p.level||1)>1 || Number(p.xp||0)>0) return true;
    try{
      if((localStorage.getItem('doldol_character_v1')||'doldol')===id) return true;
      const list=JSON.parse(localStorage.getItem('doldol_character_owned_v1')||'[]');
      return Array.isArray(list)&&list.includes(id);
    }catch(e){return false}
  }
  function canUnlock(c){ return clearedStage()>=Number(c.gateStage||999); }
  function markOwned(id){
    try{
      const list=JSON.parse(localStorage.getItem('doldol_character_owned_v1')||'[]');
      const next=Array.isArray(list)?list:[];
      if(!next.includes(id))next.push(id);
      localStorage.setItem('doldol_character_owned_v1',JSON.stringify(next));
    }catch(e){}
  }
  function current(){return uiRoster.find(c=>c.id===selectedId)||uiRoster[0]}

  function build(){
    screen.innerHTML=`
      <header class="ddHomeHud" id="sqHud">
        <div class="ddProfile"><div class="ddAvatar" id="sqHudFace"></div><div class="ddProfileText"><b id="sqHudName"></b><span id="sqHudLv"></span><div class="ddXp"><i id="sqHudXp"></i></div></div></div>
        <div class="ddResources">
          <div class="ddRes ddCore"><img src="./assets/doldol_stone_core.png" alt="돌핵"><b id="sqHudCore">0</b><button class="ddPlus" type="button" aria-label="돌핵 추가">+</button></div>
          <div class="ddRes"><span class="ddGem">💎</span><b id="sqHudGem">980</b><button class="ddPlus" type="button" aria-label="보석 추가">+</button></div>
        </div>
        <button class="ddSettings" id="sqHudSettings" type="button" aria-label="설정">⚙</button>
      </header>
      <div class="sqWrap">
        <div class="sqTop">
          <button class="sqBack" id="charBack" aria-label="뒤로">‹</button>
          <div class="sqTitle">특공대</div>
        </div>
        <div class="sqTabs">
          <button class="sqTab on">전체</button><button class="sqTab">${uiIc('atk','⚔')} 공격형</button><button class="sqTab">${uiIc('defense','🛡')} 방어형</button><button class="sqTab">${uiIc('special','✦')} 특수형</button>
        </div>
        <div class="sqGrid" id="charGrid"></div>
        <div class="sqDetailPage" id="sqDetailPage" hidden>
          <div class="sqDetailHead"><button class="sqDetailBack" id="sqDetailBack">‹</button><div class="sqDetailTitle" id="sqDetailTitle"></div></div>
          <div class="sqDetailHero" id="sqDetailHero"></div>
          <div class="sqDetailLevel"><b id="sqDetailLv"></b><div class="sqXp"><i id="sqDetailXp"></i></div><div class="sqDetailBtns"><button id="sqSkinBtn">스킨</button><button id="sqLevelBtn">레벨업</button></div></div>
          <div class="sqDetailTabs"><button class="on">능력치</button><button>스킬</button><button>스토리</button></div>
          <div class="sqDetailBody" id="sqDetailBody"></div>
          <button class="sqSelectBig" id="sqSelectBig">선택하기</button>
        </div>
        <div class="sqSkinPage" id="sqSkinPage" hidden>
          <div class="sqDetailHead"><button class="sqDetailBack" id="sqSkinBack">‹</button><div class="sqDetailTitle">스킨</div></div>
          <div class="sqSkinHero" id="sqSkinHero"></div>
          <div class="sqSkinInfo"><div class="sqSkinLabel" id="sqSkinLabel"></div><p id="sqSkinDesc"></p><q id="sqSkinQuote"></q></div>
          <button class="sqSkinAction" id="sqSkinAction" type="button"></button>
          <div class="sqSkinRail" id="sqSkinRail"></div>
        </div>
        <div class="sqLevelModal" id="sqLevelModal" hidden>
          <div class="sqLevelPanel">
            <div class="sqLevelHead"><span></span><b>레벨업</b><button class="sqLevelClose" id="sqLevelClose">×</button></div>
            <div class="sqLevelContent">
              <div class="sqLevelChar"><div class="sqLevelPortrait" id="sqLevelPortrait"></div><div><div class="sqLevelName" id="sqLevelName"></div><div class="sqLevelJump" id="sqLevelJump"></div></div></div>
              <div class="sqLevelStats" id="sqLevelStats"></div>
              <div class="sqLevelCost"><small>필요 돌핵</small><b id="sqLevelCost"></b></div>
              <button class="sqLevelConfirm" id="sqLevelConfirm"></button>
            </div>
          </div>
        </div>
      </div>
      <nav class="ddBottomNav" aria-label="메인 메뉴">
        <button type="button" class="ddNavItem" data-sq-nav="home"><span class="ddNavIcon"><img src="./assets/home_nav/home_nav_home.png" alt=""></span><b>홈</b></button>
        <button type="button" class="ddNavItem isActive" aria-current="page" data-sq-nav="squad"><span class="ddNavIcon"><img src="./assets/home_nav/home_nav_squad.png" alt=""></span><b>특공대</b></button>
        <button type="button" class="ddNavItem" data-sq-nav="gear"><span class="ddNavIcon"><img src="./assets/home_nav/home_nav_gear.png" alt=""></span><b>장비</b></button>
        <button type="button" class="ddNavItem" data-sq-nav="shop"><span class="ddNavIcon"><img src="./assets/home_nav/home_nav_shop.png" alt=""></span><b>상점</b></button>
      </nav>`;
    screen.querySelector('#charBack').onclick=()=>{
      screen.classList.remove('show');
      const lobby=document.getElementById('gameLobby');
      if(lobby)lobby.classList.remove('hidden');
      if(window.__duckSyncLobby)window.__duckSyncLobby();
    };
    screen.querySelector('#sqHudSettings').onclick=()=>{
      const btn=['lobbySettings','settingsBtn','settingBtn'].map(id=>document.getElementById(id)).find(Boolean);
      if(btn) btn.click();
    };
    screen.querySelector('#sqDetailBack').onclick=closeDetail;
    screen.querySelector('#sqSkinBtn').onclick=openSkinPage;
    screen.querySelector('#sqSkinBack').onclick=closeSkinPage;
    screen.querySelector('#sqLevelBtn').onclick=openLevelModal;
    screen.querySelector('#sqLevelClose').onclick=()=>screen.querySelector('#sqLevelModal').hidden=true;
    screen.querySelector('#sqLevelModal').onclick=e=>{if(e.target.id==='sqLevelModal')e.currentTarget.hidden=true};
    screen.querySelector('#sqSelectBig').onclick=()=>{
      const c=current(); if(!owned(c.id)) return;
      try{localStorage.setItem('doldol_character_v1',c.id)}catch(e){}
      renderHud();
      openDetail();
    };

    const sqNav=screen.querySelector('.ddBottomNav');
    if(sqNav&&window.ResizeObserver){
      new ResizeObserver(()=>screen.style.setProperty('--sq-nav-h',sqNav.offsetHeight+'px')).observe(sqNav);
    }

    function leaveSquadToLobby(){
      screen.classList.remove('show');
      const lobby=document.getElementById('gameLobby');
      if(lobby)lobby.classList.remove('hidden');
      if(window.__duckSyncLobby)window.__duckSyncLobby();
    }
    screen.querySelectorAll('[data-sq-nav]').forEach(btn=>{
      btn.onclick=()=>{
        const target=btn.dataset.sqNav;
        if(target==='squad'){
          if(!screen.querySelector('#sqDetailPage').hidden) closeDetail();
          if(!screen.querySelector('#sqSkinPage').hidden) closeSkinPage();
          return;
        }
        if(target==='home'){
          leaveSquadToLobby();
          return;
        }
        if(target==='gear'){
          leaveSquadToLobby();
          requestAnimationFrame(()=>{
            const gear=document.getElementById('lobbyGear');
            if(gear)gear.click();
          });
          return;
        }
        if(target==='shop'){
          screen.classList.remove('show');
          if(typeof window.__duckOpenShop==='function'){
            window.__duckOpenShop();
          }else{
            const lobby=document.getElementById('gameLobby');
            if(lobby)lobby.classList.remove('hidden');
            requestAnimationFrame(()=>{
              const shop=document.getElementById('lobbyShop');
              if(shop)shop.click();
            });
          }
        }
      };
    });

    screen.querySelectorAll('.sqDetailTabs button').forEach((b,i)=>b.onclick=()=>renderDetailTab(['stats','skill','story'][i]));
    renderHud();
    screen.querySelectorAll('.sqTab').forEach((b,i)=>b.onclick=()=>{
      screen.querySelectorAll('.sqTab').forEach(x=>x.classList.remove('on')); b.classList.add('on');
      const filters=[()=>true,c=>/공격|스피드|치명타|파워/.test(c.role),c=>/탱커|방어/.test(c.role),c=>/밸런스|타이밍|콤보/.test(c.role)];
      renderGrid(filters[i]);
    });
  }

  function renderHud(){
    const active=(()=>{try{return localStorage.getItem('doldol_character_v1')||'doldol'}catch(e){return 'doldol'}})();
    const c=uiRoster.find(x=>x.id===active)||uiRoster[0], p=progress(c.id);
    const face=screen.querySelector('#sqHudFace');
    if(face) face.innerHTML=c.art?`<img src="${c.art}" alt="">`:`<span>${c.face}</span>`;
    const n=screen.querySelector('#sqHudName'); if(n)n.textContent=c.name;
    const lv=screen.querySelector('#sqHudLv'); if(lv)lv.textContent='Lv.'+p.level;
    const xpi=screen.querySelector('#sqHudXp');
    if(xpi){
      const pct=Math.max(0,Math.min(100,(Number(p.xp)||0)/Math.max(1,Number(p.next)||1)*100));
      xpi.style.width=pct+'%';
    }
    const compact=(n)=>{
      n=Math.max(0,Math.floor(Number(n)||0));
      if(n<100000)return n.toLocaleString();
      if(n<1000000)return Math.floor(n/1000)+'K';
      if(n<1000000000){
        const m=n/1000000;
        return (m<10?m.toFixed(1):Math.floor(m)).toString().replace(/\.0$/,'')+'M';
      }
      const b=n/1000000000;
      return (b<10?b.toFixed(1):Math.floor(b)).toString().replace(/\.0$/,'')+'B';
    };
    const co=screen.querySelector('#sqHudCore');
    if(co){
      const v=core();
      co.textContent=compact(v);
      co.title=Number(v||0).toLocaleString();
      co.dataset.long=Number(v||0)>=10000?'1':'0';
    }
    let gems=980;
    try{
      for(const k of ['doldol_gems_v1','doldol_gem_v1','doldol_diamonds_v1']){
        const v=localStorage.getItem(k);
        if(v!==null){gems=Number(v)||0;break;}
      }
    }catch(e){}
    const ge=screen.querySelector('#sqHudGem');
    if(ge){ge.textContent=compact(gems);ge.title=Number(gems||0).toLocaleString();}
  }

  function renderGrid(filter=()=>true){
    const grid=screen.querySelector('#charGrid'); if(!grid)return;
    const active=(()=>{try{return localStorage.getItem('doldol_character_v1')||'doldol'}catch(e){return 'doldol'}})();
    grid.innerHTML=uiRoster.filter(filter).map(c=>{
      const p=progress(c.id), lock=!owned(c.id);
      const ROLE_IC={
        '밸런스형':['balance','⚖'],'스피드형':['speed','🪽'],'타이밍형':['timing','◎'],'탱커형':['defense','🛡'],
        '치명타형':['critical','✦'],'방어형':['defense','🛡'],'콤보형':['combo','⚡'],'파워형':['power','💥']
      };
      const ri=ROLE_IC[c.role]||['special','✦'];
      const roleIc=uiIc(ri[0],ri[1]);
      return `<button class="sqCard ${c.id===selectedId?'selected':''} ${lock?'locked':''}" data-id="${c.id}">
        ${c.id===active?'<span class="sqSelected">선택중</span>':''}
        <span class="sqPortrait">${c.art?`<img src="${c.art}" alt="${c.name}">`:`<span class="emoji">${c.face}</span>`}</span>
        <span class="sqInfo">
          <span class="sqName">${c.name}</span>
          <span class="sqRole"><i class="sqRoleIc">${roleIc}</i>${c.role}</span>
          <span class="sqLv">Lv.${p.level}</span>
        </span>
        ${lock?`<span class="sqLock" title="${c.gate}">${lockIc()}</span>`:''}
      </button>`;
    }).join('');
    grid.querySelectorAll('.sqCard').forEach(b=>b.onclick=()=>{selectedId=b.dataset.id;openDetail()});
  }

  let skinIdx=0;
  function openSkinPage(){
    const c=current(),page=screen.querySelector('#sqSkinPage'); if(!page)return;
    const list=skinList(c.id),eq=equippedSkin(c.id);
    skinIdx=Math.max(0,list.findIndex(x=>x.id===eq.id));
    screen.querySelector('#sqDetailPage').hidden=true; page.hidden=false;
    renderSkinPage();
  }
  function syncSkinEverywhere(){
    renderHud(); renderGrid();
    try{if(window.__doldolSyncHomeHud)window.__doldolSyncHomeHud()}catch(e){}
    try{if(window.__duckSyncLobby)window.__duckSyncLobby()}catch(e){}
  }
  function renderSkinPage(){
    const c=current(),list=skinList(c.id),sk=list[skinIdx]||list[0],own=skinOwned(c.id,sk),eq=equippedSkin(c.id).id===sk.id;
    const art=sk.art||c.baseArt;
    const dim=own?'':'filter:grayscale(.85) brightness(.7);';
    screen.querySelector('#sqSkinHero').innerHTML=
      (art?`<img src="${art}" alt="${sk.name}" style="${dim}">`:`<span class="emoji">${c.face}</span>`)+
      (list.length>1?'<button class="sqSkinArrow l" type="button" aria-label="이전">‹</button><button class="sqSkinArrow r" type="button" aria-label="다음">›</button>':'');
    const go=d=>{skinIdx=(skinIdx+d+list.length)%list.length;renderSkinPage()};
    const al=screen.querySelector('.sqSkinArrow.l'),ar=screen.querySelector('.sqSkinArrow.r');
    if(al)al.onclick=()=>go(-1); if(ar)ar.onclick=()=>go(1);
    screen.querySelector('#sqSkinLabel').textContent=sk.name;
    screen.querySelector('#sqSkinDesc').textContent=sk.desc;
    const q=screen.querySelector('#sqSkinQuote'); q.textContent=sk.quote; q.style.display=sk.quote?'':'none';
    const btn=screen.querySelector('#sqSkinAction');
    btn.className='sqSkinAction'; btn.disabled=false;
    const equip=()=>{const s=skinState();s.equipped[c.id]=sk.id;saveSkin(s);renderSkinPage();syncSkinEverywhere()};
    if(eq){btn.className='sqSkinAction on';btn.disabled=true;btn.innerHTML='✓ 장착중';}
    else if(own){btn.innerHTML='장착하기';btn.onclick=equip;}
    else if(sk.cond.type==='level'){btn.className='sqSkinAction off';btn.disabled=true;btn.innerHTML=`${lockIc()} ${c.name} Lv.${sk.cond.v} 달성 필요`;}
    else{
      const isGem=sk.cond.type==='gem';
      const have=isGem?((window.__doldolResources&&window.__doldolResources.gems)||0):core();
      const enough=have>=sk.cond.v;
      btn.disabled=!enough; if(!enough)btn.className='sqSkinAction off';
      btn.innerHTML=(isGem?'💎':coreIc())+` ${sk.cond.v.toLocaleString()} 구매${enough?'':' (부족)'}`;
      btn.onclick=()=>{
        if(isGem){const R=window.__doldolResources; if(!R||R.gems<sk.cond.v)return; R.setGems(R.gems-sk.cond.v);}
        else if(!window.__duckWallet||!window.__duckWallet.spendCoins(sk.cond.v))return;
        const s=skinState();(s.owned[c.id]=s.owned[c.id]||[]).push(sk.id);s.equipped[c.id]=sk.id;saveSkin(s);
        renderSkinPage();syncSkinEverywhere();
      };
    }
    const rail=screen.querySelector('#sqSkinRail');
    rail.style.gridTemplateColumns=`repeat(${Math.max(list.length,4)},minmax(0,1fr))`;
    rail.innerHTML=list.map((x,i)=>{
      const o=skinOwned(c.id,x),e=equippedSkin(c.id).id===x.id;
      const a=x.art||c.baseArt;
      const sub=e?'<em class="ok">장착중</em>':(o?'<em></em>':`<em>${skinCondText(x)}</em>`);
      return `<button class="sqSkinCard ${i===skinIdx?'on':''} ${o?'':'locked'}" data-i="${i}" type="button"><span class="sqSkinThumb">${a?`<img src="${a}" alt="">`:c.face}${o?'':`<span class="sqSkinLock">${lockIc()}</span>`}</span><b>${x.short||x.name.replace(' 스킨','')}</b>${sub}</button>`;
    }).join('');
    rail.querySelectorAll('.sqSkinCard').forEach(b=>b.onclick=()=>{skinIdx=Number(b.dataset.i);renderSkinPage()});
  }
  function closeSkinPage(){
    screen.querySelector('#sqSkinPage').hidden=true;
    openDetail();
  }

  function levelStats(c,level){
    const t=Math.max(0,Math.min(1,(level-1)/49));
    const atkMax={doldol:300,nyang:270,rabbit:285,panda:315,king:420,turtle:240,shiba:330,charge:480}[c.id]||c.atk*3;
    const hpMax={doldol:300,nyang:255,rabbit:270,panda:450,king:225,turtle:540,shiba:315,charge:300}[c.id]||c.hp*3;
    const defenseBase=Math.round(c.hp*.8), defenseMax=Math.round(hpMax*.8);
    const specialBase=Math.round((c.counter+c.timing)*7.5), specialMax=specialBase+98;
    return {
      atk:Math.round(c.atk+(atkMax-c.atk)*t),
      hp:Math.round(c.hp+(hpMax-c.hp)*t),
      defense:Math.round(defenseBase+(defenseMax-defenseBase)*t),
      special:Math.round(specialBase+(specialMax-specialBase)*t)
    };
  }
  function levelCost(level){ return 100+Math.max(1,level)*70; }
  function setCharacterLevel(id,level){
    try{
      const all=JSON.parse(localStorage.getItem('doldol_character_progress_v1')||'{}')||{};
      const prev=all[id]||{}, next=Math.max(50,Number(prev.next)||50);
      all[id]={level:Math.max(1,Math.min(50,level)),xp:Math.max(0,Number(prev.xp)||0),next};
      localStorage.setItem('doldol_character_progress_v1',JSON.stringify(all));
    }catch(e){}
  }
  function openLevelModal(){
    const c=current(),p=progress(c.id),modal=screen.querySelector('#sqLevelModal');
    if(!modal)return;
    const max=p.level>=50, nextLevel=Math.min(50,p.level+1), now=levelStats(c,p.level), next=levelStats(c,nextLevel), cost=levelCost(p.level);
    screen.querySelector('#sqLevelPortrait').innerHTML=c.art?`<img src="${c.art}" alt="">`:`<span>${c.face}</span>`;
    screen.querySelector('#sqLevelName').textContent=c.name;
    screen.querySelector('#sqLevelJump').innerHTML=max?`Lv.${p.level} · MAX`:`Lv.${p.level}　›　<em>Lv.${nextLevel}</em>`;
    const rows=[[uiIc('atk','⚔'),'공격력','atk'],[uiIc('defense','🛡'),'방어력','defense'],[uiIc('hp','❤'),'체력','hp'],[uiIc('special','★'),'특수','special']];
    screen.querySelector('#sqLevelStats').innerHTML=rows.map(([icon,name,key])=>`<div class="sqLevelStat"><span>${icon} ${name}</span><b>${now[key]}</b><span>›</span><b class="next">${max?now[key]:next[key]}</b><i class="up">${max?'':'+'+(next[key]-now[key])}</i></div>`).join('');
    screen.querySelector('#sqLevelCost').innerHTML=max?'MAX':`${coreIc()}<span class="${core()<cost?'short':''}">${cost.toLocaleString()}</span><small class="have">보유 ${core().toLocaleString()}</small>`;
    const btn=screen.querySelector('#sqLevelConfirm');
    btn.disabled=max||core()<cost;
    btn.textContent=max?'최대 레벨':core()<cost?'돌핵 부족':'레벨업';
    btn.onclick=()=>{
      if(max||!window.__duckWallet||!window.__duckWallet.spendCoins(cost))return;
      setCharacterLevel(c.id,nextLevel);
      if(window.__duckMissionEvent)window.__duckMissionEvent('level',1);
      renderHud(); openDetail(); openLevelModal();
      if(window.__duckSyncLobby)window.__duckSyncLobby();
    };
    modal.hidden=false;
  }

  function renderDetailTab(tab='stats'){
    const c=current(), body=screen.querySelector('#sqDetailBody');
    screen.querySelectorAll('.sqDetailTabs button').forEach((x,i)=>x.classList.toggle('on',['stats','skill','story'][i]===tab));
    { const sb=screen.querySelector('#sqSelectBig'); if(sb) sb.style.display=''; }
    if(tab==='skill'){
      const charLevel=progress(c.id).level;
      let sl=1, sl2=1;
      try{
        sl=Math.max(1,Math.min(5,Number(localStorage.getItem('doldol_skill_'+c.id)||1)));
        sl2=Math.max(1,Math.min(5,Number(localStorage.getItem('doldol_skill2_'+c.id)||1)));
      }catch(e){}
      const cost=sl*100, cost2=sl2*150, max=sl>=5, max2=sl2>=5, leaderLocked=charLevel<10;
      body.innerHTML=`<div class="sqSkillCard"><div class="sqSkillIcon">${uiIc('power','💥')}</div><div class="sqSkillInfo"><strong>${c.skill}</strong><small>Lv.${sl} / 5</small><p>${c.skillDesc}</p></div><button class="sqSkillUp primary" ${max||core()<cost?'disabled':''}>${max?'MAX':`업그레이드<br>${coreIc()} ${cost}`}</button></div>
      <div class="sqSkillCard ${leaderLocked?'lockedSkill':''}"><div class="sqSkillIcon">${uiIc('defense','🛡️')}</div><div class="sqSkillInfo"><strong>특공대 리더</strong><small>${leaderLocked?'잠금':`Lv.${sl2} / 5`}</small><p>${leaderLocked?'캐릭터 Lv.10 달성 시 잠금 해제':'아군의 전투 능력을 강화합니다.'}</p></div><button class="sqSkillUp leader" ${leaderLocked||max2||core()<cost2?'disabled':''}>${leaderLocked?`${lockIc()} Lv.10 해금`:max2?'MAX':`업그레이드<br>${coreIc()} ${cost2}`}</button></div>`;
      const primary=body.querySelector('.sqSkillUp.primary');
      if(primary&&!primary.disabled)primary.onclick=()=>{if(window.__duckWallet&&!window.__duckWallet.spendCoins(cost))return;try{localStorage.setItem('doldol_skill_'+c.id,String(sl+1))}catch(e){}renderHud();renderDetailTab('skill')};
      const leader=body.querySelector('.sqSkillUp.leader');
      if(leader&&!leader.disabled)leader.onclick=()=>{if(window.__duckWallet&&!window.__duckWallet.spendCoins(cost2))return;try{localStorage.setItem('doldol_skill2_'+c.id,String(sl2+1))}catch(e){}renderHud();renderDetailTab('skill')};
    }
    else if(tab==='story') body.innerHTML=storyHtml(c);
    else {
      const st=levelStats(c,progress(c.id).level);
      const stars=n=>`<b class="stars"><i>${'★'.repeat(n)}</i><u>${'★'.repeat(5-n)}</u></b>`;
      body.innerHTML=`<div class="row"><span><em>${uiIc('atk','⚔️')}</em>공격력</span><b>${st.atk}</b></div><div class="row"><span><em>${uiIc('defense','🛡️')}</em>방어력</span><b>${st.defense}</b></div><div class="row"><span><em>${uiIc('hp','❤️')}</em>체력</span><b>${st.hp}</b></div><div class="row"><span><em>${uiIc('special','⭐')}</em>특수</span><b>${st.special}</b></div><div class="row"><span><em>${uiIc('counter','🔄')}</em>반격</span>${stars(c.counter)}</div><div class="row"><span><em>${uiIc('timing','🎯')}</em>타이밍</span>${stars(c.timing)}</div>`;
    }
  }
  function openDetail(){
    const c=current(),p=progress(c.id),isOwned=owned(c.id);
    screen.querySelector('.sqTop').style.display='none';
    screen.querySelector('.sqTabs').style.display='none';
    screen.querySelector('#charGrid').style.display='none';
    screen.querySelector('#sqDetailPage').hidden=false;
    screen.querySelector('#sqDetailTitle').textContent=c.name;
    screen.querySelector('#sqDetailHero').innerHTML=c.art?`<img src="${c.art}" alt="${c.name}" style="${isOwned?'':'filter:grayscale(1);opacity:.72'}">`:`<span class="emoji" style="${isOwned?'':'filter:grayscale(1);opacity:.72'}">${c.face}</span>`;
    screen.querySelector('#sqDetailLv').textContent='Lv.'+p.level;
    screen.querySelector('#sqDetailXp').style.width=Math.max(0,Math.min(100,(p.xp/Math.max(1,p.next))*100))+'%';
    const tabs=screen.querySelector('.sqDetailTabs'), level=screen.querySelector('.sqDetailLevel'), body=screen.querySelector('#sqDetailBody');
    const skin=screen.querySelector('#sqSkinBtn'), levelBtn=screen.querySelector('#sqLevelBtn');
    const active=(()=>{try{return localStorage.getItem('doldol_character_v1')||'doldol'}catch(e){return 'doldol'}})();
    const btn=screen.querySelector('#sqSelectBig');
    if(isOwned){
      tabs.style.display='grid'; level.style.display='grid'; skin.style.display=''; levelBtn.style.display='';
      btn.disabled=active===c.id; btn.innerHTML=active===c.id?'<i>🐾</i>선택중<i>🐾</i>':'선택하기'; btn.classList.toggle('isOn',active===c.id);
      btn.onclick=()=>{try{localStorage.setItem('doldol_character_v1',c.id)}catch(e){} renderHud();openDetail();if(window.__duckSyncLobby)window.__duckSyncLobby();};
      renderDetailTab('stats');
    }else{
      tabs.style.display='none'; level.style.display='none';
      btn.style.display='';
      const stageOk=canUnlock(c), moneyOk=core()>=Number(c.unlockCost||0);
      body.innerHTML=`<div class="sqUnlockBody"><h3>${lockIc()} 미보유 특공대</h3><p>${c.role} · ${c.skill}</p><div class="sqUnlockReq"><div class="${stageOk?'ok':'no'}">${stageOk?'✓':lockIc()} STAGE ${c.gateStage} ${stageOk?'달성':'클리어 필요'}</div><div class="${moneyOk?'ok':'no'}">${moneyOk?'✓':coreIc()} 필요 돌핵 ${(c.unlockCost||0).toLocaleString()} · 보유 ${core().toLocaleString()}</div></div></div>`;
      btn.disabled=!(stageOk&&moneyOk);
      btn.innerHTML=!stageOk?`STAGE ${c.gateStage} 클리어 필요`:!moneyOk?'돌핵 부족':`해금하기 ${coreIc()} ${(c.unlockCost||0).toLocaleString()}`;
      btn.onclick=()=>{
        if(!canUnlock(c)||core()<Number(c.unlockCost||0))return;
        if(!window.__duckWallet||!window.__duckWallet.spendCoins(Number(c.unlockCost||0)))return;
        markOwned(c.id); renderHud(); renderGrid(); openDetail(); if(window.__duckSyncLobby)window.__duckSyncLobby();
      };
    }
  }
  function closeDetail(){
    screen.querySelector('#sqDetailPage').hidden=true;
    screen.querySelector('.sqTop').style.display='grid';
    screen.querySelector('.sqTabs').style.display='grid';
    screen.querySelector('#charGrid').style.display='grid';
    renderGrid();
  }

  function render(){ closeDetail(); }

  build();
  window.__duckRefreshCharacters=render;
  window.__duckOpenCharacters=function(){
    selectedId=(()=>{try{return localStorage.getItem('doldol_character_v1')||'doldol'}catch(e){return 'doldol'}})();
    render(); renderHud(); screen.classList.add('show'); return true;
  };
})();

/* --- v10 stage reward skill choice --- */
(function(){
  const next=document.getElementById("resultNext");
  if(!next) return;

  const choices=[
    {id:"power",icon:"⚔️",name:"강철 탄환",desc:"공격력 +15%",apply:p=>{p.attack=Math.round(p.attack*1.15)}},
    {id:"rapid",icon:"⚡",name:"연사 훈련",desc:"공격속도 +15%",apply:p=>{p.attackInterval=Math.max(.18,p.attackInterval*.85)}},
    {id:"vital",icon:"❤️",name:"생존 훈련",desc:"최대 HP +25 및 전투 중 즉시 회복",apply:p=>{p.maxHp+=25;p.hp=p.maxHp}},
    {id:"parry",icon:"🛡️",name:"패링 훈련",desc:"패링 판정 +15%",apply:p=>{p.parryRange*=1.15}},
    {id:"perfect",icon:"✦",name:"PERFECT 훈련",desc:"PERFECT 반사 피해 +20%",apply:p=>{p.perfectMultiplier*=1.20}},
    {id:"move",icon:"🏃",name:"기동 훈련",desc:"이동속도 +12%",apply:p=>{p.speed*=1.12}}
  ];

  let overlay=null;

  function ensureOverlay(){
    if(overlay) return overlay;
    overlay=document.createElement("div");
    overlay.id="stageSkillReward";
    Object.assign(overlay.style,{
      position:"fixed",inset:"0",zIndex:"120",
      display:"none",alignItems:"center",justifyContent:"center",
      padding:"20px",boxSizing:"border-box",
      background:"rgba(5,9,13,.82)",backdropFilter:"blur(7px)",
      fontFamily:"system-ui"
    });
    overlay.innerHTML=`
      <div id="stageSkillPanel" style="width:min(430px,94vw);max-height:88vh;overflow:auto;border-radius:28px;padding:22px 18px 18px;background:linear-gradient(180deg,#fff8df,#ead19a);box-shadow:0 24px 70px rgba(0,0,0,.45);color:#382718;text-align:center">
        <div style="font-size:11px;font-weight:1000;letter-spacing:2px;color:#9b6a28">STAGE REWARD</div>
        <h2 style="margin:5px 0 2px;font-size:28px;font-weight:1000">특공대 보급품</h2>
        <p style="margin:0 0 16px;color:#725f47;font-size:12px;font-weight:800">보급품 하나를 선택하세요</p>
        <div id="stageSkillCards" style="display:grid;gap:10px"></div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function pickThree(){
    const pool=choices.slice();
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    return pool.slice(0,3);
  }

  function openChoices(){
    const o=ensureOverlay(), cards=o.querySelector("#stageSkillCards");
    const selected=pickThree();
    cards.innerHTML=selected.map((c,i)=>`
      <button data-skill="${c.id}" style="appearance:none;width:100%;border:2px solid rgba(125,91,35,.22);border-radius:18px;background:#fffdf4;padding:14px;text-align:left;display:flex;align-items:center;gap:12px;cursor:pointer;box-shadow:0 5px 12px rgba(90,60,20,.10)">
        <span style="width:48px;height:48px;flex:0 0 48px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(145deg,#ffe17b,#ffb52f);font-size:25px">${c.icon}</span>
        <span style="display:block"><b style="display:block;font-size:16px;color:#392919">${c.name}</b><small style="display:block;margin-top:3px;color:#786650;font-size:11px;font-weight:800">${c.desc}</small></span>
        <span style="margin-left:auto;font-size:18px;color:#b98935">›</span>
      </button>`).join("");

    // 이벤트 위임: 동적으로 생성되는 카드도 모바일 터치/클릭에서 확실하게 선택된다.
    if(!o.__rewardClickBound){
      o.addEventListener("click",function(ev){
        const btn=ev.target.closest && ev.target.closest("button[data-skill]");
        if(!btn || !o.contains(btn))return;
        ev.preventDefault();
        ev.stopPropagation();

        const id=btn.dataset.skill;
        if(!id)return;

        const applied=window.__duckApplyReward ? window.__duckApplyReward(id) : false;
        if(!applied){
          console.warn("보급품 적용 실패:",id);
        }

        try{
          const saved=JSON.parse(localStorage.getItem("doldol_run_skills_v1")||"[]");
          saved.push(id);
          localStorage.setItem("doldol_run_skills_v1",JSON.stringify(saved));
        }catch(e){}

        // 선택 피드백 후 다음 스테이지로 이동
        btn.style.transform="scale(.97)";
        btn.style.opacity=".75";
        o.style.pointerEvents="none";

        const currentStage=Math.max(1,Math.min(500,Number(window.__duckStage||1)||1));
        const nextStage=Math.max(1,Math.min(500,Number(window.__duckPendingNextStage||currentStage+1)||currentStage+1));
        setTimeout(()=>{
          o.style.display="none";
          o.style.pointerEvents="auto";
          window.__duckPendingNextStage=0;
          showNextStageTransition(nextStage,()=>{
            if(window.__duckStartStage)window.__duckStartStage(nextStage);
          });
        },120);
      });
      o.__rewardClickBound=true;
    }
    o.style.display="flex";
  }

  window.__duckOpenStageReward=function(){
    const resultBox=document.getElementById("resultScreen");
    if(resultBox)resultBox.classList.remove("show");
    openChoices();
  };
  window.__duckCloseStageReward=function(){
    if(overlay)overlay.style.display="none";
  };
})();

/* --- V36 commercial growth screen design --- */
(function(){
  let screen=document.getElementById('growthScreen');
  const stats=[
    {key:'atk',icon:'⚔️',name:'공격력',desc:'적에게 주는 기본 피해를 높입니다.',base:25,max:100,cost:300,step:3},
    {key:'speed',icon:'⚡',name:'공격속도',desc:'자동 공격 간격을 줄여 더 빠르게 공격합니다.',base:1.2,max:3,cost:350,step:.08},
    {key:'hp',icon:'❤️',name:'최대 HP',desc:'더 많은 공격을 버틸 수 있습니다.',base:120,max:300,cost:400,step:15},
    {key:'parry',icon:'🛡️',name:'패링 판정',desc:'PARRY 성공 범위를 넓힙니다.',base:20,max:80,cost:450,step:5}
  ];
  let values={};
  function ensure(){
    if(!screen || !document.body.contains(screen)) screen=document.getElementById('growthScreen')||null;
    const required=['growthBack','growthRole','growthFace','growthName','growthXp','growthXpBar','growthCoins','growthCards'];
    const complete=screen && required.every(id=>screen.querySelector('#'+id));
    if(!screen){screen=document.createElement('div');screen.id='growthScreen';document.body.appendChild(screen);}
    if(!complete){
      Object.assign(screen.style,{position:'fixed',inset:'0',zIndex:'99999',display:'none',visibility:'hidden',overflow:'auto',background:'linear-gradient(180deg,#15242a 0%,#20362f 48%,#14221f 100%)',color:'#fff',fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,sans-serif',padding:'calc(12px + env(safe-area-inset-top)) 14px calc(28px + env(safe-area-inset-bottom))',boxSizing:'border-box'});
      screen.innerHTML=`
      <div style="max-width:540px;margin:0 auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin:2px 2px 12px">
          <button id="growthBack" aria-label="뒤로" style="width:42px;height:42px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(0,0,0,.22);color:#fff;font-size:26px;line-height:1">‹</button>
          <div style="text-align:center;flex:1;margin:0 10px"><div style="font-size:19px;font-weight:1000;letter-spacing:-.6px">캐릭터 성장</div><div id="growthRole" style="font-size:10px;opacity:.58;margin-top:2px;letter-spacing:.4px"></div></div>
          <div id="growthCoins" style="min-width:82px;text-align:right;font-weight:1000;color:#ffd866;font-size:13px"></div>
        </div>
        <div id="growthHero" style="position:relative;overflow:hidden;padding:18px;border-radius:26px;background:linear-gradient(135deg,rgba(255,216,102,.22),rgba(80,176,194,.12) 55%,rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 36px rgba(0,0,0,.22);margin-bottom:12px">
          <div style="position:absolute;right:-40px;top:-55px;width:160px;height:160px;border-radius:50%;background:rgba(255,216,102,.08)"></div>
          <div style="display:flex;align-items:center;gap:15px;position:relative">
            <div id="growthFace" style="width:74px;height:74px;border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:50px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)">🐥</div>
            <div style="min-width:0;flex:1"><div id="growthName" style="font-size:22px;font-weight:1000;letter-spacing:-.8px"></div><div id="growthXp" style="font-size:11px;opacity:.7;margin-top:4px"></div></div>
            <div style="text-align:right"><div style="font-size:10px;opacity:.55">LEVEL</div><div id="growthLevel" style="font-size:27px;font-weight:1000;color:#ffd866;line-height:1">1</div></div>
          </div>
          <div style="height:10px;background:rgba(0,0,0,.28);border-radius:99px;overflow:hidden;margin-top:15px;border:1px solid rgba(255,255,255,.08)"><i id="growthXpBar" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#7bd7ff,#ffd866);border-radius:99px;box-shadow:0 0 12px rgba(123,215,255,.35)"></i></div>
        </div>
        <div style="display:flex;gap:8px;margin:12px 0"><div style="flex:1;padding:11px 12px;border-radius:15px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07)"><div style="font-size:9px;opacity:.5">ROLE</div><div id="growthRole2" style="font-size:12px;font-weight:900;margin-top:2px"></div></div><div style="flex:1;padding:11px 12px;border-radius:15px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07)"><div style="font-size:9px;opacity:.5">GROWTH</div><div style="font-size:12px;font-weight:900;margin-top:2px">전투로 성장</div></div></div>
        <div id="growthCards"></div>
      </div>`;
    }
    const back=screen.querySelector('#growthBack');
    if(back) back.onclick=()=>{screen.style.display='none';screen.style.visibility='hidden';if(window.__duckRefreshCharacters)window.__duckRefreshCharacters();};
  }
  function load(){try{values=JSON.parse(localStorage.getItem('doldol_growth_v1')||'{}')||{};}catch(e){values={};}}
  function current(){return (window.__duckGetSelectedCharacter?window.__duckGetSelectedCharacter():(typeof CHARACTER_DEFS!=='undefined'?CHARACTER_DEFS[0]:{id:'doldol',face:'🐥',name:'돌돌이',role:'밸런스형',skill:{name:'특공대 정신',desc:'고유 스킬'}}));}
  function render(){
    ensure();load();
    const d=current(),cp=window.__duckCharacterProgress?window.__duckCharacterProgress(d.id):{level:1,xp:0,next:50};
    const pct=cp.next>0?Math.min(100,Math.round(cp.xp/cp.next*100)):0;
    const q=id=>screen.querySelector('#'+id);
    const face=q('growthFace'),name=q('growthName'),role=q('growthRole'),role2=q('growthRole2'),xpEl=q('growthXp'),bar=q('growthXpBar'),coinsEl=q('growthCoins'),cards=q('growthCards'),levelEl=q('growthLevel');
    if(!face||!name||!role||!xpEl||!bar||!coinsEl||!cards) throw new Error('growth UI elements missing');
    face.textContent=d.face||'🐥';name.textContent=d.name||'돌돌이';role.textContent=d.role||'밸런스형';if(role2)role2.textContent=d.role||'밸런스형';xpEl.textContent='XP '+cp.xp+' / '+cp.next+(cp.level>=50?' · MAX':'');bar.style.width=pct+'%';coinsEl.textContent='🪙 '+Number((window.__duckWallet&&window.__duckWallet.coins)||0).toLocaleString();if(levelEl)levelEl.textContent=cp.level;
    const walletCoins=Number((window.__duckWallet&&window.__duckWallet.coins)||0);
    const skillLevel=Math.max(1,Math.min(5,Number((window.__duckCharacterSkillProgress?window.__duckCharacterSkillProgress(d.id):{level:1}).level)||1));
    const skillCost=700+skillLevel*350,skillCan=skillLevel<5&&walletCoins>=skillCost;
    const cardBase='padding:15px;margin:10px 0;border-radius:20px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.085);box-shadow:0 8px 22px rgba(0,0,0,.10)';
    const btn=(can,label,accent)=>`width:100%;padding:12px;border:0;border-radius:13px;background:${can?accent:'rgba(255,255,255,.075)'};color:${can?(accent==='#ffd866'?'#30220b':'#10232d'):'#7f8992'};font-weight:1000;font-size:12px`;
    const skillCard=`<div style="${cardBase};background:linear-gradient(135deg,rgba(123,215,255,.12),rgba(255,216,102,.08));border-color:rgba(123,215,255,.16)"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:9px;opacity:.5;letter-spacing:.7px">SPECIAL SKILL</div><b style="font-size:15px">⚡ ${d.skill?.name||'특공 스킬'}</b></div><strong style="color:#7bd7ff">Lv.${skillLevel}/5</strong></div><div style="font-size:11px;opacity:.66;margin:6px 0 11px;line-height:1.45">${d.skill?.desc||'고유 스킬'}<br><span style="opacity:.7">레벨이 오를수록 스킬 효과가 강화됩니다.</span></div><button id="growthSkillUpgrade" ${skillCan?'':'disabled'} style="${btn(skillCan,skillLevel>=5?'MAX':'스킬 강화 · 🪙 '+skillCost,'#7bd7ff')}">${skillLevel>=5?'✓ MAX':'스킬 강화 · 🪙 '+skillCost}</button></div>`;
    const statCards=stats.map(x=>{const v=Number(values[x.key]??x.base),can=v<x.max&&walletCoins>=x.cost,p=Math.max(0,Math.min(100,Math.round((v-x.base)/(x.max-x.base)*100)));return `<div style="${cardBase}"><div style="display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:14px">${x.icon} ${x.name}</b><div style="font-size:10px;opacity:.52;margin-top:3px">${x.desc}</div></div><strong style="font-size:17px">${x.key==='speed'?v.toFixed(2):v}${x.key==='parry'?'%':''}</strong></div><div style="height:5px;background:rgba(0,0,0,.24);border-radius:99px;overflow:hidden;margin:10px 0"><i style="display:block;width:${p}%;height:100%;background:#ffd866"></i></div><button data-grow="${x.key}" ${can?'':'disabled'} style="${btn(can,v>=x.max?'MAX':'강화 · 🪙 '+x.cost,'#ffd866')}">${v>=x.max?'✓ MAX':'강화 · 🪙 '+x.cost}</button></div>`}).join('');
    cards.innerHTML=skillCard+`<div style="font-size:11px;font-weight:1000;opacity:.62;margin:16px 3px 7px;letter-spacing:.5px">BASIC STATS</div>`+statCards;
    cards.querySelectorAll('[data-grow]').forEach(b=>b.onclick=()=>upgrade(b.dataset.grow));
    const skillBtn=cards.querySelector('#growthSkillUpgrade');if(skillBtn)skillBtn.onclick=()=>{if(skillLevel>=5||walletCoins<skillCost)return;if(window.__duckWallet&&window.__duckWallet.spendCoins(skillCost)){window.__duckUpgradeCharacterSkill(d.id);render();}};
  }
  function upgrade(key){const x=stats.find(v=>v.key===key);if(!x)return;const v=Number(values[key]??x.base);if(v>=x.max||!window.__duckWallet.spendCoins(x.cost))return;values[key]=Math.min(x.max,v+x.step);localStorage.setItem('doldol_growth_v1',JSON.stringify(values));render();}
  window.__duckOpenGrowth=function(){try{ensure();['characterScreen','menuScreen','resultScreen','mapScreen'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('show');});render();screen.style.display='block';screen.style.visibility='visible';screen.style.opacity='1';screen.style.zIndex='99999';return true;}catch(err){console.error('growth open failed:',err);return false;}};
  let growthOpening=false;
  function findGrowthButton(target){const cs=document.getElementById('characterScreen');if(!cs||!cs.classList.contains('show'))return null;let el=target;while(el&&el!==document.body){if((el.tagName==='BUTTON'||el.tagName==='A'||el.getAttribute?.('role')==='button')&&/성장/.test((el.textContent||'').replace(/\s+/g,' ')))return el;el=el.parentElement;}return null;}
  function openGrowthFromCharacter(e){const t=findGrowthButton(e.target);if(!t)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();if(growthOpening)return;growthOpening=true;const ok=window.__duckOpenGrowth&&window.__duckOpenGrowth();setTimeout(()=>{growthOpening=false;},250);if(!ok)console.warn('성장 화면 열기 실패');}
  document.addEventListener('click',openGrowthFromCharacter,true);document.addEventListener('pointerup',openGrowthFromCharacter,true);document.addEventListener('touchend',openGrowthFromCharacter,true);
})();

/* --- ACHIEVEMENT V1: persistent full-screen achievements --- */
(function(){
  const KEY='doldol_achievements_v1', LEGACY='doldol_missions_v1';
  const base={kills:0,parry:0,perfect:0,clears:0,plays:0,levels:0,gear:0,items:0,claimed:{}};
  function load(){
    let a={}; try{a=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}
    if(!Object.keys(a).length){try{const old=JSON.parse(localStorage.getItem(LEGACY)||'{}')||{};a={kills:old.kills||0,parry:old.parry||0,perfect:old.perfect||0,clears:old.clears||0,plays:old.plays||0,claimed:old.claimed||{}};}catch(e){}}
    return Object.assign({},base,a,{claimed:Object.assign({},base.claimed,a.claimed||{})});
  }
  let state=load();
  const defs=[
    {id:'clear5',icon:'🏁',name:'첫 작전 완료',key:'clears',goal:5,reward:300,desc:'스테이지 5회 클리어'},
    {id:'clear20',icon:'🏆',name:'베테랑 특공대',key:'clears',goal:20,reward:800,desc:'스테이지 20회 클리어'},
    {id:'clear50',icon:'🎖️',name:'전장의 영웅',key:'clears',goal:50,reward:1800,desc:'스테이지 50회 클리어'},
    {id:'kill50',icon:'🎯',name:'정확한 사격',key:'kills',goal:50,reward:300,desc:'적 50마리 처치'},
    {id:'kill200',icon:'💥',name:'적진 초토화',key:'kills',goal:200,reward:900,desc:'적 200마리 처치'},
    {id:'perfect10',icon:'✦',name:'완벽한 반격',key:'perfect',goal:10,reward:400,desc:'PERFECT 반격 10회'},
    {id:'perfect50',icon:'⚡',name:'타이밍 마스터',key:'perfect',goal:50,reward:1200,desc:'PERFECT 반격 50회'},
    {id:'level10',icon:'🐥',name:'특공대 성장',key:'levels',goal:10,reward:600,desc:'캐릭터 레벨업 10회'},
    {id:'gear10',icon:'🛡️',name:'장비 전문가',key:'gear',goal:10,reward:600,desc:'장비 강화 10회'},
    {id:'item10',icon:'🎒',name:'보급품 활용',key:'items',goal:10,reward:400,desc:'전투 아이템 10회 사용'},
    {id:'play30',icon:'🚀',name:'계속되는 출격',key:'plays',goal:30,reward:700,desc:'전투 30회 출격'}
  ];
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
  function sync(){save();if(window.__duckSyncLobby)window.__duckSyncLobby();}
  window.__duckMissionEvent=function(type,n){
    const v=Math.max(0,Number(n)||0); if(!v)return;
    const map={kill:'kills',parry:'parry',perfect:'perfect',clear:'clears',play:'plays',level:'levels',gear:'gear',item:'items'};
    const key=map[type]; if(!key)return; state[key]=(Number(state[key])||0)+v; sync();
  };
  function coreIcon(cls=''){
    return '<img class="achCoreIcon '+cls+'" src="assets/doldol_stone_core.png" alt="돌핵">';
  }
  function ensure(){
    let page=document.getElementById('doldolAchievementPage'); if(page)return page;
    page=document.createElement('section');page.id='doldolAchievementPage';
    page.innerHTML=
      '<div class="achShell">'+
        '<div class="achTop">'+
          '<button id="achBack" aria-label="뒤로">‹</button>'+
          '<div><b>업적</b><small>특공대의 기록</small></div>'+
          '<span>'+coreIcon('top')+'<strong id="achCore">0</strong></span>'+
        '</div>'+
        '<div class="achHero">'+
          '<div><small>ACHIEVEMENT</small><b>작전 기록</b><p>플레이하며 업적을 달성하고 돌핵을 획득하세요.</p></div>'+
          '<div class="achMedal">🏅</div>'+
        '</div>'+
        '<div class="achSummary" id="achSummary"></div>'+
        '<div class="achList" id="achList"></div>'+
      '</div>'+
      '<div class="achToast" id="achToast"></div>';
    document.body.appendChild(page);
    const st=document.createElement('style');st.id='doldolAchievementStyle';st.textContent=`
#doldolAchievementPage{
  position:fixed;inset:0;z-index:9600;display:none;overflow:hidden;
  padding:calc(env(safe-area-inset-top) + 10px) 10px calc(env(safe-area-inset-bottom) + 10px);
  align-items:center;justify-content:center;
  background:rgba(2,10,17,.72);
  backdrop-filter:blur(2px);
  -webkit-backdrop-filter:blur(2px);
  font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  color:#fff;
}
#doldolAchievementPage.show{display:flex}
#doldolAchievementPage *{box-sizing:border-box}
.achShell{
  width:min(100%,720px);
  height:min(92dvh,820px);
  max-height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 20px);
  margin:0 auto;
  display:flex;flex-direction:column;
  border:2px solid rgba(100,204,255,.90);border-radius:24px;overflow:hidden;
  box-shadow:0 20px 52px rgba(0,0,0,.48)
}
.achTop{
  display:grid;grid-template-columns:46px 1fr auto;align-items:center;gap:10px;
  min-height:76px;padding:10px 12px;
  background:linear-gradient(145deg,#173b5a,#0c263c);
  border-bottom:1px solid rgba(140,215,255,.34);
}
.achTop button{
  width:42px;height:42px;border:1px solid rgba(255,255,255,.28);border-radius:13px;
  background:linear-gradient(145deg,#547ca1,#284c70);color:#fff;
  font-size:31px;font-weight:1000;line-height:1;box-shadow:0 4px 10px rgba(0,0,0,.22)
}
.achTop b{display:block;font-size:24px;line-height:1.05;font-weight:1000}
.achTop small{display:block;margin-top:5px;font-size:10px;color:#b9d2e2}
.achTop>span{
  display:flex;align-items:center;gap:4px;min-width:96px;justify-content:center;
  background:rgba(5,15,24,.72);border:1px solid rgba(255,255,255,.13);
  border-radius:18px;padding:6px 9px;font-size:13px;font-weight:1000
}
.achCoreIcon{display:inline-block;object-fit:cover;object-position:29% 50%;vertical-align:middle}
.achCoreIcon.top{width:24px;height:24px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.25))}
.achRewardCore{
  display:inline-flex;align-items:center;justify-content:center;
  width:23px;height:23px;margin:0 2px 0 3px;flex:0 0 23px
}
.achHero{
  min-height:116px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;
  background:
    linear-gradient(110deg,rgba(10,50,80,.96),rgba(14,61,89,.80)),
    url('../assets/stage2_training.jpg') center 42%/cover;
  border-bottom:1px solid rgba(158,219,255,.28);
}
.achHero small{font-size:9px;letter-spacing:1.8px;color:#9fdcff;font-weight:900}
.achHero b{display:block;font-size:26px;margin-top:3px;font-weight:1000;text-shadow:0 2px 4px rgba(0,0,0,.3)}
.achHero p{font-size:10px;color:#d8edf7;margin:7px 0 0}
.achMedal{font-size:54px;filter:drop-shadow(0 7px 7px rgba(0,0,0,.35))}
.achSummary{
  display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px 12px;
  background:#12344d;border-bottom:1px solid rgba(137,210,248,.22)
}
.achSummary div{
  text-align:center;background:linear-gradient(180deg,#294f6c,#1f435f);
  border:1px solid rgba(179,229,255,.24);border-radius:14px;padding:9px 6px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06)
}
.achSummary b{display:block;font-size:18px;color:#fff}
.achSummary small{font-size:9px;color:#b7cede}
.achTop,.achHero,.achSummary{flex:0 0 auto}
.achList{
  flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;
  overscroll-behavior:contain;
  background:linear-gradient(180deg,#0e2d44,#0b2539);
  padding:9px 9px 12px;
  scrollbar-width:none;
}
.achList::-webkit-scrollbar{display:none}
.achCard{
  display:grid;grid-template-columns:50px 1fr auto;gap:9px;align-items:center;
  min-height:70px;padding:7px 8px;margin-bottom:6px;border-radius:15px;
  background:linear-gradient(180deg,#f7f2e7,#ebe7df);
  border:2px solid rgba(167,177,180,.44);color:#30343a;
  box-shadow:0 6px 12px rgba(0,0,0,.13)
}
.achCard.done{border-color:#74cf4d}
.achCard.ready{box-shadow:0 0 0 1px rgba(112,231,71,.24),0 7px 15px rgba(0,0,0,.15)}
.achCard.claimed{opacity:.90}
.achIcon{
  width:40px;height:40px;border-radius:12px;display:grid;place-items:center;
  background:linear-gradient(145deg,#1c405c,#102f47);
  border:1px solid rgba(255,255,255,.20);
  font-size:22px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.18))
}
.achName{font-size:12px;font-weight:1000;color:#23272b;line-height:1.05}
.achDesc{display:flex;align-items:center;flex-wrap:wrap;gap:1px;font-size:8.5px;color:#747067;margin-top:2px;min-height:20px;line-height:1}
.achBar{height:5px;background:#bcb7ad;border-radius:99px;overflow:hidden;margin-top:5px}
.achBar i{display:block;height:100%;background:linear-gradient(90deg,#59be32,#a6ed54)}
.achCount{font-size:8.5px;font-weight:1000;color:#4e4a43;margin-top:2px}
.achClaim{
  position:relative;min-width:66px;height:36px;border:0;border-radius:12px;
  background:linear-gradient(#ffd953,#ff9d19);box-shadow:0 3px 0 #be6e0c,0 4px 9px rgba(220,130,12,.27);
  padding:7px 7px;font-size:10px;font-weight:1000;color:#482a05
}
.achClaim:not(:disabled):active{transform:translateY(2px);box-shadow:0 1px 0 #be6e0c}
.achCard.ready .achClaim::after{
  content:"";position:absolute;right:-4px;top:-4px;width:10px;height:10px;border-radius:50%;
  background:#ff302a;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)
}
.achClaim:disabled{
  background:#777d84;box-shadow:none;color:#e6e9ec;opacity:.72
}
.achCard.claimed .achClaim:disabled{background:#59636b;color:#dce1e5}
.achToast{
  position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 32px);
  transform:translate(-50%,15px);opacity:0;background:rgba(10,22,31,.96);
  border:1px solid rgba(117,205,255,.35);color:#fff;border-radius:18px;
  padding:10px 15px;font-size:11px;font-weight:900;transition:.2s;z-index:2
}
.achToast.show{opacity:1;transform:translate(-50%,0)}
@media(max-width:430px){
  .achShell{
    height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 18px);
    max-height:none;border-radius:20px
  }
  .achTop{grid-template-columns:42px 1fr auto;min-height:70px;padding:9px 10px}
  .achTop button{width:40px;height:40px}
  .achTop b{font-size:22px}
  .achTop>span{min-width:91px;padding:6px 7px;font-size:12px}
  .achHero{min-height:101px;padding:15px 16px}
  .achHero b{font-size:23px}
  .achMedal{font-size:46px}
  .achSummary{gap:6px;padding:9px}
  .achSummary div{padding:8px 4px}
  .achCard{grid-template-columns:38px 1fr 62px;gap:6px;padding:7px;min-height:68px}
  .achIcon{width:36px;height:36px;font-size:20px}
  .achClaim{min-width:60px;height:34px;font-size:9.5px}
}
`;document.head.appendChild(st);page.querySelector('#achBack').onclick=close;return page;
  }
  function toast(t){const e=document.getElementById('achToast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1000)}
  function render(){
    const page=ensure(),list=page.querySelector('#achList');
    page.querySelector('#achCore').textContent=Number(window.__duckWallet?.coins||0).toLocaleString();
    const completed=defs.filter(d=>Number(state[d.key]||0)>=d.goal).length;
    const claimed=defs.filter(d=>state.claimed[d.id]).length;
    page.querySelector('#achSummary').innerHTML=
      '<div><b>'+completed+'/'+defs.length+'</b><small>달성</small></div>'+
      '<div><b>'+claimed+'</b><small>보상 수령</small></div>'+
      '<div><b>'+Number(state.kills||0)+'</b><small>누적 처치</small></div>';
    list.innerHTML=defs.map(d=>{
      const cur=Math.min(d.goal,Number(state[d.key]||0));
      const done=cur>=d.goal,got=!!state.claimed[d.id],ready=done&&!got,pct=Math.round(cur/d.goal*100);
      const cls='achCard '+(done?'done ':'')+(ready?'ready ':'')+(got?'claimed':'');
      return '<article class="'+cls.trim()+'">'+
        '<div class="achIcon">'+d.icon+'</div>'+
        '<div>'+
          '<div class="achName">'+d.name+'</div>'+
          '<div class="achDesc">'+d.desc+' · 보상 <span class="achRewardCore">'+coreIcon('top')+'</span>'+d.reward.toLocaleString()+'</div>'+
          '<div class="achBar"><i style="width:'+pct+'%"></i></div>'+
          '<div class="achCount">'+cur+' / '+d.goal+'</div>'+
        '</div>'+
        '<button class="achClaim" data-ach="'+d.id+'" '+(!done||got?'disabled':'')+'>'+
          (got?'수령완료':ready?'받기':'진행중')+
        '</button>'+
      '</article>';
    }).join('');
    list.querySelectorAll('[data-ach]').forEach(b=>b.onclick=()=>{
      const d=defs.find(x=>x.id===b.dataset.ach);
      if(!d||state.claimed[d.id]||Number(state[d.key]||0)<d.goal)return;
      state.claimed[d.id]=true;
      if(window.__duckWallet)window.__duckWallet.addCoins(d.reward);
      sync();
      toast('돌핵 '+d.reward.toLocaleString()+' 획득');
      render();
    });
  }
  function close(){const p=document.getElementById('doldolAchievementPage');if(p)p.classList.remove('show');const lobby=document.getElementById('gameLobby');if(lobby)lobby.classList.remove('hidden')}
  function open(){const p=ensure();['menuScreen','mapScreen','resultScreen','characterScreen'].forEach(id=>document.getElementById(id)?.classList.remove('show'));const lobby=document.getElementById('gameLobby');if(lobby)lobby.classList.add('hidden');render();p.classList.add('show')}
  function bindProfileEntry(){
    const lobby=document.getElementById('gameLobby'); if(!lobby)return;
    const candidates=[...lobby.querySelectorAll('.profileMini,[id*="player" i],[id*="profile" i],.playerInfo')];
    let card=lobby.querySelector('.profileMini')||candidates.find(el=>/lv\.?\s*\d+/i.test((el.textContent||'').replace(/\s+/g,' ')))||candidates[0];
    if(!card||card.dataset.achievementBound==='1')return;
    card.dataset.achievementBound='1';
    card.style.cursor='pointer';
    card.setAttribute('role','button');
    card.setAttribute('aria-label','업적 보기');
    card.addEventListener('click',function(e){
      if(!document.getElementById('gameLobby') || document.getElementById('gameLobby').classList.contains('hidden'))return;
      e.preventDefault(); e.stopPropagation(); open();
    });
  }
  function installButton(){
    const charAch=document.getElementById('charAchievements');
    if(charAch && charAch.dataset.achievementBound!=='1'){
      charAch.dataset.achievementBound='1';
      charAch.addEventListener('click',function(e){
        e.preventDefault(); e.stopPropagation(); open();
      });
    }
    const lobby=document.getElementById('gameLobby');
    if(lobby && !window.__duckAchievementObserver){
      window.__duckAchievementObserver=new MutationObserver(()=>bindProfileEntry());
      window.__duckAchievementObserver.observe(lobby,{childList:true,subtree:true});
    }
  }
  window.__duckAchievementHasReward=()=>defs.some(d=>Number(state[d.key]||0)>=d.goal&&!state.claimed[d.id]);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installButton);else installButton();
  window.__duckOpenMissions=open;
  window.__duckOpenAchievements=open;
  window.__duckMissionState=()=>JSON.parse(JSON.stringify(state));
})();

/* --- V38 unified lobby design system --- */
(function(){
  const STYLE_ID='doldol-v38-lobby-style';
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=`
    :root{--dd-bg1:#10232a;--dd-bg2:#19352f;--dd-bg3:#0f1d20;--dd-gold:#ffd866;--dd-gold2:#f1a92e;--dd-text:#fff;--dd-muted:#aebdc5;--dd-panel:rgba(8,18,22,.70);}
    #gameLobby{background:
      radial-gradient(900px 360px at 50% -8%,rgba(123,215,255,.28),transparent 62%),
      radial-gradient(700px 340px at 50% 48%,rgba(255,216,102,.09),transparent 68%),
      linear-gradient(180deg,var(--dd-bg1) 0%,var(--dd-bg2) 54%,var(--dd-bg3) 100%) !important;
      color:var(--dd-text)!important;
      font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;
    }
    #gameLobby>*{box-sizing:border-box;}
    #gameLobby button{font-family:inherit;touch-action:manipulation;}

    /* Canonical top HUD — profile | core | gems | settings */
    #gameLobby .homeTop{
      display:flex!important;align-items:center!important;gap:6px!important;min-height:50px!important;
    }
    #gameLobby .profileMini{
      position:relative!important;display:flex!important;align-items:center!important;
      width:84px!important;min-width:84px!important;flex:0 0 84px!important;height:46px!important;
      gap:5px!important;padding:4px 7px 4px 4px!important;border-radius:16px!important;
      background:rgba(30,48,55,.82)!important;border:2px solid rgba(255,255,255,.28)!important;
      box-shadow:0 4px 10px rgba(0,0,0,.15)!important;
    }
    #gameLobby .profileAvatar{
      width:26px!important;height:26px!important;min-width:26px!important;flex:0 0 26px!important;
      border-radius:11px!important;overflow:hidden!important;background:#f7dca0!important;
      border:1.5px solid #fff!important;display:grid!important;place-items:center!important;
    }
    #gameLobby .profileAvatar img{
      width:100%!important;height:100%!important;object-fit:cover!important;object-position:center 28%!important;
      display:block!important;transform:scale(1.08)!important;
    }
    #gameLobby .profileMini>div:not(.profileAvatar){
      min-width:0!important;overflow:hidden!important;
    }
    #gameLobby .profileMini b{
      display:block!important;font-size:9px!important;line-height:10px!important;
      white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
    }
    #gameLobby .profileMini span{display:block!important;font-size:8px!important;line-height:10px!important}
    #gameLobby .xpMini{width:26px!important;height:3px!important;margin-top:2px!important}
#gameLobby .homeResources{
      display:flex!important;align-items:center!important;justify-content:flex-end!important;
      gap:5px!important;flex:1 1 auto!important;min-width:0!important;
    }
    #gameLobby .homeRes{
      display:flex!important;align-items:center!important;box-sizing:border-box!important;
      height:50px!important;border-radius:16px!important;background:rgba(30,48,55,.82)!important;
      border:1px solid rgba(255,255,255,.22)!important;white-space:nowrap!important;
      overflow:hidden!important;
    }
    #gameLobby .coreRes{
      width:106px!important;min-width:106px!important;max-width:106px!important;flex:0 0 106px!important;
      gap:3px!important;padding:5px 4px 5px 6px!important;
    }
    #gameLobby .gemRes{
      width:84px!important;min-width:84px!important;max-width:84px!important;flex:0 0 84px!important;
      gap:4px!important;padding:5px 5px 5px 7px!important;
    }
    #gameLobby .resIcon{
      width:20px!important;height:20px!important;object-fit:contain!important;flex:0 0 20px!important;
    }
    #gameLobby .gemIcon{font-size:16px!important;line-height:1!important;flex:0 0 auto!important}
    #gameLobby .homeRes b{
      flex:1 1 auto!important;min-width:0!important;text-align:center!important;
      overflow:visible!important;text-overflow:clip!important;white-space:nowrap!important;
      font-size:12px!important;line-height:1!important;font-weight:1000!important;letter-spacing:-.15px!important;
    }
    #gameLobby .homeRes button{
      display:grid!important;place-items:center!important;flex:0 0 24px!important;
      width:24px!important;height:24px!important;min-width:24px!important;padding:0!important;margin:0!important;
      border:0!important;border-radius:50%!important;background:#55aeea!important;color:#fff!important;
      font-size:18px!important;font-weight:1000!important;line-height:1!important;
    }
    #gameLobby .homeSettings{
      width:40px!important;height:40px!important;min-width:40px!important;flex:0 0 40px!important;
    }
    @media(max-width:390px){
      #gameLobby .homeTop{gap:4px!important}
      #gameLobby .profileMini{width:82px!important;min-width:82px!important;flex-basis:82px!important;height:44px!important}
      #gameLobby .profileAvatar{width:25px!important;height:25px!important;min-width:25px!important;flex-basis:25px!important}
      #gameLobby .coreRes{width:103px!important;min-width:103px!important;max-width:103px!important;flex-basis:103px!important}
      #gameLobby .gemRes{width:80px!important;min-width:80px!important;max-width:80px!important;flex-basis:80px!important}
      #gameLobby .homeRes b{font-size:12px!important}
      #gameLobby .homeRes button{display:grid!important;width:23px!important;height:23px!important;min-width:23px!important;flex-basis:23px!important}
      #gameLobby .homeSettings{width:38px!important;height:38px!important;min-width:38px!important;flex-basis:38px!important}
    }
    #gameLobby .menuItem,
    #gameLobby #lobbyStages,
    #gameLobby #lobbyGear,
    #gameLobby #lobbyBook,
    #gameLobby #lobbyGrowth{
      border:1px solid rgba(255,255,255,.10)!important;
      border-radius:20px!important;
      background:linear-gradient(145deg,rgba(255,255,255,.095),rgba(255,255,255,.035))!important;
      color:#fff!important;
      box-shadow:0 12px 26px rgba(0,0,0,.20)!important;
      backdrop-filter:blur(8px);
      transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease;
    }
    #gameLobby .menuItem:active,
    #gameLobby #lobbyStages:active,
    #gameLobby #lobbyGear:active,
    #gameLobby #lobbyBook:active,
    #gameLobby #lobbyGrowth:active{transform:scale(.985)!important;}
    #gameLobby #lobbyStart{
      min-height:76px!important;border:0!important;border-radius:22px!important;
      background:linear-gradient(180deg,#ffd866 0%,#f1b43d 72%,#e89b25 100%)!important;
      color:#30220d!important;
      box-shadow:0 7px 0 #9c641d,0 15px 28px rgba(0,0,0,.28)!important;
      font-weight:1000!important;letter-spacing:-.4px!important;
      position:relative;overflow:hidden;
    }
    #gameLobby #lobbyStart:before{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 25%,rgba(255,255,255,.30) 50%,transparent 75%);transform:translateX(-120%);animation:ddLobbyShine 4.5s ease-in-out infinite;pointer-events:none;}
    @keyframes ddLobbyShine{0%,58%{transform:translateX(-120%)}72%,100%{transform:translateX(120%)}}
    #gameLobby #lobbyStart *{position:relative;z-index:1;}
    #gameLobby #lobbyStage{color:#59400f!important;font-weight:900!important;}
    #gameLobby #lobbyCoins{color:#ffd866!important;font-weight:1000!important;}
    #gameLobby .menuItem small{display:block;margin-top:4px;color:#aebdc5!important;font-size:10px!important;line-height:1.35;}
    #gameLobby .menuGrid{gap:10px!important;}
    #gameLobby .menuGrid .menuItem{min-height:72px!important;}
    #gameLobby [class*="banner"],#gameLobby .notice,#gameLobby .homeBanner{border-radius:18px!important;overflow:hidden;box-shadow:0 10px 22px rgba(0,0,0,.16)!important;}
    #gameLobby .bottomNav,#gameLobby .navBar,#gameLobby .lobbyNav{background:rgba(17,26,29,.88)!important;border-top:1px solid rgba(255,255,255,.10)!important;backdrop-filter:blur(14px);}
    #gameLobby .bottomNav button,#gameLobby .navBar button,#gameLobby .lobbyNav button{color:#cbd5da!important;font-weight:900!important;}
    #gameLobby .bottomNav .active,#gameLobby .navBar .active,#gameLobby .lobbyNav .active{color:#ffd866!important;}
    @media(max-width:520px){
      #gameLobby #lobbyStart{min-height:70px!important;border-radius:20px!important;}
      #gameLobby .menuGrid{gap:8px!important;}
      #gameLobby .menuGrid .menuItem{min-height:66px!important;border-radius:17px!important;}
    }
  `;
  document.head.appendChild(s);

  function polish(){
    const lobby=document.getElementById('gameLobby'); if(!lobby)return;
    const start=document.getElementById('lobbyStart');
    if(start){
      start.setAttribute('aria-label','전투 시작');
      start.style.touchAction='manipulation';
    }
    ['lobbyStages','lobbyGrowth','lobbyShop','lobbyGear','lobbyBook'].forEach(id=>{
      const el=document.getElementById(id); if(el)el.style.touchAction='manipulation';
    });
  }
  polish();
  document.addEventListener('DOMContentLoaded',polish,{once:true});
  window.__duckV38PolishLobby=polish;
})();


/* --- V39 FINAL DESIGN SYSTEM: approved concept board --- */
(function(){
  const STYLE_ID='doldol-v39-final-design';
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=`
    :root{
      --dd39-navy:#12333a;
      --dd39-teal:#1f6f73;
      --dd39-teal2:#2d9291;
      --dd39-wood:#6b4528;
      --dd39-wood2:#8b5a32;
      --dd39-gold:#ffd45a;
      --dd39-gold2:#f2a62c;
      --dd39-cream:#fff7df;
      --dd39-ink:#203238;
    }

    /* Lobby: warm, illustrated mobile-game presentation. */
    #gameLobby{
      background:
        radial-gradient(110% 48% at 50% 0%,rgba(255,255,255,.42),transparent 62%),
        linear-gradient(180deg,#8bd9ee 0%,#b8e3d4 34%,#8fba79 62%,#62885a 100%) !important;
      color:var(--dd39-ink)!important;
      font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;
    }
    #gameLobby:before{
      content:'';position:absolute;left:0;right:0;top:0;height:48%;pointer-events:none;
      background:
        radial-gradient(ellipse at 18% 30%,rgba(255,255,255,.45) 0 7%,transparent 8%),
        radial-gradient(ellipse at 78% 22%,rgba(255,255,255,.38) 0 8%,transparent 9%),
        linear-gradient(180deg,rgba(255,255,255,.10),transparent 70%);
      opacity:.75;
    }
    #gameLobby>*{box-sizing:border-box;}

    /* Top resource strip / player badge */
    #gameLobby [id*="player"],#gameLobby [id*="Profile"],#gameLobby .playerInfo{
      filter:drop-shadow(0 5px 8px rgba(20,45,45,.20));
    }
    #gameLobby [id*="coin"],#gameLobby [id*="energy"],#gameLobby [id*="gem"]{
      border-color:rgba(255,255,255,.30)!important;
      box-shadow:0 5px 12px rgba(22,52,54,.18)!important;
    }

    /* Main hero/card area */
    #gameLobby .homeBanner,#gameLobby .hero,#gameLobby [class*="hero"],#gameLobby [class*="mainCard"]{
      border:2px solid rgba(255,255,255,.58)!important;
      border-radius:26px!important;
      box-shadow:0 14px 30px rgba(38,77,65,.20),inset 0 1px 0 rgba(255,255,255,.48)!important;
      background:linear-gradient(180deg,rgba(235,249,245,.30),rgba(35,105,101,.18))!important;
      overflow:hidden!important;
    }

    /* Stage card */
    #gameLobby #lobbyStages{
      border:2px solid rgba(255,255,255,.58)!important;
      border-radius:18px!important;
      background:linear-gradient(180deg,#214e4f,#173c3d)!important;
      color:#fff!important;
      box-shadow:0 6px 0 rgba(62,43,26,.32),0 13px 25px rgba(29,62,55,.18)!important;
      position:relative;overflow:hidden;
    }
    #gameLobby #lobbyStages:after{
      content:'›';position:absolute;right:16px;top:50%;transform:translateY(-54%);
      font-size:34px;font-weight:900;color:#fff;opacity:.88;pointer-events:none;
    }
    #gameLobby #lobbyStage{color:#fff!important;font-size:17px!important;font-weight:1000!important;letter-spacing:.2px;}

    /* Secondary menu cards: compact military field-kit feel */
    #gameLobby .menuItem,#gameLobby #lobbyGear,#gameLobby #lobbyBook,#gameLobby #lobbyGrowth{
      border:2px solid rgba(255,255,255,.30)!important;
      border-radius:17px!important;
      background:linear-gradient(180deg,#315d59,#234844)!important;
      color:#fff!important;
      box-shadow:0 5px 0 rgba(48,33,22,.28),0 10px 18px rgba(29,62,55,.16)!important;
      backdrop-filter:none!important;
    }
    #gameLobby .menuItem small{color:#d8e7df!important;opacity:.86;}

    /* Main CTA: yellow/gold, chunky and readable */
    #gameLobby #lobbyStart{
      min-height:82px!important;
      border:3px solid #fff0b0!important;
      border-radius:22px!important;
      background:linear-gradient(180deg,#ffd95e 0%,#ffc43d 58%,#eda52a 100%)!important;
      color:#3b2b14!important;
      box-shadow:0 7px 0 #a96d20,0 16px 26px rgba(76,54,20,.26),inset 0 2px 0 rgba(255,255,255,.55)!important;
      font-weight:1000!important;
      font-size:clamp(20px,4.8vw,30px)!important;
      letter-spacing:-1px!important;
    }
    #gameLobby #lobbyStart:before{opacity:.55!important;animation:dd39Shine 4.8s ease-in-out infinite!important;}
    @keyframes dd39Shine{0%,58%{transform:translateX(-130%)}72%,100%{transform:translateX(130%)}}
    #gameLobby #lobbyStart:active{transform:translateY(3px)!important;box-shadow:0 4px 0 #a96d20,0 9px 18px rgba(76,54,20,.22)!important;}

    /* Bottom navigation: wooden field-kit bar */
    #gameLobby .bottomNav,#gameLobby .navBar,#gameLobby .lobbyNav{
      background:linear-gradient(180deg,#8a5b35,#5f3c26)!important;
      border-top:2px solid rgba(255,223,159,.52)!important;
      box-shadow:0 -7px 18px rgba(46,30,20,.20)!important;
      backdrop-filter:none!important;
    }
    #gameLobby .bottomNav button,#gameLobby .navBar button,#gameLobby .lobbyNav button{
      color:#f8ead2!important;text-shadow:0 1px 2px rgba(0,0,0,.35);font-weight:1000!important;
    }
    #gameLobby .bottomNav .active,#gameLobby .navBar .active,#gameLobby .lobbyNav .active{
      color:#ffe27b!important;
    }

    /* Notifications / event banner */
    #gameLobby .notice,#gameLobby .homeNotice,#gameLobby [class*="notice"],#gameLobby [class*="event"]{
      border:1px solid rgba(255,255,255,.40)!important;
      border-radius:18px!important;
      box-shadow:0 8px 18px rgba(35,69,64,.16)!important;
      overflow:hidden!important;
    }

    @media(max-width:520px){
      #gameLobby #lobbyStart{min-height:74px!important;border-radius:20px!important;font-size:22px!important;}
      #gameLobby .menuGrid{gap:8px!important;}
      #gameLobby .menuGrid .menuItem{min-height:68px!important;border-radius:16px!important;}
    }
  `;
  document.head.appendChild(s);
  window.__duckV39FinalDesign=true;
})();


/* ================================================================
   DOLDOL SPECIAL FORCE V41
   - V42: lobby -> weapon/equipment menu -> direct battle start
   - Equipped stone is applied to the actual combat engine
   - Stage navigation uses chapter/list UI instead of a map
   - Removes visible MOVE joystick; drag movement remains available
   ================================================================ */
(function(){
  const $=id=>document.getElementById(id);
  const lobby=$('gameLobby'), menu=$('menuScreen'), menuTitle=$('menuTitle'), menuBody=$('menuBody');
  const lobbyStart=$('lobbyStart'), lobbyStages=$('lobbyStages'), menuClose=$('menuClose');
  if(!lobby || !menu || !menuBody) return;

  // Persist the selected pre-battle stone only as a loadout choice.
  const LOADOUT_KEY='doldol_prebattle_stone_v1';
  function getPreparedStone(){
    try{
      const id=localStorage.getItem(LOADOUT_KEY)||'basic';
      return (window.__duckStoneDefs && window.__duckStoneDefs[id]) ? id : id;
    }catch(e){ return 'basic'; }
  }
  function savePreparedStone(id){ try{ localStorage.setItem(LOADOUT_KEY,id); }catch(e){} }
  window.__duckPreparedStone=getPreparedStone();

  // V42 uses the real combat selector exposed by the battle engine.
  window.__duckPreparedStone=getPreparedStone();

  function currentStage(){ return Math.max(1,Math.min(500,Number(window.__duckStage||window.__selectedDuckStage||1)||1)); }
  function unlockedStage(){
    try{return Math.max(1,Math.min(500,Number(localStorage.getItem('doldol_unlocked_stage_v1')||1)||1));}catch(e){return 1;}
  }
  const defs={
    basic:{icon:'🪨',art:'assets/%20%20%20%20stone_basic.png',name:'기본돌',role:'표준형',desc:'안정적인 기본 공격',unlock:0},
    fire:{icon:'🔥',art:'assets/%20%20%20%20stone_fire.png',name:'불돌',role:'지속딜',desc:'적중 시 추가 화상 피해',unlock:5},
    ice:{icon:'❄️',art:'assets/%20%20%20%20stone_ice.png',name:'얼음돌',role:'제어형',desc:'적중 시 이동속도 감소',unlock:10},
    bomb:{icon:'💥',art:'assets/%20%20%20%20stone_bomb.png',name:'폭발돌',role:'광역형',desc:'주변 적에게 범위 피해',unlock:15},
    lightning:{icon:'⚡',art:'assets/%20%20%20%20stone_lightning.png',name:'번개돌',role:'연쇄형',desc:'주변 적에게 연쇄 피해',unlock:20},
    skill:{icon:'✨',art:'assets/%20%20%20%20stone_skill.png',name:'스킬돌',role:'특수형',desc:'적중 시 스킬 재사용 대기시간 감소',unlock:25}
  };
  const order=['basic','fire','ice','bomb','lightning','skill'];
  function highestCleared(){return Math.max(0,unlockedStage()-1)}
  function stoneUnlocked(id){const d=defs[id]||defs.basic;return highestCleared()>=(d.unlock||0)}

  function showMenu(){
    // Opening the armory is a lobby action. Never leave a stale result/map
    // overlay underneath it, because closing the armory could reveal that
    // old screen again.
    const result=document.getElementById('resultScreen');
    const map=document.getElementById('mapScreen');
    if(result) result.classList.remove('show');
    if(map) map.classList.remove('show');
    menu.classList.add('show');
    lobby.classList.add('hidden');
  }
  function closeMenu(){
    menu.classList.remove('show');
    const result=document.getElementById('resultScreen');
    const map=document.getElementById('mapScreen');
    if(result) result.classList.remove('show');
    if(map) map.classList.remove('show');
    lobby.classList.remove('hidden');
    if(window.__duckSyncLobby) window.__duckSyncLobby();
  }

  function renderEquipmentMenu(){
    const GEAR_KEY='doldol_gear_loadout_v1';
    const OWN_KEY='doldol_gear_owned_v1';
    const UPGRADE_KEY='doldol_gear_upgrade_v1';
    const gearDefs=[
      {id:'helmet',slot:'armor',art:'./assets/gear/gear_tactical_helmet.png',name:'전술 헬멧',role:'기본 방어',rarity:'희귀',def:18},
      {id:'vest',slot:'armor',art:'./assets/gear/gear_combat_vest.png',name:'전투조끼',role:'체력 보강',rarity:'희귀',hp:35},
      {id:'heavy',slot:'armor',art:'./assets/gear/gear_heavy_armor.png',name:'중장갑',role:'높은 방어',rarity:'영웅',def:30},
      {id:'light',slot:'armor',art:'./assets/gear/gear_light_armor.png',name:'경량장갑',role:'기동 방어',rarity:'영웅',def:22,hp:18},
      {id:'gloves',slot:'support',art:'./assets/gear/gear_tactical_gloves.png',name:'전술 장갑',role:'반격 보조',rarity:'희귀',special:8},
      {id:'boots',slot:'support',art:'./assets/gear/gear_combat_boots.png',name:'전투화',role:'타이밍 보조',rarity:'희귀',special:10},
      {id:'scope',slot:'support',art:'./assets/gear/gear_scope.png',name:'조준경',role:'공격 보조',rarity:'영웅',atk:14,special:6},
      {id:'pack',slot:'support',art:'./assets/gear/gear_tactical_backpack.png',name:'전술 배낭',role:'생존 보조',rarity:'영웅',hp:24,special:5}
    ];
    const slotName={armor:'방어구',support:'보조장비'};
    let loadout={armor:'helmet',support:'gloves'};
    let owned=gearDefs.map(x=>x.id);
    let upgradeLevels={};
    try{
      const saved=JSON.parse(localStorage.getItem(GEAR_KEY)||'{}')||{};
      if(saved.armor)loadout.armor=saved.armor;
      if(saved.support)loadout.support=saved.support;
    }catch(e){}
    try{const v=JSON.parse(localStorage.getItem(OWN_KEY)||'null');if(Array.isArray(v)&&v.length)owned=v;}catch(e){}
    try{upgradeLevels=JSON.parse(localStorage.getItem(UPGRADE_KEY)||'{}')||{};}catch(e){}
    const save=()=>{try{localStorage.setItem(GEAR_KEY,JSON.stringify(loadout));localStorage.setItem(OWN_KEY,JSON.stringify(owned));localStorage.setItem(UPGRADE_KEY,JSON.stringify(upgradeLevels));}catch(e){}};
    const gearLevel=id=>Math.max(1,Math.min(20,Number(upgradeLevels[id]||1)||1));
    const scaled=(v,id,lv=gearLevel(id))=>Math.round((Number(v)||0)*(1+(lv-1)*.10));
    const upgradeCost=lv=>180+lv*55;
    window.__duckGearLoadout=()=>Object.assign({stone:getPreparedStone()},loadout);

    function statText(g,lv=gearLevel(g.id)){
      const a=[]; if(g.atk)a.push('공격 +'+scaled(g.atk,g.id,lv)); if(g.def)a.push('방어 +'+scaled(g.def,g.id,lv));
      if(g.hp)a.push('체력 +'+scaled(g.hp,g.id,lv)); if(g.special)a.push('특수 +'+scaled(g.special,g.id,lv));
      return a.join(' · ')||'기본 장비';
    }
    function equipped(slot){return gearDefs.find(x=>x.id===loadout[slot]);}
    function currentStone(){
      let id=getPreparedStone()||'basic';
      if(!defs[id]||!stoneUnlocked(id))id='basic';
      return {id,...defs[id]};
    }
    function equipStone(id){
      if(!defs[id]||!stoneUnlocked(id))return;
      savePreparedStone(id); window.__duckPreparedStone=id;
      if(window.__duckEquipStone)window.__duckEquipStone(id);
      render('stone');
    }
    function renderStoneDetail(id){
      const d=defs[id]||defs.basic,ok=stoneUnlocked(id),on=currentStone().id===id;
      menuTitle.textContent='돌 상세';
      menuBody.innerHTML='<div class="stoneGearDetail">'+
        '<button type="button" class="gearDetailBack" id="stoneDetailBack">‹</button>'+
        '<div class="stoneGearHero"><span><img src="'+d.art+'" alt="'+d.name+'"></span><div><small>'+d.role+'</small><h2>'+d.name+'</h2><p>'+d.desc+'</p>'+(ok?'<strong>사용 가능</strong>':'<strong>STAGE '+d.unlock+' 클리어 후 해금</strong>')+'</div></div>'+
        '<div class="stoneGearRule"><b>돌 = 전투 방식</b><small>장비 능력치와 별개로 공격 특성만 바뀝니다.</small></div>'+
        '<button type="button" id="stoneDetailEquip" class="gearDetailEquip '+(on?'on':'')+'" '+(ok?'':'disabled')+'>'+(on?'✓ 장착중':ok?'이 돌 장착하기':'🔒 잠금')+'</button>'+
      '</div>';
      menuBody.querySelector('#stoneDetailBack').onclick=()=>render('stone');
      const btn=menuBody.querySelector('#stoneDetailEquip');
      if(btn&&ok)btn.onclick=()=>equipStone(id);
    }
    function renderDetail(id,returnFilter='all'){
      const g=gearDefs.find(x=>x.id===id); if(!g)return render(returnFilter);
      const lv=gearLevel(g.id), nextLv=Math.min(20,lv+1), cost=upgradeCost(lv);
      const equippedNow=loadout[g.slot]===g.id;
      const wallet=window.__duckWallet;
      const have=wallet?wallet.coins:0;
      menuTitle.textContent='장비 상세';
      menuBody.innerHTML='<div class="gearDetailV1">'+
        '<button type="button" class="gearDetailBack" id="gearDetailBack">‹</button>'+
        '<div class="gearDetailHero"><img src="'+g.art+'" alt="'+g.name+'"><div><small>'+g.rarity+' · '+slotName[g.slot]+'</small><h2>'+g.name+'</h2><p>'+g.role+'</p><strong>Lv.'+lv+' / 20</strong></div></div>'+
        '<div class="gearDetailStat"><small>현재 능력치</small><b>'+statText(g,lv)+'</b>'+(lv<20?'<em>강화 후 · '+statText(g,nextLv)+'</em>':'<em>MAX LEVEL</em>')+'</div>'+
        '<button type="button" id="gearDetailEquip" class="gearDetailEquip '+(equippedNow?'on':'')+'">'+(equippedNow?'✓ 장착중':'장착하기')+'</button>'+
        '<button type="button" id="gearDetailUpgrade" class="gearDetailUpgrade" '+(lv>=20||have<cost?'disabled':'')+'>'+(lv>=20?'MAX LEVEL':'강화하기 · 돌핵 '+cost)+'</button>'+
        (lv<20&&have<cost?'<div class="gearDetailNeed">돌핵이 부족합니다 · 보유 '+have+'</div>':'')+'</div>';
      const back=menuBody.querySelector('#gearDetailBack'); if(back)back.onclick=()=>render(returnFilter);
      const equipBtn=menuBody.querySelector('#gearDetailEquip'); if(equipBtn)equipBtn.onclick=()=>{loadout[g.slot]=g.id;save();renderDetail(g.id,returnFilter);};
      const upBtn=menuBody.querySelector('#gearDetailUpgrade'); if(upBtn)upBtn.onclick=()=>{
        const now=gearLevel(g.id), c=upgradeCost(now); if(now>=20)return;
        if(!window.__duckWallet||!window.__duckWallet.spendCoins(c))return renderDetail(g.id,returnFilter);
        upgradeLevels[g.id]=now+1; save();
        if(window.__duckMissionEvent)window.__duckMissionEvent('gear',1);
        if(player&&player.gearStats) applyGrowthToPlayer();
        if(window.__duckSyncLobby)window.__duckSyncLobby();
        renderDetail(g.id,returnFilter);
      };
    }
    function render(filter='all'){
      menuTitle.textContent='장비';
      const stone=currentStone();
      const stoneSlot='<button type="button" class="gearV1Slot stoneSlot" data-gear-filter-jump="stone"><small>돌</small><span class="gearV1SlotArt stoneEmoji"><img src="'+stone.art+'" alt="'+stone.name+'"></span><b>'+stone.name+'</b><em>'+stone.role+' · '+stone.desc+'</em></button>';
      const gearSlots=['armor','support'].map(slot=>{
        const g=equipped(slot);
        return '<button type="button" class="gearV1Slot" data-gear-slot="'+slot+'"><small>'+slotName[slot]+'</small><span class="gearV1SlotArt">'+(g?'<img src="'+g.art+'" alt="'+g.name+'">':'＋')+'</span><b>'+(g?g.name:'미장착')+'</b><em>'+(g?statText(g):'장비를 선택하세요')+'</em></button>';
      }).join('');
      const stoneCards=order.map(id=>{
        const d=defs[id],ok=stoneUnlocked(id),on=stone.id===id;
        return '<button type="button" class="gearV1Card stoneGearCard '+(on?'equipped ':'')+(ok?'':'locked')+'" data-stone-id="'+id+'">'+
          '<i class="gearV1Art stoneGearArt"><img src="'+d.art+'" alt="'+d.name+'"></i><span><strong>'+d.name+'</strong><small>'+d.role+(ok?'':' · 🔒 STAGE '+d.unlock)+'</small><em>'+d.desc+'</em></span>'+
          (on?'<b>장착중</b>':'')+'</button>';
      }).join('');
      const gearList=gearDefs.filter(g=>filter==='all'||g.slot===filter).map(g=>{
        const on=loadout[g.slot]===g.id;
        return '<button type="button" class="gearV1Card '+(on?'equipped':'')+'" data-gear-id="'+g.id+'">'+
          '<i class="gearV1Art gearV1Art-'+g.id+'"><img src="'+g.art+'" alt="'+g.name+'"></i><span><strong>'+g.name+'</strong><small>'+g.rarity+' · '+g.role+'</small><em>'+statText(g)+'</em></span>'+
          (on?'<b>장착중</b>':'')+'</button>';
      }).join('');
      const list=filter==='stone'?stoneCards:(filter==='all'?stoneCards+gearList:gearList);
      menuBody.innerHTML=
        '<div class="gearV1Summary"><strong>출격 세팅</strong><small>돌은 공격 방식을, 방어구와 보조장비는 기본 능력치를 결정합니다.</small></div>'+
        '<div class="gearV1Slots">'+stoneSlot+gearSlots+'</div>'+
        '<div class="gearV1Tabs stoneGearTabs">'+
          '<button data-gear-filter="all" class="'+(filter==='all'?'on':'')+'">전체</button>'+
          '<button data-gear-filter="stone" class="'+(filter==='stone'?'on':'')+'">돌</button>'+
          '<button data-gear-filter="armor" class="'+(filter==='armor'?'on':'')+'">방어구</button>'+
          '<button data-gear-filter="support" class="'+(filter==='support'?'on':'')+'">보조장비</button>'+
        '</div><div class="gearV1Inventory">'+list+'</div>';
      menuBody.querySelectorAll('[data-gear-filter]').forEach(b=>b.onclick=()=>render(b.dataset.gearFilter));
      menuBody.querySelectorAll('[data-gear-filter-jump]').forEach(b=>b.onclick=()=>render(b.dataset.gearFilterJump));
      menuBody.querySelectorAll('[data-gear-slot]').forEach(b=>b.onclick=()=>render(b.dataset.gearSlot));
      menuBody.querySelectorAll('[data-stone-id]').forEach(b=>b.onclick=()=>renderStoneDetail(b.dataset.stoneId));
      menuBody.querySelectorAll('[data-gear-id]').forEach(b=>b.onclick=()=>renderDetail(b.dataset.gearId,filter));
    }
    render('all');
  }

  // Replace legacy menu-close listeners so closing the armory has one deterministic path.
  if(menuClose){
    const closeBtn=menuClose.cloneNode(true);
    menuClose.parentNode.replaceChild(closeBtn,menuClose);
    closeBtn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    });
  }

  function startDirectBattle(){
    const st=currentStage();
    let equipped=window.__duckPreparedStone||getPreparedStone()||'basic';
    if(!defs[equipped]||!stoneUnlocked(equipped))equipped='basic';
    savePreparedStone(equipped);window.__duckPreparedStone=equipped;
    if(window.__duckEquipStone)window.__duckEquipStone(equipped);
    menu.classList.remove('show');lobby.classList.add('hidden');
    if(window.__duckStartStage)window.__duckStartStage(st);
  }

  // Main CTA starts battle directly; stone selection lives in the equipment menu.
  function handleLobbyStart(e){
    e.preventDefault();e.stopPropagation();
    startDirectBattle();
  }
  function handleLobbyGear(e){
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    renderEquipmentMenu(); showMenu();
  }
  if(lobbyStart)lobbyStart.onclick=handleLobbyStart;
  const directGear=document.getElementById('lobbyGear');if(directGear)directGear.onclick=handleLobbyGear;

  // Keep labels consistent with the new navigation.
  try{ const sd=defs[getPreparedStone()]||defs.basic; lobbyStart.innerHTML='<span style="font-size:24px">⚔️</span><b>전투 시작</b><small>'+sd.icon+' '+sd.name+' · STAGE '+currentStage()+'</small>'; }catch(e){}
  const gearButton=$('lobbyGear');
  if(gearButton) gearButton.innerHTML='<span style=\"font-size:22px\">🎒</span><b>장비</b><small>장착 · 강화</small>';

  // ---------------- Stage list (5 chapters, no map) ----------------
  let stagePanel=$('v41StagePanel');
  if(!stagePanel){
    stagePanel=document.createElement('div'); stagePanel.id='v41StagePanel';
    stagePanel.innerHTML='<div class="v41StageInner">'+
      '<div class="v41StageTop"><button id="v41StageBack">‹</button><div><strong>스테이지</strong><small>500개의 작전 · 5개 챕터</small></div><span id="v41StageCurrent">STAGE 1</span></div>'+
      '<div id="v41Chapters" class="v41Chapters"></div>'+
      '<div class="v41StageSummary" id="v41StageSummary"></div>'+
      '<div id="v41StageGrid" class="v41StageGrid"></div>'+
      '<div class="v41StagePager"><button id="v41Prev">‹ 이전</button><span id="v41PageLabel">1 / 10</span><button id="v41Next">다음 ›</button></div>'+
      '<button id="v41StageBattle" class="v41StartBattle">⚔️ 선택 스테이지 출격</button>'+
    '</div>';
    document.body.appendChild(stagePanel);
  }
  let chapter=1, page=1, selectedStage=1;
  function stageStars(){
    try{return JSON.parse(localStorage.getItem('doldol_stage_stars_v1')||'{}')||{};}catch(e){return {};}
  }
  function drawStageList(){
    const unlocked=unlockedStage();
    const stars=stageStars();
    const start=((page-1)*10)+1+(chapter-1)*100;
    selectedStage=Math.max(1,Math.min(unlocked,Number(selectedStage)||unlocked));
    $('v41StageCurrent').textContent='STAGE '+selectedStage;
    $('v41Chapters').innerHTML=[1,2,3,4,5].map(c=>'<button class="v41Chapter '+(c===chapter?'active':'')+'" data-ch="'+c+'">CHAPTER '+c+'<small>'+((c-1)*100+1)+'–'+(c*100)+'</small></button>').join('');
    $('v41Chapters').querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{chapter=Number(b.dataset.ch);page=1;drawStageList();});
    const labels=['푸른 언덕','붉은 협곡','얼어붙은 계곡','화산 요새','최종 특공 작전'];
    $('v41StageSummary').innerHTML='<b>CHAPTER '+chapter+' · '+labels[chapter-1]+'</b><span>STAGE '+((chapter-1)*100+1)+' ~ '+(chapter*100)+' · 현재 진행 STAGE '+unlocked+'</span>';
    $('v41StageGrid').innerHTML=Array.from({length:10},(_,i)=>{
      const st=start+i, locked=st>unlocked, selected=st===selectedStage, recommended=st===unlocked;
      const best=Math.max(0,Math.min(3,Number(stars[st])||0));
      const starText=best?('★'.repeat(best)+'☆'.repeat(3-best)):'☆ ☆ ☆';
      return '<button class="v41StageNode '+(locked?'locked ':'')+(selected?'current ':'')+(recommended?'recommended':'')+'" data-st="'+st+'">'+
        '<strong>'+st+'</strong><small>'+(st%5===0?'BOSS':'STAGE')+'</small>'+
        '<span class="v41StageStars">'+(locked?'—':starText)+'</span>'+
        (recommended&&!locked?'<i class="v41NextMark">NEXT</i>':'')+(locked?'<em>🔒</em>':'')+'</button>';
    }).join('');
    $('v41StageGrid').querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{
      if(b.classList.contains('locked'))return;
      selectedStage=Number(b.dataset.st);
      window.__selectedDuckStage=selectedStage;
      drawStageList();
    });
    $('v41PageLabel').textContent=page+' / 10';
    $('v41Prev').disabled=page<=1; $('v41Next').disabled=page>=10;
    const battle=$('v41StageBattle');
    if(battle) battle.innerHTML='⚔️ STAGE '+selectedStage+' 출격';
  }
  function openStageList(){
    selectedStage=unlockedStage();
    window.__selectedDuckStage=selectedStage;
    chapter=Math.min(5,Math.max(1,Math.ceil(selectedStage/100)));
    page=Math.min(10,Math.max(1,Math.ceil((selectedStage-(chapter-1)*100)/10)));
    drawStageList();
    stagePanel.classList.add('show');
    lobby.classList.add('hidden');
  }
  $('v41StageBack').onclick=()=>{stagePanel.classList.remove('show');lobby.classList.remove('hidden');};
  $('v41Prev').onclick=()=>{if(page>1){page--;drawStageList();}};
  $('v41Next').onclick=()=>{if(page<10){page++;drawStageList();}};
  $('v41StageBattle').onclick=()=>{
    const st=Math.max(1,Math.min(unlockedStage(),Number(selectedStage)||unlockedStage()));
    stagePanel.classList.remove('show');
    window.__selectedDuckStage=st;
    window.__duckStage=st;
    startDirectBattle();
  };
  lobbyStages.onclick=function(e){e.preventDefault();e.stopPropagation();openStageList();};

  // Equipment is opened only from the bottom equipment button.
  const gear=$('lobbyGear'); if(gear) gear.onclick=function(e){e.preventDefault();e.stopPropagation();renderEquipmentMenu();showMenu();};
})();

/* V41 styles */
(function(){
  const css=document.createElement('style'); css.textContent=`
    #v41StagePanel{position:fixed;inset:0;z-index:100000;background:linear-gradient(180deg,#0d1b22,#101b24);display:none;color:#fff;font-family:system-ui,-apple-system,sans-serif;padding:18px;overflow:auto}
    #v41StagePanel.show{display:block}
    .v41StageInner{max-width:620px;margin:0 auto;padding:10px 0 28px}
    .v41StageTop{display:flex;align-items:center;gap:14px;padding:8px 0 18px}.v41StageTop button{width:46px;height:46px;border-radius:14px;border:1px solid #56656e;background:#23343c;color:#fff;font-size:32px}.v41StageTop strong{display:block;font-size:24px}.v41StageTop small{display:block;color:#9eabb2;margin-top:3px}.v41StageTop>span{margin-left:auto;background:#18272f;border:1px solid #46555d;border-radius:13px;padding:9px 12px;font-weight:900;color:#ffd75a}
    .v41Chapters{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.v41Chapter{min-height:62px;border-radius:13px;border:1px solid #46555d;background:#1c2c34;color:#cbd4d8;font-weight:900}.v41Chapter.active{border-color:#ffd45b;background:linear-gradient(180deg,#31524d,#20363a);color:#fff;box-shadow:0 0 0 2px rgba(255,212,91,.18)}.v41Chapter small{display:block;font-size:9px;font-weight:700;color:#9aa8ad;margin-top:3px}
    .v41StageSummary{margin:14px 0 10px;padding:14px 16px;border-radius:16px;background:#152830;border:1px solid #3e5158}.v41StageSummary b{display:block}.v41StageSummary span{display:block;color:#a9b6bb;font-size:12px;margin-top:4px}
    .v41StageGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.v41StageNode{position:relative;min-height:72px;border-radius:15px;border:1px solid #46555d;background:#21333b;color:#fff}.v41StageNode strong{display:block;font-size:22px}.v41StageNode small{display:block;color:#a9b6bb;font-size:9px}.v41StageNode.current{border:2px solid #ffd45b;box-shadow:0 0 0 2px rgba(255,212,91,.14)}.v41StageNode.recommended:not(.locked){background:linear-gradient(180deg,#2d4945,#20353b)}.v41StageNode.locked{opacity:.38}.v41StageNode em{position:absolute;right:6px;top:5px;font-style:normal;font-size:12px}.v41StageStars{display:block;margin-top:5px;color:#ffd45b;font-size:11px;letter-spacing:1px;white-space:nowrap}.v41NextMark{position:absolute;left:6px;top:5px;padding:2px 5px;border-radius:6px;background:#ffd45b;color:#243038;font-style:normal;font-size:8px;font-weight:1000}
    .v41StagePager{display:flex;align-items:center;justify-content:space-between;margin:16px 0}.v41StagePager button{background:#243740;color:#fff;border:1px solid #52636a;border-radius:12px;padding:11px 16px;font-weight:800}.v41StagePager button:disabled{opacity:.35}
    .v41PrepHeader{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:15px;border-radius:18px;background:linear-gradient(180deg,#1b3840,#172a31);border:1px solid #51636a;margin-bottom:14px}.v41PrepHeader strong{font-size:25px}.v41PrepHeader small{display:block;color:#9fadb3;margin-top:3px}.v41PrepCharacter{padding:9px 12px;border-radius:14px;background:#102027;text-align:right}.v41SectionTitle{font-weight:900;font-size:17px;margin:14px 2px 10px}.v41GearGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.v41GearCard{position:relative;text-align:left;min-height:115px;border-radius:17px;border:2px solid #34464e;background:#1d3038;color:#fff;padding:13px}.v41GearCard.selected{border-color:#ffd45b;box-shadow:0 0 0 2px rgba(255,212,91,.16);background:linear-gradient(180deg,#30453e,#1e3138)}.v41GearIcon{font-size:28px;display:block}.v41GearCard b{display:block;font-size:16px;margin-top:4px}.v41GearCard small{display:block;color:#a9b6bb;margin-top:4px}.v41GearCard em{position:absolute;right:10px;top:10px;font-style:normal;font-weight:900;color:#ffd45b}.v41LoadoutNote{margin:12px 2px;color:#9faeb4;font-size:11px;line-height:1.5}.v41StartBattle{width:100%;min-height:58px;border:0;border-radius:17px;background:linear-gradient(180deg,#ffd45c,#ffb72e);color:#182127;font-size:19px;font-weight:1000;box-shadow:0 5px 0 #a76d20;margin-top:10px}.v41StartBattle small{display:block;font-size:10px;margin-top:2px}
    @media(max-width:430px){#v41StagePanel{padding:14px}.v41Chapters{grid-template-columns:repeat(5,1fr)}.v41Chapter{font-size:10px}.v41StageGrid{gap:7px}.v41StageNode{min-height:64px}.v41StageNode strong{font-size:19px}.v41GearGrid{gap:8px}.v41GearCard{min-height:108px}}
  `; document.head.appendChild(css);
})();


/* V42 navigation/equipment styles */
(function(){
  const css=document.createElement('style'); css.textContent=`
    .v42EquipIntro{padding:15px 16px;border-radius:18px;background:linear-gradient(180deg,#243f45,#182c33);border:1px solid #52676d;margin-bottom:14px}.v42EquipIntro strong{display:block;font-size:22px}.v42EquipIntro small{display:block;color:#aebbc0;margin-top:4px}.v42EquipNote{margin:12px 2px;color:#9faeb4;font-size:11px;line-height:1.55}

    .gearV1Summary{padding:11px 12px;border-radius:13px;background:rgba(255,255,255,.07);margin-bottom:9px}
    .gearV1Summary strong{display:block;font-size:17px}.gearV1Summary small{display:block;margin-top:3px;color:#c9d5d8;font-size:11px}
    .gearV1Slots{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}
    .gearV1Slot{min-height:112px;padding:8px 5px;border:2px solid #9c7448;border-radius:13px;background:linear-gradient(#5a432d,#30251d);color:#fff}
    .gearV1Slot small,.gearV1Slot b,.gearV1Slot em{display:block}.gearV1Slot small{color:#e6c99d;font-size:9px}.gearV1Slot .gearV1SlotArt{display:flex;height:45px;margin:3px 0;align-items:center;justify-content:center;font-size:30px}.gearV1SlotArt img{display:block;width:100%;height:100%;object-fit:contain}.gearV1Slot b{font-size:12px}.gearV1Slot em{margin-top:4px;color:#ffd86a;font-size:8px;font-style:normal}
    .gearV1Tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px}
    .gearV1Tabs button{padding:9px 2px;border:0;border-radius:9px;background:#38291f;color:#ead9c5;font-size:10px;font-weight:1000}.gearV1Tabs button.on{background:#f7d45f;color:#49351f}
    .gearV1Inventory{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding-bottom:12px}
    .gearV1Card{position:relative;min-height:82px;display:grid;grid-template-columns:48px 1fr;align-items:center;gap:7px;padding:8px;border:2px solid #785b3d;border-radius:12px;background:linear-gradient(#49392c,#29231e);color:#fff;text-align:left}
    .gearV1Card>.gearV1Art{width:48px;height:54px;display:flex;align-items:center;justify-content:center;font-style:normal;text-align:center}.gearV1Art img{display:block;width:100%;height:100%;object-fit:contain}
    .gearDetailV1{position:relative;padding:4px 2px 18px}.gearDetailBack{width:42px;height:42px;border:0;border-radius:13px;background:#c8b58a;color:#fff;font-size:32px;font-weight:1000;line-height:1;margin:0 0 12px 0}.gearDetailHero{display:grid;grid-template-columns:minmax(130px,42%) 1fr;align-items:center;gap:16px;min-height:210px;padding:18px;border-radius:22px;background:rgba(255,255,255,.10)}.gearDetailHero img{width:100%;height:175px;object-fit:contain}.gearDetailHero small{color:#ffd866;font-weight:900}.gearDetailHero h2{margin:5px 0 3px;font-size:25px}.gearDetailHero p{margin:0 0 14px;opacity:.65}.gearDetailHero strong{color:#ffd866;font-size:21px}.gearDetailStat{margin-top:12px;padding:17px 18px;border-radius:19px;background:rgba(0,0,0,.16)}.gearDetailStat small,.gearDetailStat b,.gearDetailStat em{display:block}.gearDetailStat small{opacity:.55;margin-bottom:7px}.gearDetailStat b{font-size:20px}.gearDetailStat em{font-style:normal;color:#63e2ad;font-weight:900;margin-top:7px}.gearDetailEquip,.gearDetailUpgrade{width:100%;margin-top:12px;padding:16px;border:0;border-radius:16px;font-size:16px;font-weight:1000}.gearDetailEquip{background:#2f6876;color:#fff}.gearDetailEquip.on{background:#356b78}.gearDetailUpgrade{background:#f2d77f;color:#51452e}.gearDetailUpgrade:disabled{opacity:.48}.gearDetailNeed{text-align:center;color:#ff7f8d;font-weight:900;font-size:12px;margin-top:10px}.gearV1Art-rifle img,.gearV1Art-sniper img,.gearV1Art-machine img,.gearV1Art-rocket img{width:108%;height:108%}.gearV1Art-helmet img,.gearV1Art-gloves img,.gearV1Art-boots img,.gearV1Art-scope img{width:92%;height:92%}.gearV1Art-vest img,.gearV1Art-heavy img,.gearV1Art-light img,.gearV1Art-pack img{width:88%;height:88%}.gearV1Card span strong,.gearV1Card span small,.gearV1Card span em{display:block}.gearV1Card span strong{font-size:12px}.gearV1Card span small{margin-top:2px;color:#d7bea0;font-size:8px}.gearV1Card span em{margin-top:5px;color:#ffd86a;font-size:8px;font-style:normal}.gearV1Card>b{position:absolute;right:6px;top:5px;padding:2px 5px;border-radius:7px;background:#25b7e8;font-size:7px}.gearV1Card.equipped{border-color:#58d7ff;box-shadow:0 0 0 2px rgba(88,215,255,.18)}

    .gearV1Slot.stoneSlot{border-color:#d5ad48;background:linear-gradient(#514630,#2b2920)}
    .gearV1Slot .stoneEmoji{font-size:34px;filter:drop-shadow(0 4px 5px rgba(0,0,0,.28))}
    .stoneGearCard.locked{opacity:.43;filter:grayscale(.55)}
    .stoneGearArt{font-size:31px!important;filter:drop-shadow(0 4px 5px rgba(0,0,0,.25))}
    .stoneGearDetail{position:relative;padding:4px 2px 18px}
    .stoneGearHero{display:grid;grid-template-columns:110px 1fr;gap:16px;align-items:center;padding:20px;border-radius:22px;background:linear-gradient(145deg,#34463f,#213039)}
    .stoneGearHero>span{display:grid;place-items:center;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.1);font-size:58px;box-shadow:inset 0 0 0 2px rgba(255,216,102,.2)}
    .stoneGearHero small{color:#ffd866;font-weight:1000}.stoneGearHero h2{margin:4px 0;font-size:25px}.stoneGearHero p{margin:0 0 10px;color:#c4d1d2;font-size:12px}.stoneGearHero strong{color:#ffd866}
    .stoneGearRule{margin-top:12px;padding:15px 17px;border-radius:17px;background:rgba(0,0,0,.16)}.stoneGearRule b,.stoneGearRule small{display:block}.stoneGearRule small{margin-top:4px;color:#b9c5c8;font-size:11px}
    .stoneGearTabs{grid-template-columns:repeat(4,1fr)}
        #gameLobby #lobbyGear{cursor:pointer}
  `; document.head.appendChild(css);
})();


/* V43 battle cleanup: equipment is selected before battle; bottom center is reserved for future item slots. */
(function(){
 const s=document.createElement('style');
 s.textContent=`
   #battleStoneBar{display:none!important;}
   #battleItemSlots{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:30;display:flex;align-items:center;gap:7px;pointer-events:auto;}
   #battleItemSlots .battleItemTitle{font-size:9px;font-weight:900;letter-spacing:1px;color:rgba(255,255,255,.55);margin-right:2px;}
   #battleItemSlots .battleItemBtn{position:relative;width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(8,16,23,.72);color:#fff;display:grid;place-items:center;padding:0;box-shadow:0 4px 12px rgba(0,0,0,.24);touch-action:manipulation;}
   #battleItemSlots .battleItemBtn:active{transform:scale(.94);}
   #battleItemSlots .battleItemBtn:disabled{opacity:.32;filter:grayscale(1);}
   #battleItemSlots .battleItemIcon{font-size:19px;line-height:1;}
   #battleItemSlots .battleItemCount{position:absolute;right:-4px;top:-5px;min-width:16px;height:16px;padding:0 3px;border-radius:9px;background:#ffd45b;color:#3b290e;font-size:9px;font-weight:1000;display:grid;place-items:center;border:1px solid rgba(80,48,0,.18);}
 `;
 document.head.appendChild(s);
})();


/* =========================================================
   DOLDOL RESULT SCREEN V2 — COMMERCIAL UI PASS
   - visual-only patch; combat, gate, drops and reward flow untouched
   - designed from the approved CLEAR screen direction
   ========================================================= */
(function(){
  const result=document.getElementById('resultScreen');
  if(!result) return;
  const characterSrc='./assets/characters/character_doldol.png';

  const style=document.createElement('style');
  style.id='doldolResultV2Style';
  style.textContent=`
    #resultScreen.doldolResultV2{background:linear-gradient(180deg,rgba(10,18,24,.30),rgba(10,18,24,.78));backdrop-filter:blur(3px);z-index:9999;}
    #resultScreen.doldolResultV2 .dResultCard{position:relative;width:min(88vw,390px);margin:auto;padding:22px 18px 18px;border-radius:30px;overflow:hidden;background:linear-gradient(180deg,#fffdf6 0%,#f4ead6 100%);box-shadow:0 18px 45px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.95);border:3px solid #8a5b31;}
    #resultScreen.doldolResultV2 .dWood{position:absolute;left:10%;right:10%;top:18px;height:72px;border-radius:16px;background:linear-gradient(180deg,#a96f38,#74441f);box-shadow:inset 0 2px 0 rgba(255,226,170,.45),inset 0 -4px 0 rgba(63,34,15,.28),0 5px 0 rgba(83,48,24,.25);transform:rotate(-1deg);}
    #resultScreen.doldolResultV2 .dWood:after{content:'';position:absolute;inset:10px;border:2px solid rgba(255,225,165,.28);border-radius:10px;}
    #resultScreen.doldolResultV2 .dCharacter{position:relative;display:block;width:112px;height:112px;object-fit:contain;margin:0 auto -2px;z-index:2;filter:drop-shadow(0 9px 7px rgba(58,34,16,.25));animation:doldolCelebrate .75s cubic-bezier(.2,.8,.2,1) both;}
    #resultScreen.doldolResultV2 .dKicker{position:relative;z-index:3;color:#ffe8b0;font:900 12px system-ui;letter-spacing:2px;text-shadow:0 2px 2px rgba(50,25,8,.6);margin-top:-91px;margin-bottom:66px;text-align:center;}
    #resultScreen.doldolResultV2 .resultTitle{position:relative;z-index:3;margin:0;color:#fff4cf!important;font-size:36px!important;font-weight:1000!important;letter-spacing:.5px;text-shadow:0 3px 0 #6a3919,0 5px 12px rgba(72,37,12,.45);}
    #resultScreen.doldolResultV2 .resultSub{position:relative;z-index:3;color:#6b4728;font-weight:900;margin-top:4px;}
    #resultScreen.doldolResultV2 .resultStars{position:relative;z-index:4;margin:12px 0 14px;font-size:34px;letter-spacing:2px;color:#ffc62e;text-shadow:0 2px 0 #a96a08,0 4px 10px rgba(210,140,0,.25);animation:doldolStars .6s .12s both;}
    #resultScreen.doldolResultV2 .resultReward{display:flex;gap:10px;margin:0 auto 15px;max-width:340px;}
    #resultScreen.doldolResultV2 .reward{flex:1;min-width:0;padding:11px 8px;border-radius:16px;background:rgba(255,255,255,.76);border:2px solid rgba(123,82,42,.16);box-shadow:0 4px 0 rgba(101,65,31,.08);}
    #resultScreen.doldolResultV2 .reward span{display:block;color:#856548;font-size:11px;font-weight:900;margin-bottom:3px;}
    #resultScreen.doldolResultV2 .reward b{display:block;color:#49301b;font-size:20px;font-weight:1000;}
    #resultScreen.doldolResultV2 .resultActions{gap:9px;}
    #resultScreen.doldolResultV2 .resultBtn{border-radius:17px!important;font-weight:1000!important;box-shadow:0 5px 0 rgba(56,88,30,.22)!important;min-height:52px;}
    #resultScreen.doldolResultV2 .resultBtn.primary{background:linear-gradient(180deg,#9ee34f,#55ad2e)!important;border:2px solid #3e8421!important;color:#17320c!important;text-shadow:0 1px rgba(255,255,255,.35);}
    #resultScreen.doldolResultV2 .dConfetti{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5;}
    #resultScreen.doldolResultV2 .dConfetti i{position:absolute;top:-20px;width:7px;height:14px;border-radius:3px;background:#f7c84b;animation:doldolConfetti 1.8s linear infinite;opacity:.9;}
    #resultScreen.doldolResultV2 .dConfetti i:nth-child(2n){background:#73b8ff;width:6px;height:10px;animation-delay:-.4s}
    #resultScreen.doldolResultV2 .dConfetti i:nth-child(3n){background:#ff7f8a;animation-delay:-.9s}
    #resultScreen.doldolResultV2 .dConfetti i:nth-child(4n){background:#8edb73;animation-delay:-1.3s}
    @keyframes doldolCelebrate{0%{opacity:0;transform:translateY(25px) scale(.78) rotate(-6deg)}100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}}
    @keyframes doldolStars{0%{opacity:0;transform:scale(.65)}70%{transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
    @keyframes doldolConfetti{0%{transform:translate3d(0,0,0) rotate(0)}100%{transform:translate3d(0,440px,0) rotate(260deg)}}
    @media(max-height:680px){#resultScreen.doldolResultV2 .dResultCard{transform:scale(.9);transform-origin:center}#resultScreen.doldolResultV2 .dCharacter{width:92px;height:92px}}
  `;
  document.head.appendChild(style);

  function decorate(){
    if(result.querySelector('.dResultCard')) return;
    const card=document.createElement('div');
    card.className='dResultCard';
    card.innerHTML=`
      <div class="dConfetti">${Array.from({length:18},(_,i)=>`<i style="left:${4+(i*5.3)%92}%;animation-delay:${-(i%6)*.22}s"></i>`).join('')}</div>
      <div class="dWood"></div>
      <img class="dCharacter" src="${characterSrc}" alt="돌돌 특공대원">
      <div class="dKicker">MISSION COMPLETE</div>
    `;
    while(result.firstChild) card.appendChild(result.firstChild);
    result.appendChild(card);
  }

  const originalShow=window.__duckShowResult;
  window.__duckShowResult=function(clear){
    decorate();
    result.classList.add('doldolResultV2');
    if(typeof originalShow==='function') originalShow(clear);
    const title=document.getElementById('resultTitle');
    if(title) title.textContent=clear?'STAGE CLEAR!':'GAME OVER';
    const sub=document.getElementById('resultSub');
    if(sub) sub.textContent=clear?'작전 성공! 다음 출격을 준비하세요.':'전투에서 쓰러졌습니다.';
    const next=document.getElementById('resultNext');
    if(next) next.textContent=clear?'다음 스테이지  ▶':'다시 도전';
  };
})();

/* =========================================================
   DOLDOL RESULT SCREEN V3 — POLISH PASS
   - UI/animation only. Does not change combat, drops, gate or progression logic.
   ========================================================= */
(function(){
  const result=document.getElementById('resultScreen');
  if(!result) return;

  const style=document.createElement('style');
  style.textContent=`
    #resultScreen.doldolResultV3{background:rgba(7,13,18,.72)!important;backdrop-filter:blur(7px)!important;}
    #resultScreen.doldolResultV3 .dResultCard{
      width:calc(100% - 24px)!important;
      max-width:390px!important;
      box-sizing:border-box!important;
      margin:0 auto!important;
      padding:18px 16px 16px!important;
      border-radius:32px!important;
      background:linear-gradient(180deg,#fffdf7 0%,#f7edda 52%,#ead4a4 100%)!important;
      border:3px solid #8a5a31!important;
      box-shadow:0 24px 65px rgba(0,0,0,.48),inset 0 1px 0 #fff!important;
      animation:doldolResultIn .42s cubic-bezier(.2,.85,.25,1) both;
    }
    #resultScreen.doldolResultV3 .dWood{
      top:17px!important;left:7%!important;right:7%!important;height:76px!important;
      border-radius:18px!important;transform:rotate(-.6deg)!important;
      background:linear-gradient(180deg,#b4773d,#76451f)!important;
      box-shadow:inset 0 3px 0 rgba(255,229,178,.5),inset 0 -5px 0 rgba(64,34,14,.3),0 6px 0 rgba(73,42,20,.2)!important;
    }
    #resultScreen.doldolResultV3 .dKicker{
      margin-top:-91px!important;margin-bottom:66px!important;
      font-size:13px!important;letter-spacing:3px!important;
    }
    #resultScreen.doldolResultV3 .dCharacter{
      width:116px!important;height:116px!important;
      margin-bottom:-3px!important;
      animation:doldolHeroPop .62s cubic-bezier(.18,.9,.25,1.2) both!important;
    }
    #resultScreen.doldolResultV3 .resultTitle{
      font-size:38px!important;line-height:1!important;letter-spacing:.3px!important;
      margin-top:2px!important;
      text-shadow:0 3px 0 #6a3919,0 6px 14px rgba(72,37,12,.34)!important;
    }
    #resultScreen.doldolResultV3 .resultSub{
      font-size:15px!important;margin-top:8px!important;color:#735033!important;
    }
    #resultScreen.doldolResultV3 .dStageBadge{
      display:inline-flex;align-items:center;justify-content:center;
      margin:9px auto 2px;padding:6px 14px;border-radius:999px;
      background:#fff7df;border:2px solid #e1c789;color:#79512d;
      font:900 11px system-ui;letter-spacing:1.4px;box-shadow:0 3px 0 rgba(101,65,31,.08);
    }
    #resultScreen.doldolResultV3 .resultStars{
      margin:9px 0 15px!important;font-size:39px!important;line-height:1!important;
      letter-spacing:3px!important;filter:drop-shadow(0 4px 4px rgba(190,122,0,.18));
    }
    #resultScreen.doldolResultV3 .dRewardLabel{
      text-align:left;max-width:342px;margin:0 auto 7px;padding-left:3px;
      color:#8b6948;font:900 11px system-ui;letter-spacing:1px;
    }
    #resultScreen.doldolResultV3 .resultReward{
      display:flex!important;gap:9px!important;width:100%!important;max-width:none!important;box-sizing:border-box!important;margin:0 auto 13px!important;
    }
    #resultScreen.doldolResultV3 .reward{
      min-height:66px!important;padding:9px 8px!important;box-sizing:border-box!important;border-radius:17px!important;
      background:rgba(255,255,255,.84)!important;border:2px solid #eadfc9!important;
      box-shadow:0 5px 0 rgba(101,65,31,.08)!important;
    }
    #resultScreen.doldolResultV3 .reward span{font-size:11px!important;color:#907154!important;}
    #resultScreen.doldolResultV3 .reward b{font-size:22px!important;color:#49301b!important;}
    #resultScreen.doldolResultV3 #resultDetail{
      max-width:none!important;width:100%!important;box-sizing:border-box!important;margin:0 auto 12px!important;padding:8px 10px!important;
      border:1px solid rgba(123,82,42,.12)!important;border-radius:12px!important;
      background:rgba(255,255,255,.42)!important;color:#806247!important;
      font-size:10px!important;
    }
    #resultScreen.doldolResultV3 .resultActions{display:flex!important;flex-direction:column!important;gap:10px!important;width:100%!important;max-width:none!important;box-sizing:border-box!important;margin:0 auto!important;}
    #resultScreen.doldolResultV3 .resultBtn{min-height:55px!important;border-radius:18px!important;font-size:16px!important;}
    #resultScreen.doldolResultV3 .resultBtn.primary{
      border:2px solid #428b22!important;
      background:linear-gradient(180deg,#a6ed57 0%,#62bf31 100%)!important;
      box-shadow:0 6px 0 #39851f,0 9px 16px rgba(60,125,28,.18)!important;
    }
    #resultScreen.doldolResultV3 .resultBtn.primary:active{transform:translateY(4px)!important;box-shadow:0 2px 0 #39851f!important;}
    #resultScreen.doldolResultV3 .dConfetti i{animation-duration:2.15s!important;}
    /* FINAL MOBILE CENTER FIX — constrain every result child to the card content box */
    #resultScreen.doldolResultV3 .dResultCard{overflow:hidden!important;}
    #resultScreen.doldolResultV3 .resultTitle,
    #resultScreen.doldolResultV3 .resultSub,
    #resultScreen.doldolResultV3 .resultStars,
    #resultScreen.doldolResultV3 .dStageBadge,
    #resultScreen.doldolResultV3 .dRewardLabel,
    #resultScreen.doldolResultV3 #resultDetail,
    #resultScreen.doldolResultV3 .resultReward,
    #resultScreen.doldolResultV3 .resultActions{
      position:relative!important;
      left:auto!important;
      right:auto!important;
      transform:none!important;
      margin-left:auto!important;
      margin-right:auto!important;
      box-sizing:border-box!important;
    }
    #resultScreen.doldolResultV3 .resultTitle{
      display:block!important;
      width:100%!important;
      max-width:100%!important;
      padding:0!important;
      text-align:center!important;
      white-space:nowrap!important;
      font-size:clamp(29px,8.8vw,38px)!important;
    }
    #resultScreen.doldolResultV3 .resultSub{
      display:block!important;width:100%!important;max-width:100%!important;
      text-align:center!important;padding:0!important;
    }
    #resultScreen.doldolResultV3 .resultStars{
      display:block!important;width:100%!important;max-width:100%!important;text-align:center!important;
    }
    #resultScreen.doldolResultV3 .dStageBadge{width:max-content!important;max-width:100%!important;}
    #resultScreen.doldolResultV3 .dRewardLabel{width:100%!important;max-width:100%!important;}
    #resultScreen.doldolResultV3 .resultReward{
      display:flex!important;
      width:100%!important;
      max-width:100%!important;
      padding:0!important;
      gap:8px!important;
      overflow:hidden!important;
    }
    #resultScreen.doldolResultV3 .resultReward .reward{
      flex:0 0 calc((100% - 8px)/2)!important;
      width:calc((100% - 8px)/2)!important;
      max-width:calc((100% - 8px)/2)!important;
      min-width:0!important;
      margin:0!important;
      box-sizing:border-box!important;
      text-align:center!important;
    }
    #resultScreen.doldolResultV3 .resultActions{
      width:100%!important;
      max-width:100%!important;
      padding:0!important;
      overflow:hidden!important;
    }
    #resultScreen.doldolResultV3 .resultActions .resultBtn{
      display:block!important;
      width:100%!important;
      max-width:100%!important;
      margin-left:auto!important;
      margin-right:auto!important;
      box-sizing:border-box!important;
    }
    @keyframes doldolResultIn{from{opacity:0;transform:translateY(24px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes doldolHeroPop{0%{opacity:0;transform:translateY(20px) scale(.72) rotate(-4deg)}70%{opacity:1;transform:translateY(-4px) scale(1.05) rotate(1deg)}100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}}
    @media(max-height:700px){
      #resultScreen.doldolResultV3 .dResultCard{transform:scale(.9);transform-origin:center!important;}
    }
  `;

  /* ROOT LAYOUT FIX: explicit grid prevents inherited flex/min-width rules from pushing the second reward card outside. */
  style.textContent += `
    #resultScreen.doldolResultV3 .dResultCard{
      width:390px!important;max-width:calc(100vw - 32px)!important;
      box-sizing:border-box!important;overflow:hidden!important;
      margin-left:auto!important;margin-right:auto!important;
    }
    #resultScreen.doldolResultV3 .resultReward{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
      gap:8px!important;width:100%!important;max-width:none!important;
      margin:0 0 13px!important;padding:0!important;
      box-sizing:border-box!important;overflow:hidden!important;
    }
    #resultScreen.doldolResultV3 .resultReward .reward{
      display:block!important;width:auto!important;min-width:0!important;max-width:none!important;
      flex:none!important;margin:0!important;padding:9px 6px!important;
      box-sizing:border-box!important;overflow:hidden!important;
    }
    #resultScreen.doldolResultV3 .resultReward .reward b{
      white-space:nowrap!important;overflow:hidden!important;text-overflow:clip!important;
      text-align:center!important;
    }
  `;
  /* GAME17 — reward cards final inset fix only */
  style.textContent += `
    #resultScreen.doldolResultV3 .resultReward{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      width:calc(100% - 12px)!important;
      max-width:none!important;
      margin:0 auto 13px!important;
      padding:0!important;
      gap:8px!important;
      box-sizing:border-box!important;
      overflow:visible!important;
    }
    #resultScreen.doldolResultV3 .resultReward > .reward{
      width:100%!important;
      max-width:none!important;
      min-width:0!important;
      margin:0!important;
      box-sizing:border-box!important;
      overflow:hidden!important;
    }
    #resultScreen.doldolResultV3 .resultReward > .reward b,
    #resultScreen.doldolResultV3 .resultReward > .reward span{
      display:block!important;
      width:100%!important;
      max-width:100%!important;
      box-sizing:border-box!important;
      text-align:center!important;
    }
  `;

  document.head.appendChild(style);

  const original=window.__duckShowResult;
  window.__duckShowResult=function(clear){
    if(typeof original==='function') original(clear);
    result.classList.add('doldolResultV3');

    const card=result.querySelector('.dResultCard');
    if(!card) return;

    let badge=card.querySelector('.dStageBadge');
    if(!badge){
      badge=document.createElement('div');
      badge.className='dStageBadge';
      const sub=document.getElementById('resultSub');
      if(sub && sub.parentNode) sub.parentNode.insertBefore(badge,sub.nextSibling);
    }
    const stageNo=Math.max(1,Number(window.__duckStage||1)||1);
    badge.textContent=clear?('STAGE '+stageNo):'MISSION FAILED';

    let label=card.querySelector('.dRewardLabel');
    if(!label){
      label=document.createElement('div');
      label.className='dRewardLabel';
      const rewards=card.querySelector('.resultReward');
      if(rewards) rewards.parentNode.insertBefore(label,rewards);
    }
    label.textContent=clear?'작전 보상':'전투 결과';
  };
})();

/* =========================================================
   FINAL STAGE FLOW LOCK
   - Keep the rich game18 combat/drop/gate/result system untouched.
   - Remove every previous result-next click listener by replacing the button.
   - CLEAR on STAGE N advances exactly once to STAGE N+1.
   ========================================================= */
(function(){
  const oldBtn=document.getElementById('resultNext');
  if(!oldBtn) return;

  const btn=oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn,oldBtn);

  let advancing=false;
  btn.addEventListener('click',function(e){
    e.preventDefault();
    e.stopPropagation();
    if(advancing) return;
    advancing=true;

    const result=document.getElementById('resultScreen');
    const title=document.getElementById('resultTitle');
    const clear=!!title && title.textContent.indexOf('CLEAR')!==-1;
    const current=Math.max(1,Math.min(500,Number(window.__duckStage)||1));
    const target=clear ? Math.min(500,current+1) : current;

    window.__duckPendingNextStage=0;
    if(result) result.classList.remove('show');

    if(window.__duckStartStage){
      window.__duckStartStage(target);
    }

    setTimeout(function(){ advancing=false; },500);
  });
})();

/* FARM INVENTORY: integrated into the armory menu. No separate lobby menu. */
(function(){
'use strict';
function css(){
  if(document.getElementById('doldolArmoryMaterialStyle')) return;
  const st=document.createElement('style');st.id='doldolArmoryMaterialStyle';st.textContent=`
    .v42ArmoryTabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0 14px}
    .v42ArmoryTab{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 8px;background:rgba(255,255,255,.06);color:#cddbd7;font-weight:900;font-size:12px}
    .v42ArmoryTab.active{background:rgba(255,216,102,.14);border-color:rgba(255,216,102,.5);color:#fff}
    .v42ArmoryTab em{font-style:normal;color:#ffd866;margin-left:3px}
    .v42MaterialSummary{display:flex;align-items:center;justify-content:space-between;margin:4px 2px 10px;color:#fff}
    .v42MaterialSummary strong{font-size:14px}.v42MaterialSummary span{font-size:11px;color:#ffd866;font-weight:900}
    .v42MaterialGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;max-height:52vh;overflow:auto;padding-right:2px}
    .v42MaterialCard{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:7px;min-height:48px;padding:7px 9px;border-radius:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
    .v42MaterialCard span{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;background:rgba(0,0,0,.14);font-size:19px}
    .v42MaterialCard b{font-size:10px;color:#dbe7e3;line-height:1.2}.v42MaterialCard em{font-style:normal;font-size:16px;color:#ffd866;font-weight:1000}
  `;document.head.appendChild(st);
}
function refresh(){css();}
window.__duckOpenFarmInventory=function(){
  const gear=document.getElementById('lobbyGear');
  if(gear) gear.click();
  setTimeout(function(){
    const tab=document.querySelector('[data-armory-tab="materials"]');
    if(tab) tab.click();
  },0);
};
window.__duckRefreshFarmInventory=refresh;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',css);else css();
})();


/* ================================================================
   ARMORY WEAPON UPGRADE V1 - lightweight release scope
   - Upgrade only the currently equipped stone
   - Uses existing farm materials (wood + stone)
   - Max Lv.5, +8% damage per level
   - No new screens / no crafting / no economy expansion
   ================================================================ */
(function(){
  'use strict';
  const KEY='doldol_weapon_upgrade_v1';
  const MAX=5;
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'{}')||{};
      return Object.assign({},raw);
    }catch(e){return {};}
  }
  let levels=load();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(levels));}catch(e){}}
  function stoneId(){
    try{return window.__duckGetEquippedStone?window.__duckGetEquippedStone():(window.__duckPreparedStone||'basic');}catch(e){return 'basic';}
  }
  function level(id){return Math.max(1,Math.min(MAX,Number(levels[id]||1)||1));}
  function cost(lv){return {wood:2+lv*2,stone:1+lv};}
  function mult(id){return 1+(level(id)-1)*.08;}
  window.__duckWeaponUpgradeLevel=id=>level(id||stoneId());
  window.__duckWeaponUpgradeMul=()=>mult(stoneId());
  window.__duckWeaponUpgradeCost=id=>cost(level(id||stoneId()));
  window.__duckUpgradeWeapon=function(){
    const id=stoneId();
    const lv=level(id);
    if(lv>=MAX) return {ok:false,reason:'max'};
    const c=cost(lv);
    const farm=window.__doldolFarmV2;
    if(!farm) return {ok:false,reason:'farm'};
    if(farm.get('wood')<c.wood || farm.get('stone')<c.stone) return {ok:false,reason:'material',cost:c,have:{wood:farm.get('wood'),stone:farm.get('stone')}};
    // Consume via the existing inventory API without introducing another save system.
    farm.spend('wood',c.wood);
    farm.spend('stone',c.stone);
    levels[id]=lv+1; save();
    return {ok:true,id,level:lv+1,cost:c};
  };

  function inject(){
    const body=document.getElementById('menuBody');
    const panel=document.getElementById('v42ArmoryWeapons');
    if(!body||!panel) return;
    if(panel.querySelector('#doldolWeaponUpgradeCard')) return;
    const id=stoneId();
    const defs={basic:{icon:'🪨',art:'assets/%20%20%20%20stone_basic.png',name:'기본돌'},fire:{icon:'🔥',art:'assets/%20%20%20%20stone_fire.png',name:'불돌'},ice:{icon:'❄️',art:'assets/%20%20%20%20stone_ice.png',name:'얼음돌'},bomb:{icon:'💥',art:'assets/%20%20%20%20stone_bomb.png',name:'폭발돌'},lightning:{icon:'⚡',art:'assets/%20%20%20%20stone_lightning.png',name:'번개돌'},skill:{icon:'✨',art:'assets/%20%20%20%20stone_skill.png',name:'스킬돌'}};
    const d=defs[id]||defs.basic, lv=level(id), c=cost(lv), farm=window.__doldolFarmV2;
    const wood=farm?farm.get('wood'):0, stone=farm?farm.get('stone'):0;
    const can=lv<MAX&&wood>=c.wood&&stone>=c.stone;
    const card=document.createElement('div');
    card.id='doldolWeaponUpgradeCard';
    card.style.cssText='margin-top:12px;padding:13px;border-radius:17px;background:rgba(255,255,255,.055);border:1px solid rgba(255,216,102,.16)';
    card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><div style="font-size:9px;opacity:.55;letter-spacing:.7px">WEAPON UPGRADE</div><b style="font-size:14px">'+d.icon+' '+d.name+'</b></div><strong style="color:#ffd866">Lv.'+lv+'/'+MAX+'</strong></div>'+
      '<div style="font-size:10px;opacity:.65;margin:7px 0 9px">공격력 +'+((lv-1)*8)+'%'+(lv<MAX?' → 다음 +8%':' · MAX')+'</div>'+
      '<button id="doldolWeaponUpgradeBtn" type="button" '+(can?'':'disabled')+' style="width:100%;padding:11px;border:0;border-radius:12px;background:'+(can?'#ffd866':'rgba(255,255,255,.08)')+';color:'+(can?'#30220b':'#7f8992')+';font-weight:1000;font-size:12px">'+(lv>=MAX?'✓ MAX':'강화 · 🪵 '+c.wood+'  🪨 '+c.stone)+'</button>';
    const note=panel.querySelector('.v42EquipNote');
    if(note) note.insertAdjacentElement('beforebegin',card); else panel.appendChild(card);
    const btn=card.querySelector('#doldolWeaponUpgradeBtn');
    if(btn) btn.onclick=function(e){
      e.preventDefault(); e.stopPropagation();
      const r=window.__duckUpgradeWeapon();
      if(r.ok){
        try{window.__duckMessage&&window.__duckMessage('돌 강화 완료! Lv.'+r.level);}catch(_){ }
        const gear=document.getElementById('lobbyGear');
        if(gear){ /* keep current menu open; re-render by reopening */ }
        const active=document.querySelector('.v42ArmoryTab.active');
        const evt=new Event('click');
        // Re-render the menu through its existing button without changing navigation.
        const done=document.getElementById('v42EquipDone');
        if(done){ /* no-op: keep the menu stable */ }
        inject();
        card.remove();
        setTimeout(inject,0);
      }else if(r.reason==='material'){
        btn.textContent='재료가 부족합니다';
        setTimeout(inject,500);
      }
    };
  }
  function watch(){
    const body=document.getElementById('menuBody');
    if(!body) return;
    inject();
    if(!window.__doldolArmoryUpgradeObserver){
      const obs=new MutationObserver(()=>inject());
      obs.observe(body,{childList:true,subtree:true});
      window.__doldolArmoryUpgradeObserver=obs;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
  window.__duckRefreshArmoryUpgrade=watch;
})();


/* SHOP V1 - full screen supply shop */
(function(){
  const SHOP_ITEMS={
    medkit:{icon:'✚',name:'응급키트',desc:'체력 35% 즉시 회복',qty:5,price:450},
    grenade:{icon:'💥',name:'수류탄',desc:'화면 내 적 전체 피해',qty:5,price:550},
    shield:{icon:'🛡',name:'방탄막',desc:'4초간 모든 피해 무효',qty:5,price:550}
  };
  let tab='recommend';
  function core(){return Number((window.__duckWallet&&window.__duckWallet.coins)||0)}
  function gems(){try{return Number(localStorage.getItem('doldol_gems_v1')||0)}catch(e){return 0}}
  function inv(){return (window.__duckBattleItems&&window.__duckBattleItems.get)?window.__duckBattleItems.get():{medkit:0,grenade:0,shield:0}}
  function ensure(){
    let page=document.getElementById('doldolShopPage'); if(page)return page;
    page=document.createElement('section'); page.id='doldolShopPage'; page.className='doldolShopPage';
    page.innerHTML=`<div class="shopTop"><button id="shopBack" aria-label="뒤로">‹</button><div class="shopTitle">상점<small>특공대의 든든한 보급소!</small></div><div class="shopWallet"><span>🔥 <b id="shopCore">0</b></span><span>💎 <b id="shopGems">0</b></span></div></div><div class="shopHero"><div><b>오늘의 보급품</b><span>전투에 필요한 아이템을 미리 준비하세요.</span></div><div class="shopDuck">🐥</div></div><div class="shopTabs"><button data-shop-tab="recommend">★ 추천</button><button data-shop-tab="battle">💣 전투 아이템</button><button data-shop-tab="currency">◉ 재화</button></div><div id="shopContent" class="shopContent"></div><div id="shopToast" class="shopToast"></div>`;
    document.body.appendChild(page);
    const st=document.createElement('style'); st.id='doldolShopStyle'; st.textContent=`
    #doldolShopPage{position:fixed;inset:0;z-index:9500;display:none;overflow:auto;padding:calc(env(safe-area-inset-top) + 14px) 14px calc(env(safe-area-inset-bottom) + 24px);background:linear-gradient(rgba(18,27,24,.18),rgba(18,27,24,.55)),url('../assets/home_base_bg.png') center/cover fixed;font-family:system-ui,-apple-system,sans-serif;color:#49351f}
    #doldolShopPage.show{display:block}.shopTop{max-width:720px;margin:auto;display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:10px;background:#765336;border:3px solid #f8e7aa;border-radius:24px 24px 0 0;padding:12px;color:#fff}.shopTop button{width:44px;height:44px;border:0;border-radius:14px;background:#d0bb8d;color:white;font-size:34px;font-weight:900}.shopTitle{font-size:28px;font-weight:1000;line-height:1}.shopTitle small{display:block;font-size:11px;color:#ead7b8;margin-top:7px}.shopWallet{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.shopWallet span{background:#251f1a;color:#fff;border-radius:18px;padding:7px 9px;font-size:12px;white-space:nowrap}.shopHero{max-width:720px;margin:auto;min-height:128px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#3c4c2c,#7c5b32);color:#fff;border-left:3px solid #f8e7aa;border-right:3px solid #f8e7aa}.shopHero b{display:block;font-size:24px}.shopHero span{display:block;margin-top:7px;color:#f5e4bb;font-size:12px}.shopDuck{font-size:64px;filter:drop-shadow(0 8px 8px rgba(0,0,0,.3))}.shopTabs{max-width:720px;margin:auto;display:grid;grid-template-columns:1fr 1.25fr 1fr;border:3px solid #f8e7aa;border-top:0;background:#63472f}.shopTabs button{border:0;padding:14px 5px;background:#63472f;color:#f4eadb;font-size:14px;font-weight:900}.shopTabs button.active{background:#ffd86c;color:#5c3c20}.shopContent{max-width:720px;margin:auto;background:#f1d99c;border:3px solid #f8e7aa;border-top:0;border-radius:0 0 26px 26px;padding:14px;min-height:380px}.shopSectionTitle{font-size:20px;font-weight:1000;margin:4px 2px 12px}.shopGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.shopCard{background:#fff7df;border:2px solid rgba(118,83,54,.18);border-radius:20px;padding:10px;text-align:center;box-shadow:0 6px 0 rgba(104,75,39,.12)}.shopIcon{height:90px;border-radius:16px;display:grid;place-items:center;font-size:48px;background:radial-gradient(circle,#fff 0,#e8d09b 100%)}.shopCard h3{font-size:16px;margin:9px 0 3px}.shopCard p{font-size:10px;min-height:28px;margin:0;color:#806a50}.shopOwned{font-size:10px;margin:5px 0;color:#5d7250;font-weight:900}.shopBuy{width:100%;border:0;border-radius:14px;background:linear-gradient(#9bec4c,#55bd21);box-shadow:0 4px 0 #398c1b;color:#3e331c;padding:10px 4px;font-size:13px;font-weight:1000}.shopBuy:disabled{filter:grayscale(.8);opacity:.55}.shopCurrency{padding:34px 16px;text-align:center;color:#745d43}.shopCurrency b{display:block;font-size:22px;margin-bottom:8px}.shopToast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 36px);transform:translate(-50%,18px);opacity:0;pointer-events:none;background:rgba(20,24,22,.92);color:white;border-radius:20px;padding:10px 16px;font-size:12px;font-weight:900;transition:.2s}.shopToast.show{opacity:1;transform:translate(-50%,0)}
    @media(max-width:430px){#doldolShopPage{padding-left:8px;padding-right:8px}.shopTop{grid-template-columns:44px 1fr}.shopWallet{grid-column:1/3;justify-content:center}.shopHero{min-height:110px}.shopGrid{gap:7px}.shopCard{padding:7px}.shopIcon{height:76px;font-size:40px}.shopCard h3{font-size:14px}.shopBuy{font-size:12px}.shopTitle{font-size:24px}}
    `; document.head.appendChild(st);
    page.querySelector('#shopBack').onclick=close;
    page.querySelectorAll('[data-shop-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.shopTab;render()});
    return page;
  }
  function toast(msg){const el=document.getElementById('shopToast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1000)}
  function buy(id){const it=SHOP_ITEMS[id];if(!it||!window.__duckWallet||!window.__duckBattleItems)return;if(!window.__duckWallet.spendCoins(it.price)){toast('돌핵이 부족합니다');return}window.__duckBattleItems.add(id,it.qty);if(window.__duckSyncLobby)window.__duckSyncLobby();toast(it.name+' ×'+it.qty+' 구매 완료');render()}
  function render(){const page=ensure(),stock=inv();page.querySelector('#shopCore').textContent=core().toLocaleString();page.querySelector('#shopGems').textContent=gems().toLocaleString();page.querySelectorAll('[data-shop-tab]').forEach(b=>b.classList.toggle('active',b.dataset.shopTab===tab));const box=page.querySelector('#shopContent');if(tab==='currency'){box.innerHTML='<div class="shopCurrency"><b>재화 상품</b><span>결제 연동 단계에서 추가 예정입니다.</span></div>';return}const cards=Object.entries(SHOP_ITEMS).map(([id,it])=>`<article class="shopCard"><div class="shopIcon">${it.icon}</div><h3>${it.name} <small>×${it.qty}</small></h3><p>${it.desc}</p><div class="shopOwned">보유 ${Number(stock[id]||0)}</div><button class="shopBuy" data-shop-buy="${id}" ${core()<it.price?'disabled':''}>🔥 ${it.price.toLocaleString()}</button></article>`).join('');box.innerHTML='<div class="shopSectionTitle">'+(tab==='recommend'?'추천 상품':'전투 아이템')+'</div><div class="shopGrid">'+cards+'</div>';box.querySelectorAll('[data-shop-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.shopBuy))}
  function close(){const page=document.getElementById('doldolShopPage');if(page)page.classList.remove('show');const lobby=document.getElementById('gameLobby');if(lobby)lobby.classList.remove('hidden')}
  window.__duckOpenShop=function(){const page=ensure();const menu=document.getElementById('menuScreen'),map=document.getElementById('mapScreen'),result=document.getElementById('resultScreen');if(menu)menu.classList.remove('show');if(map)map.classList.remove('show');if(result)result.classList.remove('show');const lobby=document.getElementById('gameLobby');if(lobby)lobby.classList.add('hidden');tab='recommend';render();page.classList.add('show')};
})();

/* V6 RESULT FLOW HARD LOCK */
(function(){
 const result=document.getElementById('resultScreen'); if(!result)return;
 window.__duckShowResult=function(clear){
   const snap=window.__duckBattleResultSnapshot||{};
   const current=Math.max(1,Math.min(500,Number(snap.stage||window.__duckStage)||1));
   const title=document.getElementById('resultTitle'),sub=document.getElementById('resultSub'),next=document.getElementById('resultNext');
   if(title)title.textContent=clear?'STAGE CLEAR!':'GAME OVER';
   if(sub)sub.textContent=clear?'STAGE '+current+' 클리어!':'STAGE '+current+'에서 쓰러졌습니다';
   if(next)next.textContent=clear?'다음 스테이지  ▶':'다시 도전';
   window.__duckResultClear=!!clear; window.__duckResultStage=current;

   // Read the battle snapshot captured at the real clear/death point.
   // This result-layer code must not reach into combat-IIFE locals directly.
   const hpNow=Math.max(0,Number(snap.hpNow)||0);
   const hpMax=Math.max(1,Number(snap.hpMax)||1);
   const hpRate=hpNow/hpMax;
   const perfectCount=Math.max(0,Number(snap.perfectCount)||0);
   let stars=clear?1:0;
   if(clear&&hpRate>=.45) stars=2;
   if(clear&&hpRate>=.75&&perfectCount>=1) stars=3;
   const coreReward=clear?(120+current*16+Math.floor(current/10)*20):0;
   const xpReward=clear?(35+current*5+Math.floor(current/10)*5):0;

   const starEl=document.getElementById('resultStars');
   const coreEl=document.getElementById('resultCoins');
   const xpEl=document.getElementById('resultXp');
   if(starEl) starEl.textContent=clear?('★ '.repeat(stars)+'☆ '.repeat(3-stars)).trim():'☆ ☆ ☆';
   if(coreEl) coreEl.textContent=String(coreReward);
   if(xpEl) xpEl.textContent=String(xpReward);

   if(clear){
     try{
       const unlocked=Math.min(500,current+1);
       const saved=Math.max(1,Number(localStorage.getItem('doldol_unlocked_stage_v1')||1)||1);
       localStorage.setItem('doldol_unlocked_stage_v1',String(Math.max(saved,unlocked)));

       // Keep the best star result for each stage.
       const starKey='doldol_stage_stars_v1';
       const starData=JSON.parse(localStorage.getItem(starKey)||'{}')||{};
       starData[current]=Math.max(Number(starData[current])||0,stars);
       localStorage.setItem(starKey,JSON.stringify(starData));

       if(!window.__duckBattleRewardGranted){
         window.__duckBattleRewardGranted=true;
         if(window.__duckWallet&&window.__duckWallet.addCoins) window.__duckWallet.addCoins(coreReward);
         if(window.__duckAddCharacterXP) window.__duckAddCharacterXP(xpReward);
         if(window.__duckBattleItems&&window.__duckBattleItems.grantClearReward){
           const itemRewards=window.__duckBattleItems.grantClearReward(current)||[];
           if(sub&&itemRewards.length){
             const itemText=itemRewards.map(r=>r.icon+' '+r.name+' +'+r.count).join(' · ');
             sub.textContent='STAGE '+current+' 클리어! · '+itemText;
           }
         }
         if(window.__duckSyncLobby) window.__duckSyncLobby();
       }
     }catch(e){ console.warn('stage reward failed',e); }
   }
   result.style.display=''; result.style.pointerEvents='auto'; result.classList.add('show','doldolResultV3');
 };
 const old=document.getElementById('resultNext');
 if(old){
   const btn=old.cloneNode(true); old.parentNode.replaceChild(btn,old);
   let busy=false;
   btn.addEventListener('click',function(e){
     e.preventDefault();e.stopPropagation();if(busy)return;busy=true;
     const current=Math.max(1,Math.min(500,Number(window.__duckResultStage||window.__duckStage)||1));
     const target=window.__duckResultClear?Math.min(500,current+1):current;
     result.classList.remove('show');result.style.pointerEvents='none';window.__duckPendingNextStage=0;
     if(window.__duckStartStage)window.__duckStartStage(target);
     setTimeout(function(){busy=false},450);
   },true);
 }
})();


/* V36 HOME MODULE LOADER
   HOME UI implementation lives only in JS/home.js from this baseline forward. */
(function(){
  if (window.__doldolHomeModuleRequested) return;
  window.__doldolHomeModuleRequested = true;

  var current = document.currentScript && document.currentScript.src;
  var src = current ? new URL('home.js', current).href : 'JS/home.js';
  var script = document.createElement('script');
  script.src = src;
  script.defer = true;
  script.dataset.doldolModule = 'home';
  document.head.appendChild(script);
})();


(function(){
  if(document.getElementById('stoneRealArtStyle')) return;
  const st=document.createElement('style');
  st.id='stoneRealArtStyle';
  st.textContent=`
    .gearV1Slot .stoneEmoji{display:grid!important;place-items:center!important}
    .gearV1Slot .stoneEmoji img{display:block;width:76px!important;height:76px!important;object-fit:contain;filter:drop-shadow(0 5px 6px rgba(0,0,0,.28))}
    .stoneGearArt{display:grid!important;place-items:center!important}
    .stoneGearArt img{display:block;width:72px!important;height:72px!important;object-fit:contain;filter:drop-shadow(0 4px 5px rgba(0,0,0,.25))}
    .stoneGearHero>span img{display:block;width:92px!important;height:92px!important;object-fit:contain;filter:drop-shadow(0 7px 8px rgba(0,0,0,.28))}
    .stoneArtFallback{place-items:center;width:100%;height:100%;font-size:34px}
  `;
  document.head.appendChild(st);
})();



(function(){
  if(document.getElementById('doldolStoneAchSmallFix')) return;
  const st=document.createElement('style');
  st.id='doldolStoneAchSmallFix';
  st.textContent=`
    #gameLobby .profileMini{cursor:pointer;touch-action:manipulation}
    .gearV1Slot .stoneEmoji img{width:58px!important;height:58px!important}
    .stoneGearArt img{width:56px!important;height:56px!important}
    .stoneGearHero>span img{width:76px!important;height:76px!important}
  `;
  document.head.appendChild(st);
})();



(function(){
  const stoneSources=[
    'assets/%20%20%20%20stone_basic.png',
    'assets/%20%20%20%20stone_fire.png',
    'assets/%20%20%20%20stone_ice.png',
    'assets/%20%20%20%20stone_bomb.png',
    'assets/%20%20%20%20stone_lightning.png',
    'assets/%20%20%20%20stone_skill.png'
  ];
  const warm=()=>stoneSources.forEach(src=>{
    const im=new Image();
    im.decoding='async';
    im.src=src;
  });
  if('requestIdleCallback' in window) requestIdleCallback(warm,{timeout:1800});
  else setTimeout(warm,900);
})();
