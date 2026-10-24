'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nativeSource=require('../scripts/native-bundle-source.cjs');
const bytes=fs.readFileSync('ios-assets/gym-floor-extended.png');
assert.equal(bytes.readUInt32BE(16),1774);assert.equal(bytes.readUInt32BE(20),887);
const calls=[];
class Image {
 constructor(){this.complete=true;this.naturalWidth=800;this.naturalHeight=100;}
 set src(value){this.path=value;if(value.includes('native/')){this.naturalWidth=1774;this.naturalHeight=887;}}
 addEventListener(){}
}
const source=nativeSource('renderer.js',fs.readFileSync('js/renderer.js','utf8'));
vm.runInNewContext(source.slice(0,source.indexOf('function isFloorStartHold'))+'\ndrawGymFloor();',{
 Image,W:400,H:700,HEIGHT:1400,HOLD_CONFIG:{bottomMargin:80},ctx:{drawImage:(...a)=>calls.push(a),fillRect(){}}
});
assert.equal(calls.length,2);
assert(calls[0][0].path.endsWith('gym-floor.webp'));
assert.deepEqual(calls[0].slice(1),[0,1320,400,80],'Original image and foot margin must not change');
assert(calls[1][0].path.endsWith('native/gym-floor-extended.png'));
assert.deepEqual(calls[1].slice(1),[0,221.75,1774,665.25,0,1400,400,240]);
console.log('PASS floor: original 800x100/80-world-unit floor preserved; outpainted lower image adds 240 world units below it');
