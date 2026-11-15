import Foundation
import CoreFoundation
import UIKit
import Capacitor
#if canImport(FirebaseAnalytics) && canImport(FirebaseCore)
import FirebaseAnalytics
import FirebaseCore
#endif

// No authentication identifier, user property, advertising ID or arbitrary payload.
enum AscentAnalyticsSchema {
    static func sanitize(_ name: String, _ input: [String: Any]) -> [String: Any]? {
        func number(_ key: String, maximum: Int) -> Int? {
            guard let n = input[key] as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(),
                  n.doubleValue.isFinite, n.doubleValue.rounded() == n.doubleValue,
                  n.doubleValue >= 0, n.doubleValue <= Double(maximum) else { return nil }
            return n.intValue
        }
        switch name {
        case "level_start", "level_end":
            guard let mode = input["mode"] as? String, ["stage", "daily"].contains(mode),
                  let stage = number("stage", maximum: 100000) else { return nil }
            var result: [String: Any] = ["mode": mode, "level_name": mode == "daily" ? "daily" : "stage_\(stage)"]
            if name == "level_end" {
                guard let success = number("success", maximum: 1) else { return nil }
                result["success"] = success
                if let moves = number("moves", maximum: 100000) { result["moves"] = moves }
            }
            return result
        case "ascent_ad_start", "ascent_ad_complete":
            guard let format = input["format"] as? String, ["rewarded", "interstitial"].contains(format) else { return nil }
            if name == "ascent_ad_complete" && format != "rewarded" { return nil }
            return ["format": format]
        default: return nil
        }
    }
}

// Terms gate is authoritative in native storage. Missing reviewed terms fail closed.
enum AscentTermsGate {
    static var version: String? {
        guard Bundle.main.object(forInfoDictionaryKey: "AscentFirstRunTermsReviewed") as? Bool == true,
              let v = Bundle.main.object(forInfoDictionaryKey: "AscentTermsVersion") as? String, !v.isEmpty else { return nil }
        return v
    }
    static var recordAccepted: Bool { guard let v = version else { return false }; return UserDefaults.standard.string(forKey: "ascent.terms.accepted.native.v1") == v }
    // Legacy test/OFF state requires fresh explicit acceptance, never silent enablement.
    static var accepted: Bool { recordAccepted && UserDefaults.standard.object(forKey: "ascent.analytics.permission.v1") as? Bool == true }
    static func initialAnalyticsEnabled(termsAccepted: Bool, previouslyAccepted: Bool, explicitAcceptance: Bool, existingChoice: Bool?) -> Bool {
        guard termsAccepted else { return false }
        if explicitAcceptance { return true }
        return existingChoice == true
    }
    static func accept(_ v: String) -> Bool {
        guard version == v else { return false }
        UserDefaults.standard.set(v, forKey: "ascent.terms.accepted.native.v1")
        return recordAccepted
    }
}

final class AscentAnalytics {
    static let shared = AscentAnalytics()
    private let key = "ascent.analytics.permission.v1"
    private(set) var epoch = 0
    var allowed: Bool { UserDefaults.standard.object(forKey: key) as? Bool == true }
    var configured = false
    var available: Bool {
        guard Bundle.main.object(forInfoDictionaryKey: "AscentAnalyticsPrivacyReviewed") as? Bool == true else { return false }
        #if canImport(FirebaseAnalytics) && canImport(FirebaseCore)
        guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
              let options = FirebaseOptions(contentsOfFile: path), options.bundleID == Bundle.main.bundleIdentifier else { return false }
        return true
        #else
        return false
        #endif
    }
    var deletionPending: Bool { UserDefaults.standard.bool(forKey: "ascent.deletion.analytics-paused.v1") }
    func resumeIfPermitted() { if allowed && !deletionPending { activate() } }
    private func activate() {
        guard AscentTermsGate.accepted, available, allowed, !deletionPending else { return }
        #if canImport(FirebaseAnalytics) && canImport(FirebaseCore)
        if FirebaseApp.app() == nil { FirebaseApp.configure() }
        // Firebase is never initialized by this component before permission.
        Analytics.setConsent([.analyticsStorage: .granted, .adStorage: .denied, .adUserData: .denied, .adPersonalization: .denied])
        Analytics.setAnalyticsCollectionEnabled(true)
        configured = true
        #endif
    }
    func enableAfterAcceptance() -> Bool {
        guard AscentTermsGate.recordAccepted else { return false }
        epoch += 1
        UserDefaults.standard.set(false, forKey: "ascent.deletion.analytics-paused.v1")
        UserDefaults.standard.set(true, forKey: key)
        guard allowed else { return false }
        activate()
        return true
    }
    func pauseForAccountDeletion() {
        UserDefaults.standard.set(true, forKey: "ascent.deletion.analytics-paused.v1")
        epoch += 1
        #if canImport(FirebaseAnalytics) && canImport(FirebaseCore)
        if configured { Analytics.setAnalyticsCollectionEnabled(false) }
        #endif
    }
    func finishAccountDeletion(_ deletionID: String) -> Bool {
        // Idempotency prevents replay of an old completion from clearing new consent.
        if UserDefaults.standard.string(forKey: "ascent.deletion.terms-reset.v1") == deletionID { return true }
        pauseForAccountDeletion()
        UserDefaults.standard.removeObject(forKey: "ascent.terms.accepted.native.v1")
        UserDefaults.standard.set(false, forKey: key)
        #if canImport(FirebaseAnalytics) && canImport(FirebaseCore)
        if configured { Analytics.setConsent([.analyticsStorage: .denied, .adStorage: .denied, .adUserData: .denied, .adPersonalization: .denied]) }
        #endif
        guard !AscentTermsGate.recordAccepted && !allowed else { return false }
        UserDefaults.standard.set(deletionID, forKey: "ascent.deletion.terms-reset.v1")
        return UserDefaults.standard.string(forKey: "ascent.deletion.terms-reset.v1") == deletionID
    }
    func log(_ name: String, _ parameters: [String: Any], epoch expected: Int? = nil) {
        guard AscentTermsGate.accepted, allowed, configured, !deletionPending, expected == nil || expected == epoch,
              let safe = AscentAnalyticsSchema.sanitize(name, parameters) else { return }
        #if canImport(FirebaseAnalytics) && canImport(FirebaseCore)
        Analytics.logEvent(name, parameters: safe)
        #endif
    }
}

@objc(AscentAnalyticsPlugin)
public final class AscentAnalyticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AscentAnalyticsPlugin"
    public let jsName = "AscentAnalytics"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "beginAccountDeletion", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "completeAccountDeletion", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "openPrivacyPolicy", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "termsStatus", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "acceptTerms", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "event", returnType: CAPPluginReturnPromise)]
    private func result() -> [String: Any] {
        let a = AscentAnalytics.shared
        return ["available": a.available, "enabled": AscentTermsGate.accepted && a.available && a.allowed && a.configured && !a.deletionPending, "epoch": a.epoch]
    }
    private func termsResult() -> [String: Any] {
        return ["accepted": AscentTermsGate.accepted, "version": AscentTermsGate.version ?? "",
                "analyticsInitialOn": true]
    }
    @objc func beginAccountDeletion(_ call: CAPPluginCall) {
        guard let web = bridge?.webView, web.url?.scheme == "capacitor", web.url?.host == "localhost", AscentTermsGate.accepted else { call.reject("terms_required"); return }
        AscentAnalytics.shared.pauseForAccountDeletion()
        call.resolve(["paused": AscentAnalytics.shared.deletionPending])
    }
    @objc func completeAccountDeletion(_ call: CAPPluginCall) {
        guard let web = bridge?.webView, web.url?.scheme == "capacitor", web.url?.host == "localhost",
              let deletionID = call.getString("deletionID"), !deletionID.isEmpty else { call.reject("untrusted_origin"); return }
        // Called only by the local controller's durable, acknowledged done path.
        guard AscentAnalytics.shared.finishAccountDeletion(deletionID) else { call.reject("terms_reset_failed"); return }
        call.resolve(["reset": true])
    }
    @objc func openPrivacyPolicy(_ call: CAPPluginCall) {
        // Explicit button action only; never invoked at app launch or acceptance.
        // Keep old public policy unreachable until its approved revision is published.
        guard let web = bridge?.webView, web.url?.scheme == "capacitor", web.url?.host == "localhost" else {
            call.reject("untrusted_origin"); return
        }
        guard let version = AscentTermsGate.version,
              Bundle.main.object(forInfoDictionaryKey: "AscentPublishedPrivacyVersion") as? String == version else {
            call.resolve(["opened": false, "reason": "revision_not_published"]); return
        }
        let suffix = call.getString("language") == "en" ? "#en" : "#ja"
        guard let url = URL(string: "https://takeshi-ost.github.io/Bouldering/privacy/" + suffix) else { call.reject("invalid_url"); return }
        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { opened in
                call.resolve(["opened": opened, "reason": opened ? "browser_opened" : "browser_unavailable"])
            }
        }
    }
    @objc func termsStatus(_ call: CAPPluginCall) { call.resolve(termsResult()) }
    @objc func acceptTerms(_ call: CAPPluginCall) {
        guard let web = bridge?.webView, web.url?.scheme == "capacitor", web.url?.host == "localhost",
              let version = call.getString("version"), AscentTermsGate.version == version else { call.reject("terms_not_reviewed"); return }
        let previouslyAccepted = AscentTermsGate.accepted
        let explicitAcceptance = call.getBool("explicitAcceptance") == true
        guard previouslyAccepted || explicitAcceptance, AscentTermsGate.accept(version) else { call.reject("terms_required"); return }
        // Product rule: explicit first-run terms acceptance enables analytics.
        // First explicit acceptance overrides pre-terms test/OFF choices.
        // No in-game analytics withdrawal; legacy OFF requires this explicit action. Ads remain independent.
        if !previouslyAccepted && AscentTermsGate.initialAnalyticsEnabled(termsAccepted: AscentTermsGate.recordAccepted,
            previouslyAccepted: previouslyAccepted, explicitAcceptance: explicitAcceptance,
            existingChoice: UserDefaults.standard.object(forKey: "ascent.analytics.permission.v1") as? Bool) {
            guard AscentAnalytics.shared.enableAfterAcceptance() else { call.reject("terms_storage_failed"); return }
        } else { AscentAnalytics.shared.resumeIfPermitted() }
        call.resolve(termsResult())
    }
    @objc func status(_ call: CAPPluginCall) { call.resolve(result()) }
    @objc func event(_ call: CAPPluginCall) {
        // Only the bundled top-level app may submit events. External navigation is not trusted.
        guard let web = bridge?.webView, web.url?.scheme == "capacitor", web.url?.host == "localhost", let name = call.getString("name"), let data = call.getObject("parameters"), let epoch = call.getInt("epoch") else { call.resolve(); return }
        AscentAnalytics.shared.log(name, data, epoch: epoch)
        call.resolve()
    }
}
