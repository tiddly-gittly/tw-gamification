const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1100},timezoneId:'Asia/Shanghai'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8093');await page.waitForFunction(()=>!!window.$tw?.wiki);
 const title='ActivityLogBrowserTest';
 await page.evaluate(title=>{
  $tw.wiki.setText('$:/language','text',undefined,'$:/languages/zh-Hans');
  const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');
  c.save($tw.wiki,title,'date',c.encode([c.localDate('2026-10-01').getTime()+12345],'date'),{'activity-log-day-counts':undefined});
  $tw.wiki.addTiddler({title:'$:/config/AnimationDuration',text:'0'});
  $tw.wiki.addTiddler({title:'$:/StoryList',list:[title]});
 },title);
 const article=page.locator('[data-tiddler-title="'+title+'"]');await article.getByRole('button',{name:'补昨天',exact:true}).waitFor();
 const info=()=>page.evaluate(title=>{const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');const {type,data}=c.read($tw.wiki,title);const events=c.decode(data,type),days={};events.forEach(t=>{const d=c.dayKey(t);days[d]=(days[d]||0)+1;});return {type,events,days};},title);
 const original=await info();
 await article.getByRole('button',{name:'补昨天',exact:true}).click();assert.equal((await info()).events.length,2);
 await article.getByRole('button',{name:'补指定日期',exact:true}).click();
 const modal=page.locator('.tc-modal');await modal.waitFor();assert.equal(await page.locator('.tc-modal-wrapper').count(),1);
 await modal.locator('input[type="date"]').fill('2026-09-12');await modal.getByRole('button',{name:'补记一次',exact:true}).click();assert.equal((await info()).days['2026-09-12'],1);
 await modal.locator('input[type="date"]').fill('2099-01-01');await modal.getByRole('button',{name:'补记一次',exact:true}).click();assert.equal((await info()).events.length,3);await expect(page.locator('.tc-notification').last()).toContainText('请选择今天或过去');assert.equal(await modal.getByText('请选择今天或过去的日期',{exact:true}).count(),0);
 await modal.getByRole('button',{name:'关闭',exact:true}).click();await page.waitForTimeout(100);
 await article.getByRole('button',{name:'选择记录格式',exact:true}).click();await modal.waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('.tc-modal [_echarts_instance_]')].every(el=>echarts.getInstanceByDom(el)?.getOption().series?.length>0));
 const dimensions=await modal.locator('[_echarts_instance_]').first().evaluate(el=>echarts.getInstanceByDom(el).getOption().yAxis[0].data);assert.equal(dimensions.length,4);
 const tooltip=await modal.locator('[_echarts_instance_]').first().evaluate(el=>{const o=echarts.getInstanceByDom(el).getOption();return o.tooltip[0].formatter(o.series.map((s,i)=>({dataIndex:0,seriesIndex:i,marker:'',seriesName:s.name,value:s.data[0]})));});assert.match(tooltip,/新打卡显示具体时间/);assert.doesNotMatch(tooltip,/仍按天显示/);assert.match(tooltip,/按天显示打卡次数/);
 await expect(modal.getByRole('button',{name:'切换到时间戳',exact:true})).toHaveCount(0);
 const before=(await info()).days;
 for(const name of ['切换到游程编码','切换到时间戳','切换到时间间隔','切换到每日次数']){await modal.getByRole('button',{name,exact:true}).click();assert.deepEqual((await info()).days,before);await expect(modal.getByRole('button',{name,exact:true})).toHaveCount(0);}
 await modal.getByRole('button',{name:'撤销上次转换',exact:true}).click();assert.equal((await info()).type,'day-interval');
 // All user-facing controls, chart labels and notifications follow the wiki language.
 await page.evaluate(()=>$tw.wiki.setText('$:/language','text',undefined,'$:/languages/en-GB'));
 await modal.getByRole('button',{name:'Use timestamps',exact:true}).waitFor();
 await modal.getByRole('button',{name:'Use timestamps',exact:true}).click();await expect(page.locator('.tc-notification').last()).toContainText('Format changed');
 await page.waitForFunction(()=>[...document.querySelectorAll('.tc-modal [_echarts_instance_]')].some(el=>echarts.getInstanceByDom(el)?.getOption().yAxis?.[0]?.data?.includes('Storage efficiency')));
 const axes=await modal.locator('[_echarts_instance_]').first().evaluate(el=>echarts.getInstanceByDom(el).getOption().yAxis[0].data);assert.ok(axes.includes('Storage efficiency'));
 await page.evaluate(()=>$tw.wiki.setText('$:/language','text',undefined,'$:/languages/zh-Hans'));
 await modal.getByRole('button',{name:'切换到每日次数',exact:true}).waitFor();await expect(modal.getByRole('button',{name:'切换到时间戳',exact:true})).toHaveCount(0);
 // Switching palettes updates native controls and the ECharts theme.
 const palette=await page.evaluate(()=>{const p=$tw.wiki.filterTiddlers('[all[tiddlers+shadows]field:color-scheme[dark]]')[0];if(p)$tw.wiki.setText('$:/palette','text',undefined,p);return p;});assert.ok(palette);
 await page.waitForFunction(()=>[...document.querySelectorAll('.tc-modal [_echarts_instance_]')].every(el=>echarts.getInstanceByDom(el)?.getOption().darkMode===true));
 await modal.screenshot({path:'activity-preview-format-dark.png'});
 await page.evaluate(()=>$tw.wiki.setText('$:/palette','text',undefined,'$:/palettes/Vanilla'));
 await page.waitForTimeout(1200);
 await modal.getByRole('button',{name:'关闭',exact:true}).click();
 await page.evaluate(({title,original})=>{const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');c.save($tw.wiki,title,'date',c.encode(original.events,'date'),{'activity-log-day-counts':undefined});},{title,original});
 await article.getByRole('button',{name:'选择记录格式',exact:true}).click();await modal.getByRole('button',{name:'切换到每日次数',exact:true}).click();await expect(page.locator('.tc-notification').last()).toContainText('已切换');assert.equal(await modal.getByText('已切换',{exact:true}).count(),0);await modal.getByRole('button',{name:'撤销上次转换',exact:true}).click();assert.deepEqual((await info()).events,original.events);
 await modal.getByRole('button',{name:'关闭',exact:true}).click();
 // Undo uses module memory; it creates no backup tiddlers and disappears after reload.
 await article.getByRole('button',{name:'选择记录格式',exact:true}).click();await modal.getByRole('button',{name:'切换到每日次数',exact:true}).click();
 assert.equal(await page.evaluate(()=>$tw.wiki.filterTiddlers('[prefix[$:/activity-log-tools/backups/]]').length),0);
 const converted=await info();await page.waitForFunction(()=>!$tw.syncer||!Object.keys($tw.syncer.taskQueue||{}).length);await page.waitForTimeout(1500);await page.reload();await page.waitForFunction(()=>!!window.$tw?.wiki);
 assert.equal((await info()).type,converted.type);await article.getByRole('button',{name:'选择记录格式',exact:true}).click();await modal.waitFor();assert.equal(await modal.getByRole('button',{name:'撤销上次转换',exact:true}).count(),0);
 await modal.getByRole('button',{name:'关闭',exact:true}).click();
 await page.evaluate(({title,original})=>{const c=$tw.modules.execute('$:/plugins/linonetwo/activity-log-tools/log-file-tools/activityLogCodec');c.save($tw.wiki,title,'date',c.encode(original.events,'date'),{'activity-log-day-counts':undefined});},{title,original});
 // The existing health button respects the converted log format.
 await page.evaluate(title=>$tw.wiki.invokeActionString('<$action-add-activity-to-log $logTitle="'+title+'" $logType="daily-count"/>',null,{},{}),title);assert.equal((await info()).type,'date');assert.equal((await info()).events.length,2);
 // The panel contains no maintenance controls; title opens an empty log with its view template.
 await page.evaluate(()=>{$tw.wiki.addTiddler({title:'未打卡示例',caption:'未打卡示例',tags:['$:/tags/HealthTracker/Medicine']});$tw.wiki.addTiddler({title:'$:/StoryList',list:['打卡工作台']});});
 const panel=page.locator('.health-buff-debuff-tracker-checkin-container');assert.equal(await panel.getByRole('button',{name:'补昨天',exact:true}).count(),0);
 await panel.getByRole('link',{name:'未打卡示例',exact:true}).click();
 await page.getByRole('button',{name:'补指定日期',exact:true}).first().waitFor();
 assert.equal(await page.locator('.al-manager').count(),0);
 // Clean demo view, with real chart data and screenshots.
 await page.evaluate(()=>{$tw.wiki.addTiddler({title:'$:/StoryList',list:['打卡记录 · 本地演示','打卡工作台']});});await page.waitForTimeout(1800);
 const chartData=await page.evaluate(()=>[...document.querySelectorAll('.health-buff-debuff-tracker-checkin-minichart [_echarts_instance_]')].map(el=>({height:el.clientHeight,data:echarts.getInstanceByDom(el).getOption().series[0].data})));assert.ok(chartData.some(c=>c.height>0&&c.data.some(n=>n>0)));
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'activity-preview.png',fullPage:true});
 await page.getByRole('button',{name:'选择记录格式',exact:true}).first().click();await page.waitForTimeout(1500);await modal.screenshot({path:'activity-preview-format.png'});
 await modal.getByRole('button',{name:'关闭',exact:true}).click();
 await page.getByRole('button',{name:'补指定日期',exact:true}).first().click();await modal.screenshot({path:'activity-preview-date.png'});await modal.getByRole('button',{name:'关闭',exact:true}).click();
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: native modals, date backfill, future rejection, 4 formats, memory-only undo, Chinese/English translations, native notifications, ECharts comparison and mini curves, dark palette, no panel maintenance buttons, empty-log title navigation');
})().catch(e=>{console.error(e);process.exit(1);});
