#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="TIERLAB"
VERSION="1.0.1"
BUILD_DIR="$ROOT_DIR/build/ios"
DIST_DIR="$ROOT_DIR/dist"
PAYLOAD="$BUILD_DIR/Payload"
APP_DIR="$PAYLOAD/$APP_NAME.app"
IPA="$DIST_DIR/$APP_NAME-$VERSION-ios-unsigned.ipa"

export CLANG_MODULE_CACHE_PATH="$BUILD_DIR/module-cache"
export SWIFT_MODULE_CACHE_PATH="$BUILD_DIR/module-cache"
mkdir -p "$BUILD_DIR/module-cache" "$DIST_DIR"

if ! command -v swiftc >/dev/null 2>&1 || ! xcrun --sdk iphoneos --show-sdk-path >/dev/null 2>&1; then
  echo "需要 Xcode 和 iOS SDK 才能构建。" >&2
  exit 1
fi

SDK="$(xcrun --sdk iphoneos --show-sdk-path)"
rm -rf "$BUILD_DIR/Payload"
rm -f "$IPA"
mkdir -p "$APP_DIR" "$APP_DIR/web"

echo "→ 复制网页资源与图标"
for asset in index.html styles.css app.js favicon.svg manifest.webmanifest icon-180.png icon-192.png icon-512.png; do
  cp "$ROOT_DIR/$asset" "$APP_DIR/web/$asset"
done
cp "$SCRIPT_DIR/Info.plist" "$APP_DIR/Info.plist"
cp "$SCRIPT_DIR/Assets/"*.png "$APP_DIR/"
printf 'APPL????' > "$APP_DIR/PkgInfo"

echo "→ 编译 iOS arm64"
xcrun --sdk iphoneos swiftc \
  -swift-version 5 \
  -O \
  -module-name TIERLAB \
  -target arm64-apple-ios15.0 \
  -sdk "$SDK" \
  -Xcc -isysroot -Xcc "$SDK" \
  -Xlinker -syslibroot -Xlinker "$SDK" \
  -module-cache-path "$BUILD_DIR/module-cache" \
  -framework UIKit \
  -framework WebKit \
  -framework Network \
  -framework UniformTypeIdentifiers \
  "$SCRIPT_DIR/Sources/main.swift" \
  "$SCRIPT_DIR/Sources/AppDelegate.swift" \
  "$SCRIPT_DIR/Sources/SceneDelegate.swift" \
  "$SCRIPT_DIR/Sources/WebViewController.swift" \
  "$ROOT_DIR/macos/Sources/LocalHTTPServer.swift" \
  -o "$APP_DIR/$APP_NAME"

chmod +x "$APP_DIR/$APP_NAME"
xattr -cr "$BUILD_DIR/Payload" 2>/dev/null || true

echo "→ 打包 unsigned IPA"
(
  cd "$BUILD_DIR"
  ditto -c -k --sequesterRsrc --keepParent Payload "$IPA"
)

echo ""
echo "完成（未签名，供 Sideloadly / AltStore 重签）："
echo "  $IPA"
echo ""
echo "提示：要直接安装到别人的 iPhone，必须有对方的设备 UDID 和你的"
echo "Apple Developer 签名证书；仅靠未签名 IPA 无法直接双击安装。"
echo ""
file "$APP_DIR/$APP_NAME"
