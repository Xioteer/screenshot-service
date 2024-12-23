const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/screenshot", async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });

        const screenshot = await page.screenshot({ type: "png" });

        await browser.close();

        res.setHeader("Content-Type", "image/png");
        res.send(screenshot);
    } catch (error) {
        console.error("Error while taking screenshot:", error);
        res.status(500).json({ error: "An error occurred while taking the screenshot" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
