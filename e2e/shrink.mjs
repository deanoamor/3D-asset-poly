import { chromium } from 'playwright-core';

const URL = process.env.URL || 'http://localhost:5199/';
let failed = 0;
const ok = (c, m) => { if (!c) failed++; console.log(c ? '  ok  ' : '  FAIL', m); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#btn-create');
await page.uncheck('#proj-guide'); await page.click('#btn-create');
await page.evaluate(() => { const s = window.__app.store; const o = s.addShape('box', { position: [0, 0.5, 0], size: [1.6, 1, 1.6] }); s.select([o.id]); window.__app.vp.setView('persp'); window.__app.vp.focus(); });
await page.click('[data-tool="edit"]');
await page.waitForTimeout(400);

// the top face
const topFace = () => page.evaluate(() => {
  const s = window.__app.store; const m = s.get(s.edit.id).mesh;
  let best = -1, by = -1e9;
  m.f.forEach((f, i) => { const y = f.reduce((a, vi) => a + m.v[vi * 3 + 1], 0) / f.length; if (y > by) { by = y; best = i; } });
  return best;
});
const faceWidth = (fi) => page.evaluate((fi) => {
  const s = window.__app.store; const m = s.get(s.edit.id).mesh;
  const xs = m.f[fi].map((vi) => m.v[vi * 3]);
  return Math.max(...xs) - Math.min(...xs);
}, fi);
const faceScreen = (fi) => page.evaluate((fi) => {
  const { vp, store } = window.__app; const m = store.get(store.edit.id).mesh;
  const node = vp.nodes.get(store.edit.id); node.updateWorldMatrix(true, false);
  const c = [0, 0, 0]; m.f[fi].forEach((vi) => { for (let k = 0; k < 3; k++) c[k] += m.v[vi * 3 + k] / m.f[fi].length; });
  const v = new vp.camera.position.constructor(...c).applyMatrix4(node.matrixWorld).project(vp.camera);
  const r = vp.renderer.domElement.getBoundingClientRect();
  const toS = (q) => ({ x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height });
  const ctr = toS(v);
  const vi = m.f[fi][0];
  const corner = toS(new vp.camera.position.constructor(m.v[vi * 3], m.v[vi * 3 + 1], m.v[vi * 3 + 2]).applyMatrix4(node.matrixWorld).project(vp.camera));
  return { ...ctr, radius: Math.hypot(corner.x - ctr.x, corner.y - ctr.y) };
}, fi);

const top = await topFace();
await page.evaluate((fi) => window.__app.store.editSelect([fi]), top);
const w0 = await faceWidth(top);

console.log('# Shrink face, then adjust it by hand');
ok(!(await page.isVisible('#shrink-row')), 'no shrink slider before shrinking');
await page.click('#edit-shrink');
await page.waitForSelector('#shrink-row:not(.hidden)');
ok(true, 'a shrink slider appears');
const w30 = await faceWidth(top);
ok(Math.abs(w30 / w0 - 0.7) < 0.02, `the first shrink is 30% (${(w30 / w0).toFixed(2)} of the size)`);
ok((await page.textContent('.shrinkval')) === '30%', 'the slider shows 30%');

await page.fill('#shrink-amount', '0.6');
await page.dispatchEvent('#shrink-amount', 'input');
await page.dispatchEvent('#shrink-amount', 'change');
await page.waitForTimeout(150);
const w60 = await faceWidth(top);
ok(Math.abs(w60 / w0 - 0.4) < 0.03, `the slider at 60% shrinks to 40% of the size (${(w60 / w0).toFixed(2)})`);
ok((await page.evaluate(() => window.__app.store.get(window.__app.store.edit.id).mesh.f.length)) === 10, 'still a single inset (10 faces), not a new one each time');

console.log('# drag the face toward its middle / away from it');
await page.click('[data-etool="select"]'); // no gizmo in the way
const c = await faceScreen(top);
const start = { x: c.x + c.radius * 0.55, y: c.y };
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.mouse.move(start.x - c.radius * 0.45, start.y, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(150);
const wIn = await faceWidth(top);
ok(wIn < w60 - 0.02, `dragging toward the middle shrinks more (${(w60 / w0).toFixed(2)} → ${(wIn / w0).toFixed(2)})`);
ok((await page.evaluate(() => !!window.__app.store.shrinkSession)), 'the shrink can still be adjusted');
const c2 = await faceScreen(top);
await page.mouse.move(c2.x + c2.radius * 0.2, c2.y);
await page.mouse.down();
await page.mouse.move(c2.x + c2.radius * 0.7, c2.y, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(150);
const wOut = await faceWidth(top);
ok(wOut > wIn + 0.02, `dragging away shrinks less (${(wIn / w0).toFixed(2)} → ${(wOut / w0).toFixed(2)})`);
ok((await page.evaluate(() => window.__app.store.get(window.__app.store.edit.id).mesh.f.length)) === 10, 'still 10 faces after dragging');

console.log('# doing something else ends it');
await page.click('#edit-pullout');
await page.waitForTimeout(150);
ok(!(await page.isVisible('#shrink-row')), 'the slider goes away once you do something else');
await page.keyboard.press('Control+z');
await page.waitForTimeout(150);
await page.keyboard.press('Control+z');
await page.waitForTimeout(150);
ok((await page.evaluate(() => window.__app.store.get(window.__app.store.edit?.id ?? '')?.mesh?.f.length ?? 0)) >= 6, 'undo still works');

ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await browser.close();
process.exit(failed ? 1 : 0);
