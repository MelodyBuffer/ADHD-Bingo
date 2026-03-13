# Tauri App 开发说明

## ✅ 已完成的工作

### 1. 项目初始化
- ✅ 创建了新分支 `tauri-app`
- ✅ 添加了 `package.json` 和依赖
- ✅ 初始化了 Tauri 项目结构
- ✅ 配置了 Tauri 插件（fs、dialog）

### 2. 项目结构
```
ADHD-Bingo/
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   └── main.rs        # Rust 入口文件
│   ├── icons/             # 应用图标
│   ├── Cargo.toml         # Rust 依赖配置
│   ├── build.rs           # 构建脚本
│   └── tauri.conf.json    # Tauri 配置
├── tauri-storage.js       # Tauri 文件存储模块
├── data-store.js          # 存储适配器（Web/Tauri兼容）
├── index.html             # Web前端（已修改支持Tauri）
├── package.json           # Node.js 依赖
└── CLAUDE.md             # 项目文档
```

### 3. 配置文件
**src-tauri/tauri.conf.json**
- 窗口大小：450x850
- 标题：ADHD Bingo
- 开发服务器：http://localhost:8000
- 前端目录：../ (使用当前目录)

## 🚀 开发和测试

### 开发模式（Dev）
```bash
# 1. 启动本地 HTTP 服务器（前端）
python -m http.server 8000

# 2. 启动 Tauri 开发模式
npm run dev
```

首次运行会：
1. 下载并编译所有 Rust 依赖（约 5-10 分钟）
2. 打开应用窗口
3. 支持热重载（修改 Rust 代码会自动重新编译）

### 构建应用（Build）
```bash
npm run build
```

构建产物位置：
- **Windows**: `src-tauri/target/release/adhd-bingo.exe`
- **Linux**: `src-tauri/target/release/adhd-bingo`
- **macOS**: `src-tauri/target/release/adhd-bingo.app`

## 📦 当前功能状态

### ✅ 已实现
- [x] Web 代码完全兼容（移除了登录系统）
- [x] 主题选择器 popup
- [x] Tauri 项目初始化
- [x] 文件系统存储模块框架（tauri-storage.js）
- [x] 存储适配器（data-store.js，自动检测环境）

### ⏳ 待完成
- [ ] 完整实现文件系统数据存储
- [ ] 实现自动备份功能
- [ ] 添加文件导入/导出 UI
- [ ] 测试所有功能
- [ ] 创建应用图标（PNG格式）

## 🔧 待解决问题

### 1. 图标文件
当前只有 SVG 图标，需要生成 PNG 图标：
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.ico (Windows)
- icon.icns (macOS)

可以使用在线工具：https://icon.kitchen/

### 2. 数据存储集成
`tauri-storage.js` 已创建但还没有完全集成到 index.html。需要：
1. 在导出/导入功能中添加 Tauri 文件系统调用
2. 实现自动备份逻辑
3. 从 localStorage 迁移数据到文件

### 3. CSP 配置
当前 CSP 设置为 null，如果需要可以添加：
```json
"security": {
  "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
}
```

## 📝 下一步开发计划

### 立即可做
1. **测试开发模式**
   ```bash
   python -m http.server 8000  # 终端1
   npm run dev                  # 终端2
   ```

2. **创建应用图标**
   - 访问 https://icon.kitchen/
   - 上传 SVG 或使用 emoji 🎯
   - 下载所有格式的图标
   - 替换 `src-tauri/icons/` 中的文件

3. **实现文件导出功能**
   在 index.html 中修改导出按钮，添加 Tauri 支持：
   ```javascript
   async function exportData() {
     if (window.__IS_TAURI__) {
       // 使用 Tauri 文件系统
     } else {
       // 使用原有的方式
     }
   }
   ```

4. **测试打包**
   ```bash
   npm run build
   ```

### 进阶功能
1. **自动备份**：每天自动备份数据到 backups/ 目录
2. **备份管理 UI**：查看历史备份，选择恢复
3. **数据迁移工具**：从 localStorage 一键迁移到文件存储

## 🐛 常见问题

### Q: 编译失败？
A: 确保 Rust 和 Node.js 版本正确：
- Rust: 1.70+
- Node.js: 18+

### Q: 应用启动失败？
A: 检查：
1. HTTP 服务器是否在 http://localhost:8000 运行
2. index.html 是否存在
3. 防火墙是否阻止了 WebView2

### Q: 如何调试？
A:
1. 开发模式下打开 DevTools：F12
2. 查看 Rust 日志：查看终端输出
3. 检查 Tauri API 调用：在浏览器控制台

### Q: 数据存储在哪里？
A:
- **开发模式**：仍在 localStorage
- **打包后**：
  - Windows: `C:\Users\<用户>\AppData\Roaming\com.adhdbingo.app\`
  - macOS: `~/Library/Application Support/com.adhdbingo.app/`
  - Linux: `~/.config/com.adhdbingo.app/`

## 📄 重要文件说明

### tauri-storage.js
这是文件系统存储的核心模块，提供了：
- `initStorage()` - 初始化数据目录
- `loadData()` - 从文件加载数据
- `saveData()` - 保存数据到文件
- `autoBackup()` - 自动备份
- `exportToFile()` - 导出为 JSON 文件
- `importFromFile()` - 从文件导入

### data-store.js
存储适配器，自动检测环境：
- 检测是否在 Tauri 环境
- 根据环境选择合适的存储方式
- 提供统一的 API 接口

### 修改的 index.html
添加了 Tauri 环境检测：
```javascript
window.__IS_TAURI__ = true;  // Tauri 环境
```

## 🎯 快速开始

1. **首次编译（5-10分钟）**
   ```bash
   python -m http.server 8000 &
   npm run dev
   ```

2. **后续开发**
   ```bash
   npm run dev  # 自动启动HTTP服务器并编译
   ```

3. **打包发布**
   ```bash
   npm run build  # 生成独立可执行文件
   ```

## 📚 相关资源

- Tauri 文档: https://tauri.app/
- Tauri Plugin FS: https://github.com/tauri-apps/plugins-workspace
- Tauri Plugin Dialog: https://github.com/tauri-apps/plugins-workspace
- 原Web版: https://adhd-bingo.facfox.com/

---

**分支**: `tauri-app`
**最后更新**: 2026-03-13
**状态**: 开发中 ✨
