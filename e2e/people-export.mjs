// The street people of the game: the same few bodies in different clothes and hair. Each variant adds an asset, recolours
// its parts by name (keeping the shading that the parts' own colours carry), and exports it to GLB (web preset).
// node e2e/people-export.mjs  (OUT=dir IDS=a,b)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import validator from 'gltf-validator';

const URL = process.env.URL || 'http://localhost:5199/';
const OUT = process.env.OUT || 'e2e/out/people';
const HAIR = '^(Hair|Fringe|Sideburn|Nape|Bang|Face |Bob |Twin|Side Hair)';
const SKIN = '^(Head$|Neck|Ear|Thigh|Shin|Upper Arm|Forearm|Hand|Thumb)';
// each: key (the file), base (the asset), groups: [regex on the part's name, the colour it takes]
const VARIANTS = [
  { key: 'street-sato', base: 'suit', groups: [['^(Jacket|Lapel|Sleeve|Trouser|Seat)', '#555a63'], ['^Tie', '#2f7a5a'], [HAIR, '#5a3d2a']] },
  { key: 'street-gen', base: 'suit', groups: [['^(Jacket|Lapel|Sleeve|Seat)', '#a08a62'], ['^Trouser', '#4a4a52'], ['^Tie', '#8a3a3a'], [HAIR, '#cfcfcf'], [SKIN, '#e8c19b']] },
  { key: 'street-kobayashi', base: 'office', groups: [['^(Blazer|Lapel|Sleeve Lower|Sleeve )', '#7c828c'], ['^Skirt', '#262a33'], ['^(Bow)', '#3a6ab0'], ['^(Blouse|Collar|Cuff)', '#dce8f6'], [HAIR, '#2a2428']] },
  { key: 'street-tomi', base: 'elder', groups: [['^(Cardigan|Sleeve|Cuff)', '#8a7aa8'], ['^Skirt', '#6e6458']] },
  { key: 'street-mio', base: 'seifuku', groups: [['^(Skirt|Pleat|Collar Back|Collar Flap)', '#5a5f6a'], ['^(Ribbon)', '#e8b830'], ['^Sock', '#f4f4f0'], [HAIR, '#6a4a36']] },
  { key: 'street-rin', base: 'casual', groups: [['^Tube Top', '#e87aa0'], ['^Shorts', '#6d8fb8'], [HAIR, '#8a4a2a']] },
  { key: 'street-ken', base: 'konbini', groups: [['^(Polo|Sleeve|Cap)', '#d8782a'], ['^Apron', '#3a3d44'], ['^Collar', '#f4f4f0']] },
  { key: 'street-sora', base: 'casual', groups: [['^Tube Top', '#4aa0e0'], ['^Shorts', '#e8a030'], [HAIR, '#1f1a22'], ['^(Sneaker)', '#e8402a']] },
];
const IDS = (process.env.IDS || VARIANTS.map((v) => v.key).join(',')).split(',');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
let failed = 0;
for (const v of VARIANTS.filter((x) => IDS.includes(x.key))) {
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForSelector('#btn-create');
  await page.uncheck('#proj-guide'); await page.fill('#proj-name', v.key); await page.click('#btn-create');
  await page.click('#btn-assets');
  await page.click(`.acard[data-asset="${v.base}"] [data-act="add"]`);
  await page.waitForTimeout(1200);
  const n = await page.evaluate((groups) => {
    const hsl = (hex) => { const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; };
    const hex = (h, s, l) => { const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; let r, g, b; if (s === 0) r = g = b = l; else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3); } return '#' + [r, g, b].map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0')).join(''); };
    const s = window.__app.store;
    let count = 0;
    for (const [pat, target] of groups) {
      const re = new RegExp(pat);
      const objs = s.doc.objects.filter((o) => o.kind === 'shape' && re.test(o.name));
      if (!objs.length) { console.log('no parts for', pat); continue; }
      const ref = objs.reduce((a, o) => a + hsl(o.color)[2], 0) / objs.length || 0.5;
      const [th, ts, tl] = hsl(target);
      for (const o of objs) {
        const ol = hsl(o.color)[2];
        const l = Math.min(0.97, Math.max(0.03, tl * (ol / ref)));
        s.update(o.id, { color: hex(th, ts, l) }, false);
        count++;
      }
    }
    return count;
  }, v.groups);
  await page.waitForTimeout(500);
  await page.click('#btn-export');
  await page.waitForSelector('#btn-download');
  await page.click('[data-tab="engine"]');
  await page.click('.card[data-preset="web"]');
  await page.selectOption('#export-format', 'glb');
  await page.waitForFunction(() => document.querySelector('#verify')?.dataset.ok !== undefined, null, { timeout: 30000 });
  const verify = await page.getAttribute('#verify', 'data-ok');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
  const file = `${OUT}/${v.key}.glb`;
  await dl.saveAs(file);
  const r = await validator.validateBytes(new Uint8Array(fs.readFileSync(file)));
  const bad = verify !== 'true' || r.issues.numErrors > 0;
  if (bad) failed++;
  console.log(bad ? 'FAIL' : 'ok  ', v.key, `${(fs.statSync(file).size / 1024).toFixed(0)} KB`, `recoloured ${n} parts`, `errors ${r.issues.numErrors}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
