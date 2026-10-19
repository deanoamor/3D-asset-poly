import { chromium } from 'playwright-core';
import fs from 'node:fs';

// Renders the Firefighter from the reference picture's viewpoint: a front view from above, almost orthographic,
// framed like the picture (334 x 496) at 2x, on a dark grey backdrop.
const URL = process.env.URL || 'http://localhost:5199/';
const OUT = process.env.OUT || 'e2e/out/firefighter/firefighter.png';
fs.mkdirSync('e2e/out/firefighter', { recursive: true });
let failed = 0;
const ok = (c, m) => { if (!c) failed++; console.log(c ? '  ok  ' : '  FAIL', m); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#btn-create');
await page.uncheck('#proj-guide'); await page.fill('#proj-name', 'Firefighter'); await page.click('#btn-create');
await page.click('#btn-assets');
await page.waitForSelector('.acard[data-asset="firefighter"]');
await page.click('.acard[data-asset="firefighter"] [data-act="add"]');
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const s = window.__app.store;
  return { shapes: s.doc.objects.filter((o) => o.kind === 'shape').length, groups: s.doc.objects.filter((o) => o.kind === 'group').map((g) => g.name) };
});
ok(info.shapes > 75 && info.groups.includes('Firefighter'), `firefighter added: ${info.shapes} parts`);
await page.evaluate(() => window.__app.store.select([]));
const SC = +(process.env.SCALE2 || 2);
const W = 334 * SC, H = 496 * SC;
const AZS = (process.env.AZS || '36').split(',').map(Number);
const W2 = 453 * SC, H2 = 544 * SC;
const shots = await page.evaluate(async (cfg) => {
  const { vp } = window.__app;
  vp.setPreview(true);
  vp.controls.autoRotate = false;
  const Color = vp.scene.background.constructor;
  vp.scene.background = new Color(cfg.bg);
  vp.grid.visible = false;
  const r = vp.renderer;
  r.shadowMap.enabled = false; vp.sun.castShadow = false; vp.shadowGround.visible = false; vp.mats.refresh();
  const V3 = vp.camera.position.constructor;
  vp.sun.position.set(2.5, 4, 5); vp.sun.intensity = cfg.sunI;
  vp.hemi.intensity = cfg.hemiI;
  const cam = vp.camera.clone();
  cam.fov = cfg.fov; cam.aspect = 453 / 544; cam.near = 0.1; cam.far = 50; cam.updateProjectionMatrix();
  r.setPixelRatio(1);
  r.setSize(cfg.w, cfg.h, false);
  const out = [];
  for (const az of cfg.azs) {
    const a = (az * Math.PI) / 180, e = (cfg.el * Math.PI) / 180;
    const T = new V3(cfg.tx, cfg.ty, 0);
    const d = cfg.vis / (2 * Math.tan((cfg.fov * Math.PI) / 360));
    cam.position.set(T.x + d * Math.cos(e) * Math.sin(a), T.y + d * Math.sin(e), T.z + d * Math.cos(e) * Math.cos(a));
    cam.lookAt(T); cam.updateMatrixWorld(true);
    r.render(vp.scene, cam);
    out.push(r.domElement.toDataURL('image/png'));
  }
  return out;
}, { bg: 0xffffff, sunI: +(process.env.SUN || 1.6), hemiI: +(process.env.HEMI || 2.4), w: W2, h: H2, azs: AZS, el: +(process.env.EL || 15), fov: +(process.env.FOV || 24), vis: +(process.env.VIS || 1.6), tx: +(process.env.TX || -0.13), ty: +(process.env.TY || 0.77) });
shots.forEach((u, i) => fs.writeFileSync(OUT.replace('.png', `-${AZS[i]}.png`), Buffer.from(u.split(',')[1], 'base64')));
console.log('saved', AZS.join(','));
ok(errs.length === 0, `no page errors ${errs.slice(0, 3).join(' | ')}`);
await browser.close();
process.exit(failed ? 1 : 0);
