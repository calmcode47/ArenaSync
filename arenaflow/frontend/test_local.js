import puppeteer from 'puppeteer';
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('ERROR:', err.toString()));
    console.log("Navigating to http://localhost:4173/");
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    const rootHtml = await page.$eval('#root', el => el.innerHTML);
    console.log("ROOT HTML:", rootHtml.length > 5 ? "Has content" : "Empty");
    await browser.close();
})();
