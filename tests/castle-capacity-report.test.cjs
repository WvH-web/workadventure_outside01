const test=require('node:test'),assert=require('node:assert/strict');
const {parseReport}=require('../tools/castle-capacity/report.cjs');
const report=(a='1/1',error='',loss='0 (0%)')=>`Track loading:\n| Sub 0 | something |audio| 2kbps |0 (0%)|\nSubscriber summaries:\n| Tester | Tracks | Bitrate | Total Pkt. Loss | Error |\n| Sub 1 | ${a} | 12.2kbps | ${loss} | ${error} |\n| Sub 2 | 1/1 | 12.3kbps | 0 (0%) | |\n| Total | 2/2 | 24.5kbps (12.2kbps avg) | 0 (0%) | 0 |`;
test('uses the subscriber summary, not exit status or the track-loading section',()=>{
 assert.deepEqual(parseReport(report(),2),{subscribers:2,allTracksReceived:true,totalTracks:'2/2',totalBitrate:'24.5kbps (12.2kbps avg)',totalLossPercent:0,worstSubscriberLossPercent:0,reportedErrors:0});
 assert.equal(parseReport(report().replaceAll('|','\u2502'),2).subscribers,2);
});
test('accepts only the CLI empty-cell dash, not arbitrary error text',()=>{
 assert.equal(parseReport(report('1/1','-'),2).reportedErrors,0);
 assert.throws(()=>parseReport(report('1/1','- failed'),2));
});
test('missing, duplicated or partial recipients cannot pass',()=>{
 for(const text of ['',report().replace('| Sub 2','| Sub 1'),report('0/1'),report('1/1','connect failed'),report().replace('12.3kbps','0bps'),report().replace('2/2','1/2')])assert.throws(()=>parseReport(text,2));
 assert.throws(()=>parseReport(report(),400));
});
test('packet loss is checked per recipient as well as in the total',()=>{
 assert.throws(()=>parseReport(report('1/1','','10 (1.01%)'),2));assert.equal(parseReport(report('1/1','','10 (0.5%)'),2).worstSubscriberLossPercent,.5);
});
test('malformed numeric evidence and invalid target sizes cannot pass',()=>{
 for(const text of [report('1/1','','0 (...%)'),report().replace('12.3kbps','12.3unknown'),report().replaceAll('0 (0%)','0 (0.0.0%)')])assert.throws(()=>parseReport(text,2));
 for(const target of [0,401,'2',1.5,NaN])assert.throws(()=>parseReport(report(),target));
});
