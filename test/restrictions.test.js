'use strict';

// ボタン列の制限（README の「本家と同じ制限」）を確かめる。ユーザースクリプトを node で読み込み、判定の関数だけを使う
const test = require('node:test');
const assert = require('node:assert');

const { VISIBILITY, QUOTE, groupStates, hasKnownValues } = require('../imastodon-inline-visibility.user.js');

// 制限の掛からない状態（公開・誰でも引用できる・新規の投稿・引用なし）
const BASE = { privacy: 'public', quotePolicy: 'public', isEditing: false, quotedId: null, quotedVis: null };

// ボタン列のうち、選べない値の一覧
function disabledValues(group, items) {
  return items.map((item) => item.value).filter((v) => group.groupDisabled || group.isDisabled(v));
}

test('制限が無ければ、どのボタンも選べ、選択中は状態の値になる', () => {
  const states = groupStates(BASE);

  assert.strictEqual(states.vis.current, 'public');
  assert.strictEqual(states.quote.current, 'public');
  assert.deepStrictEqual(disabledValues(states.vis, VISIBILITY), []);
  assert.deepStrictEqual(disabledValues(states.quote, QUOTE), []);
});

test('フォロワーのみ・指定のみでは、引用は「自分のみ」で固定し、列ごと選べない', () => {
  for (const privacy of ['private', 'direct']) {
    const states = groupStates({ ...BASE, privacy, quotePolicy: 'public' });

    assert.strictEqual(states.quote.current, 'nobody', privacy);
    assert.strictEqual(states.quote.groupDisabled, true, privacy);
  }
  assert.strictEqual(groupStates({ ...BASE, privacy: 'unlisted' }).quote.groupDisabled, false);
});

test('編集中は、公開範囲を列ごと選べない', () => {
  const states = groupStates({ ...BASE, isEditing: true });

  assert.strictEqual(states.vis.groupDisabled, true);
  assert.strictEqual(states.quote.groupDisabled, false);
});

test('非公開投稿の自己引用では、公開とひかえめを選べない', () => {
  const states = groupStates({ ...BASE, privacy: 'private', quotedId: '1', quotedVis: 'private' });

  assert.deepStrictEqual(disabledValues(states.vis, VISIBILITY), ['public', 'unlisted', 'direct']);
});

test('引用中は「指定のみ」を選べない', () => {
  const states = groupStates({ ...BASE, quotedId: '1', quotedVis: 'public' });

  assert.deepStrictEqual(disabledValues(states.vis, VISIBILITY), ['direct']);
});

test('選択中の値がボタンのどれにも当たらなければ、想定外とみなす', () => {
  assert.strictEqual(hasKnownValues(groupStates(BASE)), true);
  assert.strictEqual(hasKnownValues(groupStates({ ...BASE, privacy: 'local' })), false);
  assert.strictEqual(hasKnownValues(groupStates({ ...BASE, quotePolicy: 'mentioned' })), false);
  // 引用が「自分のみ」で固定される公開範囲では、引用の値は使わない
  assert.strictEqual(hasKnownValues(groupStates({ ...BASE, privacy: 'direct', quotePolicy: 'mentioned' })), true);
});
