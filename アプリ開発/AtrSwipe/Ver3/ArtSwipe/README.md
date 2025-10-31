# 🎨 ArtSwipe

Tinderライクなスワイプ操作でアート作品を発見・コレクションできるモバイルアプリのプロトタイプ

## 機能

- 📱 **スワイプ機能**
  - 右スワイプ (→): お気に入りに追加
  - 左スワイプ (←): スキップ
  - 上スワイプ (↑): 後で見る
  - 下スワイプ (↓): 興味なし

- 🖼️ **Met Museum API連携**
  - メトロポリタン美術館の作品を表示
  - 高画質画像
  - 作品情報（タイトル、アーティスト、制作年）

- 💾 **ローカルストレージ**
  - お気に入り作品の保存
  - 後で見る機能

## セットアップ

### 必要要件
- Node.js 18以上
- npm または yarn
- Expo Go アプリ (モバイルデバイスでのテスト用)

### インストール

```bash
cd ArtSwipe
npm install
```

### 開発サーバーの起動

```bash
npm start
```

QRコードが表示されるので、Expo Goアプリでスキャンしてください。

### プラットフォーム別実行

```bash
# iOS (Macのみ)
npm run ios

# Android
npm run android

# Web
npm run web
```

## プロジェクト構造

```
ArtSwipe/
├── src/
│   ├── components/
│   │   └── SwipeCard.tsx      # スワイプ可能なカードコンポーネント
│   ├── services/
│   │   └── artApi.ts           # Met Museum API連携
│   ├── types/
│   │   └── index.ts            # TypeScript型定義
│   └── utils/
│       └── storage.ts          # AsyncStorage操作
├── App.tsx                      # メインアプリケーション
├── app.json                     # Expo設定
└── package.json
```

## 技術スタック

- **React Native** - モバイルアプリフレームワーク
- **Expo** - 開発環境
- **TypeScript** - 型安全性
- **React Native Gesture Handler** - ジェスチャー制御
- **React Native Reanimated** - スムーズなアニメーション
- **AsyncStorage** - ローカルデータ保存
- **Met Museum API** - アート作品データ

## 今後の機能拡張案

- [ ] コレクション画面の実装
- [ ] 検索・フィルター機能
- [ ] 複数のアートAPI連携
- [ ] AIレコメンデーション
- [ ] ユーザー認証
- [ ] ソーシャル機能
- [ ] AR作品プレビュー

## ライセンス

MIT
