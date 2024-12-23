const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        // Launch Chromium with proper settings
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Optimize resource loading
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['stylesheet', 'image', 'media', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Navigate to the URL
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });

        // Take a screenshot
        const screenshot = await page.screenshot({ type: 'png' });

        await browser.close();

        res.setHeader('Content-Type', 'image/png');
        res.send(screenshot);
    } catch (error) {
        console.error('Error while taking screenshot:', error);
        res.status(500).json({ error: "An error occurred while taking the screenshot" });
    }
};
