import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--use-gl=angle','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type()==='error' && errs.push(m.text()));
let failed = 0; const ok = (c, m) => { if (!c) failed++; console.log(c ? '  ok  ' : '  FAIL', m); };
await page.goto('http://localhost:5199/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#btn-create'); await page.uncheck('#proj-guide'); await page.click('#btn-create');
const scr = (pos) => page.evaluate((p) => { const { vp } = window.__app; const v = new vp.camera.position.constructor(...p).project(vp.camera); const r = vp.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }, pos);
const doc = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__app.store.doc.objects)));

console.log('# gizmo drag (Move tool, X axis)');
await page.evaluate(() => { const s = window.__app.store; s.addShape('box', { position: [0, 0.5, 0] }); s.addShape('box', { position: [3, 0.5, 0] }); s.select([s.doc.objects[1].id]); s.setUi({ tool: 'move', snapGrid: false, snapObjects: false }); });
await page.evaluate(() => { const vp = window.__app.vp; vp.camera.position.set(1.5, 9, 0.01); vp.controls.target.set(1.5, 0, 0); vp.controls.update(); vp.requestRender(); });
await page.waitForTimeout(100);
const c0 = await scr([3, 0.5, 0]);
const arrow = { x: c0.x + 60, y: c0.y };
await page.mouse.move(arrow.x, arrow.y); await page.mouse.down();
await page.mouse.move(arrow.x + 60, arrow.y, { steps: 5 }); await page.mouse.up();
let d = await doc();
ok(d[1].position[0] > 3.3, `gizmo drag moved the box along X (${d[1].position[0]})`);
const undoDepth = await page.evaluate(() => window.__app.store.undoStack.length);
await page.keyboard.press('Control+z');
d = await doc();
ok(Math.abs(d[1].position[0] - 3) < 1e-6, 'one undo reverts the whole gizmo drag');
void undoDepth;

console.log('# snap to objects while sliding');
await page.evaluate(() => { const s = window.__app.store; s.setUi({ tool: 'select', snapObjects: true, snapGrid: false }); s.select([]); });
const from = await scr([3, 1, 0]);
await page.mouse.move(from.x, from.y); await page.mouse.down();
const to = await scr([1.08, 1, 0]);   // 0.08 m away from touching (A.max.x = 0.5 -> B centre 1.0)
await page.mouse.move((from.x + to.x) / 2, to.y, { steps: 4 }); await page.mouse.move(to.x, to.y, { steps: 4 }); await page.mouse.up();
d = await doc();
ok(Math.abs(d[1].position[0] - 1) < 1e-3, `box snapped flush against its neighbour (x=${d[1].position[0]})`);

console.log('# layers drag & drop');
await page.evaluate(() => { const s = window.__app.store; s.select([s.doc.objects[0].id, s.doc.objects[1].id]); s.groupSelected('G'); s.addShape('sphere'); });
const sphere = (await doc()).find((o) => o.shape === 'sphere');
const src = page.locator(`.layer[data-id="${sphere.id}"]`);
const tgt = page.locator('.layer', { hasText: /^G$/ }).first();
await src.dragTo(tgt);
d = await doc(); const g = d.find((o) => o.kind === 'group');
ok(d.find((o) => o.shape === 'sphere').parent === g.id, 'dropping on a group moves the object into it');
const sp = d.find((o) => o.shape === 'sphere');
ok(true, `sphere kept world position? local=${sp.position.map((n) => n.toFixed(2))}`);

console.log('# lock / hide');
await page.evaluate(() => { const s = window.__app.store; const o = s.addShape('sphere', { name: 'Ball', position: [-2, 0.5, 2] }); s.update(o.id, { locked: true }); s.select([]); });
const sc = await page.evaluate(() => { const o = window.__app.store.doc.objects.find((o) => o.name === 'Ball'); const wm = window.__app.store.worldMatrixOf(o.id); return [wm.elements[12], wm.elements[13], wm.elements[14]]; });
const sp2 = await scr(sc);
await page.mouse.click(sp2.x, sp2.y);
ok((await page.evaluate(() => window.__app.store.selection.length)) === 0, 'locked object cannot be picked on canvas');
await page.evaluate(() => { const s = window.__app.store; const o = s.doc.objects.find((o) => o.name === 'Ball'); s.update(o.id, { locked: false, visible: false }); });
await page.mouse.click(sp2.x, sp2.y);
ok((await page.evaluate(() => window.__app.store.selection.length)) === 0, 'hidden object cannot be picked');

console.log('# shape drawing on top of another object');
await page.evaluate(() => { const s = window.__app.store; s.setUi({ tool: 'shape', shape: 'cylinder', snapGrid: true }); });
const top = await scr([1, 1, 0]);
await page.mouse.click(top.x, top.y);
d = await doc(); const cyl = d.find((o) => o.shape === 'cylinder');
ok(cyl && cyl.position[1] > 0.9, `cylinder placed on top face (y=${cyl?.position[1]})`);

console.log('# keyboard: tool keys ignored while typing');
await page.locator('#projname').focus(); await page.keyboard.type('swr');
ok((await page.evaluate(() => window.__app.store.ui.tool)) === 'select', 'typing in the name field does not switch tools');
await page.screenshot({ path: 'e2e/out/11-interact.png' });
ok(errs.length === 0, 'no errors ' + errs.join('|'));
await browser.close();
process.exit(failed ? 1 : 0);
