/* 돌돌 특공대 효과음 10종 — 날아오는 돌 / 패링 / PERFECT / 반사 / 적 명중 / 처치 / 내가 맞음 / 방어 / 돌핵 / 다이아
   설정의 '효과음' 슬라이더(기본 80%)와 연동. */
(function(){
  'use strict';
  var DIR='./assets/sfx/';
  var AC=window.AudioContext||window.webkitAudioContext;
  var BASE={parry:.8,perfect:1,reflect:.5,hit:.45,defeat:.6,player_hit:.85,block:.6,core:.45,diamond:.8};
  var ctx=null,buf={},loading=false,last={};
  var MIN_GAP={parry:60,perfect:60,reflect:60,hit:70,defeat:90,player_hit:90,block:90,core:70,diamond:300};
  function ext(){try{var a=document.createElement('audio');return a.canPlayType&&a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/,'')?'ogg':'mp3';}catch(e){return 'mp3';}}
  var EXT=ext();
  function vol(){
    var v=.8;try{if(window.__duckSettings)v=window.__duckSettings.get().sfx;}catch(e){}
    if(typeof v!=='number'||isNaN(v))v=.8;
    return Math.max(0,v)/.8;
  }
  function load(){
    if(loading||!ctx)return;loading=true;
    Object.keys(BASE).forEach(function(n){
      function get(e,retry){
        fetch(DIR+'sfx_'+n+'.'+e).then(function(r){if(!r.ok)throw 0;return r.arrayBuffer();})
          .then(function(a){return new Promise(function(ok,no){ctx.decodeAudioData(a,ok,no);});})
          .then(function(b){buf[n]=b;})
          .catch(function(){if(retry&&e==='ogg')get('mp3',false);});
      }
      get(EXT,true);
    });
  }
  function unlock(){
    if(!AC)return;
    if(!ctx){try{ctx=new AC();}catch(e){return;}}
    if(ctx.state!=='running'){try{ctx.resume();}catch(e){}}
    load();
  }
  ['pointerdown','touchstart','touchend','click','keydown'].forEach(function(ev){
    document.addEventListener(ev,function h(){
      unlock();
      if(ctx&&ctx.state==='running'){['pointerdown','touchstart','touchend','click','keydown'].forEach(function(e2){document.removeEventListener(e2,h,true);});}
    },true);
  });
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&ctx&&ctx.state!=='running'){try{ctx.resume();}catch(e){}}});

  function play(n,rate){
    try{
      if(!ctx||ctx.state!=='running'||!buf[n])return;
      var v=vol();if(v<=0)return;
      var now=performance.now();
      if(last[n]&&now-last[n]<(MIN_GAP[n]||0))return;last[n]=now;
      var s=ctx.createBufferSource(),g=ctx.createGain();
      s.buffer=buf[n];
      if(rate)s.playbackRate.value=rate;
      g.gain.value=Math.min(1,BASE[n]*v);
      s.connect(g);g.connect(ctx.destination);s.start(0);
    }catch(e){}
  }
  window.__doldolSfx={
    play:play,
    // 같은 소리가 반복돼도 단조롭지 않게 살짝 음높이를 흔든다
    hit:function(){play('hit',.94+Math.random()*.14);}
  };
})();
