const {test}=require('node:test');
const assert=require('node:assert/strict');
const codec=require('../src/activity-log-tools/log-file-tools/activityLogCodec');
const times=['2026-10-30','2026-10-31','2026-10-31','2026-11-02'].map(x=>codec.localDate(x).getTime());
function days(events){const result={};events.forEach(t=>{const d=codec.dayKey(t);result[d]=(result[d]||0)+1;});return result;}
for(const from of codec.TYPES)for(const to of codec.TYPES)test(`${from} → ${to} preserves dates and counts`,()=>{
 const decoded=codec.decode(codec.encode(times,from),from);
 assert.deepEqual(days(codec.decode(codec.encode(decoded,to),to)),days(times));
});
test('timestamp and interval preserve exact event times including duplicates and sub-minute gaps',()=>{
 const events=[...times, times[0]+12345,times[0]+45678,...Array(65).fill(times[0])].sort((a,b)=>a-b);
 for(const type of ['date','day-interval'])assert.deepEqual(codec.decode(codec.encode(events,type),type),events);
});
test('RLE compresses regular activity; losslessly preserves daily counts',()=>{
 const events=Array.from({length:28},(_,i)=>new Date(2026,9,i+1,12).getTime());
 const plain=codec.encode(events,'daily-count'),rle=codec.encode(events,'daily-count-rle');
 assert.ok(JSON.stringify(rle).length<JSON.stringify(plain).length);
 assert.match(Object.values(rle)[0],/1\*28/);
 assert.deepEqual(codec.decode(rle,'daily-count-rle'),events);
});
test('backfill inserts into historical date without changing other dates',()=>{
 for(const type of codec.TYPES){const decoded=codec.decode(codec.encode(times,type),type);decoded.push(codec.localDate('2026-10-01').getTime());const result=days(codec.decode(codec.encode(decoded,type),type));assert.equal(result['2026-10-01'],1);assert.equal(result['2026-10-31'],2);assert.equal(result['2026-11-02'],1);}
});
test('rejects impossible dates and malformed counts',()=>{
 for(const d of ['2026-02-30','not-a-date','2026-13-01'])assert.throws(()=>codec.localDate(d));
 assert.throws(()=>codec.decode({'daily-count-rle1234':'1*0'},'daily-count-rle'));
 assert.throws(()=>codec.decode({'daily-count1234':'-1'},'daily-count'));
});
test('legacy interval rows without a zero sentinel remain readable',()=>{
 const data={[`day-interval${times[3]}`]:'1,2'};
 assert.deepEqual(codec.decode(data,'day-interval'),[times[3]-3*86400000,times[3]-2*86400000]);
});
