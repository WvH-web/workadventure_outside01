const path=require('node:path'),fs=require('node:fs');
const {chromium}=require('./castle-deps.cjs')('playwright');
const out=path.resolve(__dirname,'../../output/castle-characters-qa');fs.mkdirSync(out,{recursive:true});
async function main(){
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:900}});
    const files=[...Array.from({length:25},(_,i)=>'Female '+String(i+1).padStart(2,'0')+'-'+(i>21?'1':'2')+'.png'),
      ...Array.from({length:18},(_,i)=>'Male '+String(i+1).padStart(2,'0')+'-'+(i===17?'1':'3')+'.png'),
      ...['fmale','male'].flatMap(sex=>Array.from({length:4},(_,i)=>'Teacher '+sex+' 0'+(i+1)+'.png'))];
    await page.setContent('<!doctype html><style>body{margin:0;background:#24372d;color:white;font:12px sans-serif;display:grid;grid-template-columns:repeat(10,1fr);gap:8px;padding:8px}article{height:105px;background:#344d3e;display:flex;align-items:center;justify-content:end;flex-direction:column;padding:4px;gap:15px}span{width:32px;height:32px;transform:scale(2);image-rendering:pixelated;background-position:-32px 0;background-repeat:no-repeat}</style>');
    await page.evaluate(files=>{for(const file of files){const a=document.createElement('article'),s=document.createElement('span'),n=document.createElement('div');
      s.style.backgroundImage='url("https://together.deine-schule.com/resources/characters/pipoya/'+encodeURIComponent(file)+'")';n.textContent=file;a.append(s,n);document.body.append(a);}},files);
    await page.waitForTimeout(5000);await page.screenshot({path:path.join(out,'native-candidates.png'),fullPage:true});
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
