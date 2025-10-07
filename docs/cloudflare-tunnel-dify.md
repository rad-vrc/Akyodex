# Cloudflare Tunnel 経由で Dify 埋め込みを配信する手順

Dify の埋め込みウィジェット (`embed.min.js`) は HTTPS で配信され、外部からの直接アクセスを許可しておく必要があります。Cloudflare Tunnel/Zero Trust を HTTP プロキシとして経由させている環境では、トンネル側のアクセス制御でブロックされると 403 応答になり、フロントエンドからチャットボットが読み込めません。このページでは、Cloudflare Tunnel と Zero Trust の設定で **埋め込み用エンドポイントを許可する方法** をまとめています。

## 1. 事象の確認

1. Cloudflare Tunnel を経由しているマシンから以下を実行し、HTTP ステータスを確認します。
   ```bash
   curl -v https://dexakyo.akyodex.com/embed.min.js
   ```

   - `403 Forbidden` … トンネル配下の HTTP プロキシ/Zero Trust Gateway が外向き通信を拒否しています（後述の「Zero Trust Gateway でドメインを許可する」を参照）。
   - `502 Bad Gateway` … Cloudflare がトンネルのオリジンサービスに接続できていません。`cloudflared` サービスまたはオリジン自体が停止していないか、証明書/TLS 設定に問題がないかを確認します。
   - それ以外のコード … Zero Trust の **Logs** → **Gateway** と `cloudflared` のログを突き合わせて原因を特定します。
3. Windows PowerShell の `Invoke-WebRequest`/`curl` でも同様に確認できます。環境依存の HTTP プロキシではなく Cloudflare から 502 が返っている場合は、トンネルがオリジンサービスを解決できていない可能性が高いです。

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

4. 502 が解消しない場合は、以下を追加でチェックします。
   - `cloudflared tunnel info <YOUR_TUNNEL_NAME>` でコネクタのオンライン状況を確認する。
   - `cloudflared` ログに `connection refused` や `handshake failure` が記録されていないか確認する。
   - オリジンサーバーが HTTPS で待ち受けているポートに直接アクセスし、期待通りに `embed.min.js` が配信されるかテストする（例：`curl -k https://<origin-service-host>:<port>/embed.min.js`）。
   - Cloudflare Zero Trust → **Access** → **Tunnels** でトンネルのヘルスチェックが「Healthy」になっているか確認する。

## 4. オリジンサービスとポートの稼働状況を確認する

Cloudflare が 502 を返している場合、Zero Trust の設定が正しくても **トンネルの先にあるオリジンサービスが停止している** 可能性が
あります。以下の手順で、トンネル先のホストおよび開放ポートが稼働中か確認してください。

1. `cloudflared` を実行しているマシン、またはオリジンサービスが動作しているマシンに接続します。
2. Linux/macOS の場合:
   ```bash
   sudo netstat -tulpn | grep <port>
   ```
   Windows PowerShell の場合:
   ```powershell
   netstat -ano | findstr <port>
   ```
   いずれのコマンドも結果が空であれば、そのポートで待ち受けているプロセスが存在しません。アプリケーションを起動し直し、サービスが
   正しくバインドされているか確認してください。
3. オリジンサービスが別ホストで稼働している場合は、トンネルホストから直接アクセスできるかを `curl -k https://<origin-host>:<port>/embed.min.js`
   などで確認します。ここで接続エラーが発生する場合、Cloudflare からも到達できません。
4. Windows クライアント側で `curl` を実行して 502 が返り、かつ `netstat -ano | findstr <port>` で該当ポートが表示されない場合は、オリ
   ジンのアプリケーションが停止しているか、別ポートで起動していると考えられます。アプリを再起動するか、設定ファイルのポート番号を

埋め込みエンドポイントを完全公開にしたくない場合は、Access サービス トークンで保護したうえで、フロントエンドからトークンを付与する方法があります。

1. Zero Trust → **Access** → **Service Tokens** でクライアント ID/Secret を発行します。
2. `index.html` など埋め込みを行うページで、`CF-Access-Client-Id` と `CF-Access-Client-Secret` を HTTP ヘッダーに追加できるよう、リバースプロキシまたは Functions を経由させます（静的サイトの場合は Functions/Workers でヘッダーを付与するのが簡単です）。
3. 発行したトークンを Vault など安全なストレージに保管し、必要に応じてローテーションします。

設定後に再度以下の手順で確認します。

1. トンネル経由の環境で 
2. 200 OK が返ってもブラウザのキャッシュで古いスクリプトが保持されている場合があるため、`Ctrl` + `Shift` + `R`（macOS は `Cmd` + `Shift` + `R`）でハードリロードするか、開発者ツールを開いて **Disable cache** を有効にしてから再読み込みしてください。
3. サイトをブラウザで開き、JavaScript コンソールに 403/アクセス拒否エラーが出ないこと、および Dify ウィジェットが表示されることを確認する。
4. バブルが表示されているにもかかわらずクリックしても反応しない場合は、`js/main.js` の `floatingContainer` など他要素の `z-index` が衝突していないか確認し、必要に応じて調整します。

これらの設定が揃えば、Cloudflare Tunnel を利用する環境でも Dify の埋め込みスクリプトを問題なく読み込めます。ウィジェットが前面に出てチャット画面が開くことまで確認できれば、トンネルの設定は完了です。

## 7. Cloudflare Pages プレビューでバブルが表示されない場合

Cloudflare Pages のプレビュー URL（`*.pages.dev`）は、Dify 側で **Website embedding → Allowed domains** に追加していないとウィジェットが描画されません。プレビューで以下の現象が出る場合は、本番ドメインと同じようにプレビューのホスト名も許可してください。

- ページ読み込み後 10 秒以内に `dify-chatbot-bubble` 要素が DOM に現れない。
- ブラウザのコンソールに `[Dify] Chatbot bubble did not render (bubble-timeout)` の警告と「Cloudflare Pages preview hosts must be added...」というメッセージが出る。

### 対処フロー

1. Dify の管理画面 → **Settings** → **Website embedding** → **Allowed domains** に移動し、プレビューのホスト名（例：`https://eac66113.akyodex.pages.dev`）を追加します。
2. 保存後にプレビューをハードリロードし、チャットバブルが表示されるか確認します。

プレビュー環境特有の制限をクリアすれば、本番ドメインと同じように埋め込みウィジェットが表示されます。
