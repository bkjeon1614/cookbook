# cookbook
봉구리의 요리책 — GitHub Pages 로 운영하는 나만의 레시피 모음

👉 https://bkjeon1614.github.io/cookbook

## 기능

- **요리로 찾기**: 요리 이름·카테고리·태그·재료를 한 번에 검색 (띄어쓰기로 여러 단어 AND 검색)
- **재료로 찾기**: 가진 재료를 칩으로 입력하면 겹치는 재료가 많은 순으로 추천하고, 부족한 재료를 알려줌
  - "입력한 재료가 모두 들어간 요리만" 옵션, 전체 재료 목록에서 클릭으로 선택
- 카테고리 필터, ★ 즐겨찾기, 🎲 랜덤 추천, 최근 본 레시피
- 레시피 화면
  - 재료 체크리스트 / 단계 누르면 완료 표시 (새로고침해도 유지)
  - 🔆 화면 켜두기 (요리 중 화면 꺼짐 방지, 지원 브라우저만)
  - 📋 장보기 목록 복사, 🖨 인쇄용 레이아웃
- 사진은 선택 (없으면 이모지로 표시), 다크 모드, 모바일 대응
- 검색 상태가 URL 에 남아서 링크로 공유 가능 (예: `?ing=대파,마늘`)

즐겨찾기·체크 상태·최근 본 레시피는 브라우저(localStorage)에만 저장됩니다.

## 레시피 추가하기

1. `recipe-template.md` 를 복사해서 `_recipes/영문-파일명.md` 로 저장 (파일명이 주소가 됨: `/recipes/영문-파일명/`)
2. 앞부분(front matter)을 채우고, 아래에 `1. 2. 3.` 으로 단계를 적는다
3. 사진을 넣고 싶으면 `assets/images/` 에 올리고 `image: /assets/images/파일명.jpg`
4. 커밋 & 푸시하면 1~2분 뒤 사이트에 반영

재료는 `이름 | 분량` 형식으로 적습니다. 재료 검색은 `|` 앞의 이름으로 하고,
`미림(맛술)` 처럼 괄호로 별칭을 적어두면 `미림`, `맛술` 어느 쪽으로도 검색됩니다.

GitHub 웹에서 바로 추가해도 됩니다: 저장소 → `_recipes` → **Add file → Create new file**.

## 맛집 (봉슐랭가이드)

`/places/` 페이지 — 네이버지도에 저장한 맛집을 지도와 목록으로 보여준다.
등급(★★ / ★ / ☆), 종류, 지역 필터와 검색, 블로그 후기 링크를 지원한다.

- 데이터: `_data/places.json` (스크립트가 생성, 직접 고치지 않는다)
- 블로그 후기 연결: `_data/place_reviews.yml` (네이버지도 장소 ID → 후기 링크, 직접 관리)

네이버지도에 맛집을 새로 저장했으면 아래를 실행하고 커밋·푸시한다.

```sh
python3 scripts/import_naver_places.py
```

공유 폴더를 바꾸거나 추가할 때는 `scripts/import_naver_places.py` 의 `FOLDERS` 를 고친다.
폴더는 네이버지도에서 '공개 + 공유' 상태여야 한다. (네이버지도 공유 페이지의 비공식 API 를 쓰므로 바뀔 수 있음)

## GitHub Pages 설정 (최초 1회)

저장소 **Settings → Pages → Build and deployment**
- Source: `Deploy from a branch`
- Branch: `main` / `/ (root)`

## 로컬 미리보기 (선택)

```sh
bundle install
bundle exec jekyll serve
# http://localhost:4000/cookbook/
```

## 구조

```
_config.yml          사이트 설정
_recipes/            레시피 (마크다운 1개 = 요리 1개)
_layouts/            페이지 틀 (default, recipe)
index.html           메인(검색) 페이지
places.html          맛집 지도 페이지
_data/               맛집 데이터, 블로그 후기 연결
scripts/             네이버지도 맛집 가져오기
search.json          검색 인덱스 (빌드 시 자동 생성)
assets/css, js       스타일, 검색/레시피 스크립트
recipe-template.md   새 레시피 템플릿
```
