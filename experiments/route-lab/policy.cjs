'use strict';
const common="default-src 'none'; script-src 'self' https://ascent-route-lab.activeboar15.chatgpt.site; style-src 'self' https://ascent-route-lab.activeboar15.chatgpt.site 'unsafe-inline'; img-src 'self' https://ascent-route-lab.activeboar15.chatgpt.site data:; font-src 'none'; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
module.exports={shell:common+"; frame-src 'self'; media-src 'none'",game:common+"; frame-src 'none'; media-src 'none'"};
