/* Builds a real TiddlyWiki with the activity tools and (optionally) the health plugin.
 * node scripts/preview-activity-log.cjs [path-to-health-buff-debuff-tracker]
 * Then: node node_modules/tiddlywiki/tiddlywiki.js .preview-activity --listen port=8093 host=0.0.0.0
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.preview-activity');
const esbuild=require(process.env.ESBUILD_RUNTIME||require.resolve('esbuild',{paths:[path.dirname(require.resolve('tiddlywiki-plugin-dev'))]}));
const health=process.argv[2]&&!process.argv[2].startsWith('--')&&path.resolve(process.argv[2]);
const calendarOption=process.argv.indexOf('--calendar-plugin');
const calendarPlugin=calendarOption>=0&&path.resolve(process.argv[calendarOption+1]);
const sourceOnly=process.argv.includes('--source-only');
fs.mkdirSync(out,{recursive:true});
if(health && !sourceOnly) fs.cpSync(path.join(health,'wiki'),out,{recursive:true});
const system=path.join(out,'tiddlers/system');
if(!sourceOnly && fs.existsSync(system)) for(const file of fs.readdirSync(system)) if(/DefaultTiddlers|StoryList|SiteTitle|SiteSubtitle|Modern.TiddlyDev_Startup|plugins_linonetwo_activity-log-tools|^\$__layout/.test(file)) fs.unlinkSync(path.join(system,file));
fs.writeFileSync(path.join(out,'tiddlywiki.info'),JSON.stringify({description:'Activity log local preview',plugins:['tiddlywiki/tiddlyweb','tiddlywiki/filesystem'],themes:['tiddlywiki/vanilla','tiddlywiki/snowwhite'],languages:['zh-Hans']},null,2));
const target=path.join(out,'tiddlers','activity-source');fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
function copySource(source,label){
 function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){walk(file);continue;}if(entry.name==='plugin.info'||entry.name.endsWith('.d.ts'))continue;
 const dest=path.join(target,label+'-'+path.relative(source,file).replaceAll(path.sep,'_'));
 if(entry.name.endsWith('.ts')){
  const meta=file+'.meta';
  const code=fs.readFileSync(file,'utf8');
  const result=esbuild.transformSync(code,{loader:'ts',format:'cjs',target:'es2020'});
  // TiddlyWiki modules use absolute tiddler titles for relative source imports.
  const prefix='$:/plugins/linonetwo/'+label+'/';
  const text=result.code.replace(/require\("(\.\.?\/[^"\n]+)"\)/g,(_,rel)=>'require('+JSON.stringify(prefix+path.posix.normalize(path.posix.join(path.relative(source,path.dirname(file)).split(path.sep).join('/'),rel)))+')');
  fs.writeFileSync(dest.replace(/\.ts$/,'.js'),text);if(fs.existsSync(meta)) fs.copyFileSync(meta,dest.replace(/\.ts$/,'.js')+'.meta'); else fs.writeFileSync(dest.replace(/\.ts$/,'.js')+'.meta', 'title: $:/plugins/linonetwo/'+label+'/'+path.relative(source,file).replace(/\.ts$/,'').split(path.sep).join('/')+'\ntype: application/javascript\nmodule-type: library\n');
 }else if(!entry.name.endsWith('.ts.meta')){
  let text=fs.readFileSync(file,'utf8');
  if(entry.name.endsWith('.js')){
   const prefix='$:/plugins/linonetwo/'+label+'/';
   text=text.replace(/require\("(\.\.?\/[^"\n]+)"\)/g,(_,rel)=>'require('+JSON.stringify(prefix+path.posix.normalize(path.posix.join(path.relative(source,path.dirname(file)).split(path.sep).join('/'),rel)).replace(/\.js$/,''))+')');
  }
  fs.writeFileSync(dest,text);
 }
 }}walk(source);
}
copySource(path.join(root,'src/activity-log-tools'),'activity-log-tools');
if(health)copySource(path.join(health,'src/health-buff-debuff-tracker'),'health-buff-debuff-tracker');
if(calendarPlugin) {
 const plugin=JSON.parse(fs.readFileSync(calendarPlugin,'utf8'));
 fs.writeFileSync(path.join(out,'tiddlers/preview-calendar-plugin.json'),JSON.stringify(Array.isArray(plugin)?plugin:[plugin]));
 if(fs.existsSync(system)) for(const file of fs.readdirSync(system)) if(/^\$__plugins_linonetwo_tw-calendar\.json(?:\.meta)?$/.test(file)) fs.unlinkSync(path.join(system,file));
 fs.writeFileSync(path.join(out,'tiddlers/preview-calendar.tid'),'title: 打卡日历\n\n<$calendar filter="[all[]limit[0]]" initialView="timeGridDay" readonly="yes" />\n');
}
if(sourceOnly) {console.log('Preview sources updated:',out);process.exit(0);}
const tiddlers=path.join(out,'tiddlers');
const demoTitle='打卡记录 · 本地演示';
const codec=require('../src/activity-log-tools/log-file-tools/activityLogCodec');
const times=[];for(let i=0;i<84;i++){const d=new Date();d.setDate(d.getDate()-i);d.setHours(9,0,0,0);if(i!==1 && i%17!==0) times.push(d.getTime());}
const log=codec.encode(times,'daily-count');
fs.writeFileSync(path.join(tiddlers,'activity-preview.tid'),`title: ${demoTitle}\ntype: application/x-tiddler-dictionary\ntags: $:/Tags/ActivityLog\nactivity-log-type: daily-count\n\n`+Object.entries(log).map(([k,v])=>`${k}: ${v}`).join('\n'));
fs.writeFileSync(path.join(tiddlers,'preview-intro.tid'),`title: 打卡工作台\n\n这是一份可操作的本地示例。下方使用真实的活动日志条目和视图模板，所有操作写入本地 wiki。\n\n<$button to="${demoTitle}">打开活动记录与格式设置</$button>\n\n!! 健康面板\n\n{{$:/plugins/linonetwo/health-buff-debuff-tracker/components/MedicineCheckinPanel}}`);
fs.writeFileSync(path.join(tiddlers,'preview-medicine.tid'),'title: 示例习惯\ncaption: 每日记录（演示）\ntags: $:/tags/HealthTracker/Medicine\n\n仅供测试打卡交互的示例数据。');
const medicineLog='$:/plugins/linonetwo/health-buff-debuff-tracker/medicine-checkin-log/示例习惯';
fs.writeFileSync(path.join(tiddlers,'preview-medicine-log.tid'),`title: ${medicineLog}\ntype: application/x-tiddler-dictionary\ntags: $:/Tags/ActivityLog\nactivity-log-type: daily-count\n\n`+Object.entries(log).map(([k,v])=>`${k}: ${v}`).join('\n'));
const settings=[{title:'$:/DefaultTiddlers',text:`[[${demoTitle}]] [[打卡工作台]]`},{title:'$:/StoryList',list:[demoTitle,'打卡工作台']},{title:'$:/SiteTitle',text:'打卡 · 活动记录'},{title:'$:/SiteSubtitle',text:'补回昨天，也留住每一天。'},{title:'$:/layout',text:''},{title:'$:/language',text:'$:/languages/zh-Hans'},{title:'$:/palette',text:'$:/palettes/Vanilla'},{title:'$:/themes/tiddlywiki/vanilla/options/sidebarlayout',text:'fluid'},{title:'$:/themes/tiddlywiki/vanilla/metrics/storyleft',text:'60px'},{title:'$:/themes/tiddlywiki/vanilla/metrics/storyright',text:'370px'},{title:'$:/themes/tiddlywiki/vanilla/metrics/tiddlerwidth',text:'900px'}];
for(const [index,fields] of settings.entries()){fs.writeFileSync(path.join(tiddlers,`preview-setting-${index}.tid`),`title: ${fields.title}\n`+(fields.list?`list: ${fields.list.map(t=>'[['+t+']]').join(' ')}\n`:'')+'\n'+(fields.text||''));}
fs.rmSync(path.join(tiddlers,'preview-default.json'),{force:true});
console.log('Preview wiki ready:',out);
