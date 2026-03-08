import json
import re

def extract():
    with open('21st_scripts.txt', 'r') as f:
        content = f.read()

    # Find the URL for the raw component code. It ends in .tsx or .js usually in the JSON blob.
    # We saw "https://cdn.21st.dev/ruixen.ui/about-page/code.1759946300968.tsx" in the previous read
    matches = re.findall(r'https://cdn\.21st\.dev/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+/code\.[0-9]+\.tsx', content)
    
    if matches:
        print(f"Found Code URL: {matches[0]}")
    else:
        print("Could not find the URL.")

extract()
