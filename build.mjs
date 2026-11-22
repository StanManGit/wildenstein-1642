import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
mkdirSync('dist', { recursive: true });
cpSync('public', 'dist', { recursive: true });
await build({ entryPoints: ['src/main.ts'], bundle: true, minify: true, sourcemap: false, target: 'es2020', outfile: 'dist/app.js' });
// Einzeldatei-Version (alles eingebettet), z. B. zum Weitergeben per Datei
const html = readFileSync('dist/index.html', 'utf8')
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>${readFileSync('dist/style.css', 'utf8')}</style>`)
  .replace('<script src="app.js"></script>', () => `<script>${readFileSync('dist/app.js', 'utf8').replace(/<\/script/g, '<\\/script')}</script>`);
writeFileSync('dist/wildenstein-1642-einzeldatei.html', html);
console.log('ok');
