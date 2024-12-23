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

    let browser;
    try {
        console.log("Launching browser...");
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        console.log("Navigating to:", url);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        console.log("Navigation complete");

        // Set viewport and take screenshot
        console.log("Starting to take a screenshot...");
        await page.setViewport({ width: 1920, height: 1080 });
        const screenshot = await page.screenshot({ type: "png" });
        console.log("Screenshot taken!");

        // Send the response
        res.setHeader("Content-Type", "image/png");
        res.send(screenshot);
    } catch (error) {
        console.error("Error while taking screenshot:", error.message);
        res.status(500).json({ error: "An error occurred while taking the screenshot" });
    } finally {
        if (browser) {
            await browser.close();
            console.log("Browser closed.");
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
