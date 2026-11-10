const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const source=path.resolve(__dirname,'../../_castle_notices_20261110');
const files=['src/WorkAdventure/CastleNoticeRepository.php','api/workadventure_castle_notices.php','admin/workadventure_castle_notices.php',
 'assets/css/workadventure_castle_notices.css','config/sql/PATCH_workadventure_castle_notices_v1.sql','tests/workadventure_castle_notices.php','tests/workadventure_castle_notices_render.php'];
const output=path.resolve(__dirname,'../../output/castle-offers/private/notices');fs.mkdirSync(output,{recursive:true});
execFileSync('tar',['-a','-cf',path.join(output,'fixtures.zip'),...files],{cwd:source,stdio:'inherit'});
console.log('Packaged seven source files for isolated synthetic PHP/MySQL tests.');
