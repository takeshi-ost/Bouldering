// Test-only source appended in a disposable CI checkout. Never a product source.
#if DEBUG && targetEnvironment(simulator)
private final class AscentRuntimeSmokeReporter: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    private var images: [[String: Any]] = []
    private var finished = false
    private let names: Set<String> = ["title", "intro-first", "stage-settings", "help", "map-start"]
    private let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        .appendingPathComponent("ascent-runtime-smoke", isDirectory: true)
    init(_ webView: WKWebView) {
        self.webView = webView
        super.init()
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard !finished, let value = message.body as? [String: Any] else { return }
        if value["kind"] as? String == "capture", let name = value["name"] as? String,
           names.contains(name), !images.contains(where: { $0["name"] as? String == name }), images.count < 5 {
            webView?.takeSnapshot(with: nil) { [weak self] image, error in
                guard let self = self, !self.finished else { return }
                if let image = image, let png = image.pngData(), png.count <= 2_000_000 {
                    do {
                        try png.write(to: self.folder.appendingPathComponent(name + ".png"), options: .atomic)
                        self.images.append(["name": name, "bytes": png.count, "width": image.size.width, "height": image.size.height])
                    } catch { self.images.append(["name": name, "error": "write-failed"]) }
                } else { self.images.append(["name": name, "error": "snapshot-unavailable"]) }
                self.webView?.evaluateJavaScript("globalThis.__ascentSmokeCaptureAck='\(name)'", completionHandler: nil)
            }
        } else if value["kind"] as? String == "result", let report = value["report"] as? [String: Any] {
            finished = true
            // No arbitrary game state, saves, player identifiers or network data.
            let checks = (report["checks"] as? [String] ?? []).prefix(100).map { String($0.prefix(150)) }
            let safe: [String: Any] = ["ok": report["ok"] as? Bool ?? false,
                "checks": checks, "error": String((report["error"] as? String ?? "").prefix(300)),
                "images": images, "scope": "real-WKWebView; programmatic-DOM-and-route-input; offline-fresh-simulator"]
            if let data = try? JSONSerialization.data(withJSONObject: safe, options: [.sortedKeys]) {
                try? data.write(to: folder.appendingPathComponent("report.json"), options: .atomic)
            }
        }
    }
}
extension AscentBridgeViewController {
    fileprivate func installAscentRuntimeSmoke() {
        guard ProcessInfo.processInfo.environment["ASCENT_RUNTIME_SMOKE"] == "1",
              Bundle.main.object(forInfoDictionaryKey: "ASCENTFirebaseMode") as? String == "offline",
              let webView = webView,
              let data = Data(base64Encoded: "__SCRIPT_BASE64__"),
              let script = String(data: data, encoding: .utf8) else { return }
        webView.configuration.userContentController.add(AscentRuntimeSmokeReporter(webView), name: "ascentRuntimeSmoke")
        webView.configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
    }
}
#endif
