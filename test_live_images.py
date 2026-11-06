import urllib.request, json, time

url = 'https://roomvision-ai-production-c1a4.up.railway.app/api/v1/detect'
images = ['kitchen.jpg', 'bathroom.jpg', 'modern_interior.jpg']

for img in images:
    path = f'evaluation/images/{img}'
    with open(path, 'rb') as f:
        file_bytes = f.read()
    
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="{img}"\r\n'
        f'Content-Type: image/jpeg\r\n\r\n'
    ).encode('utf-8') + file_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8')
    
    req = urllib.request.Request(url, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    try:
        t0 = time.time()
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read().decode())
        print(f'{img}: OK (status {resp.status}), model latency: {data.get("processing_ms")}ms, total time: {int((time.time()-t0)*1000)}ms')
    except Exception as e:
        print(f'{img}: FAILED with {e}')
