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
class AscentBridgeViewController: CAPBridgeViewController {
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
        let configuration = Bundle.main.object(forInfoDictionaryKey: "ASCENTBuildConfiguration") as? String ?? "Unknown"
#if DEBUG
        let debugAllowed = configuration == "Debug"
        let audioDiagnosticsEnabled = debugAllowed && ProcessInfo.processInfo.environment["ASCENT_AUDIO_DIAGNOSTICS"] == "1"
#else
        let debugAllowed = false
        let audioDiagnosticsEnabled = false
#endif
        let firebaseMode = Bundle.main.object(forInfoDictionaryKey: "ASCENTFirebaseMode") as? String ?? "offline"
        let readOnlyFirebase = firebaseMode == "read-only"
        let automaticSync = firebaseMode == "auto-sync"
        let firebaseEnabled = readOnlyFirebase || automaticSync
        let policy: [String: Any] = ["configuration": configuration, "debugAllowed": debugAllowed,
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
