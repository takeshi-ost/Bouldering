"use strict";
// A quiet, symbolic outdoor festival around the trail. Decoration never takes input.
function mapSceneryMarkup(height) {
    const motifs=[];
    for(let y=100,band=0;y<height;y+=368,band++) {
        const left=band%2===0;
        motifs.push(`<use href="#map-art-mountain" x="${left?-45:275}" y="${y-62}" width="180" height="100"/>
            <ellipse cx="${left?18:382}" cy="${y+52}" rx="65" ry="27" fill="#e0e7cd"/>
            <use href="#map-art-pine" x="${left?12:350}" y="${y+6}" width="28" height="60"/>
            <use href="#map-art-pine" x="${left?40:328}" y="${y+28}" width="23" height="49"/>
            <use href="#map-art-wall" x="${left?322:14}" y="${y+115}" width="64" height="62"/>
            <use href="#map-art-tent" x="${left?16:322}" y="${y+208}" width="62" height="43"/>
            <use href="#map-art-grass" x="${left?302:76}" y="${y+64}" width="20" height="14"/>
            <use href="#map-art-grass" x="${left?38:346}" y="${y+280}" width="20" height="14"/>
            <use href="#map-art-grass" x="${left?344:20}" y="${y+303}" width="16" height="12"/>`);
        if(band%2===0)motifs.push(`<g transform="translate(10 ${y+178})" stroke="#a7b49b" stroke-width="1.5" stroke-linejoin="round">
            <path d="M0 0 Q40 15 82 0" fill="none"/>
            <path d="M7 3 L16 16 L22 6" fill="#d9bc73"/><path d="M31 8 L40 21 L47 8" fill="#a8bf9c"/>
            <path d="M58 6 L69 17 L75 3" fill="#d9bc73"/></g>`);
    }
    return `<defs>
        <symbol id="map-art-mountain" viewBox="0 0 180 100">
            <path d="M1 91 58 13 97 58 128 31 179 91Z" fill="#d5dfc6" stroke="#b6c4a7" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M58 13 79 80 97 58 128 31 117 81 162 91H1Z" fill="#c6d3b4"/>
            <path d="m36 43 22-30 17 20-17-7Z" fill="#e8eddc"/>
        </symbol>
        <symbol id="map-art-pine" viewBox="0 0 32 68">
            <path d="M16 43V65" stroke="#b5aa8c" stroke-width="4" stroke-linecap="round"/>
            <path d="M16 2 4 25H9L1 43H8L2 55H30L24 43H31L23 25H28Z" fill="#b0c59e" stroke="#8fa983" stroke-width="1.7" stroke-linejoin="round"/>
            <path d="m16 12 1 34 6-3" fill="none" stroke="#cbd9ba" stroke-width="1.4"/>
        </symbol>
        <symbol id="map-art-tent" viewBox="0 0 64 44">
            <ellipse cx="32" cy="39" rx="31" ry="4" fill="#d9e1c8"/>
            <path d="M3 36 24 5 43 9 61 36Z" fill="#eee0aa" stroke="#afa37c" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="m24 5 19 31H3Z" fill="#f7edc7" stroke="#afa37c" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="m24 15 12 21H12Z" fill="#c2c4a1"/>
            <path d="M24 15V36" stroke="#9eaa8d" stroke-width="1.5"/>
        </symbol>
        <symbol id="map-art-wall" viewBox="0 0 64 62">
            <path d="m2 46 39-13 21 12-39 14Z" fill="#b9cba7" stroke="#92ab85" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="m8 11 35-9 13 32-35 10Z" fill="#faf7e9" stroke="#a9b39e" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="m43 2 5 3 13 32-5-3Z" fill="#d4dcc8" stroke="#a9b39e" stroke-width="1.4" stroke-linejoin="round"/>
            <g fill="#b0c198"><circle cx="19" cy="17" r="2"/><circle cx="39" cy="19" r="2"/><circle cx="31" cy="34" r="2"/></g>
            <g fill="#d8bd73"><circle cx="31" cy="12" r="2"/><circle cx="22" cy="28" r="2"/><circle cx="45" cy="29" r="2"/></g>
            <g fill="#9dbbc0"><circle cx="29" cy="23" r="2"/><circle cx="44" cy="11" r="2"/></g>
        </symbol>
        <symbol id="map-art-grass" viewBox="0 0 20 14">
            <path d="m3 12-2-5m9 5V2m6 10 3-6" fill="none" stroke="#bdcba9" stroke-width="1.8" stroke-linecap="round"/>
        </symbol>
    </defs>${motifs.join('')}`;
}
