'use strict';

// 公開範囲・引用のボタン列を、キーで移る向きを確かめる。ユーザースクリプトを node で読み込み、DOM に触れない関数だけを使う
const test = require('node:test');
const assert = require('node:assert');

const { arrowStep } = require('../imastodon-inline-visibility.user.js');

test('→↓ は次、←↑ は前へ移る（radiogroup の決まりどおり ↑↓ も効く）', () => {
  assert.strictEqual(arrowStep('ArrowRight'), 1);
  assert.strictEqual(arrowStep('ArrowDown'), 1);
  assert.strictEqual(arrowStep('ArrowLeft'), -1);
  assert.strictEqual(arrowStep('ArrowUp'), -1);
});

test('矢印でないキーでは移らない', () => {
  assert.strictEqual(arrowStep('Enter'), 0);
  assert.strictEqual(arrowStep('Tab'), 0);
});
