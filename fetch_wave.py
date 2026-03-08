import urllib.request
import ssl
import re

url = 'https://21st.dev/thanh/dynamic-wave-canvas-background/default'
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')

match = re.search(r'"code":"(.*?)","(demoCode|dependencies)"', html)
if match:
    codeRaw = match.group(1)
    code = codeRaw.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
    with open('src/components/ui/wave-canvas.tsx', 'w') as f:
        f.write(code)
    print('Saved to src/components/ui/wave-canvas.tsx')
else:
    print('Failed to find code in HTML.')
