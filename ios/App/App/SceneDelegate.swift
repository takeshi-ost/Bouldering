import UIKit
import Capacitor
import WebKit
import AVFAudio

// BEGIN native resume policy. Foundation-only so the real policy can be tested.
private final class NativeResumeState {
    static let shared = NativeResumeState()
    static let backgroundLimit: TimeInterval = 300
    private let defaults: UserDefaults
    private let key = "ascent.ios.resume.v1"

    init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    private var record: [String: Any] { defaults.dictionary(forKey: key) ?? [:] }
    var pendingID: String? {
        guard let id = record["pendingID"] as? String, UUID(uuidString: id) != nil else { return nil }
        return id
    }

    func enteredBackground(now: TimeInterval = Date().timeIntervalSince1970) {
        var next = record
        guard next["backgroundAt"] == nil else { return } // Duplicate callbacks do not restart the clock.
        next["backgroundAt"] = now
        defaults.set(next, forKey: key)
    }

    @discardableResult
    func prepareForActivation(now: TimeInterval = Date().timeIntervalSince1970) -> String? {
        var next = record
        var id = pendingID
        if let started = next["backgroundAt"] as? TimeInterval,
           started.isFinite, now.isFinite, now - started >= Self.backgroundLimit, id == nil {
            id = UUID().uuidString
            next["pendingID"] = id
        }
        // Save the pending ID and consumed interval together. A process death
        // before the WebView ACK must replay this same ID on the next launch.
        next.removeValue(forKey: "backgroundAt")
        defaults.set(next, forKey: key)
        return id
    }

    @discardableResult
    func acknowledge(_ id: String) -> Bool {
        guard pendingID == id else { return false }
        var next = record
        next.removeValue(forKey: "pendingID")
        // An ACK may arrive after entering background again. Keep that clock.
        defaults.set(next, forKey: key)
        return true
    }
}
// END native resume policy.

#if DEBUG
// Explicit local test report. Never accepts UIDs, tokens, config or documents.
private class FirebaseReadTestReporter: NSObject, WKScriptMessageHandler {
    private var remaining = 256
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard remaining > 0, let input = message.body as? [String: Any] else { return }
        let allowed = ["phase","authenticated","restored","createdThisRun","sameIdentity","readQueries","mapDocuments","scoreDocuments","blockedWrites","writesIssued","lastError","pendingUnchanged","boundaryPersisted","freshPending","freshDelivered","profilePending","profileNamePreserved","syncError","profileUpdates","freshScoreWrites"]
        var safe: [String: Any] = [:]
        for key in allowed {
            if let value = input[key] as? NSNumber { safe[key] = value }
            else if let value = input[key] as? String, value.count < 90,
                    value.range(of: "^[a-z0-9/-]*$", options: .regularExpression) != nil { safe[key] = value }
        }
        guard let data = try? JSONSerialization.data(withJSONObject: safe, options: [.sortedKeys]),
              let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else { return }
        remaining -= 1
        try? data.write(to: folder.appendingPathComponent("ascent-firebase-test-report.json"), options: .atomic)
    }
}

#endif

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    private func notifyAudioLifecycle(_ active: Bool) {
#if DEBUG
        var activationError: String?
        if active {
            do { try AVAudioSession.sharedInstance().setActive(true) }
            catch { activationError = String(describing: error) }
        }
        (window?.rootViewController as? AscentBridgeViewController)?
            .recordNativeAudioEvent(active, activationError: activationError)
#else
        if active { try? AVAudioSession.sharedInstance().setActive(true) }
#endif
        let event = active ? "ascent-native-resume" : "ascent-native-pause"
        (window?.rootViewController as? CAPBridgeViewController)?.webView?
            .evaluateJavaScript("window.dispatchEvent(new Event('\(event)'))", completionHandler: nil)
    }

    func sceneWillResignActive(_ scene: UIScene) { notifyAudioLifecycle(false) }
    func sceneDidEnterBackground(_ scene: UIScene) {
        NativeResumeState.shared.enteredBackground()
        notifyAudioLifecycle(false)
    }
    func sceneDidBecomeActive(_ scene: UIScene) {
        let id = NativeResumeState.shared.prepareForActivation()
        guard let controller = window?.rootViewController as? AscentBridgeViewController else { return }
        if let id = id { controller.resumeAfterLongBackground(id: id) }
        controller.presentResumeRetryIfNeeded()
        // A long-background foreground must never resume audio in the old page.
        if controller.resumeInteractionReady { notifyAudioLifecycle(true) }
    }

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Decide before constructing the controller or its first document.
        NativeResumeState.shared.prepareForActivation()
        let controller = AscentBridgeViewController()
        controller.onResumeReady = { [weak self] in
            guard let self = self, self.window?.windowScene?.activationState == .foregroundActive else { return }
            self.notifyAudioLifecycle(true)
        }
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = controller
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// Diagnostics are opt-in for local Debug runs; Release cannot record them.
// They never read game saves, identity, credentials, or change system volume.
// Geometry-only bridge. No game saves, identity, network or system settings.
private final class ViewportMessageHandler: NSObject, WKScriptMessageHandler {
    weak var owner: AscentBridgeViewController?
    init(_ owner: AscentBridgeViewController) { self.owner = owner }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }
        if body["kind"] as? String == "request" { owner?.publishSafeViewport(force: true) }
    }
}

// Only a fixed readiness protocol crosses this bridge; no save data is read.
private final class ResumeMessageHandler: NSObject, WKScriptMessageHandler {
    weak var owner: AscentBridgeViewController?
    init(_ owner: AscentBridgeViewController) { self.owner = owner }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.webView === owner?.webView,
              let body = message.body as? [String: Any] else { return }
        owner?.receiveResumeMessage(body)
    }
}

class AscentBridgeViewController: CAPBridgeViewController {
    private var lastViewportGeometry = ""
    fileprivate private(set) var resumeInteractionReady = false
    fileprivate var onResumeReady: (() -> Void)?
    private var resumeDocumentID = NativeResumeState.shared.pendingID
    private var resumeDocumentAcknowledged = false
    private var resumeUserScript: WKUserScript?
    private var resumeGeneration = 0
    private enum ResumeRetryMode: Equatable { case javascript, reload }
    private var resumeRetryMode: ResumeRetryMode?
    private var resumeRetryInFlight = false
    private var resumeRetryAlert: UIAlertController?
    private var resumeWatchdog: DispatchWorkItem?
    private var resumePromptRetry: DispatchWorkItem?
    private var resumeLocale = Locale.preferredLanguages.first?.hasPrefix("ja") == true ? "ja" : "en"

    private func installResumeUserScript() {
        guard let content = webView?.configuration.userContentController else { return }
        var value: [String: Any] = ["id": NSNull(), "reason": NSNull()]
        if let id = resumeDocumentID { value["id"] = id; value["reason"] = "long-background" }
        guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
              let json = String(data: data, encoding: .utf8) else { return }
        let source = "Object.defineProperty(globalThis, 'ASCENT_IOS_RESUME', {value:Object.freeze(\(json)), writable:false, configurable:false});"
        let script = WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        if let previous = resumeUserScript {
            // WebKit has no remove-one API. Keep every unrelated script intact,
            // including Capacitor, safe-area, build-policy and Debug diagnostics.
            let retained = content.userScripts.filter { $0 !== previous }
            content.removeAllUserScripts()
            for existing in retained { content.addUserScript(existing) }
        }
        content.addUserScript(script)
        resumeUserScript = script
    }

    fileprivate func resumeAfterLongBackground(id: String) {
        // A duplicate activation or another background during a reload uses the
        // in-flight document, rather than restarting it or minting another ID.
        guard resumeDocumentID != id else { return }
        reloadResumeDocument()
    }

    private func reloadResumeDocument() {
        resumeGeneration += 1
        resumeInteractionReady = false
        resumeDocumentAcknowledged = false
        resumeRetryInFlight = false
        resumeRetryMode = nil
        resumePromptRetry?.cancel()
        resumePromptRetry = nil
        resumeDocumentID = NativeResumeState.shared.pendingID
        webView?.isUserInteractionEnabled = false
        resumeRetryAlert?.dismiss(animated: false)
        resumeRetryAlert = nil
        installResumeUserScript()
        webView?.reload()
        armResumeWatchdog()
    }

    fileprivate func receiveResumeMessage(_ body: [String: Any]) {
        guard let kind = body["kind"] as? String else { return }
        let id: String?
        if body["id"] is NSNull { id = nil }
        else if let supplied = body["id"] as? String, UUID(uuidString: supplied) != nil { id = supplied }
        else { return }
        // In-flight messages from the page being replaced cannot block or ACK
        // the newer recovery document.
        guard id == resumeDocumentID else { return }
        if kind == "blocked" {
            if let locale = body["locale"] as? String, locale == "ja" || locale == "en" { resumeLocale = locale }
            resumeInteractionReady = false
            webView?.isUserInteractionEnabled = false
            resumeRetryMode = .javascript
            resumeWatchdog?.cancel()
            presentResumeRetryIfNeeded()
            return
        }
        guard kind == "ready", !resumeInteractionReady else { return }
        if let pending = NativeResumeState.shared.pendingID {
            guard id == pending, NativeResumeState.shared.acknowledge(pending) else { return }
        } else {
            // A later runtime receipt retry may ACK the already acknowledged
            // current document. A stale or arbitrary token cannot unlock input.
            guard id == nil || resumeDocumentAcknowledged else { return }
        }
        resumeDocumentAcknowledged = true
        resumeInteractionReady = true
        resumeRetryMode = nil
        resumeRetryInFlight = false
        resumeWatchdog?.cancel()
        resumePromptRetry?.cancel()
        resumePromptRetry = nil
        resumeRetryAlert?.dismiss(animated: true)
        resumeRetryAlert = nil
        webView?.isUserInteractionEnabled = true
        onResumeReady?()
    }

    private func armResumeWatchdog() {
        resumeWatchdog?.cancel()
        let generation = resumeGeneration
        let work = DispatchWorkItem { [weak self] in
            guard let self = self, !self.resumeInteractionReady, self.resumeGeneration == generation else { return }
            self.resumeRetryInFlight = false
            self.resumeRetryMode = .reload
            self.presentResumeRetryIfNeeded()
        }
        resumeWatchdog = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: work)
    }

    fileprivate func presentResumeRetryIfNeeded() {
        guard !resumeInteractionReady, !resumeRetryInFlight, let mode = resumeRetryMode,
              resumeRetryAlert == nil,
              viewIfLoaded?.window?.windowScene?.activationState == .foregroundActive else { return }
        if presentedViewController != nil {
            // A plugin sheet may already be up, or the previous alert may still
            // be dismissing. Wait for it without stacking or losing the retry.
            guard resumePromptRetry == nil else { return }
            let work = DispatchWorkItem { [weak self] in
                self?.resumePromptRetry = nil
                self?.presentResumeRetryIfNeeded()
            }
            resumePromptRetry = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: work)
            return
        }
        let japanese = resumeLocale == "ja"
        let alert = UIAlertController(title: japanese ? "保存を確認できません" : "Unable to verify saved data",
            message: japanese ? "ライフとアイテムを保護するため、一時停止しています。再試行してください。" : "The game is paused to protect your lives and items. Please retry.", preferredStyle: .alert)
        let action = mode == .reload ? (japanese ? "再読み込みして再試行" : "Reload and retry") : (japanese ? "再試行" : "Retry")
        alert.addAction(UIAlertAction(title: action, style: .default) { [weak self] _ in
            guard let self = self else { return }
            self.resumeRetryAlert = nil
            self.retryResume(mode: mode)
        })
        resumeRetryAlert = alert
        present(alert, animated: true)
    }

    private func retryResume(mode: ResumeRetryMode) {
        guard !resumeInteractionReady else { return }
        if mode == .reload { reloadResumeDocument(); return }
        resumeRetryInFlight = true
        resumeRetryMode = nil
        let generation = resumeGeneration
        // Only call a fixed function; never interpolate message text or save data.
        let script = "(() => {if(typeof globalThis.ASCENT_NATIVE_RESUME?.retry !== 'function')return false;globalThis.ASCENT_NATIVE_RESUME.retry();return true;})()"
        armResumeWatchdog()
        webView?.evaluateJavaScript(script) { [weak self] result, error in
            guard let self = self, self.resumeGeneration == generation, !self.resumeInteractionReady else { return }
            self.resumeRetryInFlight = false
            if error != nil || (result as? Bool) != true { self.resumeRetryMode = .reload }
            // Allow the previous alert's dismissal to finish before a user-led
            // retry is offered again. There is never an automatic reload loop.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in self?.presentResumeRetryIfNeeded() }
        }
    }

    private func safeViewportGeometry() -> [String: Any]? {
        guard let webView = webView, webView.bounds.width > 0, webView.bounds.height > 0 else { return nil }
        // Convert UIKit's actual safe rectangle into WebView coordinates. If a
        // shell has already inset the WebView, intersection produces zero edge
        // insets instead of subtracting the notch/home-indicator area twice.
        let safeInView = webView.convert(view.safeAreaLayoutGuide.layoutFrame, from: view)
        let safeInWindow = webView.window.map { webView.convert($0.safeAreaLayoutGuide.layoutFrame, from: $0) } ?? safeInView
        let safe = webView.bounds.intersection(safeInView).intersection(safeInWindow)
        guard !safe.isNull, safe.width > 0, safe.height > 0 else { return nil }
        return ["width": webView.bounds.width, "height": webView.bounds.height,
                "safe": ["left": safe.minX, "top": safe.minY, "right": safe.maxX, "bottom": safe.maxY]]
    }

    fileprivate func publishSafeViewport(force: Bool = false) {
        guard let geometry = safeViewportGeometry(),
              let data = try? JSONSerialization.data(withJSONObject: geometry, options: [.sortedKeys]),
              let json = String(data: data, encoding: .utf8), force || json != lastViewportGeometry else { return }
        lastViewportGeometry = json
        webView?.evaluateJavaScript("globalThis.ASCENT_NATIVE_SAFE_AREA=Object.freeze(\(json));window.dispatchEvent(new Event('ascent-native-safe-area'));", completionHandler: nil)
    }

    override func viewDidLayoutSubviews() { super.viewDidLayoutSubviews(); publishSafeViewport() }
    override func viewSafeAreaInsetsDidChange() { super.viewSafeAreaInsetsDidChange(); publishSafeViewport() }
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        publishSafeViewport(force: true)
        presentResumeRetryIfNeeded()
    }

#if DEBUG
    private var nativeAudioEvents: [[String: Any]] = []
    private var audioRecords: [[String: Any]] = []

    func recordNativeAudioEvent(_ active: Bool, activationError: String?) {
        guard ProcessInfo.processInfo.environment["ASCENT_AUDIO_DIAGNOSTICS"] == "1" else { return }
        var event: [String: Any] = ["active": active, "uptime": ProcessInfo.processInfo.systemUptime]
        if let activationError = activationError { event["activationError"] = activationError }
        nativeAudioEvents.append(event)
        if nativeAudioEvents.count > 20 { nativeAudioEvents.removeFirst() }
    }
#endif

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.isUserInteractionEnabled = false
        webView?.configuration.userContentController.add(ResumeMessageHandler(self), name: "ascentResume")
        installResumeUserScript()
        armResumeWatchdog()
        webView?.configuration.userContentController.add(ViewportMessageHandler(self), name: "ascentViewport")
        if let geometry = safeViewportGeometry(), let data = try? JSONSerialization.data(withJSONObject: geometry), let json = String(data: data, encoding: .utf8) {
            webView?.configuration.userContentController.addUserScript(WKUserScript(source: "globalThis.ASCENT_NATIVE_SAFE_AREA=Object.freeze(\(json));", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        let configuration = Bundle.main.object(forInfoDictionaryKey: "ASCENTBuildConfiguration") as? String ?? "Unknown"
#if DEBUG
        let debugAllowed = configuration == "Debug"
        let syncStatusAllowed = configuration == "Debug"
        let audioDiagnosticsEnabled = debugAllowed && ProcessInfo.processInfo.environment["ASCENT_AUDIO_DIAGNOSTICS"] == "1"
#else
        let debugAllowed = false
        let syncStatusAllowed = false
        let audioDiagnosticsEnabled = false
#endif
        let firebaseMode = Bundle.main.object(forInfoDictionaryKey: "ASCENTFirebaseMode") as? String ?? "offline"
        let readOnlyFirebase = firebaseMode == "read-only"
        let automaticSync = firebaseMode == "auto-sync"
        let firebaseEnabled = readOnlyFirebase || automaticSync
        let policy: [String: Any] = ["configuration": configuration, "debugAllowed": debugAllowed,
            "syncStatusAllowed": syncStatusAllowed,
            "buildNumber": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "",
            // Authoritative initial game language, independent of resume alerts.
            "preferredLanguage": Locale.preferredLanguages.first ?? "",
            "firebaseMode": firebaseMode, "firebaseEnabled": firebaseEnabled,
            "firebaseAuthAllowed": firebaseEnabled, "firebaseAnonymousAllowed": firebaseEnabled, "firebaseReadsAllowed": firebaseEnabled,
            "firebaseAutomaticSyncAllowed": automaticSync,
            "audioDiagnosticsEnabled": audioDiagnosticsEnabled]
        if let data = try? JSONSerialization.data(withJSONObject: policy, options: [.sortedKeys]),
           let json = String(data: data, encoding: .utf8) {
            let source = "Object.defineProperty(globalThis, 'ASCENT_IOS_BUILD', {value:Object.freeze(\(json)), writable:false, configurable:false});"
            webView?.configuration.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
#if DEBUG
        if ProcessInfo.processInfo.environment["ASCENT_FIREBASE_READ_TEST"] == "1" {
            webView?.configuration.userContentController.add(FirebaseReadTestReporter(), name: "ascentFirebaseReport")
        }
#endif
#if DEBUG
        guard audioDiagnosticsEnabled else { return }
        var samples = 0
        Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] timer in
            guard let self = self else { timer.invalidate(); return }
            samples += 1
            if samples > 300 { timer.invalidate(); return }
            let probe = ProcessInfo.processInfo.environment["ASCENT_AUDIO_PROBE"] == "1" && samples == 3
            let stageProbe = ProcessInfo.processInfo.environment["ASCENT_AUDIO_STAGE_PROBE"] == "1" && samples == 6
            let script = """
            (() => {
              if (typeof bgmCache === 'undefined') return JSON.stringify({ready:false});
              \(probe ? "unlockSound();" : "")
              \(stageProbe ? "startStageBackgroundMusic();" : "")
              return JSON.stringify({ready:true,probe:\(probe),hidden:document.hidden,focused:document.hasFocus(),
                musicEnabled,musicVolume,soundEnabled,soundVolume,soundPrimed,
                context:soundContext?.state ?? null,time:soundContext?.currentTime ?? null,
                pageActive:bgmPageActive,adBlocked:bgmAdBlocked,track:bgmTrack,
                playing:!!bgmPlayback,master:soundMaster?.gain.value ?? null,
                musicGain:musicMaster?.gain.value ?? null,
                effectsGain:soundEffectsGain?.gain.value ?? null,voices:soundVoices.size,
                nativeActive:globalThis.ASCENT_NATIVE_AUDIO_ACTIVE ?? null,
                generation:globalThis.ASCENT_AUDIO_GENERATION ?? null,
                trace:globalThis.ASCENT_AUDIO_TRACE_EVENTS ?? [],
                sampleRate:soundContext?.sampleRate ?? null,
                viewport:{width:canvas.getBoundingClientRect().width,height:canvas.getBoundingClientRect().height,padding:globalThis.ASCENT_STAGE_VIEWPORT?.padding ?? null},
                nativeAudio:globalThis.ASCENT_NATIVE_AUDIO ?? null,
                cache:[...bgmCache].map(([name,e])=>({name,failed:!!e.failed,bytes:e.bytes?.byteLength ?? 0,
                  duration:e.buffer?.duration ?? null,decoded:!!e.buffer}))});
            })()
            """
            self.webView?.evaluateJavaScript(script) { result, error in
                var record: [String: Any] = ["sample":samples,"uptime":ProcessInfo.processInfo.systemUptime,"nativeEvents":self.nativeAudioEvents,"js":result as? String ?? "unavailable"]
                if let error = error { record["error"] = error.localizedDescription }
                let session = AVAudioSession.sharedInstance()
                record["nativeCategory"] = session.category.rawValue
                record["nativeMode"] = session.mode.rawValue
                record["nativeVolume"] = session.outputVolume
                record["silenceHint"] = session.secondaryAudioShouldBeSilencedHint
                record["outputPorts"] = session.currentRoute.outputs.map { $0.portType.rawValue }
                self.audioRecords.append(record)
                if self.audioRecords.count > 300 { self.audioRecords.removeFirst() }
                if let data = try? JSONSerialization.data(withJSONObject: self.audioRecords, options: [.sortedKeys]),
                   let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first {
                    try? data.write(to: folder.appendingPathComponent("ascent-audio-diagnostics.json"), options: .atomic)
                }
            }
        }
#endif
    }
}
