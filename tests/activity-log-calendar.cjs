const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1200},timezoneId:'Asia/Shanghai'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8093');await page.waitForFunction(()=>!!window.$tw?.wiki);
 const result=await page.evaluate(()=>{
  $tw.wiki.setText('$:/language','text',undefined,'$:/languages/zh-Hans');
  const codec=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');
  const day=new Date();day.setDate(day.getDate()-1);day.setHours(9,30,0,0);
  const first=day.getTime();day.setHours(16,45);const second=day.getTime();
  const old=new Date(day);old.setMonth(old.getMonth()-2);
  codec.save($tw.wiki,'CalendarRangeExact','date',codec.encode([first,second,old.getTime()],'date'),{caption:'时间点示例'});
  codec.save($tw.wiki,'CalendarRangeCounts','daily-count-rle',codec.encode([first,first,second],'daily-count-rle'),{caption:'次数示例'});
  const start=codec.dayKey(day),endDay=new Date(day);endDay.setDate(endDay.getDate()+1);const end=codec.dayKey(endDay);
  const source='[prefix[CalendarRange]activityevents['+start+'],['+end+']]';
  const rows=$tw.wiki.filterTiddlers(source).map(JSON.parse);
  const titles=$tw.wiki.filterTiddlers('[prefix[CalendarRange]activityevents:titles['+start+'],['+end+']]');
  const multi=$tw.wiki.renderText('text/plain','text/vnd.tiddlywiki','<$let events={{{ '+source+' }}}><$list filter="[(events)]" variable="event"><$text text={{{ [<event>jsonget[title]] }}}/>;</$list></$let>');
  const cache1=$tw.wiki.getCacheForTiddler('CalendarRangeExact','activity-log-events',()=>[]);
  $tw.wiki.setText('CalendarRangeExact','caption',undefined,'时间点示例');
  const nextRows=$tw.wiki.filterTiddlers(source).map(JSON.parse);
  const cache2=$tw.wiki.getCacheForTiddler('CalendarRangeExact','activity-log-events',()=>[]);
  $tw.wiki.addTiddler({title:'CalendarEventFilter',text:'[prefix[CalendarRange]activityevents<calendarStart>,<calendarEnd>]'});
  $tw.wiki.addTiddler({title:'打卡日历',text:'<$calendar filter="[all[]limit[0]]" eventSources="" eventFilter={{CalendarEventFilter}} initialView="dayGridMonth" readonly="yes" />'});
  $tw.wiki.addTiddler({title:'$:/StoryList',list:['打卡日历']});
  $tw.wiki.setText('$:/plugins/linonetwo/tw-calendar/settings/24hour','text',undefined,'yes');
  return {rows,titles,multi,cacheInvalidated:cache1!==cache2,nextRows};
 });
 assert.equal(result.rows.length,3);assert.deepEqual(result.titles.sort(),['CalendarRangeCounts','CalendarRangeExact']);assert.equal(result.multi.match(/CalendarRangeExact/g).length,2);assert.equal(result.multi.match(/CalendarRangeCounts/g).length,1);assert.equal(result.cacheInvalidated,true);assert.deepEqual(result.nextRows,result.rows);
 const events=page.locator('.fc-event');await expect(events).toHaveCount(3);await expect(page.locator('.fc')).toContainText('次数示例 ×3');await expect(page.locator('.fc')).toContainText('09:30');await expect(page.locator('.fc')).toContainText('16:45');
 await events.filter({hasText:'时间点示例'}).first().click();await page.locator('[data-tiddler-title="CalendarRangeExact"]').getByRole('button',{name:'补昨天',exact:true}).waitFor();
 // A real check-in refreshes the all-day count through the calendar event filter.
 await page.evaluate(()=>{const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');const {data,type}=c.read($tw.wiki,'CalendarRangeCounts');const times=c.decode(data,type);times.push(times[0]);c.save($tw.wiki,'CalendarRangeCounts',type,c.encode(times,type));});
 await expect(page.locator('.fc')).toContainText('次数示例 ×4');
 // A dynamic eventFilter attribute changes the displayed source.
 await page.evaluate(()=>$tw.wiki.setText('CalendarEventFilter','text',undefined,'[[CalendarRangeExact]activityevents<calendarStart>,<calendarEnd>]'));
 await expect(events).toHaveCount(2);
 await page.evaluate(()=>$tw.wiki.setText('CalendarEventFilter','text',undefined,'[prefix[CalendarRange]activityevents<calendarStart>,<calendarEnd>]'));await expect(events).toHaveCount(3);
 await page.evaluate(()=>$tw.wiki.addTiddler({title:'$:/StoryList',list:['打卡日历']}));
 await page.screenshot({path:'activity-preview-calendar.png',fullPage:true});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: core multi-valued variable, cached range filter, timed/all-day calendar events, click opens log, live counts, dynamic eventFilter');
})().catch(error=>{console.error(error);process.exit(1);});
