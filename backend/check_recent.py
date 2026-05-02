import requests
url = "https://www.daraz.com.bd/"
cdx_url = f"https://web.archive.org/cdx/search/cdx?url={url}&output=json&limit=-20&fl=timestamp"
try:
    resp = requests.get(cdx_url, timeout=10)
    print(resp.json())
except Exception as e:
    print(e)
