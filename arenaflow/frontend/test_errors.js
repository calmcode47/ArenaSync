import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('ERROR:', err.toString()));
    
    console.log("Navigating...");
    await page.goto('http://localhost:5174/about', { waitUntil: 'networkidle2' });
    
    // Check if Canvas exists
    const canvas = await page.$('canvas');
    console.log("Canvas exists:", !!canvas);
    
    // Wait for 2 seconds to see errors
    await new Promise(r => setTimeout(r, 2000));
    
    const chapters = await page.$$('button[class*="w-3 h-3"]');
    console.log("Chapters dots found:", chapters.length);
    if(chapters.length > 5) {
        console.log("Clicking Chapter 5...");
        await chapters[5].click();
        await new Promise(r => setTimeout(r, 2000));
    }
    
    await browser.close();
})();
