import { chromium } from 'playwright-core';
import fs from 'node:fs';
// Renders an asset (ID) from a few sides on white: node e2e/preview.mjs  (ID=suit AZS=0,36,150 OUT=dir)
const URL = process.env.URL || 'http://localhost:5199/';
const ID = process.env.ID || 'suit';
const OUT = process.env.OUT || 'e2e/out';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForSelector('#btn-create');
await page.uncheck('#proj-guide'); await page.fill('#proj-name', ID); await page.click('#btn-create');
await page.click('#btn-assets');
await page.click(`.acard[data-asset="${ID}"] [data-act="add"]`);
await page.waitForTimeout(900);
await page.evaluate(() => window.__app.store.select([]));
const AZS = (process.env.AZS || '0,36,150').split(',').map(Number);
const SC = 2;
const shots = await page.evaluate(async (cfg) => {
  const { vp } = window.__app;
  vp.setPreview(true); vp.controls.autoRotate = false;
  vp.scene.background = new (vp.scene.background.constructor)(0xffffff);
  vp.grid.visible = false;
  const r = vp.renderer;
  r.shadowMap.enabled = false; vp.sun.castShadow = false; vp.shadowGround.visible = false; vp.mats.refresh();
  const V3 = vp.camera.position.constructor;
  vp.sun.position.set(2.5, 4, 5); vp.sun.intensity = 1.6; vp.hemi.intensity = 2.4;
  const cam = vp.camera.clone(); cam.fov = 24; cam.aspect = 453 / 544; cam.near = 0.1; cam.far = 50; cam.updateProjectionMatrix();
  r.setPixelRatio(1); r.setSize(cfg.w, cfg.h, false);
  const out = [];
  for (const az of cfg.azs) {
    const a = (az * Math.PI) / 180, e = (15 * Math.PI) / 180, d = 1.6 / (2 * Math.tan((24 * Math.PI) / 360));
    const T = new V3(-0.13, 0.77, 0);
    cam.position.set(T.x + d * Math.cos(e) * Math.sin(a), T.y + d * Math.sin(e), T.z + d * Math.cos(e) * Math.cos(a));
    cam.lookAt(T); cam.updateMatrixWorld(true); r.render(vp.scene, cam);
    out.push(r.domElement.toDataURL('image/png'));
  }
  return out;
}, { w: 453 * SC, h: 544 * SC, azs: AZS });
shots.forEach((u, i) => fs.writeFileSync(`${OUT}/${ID}-${AZS[i]}.png`, Buffer.from(u.split(',')[1], 'base64')));
console.log('saved', ID, AZS.join(','));
await browser.close();
