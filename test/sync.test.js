'use strict';

// store の通知のうち、値を読み直すものの判定を確かめる。ユーザースクリプトを node で読み込み、判定の関数だけを使う
const test = require('node:test');
const assert = require('node:assert');

const { needsRead } = require('../imastodon-inline-visibility.user.js');

// 投稿欄の状態（Immutable の Map）の代わり。needsRead が読むのは quoted_status_id だけ
function fakeCompose(quotedId = null) {
  return { get: (key) => (key === 'quoted_status_id' ? quotedId : undefined) };
}

test('変化を見落とさない：投稿欄の状態が変わったとき、引用中は投稿の一覧が変わったときも読み直す', () => {
  const compose = fakeCompose();
  const statuses = {};

  assert.strictEqual(needsRead(null, { compose, statuses }), true, '初回');
  // 公開範囲の切り替え・返信で公開範囲が自動で変わった等
  assert.strictEqual(needsRead({ compose, statuses }, { compose: fakeCompose(), statuses }), true, '投稿欄の変化');

  // 引用元の投稿の公開範囲が変わると、選べる公開範囲が変わる
  const quoting = fakeCompose('1');
  assert.strictEqual(needsRead({ compose: quoting, statuses }, { compose: quoting, statuses: {} }), true, '引用中の投稿の一覧の変化');
});

test('無関係な変化では読まない：投稿欄が同じなら読まず、引用していなければ投稿の一覧の変化も無視する', () => {
  const compose = fakeCompose();
  const statuses = {};

  assert.strictEqual(needsRead({ compose, statuses }, { compose, statuses }), false, '変化なし');
  const quoting = fakeCompose('1');
  assert.strictEqual(needsRead({ compose: quoting, statuses }, { compose: quoting, statuses }), false, '引用中で変化なし');
  // タイムラインが流れるたびに投稿の一覧は変わる
  assert.strictEqual(needsRead({ compose, statuses }, { compose, statuses: {} }), false, '引用していないときの投稿の一覧の変化');
});
