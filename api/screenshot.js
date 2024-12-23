const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(url, { waitUntil: 'networkidle2' });

        const screenshot = await page.screenshot({ type: 'png' });

        await browser.close();

        res.setHeader('Content-Type', 'image/png');
        res.send(screenshot);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while taking the screenshot" });
    }
};
