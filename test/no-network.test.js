'use strict';

// imastodon.net のサーバーに負荷をかけないこと（README の「仕組み」）を確かめる。
// スクリプトは公開範囲・引用の切り替えをブラウザ内の Redux store だけで行い、通信を一切しない。将来の変更でも崩さないよう、ソースを静的に検査する
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'imastodon-inline-visibility.user.js'), 'utf8');

test('通信の手段を使わず、拡張の特別な権限も持たない', () => {
  const networkApis = [
    ['fetch', /\bfetch\s*\(/],
    ['XMLHttpRequest', /XMLHttpRequest/],
    ['WebSocket', /WebSocket/],
    ['EventSource', /EventSource/],
    ['sendBeacon', /sendBeacon/],
    ['GM_xmlhttpRequest / GM.xmlHttpRequest', /GM_xmlhttpRequest|GM\.xmlHttpRequest/],
    ['動的 import', /\bimport\s*\(/],
    ['CSS の url()（画像やフォントの読み込み）', /url\(/],
  ];
  for (const [name, pattern] of networkApis) {
    assert.doesNotMatch(source, pattern, name);
  }

  const grants = source.match(/^\/\/ @grant\s+.*$/gm);
  assert.deepStrictEqual(grants, ['// @grant        none']);
});
