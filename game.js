/* סוליטר מילים — לוגיקת המשחק */
(function () {
  'use strict';

  var CATEGORIES = [
    { name: 'פירות',       words: ['תפוח', 'בננה', 'ענבים', 'אגס'] },
    { name: 'צבעים',       words: ['אדום', 'כחול', 'ירוק', 'צהוב', 'סגול'] },
    { name: 'חיות',        words: ['כלב', 'חתול', 'סוס', 'פיל', 'זברה', 'נמר'] },
    { name: 'ערים',        words: ['ירושלים', 'חיפה', 'אילת', 'צפת', 'טבריה'] },
    { name: 'כלי נגינה',   words: ['כינור', 'חליל', 'תוף', 'פסנתר'] },
    { name: 'ימות השבוע',  words: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] },
    { name: 'מקצועות',     words: ['רופא', 'מורה', 'נגר', 'טייס', 'שופט'] },
    { name: 'ירקות',       words: ['גזר', 'מלפפון', 'עגבנייה', 'בצל', 'חסה', 'קישוא'] },
    { name: 'תחבורה',      words: ['אופניים', 'אוטובוס', 'רכבת'] },
    { name: 'רהיטים',      words: ['שולחן', 'כיסא', 'ספה', 'מיטה', 'ארון', 'כוננית', 'שידה', 'כורסה'] }
  ];

  var TAB_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];   // 36 קלפים בלוח, 27 בחפיסה
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
    var cards = shuffled(DECK, rngFrom(seed));
    var tab = [], k = 0;
    TAB_SIZES.forEach(function (n) {
      tab.push({ cards: cards.slice(k, k + n), down: n - 1 });
      k += n;
    });
    return { tab: tab, stock: cards.slice(k) };
  }

  /* ---------- בדיקת פתירוּת ---------- */
  /* כל קלף בחפיסה זמין בדפדוף, ולכן היא נשמרת כאוסף. מה שחוסם הוא הלוח:
     קלף עליון שאין לו יעד קובר את כל מה שתחתיו. */

  function trialState(d) {
    return {
      tab: d.tab.map(function (p) {
        return p.cards.map(function (c) { return { t: c.type, c: c.cat }; });
      }),
      stock: d.stock.map(function (c) { return { t: c.type, c: c.cat }; }),
      found: [null, null, null, null]
    };
  }

  function trialWon(s) {
    return s.stock.length === 0 &&
      s.found.every(function (f) { return f === null; }) &&
      s.tab.every(function (p) { return p.length === 0; });
  }

  function slotFor(s, card) {
    for (var i = 0; i < SLOTS; i++) if (s.found[i] && s.found[i].cat === card.c) return i;
    return -1;
  }

  function toFoundation(s, card, slot) {
    if (card.t === 'cat') { s.found[slot] = { cat: card.c, n: 0 }; return; }
    var f = s.found[slot];
    f.n++;
    if (f.n === size(f.cat)) s.found[slot] = null;
  }

  function playout(s, rnd) {
    for (var step = 0; step < 3000; step++) {
      if (trialWon(s)) return true;

      // 1. מילה שקטגוריה שלה כבר פתוחה — תמיד כדאי, מהלוח ומהחפיסה כאחד
      var acted = false;
      for (var i = 0; i < s.tab.length && !acted; i++) {
        var p = s.tab[i];
        if (!p.length) continue;
        var c = p[p.length - 1];
        if (c.t !== 'word') continue;
        var sl = slotFor(s, c);
        if (sl >= 0) { p.pop(); toFoundation(s, c, sl); acted = true; }
      }
      if (acted) continue;
      for (var j = 0; j < s.stock.length; j++) {
        var sc = s.stock[j];
        if (sc.t !== 'word') continue;
        var sl2 = slotFor(s, sc);
        if (sl2 >= 0) { s.stock.splice(j, 1); toFoundation(s, sc, sl2); acted = true; break; }
      }
      if (acted) continue;

      // 2. פתיחת קטגוריה במקום פנוי
      var empty = s.found.indexOf(null);
      if (empty >= 0) {
        var cands = [];
        for (var a = 0; a < s.tab.length; a++) {
          var q = s.tab[a];
          if (q.length && q[q.length - 1].t === 'cat') cands.push({ k: 't', i: a });
        }
        for (var b = 0; b < s.stock.length; b++) {
          if (s.stock[b].t === 'cat') cands.push({ k: 's', i: b });
        }
        if (cands.length) {
          var pick = cands[Math.floor(rnd() * cands.length)];
          var card = pick.k === 't' ? s.tab[pick.i].pop() : s.stock.splice(pick.i, 1)[0];
          toFoundation(s, card, empty);
          continue;
        }
      }

      // 3. העברה בתוך הלוח, כדי לחשוף את מה שמתחת
      var moves = [];
      for (var x = 0; x < s.tab.length; x++) {
        var px = s.tab[x];
        if (!px.length) continue;
        var cx = px[px.length - 1];
        if (cx.t !== 'word') continue;
        for (var y = 0; y < s.tab.length; y++) {
          if (y === x || !s.tab[y].length) continue;
          if (s.tab[y][s.tab[y].length - 1].c === cx.c) moves.push([x, y]);
        }
      }
      if (moves.length) {
        var m = moves[Math.floor(rnd() * moves.length)];
        s.tab[m[1]].push(s.tab[m[0]].pop());
        continue;
      }

      return false;
    }
    return false;
  }

  function findSeed(startSeed) {
    var rnd = rngFrom(startSeed ^ 0x9e3779b9);
    for (var tries = 0; tries < 200; tries++) {
      var seed = (startSeed + tries * 2654435761) >>> 0;
      var d = deal(seed);
      for (var k = 0; k < 140; k++) {
        if (playout(trialState(d), rnd)) return seed;
      }
    }
    return startSeed;
  }

  /* ---------- מצב המשחק ---------- */

  var state = null;
  var history = [];
  var selected = null;          // { kind:'tab'|'stock', index }
  var timerId = null;

  function newState(seed) {
    var d = deal(seed);
    return {
      seed: seed,
      tab: d.tab,
      stock: d.stock,
      at: 0,                        // הקלף הזמין בחפיסה
      found: [null, null, null, null],
      moves: 0,
      errors: 0,
      started: 0,
      elapsed: 0,
      won: false
    };
  }

  function snapshot() {
    return {
      tab: state.tab.map(function (p) {
        return { cards: p.cards.map(function (c) { return c.id; }), down: p.down };
      }),
      stock: state.stock.map(function (c) { return c.id; }),
      at: state.at,
      found: state.found.map(function (f) {
        return f ? { cat: f.cat, cards: f.cards.map(function (c) { return c.id; }) } : null;
      }),
      moves: state.moves
    };
  }

  function restore(snap) {
    state.tab = snap.tab.map(function (p) {
      return { cards: p.cards.map(function (id) { return DECK[id]; }), down: p.down };
    });
    state.stock = snap.stock.map(function (id) { return DECK[id]; });
    state.at = snap.at;
    state.found = snap.found.map(function (f) {
      return f ? { cat: f.cat, cards: f.cards.map(function (id) { return DECK[id]; }) } : null;
    });
    state.moves = snap.moves;
  }

  /* ---------- חוקי המשחק ---------- */

  function stockCard() {
    return state.stock.length ? state.stock[state.at] : null;
  }

  function sourceCard(src) {
    if (!src) return null;
    if (src.kind === 'stock') return stockCard();
    var p = state.tab[src.index].cards;
    return p[p.length - 1] || null;
  }

  function legal(card, dest) {
    if (!card) return false;
    if (dest.kind === 'stock') return false;          // בחפיסה אין מניחים קלפים
    if (dest.kind === 'found') {
      var f = state.found[dest.index];
      if (!f) return card.type === 'cat';
      return card.type === 'word' && card.cat === f.cat;
    }
    var pile = state.tab[dest.index].cards;
    if (!pile.length) return false;
    return card.type === 'word' && pile[pile.length - 1].cat === card.cat;
  }

  function takeCard(src) {
    if (src.kind === 'stock') {
      var card = state.stock.splice(state.at, 1)[0];
      if (state.at >= state.stock.length) state.at = 0;
      return card;
    }
    var p = state.tab[src.index];
    var taken = p.cards.pop();
    if (p.down >= p.cards.length) p.down = Math.max(0, p.cards.length - 1);
    return taken;
  }

  function attempt(src, dest) {
    if (!src) return;
    if (src.kind === dest.kind && src.index === dest.index) { selected = null; render(); return; }

    var card = sourceCard(src);
    if (!legal(card, dest)) {
      state.errors++;
      startClock();
      flash(dest);
      selected = null;
      render();
      return;
    }

    history.push(snapshot());
    takeCard(src);

    if (dest.kind === 'found') {
      var f = state.found[dest.index];
      if (!f) {
        state.found[dest.index] = { cat: card.cat, cards: [card] };
      } else {
        f.cards.push(card);
        if (f.cards.length === size(f.cat) + 1) state.found[dest.index] = null;
      }
    } else {
      state.tab[dest.index].cards.push(card);
    }

    state.moves++;
    startClock();
    selected = null;
    checkWin();
    render();
  }

  function advanceStock() {
    if (state.won || state.stock.length < 2) return;
    history.push(snapshot());
    state.at = (state.at + 1) % state.stock.length;
    state.moves++;
    startClock();
    selected = null;
    render();
  }

  function checkWin() {
    var clear = state.stock.length === 0 &&
      state.found.every(function (f) { return f === null; }) &&
      state.tab.every(function (p) { return p.cards.length === 0; });
    if (clear && !state.won) {
      state.won = true;
      stopClock();
      showWin();
    }
  }

  /* ---------- שעון ---------- */

  function tick() {
    state.elapsed = Math.floor((Date.now() - state.started) / 1000);
    paintStats();
  }

  function startClock() {
    if (state.started || state.won) return;
    state.started = Date.now();
    timerId = setInterval(tick, 250);
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
  var elStock = document.getElementById('stock');
  var elTab = document.getElementById('tableau');
  var elMoves = document.getElementById('stat-moves');
  var elTime = document.getElementById('stat-time');
  var elErrors = document.getElementById('stat-errors');
  var elWin = document.getElementById('win');
  var board = document.querySelector('.board');

  function cardEl(card, faceUp, draggable) {
    var d = document.createElement('div');
    if (!faceUp) { d.className = 'card card--back'; return d; }
    d.className = 'card ' + (card.type === 'cat' ? 'card--cat' : 'card--word');
    var head = document.createElement('div');
    head.className = 'card-head';
    var t = document.createElement('span');
    t.className = 'card-text';
    t.textContent = card.text;
    head.appendChild(t);
    if (card.type === 'cat') {
      var n = document.createElement('span');
      n.className = 'card-count';
      n.textContent = size(card.cat);
      head.appendChild(n);
    }
    d.appendChild(head);
    if (draggable) d.dataset.drag = '1';
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
        head.innerHTML = '<span class="slot-name"></span><span class="slot-progress"></span>';
        head.firstChild.textContent = CATEGORIES[f.cat].name;
        head.lastChild.textContent = (f.cards.length - 1) + ' / ' + size(f.cat);
      } else {
        head.innerHTML = '<span class="slot-name slot-name--idle">מקום פנוי</span>';
      }

      var pile = document.createElement('div');
      pile.className = 'pile pile--single';
      if (f) {
        pile.appendChild(cardEl(f.cards[f.cards.length - 1], true, false));
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

  function renderStock() {
    elStock.innerHTML = '';
    var slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.kind = 'stock';
    slot.dataset.index = 0;

    var n = state.stock.length;
    var head = document.createElement('div');
    head.className = 'slot-head';
    head.innerHTML = '<span class="slot-name slot-name--idle"></span><span class="slot-progress"></span>';
    head.firstChild.textContent = n ? 'קלף' : 'ריקה';
    head.lastChild.textContent = n ? (state.at + 1) + ' / ' + n : '';

    var pile = document.createElement('div');
    pile.className = 'pile pile--single';
    if (!n) {
      var ph = document.createElement('div');
      ph.className = 'ghost ghost--done';
      ph.textContent = 'ריקה';
      pile.appendChild(ph);
    } else {
      var c = cardEl(state.stock[state.at], true, true);
      if (n > 1) c.classList.add('card--deck');
      if (isSelected('stock', 0)) c.classList.add('is-selected');
      pile.appendChild(c);
    }

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'next';
    next.id = 'btn-next';
    next.textContent = 'הקלף הבא';
    next.disabled = n < 2 || state.won;

    slot.appendChild(head);
    slot.appendChild(pile);
    slot.appendChild(next);
    elStock.appendChild(slot);
  }

  function renderTableau() {
    elTab.innerHTML = '';
    state.tab.forEach(function (p, i) {
      var cards = p.cards;
      var pile = document.createElement('div');
      pile.className = 'pile pile--col' + (cards.length ? '' : ' pile--done');
      pile.dataset.kind = 'tab';
      pile.dataset.index = i;

      if (!cards.length) {
        pile.style.height = 'var(--ch)';
        var ph = document.createElement('div');
        ph.className = 'ghost ghost--done';
        ph.textContent = 'ריק';
        pile.appendChild(ph);
        elTab.appendChild(pile);
        return;
      }

      var nd = 0, nu = 0, lastD = 0, lastU = 0;
      cards.forEach(function (c, k) {
        var up = k >= p.down;
        var el = cardEl(c, up, k === cards.length - 1);
        el.style.top = 'calc(' + nd + ' * var(--fan-down) + ' + nu + ' * var(--fan-up))';
        if (k === cards.length - 1) {
          lastD = nd; lastU = nu;
          if (isSelected('tab', i)) el.classList.add('is-selected');
        }
        if (up) nu++; else nd++;
        pile.appendChild(el);
      });
      pile.style.height = 'calc(var(--ch) + ' + lastD + ' * var(--fan-down) + ' + lastU + ' * var(--fan-up))';
      elTab.appendChild(pile);
    });
  }

  function isSelected(kind, index) {
    return selected && selected.kind === kind && selected.index === index;
  }

  function render() {
    renderFoundations();
    renderStock();
    renderTableau();
    paintStats();
    document.getElementById('btn-undo').disabled = history.length === 0 || state.won;
  }

  function flash(dest) {
    var node = document.querySelector('[data-kind="' + dest.kind + '"][data-index="' + dest.index + '"]');
    if (!node) return;
    node.classList.remove('is-wrong');
    void node.offsetWidth;
    node.classList.add('is-wrong');
    setTimeout(function () { node.classList.remove('is-wrong'); }, 420);
  }

  /* ---------- גרירה והקשה ---------- */

  var grip = null;

  function hostOf(node) {
    var h = node && node.closest ? node.closest('[data-kind]') : null;
    return h ? { kind: h.dataset.kind, index: parseInt(h.dataset.index, 10) } : null;
  }

  function canPickUp(t) {
    if (!t) return false;
    if (t.kind === 'stock') return state.stock.length > 0;
    if (t.kind === 'tab') return state.tab[t.index].cards.length > 0;
    return false;
  }

  board.addEventListener('pointerdown', function (ev) {
    if (state.won || (ev.button && ev.button !== 0)) return;
    if (ev.target.closest('button') || ev.target.closest('.rules')) return;
    var host = hostOf(ev.target);
    grip = { host: host, x0: ev.clientX, y0: ev.clientY, moved: false, ghost: null, el: null };
    if (!host) return;
    var cardEl = ev.target.closest('.card[data-drag]');
    if (cardEl) {
      grip.el = cardEl;
      try { cardEl.setPointerCapture(ev.pointerId); } catch (e) { /* לא קריטי */ }
    }
  });

  document.addEventListener('pointermove', function (ev) {
    if (!grip || !grip.el) return;
    var dx = ev.clientX - grip.x0, dy = ev.clientY - grip.y0;
    if (!grip.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      grip.moved = true;
      var r = grip.el.getBoundingClientRect();
      var g = grip.el.cloneNode(true);
      g.className = grip.el.className + ' drag-ghost';
      g.style.width = r.width + 'px';
      g.style.height = r.height + 'px';
      g.style.left = r.left + 'px';
      g.style.top = r.top + 'px';
      document.body.appendChild(g);
      grip.ghost = g;
      grip.el.classList.add('is-lifted');
    }
    grip.ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });

  function endGrip(ev) {
    if (!grip) return;
    var g = grip;
    grip = null;
    if (g.ghost) { g.ghost.remove(); g.el.classList.remove('is-lifted'); }

    if (g.moved) {
      var under = document.elementFromPoint(ev.clientX, ev.clientY);
      var dest = hostOf(under);
      if (dest) attempt(g.host, dest); else render();
      return;
    }
    if (!g.host) { selected = null; render(); return; }
    if (selected) { attempt(selected, g.host); return; }
    if (canPickUp(g.host)) { selected = g.host; render(); }
  }

  document.addEventListener('pointerup', endGrip);
  document.addEventListener('pointercancel', function () {
    if (grip && grip.ghost) { grip.ghost.remove(); grip.el.classList.remove('is-lifted'); }
    grip = null;
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { selected = null; render(); }
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

  function freshDeal() { start(findSeed((Math.random() * 0xffffffff) >>> 0)); }

  elStock.addEventListener('click', function (ev) {
    if (ev.target.id === 'btn-next') advanceStock();
  });

  document.getElementById('btn-new').addEventListener('click', freshDeal);
  document.getElementById('btn-again').addEventListener('click', freshDeal);
  document.getElementById('btn-restart').addEventListener('click', function () { start(state.seed); });

  document.getElementById('btn-undo').addEventListener('click', function () {
    if (!history.length || state.won) return;
    restore(history.pop());
    if (state.moves > 0) state.moves--;
    selected = null;
    render();
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
        timerId = setInterval(tick, 250);
      }
      return;
    }
    freshDeal();
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
