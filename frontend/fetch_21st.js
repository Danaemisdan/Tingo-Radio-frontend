const https = require('https');
const fs = require('fs');

function fetchCode(url, filename) {
    https.get(url, { rejectUnauthorized: false }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            // Find __NEXT_DATA__
            let match = data.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
            if (match) {
                let j = JSON.parse(match[1]);
                // traverse j to find "code" key
                function findCode(obj) {
                    if (!obj || typeof obj !== 'object') return null;
                    if (obj.code && typeof obj.code === 'string' && obj.code.includes('export ')) return obj.code;
                    for (let k in obj) {
                        let res = findCode(obj[k]);
                        if (res) return res;
                    }
                    return null;
                }
                let code = findCode(j);
                if (code) {
                    fs.writeFileSync('src/components/ui/' + filename, code);
                    console.log('Saved', filename);
                } else {
                    console.log('Code not found in JSON for', url);
                }
            } else {
                console.log('__NEXT_DATA__ not found for', url);
            }
        });
    });
}

fetchCode('https://21st.dev/osmosupply/parallax-scrolling/default', 'parallax-scrolling.tsx');
