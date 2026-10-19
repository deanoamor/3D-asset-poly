// Exports the character/diorama assets to GLB (web preset) into OUT (default e2e/out/glb) and validates each file.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import validator from 'gltf-validator';

const URL = process.env.URL || 'http://localhost:5199/';
const OUT = process.env.OUT || 'e2e/out/glb';
const IDS = (process.env.IDS || 'island,anime,ribbon,nurse,school,casual,gamenurse,firefighter,seifuku,japanhouse,japanschool').split(',');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
let failed = 0;
for (const id of IDS) {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#btn-create');
  await page.uncheck('#proj-guide'); await page.fill('#proj-name', id); await page.click('#btn-create');
  await page.click('#btn-assets');
  await page.click(`.acard[data-asset="${id}"] [data-act="add"]`);
  await page.waitForTimeout(1500);
  await page.click('#btn-export');
  await page.waitForSelector('#btn-download');
  await page.click('[data-tab="engine"]');
  await page.click('.card[data-preset="web"]');
  await page.selectOption('#export-format', 'glb');
  await page.waitForFunction(() => document.querySelector('#verify')?.dataset.ok !== undefined, null, { timeout: 30000 });
  const verify = await page.getAttribute('#verify', 'data-ok');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
  const file = `${OUT}/${id}.glb`;
  await dl.saveAs(file);
  const bytes = new Uint8Array(fs.readFileSync(file));
  const r = await validator.validateBytes(bytes);
  const dv = new DataView(bytes.buffer, bytes.byteOffset);
  const j = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + dv.getUint32(12, true))));
  const bad = verify !== 'true' || r.issues.numErrors > 0;
  if (bad) failed++;
  console.log(bad ? 'FAIL' : 'ok  ', id, `${(bytes.length / 1024).toFixed(0)} KB`, `meshes ${j.meshes?.length}`, `skins ${j.skins?.length ?? 0}`, `joints ${j.skins?.[0]?.joints.length ?? 0}`, `anims ${j.animations?.length ?? 0}`, `errors ${r.issues.numErrors}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
