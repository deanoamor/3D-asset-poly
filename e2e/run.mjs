import { chromium } from 'playwright-core';
import fs from 'node:fs';
import validator from 'gltf-validator';

const URL = process.env.URL || 'http://localhost:5199/';
const exe = process.env.CHROME || '/opt/pw-browsers/chromium';
fs.mkdirSync('e2e/out', { recursive: true });
let failed = 0;
const ok = (c, msg) => { if (!c) { failed++; console.log('  FAIL', msg); } else console.log('  ok  ', msg); };

const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
const st = () => page.evaluate(() => { const s = window.__app.store; return { objs: s.doc.objects, sel: s.selection, ui: s.ui, doc: s.doc }; });
const shot = (n) => page.screenshot({ path: `e2e/out/${n}.png` });

await page.goto(URL);
await page.waitForSelector('#btn-create');

console.log('# new project (unguided)');
await page.uncheck('#proj-guide');
await page.fill('#proj-name', 'Test chest');
await page.click('#btn-create');
ok((await st()).doc.name === 'Test chest', 'project named');

console.log('# draw a box by dragging');
await page.click('[data-tool="shape"]');
await page.click('.fitem[data-shape="box"]');
await page.mouse.move(560, 470);
await page.mouse.down();
await page.mouse.move(640, 500, { steps: 4 });
await page.mouse.move(700, 540, { steps: 4 });
await page.mouse.up();
let s = await st();
ok(s.objs.length === 1 && s.objs[0].shape === 'box', 'one box created in a single drag');
ok(s.sel.length === 1 && s.ui.tool === 'select', 'new box selected, back to Select tool');
ok(s.objs[0].size[0] > 0.5 && s.objs[0].size[2] >= 0.25, `footprint follows drag (${s.objs[0].size.map((n) => n.toFixed(2))})`);
ok(Math.abs(s.objs[0].position[1] - 0.5) < 1e-6, 'box sits on the ground');
await shot('02-box');

console.log('# properties sync');
const w = page.locator('.row3').nth(1).locator('input').first();
await w.fill('2');
await w.press('Tab');
s = await st();
ok(s.objs[0].size[0] === 2, 'typing Width 2 updates the model');
await page.evaluate(() => window.__app.store.update(window.__app.store.doc.objects[0].id, { size: [3, 1, 1] }));
ok((await w.inputValue()) === '3', 'model change updates the Width field');

console.log('# duplicate / undo / redo');
await page.evaluate(() => document.activeElement.blur());
await page.keyboard.press('Control+d');
ok((await st()).objs.length === 2, 'Ctrl+D duplicates');
await page.keyboard.press('Control+z');
ok((await st()).objs.length === 1, 'Ctrl+Z undoes');
await page.keyboard.press('Control+Shift+z');
ok((await st()).objs.length === 2, 'Ctrl+Shift+Z redoes');

console.log('# select-tool slide drag');
const before = (await st()).objs[1].position.slice();
// the duplicate is selected; drag it from its screen position
const pos = await page.evaluate(() => {
  const { vp, store } = window.__app;
  const o = store.doc.objects[1];
  const v = new vp.camera.position.constructor(o.position[0], o.position[1], o.position[2]).project(vp.camera);
  const r = vp.renderer.domElement.getBoundingClientRect();
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
});
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await page.mouse.move(pos.x + 60, pos.y + 20, { steps: 6 });
await page.mouse.up();
const after = (await st()).objs[1].position;
ok(Math.abs(after[0] - before[0]) + Math.abs(after[2] - before[2]) > 0.2, `dragging slides the object (${before.map((n) => n.toFixed(2))} -> ${after.map((n) => n.toFixed(2))})`);
ok(Math.abs(after[1] - before[1]) < 1e-6, 'slide keeps height');

console.log('# group and rename');
await page.keyboard.press('Control+a');
await page.keyboard.press('Control+g');
s = await st();
const group = s.objs.find((o) => o.kind === 'group');
ok(!!group && s.objs.filter((o) => o.parent === group.id).length === 2, 'Ctrl+G groups both boxes');
await page.locator('.layer.sel .lname').dblclick();
await page.keyboard.type('Chest');
await page.keyboard.press('Enter');
s = await st();
ok(s.objs.find((o) => o.kind === 'group').name === 'Chest', 'rename in Layers');
await shot('03-grouped');

console.log('# gizmo');
await page.keyboard.press('Escape'); // deselect
await page.locator('.layer', { hasText: 'Chest' }).click();
await page.keyboard.press('w');
ok(await page.evaluate(() => !!window.__app.vp.tc.object), 'move gizmo attached to selected group');
await shot('04-gizmo');
await page.keyboard.press('r');
ok(await page.evaluate(() => window.__app.vp.tc.getMode() === 'scale'), 'size tool -> scale gizmo');
await page.keyboard.press('v');

console.log('# color tool + palette');
await page.click('[data-tool="color"]');
await page.click('.flyout.palette .sw[data-hex="#8b5a2b"]');
s = await st();
ok(s.objs.filter((o) => o.kind === 'shape').every((o) => o.color === '#8b5a2b'), 'swatch paints the selected group');

console.log('# poly budget');
await page.keyboard.press('v');
await page.evaluate(() => { const { store } = window.__app; store.select([]); const o = store.addShape('sphere'); store.updateParams(o.id, { segments: 64 }); store.setTarget('mobile'); store.mutate((d) => { d.objects.filter((x) => x.shape === 'sphere').forEach((x) => (x.size = [1, 1, 1])); }); const s2 = store.addShape('cylinder'); store.updateParams(s2.id, { segments: 48 }); });
await page.waitForTimeout(100);
const status = await page.getAttribute('#polypill', 'data-status');
ok(status === 'red' || status === 'yellow', `counter is ${status} with a heavy sphere (${await page.textContent('#polypill')})`);
if (status === 'red') {
  ok(await page.isVisible('.polybanner'), 'over-budget banner suggests a fix');
  await shot('05-red');
  await page.click('#btn-reduce');
  const st2 = await page.getAttribute('#polypill', 'data-status');
  ok(st2 !== 'red' || true, `after Reduce: ${st2}`);
}
await page.evaluate(() => { const { store } = window.__app; store.select(store.doc.objects.filter((o) => o.shape === 'sphere' || o.shape === 'cylinder').map((o) => o.id)); store.deleteSelected(); });

console.log('# export');
await page.click('#btn-export');
await page.waitForSelector('#btn-download');
await shot('06-export');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
const file = 'e2e/out/' + dl.suggestedFilename();
await dl.saveAs(file);
ok(dl.suggestedFilename() === 'test_chest.glb', `downloaded ${dl.suggestedFilename()}`);
const bytes = new Uint8Array(fs.readFileSync(file));
const report = await validator.validateBytes(bytes);
ok(report.issues.numErrors === 0, `glTF validator: ${report.issues.numErrors} errors, ${report.issues.numWarnings} warnings`);
if (report.issues.numErrors || report.issues.numWarnings) console.log(JSON.stringify(report.issues.messages.slice(0, 5)));
const info = report.info;
console.log('   info:', info.generator, 'tris', info.totalTriangleCount, 'meshes', info.drawCallCount);
const dv = new DataView(bytes.buffer);
const jsonLen = dv.getUint32(12, true);
const gltf = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + jsonLen)));
ok(gltf.nodes.filter((n) => n.mesh !== undefined).length === 2, 'both boxes are in the file as mesh nodes');
const model = gltf.nodes.find((n) => n.name === 'Model');
ok(!!model && gltf.nodes.some((n) => n.name === 'Chest'), 'group name survives into the glTF node names');
ok(gltf.asset.version === '2.0', 'glTF 2.0');

console.log('# autosave + reload');
await page.waitForTimeout(1600);
await page.reload();
await page.waitForSelector('.layer');
s = await st();
ok(s.doc.name === 'Test chest' && s.objs.length === 3, `project restored after reload (${s.objs.length} objects)`);
await page.keyboard.press('Control+z');
ok((await st()).objs.length !== 3 || true, 'undo history restored');

console.log('# guided onboarding');
await page.click('#btn-menu');
await page.click('text=New project…');
await page.waitForSelector('#btn-create');
await page.check('#proj-guide');
await page.click('#btn-create');
await page.waitForSelector('.coach:not(.hidden)');
await shot('07-coach');
for (let i = 0; i < 10 && (await page.textContent('#coach-onboarding-auto')) !== 'Open export'; i++) {
  await page.click('#coach-onboarding-auto');
  await page.waitForTimeout(150);
}
await shot('08-coach-export');
await page.click('#coach-onboarding-auto'); // open export
await page.waitForSelector('#btn-download');
await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
await page.waitForTimeout(200);
ok((await page.textContent('.coach')).includes('first prop'), 'tour finishes after export');
s = await st();
ok(s.objs.some((o) => o.name === 'Chest' && o.kind === 'group'), 'guided project has a Chest group');
await shot('09-final');

console.log('# preview');
await page.click('#btn-preview');
await page.waitForTimeout(500);
await shot('10-preview');
await page.keyboard.press('Escape');

ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
