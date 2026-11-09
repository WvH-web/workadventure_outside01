export function makeMapImagePassive(view=window){
  try{
    // Same-origin decoration pages may configure only their own containing iframe.
    const frame=view.frameElement;
    if(!frame)return false;
    // WorkAdventure may rewrite pointerEvents while positioning; inert remains authoritative.
    frame.style.pointerEvents='none';frame.tabIndex=-1;frame.inert=true;frame.setAttribute('aria-hidden','true');
    return true;
  }catch{return false}
}
