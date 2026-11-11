'use strict';
const cp=require('node:child_process');
require('./castle-local-storage.cjs').configure();
const args=process.argv.slice(2);let executable=process.execPath;
if(args[0]==='--exec'){args.shift();executable=args.shift();}
if(!executable||!args.length)throw Error('Provide Node arguments, or --exec followed by a program and its arguments');
const result=cp.spawnSync(executable,args,{stdio:'inherit',windowsHide:true,env:process.env});
if(result.error){console.error(result.error.message);process.exitCode=1;}else process.exitCode=result.status??1;
