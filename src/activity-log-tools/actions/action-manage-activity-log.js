"use strict";
const Widget = require("$:/core/modules/widgets/widget.js").widget;
const codec = require("../log-file-tools/activityLogCodec");
const undo = require("../log-file-tools/conversionUndo");
const {lingo} = require("../utils/lingo");

class ManageActivityLog extends Widget {
  render() { this.computeAttributes(); }
  refresh() { this.computeAttributes(); return false; }
  allowActionPropagation() { return false; }
  invokeAction() {
    this.computeAttributes();
    const title = this.getAttribute("$logTitle");
    try {
      const current = codec.read(this.wiki, title, "daily-count");
      const events = codec.decode(current.data, current.type);
      const operation = this.getAttribute("$operation");
      let message;
      if (operation === "convert") {
        const type = this.getAttribute("$format");
        if (type === current.type) return true;
        const data = codec.encode(events, type);
        undo.save(this.wiki, title);
        const dayCounts = current.type.startsWith("daily-count") ? codec.countDays(events) : current.dayCounts;
        const precision = !type.startsWith("daily-count") && Object.keys(dayCounts).length ? JSON.stringify(dayCounts) : undefined;
        codec.save(this.wiki, title, type, data, {"activity-log-day-counts": precision});
        message = lingo("Notification/Converted");
      } else if (operation === "restore") {
        undo.restore(this.wiki, title);
        message = lingo("Notification/Restored");
      } else {
        let day;
        if (operation === "yesterday") {const date = new Date(); date.setDate(date.getDate() - 1); day = codec.dayKey(date);}
        else if (operation === "date") day = this.getAttribute("$date", "");
        const timestamp = codec.localDate(day).getTime();
        if (day > codec.dayKey(Date.now())) throw new Error("DateInFuture");
        events.push(timestamp);
        current.dayCounts[day] = (current.dayCounts[day] || 0) + 1;
        codec.save(this.wiki, title, current.type, codec.encode(events, current.type), {
          "activity-log-day-counts": current.type.startsWith("daily-count") ? undefined : JSON.stringify(current.dayCounts)
        });
        message = lingo("Notification/Recorded", {date: day, count: events.filter(t => codec.dayKey(t) === day).length});
      }
      this.notify(message);
      return true;
    } catch (error) {this.notify(lingo("Error/" + error.message)); return false;}
  }
  notify(message) {
    this.dispatchEvent({type: "tm-notify", param: "$:/plugins/linonetwo/activity-log-tools/notifications/Message", paramObject: {message}});
  }
}
exports["action-manage-activity-log"] = ManageActivityLog;
