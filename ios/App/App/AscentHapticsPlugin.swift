import UIKit
import Capacitor

// Deliberately only two short impacts: no vibration loops or delayed playback.
@objc(AscentHapticsPlugin)
public final class AscentHapticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AscentHapticsPlugin"
    public let jsName = "AscentHaptics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "click", returnType: CAPPluginReturnPromise)
    ]

    // Accessed and initialized only on the main queue.
    private lazy var lightImpact = UIImpactFeedbackGenerator(style: .light)
    private lazy var strongImpact = UIImpactFeedbackGenerator(style: .medium)

    @objc func click(_ call: CAPPluginCall) {
        guard let strength = call.getString("strength"),
              strength == "light" || strength == "strong" else {
            call.reject("invalid_haptic_strength")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  UIApplication.shared.applicationState == .active,
                  let web = self.bridge?.webView,
                  web.url?.scheme == "capacitor", web.url?.host == "localhost" else {
                call.resolve(["played": false])
                return
            }
            let generator = strength == "light" ? self.lightImpact : self.strongImpact
            if strength == "light" {
                generator.impactOccurred(intensity: 0.25)
            } else {
                generator.impactOccurred()
            }
            // Prepare the reused generator for the next interactive click.
            generator.prepare()
            call.resolve(["played": true])
        }
    }
}
