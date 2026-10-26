'use strict';

// 投稿欄の見つけ方を確かめる。ユーザースクリプトを node で読み込み、DOM に触れない判定の関数だけを使う
const test = require('node:test');
const assert = require('node:assert');

const { findVisibilityButton, hasAddedElement } = require('../imastodon-inline-visibility.user.js');

// findVisibilityButton が使う分だけを持つ、投稿欄のボタンの代わり。icon は中の svg の `icon-<id>`（無ければアイコン無し）
function fakeButton(name, icon = null) {
  return {
    name,
    matches: (selector) => selector === 'button.dropdown-button',
    querySelector: (selector) => (icon && selector.split(', ').includes(`svg.icon-${icon}`) ? {} : null),
  };
}

test('本家の公開範囲ボタンを、並び順ではなく中身（公開範囲のアイコン）で見つけ、無ければ手を出さない', () => {
  const language = fakeButton('language');

  // 公開範囲の既定値は人によって違う（フォロワーのみが既定の人もいる）ので、4 種のどのアイコンでも見つける
  for (const icon of ['globe', 'unlock', 'lock', 'at']) {
    const visibility = fakeButton('visibility', icon);
    assert.strictEqual(findVisibilityButton({ children: [visibility, language] }), visibility, icon);
    // 言語のボタンが先に並んでも取り違えない
    assert.strictEqual(findVisibilityButton({ children: [language, visibility] }), visibility, `${icon}（後ろ）`);
  }

  // 本家のボタンが無ければ null（ボタン列を差し込まず、本家のままにする）
  assert.strictEqual(findVisibilityButton({ children: [language] }), null);
});

test('要素が追加された変化のときだけ、投稿欄を探し直す', () => {
  const element = { nodeType: 1 };
  const text = { nodeType: 3 };

  assert.strictEqual(hasAddedElement([]), false);
  assert.strictEqual(hasAddedElement([{ addedNodes: [] }]), false, '削除だけ');
  assert.strictEqual(hasAddedElement([{ addedNodes: [text] }]), false, '文字だけ');
  assert.strictEqual(hasAddedElement([{ addedNodes: [text] }, { addedNodes: [element] }]), true, '要素の追加を含む');
});
