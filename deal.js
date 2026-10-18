/* הגרלת הסט, החלוקה, ובדיקת הפתירוּת */
(function (root) {
  'use strict';

  var MIN_CARDS = 50;
  var MAX_CARDS = 60;
  var SLOTS = 4;

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

  /* מוסיפים קטגוריות מהבנק עד שמספר הקלפים נכנס לטווח המבוקש.
     קטגוריה שחולקת מילה עם קטגוריה שכבר נבחרה נפסלת, כדי שלכל מילה יהיה בית אחד. */
  function drawSet(bank, rnd) {
    var order = shuffled(bank, rnd);
    var chosen = [], used = {}, total = 0;
    for (var i = 0; i < order.length && total < MIN_CARDS; i++) {
      var cat = order[i];
      var cost = cat.words.length + 1;
      if (total + cost > MAX_CARDS) continue;
      var clash = cat.words.some(function (w) { return used[w]; });
      if (clash) continue;
      chosen.push(cat);
      total += cost;
      cat.words.forEach(function (w) { used[w] = true; });
    }
    return chosen;
  }

  function buildDeck(set) {
    var deck = [], id = 0;
    set.forEach(function (cat, ci) {
      deck.push({ id: id++, type: 'cat', cat: ci, text: cat.name });
      cat.words.forEach(function (w) {
        deck.push({ id: id++, type: 'word', cat: ci, text: w });
      });
    });
    return deck;
  }

  /* סולם ערמות בגדלים שונים, רחב יותר כשהחפיסה גדולה */
  function pileSizes(total) {
    var sizes = [], n = total > 54 ? 8 : 7;
    for (var i = 1; i <= n; i++) sizes.push(i);
    return sizes;
  }

  function deal(deck, seed) {
    var cards = shuffled(deck, rngFrom(seed));
    var tab = [], k = 0;
    pileSizes(cards.length).forEach(function (n) {
      tab.push({ cards: cards.slice(k, k + n), down: n - 1 });
      k += n;
    });
    return { tab: tab, stock: cards.slice(k) };
  }

  /* ---------- בדיקת פתירוּת ----------
     החפיסה נשמרת כאוסף, שהרי הסיבוב בה מנגיש כל קלף שבה. מה שחוסם הוא
     קלף עליון בלוח שאין לו יעד: הוא קובר את כל מה שתחתיו. */

  function trialState(d) {
    return {
      tab: d.tab.map(function (p) {
        return p.cards.map(function (c) { return { t: c.type, c: c.cat }; });
      }),
      stock: d.stock.map(function (c) { return { t: c.type, c: c.cat }; }),
      found: [null, null, null, null]
    };
  }

  function playout(s, sizeOf, rnd) {
    function slotFor(card) {
      for (var i = 0; i < SLOTS; i++) if (s.found[i] && s.found[i].cat === card.c) return i;
      return -1;
    }
    function place(card, slot) {
      if (card.t === 'cat') { s.found[slot] = { cat: card.c, n: 0 }; return; }
      var f = s.found[slot];
      if (++f.n === sizeOf(f.cat)) s.found[slot] = null;
    }

    for (var step = 0; step < 3000; step++) {
      var done = s.stock.length === 0 &&
        s.found.every(function (f) { return f === null; }) &&
        s.tab.every(function (p) { return p.length === 0; });
      if (done) return true;

      // 1. מילה שקטגוריה שלה כבר פתוחה — תמיד כדאי
      var acted = false;
      for (var i = 0; i < s.tab.length && !acted; i++) {
        var p = s.tab[i];
        if (!p.length) continue;
        var c = p[p.length - 1];
        if (c.t !== 'word') continue;
        var sl = slotFor(c);
        if (sl >= 0) { p.pop(); place(c, sl); acted = true; }
      }
      if (acted) continue;
      for (var j = 0; j < s.stock.length; j++) {
        var sc = s.stock[j];
        if (sc.t !== 'word') continue;
        var sl2 = slotFor(sc);
        if (sl2 >= 0) { s.stock.splice(j, 1); place(sc, sl2); acted = true; break; }
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
          place(card, empty);
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

  function winRate(d, sizeOf, tries, rnd, enough) {
    var wins = 0;
    for (var i = 0; i < tries; i++) {
      if (playout(trialState(d), sizeOf, rnd)) {
        wins++;
        if (enough && wins >= enough) return wins;
      }
    }
    return wins;
  }

  function solvable(d, sizeOf, tries, rnd) { return winRate(d, sizeOf, tries, rnd, 1) > 0; }

  /* מחפש זרע שהחלוקה שלו פתירה, ולא רק בקו אחד צר: נדרשות כמה הצלחות
     מתוך משחקי הניסוי. הבדיקה מתעלמת משני מהלכים שרק מקלים — העברת רצף
     שלם והנחה בערמה שהתרוקנה — ולכן היא חסם מלמטה. */
  var PLAYOUTS = 80;
  var NEED = 4;

  function findSeed(deck, sizeOf, startSeed, tries, playouts, need) {
    var rnd = rngFrom(startSeed ^ 0x9e3779b9);
    var want = need || NEED;
    var runs = playouts || PLAYOUTS;
    var best = { seed: startSeed, wins: -1 };
    var limit = tries || 200;
    for (var k = 0; k < limit; k++) {
      var seed = (startSeed + k * 2654435761) >>> 0;
      var wins = winRate(deal(deck, seed), sizeOf, runs, rnd, want);
      if (wins >= want) return { seed: seed, screened: true, tried: k + 1, wins: wins };
      if (wins > best.wins) best = { seed: seed, wins: wins };
    }
    return { seed: best.seed, screened: false, tried: limit, wins: best.wins };
  }

  root.WordSolDeal = {
    MIN_CARDS: MIN_CARDS, MAX_CARDS: MAX_CARDS,
    rngFrom: rngFrom, shuffled: shuffled,
    drawSet: drawSet, buildDeck: buildDeck, pileSizes: pileSizes,
    deal: deal, solvable: solvable, winRate: winRate, findSeed: findSeed
  };
})(typeof window !== 'undefined' ? window : globalThis);
