#!/usr/bin/env python3
"""네이버지도 공유 폴더(봉슐랭가이드)의 저장 장소를 _data/places.json 으로 가져온다.

사용법: python3 scripts/import_naver_places.py

- 폴더는 '공개 + 공유' 상태여야 한다. 공유 링크(naver.me/...)를 열면 나오는
  map.naver.com/p/favorite/sharedPlace/folder/{공유ID} 의 공유ID 를 FOLDERS 에 적는다.
- 같은 장소가 여러 폴더에 있으면 가장 높은 등급을 쓴다.
- 블로그 후기 연결은 _data/place_reviews.yml 에서 따로 관리하므로 다시 가져와도 지워지지 않는다.
- 네이버지도 공유 페이지가 쓰는 비공식 API 라 예고 없이 바뀔 수 있다.
"""

import json
import os
import time
import urllib.request

# (공유ID, 등급) — 등급: 2 = ★★, 1 = ★, 0 = ☆
FOLDERS = [
    ("74532985b549453dbd3518972e83e30f", 2),  # 봉슐랭가이드★★
    ("5b5487f032514b5f8b56f75354ac66b3", 1),  # 봉슐랭가이드★
    ("a6fcc29ecb82450c85c702ed899a1336", 0),  # 봉슐랭가이드☆
]

API = "https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/{}/bookmarks?start=0&limit=5000&sort=lastUseTime"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_data", "places.json")

# 주소 앞머리 표기를 짧게 통일
REGION_ALIAS = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
    "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
    "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원", "충청북도": "충북", "충청남도": "충남",
    "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남", "경상북도": "경북", "경상남도": "경남",
    "제주특별자치도": "제주", "전남광주": "전남",
}


def fetch(share_id, retries=3):
    req = urllib.request.Request(API.format(share_id), headers={"User-Agent": "Mozilla/5.0"})
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                return json.loads(res.read().decode("utf-8"))
        except (OSError, ValueError):
            # 가끔 빈 응답이 온다. 잠깐 쉬었다 다시 시도한다.
            if i == retries - 1:
                raise
            time.sleep(2)


def normalize_address(addr):
    parts = (addr or "").split()
    if parts:
        parts[0] = REGION_ALIAS.get(parts[0], parts[0])
    return " ".join(parts)


def main():
    places = {}
    for share_id, grade in FOLDERS:
        data = fetch(share_id)
        print("%s: %d곳" % (data["folder"]["name"], len(data["bookmarkList"])))
        for b in data["bookmarkList"]:
            sid = b["sid"]
            if sid in places:
                places[sid]["grade"] = max(places[sid]["grade"], grade)
                continue
            address = normalize_address(b.get("address"))
            parts = address.split()
            places[sid] = {
                "id": sid,
                "name": b.get("displayName") or b["name"],
                "type": b.get("mcidName") or "기타",
                "grade": grade,
                "address": address,
                "region": parts[0] if parts else "",
                "district": " ".join(parts[:2]),
                "lat": b.get("py"),
                "lng": b.get("px"),
                "available": b.get("available", True),
                "memo": b.get("memo") or "",
                "saved": time.strftime("%Y-%m-%d", time.localtime((b.get("creationTime") or 0) / 1000)),
            }

    result = sorted(places.values(), key=lambda p: (-p["grade"], p["name"]))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("총 %d곳 -> %s" % (len(result), os.path.relpath(OUT)))


if __name__ == "__main__":
    main()
