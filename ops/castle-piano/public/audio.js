const SAMPLE_ROOT='./samples/869b6f8d9cddb47d966238c012041480b1ce517a/';
const samples={'C3':'C3.mp3','D#3':'Ds3.mp3','F#3':'Fs3.mp3','A3':'A3.mp3','C4':'C4.mp3','D#4':'Ds4.mp3','F#4':'Fs4.mp3','A4':'A4.mp3',
  'C5':'C5.mp3','D#5':'Ds5.mp3','F#5':'Fs5.mp3','A5':'A5.mp3','C6':'C6.mp3'};
export const noteName=note=>['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][note%12]+(Math.floor(note/12)-1);
export class PianoAudio{
  constructor(){this.voices=new Map();this.volume=.55;this.epoch=0;}
  async unlock(){
    if(this.ready){await this.raw.resume();return;}
    if(this.loading){await this.raw?.resume();return this.loading;}
    const epoch=this.epoch;
    this.raw=new AudioContext({latencyHint:'interactive'});void this.raw.resume();
    this.loading=(async()=>{
      try{
        const Tone=await import('./vendor/tone.js');if(epoch!==this.epoch)return;
        this.Tone=Tone;this.context=new Tone.Context({context:this.raw,clockSource:'timeout',lookAhead:.02,latencyHint:'interactive'});Tone.setContext(this.context);
        this.gain=new Tone.Gain(this.volume*.35);this.limiter=new Tone.Limiter(-3);this.gain.connect(this.limiter);this.limiter.toDestination();
        await new Promise((resolve,reject)=>{this.bank=new Tone.ToneAudioBuffers({urls:samples,baseUrl:SAMPLE_ROOT,onload:resolve,onerror:reject});});
        if(epoch!==this.epoch)return;await this.raw.resume();this.ready=true;
      }catch(error){if(epoch===this.epoch){this.release();this.bank?.dispose();this.gain?.dispose();this.limiter?.dispose();await this.closeContext();this.loading=null;}throw error;}
    })();return this.loading;
  }
  setVolume(value){this.volume=Math.max(0,Math.min(1,value));if(this.gain)this.gain.gain.rampTo(this.volume*.35,.05);}
  render(state){
    if(!this.ready)return;
    const present=new Set(state.members.map(member=>member.voiceId));
    for(const [id,voice]of this.voices)if(!present.has(id)){voice.sampler.releaseAll();voice.sampler.dispose();this.voices.delete(id);}
    for(const member of state.members){
      let voice=this.voices.get(member.voiceId);
      if(!voice){const urls=Object.fromEntries(Object.keys(samples).map(name=>[name,this.bank.get(name)]));
        voice={sampler:new this.Tone.Sampler({urls,attack:.003,release:.28,curve:'exponential'}).connect(this.gain),keys:new Map()};this.voices.set(member.voiceId,voice);}
      const keys=new Map(member.keys.map(key=>[key.note,key]));
      for(const [note,old]of voice.keys)if(!keys.has(note)||keys.get(note).pressId!==old.pressId)voice.sampler.triggerRelease(noteName(note));
      for(const [note,key]of keys)if(voice.keys.get(note)?.pressId!==key.pressId){
        // Old held notes join quietly instead of being replayed at full attack.
        const age=Math.max(0,(state.time-key.startedAt)/1000),velocity=key.velocity/127*Math.exp(-age/3.5);
        if(velocity>.025)voice.sampler.triggerAttack(noteName(note),undefined,velocity);
      }
      voice.keys=keys;
    }
  }
  release(){for(const voice of this.voices.values()){voice.sampler.releaseAll();voice.sampler.dispose();}this.voices.clear();}
  closeContext(){return Promise.resolve(this.context?this.context.close():this.raw&&this.raw.state!=='closed'?this.raw.close():null).catch(()=>{});}
  dispose(){this.epoch++;this.ready=false;this.release();this.bank?.dispose();this.gain?.dispose();this.limiter?.dispose();void this.closeContext();}
}
