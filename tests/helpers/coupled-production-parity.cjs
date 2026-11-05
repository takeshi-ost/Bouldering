'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const [web,native]=process.argv.slice(2);if(!web||!native)throw Error('Usage: node tests/helpers/coupled-production-parity.cjs web-report.json native-report.json');
const a=JSON.parse(fs.readFileSync(web)),b=JSON.parse(fs.readFileSync(native));
assert.equal(a.length,b.length);let count=0;
for(let i=0;i<a.length;i++){assert(a[i].ok&&b[i].ok);assert.equal(a[i].productionDigest,b[i].productionDigest,'same production source revision');assert.equal(a[i].n,b[i].n);assert.equal(a[i].date,b[i].date);assert.equal(a[i].sha256,b[i].sha256,'geometry/action/trace/hearts/stamina/retry native parity '+JSON.stringify({n:a[i].n,date:a[i].date}));assert.deepEqual(a[i].resources,b[i].resources);count++;}
console.log('PASS exact web/native coupled generation parity: '+count+' courses');
