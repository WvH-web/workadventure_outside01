const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,move,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {revision}=require('./build-castle-expansion.cjs');
const out=path.resolve(__dirname,'../../output/event-avatars-live-qa');fs.mkdirSync(out,{recursive:true});
async function main(){
  writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const users=[];
  try{
    const textures=['wvh-event-farah-v1','wvh-event-amir-v1'];
    for(let i=1;i<=2;i++)users.push(await join(browser,i,{roomId:'museum',roomUrl:'https://together.deine-schule.com/~/castle-preview/museum.wam',
      outputDir:out,seats:12,groups:3,revision,characterTextureId:textures[i-1],parking:[[432,400],[496,400]]}));
    const pictures=[];
    for(const [i,user]of users.entries()){
      assert.deepEqual(await user.page.evaluate(()=>JSON.parse(localStorage.getItem('characterTextures'))),[textures[i]]);
      const data=await user.script.evaluate(()=>WA.player.getWokaPicture());const raw=Buffer.from(data.slice(data.indexOf(',')+1),'base64');
      const meta=await sharp(raw).metadata();assert.ok(meta.width>=32&&meta.height>=32);
      const image=await sharp(raw).ensureAlpha().raw().toBuffer();assert.ok(image.some((value,n)=>n%4===3&&value>0));
      fs.writeFileSync(path.join(out,'native-avatar-'+(i+1)+'.png'),raw);pictures.push({width:meta.width,height:meta.height});
    }
    const a=users[0];await move(a,432,400);await move(users[1],496,400);await a.page.waitForTimeout(3000);
    assert.ok(await a.script.evaluate(()=>[...WA.players.list()].some(p=>p.name==='Hallenprobe 2')));
    await a.page.screenshot({path:path.join(out,'two-native-avatars.png')});
    await a.page.getByTestId('action-user').click();
    const menu=a.page.getByTestId('profile-menu');await menu.waitFor();
    const names=await menu.getByRole('button').allTextContents();
    fs.writeFileSync(path.join(out,'profile-actions.json'),JSON.stringify(names,null,2)+'\n');
    const edit=menu.getByRole('button',{name:/woka|avatar/i}).first();
    assert.ok(await edit.count(),'Native avatar editor is available');await edit.click();
    await a.page.getByText('Eventgaeste',{exact:true}).waitFor({timeout:30000});
    await a.page.waitForFunction(()=>{
      const canvases=[...document.querySelectorAll('#woka-line-1 canvas')];
      return canvases.length===12&&canvases.every(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0));
    },undefined,{polling:200,timeout:30000});
    await a.page.locator('#woka-wvh-event-jan-v1').scrollIntoViewIfNeeded();
    await a.page.locator('#woka-wvh-event-jan-v1').click();
    await a.page.screenshot({path:path.join(out,'native-avatar-picker.png')});
    await a.page.getByRole('button',{name:'Continue',exact:true}).click();
    await a.page.waitForFunction(()=>JSON.parse(localStorage.getItem('characterTextures'))?.[0]==='wvh-event-jan-v1',undefined,{polling:200});
    const errors=users.flatMap(u=>u.errors);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({participants:2,registeredTextures:true,nativePictures:pictures,
      otherParticipantTracked:true,collectionInNativePicker:true,allTwelvePickerSpritesVisible:true,selectionSaved:true,errors},null,2)+'\n');
    console.log(JSON.stringify({participants:2,nativePictures:pictures,collectionInNativePicker:true,errors}));
  }catch(e){for(const [i,user]of users.entries()){
    await user.page.screenshot({path:path.join(out,'failure-'+i+'.png')}).catch(()=>{});
    fs.writeFileSync(path.join(out,'failure-'+i+'.txt'),await user.page.locator('body').innerText().catch(()=>''));
  }throw e;}finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
