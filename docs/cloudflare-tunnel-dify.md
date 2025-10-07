# Cloudflare Tunnel 経由で Dify 埋め込みを配信する手順

Dify の埋め込みウィジェット (`embed.min.js`) は HTTPS で配信され、外部からの直接アクセスを許可しておく必要があります。Cloudflare Tunnel/Zero Trust を HTTP プロキシとして経由させている環境では、トンネル側のアクセス制御でブロックされると 403 応答になり、フロントエンドからチャットボットが読み込めません。このページでは、Cloudflare Tunnel と Zero Trust の設定で **埋め込み用エンドポイントを許可する方法** をまとめています。

## 1. 事象の確認

1. Cloudflare Tunnel を経由しているマシンから以下を実行し、HTTP ステータスを確認します。
   ```bash
   curl -v https://dexakyo.akyodex.com/embed.min.js
   ```
2. `CONNECT` リクエストに対して 403 (Forbidden) が返る場合は、トンネルが外向き通信をブロックしている状態です。Cloudflare 側のログ（Zero Trust ダッシュボード → **Logs** → **Gateway**）でも `dexakyo.akyodex.com` へのリクエストが拒否されていることを確認できます。

## 2. Zero Trust Gateway でドメインを許可する

1. Cloudflare ダッシュボード → **Zero Trust** → **Gateway** → **Policies** → **HTTP** を開きます。
2. `dexakyo.akyodex.com`（または Dify のホスト名）が対象になっている「Block」ルールがあれば削除するか、優先度を下げます。
3. 新しい **Allow** ポリシーを追加し、以下の条件を設定します。
   - **Selector**: Domain
   - **Operator**: is
   - **Value**: `dexakyo.akyodex.com`
4. ポリシーの適用先（ユーザーグループやデバイスプロファイル）が、埋め込みスクリプトを取得したいマシンを含んでいることを確認します。

> ゲートウェイポリシーに変更を加えた後は、`cloudflared`/WARP クライアント側で数分待つか、`warp-cli` を再起動して最新ポリシーを取得します。

## 3. Cloudflare Tunnel (cloudflared) の設定を確認する

Zero Trust での許可に加えて、cloudflared のトンネル設定でも HTTPS の透過プロキシが有効になっていることを確認します。

1. サーバー側の `cloudflared` 構成ファイル（例：`/etc/cloudflared/config.yml`）を開き、以下のような `ingress` ルールがあることを確認します。
   ```yaml
   tunnel: <YOUR_TUNNEL_ID>
   credentials-file: /etc/cloudflared/<YOUR_TUNNEL_ID>.json

   ingress:
     - hostname: dexakyo.akyodex.com
       service: https://<origin-service-host>:<port>
     - service: http_status:404
   ```
2. オリジンサービスが自己署名証明書などを使用している場合は、`originRequest: { noTLSVerify: true }` を `hostname` のブロック内に追加します。
3. 設定を更新したら `cloudflared service restart` でトンネルを再起動し、ログにエラーがないか確認します。

## 4. (任意) Cloudflare Access を利用して保護する場合

埋め込みエンドポイントを完全公開にしたくない場合は、Access サービス トークンで保護したうえで、フロントエンドからトークンを付与する方法があります。

1. Zero Trust → **Access** → **Service Tokens** でクライアント ID/Secret を発行します。
2. `index.html` など埋め込みを行うページで、`CF-Access-Client-Id` と `CF-Access-Client-Secret` を HTTP ヘッダーに追加できるよう、リバースプロキシまたは Functions を経由させます（静的サイトの場合は Functions/Workers でヘッダーを付与するのが簡単です）。
3. 発行したトークンを Vault など安全なストレージに保管し、必要に応じてローテーションします。

## 5. 動作確認

設定後に再度以下の手順で確認します。

1. トンネル経由の環境で `curl https://dexakyo.akyodex.com/embed.min.js` を実行し、200 応答とファイル本文が取得できることを確認する。
2. サイトをブラウザで開き、JavaScript コンソールに 403/アクセス拒否エラーが出ないこと、および Dify ウィジェットが表示されることを確認する。

これらの設定が揃えば、Cloudflare Tunnel を利用する環境でも Dify の埋め込みスクリプトを問題なく読み込めます。
