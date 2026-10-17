"use strict";
// Shared stage asset: numbers and state colors belong to the button, not the artwork.
function mapWallMarkup(n) {
    return `<svg class="map-wall" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M8 74 62 53 96 74 42 97Z" fill="#727d76"/>
        <path d="M8 70 62 49 96 70 42 93Z" fill="var(--mat-color,#929d92)"/>
        <path d="M8 70 42 93V97L8 74Z" fill="#65716a"/>
        <path d="M16 64 23 14 29 19 23 68Z" fill="#596b6b"/>
        <path d="M23 14 75 34 75 75 23 55Z" fill="var(--wall-color,#eeeee5)"/>
        <path d="M75 34 81 31 81 73 75 75Z" fill="#9da9a4"/>
        <path d="M23 14 29 11 81 31 75 34Z" fill="#faf8ef"/>
        <g fill="#91a7af"><path d="m33 26 5-2 4 4-2 5-6-2Z"/><path d="m61 52 5-1 4 5-3 4-5-2Z"/></g>
        <g fill="#c4a569"><path d="m54 33 5-2 4 5-3 4-6-2Z"/><path d="m32 45 5-2 3 4-1 4-6-1Z"/></g>
        <path d="m49 45 5-1 4 4-3 5-5-2Z" fill="#bc9077"/>
        <text x="53" y="82" transform="rotate(-21 53 82)" text-anchor="middle" fill="var(--number-color,#fffdf3)" font-size="22" font-weight="800" font-family="system-ui,sans-serif">${n}</text>
    </svg>`;
}
function mapSceneryMarkup(height) {
    const art=[];
    // All pages share the same continuous rhythm: no summit or end cap at STAGE 20.
    for(let y=-120,band=0;y<height;y+=440,band++) {
        art.push(`<g transform="translate(0 ${y})">
            <path d="M0 0H400V440H0Z" fill="#c8cdb6"/>
            <path d="M0 0 185 80 0 260Z" fill="#b3bda6"/>
            <path d="M185 80 400 0 400 225Z" fill="#d5d7c2"/>
            <path d="M0 260 185 80 260 300 110 440H0Z" fill="#d1d3bc"/>
            <path d="M400 225 260 300 400 440Z" fill="#aebba5"/>
            <path d="M110 440 260 300 400 440Z" fill="#bdc6af"/>
            <path d="M0 42 36 9 86 141 0 192Z" fill="#98aaa0"/>
            <path d="M36 9 39 118 86 141Z" fill="#7f9690"/>
            <path d="M400 245 358 198 320 354 400 399Z" fill="#9baea2"/>
            <path d="M358 198 363 337 400 399Z" fill="#82988e"/>
            <use href="#map-art-rock" x="8" y="194" width="44" height="33"/>
            <use href="#map-art-rock" x="350" y="92" width="39" height="31"/>
            <use href="#map-art-pine" x="9" y="54" width="28" height="68"/>
            <use href="#map-art-pine" x="41" y="104" width="23" height="56"/>
            <use href="#map-art-pine" x="5" y="132" width="21" height="51"/>
            <use href="#map-art-pine" x="355" y="262" width="28" height="68"/>
            <use href="#map-art-pine" x="326" y="322" width="22" height="53"/>
            <use href="#map-art-pine" x="380" y="351" width="25" height="61"/>
            <use href="#map-art-pine" x="53" y="342" width="26" height="63"/>
            <use href="#map-art-rock" x="17" y="393" width="36" height="27"/>
            <use href="#map-art-rock" x="371" y="173" width="31" height="24"/>
            <path d="m83 249-3-10 7 4 3-9 2 14Z M302 76l-4-8 6 2 4-6-1 12Z M288 398l-4-9 7 3 3-8 2 14Z" fill="#8f9f86"/>
            ${band%2===0?'<use href="#map-art-tent" x="316" y="125" width="57" height="43"/>':'<use href="#map-art-tent" x="14" y="278" width="57" height="43"/>'}
        </g>`);
    }
    return `<defs>
        <symbol id="map-art-pine" viewBox="0 0 32 78">
            <path d="m16 68 16 7-15 3L0 71Z" fill="#8b9d8970"/>
            <path d="M14 48H19V74H14Z" fill="#8a8271"/>
            <path d="M16 0 1 55 16 66 31 55Z" fill="#6e8574"/>
            <path d="M16 0V66L31 55Z" fill="#4f6b61"/>
            <path d="M16 0 4 43 14 36Z" fill="#93a28a"/>
        </symbol>
        <symbol id="map-art-rock" viewBox="0 0 50 36">
            <path d="M1 29 9 9 28 1 46 13 49 31 27 36Z" fill="#a3ada8"/>
            <path d="M9 9 28 1 46 13 29 18Z" fill="#d8dcd5"/>
            <path d="M9 9 29 18 27 36 1 29Z" fill="#bec6bf"/>
            <path d="M29 18 46 13 49 31 27 36Z" fill="#899b98"/>
        </symbol>
        <symbol id="map-art-tent" viewBox="0 0 64 48">
            <path d="m0 35 34-12 30 17-34 8Z" fill="#a1ad96"/>
            <path d="M5 33 26 3 44 10 60 37 33 45Z" fill="#c5af7c"/>
            <path d="M26 3 33 45 5 33Z" fill="#e0c78e"/>
            <path d="m26 14 4 26-17-8Z" fill="#75867b"/>
        </symbol>
    </defs>${art.join('')}`;
}
