import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import '../styles/mini-games.css';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { useCelebration } from '../components/games/Celebration';
import { speakFrench } from '../services/speech';
import { playWrong } from '../services/sound';
import { recordGameRound } from '../services/gameProgress';

type Kind = 'couleurs' | 'formes' | 'puzzle' | 'tailles' | 'cris';
const COLORS = [{name:'rouge',color:'#ed6262'},{name:'bleu',color:'#5598e8'},{name:'jaune',color:'#f4c84b'},{name:'vert',color:'#65bd72'}];
const SHAPES = [{name:'rond',emoji:'🔴'},{name:'carré',emoji:'🟦'},{name:'triangle',emoji:'🔺'},{name:'étoile',emoji:'⭐'}];
const ANIMALS = [
  {name:'chat',emoji:'🐱',sound:'Miaou !'},{name:'chien',emoji:'🐶',sound:'Ouaf ouaf !'},
  {name:'vache',emoji:'🐮',sound:'Meuh !'},{name:'mouton',emoji:'🐑',sound:'Bêêê !'},
  {name:'canard',emoji:'🦆',sound:'Coin coin !'},{name:'cochon',emoji:'🐷',sound:'Groin groin !'},
];
const PUZZLE = ['🐱','🐶','🐰','🐻'];
function shuffle<T>(values:T[]):T[]{ return [...values].sort(()=>Math.random()-.5); }

export function MiniGamePage(){
  const {game='couleurs'}=useParams();
  const kind=(['couleurs','formes','puzzle','tailles','cris'].includes(game)?game:'couleurs') as Kind;
  const [round,setRound]=useState(0);
  const [target,setTarget]=useState(()=>Math.floor(Math.random()*(kind==='cris'?ANIMALS.length:4)));
  const [order,setOrder]=useState<number[]>([]);
  const [done,setDone]=useState(false);
  const {celebrate,celebration}=useCelebration(4);
  const title=({couleurs:'Les couleurs',formes:'Les formes',puzzle:'Puzzle 4 pièces',tailles:'Grand ou petit ?',cris:'Les cris des animaux'} as const)[kind];
  const choices=useMemo(()=>shuffle(kind==='couleurs'?COLORS.map((_,i)=>i):kind==='formes'?SHAPES.map((_,i)=>i):kind==='cris'?ANIMALS.map((_,i)=>i):[0,1,2,3]),[kind,round]);

  const ask=()=>{
    if(kind==='couleurs') speakFrench('Trouve la couleur '+COLORS[target%4]!.name);
    else if(kind==='formes') speakFrench('Trouve la forme '+SHAPES[target%4]!.name);
    else if(kind==='tailles') speakFrench('Montre le plus grand !');
    else if(kind==='cris') speakFrench('Écoute bien : '+ANIMALS[target%ANIMALS.length]!.sound);
    else speakFrench('Remets les quatre pièces du puzzle dans l’ordre !');
  };
  const success=()=>{
    if(done)return;
    setDone(true); celebrate(); void recordGameRound('mini-'+kind).catch(()=>undefined);
    speakFrench('Bravo ! Tu as réussi !');
    window.setTimeout(()=>{
      setRound(v=>v+1); setTarget(v=>(v+1)%(kind==='cris'?ANIMALS.length:4));
      setOrder([]); setDone(false);
    },1500);
  };
  const choose=(index:number)=>{
    if(done)return;
    const correct=kind==='couleurs'?index===target%4:kind==='formes'?index===target%4:kind==='tailles'?index===1:index===target%ANIMALS.length;
    if(correct)success(); else {playWrong();speakFrench('Essaie encore, tu peux le faire !');}
  };
  const addPiece=(piece:number)=>{
    if(done||order.includes(piece))return;
    const next=[...order,piece];
    if(piece!==next.length-1){playWrong();speakFrench('Cherche la pièce suivante.');setOrder([]);return;}
    setOrder(next);
    if(next.length===4)success(); else speakFrench(['Une pièce !','Deux pièces !','Trois pièces !'][next.length-1]!);
  };

  return <AppShell showNavigation={false}>
    <GameHeader title={title}/>
    <button type="button" className="cherche-question" onClick={ask}><Volume2 size={24}/> Réécouter la consigne</button>
    {kind==='couleurs'&&<section className="mini-game-grid" aria-label="Choisir une couleur">
      <p className="cherche-question" style={{gridColumn:'1 / -1'}}>Où est le {COLORS[target%4]!.name} ?</p>
      {choices.map(i=><button key={i} type="button" aria-label={COLORS[i]!.name} onClick={()=>choose(i)} style={{minHeight:150,border:'5px solid white',borderRadius:28,background:COLORS[i]!.color,boxShadow:'0 6px 18px #0002'}}/>)}
    </section>}
    {kind==='formes'&&<section className="mini-game-grid" aria-label="Choisir une forme">
      <p className="cherche-question" style={{gridColumn:'1 / -1'}}>Trouve : {SHAPES[target%4]!.name}</p>
      {choices.map(i=><button key={i} type="button" className="mini-game-choice" onClick={()=>choose(i)} aria-label={SHAPES[i]!.name}><EmojiPicture emoji={SHAPES[i]!.emoji}/></button>)}
    </section>}
    {kind==='tailles'&&<section className="mini-game-grid" aria-label="Comparer les tailles">
      <p className="cherche-question" style={{gridColumn:'1 / -1'}}>Montre le plus grand !</p>
      <button type="button" className="mini-game-choice" onClick={()=>choose(0)} aria-label="Petit"><span style={{fontSize:58}}>🐘</span><small>Petit</small></button>
      <button type="button" className="mini-game-choice" onClick={()=>choose(1)} aria-label="Grand"><span style={{fontSize:120}}>🐘</span><small>Grand</small></button>
    </section>}
    {kind==='cris'&&<section className="mini-game-grid" aria-label="Animaux et leurs cris">
      <p className="cherche-question" style={{gridColumn:'1 / -1'}}>Quel animal fait ce bruit ?</p>
      <button type="button" className="cherche-question" style={{gridColumn:'1 / -1'}} onClick={ask}>🔊 Écouter le cri</button>
      {choices.map(i=><button key={i} type="button" className="mini-game-choice" onClick={()=>choose(i)}><EmojiPicture emoji={ANIMALS[i]!.emoji}/><small>{ANIMALS[i]!.name}</small></button>)}
    </section>}
    {kind==='puzzle'&&<section aria-label="Puzzle de quatre pièces">
      <p className="cherche-question">Assemble les 4 pièces dans l’ordre</p>
      <div className="mini-puzzle">{PUZZLE.map((piece,i)=><div key={i} className={order.includes(i)?'is-placed':''}>{order.includes(i)?piece:'❔'}</div>)}</div>
      <div className="mini-game-grid">{choices.map(piece=><button key={piece} type="button" className="mini-game-choice" onClick={()=>addPiece(piece)} disabled={order.includes(piece)}><EmojiPicture emoji={PUZZLE[piece]!}/></button>)}</div>
    </section>}
    <p className="cherche-bravo" aria-live="polite">{done?'🌟 Bravo !':kind==='puzzle'?order.length+' / 4 pièces':'On joue ensemble !'}</p>
    {celebration}
  </AppShell>;
}
