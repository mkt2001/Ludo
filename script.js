/* Ludo Champ - classic four-player movement engine */
(() => {
  "use strict";
  const players = ["red", "green", "yellow", "blue"];
  const colors = {red:"#dc3d43", green:"#2c9a5b", yellow:"#e4b82c", blue:"#3274d9"};
  const pale = {red:"#ffeded", green:"#e8f8ed", yellow:"#fff7d8", blue:"#eaf2ff"};
  const starts = {red:0, green:13, yellow:26, blue:39};
  const safeCells = new Set([0,8,13,21,26,34,39,47]);
  const homeLane = {
    red:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    green:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    yellow:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
    blue:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
  };
  // 52 outer-loop cells, row/column on a 15x15 classic board.
  const track = [];
  for(let c=1;c<=5;c++) track.push([6,c]);
  for(let r=5;r>=0;r--) track.push([r,6]);
  track.push([0,7],[0,8]);
  for(let r=1;r<=5;r++) track.push([r,8]);
  for(let c=9;c<=14;c++) track.push([6,c]);
  track.push([7,14],[8,14]);
  for(let c=13;c>=9;c--) track.push([8,c]);
  for(let r=9;r<=14;r++) track.push([r,8]);
  track.push([14,7],[14,6]);
  for(let r=13;r>=9;r--) track.push([r,6]);
  for(let c=5;c>=0;c--) track.push([8,c]);
  track.push([7,0],[6,0]);

  const baseSlots = {
    red:[[2,2],[2,4],[4,2],[4,4]],
    green:[[2,10],[2,12],[4,10],[4,12]],
    yellow:[[10,10],[10,12],[12,10],[12,12]],
    blue:[[10,2],[10,4],[12,2],[12,4]]
  };
  const state = {
    turn: "red", dice: 0, rolled: false, moving: false, winner: null,
    positions: {red:[-1,-1,-1,-1],green:[-1,-1,-1,-1],yellow:[-1,-1,-1,-1],blue:[-1,-1,-1,-1]},
    lastDice: {red:1,green:1,yellow:1,blue:1}
  };
  let audioCtx = null, soundEnabled = true;
  const svg = document.getElementById("ludoBoard");
  const NS = "http://www.w3.org/2000/svg";
  const $ = id => document.getElementById(id);
  const cellSize = 40, offset = 0;

  function sEl(tag, attrs={}, parent=svg) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k, String(v)));
    parent.appendChild(el); return el;
  }
  function xy(row,col){ return [offset+col*cellSize+cellSize/2, offset+row*cellSize+cellSize/2]; }
  function cellRect(row,col,fill,cls="track-cell"){
    sEl("rect",{x:col*cellSize,y:row*cellSize,width:cellSize,height:cellSize,fill,class:cls});
  }
  function initAudio(){
    try {
      if(!audioCtx){ const AC=window.AudioContext||window.webkitAudioContext; if(AC) audioCtx=new AC(); }
      if(audioCtx && audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
    } catch(_e) {}
  }
  function playSound(type){
    if(!soundEnabled) return; initAudio(); if(!audioCtx) return;
    try{
      const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.connect(g);g.connect(audioCtx.destination);
      const now=audioCtx.currentTime; o.type=type==="roll"?"triangle":"sine";
      o.frequency.setValueAtTime(type==="roll"?420:650,now);
      o.frequency.exponentialRampToValueAtTime(type==="roll"?140:420,now+.16);
      g.gain.setValueAtTime(.12,now);g.gain.exponentialRampToValueAtTime(.001,now+.17);
      o.start(now);o.stop(now+.18);
    }catch(_e){}
  }
  function speak(text){
    if(!soundEnabled || !("speechSynthesis" in window)) return;
    try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="en-IN";u.rate=1;speechSynthesis.speak(u);}catch(_e){}
  }
  function setStatus(text){ $("statusText").textContent=text; $("messageText").textContent=text; }
  function drawBase(player,x,y){
    sEl("rect",{x:x*cellSize,y:y*cellSize,width:6*cellSize,height:6*cellSize,rx:4,fill:colors[player],class:"base-box"});
    sEl("rect",{x:(x+.7)*cellSize,y:(y+.7)*cellSize,width:4.6*cellSize,height:4.6*cellSize,rx:12,fill:pale[player],class:"base-inner"});
    baseSlots[player].forEach(([r,c],i)=>{
      const [cx,cy]=xy(r,c);
      sEl("circle",{cx,cy,r:13,fill:"#fff",stroke:colors[player],"stroke-width":2});
      sEl("circle",{cx,cy,r:8,fill:colors[player],opacity:.18});
    });
  }
  function drawBoard(){
    svg.innerHTML="";
    sEl("rect",{x:0,y:0,width:600,height:600,fill:"#fff"});
    drawBase("red",0,0);drawBase("green",9,0);drawBase("blue",0,9);drawBase("yellow",9,9);
    track.forEach(([r,c],idx)=>{
      const player=Object.keys(starts).find(p=>starts[p]===idx);
      const fill=player?colors[player]:"#fff";
      cellRect(r,c,fill);
      if(safeCells.has(idx)){
        const [cx,cy]=xy(r,c);
        sEl("text",{x:cx,y:cy+1,class:"safe-mark",fill:player?"#fff":"#6b8e78"},"");
        const star=sEl("text",{x:cx,y:cy+1,"font-size":19,"text-anchor":"middle","dominant-baseline":"central",fill:player?"#fff":"#6b8e78"});star.textContent="★";
      }
    });
    Object.entries(homeLane).forEach(([p,cells])=>cells.forEach(([r,c],i)=>cellRect(r,c, i===5?colors[p]:pale[p],"home-lane")));
    // Center four-color finish
    sEl("path",{d:"M240 240 L360 240 L300 300 Z",fill:colors.green,stroke:"#fff","stroke-width":2});
    sEl("path",{d:"M360 240 L360 360 L300 300 Z",fill:colors.yellow,stroke:"#fff","stroke-width":2});
    sEl("path",{d:"M360 360 L240 360 L300 300 Z",fill:colors.blue,stroke:"#fff","stroke-width":2});
    sEl("path",{d:"M240 360 L240 240 L300 300 Z",fill:colors.red,stroke:"#fff","stroke-width":2});
    sEl("circle",{cx:300,cy:300,r:18,fill:"#fff",stroke:"#d4ded5","stroke-width":2});
    const crown=sEl("text",{x:300,y:306,"font-size":24,"text-anchor":"middle"});crown.textContent="♛";
    renderTokens();
  }
  function getTokenCell(player,index){
    const pos=state.positions[player][index];
    if(pos===-1) return null;
    if(pos>=57) return {base:false,cell:[7,7]};
    if(pos>=52) return {base:false,cell:homeLane[player][pos-52]};
    return {base:false,cell:track[(starts[player]+pos)%52]};
  }
  function renderTokens(){
    svg.querySelectorAll(".token-layer").forEach(n=>n.remove());
    const layer=sEl("g",{class:"token-layer"});
    players.forEach(p=>{
      state.positions[p].forEach((pos,i)=>{
        let cx,cy;
        if(pos===-1){[cx,cy]=xy(...baseSlots[p][i]);}
        else {
          const info=getTokenCell(p,i); [cx,cy]=xy(...info.cell);
        }
        // Nudge same-square tokens so all pieces remain visible and tappable.
        const same=[];
        players.forEach(q=>state.positions[q].forEach((qp,qi)=>{
          if(q===p&&qi===i)return;
          let cell=null;
          if(qp===-1)return;
          const qInfo=getTokenCell(q,qi);cell=qInfo.cell;
          const thisInfo=pos===-1?null:getTokenCell(p,i);
          if(thisInfo&&cell[0]===thisInfo.cell[0]&&cell[1]===thisInfo.cell[1])same.push([q,qi]);
        }));
        const nudge=[[-7,-7],[7,-7],[-7,7],[7,7]][(i+same.length)%4];
        const selectable=state.rolled&&p===state.turn&&isLegalMove(p,i);
        const g=sEl("g",{class:"token-layer-item",role:"button","aria-label":p+" token "+(i+1),tabindex:"0"},layer);
        const circle=sEl("circle",{cx:cx+nudge[0],cy:cy+nudge[1],r:pos===-1?11:13,fill:colors[p],class:"token"+(selectable?" selectable":""),stroke:selectable?"#111":"#fff"},g);
        circle.style.cursor=selectable?"pointer":"default";
        const label=sEl("text",{x:cx+nudge[0],y:cy+nudge[1]+.5,class:"token-label"},g);label.textContent=String(i+1);
        if(selectable){
          g.addEventListener("click",()=>moveToken(p,i));
          g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();moveToken(p,i);}});
        }
      });
    });
  }
  function isLegalMove(player,index){
    const pos=state.positions[player][index], roll=state.dice;
    if(pos===-1) return roll===6;
    if(pos>=57) return false;
    return pos+roll<=57;
  }
  function legalTokens(player){return state.positions[player].map((_,i)=>i).filter(i=>isLegalMove(player,i));}
  function renderControls(){
    players.forEach(p=>{
      $("card-"+p).classList.toggle("active-player",p===state.turn&&!state.winner);
      $("roll-"+p).disabled=state.winner!==null || p!==state.turn || state.rolled || state.moving;
      $("dice-"+p).textContent=["⚀","⚁","⚂","⚃","⚄","⚅"][state.lastDice[p]-1];
      const finished=state.positions[p].filter(v=>v===57).length;
      $(p+"Progress").textContent=finished+" / 4 home";
    });
    $("turnPill").textContent=state.winner?state.winner.toUpperCase()+" WINS":state.turn.toUpperCase()+" TURN";
    $("passBtn").disabled=!state.rolled||state.moving||state.winner!==null;
  }
  function rollDice(player){
    if(player!==state.turn||state.rolled||state.moving||state.winner) return;
    initAudio(); playSound("roll");
    const btn=$("roll-"+player);btn.disabled=true;
    let ticks=0;
    const interval=setInterval(()=>{
      $("dice-"+player).textContent=["⚀","⚁","⚂","⚃","⚄","⚅"][Math.floor(Math.random()*6)];
      ticks++;
      if(ticks>=7){
        clearInterval(interval);
        state.dice=Math.floor(Math.random()*6)+1;
        state.lastDice[player]=state.dice;state.rolled=true;
        $("dice-"+player).textContent=["⚀","⚁","⚂","⚃","⚄","⚅"][state.dice-1];
        const moves=legalTokens(player);
        if(moves.length===0){
          setStatus(`${playerName(player)} rolled ${state.dice}. No legal move — turn passes.`);
          renderControls();renderTokens();speak("No valid move");
          setTimeout(()=>finishTurn(false),1100);
        }else{
          setStatus(`${playerName(player)} rolled ${state.dice}. Tap a highlighted ${playerName(player)} token to move.`);
          renderControls();renderTokens();speak("Rolled "+state.dice+". Choose a token.");
        }
      }
    },65);
  }
  function playerName(p){return p.charAt(0).toUpperCase()+p.slice(1);}
  function moveToken(player,index){
    if(!state.rolled||player!==state.turn||state.moving||!isLegalMove(player,index))return;
    state.moving=true;
    let pos=state.positions[player][index];
    if(pos===-1) state.positions[player][index]=0;
    else state.positions[player][index]=pos+state.dice;
    const newPos=state.positions[player][index];
    // Capture opponents on shared track except protected squares.
    let captured=false;
    if(newPos>=0&&newPos<52){
      const cellIndex=(starts[player]+newPos)%52;
      if(!safeCells.has(cellIndex)){
        players.filter(p=>p!==player).forEach(other=>{
          state.positions[other].forEach((otherPos,otherIndex)=>{
            if(otherPos>=0&&otherPos<52&&(starts[other]+otherPos)%52===cellIndex){
              state.positions[other][otherIndex]=-1;captured=true;
            }
          });
        });
      }
    }
    playSound("move");
    const allHome=state.positions[player].every(v=>v===57);
    if(allHome){
      state.winner=player;state.rolled=false;state.moving=false;
      setStatus(`🏆 ${playerName(player)} wins! All four tokens reached home.`);
      renderControls();renderTokens();speak(playerName(player)+" wins!");return;
    }
    let message=`${playerName(player)} moved token ${index+1}.`;
    if(captured) message+=" Opponent captured!";
    if(newPos===57) message+=" Token reached home!";
    const extra=state.dice===6||captured||newPos===57;
    state.moving=false;
    if(extra){
      state.rolled=false;state.dice=0;
      setStatus(message+" Roll again!");
      renderControls();renderTokens();speak(captured?"Captured! Roll again.":"Roll again.");
    }else{
      setStatus(message);
      renderTokens();renderControls();
      setTimeout(()=>finishTurn(false),650);
    }
  }
  function finishTurn(forcePass=false){
    if(state.winner)return;
    state.rolled=false;state.moving=false;state.dice=0;
    const idx=players.indexOf(state.turn);
    state.turn=players[(idx+1)%players.length];
    setStatus(`${playerName(state.turn)}'s turn — roll the ${state.turn} dice.`);
    renderControls();renderTokens();
  }
  function resetGame(){
    state.turn="red";state.dice=0;state.rolled=false;state.moving=false;state.winner=null;
    players.forEach(p=>{state.positions[p]=[-1,-1,-1,-1];state.lastDice[p]=1;});
    setStatus("Red's turn — roll the red dice.");
    drawBoard();renderControls();
  }
  function setTheme(theme){
    document.body.classList.remove("theme-royal","theme-neon");
    if(theme==="royal")document.body.classList.add("theme-royal");
    if(theme==="neon")document.body.classList.add("theme-neon");
  }
  players.forEach(p=>$("roll-"+p).addEventListener("click",()=>rollDice(p)));
  $("newGameBtn").addEventListener("click",resetGame);
  $("passBtn").addEventListener("click",()=>finishTurn(true));
  $("themeSelect").addEventListener("change",e=>setTheme(e.target.value));
  $("soundToggle").addEventListener("click",()=>{
    soundEnabled=!soundEnabled;$("soundToggle").textContent=soundEnabled?"🔊":"🔇";
    if(!soundEnabled&&"speechSynthesis"in window)speechSynthesis.cancel();
    if(soundEnabled)playSound("move");
  });
  document.addEventListener("pointerdown",initAudio,{once:true});
  drawBoard();renderControls();
})(); 
