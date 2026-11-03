# iOS branding artwork

The artwork approved in commit `c2dfc0184d7c2559bc3e837011b26f7971e32200`
(0.4.8) is restored in source 0.4.58. The formal integration had retained
Capacitor's placeholder icon and splash instead. No artwork is redesigned or
re-encoded in this restoration.

- App icon: `AppIcon.appiconset/AppIcon-512@2x.png`, opaque RGB 1024×1024.
  SHA-256: `88c84c48c551dda62bf2c6c5a617646cc1b8908a1cd1afebfa78f6e7f16892a6`.
  The original 1254×1254 input was downsampled at approval time; this restores the
  approved native file exactly.
- Launch artwork: `Splash.imageset/LaunchBrand.png`, 853×1844, with lowercase
  `kamogawa games`. SHA-256:
  `17c7559800aca3769f69509a7d2cf076ffc1794fc2e8b934f9aa012e00164a80`.
- LaunchScreen uses aspect fit, centered in the whole view, on fixed pale
  background `#ece9e6`. Different aspect ratios may have solid margins; the
  artwork and lettering are neither stretched nor cropped. Template splash
  files are removed from the catalog.

The later centered Web title layout is preserved, including removal of the
publisher and its old blank spacer. App name, bundle ID, signing/team, native
build metadata, Firebase policy and saved player data are unchanged.

`node tests/ios-branding.cjs` pins both exact image hashes, catalog references,
opaque icon format and launch layout. `tests/ios-assets.cjs` includes that check
for both generated bundles and built apps, so existing native CI runs it.
Static aspect-fit geometry covers five portrait/landscape sizes. PNG pixel
decoding can be checked locally, but Xcode asset/storyboard compilation and
actual device icon/launch appearance need separate verification. A prior
0.4.57 CI pass does not verify these restored resources.
