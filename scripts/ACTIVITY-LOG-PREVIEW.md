# 本地打卡预览

在 `tw-gamification` 安装依赖后运行：

```sh
pnpm install --ignore-scripts
node scripts/preview-activity-log.cjs ../health-buff-debuff-tracker
node node_modules/tiddlywiki/tiddlywiki.js .preview-activity --listen port=8093 host=0.0.0.0
```

打开 http://127.0.0.1:8093 。这是真实的 TiddlyWiki，操作保存到 `.preview-activity`，不修改原仓库的 wiki 数据。重新执行预览构建会重置示例记录。

## 功能与格式

- 日志视图：补昨天、核心模态框选择日期；每点一次增加一次。
- 健康插件：保留原打卡按钮与 ECharts 折线图；标题链接随时打开日志。补打卡和格式选择仅在日志视图中提供。
- `date`：每次活动的毫秒时间戳。
- `daily-count`：每个自然日的次数，以月份分行；不保留具体时刻。
- `daily-count-rle`：与每日次数相同，但 `次数*天数` 压缩连续相同值，例如 `1*7,0*2,2`；不保留具体时刻。
- `day-interval`：最新时间作锚点，保存 `[0, gap1, gap2, ...]`，间隔单位为天；新版不主动舍入。兼容旧版非零起始的间隔数据，旧版已丢失的精度无法恢复。

核心格式模态框通过 ECharts 展示多维度分组柱状图，存储效率的工具提示包含实际字节数，原生按钮切换格式，无新增 CSS。大小为当前数据转换后的字典正文 UTF-8 字节数，包含键、值、分隔符和换行，包含只有日期的历史记录所需的计数字段，不含其他条目字段。并非所有数据都适合压缩。

转换前的条目只保留在模块内存中，用于“撤销上次转换”；不写入备份条目，刷新页面后清除。撤销会恢复转换前的完整条目。每日次数切回时间戳时用当地中午表示，不能重建历史实际时刻；`activity-log-day-counts` 字段记录只有日期的次数，新打卡保留真实时间。选择日期补打卡也按当地中午记录。

## 验证

```sh
TZ=Asia/Shanghai node --test tests/activity-log-codec.cjs tests/activity-log-range.cjs
TZ=America/New_York node --test tests/activity-log-codec.cjs tests/activity-log-range.cjs
node tests/activity-log-browser.cjs
node tests/activity-log-calendar.cjs
node tests/activity-log-calendar-points.cjs
node tests/activity-log-medicine-calendar.cjs
node tests/activity-log-event-sources.cjs
```

浏览器测试使用 `@playwright/test`，需要 Chromium。可用 `CHROMIUM_PATH` 指定本地浏览器，`BASE_URL` 指定 wiki 地址。测试使用独立的 `ActivityLogBrowserTest` 日志。

```sh
pnpm exec tiddlywiki-plugin-dev build --exclude '[all[]!prefix[$:/plugins/linonetwo/activity-log-tools]]' --output /tmp/activity-log-build
```

## 日历联动

四种格式均支持日历。时间戳、时间间隔显示具体时间；每日次数、游程编码显示全天次数。由日级格式转成时间戳或间隔时，历史记录按全天显示，新打卡按具体时间显示。

有时刻的打卡在一日和周视图中显示为紧凑圆点与单行标签，月视图使用 FullCalendar 的 `list-item` 圆点。使用官方 `eventContent`、`eventClassNames` 接口和主题色。FullCalendar 会把缺少或等于开始时间的结束时间补为一小时，因此仅在传给日历的显示数据中使用开始时间加一毫秒，让库按最小高度排列时间点；原始筛选器输出和日志仍不含持续时间。普通日程保留原时长，日级记录仍在全天栏。

`activityevents<start>,<end>` 返回范围内的事件 JSON；`:titles` 返回含打卡的日志标题；`:timestamps` 返回对应的太微时间戳。开始包含、结束不包含，`YYYY-MM-DD` 使用本地日期，太微时间戳使用 UTC。索引使用太微条目缓存，改动日志后自动失效，每日次数不展开成多份事件。

```wikitext
[tag[$:/Tags/ActivityLog]activityevents:titles<start>,<end>]
[tag[$:/Tags/ActivityLog]activityevents<start>,<end>]
<$calendar filter="[all[]limit[0]]" eventSources="" eventFilter="[tag[$:/Tags/ActivityLog]activityevents<calendarStart>,<calendarEnd>]" />
```

日历的 `eventFilter` 接收 FullCalendar 事件 JSON 列表，提供 `calendarStart`、`calendarEnd`（UTC 太微时间戳）。点击打卡事件打开日志，不创建每次打卡的独立条目。

太微 5.4.0 起支持多值变量，可直接保留整个筛选器输出：

```wikitext
<$let events={{{ [tag[$:/Tags/ActivityLog]activityevents<start>,<end>] }}}>
<$list filter="[(events)]" variable="event">
<$text text={{{ [<event>jsonget[title]] }}}/> · <$text text={{{ [<event>jsonget[timestamp]] }}}/><br/>
</$list>
</$let>
```

筛选器本身仍返回字符串列表，所以每个事件用一条 JSON 同时携带标题、时间和次数。采用 `:map:flat` 也可在映射后保留同一日志的多个结果。

复现日历联动时，先在 `tiddlywiki-calendar` 构建本地插件，再在创建预览时传入构建产物：

```sh
# 在 tiddlywiki-calendar 目录
pnpm exec tiddlywiki-plugin-dev build --exclude '[all[]!prefix[$:/plugins/linonetwo/tw-calendar]]' --output /tmp/calendar-activity-build
# 在 tw-gamification 目录
node scripts/preview-activity-log.cjs ../health-buff-debuff-tracker --calendar-plugin '/tmp/calendar-activity-build/$__plugins_linonetwo_tw-calendar.json'
node ../tiddlywiki-calendar/node_modules/tiddlywiki/tiddlywiki.js .preview-activity --listen port=8093 host=0.0.0.0
```

`--source-only` 只更新源码，保留已操作的演示记录。首次完整生成会重置示例记录。多值变量示例使用太微 5.4.0 以上；日期筛选器本身不依赖多值变量语法。

## 标准日程和一日视图

安装健康记录、活动日志工具和日历插件后，药物打卡自动加载。打开控制面板 → 设置 → 日历 → 日历数据源，可以通过原生复选框启用或关闭“药物打卡”；刷新后保留选择。切换日历顶部“1日”，或在默认视图设置中选择“1日”。无需给日志添加 `calendarEntry`，也无需手填筛选器。

插件数据源通过 `$:/tags/Calendar/EventSource` 标签注册，`filter` 字段提供事件 JSON 筛选器，`caption` 和 `description` 在设置列表中显示并支持国际化。筛选器获得 `calendarStart`、`calendarEnd` 和数据源自身的 `currentTiddler`。禁用项保存在 `$:/plugins/linonetwo/tw-calendar/settings/disabledEventSources` 的 `list` 字段中。

嵌入日历默认加载已启用的数据源，可用 `eventSources=""` 关闭自动加载，或用 `eventSources` 筛选器选择数据源条目。“补充事件筛选器”继续用于自定义事件。
