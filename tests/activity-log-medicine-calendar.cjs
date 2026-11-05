const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Shanghai'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8093');await page.waitForFunction(()=>!!window.$tw?.wiki);
 const medicine='CalendarMedicineTest',logTitle='$:/plugins/linonetwo/health-buff-debuff-tracker/medicine-checkin-log/'+medicine;
 const config='$:/plugins/linonetwo/tw-calendar/config',base='$:/plugins/linonetwo/tw-calendar/settings/';
 const previous=await page.evaluate(({medicine,logTitle,config,base})=>{
  const previous={disabledSources:$tw.wiki.getTiddlerList(base+'disabledEventSources'),eventFilter:$tw.wiki.getTiddlerText(base+'eventFilter'),wideView:$tw.wiki.getTiddlerText(base+'wideScreenDefaultView'),normalFilter:$tw.wiki.getTiddlerText(base+'eventTiddlerFilter')};
  $tw.wiki.setText('$:/language','text',undefined,'$:/languages/zh-Hans');
  $tw.wiki.setText('$:/layout','text',undefined,'');
  $tw.wiki.setText(base+'disabledEventSources','list',undefined,['$:/plugins/linonetwo/health-buff-debuff-tracker/calendar/MedicineCheckins']);
  $tw.wiki.addTiddler({title:medicine,caption:'药物 M（测试）',tags:['$:/tags/HealthTracker/Medicine']});
  const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');const date=new Date();date.setHours(9,30,0,0);
  c.save($tw.wiki,logTitle,'daily-count',c.encode([date.getTime(),date.getTime()],'daily-count'),{'activity-log-day-counts':undefined});
  $tw.wiki.addTiddler({title:'$:/StoryList',list:[config]});return previous;
 },{medicine,logTitle,config,base});
 const article=page.locator('[data-tiddler-title="'+config+'"]');
 await article.locator('textarea').nth(1).fill('[[CalendarMedicineTest]medicinecheckinevents<calendarStart>,<calendarEnd>]');
 await article.locator('select:has(option[value="timeGridDay"])').selectOption('timeGridDay');
 await expect.poll(()=>page.evaluate(base=>$tw.wiki.getTiddlerText(base+'eventFilter'),base)).toContain('CalendarMedicineTest');
 await page.evaluate(logTitle=>$tw.wiki.addTiddler({title:'$:/StoryList',list:[logTitle]}),logTitle);
 const log=page.locator('[data-tiddler-title="'+logTitle+'"]');await log.getByRole('button',{name:'选择记录格式',exact:true}).click();
 const modal=page.locator('.tc-modal');await modal.waitFor();
 assert.equal(await modal.getByRole('button',{name:'切换到每日次数',exact:true}).count(),0);
 await modal.getByRole('button',{name:'切换到时间戳',exact:true}).click();
 await expect(modal.getByRole('button',{name:'切换到时间戳',exact:true})).toHaveCount(0);await expect(modal.locator('tr').filter({hasText:'每次打卡的具体时刻'})).toContainText('当前格式');
 await page.waitForFunction(()=>[...document.querySelectorAll('.tc-modal [_echarts_instance_]')].some(el=>echarts.getInstanceByDom(el)?.getOption().series?.length));
 const tooltip=await modal.locator('[_echarts_instance_]').evaluate(el=>{const o=echarts.getInstanceByDom(el).getOption();return o.tooltip[0].formatter(o.series.map((s,i)=>({dataIndex:0,seriesIndex:i,marker:'',seriesName:s.name,value:s.data[0]})));});
 assert.match(tooltip,/2 次历史记录只有日期/);assert.match(tooltip,/新打卡显示具体时间/);assert.doesNotMatch(tooltip,/仍按天显示/);
 await modal.getByRole('button',{name:'关闭',exact:true}).click();
 const info=await page.evaluate(({logTitle})=>{
  const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');const date=new Date();date.setHours(10,15,0,0);
  $tw.wiki.invokeActionString('<$action-add-activity-to-log $logTitle="'+logTitle+'" $logType="daily-count" $timestamp="'+date.getTime()+'"/>',null,{},{});
  const rows=$tw.wiki.filterTiddlers('[[CalendarMedicineTest]medicinecheckinevents[]]').map(JSON.parse);
  $tw.wiki.setText('$:/layout','text',undefined,'$:/plugins/linonetwo/tw-calendar/tiddlywiki-ui/PageLayout/EventsCalendarLayout');
  return {type:c.read($tw.wiki,logTitle).type,rows};
 },{logTitle});
 assert.equal(info.type,'date');assert.equal(info.rows.length,2);assert.equal(info.rows[0].allDay,true);assert.equal(info.rows[0].extendedProps.activityCount,2);assert.equal(info.rows[1].allDay,false);assert.equal(info.rows[1].extendedProps.activityLabel,'药物 M（测试）');
 await page.locator('.fc-timeGridDay-view').waitFor();await expect(page.locator('.fc-event')).toHaveCount(2);await expect(page.locator('.fc-daygrid-event')).toContainText('药物 M（测试） ×2');await expect(page.locator('.fc-timegrid-event')).toContainText('10:15');
 // Normal event filtering and check-in event filtering remain independently configurable.
 await page.evaluate(()=>{const date=new Date();date.setHours(9,0,0,0);$tw.wiki.addTiddler({title:'CalendarNormalEventTest',caption:'普通日程',calendarEntry:'yes',startDate:$tw.utils.stringifyDate(date),endDate:$tw.utils.stringifyDate(new Date(date.getTime()+900000))});});
 await expect(page.locator('.fc-event')).toHaveCount(3);await expect(page.locator('.fc')).toContainText('普通日程');
 await page.evaluate(base=>$tw.wiki.setText(base+'eventTiddlerFilter','text',undefined,'[all[]limit[0]]'),base);await expect(page.locator('.fc-event')).toHaveCount(2);
 await page.evaluate(({base,previous})=>{$tw.wiki.deleteTiddler('CalendarNormalEventTest');$tw.wiki.setText(base+'eventTiddlerFilter','text',undefined,previous.normalFilter);},{base,previous});
 await expect(page.locator('.fc-event')).toHaveCount(2);
 await page.screenshot({path:'activity-preview-day-calendar.png',fullPage:true});
 await page.locator('.fc-timegrid-event').click();await log.getByRole('button',{name:'选择记录格式',exact:true}).waitFor();assert.equal(await page.locator('.fc-timeGridDay-view').count(),0);
 // A genuinely timed log has no date-only-history hint.
 await page.evaluate(logTitle=>{const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');c.save($tw.wiki,logTitle,'date',c.encode([Date.now()],'date'),{'activity-log-day-counts':undefined});},logTitle);
 await log.getByRole('button',{name:'选择记录格式',exact:true}).click();await page.waitForTimeout(500);
 const timedTooltip=await modal.locator('[_echarts_instance_]').evaluate(el=>{const o=echarts.getInstanceByDom(el).getOption();return o.tooltip[0].formatter(o.series.map((s,i)=>({dataIndex:0,seriesIndex:i,marker:'',seriesName:s.name,value:s.data[0]})));});assert.match(timedTooltip,/具体时间点/);assert.doesNotMatch(timedTooltip,/历史记录/);
 await modal.getByRole('button',{name:'关闭',exact:true}).click();
 await page.evaluate(({medicine,logTitle,base,previous})=>{$tw.wiki.deleteTiddler(medicine);$tw.wiki.deleteTiddler(logTitle);$tw.wiki.setText(base+'eventFilter','text',undefined,previous.eventFilter||'');$tw.wiki.setText(base+'disabledEventSources','list',undefined,previous.disabledSources);$tw.wiki.setText(base+'wideScreenDefaultView','text',undefined,previous.wideView||'timeGridThreeDay');$tw.wiki.addTiddler({title:'$:/StoryList',list:['打卡工作台']});},{medicine,logTitle,base,previous});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: native calendar settings, single-day standard agenda, medicine captions, converted history + precise new check-in, current format hidden, tooltip reflects log metadata');
})().catch(error=>{console.error(error);process.exit(1);});
