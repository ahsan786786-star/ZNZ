'use strict';
/**
 * Build step: makes the compressed copies the server prefers.
 *   node tools-minify.js
 * Every file is written to the same name with `.min` before the extension
 * (assets/js/app.js -> assets/js/app.min.js). If a compressor is not available
 * the plain file is copied — the site keeps working either way.
 *
 * The script is also imported at boot, where it re-optimises anything whose
 * source changed (so an update never ships un-minified files).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, 'public', 'assets');
const TARGETS = [
  ['js', ['app.js', 'welcome.js', 'tryon.js', 'admin.js', 'owner.js']],
  ['css', ['app.css', 'admin.css']]
];

/** a dependency-free CSS minifier (safe: only removes comments + needless whitespace) */
function miniCss(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s+/g, ' ')
    .replace(/@media\s*/g, '@media ')
    .trim();
}

async function miniJs(src, out) {
  /* prefer esbuild when it happens to be installed (dev machines) */
  try {
    const esbuild = require('esbuild');
    await esbuild.build({ entryPoints: [src], outfile: out, minify: true, target: 'es2019', legalComments: 'none', logLevel: 'silent' });
    return true;
  } catch (e) { /* fall through */ }
  return false;
}

async function run(log) {
  const made = [];
  for (const [kind, files] of TARGETS) {
    for (const rel of files) {
      const src = path.join(ROOT, kind, rel);
      if (!fs.existsSync(src)) continue;
      const out = src.replace(/\.(js|css)$/i, '.min.$1');
      const srcSt = fs.statSync(src);
      let fresh = false;
      try { fresh = fs.statSync(out).mtimeMs >= srcSt.mtimeMs; } catch (e) { fresh = false; }
      if (fresh) continue;
      let ok = false;
      if (kind === 'js') ok = await miniJs(src, out);
      if (!ok) {
        const code = fs.readFileSync(src, 'utf8');
        fs.writeFileSync(out, kind === 'css' ? miniCss(code) : code);
      }
      try { fs.writeFileSync(out + '.gz', zlib.gzipSync(fs.readFileSync(out), { level: 9 })); } catch (e) {}
      made.push(path.basename(out) + ' · ' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
    }
  }
  if (log && made.length) console.log('[minify]', made.join(' · '));
  return made;
}

module.exports = { run };

if (require.main === module) {
  run(true).then(() => process.exit(0));
}
