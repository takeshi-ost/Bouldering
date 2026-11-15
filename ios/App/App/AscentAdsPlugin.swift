import Foundation
import UIKit
import Capacitor
import IronSource
import UserMessagingPlatform

// Conservative EEA-only integrated TEST gate. These checks do not manufacture consent.
// UMP owns the IAB values; LevelPlay reads the original signals automatically.
private enum AscentConsentGate {
    static func allows(updated: Bool, canRequestAds: Bool, gdpr: Int?, purpose: String?, vendors: String?, additional: String?) -> Bool {
        guard updated, canRequestAds, gdpr == 1, purpose?.first == "1", purpose?.allSatisfy({ $0 == "0" || $0 == "1" }) == true else { return false }
        func bit(_ text: String?, _ id: Int) -> Bool {
            guard let text, text.count >= id, text.allSatisfy({ $0 == "0" || $0 == "1" }) else { return false }
            return Array(text)[id - 1] == "1"
        }
        let parts = (additional ?? "").split(separator: "~", omittingEmptySubsequences: false)
        guard parts.count >= 2, ["1", "2"].contains(String(parts[0])) else { return false }
        let values = parts[1].split(separator: ".", omittingEmptySubsequences: false)
        guard values.allSatisfy({ Int($0).map { $0 > 0 } ?? false }) else { return false }
        let ids = Set(values.compactMap { Int($0) })
        return ids.contains(2878) && (ids.contains(3234) || bit(vendors, 1549))
    }
}

// Test integration only. These gates are native build inputs, never WebView flags.
// Do not enable until dashboard Unity-only TEST delivery and privacy flow are reviewed.
private struct AscentAdConfiguration {
    let info = Bundle.main.infoDictionary ?? [:]
    func string(_ key: String) -> String { info[key] as? String ?? "" }
    var suiteBlocker: String? {
        #if !DEBUG
        return "test_build_required"
        #else
        guard info["AscentAdsTestEnabled"] as? Bool == true else { return "test_disabled" }
        guard info["AscentAdsUnityOnlyTestVerified"] as? Bool == true else { return "test_network_unverified" }
        guard !string("AscentLevelPlayAppKey").isEmpty else { return "configuration_missing" }
        return nil
        #endif
    }
    var gameTestBlocker: String? {
        if let reason = suiteBlocker { return reason }
        guard info["AscentAdsDeveloperGameTestEnabled"] as? Bool == true else { return "game_test_disabled" }
        guard !string("AscentRewardedAdUnitID").isEmpty, !string("AscentInterstitialAdUnitID").isEmpty else { return "configuration_missing" }
        return nil
    }
    var blocker: String? {
        #if !DEBUG
        return "test_build_required"
        #else
        guard info["AscentAdsTestEnabled"] as? Bool == true else { return "test_disabled" }
        guard info["AscentAdsUnityOnlyTestVerified"] as? Bool == true else { return "test_network_unverified" }
        // This remains false until a real consent/region flow is implemented and reviewed.
        guard info["AscentAdsPrivacyFlowReviewed"] as? Bool == true else { return "privacy_not_ready" }
        guard !string("AscentLevelPlayAppKey").isEmpty,
              !string("AscentRewardedAdUnitID").isEmpty,
              !string("AscentInterstitialAdUnitID").isEmpty else { return "configuration_missing" }
        return nil
        #endif
    }
}

@objc(AscentAdsPlugin)
public final class AscentAdsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AscentAdsPlugin"
    public let jsName = "AscentAds"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorizeDeveloperGameTest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updatePrivacy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginFirstRunPrivacy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "privacyOptions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openDeveloperTestSuite", returnType: CAPPluginReturnPromise)
    ]
    #if DEBUG
    private func recordUMPDiagnostic(_ message: String) {
        print("[ASCENT UMP] " + message)
        guard let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
        let url = directory.appendingPathComponent("ump-diagnostic.txt")
        let old = (try? String(contentsOf: url, encoding: .utf8)) ?? ""
        let limited = String(old.suffix(8000))
        try? (limited + "\n" + ISO8601DateFormatter().string(from: Date()) + " " + message).write(to: url, atomically: true, encoding: .utf8)
    }
    #endif
    private var developerGameAuthorized = false // Memory only, reset by process exit.
    private var privacyUpdated = false
    private var privacyFlowEntered = false
    private var privacyRestartRequired = false
    private var initialized = false
    private var busy = false
    private enum SessionMode { case unused, game, developerSuite }
    private var sessionMode = SessionMode.unused
    private var testSuiteHost: AscentTestSuiteHostController?
    // Keep delegates alive for late reward callbacks. Requests are unique per session.
    private var sessions: [String: AscentAdSession] = [:]
    private var integratedTest: Bool {
        #if DEBUG
        return Bundle.main.object(forInfoDictionaryKey: "AscentIntegratedConsentTestEnabled") as? Bool == true
        #else
        return false
        #endif
    }
    private var integratedBlocker: String? {
        guard AscentTermsGate.accepted else { return "terms_required" }
        guard integratedTest else { return "integrated_test_disabled" }
        if let reason = AscentAdConfiguration().gameTestBlocker { return reason }
        guard !privacyRestartRequired else { return "privacy_restart_required" }
        let d = UserDefaults.standard
        guard AscentConsentGate.allows(updated: privacyUpdated, canRequestAds: ConsentInformation.shared.canRequestAds,
            gdpr: (d.object(forKey: "IABTCF_gdprApplies") as? NSNumber)?.intValue,
            purpose: d.string(forKey: "IABTCF_PurposeConsents"), vendors: d.string(forKey: "IABTCF_VendorConsents"),
            additional: d.string(forKey: "IABTCF_AddtlConsent")) else { return "privacy_consent_or_region_not_ready" }
        return nil
    }
    private func privacyResult() -> [String: Any] {
        let info = ConsentInformation.shared
        return ["status": privacyRestartRequired ? "restart_required" : (privacyUpdated ? "updated" : "not_updated"),
                "canRequestAds": privacyUpdated && info.canRequestAds,
                "privacyOptionsRequired": info.privacyOptionsRequirementStatus == .required,
                "adsEnabled": integratedBlocker == nil,
                "blocker": integratedBlocker ?? "test_ready"]
    }
    // Only an explicitly reviewed bundled first-run terms screen may use the
    // no-extra-disclosure entry point. Default absent/false keeps it disabled.
    @objc func beginFirstRunPrivacy(_ call: CAPPluginCall) {
        guard AscentTermsGate.accepted else { call.reject("terms_required"); return }
        DispatchQueue.main.async {
            guard Bundle.main.object(forInfoDictionaryKey: "AscentFirstRunTermsReviewed") as? Bool == true else {
                call.reject("first_run_terms_not_reviewed"); return
            }
            guard !self.busy, !self.initialized, self.sessionMode == .unused else {
                call.reject("privacy_restart_required"); return
            }
            guard let view = self.bridge?.viewController, view.viewIfLoaded?.window != nil,
                  view.presentedViewController == nil else { call.reject("view_unavailable"); return }
            self.busy = true
            self.performPrivacyRequest(call, from: view)
        }
    }
    private func performPrivacyRequest(_ call: CAPPluginCall, from view: UIViewController) {
        guard AscentTermsGate.accepted else { self.busy = false; call.reject("terms_required"); return }
                    self.privacyUpdated = false
                    self.privacyFlowEntered = true
                    self.developerGameAuthorized = false
                    let parameters = RequestParameters()
                    #if DEBUG
                    // Opt-in native build settings only; never enabled by JavaScript.
                    if let ids = Bundle.main.object(forInfoDictionaryKey: "AscentUMPTestDeviceIDs") as? [String], !ids.isEmpty {
                        let debug = DebugSettings()
                        debug.testDeviceIdentifiers = ids
                        if Bundle.main.object(forInfoDictionaryKey: "AscentUMPForceEEA") as? Bool == true { debug.geography = .EEA }
                        parameters.debugSettings = debug
                    }
                    #endif
                    #if DEBUG
                    self.recordUMPDiagnostic("request debugIDs=\(parameters.debugSettings?.testDeviceIdentifiers?.count ?? 0) geography=\(parameters.debugSettings?.geography.rawValue ?? -1) underAge=\(parameters.isTaggedForUnderAgeOfConsent)")
                    #endif
                    ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { error in
                        DispatchQueue.main.async {
                            #if DEBUG
                            let ump = ConsentInformation.shared
                            let defaults = UserDefaults.standard
                            self.recordUMPDiagnostic("updated status=\(ump.consentStatus.rawValue) form=\(ump.formStatus.rawValue) options=\(ump.privacyOptionsRequirementStatus.rawValue) canAds=\(ump.canRequestAds) gdpr=\(String(describing: defaults.object(forKey: "IABTCF_gdprApplies"))) purposePresent=\(defaults.string(forKey: "IABTCF_PurposeConsents") != nil) acPresent=\(defaults.string(forKey: "IABTCF_AddtlConsent") != nil) error=\(String(describing: error))")
                            #endif
                            guard error == nil else { self.busy = false; call.reject("privacy_update_failed"); return }
                            ConsentForm.loadAndPresentIfRequired(from: view) { error in
                                DispatchQueue.main.async {
                                    self.busy = false
                                    guard error == nil else { call.reject("privacy_form_failed"); return }
                                    self.privacyUpdated = true
                                    call.resolve(self.privacyResult())
                                }
                            }
                        }
                    }
    }
    @objc func updatePrivacy(_ call: CAPPluginCall) {
        guard AscentTermsGate.accepted else { call.reject("terms_required"); return }
        DispatchQueue.main.async {
            guard !self.busy, !self.initialized, self.sessionMode == .unused else {
                call.reject("privacy_restart_required"); return
            }
            guard let view = self.bridge?.viewController, view.viewIfLoaded?.window != nil,
                  view.presentedViewController == nil else { call.reject("view_unavailable"); return }
            self.busy = true
            let ja = Locale.preferredLanguages.first?.hasPrefix("ja") == true
            let alert = UIAlertController(title: ja ? "広告プライバシーの確認" : "Ad privacy check",
                message: ja ? "Google UMPに接続して同意画面の設定を取得します。IPアドレスや端末情報などがGoogleに送信される場合があります。この統合テストでは、同意条件と配信設定が確認できた場合に限り、ゲーム内でUnity LevelPlay・Unity Ads・Ad Qualityのテスト広告を表示します。端末情報やIPアドレス、広告イベント等が各サービスに送信されます。拒否・設定不足時は広告を開始しません。設定が未公開の場合は画面が表示されないことがあります。" : "Connect to Google UMP to retrieve privacy messages. Google may receive IP address and device information. This integrated test may enable Unity LevelPlay, Unity Ads and Ad Quality TEST ads only after required consent and configuration checks. Device information, IP address and ad events may be sent to these services. Refusal or missing configuration blocks ads. An unpublished message may not appear.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: ja ? "キャンセル" : "Cancel", style: .cancel) { _ in
                self.busy = false; call.resolve(["status": "cancelled", "adsEnabled": false])
            })
            alert.addAction(UIAlertAction(title: ja ? "確認する" : "Continue", style: .default) { _ in
                view.dismiss(animated: true) {
                    self.performPrivacyRequest(call, from: view)
                }
            })
            view.present(alert, animated: true)
        }
    }
    @objc func privacyOptions(_ call: CAPPluginCall) {
        guard AscentTermsGate.accepted else { call.reject("terms_required"); return }
        DispatchQueue.main.async {
            guard !self.busy else { call.reject("ad_busy"); return }
            guard self.privacyUpdated, ConsentInformation.shared.privacyOptionsRequirementStatus == .required else {
                call.resolve(["status": "privacy_options_not_required", "adsEnabled": false]); return
            }
            guard let view = self.bridge?.viewController, view.viewIfLoaded?.window != nil,
                  view.presentedViewController == nil else { call.reject("view_unavailable"); return }
            self.busy = true
            self.privacyUpdated = false
            if self.initialized {
                self.privacyRestartRequired = true
                LPMPrivacySettings.setGDPRConsent(false)
                LPMPrivacySettings.setCCPA(true)
            }
            for session in self.sessions.values { session.finish("privacy_changed") }
            ConsentForm.presentPrivacyOptionsForm(from: view) { error in
                DispatchQueue.main.async {
                    self.busy = false
                    guard error == nil else { call.reject("privacy_options_failed"); return }
                    self.privacyUpdated = true
                    call.resolve(self.privacyResult())
                }
            }
        }
    }
    @objc func getStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let config = AscentAdConfiguration()
            let blocker = self.integratedTest ? self.integratedBlocker : (self.privacyFlowEntered ? "privacy_candidate_ads_disabled" : (self.developerGameAuthorized ? config.gameTestBlocker : config.blocker))
            call.resolve(["available": blocker == nil && self.sessionMode != .developerSuite,
                          "status": self.sessionMode == .developerSuite ? "suite_session_restart_required" : (blocker ?? "test_ready"),
                          "initialized": self.initialized,
                          "developerTestAvailable": AscentAdConfiguration().suiteBlocker == nil && self.sessionMode != .game,
                          "developerTestStatus": self.sessionMode == .game ? "game_session_restart_required" : (AscentAdConfiguration().suiteBlocker ?? "ready")])
        }
    }
    // Private developer test only. This does not approve the production privacy flow.
    @objc func authorizeDeveloperGameTest(_ call: CAPPluginCall) {
        guard AscentTermsGate.accepted else { call.reject("terms_required"); return }
        DispatchQueue.main.async {
            guard !self.integratedTest, !self.privacyFlowEntered else { call.reject("use_integrated_privacy_flow"); return }
            guard !self.busy else { call.reject("ad_busy"); return }
            guard self.sessionMode != .developerSuite else { call.reject("suite_session_restart_required"); return }
            let config = AscentAdConfiguration()
            if let blocker = config.gameTestBlocker { call.reject(blocker); return }
            if self.developerGameAuthorized { call.resolve(["status": "authorized"]); return }
            guard let view = self.bridge?.viewController, view.viewIfLoaded?.window != nil,
                  view.presentedViewController == nil else { call.reject("view_unavailable"); return }
            self.busy = true
            let ja = Locale.preferredLanguages.first?.hasPrefix("ja") == true
            let message = ja
                ? "開発者本人向けに、ゲーム内の報酬・定期広告をテストします。許可後、ゲーム内で広告が必要になった時点でUnity LevelPlay・Unity Ads・Ad Qualityに端末識別子、端末/OS情報、IPアドレス、広告イベント/性能データが送信される場合があります。Unityのみ・強制テスト配信の確認済み設定を使用します。\n\nGDPR同意=false、CCPA販売/共有オプトアウト=trueで初期化し、ATT許可は要求しません。これは広告パーソナライズや製品版の同意ではありません。許可はこの起動中のみです。終了するにはアプリを完全終了してください。接続テスト画面と併用する場合は再起動が必要です。"
                : "Private developer game-ad test. When an ad is requested, device identifiers, device/OS information, IP address and ad events/performance data may be processed by Unity LevelPlay, Unity Ads and Ad Quality. Verified Unity-only forced test delivery is required.\n\nInitialization uses GDPR consent=false and CCPA opt-out=true. No ATT permission is requested. This is not personalized-ad consent or production consent. Permission lasts only for this launch. Fully close the app to end it. Restart before using the integration test suite."
            let alert = UIAlertController(title: ja ? "ゲーム内広告テストの確認" : "Game-ad test permission", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: ja ? "開始しない" : "Do not start", style: .cancel) { _ in
                self.busy = false; call.resolve(["status": "declined"])
            })
            alert.addAction(UIAlertAction(title: ja ? "今回だけ許可" : "Allow this launch only", style: .default) { _ in
                self.developerGameAuthorized = true
                self.sessionMode = .game
                self.busy = false
                call.resolve(["status": "authorized"])
                // Deliberately no SDK calls here. First game ad initializes after permission.
            })
            view.present(alert, animated: true)
        }
    }
    // Developer-owned, one-launch permission, separate from GDPR/ATT consent.
    // No SDK calls occur while this explanation is pending or declined.
    @objc func openDeveloperTestSuite(_ call: CAPPluginCall) {
        guard AscentTermsGate.accepted else { call.reject("terms_required"); return }
        DispatchQueue.main.async {
            #if !DEBUG
            call.reject("test_build_required")
            return
            #else
            guard !self.integratedTest, !self.privacyFlowEntered else { call.reject("use_integrated_privacy_flow"); return }
            guard !self.busy else { call.reject("ad_busy"); return }
            guard self.sessionMode != .game else { call.reject("game_session_restart_required"); return }
            guard let view = self.bridge?.viewController, view.viewIfLoaded?.window != nil,
                  view.presentedViewController == nil else { call.reject("view_unavailable"); return }
            let config = AscentAdConfiguration()
            let blocker = config.suiteBlocker
            self.busy = true
            let ja = Locale.preferredLanguages.first?.hasPrefix("ja") == true
            let explanation = ja
                ? "開発者本人向けの広告接続テストです。開始すると、端末識別子・端末/OS情報・IPアドレス・広告イベント/性能データが、UnityのLevelPlay・Unity Ads・Ad Qualityで処理される場合があります。テスト広告でも通信します。\n\n今回はGDPR同意をfalse、販売/共有のオプトアウト(CCPA)をtrueとして送信します。この制限信号を設定しても、SDK通信そのものは発生します。開始の承諾はGDPRの広告パーソナライズ同意やApple ATT許可ではありません。ATT許可は要求しません。\n\nテスト画面ではUnity AdsのBiddingで必ずTestを選び、Liveは選ばないでください。終了後、通常広告を試すにはアプリを再起動してください。"
                : "Private developer ad integration test. Starting may send device identifiers, device/OS information, IP address, ad events and performance data to Unity LevelPlay, Unity Ads and Ad Quality. Test ads still communicate with these services.\n\nThis test sends GDPR consent=false and CCPA sale/sharing opt-out=true. These restrictive signals do not stop SDK communication. Permission to run this test is NOT GDPR personalized-ad consent or Apple ATT authorization. No ATT prompt is requested.\n\nIn the suite, select Unity Ads Bidding and Test, never Live. Restart the app before testing ordinary game ads."
            let message = explanation + (blocker == nil ? "" : (ja ? "\n\n現在は安全設定が未確認のため開始できません。" : "\n\nStarting is blocked until test safety settings are verified."))
            let alert = UIAlertController(title: ja ? "広告接続テストの確認" : "Developer ad test", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: ja ? "開始しない" : "Do not start", style: .cancel) { _ in
                self.busy = false
                call.resolve(["status": blocker == nil ? "declined" : "blocked", "reason": blocker ?? "user_declined", "initialized": self.initialized])
            })
            if blocker == nil {
                alert.addAction(UIAlertAction(title: ja ? "今回だけテスト開始" : "Start this test only", style: .default) { _ in
                    // Wait for the consent alert to dismiss before presenting any test UI.
                    view.dismiss(animated: true) { self.startDeveloperTestSuite(call, config: config, view: view, japanese: ja) }
                })
            }
            view.present(alert, animated: true)
            #endif
        }
    }
    private func startDeveloperTestSuite(_ call: CAPPluginCall, config: AscentAdConfiguration,
                                         view: UIViewController, japanese: Bool) {
        guard config.suiteBlocker == nil, sessionMode != .game else {
            busy = false; call.reject("test_safety_changed"); return
        }
        sessionMode = .developerSuite // Do not mix suite and game ad APIs until process restart.
        let launch = {
            guard view.viewIfLoaded?.window != nil else { self.busy = false; call.reject("view_unavailable"); return }
            let host = AscentTestSuiteHostController(japanese: japanese)
            self.testSuiteHost = host
            host.onFinish = { [weak self, weak host] in
                guard let self = self else { return }
                host?.dismiss(animated: true) {
                    self.testSuiteHost = nil; self.busy = false
                    call.resolve(["status": "closed", "initialized": self.initialized, "restartRequiredForGameAds": true])
                }
            }
            host.modalPresentationStyle = .fullScreen
            view.present(host, animated: true)
        }
        if initialized { launch(); return }
        // The explicit run permission above never becomes a positive ad-consent signal.
        LPMPrivacySettings.setGDPRConsent(false)
        LPMPrivacySettings.setCCPA(true)
        LevelPlay.setMetaDataWithKey("is_test_suite", value: "enable")
        let request = LPMInitRequestBuilder(appKey: config.string("AscentLevelPlayAppKey")).build()
        var completed = false
        let timeout = DispatchWorkItem {
            guard !completed else { return }; completed = true
            self.busy = false; call.reject("initialization_timeout_restart_required")
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: timeout)
        LevelPlay.initWith(request) { _, error in
            DispatchQueue.main.async {
                guard !completed else { return }; completed = true; timeout.cancel()
                guard error == nil else { self.busy = false; call.reject("initialization_failed_restart_required"); return }
                self.initialized = true
                launch() // No ad object creation, load or show call before the suite.
            }
        }
    }
    @objc func show(_ call: CAPPluginCall) {
        guard AscentTermsGate.accepted else { call.reject("terms_required"); return }
        DispatchQueue.main.async {
            let config = AscentAdConfiguration()
            guard self.sessionMode != .developerSuite else { call.reject("suite_session_restart_required"); return }
            if let blocker = self.integratedTest ? self.integratedBlocker : (self.privacyFlowEntered ? "privacy_candidate_ads_disabled" : (self.developerGameAuthorized ? config.gameTestBlocker : config.blocker)) { call.reject(blocker); return }
            guard self.integratedTest || !self.privacyFlowEntered else { call.reject("privacy_test_session_restart_required"); return }
            guard !self.busy else { call.reject("ad_busy"); return }
            guard self.sessions.count < 256 else { call.reject("test_session_limit_restart_required"); return }
            guard let id = call.getString("requestId"), !id.isEmpty, id.count <= 128,
                  self.sessions[id] == nil,
                  let format = call.getString("format"), ["rewarded", "interstitial"].contains(format),
                  let view = self.bridge?.viewController else { call.reject("invalid_request"); return }
            self.busy = true
            self.sessionMode = .game
            let begin = {
                let unit = config.string(format == "rewarded" ? "AscentRewardedAdUnitID" : "AscentInterstitialAdUnitID")
                let session = AscentAdSession(id: id, format: format, unit: unit, view: view, permitted: { !self.integratedTest || self.integratedBlocker == nil }, complete: { result in
                    self.busy = false
                    call.resolve(result)
                }, reward: { self.notifyListeners("reward", data: ["requestId": id]) })
                self.sessions[id] = session
                session.load()
            }
            if self.initialized { begin(); return }
            if self.developerGameAuthorized && !self.integratedTest {
                LPMPrivacySettings.setGDPRConsent(false)
                LPMPrivacySettings.setCCPA(true)
            }
            let request = LPMInitRequestBuilder(appKey: config.string("AscentLevelPlayAppKey")).build()
            var initCompleted = false
            let initTimeout = DispatchWorkItem {
                guard !initCompleted else { return }
                initCompleted = true; self.busy = false
                call.reject("initialization_timeout")
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: initTimeout)
            LevelPlay.initWith(request) { _, error in
                DispatchQueue.main.async {
                    guard !initCompleted else { return }
                    initCompleted = true; initTimeout.cancel()
                    guard error == nil else { self.busy = false; call.reject("initialization_failed"); return }
                    self.initialized = true
                    if self.integratedTest, let reason = self.integratedBlocker { self.busy = false; call.reject(reason); return }
                    begin()
                }
            }
        }
    }
}

private final class AscentAdSession: NSObject, LPMRewardedAdDelegate, LPMInterstitialAdDelegate {
    let id: String
    let format: String
    weak var view: UIViewController?
    var rewardedAd: LPMRewardedAd?
    var interstitialAd: LPMInterstitialAd?
    private var analyticsEpoch: Int?
    var didShow = false
    var rewarded = false
    var settled = false
    var timeout: DispatchWorkItem?
    let permitted: () -> Bool
    let completion: ([String: Any]) -> Void
    let rewardCallback: () -> Void
    init(id: String, format: String, unit: String, view: UIViewController, permitted: @escaping () -> Bool,
         complete: @escaping ([String: Any]) -> Void, reward: @escaping () -> Void) {
        self.id = id; self.format = format; self.view = view
        completion = complete; rewardCallback = reward
        self.permitted = permitted
        super.init()
        if format == "rewarded" { rewardedAd = LPMRewardedAd(adUnitId: unit); rewardedAd?.setDelegate(self) }
        else { interstitialAd = LPMInterstitialAd(adUnitId: unit); interstitialAd?.setDelegate(self) }
    }
    func load() {
        let work = DispatchWorkItem { [weak self] in self?.finish("load_timeout") }
        timeout = work; DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: work)
        rewardedAd?.loadAd(); interstitialAd?.loadAd()
    }
    func finish(_ status: String) {
        guard !settled else { return }; settled = true
        timeout?.cancel(); timeout = nil
        completion(["requestId": id, "shown": didShow, "rewarded": rewarded, "status": status])
    }
    func didLoadAd(with adInfo: LPMAdInfo) {
        guard !settled else { return }
        guard permitted() else { finish("privacy_changed"); return }
        // Defense in depth against accidentally enabled ironSource/other demand.
        let network = adInfo.adNetwork.lowercased().replacingOccurrences(of: " ", with: "")
        guard network == "unityads" else { finish("unexpected_network"); return }
        guard let view = view, view.viewIfLoaded?.window != nil else { finish("view_unavailable"); return }
        timeout?.cancel(); timeout = nil
        if let ad = rewardedAd, ad.isAdReady() { ad.showAd(viewController: view, placementName: nil) }
        else if let ad = interstitialAd, ad.isAdReady() { ad.showAd(viewController: view, placementName: nil) }
        else { finish("not_ready") }
    }
    func didFailToLoadAd(withAdUnitId adUnitId: String, error: Error) { finish("load_failed") }
    func didDisplayAd(with adInfo: LPMAdInfo) {
        guard !didShow else { return }; didShow = true
        if AscentAnalytics.shared.allowed { analyticsEpoch = AscentAnalytics.shared.epoch; AscentAnalytics.shared.log("ascent_ad_start", ["format": format], epoch: analyticsEpoch) }
    }
    func didFailToDisplayAd(with adInfo: LPMAdInfo, error: Error) { finish("display_failed") }
    func didCloseAd(with adInfo: LPMAdInfo) { finish("closed") }
    func didClickAd(with adInfo: LPMAdInfo) {}
    func didChangeAdInfo(_ adInfo: LPMAdInfo) {}
    func didRewardAd(with adInfo: LPMAdInfo, reward: LPMReward) {
        guard format == "rewarded", didShow, !rewarded else { return }
        rewarded = true; rewardCallback()
        if let epoch = analyticsEpoch { AscentAnalytics.shared.log("ascent_ad_complete", ["format": format], epoch: epoch) }
    }
}

// The suite has no documented dismissal callback. Present it over an isolated host:
// returning to the host closes the flow. Its explicit Done button is a fallback
// if the SDK uses a presentation style that does not trigger viewDidAppear.
private final class AscentTestSuiteHostController: UIViewController {
    let japanese: Bool
    var onFinish: (() -> Void)?
    private var launched = false
    private var finished = false
    init(japanese: Bool) { self.japanese = japanese; super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let label = UILabel()
        label.numberOfLines = 0; label.textAlignment = .center
        label.text = japanese ? "Unity Ads Bidding → Test を選択してください。Liveは使用しません。\nテスト画面が閉じたら終了してください。" : "Select Unity Ads Bidding → Test. Do not use Live.\nFinish after closing the test suite."
        let done = UIButton(type: .system)
        done.setTitle(japanese ? "テスト終了" : "Finish test", for: .normal)
        done.addTarget(self, action: #selector(finish), for: .touchUpInside)
        let stack = UIStackView(arrangedSubviews: [label, done])
        stack.axis = .vertical; stack.spacing = 24; stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24), stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24), stack.centerYAnchor.constraint(equalTo: view.centerYAnchor)])
    }
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if launched { finish(); return }
        launched = true
        LevelPlay.launchTestSuite(self)
    }
    @objc private func finish() {
        guard !finished else { return }; finished = true; onFinish?()
    }
}
