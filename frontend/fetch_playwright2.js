const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log("Fetching spiral...");
        await page.goto('https://21st.dev/easemize/spiral-animation/default', { waitUntil: 'networkidle' });
        // Click the 'Code' tab or the component file tab to reveal the code if it's hidden.
        // Usually, 21st UI has a tab named "spiral-animation.tsx"
        // Let's just click all buttons that look like filenames ending in .tsx or .ts
        await page.evaluate(() => {
            Array.from(document.querySelectorAll('button')).forEach(b => {
                if (b.textContent.includes('spiral-animation')) b.click();
            });
        });
        await page.waitForTimeout(1000);
        let pres = await page.$$eval('pre', pres => pres.map(p => p.textContent));
        // The component usually has 'totalDots' or 'framer-motion'
        let code = pres.find(p => p.includes('totalDots') || p.includes('motion')) || pres[pres.length - 1];
        if (code) fs.writeFileSync('src/components/ui/spiral-animation.tsx', code);

        console.log("Fetching wave...");
        await page.goto('https://21st.dev/thanh/dynamic-wave-canvas-background/default', { waitUntil: 'networkidle' });
        await page.evaluate(() => {
            Array.from(document.querySelectorAll('button')).forEach(b => {
                if (b.textContent.includes('dynamic-wave')) b.click();
            });
        });
        await page.waitForTimeout(1000);
        pres = await page.$$eval('pre', pres => pres.map(p => p.textContent));
        code = pres.find(p => p.includes('canvas') || p.includes('useEffect')) || pres[pres.length - 1];
        if (code) fs.writeFileSync('src/components/ui/wave-canvas.tsx', code);

    } catch (e) {
        console.error(e);
    }

    await browser.close();
    console.log("Done");
})();
