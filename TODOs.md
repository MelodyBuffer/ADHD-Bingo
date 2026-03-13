这是个网页小工具，现在我需要改一个自己的版本。
大体上分两步走：
1. web端：移除开屏登录/注册弹窗，数据先用LocalStorage/Cookie存，加上一些我自己的小优化；
2. web端完善以后，用tauri打包成app，数据存储改用tauri-plugin-fs等持久化

现在初始化了git仓库，你可以自己根据情况checkout到不同分支做功能改进和app端打包等等

优化web端的时候，你可以选择继续vanilla，也可以用nodejs生态引入框架，一切按照你的偏好来；
但是有一个原则：交互体验和页面设计要完全跟原来的保持一致；并且除了明确要移除的部分，做其他改动的时候不能破坏原来的功能。

web详细需要做的事情：
1. ✅ 移除开屏登录/注册弹窗，用户数据不存服务端；（已完成）
   - 移除了登录弹窗HTML和CSS
   - 移除了登录/注册相关JavaScript函数
   - 移除了用户前缀逻辑，改用直接localStorage存储
   - 简化了导入功能的用户前缀映射
2. ✅ 主题切换现在是点按轮询，我希望改成点击主题按钮，旁边有个popup的选择模式；（已完成）
   - 添加了主题选择器popup HTML结构
   - 添加了CSS样式（动画、布局等）
   - 将toggleTheme()改为openThemeSelector()
   - 添加了renderThemeOptions()渲染主题选项
   - 添加了selectTheme(id)选择主题功能
   - 实现了点击外部关闭popup的交互
3. 其他待定。

实施注意事项：
1. 分步实施，阶段验证；
2. 把一些实施过程中你觉得应该持久化的信息回写到TODOs或单独的目录，供之后的实施参考；
3. task完成对话结束之前，关闭所有后台任务，如果需要预览，我自己会手动起dev server。

---
## 实施记录

### 2025-03-13: 移除用户认证系统

**已完成的工作：**
1. 移除登录/注册弹窗的HTML（原lines 713-737）
2. 移除登录相关CSS样式（原lines 643-661）
3. 移除header中的userBadgeBtn（原line 911）
4. 移除登录相关JavaScript函数：
   - `switchLoginTab()`, `doLogin()`, `doRegister()`
   - `showLoginError()`, `skipLogin()`, `openLoginModal()`, `closeLoginModal()`
   - `updateUserBadge()`
   - `simpleHash()`
5. 移除初始化时显示登录弹窗的代码
6. 简化用户前缀逻辑：
   - `userPrefix()` 改为直接返回KP
   - `getUserKey()` 改为直接返回 KP+base
   - `activeKey()` 改为直接返回 KP+date
   - 移除 `currentUser` 全局变量
7. 简化导入功能，移除复杂的用户前缀映射逻辑

**代码变更总结：**
- 所有localStorage key现在直接使用 `adhd_bingo_` 前缀，不再有用户前缀
- 保留了对旧数据的兼容性：导入时会自动剥除 `adhd_bingo_u_{username}_` 前缀
- 所有数据现在存储在全局作用域，不区分用户

**注意事项：**
- 导入功能仍然支持从旧的带用户前缀的导出数据中恢复
- 如需多用户支持，未来可以重新实现（但使用不同的架构）

### 2025-03-13: 实现主题选择器popup

**已完成的工作：**
1. HTML结构：
   - 在主题按钮外层包裹relative容器
   - 添加theme-selector-popup弹出层
   - 添加theme-popup-header标题和theme-grid选项网格
2. CSS样式：
   - popup定位在按钮下方，右对齐
   - 使用opacity/visibility实现淡入淡出动画
   - 主题选项使用grid布局，2列显示
   - 添加hover效果和active状态样式
3. JavaScript功能：
   - `openThemeSelector()`: 打开/切换popup显示
   - `closeThemeSelector()`: 关闭popup
   - `renderThemeOptions()`: 动态渲染主题选项
   - `selectTheme(id)`: 应用选中的主题
   - `handleThemePopupClick()`: 点击外部关闭popup
4. 交互体验：
   - 点击主题按钮切换popup显示/隐藏
   - 点击主题选项立即应用并显示toast提示
   - 选择主题后300ms自动关闭popup
   - 高亮显示当前激活的主题

**实现细节：**
- popup使用绝对定位，不影响页面布局
- 主题选项使用flex布局，emoji + 标签
- 保持原有的applyTheme()和loadTheme()函数不变
- 支持所有7个主题：默认、抹茶绿、深海蓝、单色、赛博朋克、蒸汽波、禅意

---

### 2025-03-13: Tauri App 初始化和框架搭建

**分支**: `tauri-app`
**目的**: 将 Web 应用打包为桌面应用

**已完成的工作：**
1. **项目初始化**：
   - 创建 `package.json` 配置文件
   - 安装 Tauri 依赖和插件
   - 初始化 Tauri 项目结构
2. **Rust 后端配置**：
   - `src-tauri/src/main.rs` - Rust 入口文件
   - `src-tauri/Cargo.toml` - Rust 依赖配置
   - `src-tauri/tauri.conf.json` - Tauri 配置（窗口大小、图标等）
   - 添加了 fs 和 dialog 插件支持
3. **数据存储模块**：
   - `tauri-storage.js` - 文件系统存储实现（完整功能框架）
   - `data-store.js` - 存储适配器（Web/Tauri自动检测）
4. **Web 代码改造**：
   - index.html 添加 Tauri 环境检测
   - 添加初始化代码识别 Tauri 环境
5. **项目文档**：
   - `DATA_IMPORT_EXPORT.md` - 数据导入导出原理说明
   - `TAURI_DEVELOPMENT.md` - Tauri 开发完整指南

**文件结构：**
```
src-tauri/
├── src/main.rs          # Rust 入口
├── Cargo.toml           # Rust 依赖
├── tauri.conf.json      # Tauri 配置
└── icons/               # 应用图标
tauri-storage.js         # 文件存储模块
data-store.js            # 存储适配器
package.json             # Node 依赖
```

**待完成工作**：
1. 首次编译运行（需要5-10分钟下载Rust依赖）
2. 完整实现文件系统数据存储集成
3. 添加文件导入/导出UI
4. 实现自动备份功能
5. 创建应用图标（PNG格式）
6. 测试所有功能
7. 打包发布

**开发命令：**
```bash
# 开发模式（需要先启动HTTP服务器）
python -m http.server 8000  # 终端1
npm run dev                  # 终端2

# 打包应用
npm run build
```

**详细说明**: 查看 `TAURI_DEVELOPMENT.md`

