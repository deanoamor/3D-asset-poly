import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import validator from 'gltf-validator';

const URL = process.env.URL || 'http://localhost:5199/';
fs.mkdirSync('e2e/out/export', { recursive: true });
let failed = 0;
const ok = (c, m) => { if (!c) failed++; console.log(c ? '  ok  ' : '  FAIL', m); };

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#btn-create');
await page.uncheck('#proj-guide'); await page.fill('#proj-name', 'Test Chest'); await page.click('#btn-create');
await page.evaluate(() => {
  const s = window.__app.store;
  s.addShape('box', { name: 'Body', position: [3, 0.5, 2], size: [2, 1, 1.2], color: '#8b5a2b' });
  s.addShape('cylinder', { name: 'Barrel', position: [5, 1.5, 2], size: [1, 1, 1], color: '#e6b422' });
  s.addShape('sphere', { name: 'Ball', position: [3, 2.2, 2], size: [0.8, 0.8, 0.8], color: '#6ec1e4' });
});

const py = (code, ...args) => execFileSync('python3', ['-I', '-c', code, ...args]).toString();
const matrix = [['unity', 'glb'], ['unity', 'obj'], ['unity', 'package'], ['godot', 'glb'], ['godot', 'package'], ['unreal', 'glb'], ['unreal', 'package'], ['web', 'glb'], ['web', 'gltf'], ['web', 'package'], ['blender', 'glb'], ['blender', 'package'], ['c4d', 'obj'], ['c4d', 'package'], ['maya', 'obj']];

for (const [engine, format] of matrix) {
  console.log(`# ${engine} / ${format}`);
  await page.click('#btn-export');
  await page.waitForSelector('#btn-download');
  await page.click(`.card[data-preset="${engine}"]`);
  await page.selectOption('#export-format', format);
  await page.waitForFunction(() => document.querySelector('#verify')?.dataset.ok !== undefined, null, { timeout: 8000 });
  const verifyOk = await page.getAttribute('#verify', 'data-ok');
  ok(verifyOk === 'true', 'self-test re-opened the file: ' + (await page.textContent('#verify')));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
  const file = `e2e/out/export/${engine}_${format}_${dl.suggestedFilename()}`;
  await dl.saveAs(file);
  const name = dl.suggestedFilename();
  const bytes = new Uint8Array(fs.readFileSync(file));

  const checkGlb = async (b, label) => {
    const r = await validator.validateBytes(b);
    ok(r.issues.numErrors === 0, `${label}: glTF validator ${r.issues.numErrors} errors, ${r.issues.numWarnings} warnings`);
    const dv = new DataView(b.buffer, b.byteOffset);
    const j = JSON.parse(new TextDecoder().decode(b.slice(20, 20 + dv.getUint32(12, true))));
    return j;
  };

  if (format === 'glb') {
    ok(name === 'test_chest.glb', `file name ${name}`);
    const j = await checkGlb(bytes, name);
    ok(j.asset.version === '2.0', 'glTF 2.0');
    ok(!j.nodes.some((n) => n.name.endsWith('-convcolonly')), 'no collision node unless requested');
  } else if (format === 'gltf') {
    const j = JSON.parse(new TextDecoder().decode(bytes));
    const r = await validator.validateString(JSON.stringify(j));
    ok(r.issues.numErrors === 0 && j.asset.version === '2.0', `${name}: valid glTF JSON (${r.issues.numErrors} errors)`);
  } else {
    const listing = py("import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip());print('\\n'.join(z.namelist()))", file);
    ok(listing.startsWith('None'), `${name}: zip integrity`);
    console.log('   contents:', listing.split('\n').slice(1).filter(Boolean).join(', '));
    if (format === 'obj') {
      ok(listing.includes('test_chest.obj') && listing.includes('test_chest.mtl'), 'contains .obj and .mtl');
      const stats = py("import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);o=z.read('test_chest.obj').decode().split('\\n');v=[l for l in o if l.startswith('v ')];f=[l for l in o if l.startswith('f ')];ys=[float(l.split()[2]) for l in v];print(len(v),len(f),min(ys));m=z.read('test_chest.mtl').decode();print(m.count('newmtl'))", file).trim().split('\n');
      const [nv, nf, miny] = stats[0].split(' ');
      ok(+nf === +nv / 3 && Math.abs(+miny) < 1e-6, `OBJ: ${nv} vertices, ${nf} faces, lowest y ${miny}`);
      ok(+stats[1] === 3, 'MTL has one material per color');
    } else {
      ok(listing.includes(`IMPORT_${({ c4d: 'CINEMA_4D', maya: 'MAYA_3DS_MAX' })[engine] ?? engine.toUpperCase()}.txt`), 'contains the import guide');
      ok(listing.includes('test_chest.glb'), 'contains the .glb');
      if (['unity', 'blender', 'c4d', 'maya'].includes(engine)) ok(listing.includes('obj/test_chest.obj'), 'package also has OBJ');
      const glbBytes = Uint8Array.from(Buffer.from(py("import zipfile,sys,base64;z=zipfile.ZipFile(sys.argv[1]);print(base64.b64encode(z.read('test_chest.glb')).decode())", file).trim(), 'base64'));
      await checkGlb(glbBytes, 'packaged glb');
      const guide = py("import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print([z.read(n).decode() for n in z.namelist() if n.endswith('.txt')][0])", file);
      ok(guide.includes('Pivot: bottom center') && guide.toLowerCase().includes(({ c4d: 'cinema 4d', maya: 'maya' })[engine] ?? engine), 'guide mentions the engine and pivot');
    }
  }
  if (!(await page.$('#btn-download'))) { /* dialog closed after download */ }
}

console.log('# Godot collision box');
await page.click('#btn-export');
await page.click('.card[data-preset="godot"]');
ok(await page.isVisible('#export-collision'), 'collision option appears for Godot');
await page.selectOption('#export-format', 'glb');
await page.click('#export-collision');
await page.waitForFunction(() => document.querySelector('#verify')?.dataset.ok !== undefined);
ok((await page.getAttribute('#verify', 'data-ok')) === 'true', 'self-test passes with the collision box: ' + (await page.textContent('#verify')));
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
await dl.saveAs('e2e/out/export/godot_collision.glb');
const b = new Uint8Array(fs.readFileSync('e2e/out/export/godot_collision.glb'));
const dv = new DataView(b.buffer);
const j = JSON.parse(new TextDecoder().decode(b.slice(20, 20 + dv.getUint32(12, true))));
const col = j.nodes.find((n) => n.name === 'test_chest-convcolonly');
ok(!!col && col.mesh !== undefined, 'glb contains the "-convcolonly" mesh node');
const acc = j.accessors[j.meshes[col.mesh].primitives[0].attributes.POSITION];
const ext = acc.max.map((m, i) => m - acc.min[i]);
ok(Math.abs(ext[0] - 3.5) < 0.01 && Math.abs(ext[1] - 2.6) < 0.01 && Math.abs(ext[2] - 1.2) < 0.01, `collision box wraps the whole model (${ext.map((n) => n.toFixed(2)).join(' x ')} m)`);
await page.click('#btn-export');
await page.click('.card[data-preset="unity"]');
ok(!(await page.isVisible('#export-collision')), 'collision option is hidden for Unity');
await page.screenshot({ path: 'e2e/out/export/dialog.png' });
await page.keyboard.press('Escape');

console.log('# blocked when empty');
await page.evaluate(() => { const s = window.__app.store; s.select(s.doc.objects.map((o) => o.id)); s.deleteSelected(); });
await page.click('#btn-export');
ok(await page.isDisabled('#btn-download'), 'Download disabled with nothing to export');
ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
process.exit(failed ? 1 : 0);
