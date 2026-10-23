"use strict";
// The active language stays Japanese during this extraction-only change.
// Future locales can provide the same keys and reorder the named placeholders.
const GAME_TEXT_LOCALES = Object.freeze({ja: GAME_TEXT_JA});
const GAME_TEXT_LANGUAGE = 'ja';
function gameText(key, values = {}) {
    const text = GAME_TEXT_LOCALES[GAME_TEXT_LANGUAGE][key] ?? GAME_TEXT_JA[key] ?? GAME_DEV_TEXT_JA[key];
    if (typeof text !== 'string') throw new Error(`Unknown game text key: ${key}`);
    // A single pass keeps user-supplied braces/$/HTML as literal data.
    return text.replace(/\{(value\d+)\}/g, (_, name) => {
        if (!Object.hasOwn(values, name)) throw new Error(`Missing game text value: ${key}.${name}`);
        return String(values[name]);
    });
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
}
// Deferred scripts run after HTML parsing, before any game initialization.
if (typeof document !== 'undefined' && document.querySelectorAll) applyGameText(document);
