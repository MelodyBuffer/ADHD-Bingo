#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ADHD Bingo Android APK 构建脚本

用法:
  python build-android.py           # 构建 debug APK
  python build-android.py --release # 构建 release APK
  python build-android.py --clean   # 清理后重新构建
"""

import os
import sys
import subprocess
import argparse
import shutil
from pathlib import Path

# 设置控制台编码为 UTF-8（Windows 兼容）
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

# 颜色输出
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log(msg, color=Colors.END):
    print(f"{color}{msg}{Colors.END}")

def run_cmd(cmd, description=""):
    """运行命令并显示进度"""
    if description:
        log(f"\n▶ {description}...", Colors.BLUE)
    else:
        log(f"\n▶ 运行: {cmd}", Colors.BLUE)

    result = subprocess.run(cmd, shell=True, cwd=Path(__file__).parent)
    if result.returncode != 0:
        log(f"✗ 命令失败: {cmd}", Colors.RED)
        sys.exit(1)
    return result.returncode == 0

def clean_build():
    """清理构建缓存"""
    log("\n🧹 清理构建缓存...", Colors.YELLOW)
    run_cmd("npm run clean", "清理 npm 缓存")
    run_cmd("cargo clean", "清理 Rust 构建缓存")

def prepare_web_assets():
    """准备 Web 资源"""
    log("\n📦 准备 Web 资源...", Colors.YELLOW)

    # 创建 dist 目录
    dist_dir = Path("dist")
    dist_dir.mkdir(exist_ok=True)

    # 使用 shutil 复制文件（跨平台兼容）
    base_dir = Path(__file__).parent
    files_to_copy = ["index.html", "manifest.json", "sw.js"]

    for file in files_to_copy:
        src = base_dir / file
        if src.exists():
            shutil.copy2(src, dist_dir / file)
            log(f"  ✓ 复制 {file}", Colors.GREEN)
        else:
            log(f"  ⚠ 警告: {file} 不存在", Colors.YELLOW)

    log("✓ Web 资源准备完成", Colors.GREEN)

def build_apk(release=False):
    """构建 APK - 仅 ARM 架构（ARM64 + ARMv7）"""
    build_type = "Release" if release else "Debug"
    log(f"\n🔨 构建 {build_type} APK (仅 ARM 架构)...", Colors.YELLOW)

    cmd = "npx tauri android build"
    if not release:
        cmd += " --debug"
    # 只构建 ARM 架构（aarch64 = ARM64, armv7 = ARM32）
    cmd += " --target aarch64 --target armv7"
    # 使用 split-per-abi 为每个架构生成单独的、已签名的 APK
    cmd += " --split-per-abi --apk"

    run_cmd(cmd, f"构建 {build_type} APK (仅 ARM64 + ARMv7, 按架构分离)")

def show_results(release=False):
    """显示构建结果"""
    log("\n✓ 构建完成！", Colors.GREEN)

    # 查找所有生成的 APK 文件
    base_dir = Path("src-tauri/gen/android/app/build/outputs/apk")

    if release:
        # split-per-abi 会为每个架构生成单独的 APK
        # 检查 arm64/release 和 arm/release 目录
        apks = []
        for arch_dir in ["arm64", "arm"]:
            arch_path = base_dir / arch_dir / "release"
            if arch_path.exists():
                apk_files = list(arch_path.glob("*.apk"))
                apks.extend(apk_files)

        if apks:
            log(f"\n📱 生成的文件 (Release - 按架构分离):", Colors.BLUE)
            for apk in sorted(apks):
                size_mb = apk.stat().st_size / (1024 * 1024)
                # 提取架构名称
                if "arm64" in apk.name:
                    arch = "ARM64 (推荐，现代设备)"
                elif "arm" in apk.name and "arm64" not in apk.name:
                    arch = "ARMv7 (旧设备)"
                else:
                    arch = "未知"

                # 检查是否签名
                signed_status = "✓ 已签名" if "unsigned" not in apk.name else "✗ 未签名"

                log(f"  APK ({arch}): {apk} ({size_mb:.1f} MB) [{signed_status}]", Colors.GREEN)

            log(f"\n⚠ 注意: 如果 APK 显示 '未签名'，可能无法直接安装", Colors.YELLOW)
            log(f"  建议使用 Debug 版本进行测试（已自动签名）", Colors.YELLOW)

            log(f"\n💡 安装命令:", Colors.BLUE)
            log(f"  adb install {apks[0]}", Colors.YELLOW)
            return

    # fallback - 查找 debug 或 universal APK
    if not release:
        # split-per-abi debug APKs 在 arm64/debug 和 arm/debug
        apks = []
        for arch_dir in ["arm64", "arm"]:
            debug_path = base_dir / arch_dir / "debug"
            if debug_path.exists():
                apk_files = list(debug_path.glob("*.apk"))
                apks.extend(apk_files)

        # 如果没找到，尝试递归查找所有 debug APK
        if not apks:
            apks = list(base_dir.glob("**/debug/*.apk"))

        if apks:
            log(f"\n📱 生成的文件 (Debug - 已签名，可安装):", Colors.BLUE)
            for apk in sorted(apks)[:4]:  # 只显示前 4 个
                size_mb = apk.stat().st_size / (1024 * 1024)
                # 提取架构名称
                if "arm64" in apk.name:
                    arch = "ARM64 (推荐，现代设备)"
                elif "arm" in apk.name and "arm64" not in apk.name:
                    arch = "ARMv7 (旧设备)"
                else:
                    arch = "通用"
                log(f"  APK ({arch}): {apk} ({size_mb:.1f} MB)", Colors.GREEN)

            log(f"\n💡 安装命令:", Colors.BLUE)
            log(f"  # 对于现代设备 (ARM64):", Colors.YELLOW)
            if any("arm64" in apk.name for apk in apks):
                arm64_apk = [apk for apk in apks if "arm64" in apk.name][0]
                log(f"  adb install {arm64_apk}", Colors.YELLOW)
            log(f"  # 或者复制文件到设备安装", Colors.YELLOW)
            return

    # universal APK fallback
    build_type = "universalDebug" if not release else "universalRelease"
    apk_path = base_dir / f"{build_type}/app-{build_type.lower()}.apk"

    log(f"\n📱 生成的文件:", Colors.BLUE)

    if apk_path.exists():
        size_mb = apk_path.stat().st_size / (1024 * 1024)
        log(f"  APK: {apk_path} ({size_mb:.1f} MB)", Colors.GREEN)
        log(f"\n💡 安装命令:", Colors.BLUE)
        log(f"  adb install {apk_path}", Colors.YELLOW)
    else:
        log(f"  ⚠ 未找到 APK 文件", Colors.YELLOW)

def main():
    parser = argparse.ArgumentParser(description="ADHD Bingo Android APK 构建脚本")
    parser.add_argument("--release", action="store_true", help="构建 release 版本（默认 debug）")
    parser.add_argument("--clean", action="store_true", help="清理后重新构建")

    args = parser.parse_args()

    log("🚀 ADHD Bingo Android APK 构建工具", Colors.GREEN)
    log("=" * 50, Colors.BLUE)

    if args.clean:
        clean_build()

    # 准备 Web 资源
    prepare_web_assets()

    # 构建 APK
    build_apk(release=args.release)

    # 显示结果
    show_results(release=args.release)

    log("\n" + "=" * 50, Colors.BLUE)
    log("✓ 全部完成！", Colors.GREEN)

if __name__ == "__main__":
    main()
