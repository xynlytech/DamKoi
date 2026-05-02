import requests
url = "https://www.daraz.com.bd/sitemap-product-all.xml"
cdx_url = f"https://web.archive.org/cdx/search/cdx?url={url}&output=json&limit=50&fl=timestamp"
try:
    resp = requests.get(cdx_url, timeout=15)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Found {len(data)-1} archived versions of the sitemap index.")
        for row in data[1:10]:
            print(f"  - {row[0]}")
    else:
        print(f"Error: {resp.status_code}")
except Exception as e:
    print(f"Failed: {e}")
