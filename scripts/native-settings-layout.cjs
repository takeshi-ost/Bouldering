'use strict';
// Native diagnostics are supplementary Debug-only text. Move their existing
// nodes, with all visibility/i18n attributes intact, below every regular control.
// Web retains its ordinary connection/pending messages and their own rules.
module.exports=function nativeSettingsLayout(html) {
    const dialogs=[...html.matchAll(/<dialog\b[^>]*\bid="settingsDialog"[^>]*>[\s\S]*?<\/dialog>/g)];
    if(dialogs.length!==1)throw Error('Expected one settings dialog');
    const original=dialogs[0][0],ids=['onlineStatus','onlineScoreStatus'];
    let settings=original;
    const paragraphs=ids.map(id=>{
        const matches=[...settings.matchAll(new RegExp('<p\\b[^>]*\\bid="'+id+'"[^>]*>[\\s\\S]*?<\\/p>','g'))];
        if(matches.length!==1)throw Error('Expected one native diagnostic: '+id);
        settings=settings.replace(matches[0][0],'');
        return matches[0][0];
    });
    settings=settings.replace(/\s*<\/dialog>$/, '\n            '+paragraphs.join('\n            ')+'\n        </dialog>');
    return html.replace(original,()=>settings);
};
