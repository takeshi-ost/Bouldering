"use strict";
const LANGUAGE_KEY = 'ascent.language.v1';
const GAME_TEXT_LOCALES = Object.freeze({ja: GAME_TEXT_JA, en: GAME_TEXT_EN});
// A session choice still works if storage is blocked/full. Keep its durability
// separate from the chosen language; a failed write cannot promise a reload.
let GAME_TEXT_LANGUAGE_PERSISTED = false;
function persistGameLanguage(language) {
    try {
        const storage = globalThis.localStorage;
        if (!storage) return false;
        storage.setItem(LANGUAGE_KEY, language);
        return storage.getItem(LANGUAGE_KEY) === language;
    } catch (_) { return false; }
}
function initialDeviceGameLanguage() {
    let primary = '';
    try {
        const native = globalThis.ASCENT_IOS_BUILD;
        if (native && Object.hasOwn(native, 'preferredLanguage')) {
            // Native metadata is installed at document start. WKWebView's
            // navigator locale (and the separate resume-alert locale) need not
            // reflect the user's primary iOS language.
            primary = native.preferredLanguage;
        } else {
            const browser = globalThis.navigator;
            primary = typeof browser?.language === 'string' && browser.language.trim()
                ? browser.language : browser?.languages?.[0];
        }
    } catch (_) { /* An unavailable locale takes the non-Japanese default. */ }
    // Only the primary language counts. A lower-priority Japanese entry must
    // not override English/French/etc.; tolerate case and legacy separators.
    return typeof primary === 'string' && /^ja(?:-|$)/i.test(primary.trim().replace(/_/g, '-')) ? 'ja' : 'en';
}
function readGameLanguage() {
    try {
        const language = globalThis.localStorage?.getItem(LANGUAGE_KEY);
        if (Object.hasOwn(GAME_TEXT_LOCALES, language)) {
            GAME_TEXT_LANGUAGE_PERSISTED = true;
            return language;
        }
    } catch (_) {
        // The saved choice is unknown. Do not overwrite it or infer first use.
        return 'ja';
    }
    // This evidence is captured before any default save, including this one.
    // A saved pending tutorial is an existing player, not a fresh installation.
    if (globalThis.AscentTutorialState?.snapshot?.().firstUse === true) {
        const language = initialDeviceGameLanguage();
        GAME_TEXT_LANGUAGE_PERSISTED = persistGameLanguage(language);
        return language;
    }
    // Preserve the historical default for existing/unknown users with no valid
    // selection, including interrupted tutorials and corrupt saved markers.
    return 'ja';
}
let GAME_TEXT_LANGUAGE = readGameLanguage();
function gameText(key, values = {}) {
    const singular = GAME_TEXT_LANGUAGE === 'en' && Number(values.value0) === 1 && GAME_TEXT_EN_ONE[key];
    const text = singular || (GAME_TEXT_LOCALES[GAME_TEXT_LANGUAGE][key] ?? GAME_TEXT_JA[key] ?? GAME_DEV_TEXT_JA[key]);
    if (typeof text !== 'string') throw new Error(`Unknown game text key: ${key}`);
    // A single pass keeps user-supplied braces/$/HTML as literal data.
    return text.replace(/\{(value\d+)\}/g, (_, name) => {
        if (!Object.hasOwn(values, name)) throw new Error(`Missing game text value: ${key}.${name}`);
        return String(values[name]);
    });
}
function translateExistingGameText(value, fromLanguage) {
    const previous = {...GAME_DEV_TEXT_JA, ...GAME_TEXT_LOCALES[fromLanguage]};
    const key = Object.keys(previous).find(key => previous[key] === value && !/\{value\d+\}/.test(previous[key]));
    return key ? gameText(key) : value;
}
function applyGameText(root) {
    for (const element of root.querySelectorAll('[data-i18n]')) {
        element.textContent = gameText(element.getAttribute('data-i18n'));
    }
    for (const attribute of ['aria-label', 'alt', 'title', 'placeholder']) {
        for (const element of root.querySelectorAll(`[data-i18n-${attribute}]`)) {
            element.setAttribute(attribute, gameText(element.getAttribute(`data-i18n-${attribute}`)));
        }
    }
    // Authored help can intentionally omit a block in one locale. Re-evaluate
    // on every language switch; do not touch the separately gated trial notice.
    for (const element of root.querySelectorAll('[data-help-if-text]')) {
        element.hidden = !gameText(element.getAttribute('data-help-if-text')).trim();
    }
    if (root.documentElement) root.documentElement.lang = GAME_TEXT_LANGUAGE;
    const choice = root.getElementById?.('languageChoice');
    if (choice) choice.value = GAME_TEXT_LANGUAGE;
}
function setGameLanguage(language) {
    if (!Object.hasOwn(GAME_TEXT_LOCALES, language)) return false;
    const previous = GAME_TEXT_LANGUAGE;
    GAME_TEXT_LANGUAGE = language;
    GAME_TEXT_LANGUAGE_PERSISTED = persistGameLanguage(language);
    if (typeof document !== 'undefined' && document.querySelectorAll) applyGameText(document);
    if (previous !== language && typeof refreshGameLanguage === 'function') refreshGameLanguage(previous);
    return true;
}
// Deferred scripts run after HTML parsing, before any game initialization.
if (typeof document !== 'undefined' && document.querySelectorAll) applyGameText(document);
