'use strict';

// imastodon.net のサーバーに負荷をかけないこと（README の「仕組み」）を確かめる。
// スクリプトは公開範囲・引用の切り替えをブラウザ内の Redux store だけで行い、通信を一切しない。将来の変更でも崩さないよう、ソースを静的に検査する
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'imastodon-inline-visibility.user.js'), 'utf8');

// 文字列の検査なので、通信が無いことの証明ではない。通信になりうる書き方を、ソースに持ち込まないための歯止め
test('通信の手段を使わず、ストアには素の action だけを渡し、拡張の特別な権限も持たない', () => {
  const networkApis = [
    ['fetch', /\bfetch\b/],
    ['XMLHttpRequest', /XMLHttpRequest/],
    ['WebSocket', /WebSocket/],
    ['EventSource', /EventSource/],
    ['sendBeacon', /sendBeacon/],
    ['GM_xmlhttpRequest / GM.xmlHttpRequest', /GM_xmlhttpRequest|GM\.xmlHttpRequest/],
    ['動的 import', /\bimport\s*\(/],
    ['CSS の url() と @import（画像・フォント・スタイルの読み込み）', /url\(|@import/],
    ['src・href の設定（画像・スクリプト・スタイルの読み込み）', /\bsrc\s*=|\bhref\s*=/],
    ['読み込みを伴う要素の作成', /new Image\b|createElement\(\s*['"](?:img|script|link|iframe)['"]/],
  ];
  for (const [name, pattern] of networkApis) {
    assert.doesNotMatch(source, pattern, name);
  }

  // thunk（関数）を渡すと本家の処理が走りうるので、dispatch にはオブジェクトの action だけを渡す
  const dispatches = source.match(/\.dispatch\(\s*./g);
  assert.ok(dispatches && dispatches.length > 0, 'dispatch が見つからない');
  for (const call of dispatches) {
    assert.match(call, /\{$/, call);
  }

  const grants = source.match(/^\/\/ @grant\s+.*$/gm);
  assert.deepStrictEqual(grants, ['// @grant        none']);
});
