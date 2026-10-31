"use strict";
const LANGUAGE_KEY = 'ascent.language.v1';
const GAME_TEXT_LOCALES = Object.freeze({ja: GAME_TEXT_JA, en: GAME_TEXT_EN});
function readGameLanguage() {
    try {
        const language = ASCENT_TRIAL_STORAGE?.getItem(LANGUAGE_KEY);
        if (Object.hasOwn(GAME_TEXT_LOCALES, language)) return language;
    } catch (_) { /* Keep the session preference when device storage is unavailable. */ }
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
    if (root.documentElement) root.documentElement.lang = GAME_TEXT_LANGUAGE;
    const choice = root.getElementById?.('languageChoice');
    if (choice) choice.value = GAME_TEXT_LANGUAGE;
}
function setGameLanguage(language) {
    if (!Object.hasOwn(GAME_TEXT_LOCALES, language)) return false;
    const previous = GAME_TEXT_LANGUAGE;
    GAME_TEXT_LANGUAGE = language;
    try { ASCENT_TRIAL_STORAGE?.setItem(LANGUAGE_KEY, language); } catch (_) {}
    if (typeof document !== 'undefined' && document.querySelectorAll) applyGameText(document);
    if (previous !== language && typeof refreshGameLanguage === 'function') refreshGameLanguage(previous);
    return true;
}
// Deferred scripts run after HTML parsing, before any game initialization.
if (typeof document !== 'undefined' && document.querySelectorAll) applyGameText(document);
