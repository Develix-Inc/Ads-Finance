import urllib.request, re, json
url = 'https://www.youtube.com/playlist?list=PLOGi5-fAu8bH3N4-P8K5N-bE-G_vWzR8G' # TED Talks Business
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
    unique_ids = list(dict.fromkeys(ids))
    print(','.join(unique_ids[:30]))
except Exception as e:
    print('Error:', e)
