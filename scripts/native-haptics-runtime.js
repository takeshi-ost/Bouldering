/* iOS-only adapter. Independent from sound; preference survives app restarts. */
(() => {
    'use strict';
    const plugin=globalThis.Capacitor?.Plugins?.AscentHaptics;
    const key='ascent.haptics-enabled.v1';
    let enabled=true;
    try { enabled=globalThis.localStorage?.getItem(key)!=='false'; } catch (_) {}
    const checkbox=document.getElementById('hapticsEnabled');
    if(checkbox) {
        checkbox.checked=enabled;
        checkbox.addEventListener('change',()=>{
            enabled=checkbox.checked;
            try { globalThis.localStorage?.setItem(key,String(enabled)); } catch (_) {}
        });
    }
    globalThis.AscentHaptics=Object.freeze({
        click(strength) {
            if(!enabled || document.hidden || !plugin || !['light','strong'].includes(strength))return;
            try { Promise.resolve(plugin.click({strength})).catch(()=>{}); } catch (_) {}
        }
    });
})();
