import UIKit
import Capacitor
import WebKit
import AVFAudio

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
    func sceneDidEnterBackground(_ scene: UIScene) { notifyAudioLifecycle(false) }
    func sceneDidBecomeActive(_ scene: UIScene) { notifyAudioLifecycle(true) }

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AscentBridgeViewController()
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

class AscentBridgeViewController: CAPBridgeViewController {
    private var lastViewportGeometry = ""

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
    override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); publishSafeViewport(force: true) }

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
            "firebaseMode": firebaseMode, "firebaseEnabled": firebaseEnabled,
            "firebaseAuthAllowed": firebaseEnabled, "firebaseAnonymousAllowed": readOnlyFirebase, "firebaseReadsAllowed": firebaseEnabled,
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
