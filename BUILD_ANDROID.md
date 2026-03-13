# Android APK 构建指南

## 快速开始

### 一键构建 Debug 版本
```bash
npm run android
# 或
python build-android.py
```

### 一键构建 Release 版本（推荐）
```bash
npm run android:release
# 或
python build-android.py --release
```

### 清理后重新构建
```bash
npm run android:clean
# 或
python build-android.py --clean
```

## 构建配置

默认配置只构建 ARM 架构（适合真实 Android 设备）：
- ✅ ARM64 (arm64-v8a) - 主流现代设备
- ✅ ARMv7 (armeabi-v7a) - 旧版设备
- ❌ x86/x86_64 - 模拟器（已移除）

这样可以显著减小 APK 体积并加快构建速度。

## 输出文件

### Debug 版本
- **APK**: `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`
- **AAB**: `src-tauri/gen/android/app/build/outputs/bundle/universalDebug/app-universal-debug.aab`

### Release 版本
- **APK**: `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`
- **AAB**: `src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab`

## 安装测试

### 通过 ADB 安装
```bash
adb install src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk
```

### 手动安装
将 APK 文件传输到 Android 设备，在设备上点击安装即可。

## 性能对比

| 版本 | 体积 | 性能 | 适用场景 |
|------|------|------|----------|
| Debug (4 架构) | ~399 MB | 较慢 | 开发测试 |
| Release (4 架构) | ~33 MB | 流畅 | 生产发布 |
| **Release (仅 ARM)** | **~17 MB** | **流畅** | **推荐** |

**建议**:
- 开发时可用 Debug 版本快速测试
- 正式发布时务必使用 Release 版本（仅 ARM）
- Release 版本体积小、性能好、启动快

## 常见问题

### 1. 构建失败 - npm 命令未找到
确保已安装 Node.js 和 npm：
```bash
node --version
npm --version
```

### 2. 构建失败 - Python 命令未找到
确保已安装 Python 3：
```bash
python --version
# 或
python3 --version
```

### 3. APK 体积仍然过大
- 确认使用的是 Release 版本 (`--release` 参数)
- Release 版本自动只包含 ARM 架构（17 MB）

### 4. 应用运行卡顿
- Debug 版本性能较差，请使用 Release 版本
- Release 版本经过优化，体积小、性能好

### 5. 为什么不包含 x86/x86_64？
- x86/x86_64 仅用于 Android 模拟器
- 真实设备都是 ARM 架构
- 移除后 APK 体积减少 48%，构建速度更快
