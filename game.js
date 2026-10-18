/* סוליטר מילים — תפריט, מצב המשחק, וממשק הלוח */
(function () {
  'use strict';

  var BANKS = window.WordSolContent.BANKS;
  var TEXT = window.WordSolContent.TEXT;
  var D = window.WordSolDeal;
  var GLOSS = window.WordSolGloss;
  var SLOTS = 4;

  /* ---------- בחירה בתפריט ---------- */

  var LEVEL_ORDER = ['easy', 'medium', 'hard', 'extreme'];
  var choice = { lang: 'he', level: 'easy' };
  try {
    var saved = JSON.parse(localStorage.getItem('wordsol-choice') || 'null');
    if (saved && BANKS[saved.lang] && BANKS[saved.lang][saved.level]) choice = saved;
  } catch (e) { /* ברירת המחדל */ }

  var T = TEXT[choice.lang];

  function rememberChoice() {
    try { localStorage.setItem('wordsol-choice', JSON.stringify(choice)); } catch (e) { /* לא נורא */ }
  }

  /* ---------- הסט הפעיל ---------- */

  var SET = null, DECK = null;

  function sizeOf(ci) { return SET[ci].words.length; }

  function drawNewSet() {
    var rnd = D.rngFrom((Math.random() * 0xffffffff) >>> 0);
    SET = D.drawSet(BANKS[choice.lang][choice.level], rnd);
    DECK = D.buildDeck(SET);
  }

  function setFromNames(lang, level, names) {
    var bank = BANKS[lang] && BANKS[lang][level];
    if (!bank) return null;
    var out = [];
    for (var i = 0; i < names.length; i++) {
      var found = null;
      for (var j = 0; j < bank.length; j++) if (bank[j].name === names[i]) found = bank[j];
      if (!found) return null;
      out.push(found);
    }
    return out;
  }

  function screenedSeed() {
    return D.findSeed(DECK, sizeOf, (Math.random() * 0xffffffff) >>> 0).seed;
  }

  /* ---------- מצב המשחק ---------- */

  var state = null;
  var history = [];
  var selected = null;
  var timerId = null;

  function newState(seed) {
    var d = D.deal(DECK, seed);
    return {
      seed: seed,
      tab: d.tab,
      stock: d.stock,
      waste: [],
      found: [null, null, null, null],
      moves: 0,
      errors: 0,
      hints: 0,
      active: false,
      since: 0,
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

  function wasteCard() { return state.waste[state.waste.length - 1] || null; }

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
    if (dest.kind === 'stock' || dest.kind === 'waste') return false;

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
      if (++placed > sizeOf(cat)) return false;
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
    if (f.cards.length === sizeOf(f.cat) + 1) state.found[slot] = null;
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
    if (state.stock.length) state.waste.push(state.stock.pop());
    else { state.stock = state.waste.reverse(); state.waste = []; }
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
    if (!state) return 0;
    return Math.floor(state.elapsed + (state.since ? (Date.now() - state.since) / 1000 : 0));
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

  window.addEventListener('resize', function () { hideBubble(); });
  window.addEventListener('blur', pauseClock);
  window.addEventListener('focus', resumeClock);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseClock(); else resumeClock();
  });

  /* ---------- אלמנטים ---------- */

  var elMenu = document.getElementById('menu');
  var elGame = document.getElementById('game');
  var elFound = document.getElementById('foundations');
  var elStock = document.getElementById('stock');
  var elWaste = document.getElementById('waste');
  var elTab = document.getElementById('tableau');
  var elMoves = document.getElementById('stat-moves');
  var elTime = document.getElementById('stat-time');
  var elErrors = document.getElementById('stat-errors');
  var elHints = document.getElementById('stat-hints');
  var bubble = document.getElementById('bubble');
  var hintBtn = document.getElementById('btn-hint');
  var elWin = document.getElementById('win');
  var board = elGame;

  function text(id, value) { document.getElementById(id).textContent = value; }

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

  function flash(dest) {
    var node = document.querySelector('[data-kind="' + dest.kind + '"][data-index="' + dest.index + '"]');
    if (!node) return;
    node.classList.remove('is-wrong');
    void node.offsetWidth;
    node.classList.add('is-wrong');
    setTimeout(function () { node.classList.remove('is-wrong'); }, 420);
  }

  function reject(dest) { flash(dest); buzz(); shake(); }


  /* ---------- רמז ---------- */

  var hintArmed = false;
  var hintDrag = null;
  var bubbleTimer = null;

  function paintHint() {
    hintBtn.classList.toggle('is-on', hintArmed);
    hintBtn.setAttribute('aria-pressed', hintArmed ? 'true' : 'false');
  }

  function hideBubble() {
    bubble.hidden = true;
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null; }
  }

  function showBubble(node, word, meaning) {
    bubble.innerHTML = '';
    var w = document.createElement('strong');
    w.textContent = word;
    var m = document.createElement('span');
    m.textContent = meaning;
    bubble.appendChild(w);
    bubble.appendChild(m);
    bubble.dir = T.dir;
    bubble.hidden = false;

    var r = node.getBoundingClientRect();
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - bw / 2), window.innerWidth - bw - 8);
    var top = r.top - bh - 8;
    if (top < 8) top = Math.min(r.bottom + 8, window.innerHeight - bh - 8);
    bubble.style.left = Math.max(8, left) + 'px';
    bubble.style.top = Math.max(8, top) + 'px';

    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, 8000);
  }

  function revealHint(node) {
    if (!state || state.won || !node || node.classList.contains('card--back')) return;
    var label = node.querySelector('.card-text');
    if (!label) return;
    var word = label.textContent;
    var book = GLOSS[choice.lang];
    /* ההסברים נשמרים לפי הכתיב בלי ניקוד, כדי שניקוד על הקלף לא ינתק אותם */
    var meaning = book && book[word.replace(/[\u0591-\u05C7]/g, '')];
    if (!meaning) return;                 // קלף קטגוריה, ששמו מדבר בעד עצמו
    state.hints++;
    startClock();
    paintStats();
    showBubble(node, word, meaning);
  }

  hintBtn.addEventListener('pointerdown', function (ev) {
    if (!state || state.won) return;
    hintDrag = { x0: ev.clientX, y0: ev.clientY, moved: false, ghost: null };
    try { hintBtn.setPointerCapture(ev.pointerId); } catch (e) { /* לא קריטי */ }
  });

  document.addEventListener('pointermove', function (ev) {
    if (!hintDrag) return;
    var dx = ev.clientX - hintDrag.x0, dy = ev.clientY - hintDrag.y0;
    if (!hintDrag.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      hintDrag.moved = true;
      var r = hintBtn.getBoundingClientRect();
      var g = hintBtn.cloneNode(true);
      g.className = 'stat hint-btn drag-ghost';
      g.style.width = r.width + 'px';
      g.style.height = r.height + 'px';
      g.style.left = r.left + 'px';
      g.style.top = r.top + 'px';
      document.body.appendChild(g);
      hintDrag.ghost = g;
      hintBtn.classList.add('is-lifted');
    }
    hintDrag.ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });

  document.addEventListener('pointerup', function (ev) {
    if (!hintDrag) return;
    var d = hintDrag;
    hintDrag = null;
    if (d.ghost) { d.ghost.remove(); hintBtn.classList.remove('is-lifted'); }
    if (d.moved) {
      var under = document.elementFromPoint(ev.clientX, ev.clientY);
      var card = under && under.closest ? under.closest('.card') : null;
      if (card) revealHint(card);
      return;
    }
    hintArmed = !hintArmed;
    paintHint();
  });

  /* בשלב הלכידה, כדי שהקשה על קלף במצב רמז לא תיקרא גם כבחירת קלף */
  document.addEventListener('pointerdown', function (ev) {
    hideBubble();
    if (!hintArmed || ev.target.closest('#btn-hint')) return;
    hintArmed = false;
    paintHint();
    var card = ev.target.closest('.card');
    if (card && !card.classList.contains('card--back')) {
      revealHint(card);
      ev.stopPropagation();
      ev.preventDefault();
    }
  }, true);

  /* ---------- תצוגת הלוח ---------- */

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
      n.textContent = sizeOf(card.cat);
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
    elHints.textContent = state.hints;
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
        head.firstChild.textContent = SET[f.cat].name;
        head.lastChild.textContent = (f.cards.length - 1) + ' / ' + sizeOf(f.cat);
      }

      var pile = document.createElement('div');
      pile.className = 'pile pile--single';
      if (f) {
        pile.appendChild(cardEl(f.cards[f.cards.length - 1], true, false));
      } else {
        var ph = document.createElement('div');
        ph.className = 'ghost';
        ph.textContent = T.catGhost;
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
    } else {
      var ph = document.createElement('div');
      ph.className = 'ghost' + (state.waste.length ? '' : ' ghost--done');
      ph.textContent = state.waste.length ? T.again : T.empty;
      pile.appendChild(ph);
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
    if (!state || state.won || (ev.button && ev.button !== 0)) return;
    if (ev.target.closest('button') || ev.target.closest('.rules')) return;
    var host = hostOf(ev.target);
    grip = { host: host, x0: ev.clientX, y0: ev.clientY, moved: false, ghost: null, el: null, idx: null };
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
    if (ev.key === 'Escape') {
      closePop(); hideBubble();
      if (hintArmed) { hintArmed = false; paintHint(); }
      selected = null;
      if (state) render();
      return;
    }
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var node = document.activeElement;
    if (node && node.dataset && node.dataset.kind === 'stock') { ev.preventDefault(); drawFromStock(); }
  });

  /* ---------- מעבר בין תפריט ללוח ---------- */

  function fillRules(wrap) {
    wrap.querySelector('summary').textContent = T.rulesTitle;
    var ul = wrap.querySelector('ul');
    ul.innerHTML = '';
    T.rules.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    });
  }

  function optionButton(group, key, label, onPick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'option' + (choice[group] === key ? ' is-on' : '');
    b.setAttribute('aria-pressed', choice[group] === key ? 'true' : 'false');
    b.textContent = label;
    b.addEventListener('click', function () { onPick(key); });
    return b;
  }

  function renderMenu() {
    document.documentElement.setAttribute('dir', T.dir);
    document.documentElement.setAttribute('lang', T.lang);

    text('menu-title', T.title);
    text('menu-lead', T.lead);
    text('lang-label', T.langLabel);
    text('level-label', T.levelLabel);
    text('btn-start', T.start);

    var langs = document.getElementById('opt-lang');
    langs.innerHTML = '';
    Object.keys(TEXT).forEach(function (key) {
      langs.appendChild(optionButton('lang', key, TEXT[key].name, function (k) {
        choice.lang = k;
        T = TEXT[k];
        rememberChoice();
        renderMenu();
      }));
    });

    /* רמה קיימת רק אם יש לה בנק בשפה הנבחרת */
    var available = LEVEL_ORDER.filter(function (k) { return BANKS[choice.lang][k]; });
    if (available.indexOf(choice.level) < 0) {
      choice.level = available[available.length - 1];
      rememberChoice();
    }

    var levels = document.getElementById('opt-level');
    levels.innerHTML = '';
    available.forEach(function (key) {
      levels.appendChild(optionButton('level', key, T.levels[key], function (k) {
        choice.level = k;
        rememberChoice();
        renderMenu();
      }));
    });

    text('level-hint', T.levelHint[choice.level] + ' · ' +
      T.bankSize(BANKS[choice.lang][choice.level].length));

    fillRules(document.getElementById('menu-rules'));
  }

  function paintGameChrome() {
    document.documentElement.setAttribute('dir', T.dir);
    document.documentElement.setAttribute('lang', T.lang);
    text('game-title', T.title);
    text('lbl-moves', T.moves);
    text('lbl-time', T.time);
    text('lbl-errors', T.errors);
    text('lbl-hints', T.hints);
    text('wlbl-hints', T.hints);
    hintBtn.textContent = T.hint;
    text('wlbl-moves', T.moves);
    text('wlbl-time', T.time);
    text('wlbl-errors', T.errors);
    text('btn-undo', T.undo);
    text('btn-same-deal', T.sameDeal);
    text('btn-same-words', T.sameWords);
    text('btn-new-set', T.newSet);
    text('btn-menu', T.toMenu);
    document.getElementById('btn-more').textContent = T.options + ' \u25be';
    text('btn-win-words', T.sameWords);
    text('btn-win-set', T.newSet);
    text('btn-win-menu', T.toMenu);
    text('win-title', T.winTitle);
    paintSound();
    fillRules(document.getElementById('game-rules'));
  }

  function showMenu() {
    closePop();
    hideBubble();
    hintArmed = false;
    paintHint();
    stopClock();
    selected = null;
    elWin.hidden = true;
    elGame.hidden = true;
    elMenu.hidden = false;
    renderMenu();
  }

  function begin(seed) {
    closePop();
    hideBubble();
    hintArmed = false;
    paintHint();
    stopClock();
    state = newState(seed);
    history = [];
    selected = null;
    elWin.hidden = true;
    elMenu.hidden = true;
    elGame.hidden = false;
    paintGameChrome();
    render();
  }

  function startFreshSet() { drawNewSet(); begin(screenedSeed()); }

  /* ---------- כפתורים ---------- */

  var btnSound = document.getElementById('btn-sound');

  function paintSound() {
    btnSound.textContent = soundOn ? T.soundOn : T.soundOff;
    btnSound.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  }

  btnSound.addEventListener('click', function () {
    soundOn = !soundOn;
    try { localStorage.setItem('wordsol-sound', soundOn ? 'on' : 'off'); } catch (e) { /* לא נורא */ }
    paintSound();
    if (soundOn) buzz();
  });

  var pop = document.getElementById('more-pop');
  var btnMore = document.getElementById('btn-more');

  function closePop() {
    pop.hidden = true;
    btnMore.setAttribute('aria-expanded', 'false');
  }

  btnMore.addEventListener('click', function (ev) {
    ev.stopPropagation();
    pop.hidden = !pop.hidden;
    btnMore.setAttribute('aria-expanded', pop.hidden ? 'false' : 'true');
  });

  pop.addEventListener('click', closePop);
  document.addEventListener('click', function (ev) {
    if (!pop.hidden && !ev.target.closest('.dropdown')) closePop();
  });

  document.getElementById('btn-start').addEventListener('click', startFreshSet);
  document.getElementById('btn-new-set').addEventListener('click', startFreshSet);
  document.getElementById('btn-win-set').addEventListener('click', startFreshSet);
  document.getElementById('btn-same-deal').addEventListener('click', function () { begin(state.seed); });
  document.getElementById('btn-same-words').addEventListener('click', function () { begin(screenedSeed()); });
  document.getElementById('btn-win-words').addEventListener('click', function () { begin(screenedSeed()); });
  document.getElementById('btn-menu').addEventListener('click', showMenu);
  document.getElementById('btn-win-menu').addEventListener('click', showMenu);

  document.getElementById('btn-undo').addEventListener('click', function () {
    if (!history.length || state.won) return;
    restore(history.pop());
    if (state.moves > 0) state.moves--;
    selected = null;
    render();
  });

  function showWin() {
    text('win-text', T.winText(SET.length));
    document.getElementById('win-moves').textContent = state.moves;
    document.getElementById('win-time').textContent = clockText(elapsedNow());
    document.getElementById('win-errors').textContent = state.errors;
    document.getElementById('win-hints').textContent = state.hints;
    elWin.hidden = false;
  }

  /* ---------- הפעלה ---------- */

  function boot(saved) {
    var s = saved && saved.state;
    if (s && s.names) {
      var set = setFromNames(s.lang, s.level, s.names);
      if (set) {
        choice = { lang: s.lang, level: s.level };
        T = TEXT[s.lang];
        SET = set;
        DECK = D.buildDeck(set);
        state = newState(s.seed);
        restore(s.snap);
        state.errors = s.errors;
        state.elapsed = s.elapsed;
        state.won = s.won;
        history = [];
        elMenu.hidden = true;
        elGame.hidden = false;
        paintGameChrome();
        render();
        if (s.won) showWin(); else if (s.elapsed) startClock();
        return;
      }
    }
    showMenu();
  }

  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(function () {
      if (!state || elGame.hidden) return {};
      return {
        state: {
          lang: choice.lang, level: choice.level,
          names: SET.map(function (c) { return c.name; }),
          seed: state.seed, snap: snapshot(),
          errors: state.errors, hints: state.hints,
          elapsed: elapsedNow(), won: state.won
        }
      };
    });
  }
  if (hot && hot.ready) hot.ready(boot); else boot(null);
})();
