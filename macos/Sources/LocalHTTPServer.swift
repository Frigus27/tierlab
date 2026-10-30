import Foundation
import Network

/// A tiny loopback-only HTTP server used to give WKWebView a stable, secure
/// origin. Serving the bundled UI over http://127.0.0.1:<port> keeps
/// localStorage, clipboard access, file uploads, and blob downloads working
/// exactly as they do in a normal browser.
final class LocalHTTPServer {
    enum ServerError: LocalizedError {
        case invalidPort
        case cannotBind(String)

        var errorDescription: String? {
            switch self {
            case .invalidPort:
                return "本地服务端口无效。"
            case .cannotBind(let detail):
                return "无法启动本地服务：\(detail)"
            }
        }
    }

    private let webRoot: URL
    private let port: UInt16
    private let queue = DispatchQueue(label: "app.tierlab.local-http", qos: .userInitiated)
    private var listener: NWListener?
    private var didReportReady = false
    private var didReportFailure = false
    private var onReady: ((URL) -> Void)?
    private var onFailure: ((Error) -> Void)?

    init(webRoot: URL, port: UInt16 = 47821) {
        self.webRoot = webRoot.standardizedFileURL
        self.port = port
    }

    func start(
        onReady: @escaping (URL) -> Void,
        onFailure: @escaping (Error) -> Void
    ) {
        self.onReady = onReady
        self.onFailure = onFailure

        guard let nwPort = NWEndpoint.Port(rawValue: port) else {
            fail(ServerError.invalidPort)
            return
        }

        let parameters = NWParameters.tcp
        parameters.allowLocalEndpointReuse = true
        parameters.requiredLocalEndpoint = .hostPort(
            host: .ipv4(.loopback),
            port: nwPort
        )

        do {
            let listener = try NWListener(using: parameters)
            self.listener = listener

            listener.stateUpdateHandler = { [weak self] state in
                guard let self else { return }
                switch state {
                case .ready:
                    guard !self.didReportReady else { return }
                    self.didReportReady = true
                    guard let url = URL(string: "http://127.0.0.1:\(self.port)/") else {
                        self.fail(ServerError.invalidPort)
                        return
                    }
                    DispatchQueue.main.async {
                        self.onReady?(url)
                    }
                case .failed(let error):
                    self.fail(error)
                case .cancelled:
                    self.listener = nil
                default:
                    break
                }
            }

            listener.newConnectionHandler = { [weak self] connection in
                self?.accept(connection)
            }

            listener.start(queue: queue)
        } catch {
            fail(error)
        }
    }

    func stop() {
        listener?.cancel()
        listener = nil
    }

    deinit {
        stop()
    }

    private func fail(_ error: Error) {
        guard !didReportFailure else { return }
        didReportFailure = true
        listener?.cancel()
        listener = nil
        DispatchQueue.main.async {
            self.onFailure?(error)
        }
    }

    // MARK: - Connections

    private func accept(_ connection: NWConnection) {
        connection.start(queue: queue)
        receive(on: connection, buffer: Data())
    }

    private func receive(on connection: NWConnection, buffer: Data) {
        connection.receive(
            minimumIncompleteLength: 1,
            maximumLength: 64 * 1024
        ) { [weak self] data, _, isComplete, error in
            guard let self else {
                connection.cancel()
                return
            }

            var buffer = buffer
            if let data {
                buffer.append(data)
            }

            if buffer.count > 128 * 1024 {
                self.sendError(
                    on: connection,
                    status: 413,
                    reason: "Payload Too Large",
                    method: "GET"
                )
                return
            }

            if let headerRange = buffer.range(of: Data("\r\n\r\n".utf8)) {
                let headerData = buffer.subdata(in: 0..<headerRange.lowerBound)
                guard let header = String(data: headerData, encoding: .utf8) else {
                    self.sendError(
                        on: connection,
                        status: 400,
                        reason: "Bad Request",
                        method: "GET"
                    )
                    return
                }
                self.respond(to: header, on: connection)
                return
            }

            if isComplete || error != nil {
                connection.cancel()
                return
            }

            self.receive(on: connection, buffer: buffer)
        }
    }

    // MARK: - Request handling

    private func respond(to header: String, on connection: NWConnection) {
        let lines = header.components(separatedBy: "\r\n")
        guard let requestLine = lines.first else {
            sendError(on: connection, status: 400, reason: "Bad Request", method: "GET")
            return
        }

        let parts = requestLine.split(separator: " ", omittingEmptySubsequences: true)
        guard parts.count >= 2 else {
            sendError(on: connection, status: 400, reason: "Bad Request", method: "GET")
            return
        }

        let method = String(parts[0]).uppercased()
        guard method == "GET" || method == "HEAD" else {
            sendError(on: connection, status: 405, reason: "Method Not Allowed", method: method)
            return
        }

        var requestPath = String(parts[1])
        if let queryIndex = requestPath.firstIndex(of: "?") {
            requestPath = String(requestPath[..<queryIndex])
        }
        if let fragmentIndex = requestPath.firstIndex(of: "#") {
            requestPath = String(requestPath[..<fragmentIndex])
        }

        let decodedPath = requestPath.removingPercentEncoding ?? requestPath
        let relativePath: String
        if decodedPath.isEmpty || decodedPath == "/" {
            relativePath = "index.html"
        } else if decodedPath.hasPrefix("/") {
            relativePath = String(decodedPath.dropFirst())
        } else {
            relativePath = decodedPath
        }

        let rootPath = webRoot.path.hasSuffix("/") ? webRoot.path : webRoot.path + "/"
        let fileURL = webRoot.appendingPathComponent(relativePath).standardizedFileURL
        guard fileURL.path == webRoot.path || fileURL.path.hasPrefix(rootPath) else {
            sendError(on: connection, status: 403, reason: "Forbidden", method: method)
            return
        }

        var isDirectory: ObjCBool = false
        guard
            FileManager.default.fileExists(atPath: fileURL.path, isDirectory: &isDirectory),
            !isDirectory.boolValue
        else {
            sendError(on: connection, status: 404, reason: "Not Found", method: method)
            return
        }

        guard let body = try? Data(contentsOf: fileURL) else {
            sendError(on: connection, status: 500, reason: "Internal Server Error", method: method)
            return
        }

        send(
            on: connection,
            status: 200,
            reason: "OK",
            contentType: mimeType(for: fileURL.pathExtension),
            body: body,
            includeBody: method == "GET"
        )
    }

    private func mimeType(for pathExtension: String) -> String {
        switch pathExtension.lowercased() {
        case "html", "htm":
            return "text/html; charset=utf-8"
        case "css":
            return "text/css; charset=utf-8"
        case "js", "mjs":
            return "text/javascript; charset=utf-8"
        case "json":
            return "application/json; charset=utf-8"
        case "webmanifest":
            return "application/manifest+json; charset=utf-8"
        case "svg":
            return "image/svg+xml"
        case "png":
            return "image/png"
        case "jpg", "jpeg":
            return "image/jpeg"
        case "webp":
            return "image/webp"
        case "ico":
            return "image/x-icon"
        case "woff2":
            return "font/woff2"
        case "txt":
            return "text/plain; charset=utf-8"
        default:
            return "application/octet-stream"
        }
    }

    private func sendError(
        on connection: NWConnection,
        status: Int,
        reason: String,
        method: String
    ) {
        let body = Data("\(status) \(reason)\n".utf8)
        send(
            on: connection,
            status: status,
            reason: reason,
            contentType: "text/plain; charset=utf-8",
            body: body,
            includeBody: method != "HEAD"
        )
    }

    private func send(
        on connection: NWConnection,
        status: Int,
        reason: String,
        contentType: String,
        body: Data,
        includeBody: Bool
    ) {
        var response = Data()
        var headers = "HTTP/1.1 \(status) \(reason)\r\n"
        headers += "Content-Type: \(contentType)\r\n"
        headers += "Content-Length: \(body.count)\r\n"
        headers += "Cache-Control: no-store\r\n"
        headers += "Connection: close\r\n"
        headers += "X-Content-Type-Options: nosniff\r\n"
        headers += "Referrer-Policy: no-referrer\r\n"
        headers += "\r\n"
        response.append(Data(headers.utf8))
        if includeBody {
            response.append(body)
        }

        connection.send(content: response, completion: .contentProcessed { _ in
            connection.cancel()
        })
    }
}
