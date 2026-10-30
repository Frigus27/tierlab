import Cocoa
import WebKit
import Darwin

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate,
    WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, WKScriptMessageHandler
{
    private let serverPort: UInt16 = 47821
    private var window: NSWindow?
    private var webView: WKWebView?
    private var server: LocalHTTPServer?
    private var loadingView: NSView?
    private var didLoadPage = false
    private var shouldTerminateImmediately = false

    private var isSelfTest = false
    private var didStartSelfTest = false
    private var didFinishSelfTestDownload = false
    private var selfTestDownloads: [WKDownload] = []

    private var paperColor: NSColor {
        NSColor(srgbRed: 242 / 255, green: 238 / 255, blue: 229 / 255, alpha: 1)
    }

    // MARK: - Lifecycle

    func applicationWillFinishLaunching(_ notification: Notification) {
        isSelfTest = CommandLine.arguments.contains("--self-test")
        NSApp.setActivationPolicy(isSelfTest ? .accessory : .regular)

        if !isSelfTest {
            terminateIfAnotherInstance()
        }
        if !shouldTerminateImmediately {
            buildMainMenu()
        }
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard !shouldTerminateImmediately else { return }
        createWindow()
        startLocalServer()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationShouldHandleReopen(
        _ sender: NSApplication,
        hasVisibleWindows flag: Bool
    ) -> Bool {
        if !flag {
            window?.makeKeyAndOrderFront(nil)
        }
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        server?.stop()
    }

    private func terminateIfAnotherInstance() {
        guard let bundleID = Bundle.main.bundleIdentifier else { return }
        let otherInstances = NSRunningApplication
            .runningApplications(withBundleIdentifier: bundleID)
            .filter { $0.processIdentifier != getpid() }

        if let other = otherInstances.first {
            other.activate(options: [.activateAllWindows])
            shouldTerminateImmediately = true
            DispatchQueue.main.async {
                NSApp.terminate(nil)
            }
        }
    }

    // MARK: - Window

    private func createWindow() {
        let visibleFrame = NSScreen.main?.visibleFrame ?? NSRect(
            x: 0, y: 0, width: 1440, height: 900
        )
        let width = min(1280, max(920, visibleFrame.width - 100))
        let height = min(900, max(620, visibleFrame.height - 100))
        let frame = NSRect(x: 0, y: 0, width: width, height: height)

        let window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "TIERLAB"
        window.contentMinSize = NSSize(width: 860, height: 600)
        window.isReleasedWhenClosed = false
        window.tabbingMode = .disallowed
        window.collectionBehavior = [.fullScreenPrimary]
        window.backgroundColor = paperColor
        window.delegate = self
        window.setFrameAutosaveName("TIERLABMainWindow")
        window.center()

        let content = NSView(frame: NSRect(origin: .zero, size: frame.size))
        content.autoresizingMask = [.width, .height]
        content.wantsLayer = true
        content.layer?.backgroundColor = paperColor.cgColor

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = isSelfTest ? .nonPersistent() : .default()
        configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let contentController = WKUserContentController()
        contentController.add(self, name: "pasteImage")
        configuration.userContentController = contentController

        let webView = WKWebView(frame: content.bounds, configuration: configuration)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsMagnification = true
        webView.underPageBackgroundColor = paperColor
        webView.isHidden = true
        if #available(macOS 13.3, *) {
            webView.isInspectable = true
        }

        content.addSubview(webView)
        let loading = makeLoadingView(frame: content.bounds)
        content.addSubview(loading)

        window.contentView = content
        window.makeKeyAndOrderFront(nil)
        if !isSelfTest {
            NSApp.activate(ignoringOtherApps: true)
        }

        self.window = window
        self.webView = webView
        self.loadingView = loading
    }

    private func makeLoadingView(frame: NSRect) -> NSView {
        let container = NSView(frame: frame)
        container.autoresizingMask = [.width, .height]
        container.wantsLayer = true
        container.layer?.backgroundColor = paperColor.cgColor

        let iconView = NSImageView()
        iconView.image = NSApp.applicationIconImage
        iconView.imageScaling = .scaleProportionallyUpOrDown
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconView.widthAnchor.constraint(equalToConstant: 68).isActive = true
        iconView.heightAnchor.constraint(equalToConstant: 68).isActive = true

        let title = NSTextField(labelWithString: "TIERLAB")
        title.font = NSFont.systemFont(ofSize: 25, weight: .black)
        title.textColor = NSColor(srgbRed: 23 / 255, green: 22 / 255, blue: 19 / 255, alpha: 1)

        let subtitle = NSTextField(labelWithString: "正在铺开你的榜单…")
        subtitle.font = NSFont.systemFont(ofSize: 12, weight: .regular)
        subtitle.textColor = NSColor(srgbRed: 116 / 255, green: 109 / 255, blue: 96 / 255, alpha: 1)

        let spinner = NSProgressIndicator()
        spinner.style = .spinning
        spinner.controlSize = .small
        spinner.startAnimation(nil)
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.widthAnchor.constraint(equalToConstant: 20).isActive = true
        spinner.heightAnchor.constraint(equalToConstant: 20).isActive = true

        let stack = NSStackView(views: [iconView, title, subtitle, spinner])
        stack.orientation = .vertical
        stack.alignment = .centerX
        stack.spacing = 9
        stack.setCustomSpacing(16, after: iconView)
        stack.setCustomSpacing(4, after: title)
        stack.setCustomSpacing(14, after: subtitle)
        stack.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: container.centerYAnchor, constant: -12),
        ])

        return container
    }

    private func startLocalServer() {
        guard let resourceURL = Bundle.main.resourceURL else {
            showFatalError(
                title: "TIERLAB 缺少资源",
                message: "App 内没有找到网页资源，请重新构建应用。"
            )
            return
        }

        let webRoot = resourceURL.appendingPathComponent("web", isDirectory: true)
        let server = LocalHTTPServer(webRoot: webRoot, port: serverPort)
        self.server = server
        server.start { [weak self] url in
            self?.load(url)
        } onFailure: { [weak self] error in
            guard let self else { return }
            if self.isSelfTest {
                print("SELF_TEST_SERVER_ERROR: \(error.localizedDescription)")
                exit(2)
            }
            self.showFatalError(
                title: "TIERLAB 无法启动",
                message: "本地页面服务启动失败。\n\n\(error.localizedDescription)\n\n请确认没有其他 TIERLAB 实例正在运行，然后重试。"
            )
        }
    }

    private func load(_ url: URL) {
        guard let webView else { return }
        var request = URLRequest(
            url: url,
            cachePolicy: .reloadIgnoringLocalCacheData,
            timeoutInterval: 20
        )
        request.setValue("TIERLAB-macOS/1.0", forHTTPHeaderField: "X-TIERLAB-Client")
        webView.load(request)
    }

    private func showFatalError(title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.addButton(withTitle: "退出")
        alert.runModal()
        NSApp.terminate(nil)
    }

    // MARK: - Navigation

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if !didLoadPage {
            didLoadPage = true
            webView.isHidden = false
            loadingView?.removeFromSuperview()
            loadingView = nil
            if isSelfTest {
                runSelfTest()
            }
        }
    }

    func webView(
        _ webView: WKWebView,
        didFail navigation: WKNavigation!,
        withError error: Error
    ) {
        handleNavigationFailure(error)
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        handleNavigationFailure(error)
    }

    private func handleNavigationFailure(_ error: Error) {
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
            return
        }
        if isSelfTest {
            print("SELF_TEST_NAVIGATION_ERROR: \(error.localizedDescription)")
            exit(3)
        }
        showFatalError(
            title: "TIERLAB 页面加载失败",
            message: "\(error.localizedDescription)\n\n应用会重新加载本地页面，请再试一次。"
        )
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if let url = navigationAction.request.url {
            let isLocal = url.host == "127.0.0.1" || url.host == "localhost"
            let isInternalScheme = ["http", "https", "blob", "data"].contains(url.scheme ?? "")
            if !isLocal && !isInternalScheme {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }
        }

        if navigationAction.shouldPerformDownload {
            decisionHandler(.download)
            return
        }

        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationResponse: WKNavigationResponse,
        decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
    ) {
        if !navigationResponse.canShowMIMEType {
            decisionHandler(.download)
            return
        }
        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        navigationAction: WKNavigationAction,
        didBecome download: WKDownload
    ) {
        download.delegate = self
        selfTestDownloads.append(download)
    }

    func webView(
        _ webView: WKWebView,
        navigationResponse: WKNavigationResponse,
        didBecome download: WKDownload
    ) {
        download.delegate = self
        selfTestDownloads.append(download)
    }

    func webView(
        _ webView: WKWebView,
        runOpenPanelWith parameters: WKOpenPanelParameters,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping ([URL]?) -> Void
    ) {
        DispatchQueue.main.async {
            let panel = NSOpenPanel()
            panel.title = "选择图片"
            panel.prompt = "选择"
            panel.allowsMultipleSelection = parameters.allowsMultipleSelection
            panel.canChooseDirectories = parameters.allowsDirectories
            panel.canChooseFiles = !parameters.allowsDirectories
            panel.canCreateDirectories = false
            panel.isExtensionHidden = false

            let finish: (NSApplication.ModalResponse) -> Void = { result in
                if result == .OK {
                    completionHandler(panel.urls)
                } else {
                    completionHandler(nil)
                }
            }

            if let window = self.window, window.isVisible {
                panel.beginSheetModal(for: window, completionHandler: finish)
            } else {
                panel.begin(completionHandler: finish)
            }
        }
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    // MARK: - Downloads

    func download(
        _ download: WKDownload,
        decideDestinationUsing response: URLResponse,
        suggestedFilename: String,
        completionHandler: @escaping (URL?) -> Void
    ) {
        if isSelfTest {
            let destination = URL(fileURLWithPath: "/tmp/tierlab-native-selftest.txt")
            try? FileManager.default.removeItem(at: destination)
            completionHandler(destination)
            return
        }

        DispatchQueue.main.async {
            NSApp.activate(ignoringOtherApps: true)
            let panel = NSSavePanel()
            panel.title = "保存导出的图片"
            panel.prompt = "保存"
            panel.nameFieldStringValue = suggestedFilename.isEmpty
                ? "tierlist.png"
                : suggestedFilename
            panel.canCreateDirectories = true
            panel.isExtensionHidden = false

            let finish: (NSApplication.ModalResponse) -> Void = { result in
                if result == .OK, let url = panel.url {
                    completionHandler(url)
                } else {
                    completionHandler(nil)
                }
            }

            if let window = self.window, window.isVisible {
                panel.beginSheetModal(for: window, completionHandler: finish)
            } else {
                panel.begin(completionHandler: finish)
            }
        }
    }

    func downloadDidFinish(_ download: WKDownload) {
        if isSelfTest {
            guard !didFinishSelfTestDownload else { return }
            didFinishSelfTestDownload = true
            let path = "/tmp/tierlab-native-selftest.txt"
            let size = (try? Data(contentsOf: URL(fileURLWithPath: path)).count) ?? 0
            print("SELF_TEST_DOWNLOAD_OK: \(size) bytes")
            try? FileManager.default.removeItem(atPath: path)
            finishSelfTest(exitCode: 0)
        }
    }

    func download(
        _ download: WKDownload,
        didFailWithError error: Error,
        resumeData: Data?
    ) {
        guard isSelfTest else { return }
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
            return
        }
        print("SELF_TEST_DOWNLOAD_ERROR: \(error.localizedDescription)")
        finishSelfTest(exitCode: 5)
    }

    // MARK: - Self test

    private func runSelfTest() {
        guard !didStartSelfTest, let webView else { return }
        didStartSelfTest = true

        webView.evaluateJavaScript(
            "document.querySelectorAll('#poolGrid .item-card').length"
        ) { [weak self] value, _ in
            guard let self else { return }
            let initialPoolCount = (value as? NSNumber)?.intValue ?? 0
            self.evaluateSelfTestState(initialPoolCount: initialPoolCount)
        }
    }

    private func evaluateSelfTestState(initialPoolCount: Int) {
        guard let webView else { return }

        let script = """
        (() => {
          const result = {
            title: document.querySelector('#boardTitle')?.value || '',
            tiers: document.querySelectorAll('.tier').length,
            cards: document.querySelectorAll('.item-card').length,
            pool: document.querySelectorAll('#poolGrid .item-card').length,
            bodyBackground: getComputedStyle(document.body).backgroundColor,
            url: location.href
          };
          try {
            localStorage.setItem('__tierlab_selftest__', 'ok');
            result.storage = localStorage.getItem('__tierlab_selftest__') === 'ok';
            localStorage.removeItem('__tierlab_selftest__');
          } catch (error) {
            result.storage = false;
            result.storageError = String(error);
          }
          return JSON.stringify(result);
        })()
        """

        webView.evaluateJavaScript(script) { [weak self] result, error in
            guard let self else { return }
            if let error {
                print("SELF_TEST_DOM_ERROR: \(error.localizedDescription)")
                self.finishSelfTest(exitCode: 6)
                return
            }
            print("SELF_TEST_RESULT: \(result ?? "nil")")
            self.testNativeClipboardPaste(initialPoolCount: initialPoolCount)
        }
    }

    private func testNativeClipboardPaste(initialPoolCount: Int) {
        guard let webView else {
            finishSelfTest(exitCode: 7)
            return
        }

        let pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAu0lEQVR4nO3bsQ3CAAwAQYIYhb2oEQOxHLskE4RU5CT839rF6+XWy/p6rJfBXLWApgBaQFMALaApgBbQ3A43np8TNH7M+747Gn8BBdACmgJoAU0BtICmAFpAUwAtoCmAFtAUQAtoCqAFNAXQApoCaAFNAbSApgBaQFMALaApgBbQFEALaAqgBTQF0AKaAmgBTQG0gKYAWkBTAC2gKYAW0BRAC2jGBzh+mPjybPAPjL+AAmgBTQG0gGZ8gA0xDwYHbPhDrgAAAABJRU5ErkJggg=="

        guard let pngData = Data(base64Encoded: pngBase64) else {
            print("SELF_TEST_PASTE_SETUP_ERROR")
            finishSelfTest(exitCode: 9)
            return
        }

        let testPasteboard = NSPasteboard(
            name: NSPasteboard.Name("app.tierlab.selftest.\(UUID().uuidString)")
        )
        testPasteboard.clearContents()
        testPasteboard.setData(pngData, forType: .png)
        pasteImage(from: testPasteboard)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { [weak self] in
            guard let self else { return }
            webView.evaluateJavaScript(
                "document.querySelectorAll('#poolGrid .item-card').length"
            ) { value, error in
                if let error {
                    print("SELF_TEST_PASTE_EVAL_ERROR: \(error.localizedDescription)")
                    self.finishSelfTest(exitCode: 9)
                    return
                }
                let newCount = (value as? NSNumber)?.intValue ?? -1
                if newCount == initialPoolCount + 1 {
                    print("SELF_TEST_PASTE_OK: \(initialPoolCount) -> \(newCount)")
                    self.triggerSelfTestDownload()
                } else {
                    print("SELF_TEST_PASTE_FAILED: \(initialPoolCount) -> \(newCount)")
                    self.finishSelfTest(exitCode: 9)
                }
            }
        }
    }

    private func triggerSelfTestDownload() {
        guard let webView else {
            finishSelfTest(exitCode: 7)
            return
        }

        let script = """
        (() => {
          const blob = new Blob(['TIERLAB native download test'], {type: 'text/plain'});
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = 'tierlab-selftest.txt';
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          return true;
        })()
        """

        webView.evaluateJavaScript(script, completionHandler: nil)

        DispatchQueue.main.asyncAfter(deadline: .now() + 7) { [weak self] in
            guard let self, !self.didFinishSelfTestDownload else { return }
            print("SELF_TEST_DOWNLOAD_TIMEOUT")
            self.finishSelfTest(exitCode: 8)
        }
    }

    private func finishSelfTest(exitCode: Int32) {
        server?.stop()
        server = nil
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            exit(exitCode)
        }
    }

    // MARK: - Clipboard paste

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "pasteImage" else { return }
        pasteImageFromPasteboard()
    }

    private func pasteImageFromPasteboard() {
        pasteImage(from: .general)
    }

    private func pasteImage(from pasteboard: NSPasteboard) {
        guard didLoadPage, let webView else { return }

        func deliver(_ pngData: Data, name: String) {
            let dataURL = "data:image/png;base64,\(pngData.base64EncodedString())"
            let payload: [String: Any] = [
                "dataURL": dataURL,
                "name": name
            ]
            guard
                let jsonData = try? JSONSerialization.data(withJSONObject: payload),
                let json = String(data: jsonData, encoding: .utf8)
            else {
                return
            }
            webView.evaluateJavaScript(
                "window.tierlabPasteImage && window.tierlabPasteImage(\(json));",
                completionHandler: nil
            )
        }

        if
            let data = pasteboard.data(forType: .png),
            let image = NSImage(data: data),
            let png = self.pngData(from: image)
        {
            deliver(png, name: "剪贴板图片")
            return
        }

        if
            let data = pasteboard.data(forType: .tiff),
            let image = NSImage(data: data),
            let png = self.pngData(from: image)
        {
            deliver(png, name: "剪贴板图片")
            return
        }

        let imageExtensions: Set<String> = [
            "png", "jpg", "jpeg", "webp", "gif", "tiff", "tif", "heic", "bmp"
        ]
        if let urls = pasteboard.readObjects(
            forClasses: [NSURL.self],
            options: [.urlReadingFileURLsOnly: true]
        ) as? [URL] {
            for url in urls where imageExtensions.contains(url.pathExtension.lowercased()) {
                guard
                    let data = try? Data(contentsOf: url),
                    let image = NSImage(data: data),
                    let png = self.pngData(from: image)
                else {
                    continue
                }
                let name = url.deletingPathExtension().lastPathComponent
                deliver(png, name: name.isEmpty ? "剪贴板图片" : name)
                return
            }
        }

        NSSound.beep()
        webView.evaluateJavaScript(
            "window.tierlabNotify && window.tierlabNotify('剪贴板里没有图片')",
            completionHandler: nil
        )
    }

    private func pngData(from image: NSImage, maxDimension: CGFloat = 1600) -> Data? {
        guard
            let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
        else {
            return nil
        }

        let sourceWidth = cgImage.width
        let sourceHeight = cgImage.height
        guard sourceWidth > 0, sourceHeight > 0 else { return nil }

        let scale = min(1, maxDimension / CGFloat(max(sourceWidth, sourceHeight)))
        let width = max(1, Int((CGFloat(sourceWidth) * scale).rounded()))
        let height = max(1, Int((CGFloat(sourceHeight) * scale).rounded()))

        guard let context = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return nil
        }

        context.interpolationQuality = .high
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        guard let scaledImage = context.makeImage() else { return nil }

        let bitmap = NSBitmapImageRep(cgImage: scaledImage)
        return bitmap.representation(using: .png, properties: [:])
    }

    // MARK: - Menu

    private func menuItem(
        _ title: String,
        action: Selector?,
        key: String = "",
        modifiers: NSEvent.ModifierFlags = .command,
        target: AnyObject? = nil
    ) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
        item.keyEquivalentModifierMask = modifiers
        item.target = target
        return item
    }

    private func buildMainMenu() {
        let mainMenu = NSMenu()

        // Application menu.
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu(title: "TIERLAB")
        appMenu.addItem(menuItem(
            "关于 TIERLAB",
            action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
            target: NSApp
        ))
        appMenu.addItem(.separator())
        appMenu.addItem(menuItem(
            "隐藏 TIERLAB",
            action: #selector(NSApplication.hide(_:)),
            key: "h",
            target: NSApp
        ))
        let hideOthers = menuItem(
            "隐藏其他",
            action: #selector(NSApplication.hideOtherApplications(_:)),
            key: "h",
            modifiers: [.command, .option],
            target: NSApp
        )
        appMenu.addItem(hideOthers)
        appMenu.addItem(menuItem(
            "显示全部",
            action: #selector(NSApplication.unhideAllApplications(_:)),
            target: NSApp
        ))
        appMenu.addItem(.separator())
        appMenu.addItem(menuItem(
            "退出 TIERLAB",
            action: #selector(NSApplication.terminate(_:)),
            key: "q",
            target: NSApp
        ))
        appMenuItem.submenu = appMenu

        // File menu.
        let fileMenuItem = NSMenuItem()
        mainMenu.addItem(fileMenuItem)
        let fileMenu = NSMenu(title: "文件")
        fileMenu.addItem(menuItem(
            "新建空白榜单",
            action: #selector(menuNewList),
            key: "n",
            target: self
        ))
        fileMenu.addItem(menuItem(
            "打开模板…",
            action: #selector(menuTemplates),
            key: "t",
            modifiers: [.command, .shift],
            target: self
        ))
        fileMenu.addItem(menuItem(
            "导出图片…",
            action: #selector(menuExport),
            key: "e",
            target: self
        ))
        fileMenu.addItem(.separator())
        fileMenu.addItem(menuItem(
            "关闭窗口",
            action: #selector(NSWindow.performClose(_:)),
            key: "w",
            target: nil
        ))
        fileMenuItem.submenu = fileMenu

        // Edit menu.
        let editMenuItem = NSMenuItem()
        mainMenu.addItem(editMenuItem)
        let editMenu = NSMenu(title: "编辑")
        editMenu.addItem(menuItem(
            "撤销",
            action: #selector(menuUndo),
            key: "z",
            target: self
        ))
        editMenu.addItem(menuItem(
            "重做",
            action: #selector(menuRedo),
            key: "z",
            modifiers: [.command, .shift],
            target: self
        ))
        editMenu.addItem(.separator())
        editMenu.addItem(menuItem("剪切", action: #selector(NSText.cut(_:)), key: "x"))
        editMenu.addItem(menuItem("复制", action: #selector(NSText.copy(_:)), key: "c"))
        editMenu.addItem(menuItem("粘贴", action: #selector(NSText.paste(_:)), key: "v"))
        editMenu.addItem(menuItem(
            "从剪贴板粘贴图片",
            action: #selector(menuPasteImage),
            key: "v",
            modifiers: [.command, .shift],
            target: self
        ))
        editMenu.addItem(menuItem("全选", action: #selector(NSText.selectAll(_:)), key: "a"))
        editMenuItem.submenu = editMenu

        // View menu.
        let viewMenuItem = NSMenuItem()
        mainMenu.addItem(viewMenuItem)
        let viewMenu = NSMenu(title: "显示")
        viewMenu.addItem(menuItem(
            "重新载入",
            action: #selector(menuReload),
            key: "r",
            target: self
        ))
        viewMenu.addItem(.separator())
        viewMenu.addItem(menuItem(
            "放大",
            action: #selector(menuZoomIn),
            key: "=",
            target: self
        ))
        viewMenu.addItem(menuItem(
            "缩小",
            action: #selector(menuZoomOut),
            key: "-",
            target: self
        ))
        viewMenu.addItem(menuItem(
            "实际大小",
            action: #selector(menuActualSize),
            key: "0",
            target: self
        ))
        viewMenu.addItem(.separator())
        viewMenu.addItem(menuItem(
            "进入全屏幕",
            action: #selector(NSWindow.toggleFullScreen(_:)),
            key: "f",
            modifiers: [.command, .control],
            target: nil
        ))
        viewMenuItem.submenu = viewMenu

        // Window menu.
        let windowMenuItem = NSMenuItem()
        mainMenu.addItem(windowMenuItem)
        let windowMenu = NSMenu(title: "窗口")
        windowMenu.addItem(menuItem(
            "最小化",
            action: #selector(NSWindow.performMiniaturize(_:)),
            key: "m",
            target: nil
        ))
        windowMenu.addItem(menuItem(
            "缩放",
            action: #selector(NSWindow.performZoom(_:)),
            target: nil
        ))
        windowMenu.addItem(.separator())
        windowMenu.addItem(menuItem(
            "前置全部窗口",
            action: #selector(NSApplication.arrangeInFront(_:)),
            target: NSApp
        ))
        windowMenuItem.submenu = windowMenu
        NSApp.windowsMenu = windowMenu

        // Help menu.
        let helpMenuItem = NSMenuItem()
        mainMenu.addItem(helpMenuItem)
        let helpMenu = NSMenu(title: "帮助")
        helpMenu.addItem(menuItem(
            "TIERLAB 使用说明",
            action: #selector(menuHelp),
            target: self
        ))
        helpMenuItem.submenu = helpMenu
        NSApp.helpMenu = helpMenu

        NSApp.mainMenu = mainMenu
    }

    private func runJS(_ script: String) {
        guard didLoadPage, let webView else { return }
        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    @objc private func menuNewList() {
        runJS("""
        document.querySelector('dialog[open]')?.close();
        document.activeElement?.blur();
        document.querySelector('#newBtn')?.click();
        """)
    }

    @objc private func menuTemplates() {
        runJS("""
        document.querySelector('dialog[open]')?.close();
        document.querySelector('#openTemplatesBtn')?.click();
        """)
    }

    @objc private func menuExport() {
        runJS("""
        document.querySelector('dialog[open]')?.close();
        document.querySelector('#openExportBtn')?.click();
        """)
    }

    @objc private func menuPasteImage() {
        pasteImageFromPasteboard()
    }

    @objc private func menuUndo() {
        runJS("document.querySelector('#undoBtn')?.click()")
    }

    @objc private func menuRedo() {
        runJS("document.querySelector('#redoBtn')?.click()")
    }

    @objc private func menuHelp() {
        runJS("""
        document.querySelector('dialog[open]')?.close();
        document.querySelector('[data-open-help]')?.click();
        """)
    }

    @objc private func menuReload() {
        webView?.reload()
    }

    @objc private func menuZoomIn() {
        guard let webView else { return }
        webView.pageZoom = min(2.0, webView.pageZoom + 0.1)
    }

    @objc private func menuZoomOut() {
        guard let webView else { return }
        webView.pageZoom = max(0.6, webView.pageZoom - 0.1)
    }

    @objc private func menuActualSize() {
        webView?.pageZoom = 1.0
    }
}
