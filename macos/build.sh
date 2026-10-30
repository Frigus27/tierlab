#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="TIERLAB"
VERSION="1.0.1"
BUILD_DIR="$ROOT_DIR/build/macos"
DIST_DIR="$ROOT_DIR/dist"
APP_DIR="$DIST_DIR/$APP_NAME.app"
CONTENTS="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
WEB_DIR="$RESOURCES/web"

export CLANG_MODULE_CACHE_PATH="$BUILD_DIR/module-cache"
export SWIFT_MODULE_CACHE_PATH="$BUILD_DIR/module-cache"
mkdir -p "$BUILD_DIR/module-cache" "$DIST_DIR"

if ! command -v swiftc >/dev/null 2>&1; then
  echo "需要安装 Xcode Command Line Tools 才能构建本地 App。" >&2
  exit 1
fi

echo "→ 清理旧构建"
rm -rf "$APP_DIR"
rm -f "$DIST_DIR/$APP_NAME-$VERSION.zip"
mkdir -p "$MACOS_DIR" "$WEB_DIR"

echo "→ 复制网页资源"
for asset in index.html styles.css app.js favicon.svg manifest.webmanifest icon-180.png icon-192.png icon-512.png; do
  cp "$ROOT_DIR/$asset" "$WEB_DIR/$asset"
done
cp "$SCRIPT_DIR/Info.plist" "$CONTENTS/Info.plist"
cp "$SCRIPT_DIR/Assets/AppIcon.icns" "$RESOURCES/AppIcon.icns"
printf 'APPL????' > "$CONTENTS/PkgInfo"

SOURCES=(
  "$SCRIPT_DIR/Sources/main.swift"
  "$SCRIPT_DIR/Sources/AppDelegate.swift"
  "$SCRIPT_DIR/Sources/LocalHTTPServer.swift"
)

COMMON_FLAGS=(
  -swift-version 5
  -O
  -whole-module-optimization
  -module-cache-path "$BUILD_DIR/module-cache"
  -framework Cocoa
  -framework WebKit
  -framework Network
)

echo "→ 编译 arm64"
swiftc "${COMMON_FLAGS[@]}" -target arm64-apple-macosx12.0 "${SOURCES[@]}" -o "$BUILD_DIR/$APP_NAME-arm64"

if swiftc "${COMMON_FLAGS[@]}" -target x86_64-apple-macosx12.0 "${SOURCES[@]}" -o "$BUILD_DIR/$APP_NAME-x86_64" >/dev/null 2>&1; then
  echo "→ 合并 universal binary"
  lipo -create "$BUILD_DIR/$APP_NAME-arm64" "$BUILD_DIR/$APP_NAME-x86_64" -output "$MACOS_DIR/$APP_NAME"
else
  echo "  Intel 交叉编译不可用，改为只构建 Apple Silicon 版本"
  cp "$BUILD_DIR/$APP_NAME-arm64" "$MACOS_DIR/$APP_NAME"
fi

chmod +x "$MACOS_DIR/$APP_NAME"
xattr -cr "$APP_DIR" 2>/dev/null || true

echo "→ 临时签名"
codesign --force --deep --sign - --timestamp=none "$APP_DIR" >/dev/null
codesign --verify --deep --strict "$APP_DIR"

echo "→ 打包 zip"
ditto -c -k --sequesterRsrc --keepParent "$APP_DIR" "$DIST_DIR/$APP_NAME-$VERSION.zip"

echo ""
echo "完成："
echo "  $APP_DIR"
echo "  $DIST_DIR/$APP_NAME-$VERSION.zip"
echo ""
lipo -info "$MACOS_DIR/$APP_NAME" 2>/dev/null || true
