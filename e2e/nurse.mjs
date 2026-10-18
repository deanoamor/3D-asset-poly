import { chromium } from 'playwright-core';
import fs from 'node:fs';

// Renders the Nurse from the reference picture's viewpoint: a front view from above, almost orthographic,
// framed like the picture (334 x 496) at 2x, on a dark grey backdrop.
const URL = process.env.URL || 'http://localhost:5199/';
const OUT = process.env.OUT || 'e2e/out/nurse/nurse.png';
fs.mkdirSync('e2e/out/nurse', { recursive: true });
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
await page.uncheck('#proj-guide'); await page.fill('#proj-name', 'Nurse'); await page.click('#btn-create');
await page.click('#btn-assets');
await page.waitForSelector('.acard[data-asset="nurse"]');
await page.click('.acard[data-asset="nurse"] [data-act="add"]');
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const s = window.__app.store;
  return { shapes: s.doc.objects.filter((o) => o.kind === 'shape').length, groups: s.doc.objects.filter((o) => o.kind === 'group').map((g) => g.name) };
});
ok(info.shapes > 40 && info.groups.includes('Nurse'), `nurse added: ${info.shapes} parts`);
await page.evaluate(() => window.__app.store.select([]));
const SC = +(process.env.SCALE2 || 2);
const W = 334 * SC, H = 496 * SC;
const AZS = (process.env.AZS || '0,35,90,180').split(',').map(Number);
const shots = await page.evaluate(async (cfg) => {
  const { SCALE, TILT, GROUND } = await import('/src/core/library/ribbonData.ts');
  const { vp } = window.__app;
  vp.setPreview(true);
  vp.controls.autoRotate = false;
  const Color = vp.scene.background.constructor;
  vp.scene.background = new Color(cfg.bg);
  vp.grid.visible = false;
  const r = vp.renderer;
  r.shadowMap.enabled = false; vp.sun.castShadow = false; vp.shadowGround.visible = false; vp.mats.refresh();
  const V3 = vp.camera.position.constructor;
  vp.sun.position.set(-3, 5, 6); vp.sun.intensity = cfg.sunI;
  vp.hemi.intensity = cfg.hemiI;
  const cam = vp.camera.clone();
  const th = (TILT * Math.PI) / 180;
  const target = new V3((167 - 185) / SCALE, (GROUND - 248) / SCALE / Math.cos(th) - cfg.dy, 0);
  const d = 600;
  cam.fov = (2 * Math.atan((496 / SCALE / 2 / d) * cfg.zoom) * 180) / Math.PI;
  cam.aspect = 334 / 496; cam.near = 300; cam.far = 900; cam.updateProjectionMatrix();
  r.setPixelRatio(1);
  r.setSize(cfg.w, cfg.h, false);
  const out = [];
  for (const az of cfg.azs) {
    const a = (az * Math.PI) / 180;
    const tt = new V3(0, target.y, 0);
    const useT = az === 0 ? target : tt;
    cam.position.set(useT.x + d * Math.cos(th) * Math.sin(a), useT.y + d * Math.sin(th), useT.z + d * Math.cos(th) * Math.cos(a));
    cam.lookAt(useT); cam.updateMatrixWorld(true);
    r.render(vp.scene, cam);
    out.push(r.domElement.toDataURL('image/png'));
  }
  return out;
}, { bg: 0x3f3f3f, sunI: +(process.env.SUN || 0.9), hemiI: +(process.env.HEMI || 3.6), w: W, h: H, azs: AZS, zoom: +(process.env.ZOOM || 1.1), dy: +(process.env.DY || 0.02) });
shots.forEach((u, i) => fs.writeFileSync(OUT.replace('.png', `-${AZS[i]}.png`), Buffer.from(u.split(',')[1], 'base64')));
console.log('saved', AZS.join(','));
ok(errs.length === 0, `no page errors ${errs.slice(0, 3).join(' | ')}`);
await browser.close();
process.exit(failed ? 1 : 0);
