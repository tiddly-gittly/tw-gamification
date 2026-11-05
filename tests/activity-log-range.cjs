const {test}=require('node:test');
const assert=require('node:assert/strict');
const codec=require('../src/activity-log-tools/log-file-tools/activityLogCodec');
const {inRange,hasInRange}=require('../src/activity-log-tools/log-file-tools/activityRange');
const {activityevents}=require('../src/activity-log-tools/filter/activityevents');
global.$tw={utils:{parseDate:value=>new Date(Date.UTC(+value.slice(0,4),+value.slice(4,6)-1,+value.slice(6,8),+value.slice(8,10)||0,+value.slice(10,12)||0,+value.slice(12,14)||0,+value.slice(14,17)||0)),stringifyDate:date=>date.toISOString().replace(/[-:TZ.]/g,'')}};
function fixture(type,events,extra={}) {
 let data=codec.encode(events,type),cache;
 const tiddler={fields:{title:'Log A','activity-log-type':type,...extra}};
 const wiki={getTiddler:()=>tiddler,getTiddlerData:()=>data,getCacheForTiddler:(title,key,init)=>cache??=init()};
 const source=callback=>callback(tiddler,'Log A');
 return {wiki,source,update(events){data=codec.encode(events,type);cache=undefined;}};
}
const morning=new Date(2026,10,4,9).getTime(),afternoon=new Date(2026,10,4,16).getTime();
for(const type of codec.TYPES) test(`${type}: range selects matching days and preserves counts`,()=>{
 const f=fixture(type,[morning,morning,afternoon,new Date(2026,10,5,9).getTime()]);
 const matches=inRange(f.wiki,'Log A','2026-11-04','2026-11-05');
 assert.equal(matches.reduce((count,e)=>count+e.count,0),3);assert.equal(hasInRange(f.wiki,'Log A','2026-11-04','2026-11-05'),true);assert.equal(hasInRange(f.wiki,'Log A','2026-11-06','2026-11-07'),false);
 assert.equal(matches.length,type.startsWith('daily-count')?1:3);
 assert.deepEqual(inRange(f.wiki,'Log A','2026-11-06','2026-11-07'),[]);
});
test('exact range includes start and excludes end; duplicate events have distinct records',()=>{
 const f=fixture('date',[morning,morning,afternoon]);
 const result=activityevents(f.source,{operands:[new Date(morning).toISOString(),new Date(afternoon).toISOString()]},{wiki:f.wiki}).map(JSON.parse);
 assert.equal(result.length,2);assert.notEqual(result[0].id,result[1].id);assert.equal(result[0].timestamp,result[1].timestamp);assert.equal(result[0].allDay,false);
});
test('daily counts overlap a partial day without expanding counts into events',()=>{
 const f=fixture('daily-count-rle',Array(10000).fill(morning));
 const matches=inRange(f.wiki,'Log A',new Date(morning).toISOString(),new Date(afternoon).toISOString());
 assert.equal(matches.length,1);assert.equal(matches[0].count,10000);assert.equal(matches[0].allDay,true);
 assert.deepEqual(inRange(f.wiki,'Log A','2026-11-05','2026-11-04'),[]);
});
for (const type of ['date','day-interval']) test(`${type}: date-only history and new timed check-ins coexist`,()=>{
 const noon=codec.localDate('2026-11-04').getTime();
 const f=fixture(type,[noon,noon,morning,afternoon],{'activity-log-day-counts':JSON.stringify({'2026-11-04':2})});
 const matches=inRange(f.wiki,'Log A','2026-11-04','2026-11-05');
 assert.equal(matches.length,3);assert.equal(matches[0].allDay,true);assert.equal(matches[0].count,2);
 assert.deepEqual(matches.filter(e=>!e.allDay).map(e=>e.time),[morning,afternoon]);
 const partial=inRange(f.wiki,'Log A',new Date(noon).toISOString(),new Date(afternoon).toISOString());
 assert.equal(partial.length,1);assert.equal(partial[0].allDay,true);
});
test('new timed check-in at noon remains distinct from date-only history',()=>{
 const noon=codec.localDate('2026-11-04').getTime();
 const f=fixture('date',[noon,noon],{'activity-log-day-counts':JSON.stringify({'2026-11-04':1})});
 const matches=inRange(f.wiki,'Log A','2026-11-04','2026-11-05');
 assert.equal(matches.length,2);assert.equal(matches[0].count,1);assert.equal(matches[0].allDay,true);assert.equal(matches[1].allDay,false);
});
test('titles, timestamps and event records expose range results',()=>{
 const f=fixture('date',[morning]);
 for(const suffix of ['titles','timestamps','']) {
  const result=activityevents(f.source,{operands:['2026-11-04','2026-11-05'],suffix},{wiki:f.wiki});
  assert.equal(result.length,1);
  if(suffix==='titles')assert.equal(result[0],'Log A');
  else if(suffix==='timestamps')assert.equal(result[0],$tw.utils.stringifyDate(new Date(morning)));
  else {assert.equal(JSON.parse(result[0]).title,'Log A');assert.equal(JSON.parse(result[0]).extendedProps.activityCount,1);}
 }
 f.update([morning,afternoon]);assert.equal(inRange(f.wiki,'Log A','2026-11-04','2026-11-05').length,2);
});
test('UTC TiddlyWiki timestamps and ISO bounds select the same times',()=>{
 const f=fixture('day-interval',[morning,afternoon]);
 assert.deepEqual(inRange(f.wiki,'Log A',$tw.utils.stringifyDate(new Date(morning)),$tw.utils.stringifyDate(new Date(afternoon))),inRange(f.wiki,'Log A',new Date(morning).toISOString(),new Date(afternoon).toISOString()));
});
