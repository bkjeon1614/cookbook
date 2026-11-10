// 공통: localStorage 헬퍼, 테마 전환
(function () {
  var store = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem('cookbook:' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem('cookbook:' + key, JSON.stringify(value)); } catch (e) {}
    }
  };

  var favs = {
    list: function () { return store.get('favs', []); },
    has: function (url) { return favs.list().indexOf(url) !== -1; },
    toggle: function (url) {
      var list = favs.list();
      var i = list.indexOf(url);
      if (i === -1) list.push(url); else list.splice(i, 1);
      store.set('favs', list);
      return i === -1;
    }
  };

  window.COOKBOOK = Object.assign(window.COOKBOOK || {}, { store: store, favs: favs });

  var btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var root = document.documentElement;
      var dark = root.dataset.theme
        ? root.dataset.theme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('cookbook:theme', root.dataset.theme); } catch (e) {}
    });
  }
})();
