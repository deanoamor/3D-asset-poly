import { chromium } from 'playwright-core';
import fs from 'node:fs';
import validator from 'gltf-validator';

const URL = process.env.URL || 'http://localhost:5199/';
fs.mkdirSync('e2e/out/assets', { recursive: true });
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
await page.uncheck('#proj-guide'); await page.fill('#proj-name', 'Asset test'); await page.click('#btn-create');
const D = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__app.store.doc.objects)));
const shot = (n) => page.screenshot({ path: `e2e/out/assets/${n}.png` });

console.log('# library dialog');
await page.click('#btn-assets');
await page.waitForSelector('.acard');
const cards = await page.$$eval('.acard', (els) => els.map((e) => ({ id: e.dataset.asset, name: e.querySelector('strong').textContent, img: e.querySelector('img')?.src.startsWith('data:image/png') && e.querySelector('img').src.length > 5000, bullets: e.querySelectorAll('li').length, level: e.querySelector('.level').textContent })));
ok(cards.map((c) => c.id).join() === 'police,car,house,footballer,soldier,island,anime,ribbon,nurse,school,casual,gamenurse,firefighter', `thirteen assets: ${cards.map((c) => c.name).join(', ')}`);
ok(cards.every((c) => c.img), 'every card has a rendered 3D preview');
ok(cards.every((c) => c.bullets === 3), 'every card lists what you will learn');
await shot('01-library');

console.log('# add to project');
for (const id of ['police', 'car', 'house', 'footballer', 'soldier']) {
  if (!(await page.isVisible('.acard'))) await page.click('#btn-assets');
  await page.click(`.acard[data-asset="${id}"] [data-act="add"]`);
  await page.waitForTimeout(500);
}
let d = await D();
const kidsOf = (all, id) => all.filter((o) => o.parent === id).flatMap((o) => [o, ...kidsOf(all, o.id)]);
const groups = d.filter((o) => o.kind === 'group' && !o.parent);
ok(groups.map((g) => g.name).join() === 'Police Officer,Car,House,Football Player,Soldier', `five groups: ${groups.map((g) => g.name).join(', ')}`);
ok(groups.every((g) => kidsOf(d, g.id).filter((o) => o.kind === 'shape').length >= 75), `each group has dozens of parts (${groups.map((g) => kidsOf(d, g.id).filter((o) => o.kind === 'shape').length).join(', ')})`);
const xs = groups.map((g) => g.position[0]);
ok(xs.every((x, i) => i === 0 || x > xs[i - 1]), `placed left to right, not on top of each other (${xs.map((x) => x.toFixed(1)).join(', ')})`);
ok(d.some((o) => o.name === 'Cabin' && o.mesh) && d.some((o) => o.name === 'Roof' && o.mesh), 'cabin and roof are real edited shapes (Edit shape works on them)');
await page.keyboard.press('Escape');
await page.evaluate(() => { const { vp } = window.__app; vp.camera.position.set(14, 12, 22); vp.controls.target.set(6, 1, 0); vp.controls.update(); vp.requestRender(); });
await page.evaluate(() => { const s = window.__app.store; s.select([]); });
await page.waitForTimeout(300);
await shot('02-all-four');
const total = +(await page.getAttribute('#polypill', 'data-total'));
ok(total > 5000, `the counter just counts, with no limit: ${await page.textContent('#polypill')}`);
ok(!(await page.isVisible('.polybanner')) && !(await page.isVisible('#btn-reduce')), 'there is no budget warning or reduce button any more');

console.log('# edit an asset part');
await page.evaluate(() => { const s = window.__app.store; const cab = s.doc.objects.find((o) => o.name === 'Cabin'); s.select([cab.id]); });
await page.keyboard.press('Tab');
ok(await page.evaluate(() => !!window.__app.store.edit), 'the cabin opens in Edit shape');
await page.keyboard.press('Tab');

console.log('# learn mode');
await page.evaluate(() => { const s = window.__app.store; s.select([]); });
await page.click('#btn-assets');
await page.click('.acard[data-asset="car"] [data-act="learn"]');
await page.waitForSelector('#coach-learn:not(.hidden)');
d = await D();
const carGroups = d.filter((o) => o.kind === 'group' && !o.parent && /^Car( \d+)?$/.test(o.name));
ok(carGroups.length === 2 && carGroups[1].name === 'Car 2', 'learning adds a second, uniquely named Car without touching the first');
const learnGroup = carGroups[1];
const learnParts = kidsOf(d, learnGroup.id).filter((o) => o.kind === 'shape');
const hidden = () => page.evaluate(() => window.__app.store.learnHidden?.size ?? 0);
const visibleDocFlags = () => page.evaluate((gid) => window.__app.store.doc.objects.filter((o) => o.parent === gid).every((o) => o.visible), learnGroup.id);
ok((await hidden()) > 0 && (await hidden()) < learnParts.length, `step 1 shows only the first parts (${learnParts.length - (await hidden())} of ${learnParts.length})`);
ok(await visibleDocFlags(), 'the project data is not changed by the lesson (nothing is marked hidden)');
ok((await page.textContent('#coach-learn')).includes('Chassis and body'), 'step 1 explains the chassis and body');
ok(await page.isDisabled('#learn-back'), 'Back is disabled on the first step');
await shot('03-learn-step1');
const counts = [learnParts.length - (await hidden())];
for (let i = 0; i < 12 && (await page.textContent('#learn-next')) === 'Next'; i++) {
  await page.click('#learn-next');
  counts.push(learnParts.length - (await hidden()));
  if (i === 1) await shot('04-learn-step3');
}
ok(counts.every((c, i) => i === 0 || c > counts[i - 1]) && counts.length === 8, `each of the 8 steps adds parts: ${counts.join(' → ')}`);
ok(counts[counts.length - 1] === learnParts.length, 'the last step shows the complete car');
await page.click('#learn-next');
ok((await page.textContent('#coach-learn')).includes('You have built'), 'Finish shows the summary');
ok((await hidden()) === 0, 'Finish reveals everything');
ok((await page.textContent('#coach-learn')).includes('Challenge'), 'the summary offers a challenge');
await shot('05-learn-done');
await page.click('#learn-back').catch(() => {});
console.log('# learn: back, replay, close');
await page.click('text=Replay');
ok((await hidden()) > 0, 'Replay starts over');
await page.click('#learn-next');
await page.click('#learn-back');
ok((await page.textContent('#coach-learn')).includes('Step 1 of'), 'Back goes to the previous step');
await page.click('[aria-label="Close lesson"]');
ok((await hidden()) === 0 && (await page.isHidden('#coach-learn')), 'closing the lesson keeps the whole asset');

console.log('# reload in the middle of a lesson');
await page.click('#btn-assets');
await page.click('.acard[data-asset="house"] [data-act="learn"]');
await page.click('#learn-next');
await page.waitForTimeout(1500);
await page.reload();
await page.waitForSelector('.layer');
d = await D();
ok(d.every((o) => o.visible), 'after a reload nothing is left hidden');
ok(await page.isHidden('#coach-learn'), 'and the lesson card is gone');

console.log('# export an asset');
await page.evaluate(() => { const s = window.__app.store; s.select([]); const keep = s.doc.objects.find((o) => o.name === 'Police Officer'); const kill = s.doc.objects.filter((o) => o.kind === 'group' && o.id !== keep.id).flatMap((g) => [g.id, ...s.doc.objects.filter((c) => c.parent === g.id).map((c) => c.id)]); s.mutate((doc) => (doc.objects = doc.objects.filter((o) => !kill.includes(o.id)))); });
await page.click('#btn-export');
ok(await page.isVisible('#export-skeleton'), 'the export offers to include the skeleton');
await page.uncheck('#export-skeleton'); // parts stay separate and named
await page.waitForTimeout(600);
await page.waitForFunction(() => document.querySelector('#verify')?.dataset.ok !== undefined);
ok((await page.getAttribute('#verify', 'data-ok')) === 'true', 'self-test: ' + (await page.textContent('#verify')));
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
await dl.saveAs('e2e/out/assets/police.glb');
const bytes = new Uint8Array(fs.readFileSync('e2e/out/assets/police.glb'));
const rep = await validator.validateBytes(bytes);
ok(rep.issues.numErrors === 0, `glTF validator: ${rep.issues.numErrors} errors, ${rep.issues.numWarnings} warnings, ${rep.info.totalTriangleCount} triangles`);
const dv = new DataView(bytes.buffer);
const j = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + dv.getUint32(12, true))));
ok(['Police Officer', 'Torso', 'Cap Badge', 'Head', 'Eye White Left', 'Leg Right', 'Boot Sole Left'].every((n) => j.nodes.some((x) => x.name === n)), 'part names survive into the glTF');

ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
process.exit(failed ? 1 : 0);
