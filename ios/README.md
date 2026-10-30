# TIERLAB for iOS

iOS 版是一个原生 WKWebView 壳，网页资源全部打包在 App 内，通过本机回环地址
`http://127.0.0.1:47821` 加载，因此 localStorage、相册/文件选择、粘贴板和分享面板都可用。

## 产物

```text
dist/TIERLAB-1.0.1-ios-unsigned.ipa
```

- 架构：arm64
- 最低系统：iOS 15.0
- Bundle ID：`app.tierlab.ios`
- 状态：**未签名 IPA**

## 为什么是未签名 IPA？

苹果不允许安装没有签名的 iOS App。要生成能直接装到某台 iPhone 的 IPA，需要：

1. Apple Developer 签名证书（免费 Apple ID 也可以，但只有 7 天有效期）；以及
2. 把目标设备的 UDID 加入对应的 provisioning profile（或使用 TestFlight / App Store）。

当前构建机没有签名证书，也没有对方设备 UDID，所以只能产出未签名 IPA。
它不能双击安装，但可以用 Sideloadly / AltStore 在对方电脑上重签安装。

## 用 Sideloadly 安装（推荐发给朋友）

1. 朋友在 Mac / Windows 安装 [Sideloadly](https://sideloadly.io/)。
2. 用数据线连接 iPhone，解锁并点「信任此电脑」。
3. 把 `TIERLAB-1.0.1-ios-unsigned.ipa` 拖进 Sideloadly。
4. 输入朋友自己的 Apple ID，点击 Start。
5. 安装完成后，在 iPhone 的
   `设置 → 通用 → VPN 与设备管理` 中信任对应的开发者证书。
6. 回到桌面打开 TIERLAB。

免费 Apple ID 的签名 **7 天后过期**，到时重新用 Sideloadly 签一次即可；
一个免费账号最多同时签 3 个 App。

AltStore 的流程类似，也需要在电脑上跑 AltServer。

## 如果朋友有付费开发者账号

可以让对方把设备 UDID 注册到开发者账号，然后使用开发证书导出 development IPA；
或者直接把 App 上传到 TestFlight 邀请对方测试。TestFlight 构建有效期 90 天，不需要
对方电脑，但需要开发者账号。

仅靠当前产物无法绕过苹果的签名机制。

## 重新构建

需要 Xcode 和 iOS SDK：

```bash
cd sites/tierlab
./ios/build.sh
```

产物会写到 `dist/TIERLAB-1.0.1-ios-unsigned.ipa`。

## iOS 端已处理

- 固定 loopback HTTP 服务，保证 `localStorage` 有稳定 origin
- `viewport-fit=cover` + 安全区约束
- 从剪贴板粘贴图片（上传面板的「粘贴图片」按钮）
- 导出 PNG 时打开系统分享面板，可保存到相册、AirDrop 或直接发微信
- 相册/文件选择使用 WebKit 默认的 Safari 文件选择行为
- iPad 分屏和 iPhone 横竖屏布局
- 不透明 iOS 图标（iOS 自己负责圆角裁切）
