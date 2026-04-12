const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if(msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.toString()));
  await page.goto('http://localhost:5174/about', { waitUntil: 'networkidle0' });
  console.log("ERRORS:", errors);
  await browser.close();
})();
