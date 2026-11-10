'use strict';
function parseReport(text,expected){
 if(!Number.isInteger(expected)||expected<1||expected>400)throw Error('Invalid subscriber target');
 const marker='Subscriber summaries:',start=text.lastIndexOf(marker);if(start<0)throw Error('Subscriber report missing');
 const lines=text.slice(start+marker.length).replace(/\u001b\[[0-9;]*m/g,'').split(/\r?\n/),subscribers=[];let total;
 for(const line of lines){
  const cells=line.split(/[\u2502\u2503|]/).slice(1,-1).map(value=>value.trim());
  if(cells.length!==5)continue;
  const [name,tracks,bitrate,loss,error]=cells;
  if(!/^Sub \d+$/.test(name)&&name!=='Total')continue;
  if(!/^\d+\/\d+$/.test(tracks)||!/^\d+(?:\.\d+)?[kmg]?bps(?: \(\d+(?:\.\d+)?[kmg]?bps avg\))?$/i.test(bitrate)||!Number.isFinite(Number.parseFloat(bitrate)))throw Error('Malformed subscriber row');
  const percent=loss.match(/\((\d+(?:\.\d+)?)%\)$/);if(!percent||!Number.isFinite(Number(percent[1])))throw Error('Packet loss missing');
  const row={name,tracks,bitrate,lossPercent:Number(percent[1]),error:error==='-'?'':error};
  if(name==='Total'){if(total)throw Error('Duplicate total');total=row;}else subscribers.push(row);
 }
 if(subscribers.length!==expected||new Set(subscribers.map(row=>row.name)).size!==expected||!total)throw Error('Subscriber count does not match requested load');
 if(subscribers.some(row=>row.tracks!=='1/1'||row.error||Number.parseFloat(row.bitrate)<=0)||total.tracks!==expected+'/'+expected||total.error!=='0')throw Error('Not every subscriber received its audio track');
 if(subscribers.some(row=>row.lossPercent>1)||total.lossPercent>1)throw Error('Media packet loss exceeds the one-percent test limit');
 return {subscribers:expected,allTracksReceived:true,totalTracks:total.tracks,totalBitrate:total.bitrate,totalLossPercent:total.lossPercent,
  worstSubscriberLossPercent:Math.max(...subscribers.map(row=>row.lossPercent)),reportedErrors:0};
}
module.exports={parseReport};
