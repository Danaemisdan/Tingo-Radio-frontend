const { chromium } = require('playwright');
const fs = require('fs');

async function extractCode(page, url, outputPath) {
    await page.goto(url, { waitUntil: 'networkidle' });

    // Evaluate in the context of the page to find the Next.js '__NEXT_DATA__' script 
    const nextDataStr = await page.evaluate(() => {
        const script = document.getElementById('__NEXT_DATA__');
        return script ? script.textContent : null;
    });

    if (nextDataStr) {
        try {
            const data = JSON.parse(nextDataStr);
            const findCode = (obj) => {
                if (!obj || typeof obj !== 'object') return null;
                if (obj.code && typeof obj.code === 'string' && obj.code.includes('export ')) {
                    return obj.code;
                }
                for (let key in obj) {
                    const res = findCode(obj[key]);
                    if (res) return res;
                }
                return null;
            };

            const code = findCode(data);
            if (code) {
                fs.writeFileSync(outputPath, code);
                console.log('Saved component to ' + outputPath);
                return;
            } else {
                console.log('Code property not found in __NEXT_DATA__ JSON for ' + url);
            }
        } catch (e) {
            console.error('Error parsing __NEXT_DATA__', e);
        }
    }

    console.log('__NEXT_DATA__ not found. Trying fallback extraction for ' + url);
    // Maybe try to fetch the code block directly from UI if it exists
    const codeText = await page.evaluate(() => {
        // Look for buttons that might contain the word code or copy
        const pres = Array.from(document.querySelectorAll('pre'));
        const reactPre = pres.find(p => p.textContent && p.textContent.includes('export '));
        return reactPre ? reactPre.textContent : null;
    });

    if (codeText) {
        fs.writeFileSync(outputPath, codeText);
        console.log('Saved component via fallback to ' + outputPath);
    } else {
        console.log('Failed fallback for ' + url);
    }
}

(async () => {
    // Need to install browsers
    const { execSync } = require('child_process');
    try {
        console.log('Installing Playwright browsers...');
        execSync('npx playwright install chromium', { stdio: 'inherit' });
    } catch (e) { }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await extractCode(page, 'https://21st.dev/easemize/spiral-animation/default', 'src/components/ui/spiral-animation.tsx');
    await extractCode(page, 'https://21st.dev/thanh/dynamic-wave-canvas-background/default', 'src/components/ui/wave-canvas.tsx');
    await browser.close();
})();
