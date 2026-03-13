# Android APK 签名配置指南

## 为什么需要签名？

Android 系统要求所有 APK 必须签名才能安装：
- **Debug 版本**: 自动使用 debug keystore 签名，可直接安装
- **Release 版本**: 需要配置正式的签名密钥才能安装和发布

## 签名方案

项目已配置为自动使用签名：

1. **如果没有配置签名** → 自动使用 debug keystore 签名（可安装，但不可用于应用商店）
2. **如果配置了正式签名** → 使用正式 keystore 签名（可发布到应用商店）

## 快速开始（使用 debug keystore）

**对于测试用途**，你不需要做任何配置！直接运行：

```bash
npm run android:release
```

生成的 APK 会自动使用 debug keystore 签名，可以直接安装到设备。

## 配置正式签名（用于发布）

### 方法 1: 使用 tauri.properties（推荐）

1. **生成 keystore**（只需一次）：

```bash
keytool -genkey -v -keystore release.keystore -alias adhd-bingo -keyalg RSA -keysize 2048 -validity 10000
```

会提示输入：
- **Keystore 密码**: 设置一个强密码并**记住它**
- **姓名、组织等**: 按实际情况填写
- **Key 密码**: 设置一个强密码并**记住它**

2. **将 keystore 放在项目根目录**：
```
ADHD-Bingo/
├── release.keystore          # 签名密钥（不要提交到 git）
├── src-tauri/
└── ...
```

3. **在 `src-tauri/gen/android/app/tauri.properties` 添加配置**：

```properties
# Android 签名配置
android.keystorePath=../../../release.keystore
android.keystorePassword=你的 keystore 密码
android.keyAlias=adhd-bingo
android.keyPassword=你的 key 密码
```

4. **构建签名的 Release APK**：
```bash
npm run android:release
```

### 方法 2: 使用环境变量（适合 CI/CD）

```bash
export ANDROID_KEYSTORE_PATH=/path/to/release.keystore
export ANDROID_KEYSTORE_PASSWORD=你的 keystore 密码
export ANDROID_KEY_ALIAS=adhd-bingo
export ANDROID_KEY_PASSWORD=你的 key 密码

npm run android:release
```

## 安全注意事项

### ⚠️ 重要：保护你的 keystore

1. **永远不要将 keystore 提交到 git**
   - `.gitignore` 已配置忽略 `*.keystore` 文件

2. **备份 keystore**
   - 如果丢失 keystore，无法更新应用
   - 建议备份到多个安全位置

3. **不要在代码中硬编码密码**
   - 使用 `tauri.properties` 文件（已加入 .gitignore）
   - 或使用环境变量

4. **记住密码**
   - keystore 密码和 key 密码都需要记住
   - 没有密码无法使用 keystore

## 验证签名

构建完成后，检查 APK 是否签名：

```bash
# 检查 APK 签名
apksigner verify --print-certs src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release.apk
```

输出示例：
```
Signer #1 certificate DN: CN=Android Debug,O=Android,C=US
...
```

如果看到 "verified"，说明签名成功。

## 更新应用

发布后要更新应用时：
1. **使用相同的 keystore** 和 **相同的 alias**
2. **增加 versionCode**（在 `tauri.properties` 或 `build.gradle.kts`）
3. **重新构建**

```properties
# tauri.properties
tauri.android.versionCode=2
tauri.android.versionName=1.1.0
```

## 故障排除

### 问题 1: "未找到 APK 文件"

检查构建输出目录：
```bash
ls src-tauri/gen/android/app/build/outputs/apk/arm64/release/
```

### 问题 2: "安装失败：解析包时出现问题"

- 确认 APK 已签名
- 检查设备 Android 版本是否满足 `minSdk = 24`
- 尝试卸载旧版本后重新安装

### 问题 3: "签名冲突"

- 确保每次发布使用相同的 keystore
- 如果是不同的 keystore，需要卸载旧版本才能安装

## 上架 Google Play

1. **使用正式签名**（不要用 debug keystore）
2. **生成 AAB 格式**：
   ```bash
   npx tauri android build --target aarch64 --target armv7 --split-per-abi --aab
   ```
3. **上传 AAB 到 Google Play Console**

## 参考

- [Android 应用签名](https://developer.android.com/studio/publish/app-signing)
- [生成密钥库](https://developer.android.com/studio/publish/app-signing#generate-key)
- [签名配置](https://developer.android.com/studio/publish/app-signing#sign-config)
