'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.cjs')).sort();
let failures = 0;
for (const file of files) {
    console.log(`\n[${files.indexOf(file) + 1}/${files.length}] ${file}`);
    const result = spawnSync(process.execPath, [path.join('tests', file)], {
        cwd: root, stdio: 'inherit', timeout: 180000
    });
    if (result.status !== 0) {
        failures++;
        console.error(`FAIL ${file}: ${result.error?.message || result.signal || result.status}`);
    }
}
console.log(`\n${files.length - failures}/${files.length} test files passed`);
process.exitCode = failures ? 1 : 0;
