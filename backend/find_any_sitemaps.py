import requests
url = "https://www.daraz.com.bd/sitemap-product-*"
cdx_url = f"https://web.archive.org/cdx/search/cdx?url={url}&matchType=prefix&output=json&limit=100&fl=original,timestamp"
try:
    resp = requests.get(cdx_url, timeout=20)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Found {len(data)-1} archived sitemap-related URLs.")
        # Group by URL
        results = {}
        for row in data[1:]:
            orig, ts = row[0], row[1]
            if orig not in results: results[orig] = []
            results[orig].append(ts)
        
        for orig, ts_list in list(results.items())[:10]:
            print(f"  - {orig} ({len(ts_list)} snapshots)")
    else:
        print(f"Error: {resp.status_code}")
except Exception as e:
    print(f"Failed: {e}")
