// 맛집 페이지: 등급·종류·지역 필터, 지도 표시
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var places = window.PLACES || [];
  var reviews = window.PLACE_REVIEWS || {};
  var GRADES = [
    { v: 2, label: '★★', color: '#d9622b' },
    { v: 1, label: '★', color: '#e0a100' },
    { v: 0, label: '☆', color: '#8a8178' }
  ];
  var state = { q: '', grade: '', type: '', region: '', reviewOnly: false };
  var current = [];
  var map, layer, markers = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
  function grade(v) { return GRADES.filter(function (g) { return g.v === v; })[0]; }
  function naverUrl(p) { return 'https://map.naver.com/p/entry/place/' + encodeURIComponent(p.id); }

  // ---------- URL 상태 ----------
  function readUrl() {
    var p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.grade = p.get('grade') || '';
    state.type = p.get('type') || '';
    state.region = p.get('region') || '';
    state.reviewOnly = p.get('review') === '1';
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.grade !== '') p.set('grade', state.grade);
    if (state.type) p.set('type', state.type);
    if (state.region) p.set('region', state.region);
    if (state.reviewOnly) p.set('review', '1');
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  function filter() {
    var terms = state.q.split(/\s+/).map(norm).filter(Boolean);
    return places.filter(function (p) {
      if (state.grade !== '' && String(p.grade) !== state.grade) return false;
      if (state.type && p.type !== state.type) return false;
      if (state.region && p.region !== state.region) return false;
      if (state.reviewOnly && !reviews[p.id]) return false;
      var hay = norm(p.name + '|' + p.address + '|' + p.type + '|' + p.memo);
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
  }

  // ---------- 렌더 ----------
  function item(p) {
    var g = grade(p.grade);
    var rv = (reviews[p.id] || []).map(function (r) {
      return '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">📝 ' + esc(r.title) + '</a>';
    }).join('');
    return '<div class="place" data-id="' + esc(p.id) + '">' +
      '<div class="place-head">' +
        '<span class="grade" style="color:' + g.color + '">' + g.label + '</span>' +
        '<button type="button" class="place-name">' + esc(p.name) + '</button>' +
        '<span class="place-type">' + esc(p.type) + '</span>' +
        (p.available ? '' : '<span class="place-closed">정보 없음</span>') +
      '</div>' +
      '<p class="place-addr">' + esc(p.address) + '</p>' +
      (p.memo ? '<p class="place-memo">' + esc(p.memo) + '</p>' : '') +
      '<div class="place-links"><a href="' + naverUrl(p) + '" target="_blank" rel="noopener">네이버지도</a>' + rv + '</div>' +
    '</div>';
  }

  function popup(p) {
    var g = grade(p.grade);
    var rv = (reviews[p.id] || []).map(function (r) {
      return '<br><a href="' + esc(r.url) + '" target="_blank" rel="noopener">📝 블로그 후기</a>';
    }).join('');
    return '<strong>' + g.label + ' ' + esc(p.name) + '</strong><br>' + esc(p.type) + ' · ' + esc(p.district) +
      '<br><a href="' + naverUrl(p) + '" target="_blank" rel="noopener">네이버지도에서 열기</a>' + rv;
  }

  function renderMap() {
    if (!window.L) return;
    if (!map) {
      map = L.map('map', { scrollWheelZoom: false }).setView([36.5, 127.8], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      layer = L.layerGroup().addTo(map);
    }
    layer.clearLayers();
    markers = {};
    var pts = [];
    // ☆ 를 먼저 그려서 ★★ 가 위에 오게 한다
    current.slice().sort(function (a, b) { return a.grade - b.grade; }).forEach(function (p) {
      if (p.lat == null || p.lng == null) return;
      var g = grade(p.grade);
      var m = L.circleMarker([p.lat, p.lng], {
        radius: 6 + p.grade * 2, color: '#fff', weight: 1.5, fillColor: g.color, fillOpacity: .9
      }).bindPopup(popup(p));
      m.addTo(layer);
      markers[p.id] = m;
      pts.push([p.lat, p.lng]);
    });
    if (pts.length) map.fitBounds(pts, { padding: [24, 24], maxZoom: 15 });
  }

  function render() {
    current = filter();
    $('place-list').innerHTML = current.length
      ? current.map(item).join('')
      : '<p class="empty">조건에 맞는 맛집이 없어요 🥲</p>';
    var desc = [];
    if (state.q) desc.push('"' + state.q + '"');
    if (state.grade !== '') desc.push(grade(+state.grade).label);
    if (state.type) desc.push(state.type);
    if (state.region) desc.push(state.region);
    if (state.reviewOnly) desc.push('후기 있음');
    $('place-info').textContent = (desc.length ? desc.join(' · ') + ' — ' : '') + current.length + '곳';

    [['grades', 'grade'], ['types', 'type'], ['regions', 'region']].forEach(function (pair) {
      document.querySelectorAll('#' + pair[0] + ' .chip').forEach(function (c) {
        c.classList.toggle('on', c.dataset.v === String(state[pair[1]]));
      });
    });
    $('review-only').checked = state.reviewOnly;
    renderMap();
    writeUrl();
  }

  function chips(id, key, values, count, label) {
    $(id).innerHTML = '<button type="button" class="chip" data-v="">전체</button>' +
      values.map(function (v) {
        return '<button type="button" class="chip" data-v="' + esc(v) + '">' + esc(label ? label(v) : v) +
          ' <small>' + count(v) + '</small></button>';
      }).join('');
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      state[key] = state[key] === b.dataset.v ? '' : b.dataset.v;
      render();
    });
  }

  function countBy(key) {
    var c = {};
    places.forEach(function (p) { c[p[key]] = (c[p[key]] || 0) + 1; });
    return c;
  }

  function init() {
    readUrl();
    var gc = countBy('grade'), tc = countBy('type'), rc = countBy('region');
    chips('grades', 'grade', ['2', '1', '0'], function (v) { return gc[v] || 0; }, function (v) { return grade(+v).label; });
    chips('types', 'type', Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; }), function (v) { return tc[v]; });
    chips('regions', 'region', Object.keys(rc).sort(function (a, b) { return rc[b] - rc[a]; }), function (v) { return rc[v]; });

    $('pq').value = state.q;
    $('pq').addEventListener('input', function () { state.q = this.value.trim(); render(); });
    $('review-only').addEventListener('change', function () { state.reviewOnly = this.checked; render(); });
    $('place-list').addEventListener('click', function (e) {
      var b = e.target.closest('.place-name'); if (!b) return;
      var m = markers[b.closest('.place').dataset.id];
      if (m && map) {
        map.setView(m.getLatLng(), 16);
        m.openPopup();
        $('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    $('place-random').addEventListener('click', function () {
      var pool = current.filter(function (p) { return p.available; });
      if (!pool.length) return;
      var p = pool[Math.floor(Math.random() * pool.length)];
      var el = document.querySelector('.place[data-id="' + p.id + '"] .place-name');
      if (el) el.click();
    });
    render();
  }

  init();
})();
