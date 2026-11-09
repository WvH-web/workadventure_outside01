export const storyCards=[
  ['Schl\u00fcssel','Ein geheimnisvoller Schl\u00fcssel'],['Br\u00fccke','Eine Br\u00fccke \u00fcber einen Bach'],['Turm','Ein kleiner Schlossturm'],
  ['Zaubertrank','Eine leuchtende Flasche'],['Buch','Ein aufgeschlagenes Geschichtenbuch'],['Wolke','Eine Wolke mit Regenbogen'],
  ['Muschel','Eine schimmernde Muschel'],['Laterne','Eine warme Laterne'],['Baum','Ein gro\u00dfer gr\u00fcner Baum']
];
export function normalizeStory(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||value.v!==1||
    typeof value.round!=='string'||!/^[a-f0-9-]{36}$/.test(value.round)||
    !Array.isArray(value.cards)||value.cards.length!==3||new Set(value.cards).size!==3||
    !value.cards.every(n=>Number.isInteger(n)&&n>=0&&n<storyCards.length))return null;
  return {v:1,round:value.round,cards:[...value.cards]};
}
export function newStory(random=Math.random,id=()=>crypto.randomUUID()){
  const deck=storyCards.map((_,i)=>i);
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
  return {v:1,round:id(),cards:deck.slice(0,3)};
}
export class SharedStory{
  constructor(state,key,onChange){
    if(!/^castleStory(?:Gs|Ms|Os|Games|Museum|Music|Atelier|Stars|Courtyard|Village|Park)$/.test(key))throw Error('Story variable not configured');
    this.state=state;this.key=key;this.onChange=onChange;this.closed=false;this.busy=false;
  }
  start(){
    this.subscription=this.state.onVariableChange(this.key).subscribe(value=>this.render(value));
    this.render(this.state.loadVariable(this.key));return this;
  }
  render(value){if(!this.closed)this.onChange(normalizeStory(value))}
  async roll(){
    if(this.closed||this.busy)return false;
    this.busy=true;
    try{
      await this.state.saveVariable(this.key,newStory());
      if(!this.closed)this.render(this.state.loadVariable(this.key));
      return true;
    }finally{this.busy=false}
  }
  dispose(){this.closed=true;this.subscription?.unsubscribe()}
}
