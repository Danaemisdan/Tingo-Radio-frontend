import urllib.request
from bs4 import BeautifulSoup
import json
import ssl
import re

def fetch_component(url):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req, context=ctx).read()
    soup = BeautifulSoup(html, 'html.parser')
    
    scripts = soup.find_all('script')
    for script in scripts:
        if script.string and 'about-page' in script.string and 'code.1759946300968.tsx' in script.string:
            # We found the script tag with the payload. Let's find the actual code string.
            # The code is usually assigned to a variable or part of a JSON-like structure.
            # Look for the "code":"..." pattern or similar.
            try:
                # Naive regex extraction of the code block. 21st.dev stores it as a literal string in the array.
                match = re.search(r'"code":"(.*?)"(?:,"demoCode"|,"dependencies")', script.string)
                if match:
                    codeRaw = match.group(1)
                    # Decode unicode escapes and newlines
                    code = codeRaw.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                    
                    with open('src/components/AboutPage.tsx', 'w') as f:
                        f.write(code)
                    print("Successfully extracted code to src/components/AboutPage.tsx")
                    return
            except Exception as e:
                print(f"Error parsing: {e}")
                
    print("Could not find code block in scripts.")

if __name__ == '__main__':
    fetch_component('https://21st.dev/ruixenui/about-page/default')
