import requests
import json

url = "https://www.daraz.com.bd/products/"
cdx_url = f"https://web.archive.org/cdx/search/cdx?url={url}&matchType=prefix&output=json&limit=50&fl=original,timestamp"
try:
    resp = requests.get(cdx_url, timeout=15)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Found {len(data)-1} archived product URLs in total under the /products/ prefix.")
        for entry in data[1:10]:
            print(f"   - {entry[0]} at {entry[1]}")
    else:
        print(f"Error {resp.status_code}")
except Exception as e:
    print(f"Failed: {e}")
