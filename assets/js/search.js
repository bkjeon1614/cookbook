// 메인 페이지: 요리/재료 검색, 카테고리·즐겨찾기 필터
(function () {
  var C = window.COOKBOOK;
  var $ = function (id) { return document.getElementById(id); };

  var state = { mode: 'dish', q: '', ings: [], allIngs: false, cat: '', favOnly: false };
  var recipes = [];
  var current = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
  // "미림(맛술)" -> "미림"
  function baseName(s) { return norm(String(s).replace(/\(.*?\)/g, '')); }

  function ingMatches(recipeIng, term) {
    var n = norm(recipeIng), t = norm(term), b = baseName(recipeIng);
    if (!t) return false;
    return n.indexOf(t) !== -1 || (b.length > 1 && t.indexOf(b) !== -1);
  }

  // ---------- URL 상태 ----------
  function readUrl() {
    var p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.ings = (p.get('ing') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    state.cat = p.get('cat') || '';
    state.favOnly = p.get('fav') === '1';
    state.allIngs = p.get('all') === '1';
    state.mode = p.get('mode') === 'ing' || state.ings.length ? 'ing' : 'dish';
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.mode === 'ing') p.set('mode', 'ing');
    if (state.q) p.set('q', state.q);
    if (state.ings.length) p.set('ing', state.ings.join(','));
    if (state.allIngs) p.set('all', '1');
    if (state.cat) p.set('cat', state.cat);
    if (state.favOnly) p.set('fav', '1');
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  // ---------- 필터 ----------
  function filter() {
    var favs = C.favs.list();
    var list = recipes.filter(function (r) {
      if (state.cat && r.category !== state.cat) return false;
      if (state.favOnly && favs.indexOf(r.url) === -1) return false;
      return true;
    });

    if (state.mode === 'dish') {
      var terms = state.q.split(/\s+/).map(norm).filter(Boolean);
      if (!terms.length) return list.map(function (r) { return { r: r }; });
      return list.map(function (r) {
        var title = norm(r.title);
        var hay = [r.title, r.category].concat(r.tags, r.ingredients).map(norm).join('|');
        var ok = terms.every(function (t) { return hay.indexOf(t) !== -1; });
        if (!ok) return null;
        var score = terms.filter(function (t) { return title.indexOf(t) !== -1; }).length;
        return { r: r, score: score };
      }).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
    }

    // 재료 모드
    if (!state.ings.length) return list.map(function (r) { return { r: r }; });
    return list.map(function (r) {
      var have = state.ings.filter(function (t) {
        return r.ingredients.some(function (i) { return ingMatches(i, t); });
      });
      var missing = r.ingredients.filter(function (i) {
        return !state.ings.some(function (t) { return ingMatches(i, t); });
      });
      if (!have.length) return null;
      if (state.allIngs && have.length < state.ings.length) return null;
      return { r: r, have: have.length, missing: missing };
    }).filter(Boolean).sort(function (a, b) {
      return b.have - a.have || a.missing.length - b.missing.length;
    });
  }

  // ---------- 렌더 ----------
  function card(item) {
    var r = item.r;
    var fav = C.favs.has(r.url);
    var thumb = r.image
      ? '<img src="' + esc(r.image) + '" alt="" loading="lazy">'
      : '<span class="thumb-emoji">' + esc(r.emoji) + '</span>';
    var meta = [r.category, r.time, r.difficulty].filter(Boolean).map(esc).join(' · ');
    var extra = '';
    if (item.missing) {
      extra = '<p class="match">✅ 재료 ' + item.have + '/' + state.ings.length + ' 일치' +
        (item.missing.length
          ? '<br><span class="missing">더 필요: ' + item.missing.map(esc).join(', ') + '</span>'
          : '<br><span class="have-all">모든 재료 보유!</span>') + '</p>';
    }
    return '<a class="recipe-card" href="' + esc(r.url) + '">' +
      '<div class="thumb">' + thumb + (fav ? '<span class="fav-badge">★</span>' : '') + '</div>' +
      '<div class="card-body"><h3>' + esc(r.title) + '</h3>' +
      '<p class="card-meta">' + meta + '</p>' + extra + '</div></a>';
  }

  function render() {
    current = filter();
    $('results').innerHTML = current.length
      ? current.map(card).join('')
      : '<p class="empty">찾는 레시피가 없어요 🥲</p>';

    var desc = [];
    if (state.mode === 'dish' && state.q) desc.push('"' + state.q + '"');
    if (state.mode === 'ing' && state.ings.length) desc.push('재료: ' + state.ings.join(', '));
    if (state.cat) desc.push(state.cat);
    if (state.favOnly) desc.push('즐겨찾기');
    $('result-info').textContent = (desc.length ? desc.join(' · ') + ' — ' : '') + current.length + '개';

    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.mode === state.mode);
    });
    document.querySelector('.mode-dish').hidden = state.mode !== 'dish';
    document.querySelector('.mode-ing').hidden = state.mode !== 'ing';

    $('ing-chips').innerHTML = state.ings.map(function (t, i) {
      return '<button type="button" class="chip on" data-i="' + i + '">' + esc(t) + ' ✕</button>';
    }).join('');
    document.querySelectorAll('#cats .chip').forEach(function (c) {
      c.classList.toggle('on', c.dataset.cat === state.cat);
    });
    document.querySelectorAll('#ing-cloud .chip').forEach(function (c) {
      c.classList.toggle('on', state.ings.indexOf(c.dataset.ing) !== -1);
    });
    $('fav-only').checked = state.favOnly;
    $('ing-all').checked = state.allIngs;
    writeUrl();
  }

  function renderStatic() {
    var cats = {}, ings = {};
    recipes.forEach(function (r) {
      cats[r.category] = (cats[r.category] || 0) + 1;
      r.ingredients.forEach(function (i) { ings[i] = (ings[i] || 0) + 1; });
    });
    $('cats').innerHTML = '<button type="button" class="chip" data-cat="">전체</button>' +
      Object.keys(cats).sort().map(function (c) {
        return '<button type="button" class="chip" data-cat="' + esc(c) + '">' + esc(c) + ' <small>' + cats[c] + '</small></button>';
      }).join('');

    // 많이 쓰이는 재료 순
    var names = Object.keys(ings).sort(function (a, b) { return ings[b] - ings[a] || a.localeCompare(b, 'ko'); });
    $('ing-cloud').innerHTML = names.map(function (n) {
      return '<button type="button" class="chip" data-ing="' + esc(n) + '">' + esc(n) + '</button>';
    }).join('');
    $('ing-list').innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');

    var recent = C.store.get('recent', []);
    if (recent.length) {
      $('recent-wrap').hidden = false;
      $('recent').innerHTML = recent.map(function (r) {
        return '<a class="chip" href="' + esc(r.url) + '">' + esc(r.emoji || '') + ' ' + esc(r.title) + '</a>';
      }).join('');
    }
  }

  function addIng(v) {
    v = v.trim();
    if (v && state.ings.indexOf(v) === -1) state.ings.push(v);
    render();
  }

  // ---------- 이벤트 ----------
  function bind() {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        state.mode = t.dataset.mode;
        render();
        (state.mode === 'dish' ? $('q') : $('ing-input')).focus();
      });
    });

    $('q').value = state.q;
    $('q').addEventListener('input', function () { state.q = this.value.trim(); render(); });

    var ingInput = $('ing-input');
    ingInput.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return; // 한글 조합 중 Enter 무시
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addIng(this.value); this.value = '';
      } else if (e.key === 'Backspace' && !this.value && state.ings.length) {
        state.ings.pop(); render();
      }
    });
    // datalist 에서 항목을 고르면 바로 추가
    ingInput.addEventListener('input', function (e) {
      if (!e.inputType || e.inputType === 'insertReplacementText') {
        var v = this.value;
        if (recipes.some(function (r) { return r.ingredients.indexOf(v) !== -1; })) { addIng(v); this.value = ''; }
      }
    });

    $('ing-chips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      state.ings.splice(+b.dataset.i, 1); render();
    });
    $('ing-cloud').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      var i = state.ings.indexOf(b.dataset.ing);
      if (i === -1) state.ings.push(b.dataset.ing); else state.ings.splice(i, 1);
      render();
    });
    $('cats').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      state.cat = state.cat === b.dataset.cat ? '' : b.dataset.cat; render();
    });
    $('fav-only').addEventListener('change', function () { state.favOnly = this.checked; render(); });
    $('ing-all').addEventListener('change', function () { state.allIngs = this.checked; render(); });
    $('random-btn').addEventListener('click', function () {
      var pool = current.length ? current : recipes.map(function (r) { return { r: r }; });
      if (pool.length) location.href = pool[Math.floor(Math.random() * pool.length)].r.url;
    });
  }

  readUrl();
  fetch(C.baseurl + '/search.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      recipes = data;
      renderStatic();
      bind();
      render();
    })
    .catch(function () {
      $('results').innerHTML = '<p class="empty">레시피 목록을 불러오지 못했어요.</p>';
    });
})();
