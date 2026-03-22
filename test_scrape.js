const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await page.goto('https://hairuus-store.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        const mixCard = page.locator('h3:has-text("Mix de Produtos")').first().locator('xpath=./../..');
        if (await mixCard.count() > 0) {
            console.log("Found Mix Card HTML:");
            const html = await mixCard.innerHTML();
            console.log(html);
        } else {
            console.log("Could not find Mix de Produtos card.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
