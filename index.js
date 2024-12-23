const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const { PuppeteerBlocker } = require("@ghostery/adblocker-puppeteer");
const fetch = require("cross-fetch");

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
            headless: true, // Change to false if testing
            ignoreHTTPSErrors: true,
        });
        console.log("Browser launched.");

        const page = await browser.newPage();

        // Enable adblocker
        console.log("Loading adblocker...");
        const blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);
        blocker.enableBlockingInPage(page);
        console.log("Adblocker enabled.");

        // Allow CSS and JavaScript, but block heavy resources
        await page.setRequestInterception(true);
        page.on("request", (req) => {
            console.log("Requesting:", req.url());
            const blockedResources = ["image", "media", "font"]; // Allow CSS and JS
            if (blockedResources.includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set viewport
        await page.setViewport({ width: 1920, height: 720 });

        // Set User-Agent
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        );

        console.log("Navigating to:", url);
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        console.log("Navigation complete.");

        // Wait for a specific element (e.g., body) to render fully
        await page.waitForSelector("body");

        console.log("Taking screenshot...");
        const screenshot = await page.screenshot({ type: "png" });
        console.log("Screenshot taken!");

        res.setHeader("Content-Type", "image/png");
        res.send(screenshot);
    } catch (error) {
        console.error("Error:", error.message);
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
