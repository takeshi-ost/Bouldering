'use strict';
// The former iOS adapter is now shared, so both platforms exercise the same tests.
require('./viewport.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
assert(!fs.readFileSync('scripts/build-ios-assets.cjs','utf8').includes('native-stage-layout'));
assert(!fs.readFileSync('scripts/native-bundle-source.cjs','utf8').includes('ASCENT_STAGE_VIEWPORT'));
console.log('PASS shared layout replaces iOS-only render/input/HUD substitutions');
