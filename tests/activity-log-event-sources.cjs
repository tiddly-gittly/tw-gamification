const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1100},timezoneId:'Asia/Shanghai'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const url=process.env.BASE_URL||'http://127.0.0.1:8093';
 const base='$:/plugins/linonetwo/tw-calendar/settings/';
 const config='$:/plugins/linonetwo/tw-calendar/config';
 const medicine='CalendarAutoSourceTest';
 const log='$:/plugins/linonetwo/health-buff-debuff-tracker/medicine-checkin-log/'+medicine;
 const source='$:/CalendarAutoSourceTest',story='CalendarAutoSourceTestCalendar';
 let previous;
 try {
  await page.goto(url);await page.waitForFunction(()=>!!window.$tw?.wiki);
  previous=await page.evaluate(({base,config,medicine,log,story})=>{
   const titles=[base+'disabledEventSources',base+'eventFilter','$:/layout','$:/StoryList','$:/language'];
   const previous=titles.map(title=>({title,exists:$tw.wiki.tiddlerExists(title),fields:$tw.wiki.getTiddler(title)?.fields}));
   $tw.wiki.setText('$:/layout','text',undefined,'');
   $tw.wiki.setText('$:/language','text',undefined,'$:/languages/zh-Hans');
   $tw.wiki.setText(base+'eventFilter','text',undefined,'');
   $tw.wiki.setText(base+'disabledEventSources','list',undefined,[]);
   $tw.wiki.addTiddler({title:medicine,caption:'自动接入测试药物',tags:['$:/tags/HealthTracker/Medicine']});
   const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');
   c.save($tw.wiki,log,'date',c.encode([Date.now()],'date'));
   $tw.wiki.addTiddler({title:story,text:'<$calendar filter="[all[]limit[0]]" initialView="timeGridDay" />'});
   $tw.wiki.addTiddler({title:'$:/StoryList',list:[config,story]});
   return previous;
  },{base,config,medicine,log,story});
  const settings=page.locator('[data-tiddler-title="'+config+'"]');
  const calendar=page.locator('[data-tiddler-title="'+story+'"]');
  const medicineSwitch=settings.getByRole('checkbox',{name:'药物打卡',exact:true});
  const medicineEvents=calendar.locator('.fc-event').filter({hasText:'自动接入测试药物'});
  await expect(medicineSwitch).toBeChecked();await expect(medicineEvents).toHaveCount(1);
  assert.equal(await page.evaluate(base=>$tw.wiki.getTiddlerText(base+'eventFilter'),base),'');

  await medicineSwitch.uncheck();await expect(medicineEvents).toHaveCount(0);
  // The native checkbox stores only disabled source titles. Wait for the wiki sync before reloading.
  const registeredMedicine='$:/plugins/linonetwo/health-buff-debuff-tracker/calendar/MedicineCheckins';
  await expect.poll(async()=>{
   const response=await page.request.get(url+'/recipes/default/tiddlers/'+encodeURIComponent(base+'disabledEventSources'));
   return response.ok()?(await response.json()).fields.list:'';
  }).toContain(registeredMedicine);
  await page.reload();await page.waitForFunction(()=>!!window.$tw?.wiki);
  await expect(medicineSwitch).not.toBeChecked();await expect(medicineEvents).toHaveCount(0);
  await medicineSwitch.check();await expect(medicineEvents).toHaveCount(1);
  await calendar.locator('.fc-next-button').click();
  const nextDay=await calendar.locator('.fc-toolbar-title').innerText();
  await medicineSwitch.uncheck();await medicineSwitch.check();
  await expect(calendar.locator('.fc-toolbar-title')).toHaveText(nextDay);
  await calendar.locator('.fc-today-button').click();await expect(medicineEvents).toHaveCount(1);

  // A source added while the calendar is open is discovered without changing widget attributes.
  await page.evaluate(source=>{
   $tw.wiki.addTiddler({title:source,tags:['$:/tags/Calendar/EventSource'],caption:'新增数据源',description:'动态注册的测试数据源',filter:'[<currentTiddler>get[event]]',event:JSON.stringify({id:'registered-source-test',title:'注册数据源事件',start:new Date().toISOString()})});
  },source);
  const sourceSwitch=settings.getByRole('checkbox',{name:'新增数据源',exact:true});
  const sourceEvents=calendar.locator('.fc-event').filter({hasText:'注册数据源事件'});
  await expect(sourceSwitch).toBeChecked();await expect(sourceEvents).toHaveCount(1);
  await sourceSwitch.uncheck();await expect(sourceEvents).toHaveCount(0);await expect(medicineEvents).toHaveCount(1);
  await sourceSwitch.check();await expect(sourceEvents).toHaveCount(1);
  await page.evaluate(source=>$tw.wiki.setText(source,'event',undefined,JSON.stringify({id:'registered-source-test',title:'修改后的注册事件',start:new Date().toISOString()})),source);
  await expect(calendar.locator('.fc-event').filter({hasText:'修改后的注册事件'})).toHaveCount(1);
  await page.evaluate(source=>$tw.wiki.setText(source,'tags',undefined,[]),source);
  await expect(sourceSwitch).toHaveCount(0);await expect(calendar.locator('.fc-event').filter({hasText:'修改后的注册事件'})).toHaveCount(0);

  // Per-widget opt-out and dynamic source selection remain available for embedded calendars.
  await page.evaluate(story=>{
   $tw.wiki.addTiddler({title:'CalendarAutoSourceTestSelection',text:''});
   $tw.wiki.setText(story,'text',undefined,'<$calendar filter="[all[]limit[0]]" eventSources={{CalendarAutoSourceTestSelection}} initialView="timeGridDay" />');
  },story);
  await expect(medicineEvents).toHaveCount(0);
  await page.evaluate(registeredMedicine=>$tw.wiki.setText('CalendarAutoSourceTestSelection','text',undefined,'[['+registeredMedicine+']]'),registeredMedicine);
  await expect(medicineEvents).toHaveCount(1);
  await page.evaluate(()=>$tw.wiki.setText('$:/language','text',undefined,'$:/languages/en-GB'));
  await expect(settings.getByRole('checkbox',{name:'Medicine check-ins',exact:true})).toBeChecked();
  assert.deepEqual(errors,[]);
  console.log('PASS: automatic shadow source, native switches, persisted choice, dynamic registration and updates, independent sources, per-widget selection, EN/ZH');
 } finally {
  if(previous) {
   await page.evaluate(({previous,medicine,log,source,story})=>{
    for(const title of [medicine,log,source,story,'CalendarAutoSourceTestSelection'])$tw.wiki.deleteTiddler(title);
    for(const item of previous){if(item.exists)$tw.wiki.addTiddler(item.fields);else $tw.wiki.deleteTiddler(item.title);}
   },{previous,medicine,log,source,story});
   await page.waitForTimeout(1000);
  }
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exit(1);});
