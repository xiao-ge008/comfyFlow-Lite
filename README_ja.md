# ComfyFlow-Lite - 日本語ドキュメント

<div align="center">

![ComfyFlow-Lite Logo](images/home.png)

> 🎨 **任意の ComfyUI ワークフローを REST API と MCP インターフェースにワンクリック変換**  
> 🚀 **多言語インターフェース対応**、**ゼロ設定デプロイメント**  
> 🤖 **Cherry Studio、Claude Desktop などの AI クライアントを完全サポート**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🏠 ホームに戻る](README.md) | [🇨🇳 中文](README_zh.md) | [🇺🇸 English](README_en.md)

</div>

---

## ✨ コア機能

- 🎯 **ワンクリックデプロイ**: Docker やデータベース不要、npm コマンドで起動可能
- 🌍 **多言語サポート**: 完全な中国語/英語/日本語インターフェース対応
- 🔄 **デュアルプロトコルサポート**: REST API と MCP インターフェースの両方を提供
- 🎨 **ビジュアル管理**: ワークフローとパラメータマッピング管理のモダンな Web インターフェース
- 🛠️ **スマートマッピング**: キーワードライブラリサポート付きの自動ワークフローパラメータ解析
- 🤖 **AI フレンドリー**: 様々な MCP クライアントを完全サポート
- 🚀 **GET リクエストサポート**: 直接画像生成のためのシンプルな URL GET リクエスト

## 📸 インターフェースプレビュー

### メインダッシュボード
<div align="center">
  <img src="images/home.png" alt="メインインターフェース" width="800"/>
  <p><em>リアルタイムシステムステータス、ワークフロー統計、クイックアクションエントリ</em></p>
</div>

### AI スマートチャット
<div align="center">
  <img src="images/chat.png" alt="AI チャット" width="800"/>
  <p><em>AI と対話して自動的にワークフローを呼び出し画像を生成</em></p>
</div>

### システム設定
<div align="center">
  <img src="images/seting.png" alt="システム設定" width="800"/>
  <p><em>AI 設定管理とシステム設定</em></p>
</div>

## 🚀 クイックスタート

### 要件
- Node.js 18+
- 実行中の ComfyUI サービス (デフォルト `http://127.0.0.1:8188`)

### インストール

```bash
# プロジェクトをクローン
git clone https://github.com/your-username/comfyflow-lite.git
cd comfyflow-lite

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

`http://localhost:3000` にアクセスして開始

## 🔧 設定

### 環境変数

`.env.local` ファイルを作成:

```bash
# ComfyUI サーバーアドレス
COMFYUI_URL=http://127.0.0.1:8188

# API 認証トークン（オプション）
AUTH_TOKEN=your-secret-token

# サービスポート（オプション、デフォルト 3000）
PORT=3000
```

## 📖 使用ガイド

1. **AI モデル設定**: 設定ページで OpenAI、Anthropic などの AI サービス設定を追加
2. **ワークフローアップロード**: ワークフロー管理ページで ComfyUI JSON ワークフローファイルをアップロード
3. **パラメータマッピング**: 公開するパラメータ（プロンプト、シード、ステップなど）を設定
4. **AI チャット**: AI と対話して自動的に画像を生成
5. **API 呼び出し**: REST または MCP プロトコル経由でワークフローを呼び出し

## 🔗 API 使用例

### REST API

```bash
# POST リクエスト
curl -X POST http://localhost:3000/api/generate/your_endpoint \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a beautiful landscape"}'

# GET リクエスト（独自機能）
curl "http://localhost:3000/api/generate/your_endpoint?prompt=beautiful%20landscape"
```

### MCP プロトコル

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"generateYourEndpoint",
      "arguments":{"prompt":"a beautiful landscape"}
    },
    "id":1
  }'
```

## 🆚 Pixelle MCP との比較

[Pixelle MCP](https://github.com/AIDC-AI/Pixelle-MCP) プロジェクトと比較して、ComfyFlow-Lite はより**シンプルで実用的**です：

| 機能 | ComfyFlow-Lite | Pixelle MCP |
|------|----------------|-------------|
| **デプロイの複雑さ** | ⭐⭐⭐⭐⭐ 超シンプル | ⭐⭐⭐ 中程度 |
| **技術スタック** | 純粋な JavaScript (Node.js) | Python + 複数の依存関係 |
| **インストール方法** | `npm install` ワンステップ | Python 環境 + pip/uvx が必要 |
| **設定の難易度** | 🎯 Web インターフェース視覚設定 | 📝 設定ファイルの手動編集 |
| **呼び出し方法** | 🔗 REST + MCP + **GET リクエスト** | 🔌 MCP プロトコルのみ |
| **パラメータマッピング** | 🛠️ 自動分析 + 視覚設定 | 📋 ノードタイトルの手動編集 |
| **キーワードライブラリ** | ✅ 内蔵キーワード管理システム | ❌ サポートなし |
| **データベース** | 🗃️ 内蔵 SQLite、ゼロ設定 | 📁 ファイルシステムストレージ |
| **Web インターフェース** | 🎨 プロフェッショナルなワークフロー管理 | 💬 Chainlit ベースのチャットインターフェース |

### 🚀 ComfyFlow-Lite の独自の利点

1. **🎯 よりシンプルなデプロイメント**
   ```bash
   # ComfyFlow-Lite - 3ステップで開始
   git clone && npm install && npm run dev
   ```

2. **🔗 より柔軟な呼び出し方法**
   ```bash
   # シンプルな GET リクエストをサポート
   curl "http://localhost:3000/api/generate/your_endpoint?prompt=cute%20cat"

   # 従来の POST リクエスト
   curl -X POST http://localhost:3000/api/generate/your_endpoint \
     -d '{"prompt": "cute cat"}'

   # MCP プロトコル呼び出し
   # 完全に MCP 標準準拠
   ```

3. **🛠️ より直感的な設定体験**
   - **ComfyFlow-Lite**: Web インターフェースクリック設定、WYSIWYG
   - **Pixelle MCP**: 特殊構文によるノードタイトルの手動編集

4. **📊 より完全なデータ管理**
   - キャラクター、スタイル、アクションなどのカテゴリをサポートする内蔵キーワードライブラリシステム
   - 複雑なクエリとデータ関係をサポートする SQLite データベースストレージ
   - キーワードの CSV バッチインポートサポート

**💡 選択推奨**:
- 🎯 **シンプルさを追求**: ComfyFlow-Lite を選択
- 🔬 **複雑なカスタマイズが必要**: Pixelle MCP を検討
- 🚀 **迅速なプロトタイピング**: ComfyFlow-Lite がより適切

## 📖 詳細使用ガイド

### 1. ComfyUI 接続の設定

ComfyUI がデフォルトアドレスにない場合、`.env.local` ファイルを作成:

```bash
COMFYUI_URL=http://your-comfyui-address:port
```

### 2. ワークフローアップロード

<div align="center">
  <img src="images/home.png" alt="ワークフロー管理" width="600"/>
</div>

1. `http://localhost:3000/workflow-admin` にアクセス
2. 「➕ ワークフロー作成」をクリック
3. ComfyUI `workflow.json` ファイルをアップロード
4. ワークフロー名と API エンドポイント名を設定

### 3. パラメータマッピングの設定

1. システムが自動的にワークフローパラメータを分析
2. 公開するパラメータを選択（プロンプト、シード、ステップなど）
3. パラメータ名、タイプ、デフォルト値を設定
4. オプション：キーワードライブラリ参照を設定

### 4. キーワードライブラリの管理

- キャラクター、アクション、スタイルなどのキーワードカテゴリをサポート
- バッチ CSV インポートまたは手動作成
- `key` パラメータによる一貫性制御

## 🔗 詳細 API 呼び出し

### REST API 呼び出し

<div align="center">
  <img src="images/chat.png" alt="API 呼び出し例" width="600"/>
</div>

```bash
# POST リクエスト（フル機能）
curl -X POST http://localhost:3000/api/generate/your_endpoint \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a beautiful landscape", "key": "style001"}'

# GET リクエスト（超シンプル！）- 独自機能 🚀
curl "http://localhost:3000/api/generate/your_endpoint?prompt=a%20beautiful%20landscape"

# ブラウザ直接アクセス
http://localhost:3000/api/generate/your_endpoint?prompt=cute%20cat&key=girl001
```

> 💡 **GET リクエストの利点**: Pixelle MCP が複雑な MCP 呼び出しのみをサポートするのに対し、私たちの GET リクエストは API 呼び出しを非常にシンプルにします！
> - 🌐 **ブラウザフレンドリー**: ブラウザアドレスバーで直接画像生成
> - 🔗 **URL 共有**: 他の人が使用するために URL を直接共有可能
> - 📱 **モバイルフレンドリー**: モバイルブラウザからでも簡単に呼び出し可能
> - 🛠️ **簡単デバッグ**: POST ツール不要、URL でテスト可能

### MCP インターフェース呼び出し

```bash
# サーバー情報を取得
curl http://localhost:3000/api/mcp

# すべてのツールを一覧表示
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# ツールを呼び出して画像を生成
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"generateYourEndpoint",
      "arguments":{"prompt":"a beautiful landscape"}
    },
    "id":1
  }'
```

## 🤖 AI クライアント設定

### Cherry Studio 設定

<div align="center">
  <img src="images/seting.png" alt="AI クライアント設定" width="600"/>
</div>

1. Cherry Studio 設定を開く
2. MCP サーバー設定を追加:

```json
"mcpServers": {
  "comfyui-workflow": {
    "name": "images",
    "type": "streamableHttp",
    "description": "画像/動画生成ツールのコレクション",
    "isActive": true,
    "baseUrl": "http://127.0.0.1:3000/api/mcp"
  }
}
```

3. Cherry Studio を再起動
4. 会話で画像生成機能を使用

### Claude Desktop 設定

Claude Desktop 設定ファイルを編集:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "comfyui-workflow": {
      "command": "node",
      "args": [
        "-e",
        "const http = require('http'); const options = { hostname: '127.0.0.1', port: 3000, path: '/api/mcp', method: 'POST', headers: { 'Content-Type': 'application/json' } }; process.stdin.pipe(http.request(options, res => res.pipe(process.stdout)));"
      ]
    }
  }
}
```

## ⚙️ 設定オプション

### 環境変数

```bash
# ComfyUI サーバーアドレス
COMFYUI_URL=http://127.0.0.1:8188

# API 認証トークン（オプション）
AUTH_TOKEN=your-secret-token

# サービスポート（オプション、デフォルト 3000）
PORT=3000
```

### 管理インターフェース

- **ワークフロー管理**: `http://localhost:3000/workflow-admin`
- **キーワード管理**: `http://localhost:3000/keyword-admin`
- **API テスト**: `http://localhost:3000`

## 🐛 一般的な問題

**Q: ComfyUI に接続できない**
- ComfyUI が実行中であることを確認
- `.env.local` の `COMFYUI_URL` 設定を確認
- ファイアウォール設定を確認

**Q: ワークフロー実行に失敗した**
- ComfyUI に必要なカスタムノードがインストールされているか確認
- モデルファイルのパスが正しいことを確認
- ComfyUI コンソールのエラーメッセージを確認

**Q: MCP 呼び出しに失敗した**
- 正しい JSON-RPC 2.0 形式を使用していることを確認
- ツール名が正しいことを確認
- パラメータ形式を確認

## 🛠️ 開発例

### JavaScript 例

```javascript
// GET メソッド呼び出し（キャッシュサポート）
async function generateImageGET(endpoint, params, useCache = true) {
  const searchParams = new URLSearchParams(params);
  if (!useCache) {
    searchParams.set('force_regenerate', 'true');
  }
  searchParams.set('format', 'json'); // JSON データを取得

  const response = await fetch(`http://127.0.0.1:3000/api/generate/${endpoint}?${searchParams}`);
  const result = await response.json();

  if (result.success) {
    console.log(`画像生成成功（キャッシュ: ${result.data.cached}）:`, result.data.url);
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// POST メソッド呼び出し
async function generateImagePOST(endpoint, params, useCache = true) {
  const body = { ...params };
  if (!useCache) {
    body.force_regenerate = true;
  }

  const response = await fetch(`http://127.0.0.1:3000/api/generate/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  if (result.success) {
    console.log(`画像生成成功（キャッシュ: ${result.data.cached}）:`, result.data.url);
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// 直接画像表示（GET メソッドデフォルト動作）
function showImageDirect(endpoint, params) {
  const searchParams = new URLSearchParams(params);
  const img = document.createElement('img');
  img.src = `http://127.0.0.1:3000/api/generate/${endpoint}?${searchParams}`;
  img.alt = 'Generated Image';
  img.style.maxWidth = '100%';
  document.body.appendChild(img);
}
```

### Python 例

```python
import requests

def generate_image(endpoint, params):
    url = f"http://127.0.0.1:3000/api/generate/{endpoint}"
    response = requests.post(url, json=params)
    
    result = response.json()
    if result['success']:
        print(f"画像生成成功: {result['data']['url']}")
        return result['data']
    else:
        raise Exception(result['error'])

# 使用例
try:
    data = generate_image('your_endpoint', {'prompt': 'your prompt'})
    print(data)
except Exception as e:
    print(f"エラー: {e}")
```

## 🤝 コントリビューション

バグ報告、新機能の提案、コード改善など、あらゆる形式のコントリビューションを歓迎します！

### コントリビューション方法

1. プロジェクトをフォーク
2. 機能ブランチを作成: `git checkout -b feature/amazing-feature`
3. 変更をコミット: `git commit -m 'Add some amazing feature'`
4. ブランチをプッシュ: `git push origin feature/amazing-feature`
5. プルリクエストを提出

### 開発環境設定

```bash
# フォークをクローン
git clone https://github.com/your-username/comfyflow-lite.git
cd comfyflow-lite

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev

# テストを実行
npm run test

# コードスタイルをチェック
npm run lint
```

### 問題報告

バグを見つけた場合や機能の提案がある場合は、[GitHub Issues](https://github.com/your-username/comfyflow-lite/issues) で新しい issue を作成してください。

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で提供されています - 詳細は [LICENSE](LICENSE) ファイルを参照してください

```
MIT License

Copyright (c) 2024 ComfyFlow-Lite

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 🙏 謝辞

以下のオープンソースプロジェクトとコミュニティに感謝いたします：

- **[ComfyUI](https://github.com/comfyanonymous/ComfyUI)** - 強力な AI 画像生成ツール
- **[Next.js](https://nextjs.org/)** - 優れたフルスタック React フレームワーク
- **[MCP](https://modelcontextprotocol.io/)** - モデルコンテキストプロトコル標準
- **[Material-UI](https://mui.com/)** - モダンな React UI コンポーネントライブラリ
- **[SQLite](https://www.sqlite.org/)** - 軽量データベースエンジン
- **[TypeScript](https://www.typescriptlang.org/)** - JavaScript のタイプセーフなスーパーセット

すべてのコントリビューターとユーザーの皆様のご支援に感謝いたします！

## 📞 サポート & コミュニティ

### ヘルプの取得

- 📖 **ドキュメント**: 詳細な [API 使用ドキュメント](API_USAGE.md)
- 🐛 **バグ報告**: [GitHub Issues](https://github.com/your-username/comfyflow-lite/issues)
- 💡 **機能提案**: [GitHub Discussions](https://github.com/your-username/comfyflow-lite/discussions)
- 📧 **お問い合わせ**: [your-email@example.com](mailto:your-email@example.com)

### クイックリンク

- 🏠 **ホームページ**: `http://localhost:3000`
- ⚙️ **ワークフロー管理**: `http://localhost:3000/workflow-admin`
- 🏷️ **キーワード管理**: `http://localhost:3000/keyword-admin`
- 📊 **API テスト**: 内蔵テストツール
- 📝 **API ドキュメント**: [API_USAGE.md](API_USAGE.md)

---

<div align="center">

**⭐ このプロジェクトが役に立った場合は、Star をください！**

**🌟 Star** • **🍴 Fork** • **📢 Share**

---

<img src="images/home.png" alt="ComfyFlow-Lite" width="300"/>

**ComfyUI ワークフローの API 化をシンプルでエレガントに**

Made with ❤️ by the ComfyFlow-Lite team

</div>