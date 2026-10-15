import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--use-gl=angle','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log(c ? '  ok  ' : '  FAIL', m); };
await p.goto((process.env.URL || 'http://localhost:5199/')); await p.evaluate(() => localStorage.clear()); await p.reload();
await p.waitForSelector('#btn-create'); await p.uncheck('#proj-guide'); await p.click('#btn-create');
await p.evaluate(() => { const s = window.__app.store; const o = s.addShape('box', { position: [0, 0.5, 0] }); s.select([o.id]); });
await p.click('[data-tool="edit"]');
const sel = (dir) => p.evaluate((dir) => { const { store } = window.__app; const m = store.get(store.edit.id).mesh; store.editSelect([m.f.findIndex((f) => f.every((v) => m.v[v * 3 + dir[0]] * dir[1] > 0.4))]); }, dir);
const maxOf = (axis) => p.evaluate((axis) => { const { store } = window.__app; const m = store.get(store.edit.id).mesh; return Math.max(...m.v.filter((_, i) => i % 3 === axis)); }, axis);
const proxyScreen = () => p.evaluate(() => { const { vp } = window.__app; const q = vp.edit.proxy.position.clone().project(vp.camera); const r = vp.renderer.domElement.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; });

console.log('# direct drag on the selected top face');
await sel([1, 1]); await p.click('#edit-pullout');
await p.keyboard.press('4'); await p.waitForTimeout(500);
const start = await maxOf(1);
let pt = await proxyScreen();
await p.mouse.move(pt.x, pt.y);
await p.waitForTimeout(120);
ok((await p.evaluate(() => document.querySelector('canvas.gl').style.cursor)) === 'grab', 'cursor becomes a hand over the selected face');
await p.mouse.down();
const seen = [];
for (let i = 1; i <= 20; i++) { await p.mouse.move(pt.x, pt.y - i * 3); seen.push(+(await maxOf(1)).toFixed(3)); }
await p.mouse.up();
console.log('   heights:', seen.join(' '));
ok(seen[seen.length - 1] > start + 0.2, `dragging the face pulled it up (${start.toFixed(2)} -> ${seen[seen.length - 1]})`);
ok(new Set(seen).size >= 18, `and it is smooth: ${new Set(seen).size} different heights in 20 steps`);
ok(seen.every((v, i) => i === 0 || v >= seen[i - 1] - 1e-9), 'monotonic, no jumping back');
await p.keyboard.press('Control+z');
ok(Math.abs((await maxOf(1)) - start) < 1e-6, 'one undo reverts the whole drag');

console.log('# click without moving keeps the selection and does not move anything');
const f0 = await p.evaluate(() => JSON.stringify(window.__app.store.edit.sel));
pt = await proxyScreen();
await p.mouse.click(pt.x, pt.y);
ok((await p.evaluate(() => JSON.stringify(window.__app.store.edit.sel))) === f0 && Math.abs((await maxOf(1)) - start) < 1e-6, 'plain click on the selected face just selects it');

console.log('# dragging empty space still orbits');
const cam0 = await p.evaluate(() => window.__app.vp.camera.position.toArray());
await p.mouse.move(300, 300); await p.mouse.down(); await p.mouse.move(380, 330, { steps: 5 }); await p.mouse.up();
const cam1 = await p.evaluate(() => window.__app.vp.camera.position.toArray());
ok(cam0.some((v, i) => Math.abs(v - cam1[i]) > 0.05), 'camera orbited');

console.log('# the arrow handle is smooth too');
await sel([1, 1]);
await p.keyboard.press('1'); await p.waitForTimeout(500);
pt = await proxyScreen();
await p.mouse.move(pt.x, pt.y - 55); await p.mouse.down();
const g = [];
for (let i = 1; i <= 20; i++) { await p.mouse.move(pt.x, pt.y - 55 - i * 3); g.push(+(await maxOf(1)).toFixed(3)); }
await p.mouse.up();
ok(new Set(g).size >= 18, `arrow drag: ${new Set(g).size} different heights in 20 steps (${g.slice(0, 5).join(' ')} …)`);
await p.keyboard.press('Control+z');
await sel([1, 1]); await p.waitForTimeout(100);

console.log('# Snap button is opt-in and relative');
ok(!(await p.evaluate(() => window.__app.store.edit.snap)), 'Snap is off by default');
await p.click('#edit-snap');
pt = await proxyScreen();
await p.mouse.move(pt.x, pt.y - 55); await p.mouse.down();
const base0 = await maxOf(1);
const sn = [];
for (let i = 1; i <= 20; i++) { await p.mouse.move(pt.x, pt.y - 55 - i * 3); sn.push(+((await maxOf(1)) - base0).toFixed(3)); }
await p.mouse.up();
const stepsFromStart = sn.map((v) => +(v / 0.25).toFixed(2));
console.log('   moves (in 0.25 steps):', stepsFromStart.join(' '));
ok(stepsFromStart.every((v) => Math.abs(v - Math.round(v)) < 0.1) && stepsFromStart[0] === 0, 'with Snap on, moves come in 0.25 m steps counted from where the drag began (no first jump)');
await b.close(); process.exit(bad ? 1 : 0);
