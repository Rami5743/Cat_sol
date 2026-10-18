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
      stock: d.stock,               // הפוכים, הקלף האחרון הוא העליון
      waste: [],                    // גלויים, זמין רק העליון
      found: [null, null, null, null],
      moves: 0,
      errors: 0,
      active: false,        // השעון התחיל לרוץ
      since: 0,             // תחילת המקטע הנוכחי, או אפס כשהוא מושהה
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
      waste: state.waste.map(function (c) { return c.id; }),
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
    state.waste = snap.waste.map(function (id) { return DECK[id]; });
    state.found = snap.found.map(function (f) {
      return f ? { cat: f.cat, cards: f.cards.map(function (id) { return DECK[id]; }) } : null;
    });
    state.moves = snap.moves;
  }

  /* ---------- חוקי המשחק ---------- */

  function wasteCard() {
    return state.waste[state.waste.length - 1] || null;
  }

  /* רצף הקלפים הגלויים בערמה הוא תמיד מקטגוריה אחת, שהרי כל קלף שהונח
     הונח על קלף מאותה קטגוריה. לכן אפשר להרים כל קלף גלוי יחד עם מה שמעליו. */
  function groupOf(src) {
    if (!src) return [];
    if (src.kind === 'waste') { var w = wasteCard(); return w ? [w] : []; }
    if (src.kind !== 'tab') return [];
    var p = state.tab[src.index];
    var from = src.from == null ? p.cards.length - 1 : src.from;
    if (from < p.down || from >= p.cards.length) return [];
    return p.cards.slice(from);
  }

  function legalGroup(group, dest) {
    if (!group.length) return false;
    if (dest.kind === 'stock' || dest.kind === 'waste') return false;   // בחפיסה ובגלויים אין מניחים קלפים

    if (dest.kind === 'tab') {
      var pile = state.tab[dest.index].cards;
      if (!pile.length) return true;                 // מקום שהתפנה מקבל כל קלף
      return group[0].type === 'word' && pile[pile.length - 1].cat === group[0].cat;
    }

    var f = state.found[dest.index];
    var cat, placed, i = 0;
    if (f) {
      cat = f.cat;
      placed = f.cards.length - 1;
    } else {
      if (group[0].type !== 'cat') return false;
      cat = group[0].cat;
      placed = 0;
      i = 1;
    }
    for (; i < group.length; i++) {
      if (group[i].type !== 'word' || group[i].cat !== cat) return false;
      if (++placed > size(cat)) return false;
    }
    return true;
  }

  function takeGroup(src, count) {
    if (src.kind === 'waste') return [state.waste.pop()];
    var p = state.tab[src.index];
    var taken = p.cards.splice(p.cards.length - count, count);
    if (p.down >= p.cards.length) p.down = Math.max(0, p.cards.length - 1);
    return taken;
  }

  function putOnFoundation(slot, card) {
    var f = state.found[slot];
    if (!f) { state.found[slot] = { cat: card.cat, cards: [card] }; return; }
    f.cards.push(card);
    if (f.cards.length === size(f.cat) + 1) state.found[slot] = null;
  }

  function attempt(src, dest) {
    if (!src) return;
    if (src.kind === dest.kind && src.index === dest.index) { selected = null; render(); return; }

    var group = groupOf(src);
    if (!group.length) { selected = null; render(); return; }

    if (!legalGroup(group, dest)) {
      state.errors++;
      startClock();
      reject(dest);
      selected = null;
      render();
      return;
    }

    history.push(snapshot());
    var moving = takeGroup(src, group.length);

    if (dest.kind === 'found') {
      moving.forEach(function (c) { putOnFoundation(dest.index, c); });
    } else {
      moving.forEach(function (c) { state.tab[dest.index].cards.push(c); });
    }

    state.moves++;
    startClock();
    selected = null;
    checkWin();
    render();
  }

  /* לחיצה על החפיסה חושפת קלף אל ערמת הגלויים, ומכסה את הקלף שהיה שם.
     כשהחפיסה מתרוקנת, הלחיצה הבאה מחזירה אליה את הגלויים ומתחילה סיבוב נוסף. */
  function drawFromStock() {
    if (state.won) return;
    if (!state.stock.length && !state.waste.length) return;
    history.push(snapshot());
    if (state.stock.length) {
      state.waste.push(state.stock.pop());
    } else {
      state.stock = state.waste.reverse();
      state.waste = [];
    }
    state.moves++;
    startClock();
    selected = null;
    render();
  }

  function checkWin() {
    var clear = state.stock.length === 0 && state.waste.length === 0 &&
      state.found.every(function (f) { return f === null; }) &&
      state.tab.every(function (p) { return p.cards.length === 0; });
    if (clear && !state.won) {
      state.won = true;
      stopClock();
      showWin();
    }
  }

  /* ---------- שעון ---------- */
  /* הזמן נצבר במקטעים. מקטע נפתח כשהחלון בפוקוס ונסגר כשהוא יוצא ממנו. */

  function elapsedNow() {
    var extra = state.since ? (Date.now() - state.since) / 1000 : 0;
    return Math.floor(state.elapsed + extra);
  }

  function tick() { paintStats(); }

  function resumeClock() {
    if (!state || !state.active || state.since || state.won) return;
    state.since = Date.now();
    timerId = setInterval(tick, 250);
    paintStats();
  }

  function pauseClock() {
    if (!state || !state.since) return;
    state.elapsed += (Date.now() - state.since) / 1000;
    state.since = 0;
    if (timerId) { clearInterval(timerId); timerId = null; }
    paintStats();
  }

  /* כל מהלך גם מפעיל את השעון וגם מחדש אותו, למקרה שהושהה בלי שהחלון באמת ננטש. */
  function startClock() {
    if (!state || state.won) return;
    state.active = true;
    resumeClock();
  }

  function stopClock() {
    pauseClock();
    if (state) state.active = false;
  }

  function clockText(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  window.addEventListener('blur', pauseClock);
  window.addEventListener('focus', resumeClock);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseClock(); else resumeClock();
  });

  /* ---------- תצוגה ---------- */

  var elFound = document.getElementById('foundations');
  var elStock = document.getElementById('stock');
  var elWaste = document.getElementById('waste');
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
    elTime.textContent = clockText(elapsedNow());
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
        head.innerHTML = '';
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
    slot.tabIndex = 0;
    slot.setAttribute('role', 'button');

    var n = state.stock.length;
    var head = document.createElement('div');
    head.className = 'slot-head';
    head.innerHTML = '<span class="slot-progress"></span>';
    head.lastChild.textContent = n;

    var pile = document.createElement('div');
    pile.className = 'pile pile--single';
    if (n) {
      var back = cardEl(null, false, false);
      if (n > 1) back.classList.add('card--deck');
      pile.appendChild(back);
      slot.setAttribute('aria-label', 'חשיפת קלף מהחפיסה');
    } else {
      var ph = document.createElement('div');
      ph.className = 'ghost' + (state.waste.length ? '' : ' ghost--done');
      ph.textContent = state.waste.length ? 'סיבוב נוסף' : 'ריקה';
      pile.appendChild(ph);
      slot.setAttribute('aria-label', state.waste.length ? 'התחלת סיבוב נוסף בחפיסה' : 'החפיסה ריקה');
    }

    slot.appendChild(head);
    slot.appendChild(pile);
    elStock.appendChild(slot);
  }

  function renderWaste() {
    elWaste.innerHTML = '';
    var slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.kind = 'waste';
    slot.dataset.index = 0;

    var n = state.waste.length;
    var head = document.createElement('div');
    head.className = 'slot-head';
    head.innerHTML = '<span class="slot-progress"></span>';
    head.lastChild.textContent = n;

    var pile = document.createElement('div');
    pile.className = 'pile pile--single';
    if (n) {
      var c = cardEl(state.waste[n - 1], true, true);
      if (n > 1) c.classList.add('card--deck');
      if (isSelected('waste', 0)) c.classList.add('is-selected');
      pile.appendChild(c);
    } else {
      var ph = document.createElement('div');
      ph.className = 'ghost ghost--done';
      pile.appendChild(ph);
    }

    slot.appendChild(head);
    slot.appendChild(pile);
    elWaste.appendChild(slot);
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
        ph.className = 'ghost';
        pile.appendChild(ph);
        elTab.appendChild(pile);
        return;
      }

      var nd = 0, nu = 0, lastD = 0, lastU = 0;
      var pickedFrom = isSelected('tab', i)
        ? (selected.from == null ? cards.length - 1 : selected.from) : -1;
      cards.forEach(function (c, k) {
        var up = k >= p.down;
        var el = cardEl(c, up, up);
        if (up) el.dataset.idx = k;
        el.style.top = 'calc(' + nd + ' * var(--fan-down) + ' + nu + ' * var(--fan-up))';
        if (k === cards.length - 1) { lastD = nd; lastU = nu; }
        if (pickedFrom >= 0 && k >= pickedFrom) el.classList.add('is-selected');
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
    renderWaste();
    renderTableau();
    paintStats();
    document.getElementById('btn-undo').disabled = history.length === 0 || state.won;
  }

  /* ---------- חיווי על מהלך שאינו חוקי ---------- */

  var soundOn = true;
  try { soundOn = localStorage.getItem('wordsol-sound') !== 'off'; } catch (e) { /* ברירת המחדל */ }
  var audio = null;

  function buzz() {
    if (!soundOn) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audio) audio = new Ctx();
      if (audio.state === 'suspended') audio.resume();
      var t = audio.currentTime;
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.16);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.07, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (e) { /* בלי צליל */ }
  }

  function shake() {
    board.classList.remove('is-shaking');
    void board.offsetWidth;
    board.classList.add('is-shaking');
    setTimeout(function () { board.classList.remove('is-shaking'); }, 380);
  }

  function reject(dest) {
    flash(dest);
    buzz();
    shake();
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
    if (t.kind === 'waste') return state.waste.length > 0;
    if (t.kind === 'tab') return state.tab[t.index].cards.length > 0;
    return false;
  }

  board.addEventListener('pointerdown', function (ev) {
    if (state.won || (ev.button && ev.button !== 0)) return;
    if (ev.target.closest('button') || ev.target.closest('.rules')) return;
    var host = hostOf(ev.target);
    grip = { host: host, x0: ev.clientX, y0: ev.clientY, moved: false, ghost: null, el: null };
    if (!host) return;
    var node = ev.target.closest('.card[data-drag]');
    if (node) {
      grip.el = node;
      grip.idx = node.dataset.idx == null ? null : parseInt(node.dataset.idx, 10);
      try { node.setPointerCapture(ev.pointerId); } catch (e) { /* לא קריטי */ }
    }
  });

  document.addEventListener('pointermove', function (ev) {
    if (!grip || !grip.el) return;
    var dx = ev.clientX - grip.x0, dy = ev.clientY - grip.y0;
    if (!grip.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      grip.moved = true;
      var run = [grip.el], sib = grip.el.nextElementSibling;
      while (sib) { if (sib.classList.contains('card')) run.push(sib); sib = sib.nextElementSibling; }
      var r = grip.el.getBoundingClientRect();
      var last = run[run.length - 1].getBoundingClientRect();
      var g = document.createElement('div');
      g.className = 'drag-ghost';
      g.style.width = r.width + 'px';
      g.style.height = (last.bottom - r.top) + 'px';
      g.style.left = r.left + 'px';
      g.style.top = r.top + 'px';
      run.forEach(function (el) {
        var c = el.cloneNode(true);
        c.style.top = (el.getBoundingClientRect().top - r.top) + 'px';
        g.appendChild(c);
        el.classList.add('is-lifted');
      });
      document.body.appendChild(g);
      grip.ghost = g;
      grip.run = run;
    }
    grip.ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });

  function endGrip(ev) {
    if (!grip) return;
    var g = grip;
    grip = null;
    if (g.ghost) {
      g.ghost.remove();
      g.run.forEach(function (el) { el.classList.remove('is-lifted'); });
    }

    var src = g.host && g.host.kind === 'tab'
      ? { kind: 'tab', index: g.host.index, from: g.idx } : g.host;

    if (g.moved) {
      var under = document.elementFromPoint(ev.clientX, ev.clientY);
      var dest = hostOf(under);
      if (dest) attempt(src, dest); else render();
      return;
    }
    if (!g.host) { selected = null; render(); return; }
    if (g.host.kind === 'stock') { drawFromStock(); return; }
    if (selected) { attempt(selected, g.host); return; }
    if (canPickUp(g.host)) { selected = src; render(); }
  }

  document.addEventListener('pointerup', endGrip);
  document.addEventListener('pointercancel', function () {
    if (grip && grip.ghost) {
      grip.ghost.remove();
      grip.run.forEach(function (el) { el.classList.remove('is-lifted'); });
    }
    grip = null;
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { selected = null; render(); return; }
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var slot = document.activeElement;
    if (slot && slot.dataset && slot.dataset.kind === 'stock') { ev.preventDefault(); drawFromStock(); }
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

  var btnSound = document.getElementById('btn-sound');
  function paintSound() {
    btnSound.textContent = soundOn ? 'צליל פועל' : 'צליל כבוי';
    btnSound.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  }
  btnSound.addEventListener('click', function () {
    soundOn = !soundOn;
    try { localStorage.setItem('wordsol-sound', soundOn ? 'on' : 'off'); } catch (e) { /* לא נורא */ }
    paintSound();
    if (soundOn) buzz();
  });
  paintSound();

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
    document.getElementById('win-time').textContent = clockText(elapsedNow());
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
      if (!state.won && state.elapsed) startClock();
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
          elapsed: elapsedNow(), won: state.won
        }
      };
    });
  }
  if (hot && hot.ready) hot.ready(boot); else boot(null);
})();
