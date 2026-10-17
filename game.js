/* סוליטר מילים — לוגיקת המשחק */
(function () {
  'use strict';

  var CATEGORIES = [
    { name: 'פירות',       words: ['תפוח', 'בננה', 'ענבים', 'אגס'] },
    { name: 'צבעים',       words: ['אדום', 'כחול', 'ירוק', 'צהוב', 'סגול'] },
    { name: 'חיות',        words: ['כלב', 'חתול', 'סוס', 'פיל', 'זברה', 'נמר'] },
    { name: 'ערים בישראל', words: ['ירושלים', 'חיפה', 'אילת', 'צפת', 'טבריה'] },
    { name: 'כלי נגינה',   words: ['כינור', 'חליל', 'תוף', 'פסנתר'] },
    { name: 'ימות השבוע',  words: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] },
    { name: 'מקצועות',     words: ['רופא', 'מורה', 'נגר', 'טייס', 'שופט'] },
    { name: 'ירקות',       words: ['גזר', 'מלפפון', 'עגבנייה', 'בצל', 'חסה', 'קישוא'] },
    { name: 'תחבורה',      words: ['אופניים', 'אוטובוס', 'רכבת'] },
    { name: 'רהיטים',      words: ['שולחן', 'כיסא', 'ספה', 'מיטה', 'ארון', 'כוננית', 'שידה', 'כורסה'] }
  ];

  var PILE_SIZES = [4, 5, 6, 7, 7, 8, 8, 9, 9];   // סך הכול 63 קלפים
  var SLOTS = 4;

  /* ---------- חפיסה ---------- */

  var DECK = [];
  (function buildDeck() {
    var id = 0;
    CATEGORIES.forEach(function (cat, ci) {
      DECK.push({ id: id++, type: 'cat', cat: ci, text: cat.name });
      cat.words.forEach(function (w) {
        DECK.push({ id: id++, type: 'word', cat: ci, text: w });
      });
    });
  })();

  function size(ci) { return CATEGORIES[ci].words.length; }

  /* ---------- אקראיות עם זרע ---------- */

  function rngFrom(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(list, rnd) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function deal(seed) {
    var rnd = rngFrom(seed);
    var cards = shuffled(DECK, rnd);
    var tab = [], k = 0;
    PILE_SIZES.forEach(function (n) {
      tab.push(cards.slice(k, k + n));
      k += n;
    });
    return tab;
  }

  /* ---------- בדיקת פתירוּת ---------- */
  /* משחק אוטומטי חמדני עם בחירות אקראיות; חלוקה נבחרת רק אם נמצא לה פתרון. */

  function trialState(tab) {
    return {
      tab: tab.map(function (p) { return p.map(function (c) { return { t: c.type, c: c.cat }; }); }),
      hold: [],
      found: [null, null, null, null]
    };
  }

  function trialWon(s) {
    return s.hold.length === 0 &&
      s.found.every(function (f) { return f === null; }) &&
      s.tab.every(function (p) { return p.length === 0; });
  }

  function putOnFoundation(s, card, slot) {
    if (card.t === 'cat') { s.found[slot] = { cat: card.c, n: 0 }; return; }
    var f = s.found[slot];
    f.n++;
    if (f.n === size(f.cat)) s.found[slot] = null;
  }

  function playable(s, card) {
    if (card.t === 'cat') return s.found.indexOf(null);
    for (var i = 0; i < SLOTS; i++) if (s.found[i] && s.found[i].cat === card.c) return i;
    return -1;
  }

  function playout(s, rnd) {
    for (var step = 0; step < 4000; step++) {
      if (trialWon(s)) return true;

      var tops = [];
      for (var i = 0; i < s.tab.length; i++) {
        if (s.tab[i].length) tops.push({ k: 't', i: i, card: s.tab[i][s.tab[i].length - 1] });
      }
      if (s.hold.length) tops.push({ k: 'h', card: s.hold[s.hold.length - 1] });
      if (!tops.length) return false;

      // 1. מילה שהקטגוריה שלה פתוחה למעלה — תמיד כדאי
      var moved = null;
      for (var a = 0; a < tops.length && !moved; a++) {
        if (tops[a].card.t === 'word') {
          var slot = playable(s, tops[a].card);
          if (slot >= 0) moved = { src: tops[a], slot: slot };
        }
      }
      if (moved) {
        var c1 = moved.src.k === 'h' ? s.hold.pop() : s.tab[moved.src.i].pop();
        putOnFoundation(s, c1, moved.slot);
        continue;
      }

      // 2. קלף קטגוריה למקום ריק
      var empty = s.found.indexOf(null);
      if (empty >= 0 && rnd() < 0.9) {
        var cands = tops.filter(function (t) { return t.card.t === 'cat'; });
        if (cands.length) {
          var pick = cands[Math.floor(rnd() * cands.length)];
          var c2 = pick.k === 'h' ? s.hold.pop() : s.tab[pick.i].pop();
          putOnFoundation(s, c2, empty);
          continue;
        }
      }

      // 3. פינוי ערמת ההמתנה, רק אם הקלף שמתחת שמיש מיד
      if (s.hold.length >= 2) {
        var top = s.hold[s.hold.length - 1];
        var below = s.hold[s.hold.length - 2];
        if (top.t === 'word' && playable(s, below) >= 0) {
          var seats = [];
          for (var b = 0; b < s.tab.length; b++) {
            var tc = s.tab[b][s.tab[b].length - 1];
            if (tc && tc.c === top.c) seats.push(b);
          }
          if (seats.length) {
            s.tab[seats[Math.floor(rnd() * seats.length)]].push(s.hold.pop());
            continue;
          }
        }
      }

      // 4. העברת קלף מהלוח לערמת ההמתנה
      var open = [];
      for (var d = 0; d < s.tab.length; d++) if (s.tab[d].length) open.push(d);
      if (!open.length) return false;
      var p = open[Math.floor(rnd() * open.length)];
      s.hold.push(s.tab[p].pop());
    }
    return false;
  }

  function solvable(tab, attempts, rnd) {
    for (var i = 0; i < attempts; i++) {
      if (playout(trialState(tab), rnd)) return true;
    }
    return false;
  }

  function findSeed(startSeed) {
    var rnd = rngFrom(startSeed ^ 0x9e3779b9);
    for (var tries = 0; tries < 300; tries++) {
      var seed = (startSeed + tries * 2654435761) >>> 0;
      if (solvable(deal(seed), 160, rnd)) return seed;
    }
    return startSeed;
  }

  /* ---------- מצב המשחק ---------- */

  var state = null;
  var history = [];
  var selected = null;          // { kind:'tab'|'hold', index:number }
  var timerId = null;

  function newState(seed) {
    return {
      seed: seed,
      tab: deal(seed),
      hold: [],
      found: [null, null, null, null],   // { cat, cards:[] }
      moves: 0,
      errors: 0,
      started: 0,
      elapsed: 0,
      won: false
    };
  }

  function snapshot() {
    return {
      tab: state.tab.map(function (p) { return p.map(function (c) { return c.id; }); }),
      hold: state.hold.map(function (c) { return c.id; }),
      found: state.found.map(function (f) {
        return f ? { cat: f.cat, cards: f.cards.map(function (c) { return c.id; }) } : null;
      }),
      moves: state.moves
    };
  }

  function restore(snap) {
    state.tab = snap.tab.map(function (p) { return p.map(function (id) { return DECK[id]; }); });
    state.hold = snap.hold.map(function (id) { return DECK[id]; });
    state.found = snap.found.map(function (f) {
      return f ? { cat: f.cat, cards: f.cards.map(function (id) { return DECK[id]; }) } : null;
    });
    state.moves = snap.moves;
  }

  /* ---------- חוקי המשחק ---------- */

  function sourceCard(src) {
    if (!src) return null;
    if (src.kind === 'hold') return state.hold[state.hold.length - 1] || null;
    var p = state.tab[src.index];
    return p[p.length - 1] || null;
  }

  function legal(card, dest) {
    if (!card) return false;
    if (dest.kind === 'hold') return true;
    if (dest.kind === 'found') {
      var f = state.found[dest.index];
      if (!f) return card.type === 'cat';
      return card.type === 'word' && card.cat === f.cat;
    }
    var pile = state.tab[dest.index];
    if (!pile.length) return false;
    var top = pile[pile.length - 1];
    return card.type === 'word' && top.cat === card.cat;
  }

  function takeCard(src) {
    return src.kind === 'hold' ? state.hold.pop() : state.tab[src.index].pop();
  }

  function attempt(src, dest) {
    if (!src) return;
    if (src.kind === dest.kind && src.index === dest.index) { select(null); return; }

    var card = sourceCard(src);
    if (!legal(card, dest)) {
      state.errors++;
      startClock();
      flash(dest);
      select(null);
      render();
      return;
    }

    history.push(snapshot());
    takeCard(src);

    if (dest.kind === 'hold') {
      state.hold.push(card);
    } else if (dest.kind === 'found') {
      if (!state.found[dest.index]) {
        state.found[dest.index] = { cat: card.cat, cards: [card] };
      } else {
        var f = state.found[dest.index];
        f.cards.push(card);
        if (f.cards.length === size(f.cat) + 1) state.found[dest.index] = null;
      }
    } else {
      state.tab[dest.index].push(card);
    }

    state.moves++;
    startClock();
    select(null);
    checkWin();
    render();
  }

  function checkWin() {
    var clear = state.hold.length === 0 &&
      state.found.every(function (f) { return f === null; }) &&
      state.tab.every(function (p) { return p.length === 0; });
    if (clear && !state.won) {
      state.won = true;
      stopClock();
      showWin();
    }
  }

  /* ---------- שעון ---------- */

  function startClock() {
    if (state.started || state.won) return;
    state.started = Date.now();
    timerId = setInterval(function () {
      state.elapsed = Math.floor((Date.now() - state.started) / 1000);
      paintStats();
    }, 250);
  }

  function stopClock() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (state && state.started) state.elapsed = Math.floor((Date.now() - state.started) / 1000);
  }

  function clockText(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ---------- תצוגה ---------- */

  var elFound = document.getElementById('foundations');
  var elHold = document.getElementById('holding');
  var elTab = document.getElementById('tableau');
  var elMoves = document.getElementById('stat-moves');
  var elTime = document.getElementById('stat-time');
  var elErrors = document.getElementById('stat-errors');
  var elWin = document.getElementById('win');

  function cardEl(card, faceUp) {
    var d = document.createElement('div');
    if (!faceUp) { d.className = 'card card--back'; return d; }
    d.className = 'card ' + (card.type === 'cat' ? 'card--cat' : 'card--word');
    var t = document.createElement('span');
    t.className = 'card-text';
    t.textContent = card.text;
    d.appendChild(t);
    if (card.type === 'cat') {
      var n = document.createElement('span');
      n.className = 'card-count';
      n.textContent = size(card.cat);
      d.appendChild(n);
    }
    return d;
  }

  function paintStats() {
    elMoves.textContent = state.moves;
    elTime.textContent = clockText(state.elapsed);
    elErrors.textContent = state.errors;
  }

  function renderFoundations() {
    elFound.innerHTML = '';
    for (var i = 0; i < SLOTS; i++) {
      var f = state.found[i];
      var slot = document.createElement('div');
      slot.className = 'slot' + (f ? '' : ' slot--empty');
      slot.dataset.kind = 'found';
      slot.dataset.index = i;

      var head = document.createElement('div');
      head.className = 'slot-head';
      if (f) {
        var nm = document.createElement('span');
        nm.className = 'slot-name';
        nm.textContent = CATEGORIES[f.cat].name;
        var pr = document.createElement('span');
        pr.className = 'slot-progress';
        pr.textContent = (f.cards.length - 1) + ' / ' + size(f.cat);
        head.appendChild(nm);
        head.appendChild(pr);
      } else {
        head.innerHTML = '<span class="slot-name slot-name--idle">מקום פנוי</span>';
      }

      var pile = document.createElement('div');
      pile.className = 'pile pile--single';
      if (f) {
        pile.appendChild(cardEl(f.cards[f.cards.length - 1], true));
      } else {
        var ph = document.createElement('div');
        ph.className = 'ghost';
        ph.textContent = 'קלף קטגוריה';
        pile.appendChild(ph);
      }

      slot.appendChild(head);
      slot.appendChild(pile);
      elFound.appendChild(slot);
    }
  }

  function renderHold() {
    elHold.innerHTML = '';
    var slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.kind = 'hold';
    slot.dataset.index = 0;

    var head = document.createElement('div');
    head.className = 'slot-head';
    head.innerHTML = '<span class="slot-name slot-name--idle">בהמתנה</span>' +
      '<span class="slot-progress">' + state.hold.length + '</span>';

    var pile = document.createElement('div');
    pile.className = 'pile';
    var n = state.hold.length;
    var show = Math.min(n, 6);
    pile.style.height = 'calc(var(--ch) + ' + (show > 0 ? show - 1 : 0) + ' * var(--fan-tight))';
    if (!n) {
      pile.classList.add('pile--single');
      var ph = document.createElement('div');
      ph.className = 'ghost';
      ph.textContent = 'כל קלף';
      pile.appendChild(ph);
    } else {
      for (var k = 0; k < show; k++) {
        var idx = n - show + k;
        var c = cardEl(state.hold[idx], idx === n - 1);
        c.style.top = 'calc(' + k + ' * var(--fan-tight))';
        if (idx === n - 1 && isSelected('hold', 0)) c.classList.add('is-selected');
        pile.appendChild(c);
      }
    }

    slot.appendChild(head);
    slot.appendChild(pile);
    elHold.appendChild(slot);
  }

  function renderTableau() {
    elTab.innerHTML = '';
    state.tab.forEach(function (cards, i) {
      var pile = document.createElement('div');
      pile.className = 'pile pile--col' + (cards.length ? '' : ' pile--done');
      pile.dataset.kind = 'tab';
      pile.dataset.index = i;
      pile.style.height = 'calc(var(--ch) + ' + Math.max(0, cards.length - 1) + ' * var(--fan))';
      if (!cards.length) {
        pile.style.height = 'var(--ch)';
        var ph = document.createElement('div');
        ph.className = 'ghost ghost--done';
        ph.textContent = 'ריק';
        pile.appendChild(ph);
      } else {
        cards.forEach(function (c, k) {
          var up = k === cards.length - 1;
          var el = cardEl(c, up);
          el.style.top = 'calc(' + k + ' * var(--fan))';
          if (up && isSelected('tab', i)) el.classList.add('is-selected');
          pile.appendChild(el);
        });
      }
      elTab.appendChild(pile);
    });
  }

  function isSelected(kind, index) {
    return selected && selected.kind === kind && selected.index === index;
  }

  function render() {
    renderFoundations();
    renderHold();
    renderTableau();
    paintStats();
    document.getElementById('btn-undo').disabled = history.length === 0 || state.won;
  }

  function flash(dest) {
    var sel = '[data-kind="' + dest.kind + '"][data-index="' + dest.index + '"]';
    var node = document.querySelector(sel);
    if (!node) return;
    node.classList.remove('is-wrong');
    void node.offsetWidth;
    node.classList.add('is-wrong');
    setTimeout(function () { node.classList.remove('is-wrong'); }, 420);
  }

  function select(src) {
    selected = src;
  }

  /* ---------- קלט ---------- */

  function targetFrom(ev) {
    var node = ev.target.closest('[data-kind]');
    if (!node) return null;
    return { kind: node.dataset.kind, index: parseInt(node.dataset.index, 10) };
  }

  function canPickUp(t) {
    if (!t) return false;
    if (t.kind === 'hold') return state.hold.length > 0;
    if (t.kind === 'tab') return state.tab[t.index].length > 0;
    return false;
  }

  document.querySelector('.board').addEventListener('click', function (ev) {
    if (state.won) return;
    var t = targetFrom(ev);
    if (!t) { select(null); render(); return; }

    if (selected) {
      attempt(selected, t);
      return;
    }
    if (canPickUp(t)) {
      select(t);
      render();
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { select(null); render(); }
  });

  /* ---------- כפתורים ---------- */

  function start(seed) {
    stopClock();
    state = newState(seed);
    history = [];
    selected = null;
    elWin.hidden = true;
    render();
  }

  document.getElementById('btn-new').addEventListener('click', function () {
    start(findSeed((Math.random() * 0xffffffff) >>> 0));
  });

  document.getElementById('btn-restart').addEventListener('click', function () {
    start(state.seed);
  });

  document.getElementById('btn-undo').addEventListener('click', function () {
    if (!history.length || state.won) return;
    restore(history.pop());
    if (state.moves > 0) state.moves--;
    selected = null;
    render();
  });

  document.getElementById('btn-again').addEventListener('click', function () {
    start(findSeed((Math.random() * 0xffffffff) >>> 0));
  });

  function showWin() {
    document.getElementById('win-moves').textContent = state.moves;
    document.getElementById('win-time').textContent = clockText(state.elapsed);
    document.getElementById('win-errors').textContent = state.errors;
    elWin.hidden = false;
  }

  /* ---------- הפעלה ---------- */

  function boot(saved) {
    if (saved && saved.state) {
      state = newState(saved.state.seed);
      restore(saved.state.snap);
      state.errors = saved.state.errors;
      state.elapsed = saved.state.elapsed;
      state.won = saved.state.won;
      history = [];
      render();
      if (!state.won && state.elapsed) {
        state.started = Date.now() - state.elapsed * 1000;
        timerId = setInterval(function () {
          state.elapsed = Math.floor((Date.now() - state.started) / 1000);
          paintStats();
        }, 250);
      }
      return;
    }
    start(findSeed((Math.random() * 0xffffffff) >>> 0));
  }

  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(function () {
      return {
        state: {
          seed: state.seed, snap: snapshot(), errors: state.errors,
          elapsed: state.elapsed, won: state.won
        }
      };
    });
  }
  if (hot && hot.ready) hot.ready(boot); else boot(null);
})();
