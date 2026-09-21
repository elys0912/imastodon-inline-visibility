// ==UserScript==
// @name         imastodon 公開範囲・引用ワンクリック切り替え
// @namespace    https://imastodon.net/
// @version      3.0.1
// @description  投稿欄の「公開範囲と引用」ダイアログを、ワンクリックで切り替えられるアイコンボタン列に置き換えます（Mastodon 4.5+）
// @match        https://imastodon.net/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // ---- Material Symbols（本家と同じアイコン） ----
  const P = {
    public: 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm-40-82v-78q-33 0-56.5-23.5T360-320v-40L168-552q-3 18-5.5 36t-2.5 36q0 121 79.5 212T440-162Zm276-102q41-45 62.5-100.5T800-480q0-98-54.5-179T600-776v16q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h240q17 0 28.5 11.5T600-440v120h40q26 0 47 15.5t29 40.5Z',
    quiet: 'M484-80q-84 0-157.5-32t-128-86.5Q144-253 112-326.5T80-484q0-146 93-257.5T410-880q-18 99 11 193.5T521-521q71 71 165.5 100T880-410q-26 144-138 237T484-80Zm0-80q88 0 163-44t118-121q-86-8-163-43.5T464-465q-61-61-97-138t-43-163q-77 43-120.5 118.5T160-484q0 135 94.5 229.5T484-160Zm-20-305Z',
    lock: 'M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z',
    at: 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480v58q0 59-40.5 100.5T740-280q-35 0-66-15t-52-43q-29 29-65.5 43.5T480-280q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480v58q0 26 17 44t43 18q26 0 43-18t17-44v-58q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93h200v80H480Zm0-280q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z',
    group: 'M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 320Zm0-400Z',
    person: 'M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z',
    quote: 'm228-240 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T458-480L320-240h-92Zm360 0 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T818-480L680-240h-92ZM320-500q25 0 42.5-17.5T380-560q0-25-17.5-42.5T320-620q-25 0-42.5 17.5T260-560q0 25 17.5 42.5T320-500Zm360 0q25 0 42.5-17.5T740-560q0-25-17.5-42.5T680-620q-25 0-42.5 17.5T620-560q0 25 17.5 42.5T680-500Zm0-60Zm-360 0Z',
    quoteOff: 'M791-56 425-422 320-240h-92l92-160q-66 0-113-47t-47-113q0-27 8.5-51t23.5-44L56-791l56-57 736 736-57 56Zm-55-281L520-553v-7q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T818-480l-82 143ZM320-500q6 0 12-1t11-3l-79-79q-2 5-3 11t-1 12q0 25 17.5 42.5T320-500Zm360 0q25 0 42.5-17.5T740-560q0-25-17.5-42.5T680-620q-25 0-42.5 17.5T620-560q0 25 17.5 42.5T680-500Zm-374-41Zm374-19Z',
  };
  const icon = (d) =>
    `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;

  // label: 選択中だけ表示する短い名前 / title: ツールチップ
  const VISIBILITY = [
    { value: 'public', icon: P.public, label: '公開', title: '公開：Mastodon の内外を問わず誰でも' },
    { value: 'unlisted', icon: P.quiet, label: 'ひかえめ', title: 'ひかえめな公開：検索・トレンド・公開タイムラインには表示しない' },
    { value: 'private', icon: P.lock, label: 'フォロワー', title: 'フォロワーのみ' },
    { value: 'direct', icon: P.at, label: '指定のみ', title: '指定された相手のみ：投稿内でメンションした相手のみ' },
  ];
  const QUOTE = [
    { value: 'public', icon: P.quote, label: '誰でも', title: '引用：誰でも引用できる' },
    { value: 'followers', icon: P.group, label: 'フォロワー', title: '引用：フォロワーだけが引用できる' },
    { value: 'nobody', icon: P.quoteOff, label: '自分のみ', title: '引用：他の人は引用できない' },
  ];

  // ---- Redux store を React の内部から拾う ----
  let store = null;
  function findStore(el) {
    if (store) return store;
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    let fiber = key ? el[key] : null;
    while (fiber) {
      const s = fiber.memoizedProps && fiber.memoizedProps.store;
      if (s && typeof s.dispatch === 'function' && typeof s.getState === 'function') {
        store = s;
        store.subscribe(syncAll);
        return store;
      }
      fiber = fiber.return;
    }
    return null;
  }

  // ---- スタイル ----
  // 枠と文字色は本家ボタンの .dropdown-button を借り、中のボタンは currentColor 基準で塗る
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
  function readState() {
    const state = store.getState();
    const compose = state.compose;
    const quotedId = compose.get('quoted_status_id');
    const privacy = compose.get('privacy') || 'public';
    return {
      privacy,
      quotePolicy: compose.get('quote_policy') || 'public',
      isEditing: compose.get('id') != null,
      quotedId,
      quotedVis: quotedId ? state.statuses.getIn([quotedId, 'visibility']) : null,
      quoteLocked: privacy === 'private' || privacy === 'direct',
    };
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
      b.innerHTML = `${icon(item.icon)}<span class="tm-label"></span>`;
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

  function inject(form) {
    const dropdowns = form.querySelector('.compose-form__dropdowns');
    if (!dropdowns || dropdowns.querySelector('.tm-vis-wrap')) return;
    if (!findStore(form)) return;

    const wrap = document.createElement('div');
    wrap.className = 'tm-vis-wrap';
    wrap.append(
      makeGroup('vis', '公開範囲', VISIBILITY, (v) =>
        store.dispatch({ type: 'compose/visibility_change', payload: v, meta: { arg: v } })),
      makeGroup('quote', '引用できる人', QUOTE, (v) =>
        store.dispatch({ type: 'compose/setQuotePolicy', payload: v })),
    );
    dropdowns.insertBefore(wrap, dropdowns.firstChild);
    const orig = wrap.nextElementSibling;
    if (orig && orig.matches('button.dropdown-button')) orig.style.setProperty('display', 'none', 'important');
    sync(wrap);
  }

  // ---- ストアの状態を反映 ----
  function apply(group, current, isDisabled, groupDisabled) {
    group.classList.toggle('tm-disabled', groupDisabled);
    for (const b of group.querySelectorAll('button')) {
      const v = b.dataset.value;
      const checked = v === current;
      b.setAttribute('aria-checked', String(checked));
      b.tabIndex = checked ? 0 : -1;
      b.disabled = groupDisabled || isDisabled(v);
    }
  }

  function sync(wrap) {
    if (!store) return;
    const s = readState();
    const visGroup = wrap.querySelector('[data-tm-kind="vis"]');
    const qGroup = wrap.querySelector('[data-tm-kind="quote"]');

    apply(
      visGroup,
      s.privacy,
      (v) =>
        (s.quotedVis === 'private' && (v === 'public' || v === 'unlisted')) || // 非公開投稿の自己引用
        (!!s.quotedId && v === 'direct'), // 引用中のDM化は本家の変換処理を再現しないので不可
      s.isEditing,
    );
    visGroup.title = s.isEditing ? '投稿後は公開範囲を変更できません' : '';

    apply(qGroup, s.quoteLocked ? 'nobody' : s.quotePolicy, () => false, s.quoteLocked);
    qGroup.title = s.quoteLocked ? 'この公開範囲では他の人は引用できません' : '';
  }

  function syncAll() {
    document.querySelectorAll('.tm-vis-wrap').forEach(sync);
  }

  // ---- 投稿欄の出現を監視（デッキのカラム切り替え・返信モーダル等） ----
  function scan() {
    document.querySelectorAll('form.compose-form').forEach(inject);
  }
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();
