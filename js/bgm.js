/* 돌돌 특공대 BGM — 로비 / 전투 / 보스, 0.5초 페이드 전환, 설정 연동
   iOS는 audio.volume이 무시되므로 WebAudio GainNode로 볼륨을 조절한다. */
(function(){
  'use strict';
  var DIR='./assets/music/';
  var BASE={lobby:.30,battle:.30,boss:.25};   // 초기 볼륨
  var FADE=.5;                                  // 전환 페이드(초)
  var DUCK_LEVEL=.45, DUCK_MS=380;              // 반격/PERFECT 때 음악 낮춤
  var AC=window.AudioContext||window.webkitAudioContext;
  var ctx=null, tracks={}, cur=null, unlocked=false, parked=false, duck=1, duckTimer=0;

  function canOgg(){
    try{var a=document.createElement('audio');return !!(a.canPlayType&&a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/,''));}catch(e){return false;}
  }
  var OGG=canOgg();
  function $(id){return document.getElementById(id);}
  function userVol(){
    var v=.6;
    try{if(window.__duckSettings)v=window.__duckSettings.get().bgm;}catch(e){}
    if(typeof v!=='number'||isNaN(v))v=.6;
    return Math.max(0,v)/.6;                    // 설정 기본값(60%) = 초기 볼륨 그대로
  }
  function target(name){return Math.min(1,BASE[name]*userVol()*duck);}

  function make(name){
    if(tracks[name])return tracks[name];
    var el=new Audio();
    el.loop=true; el.preload='auto'; el.setAttribute('playsinline','');
    var tried=false;
    function setSrc(ext){el.src=DIR+'bgm_'+name+'_loop.'+ext;}
    el.addEventListener('error',function(){if(!tried&&OGG){tried=true;setSrc('mp3');try{el.load();}catch(e){}}});
    setSrc(OGG?'ogg':'mp3');
    var g=ctx.createGain(); g.gain.value=0;
    try{ctx.createMediaElementSource(el).connect(g);g.connect(ctx.destination);}catch(e){}
    return (tracks[name]={el:el,gain:g,stop:0});
  }
  function ramp(t,to,sec){
    var g=t.gain.gain,n=ctx.currentTime;
    try{g.cancelScheduledValues(n);g.setValueAtTime(g.value,n);g.linearRampToValueAtTime(to,n+Math.max(.01,sec));}catch(e){g.value=to;}
  }
  function play(t){var p;try{p=t.el.play();}catch(e){} if(p&&p.catch)p.catch(function(){});}
  function stopTrack(t){
    ramp(t,0,FADE); clearTimeout(t.stop);
    t.stop=setTimeout(function(){if(tracks[cur]!==t||parked)try{t.el.pause();}catch(e){}},FADE*1000+60);
  }

  function setTrack(name){
    if(!unlocked||name===cur)return;
    var old=cur?tracks[cur]:null;
    cur=name;
    if(old)stopTrack(old);
    if(parked)return;                           // 일시정지 중이면 재개 때 시작
    var t=make(name); clearTimeout(t.stop);
    play(t); ramp(t,target(name),FADE);
  }
  function park(on){
    if(!unlocked||on===parked||!cur)return;
    parked=on; var t=tracks[cur]; if(!t)return;
    if(on){ramp(t,0,.25);clearTimeout(t.stop);t.stop=setTimeout(function(){if(parked)try{t.el.pause();}catch(e){}},300);}
    else{clearTimeout(t.stop);play(t);ramp(t,target(cur),.3);}
  }
  function refresh(sec){if(cur&&tracks[cur]&&!parked)ramp(tracks[cur],target(cur),sec==null?.15:sec);}

  function want(){
    var rs=$('resultScreen');
    if(rs&&rs.classList.contains('show')&&cur)return cur;     // 결과창: 음악 유지
    var bc=$('battleControls');
    if(bc&&bc.classList.contains('show')){
      var i=window.__duckBattleInfo&&window.__duckBattleInfo();
      return i&&i.boss?'boss':'battle';
    }
    return 'lobby';
  }
  function sync(){
    if(!unlocked)return;
    if(ctx&&ctx.state!=='running'&&!document.hidden){try{ctx.resume();}catch(e){}}
    var w=want(),i=(w!=='lobby'&&window.__duckBattleInfo)?window.__duckBattleInfo():null;
    setTrack(w);
    park(!!document.hidden||!!(i&&i.paused));
    if(!parked&&cur&&tracks[cur]&&tracks[cur].el.paused)play(tracks[cur]);   // 시스템이 멈췄다면 재시작
    refresh();
  }

  function unlock(){
    if(!AC)return;
    if(!ctx){try{ctx=new AC();}catch(e){return;}}
    if(ctx.state!=='running'){try{ctx.resume();}catch(e){}}
    if(!unlocked){unlocked=true;sync();}
  }
  ['pointerdown','touchstart','touchend','click','keydown'].forEach(function(ev){
    document.addEventListener(ev,function h(){
      unlock();
      if(ctx&&ctx.state==='running'){['pointerdown','touchstart','touchend','click','keydown'].forEach(function(e2){document.removeEventListener(e2,h,true);});}
    },true);
  });
  document.addEventListener('visibilitychange',function(){if(unlocked)setTimeout(sync,document.hidden?0:80);});
  setInterval(sync,250);

  // 설정 슬라이더 변경 즉시 반영
  try{
    if(window.__duckSettings&&window.__duckSettings.set){
      var orig=window.__duckSettings.set;
      window.__duckSettings.set=function(k,v){orig.apply(this,arguments);if(k==='bgm')refresh(.1);};
    }
  }catch(e){}

  window.__doldolBgm={
    duck:function(){
      if(!unlocked)return;
      duck=DUCK_LEVEL; refresh(.04);
      clearTimeout(duckTimer);
      duckTimer=setTimeout(function(){duck=1;refresh(.3);},DUCK_MS);
    },
    set:setTrack,
    state:function(){return {cur:cur,parked:parked,unlocked:unlocked,ctx:ctx&&ctx.state,ogg:OGG};}
  };
})();
