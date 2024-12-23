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
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Optimize resource loading
        await page.setRequestInterception(true);
        page.on("request", (req) => {
            if (["stylesheet", "image", "media", "font"].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log("Navigating to:", url);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        console.log("Navigation complete");

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
