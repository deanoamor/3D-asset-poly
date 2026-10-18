import { chromium } from 'playwright-core';
import fs from 'node:fs';

// Renders the Pink Anime Girl as a bust, framed like the reference picture (front view, dark navy backdrop).
const URL = process.env.URL || 'http://localhost:5199/';
const OUT = process.env.OUT || 'e2e/out/anime/anime.png';
fs.mkdirSync('e2e/out/anime', { recursive: true });
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
await page.uncheck('#proj-guide'); await page.fill('#proj-name', 'Anime'); await page.click('#btn-create');
await page.click('#btn-assets');
await page.waitForSelector('.acard[data-asset="anime"]');
await page.click('.acard[data-asset="anime"] [data-act="add"]');
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const s = window.__app.store;
  return { shapes: s.doc.objects.filter((o) => o.kind === 'shape').length, groups: s.doc.objects.filter((o) => o.kind === 'group').map((g) => g.name) };
});
ok(info.shapes > 90 && info.groups.includes('Pink Anime Girl'), `anime added: ${info.shapes} parts`);
await page.evaluate(() => window.__app.store.select([]));
const W = +(process.env.W || 980), H = +(process.env.H || 960);
const dataUrl = await page.evaluate((cfg) => {
  const { vp } = window.__app;
  vp.setPreview(true);
  vp.controls.autoRotate = false;
  const Color = vp.scene.background.constructor;
  vp.scene.background = new Color(cfg.bg);
  vp.grid.visible = false;
  const V3 = vp.camera.position.constructor;
  // light from the right-back so the shadow falls to the front-left, like the picture
  const c = new V3(0, 3, 0);
  vp.sun.position.copy(c).add(new V3(...cfg.sun).normalize().multiplyScalar(60));
  vp.sun.target.position.copy(c);
  vp.sun.intensity = cfg.sunI;
  vp.hemi.intensity = cfg.hemiI;
  const sc = vp.sun.shadow.camera;
  sc.left = sc.bottom = -26; sc.right = sc.top = 26; sc.near = 1; sc.far = 160; sc.updateProjectionMatrix();
  vp.sun.shadow.radius = 8; vp.sun.shadow.mapSize.set(cfg.sm, cfg.sm);
  const cam = vp.camera.clone();
  const az = (cfg.az * Math.PI) / 180, el = (cfg.elev * Math.PI) / 180, d = cfg.dist;
  cam.fov = cfg.fov; cam.aspect = cfg.w / cfg.h; cam.updateProjectionMatrix();
  cam.position.set(d * Math.cos(el) * Math.sin(az), cfg.ty + d * Math.sin(el), d * Math.cos(el) * Math.cos(az));
  cam.lookAt(0, cfg.ty, 0); cam.updateMatrixWorld(true);
  const r = vp.renderer;
  r.shadowMap.enabled = false; vp.sun.castShadow = false; vp.shadowGround.visible = false; vp.mats.refresh();
  if (cfg.vsm) { r.shadowMap.type = 3; vp.mats.refresh(); }
  r.setPixelRatio(1);
  r.setSize(cfg.w, cfg.h, false);
  r.shadowMap.needsUpdate = true;
  r.render(vp.scene, cam);
  return r.domElement.toDataURL('image/png');
}, { bg: 0x07022b, az: +(process.env.AZ || 8), elev: +(process.env.ELEV || 4), dist: +(process.env.DIST || 8), fov: +(process.env.FOV || 8.6), ty: +(process.env.TY || 1.5), sun: [0.35, 0.7, 1.0], sunI: +(process.env.SUN || 1.2), hemiI: +(process.env.HEMI || 2.6), w: W, h: H, vsm: !process.env.NOVSM, sm: +(process.env.SM || 768) });
fs.writeFileSync(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('saved', OUT);
ok(errs.length === 0, `no page errors ${errs.slice(0, 3).join(' | ')}`);
await browser.close();
process.exit(failed ? 1 : 0);
