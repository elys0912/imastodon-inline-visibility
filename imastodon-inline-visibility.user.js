// ==UserScript==
// @name         imastodon 公開範囲・引用ワンクリック切り替え
// @namespace    https://github.com/elys0912
// @version      3.2.0
// @author       elys0912
// @license      MIT AND Apache-2.0
// @homepageURL  https://github.com/elys0912/imastodon-inline-visibility
// @supportURL   https://github.com/elys0912/imastodon-inline-visibility/issues
// @downloadURL  https://github.com/elys0912/imastodon-inline-visibility/releases/latest/download/imastodon-inline-visibility.user.js
// @updateURL    https://github.com/elys0912/imastodon-inline-visibility/releases/latest/download/imastodon-inline-visibility.user.js
// @description  投稿欄の「公開範囲と引用」ダイアログを、ワンクリックで切り替えられるアイコンボタン列に置き換えます（Mastodon 4.5+）
// @match        https://imastodon.net/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // icon: ICON_PATHS のキー / label: 選択中だけ表示する短い名前 / title: ツールチップ
  const VISIBILITY = [
    { value: 'public', icon: 'public', label: '公開', title: '公開：Mastodon の内外を問わず誰でも' },
    { value: 'unlisted', icon: 'quiet', label: 'ひかえめ', title: 'ひかえめな公開：検索・トレンド・公開タイムラインには表示しない' },
    { value: 'private', icon: 'lock', label: 'フォロワー', title: 'フォロワーのみ' },
    { value: 'direct', icon: 'at', label: '指定のみ', title: '指定された相手のみ：投稿内でメンションした相手のみ' },
  ];
  const QUOTE = [
    { value: 'public', icon: 'quote', label: '誰でも', title: '引用：誰でも引用できる' },
    { value: 'followers', icon: 'group', label: 'フォロワー', title: '引用：フォロワーだけが引用できる' },
    { value: 'nobody', icon: 'quoteOff', label: '自分のみ', title: '引用：他の人は引用できない' },
  ];

  // 本家の公開範囲ボタン（imas/mastodon の features/compose/components/visibility_button.tsx）が中に持つアイコン。
  // Icon は `icon-${id}` を付け、公開範囲ごとに globe / unlock / lock / at のどれかになる
  const VISIBILITY_ICON_SELECTOR = 'svg.icon-globe, svg.icon-unlock, svg.icon-lock, svg.icon-at';

  // Node.ELEMENT_NODE の値。node のテストには Node が無いため値で持つ。
  // テストが使う hasAddedElement から参照するので、下の分岐より前で宣言する
  const ELEMENT_NODE = 1;

  // node のテスト（test/）から読み込まれたときは、DOM に触れない判定の関数だけを渡す
  if (typeof document === 'undefined') {
    module.exports = { VISIBILITY, QUOTE, groupStates, hasKnownValues, findVisibilityButton, needsRead, hasAddedElement };
    return;
  }

  // ---- Redux store を React の内部から拾う ----
  let store = null;
  let unsubscribe = null;
  // 状態を読めなくなったら true（以後は何もせず、本家のボタンに任せる）
  let stopped = false;
  // inject で隠した本家のボタン。stop で位置関係に頼らずに戻すため記録する
  const hiddenButtons = new Set();
  function findStore(el) {
    if (stopped) return null;
    if (store) return store;
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    let fiber = key ? el[key] : null;
    while (fiber) {
      const s = fiber.memoizedProps && fiber.memoizedProps.store;
      if (s && typeof s.dispatch === 'function' && typeof s.getState === 'function') {
        store = s;
        unsubscribe = store.subscribe(syncAll);
        return store;
      }
      fiber = fiber.return;
    }
    return null;
  }

  // ---- スタイル ----
  // 枠と文字色は Mastodon 本体のボタンの .dropdown-button を借り、中のボタンは currentColor 基準で塗る
  const style = document.createElement('style');
  style.textContent = `
    .compose-form__dropdowns > .tm-vis-wrap { display: contents !important; }
    .compose-form__dropdowns > .tm-vis-wrap + button.dropdown-button { display: none !important; }

    .tm-seg.dropdown-button {
      display: inline-flex; align-items: center; gap: 2px;
      padding: 2px; overflow: visible; cursor: default;
    }
    .tm-seg.tm-disabled { opacity: .5; }
    .tm-seg > button {
      display: inline-flex; align-items: center; gap: 4px;
      margin: 0; padding: 3px 6px; border: 0; border-radius: 4px;
      background: transparent; color: inherit;
      font: inherit; font-size: 13px; line-height: normal; white-space: nowrap;
      cursor: pointer;
    }
    .tm-seg > button .icon { width: 16px; height: 16px; flex: 0 0 auto; }
    .tm-seg > button .tm-label { display: none; }
    .tm-seg > button:hover:not(:disabled) {
      background: rgba(127, 127, 127, .15);
      background: color-mix(in srgb, currentColor 12%, transparent);
    }
    .tm-seg > button[aria-checked="true"] {
      background: rgba(127, 127, 127, .25);
      background: color-mix(in srgb, currentColor 22%, transparent);
      font-weight: 500;
    }
    .tm-seg > button[aria-checked="true"] .tm-label { display: inline; }
    .tm-seg > button:disabled { cursor: not-allowed; }
    .tm-seg > button:disabled:not([aria-checked="true"]) { opacity: .35; }
    .tm-seg > button:focus-visible { outline: 2px solid currentColor; outline-offset: -1px; }
  `;
  addStyle(style);

  // Mastodon は CSP でインラインの <style> を禁止しているため、そのままでは CSS が一切効かない。
  // ページが使っている nonce を借りる方法と、CSP の対象外の Constructable Stylesheet の二段構えで適用する。
  function addStyle(styleEl) {
    const nonceEl = document.querySelector('style[nonce], script[nonce], link[nonce]');
    const nonce = nonceEl && (nonceEl.nonce || nonceEl.getAttribute('nonce'));
    if (nonce) styleEl.nonce = nonce;
    document.head.appendChild(styleEl);
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(styleEl.textContent);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    } catch (e) {
      console.warn('[tm-vis] スタイルの適用に失敗しました', e);
    }
  }

  // ---- 状態の読み出し ----
  // 読むのは compose と、引用中の引用元（statuses）だけ。ほかの値を読むように足したら、needsRead も合わせて直す
  function readState(state = store.getState()) {
    const compose = state.compose;
    const quotedId = compose.get('quoted_status_id');
    return {
      privacy: compose.get('privacy') || 'public',
      quotePolicy: compose.get('quote_policy') || 'public',
      isEditing: compose.get('id') != null,
      quotedId,
      quotedVis: quotedId ? state.statuses.getIn([quotedId, 'visibility']) : null,
    };
  }

  // ---- 本家と同じ制限 ----
  // 状態 s から、ボタン列ごとに、選択中の値（current）・選べない値（isDisabled）・列ごと選べないか（groupDisabled）を返す
  function groupStates(s) {
    const quoteLocked = s.privacy === 'private' || s.privacy === 'direct';
    return {
      vis: {
        current: s.privacy,
        isDisabled: (v) => {
          // 非公開投稿の自己引用では、公開・ひかえめにできない
          const widensPrivateSelfQuote = s.quotedVis === 'private' && (v === 'public' || v === 'unlisted');
          // 引用中の DM 化は、Mastodon 本体の変換処理を再現しないため不可
          const isDirectWhileQuoting = !!s.quotedId && v === 'direct';
          return widensPrivateSelfQuote || isDirectWhileQuoting;
        },
        groupDisabled: s.isEditing,
      },
      quote: {
        current: quoteLocked ? 'nobody' : s.quotePolicy,
        isDisabled: () => false,
        groupDisabled: quoteLocked,
      },
    };
  }

  // どちらの列も、選択中の値がボタンのどれかに当たるなら true
  function hasKnownValues(states) {
    const isKnownVisibility = VISIBILITY.some((item) => item.value === states.vis.current);
    const isKnownQuote = QUOTE.some((item) => item.value === states.quote.current);
    return isKnownVisibility && isKnownQuote;
  }

  // ---- ボタン列の作成 ----
  function makeGroup(kind, ariaLabel, items, onPick) {
    const group = document.createElement('span');
    group.className = 'dropdown-button tm-seg';
    group.dataset.tmKind = kind;
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', ariaLabel);
    for (const item of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.value = item.value;
      b.title = item.title;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', item.title);
      b.innerHTML = `${svgIcon(item.icon)}<span class="tm-label"></span>`;
      b.querySelector('.tm-label').textContent = item.label;
      b.addEventListener('click', () => {
        if (!store || b.disabled || b.getAttribute('aria-checked') === 'true') return;
        onPick(item.value);
      });
      group.appendChild(b);
    }
    // ←→キーで隣の選択肢へ
    group.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const btns = [...group.querySelectorAll('button:not(:disabled)')];
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = btns[(i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length];
      next.focus();
      next.click();
    });
    return group;
  }

  // 投稿欄のボタンの並び（.compose-form__dropdowns）から、本家の公開範囲ボタンを探す。
  // 並び順ではなく中身（公開範囲のアイコン）で見分け、言語のボタンなど隣のボタンを取り違えない。見つからなければ null
  function findVisibilityButton(dropdowns) {
    for (const el of dropdowns.children) {
      if (el.matches('button.dropdown-button') && el.querySelector(VISIBILITY_ICON_SELECTOR)) return el;
    }
    return null;
  }

  // 本家のボタンが見つからなかったことを、コンソールに知らせたか（知らせるのは 1 回だけ）
  let warnedNoButton = false;

  function inject(form) {
    const dropdowns = form.querySelector('.compose-form__dropdowns');
    if (!dropdowns || dropdowns.querySelector('.tm-vis-wrap')) return;
    // 本家のボタンが見つからない（Mastodon の画面の作りが変わった等）ときは、手を出さず本家のままにする
    const orig = findVisibilityButton(dropdowns);
    if (!orig) {
      if (!warnedNoButton) {
        warnedNoButton = true;
        console.warn('[tm-vis] 本家の公開範囲ボタンが見つからないため、ボタン列を出しません');
      }
      return;
    }
    if (!findStore(form)) return;

    const wrap = document.createElement('div');
    wrap.className = 'tm-vis-wrap';
    wrap.append(
      makeGroup('vis', '公開範囲', VISIBILITY, (v) =>
        store.dispatch({ type: 'compose/visibility_change', payload: v, meta: { arg: v } })),
      makeGroup('quote', '引用できる人', QUOTE, (v) =>
        store.dispatch({ type: 'compose/setQuotePolicy', payload: v })),
    );
    // 状態を反映できてから本家のボタンを隠す。反映できなければ本家のボタンのままにする
    try {
      sync(wrap);
    } catch (e) {
      stop(e);
      return;
    }

    // 本家のボタンの直前に置く（CSS の `.tm-vis-wrap + button.dropdown-button` も、このボタンを指す）
    dropdowns.insertBefore(wrap, orig);
    orig.style.setProperty('display', 'none', 'important');
    // 投稿欄ごと消えたボタンは戻す必要がないので、記録から外す
    for (const button of hiddenButtons) {
      if (!button.isConnected) hiddenButtons.delete(button);
    }
    hiddenButtons.add(orig);
  }

  // ---- ストアの状態を反映 ----
  function apply(group, { current, isDisabled, groupDisabled }) {
    group.classList.toggle('tm-disabled', groupDisabled);
    for (const b of group.querySelectorAll('button')) {
      const v = b.dataset.value;
      const checked = v === current;
      b.setAttribute('aria-checked', String(checked));
      b.tabIndex = checked ? 0 : -1;
      b.disabled = groupDisabled || isDisabled(v);
    }
  }

  // 選択中の値がボタンのどれにも当たらない（Mastodon が公開範囲の値を足した等）ときは例外を投げる。
  // 呼び出し側が stop し、今の公開範囲が画面から分からなくならないよう本家のボタンに戻す
  function sync(wrap, s = readState()) {
    const states = groupStates(s);
    if (!hasKnownValues(states)) {
      throw new Error(`公開範囲・引用の値が想定外です（${s.privacy} / ${s.quotePolicy}）`);
    }

    const visGroup = wrap.querySelector('[data-tm-kind="vis"]');
    const qGroup = wrap.querySelector('[data-tm-kind="quote"]');
    apply(visGroup, states.vis);
    visGroup.title = s.isEditing ? '投稿後は公開範囲を変更できません' : '';
    apply(qGroup, states.quote);
    qGroup.title = states.quote.groupDisabled ? 'この公開範囲では他の人は引用できません' : '';
  }

  // store の通知のうち、値の読み直しが要るものか。prev は前に読んだときの { compose, statuses }。
  // 投稿欄の状態（compose）が変わったとき。引用中は、引用元の公開範囲が変わりうるので投稿の一覧（statuses）が変わったときも。
  // Immutable の Map は中身が変わると別のオブジェクトになるので、同じオブジェクトかどうかだけで比べる
  function needsRead(prev, state) {
    if (!prev || state.compose !== prev.compose) return true;
    return prev.compose.get('quoted_status_id') != null && state.statuses !== prev.statuses;
  }

  // store はタイムライン更新などあらゆる action で通知してくるので、needsRead が真のときだけ値を読み、
  // 読んだ値（公開範囲・引用など）が前と違うときだけ DOM を触る。
  // 購読者の例外は dispatch の呼び出し元（本家の投稿・タイムライン更新など）へ投げられるので、ここで止める
  let lastSeen = null;
  let lastKey = null;
  function syncAll() {
    try {
      const state = store.getState();
      if (!needsRead(lastSeen, state)) return;
      lastSeen = { compose: state.compose, statuses: state.statuses };
      const s = readState(state);
      const key = [s.privacy, s.quotePolicy, s.isEditing, s.quotedId, s.quotedVis].join('|');
      if (key === lastKey) return;
      lastKey = key;
      document.querySelectorAll('.tm-vis-wrap').forEach((wrap) => sync(wrap, s));
    } catch (e) {
      stop(e);
    }
  }

  // Mastodon の更新で状態の形が変わった等で読めなくなったら、本家のボタンを戻して追加した UI を外し、監視と購読をやめる。
  // stop は購読者の catch から呼ばれるので、ここから例外を出すと dispatch の呼び出し元へ漏れる。
  // 手順ごとに例外を捕まえ、1 つが失敗しても残りを続ける。本家の操作に直結する DOM の復元を最初に行う
  function stop(error) {
    if (stopped) return;
    stopped = true;
    tryStep('警告の出力', () => console.warn('[tm-vis] 投稿欄の状態を読めないため停止し、本家のボタンに戻します', error));
    for (const button of hiddenButtons) {
      tryStep('本家のボタンの復元', () => button.style.removeProperty('display'));
    }
    hiddenButtons.clear();
    tryStep('ボタン列の取得', () => {
      for (const wrap of document.querySelectorAll('.tm-vis-wrap')) {
        tryStep('ボタン列の撤去', () => wrap.remove());
      }
    });
    tryStep('監視の停止', () => observer.disconnect());
    tryStep('購読の解除', () => {
      const unsubscribeStore = unsubscribe;
      unsubscribe = null;
      if (typeof unsubscribeStore === 'function') unsubscribeStore();
    });
  }

  // stop の 1 手順を実行する。例外は外へ出さない（警告の出力が失敗しても握りつぶす）
  function tryStep(name, step) {
    try {
      step();
    } catch (e) {
      try {
        console.warn(`[tm-vis] 停止処理（${name}）に失敗しました`, e);
      } catch {
        // 警告も出せないときは何もしない
      }
    }
  }

  // ---- Material Symbols（Mastodon 本体の UI と同じアイコン） ----
  // Copyright Google LLC. Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0
  // 全文と利用箇所はリポジトリの LICENSES/Apache-2.0.txt と THIRD_PARTY_NOTICES.md（https://github.com/elys0912/imastodon-inline-visibility）
  // #region ICON_PATHS
  const ICON_PATHS = {
    public: 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm-40-82v-78q-33 0-56.5-23.5T360-320v-40L168-552q-3 18-5.5 36t-2.5 36q0 121 79.5 212T440-162Zm276-102q41-45 62.5-100.5T800-480q0-98-54.5-179T600-776v16q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h240q17 0 28.5 11.5T600-440v120h40q26 0 47 15.5t29 40.5Z',
    quiet: 'M484-80q-84 0-157.5-32t-128-86.5Q144-253 112-326.5T80-484q0-146 93-257.5T410-880q-18 99 11 193.5T521-521q71 71 165.5 100T880-410q-26 144-138 237T484-80Zm0-80q88 0 163-44t118-121q-86-8-163-43.5T464-465q-61-61-97-138t-43-163q-77 43-120.5 118.5T160-484q0 135 94.5 229.5T484-160Zm-20-305Z',
    lock: 'M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z',
    at: 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480v58q0 59-40.5 100.5T740-280q-35 0-66-15t-52-43q-29 29-65.5 43.5T480-280q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480v58q0 26 17 44t43 18q26 0 43-18t17-44v-58q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93h200v80H480Zm0-280q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z',
    group: 'M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 320Zm0-400Z',
    quote: 'm228-240 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T458-480L320-240h-92Zm360 0 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T818-480L680-240h-92ZM320-500q25 0 42.5-17.5T380-560q0-25-17.5-42.5T320-620q-25 0-42.5 17.5T260-560q0 25 17.5 42.5T320-500Zm360 0q25 0 42.5-17.5T740-560q0-25-17.5-42.5T680-620q-25 0-42.5 17.5T620-560q0 25 17.5 42.5T680-500Zm0-60Zm-360 0Z',
    quoteOff: 'M791-56 425-422 320-240h-92l92-160q-66 0-113-47t-47-113q0-27 8.5-51t23.5-44L56-791l56-57 736 736-57 56Zm-55-281L520-553v-7q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T818-480l-82 143ZM320-500q6 0 12-1t11-3l-79-79q-2 5-3 11t-1 12q0 25 17.5 42.5T320-500Zm360 0q25 0 42.5-17.5T740-560q0-25-17.5-42.5T680-620q-25 0-42.5 17.5T620-560q0 25 17.5 42.5T680-500Zm-374-41Zm374-19Z',
  };
  // #endregion
  function svgIcon(name) {
    return `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="${ICON_PATHS[name]}"/></svg>`;
  }

  // ---- 投稿欄の出現を監視（デッキのカラム切り替え・返信モーダル等） ----
  function scan() {
    document.querySelectorAll('form.compose-form').forEach(inject);
  }

  // MutationObserver の記録のうち、要素が追加されたものがあるか。投稿欄が新しく出た可能性があるのはこのときだけ
  // （削除だけ・文字だけの変化では走査しない）
  function hasAddedElement(records) {
    return records.some((r) => Array.prototype.some.call(r.addedNodes, (n) => n.nodeType === ELEMENT_NODE));
  }

  // 変更が連続しても 1 フレームに 1 回だけ走査する
  let scanQueued = false;
  const observer = new MutationObserver((records) => {
    if (scanQueued || !hasAddedElement(records)) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      if (!stopped) scan();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
})();
