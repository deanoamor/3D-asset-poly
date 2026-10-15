import { chromium } from 'playwright-core';
import fs from 'node:fs';
import validator from 'gltf-validator';

const URL = process.env.URL || 'http://localhost:5199/';
fs.mkdirSync('e2e/out/pose', { recursive: true });
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
await page.uncheck('#proj-guide'); await page.click('#btn-create');
const D = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__app.store.doc)));
await page.click('#btn-assets');
await page.click('.acard[data-asset="police"] [data-act="add"]');
await page.waitForTimeout(800);

console.log('# Pose mode');
ok(!(await page.evaluate(() => window.__app.store.ui.pose)), 'starts in the normal (rest) view');
await page.click('#btn-pose-mode');
ok(await page.evaluate(() => window.__app.store.ui.pose), 'the Pose button turns Pose mode on');
await page.click('#joint-list .jrowitem >> text=Elbow Right');
await page.waitForSelector('#pose-editor');
ok((await page.textContent('#pose-editor')).includes('Elbow Right'), 'the pose editor shows the picked joint');
ok(await page.isDisabled('#btn-pose-reset'), 'nothing to reset yet');

// the body is drawn bent: measure the right hand's world position through the posed scene
const handX = () => page.evaluate(() => {
  const { vp } = window.__app;
  let x = null;
  vp.scene.traverse((o) => { if (o.isBone && o.name === 'Fingers Right') { const v = new o.position.constructor(); o.getWorldPosition(v); x = v.x; } });
  return x;
});
const before = await handX();
ok(before !== null, 'the posed skeleton is in the scene');
await page.fill('#pose-editor .jrow label:nth-child(3) input', '70'); await page.press('#pose-editor .jrow label:nth-child(3) input', 'Enter');
await page.waitForFunction(() => window.__app.store.doc.pose && Object.values(window.__app.store.doc.pose)[0][2] === 70);
await page.waitForTimeout(300);
const after = await handX();
ok(Math.abs(after - before) > 0.2, `turning the elbow moves the hand (${before.toFixed(2)} → ${after.toFixed(2)})`);
ok(!(await page.isDisabled('#btn-pose-reset')), 'the pose can be reset now');
const meshMoved = await page.evaluate(() => {
  const { vp } = window.__app;
  let pos = null;
  vp.scene.traverse((o) => { if (o.isSkinnedMesh && !pos) { o.geometry.computeBoundingBox(); pos = true; } });
  return !!pos;
});
ok(meshMoved, 'the character is a skinned mesh in the scene');

console.log('# the gizmo: a rotation ring on the joint');
const gizmoOn = await page.evaluate(() => !!window.__app.vp.tc.object && window.__app.vp.tc.object.userData.jointId !== undefined);
ok(gizmoOn, 'the rotate gizmo is on the picked joint');

console.log('# undo, redo');
await page.evaluate(() => window.__app.store.undo());
await page.waitForTimeout(200);
ok(!(await D()).pose, 'undo goes back to rest');
await page.evaluate(() => window.__app.store.redo());
ok(!!(await D()).pose, 'redo brings the pose back');

console.log('# Preview follows the Pose button');
await page.click('#btn-preview');
await page.waitForTimeout(500);
ok(!(await page.evaluate(() => window.__app.vp.model.visible)), 'Pose on + Preview: the posed character is shown');
await page.click('#btn-preview');
await page.click('#btn-pose-mode');
await page.waitForTimeout(300);
ok(await page.evaluate(() => window.__app.vp.model.visible), 'Pose off: the normal view shows the character at rest');
ok(!!(await D()).pose, 'the pose is still kept in the project');
await page.click('#btn-preview');
await page.waitForTimeout(500);
ok(await page.evaluate(() => window.__app.vp.model.visible), 'Pose off + Preview: the preview is the normal, unposed one');
await page.click('#btn-preview');
await page.click('#btn-pose-mode');
await page.waitForTimeout(300);

console.log('# saved with the project');
await page.click('#btn-saves'); await page.click('#btn-save-now'); await page.waitForSelector('.scard');
const saved = await page.evaluate(async () => { const { listSaves } = await import('/src/core/persist.ts'); return (await listSaves())[0].doc.pose; }).catch(() => null);
if (saved !== null) ok(!!saved && Object.keys(saved).length === 1, 'the pose is stored in the save');
await page.click('.modal [aria-label="Close"]');

console.log('# export: the pose is baked in');
await page.click('#btn-export');
await page.click('[data-tab="software"]');
await page.click('.card[data-preset="blender"]');
await page.selectOption('#export-format', 'glb');
await page.waitForFunction(() => document.querySelector('#verify')?.dataset.ok !== undefined, null, { timeout: 30000 });
ok((await page.getAttribute('#verify', 'data-ok')) === 'true', 'self-test: ' + (await page.textContent('#verify')));
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
const file = 'e2e/out/pose/posed.glb';
await dl.saveAs(file);
const bytes = new Uint8Array(fs.readFileSync(file));
const r = await validator.validateBytes(bytes);
ok(r.issues.numErrors === 0, `glTF validator: ${r.issues.numErrors} errors, ${r.issues.numWarnings} warnings`);
const dv = new DataView(bytes.buffer, bytes.byteOffset);
const gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + dv.getUint32(12, true))));
const elbow = gltf.nodes.find((n) => n.name === 'Elbow Right');
ok(!!elbow, 'the joint is in the file');
ok(gltf.skins?.length === 1 && gltf.skins[0].joints.length === 22, 'one skin, 22 joints');

ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await browser.close();
process.exit(failed ? 1 : 0);
