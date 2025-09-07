# Quick TODO アプリ

> 買い物前の5分で使える、シンプルで高速なTODOリスト

## 🚀 機能概要

- **高速起動**: ページを開いた瞬間から入力可能
- **区切り文字一括登録**: 「牛乳,パン,卵」「牛乳，パン，卵」「牛乳、パン、卵」「a,い、う」など混在パターンでも複数のアイテムを同時追加
- **スマホ最適化**: 入力エリアを下部に配置、親指操作に最適化
- **オフライン対応**: ネット環境に依存しない（PWA対応）
- **データ永続化**: ブラウザを閉じても内容が残る（localStorage使用）
- **レスポンシブデザイン**: スマートフォン対応
- **開発環境最適化**: キャッシュ無効化、CORS対応

## 📁 ファイル構成

```
quick-todo-app/
├── index.html           # メインHTML
├── styles/
│   └── main.css        # メインCSS（CSS Variables、レスポンシブ対応）
├── scripts/
│   ├── storage.js      # データ管理クラス（localStorage操作）
│   └── main.js         # メインアプリケーションロジック
├── sw.js               # Service Worker（PWA・オフライン対応）
├── manifest.json       # Web App Manifest（PWA設定）
├── icons/              # アプリアイコン（SVG/PNG）
└── README.md           # このファイル
```

## 🛠️ 技術スタック

- **HTML5**: マークアップ
- **CSS3**: CSS Variables、Grid/Flexbox、アニメーション
- **Vanilla JavaScript (ES6+)**: クラス構文、モジュール化設計
- **PWA**: Service Worker、Web App Manifest
- **localStorage**: データ永続化

## 🎨 デザインシステム

### CSS Variables（カスタマイズポイント）

```css
:root {
  /* カラーパレット - モノクロベース */
  --color-primary: #000000; /* メインカラー（黒） */
  --color-success: #000000; /* 成功・完了カラー（黒） */
  --color-danger: #000000; /* 削除・警告カラー（黒） */
  --color-background: #ffffff; /* 背景色（白） */

  /* スペーシング */
  --space-sm: 8px; /* 小スペース */
  --space-md: 16px; /* 中スペース */
  --space-lg: 24px; /* 大スペース */

  /* タイポグラフィ */
  --font-size-base: 16px; /* ベースフォントサイズ */
  --font-size-xl: 24px; /* ヘッダーサイズ */

  /* レイアウト */
  --container-width: 560px; /* コンテナ幅 */
  --border-radius: 12px; /* 角丸サイズ */
}
```

### カラーテーマのカスタマイズ

1. `styles/main.css` の `:root` セクションでCSS Variablesを編集
2. カスタムテーマ: 新しいCSS Variables セットを作成

## 💾 データ構造

### localStorage スキーマ

```javascript
{
  "version": "1.0.0",
  "items": [
    {
      "id": "uuid-string",
      "text": "タスク内容",
      "completed": false,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "lastUpdated": "2025-01-15T10:30:00.000Z",
  "settings": {
    "theme": "auto",
    "animations": true
  }
}
```

### データ操作API

#### TodoStorage クラス

```javascript
// データ読み込み・保存
TodoStorage.load() // データ読み込み
TodoStorage.save(data) // データ保存

// アイテム操作
TodoStorage.addItem(text) // 単一アイテム追加
TodoStorage.addItems(textArray) // 複数アイテム一括追加
TodoStorage.updateItem(id, updates) // アイテム更新
TodoStorage.deleteItem(id) // アイテム削除

// 一括操作
TodoStorage.clearAll() // 全アイテム削除

// 統計・ユーティリティ
TodoStorage.exportData() // データエクスポート
TodoStorage.importData(jsonString) // データインポート
```

#### InputProcessor クラス

```javascript
// 入力処理
InputProcessor.parseInput(text) // 区切り文字列を配列に変換（カンマ・読点・混在対応）
InputProcessor.sanitizeItem(text) // 個別アイテムのサニタイゼーション
InputProcessor.escapeHtml(text) // HTMLエスケープ（XSS対策）
```

## 🔧 カスタマイズガイド

### 1. スタイリングの変更

**基本カラーの変更**:

```css
/* styles/main.css の :root セクション */
:root {
  --color-primary: #your-color;
}
```

**レイアウト幅の調整**:

```css
:root {
  --container-width: 800px; /* デフォルト: 560px */
}
```

### 2. 機能の拡張

**新しいイベントハンドラーの追加**:

```javascript
// scripts/main.js の TodoApp クラス内
bindEvents() {
    // 既存のイベントバインド

    // 新しいイベントを追加
    document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));
}

handleKeyboardShortcut(event) {
    // ショートカット処理
}
```

**データフィールドの追加**:

```javascript
// scripts/storage.js の validateItem メソッド
static validateItem(item) {
    return {
        id: item.id || generateUUID(),
        text: InputProcessor.sanitizeItem(item.text || ''),
        completed: Boolean(item.completed),
        createdAt: item.createdAt || new Date().toISOString(),
        // 新しいフィールドを追加
        priority: item.priority || 'normal',
        category: item.category || 'general'
    };
}
```

### 3. PWA設定のカスタマイズ

**アプリ名・説明の変更**:

```json
// manifest.json
{
  "name": "あなたのアプリ名",
  "short_name": "短い名前",
  "description": "アプリの説明"
}
```

**テーマカラーの変更**:

```json
// manifest.json
{
  "theme_color": "#your-color",
  "background_color": "#your-background"
}
```

## 🚦 開発・デプロイ

### ローカル開発

```bash
# 開発サーバー起動（キャッシュ無効化、CORS対応）
npm run dev

# 本番用サーバー起動
npm start

# ブラウザでアクセス
open http://localhost:3000
```

### デプロイ推奨環境

- **Netlify**: `npm run build` 不要、直接デプロイ可能
- **Vercel**: 静的サイトとして自動認識
- **GitHub Pages**: HTTPS必須（PWA要件）
- **Firebase Hosting**: 高速配信、PWA対応優秀

### パフォーマンス最適化

1. **CSS/JS最小化**: 本番デプロイ時に実行
2. **画像最適化**: PNG画像を実際に作成・最適化
3. **Service Workerキャッシュ**: `sw.js` の `CACHE_FILES` を更新

## 🧪 テスト・デバッグ

### ブラウザ開発者ツール

```javascript
// コンソールでのデバッグ
todoApp.getDebugInfo() // アプリ状態確認
TodoStorage.getDebugInfo() // ストレージ状態確認
TodoStorage.exportData() // データエクスポート
```

### PWA動作確認

1. Chrome DevTools → Application → Service Workers
2. Lighthouse → PWA監査実行
3. オフライン動作確認: DevTools → Network → Offline

### クロスブラウザテスト

- **Chrome 80+** ✅
- **Firefox 75+** ✅
- **Safari 13+** ✅
- **Edge 80+** ✅

## 🔒 セキュリティ

### XSS対策

- `innerHTML` 使用禁止
- `InputProcessor.escapeHtml()` による出力エスケープ
- CSP (Content Security Policy) 設定済み

### データ保護

- すべてローカル保存、外部送信なし
- 入力値サニタイゼーション実装済み

## 📝 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🤝 コントリビューション

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 サポート

- **バグレポート**: Issues を作成してください
- **機能リクエスト**: Discussions で議論しましょう
- **質問**: README の情報で解決しない場合は Issue を作成

---

**開発時の注意点**: このREADMEは実装の詳細を含むため、デザイン・CSS改修時の参考資料として活用してください。
