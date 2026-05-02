import requests
import json

def test_url(url):
    print(f"Checking Wayback for: {url}")
    cdx_url = f"https://web.archive.org/cdx/search/cdx?url={url}&output=json&limit=10"
    try:
        resp = requests.get(cdx_url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if len(data) > 1:
                print(f"✅ Found {len(data)-1} snapshots!")
                for entry in data[1:]:
                    print(f"   - {entry[1]} (Timestamp)")
            else:
                print("❌ No snapshots found.")
        else:
            print(f"❌ Error {resp.status_code}")
    except Exception as e:
        print(f"❌ Failed: {e}")

# Try a few URLs from seeded_urls.txt
urls = [
    "https://www.daraz.com.bd/i838240-s3489818.html",
    "https://www.daraz.com.bd/i123573960-s1043726432.html",
    "https://www.daraz.com.bd/products/i114982395-s1032884561.html"
]

for u in urls:
    test_url(u)
    print("-" * 40)
