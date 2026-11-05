const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Shanghai'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const story='CalendarPointTest',precise='CalendarPointExactTest',daily='CalendarPointDailyTest',normal='CalendarPointNormalTest';
 let previous;
 try {
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:8093');await page.waitForFunction(()=>!!window.$tw?.wiki);
  const fixture=await page.evaluate(({story,precise,daily,normal})=>{
   const previous=['$:/layout','$:/StoryList','$:/language','$:/palette','$:/plugins/linonetwo/tw-calendar/settings/24hour'].map(title=>({title,exists:$tw.wiki.tiddlerExists(title),fields:$tw.wiki.getTiddler(title)?.fields}));
   $tw.wiki.setText('$:/layout','text',undefined,'');$tw.wiki.setText('$:/language','text',undefined,'$:/languages/zh-Hans');
   $tw.wiki.setText('$:/plugins/linonetwo/tw-calendar/settings/24hour','text',undefined,'yes');
   const time=(hour,minute,second=0,ms=0)=>{const date=new Date();date.setHours(hour,minute,second,ms);return date.getTime();};
   const times=[time(9,30),time(9,30),time(9,35),time(9,45),time(23,59,59,999)];
   const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');
   c.save($tw.wiki,precise,'date',c.encode(times,'date'),{caption:'时间点打卡'});
   c.save($tw.wiki,daily,'daily-count-rle',c.encode([times[0],times[0],times[0]],'daily-count-rle'),{caption:'只有日期的打卡'});
   $tw.wiki.addTiddler({title:normal,caption:'一小时日程',calendarEntry:'yes',startDate:$tw.utils.stringifyDate(new Date(time(10,0))),endDate:$tw.utils.stringifyDate(new Date(time(11,0)))});
   $tw.wiki.addTiddler({title:story,text:'<$calendar filter="[['+normal+']]" eventSources="" eventFilter="[['+precise+']activityevents<calendarStart>,<calendarEnd>] [['+daily+']activityevents<calendarStart>,<calendarEnd>]" initialView="timeGridDay" height="900px" />'});
   $tw.wiki.addTiddler({title:'$:/StoryList',list:[story]});
   return {previous,times};
  },{story,precise,daily,normal});
  previous=fixture.previous;
  const calendar=page.locator('[data-tiddler-title="'+story+'"]');
  const points=calendar.locator('.fc-timegrid-event.tw-calendar-event-point');
  await expect(points).toHaveCount(5);
  await expect(calendar.locator('.fc-daygrid-event').filter({hasText:'只有日期的打卡'})).toContainText('×3');
  const geometry=await points.evaluateAll(elements=>elements.map(el=>({height:el.getBoundingClientRect().height,x:el.getBoundingClientRect().x,background:getComputedStyle(el).backgroundColor,dot:!!el.querySelector('.fc-daygrid-event-dot'),text:el.textContent})));
  assert.ok(geometry.every(event=>event.height<=18),JSON.stringify(geometry));
  assert.ok(geometry.every(event=>event.background==='rgba(0, 0, 0, 0)'&&event.dot),JSON.stringify(geometry));
  assert.notEqual(geometry[0].x,geometry[1].x,'simultaneous points use FullCalendar collision layout');
  const normalEvent=calendar.locator('.fc-timegrid-event').filter({hasText:'一小时日程'});
  assert.ok((await normalEvent.boundingBox()).height>35);
  await expect(points.filter({hasText:'09:30'})).toHaveCount(2);
  await expect(points.filter({hasText:'23:59'})).toHaveCount(1);
  await calendar.locator('.fc-next-button').click();await expect(points).toHaveCount(0);
  await calendar.locator('.fc-prev-button').click();await expect(points).toHaveCount(5);

  await calendar.locator('.fc-dayGridMonth-button').click();
  await expect(calendar.locator('.fc-daygrid-dot-event').filter({hasText:'时间点打卡'})).toHaveCount(5);
  await calendar.locator('.fc-listWeek-button').click();
  const listRows=calendar.locator('.fc-list-event').filter({hasText:'时间点打卡'});await expect(listRows).toHaveCount(5);
  const listTimes=await listRows.locator('.fc-list-event-time').allTextContents();
  assert.ok(listTimes.every(text=>!text.includes(' - ')&&!text.includes('–')),JSON.stringify(listTimes));
  for(const offset of [-1,0]) {
   await page.evaluate(({precise,times,offset})=>{
    const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');
    c.save($tw.wiki,precise,'date',c.encode([...times.slice(0,-1),times[times.length-1]+offset],'date'));
   },{precise,times:fixture.times,offset});
   await expect.poll(async()=>await listRows.locator('.fc-list-event-time').allTextContents()).not.toContain('23:59 - 00:00');
   await page.waitForTimeout(700);
   assert.ok((await listRows.locator('.fc-list-event-time').allTextContents()).every(text=>!text.includes(' - ')));
  }
  await calendar.locator('.fc-timeGridDay-button').click();await expect(points).toHaveCount(5);
  await points.filter({hasText:'09:45'}).click();await page.locator('[data-tiddler-title="'+precise+'"]').getByRole('button',{name:'补昨天',exact:true}).waitFor();
  const stored=await page.evaluate(precise=>{
   const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');const log=c.read($tw.wiki,precise);
   return {times:c.decode(log.data,log.type),events:$tw.wiki.filterTiddlers('[['+precise+']activityevents[]]').map(JSON.parse)};
  },precise);
  assert.deepEqual(stored.times,fixture.times);assert.ok(stored.events.every(event=>event.end===undefined));
  await page.evaluate(story=>{$tw.wiki.addTiddler({title:'$:/StoryList',list:[story]});$tw.wiki.setText('$:/palette','text',undefined,'$:/palettes/Obsidian');},story);
  await expect(points).toHaveCount(5);await points.first().scrollIntoViewIfNeeded();
  const dark=await points.first().evaluate(el=>({text:getComputedStyle(el.querySelector('.fc-event-main')).color,background:getComputedStyle(el.closest('.tiddlywiki-calendar-widget-container')).backgroundColor}));
  assert.notEqual(dark.text,dark.background);assert.deepEqual(errors,[]);
  console.log('PASS: compact timed points, simultaneous check-ins, all-day counts, normal duration, midnight boundary, native month dots, list times, click navigation, unchanged log timestamps, dark palette');
 } finally {
  if(previous){
   await page.evaluate(({previous,story,precise,daily,normal})=>{
    for(const title of [story,precise,daily,normal])$tw.wiki.deleteTiddler(title);
    for(const item of previous){if(item.exists)$tw.wiki.addTiddler(item.fields);else $tw.wiki.deleteTiddler(item.title);}
   },{previous,story,precise,daily,normal});
   await page.waitForTimeout(1000);
  }
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exit(1);});
