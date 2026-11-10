// 레시피 페이지: 재료/단계 체크, 즐겨찾기, 화면 켜두기, 장보기 목록 복사
(function () {
  var C = window.COOKBOOK;
  var article = document.querySelector('.recipe');
  if (!article) return;
  var url = article.dataset.url;
  var key = 'check:' + url;

  // 최근 본 레시피 (최대 8개)
  var emojiEl = document.querySelector('.hero-emoji');
  var recent = C.store.get('recent', []).filter(function (r) { return r.url !== url; });
  recent.unshift({ url: url, title: article.dataset.title, emoji: emojiEl ? emojiEl.textContent.trim() : '🍽️' });
  C.store.set('recent', recent.slice(0, 8));

  // 재료 체크 + 단계 완료 표시 (페이지를 다시 열어도 유지)
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.ingredients input[type=checkbox]'));
  var steps = Array.prototype.slice.call(document.querySelectorAll('.steps ol > li'));
  var saved = C.store.get(key, { ing: [], step: [] });

  function save() {
    C.store.set(key, {
      ing: boxes.map(function (b, i) { return b.checked ? i : -1; }).filter(function (i) { return i >= 0; }),
      step: steps.map(function (s, i) { return s.classList.contains('done') ? i : -1; }).filter(function (i) { return i >= 0; })
    });
  }

  boxes.forEach(function (b, i) {
    b.checked = saved.ing.indexOf(i) !== -1;
    b.addEventListener('change', save);
  });
  steps.forEach(function (s, i) {
    s.classList.toggle('done', saved.step.indexOf(i) !== -1);
    s.addEventListener('click', function () { s.classList.toggle('done'); save(); });
  });
  document.getElementById('reset-ing').addEventListener('click', function () {
    boxes.forEach(function (b) { b.checked = false; });
    steps.forEach(function (s) { s.classList.remove('done'); });
    save();
  });

  // 즐겨찾기
  var favBtn = document.getElementById('fav-btn');
  function paintFav() {
    var on = C.favs.has(url);
    favBtn.textContent = on ? '★ 즐겨찾기됨' : '☆ 즐겨찾기';
    favBtn.classList.toggle('on', on);
  }
  favBtn.addEventListener('click', function () { C.favs.toggle(url); paintFav(); });
  paintFav();

  // 요리하는 동안 화면 꺼짐 방지 (Wake Lock API 지원 브라우저만)
  var wakeBtn = document.getElementById('wake-btn');
  var lock = null, wanted = false;
  if ('wakeLock' in navigator) {
    wakeBtn.hidden = false;
    var acquire = function () {
      return navigator.wakeLock.request('screen').then(function (l) {
        lock = l;
        lock.addEventListener('release', function () { lock = null; paintWake(); });
        paintWake();
      }).catch(function () { wanted = false; paintWake(); });
    };
    var paintWake = function () {
      wakeBtn.textContent = lock ? '🔆 화면 켜두는 중' : '🔆 화면 켜두기';
      wakeBtn.classList.toggle('on', !!lock);
    };
    wakeBtn.addEventListener('click', function () {
      wanted = !lock;
      if (lock) lock.release(); else acquire();
    });
    // 탭을 다시 보면 잠금 재획득
    document.addEventListener('visibilitychange', function () {
      if (wanted && !lock && document.visibilityState === 'visible') acquire();
    });
  }

  // 장보기 목록 복사
  var copyBtn = document.getElementById('copy-btn');
  copyBtn.addEventListener('click', function () {
    var lines = ['[' + article.dataset.title + '] 장보기'];
    document.querySelectorAll('.ingredients li').forEach(function (li) {
      var name = li.querySelector('.ing-name').textContent.trim();
      var amt = li.querySelector('.ing-amount');
      lines.push('- ' + name + (amt ? ' ' + amt.textContent.trim() : ''));
    });
    var text = lines.join('\n');
    var done = function () {
      copyBtn.textContent = '✅ 복사됨';
      setTimeout(function () { copyBtn.textContent = '📋 장보기 목록 복사'; }, 1500);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { prompt('복사하세요', text); });
    else prompt('복사하세요', text);
  });
})();
