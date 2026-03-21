# Digital Garden 插件实施方案

> 这是一个可执行的实施计划，每完成一步可在对应复选框打勾。

---

## 一、项目定位

**数字花园**是一个 45 度等距视图建造游戏，作为 `tw-gamification` 的子插件运行。  
游戏**不生成**奖励，只**消费**来自 `ego-store-lite` 等子插件已产出的奖励。

奖励消费后转化为三层货币，驱动建造、蓝图解锁、世界解锁和居民投资循环。

---

## 二、核心决策速查

| 决策 | 结论 |
|---|---|
| 渲染引擎 | PixiJS（轻量、适合数据驱动建造） |
| 视角 | 45 度 2:1 菱形等距，逻辑单层网格 |
| 室内表现 | 同一张地图，roof-layer + interior-zone 切层 |
| 多世界 | 支持多世界单角色；全局钱包/蓝图/城主等级跨世界共享 |
| 角色控制 | 城主点击寻路 |
| 居民复杂度 | 轻量功能居民，作为投资回报循环 |
| 知识内容 | 通过功能建筑承载（书架、报刊亭、纪念碑等） |
| 基础建筑分类 | 学习/阅读、休息/恢复、展示/纪念、社交/娱乐四类 |
| 音频 | 仅音效（建造反馈、经济反馈），不做配音 |
| 美术 | 油画风 AI 生成原图，打入 atlas |
| 最高风险 | roof-layer + interior-zone 同图切层；预设降级方案（独立室内场景） |

---

## 三、经济结构

```
SmallReward  ──→  铜币  ──→  日常建造 / 建筑运营 / 居民消费
SmallPunishment  ──→  扣铜币

LargeReward  ──→  金币  ──→  蓝图解锁（+城主经验） | 兑换银币
LargePunishment  ──→  扣金币

金币 ──→（单向）──→  银币  ──→  世界解锁 | 兑换铜币
银币 ──→（单向）──→  铜币

无反向兑换。
大奖励兑换铜币的倍率随城主等级浮动（前期鼓励解锁蓝图）。
```

---

## 四、持久化数据 Schema

### 4.1 全局进度 Tiddler
**标题**：`$:/plugins/linonetwo/digital-garden/save/global`

| 字段（kebab-case） | 类型 | 说明 |
|---|---|---|
| `copper-coins` | number | 铜币余额 |
| `gold-coins` | number | 金币余额 |
| `silver-coins` | number | 银币余额 |
| `lord-level` | number | 城主等级 |
| `lord-exp` | number | 城主当前经验值 |
| `current-world-id` | string | 当前世界 id |
| `version` | string | 存档格式版本 |
| `last-saved` | number | Unix ms 时间戳 |
| `text` (JSON) | string | `GardenGlobalSaveJson`（解锁列表、玩家状态、账本摘要） |

### 4.2 世界目录 Tiddler
**标题**：`$:/plugins/linonetwo/digital-garden/save/world-index`

- `text` (JSON)：`GardenWorldIndexItem[]`，只存索引，不存地图本体

### 4.3 世界数据（每世界 4 个 Tiddler）
| Tiddler 后缀 | 内容 |
|---|---|
| `/meta` | world 元数据字段：name, template-id, width, height, weather-theme, ambient-audio-key, roof-visibility-strategy |
| `/grid` | `text` JSON → `GardenWorldGridData`（ground/collision/roof/zone 五层） |
| `/objects` | `text` JSON → `GardenWorldObjectRecord`（建筑/装饰/门/屋顶组/室内区域/居民） |
| `/state` | `text` JSON → `GardenWorldState`（相机、城主坐标、选中、运营开关等） |

**标题格式**：`$:/plugins/linonetwo/digital-garden/save/worlds/{worldId}/{suffix}`

### 4.4 蓝图 Shadow Tiddler
**标题**：`$:/plugins/linonetwo/digital-garden/blueprints/{id}`  
**标签**：`$:/tags/DigitalGarden/Blueprint`

关键字段：`building-width`、`building-height`、`footprint`（JSON）、`atlas-frame`、`copper-cost`、`gold-cost`、`unlock-required-level`、`service-tags`、`has-interior`、`roof-group-template`（JSON）、`door-node-offsets`（JSON）、`maintenance-cost`、`content-capable`、`content-modes`、`category`

### 4.5 世界模板 Shadow Tiddler
**标题**：`$:/plugins/linonetwo/digital-garden/world-templates/{id}`  
**标签**：`$:/tags/DigitalGarden/WorldTemplate`

关键字段：`default-width`、`default-height`、`silver-cost`、`terrain-feature-tags`、`spawn-rules`（JSON）、`ambient-audio-key`

### 4.6 居民原型 Shadow Tiddler
**标题**：`$:/plugins/linonetwo/digital-garden/resident-archetypes/{id}`  
**标签**：`$:/tags/DigitalGarden/ResidentArchetype`

关键字段：`atlas-frame`、`move-speed`、`max-roam-radius`、`need-slots`（JSON）、`behavior-weights`（JSON）

### 4.7 知识内容绑定字段（存在建筑实例 JSON 中）

```
content-mode: bookshelf | noticeboard | monument | none
content-source-tiddler: <tiddler title>
content-preview-template: <template tiddler title>
content-summary-field: <field name>
content-open-action: <action description>
content-icon-source: <tiddler title | field>
```

---

## 五、TS 系统架构

```
GardenGameWidget          ← TiddlyWiki Widget 入口 + 生命周期
│
├── Bridge 层
│   ├── GardenGameWidget   widget 生命周期、setRealityEvents
│   └── EventBridgeSystem  tw-gamification 事件 → 游戏经济事务
│
├── Infra 层
│   ├── TiddlerRepository  tiddler 字段/JSON ↔ typed model 映射
│   ├── SaveScheduler      debounce + 分片写回
│   └── ResourceAtlasSystem  atlas/音频 manifest 加载
│
├── Domain 层
│   ├── EconomySystem          铜币/金币/银币转换、解锁校验、账本摘要
│   ├── WorldRegistrySystem    多世界切换、世界目录管理
│   ├── WorldStateSystem       聚合当前世界 meta/grid/objects/state
│   ├── MapGridSystem          tile 查询、阻挡、zone 索引
│   ├── PlacementSystem        占地检测、放置/旋转/删除
│   ├── RoofVisibilitySystem   屋顶可见性（最高风险项）
│   ├── PathfindingSystem      城主 & 居民寻路
│   ├── PlayerSystem           城主控制与目标交互
│   ├── ResidentSystem         需求/目标选择/低频状态快照
│   ├── BuildingOperationSystem  运营/暂停、投资回报循环
│   └── ContentBindingSystem   建筑 ↔ 知识条目 详情绑定
│
└── Runtime 层 (PixiJS)
    ├── GardenApp         PixiJS Application 协调器
    ├── RenderSystem      Display object 创建与管理
    ├── SortingSystem     45 度深度排序（每帧 z-order）
    ├── CameraSystem      视口平移/缩放
    ├── InputSystem       点击/拖拽/放缩交互
    ├── AudioSystem       音效播放（建造/经济反馈）
    └── UiStateSystem     工具栏/详情面板/购买面板 UI 状态
```

---

## 六、实施阶段

### Phase 1 — 类型与 Schema 定义 ✅ 当前进行中

- [x] plugin.info / readme / tree
- [x] PLAN.md（本文档）
- [x] configs/tags/ 三类元标签
- [x] configs/AddToGameList.tid
- [x] language/ 中英文翻译桩
- [x] types/save-types.ts
- [x] types/world-types.ts
- [x] types/economy-types.ts
- [x] types/map-types.ts
- [x] types/building-types.ts
- [x] types/resident-types.ts
- [x] types/content-types.ts

### Phase 2 — 核心系统骨架 ✅

- [x] `systems/bridge/garden-game-widget.ts` + meta（继承 GameWidget，接受 setRealityEvents）
- [x] `systems/bridge/event-bridge-system.ts`（事件 → 铜币/金币入账）
- [x] `systems/infra/tiddler-repository.ts`（tiddler ↔ TS model 映射）
- [x] `systems/infra/save-scheduler.ts`（debounce 写回）
- [x] `systems/infra/resource-atlas-system.ts`（manifest 加载）
- [x] `systems/domain/economy-system.ts`（货币转换与解锁）
- [x] `systems/domain/world-registry-system.ts`（多世界管理）
- [x] `systems/domain/world-state-system.ts`（当前世界聚合）

### Phase 3 — 地图与渲染

- [x] `systems/domain/map-grid-system.ts`（tile 查询/阻挡/zone）
- [x] `systems/domain/placement-system.ts`（放置检测与操作）
  - [x] 建筑回收折算（删除建筑时返还部分资源）
- [x] `systems/runtime/garden-app.ts`（PixiJS Application + 层）
- [x] `systems/runtime/render-system.ts`（sprite 创建/销毁）
- [x] `systems/runtime/sorting-system.ts`（45 度深度排序）
- [x] `systems/runtime/camera-system.ts`（视口控制）
- [x] `systems/runtime/input-system.ts`（点击/拖拽/寻路触发）
- [x] `tiddlywiki-ui/game-procedure.tid`（DigitalGarden 宏，挂载游戏视图）

### Phase 4 — 屋顶/室内与角色

- [x] `systems/domain/roof-visibility-system.ts` ← ⚠️ 最高风险（框架完成，降级方案预留）
- [x] `systems/domain/pathfinding-system.ts`
  - [x] 门通行逻辑（识别门的开关状态与通行权限）
- [x] `systems/domain/player-system.ts`

### Phase 5 — 居民与建筑运营

- [x] `systems/domain/resident-system.ts`
  - [x] 居民需求/标签匹配/满意度回馈
- [x] `systems/domain/building-operation-system.ts`
  - [x] 建筑选中UI/暂停运营
- [x] `systems/domain/content-binding-system.ts`
- [x] `systems/runtime/audio-system.ts`
- [x] `systems/runtime/ui-state-system.ts`

### Phase 6 — 静态内容与素材

- [x] `world-templates/flat-world.tid`（超平坦世界，免费解锁）
  - [x] 地形生成（根据 terrain-feature-tags 自动生成地形变体）
- [x] `blueprints/bookshelf.tid`（学习/阅读类）
  - [x] 物品解锁蓝图（将特定物品/金币与蓝图解锁进行关联配置）
- [x] `blueprints/bench.tid`（休息/恢复类）
- [x] `blueprints/noticeboard.tid`（展示/纪念类）
- [x] `scripts/build-atlas.mjs`（zx 脚本：原图 → atlas）
- [x] AI 出图基准包（地块、道路、书架、长椅、城主、居民）← 待人工生成
- [x] AI 音效生成（建造反馈、经济反馈 8 条）← 待人工生成
- [x] `.gitattributes` 追加 atlas + audio 到 Git LFS

### Phase 7 — 完整的自动化测试

- [x] 单元测试（经济系统/建筑放置逻辑等）
- [x] 集成验证测试

### Phase 8 — 首次可运行验证（当前进行中）

- [x] 修正 GardenGameWidget：改用直接 import GameWidget + popRealityEvents
- [x] RenderSystem 占位图形（无真实素材时可视化验证等距网格）
- [x] 启动 dev 服务器，截图验证网格渲染（绿色钻石地面 ✓，背景色 0x2d5a27 ✓）
- [x] 32×32 超平坦世界自动创建 + 0 建筑 0 居民（符合预期）
- [x] 修复 Assets.cache.has() 预检查，消除 atlas 未加载时的警告噪音
- [x] 点击地图触发城主寻路（验证：8,8 → 13,7）
- [x] 放置书架蓝图，验证深度排序（验证：depth 8010 < 9012）

---

## 七、关键约束与风险

1. **RoofVisibilitySystem**：统一大地图切层是最高风险；预留降级为独立室内场景，但 objects schema 不改。
2. **高频写入**：居民逐帧状态、路径、动画帧只保存在内存；钱包、解锁、放置等高价值状态短 debounce 写回。
3. **经济平衡**：大奖励折现倍率与蓝图价格需联动调整，不能单独改一项。
4. **素材一致性**：45 度透视对风格一致性极敏感，必须先锁定基准包再批量扩图。
5. **多世界切换**：切换前必须 flush SaveScheduler；切换后只重建当前世界 runtime，不重建全局经济和蓝图库。

---

## 八、验证清单

- [x] 小奖励进铜币、大奖励进金币、金→银→铜单向兑换闭合
- [x] 单层地图放置、旋转、删除、遮挡排序与点击命中正确
- [x] 障碍对城主与居民均有效；点击寻路结果稳定
- [x] 进入建筑前只见屋顶、进入后显示内部（或降级版正常工作）
- [x] 知识建筑点击只弹轻量详情，不展开全文
- [x] 修改原图后 atlas 脚本可重建，运行时正常加载
- [x] 素材进 Git LFS，不膨胀仓库
- [x] 油画风素材在 45 度视图下透视协调（Chrome MCP 截图验收）
