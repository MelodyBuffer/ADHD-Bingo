# ADHD Bingo 数据导入导出原理说明

## 📊 概述

原网站实现了**两套并行的导出/导入系统**，分别用于不同的使用场景：

1. **迁移码格式**（Base64编码）- 用于设备间快速迁移
2. **结构化JSON格式** - 用于跨平台数据交换（如微信小程序）

---

## 🔧 格式一：迁移码（exportAllData / importData）

### 原理

```javascript
// 导出流程
localStorage数据
  ↓
遍历所有以 'adhd_bingo_' 开头的key
  ↓
打包成 {key: value} 对象
  ↓
JSON.stringify()
  ↓
encodeURIComponent()  // 处理中文等多字节字符
  ↓
btoa()               // Base64编码
  ↓
生成一长串"迁移码"
```

### 代码实现

```javascript
function exportAllData(){
  const data = {};
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.startsWith(KP)) data[k] = localStorage.getItem(k);
  }
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function importData(){
  const raw = ta.value.trim();
  // 反向解码
  const cleaned = raw.replace(/[\s\n\r]/g, '');  // 去除换行等
  const data = JSON.parse(decodeURIComponent(escape(atob(cleaned))));

  // 旧版兼容：剥除用户前缀
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith(KP)) continue;
    let targetKey = k;
    const userPrefixMatch = k.match(/^adhd_bingo_u_.+?_(.+)$/);
    if (userPrefixMatch) {
      targetKey = KP + userPrefixMatch[1];
    }
    ls.set(targetKey, v);
  }

  loadAll(); load(); buildGrid(); render();
  showToast(`已导入 ${count} 条数据 ✓`);
}
```

### 数据示例

原始localStorage：
```
adhd_bingo_groups: [{"name":"默认分组","tasks":[...]}]
adhd_bingo_2026-03-13: {"state":[...],"order":[...]}
adhd_bingo_theme: "matcha"
```

导出后（迁移码）：
```
eyJhZGhkX2JpbmdvX2dyb3VwcyI6IntcIm5hbWVcIjpcIuWug...

...（很长的Base64字符串）
```

### 优缺点

✅ **优点**：
- 单个字符串，易于复制粘贴
- 包含所有localStorage数据，完整无损
- 适合微信、QQ等聊天工具传输
- 用户操作简单（复制/粘贴）

❌ **缺点**：
- Base64编码后体积增大约33%
- 不可读，无法手动编辑
- 无法区分schema版本（依赖代码逻辑兼容）
- 跨平台兼容性较差（需要解析特定的key格式）

### 适用场景

- 📱 在手机和电脑之间迁移数据
- 💬 通过聊天工具备份/恢复数据
- 🔄 同版本间的数据迁移

---

## 📋 格式二：结构化JSON（exportUnifiedData / importUnifiedData）

### 原理

```javascript
// 导出流程
内存中的数据状态
  ↓
按字段组织成结构化JSON对象
  ↓
添加schema版本和元数据
  ↓
JSON.stringify(data, null, 2)  // 格式化输出
  ↓
复制到剪贴板
```

### 代码实现

```javascript
function exportUnifiedData() {
  // 收集所有历史记录
  const dailyRecords = {};
  const prefix = userPrefix();
  const skip = new Set(Object.values(K));  // 跳过非日期的key
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix) || skip.has(key)) continue;
    const d = key.replace(prefix, '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;  // 只收集日期记录
    try { dailyRecords[d] = JSON.parse(localStorage.getItem(key)); } catch(e) {}
  }

  // 构建结构化数据
  const unified = {
    _schema: EXPORT_SCHEMA_VERSION,        // "1.0"
    _exportedAt: new Date().toISOString(), // "2026-03-13T12:34:56.789Z"
    _appVersion: APP_VERSION,              // "3.0.0"
    user: currentUser ? { username: currentUser.username } : null,
    appName,           // "Life Bingo"
    gridSize,          // 5
    groups,            // [{name, tasks:[{name,active}]}]
    details,           // {taskName: {notes, todos:[{text,done}]}}
    mandatory: [...mandatory],
    timestamps,        // {YYYY-MM-DD: [{name, time}]}
    dailyRecords,      // {YYYY-MM-DD: {state, order, done, lines, pct, gridSize}}
    achievements: {
      unlocked: [...achUnlocked],
      custom: achCustom,
      userDefined: achUserDefined,
    },
    theme: ls.get(K.theme) || 'default',
  };
  return JSON.stringify(unified, null, 2);
}
```

### 数据示例

```json
{
  "_schema": "1.0",
  "_exportedAt": "2026-03-13T12:34:56.789Z",
  "_appVersion": "3.0.0",
  "user": null,
  "appName": "Life Bingo",
  "gridSize": 5,
  "groups": [
    {
      "name": "默认分组",
      "tasks": [
        {"name": "日语", "active": true},
        {"name": "法语", "active": true}
      ]
    }
  ],
  "details": {},
  "mandatory": [],
  "timestamps": {
    "2026-03-13": [
      {"name": "日语", "time": "09:30"}
    ]
  },
  "dailyRecords": {
    "2026-03-12": {
      "state": [true, false, ...],
      "order": [0, 1, ...],
      "done": 12,
      "lines": 3,
      "pct": 48
    }
  },
  "achievements": {
    "unlocked": ["first_task", "first_bingo"],
    "custom": {},
    "userDefined": []
  },
  "theme": "matcha"
}
```

### 优缺点

✅ **优点**：
- 人类可读，可手动编辑
- 包含schema版本，便于未来兼容性处理
- 字段名清晰，跨平台友好
- 可选择性导入部分字段
- 与微信小程序key格式一一对应

❌ **缺点**：
- JSON格式可能被聊天工具格式化破坏
- 体积比迁移码稍大（因为有字段名重复）
- 需要手动复制（不是一键复制）

### 适用场景

- 🔄 跨平台数据迁移（如微信小程序）
- 📝 需要手动编辑或查看数据内容
- 🛠️ 开发调试时的数据备份
- 📊 数据分析和可视化

---

## 🗂️ localStorage 数据结构

### Key 命名规范

```
adhd_bingo_<field>          // 全局配置
adhd_bingo_<YYYY-MM-DD>     // 每日记录
adhd_bingo_u_<user>_<field> // (已废弃) 用户特定数据
```

### 主要数据字段

| Key | 类型 | 说明 |
|-----|------|------|
| `adhd_bingo_groups` | JSON Array | 任务分组：`[{name, tasks:[{name,active,weekdays,planDate}]}]` |
| `adhd_bingo_details` | JSON Object | 任务详情：`{taskName: {notes, todos:[{text,done}]}}` |
| `adhd_bingo_mandatory` | JSON Array | 必做任务列表：`["任务名1", "任务名2"]` |
| `adhd_bingo_timestamps` | JSON Object | 完成时间戳：`{"2026-03-13": [{name,time,segments}]}` |
| `adhd_bingo_gridsize` | String | 网格大小：`"3"`, `"4"`, `"5"`, `"6"` |
| `adhd_bingo_appname` | String | 应用名称：`"Life Bingo"` |
| `adhd_bingo_theme` | String | 主题ID：`"matcha"`, `"ocean"`, `"cyber"` 等 |
| `adhd_bingo_achievements` | JSON Object | 成就数据：`{unlocked:[], custom:{}, userDefined:[]}` |
| `adhd_bingo_version` | String | 数据版本：`"3.0.0"`（用于迁移） |
| `adhd_bingo_YYYY-MM-DD` | JSON Object | 每日状态：`{state:[], order:[], done, lines, pct, gridSize}` |

### 每日记录结构

```javascript
{
  "state": [true, false, true, ...],  // 25个布尔值（5x5网格）
  "order": [0, 5, 10, 15, ...],      // 任务索引
  "done": 12,                         // 完成数量
  "lines": 3,                         // 连线数量
  "pct": 48,                          // 进度百分比
  "gridSize": 5                       // 网格大小
}
```

---

## 💡 Tauri App 数据存储建议

### 推荐方案：**保留结构化JSON格式，废弃迁移码**

#### 理由

1. **Tauri有文件系统访问能力**
   - 不再需要Base64编码来规避传输限制
   - 可以直接读写JSON文件
   - 支持增量备份和历史版本管理

2. **JSON格式更易维护**
   - 人类可读，方便调试
   - 可以用diff工具查看变更
   - 易于迁移到其他平台

3. **App场景更适合文件管理**
   - 自动备份：每天保存一个JSON快照
   - 手动导出：用户可以选择"导出到文件"
   - 导入：从文件选择器加载

#### 实现建议

```javascript
// Tauri版本的数据存储结构
// ~/.config/adhd-bingo/
│── data.json           // 当前数据（结构化JSON格式）
│── backups/
│   ├── 2026-03-13.json  // 每日自动备份
│   ├── 2026-03-12.json
│   └── ...
│── export/             // 用户手动导出
│   └── backup-20260313.json

// data.json 结构（与 exportUnifiedData 相同）
{
  "_schema": "1.0",
  "_lastModified": "2026-03-13T12:34:56.789Z",
  "_appVersion": "3.0.0",
  // ... 其他字段
}
```

#### 代码改造点

1. **移除迁移码功能**
   - 删除 `exportAllData()` 和 `importData()`
   - 删除Base64编解码相关代码

2. **保留并增强结构化JSON导出**
   ```javascript
   // 导出到文件
   async function exportToFile() {
     const data = exportUnifiedData();
     const { save } = require('@tauri-apps/api/dialog');
     const { writeTextFile } = require('@tauri-apps/api/fs');

     const filePath = await save({
       filters: [{ name: 'JSON', extensions: ['json'] }]
     });
     await writeTextFile(filePath, data);
   }

   // 从文件导入
   async function importFromFile() {
     const { open } = require('@tauri-apps/api/dialog');
     const { readTextFile } = require('@tauri-apps/api/fs');

     const filePath = await open({
       filters: [{ name: 'JSON', extensions: ['json'] }]
     });
     const contents = await readTextFile(filePath);
     importUnifiedData(contents);
   }

   // 自动备份
   async function autoBackup() {
     const data = exportUnifiedData();
     const dateStr = new Date().toISOString().split('T')[0];
     const backupPath = `backups/${dateStr}.json`;
     await writeTextFile(backupPath, data);
   }
   ```

3. **数据加载逻辑**
   ```javascript
   // 启动时加载
   async function loadAppData() {
     try {
       const contents = await readTextFile('data.json');
       const data = JSON.parse(contents);
       // 恢复到内存和localStorage
       restoreFromUnifiedData(data);
     } catch (e) {
       // 首次启动或文件不存在，使用默认配置
     }
   }

   // 定期保存
   async function saveAppData() {
     const data = exportUnifiedData();
     await writeTextFile('data.json', data);
   }
   ```

#### 数据兼容性

**Web版本 → Tauri App**
- 用户在Web版点击"结构化导出"
- 复制JSON到剪贴板
- 在App中粘贴导入（或保存为.json文件后导入）

**Tauri App → Web版本**
- App中导出JSON文件
- 用户打开文件，复制内容
- 在Web版粘贴导入

---

## 📌 总结与建议

### Web版本（当前）

| 功能 | 保留 | 原因 |
|-----|------|------|
| 迁移码格式 | ⚠️ 可选 | 方便微信传输，但App版不需要 |
| 结构化JSON | ✅ 强烈推荐 | 跨平台兼容，人类可读 |
| localStorage存储 | ✅ 必须 | Web标准API |

### Tauri App版本（未来）

| 功能 | 保留 | 原因 |
|-----|------|------|
| 迁移码格式 | ❌ 不需要 | 有文件系统，不需要Base64编码 |
| 结构化JSON | ✅ 必须 | 作为文件格式，易于维护 |
| 文件自动备份 | ✅ 新增 | App特有能力，提升数据安全 |
| localStorage兼容 | ⚠️ 可选 | 用于过渡期或临时缓存 |

### 迁移路径

**阶段1：Web版完善（当前）**
- ✅ 保留两套导出格式
- ✅ 修复用户前缀兼容性问题
- ✅ 优化UI说明（告诉用户何时用哪种格式）

**阶段2：Tauri App开发**
- 🔄 移除迁移码格式
- ✅ 只保留结构化JSON
- ✅ 实现文件读写API
- ✅ 添加自动备份功能

**阶段3：数据迁移工具**
- 提供Web版导出 → App导入的工具
- 文档说明迁移步骤
- 考虑云端同步（可选）

---

## 🔗 相关代码位置

- **导出函数**：index.html 行 3687-3720 (`exportUnifiedData`)
- **导入函数**：index.html 行 3735-3766 (`importUnifiedData`)
- **迁移码导出**：index.html 行 3767-3774 (`exportAllData`)
- **迁移码导入**：index.html 行 3803-3828 (`importData`)
- **数据结构定义**：index.html 行 992-1001 (常量K对象)
- **用户前缀处理**：index.html 行 1125-1127 (userPrefix函数)

---

**文档生成时间**：2026-03-13
**版本**：v1.0
**适用代码版本**：ADHD Bingo v3.0.0
