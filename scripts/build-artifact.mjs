// Builds the app, then folds it into one self-contained HTML file for publishing as a claude.ai artifact.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';

execSync('npx vite build', { stdio: 'inherit' });
const dir = 'dist/assets';
const files = readdirSync(dir);
const js = readFileSync(`${dir}/${files.find((f) => f.endsWith('.js'))}`, 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(`${dir}/${files.find((f) => f.endsWith('.css'))}`, 'utf8');
const html = `<title>Poly Studio</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
<style>
html, body { margin: 0; height: 100%; }
body { background: #f5f5f4; color: #1c1c1a; color-scheme: light; }
${css}
</style>
<div id="app" class="app"></div>
<script type="module">
${js}
</script>
`;
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/index.html', html);
console.log('artifact/index.html', (html.length / 1024).toFixed(0) + ' KB');
