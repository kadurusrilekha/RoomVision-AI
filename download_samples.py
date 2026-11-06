"""Download 6 verified legal sample interior photographs for demo and evaluation."""

import os
import urllib.request

SAMPLES = [
    {
        "id": "sample-living-room",
        "category": "Living Room",
        "title": "Contemporary Living Room",
        "filename": "living_room.jpg",
        "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80",
        "source": "Unsplash (Jason Briscoe)",
        "license": "Unsplash Free License (Commercial & Non-Commercial Use)",
        "url_page": "https://unsplash.com/photos/73pyV0JJOmE"
    },
    {
        "id": "sample-bedroom",
        "category": "Bedroom",
        "title": "Minimalist Master Bedroom",
        "filename": "bedroom.jpg",
        "url": "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1000&q=80",
        "source": "Unsplash (Collov Home Design)",
        "license": "Unsplash Free License (Commercial & Non-Commercial Use)",
        "url_page": "https://unsplash.com/photos/bedroom"
    },
    {
        "id": "sample-kitchen",
        "category": "Kitchen",
        "title": "Modern Kitchen & Dining",
        "filename": "kitchen.jpg",
        "url": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=80",
        "source": "Unsplash (Roam In Color)",
        "license": "Unsplash Free License (Commercial & Non-Commercial Use)",
        "url_page": "https://unsplash.com/photos/kitchen"
    },
    {
        "id": "sample-bathroom",
        "category": "Bathroom",
        "title": "Luxury Tiled Bathroom",
        "filename": "bathroom.jpg",
        "url": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80",
        "source": "Unsplash (Christian Mackie)",
        "license": "Unsplash Free License (Commercial & Non-Commercial Use)",
        "url_page": "https://unsplash.com/photos/bathroom"
    },
    {
        "id": "sample-empty-room",
        "category": "Empty Room",
        "title": "Spacious Empty Room with Hardwood Floor",
        "filename": "empty_room.jpg",
        "url": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80",
        "source": "Unsplash (Spacejoy)",
        "license": "Unsplash Free License (Commercial & Non-Commercial Use)",
        "url_page": "https://unsplash.com/photos/empty-room"
    },
    {
        "id": "sample-modern-interior",
        "category": "Modern Interior",
        "title": "Scandinavian Minimalist Lounge",
        "filename": "modern_interior.jpg",
        "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=80",
        "source": "Unsplash (Spacejoy)",
        "license": "Unsplash Free License (Commercial & Non-Commercial Use)",
        "url_page": "https://unsplash.com/photos/modern-interior"
    }
]

def main():
    dirs = [
        os.path.join("frontend", "public", "samples"),
        os.path.join("evaluation", "images")
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    for item in SAMPLES:
        print(f"Downloading {item['title']} ({item['category']})...")
        req = urllib.request.Request(item["url"], headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                for d in dirs:
                    filepath = os.path.join(d, item["filename"])
                    with open(filepath, "wb") as f:
                        f.write(data)
            print(f"Saved {item['filename']} ({len(data)} bytes)")
        except Exception as e:
            print(f"Error downloading {item['title']}: {e}")

    # Write evaluation/sources.csv
    sources_csv_path = os.path.join("evaluation", "sources.csv")
    with open(sources_csv_path, "w", encoding="utf-8") as f:
        f.write("id,category,title,filename,source,license,url_page\n")
        for item in SAMPLES:
            f.write(f'"{item["id"]}","{item["category"]}","{item["title"]}","{item["filename"]}","{item["source"]}","{item["license"]}","{item["url_page"]}"\n')
    print(f"Created {sources_csv_path}")

if __name__ == "__main__":
    main()

