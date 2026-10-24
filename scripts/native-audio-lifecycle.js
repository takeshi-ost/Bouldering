'use strict';
// WKWebView visibility/focus notifications alone can miss native interruptions.
// No settings are changed, and returning to the app never queues a sound effect.
(() => {
    globalThis.ASCENT_AUDIO_TRACE_EVENTS = [];
    globalThis.ASCENT_AUDIO_GENERATION = 0;
    globalThis.ASCENT_AUDIO_TRACE = (event, detail = {}) => {
        if (globalThis.ASCENT_IOS_BUILD?.audioDiagnosticsEnabled !== true) return;
        const events = globalThis.ASCENT_AUDIO_TRACE_EVENTS;
        events.push({event, detail, at:performance.now(), hidden:document.hidden,
            active:globalThis.ASCENT_NATIVE_AUDIO_ACTIVE, context:soundContext?.state ?? null});
        if (events.length > 32) events.shift();
    };
    let resuming = false;
    let healthTimer = null, epoch = 0, recoveryAttempted = false, needsHealthCheck = false;
    const watched = new WeakSet();
    globalThis.ASCENT_NATIVE_AUDIO_ACTIVE = !document.hidden;
    const cancelHealthCheck = () => {
        if (healthTimer !== null) window.clearTimeout(healthTimer);
        healthTimer = null;
    };
    const checkClock = () => {
        if (!needsHealthCheck || healthTimer !== null || recoveryAttempted || !soundPrimed ||
            (!soundEnabled && !musicEnabled) || document.hidden || globalThis.ASCENT_NATIVE_AUDIO_ACTIVE === false || !soundContext) return;
        const context = soundContext, time = context.currentTime, ticket = epoch;
        healthTimer = window.setTimeout(() => {
            healthTimer = null;
            if (ticket !== epoch || context !== soundContext || document.hidden ||
                globalThis.ASCENT_NATIVE_AUDIO_ACTIVE === false || (!soundEnabled && !musicEnabled)) return;
            const advanced = context.currentTime - time;
            globalThis.ASCENT_AUDIO_TRACE('clock-check', {state:context.state, advanced});
            if (context.state === 'running' && advanced > .02) {
                needsHealthCheck = false;
                return;
            }
            // Real-device evidence: resume can resolve with state=running while
            // currentTime is permanently frozen. Reusing that graph cannot work.
            // At most one graph replacement per interruption; never change prefs.
            recoveryAttempted = true; needsHealthCheck = false;
            pauseBackgroundMusic(); stopSoundEffects();
            context.onstatechange = null;
            try { context.close()?.catch(() => {}); } catch (_) {}
            soundContext = null; soundMaster = null; soundEffectsGain = null; musicMaster = null; soundPrimed = false;
            globalThis.ASCENT_AUDIO_GENERATION++;
            globalThis.ASCENT_AUDIO_TRACE('context-rebuilt', {previousState:context.state, advanced});
            unlockSound();
            watchContext();
        }, 700);
    };
    const watchContext = () => {
        const context = soundContext;
        if (!context || watched.has(context)) return;
        watched.add(context);
        context.addEventListener?.('statechange', () => {
            if (context !== soundContext) return;
            globalThis.ASCENT_AUDIO_TRACE('context-statechange');
            if (context.state !== 'running') pauseBackgroundMusic();
            if (context.state === 'suspended' || context.state === 'interrupted') resume();
            else if (context.state === 'running') syncBackgroundMusic();
        });
    };
    const pause = () => {
        globalThis.ASCENT_AUDIO_TRACE('pause-event');
        cancelHealthCheck();
        epoch++; recoveryAttempted = false; needsHealthCheck = true;
        globalThis.ASCENT_NATIVE_AUDIO_ACTIVE = false;
        bgmPageActive = false;
        stopSounds();
    };
    const resume = () => {
        if (document.hidden || globalThis.ASCENT_NATIVE_AUDIO_ACTIVE === false) return;
        bgmPageActive = true;
        pendingSound = null;
        watchContext();
        if (!soundPrimed || resuming) return;
        resuming = true;
        unlockSound();
        watchContext();
        checkClock();
        // One in-flight attempt; blocked autoplay is retried by the next gesture.
        Promise.resolve().then(() => { resuming = false; syncBackgroundMusic(); });
    };
    const activate = () => {
        globalThis.ASCENT_AUDIO_TRACE('resume-event');
        globalThis.ASCENT_NATIVE_AUDIO_ACTIVE = !document.hidden;
        resume();
    };
    window.addEventListener('ascent-native-pause', pause);
    window.addEventListener('ascent-native-resume', activate);
    document.addEventListener('visibilitychange', () => document.hidden ? pause() : activate());
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', activate);
    // Existing gesture handlers unlock the context first; then restore the page gate.
    for (const event of ['pointerup', 'touchend', 'click', 'keydown']) {
        document.addEventListener(event, resume, {passive:true});
    }
})();
