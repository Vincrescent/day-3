/* Universe Eye — split-flap.js (v1.1)
 * Split-flap (departure-board) text animation for status text.
 *
 * ADAPTASI dari "God's Eye View" (Bilawal Sidhu, 2026), file src/splitFlap.js —
 * dipindahkan utuh (pola + struktur + invariants), prefix class `gev-` diganti
 * `ue-`, module ES diganti IIFE + window export, disesuaikan dengan tema
 * observatorium Universe Eye. Kode sumber 100% bebas Cesium (DOM + CSS).
 *
 * Saat label berubah — "Bumi" → "Jupiter" — karakternya flip mekanik kiri ke
 * kanan seperti papan Solari di terminal ferry.
 *
 * EMPAT INVARIAN MENAHAN INI BERSAMA — jangan "perbaiki" salah satunya:
 *
 * 1. DOM TEXT IS THE TRUTH, AND ITS NODE NEVER MOVES. Panggilan pertama
 *    upgrading label ke shell permanen dua-anak: span `.ue-flap-text` dengan
 *    satu node `Text` jangka-panjang, dan saudara `.ue-flap-cells` yang
 *    `aria-hidden`. Setelah itu satu-satunya operasi teks seumur chip adalah
 *    `node.data = next` — mutasi `characterData` tunggal. Tidak ada yang
 *    pernah diparenting ulang, jadi label tidak pernah kosong sesaat dan
 *    region `aria-live` tidak pernah melihat pasangan pembuangan/pemasukan.
 *    `element.textContent` adalah string yang sudah diam di setiap saat,
 *    karena cells membawa TIDAK ADA teks sama sekali: kedua glyph adalah
 *    generated content CSS (`::before` dari `data-flap-prev`, `::after` dari
 *    `data-flap-next`), yang tidak pernah mencapai `textContent`.
 * 2. NO ANIMATION LOOP, AND EXACTLY ONE TIMER PER CHANGE. Gerakannya hanya
 *    CSS `animation`/`transition`, dipicu sekali per perubahan teks dan
 *    distagger via custom property `--ue-flap-delay` per cell. Satu timer
 *    `setTimeout` per perubahan — settle yang mencabut cells. ease lebar
 *    diakhiri listener `transitionend`, bukan timer kedua. Nol JS per-frame.
 * 3. ONLY WHAT WAS VISIBLE FLAPS AWAY. Kaskade yang dipotong (A→B dipotong C)
 *    menurunkan glyph keluar tiap kolom dari apa yang kolom itu SEDANG
 *    TAMPILKAN saat itu — untuk kolom yang stagger-nya belum lewat, masih A,
 *    bukan B yang tertunda.
 * 4. COLUMNS NEVER RENUMBER MID-CASCADE. Sepanjang kaskade, papan
 *    mempertahankan satu kolom per indeks dari string yang LEBIH PANJANG.
 *    Kolom yang tak dijangkau string baru flap glyph lamanya ke KOSONG di
 *    tempatnya — persis seperti papan keberangkatan menghapus sel — bukan
 *    runtuh ke nol lebar.
 *
 * Sumber dilisensi MIT — atribusi penuh dipertahankan (wajib MIT):
 *
 *   MIT License
 *   Copyright (c) 2026 Bilawal Sidhu
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 * Window.UESplitFlap
 */
(function (global) {
  'use strict';

  /** One-line kill switch. Set false → semua label jadi swap teks instan. */
  var SPLIT_FLAP_ENABLED = true;
  /** Waktu satu karakter flip. */
  var FLAP_CHAR_MS = 190;
  /** Jeda nominal antar-karakter berturut-turut memulai flip. */
  var FLAP_STAGGER_MS = 26;
  /**
   * Atap keras untuk seluruh kaskade. Label panjang memampatkan stagger-nya
   * agar muat, bukan tetap jalan — chip yang flap penuh satu detik terbaca
   * seperti slot machine, bukan settle mekanik yang tenang.
   */
  var FLAP_MAX_TOTAL_MS = 620;
  /** Longgar setelah karakter terakhir mendarat sebelum cells dicabut. */
  var FLAP_SETTLE_SLACK_MS = 60;
  /**
   * Fraksi flip karakter saat glyph keluar berotasi pergi dan glyph masuk
   * mengambil alih. HARUS mengikuti crossover keyframe `ue-flap-out`/
   * `ue-flap-in` di css/style.css — inilah yang membuat kaskade terpotong
   * memilih glyph keluar yang jujur.
   */
  var FLAP_TURN_RATIO = 0.5;

  var HOST_CLASS = 'ue-flap-host';
  var ACTIVE_CLASS = 'ue-flap-active';
  var TEXT_CLASS = 'ue-flap-text';
  var CELLS_CLASS = 'ue-flap-cells';
  var CELL_CLASS = 'ue-flap-cell';
  var FLAPPING_CLASS = 'is-flapping';
  var SIZING_CLASS = 'ue-flap-sizing';

  /**
   * Apa yang ditampilkan kolom yang di-reserve tapi kosong. Kolom yang tak
   * dijangkau string baru tidak dihapus di tengah kaskade — ia flap ke
   * kosong dan mempertahankan tempatnya (invariant 4).
   */
  var BLANK = ' ';

  /** State kaskade dalam-terbang, keyed per elemen; tak ada yang disimpan di node. */
  var flapStates = new WeakMap();
  /** Teardown untuk ease lebar dalam-terbang (listener, bukan timer). */
  var widthEases = new WeakMap();

  function positiveNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function nowMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }

  /**
   * Diff dua string menjadi cell flap per-karakter dengan delay distagger.
   *
   * Karakter tak-ubah tidak dianimasikan — cell split-flap nyata yang sudah
   * menampilkan glyph yang benar memang tidak bergerak; autentik dan gratis.
   * Stagger di-rebase pada kolom PERTAMA yang berubah, sehingga label yang
   * kepalanya stabil langsung mulai flip alih-alih menganggur di kolom-kolom
   * yang tak tersentuh.
   *
   * Pure — tanpa DOM, tanpa clock. Ini inti yang di-unit-test.
   */
  function planSplitFlap(fromText, toText, options) {
    options = options || {};
    var charMs = positiveNumber(options.charMs, FLAP_CHAR_MS);
    var baseStagger = positiveNumber(options.staggerMs, FLAP_STAGGER_MS);
    var maxTotalMs = positiveNumber(options.maxTotalMs, FLAP_MAX_TOTAL_MS);

    // Aman code-point: label mungkin membawa pemisah seperti '·'.
    var fromChars = Array.from(String(fromText ?? ''));
    var toChars = Array.from(String(toText ?? ''));
    var width = Math.max(fromChars.length, toChars.length);

    var firstChanged = -1;
    var lastChanged = -1;
    for (var index = 0; index < width; index += 1) {
      if ((fromChars[index] ?? '') !== (toChars[index] ?? '')) {
        if (firstChanged < 0) firstChanged = index;
        lastChanged = index;
      }
    }

    if (firstChanged < 0) {
      return { cells: [], durationMs: 0, staggerMs: 0, changedCount: 0, firstChanged: -1, lastChanged: -1 };
    }

    // Pampatkan stagger agar seluruh kaskade muat dalam budget.
    var span = lastChanged - firstChanged + 1;
    var room = Math.max(0, maxTotalMs - charMs);
    var staggerMs = span > 1 ? Math.min(baseStagger, room / (span - 1)) : 0;

    var cells = [];
    var changedCount = 0;
    for (var i = 0; i < width; i += 1) {
      var from = fromChars[i] ?? '';
      var to = toChars[i] ?? '';
      var changed = from !== to;
      if (changed) changedCount += 1;
      cells.push({
        index: i,
        from: from,
        to: to,
        changed: changed,
        // String mengecil: kolom ini punya glyph lama yang harus flap pergi
        // dan tidak ada yang baru — ia flap ke kosong dan tetap di tempatnya.
        vacating: changed && to === '' && from !== '',
        delayMs: changed ? Math.round((i - firstChanged) * staggerMs) : 0
      });
    }

    return {
      cells: cells,
      durationMs: Math.round((lastChanged - firstChanged) * staggerMs + charMs),
      staggerMs: staggerMs,
      changedCount: changedCount,
      firstChanged: firstChanged,
      lastChanged: lastChanged
    };
  }

  /** Apa yang ditampilkan satu kolom, sebelum atau sesudah ia berbalik. */
  function displayedGlyph(cell, turned) {
    if (!cell.changed) return cell.to;
    return (turned ? cell.to : cell.from) || BLANK;
  }

  /**
   * Glyph yang kaskade SEDANG TAMPILKAN pada `elapsedMs`.
   *
   * Kolom yang belum mencapai delay stagger-nya masih menampilkan glyph lama;
   * yang lewat setengah-putar menampilkan yang baru; kolom tak-ubah tak
   * pernah bergerak. Inilah yang harus flap-pergi oleh perubahan pemotong,
   * sehingga tak ada kolom yang pernah menampilkan glyph yang tak pernah
   * secara visual berlaku.
   *
   * Pure — tanpa DOM.
   */
  function visibleGlyphs(plan, elapsedMs, options) {
    options = options || {};
    var charMs = positiveNumber(options.charMs, FLAP_CHAR_MS);
    var turnRatio = Number.isFinite(Number(options.turnRatio))
      ? Number(options.turnRatio)
      : FLAP_TURN_RATIO;
    var elapsed = Number.isFinite(Number(elapsedMs)) ? Math.max(0, Number(elapsedMs)) : 0;
    var turn = charMs * turnRatio;
    var out = '';
    for (var i = 0; i < (plan?.cells || []).length; i += 1) {
      var cell = plan.cells[i];
      out += displayedGlyph(cell, elapsed >= cell.delayMs + turn);
    }
    return out;
  }

  /** Apakah penontong meminta reduced motion. */
  function prefersReducedMotion() {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Apakah elemen benar-benar di layar saat ini.
   *
   * `getClientRects()` saja tidak cukup: UI bersih/record mode menyembunyikan
   * dengan `opacity: 0` / `visibility: hidden` pada kontainer, dan itu tetap
   * melaporkan client rects. `checkVisibility` menyusuri leluhur untuk
   * properti-properti ini persis; fallback menyusurinya manual.
   */
  function isVisible(element) {
    if (!element?.isConnected) return false;
    if (typeof element.checkVisibility === 'function') {
      try {
        return element.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
          contentVisibilityAuto: true
        });
      } catch (e) {
        return false; // env headless tanpa checkVisibility — lewat animasi, teks tetap benar
      }
    }
    if (typeof element.getClientRects !== 'function') return false;
    if (element.getClientRects().length === 0) return false;
    var view = element.ownerDocument?.defaultView;
    if (typeof view?.getComputedStyle !== 'function') return true;
    for (var node = element; node && node.nodeType === 1; node = node.parentElement) {
      var style = view.getComputedStyle(node);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      if (Number(style.opacity) === 0) return false;
    }
    return true;
  }

  function measureWidth(element) {
    return typeof element.getBoundingClientRect === 'function'
      ? element.getBoundingClientRect().width
      : 0;
  }

  /**
   * Shell permanen label.
   *
   * Dibangun sekali per elemen dan dipakai selamanya: node `Text` di dalam
   * `.ue-flap-text` adalah objek yang sama seumur chip, sehingga perubahan
   * label tidak pernah memparenting ulang apa pun (invariant 1). Dibangun
   * ulang hanya jika sesuatu di luar modul ini telah merusak anak label.
   */
  function ensureHost(element) {
    // Path cepat O(1): jalan di setiap tick chip, termasuk yang tak berubah.
    var text = element.firstElementChild;
    var cells = text?.nextElementSibling;
    if (text?.classList?.contains(TEXT_CLASS)
      && text.firstChild?.nodeType === 3
      && cells?.classList?.contains(CELLS_CLASS)
      && !cells.nextElementSibling) {
      return { text: text, cells: cells };
    }

    var doc = element.ownerDocument || globalThis.document;
    var carried = element.textContent ?? '';
    var nextText = doc.createElement('span');
    nextText.className = TEXT_CLASS;
    nextText.append(doc.createTextNode(carried));
    var nextCells = doc.createElement('span');
    nextCells.className = CELLS_CLASS;
    nextCells.setAttribute('aria-hidden', 'true');
    element.classList.add(HOST_CLASS);
    element.replaceChildren(nextText, nextCells);
    return { text: nextText, cells: nextCells };
  }

  /** Buang transisi lebar, tinggalkan elemen pada lebar alaminya. */
  function clearSizing(element) {
    element.classList?.remove(SIZING_CLASS);
    element.style?.removeProperty('width');
    element.style?.removeProperty('--ue-flap-total');
  }

  function cancelWidthEase(element) {
    var teardown = widthEases.get(element);
    if (!teardown) return;
    widthEases.delete(element);
    teardown();
  }

  /**
   * Ease elemen antar dua lebar terukur.
   *
   * Dipanggil dua kali per perubahan, dan tepat satu dari keduanya yang
   * bekerja: label MEMBESAR menyiapkan kolom barunya saat cells masuk, jadi
   * ease terjadi di awal; label MENGECIL mempertahankan semua kolom untuk
   * seluruh kaskade, jadi longgarnya hanya diambil setelah flap mendarat.
   *
   * Akhir ease adalah listener `transitionend` bukan timer, sehingga satu
   * perubahan tetap menjadwalkan tepat satu `setTimeout` (invariant 2).
   * Transisi yang tak pernah fires tak berbahaya: lebar yang di-pin sama
   * dengan lebar alami yang sedang di-ease ke sana.
   */
  function easeWidth(element, fromWidth, toWidth, durationMs) {
    cancelWidthEase(element);
    if (!(fromWidth > 0.5) || Math.abs(toWidth - fromWidth) <= 0.5) {
      clearSizing(element);
      return false;
    }
    element.style.setProperty('--ue-flap-total', durationMs + 'ms');
    element.style.width = fromWidth + 'px';
    element.classList.add(SIZING_CLASS);
    void element.offsetWidth; // flush nilai awal agar transisi jalan
    element.style.width = toWidth + 'px';

    var finish = function (event) {
      if (event && (event.target !== element || event.propertyName !== 'width')) return;
      cancelWidthEase(element);
      clearSizing(element);
    };
    var teardown = function () {
      element.removeEventListener('transitionend', finish);
      element.removeEventListener('transitioncancel', finish);
    };
    element.addEventListener('transitionend', finish);
    element.addEventListener('transitioncancel', finish);
    widthEases.set(element, teardown);
    return true;
  }

  function clearFlapTimer(element) {
    var state = flapStates.get(element);
    if (!state) return;
    clearTimeout(state.timer);
    flapStates.delete(element);
  }

  /**
   * Kembalikan label ke kondisi istirahat: teks asli terlihat, tanpa cells.
   *
   * Node `Text` tidak disentuh selain datanya, dan tak satu pun span permanen
   * dihapus — hanya cells dekoratif yang dikosongkan.
   */
  function rest(element, host) {
    element.classList.remove(ACTIVE_CLASS);
    host.cells.replaceChildren();
    element.style?.removeProperty('--ue-flap-dur');
    // Teks asli adalah nama aksesibel; aria-label basi dari render sebelumnya
    // akan menutupinya.
    element.removeAttribute?.('aria-label');
  }

  /** Cabut cells saat kaskade mendarat, lalu ambil longgar lebar. */
  function settle(element, expected, easeMs) {
    flapStates.delete(element);
    // Label baru memenangkan balapan — biarkan cells-nya.
    if (element.textContent !== expected) return;
    var host = ensureHost(element);
    var cascadeWidth = measureWidth(element);
    cancelWidthEase(element);
    clearSizing(element);
    rest(element, host);
    var naturalWidth = measureWidth(element);
    easeWidth(element, cascadeWidth, naturalWidth, easeMs);
  }

  /**
   * Set label chip, memflip karakter berubah ke tempatnya.
   *
   * Aman dipanggil setiap tick: tick yang tak mengubah apa pun harus no-op,
   * atau animasinya akan restart selamanya. Mengembalikan apakah flap
   * benar-benar dimulai.
   */
  function setSplitFlapText(element, text, options) {
    options = options || {};
    if (!element) return false;
    var next = String(text ?? '');
    // Upgrade ke shell permanen DULU, agar perubahan struktural satu-waktu itu
    // terjadi di tick saat teks tidak berubah. (invariant 1)
    var host = ensureHost(element);
    // textContent adalah string TERDIAM bahkan di tengah kaskade — cek
    // idempotensi yang tepat melawan ticker chip berulang.
    var settled = element.textContent ?? '';
    if (settled === next) return false;

    // Apa yang SUDAH TERLIHAT penonton. Di tengah kaskade itu bukan string
    // terdiam: kolom yang stagger-nya belum lewat masih menampilkan glyph
    // label sebelumnya, dan itu yang harus flap pergi.
    var state = flapStates.get(element);
    var displayed = state
      ? visibleGlyphs(state.plan, nowMs() - state.startedAt, { charMs: state.charMs })
      : settled;
    clearFlapTimer(element);

    var beforeWidth = measureWidth(element);

    var animate = SPLIT_FLAP_ENABLED
      && options.immediate !== true
      && !prefersReducedMotion()
      && isVisible(element);

    var plan = animate ? planSplitFlap(displayed, next, options) : null;

    // SATU-SATUNYA OPERASI TEKS. Satu mutasi characterData, tanpa
    // reparenting — label tak pernah kosong sesaat dan live region tak
    // pernah melihat pasangan pembuangan/pemasukan (invariant 1).
    host.text.firstChild.data = next;

    if (!plan?.changedCount) {
      cancelWidthEase(element);
      clearSizing(element);
      rest(element, host);
      return false;
    }

    var doc = element.ownerDocument || globalThis.document;
    var charMs = positiveNumber(options.charMs, FLAP_CHAR_MS);

    var cellNodes = [];
    for (var i = 0; i < plan.cells.length; i += 1) {
      var cell = plan.cells[i];
      var node = doc.createElement('span');
      node.className = CELL_CLASS;
      // Setiap kolom membawa wajah masuk in-flow, jadi tiap kolom memegang
      // lebar dan indeksnya sepanjang kaskade (invariant 4). Kolom yang tak
      // dijangkau string baru flap ke kosong, bukan runtuh.
      node.dataset.flapNext = cell.to || BLANK;
      if (cell.changed) {
        node.classList.add(FLAPPING_CLASS);
        node.dataset.flapPrev = cell.from || BLANK;
        node.style.setProperty('--ue-flap-delay', cell.delayMs + 'ms');
      }
      cellNodes.push(node);
    }

    element.removeAttribute('aria-label');
    cancelWidthEase(element);
    clearSizing(element);
    host.cells.replaceChildren(...cellNodes);
    element.classList.add(ACTIVE_CLASS);
    element.style.setProperty('--ue-flap-dur', charMs + 'ms');

    // Lebar, fase satu. Label MEMBESAR menyiapkan kolom barunya saat cells
    // masuk (ease dari lebar layar ke lebar kaskade); label MENGECIL sudah
    // pada lebar kaskade, jadi ini no-op — ease terjadi di settle().
    easeWidth(element, beforeWidth, measureWidth(element), plan.durationMs);

    // Satu-satunya timer yang dijadwalkan perubahan ini (invariant 2).
    flapStates.set(element, {
      plan: plan,
      charMs: charMs,
      startedAt: nowMs(),
      timer: setTimeout(
        function () { settle(element, next, plan.durationMs); },
        plan.durationMs + FLAP_SETTLE_SLACK_MS
      )
    });
    return true;
  }

  global.UESplitFlap = {
    set: setSplitFlapText,
    // ekspos pure core untuk test
    plan: planSplitFlap,
    visibleGlyphs: visibleGlyphs,
    CHAR_MS: FLAP_CHAR_MS,
    STAGGER_MS: FLAP_STAGGER_MS,
    MAX_TOTAL_MS: FLAP_MAX_TOTAL_MS
  };
})(window);
