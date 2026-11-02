'use strict';
// Formal web artifact only. Source index/native assets are never rewritten.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function formalStorageSource(source,name){
 const all=(source.match(/\blocalStorage\b/g)||[]).length,qualified=(source.match(/globalThis\.localStorage/g)||[]).length;
 if(all!==qualified||/\b(sessionStorage|indexedDB)\b/.test(source))throw Error('Unreviewed gameplay storage: '+name);
 return source.replaceAll('globalThis.localStorage','ASCENT_FORMAL_STORAGE');
}
function buildPagesFormal({outputDir,allowDirty=false}={}){
 if(!outputDir)throw Error('An output directory is required');
 const out=path.resolve(outputDir);
 if(out===ROOT||ROOT.startsWith(out+path.sep)||out.startsWith(ROOT+path.sep))throw Error('Output must be outside the source checkout');
 if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Output must be a new or empty directory');
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
 const dirty=!!execFileSync('git',['status','--porcelain'],{cwd:ROOT,encoding:'utf8'}).trim();
 if(dirty&&!allowDirty)throw Error('Commit source first, or use --allow-dirty for local tests only');
 const files=new Map(),sources=[];
 function read(file){const absolute=path.join(ROOT,file);if(!fs.realpathSync(absolute).startsWith(ROOT+path.sep)||fs.lstatSync(absolute).isSymbolicLink())throw Error('Symlink source forbidden');const bytes=fs.readFileSync(absolute);sources.push({path:file,sha256:hash(bytes)});return bytes;}
 const sourceHTML=read('index.html').toString(),config=read('js/config.js').toString();
 const release=config.match(/const RELEASE_VERSION = '([^']+)'/)?.[1];if(!/^\d+\.\d+\.\d+$/.test(release||''))throw Error('Invalid source release');
 const normalVersion=config.match(/const COURSE_VERSION = '([^']+)'/)?.[1],dailyVersion=config.match(/const DAILY_COURSE_VERSION = '([^']+)'/)?.[1];
 if(normalVersion!=='v4'||dailyVersion!=='v3')throw Error('Review formal course identity before packaging');
 const progression=read('js/course-progression-config.js').toString(),distribution=read('js/course-distribution-config.js').toString();
 if(!/version:\s*'5'/.test(progression)||!/normalSeedOffset:\s*10,/.test(progression)||!/version:\s*'7'/.test(distribution))throw Error('Review adopted course recipe before packaging');
 const scripts=[...sourceHTML.matchAll(/<script src="(js\/[^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
 const moduleTags=[...sourceHTML.matchAll(/<script type="module" src="([^"?]+)(?:\?[^"\s]*)?"><\/script>/g)];
 if(!scripts.length||scripts.some(file=>!/^js\/[a-z0-9-]+\.js$/.test(file)||/firebase|native/.test(file))||moduleTags.length!==1||moduleTags[0][1]!=='js/firebase-client.js'||(sourceHTML.match(/<script\b/g)||[]).length!==scripts.length+1)throw Error('Unreviewed source script allowlist');
 let html=sourceHTML.replace(/\s*<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/\s*<link\b[^>]*\brel=["'](?:preconnect|dns-prefetch)["'][^>]*>/g,'');
 if(/https?:\/\//.test(html))throw Error('Unreviewed external HTML resource');
 let assetText=html;
 for(const file of scripts){const source=read(file).toString();assetText+='\n'+source;files.set(file,Buffer.from(formalStorageSource(source,file)));}
 // Only the normal settings DEBUG utility is added to the original game.
 const debug=read('scripts/formal-debug-seed.js');files.set('js/formal-debug-seed.js',debug);assetText+='\n'+debug;
 const firebaseScript='js/firebase-client.js';files.set(firebaseScript,read(firebaseScript));
 files.set('styles.css',read('styles.css'));
 assetText+='\n'+files.get('styles.css');
 const assets=new Set([...assetText.matchAll(/assets\/[a-zA-Z0-9/_-]+\.(?:png|webp|svg|wav|mp3|jpg|jpeg|woff2?)/g)].map(m=>m[0]));
 for(const state of ['unplayed','active','cleared'])for(const size of ['100','125','150'])assets.add('assets/stage-icons/'+state+'-'+size+'.webp');
 for(const medal of ['gold','silver'])assets.add('assets/daily-medal-'+medal+'-v2.webp');
 for(const file of assets){if(file.split('/').includes('..'))throw Error('Invalid asset path');files.set(file,read(file));}
 const url=file=>file+'?v='+hash(files.get(file)).slice(0,12);
 const settings={release,commit,storagePrefix:'ascent.pages-trial.0.4.12.d6.'};
 files.set('js/pages-storage.js',Buffer.concat([Buffer.from("'use strict';\nglobalThis.ASCENT_FORMAL_PAGES=Object.freeze("+JSON.stringify(settings)+');\n'),read('scripts/pages-storage.js')]));
 const csp="default-src 'none'; script-src 'self' https://www.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com; object-src 'none'; frame-src https://bouldering-7482d.firebaseapp.com; form-action 'none'; base-uri 'none'";
 html=html.replace('<meta charset="utf-8">','<meta charset="utf-8">\n    <meta http-equiv="Content-Security-Policy" content="'+csp+'">');
 const tags=['    <script src="'+url('js/pages-storage.js')+'" defer></script>',
  ...scripts.map(file=>'    <script src="'+url(file)+'" defer></script>'),
  '    <script src="'+url('js/formal-debug-seed.js')+'" defer></script>',
  '    <script type="module" src="'+url(firebaseScript)+'"></script>'];
 html=html.replace('</head>',tags.join('\n')+'\n</head>');
 html=html.replace(/(src|href)="([^"?]+)(?:\?[^"\s]*)?"/g,(all,attribute,file)=>files.has(file)?attribute+'="'+url(file)+'"':all);
 files.set('index.html',Buffer.from(html));files.set('.nojekyll',Buffer.alloc(0));
 const manifest={release,commit,dirty,storagePrefix:settings.storagePrefix,normalVersion,dailyVersion,normalSeedOffset:10,distributionVersion:7,csp,sourceFiles:sources,scripts,files:[...files].map(([file,bytes])=>({path:file,bytes:bytes.length,sha256:hash(bytes)})),totalBytes:[...files.values()].reduce((sum,b)=>sum+b.length,0),omitted:['ios','docs','tests','Git history','unreferenced assets','trial bootstrap/banner','migration/chooser/policy entry']};
 fs.mkdirSync(out,{recursive:true});for(const [file,bytes] of files){fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});fs.writeFileSync(path.join(out,file),bytes);}
 fs.writeFileSync(path.join(out,'formal-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return {outputDir:out,manifest};
}
module.exports={buildPagesFormal,formalStorageSource};
if(require.main===module){const args=process.argv.slice(2),flags=new Set(args.filter(arg=>arg.startsWith('--'))),dirs=args.filter(arg=>!arg.startsWith('--'));
 if(dirs.length!==1||[...flags].some(flag=>flag!=='--allow-dirty'))throw Error('Usage: node scripts/build-pages-formal.cjs /absolute/new-output-dir [--allow-dirty]');
 const result=buildPagesFormal({outputDir:dirs[0],allowDirty:flags.has('--allow-dirty')});console.log(JSON.stringify({outputDir:result.outputDir,...result.manifest,files:result.manifest.files.length},null,2));}
