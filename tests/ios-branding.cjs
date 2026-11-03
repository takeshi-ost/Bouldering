'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'ios/App/App/Assets.xcassets');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// Pin the approved artwork itself, not only its dimensions: the Capacitor
// placeholder icon also satisfies the 1024px / opaque RGB requirements.
function approvedImage(set, filename, size, sha256) {
    const dir = path.join(assets, set);
    const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'Contents.json')));
    assert.equal(catalog.images.length, 1);
    assert.equal(catalog.images[0].filename, filename);
    const bytes = fs.readFileSync(path.join(dir, filename));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], size);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), sha256,
        'Preserve the artwork approved at c2dfc01, without re-encoding');
    assert.deepEqual(fs.readdirSync(dir).sort(), ['Contents.json', filename].sort(),
        'No stale template or scale-specific alternative artwork');
    return {catalog, bytes};
}
const icon = approvedImage('AppIcon.appiconset', 'AppIcon-512@2x.png', [1024, 1024],
    '88c84c48c551dda62bf2c6c5a617646cc1b8908a1cd1afebfa78f6e7f16892a6');
assert.equal(icon.bytes[25], 2, 'App icon must be opaque RGB without an alpha channel');
assert.deepEqual(icon.catalog.images[0], {
    filename: 'AppIcon-512@2x.png', idiom: 'universal', platform: 'ios', size: '1024x1024'
});
const splash = approvedImage('Splash.imageset', 'LaunchBrand.png', [853, 1844],
    '17c7559800aca3769f69509a7d2cf076ffc1794fc2e8b934f9aa012e00164a80');
assert.equal(splash.catalog.images[0].idiom, 'universal');
const storyboard = read('ios/App/App/Base.lproj/LaunchScreen.storyboard');
assert.match(storyboard, /<imageView[^>]*key="view"[^>]*contentMode="scaleAspectFit"[^>]*image="Splash"/);
assert.match(storyboard, /red="0.92549" green="0.91373" blue="0.90196" alpha="1"/);
assert.match(storyboard, /<image name="Splash" width="853" height="1844"/);
assert(!storyboard.includes('scaleAspectFill'), 'Do not crop the approved lettering');
assert.match(read('ios/App/App/Info.plist'), /<key>UILaunchStoryboardName<\/key>\s*<string>LaunchScreen<\/string>/);
const project = read('ios/App/App.xcodeproj/project.pbxproj');
assert.equal((project.match(/ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;/g) || []).length, 2,
    'Debug and Release must use the approved catalog');
assert(project.includes('Assets.xcassets in Resources'));
assert(project.includes('LaunchScreen.storyboard in Resources'));
for (const [w, h] of [[390, 844], [320, 568], [844, 390], [768, 1024], [1024, 768]]) {
    const scale = Math.min(w / 853, h / 1844), x = (w - 853 * scale) / 2, y = (h - 1844 * scale) / 2;
    assert(x >= -1e-8 && y >= -1e-8);
    assert(Math.abs(x + 853 * scale / 2 - w / 2) < 1e-8);
    assert(Math.abs(y + 1844 * scale / 2 - h / 2) < 1e-8);
}
console.log('PASS iOS branding: approved icon/launch byte hashes, opaque icon, no template alternates, aspect-fit launch/background, Debug+Release catalog references; static check, not device rendering');
