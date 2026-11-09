export const catalogBase='https://deutsche-online-schule.com/schooltools/verwaltung/api/';
export const validBoard=board=>typeof board==='string'&&/^(?:show(?:[1-9]|1[0-3])|musik0[1-7])$/.test(board);
export function catalogItem(item){
  if(!item||!validBoard(item.board))return null;
  let image;
  try{
    const url=new URL(item.image_url);
    if(url.origin!==new URL(catalogBase).origin||url.pathname!==new URL('museum_asset.php',catalogBase).pathname||url.username||url.password)return null;
    image=url.href;
  }catch{return null}
  // Comparison-only metadata: never use the submitted target as a navigation destination.
  const revision=JSON.stringify([typeof item.updated_at==='string'?item.updated_at.slice(0,80):'',typeof item.target_url==='string'?item.target_url.slice(0,8192):'']);
  return {board:item.board,title:typeof item.title==='string'?item.title.slice(0,200):item.board,image,revision,
    open:new URL('workadventure_museum_open.php?board='+item.board,catalogBase).href};
}
export async function fetchCatalog(signal){
  const response=await fetch(catalogBase+'workadventure_museum.php',{cache:'no-store',signal});
  if(!response.ok)throw Error('Ausstellung nicht erreichbar');
  const data=await response.json();
  if(!Array.isArray(data.items))throw Error('Ausstellung nicht verfuegbar');
  return data.items.slice(0,100).map(catalogItem).filter(Boolean);
}
