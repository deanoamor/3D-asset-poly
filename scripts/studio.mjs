#!/usr/bin/env node
// Poly Studio from the command line: build a character from a JSON spec, check it, look at it from several angles,
// and export it, the same way a person would in the editor. See docs/CHARACTER_GUIDE.md.
//
//   node scripts/studio.mjs make   spec.json [--out dir]          build + check + render + export (start here)
//   node scripts/studio.mjs check  spec.json [--height 1.8] [--max-tris 3000] [--separate REGEX]
//   node scripts/studio.mjs render spec.json [--views front,3q,side,back,face,top] [--size 520]
//                                            [--ref reference.png] [--anim Walk@0.25] [--expr Smile=1,Blink=0.5] [--out dir]
//   node scripts/studio.mjs export spec.json [--format glb|gltf] [--atlas] [--compress] [--out file.glb]
//   node scripts/studio.mjs info   spec.json                       joints and part positions, to place gear on the body
//   node scripts/studio.mjs build  spec.json [--out project.json]  write the project (can be opened in the editor)
//
// spec.json is a character spec (see src/core/charspec.ts) or a saved project (has "objects").
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const cmd = argv[0];
const file = argv[1];
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
if (!cmd || !file) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 15).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(cmd ? 1 : 0);
}
const URL_ = process.env.URL || 'http://localhost:5199/';
const outDir = (d) => { const o = flag('out', d); fs.mkdirSync(o, { recursive: true }); return o; };
const stem = path.basename(file).replace(/\.json$/i, '');

async function up(url) { try { return (await fetch(url)).ok; } catch { return false; } }
let server = null;
if (!(await up(URL_))) {
  server = spawn('npx', ['vite', '--port', new URL(URL_).port || '5199', '--strictPort'], { stdio: 'ignore', detached: false });
  for (let i = 0; i < 60 && !(await up(URL_)); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await up(URL_))) { console.error('Could not start the dev server.'); process.exit(2); }
}
const done = (code) => { server?.kill(); process.exit(code); };

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL_);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#btn-create');
await page.uncheck('#proj-guide').catch(() => {});
await page.click('#btn-create');
await page.waitForFunction(() => !!window.__studio);

const input = JSON.parse(fs.readFileSync(file, 'utf8'));
let report;
if (input.objects) { await page.evaluate((d) => window.__studio.load(d), input); report = await page.evaluate(() => window.__studio.check({})); }
else {
  const r = await page.evaluate((s) => window.__studio.build(s), input);
  r.warnings.forEach((w) => console.log('  spec warning:', w));
  report = r.report;
}

const checkOpts = () => ({ ...(flag('height') ? { height: +flag('height') } : input.height ? { height: input.height } : input.template?.height ? { height: input.template.height } : {}), ...(flag('max-tris') ? { maxTris: +flag('max-tris') } : {}), ...(flag('separate') ? { separate: flag('separate') } : {}) });
const doCheck = async () => {
  report = await page.evaluate((o) => window.__studio.check(o), checkOpts());
  const s = report.stats;
  console.log(`# check: ${s.triangles} triangles, ${s.parts} parts, ${s.joints} joints, ${s.colors} colours, ${s.size.join(' x ')} m, ${s.morphs} expressions`);
  for (const i of report.issues) console.log(`  ${i.level.toUpperCase().padEnd(5)} ${i.code}: ${i.msg}`);
  if (!report.issues.length) console.log('  no issues');
  return report.ok;
};
const b64 = (u) => Buffer.from(u.split(',')[1], 'base64');
const doRender = async (dir) => {
  const [name, t] = String(flag('anim', '')).split('@');
  const expr = Object.fromEntries(String(flag('expr', '')).split(',').filter(Boolean).map((p) => { const [k, v] = p.split('='); return [k, v === undefined ? 1 : +v]; }));
  const ref = flag('ref') ? `data:image/png;base64,${fs.readFileSync(String(flag('ref'))).toString('base64')}` : undefined;
  const res = await page.evaluate((o) => window.__studio.render(o), { ...(ref ? { ref } : {}), views: String(flag('views', 'front,3q,side,back')).split(','), size: +flag('size', 520), ...(name ? { anim: { name, t: +(t ?? 0) } } : {}), expr });
  for (const im of res.images) fs.writeFileSync(path.join(dir, `${stem}.${im.view}.png`), b64(im.png));
  fs.writeFileSync(path.join(dir, `${stem}.sheet.png`), b64(res.sheet));
  console.log(`# render: ${path.join(dir, `${stem}.sheet.png`)} (${res.images.map((i) => i.view).join(', ')})`);
};
const doExport = async (target) => {
  const res = await page.evaluate((o) => window.__studio.export(o), { format: flag('format', 'glb'), atlas: !!flag('atlas'), compress: !!flag('compress') });
  const buf = Buffer.from(res.base64, 'base64');
  fs.writeFileSync(target, buf);
  let verdict = '';
  if (target.endsWith('.glb')) {
    const { default: validator } = await import('gltf-validator');
    const rep = await validator.validateBytes(new Uint8Array(buf));
    verdict = `, glTF validator: ${rep.issues.numErrors} errors ${rep.issues.numWarnings} warnings`;
  }
  console.log(`# export: ${target} ${(buf.length / 1024).toFixed(0)} KB, ${res.triangles} triangles, ${res.drawCalls} draw calls, ${res.materials} materials${res.morphs.length ? `, expressions: ${res.morphs.join(', ')}` : ''}${verdict}`);
};

let ok = true;
if (cmd === 'check') ok = await doCheck();
else if (cmd === 'info') {
  const a = await page.evaluate(() => window.__studio.anchors());
  if (flag('json')) { console.log(JSON.stringify(a)); await browser.close(); done(0); }
  console.log(`# height ${a.height} m\n# joints (x,y,z)`);
  for (const [k, v] of Object.entries(a.joints)) console.log(`  ${k.padEnd(14)} ${v.join(', ')}`);
  console.log('# parts (center | size)');
  for (const [k, v] of Object.entries(a.parts)) console.log(`  ${k.padEnd(18)} ${v.center.join(', ')} | ${v.size.join(', ')}`);
} else if (cmd === 'render') await doRender(outDir('studio-out'));
else if (cmd === 'export') await doExport(String(flag('out', `${stem}.${flag('format', 'glb')}`)));
else if (cmd === 'build') {
  const doc = await page.evaluate(() => window.__studio.doc());
  const target = String(flag('out', `${stem}.project.json`));
  fs.writeFileSync(target, JSON.stringify(doc));
  console.log(`# project written: ${target}`);
  ok = await doCheck();
} else if (cmd === 'make') {
  const dir = outDir('studio-out');
  ok = await doCheck();
  argv.push('--views', String(flag('views', 'front,3q,side,back,face')));
  await doRender(dir);
  await doExport(path.join(dir, `${stem}.glb`));
  fs.writeFileSync(path.join(dir, `${stem}.project.json`), JSON.stringify(await page.evaluate(() => window.__studio.doc())));
} else { console.error(`Unknown command: ${cmd}`); ok = false; }
if (errs.length) console.log('  page errors:', errs.slice(0, 3));
await browser.close();
done(ok ? 0 : 1);
