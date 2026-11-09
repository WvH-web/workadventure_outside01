'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
class ChessJournal {
  constructor(file){
    this.file=path.resolve(file);const parent=path.dirname(this.file);
    if(fs.realpathSync(parent)!==parent||fs.existsSync(this.file)&&fs.lstatSync(this.file).isSymbolicLink())throw Error('Invalid chess storage');
  }
  read(){
    if(!fs.existsSync(this.file))return null;
    if(fs.lstatSync(this.file).isSymbolicLink()||fs.statSync(this.file).size>131072)throw Error('Invalid chess journal');
    return JSON.parse(fs.readFileSync(this.file,'utf8'));
  }
  write(value){
    const bytes=Buffer.from(JSON.stringify(value)+'\n');if(bytes.length>131072)throw Error('Chess journal limit');
    if(fs.existsSync(this.file)&&fs.lstatSync(this.file).isSymbolicLink())throw Error('Invalid chess journal');
    const temporary=this.file+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';let fd;
    try{fd=fs.openSync(temporary,'wx',0o600);fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temporary,this.file);}
    finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  }
}
module.exports={ChessJournal};
