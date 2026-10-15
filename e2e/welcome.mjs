import { chromium } from 'playwright-core';

const URL = process.env.URL || 'http://localhost:5199/';
let failed = 0;
const ok = (c, m) => { if (!c) failed++; console.log(c ? '  ok  ' : '  FAIL', m); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const errs = [];
const visit = async (ctx) => {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(URL);
  return page;
};

console.log('# brand new browser');
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true });
let page = await visit(ctx);
await page.waitForSelector('.welcome');
ok((await page.textContent('.welcome h2')).includes('Welcome'), 'a welcome screen appears');
await page.waitForSelector('#welcome-empty');
ok(/No saves in this browser yet/.test(await page.textContent('#welcome-empty')), 'says there are no saves yet');
ok(/\.3pi/.test(await page.textContent('#welcome-empty')), 'points to importing a .3pi bag');
ok(!(await page.$('#btn-continue')), 'nothing to continue');
ok(!(await page.$('.welcome [aria-label="Close"]')), 'it cannot be closed without choosing something');

console.log('# new project');
await page.fill('#proj-name', 'Crate');
await page.uncheck('#proj-guide');
await page.click('#btn-create');
await page.waitForFunction(() => window.__app.store.doc.name === 'Crate');
ok(!(await page.$('.welcome')), 'the editor opens with the new project');
await page.evaluate(() => window.__app.store.addShape('box', { name: 'Body' }));

console.log('# save it, then come back as a returning visitor');
await page.click('#btn-saves');
await page.click('#btn-save-now');
await page.waitForSelector('.scard');
await page.click('.modal [aria-label="Close"]');
await page.waitForTimeout(600);
const stored = await ctx.storageState({ indexedDB: true });
await page.close();

const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 }, storageState: stored });
page = await visit(ctx2);
await page.waitForSelector('.welcome');
ok(!!(await page.$('#btn-continue')), 'a returning visitor can Continue where they left off');
ok((await page.textContent('.wcontinue')).includes('Crate'), 'it names the project');
await page.waitForSelector('#welcome-saves .scard');
ok((await page.$$('#welcome-saves .scard')).length === 1, 'their saves are listed');
ok(!!(await page.$('.welcome [aria-label="Close"]')), 'the screen can be closed');
await page.click('#btn-continue');
await page.waitForFunction(() => !document.querySelector('.welcome'));
ok((await page.evaluate(() => window.__app.store.doc.objects.length)) === 1, 'Continue keeps the work in place');

console.log('# reloading in the same tab goes straight to the editor');
await page.reload();
await page.waitForSelector('#btn-saves');
await page.waitForTimeout(500);
ok(!(await page.$('.welcome')), 'no welcome again in the same visit');

console.log('# open a save from the welcome screen');
const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 860 }, storageState: stored });
page = await visit(ctx3);
await page.waitForSelector('#welcome-saves .scard');
await page.evaluate(() => window.__app.store.rename('Scribble'));
await page.click('.welcome .scard [data-act="open"]');
await page.waitForSelector('[data-act="confirm-open"]');
ok(true, 'opening replaces unsaved work only after asking');
await page.click('[data-act="confirm-open"]');
await page.waitForFunction(() => window.__app.store.doc.name === 'Crate' && !document.querySelector('.welcome'));
ok(true, 'the save opens and the screen closes');

console.log('# a cleared browser can import the bag from the welcome screen');
const bag = await (async () => {
  await page.click('#btn-saves');
  await page.waitForSelector('#btn-download-bag:not([disabled])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download-bag')]);
  const f = 'e2e/out/welcome-bag.3pi';
  await dl.saveAs(f);
  return f;
})();
const ctx4 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
page = await visit(ctx4);
await page.waitForSelector('#welcome-empty');
const chooser = page.waitForEvent('filechooser');
await page.click('#btn-welcome-import');
await (await chooser).setFiles(bag);
await page.waitForSelector('#welcome-saves .scard');
ok((await page.textContent('#welcome-saves .scard strong')).includes('Crate'), 'the imported save shows up in the list');
await page.click('.welcome .scard [data-act="open"]');
await page.waitForFunction(() => window.__app.store.doc.name === 'Crate');
ok(true, 'and opens');

ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await browser.close();
process.exit(failed ? 1 : 0);
