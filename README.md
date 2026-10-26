# imastodon 公開範囲・引用ワンクリック切り替え

imastodon.net（Mastodon 4.5+）の投稿欄で、「公開範囲と引用」ダイアログを開かずに、並んだアイコンボタンをワンクリックするだけで公開範囲と引用範囲を切り替えられるようにする Tampermonkey 用ユーザースクリプトです。

## インストール

1. ブラウザに [Tampermonkey](https://www.tampermonkey.net/) を入れる（Firefox 版を想定）
2. [imastodon-inline-visibility.user.js（最新のリリース）](https://github.com/elys0912/imastodon-inline-visibility/releases/latest/download/imastodon-inline-visibility.user.js) を開く
3. Tampermonkey のインストール画面が出るので「インストール」

### 3.1.0 以前を入れている方へ

3.2.0 から、配布元を main ブランチから [Releases](https://github.com/elys0912/imastodon-inline-visibility/releases) に変えました。3.2.0 への自動更新で、更新の確認先も Releases に切り替わります。

Tampermonkey のダッシュボードでこのスクリプトの版が 3.2.0 にならない場合や、スクリプトの設定にある更新の確認先の URL が `raw.githubusercontent.com` のままの場合は、上の手順で 1 回だけ入れ直してください。設定と動作は変わりません。

## 機能

- 投稿欄の公開範囲ボタンを、2つのボタン列に置き換え
  - 公開範囲：公開 / ひかえめな公開 / フォロワーのみ / 指定された相手のみ
  - 引用できる人：誰でも / フォロワーのみ / 自分のみ
- 選択中のボタンだけ名前を表示し、それ以外はアイコンのみ（マウスを乗せると説明を表示）
- 見た目は本家ボタンのクラスを使うため、テーマの色に追従
- ←→キーで選択を切り替え可能
- 返信時などに公開範囲が自動で変わった場合もボタンに反映
- 本家と同じ制限を適用
  - フォロワーのみ／指定された相手のみでは引用範囲は「自分のみ」で固定
  - 編集中は公開範囲を変更不可
  - 非公開投稿の自己引用では公開系を選択不可
- 引用中は「指定された相手のみ」を選択不可（本家の引用→リンク変換処理を再現しないため）

## 変更履歴

[CHANGELOG.md](CHANGELOG.md)（3.1.0 から [Releases](https://github.com/elys0912/imastodon-inline-visibility/releases) にも載せています）

## 仕組み

React の内部から Redux ストアを取得し、本家の公開範囲ボタンと同じアクション（`compose/visibility_change`、`compose/setQuotePolicy`）を直接 dispatch しています。切り替えはブラウザの中だけで完結し、imastodon.net のサーバーへの通信はしません（通信の手段を使っていないことを、テストでソースを検査して確かめています）。本家の公開範囲ボタンは、並び順ではなく中身（公開範囲のアイコン）で見分けます。見つからないときはボタン列を出さず、本家のボタンのままにします（コンソールに `[tm-vis]` の警告を 1 回出します）。ページの監視は要素が追加されたときだけ投稿欄を探し、ストアの購読は投稿欄の状態が変わったとき（引用中は引用元の投稿の変化も）だけ値を読みます。imastodon.net のソース（[imas/mastodon](https://github.com/imas/mastodon) の imastodon ブランチ。2026-10-25 のタグ imastodon-20261025 を参照）に基づいているため、サーバー側のアップデートで動かなくなる可能性があります。ストアの状態を読めなくなった場合や、公開範囲・引用の値がボタンのどれにも当たらない場合は、本家の操作を妨げないよう、その場でストアの購読とページの監視をやめ、追加したボタン列を外して本家の公開範囲ボタンに戻します（ブラウザのコンソールに `[tm-vis]` の警告を出します）。再び使うにはページを再読み込みします。

## 開発

```sh
node --check imastodon-inline-visibility.user.js   # 構文の検査
node --test                                         # 判定のテスト（test/）。依存パッケージなし
```

配布は Releases の添付ファイル。`@updateURL` と `@downloadURL` は `releases/latest/download/imastodon-inline-visibility.user.js`（最新のリリースの添付）を指す。版を出す手順：

1. `@version` と CHANGELOG.md を上げ、上の 2 つを通して PR でマージする
2. 実際の imastodon.net で動作を確かめる
3. `gh release create vX.Y.Z imastodon-inline-visibility.user.js --title vX.Y.Z --notes-file <CHANGELOG の該当の節>` でリリースを作り、.user.js を添付する。添付した時点で全利用者への配布になる

3.1.0 以前の利用者は、自動更新で main の 3.2.0 を受け取るまで main の raw を見ている。main の .user.js は消さない。

test/ は、制限の判定（restrictions）、通信しないこと（no-network）、本家のボタンの見分け方と投稿欄の走査の判定（detection）、ストアの値を読み直す判定（sync）。DOM やストアに触れる部分は、配布の前に実際の imastodon.net で確かめる。

## ライセンス

MIT License（[LICENSE](LICENSE)）

アイコンには Google の [Material Symbols](https://github.com/google/material-design-icons)（Apache License 2.0）を使用しています。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

配布する `.user.js` は、スクリプト本体（MIT）とアイコンのパスデータ（Apache-2.0）を含むため、`@license` を `MIT AND Apache-2.0` としています。
