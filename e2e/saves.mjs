import { chromium } from 'playwright-core';
import fs from 'node:fs';

const URL = process.env.URL || 'http://localhost:5199/';
fs.mkdirSync('e2e/out/saves', { recursive: true });
let failed = 0;
const ok = (c, m) => { if (!c) failed++; console.log(c ? '  ok  ' : '  FAIL', m); };

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const errs = [];
const open = async (ctx) => {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(URL);
  return page;
};

// ---- laptop 1: make two projects and save them ----
const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
let page = await open(ctx1);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#btn-create');
await page.uncheck('#proj-guide'); await page.fill('#proj-name', 'Wooden Chest'); await page.click('#btn-create');
await page.evaluate(() => window.__app.store.addShape('box', { name: 'Body', position: [0, 0.5, 0] }));

console.log('# empty library and the warning');
await page.click('#btn-saves');
await page.waitForSelector('#saves-empty');
const warn = await page.textContent('#save-warning');
ok(/this browser only/i.test(warn) && /clear your browser data/i.test(warn) && /\.3pi/.test(warn), 'warns that saves vanish when browser data is cleared');
ok(await page.isDisabled('#btn-download-bag'), 'nothing to download yet');

console.log('# save');
await page.click('#btn-save-now');
await page.waitForSelector('#saves-list .scard');
ok((await page.$$('.scard')).length === 1, 'one save listed');
ok((await page.textContent('.scard strong')).includes('Wooden Chest'), 'listed under the project name');
ok(!!(await page.$('.scard .sthumb[src^="data:image"]')), 'it has a picture');
ok((await page.textContent('#btn-save-now')).includes('Update'), 'the button now updates this save');
await page.evaluate(() => window.__app.store.addShape('sphere', { name: 'Lock', position: [0, 1.2, 0] }));
await page.click('#btn-save-now');
await page.waitForFunction(() => document.querySelectorAll('.scard').length === 1 && document.querySelector('.smeta')?.textContent.includes('2 shapes'));
ok(true, 'saving again updates the same entry (2 shapes), no duplicate');
await page.click('#btn-save-copy');
await page.waitForFunction(() => document.querySelectorAll('.scard').length === 2);
ok(true, 'Save as a new copy adds a second entry');

console.log('# a second project, then open the first');
await page.click('.modal [aria-label="Close"]');
await page.click('#btn-menu'); await page.click('text=New project…');
await page.fill('#proj-name', 'Tower'); await page.uncheck('#proj-guide');
await page.click('.modal #btn-create');
await page.evaluate(() => window.__app.store.addShape('cylinder', { name: 'Tower', position: [0, 1, 0] }));
await page.click('#btn-saves');
await page.waitForSelector('.scard');
await page.click('.scard >> nth=0 >> [data-act="open"]');
await page.waitForSelector('[data-act="confirm-open"]');
ok(true, 'opening while the current project is unsaved asks first');
await page.click('[data-act="confirm-open"]');
await page.waitForFunction(() => window.__app.store.doc.name === 'Wooden Chest');
ok((await page.evaluate(() => window.__app.store.doc.objects.length)) === 2, 'the saved project is restored with its 2 shapes');

console.log('# download the bag');
await page.click('#btn-saves');
await page.waitForSelector('#btn-download-bag:not([disabled])');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download-bag')]);
const bagFile = 'e2e/out/saves/' + dl.suggestedFilename();
await dl.saveAs(bagFile);
ok(/^poly-studio-saves-\d{4}-\d{2}-\d{2}\.3pi$/.test(dl.suggestedFilename()), `bag named ${dl.suggestedFilename()}`);
const bytes = fs.readFileSync(bagFile);
ok(bytes[0] === 0x1f && bytes[1] === 0x8b, `bag is a compressed file (${bytes.length} bytes)`);

console.log('# another laptop: nothing there, import the bag');
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
page = await open(ctx2);
await page.waitForSelector('#btn-create');
await page.uncheck('#proj-guide'); await page.click('#btn-create');
await page.click('#btn-saves');
await page.waitForSelector('#saves-empty');
ok(true, 'a fresh browser has no saves');
const chooser = page.waitForEvent('filechooser');
await page.click('#btn-import-bag');
await (await chooser).setFiles(bagFile);
await page.waitForFunction(() => document.querySelectorAll('.scard').length === 2);
ok(true, 'both saves came back');
const names = await page.$$eval('.scard strong', (n) => n.map((x) => x.textContent));
ok(names.every((n) => n.includes('Wooden Chest')), `names kept: ${names.join(' | ')}`);
await page.click('.scard >> nth=0 >> [data-act="open"]');
await page.waitForFunction(() => window.__app.store.doc.name === 'Wooden Chest');
ok((await page.evaluate(() => window.__app.store.doc.objects.length)) >= 1, 'a restored save opens in the new browser');

console.log('# importing the same bag again changes nothing');
await page.click('#btn-saves');
const chooser2 = page.waitForEvent('filechooser');
await page.click('#btn-import-bag');
await (await chooser2).setFiles(bagFile);
await page.waitForTimeout(800);
ok((await page.$$('.scard')).length === 2, 'still 2 saves, no duplicates');

console.log('# a wrong file is refused');
fs.writeFileSync('e2e/out/saves/bad.3pi', 'not a bag');
const chooser3 = page.waitForEvent('filechooser');
await page.click('#btn-import-bag');
await (await chooser3).setFiles('e2e/out/saves/bad.3pi');
await page.waitForSelector('.toast, [role="status"]:has-text("not a .3pi")', { timeout: 3000 }).catch(() => {});
ok((await page.$$('.scard')).length === 2, 'nothing was added');

console.log('# delete');
await page.click('.scard >> nth=0 >> [data-act="delete"]');
await page.click('[data-act="confirm-delete"]');
await page.waitForFunction(() => document.querySelectorAll('.scard').length === 1);
ok(true, 'delete asks first, then removes the save');

ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await browser.close();
process.exit(failed ? 1 : 0);
