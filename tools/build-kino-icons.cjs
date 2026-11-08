const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),lucide=require(path.join(root,'castle/vendor/lucide.min.js'));
const dir=path.join(root,'ops/kino-ui');
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function node([tag,attrs,children=[]]){
  return '<'+tag+' '+Object.entries(attrs).map(([k,v])=>k+'="'+xml(v)+'"').join(' ')+'>'+children.map(node).join('')+'</'+tag+'>';
}
for(const [name,icon]of [['reload','RotateCw'],['chat','MessageSquare']]){
  const shape=structuredClone(lucide.icons[icon]);shape[1].stroke='#ffffff';
  fs.writeFileSync(path.join(dir,'castle-'+name+'-20261108.svg'),node(shape)+'\n');
}
fs.copyFileSync(path.join(root,'castle/vendor/LICENSE'),path.join(dir,'castle-icons-LICENSE-20261108.txt'));
console.log('Two icons generated from the existing Lucide library with its licence.');
