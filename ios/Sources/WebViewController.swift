import UIKit
import WebKit
import UniformTypeIdentifiers

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate,
    WKScriptMessageHandler, WKDownloadDelegate
{
    private let serverPort: UInt16 = 47821
    private let paperColor = UIColor(
        red: 242 / 255,
        green: 238 / 255,
        blue: 229 / 255,
        alpha: 1
    )

    private var server: LocalHTTPServer?
    private var webView: WKWebView!
    private var loadingView: UIView?
    private var didLoadPage = false
    private var downloadDestinations: [ObjectIdentifier: URL] = [:]

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = paperColor
        setupWebView()
        startLocalServer()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        .darkContent
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        UIDevice.current.userInterfaceIdiom == .pad ? .all : .allButUpsideDown
    }

    override var prefersHomeIndicatorAutoHidden: Bool {
        false
    }

    private func setupWebView() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.allowsInlineMediaPlayback = true

        let contentController = WKUserContentController()
        contentController.add(self, name: "pasteImage")
        contentController.add(self, name: "shareImage")
        contentController.addUserScript(
            WKUserScript(
                source: """
                (function () {
                  function mark() {
                    document.documentElement.classList.add('native-ios');
                  }
                  if (document.documentElement) mark();
                  else document.addEventListener('DOMContentLoaded', mark);
                })();
                """,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
        configuration.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.backgroundColor = paperColor
        webView.backgroundColor = paperColor
        webView.isOpaque = false
        webView.isHidden = true
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
        ])

        self.webView = webView
        self.loadingView = makeLoadingView()
    }

    private func makeLoadingView() -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = paperColor

        let title = UILabel()
        title.text = "TIERLAB"
        title.font = UIFont.systemFont(ofSize: 24, weight: .black)
        title.textColor = UIColor(
            red: 23 / 255,
            green: 22 / 255,
            blue: 19 / 255,
            alpha: 1
        )

        let subtitle = UILabel()
        subtitle.text = "正在把榜单铺开…"
        subtitle.font = UIFont.systemFont(ofSize: 12, weight: .regular)
        subtitle.textColor = UIColor(
            red: 116 / 255,
            green: 109 / 255,
            blue: 96 / 255,
            alpha: 1
        )

        let spinner = UIActivityIndicatorView(style: .medium)
        spinner.startAnimating()

        let stack = UIStackView(arrangedSubviews: [title, subtitle, spinner])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 8
        stack.setCustomSpacing(16, after: subtitle)
        stack.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(stack)
        view.addSubview(container)

        NSLayoutConstraint.activate([
            container.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            container.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            container.topAnchor.constraint(equalTo: view.topAnchor),
            container.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            stack.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: container.centerYAnchor, constant: -12),
        ])

        return container
    }

    private func startLocalServer() {
        guard let resourceURL = Bundle.main.resourceURL else {
            showFatalError("App 内没有找到网页资源，请重新构建应用。")
            return
        }

        let webRoot = resourceURL.appendingPathComponent("web", isDirectory: true)
        let server = LocalHTTPServer(webRoot: webRoot, port: serverPort)
        self.server = server
        server.start { [weak self] url in
            guard let self else { return }
            var request = URLRequest(
                url: url,
                cachePolicy: .reloadIgnoringLocalCacheData,
                timeoutInterval: 20
            )
            request.setValue("TIERLAB-iOS/1.0", forHTTPHeaderField: "X-TIERLAB-Client")
            self.webView.load(request)
        } onFailure: { [weak self] error in
            self?.showFatalError(
                "本地页面服务启动失败。\n\n\(error.localizedDescription)"
            )
        }
    }

    private func showFatalError(_ message: String) {
        let alert = UIAlertController(
            title: "TIERLAB 无法启动",
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "好", style: .default))
        present(alert, animated: true)
    }

    // MARK: - Navigation

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard !didLoadPage else { return }
        didLoadPage = true
        webView.isHidden = false
        loadingView?.removeFromSuperview()
        loadingView = nil
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
        showFatalError(error.localizedDescription)
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if let url = navigationAction.request.url {
            let isLocal = url.host == "127.0.0.1" || url.host == "localhost"
            let scheme = url.scheme ?? ""
            let isInternal = ["http", "https", "blob", "data"].contains(scheme)
            if !isLocal && !isInternal {
                UIApplication.shared.open(url)
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
    }

    func webView(
        _ webView: WKWebView,
        navigationResponse: WKNavigationResponse,
        didBecome download: WKDownload
    ) {
        download.delegate = self
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            UIApplication.shared.open(url)
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
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("TIERLABDownloads", isDirectory: true)
        try? FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )

        let sourceName = suggestedFilename.isEmpty ? "tierlist.png" : suggestedFilename
        let safeName = URL(fileURLWithPath: sourceName).lastPathComponent
        let destination = directory.appendingPathComponent(safeName)
        try? FileManager.default.removeItem(at: destination)
        downloadDestinations[ObjectIdentifier(download)] = destination
        completionHandler(destination)
    }

    func downloadDidFinish(_ download: WKDownload) {
        guard let url = downloadDestinations.removeValue(forKey: ObjectIdentifier(download)) else {
            return
        }
        presentShareSheet(for: url)
    }

    private func presentShareSheet(for url: URL) {
        DispatchQueue.main.async {
            let activity = UIActivityViewController(
                activityItems: [url],
                applicationActivities: nil
            )
            activity.completionWithItemsHandler = { _, _, _, _ in
                try? FileManager.default.removeItem(at: url)
            }

            if let popover = activity.popoverPresentationController {
                popover.sourceView = self.view
                popover.sourceRect = CGRect(
                    x: self.view.bounds.midX,
                    y: self.view.bounds.maxY - 2,
                    width: 1,
                    height: 1
                )
                popover.permittedArrowDirections = []
            }

            self.present(activity, animated: true)
        }
    }

    func download(
        _ download: WKDownload,
        didFailWithError error: Error,
        resumeData: Data?
    ) {
        downloadDestinations.removeValue(forKey: ObjectIdentifier(download))
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
            return
        }

        DispatchQueue.main.async {
            let alert = UIAlertController(
                title: "下载失败",
                message: error.localizedDescription,
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "好", style: .default))
            self.present(alert, animated: true)
        }
    }

    // MARK: - Clipboard paste

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        switch message.name {
        case "pasteImage":
            pasteImageFromPasteboard()
        case "shareImage":
            handleSharedImage(message.body)
        default:
            break
        }
    }

    private func handleSharedImage(_ body: Any) {
        guard
            let payload = body as? [String: Any],
            let dataURL = payload["dataURL"] as? String,
            let comma = dataURL.firstIndex(of: ","),
            let data = Data(
                base64Encoded: String(dataURL[dataURL.index(after: comma)...])
            )
        else {
            notifyPage("图片生成失败，请重试")
            return
        }

        let requestedName = (payload["filename"] as? String) ?? "tierlist.png"
        let safeName = URL(fileURLWithPath: requestedName).lastPathComponent
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("TIERLABExports", isDirectory: true)
        try? FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )
        let url = directory.appendingPathComponent(
            safeName.isEmpty ? "tierlist.png" : safeName
        )
        try? FileManager.default.removeItem(at: url)

        do {
            try data.write(to: url, options: .atomic)
            presentShareSheet(for: url)
        } catch {
            notifyPage("图片保存失败，请重试")
        }
    }

    private func pasteImageFromPasteboard() {
        let pasteboard = UIPasteboard.general
        var image = pasteboard.image
        if image == nil, pasteboard.hasImages {
            if let data = pasteboard.data(forPasteboardType: UTType.png.identifier) {
                image = UIImage(data: data)
            }
        }
        if image == nil {
            if let data = pasteboard.data(forPasteboardType: UTType.tiff.identifier) {
                image = UIImage(data: data)
            }
        }

        guard let image, let pngData = resizedPNGData(from: image) else {
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
            notifyPage("剪贴板里没有图片")
            return
        }

        let payload: [String: Any] = [
            "dataURL": "data:image/png;base64,\(pngData.base64EncodedString())",
            "name": "剪贴板图片",
        ]
        guard
            let jsonData = try? JSONSerialization.data(withJSONObject: payload),
            let json = String(data: jsonData, encoding: .utf8)
        else {
            notifyPage("无法读取剪贴板里的图片")
            return
        }

        webView.evaluateJavaScript(
            "window.tierlabPasteImage && window.tierlabPasteImage(\(json));",
            completionHandler: nil
        )
    }

    private func notifyPage(_ message: String) {
        let escaped = message
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
        webView.evaluateJavaScript(
            "window.tierlabNotify && window.tierlabNotify('\(escaped)')",
            completionHandler: nil
        )
    }

    private func resizedPNGData(from image: UIImage, maxDimension: CGFloat = 1600) -> Data? {
        let pixelWidth = image.size.width * image.scale
        let pixelHeight = image.size.height * image.scale
        guard pixelWidth > 0, pixelHeight > 0 else { return image.pngData() }

        let ratio = min(1, maxDimension / max(pixelWidth, pixelHeight))
        if ratio >= 0.999 {
            return image.pngData()
        }

        let target = CGSize(
            width: max(1, (pixelWidth * ratio).rounded()),
            height: max(1, (pixelHeight * ratio).rounded())
        )
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = false
        let renderer = UIGraphicsImageRenderer(size: target, format: format)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
        return resized.pngData()
    }
}
