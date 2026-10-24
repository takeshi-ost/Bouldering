import UIKit
import Capacitor
import WebKit
import AVFAudio

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

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

// Diagnostics are opt-in for local Debug runs and contain audio state only.
// They never read game saves, identity, credentials, or change system volume.
class AscentBridgeViewController: CAPBridgeViewController {
#if DEBUG
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard ProcessInfo.processInfo.environment["ASCENT_AUDIO_DIAGNOSTICS"] == "1" else { return }
        var samples = 0
        Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] timer in
            guard let self = self else { timer.invalidate(); return }
            samples += 1
            if samples > 90 { timer.invalidate(); return }
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
                nativeAudio:globalThis.ASCENT_NATIVE_AUDIO ?? null,
                cache:[...bgmCache].map(([name,e])=>({name,failed:!!e.failed,bytes:e.bytes?.byteLength ?? 0,
                  duration:e.buffer?.duration ?? null,decoded:!!e.buffer}))});
            })()
            """
            self.webView?.evaluateJavaScript(script) { result, error in
                var record: [String: Any] = ["sample":samples,"js":result as? String ?? "unavailable"]
                if let error = error { record["error"] = error.localizedDescription }
                let session = AVAudioSession.sharedInstance()
                record["nativeCategory"] = session.category.rawValue
                record["nativeMode"] = session.mode.rawValue
                record["nativeVolume"] = session.outputVolume
                record["silenceHint"] = session.secondaryAudioShouldBeSilencedHint
                record["outputPorts"] = session.currentRoute.outputs.map { $0.portType.rawValue }
                if let data = try? JSONSerialization.data(withJSONObject: record, options: [.sortedKeys]),
                   let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first {
                    try? data.write(to: folder.appendingPathComponent("ascent-audio-diagnostics.json"), options: .atomic)
                }
            }
        }
    }
#endif
}
