"use strict";
const DAY = 86400000;
const TYPES = ["date", "daily-count", "day-interval", "daily-count-rle"];
function dayKey(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function localDate(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error("InvalidDate");
  const [y,m,d] = key.split("-").map(Number);
  const date = new Date(y,m-1,d,12);
  if (dayKey(date) !== key) throw new Error("InvalidDate");
  return date;
}
function decode(data, type) {
  if (!TYPES.includes(type)) throw new Error("UnknownFormat");
  const events = [];
  const push = time => {
    if (!Number.isFinite(new Date(time).getTime())) throw new Error("InvalidTimestamp");
    events.push(Math.round(time));
  };
  for (const [key, raw] of Object.entries(data)) {
    const value = String(raw);
    if (type === "date") { push(Number(value)); continue; }
    const end = Number(key.slice(type.length));
    if (type === "day-interval") {
      const intervals = value.split(",").map(Number);
      if (intervals.some(n=> !Number.isFinite(n) || n < 0)) throw new Error("InvalidInterval");
      let time = end;
      for (let i=intervals.length-1;i>=0;i--) {
        if (intervals[0] === 0) {push(time);time -= intervals[i]*DAY;}
        else {time -= intervals[i]*DAY;push(time);}
      }
    } else {
      const counts = [];
      for (const token of value.split(",")) {
        const match = type === "daily-count-rle" ? /^(\d+)(?:\*(\d+))?$/.exec(token) : /^(\d+)$/.exec(token);
        if (!match) throw new Error("InvalidCount");
        const count = Number(match[1]), length = Number(match[2] || 1);
        if (!Number.isSafeInteger(count) || !Number.isSafeInteger(length) || length < 1) throw new Error("InvalidCount");
        for(let i=0;i<length;i++) counts.push(count);
      }
      counts.forEach((count,index)=> {
        const date = new Date(end);
        date.setDate(date.getDate() - (counts.length-1-index));
        date.setHours(12,0,0,0);
        for(let i=0;i<count;i++) push(date.getTime());
      });
    }
  }
  return events.sort((a,b)=>a-b);
}
function encode(events, type) {
  if (!TYPES.includes(type)) throw new Error("UnknownFormat");
  const sorted = [...events].sort((a,b)=>a-b), data = {};
  if (type === "date") {sorted.forEach((t,i)=> {data[i]=String(t);});return data;}
  if (type === "day-interval") {
    // Each row stores at most 30 events. Last timestamp is the anchor;
    // [0, gap1, gap2, ...] is traversed backwards by readers.
    for(let i=0;i<sorted.length;i+=30) {
      let row=sorted.slice(i,i+30);
      // Keep simultaneous events in the same row so anchors cannot collide.
      while(i+row.length<sorted.length && sorted[i+row.length]===row[row.length-1]) row.push(sorted[i+row.length]);
      data[`${type}${row[row.length-1]}`] = row.map((t,j)=>j===0 ? "0" : String((t-row[j-1])/DAY)).join(",");
      i += row.length-30;
    }
    return data;
  }
  const days = new Map();
  sorted.forEach(t=>{const key=dayKey(t);days.set(key,(days.get(key)||0)+1);});
  const keys=[...days.keys()].sort();
  // Calendar months bound rows; calendar arithmetic also handles DST.
  for(let i=0;i<keys.length;) {
    const month=keys[i].slice(0,7), first=localDate(keys[i]), values=[];
    let last=keys[i];
    while(i<keys.length && keys[i].startsWith(month)) last=keys[i++];
    const date=new Date(first);
    while(dayKey(date)<=last) {values.push(days.get(dayKey(date))||0);date.setDate(date.getDate()+1);}
    let tokens=values.map(String);
    if(type==="daily-count-rle") {
      tokens=[];
      for(let j=0;j<values.length;) {const count=values[j];let k=j+1;while(k<values.length&&values[k]===count) k++;tokens.push(k-j>1?`${count}*${k-j}`:String(count));j=k;}
    }
    const end=localDate(last);end.setHours(0,0,0,0);
    data[`${type}${end.getTime()}`]=tokens.join(",");
  }
  return Object.fromEntries(Object.entries(data).reverse());
}
function read(wiki,title,fallback="date") {
  const tiddler=wiki.getTiddler(title);
  return {type:tiddler?.fields["activity-log-type"]||fallback, data:wiki.getTiddlerData(title,{}), dayCounts:JSON.parse(tiddler?.fields["activity-log-day-counts"] || "{}")};
}
function save(wiki,title,type,data,extra={}) {
  const old=wiki.getTiddler(title);
  wiki.addTiddler(new $tw.Tiddler(old, wiki.getModificationFields(), {title,type:"application/x-tiddler-dictionary", "activity-log-type":type, "hide-body":"yes",tags:[...new Set([...(old?.fields.tags||[]),"$:/Tags/ActivityLog"])],...extra}));
  wiki.setTiddlerData(title,data);
  const fields = {...wiki.getTiddler(title).fields};
  for (const key of Object.keys(fields)) if (TYPES.some(prefix=>key.startsWith(prefix))) delete fields[key];
  wiki.addTiddler(new $tw.Tiddler(fields));
}
function countDays(events) {
  const counts = {};
  for (const time of events) {const day = dayKey(time); counts[day] = (counts[day] || 0) + 1;}
  return counts;
}
exports.countDays=countDays;
exports.DAY=DAY;exports.TYPES=TYPES;exports.dayKey=dayKey;exports.localDate=localDate;
exports.decode=decode;exports.encode=encode;exports.read=read;exports.save=save;
