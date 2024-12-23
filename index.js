const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const { PuppeteerBlocker } = require("@ghostery/adblocker-puppeteer");
const fetch = require("cross-fetch"); // Required by the adblocker

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
        console.log("Browser launched.");

        const page = await browser.newPage();

        // Set up the adblocker
        console.log("Loading adblocker...");
        const blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);
        blocker.enableBlockingInPage(page);
        console.log("Adblocker enabled.");

        // Block unnecessary resources to speed up page load
        await page.setRequestInterception(true);
        page.on("request", (req) => {
            const blockedResources = ["stylesheet", "image", "media", "font", "script"];
            if (blockedResources.includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set viewport for above-the-fold content only
        await page.setViewport({ width: 1920, height: 720 });

        // Set a realistic User-Agent string
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        );

        // Disable animations and transitions
        await page.evaluateOnNewDocument(() => {
            const style = document.createElement("style");
            style.innerHTML = `
                * {
                    animation: none !important;
                    transition: none !important;
                }
            `;
            document.head.appendChild(style);
        });

        console.log("Navigating to:", url);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        console.log("Navigation complete.");

        // Optimize DOM rendering for above-the-fold content
        await page.evaluate(() => {
            const elements = document.querySelectorAll("*");
            elements.forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (
                    rect.bottom < 0 ||
                    rect.right < 0 ||
                    rect.top > window.innerHeight ||
                    rect.left > window.innerWidth
                ) {
                    el.style.display = "none";
                }
            });
        });

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
