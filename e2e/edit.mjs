import { chromium } from 'playwright-core';
import fs from 'node:fs';
import validator from 'gltf-validator';

const URL = process.env.URL || 'http://localhost:5199/';
fs.mkdirSync('e2e/out/edit', { recursive: true });
let failed = 0;
const ok = (c, m) => { if (!c) failed++; console.log(c ? '  ok  ' : '  FAIL', m); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#btn-create');
await page.uncheck('#proj-guide'); await page.fill('#proj-name', 'Head test'); await page.click('#btn-create');
const shot = (n) => page.screenshot({ path: `e2e/out/edit/${n}.png` });
const S = () => page.evaluate(() => { const s = window.__app.store; const o = s.edit ? s.get(s.edit.id) : s.doc.objects[0]; return { edit: s.edit && { mode: s.edit.mode, sel: s.edit.sel, sym: s.edit.symmetry, xray: s.edit.xray }, mesh: o?.mesh && { v: o.mesh.v.length / 3, f: o.mesh.f.length, ys: Math.max(...o.mesh.v.filter((_, i) => i % 3 === 1)) - Math.min(...o.mesh.v.filter((_, i) => i % 3 === 1)) }, size: o?.size, tool: s.ui.tool, n: s.doc.objects.length }; });
const scr = (p, local = false) => page.evaluate(([p, local]) => {
  const { vp, store } = window.__app;
  const v = new vp.camera.position.constructor(...p);
  if (local) v.applyMatrix4(vp.nodes.get(store.edit.id).matrixWorld);
  v.project(vp.camera);
  const r = vp.renderer.domElement.getBoundingClientRect();
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
}, [p, local]);

console.log('# enter edit mode');
await page.evaluate(() => { const s = window.__app.store; const o = s.addShape('box', { position: [0, 0.5, 0], size: [1.2, 1, 1] }); s.select([o.id]); });
await page.click('[data-tool="edit"]');
let s = await S();
ok(s.edit && s.mesh.v === 8 && s.mesh.f === 6, `Edit shape turned the box into 8 points / 6 faces`);
ok(await page.isVisible('#edit-done') && await page.isVisible('#edit-pullout'), 'edit bar and Done button are visible');
ok(!(await page.isVisible('[data-tool="shape"]')), 'normal toolbar is hidden while editing');
ok((await page.textContent('#edit-hint')).includes('Click a face'), 'hint tells a beginner what to do first');
await shot('01-enter');

console.log('# select the top face by clicking');
await page.keyboard.press('1'); await page.waitForTimeout(400);   // front view
const topC = await scr([0, 0.5, 0], true);
await page.mouse.click(topC.x, topC.y - 0.0);                    // front view: click the visible front face first
s = await S();
ok(s.edit.sel.length === 1, `clicking selects one face (${JSON.stringify(s.edit.sel)})`);
await page.keyboard.press('4'); await page.waitForTimeout(400);  // 3D view again
await page.evaluate(() => { const { store } = window.__app; const m = store.get(store.edit.id).mesh; const top = m.f.findIndex((f) => f.every((i) => m.v[i * 3 + 1] > 0.4)); store.editSelect([top]); });
await page.waitForTimeout(100);
await shot('02-face-selected');
ok(await page.evaluate(() => window.__app.vp.tc.object === window.__app.vp.edit.proxy), 'move handle sits on the selection');

console.log('# pull out + drag the arrow');
await page.click('#edit-pullout');
s = await S();
ok(s.mesh.f === 10 && s.mesh.v === 12, `Pull out adds 4 walls (${s.mesh.f} faces)`);
await page.keyboard.press('1'); await page.waitForTimeout(500);
const proxy = await page.evaluate(() => { const { vp } = window.__app; const p = vp.edit.proxy.position.clone().project(vp.camera); const r = vp.renderer.domElement.getBoundingClientRect(); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; });
await page.mouse.move(proxy.x, proxy.y - 55); await page.mouse.down();
await page.mouse.move(proxy.x, proxy.y - 100, { steps: 6 }); await page.mouse.up();
const before = s.mesh.ys;
s = await S();
ok(s.mesh.ys > before + 0.15, `dragging the arrow lifted the top (height ${before.toFixed(2)} -> ${s.mesh.ys.toFixed(2)})`);
await page.keyboard.press('Control+z');
s = await S();
ok(Math.abs(s.mesh.ys - before) < 1e-6 && s.mesh.f === 10, 'one undo reverts the whole drag');
await page.keyboard.press('Control+Shift+z');
await page.keyboard.press('4'); await page.waitForTimeout(400);
await shot('03-pulled');

console.log('# points, edges, box select');
await page.click('[data-mode="vertex"]');
ok((await S()).edit.mode === 'vertex', 'switched to Points');
await page.keyboard.press('a');
ok((await S()).edit.sel.length === 12, 'A selects every point');
await page.keyboard.press('Escape');
ok((await S()).edit.sel.length === 0, 'Esc clears the selection first');
await page.click('#edit-xray');
ok((await S()).edit.xray, 'See-through toggled');
await page.keyboard.down('Shift');
const a = await scr([-2, -1, 0]), b = await scr([2, 3, 0]);
await page.mouse.move(Math.min(a.x, b.x) - 150, 120); await page.mouse.down();
await page.mouse.move(Math.max(a.x, b.x) + 150, 800, { steps: 6 }); await page.mouse.up();
await page.keyboard.up('Shift');
s = await S();
ok(s.edit.sel.length >= 8, `Shift-drag box selects points (${s.edit.sel.length})`);
await shot('04-box-select');
await page.click('#edit-xray');
await page.click('[data-mode="edge"]');
await page.keyboard.press('Escape');
// click a vertical edge on the lower box
const edge = await page.evaluate(() => { const { store } = window.__app; const m = store.get(store.edit.id).mesh; const seen = new Set(); for (const f of m.f) for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length]; const k = a < b ? `${a}_${b}` : `${b}_${a}`; if (seen.has(k)) continue; seen.add(k); const ya = m.v[a * 3 + 1], yb = m.v[b * 3 + 1]; if (Math.abs(ya - yb) > 0.4 && Math.abs(ya) < 0.6 && Math.abs(yb) < 0.6 && m.v[a * 3 + 2] > 0.3 && m.v[a * 3] > 0.3) return { key: k, mid: [(m.v[a * 3] + m.v[b * 3]) / 2, (m.v[a * 3 + 1] + m.v[b * 3 + 1]) / 2, (m.v[a * 3 + 2] + m.v[b * 3 + 2]) / 2] }; } return null; });
const em = await scr(edge.mid, true);
await page.mouse.click(em.x, em.y);
s = await S();
ok(s.edit.sel.length === 1 && s.edit.sel[0] === edge.key, `clicking an edge selects it (${s.edit.sel})`);
const f0 = s.mesh.f;
await page.click('#edit-cut');
s = await S();
ok(s.mesh.f > f0 && s.edit.sel.length >= 4, `Add cut splits a ring (${f0} -> ${s.mesh.f} faces) and selects the new loop (${s.edit.sel.length} edges)`);
await shot('05-cut');

console.log('# mirror editing');
await page.click('[data-mode="vertex"]');
await page.click('#edit-mirror');
ok((await S()).edit.sym, 'Mirror on');
await page.evaluate(() => { const { store } = window.__app; const m = store.get(store.edit.id).mesh; let best = -1; for (let i = 0; i < m.v.length / 3; i++) if (m.v[i * 3] > 0.3 && m.v[i * 3 + 1] < -0.4 && m.v[i * 3 + 2] > 0.3) best = i; store.editSelect([best]); window.__pickedVertex = best; });
await page.click('[data-etool="move"]');
await page.waitForTimeout(100);
const before2 = await page.evaluate(() => { const { store } = window.__app; const m = store.get(store.edit.id).mesh; const i = window.__pickedVertex; return { v: m.v.slice(i * 3, i * 3 + 3), mir: (() => { for (let j = 0; j < m.v.length / 3; j++) if (Math.abs(m.v[j * 3] + m.v[i * 3]) < 1e-4 && Math.abs(m.v[j * 3 + 1] - m.v[i * 3 + 1]) < 1e-4 && Math.abs(m.v[j * 3 + 2] - m.v[i * 3 + 2]) < 1e-4) return j; return -1; })() }; });
await page.keyboard.press('1'); await page.waitForTimeout(500);
const pr = await page.evaluate(() => { const { vp } = window.__app; const p = vp.edit.proxy.position.clone().project(vp.camera); const r = vp.renderer.domElement.getBoundingClientRect(); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; });
await page.mouse.move(pr.x + 55, pr.y); await page.mouse.down();
await page.mouse.move(pr.x + 100, pr.y, { steps: 6 }); await page.mouse.up();
const after2 = await page.evaluate(() => { const { store } = window.__app; const m = store.get(store.edit.id).mesh; const i = window.__pickedVertex; return { v: m.v.slice(i * 3, i * 3 + 3) }; });
const mirrored = await page.evaluate((j) => { const { store } = window.__app; const m = store.get(store.edit.id).mesh; return m.v.slice(j * 3, j * 3 + 3); }, before2.mir);
ok(Math.abs(after2.v[0] - before2.v[0]) > 0.05, `the selected point moved (x ${before2.v[0].toFixed(2)} -> ${after2.v[0].toFixed(2)})`);
ok(before2.mir >= 0 && Math.abs(mirrored[0] + after2.v[0]) < 1e-3 && Math.abs(mirrored[1] - after2.v[1]) < 1e-3, `its mirror partner followed (${mirrored[0].toFixed(3)} vs ${(-after2.v[0]).toFixed(3)})`);
await page.click('#edit-mirror');

console.log('# merge, delete messages, round off');
await page.evaluate(() => { const { store } = window.__app; store.editSelect([]); });
await page.click('#edit-merge', { force: true });
ok((await page.textContent('.toast')).length > 0, 'Merge with nothing selected explains why (toast)');
const f1 = (await S()).mesh.f;
await page.click('#edit-roundoff');
s = await S();
ok(s.mesh.f > f1 * 2, `Round off subdivides (${f1} -> ${s.mesh.f} faces)`);
const tris = await page.evaluate(() => document.querySelector('#polypill').textContent);
ok(/tris/.test(tris), `the poly counter follows: ${tris}`);
await page.keyboard.press('4');
await shot('06-rounded');

console.log('# done / size / reset');
await page.click('#edit-done');
s = await S();
ok(!s.edit && s.size.every((n) => n > 0.3) && Math.abs(s.size[1] - s.mesh.ys * s.size[1]) >= 0, `Done leaves edit mode; Properties show the real size ${s.size.map((n) => n.toFixed(2))}`);
ok(await page.isVisible('#btn-reset-shape'), 'Reset to the original shape is offered');
await shot('07-done');

console.log('# export the edited shape');
await page.click('#btn-export');
await page.waitForSelector('#btn-download');
await page.waitForFunction(() => document.querySelector('#verify')?.dataset.ok !== undefined);
ok((await page.getAttribute('#verify', 'data-ok')) === 'true', 'self-test passes for an edited mesh: ' + (await page.textContent('#verify')));
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
await dl.saveAs('e2e/out/edit/head.glb');
const bytes = new Uint8Array(fs.readFileSync('e2e/out/edit/head.glb'));
const rep = await validator.validateBytes(bytes);
ok(rep.issues.numErrors === 0, `glTF validator: ${rep.issues.numErrors} errors, ${rep.issues.numWarnings} warnings; ${rep.info.totalTriangleCount} triangles`);
const polyTris = await page.evaluate(() => { const s = window.__app.store; return s.get(s.doc.objects[0].id).mesh.f.length; });
ok(rep.info.totalTriangleCount === polyTris * 2, `file has the same ${polyTris * 2} triangles as the editor`);

console.log('# reset');
await page.click('#btn-reset-shape');
s = await S();
ok(!s.mesh, 'reset removes the custom points');
await page.keyboard.press('Control+z');
ok(!!(await S()).mesh, 'and undo brings the edit back');

console.log('# double-click, Tab, Esc');
await page.evaluate(() => { const s = window.__app.store; s.select([]); });
const bc = await page.evaluate(() => { const { vp, store } = window.__app; const o = store.doc.objects[0]; const v = new vp.camera.position.constructor(o.position[0], o.position[1], o.position[2]).project(vp.camera); const r = vp.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; });
await page.mouse.click(bc.x, bc.y);
await page.mouse.dblclick(bc.x, bc.y);
ok(!!(await S()).edit, 'double-click on a selected shape enters Edit shape');
await page.keyboard.press('Tab');
ok(!(await S()).edit, 'Tab leaves it');
await page.keyboard.press('Tab');
ok(!!(await S()).edit, 'Tab enters it');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
ok(!(await S()).edit, 'Esc (twice) leaves it');
await page.evaluate(() => { const s = window.__app.store; s.select([s.doc.objects[0].id]); s.update(s.doc.objects[0].id, { locked: true }); });
await page.keyboard.press('Tab');
ok(!(await S()).edit && (await page.textContent('.toast')).includes('Unlock'), 'a locked shape explains why it cannot be edited');
await page.evaluate(() => { const s = window.__app.store; s.update(s.doc.objects[0].id, { locked: false }); });

console.log('# walkthrough');
await page.click('#btn-menu');
await page.click('#menu-edit-tour');
await page.waitForSelector('#coach-edittour-auto');
await shot('08-tour');
for (let i = 0; i < 8 && (await page.isVisible('#coach-edittour-auto')); i++) {
  await page.click('#coach-edittour-auto');
  await page.waitForTimeout(150);
}
ok((await page.textContent('#coach-edittour')).includes('reshaped'), 'the tour reaches its last card');
ok(!(await S()).edit, 'and finishes outside edit mode');
await shot('09-tour-done');

ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
process.exit(failed ? 1 : 0);
